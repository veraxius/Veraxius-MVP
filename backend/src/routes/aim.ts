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
import { recalculateDomainScore, onPostCreated } from "../lib/domainScoreService";

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
            targetUserId: string; challengerId: string; reason: string; severity: 1 | 2 | 3;
        };

        if (!targetUserId || !challengerId || !reason || !severity) {
            return res.status(400).json({ error: "Invalid payload" });
        }

        const challenge = await openChallengeV2(
            challengerId,
            targetUserId,
            reason,
            severity
        );

        res.json({ challenge });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error("POST /api/aim/challenge", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
router.get("/challenges/:userId", async (req, res) => {
    try {
        const { userId } = req.params as { userId: string };

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const challenges = await prisma.aimChallenge.findMany({
            where: {
                OR: [
                    { targetUserId: userId },
                    { challengerId: userId },
                ],
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        res.json({ challenges });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error("GET /api/aim/challenges/:userId", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/challenge/:id/resolve", async (req, res) => {
    try {
        const { id } = req.params as { id: string };
        const { resolution } = req.body as {
            resolution: "upheld" | "dismissed" | "mixed" | "malicious";
        };
        const valid = ["upheld", "dismissed", "mixed", "malicious"];
        if (!id || !valid.includes(resolution)) {
            return res.status(400).json({ error: "Invalid payload. resolution must be one of: upheld, dismissed, mixed, malicious" });
        }
        const result = await resolveChallengeV2(id, resolution);
        res.json({ challenge: result.ch, targetDelta: result.targetDelta, challengerDelta: result.challengerDelta });
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

// POST /api/aim/domains/recalculate-all
// One-time admin fix: re-runs recalculateDomainScore for every user/domain pair
// using the new 0-baseline formula (no artificial 50% starting score).
// Scores are now 0% until real Reliable / Not Reliable votes arrive.
router.post("/domains/recalculate-all", async (_req, res) => {
    try {
        const all = await prisma.userDomainScore.findMany({
            select: { userId: true, domainName: true },
        });

        let updated = 0;
        for (const row of all) {
            await recalculateDomainScore(row.userId, row.domainName);
            updated++;
        }

        res.json({ ok: true, updated });
    } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error("POST /api/aim/domains/recalculate-all error", err);
        res.status(500).json({ error: err?.message || "Internal server error" });
    }
});

// Admin endpoint: recompute global AIM score for all users (migration helper)
router.post("/recompute-all", async (_req, res) => {
    try {
        const users = await prisma.user.findMany({ select: { id: true } });
        let updated = 0;
        for (const u of users) {
            await recomputeAIMScore(u.id);
            updated++;
        }
        res.json({ ok: true, updated });
    } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error("POST /api/aim/recompute-all error", err);
        res.status(500).json({ error: err?.message || "Internal server error" });
    }
});

// Admin endpoint: reclassify all existing posts into domains (migration helper)
// Useful after the classifier is updated or the domain keyword list expands.
router.post("/domains/reclassify-posts", async (_req, res) => {
    try {
        const posts = await prisma.post.findMany({
            select: { id: true, userId: true, content: true },
            orderBy: { id: "asc" },
        });

        let classified = 0;
        for (const post of posts) {
            await onPostCreated({ id: post.id, userId: post.userId, content: post.content });
            classified++;
        }

        res.json({ ok: true, classified });
    } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error("POST /api/aim/domains/reclassify-posts error", err);
        res.status(500).json({ error: err?.message || "Internal server error" });
    }
});

router.get("/:userId", async (req, res) => {
    try {
        const { userId } = req.params as { userId: string };
        const { user, events, history, breakdown, activity } = await engine.getSummary(userId);
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({ user, events, history, breakdown, activity });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error("GET /api/aim/:userId", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;


