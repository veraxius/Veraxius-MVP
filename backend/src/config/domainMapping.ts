/**
 * ─────────────────────────────────────────────────────────────────────────
 * AIM MARKETING DOMAIN MAPPING (draft — pending Antonio's review)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * WHY THIS FILE EXISTS
 * The product narrative (MVP4 mockups) describes the AIM score as composed
 * of four dimensions: Commitment Fulfillment, Verification Strength,
 * Communication, Consistency. The actual scoring engine (aim.config.js +
 * aimV2.ts + signalNormalizer.ts) computes the score from five different
 * internal "variables": reliability, consistency, peer_validation,
 * contradiction, decay — driven by specific signal kinds (outcome_success,
 * claim_verified, peer_endorsement, challenge_opened_l1, etc.).
 *
 * This file is a ONE-WAY, ADDITIVE, DERIVED mapping from every existing
 * signal kind to one of the four marketing domains, so that new screens
 * (AIM Anatomy, Trust Receipt, Org Dashboard) can group and explain events
 * in the language the product uses — WITHOUT touching how the AIM number
 * itself is calculated. Nothing here is consumed by the scoring math in
 * aimV2.ts. It only feeds read-only, presentation-layer aggregation.
 *
 * THIS IS A DRAFT. Every mapping below has a comment explaining the
 * reasoning. Antonio should review and this file is the ONLY place that
 * needs to change if the mapping is adjusted — nothing else in the codebase
 * references these domain names yet.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** The four AIM domains as presented in the product/marketing narrative. */
export const AIM_DOMAINS = [
	"commitment_fulfillment",
	"verification_strength",
	"communication",
	"consistency",
] as const;

export type AimDomainKey = (typeof AIM_DOMAINS)[number];

export const AIM_DOMAIN_LABELS: Record<AimDomainKey, string> = {
	commitment_fulfillment: "Commitment Fulfillment",
	verification_strength: "Verification Strength",
	communication: "Communication",
	consistency: "Consistency",
};

/**
 * Default weight per domain, used ONLY by the new derived/presentation
 * layer (e.g. to compute a per-domain "AIM points" figure for the Anatomy
 * screen). This is a SEPARATE number from anything in aim.config.js and
 * does not affect the real AIM score. Mirrors the mockup's example
 * (Commitment Fulfillment = 32%); the rest are a placeholder even split
 * of the remainder until Antonio confirms real weights.
 */
export const AIM_DOMAIN_WEIGHTS: Record<AimDomainKey, number> = {
	commitment_fulfillment: 0.32,
	verification_strength: 0.26,
	communication: 0.21,
	consistency: 0.21,
};

/**
 * Every signal kind the engine currently produces, mapped to one AIM
 * domain. Keyed by the `signal` value stored on `AimEvent.signal` — this
 * matches `SignalKind` in signalNormalizer.ts, which is already the
 * canonical identifier used across the codebase for these signal kinds.
 *
 * `DomainAimEvent.eventType` (the per-topic-domain event log used by
 * posts/domainScoreService.ts) reuses the SAME signal names for
 * "peer_endorsement", "peer_dispute", "inactivity_decay", and
 * "contradiction_detected" — so this same table covers both places an
 * event can come from without duplicating the mapping.
 */
export const SIGNAL_TO_AIM_DOMAIN: Record<string, AimDomainKey> = {
	// ── Reliability signals ────────────────────────────────────────────────
	// "Did the person do what they said they'd do?" is literally the
	// definition of Commitment Fulfillment in the product narrative.
	outcome_success: "commitment_fulfillment",
	outcome_failure: "commitment_fulfillment",
	repeated_positive_outcome: "commitment_fulfillment",
	repeated_negative_outcome: "commitment_fulfillment",

	// These two are about a CLAIM being independently confirmed (or not) —
	// that's verification, not follow-through on a promise.
	claim_verified: "verification_strength",
	claim_unverified: "verification_strength",

	// ── Consistency signals ────────────────────────────────────────────────
	// Direct 1:1 match — the engine's own "consistency" variable already
	// means the same thing as the product's Consistency domain: stable,
	// predictable behavior over time.
	consistency_match: "consistency",
	consistency_break: "consistency",

	// ── Peer validation signals ────────────────────────────────────────────
	// There is no dedicated "communication quality" signal in the engine
	// today. Peer endorsements/disputes are the closest proxy we have —
	// they reflect how other people experienced interacting with this
	// person (responsiveness, clarity, trustworthiness of exchanges), which
	// is the best available stand-in for Communication until a more direct
	// signal exists (e.g. response-time tracking, dispute-resolution tone).
	// Flagging this as the weakest mapping in the table — see note below.
	peer_endorsement: "communication",
	peer_dispute: "communication",

	// ── Contradiction / dispute signals ────────────────────────────────────
	// A contradiction/challenge is fundamentally a question of whether a
	// prior claim or verification still holds up under scrutiny — so all
	// challenge-related signals are grouped under Verification Strength
	// rather than split across domains. Keeping every contradiction signal
	// in ONE bucket also keeps the "why did my score drop" story coherent:
	// a user should not see the same dispute event nudge two domains.
	challenge_opened_l1: "verification_strength",
	challenge_opened_l2: "verification_strength",
	challenge_opened_l3: "verification_strength",
	challenge_resolved_upheld: "verification_strength",
	challenge_resolved_dismissed: "verification_strength",
	challenge_resolved_mixed: "verification_strength",
	challenge_malicious_accusation: "verification_strength",
	contradiction_detected: "verification_strength",

	// ── Decay signals ───────────────────────────────────────────────────────
	// Inactivity decay penalizes a user for going quiet for a long time —
	// that is a stability/consistency concern (an active, steady presence),
	// not a broken promise or a failed verification.
	inactivity_decay: "consistency",

	// ── Confidence/meta signals ─────────────────────────────────────────────
	// This event carries delta 0 (it's informational — it records that
	// verification level changed, e.g. email -> identity) but appears in
	// the ledger, so it needs a bucket for display purposes.
	verification_status_changed: "verification_strength",
};

/**
 * Fallback domain for any signal not found in the table above (e.g. a new
 * signal kind added later and not yet mapped here). Consistency is picked
 * as the safest default because an "unclassified" behavioral signal is
 * closer to a general stability/track-record concept than to a specific
 * commitment or verification claim.
 */
const FALLBACK_DOMAIN: AimDomainKey = "consistency";

/**
 * Resolve the AIM domain for a given signal/event-type string. Accepts
 * either an `AimEvent.signal` value or a `DomainAimEvent.eventType` value —
 * both vocabularies are covered by the same table (see comment above).
 * Returns the fallback domain (with a console warning) for anything
 * unmapped, so a missing entry never crashes a screen — it just needs to
 * be added here later.
 */
export function getAimDomainForSignal(signal: string | null | undefined): AimDomainKey {
	if (!signal) return FALLBACK_DOMAIN;
	const mapped = SIGNAL_TO_AIM_DOMAIN[signal];
	if (!mapped) {
		// eslint-disable-next-line no-console
		console.warn(`[domainMapping] Unmapped signal "${signal}" — falling back to "${FALLBACK_DOMAIN}". Add it to SIGNAL_TO_AIM_DOMAIN.`);
		return FALLBACK_DOMAIN;
	}
	return mapped;
}
