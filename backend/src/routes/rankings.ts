import { Router } from "express";
import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";

const router = Router();

// GET /api/rankings
// Query params:
// - domain?: string (if provided, rank by domain score; else global aimScore)
// - limit?: number (default 50)
// Rules:
// - Exclude users with confidence < 0.15 from public rankings
// - Ranking score = score × (0.6 + 0.4 × confidence)
router.get("/", async (req, res) => {
	try {
		const domain = typeof req.query.domain === "string" ? req.query.domain : undefined;
		const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));

		if (!domain) {
			// Global ranking
			const users = await prisma.user.findMany({
				where: { aimConfidence: { gte: new Prisma.Decimal(0.15) } as any },
				select: { id: true, email: true, name: true, aimScore: true, aimConfidence: true, aimDomainPrimary: true },
				orderBy: { aimScore: "desc" },
				take: limit * 3, // overfetch, we'll compute rankingScore then slice
			});
			const ranked = users
				.map(u => {
					const conf = Number(u.aimConfidence ?? 0);
					const rankingScore = u.aimScore * (0.55 + 0.45 * conf);
					return { ...u, rankingScore, confidence: conf };
				})
				.sort((a, b) => b.rankingScore - a.rankingScore)
				.slice(0, limit);
			return res.json({ domain: null, items: ranked });
		}

		// Domain-specific ranking: use AimDomainScore
		const domainScores = await prisma.aimDomainScore.findMany({
			where: { domain },
			orderBy: { score: "desc" },
			take: limit * 5, // overfetch
			select: { userId: true, domain: true, score: true, confidence: true, interactionCount: true },
		});

		// Load user confidences and names
		const userIds = [...new Set(domainScores.map(d => d.userId))];
		const users = await prisma.user.findMany({
			where: { id: { in: userIds } },
			select: { id: true, email: true, name: true, aimConfidence: true, aimDomainPrimary: true },
		});
		const byId = new Map(users.map(u => [u.id, u]));

		// Exclude low confidence globally (<0.15) and low domain confidence/volume per spec
		const filtered = domainScores.filter(d => {
			const u = byId.get(d.userId);
			const globalConf = Number(u?.aimConfidence ?? 0);
			return globalConf >= 0.15 && d.confidence >= 0.2 && d.interactionCount >= 5;
		});

		const ranked = filtered
			.map(d => {
				const u = byId.get(d.userId)!;
				const globalConf = Number(u.aimConfidence ?? 0);
				const rankingScore = d.score * (0.55 + 0.45 * globalConf);
				return {
					userId: d.userId,
					name: u.name ?? u.email?.split("@")[0] ?? "user",
					email: u.email,
					aimDomainPrimary: u.aimDomainPrimary,
					domain: d.domain,
					score: d.score,
					domainConfidence: d.confidence,
					globalConfidence: globalConf,
					interactionCount: d.interactionCount,
					rankingScore,
				};
			})
			.sort((a, b) => b.rankingScore - a.rankingScore)
			.slice(0, limit);

		return res.json({ domain, items: ranked });
	} catch (err: any) {
		// eslint-disable-next-line no-console
		console.error("GET /api/rankings error", err);
		return res.status(500).json({ error: err?.message || "Internal server error" });
	}
});

export default router;

