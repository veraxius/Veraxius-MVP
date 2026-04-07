module.exports = {
  // Base score and recency
  baseScore: 0.50,
  recencyLambda: 0.05,

  // Context weight and clamp
  contextWeights: {
    stakeLevel: { high: 2.0, standard: 1.0, low: 0.3 },
    roleWeight: { advisor: 1.5, creator: 1.5, peer: 1.0, observer: 0.6 },
    platformVerification: { verified: 1.2, selfReported: 0.7, none: 1.0 },
  },
  contextClamp: { min: 0.75, max: 1.35 },

  // Confidence and multiplier
  confidence: {
    signalsCap: 80,
    typesCap: 5,
    verificationBonus: { none: 1.0, email: 1.2, identity: 1.5 },
    minPublicThreshold: 0.15,
    multiplier: { base: 0.5, span: 0.5 }, // 0.5 + 0.5*confidence
  },

  // Anti‑abuse multipliers
  antiAbuse: {
    normal: 1.0,
    mild: 0.75,
    strong: 0.4,
    coordinated: 0.1,
  },

  // Core variable weights
  variableWeights: {
    reliability: 1.0,
    consistency: 1.0,
    peer_validation: 1.0,
    contradiction: 1.0,
    decay: 1.0,
  },

  // Reliability
  reliability: {
    baseMultiplier: 0.10,
    streakBonusMultiplier: 1.3,
    streakPenaltyMultiplier: 1.5,
    streakBonusWindow: 5,
    streakPenaltyWindow: 3,
    verifiedBoost: 0.15,
  },

  // Consistency granular
  consistency: {
    weeklyCronHourUTC: 3,
    breakPenaltyA: -0.04,
    matchBonusA: 0.02,
    breakPenaltyB: -0.03,
    breakPenaltyC: -0.05,
    breakPenaltyD: -0.02,
    matchBonusD: 0.02,
  },

  // Peer Validation
  peerValidation: {
    networkDistanceFactor: { direct: 0.6, second: 1.0, none: 1.3 },
    diversityFactor: { same: 0.8, different: 1.1 },
    maxReceivedVotes24h: 20,
    voteCooldownDays: 7,
    coordinationWindowHours: 2,
    coordinationMinVotes: 5,
    coordinationNetworkDistance: 1,
  },

  // Contradiction penalties
  contradiction: {
    level1: { provisional: -0.02 },
    level2: { provisional: -0.04 },
    level3: { provisional: -0.07 },
    resolved: {
      upheld: { keep: true, deepenBy: -0.01 },
      dismissed: { reversePercent: 1.0 },
      mixed: { reversePercentMin: 0.3, reversePercentMax: 0.6 },
      maliciousByAccuser: { penalizeAccuser: -0.03 },
    },
  },

  // Decay
  decay: {
    baseDailyRate: 0.002,
    timeMultipliers: [
      { maxDays: 7, multiplier: 0.5 },
      { maxDays: 30, multiplier: 1.0 },
      { maxDays: 90, multiplier: 1.5 },
      { maxDays: Infinity, multiplier: 2.0 },
    ],
    decayFloorFactor: 0.3,
    minFloor: 0.10,
    qualityShieldCap: 0.85,
  },

  // Domain thresholds and global blend
  domain: {
    minInteractions: 5,
    minConfidence: 0.2,
    globalBlend: { generalWeight: 0.75, domainCompositeWeight: 0.25 },
  },

  // Ranking blend
  rankingBlend: { base: 0.55, boost: 0.45 },
};

