// MVP5 operational check — no alerting channel (email/Slack) is configured
// yet, so this is the pull-based substitute: run it by hand or on a cron
// (e.g. every 15 min) against every Tenant and it prints a non-zero exit
// if anything needs a human's attention. Mirrors the other one-off scripts
// in this folder (seedMvp5Tenant, mvp5_acceptance_tests) — no new infra.
//
// Usage: npx ts-node src/scripts/mvp5_ops_check.ts
import { prisma } from "../config/prisma";

const STALE_ESCALATION_HOURS = 24;

async function main() {
	const tenants = await prisma.tenant.findMany({ where: { status: "active" } });
	const now = new Date();
	const staleCutoff = new Date(now.getTime() - STALE_ESCALATION_HOURS * 60 * 60 * 1000);

	let totalAlerts = 0;

	for (const tenant of tenants) {
		const [staleEscalations, expiredUnconsumed, openContradictions] = await Promise.all([
			prisma.authority.count({
				where: { tenantId: tenant.id, authorityState: "ESCALATE", status: "issued", createdAt: { lt: staleCutoff } },
			}),
			prisma.authority.count({
				where: { tenantId: tenant.id, status: { in: ["issued", "active"] }, expiresAt: { lt: now } },
			}),
			prisma.contradiction.count({
				where: { tenantId: tenant.id, status: { in: ["detected", "unresolved", "challenged"] } },
			}),
		]);

		const alertCount = staleEscalations + expiredUnconsumed + openContradictions;
		if (alertCount === 0) continue;

		totalAlerts += alertCount;
		console.log(`\nTenant ${tenant.name} (${tenant.id})`);
		if (staleEscalations) console.log(`  ALERT  ${staleEscalations} escalation(s) pending human review for over ${STALE_ESCALATION_HOURS}h`);
		if (expiredUnconsumed) console.log(`  WARN   ${expiredUnconsumed} Authority(ies) expired without ever being consumed`);
		if (openContradictions) console.log(`  WARN   ${openContradictions} Contradiction(s) still open`);
	}

	if (totalAlerts === 0) {
		console.log("No alerts across any Tenant.");
	} else {
		console.log(`\n=== ${totalAlerts} total alert(s) across ${tenants.length} tenant(s) ===`);
	}

	await prisma.$disconnect();
	process.exit(totalAlerts > 0 ? 1 : 0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
