import { Request, Response, NextFunction } from "express";
import { verifyCronSecret } from "../lib/cronSecret";

export function requireCronSecret(req: Request, res: Response, next: NextFunction) {
	if (!verifyCronSecret(req.header("x-cron-secret"))) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	return next();
}
