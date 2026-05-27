import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { recordPeerFeedback } from "../lib/aimV2";
import { onPostCreated, onPostDeleted } from "../lib/domainScoreService";
import { processPendingEvents } from "../lib/eventProcessor";
import { zContent, invalidPayload, internalError } from "../lib/validation";

const router = Router();

const CreatePostSchema = z.object({
  content: zContent,
});

const ReactSchema = z.object({
  type: z.enum(["util", "confiable", "not_reliable"]),
});

const CommentSchema = z.object({
  content: zContent,
});

const PostIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

router.get("/", async (_req, res) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        reactions: true,
        comments: { orderBy: { createdAt: "asc" } },
      },
    });

    return res.json(posts);
  } catch (err) {
    return internalError(res, err, "GET /api/posts");
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const parsed = CreatePostSchema.safeParse(req.body);
    if (!parsed.success) return invalidPayload(res);

    const userId = req.userId as string;
    const content = parsed.data.content.trim();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const userName = user?.name ?? user?.email?.split("@")[0] ?? "user";

    const post = await prisma.post.create({
      data: {
        userId,
        userName,
        userVerified: false,
        content,
      },
    });

    onPostCreated({ id: post.id, userId, content: post.content }).catch((err) => {
      console.error("onPostCreated domain classification error", err);
    });

    return res.json(post);
  } catch (err) {
    return internalError(res, err, "POST /api/posts");
  }
});

router.post("/:id/react", requireAuth, async (req, res) => {
  try {
    const params = PostIdParamsSchema.safeParse(req.params);
    const body = ReactSchema.safeParse(req.body);
    if (!params.success || !body.success) return invalidPayload(res);

    const userId = req.userId as string;
    const postId = params.data.id;
    const { type } = body.data;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const authorUserId = post.userId;
    const isTrustSignal = type === "confiable" || type === "not_reliable";

    const existing = await prisma.postReaction.findUnique({
      where: {
        postId_userId_type: {
          postId,
          userId,
          type,
        },
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.postReaction.delete({
        where: { id: existing.id },
      });

      if (isTrustSignal) {
        await prisma.user.update({
          where: { id: authorUserId },
          data: {
            aimScore: {
              increment: type === "confiable" ? -0.02 : 0.02,
            },
          },
        });
      }

      return res.json({ toggled: "off" });
    }

    await prisma.postReaction.create({
      data: {
        postId,
        userId,
        type,
      },
    });

    if (isTrustSignal) {
      const voter = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          aimScore: true,
          aimConfidence: true,
          aimDomainPrimary: true,
        },
      });

      const author = await prisma.user.findUnique({
        where: { id: authorUserId },
        select: { aimDomainPrimary: true },
      });

      const diversity =
        voter?.aimDomainPrimary &&
        author?.aimDomainPrimary &&
        voter.aimDomainPrimary === author.aimDomainPrimary
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

      await processPendingEvents();

      await prisma.user.update({
        where: { id: authorUserId },
        data: {
          aimScore: {
            increment: type === "confiable" ? 0.02 : -0.02,
          },
        },
      });
    }

    return res.json({ toggled: "on" });
  } catch (err) {
    return internalError(res, err, "POST /api/posts/:id/react");
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const params = PostIdParamsSchema.safeParse(req.params);
    if (!params.success) return invalidPayload(res);

    const userId = req.userId as string;
    const postId = params.data.id;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.userId !== userId) return res.status(403).json({ error: "Forbidden" });

    await onPostDeleted(postId).catch((err) => {
      console.error("onPostDeleted domain error", err);
    });

    await prisma.post.delete({ where: { id: postId } });

    return res.json({ ok: true });
  } catch (err) {
    return internalError(res, err, "DELETE /api/posts/:id");
  }
});

router.post("/:id/comments", requireAuth, async (req, res) => {
  try {
    const params = PostIdParamsSchema.safeParse(req.params);
    const body = CommentSchema.safeParse(req.body);
    if (!params.success || !body.success) return invalidPayload(res);

    const userId = req.userId as string;
    const postId = params.data.id;
    const content = body.data.content.trim();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const userName = user?.name ?? user?.email?.split("@")[0] ?? "user";

    const comment = await prisma.comment.create({
      data: {
        postId,
        userId,
        userName,
        content,
      },
    });

    return res.json(comment);
  } catch (err) {
    return internalError(res, err, "POST /api/posts/:id/comments");
  }
});

export default router;
