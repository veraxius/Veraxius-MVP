// Domain Score Service
// Full implementation of per-domain AIM score calculation per Veraxius spec
// =========================================================================

import { prisma } from "../config/prisma";
import { classifyPost } from "./domainClassifier";
import { recomputeAIMScore, getVoterTierMultiplier } from "./aimV2";
import jwt from "jsonwebtoken";

const LAMBDA = 0.05; // recency decay rate

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, v));
}

function daysSince(date: Date): number {
	return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

// ─── Core formula ───────────────────────────────────────────────────────────

export interface EffectiveDeltaInput {
	rawDelta: number;
	variableWeight: number;
	postCreatedAt: Date;
	stakeLevel?: number; // 1.0 default
	roleWeight?: number; // advisor=1.3, creator=1.2, observer=0.9, passive=0.8
	platformVerification?: number; // 1.2 if verified, 1.0 otherwise
	voterConfidence?: number; // 0..1, defaults to 0.5
	antiAbuseMultiplier?: number; // 1.0, 0.75, 0.4, 0.1
}

export interface EffectiveDeltaResult {
	effectiveDelta: number;
	recencyFactor: number;
	contextWeight: number;
	confidenceMultiplier: number;
	antiAbuseMultiplier: number;
}

export function calculateEffectiveDelta(input: EffectiveDeltaInput): EffectiveDeltaResult {
	const {
		rawDelta,
		variableWeight,
		postCreatedAt,
		stakeLevel = 1.0,
		roleWeight = 1.0,
		platformVerification = 1.0,
		voterConfidence = 0.5,
		antiAbuseMultiplier = 1.0,
	} = input;

	const days = daysSince(postCreatedAt);
	const recencyFactor = Math.exp(-LAMBDA * days);

	// contextWeight clamped to [0.75, 1.35]
	const rawContextWeight = stakeLevel * roleWeight * platformVerification;
	const contextWeight = clamp(rawContextWeight, 0.75, 1.35);

	// confidenceMultiplier: 0.5 + 0.5 * voterConfidence → range [0.5, 1.0]
	const confidenceMultiplier = 0.5 + 0.5 * clamp(voterConfidence, 0, 1);

	const effectiveDelta =
		rawDelta *
		variableWeight *
		recencyFactor *
		contextWeight *
		confidenceMultiplier *
		antiAbuseMultiplier;

	return { effectiveDelta, recencyFactor, contextWeight, confidenceMultiplier, antiAbuseMultiplier };
}

// ─── Anti-abuse ─────────────────────────────────────────────────────────────

/**
 * Detect coordinated boost attempts. Returns an antiAbuseMultiplier.
 * Simplified heuristic: count distinct voters in the domain in the last 90 min.
 */
export async function getAntiAbuseMultiplier(
	_voterId: string,
	targetUserId: string,
	domainName: string,
): Promise<number> {
	const windowStart = new Date(Date.now() - 90 * 60 * 1000); // 90 minutes

	const recentEvents = await prisma.domainAimEvent.findMany({
		where: {
			userId: targetUserId,
			domainName,
			isReversed: false,
			createdAt: { gte: windowStart },
			voterUserId: { not: null },
		},
		select: { voterUserId: true },
	});

	const uniqueVoters = new Set(recentEvents.map((e) => e.voterUserId)).size;

	if (uniqueVoters >= 8) {
		// Flag potential coordinated boost on the domain score
		await prisma.userDomainScore
			.updateMany({
				where: { userId: targetUserId, domainName },
				data: { coordinatedBoostFlag: true },
			})
			.catch(() => {/* ignore if not yet created */});

		return 0.1; // coordinated burst
	}
	if (uniqueVoters >= 4) return 0.75; // mild suspicion
	return 1.0;
}

/**
 * Check for reaction-toggling spam: same voter casting the SAME type of vote
 * on the same post within 1 hour (prevents rapid toggle-on abuse).
 *
 * NOTE: switching from "peer_endorsement" to "peer_dispute" (Reliable → Not Reliable)
 * is a legitimate change of opinion and must NOT be blocked here.
 */
export async function isToggleSpam(
	voterId: string,
	postId: number,
	eventType: "peer_endorsement" | "peer_dispute",
): Promise<boolean> {
	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
	const existing = await prisma.domainAimEvent.findFirst({
		where: {
			postId,
			voterUserId: voterId,
			eventType,          // only block duplicate votes of the SAME type
			isReversed: false,
			createdAt: { gte: oneHourAgo },
		},
	});
	return existing !== null;
}

// ─── Domain score recalculation ─────────────────────────────────────────────

/**
 * Recalculate a user's domain AIM score from all non-reversed domain events.
 * Uses formula: domainScore = clamp(0.50 + Σ(effectiveDeltas), 0, 1)
 */
export async function recalculateDomainScore(
	userId: string,
	domainName: string,
): Promise<number> {
	const events = await prisma.domainAimEvent.findMany({
		where: { userId, domainName, isReversed: false },
		orderBy: { createdAt: "asc" },
	});

	const sumDeltas = events.reduce((s, e) => s + e.effectiveDelta, 0);
	// Spec: domainScore = clamp(0.50 + Σ(domain effectiveEventDeltas), 0, 1)
	// All users start neutral at 0.50; the score shifts up/down based on votes.
	const domainScore = clamp(0.5 + sumDeltas, 0, 1);

	// Domain confidence calculation
	const totalSignals = events.length;
	const positiveSignals = events.filter((e) => e.effectiveDelta > 0).length;
	const signalDiversity = Math.min(1, totalSignals / 20);
	const domainConfidence = clamp(
		signalDiversity * 0.8 + (positiveSignals / Math.max(1, totalSignals)) * 0.2,
		0,
		0.95,
	);

	// is_public: domain becomes visible in the profile once the user has 5 posts in that category.
	// Confidence threshold only applies to GLOBAL AIM ranking inclusion (in aimV2.ts),
	// NOT to profile visibility. Spec: "Un dominio solo es visible públicamente en el perfil
	// cuando el usuario alcanza 5 posteos en esa categoría."
	const existing = await prisma.userDomainScore.findUnique({
		where: { userId_domainName: { userId, domainName } },
		select: { interactionCount: true },
	});
	const interactionCount = existing?.interactionCount ?? 0;
	const isPublic = interactionCount >= 5;

	await prisma.userDomainScore.upsert({
		where: { userId_domainName: { userId, domainName } },
		update: {
			domainAimScore: domainScore,
			domainConfidence,
			isPublic,
			updatedAt: new Date(),
		},
		create: {
			userId,
			domainName,
			domainAimScore: domainScore,
			domainConfidence,
			interactionCount: 0,
			positiveSignals: 0,
			negativeSignals: 0,
			isPublic: false,
		},
	});

	return domainScore;
}

// ─── Signal count helpers ────────────────────────────────────────────────────

export async function updateSignalCount(
	userId: string,
	domainName: string,
	isPositive: boolean,
): Promise<void> {
	await prisma.userDomainScore.updateMany({
		where: { userId, domainName },
		data: isPositive
			? { positiveSignals: { increment: 1 }, lastActivityAt: new Date() }
			: { negativeSignals: { increment: 1 }, lastActivityAt: new Date() },
	});
}

// ─── Post created trigger ────────────────────────────────────────────────────

/**
 * Called after a new post is saved. Classifies the post, persists PostDomain rows,
 * increments interaction_count, and rechecks public visibility.
 */
export async function onPostCreated(post: {
	id: number;
	userId: string;
	content: string;
}): Promise<void> {
	const { primary, secondary, confidence, scores } = classifyPost("", post.content, []);
	if (!primary) return; // below minimum keyword score threshold

	const primaryRawScore = scores[primary] ?? 0;

	// Upsert primary domain classification
	// Use upsert to handle re-run gracefully (e.g. if trigger fires twice)
	const existingPrimary = await prisma.postDomain.findFirst({
		where: { postId: post.id, isPrimary: true },
	});
	if (existingPrimary) {
		await prisma.postDomain.update({
			where: { id: existingPrimary.id },
			data: {
				domainName: primary,
				confidenceScore: confidence,
				rawKeywordScore: primaryRawScore,
				classifiedAt: new Date(),
			},
		});
	} else {
		await prisma.postDomain.create({
			data: {
				postId: post.id,
				userId: post.userId,
				domainName: primary,
				confidenceScore: confidence,
				isPrimary: true,
				rawKeywordScore: primaryRawScore,
			},
		});
	}

	// Upsert secondary classification if present
	if (secondary) {
		const secondaryRawScore = scores[secondary] ?? 0;
		const existingSecondary = await prisma.postDomain.findFirst({
			where: { postId: post.id, isPrimary: false },
		});
		if (existingSecondary) {
			await prisma.postDomain.update({
				where: { id: existingSecondary.id },
				data: {
					domainName: secondary,
					confidenceScore: confidence * 0.4,
					rawKeywordScore: secondaryRawScore,
					classifiedAt: new Date(),
				},
			});
		} else {
			await prisma.postDomain.create({
				data: {
					postId: post.id,
					userId: post.userId,
					domainName: secondary,
					confidenceScore: confidence * 0.4,
					isPrimary: false,
					rawKeywordScore: secondaryRawScore,
				},
			});
		}
	}

	// Increment interaction count for the primary domain
	const domainScore = await prisma.userDomainScore.upsert({
		where: { userId_domainName: { userId: post.userId, domainName: primary } },
		update: {
			interactionCount: { increment: 1 },
			lastActivityAt: new Date(),
		},
		create: {
			userId: post.userId,
			domainName: primary,
			domainAimScore: 0.5, // spec: all users start neutral at 0.50
			domainConfidence: 0,
			interactionCount: 1,
			positiveSignals: 0,
			negativeSignals: 0,
			lastActivityAt: new Date(),
			isPublic: false,
		},
	});

	// Visibility gate: as soon as the user reaches 5 posts in this domain, flip isPublic = true.
	// This fires instantly — no votes needed — so the domain appears in the profile right away.
	// Trust votes then move the score up/down from the 0.50 neutral baseline.
	if (domainScore.interactionCount >= 5 && !domainScore.isPublic) {
		await prisma.userDomainScore.update({
			where: { userId_domainName: { userId: post.userId, domainName: primary } },
			data: { isPublic: true },
		});
	}
}

// ─── Trust vote trigger ──────────────────────────────────────────────────────

export interface TrustVoteInput {
	postId: number;
	postCreatedAt: Date;
	postUserId: string;
	voterId: string;
	voterAimScore: number;
	voterAimConfidence: number;
	voterVerified: boolean;
	isPositive: boolean;
}

/**
 * Called when a user casts a "confiable" or "not_reliable" reaction on a post.
 * Records a DomainAimEvent and recalculates the domain score.
 */
export async function onTrustVote(input: TrustVoteInput): Promise<void> {
	const {
		postId,
		postCreatedAt,
		postUserId,
		voterId,
		voterAimScore,
		voterAimConfidence,
		voterVerified,
		isPositive,
	} = input;

	// 1. Prevent self-voting from having meaningful impact
	//    Self-report cap: rawDelta × 0.2
	const isSelfVote = voterId === postUserId;

	// 2. Check for reaction-toggling spam (same voter + same type on same post within 1h)
	const eventType = isPositive ? "peer_endorsement" : "peer_dispute";
	if (await isToggleSpam(voterId, postId, eventType)) return;

	// 3. Get the primary domain of this post
	const postDomain = await prisma.postDomain.findFirst({
		where: { postId, isPrimary: true },
	});
	if (!postDomain) return; // post was not classifiable — no domain event

	const domainName = postDomain.domainName;

	// 4. Verify anti-abuse multiplier
	const antiAbuseMultiplier = await getAntiAbuseMultiplier(voterId, postUserId, domainName);

	// 5. Calculate rawDelta (peer_endorsement / peer_dispute)
	// Voter Tier Multiplier: classifies voter into Tier 1/2/3 and scales their impact.
	//   Tier 1 (AIM > 0.75 AND confidence > 0.75) → 1.0×
	//   Tier 2 (AIM 0.40–0.74)                    → 0.7×
	//   Tier 3 (AIM < 0.40 or new account)        → 0.10–0.50× (linear)
	const tierMultiplier = getVoterTierMultiplier(voterAimScore, voterAimConfidence);
	const baseRawDelta = isPositive ? 0.025 : -0.025;
	const scaledDelta  = baseRawDelta * tierMultiplier;          // tier scales the base impact
	const rawDelta     = isSelfVote ? scaledDelta * 0.2 : scaledDelta; // self-report cap on top
	const variableWeight = 1.0; // peer_validation weight from spec

	// 6. roleWeight and platformVerification for voter
	const roleWeight = voterVerified ? 1.2 : 1.0;
	const platformVerification = voterVerified ? 1.2 : 1.0;

	// 7. Compute effective delta with full formula
	const result = calculateEffectiveDelta({
		rawDelta,
		variableWeight,
		postCreatedAt,
		roleWeight,
		platformVerification,
		voterConfidence: voterAimConfidence,
		antiAbuseMultiplier,
	});

	// 8. Persist domain AIM event
	await prisma.domainAimEvent.create({
		data: {
			userId: postUserId,
			postId,
			domainName,
			eventType,
			rawDelta,
			variableWeight,
			recencyFactor: result.recencyFactor,
			contextWeight: result.contextWeight,
			confidenceMultiplier: result.confidenceMultiplier,
			antiAbuseMultiplier: result.antiAbuseMultiplier,
			effectiveDelta: result.effectiveDelta,
			voterUserId: voterId,
			voterAimScore,
		},
	});

	// 9. Update signal counters and last activity
	await updateSignalCount(postUserId, domainName, isPositive);

	// 10. Recalculate domain AIM score
	await recalculateDomainScore(postUserId, domainName);

	// 11. Trigger global AIM recompute (domain scores now feed into globalAIM)
	await recomputeAIMScore(postUserId, domainName);
}

// ─── Post deleted handler ────────────────────────────────────────────────────

/**
 * When a post is deleted, mark all its domain events as reversed and
 * recalculate affected domain scores.
 */
export async function onPostDeleted(postId: number): Promise<void> {
	// Find all domain events for this post
	const events = await prisma.domainAimEvent.findMany({
		where: { postId, isReversed: false },
		select: { userId: true, domainName: true },
	});

	// Reverse all events
	await prisma.domainAimEvent.updateMany({
		where: { postId },
		data: { isReversed: true },
	});

	// Decrement interaction count for each affected domain
	const postDomains = await prisma.postDomain.findMany({
		where: { postId, isPrimary: true },
		select: { userId: true, domainName: true },
	});

	for (const pd of postDomains) {
		await prisma.userDomainScore.updateMany({
			where: { userId: pd.userId, domainName: pd.domainName },
			data: { interactionCount: { decrement: 1 } },
		});
	}

	// Recalculate scores for all affected user/domain pairs
	const affectedPairs = new Map<string, Set<string>>();
	for (const e of events) {
		if (!affectedPairs.has(e.userId)) affectedPairs.set(e.userId, new Set());
		affectedPairs.get(e.userId)!.add(e.domainName);
	}

	for (const [userId, domains] of affectedPairs) {
		for (const domainName of domains) {
			await recalculateDomainScore(userId, domainName);
			await recomputeAIMScore(userId, domainName);
		}
	}
}

// ─── Domain decay ────────────────────────────────────────────────────────────

/**
 * Daily domain decay job. Applies inactivity decay to all active domain scores
 * that haven't had activity in > 14 days.
 */
export async function runDomainDecay(): Promise<void> {
	const domainScores = await prisma.userDomainScore.findMany({
		where: { isPublic: true },
	});

	for (const ds of domainScores) {
		const lastActivity = ds.lastActivityAt ?? ds.createdAt;
		const inactiveDays = daysSince(lastActivity);

		if (inactiveDays < 14) continue; // grace period

		// qualityShield reduces decay for high-confidence profiles
		const qualityShield = Math.min(0.8, ds.domainConfidence);
		const baseDecayRate = 0.002;
		const decayAmount = baseDecayRate * (1 - qualityShield);

		// Do not apply decay if there's a severe negative event less than 30 days old
		// (Quiet Account Laundering protection — Part 7.4)
		const recentSevere = await prisma.domainAimEvent.findFirst({
			where: {
				userId: ds.userId,
				domainName: ds.domainName,
				isReversed: false,
				effectiveDelta: { lt: -0.05 },
				createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
			},
		});
		if (recentSevere) continue; // skip decay while severe negative is recent

		// Record inactivity_decay event
		await prisma.domainAimEvent.create({
			data: {
				userId: ds.userId,
				domainName: ds.domainName,
				eventType: "inactivity_decay",
				rawDelta: -decayAmount,
				effectiveDelta: -decayAmount,
				variableWeight: 1.0,
				recencyFactor: 1.0,
				contextWeight: 1.0,
				confidenceMultiplier: 1.0,
				antiAbuseMultiplier: 1.0,
			},
		});

		await recalculateDomainScore(ds.userId, ds.domainName);
	}
}

// ─── Weekly score snapshot for trend calculation ─────────────────────────────

/**
 * Weekly job: save current domain scores as the "7-days-ago" baseline.
 */
export async function snapshotDomainScores(): Promise<void> {
	const scores = await prisma.userDomainScore.findMany();
	for (const s of scores) {
		await prisma.userDomainScore.update({
			where: { id: s.id },
			data: { scoreAt7dAgo: s.domainAimScore },
		});
	}
}

// ─── API helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the requester's userId from a JWT Bearer token.
 * Returns null if token is absent or invalid.
 */
export function extractUserIdFromBearer(authHeader: string | undefined): string | null {
	if (!authHeader?.startsWith("Bearer ")) return null;
	try {
		const secret = process.env.JWT_SECRET;
		if (!secret) return null;
		const payload = jwt.verify(authHeader.slice("Bearer ".length), secret) as any;
		return payload.sub as string ?? null;
	} catch {
		return null;
	}
}
