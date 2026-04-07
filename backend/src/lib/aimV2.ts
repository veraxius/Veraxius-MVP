import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AIMCFG = require("../../aim.config.js");

type StakeLevel = "high" | "standard" | "low";
type RoleWeight = "advisor" | "creator" | "peer" | "observer";
type PlatformVerification = "verified" | "selfReported" | "none";
type VerificationKind = "none" | "email" | "identity";

export type ContextWeightInput = {
	stakeLevel?: StakeLevel;
	roleWeight?: RoleWeight;
	platformVerification?: PlatformVerification;
};

function clamp(v: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, v));
}

function recencyWeight(daysSince: number): number {
	return Math.exp(-AIMCFG.recencyLambda * daysSince);
}

function getContextWeight(ctx?: ContextWeightInput): number {
	if (!ctx) return 1;
	const stake = ctx.stakeLevel ?? "standard";
	const role = ctx.roleWeight ?? "peer";
	const pv = ctx.platformVerification ?? "none";
	return (
		(AIMCFG.contextWeights.stakeLevel[stake] ?? 1) *
		(AIMCFG.contextWeights.roleWeight[role] ?? 1) *
		(AIMCFG.contextWeights.platformVerification[pv] ?? 1)
	);
}

function daysBetween(a: Date, b: Date): number {
	const msPerDay = 24 * 60 * 60 * 1000;
	return Math.floor((b.getTime() - a.getTime()) / msPerDay);
}

// VARIABLE 1 — RELIABILITY
export async function recordOutcome(
	userId: string,
	interactionId: string,
	quality: number, // 0..1
	verifiedBy?: string,
	domain?: string,
	context?: ContextWeightInput,
) {
	const now = new Date();
	const recent = await prisma.aimOutcome.findMany({
		where: { userId },
		orderBy: { createdAt: "desc" },
		take: Math.max(AIMCFG.reliability.streakBonusWindow, AIMCFG.reliability.streakPenaltyWindow),
	});

	// boost quality if verified by third party per spec (+0.15 capped to 1.0)
	const adjustedQuality = Math.min(1, quality + (verifiedBy ? 0.15 : 0));
	const deltaBase = (adjustedQuality - 0.5) * AIMCFG.reliability.baseMultiplier;
	// recencyFactor uses days since event; for new recordOutcome delta this is 0 days
	const rawDelta = deltaBase * recencyWeight(0);

	const last5 = recent.slice(0, AIMCFG.reliability.streakBonusWindow);
	const last3 = recent.slice(0, AIMCFG.reliability.streakPenaltyWindow);

	const bonus = last5.length === AIMCFG.reliability.streakBonusWindow && last5.every(o => Number(o.quality) > 0.7);
	const penalty = last3.length === AIMCFG.reliability.streakPenaltyWindow && last3.every(o => Number(o.quality) < 0.3);

	let delta = rawDelta;
	if (delta > 0 && bonus) delta *= AIMCFG.reliability.streakBonusMultiplier;
	if (delta < 0 && penalty) delta *= AIMCFG.reliability.streakPenaltyMultiplier;

	const contextWeight = getContextWeight(context);
	const finalDelta = delta * contextWeight;

	await prisma.$transaction([
		prisma.aimOutcome.upsert({
			where: { userId_interactionId: { userId, interactionId } },
			update: { quality: new Prisma.Decimal(adjustedQuality), verifiedBy },
			create: { userId, interactionId, quality: new Prisma.Decimal(adjustedQuality), verifiedBy },
		}),
		prisma.aimEvent.create({
			data: {
				userId,
				eventType: "reliability",
				signal: "outcome_recorded",
				delta: finalDelta,
				weight: 1,
				domain,
				contextWeight,
				metadata: { interactionId, quality: adjustedQuality, verifiedBy, rawDelta: rawDelta },
			},
		}),
		prisma.user.update({
			where: { id: userId },
			data: { lastActiveAt: now },
		}),
	]);
}

// VARIABLE 2 — CONSISTENCY (weekly)
export async function runConsistencyCheck(userId: string) {
	const now = new Date();
	const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

	// These metrics would normally come from telemetry; approximate using aimEvents/posts/messages
	const recentEvents = await prisma.aimEvent.findMany({
		where: { userId, createdAt: { gte: sevenDaysAgo } },
	});
	const baselineEvents = await prisma.aimEvent.findMany({
		where: { userId, createdAt: { gte: thirtyDaysAgo, lt: sevenDaysAgo } },
	});

	const recentLatency = 1 + recentEvents.length ? 1 : 1; // placeholder metric; assume stable if no data
	const baselineLatency = 1 + baselineEvents.length ? 1 : 1;
	const latencyDev = baselineLatency > 0 ? Math.abs(recentLatency - baselineLatency) / baselineLatency : 0;

	const recentPosts = await prisma.post.count({ where: { userId, createdAt: { gte: sevenDaysAgo } } });
	const baselinePosts = await prisma.post.count({ where: { userId, createdAt: { gte: thirtyDaysAgo, lt: sevenDaysAgo } } });
	const postFreqDev = baselinePosts > 0 ? (baselinePosts - recentPosts) / baselinePosts : 0;

	// vote pattern stability proxy: reactions over 14 days window
	const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
	const recentReactions = await prisma.postReaction.count({ where: { userId, post: { createdAt: { gte: fourteenDaysAgo } } } });
	const priorReactions = await prisma.postReaction.count({ where: { userId, post: { createdAt: { lt: fourteenDaysAgo, gte: thirtyDaysAgo } } } });
	const votePatternDev = (priorReactions + recentReactions) > 0 ? Math.abs(recentReactions - priorReactions) / Math.max(1, priorReactions) : 0;

	// claim_action_alignment: approximate by primary domain presence in domain scores
	const user = await prisma.user.findUnique({ where: { id: userId }, select: { aimDomainPrimary: true } });
	const primary = user?.aimDomainPrimary ?? undefined;
	const domainScoreRec = primary ? await prisma.aimDomainScore.findUnique({ where: { userId_domain: { userId, domain: primary } } }) : null;
	const hasPrimaryActivity = (domainScoreRec?.interactionCount ?? 0) > 0;

	let breaks = 0;
	let matches = 0;
	// a)
	if (latencyDev > 0.5) breaks += 1;
	if (latencyDev < 0.15) matches += 1;
	// b)
	if (postFreqDev > 0.7) breaks += 1;
	// c)
	if (votePatternDev > 0.4) breaks += 1;
	// d)
	if (primary && !hasPrimaryActivity) breaks += 1;
	if (primary && hasPrimaryActivity) matches += 1;

	await prisma.aimConsistency.upsert({
		where: { userId },
		update: { breakCount: breaks, matchCount: matches, lastSnapshot: { latencyDev, postFreqDev, votePatternDev, primary, hasPrimaryActivity } },
		create: { userId, breakCount: breaks, matchCount: matches, lastSnapshot: { latencyDev, postFreqDev, votePatternDev, primary, hasPrimaryActivity } },
	});

	// Emit granular signals per spec
	type AimEventFlat = {
		userId: string;
		eventType: string;
		signal?: string | null;
		delta: number;
		weight?: number;
		contextWeight?: number;
		domain?: string | null;
		metadata?: any;
	};
	const events: AimEventFlat[] = [];
	// a) latency deviations
	if (latencyDev > 0.5) events.push({ userId, eventType: "consistency", signal: "consistency_break", delta: AIMCFG.consistency.breakPenaltyA, weight: 1, contextWeight: 1, metadata: { kind: "latency_deviation", value: latencyDev } });
	if (latencyDev < 0.15) events.push({ userId, eventType: "consistency", signal: "consistency_match", delta: AIMCFG.consistency.matchBonusA ?? AIMCFG.consistency.matchBonusD, weight: 1, contextWeight: 1, metadata: { kind: "latency_deviation", value: latencyDev } });
	// b) post frequency
	if (postFreqDev > 0.7) events.push({ userId, eventType: "consistency", signal: "consistency_break", delta: AIMCFG.consistency.breakPenaltyB, weight: 1, contextWeight: 1, metadata: { kind: "post_frequency_drop", value: postFreqDev } });
	// c) vote pattern stability
	if (votePatternDev > 0.4) events.push({ userId, eventType: "consistency", signal: "consistency_break", delta: AIMCFG.consistency.breakPenaltyC, weight: 1, contextWeight: 1, metadata: { kind: "vote_pattern_change", value: votePatternDev } });
	// d) claim-action alignment
	if (primary && !hasPrimaryActivity) events.push({ userId, eventType: "consistency", signal: "consistency_break", delta: AIMCFG.consistency.breakPenaltyD, weight: 1, contextWeight: 1, metadata: { kind: "claim_action_alignment", primary } });
	if (primary && hasPrimaryActivity) events.push({ userId, eventType: "consistency", signal: "consistency_match", delta: AIMCFG.consistency.matchBonusD, weight: 1, contextWeight: 1, metadata: { kind: "claim_action_alignment", primary } });
	if (events.length) {
		await prisma.$transaction(events.map((data) => prisma.aimEvent.create({ data })));
	}
}

// VARIABLE 3 — PEER VALIDATION
export async function recordPeerFeedback(params: {
	targetId: string;
	voterId: string;
	type: "endorsement" | "dispute";
	domain?: string;
	aimVoter?: number; // current voter aimScore
	networkDistance: 1 | 2 | 3; // 1=direct, 2=second, 3=none
	diversity: "same" | "different";
}) {
	const {
		targetId, voterId, type, domain,
		aimVoter = 0.5, networkDistance, diversity,
	} = params;
	const now = new Date();

	// limits
	const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	const receivedCount = await prisma.aimEvent.count({
		where: { userId: targetId, eventType: "peer_validation", createdAt: { gte: since24h } },
	});
	if (receivedCount >= AIMCFG.peerValidation.maxReceivedVotes24h) {
		return { skipped: true, reason: "rate_limited_24h" };
	}
	const cooldownSince = new Date(now.getTime() - AIMCFG.peerValidation.voteCooldownDays * 24 * 60 * 60 * 1000);
	const recentVoterTarget = await prisma.aimEvent.findFirst({
		where: {
			userId: targetId,
			eventType: "peer_validation",
			metadata: { path: ["voterId"], equals: voterId },
			createdAt: { gte: cooldownSince },
		},
	});
	if (recentVoterTarget) {
		return { skipped: true, reason: "cooldown_active" };
	}

	const ndFactor =
		networkDistance === 1 ? AIMCFG.peerValidation.networkDistanceFactor.direct :
		networkDistance === 2 ? AIMCFG.peerValidation.networkDistanceFactor.second :
		AIMCFG.peerValidation.networkDistanceFactor.none;
	const dvFactor = diversity === "same" ? AIMCFG.peerValidation.diversityFactor.same : AIMCFG.peerValidation.diversityFactor.different;

	let voteWeight = aimVoter * ndFactor * dvFactor;

	// coordination detection
	const coordWindowStart = new Date(now.getTime() - AIMCFG.peerValidation.coordinationWindowHours * 60 * 60 * 1000);
	const burst = await prisma.aimEvent.count({
		where: {
			userId: targetId,
			eventType: "peer_validation",
			createdAt: { gte: coordWindowStart },
			metadata: { path: ["networkDistance"], equals: 1 },
		},
	});
	let flagged = false;
	if (burst >= AIMCFG.peerValidation.coordinationMinVotes && networkDistance === AIMCFG.peerValidation.coordinationNetworkDistance) {
		voteWeight = voteWeight * (1 - AIMCFG.peerValidation.coordinationPenalty);
		flagged = true;
		await prisma.aimFlag.create({
			data: {
				userId: targetId,
				flagType: "coordination_suspected",
				metadata: { since: coordWindowStart, votes: burst + 1 },
			},
		});
	}

	const rawDelta = (type === "endorsement" ? 1 : -1) * voteWeight * 0.05; // base ±0.05 scaled
	const finalDelta = rawDelta; // context applied upstream if needed

	await prisma.aimEvent.create({
		data: {
			userId: targetId,
			eventType: "peer_validation",
			signal: type === "endorsement" ? "peer_endorsement" : "peer_dispute",
			delta: finalDelta,
			weight: voteWeight,
			domain,
			contextWeight: 1,
			metadata: { voterId, networkDistance, diversity, aimVoter, flagged },
		},
	});
	return { ok: true, delta: finalDelta, flagged };
}

// VARIABLE 4 — CONTRADICTION
export async function openChallenge(challengerId: string, targetId: string, reason: string, severity: 1 | 2 | 3) {
	const ch = await prisma.aimChallenge.create({
		data: { challengerId, targetUserId: targetId, reason, severity, status: "pending" },
	});
	// provisional penalties for level 1
	if (severity === 1) {
		await prisma.aimEvent.create({
			data: {
				userId: targetId,
				eventType: "contradiction",
				signal: "challenge_opened",
				delta: AIMCFG.contradiction.level1.provisionalPenalty,
				weight: 1,
				contextWeight: 1,
				metadata: { challengeId: ch.id, severity },
			},
		});
	}
	if (severity === 3) {
		await prisma.aimFlag.create({
			data: { userId: targetId, flagType: "level3_contradiction", metadata: { challengeId: ch.id, reason } },
		});
	}
	return ch;
}

export async function resolveChallenge(challengeId: string, resolution: "positive" | "negative") {
	const ch = await prisma.aimChallenge.update({
		where: { id: challengeId },
		data: { status: "resolved", resolution },
	});
	const targetId = ch.targetUserId;
	const sev = ch.severity as 1 | 2 | 3;
	let delta = 0;
	if (sev === 1) {
		// reverse provisional if positive, keep if negative
		delta = resolution === "positive" ? -AIMCFG.contradiction.level1.provisionalPenalty : 0;
	} else if (sev === 2) {
		delta = resolution === "negative" ? AIMCFG.contradiction.level2.penalty : 0;
	} else if (sev === 3) {
		delta = resolution === "negative" ? AIMCFG.contradiction.level3.penalty : 0;
	}
	if (delta !== 0) {
		await prisma.aimEvent.create({
			data: {
				userId: targetId,
				eventType: "contradiction",
				signal: `challenge_resolved_${resolution}`,
				delta,
				weight: 1,
				contextWeight: 1,
				metadata: { challengeId, severity: sev },
			},
		});
	}
	return ch;
}

// VARIABLE 5 — DECAY
export async function applyDecayToAllUsers() {
	const now = new Date();
	const users = await prisma.user.findMany({ select: { id: true, aimScore: true, created_at: true, lastActiveAt: true } });
	for (const u of users) {
		const lastActive = u.lastActiveAt ?? u.created_at;
		const days = daysBetween(lastActive, now);
		const tm = AIMCFG.decay.timeMultipliers.find((t: any) => days <= t.maxDays)?.multiplier ?? 1.0;

		// Estimate historical quality (avg outcomes)
		const outcomes = await prisma.aimOutcome.findMany({ where: { userId: u.id }, select: { quality: true } });
		const totalInteractions = outcomes.length;
		const historicalQualityAvg = outcomes.length ? outcomes.reduce((a, b) => a + Number(b.quality), 0) / outcomes.length : 0.5;
		const qualityShield = Math.min(AIMCFG.decay.qualityShieldCap, historicalQualityAvg * Math.min(1, totalInteractions / 100));
		const dailyDecayRate = AIMCFG.decay.baseDailyRate * (1 - qualityShield) * tm;

		const floor = Math.max(AIMCFG.decay.minFloor, u.aimScore * AIMCFG.decay.decayFloorFactor);
		const newDelta = -dailyDecayRate;
		const newScore = clamp(u.aimScore + newDelta, floor, 1);

		if (newScore !== u.aimScore) {
			await prisma.$transaction([
				prisma.user.update({ where: { id: u.id }, data: { aimScore: newScore } }),
				prisma.aimEvent.create({
					data: {
						userId: u.id,
						eventType: "decay",
						signal: "inactivity_decay",
						delta: newDelta,
						weight: 1,
						contextWeight: 1,
					},
				}),
			]);
		}
	}
}

// VARIABLE 6 — CONFIDENCE
export async function calculateConfidence(userId: string, verificationFallback: VerificationKind): Promise<number> {
	const signalsCount = await prisma.aimEvent.count({ where: { userId } });
	const types = await prisma.aimEvent.findMany({
		where: { userId },
		select: { eventType: true },
		distinct: ["eventType"],
	});
	const signalsFactor = Math.min(1, signalsCount / AIMCFG.confidence.signalsCap);
	const typesFactor = Math.min(1, types.length / AIMCFG.confidence.typesCap);
	// derive latest verification status from events if present
	const latestVerification = await prisma.aimEvent.findFirst({
		where: { userId, eventType: "confidence", signal: "verification_status_changed" },
		orderBy: { createdAt: "desc" },
		select: { metadata: true },
	});
	const level = (latestVerification?.metadata as any)?.level as VerificationKind | undefined;
	const verificationBonus = AIMCFG.confidence.verificationBonus[level ?? verificationFallback] ?? 1.0;
	return clamp(signalsFactor * typesFactor * verificationBonus, 0, 1);
}

// DOMAIN SCORING + CENTRAL RECOMPUTE
export async function recomputeAIMScore(userId: string, domain?: string) {
	const now = new Date();
	// Gather events with recency weight
	const events = await prisma.aimEvent.findMany({ where: { userId } });
	let base = 0;
	let reliability = 0;
	let consistency = 0;
	let peerValidation = 0;
	let contradiction = 0;
	let decay = 0;

	for (const ev of events) {
		const days = daysBetween(ev.createdAt, now);
		const rw = recencyWeight(days);
		const weightedDelta = ev.delta * (ev.contextWeight ?? 1) * rw;
		switch (ev.eventType) {
			case "reliability": reliability += weightedDelta; break;
			case "consistency": consistency += weightedDelta; break;
			case "peer_validation": peerValidation += weightedDelta; break;
			case "contradiction": contradiction += Math.abs(weightedDelta); break; // subtract later
			case "decay": decay += Math.abs(weightedDelta); break; // subtract later
			default: base += weightedDelta; break;
		}
	}

	let aim = base + reliability + consistency + peerValidation - contradiction - decay;
	aim = clamp(aim, 0, 1);

	// domain scoring
	if (domain) {
		const domainEvents = events.filter(e => e.domain === domain);
		const interactionCount = domainEvents.length;
		const scoreForDomain = clamp(domainEvents.reduce((s, e) => s + e.delta, 0), 0, 1);
		const confidenceForDomain = Math.min(1, interactionCount / 80);
		await prisma.aimDomainScore.upsert({
			where: { userId_domain: { userId, domain } },
			update: { score: scoreForDomain, confidence: confidenceForDomain, interactionCount },
			create: { userId, domain, score: scoreForDomain, confidence: confidenceForDomain, interactionCount },
		});
	}

	// global aim via domain-weighted aggregation
	const domains = await prisma.aimDomainScore.findMany({ where: { userId } });
	const eligible = domains.filter(d => d.interactionCount >= 3);
	const totalInteractions = eligible.reduce((s, d) => s + d.interactionCount, 0);
	let aimGlobal = aim;
	if (eligible.length && totalInteractions > 0) {
		let num = 0;
		let den = 0;
		for (const d of eligible) {
			const weight = d.interactionCount / totalInteractions;
			num += d.score * weight * d.confidence;
			den += weight * d.confidence;
		}
		if (den > 0) aimGlobal = clamp(num / den, 0, 1);
	}

	// confidence and rankingScore
	// Default to 'none' verification; upstream may re-run with richer info
	const confidenceScore = await calculateConfidence(userId, "none");
	const rankingScore = aimGlobal * (AIMCFG.confidence.rankingBlend.base + AIMCFG.confidence.rankingBlend.boost * confidenceScore);

	await prisma.user.update({
		where: { id: userId },
		data: {
			aimScore: aimGlobal,
			aimConfidence: new Prisma.Decimal(confidenceScore.toFixed(2)),
			lastActiveAt: now,
		},
	});

	return {
		aim: aimGlobal,
		confidence: confidenceScore,
		rankingScore,
		parts: { base, reliability, consistency, peerValidation, contradiction, decay },
	};
}

