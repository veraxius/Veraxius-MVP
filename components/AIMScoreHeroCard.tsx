"use client";

import { useMemo } from "react";
import {
	formatAimScoreLabel,
	normalizeAimFraction,
	riskBadgeClass,
	riskGaugeColorClass,
	riskLevelLabel,
} from "@/lib/aimDisplay";
import { useAIMScore } from "@/lib/hooks/useAIMScore";
import { cn } from "@/lib/utils";

type Props = {
	userId: string;
	className?: string;
};

function TrendSparkline({
	points,
}: {
	points: { score: number; created_at: string }[];
}) {
	const width = 320;
	const height = 72;
	const scores = points.map((p) =>
		p.score > 1 ? p.score / 100 : p.score,
	);
	const min = Math.min(...scores, 0);
	const max = Math.max(...scores, 0.01);
	const range = max - min || 1;
	const coords = scores.map((v, i) => {
		const x = scores.length <= 1 ? width / 2 : (i / (scores.length - 1)) * width;
		const y = height - ((v - min) / range) * height;
		return `${x},${y}`;
	});
	const poly = coords.join(" ");

	return (
		<svg
			className="text-vx-amber w-full max-w-md mx-auto"
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			preserveAspectRatio="none"
			aria-hidden
		>
			<polyline fill="none" stroke="currentColor" strokeWidth="2" points={poly} />
		</svg>
	);
}

function GaugeRing({
	aimFraction,
	colorClass,
}: {
	/** 0–1 global AIM (matches DB `aimScore`). */
	aimFraction: number;
	colorClass: string;
}) {
	const f = normalizeAimFraction(aimFraction);
	const size = 180;
	const stroke = 12;
	const radius = (size - stroke) / 2;
	const circumference = 2 * Math.PI * radius;
	const dash = f * circumference;

	return (
		<div className={cn("relative", colorClass)} style={{ width: size, height: size }}>
			<svg width={size} height={size} aria-hidden>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke="var(--bg-panel)"
					strokeWidth={stroke}
					fill="none"
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke="currentColor"
					strokeWidth={stroke}
					fill="none"
					strokeLinecap="round"
					strokeDasharray={`${dash} ${circumference - dash}`}
					transform={`rotate(-90 ${size / 2} ${size / 2})`}
				/>
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center">
				<div className="text-2xl sm:text-3xl font-bold tabular-nums">
					{formatAimScoreLabel(f)}
				</div>
				<div className="text-xs text-[var(--text-secondary)] mt-1">AIM Score</div>
			</div>
		</div>
	);
}

export function AIMScoreHeroCard({ userId, className }: Props) {
	const { summary, loading, error, refresh } = useAIMScore(userId);

	const badgeClass = summary ? riskBadgeClass(summary.risk_level) : "";

	const trendLabel = useMemo(() => {
		if (!summary) return "";
		switch (summary.score_trend_30d) {
			case "up":
				return "Up over 30 days";
			case "down":
				return "Down over 30 days";
			default:
				return "Flat (30 days)";
		}
	}, [summary]);

	if (loading) {
		return (
			<div
				className={cn(
					"w-full rounded-2xl border border-vx-divider bg-vx-panel p-6 md:p-8 animate-pulse",
					className,
				)}
			>
				<div className="flex flex-col md:flex-row items-center gap-8">
					<div className="h-44 w-44 rounded-full bg-vx-divider shrink-0" />
					<div className="flex-1 space-y-3 w-full max-w-md">
						<div className="h-4 w-48 rounded bg-vx-divider" />
						<div className="h-10 w-full rounded bg-vx-divider" />
						<div className="h-4 w-32 rounded bg-vx-divider" />
					</div>
				</div>
				<div className="mt-8 h-16 rounded-lg bg-vx-divider" />
				<div className="mt-4 flex flex-wrap gap-2">
					{[1, 2, 3].map((i) => (
						<div key={i} className="h-8 w-24 rounded-full bg-vx-divider" />
					))}
				</div>
			</div>
		);
	}

	if (error || !summary) {
		return (
			<div
				className={cn(
					"w-full rounded-2xl border border-red-500/40 bg-vx-panel p-6 text-center space-y-3",
					className,
				)}
			>
				<p className="text-sm text-red-600">{error || "Unable to load AIM summary."}</p>
				<button
					type="button"
					onClick={() => void refresh()}
					className="vx-btn-primary rounded-lg px-5 py-2 text-sm font-semibold"
				>
					Retry
				</button>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"w-full rounded-2xl border border-vx-divider bg-vx-panel p-6 md:p-8 shadow-sm",
				className,
			)}
		>
			<div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
				<div className="flex flex-col items-center shrink-0">
					<GaugeRing
						aimFraction={summary.global_score}
						colorClass={riskGaugeColorClass(summary.risk_level)}
					/>
				</div>

				<div className="flex-1 w-full max-w-xl space-y-4">
					<div>
						<p className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
							Account
						</p>
						<p className="font-medium text-[var(--text-primary)] break-all">
							{summary.user.email}
						</p>
						<p className="text-xs text-[var(--text-tertiary)] mt-1">ID: {summary.user.id}</p>
					</div>

					<div className="flex flex-wrap gap-2 items-center">
						<span
							className={cn(
								"px-2.5 py-1 text-xs font-medium rounded-md border",
								badgeClass,
							)}
						>
							{riskLevelLabel(summary.risk_level)}
						</span>
						<span className="text-xs text-[var(--text-secondary)]">
							Confidence {summary.confidence_score.toFixed(1)} / 100
						</span>
						<span className="text-xs text-[var(--text-tertiary)]">
							Status: {summary.aim_status}
						</span>
					</div>

					<div className="rounded-xl border border-vx-divider bg-[var(--bg-primary)] p-4">
						<div className="flex items-center justify-between mb-2">
							<h3 className="text-sm font-semibold text-[var(--text-primary)]">
								30-day trend
							</h3>
							<span className="text-xs text-[var(--text-secondary)]">{trendLabel}</span>
						</div>
						{summary.history_30d.length > 1 ? (
							<TrendSparkline points={summary.history_30d} />
						) : (
							<p className="text-sm text-[var(--text-secondary)]">
								Not enough history for a 30-day chart yet.
							</p>
						)}
					</div>
				</div>
			</div>

			<div className="mt-8">
				<h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
					Top drivers
				</h3>
				{summary.top_drivers.length === 0 ? (
					<p className="text-sm text-[var(--text-secondary)]">
						No drivers yet — interactions and peer feedback will appear here.
					</p>
				) : (
					<div className="flex flex-wrap gap-2">
						{summary.top_drivers.map((d) => (
							<span
								key={d.id}
								title={d.created_at ? new Date(d.created_at).toLocaleString() : undefined}
								className={cn(
									"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium max-w-full",
									d.impact === "positive"
										? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
										: "border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-400",
								)}
							>
								<span className="truncate">{d.label}</span>
								<span className="tabular-nums shrink-0">{d.delta_label}</span>
							</span>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
