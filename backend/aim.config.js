module.exports = {
  // ─── Core formula constants ──────────────────────────────────────────────
  baseScore: 0.50,          // All new users start neutral
  recencyLambda: 0.05,      // Exponential decay: Math.exp(-lambda * daysSince)

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
    // Friction Initial: new accounts are capped at earlySignalCap until they
    // have earlySignalThreshold verified signals (prevents instant authority).
    earlySignalThreshold: 10,   // Signals before early friction lifts
    earlySignalCap:       0.18, // Hard cap during early phase (0.10 → 0.18 range)

    // Compound Consistency: significant jumps (past 0.78) require at least
    // frictionWindow days of account history.
    frictionWindow: 45,         // Days of history required for high-confidence tier

    // Recovery Damping: after a significant failure (delta < -0.02), positive
    // signals only restore recoveryDamping fraction of what they normally would.
    recoveryDamping:      0.50, // 50% recovery rate after failure

    // Multi-Domain Bonus: active in multiple public domains signals depth.
    multiDomainBonus:     0.05, // +5% per extra active domain (after first)
    multiDomainBonusCap:  1.20, // Maximum multiplier from domain breadth
  },

  // ─── Anti-Abuse Multipliers ──────────────────────────────────────────────
  antiAbuse: {
    normal:      1.0,
    mild:        0.75,   // 4+ votes in coordination window
    strong:      0.4,    // 6+ votes in coordination window
    coordinated: 0.1,    // 8+ burst from same cluster
  },

  // ─── Core Variable Weights ───────────────────────────────────────────────
  // variableWeight per AIM master variable (all 1.0 by default, tune as needed)
  variableWeights: {
    reliability:    1.0,
    consistency:    1.0,
    peer_validation: 1.0,
    contradiction:  1.0,
    decay:          1.0,
  },

  // ─── Variable 1: Reliability ─────────────────────────────────────────────
  reliability: {
    baseMultiplier:         0.10,
    streakBonusMultiplier:  1.3,
    streakPenaltyMultiplier: 1.5,
    streakBonusWindow:      5,    // last N outcomes must all be > 0.7
    streakPenaltyWindow:    3,    // last N outcomes must all be < 0.3
    verifiedBoost:          0.15, // extra quality if third-party verified
  },

  // ─── Variable 2: Consistency ─────────────────────────────────────────────
  consistency: {
    weeklyCronHourUTC: 3,
    breakPenaltyA: -0.04,   // latency deviation
    matchBonusA:   +0.02,
    breakPenaltyB: -0.03,   // posting frequency drop
    breakPenaltyC: -0.05,   // vote pattern instability
    breakPenaltyD: -0.02,   // claim-action misalignment
    matchBonusD:   +0.02,   // claim-action alignment
  },

  // ─── Variable 3: Peer Validation ─────────────────────────────────────────
  peerValidation: {
    // rawDelta before multipliers (spec: ±0.025 per vote)
    rawDeltaEndorsement:  +0.025,
    rawDeltaDispute:      -0.025,

    // Network distance factor (low = direct friends, high = strangers; designed to
    // reduce friend-boosting collusion — strangers' votes are slightly higher-weighted)
    networkDistanceFactor: {
      direct: 0.60,   // 1st-degree connection — possible bias
      second: 1.00,   // 2nd-degree — neutral baseline
      none:   1.30,   // No social connection — most objective
    },

    // Domain diversity of voter vs target
    diversityFactor: {
      same:      0.80,   // Same domain — potential echo-chamber
      different: 1.10,   // Cross-domain — more objective signal
    },

    // Rate limits
    maxReceivedVotes24h:  20,  // Max peer_validation events per user per 24h
    voteCooldownDays:     7,   // Same voter can't vote on same target within 7d

    // Anti-coordination thresholds (votes received in coordinationWindowHours)
    coordinationWindowHours: 2,
    coordinationBurst: {
      mild:     4,   // mild suspicion  → antiAbuse 0.75
      strong:   6,   // strong suspicion → antiAbuse 0.4
      critical: 8,   // coordinated burst → antiAbuse 0.1
    },
  },

  // ─── Variable 4: Contradiction ───────────────────────────────────────────
  contradiction: {
    level1: { provisional: -0.02 },   // L1 — minor challenge
    level2: { provisional: -0.04 },   // L2 — moderate challenge
    level3: { provisional: -0.07 },   // L3 — severe challenge (+ public flag)

    resolved: {
      upheld:   { deepenBy: -0.01 },          // Validated: provisional + deepen
      dismissed: { reversePercent: 1.00 },     // Reversed: 100% of provisional undone
      mixed:    { reversePercentMin: 0.30, reversePercentMax: 0.60 },
      maliciousByAccuser: { penalizeAccuser: -0.03 },  // Challenger penalized
    },
  },

  // ─── Variable 5: Decay ───────────────────────────────────────────────────
  decay: {
    // Decay only starts after this many days of inactivity (spec: 30 days)
    inactivityThresholdDays: 30,

    baseDailyRate: 0.002,    // 0.2% per day after threshold

    // Additional rate multipliers based on how long the user has been inactive
    timeMultipliers: [
      { maxDays:  30, multiplier: 0.0  },  // ≤30 days — NO decay (grace period)
      { maxDays:  60, multiplier: 0.5  },  // 31–60 days — half rate
      { maxDays:  90, multiplier: 1.0  },  // 61–90 days — full rate
      { maxDays: 180, multiplier: 1.5  },  // 91–180 days — accelerated
      { maxDays: Infinity, multiplier: 2.0 }, // 180+ days — maximum erosion
    ],

    // qualityShield reduces decay for users with strong historical quality
    qualityShieldCap: 0.80,   // Max 80% decay reduction from shield
    decayFloorFactor: 0.30,   // Minimum floor = 30% of current score
    minFloor: 0.10,           // Absolute minimum score from decay alone
  },

  // ─── Domain thresholds & global blend ───────────────────────────────────
  domain: {
    minInteractions: 5,     // Domain must have ≥5 interactions to count
    minConfidence:   0.15,  // Domain confidence must be > 0.15 to count
    globalBlend: {
      generalWeight:        0.75,  // 75% from general events
      domainCompositeWeight: 0.25, // 25% from weighted domain composite
    },
  },

  // ─── Ranking score ───────────────────────────────────────────────────────
  // rankingScore = AIMScore × (0.55 + 0.45 × confidence)
  rankingBlend: { base: 0.55, boost: 0.45 },
};
