import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { getIO } from "../lib/socket";
import { zUuid, invalidPayload, internalError } from "../lib/validation";

const router = Router();

router.use(requireAuth);

const ALLOWED_MESSAGE_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_MESSAGE_IMAGE_SIZE = 8 * 1024 * 1024;

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

const messageImageUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_MESSAGE_IMAGE_SIZE },
	fileFilter: (_req, file, cb) => {
		if (ALLOWED_MESSAGE_IMAGE_MIME.has(file.mimetype)) {
			cb(null, true);
			return;
		}
		cb(new Error("Invalid file type"));
	},
});

function uploadMessageImageToCloudinary(buffer: Buffer): Promise<string> {
	return new Promise((resolve, reject) => {
		const uploadStream = cloudinary.uploader.upload_stream(
			{
				folder: "veraxius/messages",
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

function handleMessageImageUpload(
	req: import("express").Request,
	res: import("express").Response,
	next: import("express").NextFunction,
) {
	messageImageUpload.single("image")(req, res, (err: unknown) => {
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

const CreateConversationSchema = z.object({
	targetUserId: zUuid,
});

const ConversationIdParamsSchema = z.object({
	id: z.string().min(1).max(64),
});

const participantUserSelect = { id: true, email: true, name: true, profilePictureUrl: true } as const;

router.get("/", async (req, res) => {
	try {
		const userId = req.userId as string;
		const conversations = await prisma.conversation.findMany({
			where: {
				participants: { some: { userId } }
			},
			include: {
				participants: { include: { user: { select: participantUserSelect } } },
				messages: { orderBy: { created_at: "desc" }, take: 1 }
			},
		});

		const conversationIds = conversations.map((c) => c.id);
		const participantReads =
			conversationIds.length === 0
				? []
				: await prisma.conversationParticipant.findMany({
						where: { userId, conversationId: { in: conversationIds } },
						select: { conversationId: true, lastReadAt: true },
					});

		const lastReadByConversation = new Map(
			participantReads.map((p) => [p.conversationId, p.lastReadAt]),
		);

		const unreadCounts = await Promise.all(
			conversations.map(async (c) => {
				const lastReadAt = lastReadByConversation.get(c.id) ?? null;
				const unreadCount = await prisma.message.count({
					where: {
						conversationId: c.id,
						senderId: { not: userId },
						...(lastReadAt
							? { created_at: { gt: lastReadAt } }
							: { status: { in: ["sent", "delivered"] } }),
					},
				});
				return [c.id, unreadCount] as const;
			}),
		);

		const unreadByConversation = new Map(unreadCounts);

		const enriched = conversations
			.map((c) => ({
				...c,
				unreadCount: unreadByConversation.get(c.id) ?? 0,
			}))
			.sort((a, b) => {
				const aTime = a.messages[0]?.created_at ?? a.created_at;
				const bTime = b.messages[0]?.created_at ?? b.created_at;
				return new Date(bTime).getTime() - new Date(aTime).getTime();
			});

		return res.json(enriched);
	} catch (err) {
		return internalError(res, err, "List conversations error:");
	}
});

router.get("/:id/messages", async (req, res) => {
	try {
		const params = ConversationIdParamsSchema.safeParse(req.params);
		if (!params.success) return invalidPayload(res);

		const userId = req.userId as string;
		const conversationId = params.data.id;

		const part = await prisma.conversationParticipant.findFirst({
			where: { conversationId, userId }
		});
		if (!part) return res.status(403).json({ error: "Forbidden" });

		const messages = await prisma.message.findMany({
			where: { conversationId },
			orderBy: { created_at: "asc" },
			take: 50
		});
		return res.json(messages);
	} catch (err) {
		return internalError(res, err, "Messages error:");
	}
});

router.post("/:id/messages/image", handleMessageImageUpload, async (req, res) => {
	try {
		const params = ConversationIdParamsSchema.safeParse(req.params);
		if (!params.success) return invalidPayload(res);

		const userId = req.userId as string;
		const conversationId = params.data.id;

		const part = await prisma.conversationParticipant.findFirst({
			where: { conversationId, userId },
		});
		if (!part) return res.status(403).json({ error: "Forbidden" });

		if (!req.file) {
			return res.status(400).json({ error: "No image file provided" });
		}

		if (
			!process.env.CLOUDINARY_CLOUD_NAME ||
			!process.env.CLOUDINARY_API_KEY ||
			!process.env.CLOUDINARY_API_SECRET
		) {
			return res.status(500).json({ error: "Upload service not configured" });
		}

		const content = typeof req.body?.content === "string" ? req.body.content.trim().slice(0, 10_000) : "";
		const imageUrl = await uploadMessageImageToCloudinary(req.file.buffer);

		const message = await prisma.message.create({
			data: {
				conversationId,
				senderId: userId,
				content,
				imageUrl,
			},
		});

		getIO()?.to(conversationId).emit("new_message", message);

		return res.json(message);
	} catch (err) {
		return internalError(res, err, "POST /api/conversations/:id/messages/image");
	}
});

router.post("/", async (req, res) => {
	try {
		const parsed = CreateConversationSchema.safeParse(req.body);
		if (!parsed.success) return invalidPayload(res);

		const targetUserId = parsed.data.targetUserId;
		if (targetUserId === req.userId) {
			return res.status(400).json({ error: "Cannot start with yourself" });
		}

		const existing = await prisma.conversation.findFirst({
			where: {
				AND: [
					{ participants: { some: { userId: req.userId as string } } },
					{ participants: { some: { userId: targetUserId } } }
				]
			},
			include: {
				participants: { include: { user: { select: participantUserSelect } } },
				messages: { orderBy: { created_at: "desc" }, take: 1 }
			}
		});

		if (existing) return res.json(existing);

		const conversation = await prisma.conversation.create({
			data: {
				participants: {
					create: [{ userId: req.userId as string }, { userId: targetUserId }]
				}
			},
			include: {
				participants: { include: { user: { select: participantUserSelect } } },
				messages: { orderBy: { created_at: "desc" }, take: 1 }
			}
		});

		return res.json(conversation);
	} catch (err) {
		return internalError(res, err, "Create conversation error:");
	}
});

export default router;
