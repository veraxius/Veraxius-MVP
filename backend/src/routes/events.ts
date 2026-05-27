import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { processPendingEvents } from "../lib/eventProcessor";
import { invalidPayload, internalError } from "../lib/validation";

const router = Router();

const EventIdParamsSchema = z.object({
	id: z.coerce.number().int().positive(),
});

router.get("/failed", requireAuth, async (_req, res) => {
	try {
		const events = await prisma.event.findMany({
			where: { status: "failed" },
		});
		res.json(events);
	} catch (err) {
		return internalError(res, err, "GET /api/events/failed");
	}
});

router.post("/:id/retry", requireAuth, async (req, res) => {
	try {
		const params = EventIdParamsSchema.safeParse(req.params);
		if (!params.success) return invalidPayload(res);

		await prisma.event.update({
			where: { id: params.data.id },
			data: { status: "pending", error: null },
		});

		await processPendingEvents();

		res.json({ ok: true });
	} catch (err) {
		return internalError(res, err, "POST /api/events/:id/retry");
	}
});

export default router;
