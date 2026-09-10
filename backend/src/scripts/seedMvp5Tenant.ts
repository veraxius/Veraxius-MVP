// One-off provisioning script for MVP5 — creates a test Tenant (with a raw
// API key printed once), a couple of Entities, and the reference Policy from
// the FINAL Architecture Alignment doc (§H). Not exposed as a public API on
// purpose: Tenant creation is the root of the isolation boundary and should
// never be self-serve over HTTP for MVP5.
//
// Usage: npx ts-node src/scripts/seedMvp5Tenant.ts
import { randomBytes } from "crypto";
import { prisma } from "../config/prisma";
import { hashTenantApiKey } from "../middleware/tenantAuth";

async function main() {
	const rawKey = randomBytes(24).toString("hex");
	const tenant = await prisma.tenant.create({
		data: {
			name: "AIM Guardian (dev)",
			apiKeyHash: hashTenantApiKey(rawKey),
			status: "active",
		},
	});

	const aiAgent = await prisma.entity.create({
		data: { tenantId: tenant.id, entityType: "ai_agent", name: "Guardian Agent" },
	});
	const subject = await prisma.entity.create({
		data: { tenantId: tenant.id, entityType: "organization", name: "Reference Subject" },
	});

	const policy = await prisma.policy.create({
		data: {
			tenantId: tenant.id,
			policyKey: "POL_PAYMENT_001",
			decisionType: "release_payment",
			version: "1.0",
			rules: {
				rules: [
					{ condition: { amount: { lte: 5000 }, trust_score: { gte: 80 }, evidence_confidence: { gte: 75 } }, authority: "EXECUTE" },
					{ condition: { amount: { gt: 5000, lte: 50000 } }, authority: "CHALLENGE" },
					{ condition: { amount: { gt: 50000 } }, authority: "ESCALATE" },
				],
			},
		},
	});

	console.log("Tenant created:");
	console.log({ tenantId: tenant.id, rawApiKey: rawKey });
	console.log("Entities:", { proposedByEntityId: aiAgent.id, targetEntityId: subject.id });
	console.log("Policy:", { policyId: policy.id, policyKey: policy.policyKey, version: policy.version });
	console.log("\nSave rawApiKey now — only the hash is stored.");

	await prisma.$disconnect();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
