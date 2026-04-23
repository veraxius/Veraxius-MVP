import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { processPendingEvents } from "../lib/eventProcessor";

const router = Router();

router.get("/failed", requireAuth, async (_req, res) => {
	const events = await prisma.event.findMany({
		where: { status: "failed" },
	});
	res.json(events);
});

router.post("/:id/retry", requireAuth, async (req, res) => {
	const id = Number(req.params.id);

	await prisma.event.update({
		where: { id },
		data: { status: "pending", error: null },
	});

	await processPendingEvents();

	res.json({ ok: true });
});

export default router;
