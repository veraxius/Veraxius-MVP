import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";
import { invalidPayload, internalError } from "../lib/validation";

const router = Router();

const RankingsQuerySchema = z.object({
	domain: z.string().max(80).optional(),
	limit: z.coerce.number().int().min(1).max(200).optional(),
});

router.get("/", async (req, res) => {
	try {
		const parsed = RankingsQuerySchema.safeParse(req.query);
		if (!parsed.success) return invalidPayload(res);

		const domain = parsed.data.domain;
		const limit = parsed.data.limit ?? 50;

		if (!domain) {
			const users = await prisma.user.findMany({
				where: { aimConfidence: { gte: new Prisma.Decimal(0.15) } as any },
				select: { id: true, email: true, name: true, aimScore: true, aimConfidence: true, aimDomainPrimary: true },
				orderBy: { aimScore: "desc" },
				take: limit * 3,
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

		const domainScores = await prisma.aimDomainScore.findMany({
			where: { domain },
			orderBy: { score: "desc" },
			take: limit * 5,
			select: { userId: true, domain: true, score: true, confidence: true, interactionCount: true },
		});

		const userIds = [...new Set(domainScores.map(d => d.userId))];
		const users = await prisma.user.findMany({
			where: { id: { in: userIds } },
			select: { id: true, email: true, name: true, aimConfidence: true, aimDomainPrimary: true },
		});
		const byId = new Map(users.map(u => [u.id, u]));

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
	} catch (err) {
		return internalError(res, err, "GET /api/rankings");
	}
});

export default router;
