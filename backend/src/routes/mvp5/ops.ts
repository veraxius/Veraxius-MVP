import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireTenant } from "../../middleware/tenantAuth";
import { internalError } from "../../lib/validation";
import { withPrefix, PREFIX } from "../../lib/aimMvp5/ids";

const router = Router();
router.use(requireTenant);

const STALE_ESCALATION_HOURS = 24;

/**
 * GET /api/ops/alerts — a pull-based operational view for a real pilot,
 * since no alerting channel (email/Slack) is wired up yet. Surfaces the
 * three things that silently rot in a governed system if nobody's looking:
 * escalations nobody reviewed, Authorities that expired unused, and
 * Contradictions still open. Meant to be polled by a human or a cron script
 * (see scripts/mvp5_ops_check.ts), not by an end user.
 */
router.get("/alerts", async (req, res) => {
	try {
		const tenantId = req.tenantId as string;
		const now = new Date();
		const staleCutoff = new Date(now.getTime() - STALE_ESCALATION_HOURS * 60 * 60 * 1000);

		const [staleEscalations, expiredUnconsumed, openContradictions] = await Promise.all([
			prisma.authority.findMany({
				where: { tenantId, authorityState: "ESCALATE", status: "issued", createdAt: { lt: staleCutoff } },
				orderBy: { createdAt: "asc" },
			}),
			prisma.authority.findMany({
				where: { tenantId, status: { in: ["issued", "active"] }, expiresAt: { lt: now } },
				orderBy: { expiresAt: "asc" },
			}),
			prisma.contradiction.findMany({
				where: { tenantId, status: { in: ["detected", "unresolved", "challenged"] } },
				orderBy: { detectedAt: "asc" },
			}),
		]);

		return res.json({
			generated_at: now,
			stale_escalation_threshold_hours: STALE_ESCALATION_HOURS,
			alerts: {
				stale_escalations: staleEscalations.map((a) => ({
					authority_id: withPrefix(PREFIX.authority, a.id),
					decision_id: withPrefix(PREFIX.decision, a.decisionId),
					created_at: a.createdAt,
					hours_pending: Math.round((now.getTime() - a.createdAt.getTime()) / (60 * 60 * 1000)),
				})),
				expired_unconsumed_authorities: expiredUnconsumed.map((a) => ({
					authority_id: withPrefix(PREFIX.authority, a.id),
					decision_id: withPrefix(PREFIX.decision, a.decisionId),
					authority_state: a.authorityState,
					expired_at: a.expiresAt,
				})),
				open_contradictions: openContradictions.map((c) => ({
					contradiction_id: withPrefix(PREFIX.contradiction, c.id),
					subject_entity_id: withPrefix(PREFIX.entity, c.subjectEntityId),
					severity: c.severity,
					status: c.status,
					detected_at: c.detectedAt,
				})),
			},
			counts: {
				stale_escalations: staleEscalations.length,
				expired_unconsumed_authorities: expiredUnconsumed.length,
				open_contradictions: openContradictions.length,
			},
		});
	} catch (err) {
		return internalError(res, err, "GET /api/ops/alerts");
	}
});

export default router;
