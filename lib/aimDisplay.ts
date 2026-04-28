/**
 * AIM scores are stored on the backend as a 0–1 fraction (e.g. 0.5 = neutral baseline).
 * Product display: show that same scale with two decimals and a % sign → "0.50%" (not "50.00%").
 */

/** Canonical 0–1 value; accepts legacy API values scaled 0–100. */
export function normalizeAimFraction(raw: number): number {
	if (!Number.isFinite(raw)) return 0;
	if (raw > 1) return Math.min(1, Math.max(0, raw / 100));
	return Math.min(1, Math.max(0, raw));
}

/** Label shown in navbar and hero, e.g. 0.50% for stored score 0.5. */
export function formatAimScoreLabel(raw: number): string {
	return `${normalizeAimFraction(raw).toFixed(2)}%`;
}

/** 0–100 scale for bar color thresholds and similar (0.5 → 50). */
export function aimFractionToPercent(fraction: number): number {
	if (!Number.isFinite(fraction)) return 0;
	const f = normalizeAimFraction(fraction);
	return Math.round(Math.min(100, Math.max(0, f * 100)) * 100) / 100;
}

export type RiskLevel = "low" | "moderate" | "high" | "critical";

/** Higher global score ⇒ lower risk (green). */
export function riskLevelFromPercent(percent: number): RiskLevel {
	const p = Math.min(100, Math.max(0, percent));
	if (p >= 76) return "low";
	if (p >= 51) return "moderate";
	if (p >= 26) return "high";
	return "critical";
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
