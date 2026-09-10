import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireTenant } from "../../middleware/tenantAuth";
import { signOperatorToken } from "../../middleware/tenantOperatorAuth";
import { invalidPayload, internalError, zEmail, zPassword } from "../../lib/validation";

const router = Router();
router.use(requireTenant);

/**
 * POST /api/tenant-operators — a Tenant registers one of its own real human
 * operators. Requires the Tenant API key: self-serve for the organization
 * (no manual script needed per operator), but every operator is scoped to
 * exactly this Tenant and can never authenticate as another's.
 */
const RegisterSchema = z.object({
	email: zEmail,
	password: zPassword,
	name: z.string().max(200).optional(),
});

router.post("/", async (req, res) => {
	try {
		const parsed = RegisterSchema.safeParse(req.body);
		if (!parsed.success) return invalidPayload(res);
		const tenantId = req.tenantId as string;
		const { email, password, name } = parsed.data;

		const existing = await prisma.tenantOperator.findUnique({ where: { tenantId_email: { tenantId, email } } });
		if (existing) return res.status(409).json({ error: "operator_already_exists" });

		const passwordHash = await bcrypt.hash(password, 10);
		const operator = await prisma.tenantOperator.create({ data: { tenantId, email, passwordHash, name } });

		return res.status(201).json({ operator_id: operator.id, email: operator.email });
	} catch (err) {
		return internalError(res, err, "POST /api/tenant-operators");
	}
});

const LoginSchema = z.object({
	email: zEmail,
	password: zPassword,
});

// POST /api/tenant-operators/login — exchanges an operator's own credentials
// for a short-lived operator token, presented as X-Operator-Token on
// POST /api/authority/:id/approve and /:id/revoke. This is what human_actor_id
// used to be: a client-supplied string. Now it's a verified identity.
router.post("/login", async (req, res) => {
	try {
		const parsed = LoginSchema.safeParse(req.body);
		if (!parsed.success) return invalidPayload(res);
		const tenantId = req.tenantId as string;
		const { email, password } = parsed.data;

		const operator = await prisma.tenantOperator.findUnique({ where: { tenantId_email: { tenantId, email } } });
		if (!operator || operator.status !== "active") return res.status(401).json({ error: "invalid_credentials" });

		const valid = await bcrypt.compare(password, operator.passwordHash);
		if (!valid) return res.status(401).json({ error: "invalid_credentials" });

		await prisma.tenantOperator.update({ where: { id: operator.id }, data: { lastLoginAt: new Date() } });

		const operatorToken = signOperatorToken(tenantId, operator.id, operator.email);
		return res.status(200).json({ operator_token: operatorToken, operator_id: operator.id, email: operator.email, expires_in: "12h" });
	} catch (err) {
		return internalError(res, err, "POST /api/tenant-operators/login");
	}
});

export default router;
