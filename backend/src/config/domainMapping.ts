/**
 * ─────────────────────────────────────────────────────────────────────────
 * AIM SCORE CATEGORIES — real engine variables (Antonio's decision, 2026-08)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * SUPERSEDES the earlier 4-domain marketing mapping (Commitment Fulfillment /
 * Verification Strength / Communication / Consistency), which has been
 * discarded entirely. Product guidelines require that any terminology and
 * math shown publicly matches the production model — no invented scoring
 * mechanics for marketing purposes.
 *
 * What the user sees instead is the actual 5-variable model already used by
 * aim.config.js / aimV2.ts to compute the score:
 *   reliability, consistency, peer_validation, contradiction, decay
 * — grouped directly from `SignalKind` in signalNormalizer.ts (the "Variable
 * 1..5" comments there are the literal source of truth for this mapping,
 * nothing here is inferred or invented).
 *
 * This file is the ONLY place that needs to change if the user-facing
 * labels/descriptions/threshold are revised.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** The 5 real master variables the AIM engine computes the score from. */
export const AIM_CATEGORIES = [
	"reliability",
	"consistency",
	"peer_validation",
	"contradiction",
	"decay",
] as const;

export type AimCategoryKey = (typeof AIM_CATEGORIES)[number];

/**
 * User-facing labels. Antonio approved using friendly names instead of the
 * internal variable names (his guidelines ask that end-user pages avoid
 * technical/internal terminology) — but has NOT signed off on these exact
 * words yet. Two are explicitly flagged below as pending his review.
 */
export const AIM_CATEGORY_LABELS: Record<AimCategoryKey, string> = {
	reliability: "Follow-Through",
	consistency: "Consistency",
	peer_validation: "Peer Trust",
	// PENDING ANTONIO'S REVIEW: "Disputes" reads as inherently negative even
	// though this category also includes positive outcomes (a dismissed or
	// mixed-resolution challenge, a malicious-accusation penalty against the
	// OTHER party). A label that doesn't sound like an accusation by default
	// may be needed.
	contradiction: "Disputes",
	// PENDING ANTONIO'S REVIEW: "Activity Level" implies the value goes UP
	// with more activity, but this category is decay-only — it only ever
	// moves DOWN (a small, gradual penalty for prolonged inactivity). A
	// label that doesn't suggest an upward/positive metric may be needed.
	decay: "Activity Level",
};

export const AIM_CATEGORY_DESCRIPTIONS: Record<AimCategoryKey, string> = {
	reliability: "How often your outcomes and claims turn out to be true and get verified.",
	consistency: "How stable and predictable your behavior has been over time.",
	peer_validation: "How the community has endorsed or disputed your reliability.",
	contradiction: "The effect of challenges raised against you and how they were resolved.",
	decay: "A small ongoing adjustment reflecting how recently you've been active.",
};

/**
 * Every one of the 19 real signal kinds the engine currently emits, mapped
 * to its category. This is a 1:1 copy of the "Variable 1..5" grouping
 * already present as comments on `SignalKind` in signalNormalizer.ts — kept
 * here as an explicit, importable table rather than re-deriving it from a
 * type union at runtime.
 */
export const SIGNAL_TO_CATEGORY: Record<string, AimCategoryKey> = {
	// Variable 1 — Reliability (6 signals)
	outcome_success: "reliability",
	outcome_failure: "reliability",
	repeated_positive_outcome: "reliability",
	repeated_negative_outcome: "reliability",
	claim_verified: "reliability",
	claim_unverified: "reliability",

	// Variable 2 — Consistency (2 signals)
	consistency_match: "consistency",
	consistency_break: "consistency",

	// Variable 3 — Peer Validation (2 signals)
	peer_endorsement: "peer_validation",
	peer_dispute: "peer_validation",

	// Variable 4 — Contradiction (8 signals)
	challenge_opened_l1: "contradiction",
	challenge_opened_l2: "contradiction",
	challenge_opened_l3: "contradiction",
	challenge_resolved_upheld: "contradiction",
	challenge_resolved_dismissed: "contradiction",
	challenge_resolved_mixed: "contradiction",
	challenge_resolved_malicious_penalty: "contradiction",
	challenge_malicious_accusation: "contradiction", // signal name variant used on the stored AimEvent
	contradiction_detected: "contradiction",

	// Variable 5 — Decay (1 signal)
	inactivity_decay: "decay",
};

/**
 * Event types that exist in the ledger but are NOT one of the 19 scored
 * signals above, and must never be forced into a category:
 * - "confidence" / signal "verification_status_changed": delta-0,
 *   informational only (records when someone's verification level
 *   changed). Still shown in the general activity/event history and in a
 *   Trust Receipt if one is requested for it — just excluded from the 5
 *   category buckets and their trend math.
 * - "base": the one-time account-initialization event, not an ongoing
 *   signal.
 */
const NON_SIGNAL_EVENT_TYPES = new Set(["confidence", "base"]);

export function isNonCategorySignal(eventTypeOrSignal: string | null | undefined): boolean {
	if (!eventTypeOrSignal) return false;
	return NON_SIGNAL_EVENT_TYPES.has(eventTypeOrSignal);
}

/**
 * Resolve the category for a signal or event-type string. Returns null for
 * informational/non-scored events (see isNonCategorySignal) — callers must
 * handle that explicitly rather than falling back into a category, since
 * that would misrepresent an informational event as a real signal.
 * Falls back to "consistency" (with a console warning) only for a genuinely
 * unmapped signal name (e.g. a new one added to the engine later and not
 * yet added here).
 */
export function getAimCategoryForSignal(signal: string | null | undefined): AimCategoryKey | null {
	if (!signal) return null;
	if (isNonCategorySignal(signal)) return null;
	const mapped = SIGNAL_TO_CATEGORY[signal];
	if (!mapped) {
		// eslint-disable-next-line no-console
		console.warn(`[domainMapping] Unmapped signal "${signal}" — falling back to "consistency". Add it to SIGNAL_TO_CATEGORY.`);
		return "consistency";
	}
	return mapped;
}

/**
 * Trend threshold, reused as-is from the AIM total's existing 30-day trend
 * logic (backend/src/routes/users.ts, GET /:userId/aim-summary) so category
 * trends behave consistently with the total. All 19 signals' deltas share
 * the same rough scale (±0.02 to ±0.7 per event on the 0-1 baseline-0.5
 * scale), so one shared threshold is used rather than inventing five
 * separate ones without real usage data to justify different values.
 * Revisit per-category if real data ever shows one category needs a
 * different sensitivity.
 */
export const TREND_THRESHOLD = 0.005;

/** Trend window, matching the AIM total's existing 30-day comparison. */
export const TREND_WINDOW_DAYS = 30;

export type Trend = "up" | "down" | "flat" | "insufficient_history";

/** Categorize a raw 30-day delta into a trend state using TREND_THRESHOLD. */
export function trendFromDelta(delta: number | null): Trend {
	if (delta === null) return "insufficient_history";
	if (delta > TREND_THRESHOLD) return "up";
	if (delta < -TREND_THRESHOLD) return "down";
	return "flat";
}
