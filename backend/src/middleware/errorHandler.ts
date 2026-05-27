import { Request, Response, NextFunction } from "express";

export function globalErrorHandler(
	err: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction,
) {
	console.error("Unhandled error:", err);
	if (res.headersSent) return;
	res.status(500).json({ error: "Internal server error" });
}
