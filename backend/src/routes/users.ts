import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

// GET /api/users/search?q=
router.get("/search", async (req, res) => {
	try {
		const q = String(req.query.q || "").trim();
		const userId = req.userId as string;
		if (!q) return res.json([]);
		const users = await prisma.user.findMany({
			where: {
				email: { contains: q, mode: "insensitive" },
				NOT: { id: userId }
			},
			select: { id: true, email: true },
			take: 10
		});
		return res.json(users);
	} catch (err: any) {
		// eslint-disable-next-line no-console
		console.error("User search error:", err);
		return res.status(500).json({ error: err?.message || "Internal server error" });
	}
});

export default router;
