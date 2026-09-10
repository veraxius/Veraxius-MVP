import { createHash } from "crypto";
import { prisma } from "../../config/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Postgres' JSONB type does not preserve object key insertion order — it's
 * stored decomposed and reconstructed, which can reorder keys on read. A
 * hash computed from a plain JSON.stringify() at write time would then fail
 * to recompute identically at verify time even though nothing was tampered
 * with. This recursively sorts object keys (arrays keep their order) so the
 * canonical string — and therefore the hash — is reproducible regardless of
 * how the value round-trips through JSONB.
 */
function canonicalStringify(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map(canonicalStringify).join(",")}]`;
	}
	if (value && typeof value === "object") {
		const keys = Object.keys(value as Record<string, unknown>).sort();
		return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify((value as Record<string, unknown>)[k])}`).join(",")}}`;
	}
	return JSON.stringify(value);
}

/**
 * MVP5 Governance Log. Hash-chained the same way AimEvent.contentHash already
 * works today — SHA-256 of the event's own canonical fields, computed once,
 * never mutated — here additionally chained to the previous event's hash for
 * the same correlationId, so any historical row can be verified against the
 * one before it (Directive §31, "Governance events immutable").
 */

type GovernanceEventInput = {
	tenantId: string;
	correlationId: string;
	eventType: string;
	entityId?: string | null;
	decisionId?: string | null;
	trustStateId?: string | null;
	authorityId?: string | null;
	actionId?: string | null;
	outcomeId?: string | null;
	evidenceIds?: unknown;
	signalIds?: unknown;
	contradictions?: unknown;
	rejectedAlternatives?: unknown;
	policyId?: string | null;
	policyVersion?: string | null;
	trustEngineVersion?: string | null;
	humanActorId?: string | null;
	humanOverride?: boolean | null;
	eventPayload: Record<string, unknown>;
};

export async function writeGovernanceEvent(input: GovernanceEventInput) {
	const last = await prisma.governanceEvent.findFirst({
		where: { tenantId: input.tenantId, correlationId: input.correlationId },
		orderBy: { createdAt: "desc" },
		select: { eventHash: true },
	});
	const previousHash = last?.eventHash ?? null;

	const canonical = canonicalStringify({
		tenantId: input.tenantId,
		correlationId: input.correlationId,
		eventType: input.eventType,
		eventPayload: input.eventPayload,
		previousHash,
	});
	const eventHash = createHash("sha256").update(canonical).digest("hex");

	return prisma.governanceEvent.create({
		data: {
			tenantId: input.tenantId,
			correlationId: input.correlationId,
			eventType: input.eventType,
			entityId: input.entityId ?? undefined,
			decisionId: input.decisionId ?? undefined,
			trustStateId: input.trustStateId ?? undefined,
			authorityId: input.authorityId ?? undefined,
			actionId: input.actionId ?? undefined,
			outcomeId: input.outcomeId ?? undefined,
			evidenceIds: (input.evidenceIds ?? undefined) as Prisma.InputJsonValue | undefined,
			signalIds: (input.signalIds ?? undefined) as Prisma.InputJsonValue | undefined,
			contradictions: (input.contradictions ?? undefined) as Prisma.InputJsonValue | undefined,
			rejectedAlternatives: (input.rejectedAlternatives ?? undefined) as Prisma.InputJsonValue | undefined,
			policyId: input.policyId ?? undefined,
			policyVersion: input.policyVersion ?? undefined,
			trustEngineVersion: input.trustEngineVersion ?? undefined,
			humanActorId: input.humanActorId ?? undefined,
			humanOverride: input.humanOverride ?? undefined,
			eventPayload: input.eventPayload as Prisma.InputJsonValue,
			previousHash: previousHash ?? undefined,
			eventHash,
		},
	});
}

/** Verifies the hash chain for one correlationId hasn't been tampered with (AT-15). */
export async function verifyGovernanceChain(tenantId: string, correlationId: string): Promise<boolean> {
	const events = await prisma.governanceEvent.findMany({
		where: { tenantId, correlationId },
		orderBy: { createdAt: "asc" },
	});
	let expectedPrevious: string | null = null;
	for (const ev of events) {
		if ((ev.previousHash ?? null) !== expectedPrevious) return false;
		const canonical = canonicalStringify({
			tenantId: ev.tenantId,
			correlationId: ev.correlationId,
			eventType: ev.eventType,
			eventPayload: ev.eventPayload,
			previousHash: ev.previousHash ?? null,
		});
		const recomputed = createHash("sha256").update(canonical).digest("hex");
		if (recomputed !== ev.eventHash) return false;
		expectedPrevious = ev.eventHash;
	}
	return true;
}
