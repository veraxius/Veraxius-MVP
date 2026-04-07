import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { createAimEvent } from "../lib/aim";
import { recordPeerFeedback } from "../lib/aimV2";
import { microRecalcQueue } from "../lib/aimQueue";
import { recomputeAIMScore } from "../lib/aimV2";

const router = Router();

// GET /api/posts - latest posts with relations
router.get("/", async (_req, res) => {
	try {
		const posts = await prisma.post.findMany({
			orderBy: { createdAt: "desc" },
			take: 50,
			include: {
				reactions: true,
				comments: { orderBy: { createdAt: "asc" } }
			}
		});
		res.json(posts);
	} catch (err: any) {
		// eslint-disable-next-line no-console
		console.error("GET /api/posts error", err);
		res.status(500).json({ error: err?.message || "Internal server error" });
	}
});

// POST /api/posts - create post (protected)
router.post("/", requireAuth, async (req, res) => {
	try {
		const userId = req.userId as string;
		const { content } = req.body as { content?: string };
		if (!content || !content.trim()) return res.status(400).json({ error: "Content required" });

		// derive name from email prefix, verified unknown -> false
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const userName = user?.name ?? user?.email?.split("@")[0] ?? "user";
		const post = await prisma.post.create({
			data: { userId, userName, userVerified: false, content: content.trim() }
		});
		res.json(post);
	} catch (err: any) {
		// eslint-disable-next-line no-console
		console.error("POST /api/posts error", err);
		res.status(500).json({ error: err?.message || "Internal server error" });
	}
});

// POST /api/posts/:id/react - toggle reaction (protected)
router.post("/:id/react", requireAuth, async (req, res) => {
	try {
		const userId = req.userId as string;
		const postId = Number(req.params.id);
		const { type } = req.body as { type?: string };
		if (!postId || (type !== "util" && type !== "confiable" && type !== "not_reliable")) {
			return res.status(400).json({ error: "Invalid payload" });
		}
		const post = await prisma.post.findUnique({ where: { id: postId } });
		if (!post) return res.status(404).json({ error: "Post not found" });
		const authorUserId = post.userId;
		// Try create first (toggle ON); if unique violation, delete existing (toggle OFF)
		try {
			await prisma.postReaction.create({ data: { postId, userId, type } });
			// Apply AIM impact via Peer Validation engine only on activation
			const voter = await prisma.user.findUnique({ where: { id: userId }, select: { aimScore: true, aimDomainPrimary: true } });
			const author = await prisma.user.findUnique({ where: { id: authorUserId }, select: { aimDomainPrimary: true } });
			const diversity = voter?.aimDomainPrimary && author?.aimDomainPrimary && voter.aimDomainPrimary === author?.aimDomainPrimary ? "same" : "different";
			// Without a social graph, assume no direct connection => networkDistance=3 (none)
			await recordPeerFeedback({
				targetId: authorUserId,
				voterId: userId,
				type: type === "not_reliable" ? "dispute" : "endorsement",
				domain: author?.aimDomainPrimary ?? undefined,
				aimVoter: voter?.aimScore ?? 0.5,
				networkDistance: 3,
				diversity,
			});
			// Recompute inmediato tras registrar el feedback
			await recomputeAIMScore(authorUserId, author?.aimDomainPrimary ?? undefined);
			return res.json({ toggled: "on" });
		} catch (e: any) {
			if (e?.code === "P2002") {
				const existing = await prisma.postReaction.findUnique({
					where: { postId_userId_type: { postId, userId, type } },
					select: { id: true },
				});
				if (existing) {
					await prisma.postReaction.delete({ where: { id: existing.id } }).catch(() => {});
				}
				return res.json({ toggled: "off" });
			}
			throw e;
		}
	} catch (err: any) {
		// eslint-disable-next-line no-console
		console.error("POST /api/posts/:id/react error", err);
		res.status(500).json({ error: err?.message || "Internal server error" });
	}
});

// POST /api/posts/:id/comments - add comment (protected)
router.post("/:id/comments", requireAuth, async (req, res) => {
	try {
		const userId = req.userId as string;
		const postId = Number(req.params.id);
		const { content } = req.body as { content?: string };
		if (!postId || !content || !content.trim()) {
			return res.status(400).json({ error: "Invalid payload" });
		}
		const user = await prisma.user.findUnique({ where: { id: userId } });
		const userName = user?.name ?? user?.email?.split("@")[0] ?? "user";
		const comment = await prisma.comment.create({
			data: { postId, userId, userName, content: content.trim() }
		});
		return res.json(comment);
	} catch (err: any) {
		// eslint-disable-next-line no-console
		console.error("POST /api/posts/:id/comments error", err);
		res.status(500).json({ error: err?.message || "Internal server error" });
	}
});

export default router;

