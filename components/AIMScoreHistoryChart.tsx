"use client";

import { useMemo } from "react";
import { formatAimScoreLabel, normalizeAimFraction } from "@/lib/aimDisplay";
import { useAIMScore } from "@/lib/hooks/useAIMScore";
import { cn } from "@/lib/utils";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CHART_HEIGHT = 160;
const PAD = { top: 16, right: 16, bottom: 28, left: 44 };

type ChartPoint = { score: number; t: number };

function buildSeries(
	history: { score: number; created_at: string }[],
	currentScore: number,
): ChartPoint[] {
	const now = Date.now();
	const windowStart = now - 30 * MS_PER_DAY;
	const current = normalizeAimFraction(currentScore);

	const raw = history
		.map((h) => ({
			score: normalizeAimFraction(h.score),
			t: new Date(h.created_at).getTime(),
		}))
		.filter((p) => p.t >= windowStart && p.t <= now)
		.sort((a, b) => a.t - b.t);

	let points: ChartPoint[] = raw.length > 0 ? [...raw] : [];

	if (points.length === 0) {
		return [
			{ score: current, t: windowStart },
			{ score: current, t: now },
		];
	}

	if (points[0].t > windowStart) {
		points.unshift({ score: points[0].score, t: windowStart });
	}

	const last = points[points.length - 1];
	if (now - last.t > 60_000 || Math.abs(last.score - current) > 0.0001) {
		points.push({ score: current, t: now });
	} else {
		points = [...points.slice(0, -1), { score: current, t: now }];
	}

	return points;
}

function AIMLiveChart({ points }: { points: ChartPoint[] }) {
	const layout = useMemo(() => {
		const width = 800;
		const innerW = width - PAD.left - PAD.right;
		const innerH = CHART_HEIGHT - PAD.top - PAD.bottom;

		const scores = points.map((p) => p.score);
		const minScore = Math.min(...scores, 0);
		const maxScore = Math.max(...scores, 1);
		const padY = (maxScore - minScore) * 0.08 || 0.05;
		const yMin = Math.max(0, minScore - padY);
		const yMax = Math.min(1, maxScore + padY);
		const yRange = yMax - yMin || 0.01;

		const tMin = points[0].t;
		const tMax = points[points.length - 1].t;
		const tRange = tMax - tMin || 1;

		const coords = points.map((p) => {
			const x = PAD.left + ((p.t - tMin) / tRange) * innerW;
			const y = PAD.top + innerH - ((p.score - yMin) / yRange) * innerH;
			return { x, y, score: p.score, t: p.t };
		});

		const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
		const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${PAD.top + innerH} L ${coords[0].x} ${PAD.top + innerH} Z`;

		const yTicks = [yMin, (yMin + yMax) / 2, yMax];
		const last = coords[coords.length - 1];

		return { width, innerH, coords, linePath, areaPath, yTicks, yMin, yMax, last };
	}, [points]);

	return (
		<svg
			className="w-full h-auto select-none"
			viewBox={`0 0 ${layout.width} ${CHART_HEIGHT}`}
			preserveAspectRatio="none"
			role="img"
			aria-label="AIM score over the last 30 days"
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

			<path d={layout.areaPath} fill="url(#aim-area-fill)" />
			<path
				d={layout.linePath}
				fill="none"
				stroke="var(--amber)"
				strokeWidth="2.5"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>

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
				hace 30 días
			</text>
			<text
				x={layout.width - PAD.right}
				y={CHART_HEIGHT - 6}
				textAnchor="end"
				className="fill-[var(--text-tertiary)]"
				fontSize="10"
			>
				ahora
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

	const points = useMemo(() => {
		if (!summary) return [];
		return buildSeries(summary.history_30d, summary.global_score);
	}, [summary]);

	const trendText = useMemo(() => {
		if (!summary) return "";
		if (summary.score_trend_30d === "up") return "Subiendo en 30 días";
		if (summary.score_trend_30d === "down") return "Bajando en 30 días";
		return "Estable en 30 días";
	}, [summary]);

	if (loading) {
		return (
			<div
				className={cn(
					"w-full rounded-2xl border border-vx-divider bg-vx-panel p-6 animate-pulse",
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
				<p className="text-sm text-red-600">{error || "No se pudo cargar el historial."}</p>
				<button
					type="button"
					onClick={() => void refresh()}
					className="vx-btn-primary rounded-lg px-5 py-2 text-sm font-semibold"
				>
					Reintentar
				</button>
			</div>
		);
	}

	const liveScore = formatAimScoreLabel(summary.global_score);

	return (
		<div
			className={cn(
				"w-full rounded-2xl border border-vx-divider bg-vx-panel p-6 md:p-8 shadow-sm",
				className,
			)}
		>
			<div className="flex flex-wrap items-start justify-between gap-3 mb-4">
				<div>
					<h2 className="text-sm font-semibold text-[var(--text-primary)]">
						Recorrido AIM — 30 días
					</h2>
					<p className="text-xs text-[var(--text-secondary)] mt-1">
						Movimientos reales del puntaje · actualización en vivo
					</p>
				</div>
				<div className="text-right">
					<p className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">Ahora</p>
					<p className="text-lg font-bold tabular-nums text-[var(--amber)]">{liveScore}</p>
					<p className="text-xs text-[var(--text-secondary)]">{trendText}</p>
				</div>
			</div>

			<div className="rounded-xl border border-vx-divider bg-[var(--bg-primary)] px-2 pt-2 pb-1">
				{points.length >= 2 ? (
					<AIMLiveChart points={points} />
				) : (
					<div className="h-[160px] flex items-center justify-center text-sm text-[var(--text-secondary)]">
						Aún no hay suficiente historial para mostrar el recorrido.
					</div>
				)}
			</div>
		</div>
	);
}
