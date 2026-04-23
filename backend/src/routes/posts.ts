import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { recordPeerFeedback } from "../lib/aimV2";
import { microRecalcQueue } from "../lib/aimQueue";
import { recomputeAIMScore } from "../lib/aimV2";
import { onPostCreated, onPostDeleted } from "../lib/domainScoreService";
import { processPendingEvents } from "../lib/eventProcessor";

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

		const user = await prisma.user.findUnique({ where: { id: userId } });
		const userName = user?.name ?? user?.email?.split("@")[0] ?? "user";

		const post = await prisma.post.create({
			data: { userId, userName, userVerified: false, content: content.trim() }
		});

		onPostCreated({ id: post.id, userId, content: post.content }).catch((err) => {
			console.error("onPostCreated domain classification error", err);
		});

		res.json(post);
	} catch (err: any) {
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

		try {
			await prisma.postReaction.create({ data: { postId, userId, type } });

			const isTrustSignal = type === "confiable" || type === "not_reliable";

			const voter = await prisma.user.findUnique({
				where: { id: userId },
				select: { aimScore: true, aimConfidence: true, aimDomainPrimary: true },
			});

			const author = await prisma.user.findUnique({
				where: { id: authorUserId },
				select: { aimDomainPrimary: true },
			});

			if (isTrustSignal) {
				const diversity =
					voter?.aimDomainPrimary &&
					author?.aimDomainPrimary &&
					voter.aimDomainPrimary === author?.aimDomainPrimary
						? "same"
						: "different";

				await recordPeerFeedback({
					targetId: authorUserId,
					voterId: userId,
					postId,
					type: type === "not_reliable" ? "dispute" : "endorsement",
					domain: author?.aimDomainPrimary ?? undefined,
					aimVoter: voter?.aimScore ?? 0.5,
					aimVoterConfidence: Number(voter?.aimConfidence ?? 0),
					networkDistance: 3,
					diversity,
				});

				microRecalcQueue.enqueue(authorUserId, async () => {
					await recomputeAIMScore(authorUserId, author?.aimDomainPrimary ?? undefined);
				});
			}

			if (isTrustSignal) {
				await prisma.event.create({
					data: {
						type: "peer_feedback",
						userId: authorUserId,
						payload: {
							postId,
							postCreatedAt: post.createdAt,
							postUserId: authorUserId,
							voterId: userId,
							voterAimScore: voter?.aimScore ?? 0.5,
							voterAimConfidence: Number(voter?.aimConfidence ?? 0.5),
							voterVerified: post.userVerified,
							isPositive: type === "confiable",
						},
					},
				});

				processPendingEvents().catch((err: any) => {
					console.error("processPendingEvents error", err);
				});
			}

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
		console.error("POST /api/posts/:id/react error", err);
		res.status(500).json({ error: err?.message || "Internal server error" });
	}
});

// DELETE /api/posts/:id - delete a post (protected, owner only)
router.delete("/:id", requireAuth, async (req, res) => {
	try {
		const userId = req.userId as string;
		const postId = Number(req.params.id);

		if (!postId) return res.status(400).json({ error: "Invalid post id" });

		const post = await prisma.post.findUnique({ where: { id: postId } });
		if (!post) return res.status(404).json({ error: "Post not found" });
		if (post.userId !== userId) return res.status(403).json({ error: "Forbidden" });

		await onPostDeleted(postId).catch((err) => {
			console.error("onPostDeleted domain error", err);
		});

		await prisma.post.delete({ where: { id: postId } });
		return res.json({ ok: true });
	} catch (err: any) {
		console.error("DELETE /api/posts/:id error", err);
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
		console.error("POST /api/posts/:id/comments error", err);
		res.status(500).json({ error: err?.message || "Internal server error" });
	}
});

export default router;