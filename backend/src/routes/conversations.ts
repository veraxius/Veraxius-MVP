import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Protect all routes
router.use(requireAuth);

// GET /api/conversations - list conversations for user with participants and last message
router.get("/", async (req, res) => {
	try {
		const userId = req.userId as string;
		const conversations = await prisma.conversation.findMany({
			where: {
				participants: { some: { userId } }
			},
			include: {
				participants: { include: { user: true } },
				messages: { orderBy: { created_at: "desc" }, take: 1 }
			},
			orderBy: { created_at: "desc" }
		});
		return res.json(conversations);
	} catch (err: any) {
		// eslint-disable-next-line no-console
		console.error("List conversations error:", err);
		return res.status(500).json({ error: err?.message || "Internal server error" });
	}
});

// GET /api/conversations/:id/messages - history
router.get("/:id/messages", async (req, res) => {
	try {
		const userId = req.userId as string;
		const conversationId = req.params.id;
		// ensure participation
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
	} catch (err: any) {
		// eslint-disable-next-line no-console
		console.error("Messages error:", err);
		return res.status(500).json({ error: err?.message || "Internal server error" });
	}
});

// POST /api/conversations - create or return existing 1:1
router.post("/", requireAuth, async (req, res) => {
  try {
    const { targetUserId } = req.body as { targetUserId?: string };
    if (!targetUserId) return res.status(400).json({ error: "targetUserId is required" });
    if (targetUserId === req.userId) return res.status(400).json({ error: "Cannot start with yourself" });

    // Buscar conversación existente entre los dos usuarios
    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: req.userId as string } } },
          { participants: { some: { userId: targetUserId } } }
        ]
      },
      include: {
        participants: { include: { user: { select: { id: true, email: true } } } },
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
        participants: { include: { user: { select: { id: true, email: true } } } },
        messages: { orderBy: { created_at: "desc" }, take: 1 }
      }
    });

    return res.json(conversation);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("Create conversation error:", err);
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

export default router;
