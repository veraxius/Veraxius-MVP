import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { extractUserIdFromBearer } from "../lib/domainScoreService";

const router = Router();

// GET /api/users/search?q=  — protected
router.get("/search", requireAuth, async (req, res) => {
	try {
		const q = String(req.query.q || "").trim();
		const userId = req.userId as string;
		if (!q) return res.json([]);
		const users = await prisma.user.findMany({
			where: {
				email: { contains: q, mode: "insensitive" },
				NOT: { id: userId }
			},
			select: { id: true, email: true },
			take: 10
		});
		return res.json(users);
	} catch (err: any) {
		// eslint-disable-next-line no-console
		console.error("User search error:", err);
		return res.status(500).json({ error: err?.message || "Internal server error" });
	}
});

// ─── Domain endpoints (public, with optional auth for owner-only data) ────────

/**
 * GET /api/users/:userId/domains
 * Returns all public domain scores for a user.
 * If the requester is the same user, also includes domains_in_progress.
 */
router.get("/:userId/domains", async (req, res) => {
	try {
		const { userId } = req.params as { userId: string };

		// Optional auth — detect if requester is the profile owner
		const requesterId = extractUserIdFromBearer(req.headers.authorization);
		const isOwner = requesterId === userId;

		// Fetch all public domain scores, ordered by domain_aim_score DESC
		const publicScores = await prisma.userDomainScore.findMany({
			where: { userId, isPublic: true },
			orderBy: { domainAimScore: "desc" },
		});

		const domains = publicScores.slice(0, isOwner ? undefined : 6).map((d) => {
			const trendRaw = d.scoreAt7dAgo != null ? d.domainAimScore - d.scoreAt7dAgo : 0;
			return {
				domain_name: d.domainName,
				domain_aim_score: d.domainAimScore,
				display_percentage: Math.round(d.domainAimScore * 10000) / 100,
				domain_confidence: d.domainConfidence,
				interaction_count: d.interactionCount,
				positive_signals: d.positiveSignals,
				negative_signals: d.negativeSignals,
				trend_7d: Math.round(trendRaw * 1000) / 1000,
				trend_direction:
					trendRaw > 0.01 ? "up" : trendRaw < -0.01 ? "down" : "stable",
				last_activity_at: d.lastActivityAt,
			};
		});

		const response: Record<string, unknown> = { domains };

		// Show in-progress domains only to the owner
		if (isOwner) {
			const allScores = await prisma.userDomainScore.findMany({
				where: { userId, isPublic: false, interactionCount: { gte: 1, lt: 5 } },
				orderBy: { interactionCount: "desc" },
			});
			response.domains_in_progress = allScores.map((d) => ({
				domain_name: d.domainName,
				interaction_count: d.interactionCount,
				posts_needed: Math.max(0, 5 - d.interactionCount),
			}));
		}

		return res.json(response);
	} catch (err: any) {
		// eslint-disable-next-line no-console
		console.error("GET /api/users/:userId/domains error:", err);
		return res.status(500).json({ error: err?.message || "Internal server error" });
	}
});

/**
 * GET /api/users/:userId/domains/:domainName
 * Returns detailed domain info including recent events and score history.
 */
router.get("/:userId/domains/:domainName", async (req, res) => {
	try {
		const { userId, domainName } = req.params as { userId: string; domainName: string };

		const score = await prisma.userDomainScore.findUnique({
			where: { userId_domainName: { userId, domainName } },
		});
		if (!score || !score.isPublic) {
			return res.status(404).json({ error: "Domain not found or not public" });
		}

		// Recent events (last 10, non-reversed)
		const recentEvents = await prisma.domainAimEvent.findMany({
			where: { userId, domainName, isReversed: false },
			orderBy: { createdAt: "desc" },
			take: 10,
			select: {
				id: true,
				eventType: true,
				rawDelta: true,
				effectiveDelta: true,
				createdAt: true,
			},
		});

		// Score history: last 30 days of decay + vote events
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
		const historyEvents = await prisma.domainAimEvent.findMany({
			where: { userId, domainName, isReversed: false, createdAt: { gte: thirtyDaysAgo } },
			orderBy: { createdAt: "asc" },
			select: { createdAt: true, effectiveDelta: true },
		});

		// Build running score history
		let runningScore = 0.5;
		const scoreHistory = historyEvents.map((e) => {
			runningScore = Math.max(0, Math.min(1, runningScore + e.effectiveDelta));
			return { date: e.createdAt, score: Math.round(runningScore * 100) / 100 };
		});

		const trendRaw = score.scoreAt7dAgo != null ? score.domainAimScore - score.scoreAt7dAgo : 0;

		return res.json({
			domain_name: score.domainName,
			domain_aim_score: score.domainAimScore,
			display_percentage: Math.round(score.domainAimScore * 10000) / 100,
			domain_confidence: score.domainConfidence,
			interaction_count: score.interactionCount,
			positive_signals: score.positiveSignals,
			negative_signals: score.negativeSignals,
			trend_7d: Math.round(trendRaw * 1000) / 1000,
			trend_direction: trendRaw > 0.01 ? "up" : trendRaw < -0.01 ? "down" : "stable",
			score_history: scoreHistory,
			recent_events: recentEvents,
		});
	} catch (err: any) {
		// eslint-disable-next-line no-console
		console.error("GET /api/users/:userId/domains/:domainName error:", err);
		return res.status(500).json({ error: err?.message || "Internal server error" });
	}
});

export default router;
