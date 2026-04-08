/**
 * Signal Normalization Layer
 * ==========================
 * Converts raw signals from any external source (peer reviews, system logs, admin
 * actions) into a standardized { rawDelta, variableWeight, eventType, signal } that
 * can be fed directly into the AIM Score engine.
 *
 * Architecture:
 *   External Source
 *       ↓
 *   normalizeSignal(kind, source)    ← this file
 *       ↓  { rawDelta, variableWeight, eventType, sourceCredibilityFactor }
 *   processAimSignal() in aimV2.ts  ← applies contextWeight, confidenceMultiplier,
 *                                       antiAbuseMultiplier, stores AimEvent
 *       ↓
 *   recomputeAIMScore()              ← sums event.delta × recencyFactor → user.aimScore
 */

// ─── Signal Taxonomy ──────────────────────────────────────────────────────────

/** Every named signal the system can emit. */
export type SignalKind =
	// Variable 1 — Reliability
	| "outcome_success"
	| "outcome_failure"
	| "repeated_positive_outcome"
	| "repeated_negative_outcome"
	| "claim_verified"
	| "claim_unverified"
	// Variable 2 — Consistency
	| "consistency_match"
	| "consistency_break"
	// Variable 3 — Peer Validation
	| "peer_endorsement"
	| "peer_dispute"
	// Variable 4 — Contradiction
	| "challenge_opened_l1"
	| "challenge_opened_l2"
	| "challenge_opened_l3"
	| "challenge_resolved_upheld"
	| "challenge_resolved_dismissed"
	| "challenge_resolved_mixed"
	| "challenge_resolved_malicious_penalty"
	// Variable 5 — Decay
	| "inactivity_decay";

/** Who is originating the signal — determines source credibility multiplier. */
export type SignalSource =
	| "system"          // automated internal log           → full credibility
	| "admin"           // manual admin action              → full credibility
	| "verified_peer"   // identity-verified user vote      → near-full credibility
	| "peer"            // regular peer vote                → standard credibility
	| "self_report";    // self-declared outcome            → low credibility (max 20% impact)

// ─── Normalized Signal Shape ───────────────────────────────────────────────────

export interface NormalizedSignal {
	/** Signed base impact before any multipliers. */
	rawDelta: number;
	/**
	 * Variable weight from the core weights table.
	 * Baked into the effective delta but stored on the event for auditing.
	 */
	variableWeight: number;
	/** Which of the 5 master AIM variables this signal belongs to. */
	eventType: "reliability" | "consistency" | "peer_validation" | "contradiction" | "decay";
	/** Human-readable label stored on the AimEvent record. */
	signal: string;
	/**
	 * Credibility factor for the originating source.
	 * Applied as a scaling factor on variableWeight before the formula runs.
	 */
	sourceCredibilityFactor: number;
}

// ─── Normalization Table ───────────────────────────────────────────────────────

type SignalEntry = Omit<NormalizedSignal, "sourceCredibilityFactor">;

/**
 * rawDelta values derived from the Veraxius AIM spec (2026).
 * variableWeight reflects signal importance within its variable bucket.
 */
const SIGNAL_TABLE: Record<SignalKind, SignalEntry> = {
	// ── Variable 1: Reliability ────────────────────────────────────────────────
	outcome_success: {
		rawDelta: +0.04, variableWeight: 1.0,
		eventType: "reliability", signal: "outcome_success",
	},
	outcome_failure: {
		rawDelta: -0.04, variableWeight: 1.0,
		eventType: "reliability", signal: "outcome_failure",
	},
	repeated_positive_outcome: {
		rawDelta: +0.02, variableWeight: 1.3,   // streak bonus ×1.3
		eventType: "reliability", signal: "repeated_positive_outcome",
	},
	repeated_negative_outcome: {
		rawDelta: -0.03, variableWeight: 1.5,   // streak penalty ×1.5
		eventType: "reliability", signal: "repeated_negative_outcome",
	},
	claim_verified: {
		rawDelta: +0.03, variableWeight: 1.2,
		eventType: "reliability", signal: "claim_verified",
	},
	claim_unverified: {
		rawDelta: -0.02, variableWeight: 0.8,
		eventType: "reliability", signal: "claim_unverified",
	},

	// ── Variable 2: Consistency ────────────────────────────────────────────────
	consistency_match: {
		rawDelta: +0.02, variableWeight: 1.0,
		eventType: "consistency", signal: "consistency_match",
	},
	consistency_break: {
		rawDelta: -0.03, variableWeight: 1.0,
		eventType: "consistency", signal: "consistency_break",
	},

	// ── Variable 3: Peer Validation ───────────────────────────────────────────
	peer_endorsement: {
		rawDelta: +0.025, variableWeight: 1.0,
		eventType: "peer_validation", signal: "peer_endorsement",
	},
	peer_dispute: {
		rawDelta: -0.025, variableWeight: 1.0,
		eventType: "peer_validation", signal: "peer_dispute",
	},

	// ── Variable 4: Contradiction ──────────────────────────────────────────────
	challenge_opened_l1: {
		rawDelta: -0.02, variableWeight: 1.0,   // L1 minor provisional
		eventType: "contradiction", signal: "challenge_opened_l1",
	},
	challenge_opened_l2: {
		rawDelta: -0.04, variableWeight: 1.0,   // L2 moderate provisional
		eventType: "contradiction", signal: "challenge_opened_l2",
	},
	challenge_opened_l3: {
		rawDelta: -0.07, variableWeight: 1.0,   // L3 severe provisional + public flag
		eventType: "contradiction", signal: "challenge_opened_l3",
	},
	challenge_resolved_upheld: {
		rawDelta: -0.01, variableWeight: 1.0,   // deepens penalty after validation
		eventType: "contradiction", signal: "challenge_resolved_upheld",
	},
	/** rawDelta is 0 here — actual reversal delta is computed dynamically in resolveChallenge */
	challenge_resolved_dismissed: {
		rawDelta: 0, variableWeight: 1.0,
		eventType: "contradiction", signal: "challenge_resolved_dismissed",
	},
	/** rawDelta is 0 here — actual partial reversal delta is computed dynamically */
	challenge_resolved_mixed: {
		rawDelta: 0, variableWeight: 1.0,
		eventType: "contradiction", signal: "challenge_resolved_mixed",
	},
	challenge_resolved_malicious_penalty: {
		rawDelta: -0.03, variableWeight: 1.0,   // challenger penalized for malicious challenge
		eventType: "contradiction", signal: "challenge_malicious_accusation",
	},

	// ── Variable 5: Decay ─────────────────────────────────────────────────────
	inactivity_decay: {
		rawDelta: -0.002, variableWeight: 1.0,  // base daily decay rate
		eventType: "decay", signal: "inactivity_decay",
	},
};

// ─── Source Credibility ───────────────────────────────────────────────────────

/**
 * Credibility factor per signal source.
 * Applied as a scaling factor on variableWeight before effectiveDelta is computed.
 * Self-report is capped at 0.2 per the anti-abuse spec (Abuse Case 3).
 */
const SOURCE_CREDIBILITY: Record<SignalSource, number> = {
	system:        1.00, // automated systems — unconditional trust
	admin:         1.00, // manual override — full weight
	verified_peer: 0.95, // identity-verified peers — near-full trust
	peer:          0.85, // regular user — standard credibility
	self_report:   0.20, // self-declared outcome — max 20% contribution per spec
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Convert a raw signal emission into a standard normalized signal object.
 *
 * @param kind   - Which signal is being reported
 * @param source - Who is reporting it (determines credibility multiplier)
 * @returns NormalizedSignal ready for processAimSignal()
 *
 * @example
 *   const ns = normalizeSignal("peer_endorsement", "peer");
 *   // → { rawDelta: +0.025, variableWeight: 1.0, ..., sourceCredibilityFactor: 0.85 }
 */
export function normalizeSignal(
	kind: SignalKind,
	source: SignalSource = "peer",
): NormalizedSignal {
	const entry = SIGNAL_TABLE[kind];
	if (!entry) throw new Error(`Unknown signal kind: "${kind}"`);
	return {
		...entry,
		sourceCredibilityFactor: SOURCE_CREDIBILITY[source] ?? 0.85,
	};
}

/**
 * Generate a deterministic idempotency key for a (userId, signalKind, referenceId) triple.
 * Pass this as `idempotencyKey` to processAimSignal() to prevent duplicate event creation
 * on retries or replays.
 *
 * @example
 *   const key = generateIdempotencyKey(userId, "peer_endorsement", String(postId));
 *   // → "abc123:peer_endorsement:42"
 */
export function generateIdempotencyKey(
	userId: string,
	kind: SignalKind,
	refId: string,
): string {
	return `${userId}:${kind}:${refId}`;
}
