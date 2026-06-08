"use client";

import { useMemo } from "react";
import {
	aimGaugeFillFraction,
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

function GaugeRing({
	aimFraction,
	colorClass,
}: {
	/** 0–1 global AIM (matches DB `aimScore`). */
	aimFraction: number;
	colorClass: string;
}) {
	const score = normalizeAimFraction(aimFraction);
	const fillRatio = aimGaugeFillFraction(aimFraction);
	const size = 180;
	const stroke = 12;
	const radius = (size - stroke) / 2;
	const circumference = 2 * Math.PI * radius;
	const dashoffset = circumference * (1 - fillRatio);
	const center = size / 2;

	return (
		<div
			className={cn(
				"relative aspect-square w-full max-w-[140px] sm:max-w-[160px] md:max-w-[180px] mx-auto",
				colorClass,
			)}
		>
			<svg
				className="w-full h-full"
				viewBox={`0 0 ${size} ${size}`}
				preserveAspectRatio="xMidYMid meet"
				aria-hidden
			>
				<circle
					cx={center}
					cy={center}
					r={radius}
					stroke="var(--bg-panel)"
					strokeWidth={stroke}
					fill="none"
				/>
				<circle
					cx={center}
					cy={center}
					r={radius}
					stroke="currentColor"
					strokeWidth={stroke}
					fill="none"
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={dashoffset}
					transform={`rotate(-90 ${center} ${center})`}
				/>
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center px-2">
				<div className="text-xl sm:text-2xl md:text-3xl font-bold tabular-nums">
					{formatAimScoreLabel(score)}
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
					"w-full rounded-2xl border border-vx-divider bg-vx-panel p-4 sm:p-6 md:p-8 animate-pulse",
					className,
				)}
			>
				<div className="flex flex-col md:flex-row items-center gap-8">
					<div className="h-36 w-36 sm:h-44 sm:w-44 rounded-full bg-vx-divider shrink-0 mx-auto" />
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
					className="vx-btn-primary rounded-lg px-5 min-h-11 text-sm font-semibold"
				>
					Retry
				</button>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"w-full rounded-2xl border border-vx-divider bg-vx-panel p-4 sm:p-6 md:p-8 shadow-sm",
				className,
			)}
		>
			<div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
				<div className="flex flex-col items-center shrink-0 w-full md:w-auto">
					<GaugeRing
						aimFraction={summary.global_score}
						colorClass={riskGaugeColorClass(summary.risk_level)}
					/>
				</div>

				<div className="flex-1 w-full min-w-0 space-y-3 sm:space-y-4 text-center md:text-left">
					<div>
						<p className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
							Account
						</p>
						<p className="font-medium text-[var(--text-primary)] break-all">
							{summary.user.email}
						</p>
						{/*<p className="text-xs text-[var(--text-tertiary)] mt-1">ID: {summary.user.id}</p>*/}
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
					</div>

					<p className="text-xs text-[var(--text-secondary)]">{trendLabel}</p>
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
