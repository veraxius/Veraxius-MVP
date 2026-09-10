import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireTenant } from "../../middleware/tenantAuth";
import { invalidPayload, internalError } from "../../lib/validation";
import { withPrefix, stripPrefix, PREFIX } from "../../lib/aimMvp5/ids";

const router = Router();
router.use(requireTenant);

const CreateDecisionSchema = z.object({
	proposed_by_entity_id: z.string().min(1),
	target_entity_id: z.string().min(1).optional(),
	decision_type: z.string().min(1),
	proposed_action: z.string().min(1),
	model_confidence: z.number().min(0).max(1).optional(),
	context_id: z.string().min(1).optional(),
	risk_class: z.string().optional(),
	payload: z.record(z.any()),
	idempotency_key: z.string().min(1).max(255).optional(),
});

// POST /api/decisions — the formal pre-action object every governed decision
// must have (Directive §12). Nothing downstream (Trust Engine, Authority
// Gate) can run without a decision_id.
router.post("/", async (req, res) => {
	try {
		const parsed = CreateDecisionSchema.safeParse(req.body);
		if (!parsed.success) return invalidPayload(res);
		const tenantId = req.tenantId as string;
		const d = parsed.data;

		if (d.idempotency_key) {
			const existing = await prisma.decision.findUnique({ where: { idempotencyKey: d.idempotency_key } });
			if (existing && existing.tenantId === tenantId) {
				return res.status(200).json({ decision_id: withPrefix(PREFIX.decision, existing.id), status: existing.status, replayed: true });
			}
		}

		const decision = await prisma.decision.create({
			data: {
				tenantId,
				proposedByEntityId: stripPrefix(d.proposed_by_entity_id),
				targetEntityId: d.target_entity_id ? stripPrefix(d.target_entity_id) : undefined,
				decisionType: d.decision_type,
				proposedAction: d.proposed_action,
				modelConfidence: d.model_confidence,
				contextId: d.context_id ? stripPrefix(d.context_id) : undefined,
				riskClass: d.risk_class,
				payload: d.payload,
				idempotencyKey: d.idempotency_key,
			},
		});

		return res.status(201).json({ decision_id: withPrefix(PREFIX.decision, decision.id), status: decision.status });
	} catch (err) {
		return internalError(res, err, "POST /api/decisions");
	}
});

export default router;
