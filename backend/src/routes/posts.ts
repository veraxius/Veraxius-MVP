import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { recordPeerFeedback } from "../lib/aimV2";
import { onPostCreated, onPostDeleted } from "../lib/domainScoreService";
import { processPendingEvents } from "../lib/eventProcessor";
import { zContent, invalidPayload, internalError } from "../lib/validation";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AIMCFG = require("../../aim.config.js");
const POST_TRUST_DELTA = AIMCFG.postTrustReactionIncrement ?? 0.2;
const AIM_MAX_SCORE: number = AIMCFG.maxScore ?? 100;

async function bumpAuthorAimScore(authorUserId: string, delta: number) {
  const user = await prisma.user.findUnique({
    where: { id: authorUserId },
    select: { aimScore: true },
  });
  if (!user) return;

  const next = Math.min(AIM_MAX_SCORE, Math.max(0, user.aimScore + delta));
  await prisma.user.update({
    where: { id: authorUserId },
    data: { aimScore: next },
  });
}

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

async function enrichPostsWithAvatars<
  T extends { userId: string; comments?: { userId: string }[] },
>(posts: T[]) {
  const userIds = new Set<string>();
  for (const post of posts) {
    userIds.add(post.userId);
    for (const comment of post.comments ?? []) {
      userIds.add(comment.userId);
    }
  }

  if (userIds.size === 0) {
    return posts.map((p) => ({
      ...p,
      userProfilePictureUrl: null as string | null,
      comments: (p.comments ?? []).map((c) => ({
        ...c,
        userProfilePictureUrl: null as string | null,
      })),
    }));
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [...userIds] } },
    select: { id: true, profilePictureUrl: true },
  });
  const urlByUserId = new Map(users.map((u) => [u.id, u.profilePictureUrl]));

  return posts.map((p) => ({
    ...p,
    userProfilePictureUrl: urlByUserId.get(p.userId) ?? null,
    comments: (p.comments ?? []).map((c) => ({
      ...c,
      userProfilePictureUrl: urlByUserId.get(c.userId) ?? null,
    })),
  }));
}

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

    return res.json(await enrichPostsWithAvatars(posts));
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

    return res.json({
      ...post,
      userProfilePictureUrl: user?.profilePictureUrl ?? null,
    });
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
        await bumpAuthorAimScore(
          authorUserId,
          type === "confiable" ? -POST_TRUST_DELTA : POST_TRUST_DELTA,
        );
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

      await bumpAuthorAimScore(
        authorUserId,
        type === "confiable" ? POST_TRUST_DELTA : -POST_TRUST_DELTA,
      );
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

    return res.json({
      ...comment,
      userProfilePictureUrl: user?.profilePictureUrl ?? null,
    });
  } catch (err) {
    return internalError(res, err, "POST /api/posts/:id/comments");
  }
});

export default router;
