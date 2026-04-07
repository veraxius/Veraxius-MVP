import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { createAimEvent } from "../lib/aim";

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
		const existing = await prisma.postReaction.findUnique({
			where: { postId_userId_type: { postId, userId, type } }
		});
		if (existing) {
			await prisma.postReaction.delete({ where: { id: existing.id } });
			// Reverse AIM impact when toggling off
			if (type === "confiable") {
				await createAimEvent(authorUserId, "success", -0.05, "reaction:reliable:off");
			} else if (type === "not_reliable") {
				await createAimEvent(authorUserId, "contradiction", +0.05, "reaction:not_reliable:off");
			}
			return res.json({ toggled: "off" });
		}
		await prisma.postReaction.create({ data: { postId, userId, type } });
		// Apply AIM impact when toggling on
		if (type === "confiable") {
			await createAimEvent(authorUserId, "success", +0.05, "reaction:reliable:on");
		} else if (type === "not_reliable") {
			await createAimEvent(authorUserId, "contradiction", -0.05, "reaction:not_reliable:on");
		}
		return res.json({ toggled: "on" });
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
		const userName = user?.email?.split("@")[0] ?? "user";
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

