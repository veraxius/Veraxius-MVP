import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AIMEngine } from "../lib/aimEngine";
import {
    recordOutcome,
    runConsistencyCheck,
    recordPeerFeedback,
    openChallenge as openChallengeV2,
    resolveChallenge as resolveChallengeV2,
    applyDecayToAllUsers,
    processAimSignal,
    recomputeAIMScore,
} from "../lib/aimV2";
import { microRecalcQueue } from "../lib/aimQueue";
import { recalculateDomainScore, onPostCreated } from "../lib/domainScoreService";
import type { SignalKind } from "../lib/signalNormalizer";
import { requireAuth } from "../middleware/auth";
import { requireCronSecret } from "../middleware/cronSecret";
import { zUuid, zShortText, zOptionalContext, invalidPayload, internalError } from "../lib/validation";

const router = Router();

const ALLOWED_AIM_TYPES = new Set(["success", "contradiction", "decay"]);
const engine = new AIMEngine();

function legacyEventToKind(type: string, value: number): SignalKind {
    switch (type) {
        case "contradiction": {
            const sev = Math.round(Math.abs(value));
            if (sev >= 3) return "challenge_opened_l3";
            if (sev >= 2) return "challenge_opened_l2";
            return "challenge_opened_l1";
        }
        case "decay":
            return "inactivity_decay";
        case "success":
        default:
            return value >= 0 ? "outcome_success" : "outcome_failure";
    }
}

const AimEventSchema = z.object({
    userId: zUuid,
    type: z.enum(["success", "contradiction", "decay"]),
    value: z.number().finite(),
    context: zOptionalContext,
});

const OutcomeSchema = z.object({
    userId: zUuid,
    interactionId: z.string().min(1).max(128),
    quality: z.number().finite(),
    verifiedBy: zUuid.optional(),
    domain: z.string().max(80).optional(),
    context: z.record(z.unknown()).optional(),
});

const PeerFeedbackSchema = z.object({
    targetId: zUuid,
    voterId: zUuid,
    type: z.enum(["endorsement", "dispute"]),
    domain: z.string().max(80).optional(),
    aimVoter: z.number().finite().optional(),
    networkDistance: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    diversity: z.enum(["same", "different"]),
});

const VerifySchema = z.object({
    userId: zUuid,
    level: z.enum(["none", "email", "identity"]),
});

const ChallengeSchema = z.object({
    targetUserId: zUuid,
    challengerId: zUuid,
    reason: zShortText,
    severity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

const ResolveSchema = z.object({
    resolution: z.enum(["upheld", "dismissed", "mixed", "malicious"]),
});

const RecomputeBodySchema = z.object({
    domain: z.string().max(80).optional(),
});

const UserIdParamsSchema = z.object({
    userId: zUuid,
});

const ChallengeIdParamsSchema = z.object({
    id: z.string().uuid(),
});

router.post("/event", requireAuth, async (req, res) => {
    try {
        const parsed = AimEventSchema.safeParse(req.body);
        if (!parsed.success) return invalidPayload(res);

        const { userId, type, value, context } = parsed.data;
        if (userId !== req.userId) {
            return res.status(403).json({ error: "Forbidden" });
        }
        if (!ALLOWED_AIM_TYPES.has(type)) {
            return res.status(400).json({ error: "Invalid event type" });
        }

        const kind = legacyEventToKind(type, value);
        const result = await processAimSignal({
            userId,
            kind,
            source: type === "contradiction" ? "peer" : "system",
            refId: context,
            deferRecompute: true,
        });
        if (!result.skipped) {
            await recomputeAIMScore(userId, undefined, { historyContext: kind });
        }
        const summary = await engine.getSummary(userId);
        res.json({ event: result, summary });
    } catch (err) {
        return internalError(res, err, "POST /api/aim/event");
    }
});

router.post("/outcome", requireAuth, async (req, res) => {
    try {
        const parsed = OutcomeSchema.safeParse(req.body);
        if (!parsed.success) return invalidPayload(res);

        const { userId, interactionId, quality, verifiedBy, domain, context } = parsed.data;
        if (userId !== req.userId) {
            return res.status(403).json({ error: "Forbidden" });
        }

        await recordOutcome(userId, interactionId, quality, verifiedBy, domain, context);
        microRecalcQueue.enqueue(userId, async () => {
            await recomputeAIMScore(userId, domain);
        });
        const summary = await engine.getSummary(userId);
        res.json({ ok: true, summary });
    } catch (err) {
        return internalError(res, err, "POST /api/aim/outcome");
    }
});

router.post("/peer-feedback", requireAuth, async (req, res) => {
    try {
        const parsed = PeerFeedbackSchema.safeParse(req.body);
        if (!parsed.success) return invalidPayload(res);

        const { targetId, voterId, type, domain, aimVoter, networkDistance, diversity } = parsed.data;
        if (voterId !== req.userId) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const result = await recordPeerFeedback({ targetId, voterId, type, domain, aimVoter, networkDistance, diversity });
        await recomputeAIMScore(targetId, domain);
        res.json(result);
    } catch (err) {
        return internalError(res, err, "POST /api/aim/peer-feedback");
    }
});

router.post("/verify", requireAuth, async (req, res) => {
    try {
        const parsed = VerifySchema.safeParse(req.body);
        if (!parsed.success) return invalidPayload(res);

        const { userId, level } = parsed.data;
        if (userId !== req.userId) {
            return res.status(403).json({ error: "Forbidden" });
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
        return internalError(res, err, "POST /api/aim/verify");
    }
});

router.post("/challenge", requireAuth, async (req, res) => {
    try {
        const parsed = ChallengeSchema.safeParse(req.body);
        if (!parsed.success) return invalidPayload(res);

        const { targetUserId, challengerId, reason, severity } = parsed.data;
        if (challengerId !== req.userId) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const challenge = await openChallengeV2(challengerId, targetUserId, reason, severity);
        res.json({ challenge });
    } catch (err) {
        return internalError(res, err, "POST /api/aim/challenge");
    }
});

router.get("/challenges/:userId", async (req, res) => {
    try {
        const params = UserIdParamsSchema.safeParse(req.params);
        if (!params.success) return invalidPayload(res);

        const { userId } = params.data;
        const challenges = await prisma.aimChallenge.findMany({
            where: {
                OR: [{ targetUserId: userId }, { challengerId: userId }],
            },
            orderBy: { createdAt: "desc" },
        });

        res.json({ challenges });
    } catch (err) {
        return internalError(res, err, "GET /api/aim/challenges/:userId");
    }
});

router.post("/challenge/:id/resolve", requireAuth, async (req, res) => {
    try {
        const params = ChallengeIdParamsSchema.safeParse(req.params);
        const body = ResolveSchema.safeParse(req.body);
        if (!params.success || !body.success) return invalidPayload(res);

        const result = await resolveChallengeV2(params.data.id, body.data.resolution);
        res.json({ challenge: result.ch, targetDelta: result.targetDelta, challengerDelta: result.challengerDelta });
    } catch (err) {
        return internalError(res, err, "POST /api/aim/challenge/:id/resolve");
    }
});

router.post("/recompute/:userId", requireAuth, async (req, res) => {
    try {
        const params = UserIdParamsSchema.safeParse(req.params);
        const body = RecomputeBodySchema.safeParse(req.body ?? {});
        if (!params.success || !body.success) return invalidPayload(res);

        if (params.data.userId !== req.userId) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const result = await recomputeAIMScore(params.data.userId, body.data.domain);
        res.json(result);
    } catch (err) {
        return internalError(res, err, "POST /api/aim/recompute/:userId");
    }
});

router.post("/consistency/:userId", requireAuth, async (req, res) => {
    try {
        const params = UserIdParamsSchema.safeParse(req.params);
        if (!params.success) return invalidPayload(res);

        if (params.data.userId !== req.userId) {
            return res.status(403).json({ error: "Forbidden" });
        }

        await runConsistencyCheck(params.data.userId);
        res.json({ ok: true });
    } catch (err) {
        return internalError(res, err, "POST /api/aim/consistency/:userId");
    }
});

router.post("/decay/apply", requireCronSecret, async (_req, res) => {
    try {
        await applyDecayToAllUsers();
        res.json({ ok: true });
    } catch (err) {
        return internalError(res, err, "POST /api/aim/decay/apply");
    }
});

router.post("/domains/recalculate-all", requireCronSecret, async (_req, res) => {
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
    } catch (err) {
        return internalError(res, err, "POST /api/aim/domains/recalculate-all");
    }
});

router.post("/recompute-all", requireCronSecret, async (_req, res) => {
    try {
        const users = await prisma.user.findMany({ select: { id: true } });
        let updated = 0;
        for (const u of users) {
            await recomputeAIMScore(u.id);
            updated++;
        }
        res.json({ ok: true, updated });
    } catch (err) {
        return internalError(res, err, "POST /api/aim/recompute-all");
    }
});

router.post("/domains/reclassify-posts", requireCronSecret, async (_req, res) => {
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
    } catch (err) {
        return internalError(res, err, "POST /api/aim/domains/reclassify-posts");
    }
});

router.get("/:userId", async (req, res) => {
    try {
        const params = UserIdParamsSchema.safeParse(req.params);
        if (!params.success) return invalidPayload(res);

        const { userId } = params.data;
        const { user, events, history, breakdown, activity } = await engine.getSummary(userId);
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({ user, events, history, breakdown, activity });
    } catch (err) {
        return internalError(res, err, "GET /api/aim/:userId");
    }
});

export default router;
