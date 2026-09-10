import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireTenant } from "../../middleware/tenantAuth";
import { invalidPayload, internalError } from "../../lib/validation";
import { withPrefix, stripPrefix, PREFIX } from "../../lib/aimMvp5/ids";
import { verifyGovernanceChain } from "../../lib/aimMvp5/governance";

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

// GET /api/decisions — recent decisions for this tenant, newest first.
router.get("/", async (req, res) => {
	try {
		const tenantId = req.tenantId as string;
		const decisions = await prisma.decision.findMany({
			where: { tenantId },
			orderBy: { createdAt: "desc" },
			take: 50,
		});
		return res.json(
			decisions.map((d) => ({
				decision_id: withPrefix(PREFIX.decision, d.id),
				decision_type: d.decisionType,
				proposed_action: d.proposedAction,
				status: d.status,
				payload: d.payload,
				created_at: d.createdAt,
			})),
		);
	} catch (err) {
		return internalError(res, err, "GET /api/decisions");
	}
});

// GET /api/decisions/:id — full lifecycle detail for one Decision: every
// TrustState ever computed for it, every Authority, every Action, every
// Outcome. Ordered oldest-first so the UI can render it as a history.
router.get("/:id", async (req, res) => {
	try {
		const tenantId = req.tenantId as string;
		const decisionId = stripPrefix(req.params.id);
		const decision = await prisma.decision.findFirst({ where: { id: decisionId, tenantId } });
		if (!decision) return res.status(404).json({ error: "decision_not_found" });

		const [trustStates, authorities, actions] = await Promise.all([
			prisma.trustState.findMany({ where: { tenantId, decisionId }, orderBy: { evaluatedAt: "asc" } }),
			prisma.authority.findMany({ where: { tenantId, decisionId }, orderBy: { createdAt: "asc" } }),
			prisma.action.findMany({ where: { tenantId, decisionId }, orderBy: { executedAt: "asc" } }),
		]);
		const actionIds = actions.map((a) => a.id);
		const outcomes = actionIds.length ? await prisma.outcome.findMany({ where: { tenantId, actionId: { in: actionIds } }, orderBy: { observedAt: "asc" } }) : [];

		return res.json({
			decision_id: withPrefix(PREFIX.decision, decision.id),
			decision_type: decision.decisionType,
			proposed_action: decision.proposedAction,
			proposed_by_entity_id: withPrefix(PREFIX.entity, decision.proposedByEntityId),
			target_entity_id: decision.targetEntityId ? withPrefix(PREFIX.entity, decision.targetEntityId) : null,
			status: decision.status,
			payload: decision.payload,
			created_at: decision.createdAt,
			trust_states: trustStates.map((t) => ({
				trust_state_id: withPrefix(PREFIX.trustState, t.id),
				trust_score: t.trustScore,
				trust_class: t.trustClass,
				evidence_confidence: t.evidenceConfidence,
				dimensions: { reliability: t.reliability, consistency: t.consistency, evidence_strength: t.evidenceStrength, peer_validation: t.peerValidation, contradiction: t.contradiction, decay: t.decay },
				explanation: t.explanation,
				evaluated_at: t.evaluatedAt,
			})),
			authorities: authorities.map((a) => ({
				authority_id: withPrefix(PREFIX.authority, a.id),
				authority_state: a.authorityState,
				status: a.status,
				reason_codes: a.reasonCodes,
				constraints: a.constraints,
				human_required: a.humanRequired,
				supersedes_authority_id: a.supersedesAuthorityId ? withPrefix(PREFIX.authority, a.supersedesAuthorityId) : null,
				policy_version: a.policyVersion,
				created_at: a.createdAt,
				expires_at: a.expiresAt,
			})),
			actions: actions.map((a) => ({
				action_id: withPrefix(PREFIX.action, a.id),
				authority_id: withPrefix(PREFIX.authority, a.authorityId),
				action_type: a.actionType,
				status: a.status,
				executed_at: a.executedAt,
			})),
			outcomes: outcomes.map((o) => ({
				outcome_id: withPrefix(PREFIX.outcome, o.id),
				action_id: withPrefix(PREFIX.action, o.actionId),
				outcome_type: o.outcomeType,
				success: o.success,
				observations: o.observations,
				observed_at: o.observedAt,
			})),
		});
	} catch (err) {
		return internalError(res, err, "GET /api/decisions/:id");
	}
});

// GET /api/decisions/:id/governance — the full Governance Log for one
// Decision's correlationId, plus whether the hash chain still verifies
// (AT-14 / AT-15). This is "Why?" and "Why not?" made inspectable.
router.get("/:id/governance", async (req, res) => {
	try {
		const tenantId = req.tenantId as string;
		const decisionId = stripPrefix(req.params.id);
		const decision = await prisma.decision.findFirst({ where: { id: decisionId, tenantId } });
		if (!decision) return res.status(404).json({ error: "decision_not_found" });

		const [events, chainValid] = await Promise.all([
			prisma.governanceEvent.findMany({ where: { tenantId, correlationId: decisionId }, orderBy: { createdAt: "asc" } }),
			verifyGovernanceChain(tenantId, decisionId),
		]);

		return res.json({
			decision_id: withPrefix(PREFIX.decision, decisionId),
			chain_valid: chainValid,
			events: events.map((e) => ({
				event_type: e.eventType,
				event_payload: e.eventPayload,
				rejected_alternatives: e.rejectedAlternatives,
				policy_version: e.policyVersion,
				human_actor_id: e.humanActorId,
				previous_hash: e.previousHash,
				event_hash: e.eventHash,
				created_at: e.createdAt,
			})),
		});
	} catch (err) {
		return internalError(res, err, "GET /api/decisions/:id/governance");
	}
});

export default router;
