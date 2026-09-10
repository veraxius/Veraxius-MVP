import type { Signal } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { writeGovernanceEvent } from "./governance";

const STRONG_THRESHOLD = 0.6;

/**
 * Directive §10 — "MVP5 must be capable of: detecting → representing →
 * challenging → resolving/escalating → recording contradictions."
 *
 * This is the detecting step: when the same subject Entity has both a strong
 * positive and a strong negative Signal in the same dimension, that is
 * contradictory evidence by definition — it must not be averaged away
 * (Correction #8). Idempotent: never creates a duplicate for the same pair
 * of signals while one is already open.
 */
export async function detectContradictions(tenantId: string, subjectEntityId: string, signals: Signal[]): Promise<string[]> {
	const byDimension = new Map<string, Signal[]>();
	for (const s of signals) {
		const list = byDimension.get(s.dimension) ?? [];
		list.push(s);
		byDimension.set(s.dimension, list);
	}

	const openExisting = await prisma.contradiction.findMany({
		where: { tenantId, subjectEntityId, status: { in: ["detected", "unresolved", "challenged"] } },
	});

	const createdIds: string[] = [];

	for (const [, list] of byDimension) {
		const strongPositive = list.filter((s) => s.direction === "positive" && s.strength >= STRONG_THRESHOLD);
		const strongNegative = list.filter((s) => s.direction === "negative" && s.strength >= STRONG_THRESHOLD);
		if (strongPositive.length === 0 || strongNegative.length === 0) continue;

		const a = strongPositive[0];
		const b = strongNegative[0];

		const alreadyFlagged = openExisting.some((c) => {
			const ids = (c.signalIds as string[] | null) ?? [];
			return ids.includes(a.id) && ids.includes(b.id);
		});
		if (alreadyFlagged) continue;

		const severity = Math.min(1, (a.strength + b.strength) / 2);
		const evidenceIds = [a.sourceEvidenceId, b.sourceEvidenceId].filter((x): x is string => Boolean(x));

		const contradiction = await prisma.contradiction.create({
			data: {
				tenantId,
				subjectEntityId,
				evidenceIds,
				signalIds: [a.id, b.id],
				severity,
				status: "detected",
			},
		});
		createdIds.push(contradiction.id);

		await writeGovernanceEvent({
			tenantId,
			correlationId: subjectEntityId,
			eventType: "contradiction.detected",
			entityId: subjectEntityId,
			signalIds: [a.id, b.id],
			evidenceIds,
			eventPayload: { contradictionId: contradiction.id, dimension: a.dimension, severity },
		});
	}

	return createdIds;
}
