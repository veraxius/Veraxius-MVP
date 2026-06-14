/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getAuth } from "@/lib/auth";
import ProfileDomains from "@/components/ProfileDomains";
import { AIMScoreHeroCard } from "@/components/AIMScoreHeroCard";
import { AIMScoreHistoryChart } from "@/components/AIMScoreHistoryChart";
import { UserAvatar } from "@/components/UserAvatar";
import { useAIMScore } from "@/lib/hooks/useAIMScore";
import { formatAimScoreLabel } from "@/lib/aimDisplay";

type AimScoreHistory = {
	id: string;
	score: number;
	context?: string | null;
	createdAt: string;
};

type ActivityItem = {
	id: string;
	label: string;
	sublabel?: string;
	delta: number;
	deltaLabel: string;
	source: "global" | "domain";
	domain?: string;
	createdAt: string;
};

const LIST_PREVIEW_LIMIT = 10;

export default function ProfilePage() {
	const params = useParams<{ id: string }>();
	const userId = params.id;

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [history, setHistory] = useState<AimScoreHistory[]>([]);
	const [activity, setActivity] = useState<ActivityItem[]>([]);
	const [showAllActivity, setShowAllActivity] = useState(false);
	const [showAllHistory, setShowAllHistory] = useState(false);

	const currentAuth = typeof window !== "undefined" ? getAuth() : null;
	const isOwnProfile = currentAuth?.user?.id === userId;
	const { summary, refresh: refreshSummary } = useAIMScore(userId);

	const registeredName =
		summary?.user.name?.trim() ||
		(isOwnProfile ? currentAuth?.user?.name?.trim() : "") ||
		summary?.user.email?.split("@")[0] ||
		"";

	async function loadFeed() {
		try {
			setError(null);
			const resp = await fetch(`/api/aim/${userId}`, { cache: "no-store" });
			const data = await resp.json();
			if (!resp.ok) throw new Error(data?.error || "Failed to load");
			setHistory(data.history || []);
			setActivity(data.activity || []);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		setShowAllActivity(false);
		setShowAllHistory(false);
		loadFeed();
		const interval = setInterval(loadFeed, 10_000);
		return () => clearInterval(interval);
	}, [userId]);

	const visibleActivity = showAllActivity ? activity : activity.slice(0, LIST_PREVIEW_LIMIT);
	const visibleHistory = showAllHistory ? history : history.slice(0, LIST_PREVIEW_LIMIT);

	return (
		<div
			className="min-h-screen w-full max-w-6xl mx-auto min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 space-y-6 sm:space-y-8"
			style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
		>
			<h1 className="text-xl sm:text-2xl font-semibold text-center">Adaptive Integrity System</h1>

			<div className="flex flex-row items-start gap-3 sm:gap-5 min-w-0">
				<div className="flex flex-col items-center shrink-0 w-24 sm:w-28">
					<UserAvatar
						userId={userId}
						name={summary?.user.name ?? (isOwnProfile ? currentAuth?.user?.name : null)}
						email={summary?.user.email ?? currentAuth?.user?.email}
						profilePictureUrl={summary?.user.profilePictureUrl ?? null}
						size="lg"
						editable={isOwnProfile}
						onUploaded={() => void refreshSummary()}
						className="w-full"
					/>
					{registeredName ? (
						<p
							className="mt-2 w-full text-center text-sm sm:text-base font-semibold text-[var(--text-primary)] leading-tight break-words"
							title={registeredName}
						>
							{registeredName}
						</p>
					) : null}
				</div>
				<div className="flex-1 w-full min-w-0">
					<AIMScoreHeroCard userId={userId} compact />
				</div>
			</div>

			<AIMScoreHistoryChart userId={userId} pollIntervalMs={10_000} />

			{userId && (
				<div className="w-full">
					<ProfileDomains userId={userId} isOwnProfile={isOwnProfile} />
				</div>
			)}

			{loading && (
				<div className="text-sm text-vx-text-secondary animate-pulse">
					Loading activity…
				</div>
			)}
			{error && <div className="text-red-600">Error: {error}</div>}

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 min-w-0">
				<div className="min-w-0">
					<h2 className="text-lg sm:text-xl font-semibold mb-2">What&apos;s affecting your score</h2>
					<div className="border border-vx-divider rounded-xl bg-vx-panel overflow-hidden divide-y divide-vx-divider">
						{activity.length === 0 && !loading && (
							<div className="p-5 text-sm text-vx-text-secondary">
								No activity yet. Trust votes, challenges and reliability outcomes will appear
								here.
							</div>
						)}

						{visibleActivity.map((item) => (
							<ActivityRow key={item.id} item={item} />
						))}

						{activity.length > LIST_PREVIEW_LIMIT ? (
							<button
								type="button"
								onClick={() => setShowAllActivity((v) => !v)}
								className="w-full px-4 sm:px-5 py-3 text-sm font-medium text-amber hover-bg-surface border-t border-vx-divider transition-colors"
							>
								{showAllActivity ? "Show less" : "Show more+"}
							</button>
						) : null}
					</div>
				</div>

				<div className="min-w-0">
					<h2 className="text-lg sm:text-xl font-semibold mb-2">Score History</h2>
					<div className="border border-vx-divider rounded-xl bg-vx-panel overflow-hidden divide-y divide-vx-divider">
						{history.length === 0 && !loading && (
							<div className="p-5 text-sm text-vx-text-secondary">No history</div>
						)}

						{visibleHistory.map((h) => (
							<div key={h.id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-4 min-w-0">
								<div className="space-y-0.5">
									<div className="text-xs text-vx-text-tertiary">{h.context || "score update"}</div>
									<div className="text-xs text-vx-text-tertiary">
										{new Date(h.createdAt).toLocaleString()}
									</div>
								</div>
								<div className="font-semibold tabular-nums text-sm">
									{formatAimScoreLabel(Number(h.score))}
								</div>
							</div>
						))}

						{history.length > LIST_PREVIEW_LIMIT ? (
							<button
								type="button"
								onClick={() => setShowAllHistory((v) => !v)}
								className="w-full px-4 sm:px-5 py-3 text-sm font-medium text-amber hover-bg-surface border-t border-vx-divider transition-colors"
							>
								{showAllHistory ? "Show less" : "Show more+"}
							</button>
						) : null}
					</div>

					{/* <h2 className="text-xl font-semibold mt-6 mb-2">Challenge Layer</h2>
					<div className="border border-vx-divider rounded-xl bg-vx-panel p-4 flex items-center justify-between">
						<div className="text-sm text-vx-text-secondary">No challenges pending</div>
						<button type="button" className="vx-btn-primary rounded-lg text-sm font-semibold px-5 py-2.5">
							Flag an interaction
						</button>
					</div> */}
				</div>
			</div>
		</div>
	);
}

function ActivityRow({ item }: { item: ActivityItem }) {
	const isPositive = item.delta >= 0;
	const deltaColor = isPositive ? "text-vx-green" : "text-vx-red";
	const sourceBadgeColor =
		item.source === "domain"
			? "bg-vx-amber/10 text-vx-amber border-vx-amber/30"
			: "bg-blue-500/10 text-blue-400 border-blue-400/30";
	const sourceLabel = item.source === "domain" ? "Domain" : "Global";

	return (
		<div className="px-4 sm:px-5 py-3.5 flex items-start justify-between gap-4 min-w-0">
			<div className="flex-1 min-w-0 space-y-1">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-sm font-medium text-vx-text">{item.label}</span>
					<span
						className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${sourceBadgeColor} shrink-0`}
					>
						{sourceLabel}
					</span>
				</div>

				{item.sublabel && (
					<div className="text-xs text-vx-text-secondary">{item.sublabel}</div>
				)}

				<div className="text-xs text-vx-text-tertiary">
					{new Date(item.createdAt).toLocaleString()}
				</div>
			</div>

			<div className={`font-semibold tabular-nums text-sm shrink-0 ${deltaColor}`}>
				{item.deltaLabel}
			</div>
		</div>
	);
}
