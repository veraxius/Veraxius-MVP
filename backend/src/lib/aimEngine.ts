import { prisma } from "../config/prisma";
import { calculateAimScore, createAimEvent } from "./aim";
import { microRecalcQueue } from "./aimQueue";

export type AimDomain = "general" | "finance" | "tech" | "marketing" | "other";

export type AimSignalInput = {
	type: "success" | "contradiction" | "peer_validation" | "consistency" | "reliability" | "decay";
	value: number;
	domain?: AimDomain;
	context?: string;
};

export type AimBreakdownItem = { label: string; delta: number };

export class AIMEngine {
	async recordSignals(userId: string, signals: AimSignalInput[]) {
		for (const s of signals) {
			// Map signals into AimEvent types used by the low-level engine
			const mappedType =
				s.type === "peer_validation" ? "success" :
				s.type === "consistency" ? "success" :
				s.type === "reliability" ? "success" :
				s.type === "contradiction" ? "contradiction" :
				s.type === "decay" ? "decay" :
				"success";

			await createAimEvent(userId, mappedType, s.value, s.context);
		}

		// Debounced micro-recalc
		microRecalcQueue.enqueue(userId, async () => {
			await calculateAimScore(userId);
		});
	}

	async getSummary(userId: string) {
		const [user, events, history] = await Promise.all([
			prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, aimScore: true, aimStatus: true, created_at: true } }),
			prisma.aimEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
			prisma.aimScoreHistory.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 })
		]);

		const breakdown: AimBreakdownItem[] = [];
		for (const ev of events.slice(0, 10)) {
			const label = `${ev.type}${ev.context ? ` (${ev.context})` : ""}`;
			breakdown.push({ label, delta: ev.value });
		}

		return { user, events, history, breakdown };
	}
}

