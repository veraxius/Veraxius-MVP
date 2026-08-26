import { prisma } from "../config/prisma";
import { calculateConfidence } from "./aimV2";
import { getAimDomainForSignal, AIM_DOMAIN_LABELS } from "../config/domainMapping";
import { computeAimEventHash, computeDomainAimEventHash } from "./receiptHash";
import { signReceiptToken, type ReceiptKind } from "./receiptShare";

/**
 * Read-only Trust Receipt builder (MVP4). Never mutates score/history.
 * The ONLY write this performs is a one-time, idempotent backfill of
 * `contentHash` on the event row the first time its receipt is requested
 * (skipped entirely if already set) — the scoring engine itself is never
 * touched.
 */

export const POLICY_LABEL = "AIM Domain Mapping v0.1 (draft, pending review)";

type EvidenceItem = {
	id: string;
	fileName: string;
	fileUrl: string;
	fileType: string;
	fileSize: number;
	status: string;
	createdAt: string;
};

export type TrustReceipt = {
	kind: ReceiptKind;
	id: string;
	userId: string;
	userName: string | null;
	eventType: string;
	signal: string | null;
	domain: string;
	domainLabel: string;
	delta: number;
	createdAt: string;
	contentHash: string;
	policyApplied: string;
	confidence: number;
	evidence: EvidenceItem[];
	signalDetails: {
		repeatable: boolean;
		firstOccurrence: string | null;
		lastOccurrence: string | null;
		occurrenceCount: number;
		decayApplies: boolean;
	};
	shareUrl: string;
};

function mapEvidence(rows: { id: string; fileName: string; fileUrl: string; fileType: string; fileSize: number; status: string; createdAt: Date }[]): EvidenceItem[] {
	return rows.map((e) => ({
		id: e.id,
		fileName: e.fileName,
		fileUrl: e.fileUrl,
		fileType: e.fileType,
		fileSize: e.fileSize,
		status: e.status,
		createdAt: e.createdAt.toISOString(),
	}));
}

function publicBaseUrl(): string {
	return process.env.FRONTEND_URL || "http://localhost:3000";
}

export async function buildAimEventReceipt(id: string): Promise<TrustReceipt | null> {
	const event = await prisma.aimEvent.findUnique({
		where: { id },
		include: { user: { select: { id: true, name: true, email: true } }, evidence: true },
	});
	if (!event) return null;

	let contentHash = event.contentHash;
	if (!contentHash) {
		contentHash = computeAimEventHash({
			id: event.id,
			userId: event.userId,
			eventType: event.eventType,
			signal: event.signal,
			delta: event.delta,
			weight: event.weight,
			domain: event.domain,
			contextWeight: event.contextWeight,
			createdAt: event.createdAt,
		});
		await prisma.aimEvent.update({ where: { id: event.id }, data: { contentHash } });
	}

	const signalKey = event.signal ?? event.eventType;
	const domain = getAimDomainForSignal(signalKey);

	const [confidence, occurrences] = await Promise.all([
		calculateConfidence(event.userId, "none"),
		prisma.aimEvent.findMany({
			where: { userId: event.userId, eventType: event.eventType, signal: event.signal },
			orderBy: { createdAt: "asc" },
			select: { createdAt: true },
		}),
	]);

	const token = signReceiptToken("event", event.id);

	return {
		kind: "event",
		id: event.id,
		userId: event.userId,
		userName: event.user.name ?? event.user.email?.split("@")[0] ?? null,
		eventType: event.eventType,
		signal: event.signal,
		domain,
		domainLabel: AIM_DOMAIN_LABELS[domain],
		delta: event.delta,
		createdAt: event.createdAt.toISOString(),
		contentHash,
		policyApplied: POLICY_LABEL,
		confidence,
		evidence: mapEvidence(event.evidence),
		signalDetails: {
			repeatable: occurrences.length > 1,
			firstOccurrence: occurrences[0]?.createdAt.toISOString() ?? null,
			lastOccurrence: occurrences[occurrences.length - 1]?.createdAt.toISOString() ?? null,
			occurrenceCount: occurrences.length,
			decayApplies: event.eventType !== "decay",
		},
		shareUrl: `${publicBaseUrl()}/r/event/${event.id}?token=${token}`,
	};
}

export async function buildDomainAimEventReceipt(id: string): Promise<TrustReceipt | null> {
	const event = await prisma.domainAimEvent.findUnique({
		where: { id },
		include: { user: { select: { id: true, name: true, email: true } }, evidence: true },
	});
	if (!event) return null;

	let contentHash = event.contentHash;
	if (!contentHash) {
		contentHash = computeDomainAimEventHash({
			id: event.id,
			userId: event.userId,
			domainName: event.domainName,
			eventType: event.eventType,
			rawDelta: event.rawDelta,
			effectiveDelta: event.effectiveDelta,
			createdAt: event.createdAt,
		});
		await prisma.domainAimEvent.update({ where: { id: event.id }, data: { contentHash } });
	}

	const domain = getAimDomainForSignal(event.eventType);

	const [confidence, occurrences] = await Promise.all([
		calculateConfidence(event.userId, "none"),
		prisma.domainAimEvent.findMany({
			where: { userId: event.userId, eventType: event.eventType },
			orderBy: { createdAt: "asc" },
			select: { createdAt: true },
		}),
	]);

	const token = signReceiptToken("domain-event", event.id);

	return {
		kind: "domain-event",
		id: event.id,
		userId: event.userId,
		userName: event.user.name ?? event.user.email?.split("@")[0] ?? null,
		eventType: event.eventType,
		signal: event.domainName,
		domain,
		domainLabel: AIM_DOMAIN_LABELS[domain],
		delta: event.effectiveDelta,
		createdAt: event.createdAt.toISOString(),
		contentHash,
		policyApplied: POLICY_LABEL,
		confidence,
		evidence: mapEvidence(event.evidence),
		signalDetails: {
			repeatable: occurrences.length > 1,
			firstOccurrence: occurrences[0]?.createdAt.toISOString() ?? null,
			lastOccurrence: occurrences[occurrences.length - 1]?.createdAt.toISOString() ?? null,
			occurrenceCount: occurrences.length,
			decayApplies: event.eventType !== "inactivity_decay",
		},
		shareUrl: `${publicBaseUrl()}/r/domain-event/${event.id}?token=${token}`,
	};
}
