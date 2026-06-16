"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	riskBadgeClass,
	riskGaugeColorClass,
	riskLevelLabel,
} from "@/lib/aimDisplay";
import { useAIMScore, type AimSummary } from "@/lib/hooks/useAIMScore";
import { AIMGaugeRing } from "@/components/AIMGaugeRing";
import { cn } from "@/lib/utils";

type Props = {
	userId: string;
	className?: string;
	compact?: boolean;
	section?: "all" | "summary" | "drivers";
	summary?: AimSummary | null;
	loading?: boolean;
	error?: string | null;
	refresh?: () => Promise<void>;
};

type TopDriver = AimSummary["top_drivers"][number];

function ScrollArrow({
	direction,
	onClick,
	disabled,
}: {
	direction: "left" | "right";
	onClick: () => void;
	disabled: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			aria-label={direction === "left" ? "Ver drivers anteriores" : "Ver más drivers"}
			className={cn(
				"flex h-8 w-8 items-center justify-center rounded-full border border-vx-divider",
				"bg-vx-panel text-vx-text-secondary transition-all duration-200",
				"hover:border-vx-amber/40 hover:bg-vx-surface hover:text-vx-amber",
				"disabled:opacity-25 disabled:pointer-events-none",
			)}
		>
			<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
				{direction === "left" ? (
					<path
						d="M10 3L5 8L10 13"
						stroke="currentColor"
						strokeWidth="1.75"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				) : (
					<path
						d="M6 3L11 8L6 13"
						stroke="currentColor"
						strokeWidth="1.75"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				)}
			</svg>
		</button>
	);
}

function TopDriversPanel({ drivers }: { drivers: TopDriver[] }) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);

	const updateScrollState = useCallback(() => {
		const el = scrollRef.current;
		if (!el) return;
		const { scrollLeft, scrollWidth, clientWidth } = el;
		const maxScroll = scrollWidth - clientWidth;
		setCanScrollLeft(scrollLeft > 4);
		setCanScrollRight(maxScroll > 4 && scrollLeft < maxScroll - 4);
	}, []);

	useEffect(() => {
		updateScrollState();
		const el = scrollRef.current;
		if (!el) return;

		el.addEventListener("scroll", updateScrollState, { passive: true });
		const observer = new ResizeObserver(updateScrollState);
		observer.observe(el);

		return () => {
			el.removeEventListener("scroll", updateScrollState);
			observer.disconnect();
		};
	}, [drivers, updateScrollState]);

	const scroll = (direction: "left" | "right") => {
		const el = scrollRef.current;
		if (!el) return;
		const amount = Math.max(220, el.clientWidth * 0.8);
		el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
	};

	return (
		<div className="w-full min-w-0 rounded-2xl border border-vx-divider bg-vx-panel p-4 sm:p-6 md:p-8 shadow-sm">
			<div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
				<h3 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)]">Top Drivers</h3>
				{drivers.length > 0 && (
					<div className="flex items-center gap-1.5 shrink-0">
						<ScrollArrow direction="left" onClick={() => scroll("left")} disabled={!canScrollLeft} />
						<ScrollArrow direction="right" onClick={() => scroll("right")} disabled={!canScrollRight} />
					</div>
				)}
			</div>

			{drivers.length === 0 ? (
				<p className="text-sm text-[var(--text-secondary)]">
					No drivers yet — interactions and peer feedback will appear here.
				</p>
			) : (
				<div
					ref={scrollRef}
					className="flex gap-2 min-w-0 overflow-x-auto scroll-smooth pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
				>
					{drivers.map((d) => (
						<span
							key={d.id}
							title={d.created_at ? new Date(d.created_at).toLocaleString() : undefined}
							className={cn(
								"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shrink-0 whitespace-nowrap",
								d.impact === "positive"
									? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
									: "border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-400",
							)}
						>
							<span>{d.label}</span>
							<span className="tabular-nums">{d.delta_label}</span>
						</span>
					))}
				</div>
			)}
		</div>
	);
}

export function AIMScoreHeroCard({
	userId,
	className,
	compact = false,
	section = "all",
	summary: externalSummary,
	loading: externalLoading,
	error: externalError,
	refresh: externalRefresh,
}: Props) {
	const internal = useAIMScore(externalSummary === undefined ? userId : undefined);
	const summary = externalSummary !== undefined ? externalSummary : internal.summary;
	const loading = externalLoading ?? internal.loading;
	const error = externalError ?? internal.error;
	const refresh = externalRefresh ?? internal.refresh;
	const showSummary = section === "all" || section === "summary";
	const showDrivers = section === "all" || section === "drivers";

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
		if (section === "summary") {
			return (
				<div className={cn("w-full flex items-center justify-center", className)}>
					<div
						className={cn(
							"flex animate-pulse",
							compact
								? "flex-col items-center gap-4 w-full"
								: "items-center flex-col md:flex-row gap-8",
						)}
					>
						<div
							className={cn(
								"rounded-full bg-vx-divider shrink-0",
								compact ? "h-36 w-36 sm:h-44 sm:w-44 md:h-48 md:w-48" : "h-36 w-36 sm:h-44 sm:w-44",
							)}
						/>
						<div
							className={cn(
								"space-y-3 w-full",
								compact ? "max-w-xs mx-auto" : "flex-1 max-w-md",
							)}
						>
							<div className="h-4 w-48 rounded bg-vx-divider mx-auto" />
							<div className="h-8 w-full rounded bg-vx-divider" />
							<div className="h-4 w-32 rounded bg-vx-divider mx-auto" />
						</div>
					</div>
				</div>
			);
		}

		if (section === "drivers") {
			return (
				<div
					className={cn(
						"w-full min-w-0 rounded-2xl border border-vx-divider bg-vx-panel p-4 sm:p-6 md:p-8 shadow-sm animate-pulse",
						className,
					)}
				>
					<div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
						<div className="h-6 w-28 rounded bg-vx-divider" />
						<div className="flex gap-1.5">
							<div className="h-8 w-8 rounded-full bg-vx-divider" />
							<div className="h-8 w-8 rounded-full bg-vx-divider" />
						</div>
					</div>
					<div className="flex gap-2 overflow-hidden">
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className="h-8 w-28 shrink-0 rounded-full bg-vx-divider" />
						))}
					</div>
				</div>
			);
		}

		return (
			<div className={cn("w-full space-y-4", className)}>
				<div
					className={cn(
						"flex items-center animate-pulse",
						compact ? "gap-4" : "flex-col md:flex-row gap-8",
					)}
				>
					<div
						className={cn(
							"rounded-full bg-vx-divider shrink-0 mx-auto",
							compact ? "h-36 w-36 sm:h-44 sm:w-44 md:h-48 md:w-48" : "h-36 w-36 sm:h-44 sm:w-44",
						)}
					/>
					<div className="flex-1 space-y-3 w-full max-w-md">
						<div className="h-4 w-48 rounded bg-vx-divider" />
						<div className="h-8 w-full rounded bg-vx-divider" />
						<div className="h-4 w-32 rounded bg-vx-divider" />
					</div>
				</div>
				<div
					className={cn(
						"rounded-xl border border-vx-divider bg-vx-panel animate-pulse",
						compact ? "p-3 sm:p-4" : "p-4 sm:p-6",
					)}
				>
					<div className="h-4 w-24 rounded bg-vx-divider mb-3" />
					<div className="flex flex-wrap gap-2">
						{[1, 2, 3].map((i) => (
							<div key={i} className="h-8 w-24 rounded-full bg-vx-divider" />
						))}
					</div>
				</div>
			</div>
		);
	}

	if (error || !summary) {
		if (section === "drivers") return null;

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

	const heroSection = (
		<div
			className={cn(
				"flex w-full",
				compact
					? "flex-col items-center justify-center gap-4 sm:gap-5 text-center"
					: "flex-col md:flex-row md:items-start gap-6 sm:gap-8",
			)}
		>
			<div className="flex flex-col items-center shrink-0 w-auto">
				<AIMGaugeRing
					aimFraction={summary.global_score}
					colorClass={riskGaugeColorClass(summary.risk_level)}
					compact={compact}
				/>
			</div>

			<div
				className={cn(
					"flex flex-col",
					compact
						? "items-center space-y-1.5 sm:space-y-2 w-full max-w-sm"
						: "flex-1 w-full min-w-0 space-y-3 sm:space-y-4 text-center md:text-left md:items-start",
				)}
			>
				<div className="w-full">
					<p className="text-[10px] sm:text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
						Account
					</p>
					<p
						className={cn(
							"font-medium text-[var(--text-primary)] break-all",
							compact ? "text-xs sm:text-sm" : "",
						)}
					>
						{summary.user.email}
					</p>
				</div>

				<div className={cn("flex flex-wrap gap-2 items-center", compact && "justify-center")}>
					<span
						className={cn(
							"font-medium rounded-md border",
							compact ? "px-2 py-0.5 text-[10px] sm:text-xs" : "px-2.5 py-1 text-xs",
							badgeClass,
						)}
					>
						{riskLevelLabel(summary.risk_level)}
					</span>
				</div>

				<p className={cn("text-[var(--text-secondary)]", compact ? "text-[10px] sm:text-xs" : "text-xs")}>
					{trendLabel}
				</p>
			</div>
		</div>
	);

	const driversSection = <TopDriversPanel drivers={summary.top_drivers} />;

	return (
		<div
			className={cn(
				"w-full",
				section === "all" ? "space-y-4" : "",
				section === "summary" && compact ? "flex items-center justify-center w-full" : "",
				className,
			)}
		>
			{showSummary && heroSection}
			{showDrivers && driversSection}
		</div>
	);
}
