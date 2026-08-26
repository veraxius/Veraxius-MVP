export type Trend = "up" | "down" | "flat" | "insufficient_history";

/**
 * Single shared trend-arrow implementation, used for both the total AIM
 * score and each of the 5 real category values — same visual language
 * everywhere: green up / gray flat / red down, or a neutral dash with a
 * label when there isn't enough history yet (never a fabricated arrow).
 */
export function TrendArrow({ trend, className }: { trend: Trend; className?: string }) {
	if (trend === "insufficient_history") {
		return (
			<span className={`inline-flex items-center gap-1 text-xs text-tertiary ${className ?? ""}`}>
				<span aria-hidden>—</span>
				<span>Insufficient history</span>
			</span>
		);
	}

	const config = {
		up: { arrow: "↑", color: "text-green", label: "Up" },
		down: { arrow: "↓", color: "text-red", label: "Down" },
		flat: { arrow: "→", color: "text-tertiary", label: "Flat" },
	}[trend];

	return (
		<span className={`inline-flex items-center gap-1 text-xs font-medium ${config.color} ${className ?? ""}`}>
			<span aria-hidden>{config.arrow}</span>
			<span>{config.label}</span>
		</span>
	);
}
