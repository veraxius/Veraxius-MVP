module.exports = {
  // ─── Core formula constants ──────────────────────────────────────────────
  baseScore: 0.50,          // All new users start neutral (displayed as 0.50%)
  maxScore: 100,            // Score ceiling (displayed as 100.00%)
  recencyLambda: 0.05,      // Exponential decay: Math.exp(-lambda * daysSince)

  // Score deltas scaled ×10 vs original spec (0.025 → 0.25, 0.02 → 0.20, etc.)
  deltaScale: 10,

  // ─── Context Weight ──────────────────────────────────────────────────────
  // contextWeight = clamp(stakeLevel × roleWeight × platformVerification, 0.75, 1.35)
  contextWeights: {
    stakeLevel: {
      high:     1.20,   // High-stakes claims (financial, health, legal)
      standard: 1.00,   // Default context
      low:      0.80,   // Low-stakes or casual claims
    },
    roleWeight: {
      advisor:  1.30,   // Domain expert / advisor
      creator:  1.20,   // Content creator
      peer:     1.00,   // Regular peer
      observer: 0.90,   // Passive observer
    },
    platformVerification: {
      verified:     1.20,  // Identity-verified account
      selfReported: 0.80,  // Self-declared info
      none:         1.00,  // No special verification
    },
  },
  contextClamp: { min: 0.75, max: 1.35 },

  // ─── Voter Tier Multipliers ──────────────────────────────────────────────
  // Determines how much weight a peer vote carries based on voter's AIM + confidence.
  // Applied as a multiplier to rawDelta BEFORE confidenceMultiplier and antiAbuse.
  voterTiers: {
    // Tier 1 — High Authority: both score AND confidence above threshold → full weight
    tier1: { minAim: 0.75, minConfidence: 0.75, multiplier: 1.00 },
    // Tier 2 — Standard: mid-range score → 70% weight
    tier2: { minAim: 0.40, multiplier: 0.70 },
    // Tier 3 — New / Low Trust: score below 0.40 → 10–50% weight (linear scale)
    tier3: { multiplierMin: 0.10, multiplierMax: 0.50, aimMax: 0.40 },
  },

  // ─── Confidence Multiplier ───────────────────────────────────────────────
  // confidenceMultiplier = 0.5 + 0.5 × userConfidence  → range [0.5, 1.0]
  confidence: {
    signalsCap: 80,       // # signals to saturate signalsFactor (logarithmic)
    typesCap: 5,          // # distinct event types to saturate typesFactor
    verificationBonus: {
      none:     1.00,
      email:    1.20,
      identity: 1.50,
    },
    minPublicThreshold: 0.15,
    multiplier: { base: 0.5, span: 0.5 },  // 0.5 + 0.5 × voterScore

    // ── Non-linear confidence scaling ──────────────────────────────────────
    earlySignalThreshold: 10,
    earlySignalCap:       0.18,

    frictionWindow: 45,

    // Recovery Damping: after a significant failure (delta < -0.20), positive
    // signals only restore recoveryDamping fraction of what they normally would.
    recoveryDamping:      0.50,
    recoveryFailureThreshold: -0.20,

    multiDomainBonus:     0.05,
    multiDomainBonusCap:  1.20,
  },

  // ─── Anti-Abuse Multipliers ──────────────────────────────────────────────
  antiAbuse: {
    normal:      1.0,
    mild:        0.75,
    strong:      0.4,
    coordinated: 0.1,
  },

  // ─── Core Variable Weights ───────────────────────────────────────────────
  variableWeights: {
    reliability:    1.0,
    consistency:    1.0,
    peer_validation: 1.0,
    contradiction:  1.0,
    decay:          1.0,
  },

  // ─── Variable 1: Reliability ─────────────────────────────────────────────
  reliability: {
    baseMultiplier:         1.0,   // was 0.10 (×10)
    streakBonusMultiplier:  1.3,
    streakPenaltyMultiplier: 1.5,
    streakBonusWindow:      5,
    streakPenaltyWindow:    3,
    verifiedBoost:          1.5,   // was 0.15 (×10)
  },

  // ─── Variable 2: Consistency ─────────────────────────────────────────────
  consistency: {
    weeklyCronHourUTC: 3,
    breakPenaltyA: -0.40,   // was -0.04
    matchBonusA:   +0.20,   // was +0.02
    breakPenaltyB: -0.30,   // was -0.03
    breakPenaltyC: -0.50,   // was -0.05
    breakPenaltyD: -0.20,   // was -0.02
    matchBonusD:   +0.20,   // was +0.02
  },

  // ─── Variable 3: Peer Validation ─────────────────────────────────────────
  peerValidation: {
    rawDeltaEndorsement:  +0.25,  // was +0.025
    rawDeltaDispute:      -0.25,  // was -0.025

    networkDistanceFactor: {
      direct: 0.60,
      second: 1.00,
      none:   1.30,
    },

    diversityFactor: {
      same:      0.80,
      different: 1.10,
    },

    maxReceivedVotes24h:  20,
    voteCooldownDays:     7,

    coordinationWindowHours: 2,
    coordinationBurst: {
      mild:     4,
      strong:   6,
      critical: 8,
    },
  },

  // ─── Variable 4: Contradiction ───────────────────────────────────────────
  contradiction: {
    level1: { provisional: -0.20 },   // was -0.02
    level2: { provisional: -0.40 },   // was -0.04
    level3: { provisional: -0.70 },   // was -0.07

    resolved: {
      upheld:   { deepenBy: -0.10 },          // was -0.01
      dismissed: { reversePercent: 1.00 },
      mixed:    { reversePercentMin: 0.30, reversePercentMax: 0.60 },
      maliciousByAccuser: { penalizeAccuser: -0.30 },  // was -0.03
    },
  },

  // ─── Variable 5: Decay ───────────────────────────────────────────────────
  decay: {
    inactivityThresholdDays: 7,

    baseDailyRate: 0.02,    // was 0.002

    timeMultipliers: [
      { maxDays: 7,        multiplier: 0.0  },
      { maxDays: 30,       multiplier: 0.75 },
      { maxDays: 60,       multiplier: 2.0  },
      { maxDays: 90,       multiplier: 3.75 },
      { maxDays: Infinity, multiplier: 5.0  },
    ],

    qualityShieldCap: 0.80,
    decayFloorFactor: 0.30,
    minFloor: 0.10,
    severeNegativeThreshold: -0.50,  // was -0.05 (domain decay skip)
  },

  // ─── Domain thresholds & global blend ───────────────────────────────────
  domain: {
    minInteractions: 5,
    minConfidence:   0.15,
    globalBlend: {
      generalWeight:        0.75,
      domainCompositeWeight: 0.25,
    },
    trustVoteRawDelta: 0.25,  // was 0.025 (domain trust votes)
    domainDecayBaseRate: 0.02, // was 0.002
  },

  // ─── Direct post reaction bump (posts route increment) ─────────────────
  postTrustReactionIncrement: 0.20,  // was 0.02

  // ─── Ranking score ───────────────────────────────────────────────────────
  rankingBlend: { base: 0.55, boost: 0.45 },
};
