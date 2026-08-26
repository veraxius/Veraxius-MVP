"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { API_URL, apiFetch } from "@/lib/api";
import { formatAimScoreLabel, riskLevelFromFraction, riskLevelLabel, riskBadgeClass } from "@/lib/aimDisplay";
import { HowAimWorksPanel } from "@/components/HowAimWorksPanel";
import { TrendArrow, type Trend } from "@/components/TrendArrow";

type AnatomyEvent = {
	id: string;
	source: "aimEvent" | "domainAimEvent";
	eventType: string;
	signal: string | null;
	delta: number;
	createdAt: string;
	evidenceCount: number;
};

type CategoryKey = "reliability" | "consistency" | "peer_validation" | "contradiction" | "decay";

type AnatomyCategory = {
	key: CategoryKey;
	label: string;
	description: string;
	score: number;
	eventCount: number;
	totalDelta: number;
	trend: Trend;
	trendDelta30d: number | null;
	topEvents: AnatomyEvent[];
};

type AimAnatomy = {
	userId: string;
	aimScore: number;
	aimStatus: string;
	aimTrend: Trend;
	aimTrendDelta30d: number | null;
	confidence: number;
	categories: AnatomyCategory[];
	strongestCategory: CategoryKey | null;
	weakestCategory: CategoryKey | null;
	explanation: string;
	keyAssumptions: string[];
	suggestedActions: string[];
};

function relTime(iso: string) {
	const diff = (Date.now() - new Date(iso).getTime()) / 1000;
	if (diff < 60) return "now";
	if (diff < 3600) return `${Math.floor(diff / 60)}min ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	return `${Math.floor(diff / 86400)}d ago`;
}

export default function AimAnatomyPage() {
	const params = useParams<{ userId: string }>();
	const userId = params.userId;

	const [data, setData] = useState<AimAnatomy | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);

	useEffect(() => {
		let cancelled = false;
		async function load() {
			try {
				setLoading(true);
				setError(null);
				const resp = await apiFetch(`${API_URL}/api/aim/${userId}/anatomy`, { cache: "no-store" });
				const json = await resp.json();
				if (!resp.ok) throw new Error(json?.error || "Failed to load AIM anatomy");
				if (cancelled) return;
				setData(json as AimAnatomy);
				setSelectedCategory((json as AimAnatomy).categories[0]?.key ?? null);
			} catch (e) {
				if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		void load();
		return () => {
			cancelled = true;
		};
	}, [userId]);

	const selected = data?.categories.find((c) => c.key === selectedCategory) ?? null;
	const risk = data ? riskLevelFromFraction(data.aimScore) : null;

	return (
		<main className="vx-home-surface min-h-screen w-full px-4 py-8 sm:px-6 lg:px-8" style={{ color: "var(--text-primary)" }}>
			<div className="mx-auto grid w-full max-w-vx-content min-w-0 grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
				<HowAimWorksPanel className="lg:sticky lg:top-24 lg:self-start" />

				<div className="min-w-0 space-y-6">
					<div>
						<Link href={`/profile/${userId}`} className="text-sm text-amber hover:underline">
							← Back to Profile
						</Link>
						<h1 className="vx-h3 mt-2">The anatomy of your AIM</h1>
						<p className="vx-body-sm mt-1 text-secondary">
							Every point is backed by evidence. Every movement has a reason.
						</p>
					</div>

					{loading && <p className="vx-body-sm text-secondary">Loading…</p>}
					{error && <p className="vx-body-sm text-red">{error}</p>}

					{data && risk && (
						<>
							<section className="vx-panel rounded-2xl p-5 sm:p-6">
								<div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
									<div className="text-center sm:text-left">
										<div className="flex items-center justify-center gap-2 sm:justify-start">
											<p className="text-4xl font-bold text-amber">{formatAimScoreLabel(data.aimScore)}</p>
											<TrendArrow trend={data.aimTrend} />
										</div>
										<p className="vx-mono-label mt-1 text-tertiary">AIM SCORE · last 30 days</p>
										<span
											className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${riskBadgeClass(risk)}`}
										>
											{riskLevelLabel(risk)}
										</span>
									</div>

									<div className="grid grid-cols-2 gap-4 text-center sm:text-left">
										<div>
											<p className="vx-mono-label text-tertiary">Confidence</p>
											<p className="text-lg font-semibold">{(data.confidence * 100).toFixed(0)}%</p>
										</div>
										<div>
											<p className="vx-mono-label text-tertiary">Status</p>
											<p className="text-lg font-semibold capitalize">{data.aimStatus}</p>
										</div>
									</div>
								</div>
								<p className="mt-4 text-xs text-tertiary">Click any category below to see the evidence behind it.</p>
							</section>

							<section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
								{data.categories.map((c) => (
									<button
										key={c.key}
										type="button"
										onClick={() => setSelectedCategory(c.key)}
										className={`vx-panel rounded-xl p-4 text-left transition-colors ${
											selectedCategory === c.key ? "border-[var(--amber)]" : ""
										}`}
									>
										<p className="text-xs font-medium text-secondary">{c.label}</p>
										<p className="mt-1 text-2xl font-bold">{formatAimScoreLabel(c.score)}</p>
										<TrendArrow trend={c.trend} className="mt-1" />
									</button>
								))}
							</section>

							{selected && (
								<section className="vx-panel rounded-2xl p-5 sm:p-6">
									<div className="flex flex-wrap items-baseline justify-between gap-2">
										<h2 className="text-lg font-semibold">{selected.label}</h2>
										<TrendArrow trend={selected.trend} />
									</div>
									<p className="mt-1 text-sm text-secondary">{selected.description}</p>
									<p className="mt-1 text-xs text-tertiary">
										{selected.eventCount} contributing event{selected.eventCount === 1 ? "" : "s"} found for this
										category.
									</p>

									<div className="mt-4 space-y-2">
										{selected.topEvents.length === 0 ? (
											<p className="text-sm text-tertiary">No events recorded in this category yet.</p>
										) : (
											selected.topEvents.map((ev) => (
												<div
													key={ev.id}
													className="flex items-center justify-between gap-3 rounded-lg border border-[var(--divider)] px-3 py-2"
												>
													<div className="min-w-0">
														<p className="truncate text-sm font-medium">{ev.signal ?? ev.eventType}</p>
														<p className="text-xs text-tertiary">{relTime(ev.createdAt)}</p>
													</div>
													<div className="flex shrink-0 items-center gap-3">
														<span className={ev.delta >= 0 ? "text-green" : "text-red"}>
															{ev.delta >= 0 ? "+" : ""}
															{ev.delta.toFixed(3)}
														</span>
														<Link
															href={`/receipt/${ev.source === "aimEvent" ? "event" : "domain-event"}/${ev.id}`}
															className="vx-feed-action rounded-md px-2 py-1 text-xs text-secondary"
														>
															View evidence{ev.evidenceCount > 0 ? ` (${ev.evidenceCount})` : ""}
														</Link>
													</div>
												</div>
											))
										)}
									</div>
								</section>
							)}

							<section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
								<div className="vx-panel rounded-2xl p-5 sm:p-6">
									<h3 className="text-base font-semibold">Why your AIM is {formatAimScoreLabel(data.aimScore)}</h3>
									<p className="mt-2 text-sm text-secondary">{data.explanation}</p>
									<p className="mt-3 text-xs text-tertiary">
										Score confidence: {(data.confidence * 100).toFixed(0)}%, based on your verified activity history.
									</p>

									{data.keyAssumptions.length > 0 && (
										<>
											<h4 className="mt-5 text-sm font-semibold">Key Assumptions</h4>
											<ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-secondary">
												{data.keyAssumptions.map((a) => (
													<li key={a}>{a}</li>
												))}
											</ul>
										</>
									)}
								</div>

								<div className="vx-panel rounded-2xl p-5 sm:p-6">
									{data.suggestedActions.length > 0 ? (
										<>
											<h3 className="text-base font-semibold">What you can do</h3>
											<ul className="mt-2 space-y-2 text-sm text-secondary">
												{data.suggestedActions.map((a) => (
													<li key={a} className="flex gap-2">
														<span className="text-amber">—</span>
														<span>{a}</span>
													</li>
												))}
											</ul>
										</>
									) : (
										<p className="text-sm text-secondary">
											Sign in as this person to see personalized suggestions for improving their score.
										</p>
									)}

									<div className="mt-5 rounded-lg border border-[var(--amber-border)] p-3">
										<p className="text-sm font-medium">Every score is explainable.</p>
										<p className="mt-1 text-xs text-tertiary">
											These five categories are the real variables the scoring engine uses to compute your AIM — not a
											marketing simplification. Their labels are still pending final review.
										</p>
									</div>
								</div>
							</section>
						</>
					)}
				</div>
			</div>
		</main>
	);
}
