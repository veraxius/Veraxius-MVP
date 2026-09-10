import { createHash } from "crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireTenant } from "../../middleware/tenantAuth";
import { invalidPayload, internalError } from "../../lib/validation";
import { writeGovernanceEvent } from "../../lib/aimMvp5/governance";
import { findEnvelopeViolation } from "../../lib/aimMvp5/authorityGate";
import { stripPrefix, withPrefix, PREFIX } from "../../lib/aimMvp5/ids";

const router = Router();
router.use(requireTenant);

const CreateActionSchema = z.object({
	decision_id: z.string().min(1),
	authority_id: z.string().min(1),
	action_type: z.string().min(1),
	payload: z.record(z.any()).default({}),
	idempotency_key: z.string().min(1).max(255),
});

function canonicalHash(payload: unknown): string {
	return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

// POST /api/actions (Architecture Alignment FINAL §C.3, §F).
// Only a valid, ACTIVE Authority may initiate a consequential action.
// Correction #5: idempotency + atomic Authority consumption live here.
router.post("/", async (req, res) => {
	try {
		const parsed = CreateActionSchema.safeParse(req.body);
		if (!parsed.success) return invalidPayload(res);
		const tenantId = req.tenantId as string;
		const body = parsed.data;
		const decisionId = stripPrefix(body.decision_id);
		const authorityId = stripPrefix(body.authority_id);
		const payloadHash = canonicalHash(body.payload);

		// 1. Idempotent replay — a retried request with the same key returns the
		// original result, never re-validates or re-consumes anything.
		const existingAction = await prisma.action.findUnique({ where: { idempotencyKey: body.idempotency_key } });
		if (existingAction && existingAction.tenantId === tenantId) {
			return res.status(200).json({
				action_id: withPrefix(PREFIX.action, existingAction.id),
				status: existingAction.status,
				replayed: true,
			});
		}

		// 2. Read-only validation (§F checks 1–3, 7) before touching Authority state.
		const authority = await prisma.authority.findFirst({ where: { id: authorityId, tenantId } });
		if (!authority) return res.status(404).json({ error: "authority_not_found" });
		if (authority.decisionId !== decisionId) return res.status(400).json({ error: "authority_decision_mismatch" });

		const deny = async (reasonCode: string) => {
			await writeGovernanceEvent({
				tenantId,
				correlationId: decisionId,
				eventType: "action.denied",
				decisionId,
				authorityId: authority.id,
				eventPayload: { reasonCode, actionType: body.action_type },
			});
			return res.status(403).json({ error: "authority_denied", reason: reasonCode });
		};

		if (!["EXECUTE", "CONSTRAIN"].includes(authority.authorityState)) return deny("AUTHORITY_STATE_NOT_EXECUTABLE");
		if (authority.status !== "active") return deny("AUTHORITY_NOT_ACTIVE");
		if (authority.expiresAt && authority.expiresAt < new Date()) return deny("AUTHORITY_EXPIRED");
		const prohibited = (authority.prohibitedActions as string[] | null) ?? [];
		if (prohibited.includes(body.action_type)) return deny("ACTION_TYPE_PROHIBITED");
		const permitted = authority.permittedActions as string[] | null;
		if (permitted && permitted.length > 0 && !permitted.includes(body.action_type)) return deny("ACTION_TYPE_NOT_PERMITTED");
		const violatedKey = findEnvelopeViolation(body.payload, (authority.constraints as Record<string, unknown> | null) ?? null);
		if (violatedKey) return deny(`ENVELOPE_VIOLATION:${violatedKey}`);

		// 3. Atomic validate → consume → execute (§F). The conditional update is
		// the compare-and-swap: only the request that flips ACTIVE -> CONSUMED
		// (count === 1) proceeds. A simultaneous racer always loses cleanly.
		const action = await prisma.$transaction(async (tx) => {
			const consumed = await tx.authority.updateMany({
				where: { id: authority.id, tenantId, status: "active" },
				data: { status: "consumed" },
			});
			if (consumed.count !== 1) {
				throw new Error("AUTHORITY_ALREADY_CONSUMED");
			}
			return tx.action.create({
				data: {
					tenantId,
					decisionId,
					authorityId: authority.id,
					idempotencyKey: body.idempotency_key,
					payloadHash,
					actionType: body.action_type,
					payload: body.payload,
					status: "executed",
					executedAt: new Date(),
				},
			});
		});

		await prisma.decision.update({ where: { id: decisionId }, data: { status: "executed" } });

		await writeGovernanceEvent({
			tenantId,
			correlationId: decisionId,
			eventType: "action.executed",
			decisionId,
			authorityId: authority.id,
			actionId: action.id,
			eventPayload: { actionType: body.action_type, payloadHash },
		});

		return res.status(201).json({
			action_id: withPrefix(PREFIX.action, action.id),
			status: action.status,
			executed_at: action.executedAt,
		});
	} catch (err) {
		if (err instanceof Error && err.message === "AUTHORITY_ALREADY_CONSUMED") {
			return res.status(409).json({ error: "authority_denied", reason: "AUTHORITY_ALREADY_CONSUMED" });
		}
		return internalError(res, err, "POST /api/actions");
	}
});

export default router;
