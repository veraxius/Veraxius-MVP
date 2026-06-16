"use client";

import { useMemo } from "react";
import { AIM_MAX_SCORE, formatAimScoreLabel, normalizeAimFraction } from "@/lib/aimDisplay";
import { useAIMScore } from "@/lib/hooks/useAIMScore";
import { cn } from "@/lib/utils";

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const CHART_HEIGHT = 160;
const PAD = { top: 16, right: 16, bottom: 28, left: 44 };

type ChartPoint = { score: number; t: number };

type HistoryInput = { score: number; createdAt: string };

type WindowKind = "24h" | "7d" | "30d";

type ChartSeries = {
	points: ChartPoint[];
	tMin: number;
	tMax: number;
	windowKind: WindowKind;
	xAxisStartLabel: string;
};

function windowKindFromSpan(spanMs: number): { kind: WindowKind; windowMs: number; label: string } {
	if (spanMs <= MS_PER_DAY) {
		return { kind: "24h", windowMs: MS_PER_DAY, label: "24h ago" };
	}
	if (spanMs <= 7 * MS_PER_DAY) {
		return { kind: "7d", windowMs: 7 * MS_PER_DAY, label: "7 days ago" };
	}
	return { kind: "30d", windowMs: 30 * MS_PER_DAY, label: "30 days ago" };
}

/**
 * Maps aimScoreHistory rows to chart points (one row = one point).
 * Expects `createdAt` (ISO string). No deduplication.
 */
function buildSeries(history: HistoryInput[], currentScore: number): ChartSeries {
	const now = Date.now();
	const current = normalizeAimFraction(currentScore);

	const historyPoints: ChartPoint[] = history
		.map((h) => {
			const t = new Date(h.createdAt).getTime();
			if (!Number.isFinite(t)) return null;
			return { score: normalizeAimFraction(h.score), t };
		})
		.filter((p): p is ChartPoint => p != null)
		.sort((a, b) => a.t - b.t);

	const points = [...historyPoints, { score: current, t: now }];

	if (historyPoints.length === 0) {
		const { kind, windowMs, label } = windowKindFromSpan(0);
		return {
			points,
			tMin: now - windowMs,
			tMax: now,
			windowKind: kind,
			xAxisStartLabel: label,
		};
	}

	const earliest = historyPoints[0].t;
	const latest = historyPoints[historyPoints.length - 1].t;
	const dataSpan = Math.max(latest - earliest, 1);
	const padding = dataSpan * 0.05;

	const { kind, windowMs, label } = windowKindFromSpan(dataSpan);

	const tMax = now;
	const stale = now - latest > windowMs;
	const tMin = stale ? earliest - padding : Math.max(earliest - padding, tMax - windowMs);
	const tMaxAxis = stale ? latest + padding : tMax;

	return {
		points,
		tMin,
		tMax: tMaxAxis,
		windowKind: kind,
		xAxisStartLabel: label,
	};
}

function trajectoryTitle(kind: WindowKind): string {
	switch (kind) {
		case "24h":
			return "AIM trajectory — 24 hours";
		case "7d":
			return "AIM trajectory — 7 days";
		default:
			return "AIM trajectory — 30 days";
	}
}

function AIMLiveChart({ series }: { series: ChartSeries }) {
	const { points, tMin, tMax, xAxisStartLabel } = series;

	const layout = useMemo(() => {
		const width = 800;
		const innerW = width - PAD.left - PAD.right;
		const innerH = CHART_HEIGHT - PAD.top - PAD.bottom;

		const scores = points.map((p) => normalizeAimFraction(p.score));
		const dataMax = Math.max(...scores, 0.5);
		const yMin = 0;
		const yMax = Math.min(AIM_MAX_SCORE, Math.max(1, dataMax * 1.2));
		const yRange = yMax - yMin || 1;

		const tRange = tMax - tMin || 1;

		const coords = points.map((p) => {
			const xT = Math.min(Math.max(p.t, tMin), tMax);
			const x = PAD.left + ((xT - tMin) / tRange) * innerW;
			const y = PAD.top + innerH - ((p.score - yMin) / yRange) * innerH;
			return { x, y, score: p.score, t: p.t };
		});

		const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
		const areaPath =
			coords.length >= 2
				? `${linePath} L ${coords[coords.length - 1].x} ${PAD.top + innerH} L ${coords[0].x} ${PAD.top + innerH} Z`
				: "";

		const yTicks = [0, Math.round((yMax / 2) * 100) / 100, Math.round(yMax * 100) / 100];
		const last = coords[coords.length - 1];

		return { width, innerH, coords, linePath, areaPath, yTicks, yMin, yMax, last };
	}, [points, tMin, tMax]);

	if (points.length === 0) {
		return null;
	}

	return (
		<svg
			className="w-full h-auto max-h-48 sm:max-h-none select-none"
			viewBox={`0 0 ${layout.width} ${CHART_HEIGHT}`}
			preserveAspectRatio="xMidYMid meet"
			role="img"
			aria-label="AIM score trajectory"
		>
			<defs>
				<linearGradient id="aim-area-fill" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="var(--amber)" stopOpacity="0.22" />
					<stop offset="100%" stopColor="var(--amber)" stopOpacity="0" />
				</linearGradient>
			</defs>

			{layout.yTicks.map((v, i) => {
				const y =
					PAD.top +
					(layout.innerH - ((v - layout.yMin) / (layout.yMax - layout.yMin)) * layout.innerH);
				return (
					<g key={i}>
						<line
							x1={PAD.left}
							y1={y}
							x2={layout.width - PAD.right}
							y2={y}
							stroke="var(--divider)"
							strokeWidth="1"
							strokeDasharray="4 4"
						/>
						<text
							x={PAD.left - 8}
							y={y + 4}
							textAnchor="end"
							className="fill-[var(--text-tertiary)]"
							fontSize="10"
						>
							{formatAimScoreLabel(v)}
						</text>
					</g>
				);
			})}

			{layout.coords.length >= 2 && layout.linePath && (
				<>
					<path d={layout.areaPath} fill="url(#aim-area-fill)" />
					<path
						d={layout.linePath}
						fill="none"
						stroke="var(--amber)"
						strokeWidth="2.5"
						strokeLinejoin="round"
						strokeLinecap="round"
					/>
				</>
			)}

			{layout.coords.slice(0, -1).map((c, i) => (
				<circle
					key={`${c.t}-${i}`}
					cx={c.x}
					cy={c.y}
					r="2.5"
					fill="var(--amber)"
					opacity="0.35"
				/>
			))}

			<g>
				<circle
					cx={layout.last.x}
					cy={layout.last.y}
					r="10"
					fill="var(--amber)"
					opacity="0.2"
				>
					<animate attributeName="r" values="6;12;6" dur="2.8s" repeatCount="indefinite" />
					<animate
						attributeName="opacity"
						values="0.35;0.08;0.35"
						dur="2.8s"
						repeatCount="indefinite"
					/>
				</circle>
				<circle cx={layout.last.x} cy={layout.last.y} r="5" fill="var(--amber)">
					<animate attributeName="opacity" values="1;0.55;1" dur="2.8s" repeatCount="indefinite" />
				</circle>
			</g>

			<text
				x={PAD.left}
				y={CHART_HEIGHT - 6}
				className="fill-[var(--text-tertiary)]"
				fontSize="10"
			>
				{xAxisStartLabel}
			</text>
			<text
				x={layout.width - PAD.right}
				y={CHART_HEIGHT - 6}
				textAnchor="end"
				className="fill-[var(--text-tertiary)]"
				fontSize="10"
			>
				now
			</text>
		</svg>
	);
}

type Props = {
	userId: string;
	className?: string;
	pollIntervalMs?: number;
};

export function AIMScoreHistoryChart({
	userId,
	className,
	pollIntervalMs = 10_000,
}: Props) {
	const { summary, loading, error, refresh } = useAIMScore(userId, { pollIntervalMs });

	const series = useMemo(() => {
		if (!summary) return null;
		return buildSeries(summary.history_30d ?? [], summary.global_score);
	}, [summary]);

	const trendText = useMemo(() => {
		if (!summary) return "";
		if (summary.score_trend_30d === "up") return "Up over 30 days";
		if (summary.score_trend_30d === "down") return "Down over 30 days";
		return "Flat over 30 days";
	}, [summary]);

	if (loading) {
		return (
			<div
				className={cn(
					"w-full rounded-2xl border border-vx-divider bg-vx-panel p-4 sm:p-6 animate-pulse",
					className,
				)}
			>
				<div className="h-4 w-48 rounded bg-vx-divider mb-4" />
				<div className="h-[160px] rounded-lg bg-vx-divider" />
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
				<p className="text-sm text-red-600">{error || "Unable to load history."}</p>
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

	const liveScore = formatAimScoreLabel(summary.global_score);
	const historyCount = summary.history_30d?.length ?? 0;
	const chartTitle = series ? trajectoryTitle(series.windowKind) : "AIM trajectory — 30 days";

	return (
		<div
			className={cn(
				"w-full min-w-0 rounded-2xl border border-vx-divider bg-vx-panel p-4 sm:p-6 md:p-8 shadow-sm",
				className,
			)}
		>
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
				<div className="min-w-0">
					<h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
						{chartTitle}
					</h2>
					<p className="text-xs text-[var(--text-secondary)] mt-1">
						Real score movements · live updates
						{historyCount > 0 ? ` · ${historyCount} snapshot${historyCount === 1 ? "" : "s"}` : ""}
					</p>
				</div>
				<div className="sm:text-right shrink-0">
					<p className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">Now</p>
					<p className="text-base sm:text-lg font-bold tabular-nums text-[var(--amber)]">{liveScore}</p>
					<p className="text-xs text-[var(--text-secondary)]">{trendText}</p>
				</div>
			</div>

			<div className="w-full min-w-0 overflow-hidden rounded-xl border border-vx-divider bg-[var(--bg-primary)] px-1 sm:px-2 pt-2 pb-1">
				{series && series.points.length > 0 ? (
					<AIMLiveChart series={series} />
				) : (
					<div className="h-[160px] flex items-center justify-center text-sm text-[var(--text-secondary)]">
						Not enough history yet to show the trajectory.
					</div>
				)}
			</div>
		</div>
	);
}
