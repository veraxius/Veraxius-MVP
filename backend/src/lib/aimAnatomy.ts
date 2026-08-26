import { prisma } from "../config/prisma";
import { calculateConfidence } from "./aimV2";
import { AIM_DOMAINS, AIM_DOMAIN_LABELS, AIM_DOMAIN_WEIGHTS, getAimDomainForSignal, type AimDomainKey } from "../config/domainMapping";

/**
 * Read-only, additive "AIM Anatomy" builder for MVP4's explainability screen.
 * This NEVER writes to the AIM score, never touches aimV2.ts's math, and
 * never recomputes anything — it only re-reads events that already exist
 * and groups them by the (draft, pending-review) 4-domain mapping.
 *
 * Score scale note: this reuses the exact same 0–1 convention already
 * displayed everywhere else in the app (see lib/aimDisplay.ts on the
 * frontend — `0.50` is shown as `"0.50%"`). Domain sub-scores are derived
 * with the same neutral baseline (0.5) so they read consistently next to
 * the real, existing AIM score — no new/invented scale.
 */

const EVENT_SAMPLE_SIZE = 300;
const TOP_EVENTS_PER_DOMAIN = 5;

export type AnatomyEvent = {
	id: string;
	source: "aimEvent" | "domainAimEvent";
	eventType: string;
	signal: string | null;
	delta: number;
	createdAt: string;
	evidenceCount: number;
};

export type AnatomyDomain = {
	key: AimDomainKey;
	label: string;
	weight: number;
	score: number; // 0–1, same convention as User.aimScore
	eventCount: number;
	totalDelta: number;
	topEvents: AnatomyEvent[];
};

export type AimAnatomy = {
	userId: string;
	aimScore: number;
	aimStatus: string;
	confidence: number; // 0–1
	domains: AnatomyDomain[];
	strongestDomain: AimDomainKey | null;
	weakestDomain: AimDomainKey | null;
	explanation: string;
	keyAssumptions: string[];
	suggestedActions: string[];
};

const BASELINE = 0.5;

function domainActionCopy(key: AimDomainKey): string {
	switch (key) {
		case "commitment_fulfillment":
			return "Fulfill open commitments on time and attach evidence when you complete them.";
		case "verification_strength":
			return "Increase verification coverage — get more claims and outcomes independently confirmed.";
		case "communication":
			return "Improve communication consistency — respond promptly and keep peers informed.";
		case "consistency":
			return "Stay active and consistent over time; long gaps in activity apply a small decay.";
	}
}

export async function buildAimAnatomy(userId: string): Promise<AimAnatomy | null> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, aimScore: true, aimStatus: true },
	});
	if (!user) return null;

	const [aimEvents, domainAimEvents, confidence] = await Promise.all([
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
	]);

	const buckets: Record<AimDomainKey, AnatomyEvent[]> = {
		commitment_fulfillment: [],
		verification_strength: [],
		communication: [],
		consistency: [],
	};

	for (const ev of aimEvents) {
		const key = getAimDomainForSignal(ev.signal ?? ev.eventType);
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
		const key = getAimDomainForSignal(ev.eventType);
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

	const domains: AnatomyDomain[] = AIM_DOMAINS.map((key) => {
		const events = buckets[key].sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
		const totalDelta = events.reduce((sum, e) => sum + e.delta, 0);
		const score = Math.min(1, Math.max(0, BASELINE + totalDelta));
		return {
			key,
			label: AIM_DOMAIN_LABELS[key],
			weight: AIM_DOMAIN_WEIGHTS[key],
			score,
			eventCount: events.length,
			totalDelta,
			topEvents: events.slice(0, TOP_EVENTS_PER_DOMAIN),
		};
	});

	const sorted = [...domains].sort((a, b) => b.score - a.score);
	const strongestDomain = sorted[0]?.eventCount ? sorted[0].key : null;
	const weakestDomain = sorted[sorted.length - 1]?.key ?? null;

	const explanation =
		strongestDomain && weakestDomain && strongestDomain !== weakestDomain
			? `Your AIM is a weighted reflection of four trust dimensions. ${AIM_DOMAIN_LABELS[strongestDomain]} is currently your strongest area, while ${AIM_DOMAIN_LABELS[weakestDomain]} is limiting your current score.`
			: "Your AIM is a weighted reflection of four trust dimensions. Keep building verified activity across all of them to strengthen your score.";

	const keyAssumptions = [
		"All events are treated as verified unless disputed.",
		"Domain grouping follows the draft AIM Domain Mapping (pending review) — see backend/src/config/domainMapping.ts.",
		"Signals lose influence over time (recency decay applied on every recompute).",
		"Prolonged inactivity applies a gradual decay to your score.",
	];

	const suggestedActions = weakestDomain
		? [domainActionCopy(weakestDomain), ...AIM_DOMAINS.filter((d) => d !== weakestDomain).map(domainActionCopy)]
		: AIM_DOMAINS.map(domainActionCopy);

	return {
		userId: user.id,
		aimScore: user.aimScore,
		aimStatus: user.aimStatus,
		confidence,
		domains,
		strongestDomain,
		weakestDomain,
		explanation,
		keyAssumptions,
		suggestedActions,
	};
}
