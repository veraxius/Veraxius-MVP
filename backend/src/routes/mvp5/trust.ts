import { Router } from "express";
import { z } from "zod";
import { requireTenant } from "../../middleware/tenantAuth";
import { invalidPayload, internalError } from "../../lib/validation";
import { evaluateTrust } from "../../lib/aimMvp5/trustEngine";
import { stripPrefix, withPrefix, PREFIX } from "../../lib/aimMvp5/ids";

const router = Router();
router.use(requireTenant);

const EvaluateSchema = z.object({
	decision_id: z.string().min(1),
	context_id: z.string().min(1).optional(),
});

// POST /api/trust/evaluate (Architecture Alignment FINAL §C.1)
router.post("/evaluate", async (req, res) => {
	try {
		const parsed = EvaluateSchema.safeParse(req.body);
		if (!parsed.success) return invalidPayload(res);
		const tenantId = req.tenantId as string;

		const result = await evaluateTrust(tenantId, stripPrefix(parsed.data.decision_id));
		if ("error" in result) return res.status(404).json({ error: result.error });

		const ts = result.trustState;
		return res.status(200).json({
			trust_state_id: withPrefix(PREFIX.trustState, ts.id),
			decision_id: withPrefix(PREFIX.decision, ts.decisionId),
			trust: { score: ts.trustScore, class: ts.trustClass },
			evidence_confidence: ts.evidenceConfidence,
			dimensions: {
				reliability: ts.reliability,
				consistency: ts.consistency,
				evidence_strength: ts.evidenceStrength,
				peer_validation: ts.peerValidation,
				contradiction: ts.contradiction,
				decay: ts.decay,
			},
			flags: {
				material_contradiction: (ts.explanation as { materialContradiction?: boolean })?.materialContradiction ?? false,
				insufficient_evidence: ts.evidenceConfidence < 40,
			},
			valid_until: ts.validUntil,
			explanation: ts.explanation,
		});
	} catch (err) {
		return internalError(res, err, "POST /api/trust/evaluate");
	}
});

export default router;
