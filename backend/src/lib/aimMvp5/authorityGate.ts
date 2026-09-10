import { prisma } from "../../config/prisma";
import { writeGovernanceEvent } from "./governance";
import { withPrefix, PREFIX } from "./ids";

/**
 * MVP5 Authority Gate (Architecture Alignment FINAL §C.2, §E.2, §F).
 *
 * Trust ≠ Authority. This never recomputes trust — it takes an already-
 * evaluated TrustState and decides, together with Policy and the requested
 * action, what the system is permitted to do about it.
 */

export const AUTHORITY_STATES = ["EXECUTE", "CONSTRAIN", "CHALLENGE", "ESCALATE", "BLOCK"] as const;
export type AuthorityState = (typeof AUTHORITY_STATES)[number];

const EVIDENCE_CONFIDENCE_CHALLENGE_THRESHOLD = 40;

type RuleCondition = Record<string, { lte?: number; gte?: number; lt?: number; gt?: number; eq?: unknown }>;
type PolicyRule = { condition: RuleCondition; authority: AuthorityState };

function readPayloadValue(payload: Record<string, unknown>, trustScore: number, evidenceConfidence: number, key: string): unknown {
	if (key === "trust_score") return trustScore;
	if (key === "evidence_confidence") return evidenceConfidence;
	return payload[key];
}

function matchesCondition(payload: Record<string, unknown>, trustScore: number, evidenceConfidence: number, condition: RuleCondition): boolean {
	for (const [key, ops] of Object.entries(condition)) {
		const value = readPayloadValue(payload, trustScore, evidenceConfidence, key);
		if (typeof value !== "number") return false;
		if (ops.lte !== undefined && !(value <= ops.lte)) return false;
		if (ops.gte !== undefined && !(value >= ops.gte)) return false;
		if (ops.lt !== undefined && !(value < ops.lt)) return false;
		if (ops.gt !== undefined && !(value > ops.gt)) return false;
		if (ops.eq !== undefined && value !== ops.eq) return false;
	}
	return true;
}

function reasonForRejected(state: AuthorityState, chosen: AuthorityState): string {
	if (state === "EXECUTE") return "exceeds autonomous authority envelope";
	if (state === "BLOCK") return "evidence does not justify prohibition";
	if (state === "ESCALATE") return "risk does not require human authorization";
	if (state === "CONSTRAIN") return "trust and policy already support unrestricted execution";
	if (state === "CHALLENGE") return "evidence confidence is already sufficient";
	return `not selected in favor of ${chosen}`;
}

export async function evaluateAuthority(tenantId: string, decisionId: string, trustStateId: string, policyId: string) {
	const [decision, trustState, policy] = await Promise.all([
		prisma.decision.findFirst({ where: { id: decisionId, tenantId } }),
		prisma.trustState.findFirst({ where: { id: trustStateId, tenantId, decisionId } }),
		prisma.policy.findFirst({ where: { id: policyId, tenantId, status: "active" } }),
	]);
	if (!decision) return { error: "decision_not_found" as const };
	if (!trustState) return { error: "trust_state_not_found" as const };
	if (!policy) return { error: "policy_not_found" as const };

	const explanation = trustState.explanation as { materialContradiction?: boolean } | null;
	const materialContradiction = Boolean(explanation?.materialContradiction);

	let authorityState: AuthorityState;
	const reasonCodes: string[] = [];

	if (materialContradiction) {
		authorityState = "CHALLENGE";
		reasonCodes.push("MATERIAL_CONTRADICTION");
	} else if (trustState.evidenceConfidence < EVIDENCE_CONFIDENCE_CHALLENGE_THRESHOLD) {
		authorityState = "CHALLENGE";
		reasonCodes.push("INSUFFICIENT_EVIDENCE_CONFIDENCE");
	} else {
		const rules = (policy.rules as { rules?: PolicyRule[] } | PolicyRule[] | null) as PolicyRule[] | { rules: PolicyRule[] } | null;
		const ruleList: PolicyRule[] = Array.isArray(rules) ? rules : rules?.rules ?? [];
		const payload = (decision.payload as Record<string, unknown>) ?? {};
		const matched = ruleList.find((r) => matchesCondition(payload, trustState.trustScore, trustState.evidenceConfidence, r.condition));
		authorityState = matched?.authority ?? "ESCALATE";
		reasonCodes.push(matched ? "POLICY_RULE_MATCH" : "NO_POLICY_RULE_MATCHED");
		if (authorityState === "ESCALATE" && !matched) reasonCodes.push("HIGH_CONSEQUENCE_ACTION");
	}

	const rejectedAlternatives = AUTHORITY_STATES.filter((s) => s !== authorityState).map((s) => ({
		authority: s,
		reason: reasonForRejected(s, authorityState),
	}));

	// EXECUTE/CONSTRAIN are immediately usable; ESCALATE/CHALLENGE/BLOCK are
	// terminal until an external process (human approval, more evidence)
	// resolves them — see §E.2.
	const status = authorityState === "EXECUTE" || authorityState === "CONSTRAIN" ? "active" : "issued";
	const humanRequired = authorityState === "ESCALATE";

	const authority = await prisma.authority.create({
		data: {
			tenantId,
			decisionId,
			trustStateId,
			policyId: policy.id,
			policyVersion: policy.version, // Correction #6 — snapshotted, immutable
			authorityState,
			constraints: (decision.payload as object) ?? undefined,
			humanRequired,
			reasonCodes,
			status,
		},
	});

	await prisma.decision.update({
		where: { id: decisionId },
		data: { status: authorityState === "BLOCK" ? "blocked" : authorityState === "ESCALATE" ? "escalated" : "decided" },
	});

	await writeGovernanceEvent({
		tenantId,
		correlationId: decisionId,
		eventType: `authority.${authorityState.toLowerCase()}`,
		entityId: trustState.subjectEntityId,
		decisionId,
		trustStateId,
		authorityId: authority.id,
		policyId: policy.id,
		policyVersion: policy.version,
		rejectedAlternatives,
		eventPayload: { authorityState, reasonCodes },
	});

	return { authority, id: withPrefix(PREFIX.authority, authority.id), rejectedAlternatives };
}

/**
 * Correction #4 — the formal event that resolves an ESCALATE'd Authority.
 * Never mutates the original row; issues a new, superseding one.
 */
export async function approveEscalatedAuthority(
	tenantId: string,
	authorityId: string,
	humanActorId: string,
	grant: "EXECUTE" | "CONSTRAIN" | "BLOCK",
	scope?: unknown,
	reason?: string,
) {
	const original = await prisma.authority.findFirst({ where: { id: authorityId, tenantId } });
	if (!original) return { error: "authority_not_found" as const };
	if (original.authorityState !== "ESCALATE" || original.status !== "issued") {
		return { error: "authority_not_escalated_or_already_resolved" as const };
	}

	const approval = await prisma.humanApproval.create({
		data: {
			tenantId,
			humanActorId,
			decisionId: original.decisionId,
			authorityId: original.id,
			scope: (scope as object) ?? undefined,
			reason: reason ?? undefined,
		},
	});

	await prisma.authority.update({ where: { id: original.id }, data: { status: "resolved" } });

	const superseding = await prisma.authority.create({
		data: {
			tenantId,
			decisionId: original.decisionId,
			trustStateId: original.trustStateId,
			policyId: original.policyId,
			policyVersion: original.policyVersion,
			authorityState: grant,
			constraints: original.constraints ?? undefined,
			humanRequired: false,
			reasonCodes: ["HUMAN_APPROVED"],
			status: grant === "BLOCK" ? "issued" : "active",
			supersedesAuthorityId: original.id,
		},
	});

	await writeGovernanceEvent({
		tenantId,
		correlationId: original.decisionId,
		eventType: "authority.superseded",
		decisionId: original.decisionId,
		authorityId: superseding.id,
		humanActorId,
		humanOverride: false,
		eventPayload: { supersedesAuthorityId: original.id, approvalId: approval.id, grant },
	});

	return { authority: superseding, id: withPrefix(PREFIX.authority, superseding.id) };
}
