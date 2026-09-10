import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireTenant } from "../../middleware/tenantAuth";
import { invalidPayload, internalError } from "../../lib/validation";
import { withPrefix, stripPrefix, PREFIX } from "../../lib/aimMvp5/ids";

const router = Router();
router.use(requireTenant);

/**
 * POST /api/signals — lets an external system contribute a Signal directly
 * (e.g. a peer-validation result, a third-party reliability check) instead
 * of one only being derivable from Evidence inside the platform. Mirrors
 * the same "arrives from outside" gap closed for Evidence.
 */
const CreateSignalSchema = z.object({
	dimension: z.enum(["reliability", "consistency", "peer_validation", "contradiction", "decay"]),
	direction: z.enum(["positive", "negative", "neutral"]),
	strength: z.number().min(0).max(1),
	confidence: z.number().min(0).max(1),
	source_entity_id: z.string().min(1).optional(),
	source_evidence_id: z.string().min(1).optional(),
	target_entity_id: z.string().min(1).optional(),
	target_claim_id: z.string().min(1).optional(),
	target_decision_id: z.string().min(1).optional(),
	observed_at: z.string().datetime().optional(),
	effective_from: z.string().datetime().optional(),
	expires_at: z.string().datetime().optional(),
	decay_model: z.enum(["exponential"]).optional(),
	half_life_days: z.number().positive().optional(),
	metadata: z.record(z.any()).optional(),
});

router.post("/", async (req, res) => {
	try {
		const parsed = CreateSignalSchema.safeParse(req.body);
		if (!parsed.success) return invalidPayload(res);
		const tenantId = req.tenantId as string;
		const d = parsed.data;

		if (!d.target_entity_id && !d.target_claim_id && !d.target_decision_id) {
			return res.status(400).json({ error: "signal_requires_a_target" });
		}
		if (d.decay_model && !d.half_life_days) {
			return res.status(400).json({ error: "half_life_days_required_with_decay_model" });
		}

		const now = new Date();
		const signal = await prisma.signal.create({
			data: {
				tenantId,
				signalType: "external",
				dimension: d.dimension,
				direction: d.direction,
				strength: d.strength,
				confidence: d.confidence,
				sourceEntityId: d.source_entity_id ? stripPrefix(d.source_entity_id) : undefined,
				sourceEvidenceId: d.source_evidence_id ? stripPrefix(d.source_evidence_id) : undefined,
				targetEntityId: d.target_entity_id ? stripPrefix(d.target_entity_id) : undefined,
				targetClaimId: d.target_claim_id ? stripPrefix(d.target_claim_id) : undefined,
				targetDecisionId: d.target_decision_id ? stripPrefix(d.target_decision_id) : undefined,
				observedAt: d.observed_at ? new Date(d.observed_at) : now,
				effectiveFrom: d.effective_from ? new Date(d.effective_from) : now,
				expiresAt: d.expires_at ? new Date(d.expires_at) : undefined,
				decayModel: d.decay_model,
				halfLifeDays: d.half_life_days,
				metadata: d.metadata,
			},
		});

		return res.status(201).json({ signal_id: withPrefix(PREFIX.signal, signal.id) });
	} catch (err) {
		return internalError(res, err, "POST /api/signals");
	}
});

router.get("/", async (req, res) => {
	try {
		const tenantId = req.tenantId as string;
		const signals = await prisma.signal.findMany({ where: { tenantId }, orderBy: { observedAt: "desc" }, take: 100 });
		return res.json(
			signals.map((s) => ({
				signal_id: withPrefix(PREFIX.signal, s.id),
				dimension: s.dimension,
				direction: s.direction,
				strength: s.strength,
				confidence: s.confidence,
				target_entity_id: s.targetEntityId ? withPrefix(PREFIX.entity, s.targetEntityId) : null,
				observed_at: s.observedAt,
			})),
		);
	} catch (err) {
		return internalError(res, err, "GET /api/signals");
	}
});

export default router;
