import { prisma } from "../config/prisma";
import { onTrustVote, runDomainDecay } from "./domainScoreService";
import { recomputeAIMScore } from "./aimV2";

export async function processPendingEvents(): Promise<void> {
	const events = await prisma.event.findMany({
		where: { status: "pending" },
		orderBy: { createdAt: "asc" },
	});

	for (const event of events) {
		try {
			await prisma.event.update({
				where: { id: event.id },
				data: { status: "processing", error: null },
			});

			switch (event.type) {
				case "peer_feedback":
					await handlePeerFeedback(event.payload);
					break;

				case "score_recompute":
					if (event.userId) {
						await recomputeAIMScore(event.userId);
					}
					break;

				case "decay_trigger":
					await runDomainDecay();
					break;

				default:
					throw new Error(`Unknown event type: ${event.type}`);
			}

			await prisma.event.update({
				where: { id: event.id },
				data: { status: "completed" },
			});
		} catch (err: any) {
			await prisma.event.update({
				where: { id: event.id },
				data: {
					status: "failed",
					error: err?.message || "Unknown error",
				},
			});
		}
	}
}

async function handlePeerFeedback(payload: any): Promise<void> {
	await onTrustVote({
		postId: payload.postId,
		postCreatedAt: new Date(payload.postCreatedAt),
		postUserId: payload.postUserId,
		voterId: payload.voterId,
		voterAimScore: payload.voterAimScore,
		voterAimConfidence: payload.voterAimConfidence,
		voterVerified: payload.voterVerified,
		isPositive: payload.isPositive,
	});
}