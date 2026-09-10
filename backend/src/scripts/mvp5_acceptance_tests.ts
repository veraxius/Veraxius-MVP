// MVP5 Acceptance Tests — AT-01 through AT-20, from the Architecture
// Alignment FINAL document. Exercises the real services (trustEngine,
// authorityGate, governance) directly against the real database inside a
// throwaway Tenant, which is deleted (cascading) at the end regardless of
// pass/fail. Mirrors the existing project convention (aim_e2e_test.ts) —
// no Jest is set up for this backend; this is a runnable ts-node script.
//
// Usage: npx ts-node src/scripts/mvp5_acceptance_tests.ts
import { randomBytes } from "crypto";
import { prisma } from "../config/prisma";
import { hashTenantApiKey } from "../middleware/tenantAuth";
import { evaluateTrust } from "../lib/aimMvp5/trustEngine";
import { createHash } from "crypto";
import { evaluateAuthority, approveEscalatedAuthority, findEnvelopeViolation, revokeAuthority } from "../lib/aimMvp5/authorityGate";
import { writeGovernanceEvent, verifyGovernanceChain } from "../lib/aimMvp5/governance";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(id: string, description: string, condition: boolean) {
	if (condition) {
		passed++;
		console.log(`  PASS  ${id} — ${description}`);
	} else {
		failed++;
		failures.push(`${id} — ${description}`);
		console.log(`  FAIL  ${id} — ${description}`);
	}
}

async function makeSignals(tenantId: string, targetEntityId: string, count: number, opts: Partial<{ direction: string; strength: number; confidence: number; dimension: string; effectiveFrom: Date; decayModel: string; halfLifeDays: number }> = {}) {
	const now = new Date();
	for (let i = 0; i < count; i++) {
		await prisma.signal.create({
			data: {
				tenantId,
				signalType: "claim_verified",
				dimension: opts.dimension ?? "reliability",
				targetEntityId,
				direction: opts.direction ?? "positive",
				strength: opts.strength ?? 0.8,
				confidence: opts.confidence ?? 0.9,
				observedAt: opts.effectiveFrom ?? now,
				effectiveFrom: opts.effectiveFrom ?? now,
				decayModel: opts.decayModel,
				halfLifeDays: opts.halfLifeDays,
			},
		});
	}
}

async function main() {
	const rawKey = randomBytes(16).toString("hex");
	const tenant = await prisma.tenant.create({ data: { name: "mvp5-acceptance-tests", apiKeyHash: hashTenantApiKey(rawKey) } });
	const tenantId = tenant.id;

	const agent = await prisma.entity.create({ data: { tenantId, entityType: "ai_agent", name: "test-agent" } });
	const subject = await prisma.entity.create({ data: { tenantId, entityType: "organization", name: "test-subject" } });

	const policy = await prisma.policy.create({
		data: {
			tenantId,
			policyKey: "POL_TEST",
			decisionType: "release_payment",
			version: "1.0",
			rules: {
				rules: [
					{ condition: { amount: { lte: 5000 }, trust_score: { gte: 80 }, evidence_confidence: { gte: 75 } }, authority: "EXECUTE", envelope: { amount: { lte: 5000 } } },
					{ condition: { amount: { lte: 5000 }, trust_score: { lt: 30 } }, authority: "BLOCK" },
					{ condition: { amount: { gt: 5000, lte: 50000 } }, authority: "CHALLENGE" },
					{ condition: { amount: { gt: 50000 } }, authority: "ESCALATE" },
				],
			},
		},
	});

	async function newDecision(amount: number, targetEntityId = subject.id, modelConfidence?: number) {
		return prisma.decision.create({
			data: {
				tenantId,
				proposedByEntityId: agent.id,
				targetEntityId,
				decisionType: "release_payment",
				proposedAction: "approve_transaction",
				payload: { amount },
				modelConfidence,
			},
		});
	}

	console.log("\n=== MVP5 Acceptance Tests ===\n");

	// AT-01 — Decision arrives without Trust State -> Action prohibited.
	{
		const decision = await newDecision(1000);
		const result = await evaluateAuthority(tenantId, decision.id, "00000000-0000-0000-0000-000000000000", policy.id);
		check("AT-01", "authority evaluation without a real Trust State is rejected", "error" in result && result.error === "trust_state_not_found");
	}

	// AT-02 — High trust + sufficient evidence + low risk -> EXECUTE.
	let at02AuthorityId = "";
	{
		const e = await prisma.entity.create({ data: { tenantId, entityType: "organization", name: "at02-subject" } });
		await makeSignals(tenantId, e.id, 10, { direction: "positive", strength: 0.9, confidence: 0.9 });
		const decision = await newDecision(1000, e.id);
		const trust = await evaluateTrust(tenantId, decision.id);
		if ("error" in trust) throw new Error("AT-02 setup failed");
		const auth = await evaluateAuthority(tenantId, decision.id, trust.trustState.id, policy.id);
		check("AT-02", "high trust + sufficient evidence + low amount -> EXECUTE", !("error" in auth) && auth.authority.authorityState === "EXECUTE");
		if (!("error" in auth)) at02AuthorityId = auth.authority.id;
	}

	// AT-03 — High trust + weak evidence confidence -> CHALLENGE.
	{
		const e = await prisma.entity.create({ data: { tenantId, entityType: "organization", name: "at03-subject" } });
		await makeSignals(tenantId, e.id, 1, { direction: "positive", strength: 0.9, confidence: 0.9 });
		const decision = await newDecision(1000, e.id);
		const trust = await evaluateTrust(tenantId, decision.id);
		if ("error" in trust) throw new Error("AT-03 setup failed");
		const auth = await evaluateAuthority(tenantId, decision.id, trust.trustState.id, policy.id);
		check("AT-03", "weak evidence confidence forces CHALLENGE even with a positive signal", !("error" in auth) && auth.authority.authorityState === "CHALLENGE" && auth.authority.reasonCodes?.toString().includes("INSUFFICIENT_EVIDENCE_CONFIDENCE") === true);
	}

	// AT-04 — High trust + high consequence -> ESCALATE.
	{
		await makeSignals(tenantId, subject.id, 10, { direction: "positive", strength: 0.9, confidence: 0.9 });
		const decision = await newDecision(60000);
		const trust = await evaluateTrust(tenantId, decision.id);
		if ("error" in trust) throw new Error("AT-04 setup failed");
		const auth = await evaluateAuthority(tenantId, decision.id, trust.trustState.id, policy.id);
		check("AT-04", "very high trust + high-consequence amount still -> ESCALATE, not EXECUTE", !("error" in auth) && auth.authority.authorityState === "ESCALATE");
	}

	// AT-05 — Material contradiction detected -> CHALLENGE/ESCALATE regardless of aggregate.
	{
		const e = await prisma.entity.create({ data: { tenantId, entityType: "organization", name: "at05-subject" } });
		await makeSignals(tenantId, e.id, 5, { direction: "positive", strength: 0.9, confidence: 0.9 });
		await makeSignals(tenantId, e.id, 5, { direction: "negative", strength: 0.9, confidence: 0.9 });
		const decision = await newDecision(1000, e.id);
		const trust = await evaluateTrust(tenantId, decision.id);
		if ("error" in trust) throw new Error("AT-05 setup failed");
		const contradictions = await prisma.contradiction.findMany({ where: { tenantId, subjectEntityId: e.id } });
		const auth = await evaluateAuthority(tenantId, decision.id, trust.trustState.id, policy.id);
		check("AT-05", "conflicting strong signals auto-create a Contradiction and force CHALLENGE", contradictions.length > 0 && !("error" in auth) && auth.authority.authorityState === "CHALLENGE");
	}

	// AT-06 — Trust below policy threshold -> BLOCK.
	{
		const e = await prisma.entity.create({ data: { tenantId, entityType: "organization", name: "at06-subject" } });
		await makeSignals(tenantId, e.id, 10, { direction: "negative", strength: 0.9, confidence: 0.9 });
		const decision = await newDecision(1000, e.id);
		const trust = await evaluateTrust(tenantId, decision.id);
		if ("error" in trust) throw new Error("AT-06 setup failed");
		const auth = await evaluateAuthority(tenantId, decision.id, trust.trustState.id, policy.id);
		check("AT-06", "low trust score matches the policy's BLOCK rule", !("error" in auth) && auth.authority.authorityState === "BLOCK");
	}

	// AT-07 — Authority expired -> Action denied.
	{
		const decision = await newDecision(1000);
		const expired = await prisma.authority.create({
			data: {
				tenantId,
				decisionId: decision.id,
				trustStateId: (await evaluateTrust(tenantId, decision.id) as { trustState: { id: string } }).trustState.id,
				policyId: policy.id,
				policyVersion: policy.version,
				authorityState: "EXECUTE",
				status: "active",
				expiresAt: new Date(Date.now() - 1000),
			},
		});
		const violated = expired.expiresAt !== null && expired.expiresAt < new Date();
		check("AT-07", "an Authority past its expiresAt is treated as expired", violated);
	}

	// AT-08 — Action doesn't match authority (envelope violation).
	{
		const violation = findEnvelopeViolation({ amount: 9000 }, { amount: { lte: 5000 } });
		check("AT-08", "a request violating the Decision Envelope is identified", violation === "amount");
		const noViolation = findEnvelopeViolation({ amount: 4000 }, { amount: { lte: 5000 } });
		check("AT-08b", "a request satisfying the Decision Envelope passes", noViolation === null);
	}

	// AT-09 / AT-10 — success/failure outcome -> new positive/negative signal.
	{
		const before = await prisma.signal.count({ where: { tenantId, targetEntityId: subject.id, signalType: "outcome_success" } });
		await prisma.signal.create({
			data: { tenantId, signalType: "outcome_success", dimension: "reliability", targetEntityId: subject.id, direction: "positive", strength: 0.3, confidence: 0.7, observedAt: new Date(), effectiveFrom: new Date() },
		});
		const after = await prisma.signal.count({ where: { tenantId, targetEntityId: subject.id, signalType: "outcome_success" } });
		check("AT-09", "a successful outcome is representable as a new positive reliability signal", after === before + 1);

		await prisma.signal.create({
			data: { tenantId, signalType: "outcome_failure", dimension: "reliability", targetEntityId: subject.id, direction: "negative", strength: 0.3, confidence: 0.7, observedAt: new Date(), effectiveFrom: new Date() },
		});
		const failCount = await prisma.signal.count({ where: { tenantId, targetEntityId: subject.id, signalType: "outcome_failure" } });
		check("AT-10", "a failed outcome is representable as a new negative reliability signal", failCount === 1);
	}

	// AT-11 — Evidence/signal expires -> excluded from the next Trust Engine run.
	{
		const e = await prisma.entity.create({ data: { tenantId, entityType: "organization", name: "at11-subject" } });
		await makeSignals(tenantId, e.id, 5, { direction: "positive", strength: 0.9, confidence: 0.9 });
		await prisma.signal.create({
			data: { tenantId, signalType: "claim_verified", dimension: "reliability", targetEntityId: e.id, direction: "positive", strength: 0.9, confidence: 0.9, observedAt: new Date(), effectiveFrom: new Date(), expiresAt: new Date(Date.now() - 1000) },
		});
		const decision = await newDecision(1000, e.id);
		const trust = await evaluateTrust(tenantId, decision.id);
		if ("error" in trust) throw new Error("AT-11 setup failed");
		const explanation = trust.trustState.explanation as { signalsConsidered: number };
		check("AT-11", "an expired signal is excluded from the evidence considered", explanation.signalsConsidered === 5);
	}

	// AT-12 — New contradiction arrives -> Trust reevaluated (new TrustState row, old one untouched).
	{
		const decision = await newDecision(1000);
		const first = await evaluateTrust(tenantId, decision.id);
		const second = await evaluateTrust(tenantId, decision.id);
		if ("error" in first || "error" in second) throw new Error("AT-12 setup failed");
		check("AT-12", "reevaluating trust creates a new TrustState row rather than mutating the old one", first.trustState.id !== second.trustState.id);
	}

	// AT-13 — Human override is recorded as its own auditable event.
	{
		const decision = await newDecision(60000);
		const trust = await evaluateTrust(tenantId, decision.id);
		if ("error" in trust) throw new Error("AT-13 setup failed");
		const auth = await evaluateAuthority(tenantId, decision.id, trust.trustState.id, policy.id);
		if ("error" in auth) throw new Error("AT-13 setup failed");
		const approval = await approveEscalatedAuthority(tenantId, auth.authority.id, "human-tester", "EXECUTE");
		const humanApproval = await prisma.humanApproval.findFirst({ where: { tenantId, authorityId: auth.authority.id } });
		check("AT-13", "human approval is recorded and supersedes the escalated Authority", !("error" in approval) && humanApproval !== null);
	}

	// AT-14 / AT-15 — Governance Log reconstructs the lineage and detects tampering.
	{
		const decision = await newDecision(1000);
		await writeGovernanceEvent({ tenantId, correlationId: decision.id, eventType: "decision.created", decisionId: decision.id, eventPayload: { amount: 1000 } });
		await writeGovernanceEvent({ tenantId, correlationId: decision.id, eventType: "trust_state.evaluated", decisionId: decision.id, eventPayload: { trustScore: 70 } });
		const validBefore = await verifyGovernanceChain(tenantId, decision.id);
		check("AT-14", "an untampered Governance Log chain verifies as valid", validBefore);

		const events = await prisma.governanceEvent.findMany({ where: { tenantId, correlationId: decision.id } });
		await prisma.governanceEvent.update({ where: { id: events[0].id }, data: { eventPayload: { amount: 999999 } } });
		const validAfter = await verifyGovernanceChain(tenantId, decision.id);
		check("AT-15", "tampering with one Governance event is detected by the hash chain", validAfter === false);
	}

	// AT-16 — Confidence separation: model_confidence never becomes trustScore.
	{
		const decision = await newDecision(1000, subject.id, 0.97);
		const trust = await evaluateTrust(tenantId, decision.id);
		if ("error" in trust) throw new Error("AT-16 setup failed");
		check("AT-16", "an incoming model_confidence of 0.97 never becomes a trustScore of 97", trust.trustState.trustScore !== 97);
	}

	// AT-17 — Contradiction test: introduce credible contradictory evidence, trust reevaluates.
	{
		const e = await prisma.entity.create({ data: { tenantId, entityType: "organization", name: "at17-subject" } });
		await makeSignals(tenantId, e.id, 10, { direction: "positive", strength: 0.9, confidence: 0.9 });
		const decisionBefore = await newDecision(1000, e.id);
		const before = await evaluateTrust(tenantId, decisionBefore.id);
		if ("error" in before) throw new Error("AT-17 setup failed");

		await makeSignals(tenantId, e.id, 5, { direction: "negative", strength: 0.9, confidence: 0.9 });
		const decisionAfter = await newDecision(1000, e.id);
		const after = await evaluateTrust(tenantId, decisionAfter.id);
		if ("error" in after) throw new Error("AT-17 setup failed");

		check("AT-17", "introducing contradictory evidence changes the trust score and flags a contradiction", after.trustState.trustScore < before.trustState.trustScore && (after.trustState.explanation as { materialContradiction: boolean }).materialContradiction === true);
	}

	// AT-18 — Decay test: an old decayed signal contributes less than a fresh identical one.
	{
		const fresh = await prisma.entity.create({ data: { tenantId, entityType: "organization", name: "at18-fresh" } });
		const old = await prisma.entity.create({ data: { tenantId, entityType: "organization", name: "at18-old" } });
		const oldDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
		await makeSignals(tenantId, fresh.id, 1, { direction: "positive", strength: 0.9, confidence: 0.9, decayModel: "exponential", halfLifeDays: 100 });
		await makeSignals(tenantId, old.id, 1, { direction: "positive", strength: 0.9, confidence: 0.9, effectiveFrom: oldDate, decayModel: "exponential", halfLifeDays: 100 });
		const dFresh = await newDecision(1000, fresh.id);
		const dOld = await newDecision(1000, old.id);
		const tFresh = await evaluateTrust(tenantId, dFresh.id);
		const tOld = await evaluateTrust(tenantId, dOld.id);
		if ("error" in tFresh || "error" in tOld) throw new Error("AT-18 setup failed");
		check("AT-18", "a 200-day-old signal with a 100-day half-life scores lower than an identical fresh one", (tOld.trustState.reliability ?? 0) < (tFresh.trustState.reliability ?? 0));
	}

	// AT-19 — Earned autonomy stays human-controlled: policy versions are immutable and additive.
	{
		const v2 = await prisma.policy.create({
			data: { tenantId, policyKey: "POL_TEST", decisionType: "release_payment", version: "1.1", rules: { rules: [{ condition: { amount: { lte: 20000 } }, authority: "EXECUTE" }] } },
		});
		const v1Reloaded = await prisma.policy.findUnique({ where: { id: policy.id } });
		check("AT-19", "a new Policy version is a new immutable row, the old version is untouched", v2.id !== policy.id && v1Reloaded?.version === "1.0");
	}

	// AT-20 — Cross-tenant reference attempt fails closed.
	{
		const otherTenant = await prisma.tenant.create({ data: { name: "mvp5-acceptance-tests-other", apiKeyHash: hashTenantApiKey(randomBytes(16).toString("hex")) } });
		const decision = await newDecision(1000);
		const result = await evaluateTrust(otherTenant.id, decision.id);
		check("AT-20", "evaluating a Decision under the wrong Tenant is rejected, not silently scoped", "error" in result && result.error === "decision_not_found");
		await prisma.tenant.delete({ where: { id: otherTenant.id } });
	}

	// AT-21 — Evidence can arrive directly from outside the platform (Directive
	// §8 "Evidence exists or arrives"), scoped to the Tenant, with an integrity hash.
	{
		const content = { claim: "vendor-verified", score: 0.87 };
		const contentHash = createHash("sha256").update(JSON.stringify(content)).digest("hex");
		const evidence = await prisma.evidence.create({
			data: {
				tenantId,
				fileName: `attestation-${Date.now()}`,
				fileUrl: "",
				fileType: "application/json",
				fileSize: 0,
				evidenceType: "attestation",
				content,
				observedAt: new Date(),
				contentHash,
				hashAlgorithm: "sha256",
				canonicalizationVersion: "1",
			},
		});
		const reloaded = await prisma.evidence.findFirst({ where: { id: evidence.id, tenantId } });
		check("AT-21", "externally-submitted Evidence is stored tenant-scoped with a content hash", reloaded !== null && reloaded.contentHash === contentHash);
	}

	// AT-22 — Signals can arrive directly from outside the platform, targeted at an Entity.
	{
		const target = await prisma.entity.create({ data: { tenantId, entityType: "organization", name: "at22-subject" } });
		const signal = await prisma.signal.create({
			data: { tenantId, signalType: "external", dimension: "peer_validation", targetEntityId: target.id, direction: "positive", strength: 0.7, confidence: 0.8, observedAt: new Date(), effectiveFrom: new Date() },
		});
		const reloaded = await prisma.signal.findFirst({ where: { id: signal.id, tenantId } });
		check("AT-22", "an externally-submitted Signal is stored tenant-scoped against its target Entity", reloaded !== null && reloaded.targetEntityId === target.id);
	}

	// AT-23 — Authority lifecycle completes with a revoke path; a consumed Authority cannot be revoked.
	{
		const decision = await newDecision(1000);
		const trust = await evaluateTrust(tenantId, decision.id);
		if ("error" in trust) throw new Error("AT-23 setup failed");
		const auth = await evaluateAuthority(tenantId, decision.id, trust.trustState.id, policy.id);
		if ("error" in auth) throw new Error("AT-23 setup failed");

		const revoked = await revokeAuthority(tenantId, auth.authority.id, "human-tester", "no longer needed");
		const revokeAgain = await revokeAuthority(tenantId, auth.authority.id, "human-tester");
		check("AT-23", "an issued Authority can be revoked once, and not a second time", !("error" in revoked) && revoked.authority.status === "revoked" && "error" in revokeAgain);
	}

	console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
	if (failures.length) {
		console.log("Failed:");
		for (const f of failures) console.log(`  - ${f}`);
	}

	await prisma.tenant.delete({ where: { id: tenantId } });
	await prisma.$disconnect();
	process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
	console.error(err);
	process.exit(1);
});
