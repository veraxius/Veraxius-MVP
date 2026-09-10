import { createHash } from "crypto";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";

declare module "express-serve-static-core" {
	interface Request {
		tenantId?: string;
	}
}

export function hashTenantApiKey(rawKey: string): string {
	return createHash("sha256").update(rawKey).digest("hex");
}

// MVP5 Correction #3 — tenant isolation enforced from day one. Every request
// against /api/trust, /api/authority, /api/actions, /api/outcomes authenticates
// as exactly one Tenant; req.tenantId is the only scope every MVP5 query uses.
export async function requireTenant(req: Request, res: Response, next: NextFunction) {
	try {
		const header = req.headers.authorization;
		if (!header?.startsWith("Bearer ")) {
			return res.status(401).json({ error: "Missing Authorization header" });
		}
		const rawKey = header.slice("Bearer ".length);
		const apiKeyHash = hashTenantApiKey(rawKey);

		const tenant = await prisma.tenant.findUnique({ where: { apiKeyHash } });
		if (!tenant || tenant.status !== "active") {
			return res.status(401).json({ error: "Invalid tenant API key" });
		}

		req.tenantId = tenant.id;
		return next();
	} catch (err) {
		console.error("Tenant auth middleware error:", err);
		return res.status(401).json({ error: "Invalid tenant API key" });
	}
}
