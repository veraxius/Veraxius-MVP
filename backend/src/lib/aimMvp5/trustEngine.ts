import { prisma } from "../../config/prisma";
import { writeGovernanceEvent } from "./governance";
import { withPrefix, PREFIX } from "./ids";

/**
 * MVP5 Trust Engine (Architecture Alignment FINAL §B/§C.1).
 *
 * Computes a Contextual Trust State for one Entity, in the context of one
 * proposed Decision — never a running total, never overwritten. Every
 * reevaluation creates a new TrustState row (Correction #9).
 *
 * This is a SEPARATE engine from aimV2.ts's recomputeAIMScore(). It does not
 * read/write User.aimScore, AimEvent, or anything the existing social/
 * reputation system depends on — the only bridge is the bootstrap rule below.
 */

export const TRUST_ENGINE_VERSION = "mvp5-1.0.0";

// Correction #2 — below this many real MVP5 Signals for the Entity, the
// linked member's legacy aimScore is used as a single low-confidence
// bootstrap Signal. At/above it, aimScore is excluded entirely — never both.
const BOOTSTRAP_SIGNAL_THRESHOLD = 5;

const DIMENSIONS = ["reliability", "consistency", "evidenceStrength", "peerValidation", "contradiction", "decay"] as const;
type Dimension = (typeof DIMENSIONS)[number];

const SIGNAL_DIMENSION_TO_FIELD: Record<string, Dimension> = {
	reliability: "reliability",
	consistency: "consistency",
	evidence_strength: "evidenceStrength",
	peer_validation: "peerValidation",
	contradiction: "contradiction",
	decay: "decay",
};

function trustClassFor(score: number): string {
	if (score >= 90) return "VERY_HIGH";
	if (score >= 75) return "HIGH";
	if (score >= 55) return "MODERATE";
	if (score >= 35) return "UNCERTAIN";
	if (score >= 15) return "LOW";
	return "CRITICAL";
}

export async function evaluateTrust(tenantId: string, decisionId: string) {
	const decision = await prisma.decision.findFirst({ where: { id: decisionId, tenantId } });
	if (!decision) return { error: "decision_not_found" as const };

	// Whose trust is being evaluated (Correction #1 forces this to be explicit
	// on TrustState) — the target of the proposed action if one is named,
	// otherwise the entity proposing it.
	const subjectEntityId = decision.targetEntityId ?? decision.proposedByEntityId;

	const now = new Date();
	const signals = await prisma.signal.findMany({
		where: {
			tenantId,
			targetEntityId: subjectEntityId,
			OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
		},
	});

	// Correction #2 — bootstrap rule.
	const entity = await prisma.entity.findFirst({ where: { id: subjectEntityId, tenantId } });
	let bootstrapUsed = false;
	let bootstrapContribution: { aimScore: number; confidence: number } | null = null;
	const effectiveSignals = [...signals];

	if (entity?.linkedUserId && signals.length < BOOTSTRAP_SIGNAL_THRESHOLD) {
		const user = await prisma.user.findUnique({
			where: { id: entity.linkedUserId },
			select: { aimScore: true },
		});
		if (user) {
			bootstrapUsed = true;
			bootstrapContribution = { aimScore: user.aimScore, confidence: 0.3 };
			effectiveSignals.push({
				id: "bootstrap",
				tenantId,
				signalType: "legacy_aim_bootstrap",
				dimension: "reliability",
				sourceEntityId: null,
				sourceEvidenceId: null,
				sourceOutcomeId: null,
				targetEntityId: subjectEntityId,
				targetClaimId: null,
				targetDecisionId: decisionId,
				direction: user.aimScore >= 0.5 ? "positive" : "negative",
				strength: Math.abs(user.aimScore - 0.5) * 2, // 0..1
				confidence: 0.3,
				observedAt: now,
				effectiveFrom: now,
				expiresAt: null,
				operatorVersion: TRUST_ENGINE_VERSION,
				metadata: null,
			} as (typeof signals)[number]);
		}
	}

	// Aggregate per dimension: confidence-weighted average of signed strength.
	const sums: Record<Dimension, { weighted: number; weight: number; count: number }> = {
		reliability: { weighted: 0, weight: 0, count: 0 },
		consistency: { weighted: 0, weight: 0, count: 0 },
		evidenceStrength: { weighted: 0, weight: 0, count: 0 },
		peerValidation: { weighted: 0, weight: 0, count: 0 },
		contradiction: { weighted: 0, weight: 0, count: 0 },
		decay: { weighted: 0, weight: 0, count: 0 },
	};

	const usedSignalIds: string[] = [];
	for (const s of effectiveSignals) {
		const field = SIGNAL_DIMENSION_TO_FIELD[s.dimension];
		if (!field) continue;
		const signed = s.direction === "negative" ? -s.strength : s.direction === "neutral" ? 0 : s.strength;
		sums[field].weighted += signed * s.confidence;
		sums[field].weight += s.confidence;
		sums[field].count += 1;
		if (s.id !== "bootstrap") usedSignalIds.push(s.id);
	}

	const dimensionScores: Record<Dimension, number | null> = {
		reliability: null,
		consistency: null,
		evidenceStrength: null,
		peerValidation: null,
		contradiction: null,
		decay: null,
	};
	for (const d of DIMENSIONS) {
		const bucket = sums[d];
		if (bucket.weight > 0) {
			// -1..1 normalized average -> 0..100 scale
			dimensionScores[d] = Math.max(0, Math.min(100, 50 + (bucket.weighted / bucket.weight) * 50));
		}
	}

	// Open contradictions for this subject materially affect trust regardless
	// of the aggregate (Correction #8 — structural, not just an explanation flag).
	const openContradictions = await prisma.contradiction.findMany({
		where: { tenantId, subjectEntityId, status: { in: ["detected", "unresolved", "challenged"] } },
	});
	const materialContradiction = openContradictions.some((c) => c.severity >= 0.6);

	const scoredDimensions = DIMENSIONS.filter((d) => dimensionScores[d] !== null);
	const trustScore = scoredDimensions.length
		? scoredDimensions.reduce((sum, d) => sum + (dimensionScores[d] as number), 0) / scoredDimensions.length
		: 50; // neutral prior when there is no evidence at all

	// Evidence Confidence: how much history actually backs this number, not
	// what the number is (kept independent, same separation calculateConfidence()
	// already proves in the existing engine).
	const evidenceConfidence = Math.min(100, effectiveSignals.length * 8 + (bootstrapUsed ? 10 : 0));

	const trustClass = materialContradiction
		? "CRITICAL"
		: trustClassFor(trustScore);

	const explanation = {
		signalsConsidered: usedSignalIds.length,
		bootstrap: bootstrapUsed ? bootstrapContribution : null,
		dimensionScores,
		openContradictions: openContradictions.map((c) => ({ id: c.id, severity: c.severity, status: c.status })),
		materialContradiction,
	};

	const trustState = await prisma.trustState.create({
		data: {
			tenantId,
			subjectEntityId,
			decisionId,
			contextId: decision.contextId ?? undefined,
			trustScore,
			evidenceConfidence,
			reliability: dimensionScores.reliability ?? undefined,
			consistency: dimensionScores.consistency ?? undefined,
			evidenceStrength: dimensionScores.evidenceStrength ?? undefined,
			peerValidation: dimensionScores.peerValidation ?? undefined,
			contradiction: dimensionScores.contradiction ?? undefined,
			decay: dimensionScores.decay ?? undefined,
			trustClass,
			engineVersion: TRUST_ENGINE_VERSION,
			explanation,
		},
	});

	await prisma.decision.update({ where: { id: decisionId }, data: { status: "evaluating" } });

	await writeGovernanceEvent({
		tenantId,
		correlationId: decisionId,
		eventType: "trust_state.evaluated",
		entityId: subjectEntityId,
		decisionId,
		trustStateId: trustState.id,
		signalIds: usedSignalIds,
		contradictions: openContradictions.map((c) => c.id),
		trustEngineVersion: TRUST_ENGINE_VERSION,
		eventPayload: { trustScore, trustClass, evidenceConfidence },
	});

	return { trustState, id: withPrefix(PREFIX.trustState, trustState.id) };
}
