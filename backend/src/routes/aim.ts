import { Router } from "express";
import { prisma } from "../config/prisma";
import { createAimEvent, calculateAimScore, createChallenge } from "../lib/aim";
import { AIMEngine } from "../lib/aimEngine";
import {
	recordOutcome,
	runConsistencyCheck,
	recordPeerFeedback,
	openChallenge as openChallengeV2,
	resolveChallenge as resolveChallengeV2,
	applyDecayToAllUsers,
	recomputeAIMScore,
} from "../lib/aimV2";
import { microRecalcQueue } from "../lib/aimQueue";

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

// V2: record outcome (reliability)
router.post("/outcome", async (req, res) => {
	try {
		const { userId, interactionId, quality, verifiedBy, domain, context } = req.body as {
			userId: string; interactionId: string; quality: number; verifiedBy?: string; domain?: string; context?: any;
		};
		if (!userId || !interactionId || typeof quality !== "number") {
			return res.status(400).json({ error: "Invalid payload" });
		}
		await recordOutcome(userId, interactionId, quality, verifiedBy, domain, context);
		// Debounced recompute for v2 signals
		microRecalcQueue.enqueue(userId, async () => {
			await recomputeAIMScore(userId, domain);
		});
		const summary = await engine.getSummary(userId);
		res.json({ ok: true, summary });
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error("POST /api/aim/outcome", err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// V2: peer feedback
router.post("/peer-feedback", async (req, res) => {
	try {
		const { targetId, voterId, type, domain, aimVoter, networkDistance, diversity } = req.body as {
			targetId: string; voterId: string; type: "endorsement" | "dispute"; domain?: string; aimVoter?: number; networkDistance: 1|2|3; diversity: "same"|"different";
		};
		if (!targetId || !voterId || (type !== "endorsement" && type !== "dispute") || !networkDistance || !diversity) {
			return res.status(400).json({ error: "Invalid payload" });
		}
		const result = await recordPeerFeedback({ targetId, voterId, type, domain, aimVoter, networkDistance, diversity });
		// Recompute inmediato según especificación
		await recomputeAIMScore(targetId, domain);
		res.json(result);
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error("POST /api/aim/peer-feedback", err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Verification status change -> impacts confidence (and may influence reliability weighting indirectly)
router.post("/verify", async (req, res) => {
	try {
		const { userId, level } = req.body as { userId: string; level: "none" | "email" | "identity" };
		if (!userId || !["none", "email", "identity"].includes(level)) {
			return res.status(400).json({ error: "Invalid payload" });
		}
		await prisma.aimEvent.create({
			data: {
				userId,
				eventType: "confidence",
				signal: "verification_status_changed",
				delta: 0,
				weight: 1,
				contextWeight: 1,
				metadata: { level },
			},
		});
		const recomputed = await recomputeAIMScore(userId);
		return res.json({ ok: true, ...recomputed });
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error("POST /api/aim/verify", err);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.post("/challenge", async (req, res) => {
	try {
		const { targetUserId, challengerId, reason, severity } = req.body as {
			targetUserId: string; challengerId: string; reason: string; severity: 1|2|3;
		};
		if (!targetUserId || !challengerId || !reason || !severity) {
			return res.status(400).json({ error: "Invalid payload" });
		}
		// keep legacy for compatibility
		await createChallenge(targetUserId, challengerId);
		const challenge = await openChallengeV2(challengerId, targetUserId, reason, severity);
		res.json({ challenge });
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error("POST /api/aim/challenge", err);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.post("/challenge/:id/resolve", async (req, res) => {
	try {
		const { id } = req.params as { id: string };
		const { resolution, maliciousByAccuser } = req.body as { resolution: "positive" | "negative"; maliciousByAccuser?: boolean };
		if (!id || (resolution !== "positive" && resolution !== "negative")) {
			return res.status(400).json({ error: "Invalid payload" });
		}
		const ch = await resolveChallengeV2(id, resolution);
		// Optional: penalize accuser if malicious intent confirmed
		if (maliciousByAccuser) {
			await prisma.aimEvent.create({
				data: {
					userId: ch.challengerId,
					eventType: "contradiction",
					signal: "malicious_challenge",
					delta: -0.03,
					weight: 1,
					contextWeight: 1,
					metadata: { challengeId: id },
				},
			});
		}
		res.json({ challenge: ch });
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error("POST /api/aim/challenge/:id/resolve", err);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.post("/recompute/:userId", async (req, res) => {
	try {
		const { userId } = req.params as { userId: string };
		const { domain } = req.body as { domain?: string };
		const result = await recomputeAIMScore(userId, domain);
		res.json(result);
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error("POST /api/aim/recompute/:userId", err);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.post("/consistency/:userId", async (req, res) => {
	try {
		const { userId } = req.params as { userId: string };
		await runConsistencyCheck(userId);
		res.json({ ok: true });
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error("POST /api/aim/consistency/:userId", err);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.post("/decay/apply", async (_req, res) => {
	try {
		await applyDecayToAllUsers();
		res.json({ ok: true });
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error("POST /api/aim/decay/apply", err);
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
