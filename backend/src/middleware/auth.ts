import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

declare module "express-serve-static-core" {
	interface Request {
		userId?: string;
	}
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
	try {
		const header = req.headers.authorization;
		if (!header?.startsWith("Bearer ")) {
			return res.status(401).json({ error: "Missing Authorization header" });
		}
		const token = header.slice("Bearer ".length);
		const secret = process.env.JWT_SECRET;
		if (!secret) return res.status(500).json({ error: "JWT secret not configured" });
		const payload = jwt.verify(token, secret) as any;
		req.userId = payload.sub as string;
		return next();
	} catch (err: any) {
		// eslint-disable-next-line no-console
		console.error("Auth middleware error:", err);
		return res.status(401).json({ error: "Invalid token" });
	}
}
