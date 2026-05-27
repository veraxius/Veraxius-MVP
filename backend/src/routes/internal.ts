import { Router } from "express";
import { applyDecayToAllUsers } from "../lib/aimV2";
import { verifyCronSecret } from "../lib/cronSecret";

const router = Router();

router.post("/cron/decay", async (req, res) => {
	if (!verifyCronSecret(req.header("x-cron-secret"))) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	try {
		const summary = await applyDecayToAllUsers();
		return res.json({ ok: true, ...summary });
	} catch (err) {
		console.error("POST /internal/cron/decay", err);
		return res.status(500).json({ error: "Internal server error" });
	}
});

export default router;
