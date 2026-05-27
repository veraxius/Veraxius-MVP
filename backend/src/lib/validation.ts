import { z } from "zod";

export const zUuid = z.string().uuid();
export const zEmail = z.string().email().max(254);
export const zPassword = z.string().min(6).max(128);
export const zName = z.string().min(1).max(80);
export const zContent = z.string().min(1).max(10_000);
export const zShortText = z.string().min(1).max(500);
export const zIdToken = z.string().min(1).max(8192);
export const zOptionalContext = z.string().max(500).optional();

export function invalidPayload(res: import("express").Response) {
	return res.status(400).json({ error: "Invalid payload" });
}

export function internalError(res: import("express").Response, err: unknown, label: string) {
	console.error(label, err);
	return res.status(500).json({ error: "Internal server error" });
}
