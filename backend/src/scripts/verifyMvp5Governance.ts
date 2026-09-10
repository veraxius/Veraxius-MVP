// Dev-only: prints the full Governance Log for one Decision and verifies its
// hash chain (proves AT-14 "audit requested -> full Trust Lineage" and AT-15
// "governance event modified -> integrity failure detected").
import { prisma } from "../config/prisma";
import { verifyGovernanceChain } from "../lib/aimMvp5/governance";

async function main() {
	const tenantId = process.argv[2];
	const decisionId = process.argv[3];
	if (!tenantId || !decisionId) {
		console.error("Usage: ts-node verifyMvp5Governance.ts <tenantId> <decisionId>");
		process.exit(1);
	}

	const events = await prisma.governanceEvent.findMany({
		where: { tenantId, correlationId: decisionId },
		orderBy: { createdAt: "asc" },
	});

	console.log(`\nGovernance Log for decision ${decisionId} (${events.length} events):\n`);
	for (const e of events) {
		console.log({
			eventType: e.eventType,
			trustStateId: e.trustStateId,
			authorityId: e.authorityId,
			actionId: e.actionId,
			outcomeId: e.outcomeId,
			policyVersion: e.policyVersion,
			rejectedAlternatives: e.rejectedAlternatives,
			previousHash: e.previousHash?.slice(0, 12) + "...",
			eventHash: e.eventHash.slice(0, 12) + "...",
			createdAt: e.createdAt,
		});
	}

	const valid = await verifyGovernanceChain(tenantId, decisionId);
	console.log(`\nHash chain valid: ${valid}`);

	await prisma.$disconnect();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
