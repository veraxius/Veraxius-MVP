import { prisma } from "../config/prisma";

type AimEventType = "success" | "contradiction" | "decay";

const AIM_SCORING_CONFIG = {
  weightsByType: {
    success: 1.0,
    contradiction: -1.0,
    decay: -0.2,
  } as Record<AimEventType, number>,
  decayHalfLifeDays: 14,
  recentWindowDays: 90,
};

function getDecayFactor(since: Date, now: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = (now.getTime() - since.getTime()) / msPerDay;
  const halfLife = AIM_SCORING_CONFIG.decayHalfLifeDays;

  if (halfLife <= 0) return 1;

  return Math.pow(0.5, days / halfLife);
}

export async function createAimEvent(
  userId: string,
  type: AimEventType,
  value: number,
  context?: string
) {
  const event = await prisma.aimEvent.create({
    data: {
      userId,
      eventType: type,
      delta: value,
      weight: 1,
      contextWeight: 1,
      metadata: context ? { context } : {},
    },
  });

  await calculateAimScore(userId);

  return event;
}

export async function calculateAimScore(userId: string) {
  const now = new Date();

  const from = new Date(
    now.getTime() -
      AIM_SCORING_CONFIG.recentWindowDays * 24 * 60 * 60 * 1000
  );

  const events = await prisma.aimEvent.findMany({
    where: {
      userId,
      createdAt: { gte: from },
    },
    orderBy: { createdAt: "asc" },
  });

  let score = 0;

  for (const ev of events) {
    const weight =
      AIM_SCORING_CONFIG.weightsByType[ev.eventType as AimEventType] ?? 0;

    const decay = getDecayFactor(ev.createdAt, now);

    score += ev.delta * weight * decay;
  }

  // STATUS
  let aimStatus: "increasing" | "decreasing" | "decaying" | "stable" =
    "stable";

  if (events.length > 0) {
    const lastEventAt = events[events.length - 1].createdAt;

    const recencyDays =
      (now.getTime() - lastEventAt.getTime()) /
      (24 * 60 * 60 * 1000);

    if (recencyDays > AIM_SCORING_CONFIG.decayHalfLifeDays) {
      aimStatus = "decaying";
    } else if (score > 0) {
      aimStatus = "increasing";
    } else if (score < 0) {
      aimStatus = "decreasing";
    }
  }

  const [user] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        aimScore: score,
        aimStatus,
      },
    }),
    prisma.aimScoreHistory.create({
      data: {
        userId,
        score,
        context: "recalculated",
      },
    }),
  ]);

  return {
    user,
    score,
    status: aimStatus,
    events,
  };
}

export async function createChallenge(
  targetUserId: string,
  challengerId: string
) {
  const challenge = await prisma.aimChallenge.create({
    data: {
      targetUserId,
      challengerId,
      status: "pending",
      reason: "challenge_opened",
      severity: 1,
    },
  });

  // impacto temporal negativo (clave para AIM real)
  await createAimEvent(targetUserId, "contradiction", 1, "challenge");

  return challenge;
}