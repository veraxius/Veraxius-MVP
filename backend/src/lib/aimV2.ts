/**
 * AIM Score Engine — V2
 * =====================
 * Implements the Veraxius AIM Score (Accountability Integrity Metric) system.
 *
 * Architecture:  Signals → processAimSignal() → AimEvent → recomputeAIMScore()
 *
 * Formula:
 *   AIMScore = clamp(baseScore + Σ(effectiveEventDelta × recencyFactor), 0, 1)
 *   effectiveEventDelta = rawDelta × variableWeight × contextWeight
 *                         × confidenceMultiplier × antiAbuseMultiplier
 *                         × sourceCredibilityFactor
 *
 * Convention for stored events:
 *   event.delta  = pre-computed effectiveDelta WITHOUT recency (recency changes over time)
 *   event.weight = variableWeight (for audit)
 *   event.contextWeight = contextWeight (for audit)
 *   In recomputeAIMScore(): effectiveDelta = event.delta × recencyFactor(daysSinceEvent)
 */

import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";
import {
	normalizeSignal,
	generateIdempotencyKey,
	type SignalKind,
	type SignalSource,
} from "./signalNormalizer";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AIMCFG = require("../../aim.config.js");

// ─── Shared Types ──────────────────────────────────────────────────────────────

export type StakeLevel          = "high" | "standard" | "low";
export type RoleWeight          = "advisor" | "creator" | "peer" | "observer";
export type PlatformVerification = "verified" | "selfReported" | "none";
type VerificationKind           = "none" | "email" | "identity";

export type ContextWeightInput = {
	stakeLevel?:           StakeLevel;
	roleWeight?:           RoleWeight;
	platformVerification?: PlatformVerification;
};

// ─── Pure Helpers ──────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, v));
}

/**
 * Temporal recency factor — decays exponentially.
 * recencyFactor = Math.exp(-lambda × daysSince)
 * At 0 days = 1.0; at 14 days ≈ 0.50; at 28 days ≈ 0.25
 */
function recencyFactor(daysSince: number): number {
	return Math.exp(-AIMCFG.recencyLambda * daysSince);
}

/**
 * Context weight = clamp(stakeLevel × roleWeight × platformVerification, 0.75, 1.35)
 * Always clamped per spec; prevents extreme outliers from single sources.
 */
function getContextWeight(ctx?: ContextWeightInput): number {
	if (!ctx) return 1.0;
	const stake = ctx.stakeLevel          ?? "standard";
	const role  = ctx.roleWeight           ?? "peer";
	const pv    = ctx.platformVerification ?? "none";
	const raw =
		(AIMCFG.contextWeights.stakeLevel[stake]             ?? 1) *
		(AIMCFG.contextWeights.roleWeight[role]               ?? 1) *
		(AIMCFG.contextWeights.platformVerification[pv]       ?? 1);
	return clamp(raw, AIMCFG.contextClamp.min, AIMCFG.contextClamp.max);
}

function daysBetween(a: Date, b: Date): number {
	return (b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000);
}

/**
 * Voter Tier Multiplier — classifies the voter into Tier 1 / 2 / 3
 * based on their AIM score AND confidence, then returns the weight multiplier
 * that scales how much their Reliable / Not Reliable vote matters.
 *
 *   Tier 1 (High Authority):  aimScore > 0.75 AND confidence > 0.75 → 1.0x
 *   Tier 2 (Standard):        aimScore 0.40–0.74                     → 0.7x
 *   Tier 3 (New / Low Trust): aimScore < 0.40 OR new account         → 0.10–0.50x (linear)
 */
export function getVoterTierMultiplier(aimScore: number, aimConfidence: number): number {
	const cfg = AIMCFG.voterTiers;

	// Tier 1 — both AIM score and confidence must exceed the high-authority thresholds
	if (aimScore >= cfg.tier1.minAim && aimConfidence >= cfg.tier1.minConfidence) {
		return cfg.tier1.multiplier; // 1.00×
	}

	// Tier 2 — mid-range score
	if (aimScore >= cfg.tier2.minAim) {
		return cfg.tier2.multiplier; // 0.70×
	}

	// Tier 3 — low score or new account: linear scale between 0.10 and 0.50
	const t3       = cfg.tier3;
	const fraction = clamp(aimScore, 0, t3.aimMax) / t3.aimMax;
	return t3.multiplierMin + fraction * (t3.multiplierMax - t3.multiplierMin);
}

/**
 * Core delta builder — implements the full effectiveEventDelta formula.
 * Returns the delta to store on the AimEvent (recency is NOT applied here;
 * recency is applied dynamically in recomputeAIMScore).
 */
function buildEffectiveDelta({
	rawDelta,
	variableWeight,
	contextWeight,
	confidenceMultiplier,
	antiAbuseMultiplier,
	sourceCredibilityFactor = 1.0,
}: {
	rawDelta:                number;
	variableWeight:          number;
	contextWeight:           number;
	confidenceMultiplier:    number;
	antiAbuseMultiplier:     number;
	sourceCredibilityFactor?: number;
}): number {
	return (
		rawDelta *
		variableWeight *
		contextWeight *
		confidenceMultiplier *
		antiAbuseMultiplier *
		sourceCredibilityFactor
	);
}

// ─── VARIABLE 1 — RELIABILITY ────────────────────────────────────────────────

export async function recordOutcome(
	userId:       string,
	interactionId: string,
	quality:      number,          // 0..1
	verifiedBy?:  string,
	domain?:      string,
	context?:     ContextWeightInput,
) {
	const now = new Date();
	const recent = await prisma.aimOutcome.findMany({
		where: { userId },
		orderBy: { createdAt: "desc" },
		take: Math.max(
			AIMCFG.reliability.streakBonusWindow,
			AIMCFG.reliability.streakPenaltyWindow,
		),
	});

	// Third-party verification boosts quality
	const adjustedQuality = Math.min(1, quality + (verifiedBy ? AIMCFG.reliability.verifiedBoost : 0));
	const rawDelta = (adjustedQuality - 0.5) * AIMCFG.reliability.baseMultiplier;

	// Streak bonuses / penalties
	const last5   = recent.slice(0, AIMCFG.reliability.streakBonusWindow);
	const last3   = recent.slice(0, AIMCFG.reliability.streakPenaltyWindow);
	const bonus   = last5.length === AIMCFG.reliability.streakBonusWindow && last5.every(o => Number(o.quality) > 0.7);
	const penalty = last3.length === AIMCFG.reliability.streakPenaltyWindow && last3.every(o => Number(o.quality) < 0.3);

	let scaledDelta = rawDelta;
	if (scaledDelta > 0 && bonus)   scaledDelta *= AIMCFG.reliability.streakBonusMultiplier;
	if (scaledDelta < 0 && penalty) scaledDelta *= AIMCFG.reliability.streakPenaltyMultiplier;

	const cw = getContextWeight(context);
	// No confidenceMultiplier for system-emitted reliability events (source = system)
	const effectiveDelta = buildEffectiveDelta({
		rawDelta: scaledDelta,
		variableWeight: AIMCFG.variableWeights.reliability,
		contextWeight: cw,
		confidenceMultiplier: 1.0,      // system events use full confidence
		antiAbuseMultiplier: 1.0,
		sourceCredibilityFactor: verifiedBy ? 1.0 : 0.85,
	});

	await prisma.$transaction([
		prisma.aimOutcome.upsert({
			where: { userId_interactionId: { userId, interactionId } },
			update:  { quality: new Prisma.Decimal(adjustedQuality), verifiedBy },
			create:  { userId, interactionId, quality: new Prisma.Decimal(adjustedQuality), verifiedBy },
		}),
		prisma.aimEvent.create({
			data: {
				userId,
				eventType: "reliability",
				signal: quality >= 0.5 ? "outcome_success" : "outcome_failure",
				delta: effectiveDelta,
				weight: AIMCFG.variableWeights.reliability,
				domain,
				contextWeight: cw,
				metadata: {
					interactionId,
					quality: adjustedQuality,
					verifiedBy,
					rawDelta,
					scaledDelta,
				},
			},
		}),
		prisma.user.update({ where: { id: userId }, data: { lastActiveAt: now } }),
	]);
}

// ─── VARIABLE 2 — CONSISTENCY ────────────────────────────────────────────────

export async function runConsistencyCheck(userId: string) {
	const now           = new Date();
	const sevenDaysAgo  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
	const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

	const recentPosts   = await prisma.post.count({ where: { userId, createdAt: { gte: sevenDaysAgo } } });
	const baselinePosts = await prisma.post.count({ where: { userId, createdAt: { gte: thirtyDaysAgo, lt: sevenDaysAgo } } });
	const postFreqDev   = baselinePosts > 0 ? (baselinePosts - recentPosts) / baselinePosts : 0;

	const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
	const recentReactions  = await prisma.postReaction.count({ where: { userId, post: { createdAt: { gte: fourteenDaysAgo } } } });
	const priorReactions   = await prisma.postReaction.count({ where: { userId, post: { createdAt: { lt: fourteenDaysAgo, gte: thirtyDaysAgo } } } });
	const votePatternDev   = (priorReactions + recentReactions) > 0
		? Math.abs(recentReactions - priorReactions) / Math.max(1, priorReactions) : 0;

	const user           = await prisma.user.findUnique({ where: { id: userId }, select: { aimDomainPrimary: true } });
	const primary        = user?.aimDomainPrimary ?? undefined;
	const domainScoreRec = primary ? await prisma.aimDomainScore.findUnique({ where: { userId_domain: { userId, domain: primary } } }) : null;
	const hasPrimaryActivity = (domainScoreRec?.interactionCount ?? 0) > 0;

	let breaks  = 0;
	let matches = 0;
	if (postFreqDev > 0.7)      breaks  += 1;
	if (votePatternDev > 0.4)   breaks  += 1;
	if (primary && !hasPrimaryActivity) breaks  += 1;
	if (primary && hasPrimaryActivity)  matches += 1;

	await prisma.aimConsistency.upsert({
		where:  { userId },
		update: { breakCount: breaks, matchCount: matches, lastSnapshot: { postFreqDev, votePatternDev, primary, hasPrimaryActivity } },
		create: { userId, breakCount: breaks, matchCount: matches, lastSnapshot: { postFreqDev, votePatternDev, primary, hasPrimaryActivity } },
	});

	type EventData = Parameters<typeof prisma.aimEvent.create>[0]["data"];
	const events: EventData[] = [];
	const cfg = AIMCFG.consistency;

	if (postFreqDev > 0.7)   events.push({ userId, eventType: "consistency", signal: "consistency_break", delta: cfg.breakPenaltyB, weight: 1, contextWeight: 1, metadata: { kind: "post_frequency_drop",   value: postFreqDev } });
	if (votePatternDev > 0.4) events.push({ userId, eventType: "consistency", signal: "consistency_break", delta: cfg.breakPenaltyC, weight: 1, contextWeight: 1, metadata: { kind: "vote_pattern_change",   value: votePatternDev } });
	if (primary && !hasPrimaryActivity) events.push({ userId, eventType: "consistency", signal: "consistency_break", delta: cfg.breakPenaltyD, weight: 1, contextWeight: 1, metadata: { kind: "claim_action_alignment", primary } });
	if (primary && hasPrimaryActivity)  events.push({ userId, eventType: "consistency", signal: "consistency_match", delta: cfg.matchBonusD,   weight: 1, contextWeight: 1, metadata: { kind: "claim_action_alignment", primary } });

	if (events.length) {
		await prisma.$transaction(events.map(data => prisma.aimEvent.create({ data })));
	}
}

// ─── VARIABLE 3 — PEER VALIDATION ───────────────────────────────────────────

export async function recordPeerFeedback(params: {
	targetId:            string;
	voterId:             string;
	postId?:             number;   // used for per-post cooldown (prevents cross-post blocking)
	type:                "endorsement" | "dispute";
	domain?:             string;
	aimVoter?:           number;   // voter's current aimScore
	aimVoterConfidence?: number;   // voter's current confidence (0–1); used for tier classification
	networkDistance:     1 | 2 | 3;
	diversity:           "same" | "different";
}) {
	const { targetId, voterId, postId, type, domain, aimVoter = 0.5, aimVoterConfidence = 0, networkDistance, diversity } = params;
	const now = new Date();

	// ── Rate Limit: max 20 peer_validation events per user per 24h ───────────
	const since24h      = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	const receivedCount = await prisma.aimEvent.count({
		where: { userId: targetId, eventType: "peer_validation", createdAt: { gte: since24h } },
	});
	if (receivedCount >= AIMCFG.peerValidation.maxReceivedVotes24h) {
		return { skipped: true, reason: "rate_limited_24h" };
	}

	// ── Cooldown: same voter cannot vote on the SAME POST within 7 days ───────
	// Per-post scope: Not Reliable on post B must never be blocked just because
	// the same voter already clicked Reliable on post A by the same author.
	const cooldownSince = new Date(now.getTime() - AIMCFG.peerValidation.voteCooldownDays * 24 * 60 * 60 * 1000);
	const recentVote = await prisma.aimEvent.findFirst({
		where: {
			userId:    targetId,
			eventType: "peer_validation",
			createdAt: { gte: cooldownSince },
			AND: [
				{ metadata: { path: ["voterId"], equals: voterId } },
				// When postId is known, scope cooldown to that specific post.
				// This allows the voter to vote on different posts by the same author.
				...(postId !== undefined
					? [{ metadata: { path: ["postId"], equals: postId } } as Prisma.AimEventWhereInput]
					: []),
			],
		},
	});
	if (recentVote) {
		return { skipped: true, reason: "cooldown_active" };
	}

	// ── Burst/Coordination Detection ─────────────────────────────────────────
	// Count all peer_validation events the target received in the coordination window
	const coordWindowStart = new Date(now.getTime() - AIMCFG.peerValidation.coordinationWindowHours * 60 * 60 * 1000);
	const burstCount = (await prisma.aimEvent.count({
	where: { userId: targetId, eventType: "peer_validation", createdAt: { gte: coordWindowStart } },
    })) + 1;

	let suspicion: "normal" | "mild" | "strong" | "coordinated" = "normal";
	const thresholds = AIMCFG.peerValidation.coordinationBurst;
	if (burstCount >= thresholds.critical) suspicion = "coordinated";
	else if (burstCount >= thresholds.strong) suspicion = "strong";
	else if (burstCount >= thresholds.mild)   suspicion = "mild";

	const flagged = suspicion !== "normal";
	if (flagged) {
		await prisma.aimFlag.create({
			data: {
				userId:   targetId,
				flagType: `coordination_${suspicion}`,
				metadata: { since: coordWindowStart, burstCount, voterId, suspicion },
			},
		});
	}

	// ── Voter Tier Multiplier ─────────────────────────────────────────────────
	// Classifies the voter into Tier 1 / 2 / 3 based on their own AIM + confidence.
	// This is applied to rawDelta before all other multipliers.
	const tierMultiplier = getVoterTierMultiplier(aimVoter, aimVoterConfidence);

	// ── Build effectiveDelta using the full formula ───────────────────────────
	const baseRawDelta     = AIMCFG.peerValidation[type === "endorsement" ? "rawDeltaEndorsement" : "rawDeltaDispute"];
	const rawDelta         = baseRawDelta * tierMultiplier;  // tier scales the raw impact
	const variableWeight   = AIMCFG.variableWeights.peer_validation;

	const ndFactor = networkDistance === 1 ? AIMCFG.peerValidation.networkDistanceFactor.direct
	              : networkDistance === 2  ? AIMCFG.peerValidation.networkDistanceFactor.second
	              :                          AIMCFG.peerValidation.networkDistanceFactor.none;
	const dvFactor = diversity === "same"
		? AIMCFG.peerValidation.diversityFactor.same
		: AIMCFG.peerValidation.diversityFactor.different;

	// contextWeight = clamp(ndFactor × dvFactor, 0.75, 1.35)
	const cw = clamp(ndFactor * dvFactor, AIMCFG.contextClamp.min, AIMCFG.contextClamp.max);

	// confidenceMultiplier = 0.5 + 0.5 × voterScore   (range [0.5, 1.0])
	const effectiveVoterScore = Math.max(AIMCFG.baseScore, aimVoter);
	const confMult = AIMCFG.confidence.multiplier.base + AIMCFG.confidence.multiplier.span * effectiveVoterScore;

	const antiAbuseMult: number = AIMCFG.antiAbuse[suspicion];

	const effectiveDelta = buildEffectiveDelta({
		rawDelta,
		variableWeight,
		contextWeight:           cw,
		confidenceMultiplier:    confMult,
		antiAbuseMultiplier:     antiAbuseMult,
		sourceCredibilityFactor: 1.0,
	});

	await prisma.aimEvent.create({
		data: {
			userId:       targetId,
			eventType:    "peer_validation",
			signal:       type === "endorsement" ? "peer_endorsement" : "peer_dispute",
			delta:        effectiveDelta,
			weight:       variableWeight,
			domain,
			contextWeight: cw,
			metadata: {
				voterId,
				postId: postId ?? null,
				networkDistance,
				diversity,
				aimVoter,
				aimVoterConfidence,
				tierMultiplier,
				effectiveVoterScore,
				confMult,
				antiAbuseMult,
				suspicion,
				flagged,
				baseRawDelta,
				rawDelta,
			},
		},
	});

	return { ok: true, delta: effectiveDelta, suspicion, flagged, tierMultiplier };
}

// ─── UNIFIED SIGNAL ENTRY POINT (Signals → Events) ───────────────────────────

export interface ProcessSignalInput {
	/** ID of the user whose score is being affected. */
	userId:          string;
	/** Normalized signal kind (from SignalKind taxonomy). */
	kind:            SignalKind;
	/** Origin of the signal — determines source credibility. */
	source?:         SignalSource;
	/** Optional context for contextWeight calculation. */
	context?:        ContextWeightInput;
	/** AIM score of the acting party (for confidenceMultiplier). Defaults to baseScore. */
	voterScore?:     number;
	/** Reference ID (postId, interactionId, etc.) used for idempotency. */
	refId?:          string;
	/** Explicit idempotency key — auto-generated from userId:kind:refId if omitted. */
	idempotencyKey?: string;
	/** Domain tag for the event. */
	domain?:         string;
	/** Override anti-abuse multiplier (e.g., from external abuse detection). */
	antiAbuseMultiplier?: number;
}

export interface ProcessSignalResult {
	ok:              boolean;
	skipped?:        boolean;
	reason?:         string;
	effectiveDelta?: number;
	eventId?:        string;
}

/**
 * Unified entry point for the Signals → Events → Score Update architecture.
 *
 * 1. Normalizes the signal via signalNormalizer
 * 2. Checks idempotency — returns early if already processed
 * 3. Computes effectiveDelta = rawDelta × variableWeight × contextWeight
 *                              × confidenceMultiplier × antiAbuseMultiplier
 *                              × sourceCredibilityFactor
 * 4. Persists an AimEvent
 * 5. Returns result (caller is responsible for triggering recomputeAIMScore)
 */
export async function processAimSignal(input: ProcessSignalInput): Promise<ProcessSignalResult> {
	const {
		userId,
		kind,
		source = "peer",
		context,
		voterScore,
		refId,
		domain,
		antiAbuseMultiplier = 1.0,
	} = input;

	// ── Idempotency check ─────────────────────────────────────────────────────
	const iKey = input.idempotencyKey ?? (refId ? generateIdempotencyKey(userId, kind, refId) : null);
	if (iKey) {
		const existing = await prisma.aimEvent.findFirst({
			where: { userId, metadata: { path: ["idempotencyKey"], equals: iKey } },
			select: { id: true, delta: true },
		});
		if (existing) {
			return { ok: true, skipped: true, reason: "idempotent_duplicate", effectiveDelta: existing.delta, eventId: existing.id };
		}
	}

	// ── Normalize signal ──────────────────────────────────────────────────────
	const ns = normalizeSignal(kind, source);

	// ── Compute multipliers ───────────────────────────────────────────────────
	const cw       = getContextWeight(context);
	const effectiveVoterScore = Math.max(AIMCFG.baseScore, voterScore ?? AIMCFG.baseScore);
	const confMult = AIMCFG.confidence.multiplier.base + AIMCFG.confidence.multiplier.span * effectiveVoterScore;

	const effectiveDelta = buildEffectiveDelta({
		rawDelta:              ns.rawDelta,
		variableWeight:        ns.variableWeight * ns.sourceCredibilityFactor,
		contextWeight:         cw,
		confidenceMultiplier:  confMult,
		antiAbuseMultiplier,
		sourceCredibilityFactor: 1.0, // already baked into variableWeight above
	});

	// ── Persist event ─────────────────────────────────────────────────────────
	const event = await prisma.aimEvent.create({
		data: {
			userId,
			eventType:    ns.eventType,
			signal:       ns.signal,
			delta:        effectiveDelta,
			weight:       ns.variableWeight,
			domain,
			contextWeight: cw,
			metadata: {
				kind,
				source,
				rawDelta:              ns.rawDelta,
				confMult,
				antiAbuseMultiplier,
				sourceCredibilityFactor: ns.sourceCredibilityFactor,
				...(iKey ? { idempotencyKey: iKey } : {}),
				...(refId ? { refId } : {}),
			},
		},
	});

	return { ok: true, effectiveDelta, eventId: event.id };
}

// ─── VARIABLE 4 — CONTRADICTION ───────────────────────────────────────────────

export async function openChallenge(
	challengerId: string,
	targetId:     string,
	reason:       string,
	severity:     1 | 2 | 3,
) {
	const ch = await prisma.aimChallenge.create({
		data: { challengerId, targetUserId: targetId, reason, severity, status: "pending" },
	});

	const p = AIMCFG.contradiction;
	const provisional = severity === 1 ? p.level1.provisional
	                 : severity === 2  ? p.level2.provisional
	                 :                   p.level3.provisional;

	// Provisional penalty event for every severity level
	await prisma.aimEvent.create({
		data: {
			userId:       targetId,
			eventType:    "contradiction",
			signal:       `challenge_opened_l${severity}`,
			delta:        provisional,                   // negative value
			weight:       AIMCFG.variableWeights.contradiction,
			contextWeight: 1.0,
			metadata: { challengeId: ch.id, severity, provisional, challengerId },
		},
	});

	// L3 additionally raises a public flag
	if (severity === 3) {
		await prisma.aimFlag.create({
			data: {
				userId:   targetId,
				flagType: "level3_contradiction",
				metadata: { challengeId: ch.id, reason, challengerId },
			},
		});
	}

	return ch;
}

export async function resolveChallenge(
	challengeId: string,
	resolution:  "upheld" | "dismissed" | "mixed" | "malicious",
) {
	const ch = await prisma.aimChallenge.update({
		where: { id: challengeId },
		data:  { status: "resolved", resolution },
	});
	const targetId = ch.targetUserId;
	const sev      = ch.severity as 1 | 2 | 3;
	const p        = AIMCFG.contradiction;

	// Retrieve the provisional penalty applied when the challenge was opened
	const origProvisional = sev === 1 ? p.level1.provisional
	                     : sev === 2  ? p.level2.provisional
	                     :              p.level3.provisional;  // negative value

	let targetDelta    = 0;
	let challengerDelta = 0;

	switch (resolution) {
		case "upheld":
			// Validated: keep provisional and deepen slightly
			targetDelta = p.resolved.upheld.deepenBy;   // additional negative delta
			break;

		case "dismissed":
			// Reversed: 100% of provisional penalty undone → positive reversal event
			targetDelta = -origProvisional * p.resolved.dismissed.reversePercent;
			break;

		case "mixed": {
			// Partial reversal: 30–60% of penalty reversed (use midpoint)
			const pct = (p.resolved.mixed.reversePercentMin + p.resolved.mixed.reversePercentMax) / 2;
			targetDelta = -origProvisional * pct;        // positive (partial reversal)
			break;
		}

		case "malicious":
			// Reversed for target + challenger is penalized
			targetDelta     = -origProvisional * p.resolved.dismissed.reversePercent; // full reversal for target
			challengerDelta = p.resolved.maliciousByAccuser.penalizeAccuser;          // negative for challenger
			break;
	}

	const txOps: Prisma.PrismaPromise<unknown>[] = [];

	if (targetDelta !== 0) {
		txOps.push(
			prisma.aimEvent.create({
				data: {
					userId:       targetId,
					eventType:    "contradiction",
					signal:       `challenge_resolved_${resolution}`,
					delta:        targetDelta,
					weight:       AIMCFG.variableWeights.contradiction,
					contextWeight: 1.0,
					metadata: { challengeId, severity: sev, origProvisional, resolution },
				},
			}),
		);
	}

	// Penalize malicious challenger on their own record
	if (challengerDelta !== 0 && ch.challengerId) {
		txOps.push(
			prisma.aimEvent.create({
				data: {
					userId:       ch.challengerId,
					eventType:    "contradiction",
					signal:       "challenge_malicious_accusation",
					delta:        challengerDelta,
					weight:       AIMCFG.variableWeights.contradiction,
					contextWeight: 1.0,
					metadata: { challengeId, severity: sev, targetId, resolution },
				},
			}),
		);
	}

	if (txOps.length) await prisma.$transaction(txOps);

	return { ch, targetDelta, challengerDelta };
}

// ─── VARIABLE 5 — DECAY ───────────────────────────────────────────────────────

/**
 * Daily cron job: apply inactivity decay to all users.
 * Decay ONLY kicks in after AIMCFG.decay.inactivityThresholdDays (30) days of inactivity.
 * qualityShield reduces the rate for users with a strong historical track record.
 */
export async function applyDecayToAllUsers() {
	const now   = new Date();
	const users = await prisma.user.findMany({
		select: { id: true, aimScore: true, created_at: true, lastActiveAt: true },
	});

	for (const u of users) {
		const lastActive = u.lastActiveAt ?? u.created_at;
		const days       = daysBetween(lastActive, now);

		// Grace period — no decay before threshold
		if (days < AIMCFG.decay.inactivityThresholdDays) continue;

		// Time multiplier from the table (first match wins)
		const tm = AIMCFG.decay.timeMultipliers.find((t: { maxDays: number; multiplier: number }) => days <= t.maxDays)?.multiplier ?? 2.0;
		if (tm === 0) continue; // still in grace window per table

		// qualityShield: proportional to historical outcome quality
		const outcomes = await prisma.aimOutcome.findMany({
			where:  { userId: u.id },
			select: { quality: true },
		});
		const totalInteractions = outcomes.length;
		const historicalQualityAvg = outcomes.length
			? outcomes.reduce((a, b) => a + Number(b.quality), 0) / outcomes.length
			: 0.5;
		const qualityShield = Math.min(
			AIMCFG.decay.qualityShieldCap,
			historicalQualityAvg * Math.min(1, totalInteractions / 100),
		);

		const dailyDecayRate = AIMCFG.decay.baseDailyRate * (1 - qualityShield) * tm;
		const floor          = Math.max(AIMCFG.decay.minFloor, u.aimScore * AIMCFG.decay.decayFloorFactor);
		const newDelta       = -dailyDecayRate;
		const newScore       = clamp(u.aimScore + newDelta, floor, 1);

		if (newScore !== u.aimScore) {
			await prisma.$transaction([
				prisma.user.update({
					where: { id: u.id },
					data:  { aimScore: newScore },
				}),
				prisma.aimEvent.create({
					data: {
						userId:       u.id,
						eventType:    "decay",
						signal:       "inactivity_decay",
						delta:        newDelta,
						weight:       1,
						contextWeight: 1,
						metadata: { daysInactive: days, qualityShield, dailyDecayRate, tm },
					},
				}),
			]);
		}
	}
}

// ─── VARIABLE 6 — CONFIDENCE ─────────────────────────────────────────────────

/**
 * Confidence score — non-linear, friction-based growth model.
 *
 * Rules:
 *  1. Logarithmic signal factor — harder to grow near the top
 *  2. Early-phase cap: < 10 signals → hard ceiling of 0.18 (prevents instant authority)
 *  3. Stability gate: account age < 45 days → growth capped at 0.78
 *  4. Recovery damping: recent failure rate > 20% → reduces positive confidence growth
 *  5. Multi-domain bonus: active in multiple public domains adds a small multiplier
 *  6. Verification bonus: identity / email verified accounts get a boost
 */
export async function calculateConfidence(userId: string, verificationFallback: VerificationKind): Promise<number> {
	const cfg = AIMCFG.confidence;
	const now = new Date();

	const [events, latestVerification, activeDomains] = await Promise.all([
		prisma.aimEvent.findMany({
			where:   { userId },
			orderBy: { createdAt: "asc" },
			select:  { eventType: true, delta: true, createdAt: true },
		}),
		prisma.aimEvent.findFirst({
			where:   { userId, eventType: "confidence", signal: "verification_status_changed" },
			orderBy: { createdAt: "desc" },
			select:  { metadata: true },
		}),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(prisma as any).userDomainScore.count({
			where: { userId, isPublic: true, interactionCount: { gte: 5 } },
		}) as Promise<number>,
	]);

	if (events.length === 0) return 0;

	const signalsCount = events.length;
	const uniqueTypes  = new Set(events.map((e: { eventType: string }) => e.eventType)).size;

	// ── 1. Logarithmic signal factor (growth slows near saturation) ───────────
	const signalsFactor = Math.log(signalsCount + 1) / Math.log(cfg.signalsCap + 1);

	// ── 2. Event-type diversity factor ────────────────────────────────────────
	const typesFactor = Math.min(1, uniqueTypes / cfg.typesCap);

	// ── 3. Account age / stability gate ──────────────────────────────────────
	const accountAgeDays = daysBetween(events[0].createdAt, now);
	const ageFactor      = Math.min(1, accountAgeDays / cfg.frictionWindow);
	// Accounts younger than frictionWindow days are capped at 0.78
	const stabilityGate  = accountAgeDays < cfg.frictionWindow ? 0.78 : 1.0;

	// ── 4. Recovery damping after failures ────────────────────────────────────
	const windowSize     = Math.min(20, events.length);
	const recentEvents   = events.slice(-windowSize);
	const recentFailures = recentEvents.filter((e: { delta: number }) => e.delta < -0.02).length;
	const negativeRatio  = recentFailures / windowSize;
	// Apply damping only when >20% of recent signals are negative
	const recoveryFactor = negativeRatio > 0.2
		? 1 - (negativeRatio - 0.2) * (1 - cfg.recoveryDamping)
		: 1.0;

	// ── 5. Multi-domain breadth bonus ─────────────────────────────────────────
	const multiDomainBonus = clamp(
		1 + Math.max(0, activeDomains - 1) * cfg.multiDomainBonus,
		1.0,
		cfg.multiDomainBonusCap,
	);

	// ── 6. Verification bonus ─────────────────────────────────────────────────
	const level             = (latestVerification?.metadata as Record<string, unknown> | null)?.level as VerificationKind | undefined;
	const verificationBonus = cfg.verificationBonus[level ?? verificationFallback] ?? 1.0;

	// ── Assemble raw confidence ───────────────────────────────────────────────
	const rawConfidence = signalsFactor * typesFactor * ageFactor
		* recoveryFactor * multiDomainBonus * verificationBonus;

	// ── Early-phase hard cap (< 10 signals → cannot exceed 0.18) ─────────────
	if (signalsCount < cfg.earlySignalThreshold) {
		return clamp(rawConfidence, 0, cfg.earlySignalCap);
	}

	// ── Stability gate for young accounts (< 45 days → cannot exceed 0.78) ───
	return clamp(rawConfidence, 0, stabilityGate);
}

// ─── CENTRAL RECOMPUTE ───────────────────────────────────────────────────────

/**
 * Recompute a user's Global AIM Score from all stored events.
 *
 * Formula:
 *   AIMScore = clamp(baseScore + Σ(event.delta × recencyFactor(daysSince)), 0, 1)
 *
 * Event.delta already contains: rawDelta × variableWeight × contextWeight
 *                                × confidenceMultiplier × antiAbuseMultiplier
 * Only recencyFactor is applied here (since it changes over time).
 *
 * Global blend:
 *   if eligible domains exist:
 *     aimGlobal = 0.75 × generalScore + 0.25 × weightedDomainComposite
 */
export async function recomputeAIMScore(userId: string, domain?: string) {
	const now    = new Date();
	const events = await prisma.aimEvent.findMany({ where: { userId } });

	// ── Sum all event deltas with recency weighting ───────────────────────────
	// Positive buckets: reliability, consistency, peer_validation
	// Signed buckets:   contradiction, decay (their deltas are already negative)
	// Convention: ALL buckets are summed — no Math.abs tricks.
	let base          = 0;
	let reliability   = 0;
	let consistency   = 0;
	let peerValidation = 0;
	let contradiction = 0;
	let decay         = 0;

	for (const ev of events) {
		const days          = daysBetween(ev.createdAt, now);
		const rf            = recencyFactor(days);
		// event.delta already has all static multipliers; only apply dynamic recency here
		const weightedDelta = ev.delta * rf;

		switch (ev.eventType) {
			case "reliability":    reliability    += weightedDelta; break;
			case "consistency":    consistency    += weightedDelta; break;
			case "peer_validation": peerValidation += weightedDelta; break;
			case "contradiction":  contradiction  += weightedDelta; break; // deltas can be ±
			case "decay":          decay          += weightedDelta; break; // deltas are negative
			default:               base           += weightedDelta; break;
		}
	}

	// All buckets are additive (contradiction/decay deltas are already negative)
	let aim = AIMCFG.baseScore + base + reliability + consistency + peerValidation + contradiction + decay;
	aim = clamp(aim, 0, 1);

	// ── Optional legacy domain scoring (aimDomainScore table) ────────────────
	if (domain) {
		const domainEvents    = events.filter(e => e.domain === domain);
		const interactionCount = domainEvents.length;
		const scoreForDomain  = clamp(
			AIMCFG.baseScore + domainEvents.reduce((s, e) => s + e.delta, 0),
			0, 1,
		);
		const confidenceForDomain = Math.min(1, interactionCount / 80);
		await prisma.aimDomainScore.upsert({
			where:  { userId_domain: { userId, domain } },
			update: { score: scoreForDomain, confidence: confidenceForDomain, interactionCount },
			create: { userId, domain, score: scoreForDomain, confidence: confidenceForDomain, interactionCount },
		});
	}

	// ── Global blend: 0.75 × generalScore + 0.25 × weightedDomainComposite ──
	const domains  = await prisma.aimDomainScore.findMany({ where: { userId } });
	const eligible = domains.filter(
		d => d.interactionCount >= AIMCFG.domain.minInteractions && Number(d.confidence) > AIMCFG.domain.minConfidence,
	);
	const totalInteractions = eligible.reduce((s, d) => s + d.interactionCount, 0);

	let aimGlobal = aim;
	if (eligible.length > 0 && totalInteractions > 0) {
		let num = 0;
		let den = 0;
		for (const d of eligible) {
			const w = d.interactionCount / totalInteractions;
			num += Number(d.score) * w * Number(d.confidence);
			den += w * Number(d.confidence);
		}
		const domainComposite = den > 0 ? clamp(num / den, 0, 1) : aim;
		const blend           = AIMCFG.domain.globalBlend;
		aimGlobal = clamp(blend.generalWeight * aim + blend.domainCompositeWeight * domainComposite, 0, 1);
	}

	// ── Confidence & ranking score ────────────────────────────────────────────
	const confidenceScore = await calculateConfidence(userId, "none");
	const rankingScore    = aimGlobal * (AIMCFG.rankingBlend.base + AIMCFG.rankingBlend.boost * confidenceScore);

	// ── Trend-based aimStatus ─────────────────────────────────────────────────
	const prevUser  = await prisma.user.findUnique({ where: { id: userId }, select: { aimScore: true } });
	const prevScore = prevUser?.aimScore ?? AIMCFG.baseScore;
	const delta     = aimGlobal - prevScore;
	const aimStatus: string =
		delta >  0.005 ? "increasing" :
		delta < -0.005 ? "decreasing" :
		                 "stable";

	await prisma.user.update({
		where: { id: userId },
		data: {
			aimScore:     aimGlobal,
			aimStatus,
			aimConfidence: new Prisma.Decimal(confidenceScore.toFixed(2)),
			lastActiveAt:  now,
		},
	});

	// ── Score history snapshot ────────────────────────────────────────────────
	await prisma.aimScoreHistory.create({
		data: { userId, score: aimGlobal, context: "recomputed" },
	});

	return {
		aim:        aimGlobal,
		confidence: confidenceScore,
		rankingScore,
		parts: { base, reliability, consistency, peerValidation, contradiction, decay },
	};
}
