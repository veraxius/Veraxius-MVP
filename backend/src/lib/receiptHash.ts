import { createHash } from "crypto";

/**
 * Tamper-evidence hash for a Trust Receipt (SHA-256 of the record's own
 * canonical fields). This is NOT blockchain and NOT externally notarized —
 * it only proves the record hasn't been altered since it was first hashed,
 * within our own database. That's the scope Antonio confirmed for MVP4.
 *
 * Computed LAZILY (the first time a receipt is requested for a record),
 * never at write time — so nothing in the live scoring engine (aimV2.ts,
 * domainScoreService.ts) needs to change to support this. Because the hash
 * is a pure function of fields that never change after creation (id,
 * userId, eventType, signal/domainName, delta, createdAt, ...), computing
 * it later yields the exact same value as computing it at insert time.
 */

type HashableAimEvent = {
	id: string;
	userId: string;
	eventType: string;
	signal: string | null;
	delta: number;
	weight: number;
	domain: string | null;
	contextWeight: number;
	createdAt: Date;
};

type HashableDomainAimEvent = {
	id: string;
	userId: string;
	domainName: string;
	eventType: string;
	rawDelta: number;
	effectiveDelta: number;
	createdAt: Date;
};

function sha256(canonicalJson: string): string {
	return createHash("sha256").update(canonicalJson).digest("hex");
}

export function computeAimEventHash(event: HashableAimEvent): string {
	const canonical = JSON.stringify({
		id: event.id,
		userId: event.userId,
		eventType: event.eventType,
		signal: event.signal,
		delta: event.delta,
		weight: event.weight,
		domain: event.domain,
		contextWeight: event.contextWeight,
		createdAt: event.createdAt.toISOString(),
	});
	return sha256(canonical);
}

export function computeDomainAimEventHash(event: HashableDomainAimEvent): string {
	const canonical = JSON.stringify({
		id: event.id,
		userId: event.userId,
		domainName: event.domainName,
		eventType: event.eventType,
		rawDelta: event.rawDelta,
		effectiveDelta: event.effectiveDelta,
		createdAt: event.createdAt.toISOString(),
	});
	return sha256(canonical);
}
