import { prisma } from "../config/prisma";
import { calculateAimScore, createAimEvent } from "./aim";
import { microRecalcQueue } from "./aimQueue";

export type AimDomain = "general" | "finance" | "tech" | "marketing" | "other";

export type AimSignalInput = {
	type: "success" | "contradiction" | "peer_validation" | "consistency" | "reliability" | "decay";
	value: number;
	domain?: AimDomain;
	context?: string;
};

export type AimBreakdownItem = { label: string; delta: number };

// ─── Unified activity item returned to the frontend ──────────────────────────

export type ActivityItem = {
	id: string;
	label: string;           // Primary human-readable description
	sublabel?: string;       // Secondary info (domain, voter, etc.)
	delta: number;           // Score change (positive = good)
	deltaLabel: string;      // "+0.0142" or "−0.0089"
	source: "global" | "domain"; // which AIM layer
	domain?: string;         // domain name if relevant
	createdAt: string;       // ISO timestamp
};

// ─── Label builders ───────────────────────────────────────────────────────────

function labelForAimEvent(eventType: string, signal: string | null, domain: string | null): {
	label: string;
	sublabel?: string;
} {
	const domainTag = domain ? `· ${domain}` : "";

	switch (eventType) {
		case "peer_validation":
			if (signal === "peer_endorsement")
				return { label: "Reliable vote received", sublabel: domainTag || undefined };
			if (signal === "peer_dispute")
				return { label: "🚩 Not Reliable vote received", sublabel: domainTag || undefined };
			return { label: "Peer validation event", sublabel: domainTag || undefined };

		case "reliability":
			return { label: "📋 Reliability outcome recorded", sublabel: domainTag || undefined };

		case "consistency":
			if ((signal ?? "").includes("break"))
				return { label: "⚠️ Consistency break detected", sublabel: domainTag || undefined };
			return { label: "📐 Consistency check passed", sublabel: domainTag || undefined };

		case "contradiction": {
			if ((signal ?? "").includes("provisional_penalty_l3"))
				return { label: "🔴 Challenge opened against you (L3 – Severe)", sublabel: "Provisional penalty applied" };
			if ((signal ?? "").includes("provisional_penalty_l2"))
				return { label: "🟠 Challenge opened against you (L2 – Moderate)", sublabel: "Provisional penalty applied" };
			if ((signal ?? "").includes("provisional_penalty_l1"))
				return { label: "🟡 Challenge opened against you (L1 – Minor)", sublabel: "Provisional penalty applied" };
			if ((signal ?? "").includes("dismissed"))
				return { label: "✅ Challenge dismissed — penalty reversed" };
			if ((signal ?? "").includes("upheld"))
				return { label: "❌ Challenge upheld — penalty kept" };
			if ((signal ?? "").includes("malicious"))
				return { label: "⚠️ Malicious challenge — accuser penalised" };
			return { label: "⚔️ Contradiction event" };
		}

		case "decay":
			return { label: "📉 Inactivity decay applied", sublabel: domainTag || undefined };

		case "base":
			return { label: "🆕 Account initialised (base score)" };

		default:
			return { label: `${eventType.replace(/_/g, " ")}`, sublabel: domainTag || undefined };
	}
}

function labelForDomainEvent(eventType: string, domainName: string): {
	label: string;
	sublabel?: string;
} {
	switch (eventType) {
		case "peer_endorsement":
			return { label: "Reliable vote on your post", sublabel: domainName };
		case "peer_dispute":
			return { label: "🚩 Not Reliable vote on your post", sublabel: domainName };
		case "inactivity_decay":
			return { label: "📉 Domain inactivity decay", sublabel: domainName };
		default:
			return { label: eventType.replace(/_/g, " "), sublabel: domainName };
	}
}

function formatDelta(delta: number): string {
	const sign = delta >= 0 ? "+" : "−";
	return `${sign}${Math.abs(delta).toFixed(4)}`;
}

// ─── AIMEngine class ──────────────────────────────────────────────────────────

export class AIMEngine {
	async recordSignals(userId: string, signals: AimSignalInput[]) {
		for (const s of signals) {
			const mappedType =
				s.type === "peer_validation" ? "success" :
				s.type === "consistency" ? "success" :
				s.type === "reliability" ? "success" :
				s.type === "contradiction" ? "contradiction" :
				s.type === "decay" ? "decay" :
				"success";

			await createAimEvent(userId, mappedType, s.value, s.context);
		}

		microRecalcQueue.enqueue(userId, async () => {
			await calculateAimScore(userId);
		});
	}

	async getSummary(userId: string) {
		const LIMIT = 50;

		const [user, rawAimEvents, rawDomainEvents, history] = await Promise.all([
			prisma.user.findUnique({
				where: { id: userId },
				select: { id: true, email: true, aimScore: true, aimStatus: true, created_at: true },
			}),
			// Global AIM events (peer feedback, reliability, challenges, decay …)
			prisma.aimEvent.findMany({
				where: { userId },
				orderBy: { createdAt: "desc" },
				take: LIMIT,
			}),
			// Domain-scoped trust-vote events
			prisma.domainAimEvent.findMany({
				where: { userId, isReversed: false },
				orderBy: { createdAt: "desc" },
				take: LIMIT,
			}),
			prisma.aimScoreHistory.findMany({
				where: { userId },
				orderBy: { createdAt: "desc" },
				take: 50,
			}),
		]);

		// ── Map global AIM events ──────────────────────────────────────────────
		const globalItems: ActivityItem[] = rawAimEvents.map((ev) => {
			const meta    = (ev.metadata as Record<string, unknown>) ?? {};
			const signal  = (ev.signal ?? (meta.kind as string | null)) ?? null;
			const { label, sublabel } = labelForAimEvent(ev.eventType, signal, ev.domain ?? null);
			return {
				id:         `aim-${ev.id}`,
				label,
				sublabel,
				delta:      ev.delta,
				deltaLabel: formatDelta(ev.delta),
				source:     "global" as const,
				domain:     ev.domain ?? undefined,
				createdAt:  ev.createdAt.toISOString(),
			};
		});

		// ── Map domain AIM events ─────────────────────────────────────────────
		const domainItems: ActivityItem[] = rawDomainEvents.map((ev) => {
			const { label, sublabel } = labelForDomainEvent(ev.eventType, ev.domainName);
			return {
				id:         `dom-${ev.id}`,
				label,
				sublabel,
				delta:      ev.effectiveDelta,
				deltaLabel: formatDelta(ev.effectiveDelta),
				source:     "domain" as const,
				domain:     ev.domainName,
				createdAt:  ev.createdAt.toISOString(),
			};
		});

		// ── Merge, deduplicate peer votes (domain events are the canonical record),
		//    sort newest-first, keep top LIMIT ──────────────────────────────────
		// Remove global "peer_validation" events that have a matching domain event
		// within ±5s to avoid showing the same real-world action twice.
		const domainTimestamps = new Set(
			rawDomainEvents
				.filter((e) => e.eventType === "peer_endorsement" || e.eventType === "peer_dispute")
				.map((e) => Math.round(e.createdAt.getTime() / 5000)), // 5-second buckets
		);

		const filteredGlobal = globalItems.filter((item) => {
			if (item.source !== "global") return true;
			const isPeerValidation = rawAimEvents
				.find((e) => `aim-${e.id}` === item.id)?.eventType === "peer_validation";
			if (!isPeerValidation) return true;
			// Suppress if a domain event covers the same 5-second window
			const bucket = Math.round(new Date(item.createdAt).getTime() / 5000);
			return !domainTimestamps.has(bucket);
		});

		const activity: ActivityItem[] = [
			...domainItems,       // domain events are richer — show them when available
			...filteredGlobal,    // everything else from the global AIM layer
		]
			.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
			.slice(0, LIMIT);

		// Legacy breakdown (kept for backwards compat — profile page now uses `activity`)
		const breakdown: AimBreakdownItem[] = activity.slice(0, 10).map((a) => ({
			label: [a.label, a.sublabel].filter(Boolean).join(" "),
			delta: a.delta,
		}));

		// Legacy events shape for the "Recent Events" panel
		const events = rawAimEvents.slice(0, 20).map((ev) => ({
			id:        ev.id,
			type:      ev.eventType,
			value:     ev.delta,
			context:   ev.domain ?? (ev.metadata as any)?.context ?? null,
			createdAt: ev.createdAt.toISOString(),
		}));

		return { user, events, history, breakdown, activity };
	}
}
