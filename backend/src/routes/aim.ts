import { Router } from "express";
import { prisma } from "../config/prisma";
import { createAimEvent, calculateAimScore, createChallenge } from "../lib/aim";
import { AIMEngine } from "../lib/aimEngine";

const router = Router();

const ALLOWED_AIM_TYPES = new Set(["success", "contradiction", "decay"]);
const engine = new AIMEngine();

router.post("/event", async (req, res) => {
	try {
		const { userId, type, value, context } = req.body as {
			userId: string; type: string; value: number; context?: string;
		};
		if (!userId || typeof type !== "string" || typeof value !== "number") {
			return res.status(400).json({ error: "Invalid payload" });
		}
		if (!ALLOWED_AIM_TYPES.has(type)) {
			return res.status(400).json({ error: "Invalid event type" });
		}
		const event = await createAimEvent(userId, type as "success" | "contradiction" | "decay", value, context);
		// enqueue micro-recalc
		await engine.recordSignals(userId, [{ type: type as any, value, context }]);
		const summary = await engine.getSummary(userId);
		res.json({ event, summary });
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error("POST /api/aim/event", err);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.post("/challenge", async (req, res) => {
	try {
		const { targetUserId, challengerId } = req.body as {
			targetUserId: string; challengerId: string;
		};
		if (!targetUserId || !challengerId) {
			return res.status(400).json({ error: "Invalid payload" });
		}
		const challenge = await createChallenge(targetUserId, challengerId);
		res.json({ challenge });
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error("POST /api/aim/challenge", err);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.get("/:userId", async (req, res) => {
	try {
		const { userId } = req.params as { userId: string };
		const { user, events, history, breakdown } = await engine.getSummary(userId);
		if (!user) return res.status(404).json({ error: "User not found" });
		res.json({ user, events, history, breakdown });
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error("GET /api/aim/:userId", err);
		res.status(500).json({ error: "Internal server error" });
	}
});

export default router;
