import { timingSafeEqual } from "crypto";

export function verifyCronSecret(header: string | undefined): boolean {
	const secret = process.env.CRON_SECRET;
	if (!secret || typeof header !== "string") return false;
	if (secret.length !== header.length) return false;
	return timingSafeEqual(Buffer.from(secret), Buffer.from(header));
}
