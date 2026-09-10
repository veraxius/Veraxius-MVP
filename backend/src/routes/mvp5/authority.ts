import { Router } from "express";
import { z } from "zod";
import { requireTenant } from "../../middleware/tenantAuth";
import { invalidPayload, internalError } from "../../lib/validation";
import { evaluateAuthority, approveEscalatedAuthority, revokeAuthority } from "../../lib/aimMvp5/authorityGate";
import { stripPrefix, withPrefix, PREFIX } from "../../lib/aimMvp5/ids";

const router = Router();
router.use(requireTenant);

const EvaluateSchema = z.object({
	decision_id: z.string().min(1),
	trust_state_id: z.string().min(1),
	policy_id: z.string().min(1),
});

// POST /api/authority/evaluate (Architecture Alignment FINAL §C.2)
router.post("/evaluate", async (req, res) => {
	try {
		const parsed = EvaluateSchema.safeParse(req.body);
		if (!parsed.success) return invalidPayload(res);
		const tenantId = req.tenantId as string;
		const { decision_id, trust_state_id, policy_id } = parsed.data;

		const result = await evaluateAuthority(
			tenantId,
			stripPrefix(decision_id),
			stripPrefix(trust_state_id),
			stripPrefix(policy_id),
		);
		if ("error" in result) return res.status(404).json({ error: result.error });

		const a = result.authority;
		return res.status(200).json({
			authority_id: withPrefix(PREFIX.authority, a.id),
			authority: a.authorityState,
			reason_codes: a.reasonCodes,
			constraints: a.constraints,
			status: a.status,
			required_next_step: a.humanRequired ? { type: "human_review" } : null,
			rejected_alternatives: result.rejectedAlternatives,
		});
	} catch (err) {
		return internalError(res, err, "POST /api/authority/evaluate");
	}
});

const ApproveSchema = z.object({
	human_actor_id: z.string().min(1),
	grant: z.enum(["EXECUTE", "CONSTRAIN", "BLOCK"]),
	scope: z.record(z.any()).optional(),
	reason: z.string().max(2000).optional(),
});

// POST /api/authority/:id/approve — Correction #4. Formally resolves an
// ESCALATE'd Authority via a HumanApproval + a new superseding Authority.
// Never mutates the original row's authorityState.
router.post("/:id/approve", async (req, res) => {
	try {
		const parsed = ApproveSchema.safeParse(req.body);
		if (!parsed.success) return invalidPayload(res);
		const tenantId = req.tenantId as string;
		const authorityId = stripPrefix(req.params.id);

		const result = await approveEscalatedAuthority(
			tenantId,
			authorityId,
			parsed.data.human_actor_id,
			parsed.data.grant,
			parsed.data.scope,
			parsed.data.reason,
		);
		if ("error" in result) return res.status(409).json({ error: result.error });

		const a = result.authority;
		return res.status(200).json({
			authority_id: withPrefix(PREFIX.authority, a.id),
			authority: a.authorityState,
			status: a.status,
			supersedes_authority_id: withPrefix(PREFIX.authority, authorityId),
		});
	} catch (err) {
		return internalError(res, err, "POST /api/authority/:id/approve");
	}
});

const RevokeSchema = z.object({
	human_actor_id: z.string().min(1),
	reason: z.string().max(2000).optional(),
});

// POST /api/authority/:id/revoke — completes the ISSUED→ACTIVE→CONSUMED/
// EXPIRED/REVOKED lifecycle. Only an Authority not yet consumed by an
// Action can be revoked.
router.post("/:id/revoke", async (req, res) => {
	try {
		const parsed = RevokeSchema.safeParse(req.body);
		if (!parsed.success) return invalidPayload(res);
		const tenantId = req.tenantId as string;
		const authorityId = stripPrefix(req.params.id);

		const result = await revokeAuthority(tenantId, authorityId, parsed.data.human_actor_id, parsed.data.reason);
		if ("error" in result) return res.status(409).json({ error: result.error });

		const a = result.authority;
		return res.status(200).json({
			authority_id: withPrefix(PREFIX.authority, a.id),
			status: a.status,
		});
	} catch (err) {
		return internalError(res, err, "POST /api/authority/:id/revoke");
	}
});

export default router;
