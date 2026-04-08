/* eslint-disable no-console */
import "dotenv/config";
import { prisma } from "../config/prisma";
import {
  recordOutcome,
  recordPeerFeedback,
  openChallenge,
  resolveChallenge,
  applyDecayToAllUsers,
  recomputeAIMScore,
} from "../lib/aimV2";

type UserIds = { target: string; voters: string[] };

async function ensureUser(email: string, name?: string) {
  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) return existing.id;
  const u = await prisma.user.create({
    data: { email, password: "hashed", name },
  });
  return u.id;
}

async function setupUsers(prefix: string, voterCount: number): Promise<UserIds> {
  const target = await ensureUser(`${prefix}.target@sim.local`, `${prefix}-target`);
  const voters: string[] = [];
  for (let i = 0; i < voterCount; i++) {
    voters.push(await ensureUser(`${prefix}.v${i}@sim.local`, `${prefix}-v${i}`));
  }
  return { target, voters };
}

async function resetUserData(userId: string) {
  await prisma.$transaction([
    prisma.aimEvent.deleteMany({ where: { userId } }),
    prisma.aimOutcome.deleteMany({ where: { userId } }),
    prisma.aimConsistency.deleteMany({ where: { userId } }),
    prisma.aimDomainScore.deleteMany({ where: { userId } }),
    prisma.aimFlag.deleteMany({ where: { userId } }),
    prisma.aimScoreHistory.deleteMany({ where: { userId } }),
    prisma.user.update({ where: { id: userId }, data: { aimScore: 0.5, aimConfidence: null, lastActiveAt: null } }),
  ]);
}

async function logState(label: string, userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  console.log(label, { aim: u?.aimScore, confidence: u?.aimConfidence?.toString() });
}

async function scenario1() {
  console.log("\nScenario 1: New user, good start, low confidence");
  const { target, voters } = await setupUsers("s1", 3);
  await resetUserData(target);
  await recomputeAIMScore(target); // start at base 0.50
  await logState("Start", target);
  // 3 successful outcomes (quality high, unverified)
  for (let i = 0; i < 3; i++) {
    await recordOutcome(target, `s1-outcome-${i}`, 0.9, undefined, "general", { stakeLevel: "standard", roleWeight: "peer", platformVerification: "none" });
  }
  await recomputeAIMScore(target);
  await logState("After 3 outcomes", target);
  // 2 endorsements from credible users (simulate aim voter 0.7, distance none=3, diversity different)
  for (let i = 0; i < 2; i++) {
    await recordPeerFeedback({
      targetId: target,
      voterId: voters[i],
      type: "endorsement",
      domain: "general",
      aimVoter: 0.7,
      networkDistance: 3,
      diversity: "different",
    });
  }
  await recomputeAIMScore(target);
  await logState("After endorsements", target);
}

async function scenario2() {
  console.log("\nScenario 2: Strong operator long-term reliability");
  const { target } = await setupUsers("s2", 0);
  await resetUserData(target);
  // seed starting score ~0.74 by outcomes
  for (let i = 0; i < 8; i++) {
    await recordOutcome(target, `s2-seed-${i}`, 0.85, "system", "general", { stakeLevel: "standard", roleWeight: "creator", platformVerification: "verified" });
  }
  await recomputeAIMScore(target);
  await logState("Start (seeded)", target);
  // 12 strong outcomes across 45 days (we won't backdate; rely on formula to raise)
  for (let i = 0; i < 12; i++) {
    await recordOutcome(target, `s2-run-${i}`, 0.9, "system", "general", { stakeLevel: "standard", roleWeight: "creator", platformVerification: "verified" });
  }
  await recomputeAIMScore(target);
  await logState("After new outcomes", target);
  // consistency cycle (emit match via alignment)
  await prisma.user.update({ where: { id: target }, data: { aimDomainPrimary: "general" } });
  await recomputeAIMScore(target, "general");
  await logState("After consistency cycle", target);
}

async function scenario3() {
  console.log("\nScenario 3: Flashy endorsements (gaming)");
  const { target, voters } = await setupUsers("s3", 10);
  await resetUserData(target);
  await recomputeAIMScore(target);
  await logState("Before burst", target);
  // 8 endorsements in 90min, distance=1, diversity same -> coordinated
  for (let i = 0; i < 8; i++) {
    await recordPeerFeedback({
      targetId: target,
      voterId: voters[i],
      type: "endorsement",
      domain: "general",
      aimVoter: 0.8,
      networkDistance: 1,
      diversity: "same",
    });
  }
  await recomputeAIMScore(target);
  await logState("After coordinated endorsements", target);
}

async function scenario4() {
  console.log("\nScenario 4: One bad failure");
  const { target } = await setupUsers("s4", 0);
  await resetUserData(target);
  // Good history
  for (let i = 0; i < 10; i++) {
    await recordOutcome(target, `s4-good-${i}`, 0.9, "system", "general", { platformVerification: "verified", roleWeight: "creator", stakeLevel: "standard" });
  }
  await recomputeAIMScore(target);
  await logState("Before failure", target);
  // verified failed outcome (quality low + verifiedBy to ensure impact)
  await recordOutcome(target, "s4-fail", 0.1, "system", "general", { platformVerification: "verified", roleWeight: "creator", stakeLevel: "standard" });
  await recomputeAIMScore(target);
  await logState("After failure", target);
  // two later recoveries
  await recordOutcome(target, "s4-rec1", 0.9, "system", "general", { platformVerification: "verified", roleWeight: "creator", stakeLevel: "standard" });
  await recordOutcome(target, "s4-rec2", 0.9, "system", "general", { platformVerification: "verified", roleWeight: "creator", stakeLevel: "standard" });
  await recomputeAIMScore(target);
  await logState("After 2 later successful recoveries", target);
}

async function scenario5() {
  console.log("\nScenario 5: Severe contradiction upheld (L3)");
  const { target, voters } = await setupUsers("s5", 1);
  await resetUserData(target);
  // some baseline
  await recordOutcome(target, "s5-ok", 0.8, "system", "general", { platformVerification: "verified" });
  await recomputeAIMScore(target);
  await logState("Before challenge", target);
  // open L3
  const ch = await openChallenge(voters[0], target, "severe", 3);
  await recomputeAIMScore(target);
  await logState("On openChallenge", target);
  // upheld
  await resolveChallenge(ch.id, "negative");
  await recomputeAIMScore(target);
  await logState("On upheld resolution", target);
}

async function scenario6() {
  console.log("\nScenario 6: Dormant credible user");
  const { target } = await setupUsers("s6", 0);
  await resetUserData(target);
  for (let i = 0; i < 12; i++) {
    await recordOutcome(target, `s6-good-${i}`, 0.9, "system", "general", { platformVerification: "verified" });
  }
  await recomputeAIMScore(target);
  await logState("Day 0", target);
  // Simulate 60 days of decay by looping daily decay
  for (const day of [15, 30, 60]) {
    for (let i = 0; i < day; i++) {
      // push lastActiveAt far in the past only once; decay fn uses daysBetween to compute rate; repeat calls accumulate
      await applyDecayToAllUsers();
    }
    await recomputeAIMScore(target);
    await logState(`Day ${day}`, target);
  }
}

// Abuse cases (smoke validation)
async function abuse1_endorsementRing() {
  console.log("\nAbuse 1: Endorsement ring");
  const { target, voters } = await setupUsers("ab1", 5);
  await resetUserData(target);
  for (let week = 0; week < 2; week++) {
    for (const v of voters) {
      await recordPeerFeedback({ targetId: target, voterId: v, type: "endorsement", domain: "general", aimVoter: 0.6, networkDistance: 1, diversity: "same" });
    }
    await recomputeAIMScore(target);
  }
  await logState("After ring activity", target);
}

async function abuse2_highAimCartel() {
  console.log("\nAbuse 2: High-AIM voter cartel");
  const { target, voters } = await setupUsers("ab2", 3);
  await resetUserData(target);
  for (const v of voters) {
    await recordPeerFeedback({ targetId: target, voterId: v, type: "endorsement", domain: "general", aimVoter: 0.95, networkDistance: 2, diversity: "different" });
  }
  await recomputeAIMScore(target);
  await logState("After cartel boost", target);
}

async function abuse3_challengeHarassment() {
  console.log("\nAbuse 3: Contradiction harassment");
  const { target, voters } = await setupUsers("ab3", 3);
  await resetUserData(target);
  // open repeated low-quality challenges
  for (let i = 0; i < 3; i++) {
    const ch = await openChallenge(voters[i], target, "spam", 1);
    // mark malicious accuser on resolve positive
    await resolveChallenge(ch.id, "positive");
    await prisma.aimEvent.create({ data: { userId: voters[i], eventType: "contradiction", signal: "malicious_challenge", delta: -0.03, weight: 1, contextWeight: 1 } });
  }
  await recomputeAIMScore(target);
  await logState("After harassment cycle", target);
}

async function abuse4_selfManufacturedReliability() {
  console.log("\nAbuse 4: Self-manufactured reliability");
  const { target } = await setupUsers("ab4", 0);
  await resetUserData(target);
  for (let i = 0; i < 5; i++) {
    await recordOutcome(target, `ab4-self-${i}`, 0.9, undefined, "general", { platformVerification: "selfReported", stakeLevel: "low", roleWeight: "observer" });
  }
  await recomputeAIMScore(target);
  await logState("After self-reported outcomes", target);
}

async function abuse5_domainFarming() {
  console.log("\nAbuse 5: Domain farming");
  const { target } = await setupUsers("ab5", 0);
  await resetUserData(target);
  for (let i = 0; i < 4; i++) {
    await recordOutcome(target, `ab5-small-${i}`, 0.8, undefined, "finance", { platformVerification: "none", stakeLevel: "low" });
  }
  await recomputeAIMScore(target, "finance");
  const ds = await prisma.aimDomainScore.findUnique({ where: { userId_domain: { userId: target, domain: "finance" } } });
  console.log("DomainScore (finance):", ds);
}

async function abuse6_quietLaundering() {
  console.log("\nAbuse 6: Quiet account laundering");
  const { target, voters } = await setupUsers("ab6", 1);
  await resetUserData(target);
  const ch = await openChallenge(voters[0], target, "maj", 3);
  await resolveChallenge(ch.id, "negative"); // upheld
  await recomputeAIMScore(target);
  for (let i = 0; i < 10; i++) {
    await recordOutcome(target, `ab6-clean-${i}`, 0.9, "system", "general", { platformVerification: "verified" });
  }
  await recomputeAIMScore(target);
  await logState("After clean window", target);
}

async function abuse7_toggleSpam() {
  console.log("\nAbuse 7: Reaction toggling spam");
  const { target, voters } = await setupUsers("ab7", 1);
  await resetUserData(target);
  // Simulate rapid toggles: since our backend is idempotent/create-on-activate, we mimic just one net activation
  for (let i = 0; i < 5; i++) {
    await recordPeerFeedback({ targetId: target, voterId: voters[0], type: "endorsement", domain: "general", aimVoter: 0.6, networkDistance: 2, diversity: "different" });
  }
  await recomputeAIMScore(target);
  await logState("After toggle spam", target);
}

async function abuse8_multiAccountInfluence() {
  console.log("\nAbuse 8: Multi-account influence");
  const { target } = await setupUsers("ab8", 0);
  const voters: string[] = [];
  for (let i = 0; i < 6; i++) voters.push(await ensureUser(`ab8.multi.v${i}@sim.local`, `ab8-mv${i}`));
  await resetUserData(target);
  for (const v of voters) {
    await recordPeerFeedback({ targetId: target, voterId: v, type: "endorsement", domain: "general", aimVoter: 0.2, networkDistance: 3, diversity: "different" });
  }
  await recomputeAIMScore(target);
  await logState("After multi-account wave", target);
}

async function main() {
  await scenario1();
  await scenario2();
  await scenario3();
  await scenario4();
  await scenario5();
  await scenario6();

  await abuse1_endorsementRing();
  await abuse2_highAimCartel();
  await abuse3_challengeHarassment();
  await abuse4_selfManufacturedReliability();
  await abuse5_domainFarming();
  await abuse6_quietLaundering();
  await abuse7_toggleSpam();
  await abuse8_multiAccountInfluence();
}

main().then(() => {
  console.log("\nSimulation complete");
  process.exit(0);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});

