import { Router } from "express";
import { z } from "zod";
import { verifyReceiptToken } from "../lib/receiptShare";
import { buildAimEventReceipt, buildDomainAimEventReceipt } from "../lib/receiptBuilder";
import { zUuid, invalidPayload, internalError } from "../lib/validation";

const router = Router();

const ParamsSchema = z.object({
	kind: z.enum(["event", "domain-event"]),
	id: zUuid,
});

const QuerySchema = z.object({
	token: z.string().min(1),
});

/**
 * Public, no-auth Trust Receipt view — this is exactly what "Share Receipt"
 * hands out. Access is gated by the HMAC token (see lib/receiptShare.ts),
 * not by a login check, since the whole point is a link non-users can open.
 */
router.get("/:kind/:id", async (req, res) => {
	try {
		const params = ParamsSchema.safeParse(req.params);
		const query = QuerySchema.safeParse(req.query);
		if (!params.success || !query.success) return invalidPayload(res);

		const { kind, id } = params.data;
		if (!verifyReceiptToken(kind, id, query.data.token)) {
			return res.status(403).json({ error: "Invalid or expired share link" });
		}

		const receipt =
			kind === "event" ? await buildAimEventReceipt(id) : await buildDomainAimEventReceipt(id);
		if (!receipt) return res.status(404).json({ error: "Receipt not found" });

		return res.json(receipt);
	} catch (err) {
		return internalError(res, err, "GET /api/public/receipt/:kind/:id");
	}
});

export default router;
