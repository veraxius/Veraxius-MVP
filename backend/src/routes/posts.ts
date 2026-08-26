import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { recordPeerFeedback } from "../lib/aimV2";
import { onPostCreated, onPostDeleted } from "../lib/domainScoreService";
import { processPendingEvents } from "../lib/eventProcessor";
import { zContent, invalidPayload, internalError } from "../lib/validation";

const ALLOWED_POST_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_POST_IMAGE_SIZE = 8 * 1024 * 1024;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const postImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_POST_IMAGE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_POST_IMAGE_MIME.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("Invalid file type"));
  },
});

function uploadPostImageToCloudinary(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "veraxius/posts",
        transformation: { width: 1600, height: 1600, crop: "limit" },
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

function handlePostImageUpload(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
) {
  postImageUpload.single("image")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "Image too large" });
      }
      return res.status(400).json({ error: "Upload failed" });
    }
    if (err) {
      return res.status(400).json({ error: "Invalid file type" });
    }
    return next();
  });
}

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
  content: z.string().max(10_000),
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

router.post("/", requireAuth, handlePostImageUpload, async (req, res) => {
  try {
    const parsed = CreatePostSchema.safeParse(req.body);
    if (!parsed.success) return invalidPayload(res);

    const userId = req.userId as string;
    const content = parsed.data.content.trim();

    if (!content && !req.file) return invalidPayload(res);

    let imageUrl: string | null = null;
    if (req.file) {
      if (
        !process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET
      ) {
        return res.status(500).json({ error: "Upload service not configured" });
      }
      imageUrl = await uploadPostImageToCloudinary(req.file.buffer);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const userName = user?.name ?? user?.email?.split("@")[0] ?? "user";

    const post = await prisma.post.create({
      data: {
        userId,
        userName,
        userVerified: false,
        content,
        imageUrl,
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

    try {
      await prisma.postReaction.create({
        data: {
          postId,
          userId,
          type,
        },
      });
    } catch (err) {
      // A double-click / duplicate request can race past the findUnique
      // check above. The reaction already exists in that case — treat it
      // as a no-op instead of a 500.
      const isDuplicate =
        err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002";
      if (!isDuplicate) throw err;
      return res.json({ toggled: "on" });
    }

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
