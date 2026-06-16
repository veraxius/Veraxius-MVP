import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { extractUserIdFromBearer } from "../lib/domainScoreService";
import { AIMEngine } from "../lib/aimEngine";
import { zUuid, invalidPayload, internalError } from "../lib/validation";

const router = Router();

const aimEngine = new AIMEngine();

const ALLOWED_AVATAR_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

const avatarUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_AVATAR_SIZE },
	fileFilter: (_req, file, cb) => {
		if (ALLOWED_AVATAR_MIME.has(file.mimetype)) {
			cb(null, true);
			return;
		}
		cb(new Error("Invalid file type"));
	},
});

function uploadAvatarToCloudinary(buffer: Buffer): Promise<string> {
	return new Promise((resolve, reject) => {
		const uploadStream = cloudinary.uploader.upload_stream(
			{
				folder: "veraxius/avatars",
				transformation: { width: 400, height: 400, crop: "fill", gravity: "face" },
			},
			(error, result) => {
				if (error) {
					reject(error);
					return;
				}
				if (!result?.secure_url) {
					reject(new Error("Upload failed"));
					return;
				}
				resolve(result.secure_url);
			},
		);

		Readable.from(buffer).pipe(uploadStream);
	});
}

function handleAvatarUpload(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) {
	avatarUpload.single("avatar")(req, res, (err: unknown) => {
		if (err instanceof multer.MulterError) {
			if (err.code === "LIMIT_FILE_SIZE") {
				return res.status(400).json({ error: "File too large" });
			}
			return res.status(400).json({ error: "Upload failed" });
		}
		if (err) {
			return res.status(400).json({ error: "Invalid file type" });
		}
		return next();
	});
}

const SearchQuerySchema = z.object({
	q: z.string().max(100).optional(),
});

const UserIdParamsSchema = z.object({
	userId: zUuid,
});

const DomainParamsSchema = z.object({
	userId: zUuid,
	domainName: z.string().min(1).max(80),
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AIMCFG = require("../../aim.config.js");
const AIM_MAX_SCORE: number = AIMCFG.maxScore ?? 100;

function riskLevelFromFraction(fraction: number): "low" | "moderate" | "high" | "critical" {
	const f = Number.isFinite(fraction)
		? Math.min(AIM_MAX_SCORE, Math.max(0, fraction))
		: 0;
	if (f >= 0.75) return "low";
	if (f >= 0.5) return "moderate";
	if (f >= 0.25) return "high";
	return "critical";
}

router.get("/search", requireAuth, async (req, res) => {
	try {
		const query = SearchQuerySchema.safeParse(req.query);
		if (!query.success) return invalidPayload(res);

		const q = (query.data.q || "").trim();
		const userId = req.userId as string;
		if (!q) return res.json([]);

		const users = await prisma.user.findMany({
			where: {
				email: { contains: q, mode: "insensitive" },
				NOT: { id: userId }
			},
			select: { id: true, email: true, name: true, profilePictureUrl: true },
			take: 10
		});
		return res.json(users);
	} catch (err) {
		return internalError(res, err, "User search error:");
	}
});

router.post("/:userId/avatar", requireAuth, handleAvatarUpload, async (req, res) => {
	try {
		const params = UserIdParamsSchema.safeParse(req.params);
		if (!params.success) return invalidPayload(res);

		const { userId } = params.data;
		if (req.userId !== userId) {
			return res.status(403).json({ error: "Forbidden" });
		}

		if (!req.file) {
			return res.status(400).json({ error: "No avatar file provided" });
		}

		if (!ALLOWED_AVATAR_MIME.has(req.file.mimetype)) {
			return res.status(400).json({ error: "Invalid file type" });
		}

		if (req.file.size > MAX_AVATAR_SIZE) {
			return res.status(400).json({ error: "File too large" });
		}

		if (
			!process.env.CLOUDINARY_CLOUD_NAME ||
			!process.env.CLOUDINARY_API_KEY ||
			!process.env.CLOUDINARY_API_SECRET
		) {
			return res.status(500).json({ error: "Upload service not configured" });
		}

		const profilePictureUrl = await uploadAvatarToCloudinary(req.file.buffer);

		await prisma.user.update({
			where: { id: userId },
			data: { profilePictureUrl },
		});

		return res.json({ profilePictureUrl });
	} catch (err) {
		return internalError(res, err, "POST /api/users/:userId/avatar");
	}
});

router.get("/:userId/aim-summary", async (req, res) => {
	try {
		const params = UserIdParamsSchema.safeParse(req.params);
		if (!params.success) return invalidPayload(res);

		const { userId } = params.data;

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				name: true,
				aimScore: true,
				aimStatus: true,
				aimConfidence: true,
				created_at: true,
				profilePictureUrl: true,
			},
		});
		if (!user) return res.status(404).json({ error: "User not found" });

		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
		// All rows in the 30-day window, ASC — no take/limit cap.
		let history30 = await prisma.aimScoreHistory.findMany({
			where: { userId, createdAt: { gte: thirtyDaysAgo } },
			orderBy: { createdAt: "asc" },
			select: { score: true, createdAt: true },
		});
		// If nothing recent, still return full user history so the chart can plot movement.
		if (history30.length < 2) {
			history30 = await prisma.aimScoreHistory.findMany({
				where: { userId },
				orderBy: { createdAt: "asc" },
				select: { score: true, createdAt: true },
			});
		}

		const fraction = Number(user.aimScore);
		// Same unit as DB / scoring engine: 0–1 (e.g. 0.5). Clients format as "0.50%".
		const global_score = Math.round(fraction * 1000) / 1000;

		const confRaw = user.aimConfidence != null ? Number(user.aimConfidence) : null;
		const confidence_score =
			confRaw != null
				? Math.round(confRaw * 1000) / 10
				: Math.round(Math.min(100, fraction * 100) * 10) / 10;

		let score_trend_30d: "up" | "down" | "flat" = "flat";
		let trend_delta_30d = 0;
		if (history30.length >= 2) {
			const first = history30[0].score;
			const last = history30[history30.length - 1].score;
			trend_delta_30d = Math.round((last - first) * 10000) / 10000;
			if (trend_delta_30d > 0.005) score_trend_30d = "up";
			else if (trend_delta_30d < -0.005) score_trend_30d = "down";
		}

		const risk_level = riskLevelFromFraction(fraction);

		const { activity } = await aimEngine.getSummary(userId);
		const top_drivers = activity.slice(0, 10).map((a) => ({
			id: a.id,
			label: a.label,
			delta: a.delta,
			impact: (a.delta >= 0 ? "positive" : "negative") as "positive" | "negative",
			delta_label: a.deltaLabel,
			domain: a.domain ?? null,
			created_at: a.createdAt,
		}));

		res.json({
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				created_at: user.created_at,
				profilePictureUrl: user.profilePictureUrl,
			},
			global_score,
			confidence_score,
			risk_level,
			aim_status: user.aimStatus,
			score_trend_30d,
			trend_delta_30d,
			top_drivers,
			history_30d: history30.map((h) => ({
				score: Number(h.score),
				createdAt: h.createdAt.toISOString(),
			})),
		});
	} catch (err) {
		return internalError(res, err, "GET /api/users/:userId/aim-summary");
	}
});

router.get("/:userId/domains", async (req, res) => {
	try {
		const params = UserIdParamsSchema.safeParse(req.params);
		if (!params.success) return invalidPayload(res);

		const { userId } = params.data;
		const requesterId = extractUserIdFromBearer(req.headers.authorization);
		const isOwner = requesterId === userId;

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
	} catch (err) {
		return internalError(res, err, "GET /api/users/:userId/domains");
	}
});

router.get("/:userId/domains/:domainName", async (req, res) => {
	try {
		const params = DomainParamsSchema.safeParse(req.params);
		if (!params.success) return invalidPayload(res);

		const { userId, domainName } = params.data;

		const score = await prisma.userDomainScore.findUnique({
			where: { userId_domainName: { userId, domainName } },
		});
		if (!score || !score.isPublic) {
			return res.status(404).json({ error: "Domain not found or not public" });
		}

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

		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
		const historyEvents = await prisma.domainAimEvent.findMany({
			where: { userId, domainName, isReversed: false, createdAt: { gte: thirtyDaysAgo } },
			orderBy: { createdAt: "asc" },
			select: { createdAt: true, effectiveDelta: true },
		});

		let runningScore = AIMCFG.baseScore ?? 0.5;
		const scoreHistory = historyEvents.map((e) => {
			runningScore = Math.max(0, Math.min(AIM_MAX_SCORE, runningScore + e.effectiveDelta));
			return { date: e.createdAt, score: Math.round(runningScore * 100) / 100 };
		});

		const trendRaw = score.scoreAt7dAgo != null ? score.domainAimScore - score.scoreAt7dAgo : 0;

		return res.json({
			domain_name: score.domainName,
			domain_aim_score: score.domainAimScore,
			display_percentage: Math.round(score.domainAimScore * 100) / 100,
			domain_confidence: score.domainConfidence,
			interaction_count: score.interactionCount,
			positive_signals: score.positiveSignals,
			negative_signals: score.negativeSignals,
			trend_7d: Math.round(trendRaw * 1000) / 1000,
			trend_direction: trendRaw > 0.01 ? "up" : trendRaw < -0.01 ? "down" : "stable",
			score_history: scoreHistory,
			recent_events: recentEvents,
		});
	} catch (err) {
		return internalError(res, err, "GET /api/users/:userId/domains/:domainName");
	}
});

export default router;
