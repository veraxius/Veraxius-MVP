import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

declare module "express-serve-static-core" {
	interface Request {
		operatorId?: string;
		operatorEmail?: string;
	}
}

const OPERATOR_TOKEN_TYPE = "mvp5_operator";
const OPERATOR_TOKEN_EXPIRY = "12h";

export function signOperatorToken(tenantId: string, operatorId: string, email: string): string {
	const secret = process.env.JWT_SECRET!;
	return jwt.sign({ sub: operatorId, tenantId, email, type: OPERATOR_TOKEN_TYPE }, secret, {
		expiresIn: OPERATOR_TOKEN_EXPIRY,
	});
}

/**
 * Closes the "human_actor_id is free text" gap: approving or revoking an
 * Authority now requires a real, authenticated Tenant Operator, not a
 * client-supplied string. Runs AFTER requireTenant, so req.tenantId is
 * already set — the token's tenantId must match it, or a Tenant could use
 * a stolen operator token from a different org.
 */
export function requireTenantOperator(req: Request, res: Response, next: NextFunction) {
	try {
		const header = req.headers["x-operator-token"];
		const token = Array.isArray(header) ? header[0] : header;
		if (!token) return res.status(401).json({ error: "missing_operator_token" });

		const secret = process.env.JWT_SECRET;
		if (!secret) return res.status(500).json({ error: "jwt_secret_not_configured" });

		const payload = jwt.verify(token, secret) as { sub?: string; tenantId?: string; email?: string; type?: string };
		if (payload.type !== OPERATOR_TOKEN_TYPE || !payload.sub || !payload.email) {
			return res.status(401).json({ error: "invalid_operator_token" });
		}
		if (payload.tenantId !== req.tenantId) {
			return res.status(403).json({ error: "operator_tenant_mismatch" });
		}

		req.operatorId = payload.sub;
		req.operatorEmail = payload.email;
		return next();
	} catch {
		return res.status(401).json({ error: "invalid_operator_token" });
	}
}
