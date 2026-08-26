import { prisma } from "../config/prisma";
import { calculateConfidence } from "./aimV2";
import {
	AIM_CATEGORIES,
	AIM_CATEGORY_LABELS,
	AIM_CATEGORY_DESCRIPTIONS,
	getAimCategoryForSignal,
	trendFromDelta,
	TREND_WINDOW_DAYS,
	type AimCategoryKey,
	type Trend,
} from "../config/domainMapping";

/**
 * Read-only, additive "AIM Anatomy" builder. This NEVER writes to the AIM
 * score, never touches aimV2.ts's math, and never recomputes anything — it
 * only re-reads events that already exist and groups them by the REAL 5
 * engine variables (reliability, consistency, peer_validation,
 * contradiction, decay) — no translation layer, per Antonio's decision.
 *
 * Score scale note: this reuses the exact same 0–1 convention already
 * displayed everywhere else in the app (see lib/aimDisplay.ts on the
 * frontend — `0.50` is shown as `"0.50%"`). Category sub-scores are derived
 * with the same neutral baseline (0.5) so they read consistently next to
 * the real, existing AIM score — no new/invented scale.
 */

const EVENT_SAMPLE_SIZE = 300;
const TOP_EVENTS_PER_CATEGORY = 5;
const BASELINE = 0.5;

export type AnatomyEvent = {
	id: string;
	source: "aimEvent" | "domainAimEvent";
	eventType: string;
	signal: string | null;
	delta: number;
	createdAt: string;
	evidenceCount: number;
};

export type AnatomyCategory = {
	key: AimCategoryKey;
	label: string;
	description: string;
	score: number; // 0–1, same convention as User.aimScore
	eventCount: number;
	totalDelta: number;
	trend: Trend;
	trendDelta30d: number | null;
	topEvents: AnatomyEvent[];
};

export type AimAnatomy = {
	userId: string;
	aimScore: number;
	aimStatus: string;
	aimTrend: Trend;
	aimTrendDelta30d: number | null;
	confidence: number; // 0–1
	categories: AnatomyCategory[];
	strongestCategory: AimCategoryKey | null;
	weakestCategory: AimCategoryKey | null;
	explanation: string;
	keyAssumptions: string[];
	suggestedActions: string[];
};

function categoryActionCopy(key: AimCategoryKey): string {
	switch (key) {
		case "reliability":
			return "Follow through on outcomes and get more of your claims independently verified.";
		case "consistency":
			return "Keep your behavior steady and predictable over time — avoid sudden shifts.";
		case "peer_validation":
			return "Engage constructively with peers — endorsements from others strengthen this category.";
		case "contradiction":
			return "Resolve open disputes and avoid actions that trigger new challenges.";
		case "decay":
			return "Stay active — long gaps in activity apply a small, gradual decay.";
	}
}

export async function buildAimAnatomy(userId: string): Promise<AimAnatomy | null> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, aimScore: true, aimStatus: true },
	});
	if (!user) return null;

	const since30d = new Date(Date.now() - TREND_WINDOW_DAYS * 24 * 60 * 60 * 1000);

	const [aimEvents, domainAimEvents, confidence, scoreHistory30d] = await Promise.all([
		prisma.aimEvent.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
			take: EVENT_SAMPLE_SIZE,
			include: { evidence: { select: { id: true } } },
		}),
		prisma.domainAimEvent.findMany({
			where: { userId, isReversed: false },
			orderBy: { createdAt: "desc" },
			take: EVENT_SAMPLE_SIZE,
			include: { evidence: { select: { id: true } } },
		}),
		calculateConfidence(userId, "none"),
		prisma.aimScoreHistory.findMany({
			where: { userId, createdAt: { gte: since30d } },
			orderBy: { createdAt: "asc" },
			select: { score: true, createdAt: true },
		}),
	]);

	const buckets: Record<AimCategoryKey, AnatomyEvent[]> = {
		reliability: [],
		consistency: [],
		peer_validation: [],
		contradiction: [],
		decay: [],
	};

	for (const ev of aimEvents) {
		const key = getAimCategoryForSignal(ev.signal ?? ev.eventType);
		if (!key) continue; // informational/non-signal event (e.g. "confidence", "base") — not bucketed
		buckets[key].push({
			id: ev.id,
			source: "aimEvent",
			eventType: ev.eventType,
			signal: ev.signal,
			delta: ev.delta,
			createdAt: ev.createdAt.toISOString(),
			evidenceCount: ev.evidence.length,
		});
	}
	for (const ev of domainAimEvents) {
		const key = getAimCategoryForSignal(ev.eventType);
		if (!key) continue;
		buckets[key].push({
			id: ev.id,
			source: "domainAimEvent",
			eventType: ev.eventType,
			signal: ev.domainName,
			delta: ev.effectiveDelta,
			createdAt: ev.createdAt.toISOString(),
			evidenceCount: ev.evidence.length,
		});
	}

	const since30dMs = since30d.getTime();

	const categories: AnatomyCategory[] = AIM_CATEGORIES.map((key) => {
		const events = buckets[key].sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
		const totalDelta = events.reduce((sum, e) => sum + e.delta, 0);
		const score = Math.min(1, Math.max(0, BASELINE + totalDelta));

		// Trend = sum of this category's deltas within the last 30 days —
		// mathematically equivalent to "value now minus value 30 days ago",
		// without needing a per-category history table.
		let trendDelta30d: number | null = null;
		if (events.length > 0) {
			trendDelta30d = events
				.filter((e) => new Date(e.createdAt).getTime() >= since30dMs)
				.reduce((sum, e) => sum + e.delta, 0);
		}

		return {
			key,
			label: AIM_CATEGORY_LABELS[key],
			description: AIM_CATEGORY_DESCRIPTIONS[key],
			score,
			eventCount: events.length,
			totalDelta,
			trend: trendFromDelta(trendDelta30d),
			trendDelta30d,
			topEvents: events.slice(0, TOP_EVENTS_PER_CATEGORY),
		};
	});

	const withHistory = categories.filter((c) => c.eventCount > 0);
	const sorted = [...withHistory].sort((a, b) => b.score - a.score);
	const strongestCategory = sorted[0]?.key ?? null;
	const weakestCategory = sorted[sorted.length - 1]?.key ?? null;

	const explanation =
		strongestCategory && weakestCategory && strongestCategory !== weakestCategory
			? `Your AIM reflects five real signal categories from the scoring engine. ${AIM_CATEGORY_LABELS[strongestCategory]} is currently your strongest area, while ${AIM_CATEGORY_LABELS[weakestCategory]} is limiting your current score.`
			: "Your AIM reflects five real signal categories from the scoring engine. Keep building verified activity across all of them to strengthen your score.";

	const keyAssumptions = [
		"All events are treated as verified unless disputed.",
		"Categories are the exact 5 variables the scoring engine uses — reliability, consistency, peer validation, contradiction, decay — not a marketing translation.",
		"Signals lose influence over time (recency decay applied on every recompute).",
		"Prolonged inactivity applies a gradual decay to your score.",
	];

	const suggestedActions = weakestCategory
		? [categoryActionCopy(weakestCategory), ...AIM_CATEGORIES.filter((c) => c !== weakestCategory).map(categoryActionCopy)]
		: AIM_CATEGORIES.map(categoryActionCopy);

	let aimTrendDelta30d: number | null = null;
	if (scoreHistory30d.length >= 2) {
		aimTrendDelta30d = scoreHistory30d[scoreHistory30d.length - 1].score - scoreHistory30d[0].score;
	}

	return {
		userId: user.id,
		aimScore: user.aimScore,
		aimStatus: user.aimStatus,
		aimTrend: trendFromDelta(aimTrendDelta30d),
		aimTrendDelta30d,
		confidence,
		categories,
		strongestCategory,
		weakestCategory,
		explanation,
		keyAssumptions,
		suggestedActions,
	};
}
