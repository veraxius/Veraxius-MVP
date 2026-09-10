import { createHash } from "crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireTenant } from "../../middleware/tenantAuth";
import { invalidPayload, internalError } from "../../lib/validation";
import { writeGovernanceEvent } from "../../lib/aimMvp5/governance";
import { TRUST_ENGINE_VERSION } from "../../lib/aimMvp5/trustEngine";
import { stripPrefix, withPrefix, PREFIX } from "../../lib/aimMvp5/ids";

const router = Router();
router.use(requireTenant);

const CreateOutcomeSchema = z.object({
	action_id: z.string().min(1),
	outcome_type: z.string().min(1),
	success: z.boolean(),
	observations: z.record(z.any()).optional(),
});

// POST /api/outcomes (Architecture Alignment FINAL §C.3, §D, §H.8–9).
// Closes the AIM loop: Outcome -> new Evidence + Signal -> the next
// Decision's Trust Engine run picks them up as a fresh TrustState (never an
// update to the old one — Correction #9).
router.post("/", async (req, res) => {
	try {
		const parsed = CreateOutcomeSchema.safeParse(req.body);
		if (!parsed.success) return invalidPayload(res);
		const tenantId = req.tenantId as string;
		const body = parsed.data;
		const actionId = stripPrefix(body.action_id);

		const action = await prisma.action.findFirst({ where: { id: actionId, tenantId } });
		if (!action) return res.status(404).json({ error: "action_not_found" });
		if (action.status !== "executed") return res.status(409).json({ error: "action_not_executed" });

		const decision = await prisma.decision.findFirst({ where: { id: action.decisionId, tenantId } });
		const subjectEntityId = decision?.targetEntityId ?? decision?.proposedByEntityId ?? null;

		const outcome = await prisma.outcome.create({
			data: {
				tenantId,
				actionId: action.id,
				outcomeType: body.outcome_type,
				success: body.success,
				observations: body.observations ?? undefined,
				status: "verified",
			},
		});

		let evidenceId: string | null = null;
		let signalId: string | null = null;

		if (subjectEntityId) {
			const now = new Date();
			const provenance = { source: "mvp5_outcome", actionId: action.id, outcomeId: outcome.id };
			const contentHash = createHash("sha256")
				.update(JSON.stringify({ outcomeId: outcome.id, outcomeType: body.outcome_type, success: body.success, observations: body.observations ?? {} }))
				.digest("hex");

			const evidence = await prisma.evidence.create({
				data: {
					uploadedBy: null, // machine-generated (Directive §8) — Evidence.uploadedBy is nullable for exactly this case
					fileName: `outcome-${outcome.id}`,
					fileUrl: "",
					fileType: "application/json",
					fileSize: 0,
					status: "validated",
					evidenceType: "outcome",
					provenance,
					observedAt: now,
					decisionId: action.decisionId,
					contentHash,
					hashAlgorithm: "sha256",
					canonicalizationVersion: "1",
				},
			});
			evidenceId = evidence.id;

			const signal = await prisma.signal.create({
				data: {
					tenantId,
					signalType: body.success ? "outcome_success" : "outcome_failure",
					dimension: "reliability",
					sourceOutcomeId: outcome.id,
					sourceEvidenceId: evidence.id,
					targetEntityId: subjectEntityId,
					targetDecisionId: action.decisionId,
					direction: body.success ? "positive" : "negative",
					strength: 0.3,
					confidence: 0.7,
					observedAt: now,
					effectiveFrom: now,
					operatorVersion: TRUST_ENGINE_VERSION,
					decayModel: "exponential",
					halfLifeDays: 180, // an outcome's relevance to trust roughly halves every ~6 months
				},
			});
			signalId = signal.id;

			await writeGovernanceEvent({
				tenantId,
				correlationId: action.decisionId,
				eventType: "signal.generated",
				entityId: subjectEntityId,
				decisionId: action.decisionId,
				actionId: action.id,
				outcomeId: outcome.id,
				evidenceIds: [evidence.id],
				signalIds: [signal.id],
				eventPayload: { signalType: signal.signalType, direction: signal.direction },
			});
		}

		await writeGovernanceEvent({
			tenantId,
			correlationId: action.decisionId,
			eventType: "outcome.recorded",
			decisionId: action.decisionId,
			actionId: action.id,
			outcomeId: outcome.id,
			eventPayload: { outcomeType: body.outcome_type, success: body.success },
		});

		return res.status(201).json({
			outcome_id: withPrefix(PREFIX.outcome, outcome.id),
			evidence_id: evidenceId ? withPrefix(PREFIX.evidence, evidenceId) : null,
			signal_id: signalId ? withPrefix(PREFIX.signal, signalId) : null,
		});
	} catch (err) {
		return internalError(res, err, "POST /api/outcomes");
	}
});

export default router;
