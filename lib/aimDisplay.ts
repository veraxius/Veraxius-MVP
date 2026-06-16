/**
 * AIM scores use the same unit as display: 0.50 = 0.50%, 100 = 100.00%.
 */

export const AIM_MAX_SCORE = 100;
export const AIM_BASE_SCORE = 0.5;

/** Canonical score in [0, maxScore]. */
export function normalizeAimFraction(raw: number): number {
	if (!Number.isFinite(raw)) return 0;
	return Math.min(AIM_MAX_SCORE, Math.max(0, raw));
}

/** Label shown in navbar and hero, e.g. 0.50% for stored score 0.5. */
export function formatAimScoreLabel(raw: number): string {
	return `${normalizeAimFraction(raw).toFixed(2)}%`;
}

/** 0–100 progress from neutral to max (for bar colours). */
export function aimFractionToPercent(score: number): number {
	const s = normalizeAimFraction(score);
	const range = AIM_MAX_SCORE - AIM_BASE_SCORE;
	if (range <= 0) return 0;
	const pct = ((s - AIM_BASE_SCORE) / range) * 100;
	return Math.round(Math.min(100, Math.max(0, pct)) * 100) / 100;
}

/**
 * Ring fill: display score / 100 (0.50% → 0.5% of arc, 100.00% → full circle).
 * Measurement and labels are unchanged; only the arc ceiling moves from 1.00% to 100%.
 */
export function aimGaugeFillFraction(raw: number): number {
	if (!Number.isFinite(raw)) return 0;
	const score = Math.min(100, Math.max(0, raw));
	return score / 100;
}

export type RiskLevel = "low" | "moderate" | "high" | "critical";

/**
 * Higher global score ⇒ lower risk.
 * Buckets are anchored to the engine's neutral baseline (0.50):
 *   ≥ 0.75 → low      (clearly trusted)
 *   ≥ 0.50 → moderate (baseline / neutral, NOT high risk)
 *   ≥ 0.25 → high
 *   < 0.25 → critical
 */
export function riskLevelFromFraction(rawFraction: number): RiskLevel {
	const f = normalizeAimFraction(rawFraction);
	if (f >= 0.75) return "low";
	if (f >= 0.5) return "moderate";
	if (f >= 0.25) return "high";
	return "critical";
}

/** @deprecated kept for backwards compat — prefer `riskLevelFromFraction`. */
export function riskLevelFromPercent(percent: number): RiskLevel {
	return riskLevelFromFraction(percent / 100);
}

export function riskLevelLabel(level: RiskLevel): string {
	switch (level) {
		case "low":
			return "Low risk";
		case "moderate":
			return "Moderate risk";
		case "high":
			return "High risk";
		case "critical":
			return "Critical risk";
	}
}

/** Ring / gauge accent: green → yellow → orange → red by risk severity. */
export function riskGaugeColorClass(level: RiskLevel): string {
	switch (level) {
		case "low":
			return "text-emerald-500";
		case "moderate":
			return "text-amber-400";
		case "high":
			return "text-orange-500";
		case "critical":
			return "text-red-500";
	}
}

export function riskBadgeClass(level: RiskLevel): string {
	switch (level) {
		case "low":
			return "bg-emerald-500/15 text-emerald-600 border-emerald-500/40";
		case "moderate":
			return "bg-amber-500/15 text-amber-600 border-amber-500/40";
		case "high":
			return "bg-orange-500/15 text-orange-700 border-orange-500/40";
		case "critical":
			return "bg-red-500/15 text-red-600 border-red-500/40";
	}
}
