import { createHmac } from "crypto";

/**
 * Stateless public-share tokens for Trust Receipts. Deliberately NOT a new
 * DB column/table — the token is an HMAC-SHA256 of the receipt's own kind+id
 * using the server's existing JWT_SECRET, so anyone holding the exact link
 * can view that one receipt without authenticating, but the token can't be
 * guessed or forged without the secret.
 *
 * Known trade-off (worth flagging): because this is stateless, there is no
 * per-link "revoke" — the only way to invalidate every outstanding receipt
 * link at once is rotating JWT_SECRET (which also logs out all users). If
 * per-link revocation becomes a real requirement, this should move to a
 * proper `shareToken` column with a revoked flag — deferred for MVP4 given
 * the mockup doesn't ask for revocation, only "control what you share".
 */

function secret(): string {
	const s = process.env.JWT_SECRET;
	if (!s) throw new Error("JWT_SECRET not configured");
	return s;
}

export type ReceiptKind = "event" | "domain-event";

export function signReceiptToken(kind: ReceiptKind, id: string): string {
	return createHmac("sha256", secret()).update(`${kind}:${id}`).digest("hex").slice(0, 32);
}

export function verifyReceiptToken(kind: ReceiptKind, id: string, token: string): boolean {
	if (!token) return false;
	return signReceiptToken(kind, id) === token;
}
