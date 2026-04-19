"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { getToken } from "@/lib/auth";
import { aimFractionToPercent } from "@/lib/aimDisplay";

// ─── Types ───────────────────────────────────────────────────────────────────

type DomainScore = {
	domain_name: string;
	domain_aim_score: number;
	display_percentage: number;
	domain_confidence: number;
	interaction_count: number;
	positive_signals: number;
	negative_signals: number;
	trend_7d: number;
	trend_direction: "up" | "down" | "stable";
	last_activity_at: string | null;
};

type DomainInProgress = {
	domain_name: string;
	interaction_count: number;
	posts_needed: number;
};

type DomainsResponse = {
	domains: DomainScore[];
	domains_in_progress?: DomainInProgress[];
};


// ─── Domain Icons ─────────────────────────────────────────────────────────────

const DOMAIN_ICONS: Record<string, string> = {
	Technology: "💻",
	"Finance & Business": "📈",
	"Health & Wellness": "🏥",
	"Legal & Compliance": "⚖️",
	"Marketing & Growth": "📣",
	"Science & Research": "🔬",
	"Education & Learning": "🎓",
	"Lifestyle & Culture": "🌍",
	"Real Estate & Infrastructure": "🏗️",
	"Politics & Society": "🏛️",
	"Environment & Sustainability": "🌱",
	"Sports & Athletics": "🏅",
	"Entertainment & Media": "🎬",
	"Food & Gastronomy": "🍽️",
	"Psychology & Development": "🧠",
};

// ─── Score bar color ──────────────────────────────────────────────────────────

function getBarColorStyle(pct: number): string {
	if (pct < 40) return "#FF6B57";
	if (pct <= 65) return "#FFB84D";
	return "#57D18C";
}

// ─── Trend Arrow ─────────────────────────────────────────────────────────────

function TrendBadge({
	direction,
	value,
}: {
	direction: "up" | "down" | "stable";
	value: number;
}) {
	if (direction === "up") {
		return (
			<span className="flex items-center gap-0.5 text-vx-green text-xs font-medium">
				<svg width="10" height="10" viewBox="0 0 12 12" fill="none">
					<path d="M6 2L10 7H2L6 2Z" fill="currentColor" />
				</svg>
				+{(value * 100).toFixed(1)}%
			</span>
		);
	}
	if (direction === "down") {
		return (
			<span className="flex items-center gap-0.5 text-vx-red text-xs font-medium">
				<svg width="10" height="10" viewBox="0 0 12 12" fill="none">
					<path d="M6 10L2 5H10L6 10Z" fill="currentColor" />
				</svg>
				{(value * 100).toFixed(1)}%
			</span>
		);
	}
	return <span className="text-vx-text-tertiary text-xs">—</span>;
}

// ─── Animated Bar ─────────────────────────────────────────────────────────────

function AnimatedBar({ pct, color }: { pct: number; color: string }) {
	const [width, setWidth] = useState(0);

	useEffect(() => {
		// Start at 0, animate to target after a short delay so the transition fires
		const t = setTimeout(() => setWidth(pct), 80);
		return () => clearTimeout(t);
	}, [pct]);

	return (
		<div className="w-full h-1.5 rounded-full bg-vx-divider overflow-hidden">
			<div
				className="h-full rounded-full"
				style={{
					width: `${width}%`,
					backgroundColor: color,
					transition: "width 900ms cubic-bezier(0.4, 0, 0.2, 1)",
				}}
			/>
		</div>
	);
}

// ─── Single Domain Row ────────────────────────────────────────────────────────

function slugifyDomain(name: string): string {
	const base = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
	return base || "domain";
}

function DomainRow({
	userId,
	domain,
	isLast,
}: {
	userId: string;
	domain: DomainScore;
	isLast: boolean;
}) {
	const score = domain.domain_aim_score;           // raw 0–1 value
	const displayPct = aimFractionToPercent(score);

	// Bar fills from 0% (score = 0.50, neutral start) to 100% (score = 1.00, max trust).
	// Scores below 0.50 (net negative votes) keep the bar at 0%.
	const barPct = Math.max(0, (score - 0.5) * 200); // 0.50→0%  0.75→50%  1.00→100%

	// Colour uses the full display_percentage scale so neutral (0.50) shows amber/yellow
	// and clearly positive scores shift to green.
	const barColor = getBarColorStyle(aimFractionToPercent(score));
	const icon = DOMAIN_ICONS[domain.domain_name] ?? "📌";
	const anchorId = `domain-${slugifyDomain(domain.domain_name)}`;

	return (
		<Link
			href={`/profile/${userId}#${anchorId}`}
			id={anchorId}
			scroll={false}
			className={`block px-5 py-4 flex flex-col gap-2.5 transition-colors hover:bg-white/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-vx-amber/50 rounded-none ${
				!isLast ? "border-b border-vx-divider" : ""
			}`}
		>
			{/* Top row: icon + name | signals + trend */}
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-2 min-w-0">
					<span className="text-lg shrink-0">{icon}</span>
					<span className="text-sm font-semibold text-vx-text truncate">
						{domain.domain_name}
					</span>
					{domain.domain_confidence > 0.7 && (
						<span className="hidden sm:inline-flex text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-vx-amber/10 text-vx-amber border border-vx-amber-border whitespace-nowrap shrink-0">
							High confidence
						</span>
					)}
				</div>
				<div className="flex items-center gap-3 shrink-0">
					<span className="text-xs text-vx-text-tertiary hidden sm:block">
						<span className="text-vx-green">↑{domain.positive_signals}</span>
						<span className="mx-1 text-vx-divider-strong">·</span>
						<span className="text-vx-red">↓{domain.negative_signals}</span>
					</span>
					<TrendBadge direction={domain.trend_direction} value={domain.trend_7d} />
				</div>
			</div>

			{/* Score + bar row */}
			<div className="flex items-center gap-4">
				<span
					className="text-2xl font-bold leading-none tabular-nums w-20 shrink-0"
					style={{ color: barColor }}
				>
					{displayPct.toFixed(1)}%
				</span>
				<div className="flex-1 flex flex-col gap-1">
					<AnimatedBar pct={barPct} color={barColor} />
					<div className="flex justify-between text-[11px] text-vx-text-tertiary">
						<span>{domain.interaction_count} interactions</span>
						<span>AIM Score</span>
					</div>
				</div>
			</div>
		</Link>
	);
}

// ─── In-progress row ──────────────────────────────────────────────────────────

function InProgressRow({
	domain,
	isLast,
}: {
	domain: DomainInProgress;
	isLast: boolean;
}) {
	const icon = DOMAIN_ICONS[domain.domain_name] ?? "📌";
	const progressPct = Math.round((domain.interaction_count / 5) * 100);

	return (
		<div
			className={`px-5 py-4 flex flex-col gap-2 opacity-70 ${
				!isLast ? "border-b border-dashed border-vx-divider" : ""
			}`}
		>
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-2 min-w-0">
					<span className="text-base shrink-0">{icon}</span>
					<span className="text-sm text-vx-text-secondary truncate">
						{domain.domain_name}
					</span>
				</div>
				<div className="shrink-0 text-right">
					<span className="text-xs text-vx-amber">
						{domain.posts_needed} more to unlock
					</span>
				</div>
			</div>
			<div className="flex items-center gap-4">
				<span className="text-xs text-vx-text-tertiary w-14 shrink-0">
					{domain.interaction_count}/5
				</span>
				<div className="flex-1">
					<div className="w-full h-1 rounded-full bg-vx-divider overflow-hidden">
						<div
							className="h-full rounded-full bg-vx-amber/50"
							style={{ width: `${progressPct}%` }}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ProfileDomainsProps {
	userId: string;
	isOwnProfile?: boolean;
}

export default function ProfileDomains({
	userId,
	isOwnProfile = false,
}: ProfileDomainsProps) {
	const [data, setData] = useState<DomainsResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [showAll, setShowAll] = useState(false);
	const cancelRef = useRef(false);

	async function load() {
		try {
			const token = getToken();
			const headers: Record<string, string> = {};
			if (token && isOwnProfile) {
				headers["Authorization"] = `Bearer ${token}`;
			}
			const resp = await fetch(`/api/users/${userId}/domains`, {
				cache: "no-store",
				headers,
			});
			if (!resp.ok) return;
			const json: DomainsResponse = await resp.json();
			if (!cancelRef.current) setData(json);
		} catch {
			// silent fail — domains are non-critical UI
		} finally {
			if (!cancelRef.current) setLoading(false);
		}
	}

	useEffect(() => {
		cancelRef.current = false;
		load();

		// Auto-refresh every 8s so Reliable votes are reflected in near real-time
		const interval = setInterval(load, 8_000);
		return () => {
			cancelRef.current = true;
			clearInterval(interval);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId, isOwnProfile]);

	// ── Loading skeleton ────────────────────────────────────────────────────
	if (loading) {
		return (
			<div className="space-y-3">
				<h2 className="text-xl font-semibold">Domains</h2>
				<div className="border border-vx-divider rounded-xl bg-vx-panel overflow-hidden">
					{[1, 2, 3].map((i, idx, arr) => (
						<div
							key={i}
							className={`px-5 py-4 animate-pulse ${
								idx !== arr.length - 1 ? "border-b border-vx-divider" : ""
							}`}
						>
							<div className="flex items-center gap-3 mb-3">
								<div className="w-6 h-6 rounded bg-vx-divider" />
								<div className="h-3.5 w-32 rounded bg-vx-divider" />
							</div>
							<div className="flex items-center gap-4">
								<div className="h-6 w-12 rounded bg-vx-divider" />
								<div className="flex-1 h-1.5 rounded-full bg-vx-divider" />
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	const publicDomains = data?.domains ?? [];
	const inProgress = data?.domains_in_progress ?? [];
	const hasPublic = publicDomains.length > 0;
	const MAX_VISIBLE = 6;
	const visibleDomains = showAll ? publicDomains : publicDomains.slice(0, MAX_VISIBLE);
	const hasMore = publicDomains.length > MAX_VISIBLE;

	return (
		<div className="space-y-4" id="profile-domains">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">Domains</h2>
				{hasMore && (
					<button
						onClick={() => setShowAll((v) => !v)}
						className="text-sm text-vx-amber hover:text-vx-amber-glow transition-colors"
					>
						{showAll ? "Show less" : `Show all (${publicDomains.length})`}
					</button>
				)}
			</div>

			{/* ── Public domain rows — single box ──────────────────────────── */}
			{hasPublic ? (
				<div className="border border-vx-divider rounded-xl bg-vx-panel overflow-hidden">
					{visibleDomains.map((d, idx) => (
						<DomainRow
							key={d.domain_name}
							userId={userId}
							domain={d}
							isLast={idx === visibleDomains.length - 1}
						/>
					))}
				</div>
			) : (
				<div className="border border-vx-divider rounded-xl p-6 text-center bg-vx-panel">
					<p className="text-vx-text-secondary text-sm">
						No domains established yet. Keep posting to build domain credibility.
					</p>
				</div>
			)}

			{/* ── In-progress domains (owner only) ────────────────────────── */}
			{isOwnProfile && inProgress.length > 0 && (
				<div className="space-y-2 mt-2">
					<h3 className="text-sm font-semibold text-vx-text-secondary uppercase tracking-label">
						In Progress
					</h3>
					<div className="border border-dashed border-vx-divider rounded-xl bg-vx-panel/60 overflow-hidden">
						{inProgress.map((d, idx) => (
							<InProgressRow
								key={d.domain_name}
								domain={d}
								isLast={idx === inProgress.length - 1}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
