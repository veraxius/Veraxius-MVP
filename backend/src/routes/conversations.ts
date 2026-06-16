import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { zUuid, invalidPayload, internalError } from "../lib/validation";

const router = Router();

router.use(requireAuth);

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
