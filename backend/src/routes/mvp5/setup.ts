import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireTenant } from "../../middleware/tenantAuth";
import { invalidPayload, internalError } from "../../lib/validation";
import { withPrefix, PREFIX } from "../../lib/aimMvp5/ids";

const router = Router();
router.use(requireTenant);

// POST /api/entities — a Tenant provisions the actors (AI agents, partner
// orgs, devices, or its own members) that can propose or be the subject of a
// Decision. Entity.linkedUserId is intentionally NOT settable here — linking
// an Entity to an existing Veraxius member is an internal operation, never
// something an external tenant can claim over the API.
const CreateEntitySchema = z.object({
	entity_type: z.enum(["member", "ai_agent", "organization", "device", "system"]),
	external_ref: z.string().max(255).optional(),
	name: z.string().max(255).optional(),
	metadata: z.record(z.any()).optional(),
});

router.get("/entities", async (req, res) => {
	try {
		const tenantId = req.tenantId as string;
		const entities = await prisma.entity.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 100 });
		return res.json(entities.map((e) => ({ entity_id: withPrefix(PREFIX.entity, e.id), entity_type: e.entityType, name: e.name, status: e.status })));
	} catch (err) {
		return internalError(res, err, "GET /api/entities");
	}
});

router.post("/entities", async (req, res) => {
	try {
		const parsed = CreateEntitySchema.safeParse(req.body);
		if (!parsed.success) return invalidPayload(res);
		const tenantId = req.tenantId as string;
		const entity = await prisma.entity.create({
			data: {
				tenantId,
				entityType: parsed.data.entity_type,
				externalRef: parsed.data.external_ref,
				name: parsed.data.name,
				metadata: parsed.data.metadata,
			},
		});
		return res.status(201).json({ entity_id: withPrefix(PREFIX.entity, entity.id), status: entity.status });
	} catch (err) {
		return internalError(res, err, "POST /api/entities");
	}
});

// POST /api/contexts — the decision/use-case context (Directive §3's Context
// object): what kind of situation this Decision is being evaluated inside.
const CreateContextSchema = z.object({
	context_type: z.string().min(1).max(100),
	risk_class: z.string().max(50).optional(),
	metadata: z.record(z.any()).optional(),
});

router.post("/contexts", async (req, res) => {
	try {
		const parsed = CreateContextSchema.safeParse(req.body);
		if (!parsed.success) return invalidPayload(res);
		const tenantId = req.tenantId as string;
		const context = await prisma.context.create({
			data: {
				tenantId,
				contextType: parsed.data.context_type,
				riskClass: parsed.data.risk_class,
				metadata: parsed.data.metadata,
			},
		});
		return res.status(201).json({ context_id: withPrefix(PREFIX.context, context.id) });
	} catch (err) {
		return internalError(res, err, "POST /api/contexts");
	}
});

// POST /api/policies — Correction #6: immutable per version. Creating with a
// (policy_key, version) pair that already exists is always rejected (409),
// even if the rules are byte-identical — bump the version instead. This is
// what lets Authority.policyVersion answer "what exact policy authorized
// this?" forever, regardless of what the policy looks like today.
const RuleConditionSchema = z.record(
	z.object({
		lte: z.number().optional(),
		gte: z.number().optional(),
		lt: z.number().optional(),
		gt: z.number().optional(),
		eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
		in: z.array(z.union([z.string(), z.number()])).optional(),
		not_in: z.array(z.union([z.string(), z.number()])).optional(),
	}),
);

const CreatePolicySchema = z.object({
	policy_key: z.string().min(1).max(255),
	decision_type: z.string().min(1).max(100),
	version: z.string().min(1).max(50),
	rules: z.array(
		z.object({
			condition: RuleConditionSchema,
			authority: z.enum(["EXECUTE", "CONSTRAIN", "CHALLENGE", "ESCALATE", "BLOCK"]),
			envelope: z.record(z.any()).optional(),
		}),
	),
});

router.get("/policies", async (req, res) => {
	try {
		const tenantId = req.tenantId as string;
		const policies = await prisma.policy.findMany({ where: { tenantId, status: "active" }, orderBy: { createdAt: "desc" }, take: 100 });
		return res.json(policies.map((p) => ({ policy_id: withPrefix(PREFIX.policy, p.id), policy_key: p.policyKey, version: p.version, decision_type: p.decisionType })));
	} catch (err) {
		return internalError(res, err, "GET /api/policies");
	}
});

router.post("/policies", async (req, res) => {
	try {
		const parsed = CreatePolicySchema.safeParse(req.body);
		if (!parsed.success) return invalidPayload(res);
		const tenantId = req.tenantId as string;
		const p = parsed.data;

		const policy = await prisma.policy.create({
			data: {
				tenantId,
				policyKey: p.policy_key,
				decisionType: p.decision_type,
				version: p.version,
				rules: { rules: p.rules },
			},
		});
		return res.status(201).json({ policy_id: withPrefix(PREFIX.policy, policy.id), policy_key: policy.policyKey, version: policy.version });
	} catch (err) {
		if (err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002") {
			return res.status(409).json({ error: "policy_version_already_exists" });
		}
		return internalError(res, err, "POST /api/policies");
	}
});

export default router;
