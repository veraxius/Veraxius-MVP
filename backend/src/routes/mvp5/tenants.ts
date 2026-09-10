import { randomBytes } from "crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { hashTenantApiKey } from "../../middleware/tenantAuth";
import { invalidPayload, internalError } from "../../lib/validation";

const router = Router();

/**
 * POST /api/tenants — onboarding for a new organization, without needing
 * someone to run seedMvp5Tenant.ts by hand. Deliberately not public: Tenant
 * creation is the root of the multi-tenant isolation boundary (Correction
 * #3), so it's gated behind a platform admin key rather than open self-serve
 * — the org still doesn't need a script run on their behalf, but creating
 * one isn't something anyone with a URL can do.
 */
const CreateTenantSchema = z.object({
	name: z.string().min(1).max(200),
	metadata: z.record(z.any()).optional(),
});

router.post("/", async (req, res) => {
	try {
		const adminKey = process.env.MVP5_ADMIN_KEY;
		if (!adminKey) return res.status(500).json({ error: "mvp5_admin_key_not_configured" });

		const presented = req.headers["x-admin-key"];
		if (presented !== adminKey) return res.status(401).json({ error: "invalid_admin_key" });

		const parsed = CreateTenantSchema.safeParse(req.body);
		if (!parsed.success) return invalidPayload(res);

		const rawApiKey = randomBytes(24).toString("hex");
		const tenant = await prisma.tenant.create({
			data: {
				name: parsed.data.name,
				apiKeyHash: hashTenantApiKey(rawApiKey),
				metadata: parsed.data.metadata,
			},
		});

		return res.status(201).json({
			tenant_id: tenant.id,
			name: tenant.name,
			raw_api_key: rawApiKey,
			note: "Save raw_api_key now — only its hash is stored, it cannot be recovered.",
		});
	} catch (err) {
		return internalError(res, err, "POST /api/tenants");
	}
});

export default router;
