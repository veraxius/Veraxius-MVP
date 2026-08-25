# Veraxius MVP — AI-Assisted Development Technical Documentation

This document describes how the Veraxius MVP was engineered: architectural decisions, implementation boundaries, and the role of Cursor as an AI pair programmer under active engineering oversight. The engineering team owned system design, scoring governance, and API contracts; Cursor accelerated implementation, cross-file refactors, and defect detection.

---

## 1. Integrity Scoring Engine

### Overview

The Accountability Integrity Metric (AIM) is Veraxius's trust scoring system. It converts behavioral signals into a bounded numeric score (0–100, displayed as percentages such as `0.50%`) with confidence, trend, and explainability metadata.

**Primary ownership:**

| File | Role |
|------|------|
| `backend/src/lib/aimV2.ts` | Core scoring engine: signal processing, recompute, decay, explanations |
| `backend/aim.config.js` | Frozen weight/threshold configuration (single source of truth for constants) |
| `backend/src/lib/aimEngine.ts` | Read-model layer: activity feed, summary aggregation for API/frontend |

A legacy simplified engine exists in `backend/src/lib/aim.ts` for backwards compatibility only. It is not on any active execution path.

### Key Architectural Decision: Single Scoring Engine, One Deterministic Path

The team standardized on a single pipeline:

```
Signal → processAimSignal() → AimEvent (persisted) → recomputeAIMScore() → User.aimScore + AimScoreHistory
```

All score mutations flow through `aimV2.ts`. Direct writes to `User.aimScore` outside this path were eliminated during consolidation. This guarantees that the same event log always reproduces the same score.

During MVP development, two engines ran in parallel: `aim.ts` (`createAimEvent` / `calculateAimScore`) and `aimV2.ts` (`processAimSignal` / `recomputeAIMScore`). `AIMEngine` and `POST /api/aim/event` initially called the legacy engine, producing non-deterministic outcomes depending on which code path handled a given signal. The team routed all active callers through `processAimSignal()` and retired legacy imports from `aimEngine.ts` and `routes/aim.ts`.

### How It Works

**Five-component formula** (from `aim.config.js` variable weights):

1. **Reliability** — verified outcomes, streaks, claim verification
2. **Consistency** — activity pattern alignment vs. baseline windows
3. **Peer Validation** — endorsements/disputes with voter-tier weighting
4. **Contradiction** — challenge penalties and resolution reversals
5. **Decay** — inactivity penalties applied only via governed cron paths

**Core recompute formula:**

```
AIMScore = clamp(baseScore + Σ(event.delta × recencyFactor(daysSince)), 0, maxScore)
```

`event.delta` already includes static multipliers (variable weight, context weight, confidence, anti-abuse) at write time; only recency is applied dynamically at recompute.

**`SCORE_WINDOW_DAYS` optimization:** `recomputeAIMScore()` loads only events from the last 365 days. With `recencyLambda = 0.05`, events older than 365 days contribute `exp(-0.05 × 365) ≈ 0.000002` — a safe performance bound without materially changing scores.

### Core Recompute Logic

```typescript
// backend/src/lib/aimV2.ts — recomputeAIMScore() event aggregation
for (const ev of events) {
  const days          = daysBetween(ev.createdAt, now);
  const rf            = recencyFactor(days);
  const weightedDelta = ev.delta * rf;

  switch (ev.eventType) {
    case "reliability":     reliability    += weightedDelta; break;
    case "consistency":     consistency    += weightedDelta; break;
    case "peer_validation": peerValidation += weightedDelta; break;
    case "contradiction":   contradiction  += weightedDelta; break;
    case "decay":           decay          += weightedDelta; break;
    default:                base           += weightedDelta; break;
  }
}

let aim = AIMCFG.baseScore + base + reliability + consistency
        + peerValidation + contradiction + decay;
aim = clampAimScore(aim);
```

### AI Assistance

Cursor identified the dual-engine conflict during a codebase audit: `AIMEngine.recordSignals()` and `POST /api/aim/event` still invoked `createAimEvent()` / `calculateAimScore()` from `aim.ts` while newer routes used `aimV2.ts`. The refactor mapped legacy signal types to `SignalKind` values, routed through `processAimSignal()`, and verified no remaining active imports of the legacy calculate path. This eliminated score divergence between API entry points.

---

## 2. Behavioral Signal Processing Pipeline

### Overview

The pipeline converts user actions (posts, reactions, challenges, outcomes, inactivity) into normalized trust signals. Every signal is auditable: the event record is the source of truth; the score is always derived.

### Key Architectural Decision: Event-First Architecture

No score is mutated before an event is persisted. `processAimSignal()`:

1. Checks idempotency (prevents duplicate events from retries or double-clicks)
2. Normalizes the signal via `signalNormalizer.ts`
3. Computes `effectiveDelta` with all static multipliers
4. Writes an `AimEvent` row
5. Optionally triggers `recomputeAIMScore()`

This ordering ensures crash recovery and audit replay: recompute can always reconstruct state from `AimEvent` rows.

### How It Works

```
User action (API route / cron / domain classifier)
    → normalizeSignal(kind, source)        [signalNormalizer.ts]
    → processAimSignal()                   [aimV2.ts]
    → prisma.aimEvent.create()
    → recomputeAIMScore()                  [aimV2.ts]
    → prisma.aimScoreHistory.create()
    → generateExplanations()
```

The `AimEvent` Prisma model stores `eventType`, `signal`, `delta`, `weight`, `contextWeight`, `domain`, and `metadata` (including idempotency keys and voter context).

### Signal Processing Snippet

```typescript
// backend/src/lib/aimV2.ts — processAimSignal() persistence
const event = await prisma.aimEvent.create({
  data: {
    userId,
    eventType:     ns.eventType,
    signal:        ns.signal,
    delta:         effectiveDelta,
    weight:        ns.variableWeight,
    domain,
    contextWeight: cw,
    metadata: {
      kind,
      source,
      rawDelta: ns.rawDelta,
      confMult,
      antiAbuseMultiplier,
      ...(iKey ? { idempotencyKey: iKey } : {}),
      ...(refId ? { refId } : {}),
    },
  },
});

if (!input.deferRecompute) {
  await recomputeAIMScore(userId, domain, { historyContext: kind });
}
```

### AI Assistance

Cursor identified a JavaScript operator precedence bug in `runConsistencyCheck()` that silently disabled the latency deviation branch. The original code:

```typescript
const recentLatency   = 1 + recentEvents.length   ? 1 : 1;
const baselineLatency = 1 + baselineEvents.length  ? 1 : 1;
```

Because `(1 + number)` is always truthy, both variables evaluated to `1`, making `latencyDev` always `0` and the consistency penalty never firing. The fix replaced this with actual post-count metrics:

```typescript
const recentLatency   = recentEvents.length;
const baselineLatency = baselineEvents.length;
const latencyDev = baselineLatency > 0
  ? Math.abs(recentLatency - baselineLatency) / baselineLatency
  : (recentLatency === 0 ? 0 : 1.0);
```

---

## 3. Explainability Engine

### Overview

Every score change produces human-readable explanations. Users and auditors can see *why* a score moved, not just *that* it moved. Explanations surface via `top_drivers` on the aim-summary API and attach to `AimScoreHistory` snapshots.

### Key Architectural Decision: Phrase-Based Templates, No AI Narration

Explanations are deterministic string templates mapped from `(eventType, signal)` pairs. No LLM generates narration at runtime. This keeps outputs auditable, reproducible, and free of model drift.

### How It Works

1. `recomputeAIMScore()` creates an `AimScoreHistory` row with a `context` field (reason code: e.g. `peer_endorsement`, `inactivity_decay`, `consistency_check`)
2. `generateExplanations()` fetches the 5 most recent `AimEvent` rows
3. `explanationText()` maps each event to a fixed phrase
4. Explanations are written as JSON on the matching history snapshot
5. `GET /api/users/:userId/aim-summary` returns `top_drivers` (activity labels + deltas) and `history_30d` for the trajectory chart

### Explanation Mapping Snippet

```typescript
// backend/src/lib/aimV2.ts — explanationText()
function explanationText(eventType: string, signal: string | null): string {
  if (eventType === "reliability") {
    if (signal === "outcome_success") return "Verified successful outcome";
    if (signal === "outcome_failure") return "Failed outcome recorded";
  }
  if (eventType === "peer_validation") {
    if (signal === "peer_endorsement") return "Peer endorsement received";
    if (signal === "peer_dispute") return "Peer dispute received";
  }
  if (eventType === "contradiction" && (signal ?? "").startsWith("challenge_opened")) {
    return "Challenge opened against you";
  }
  if (eventType === "decay" && signal === "inactivity_decay") {
    return "Score reduced due to inactivity";
  }
  return `${eventType.replace(/_/g, " ")}${signal ? `: ${signal}` : ""}`;
}
```

### AI Assistance

Cursor accelerated wiring of `generateExplanations()` into every `recomputeAIMScore()` exit path and verified that `historyContext` values propagated consistently across peer feedback, challenge resolution, consistency checks, and decay cron runs. Cross-file tracing confirmed no recompute path skipped explanation attachment.

---

## 4. API Layer

### Overview

The REST backend (`backend/src/index.ts`) exposes the full MVP surface: authentication, social feed, messaging, AIM operations, user profiles, rankings, and internal cron hooks. Express routes are mounted under `/api/*` with a separate `/internal/*` namespace for operational endpoints.

### Key Architectural Decision: Auth Middleware + Zod Validation + Safe Errors

- **Protected routes** use `requireAuth` middleware (`backend/src/middleware/auth.ts`), which verifies JWT access tokens and sets `req.userId`
- **All inputs** are validated with Zod schemas (`backend/src/lib/validation.ts`); invalid payloads return `{ error: "Invalid payload" }` at 400
- **Errors** use `internalError()` which logs server-side and returns `{ error: "Internal server error" }` — no stack traces or env details leak to clients
- **Cron routes** require `x-cron-secret` header via `verifyCronSecret()`

### Main Endpoint Groups

| Group | Mount | Purpose |
|-------|-------|---------|
| **Auth** | `/api/auth` | Register, login, Google OAuth, refresh, logout, forgot/reset password |
| **Users / AIM Summary** | `/api/users/:userId/aim-summary` | Global score, confidence, trend, `top_drivers`, `history_30d` |
| **Avatar** | `/api/users/:userId/avatar` | Profile image upload via Cloudinary (auth-gated, owner-only) |
| **AIM Operations** | `/api/aim/*` | Events, outcomes, peer feedback, challenges, recompute, consistency |
| **Internal Cron** | `/internal/cron/decay` | Governed decay entry point (secret-protected) |
| **Posts / Feed** | `/api/posts` | Community feed with domain classification and trust reactions |
| **Conversations** | `/api/conversations` | Real-time messaging (Socket.IO auth mirrors JWT) |

### Representative Endpoint Snippet

```typescript
// backend/src/routes/users.ts — GET /:userId/aim-summary (excerpt)
const top_drivers = activity.slice(0, 10).map((a) => ({
  id: a.id,
  label: a.label,
  delta: a.delta,
  impact: (a.delta >= 0 ? "positive" : "negative") as "positive" | "negative",
  delta_label: a.deltaLabel,
  domain: a.domain ?? null,
  created_at: a.createdAt,
}));

res.json({
  global_score,
  confidence_score,
  risk_level,
  aim_status: user.aimStatus,
  score_trend_30d,
  trend_delta_30d,
  top_drivers,
  history_30d: history30.map((h) => ({
    score: Number(h.score),
    createdAt: h.createdAt.toISOString(),
  })),
});
```

### AI Assistance

Cursor caught a `createdAt` vs `created_at` field naming mismatch between the aim-summary API response and `AIMScoreHistoryChart.tsx`. The chart's `buildSeries()` reads `createdAt`; early API responses and hook consumers expected `created_at`. When timestamps failed to parse, every history row was filtered out and the chart rendered a flat line at the current score despite 100+ valid `AimScoreHistory` records in the database. The fix hardened `normalizeHistory30d()` in `useAIMScore.ts` to accept both conventions and reject invalid dates explicitly.

---

## 5. Governance Framework

### Overview

Governance rules prevent scoring drift: weights, decay rates, and formula structure are frozen for the MVP. Changes require explicit engineering approval against the AIM Alignment Document. Automated processes (decay, consistency) run only through approved entry points.

### Key Architectural Decision: AIM Logic Freeze

`aim.config.js` is the single configuration surface for scoring constants. Application code imports it read-only. The team treats changes to `baseScore`, delta magnitudes, decay tiers, voter tiers, and blend weights as governed changes — not routine feature work.

### How It Works

**Five-tier decay threshold system** (`aim.config.js`):

```javascript
timeMultipliers: [
  { maxDays: 7,        multiplier: 0.0  },  // grace period
  { maxDays: 30,       multiplier: 0.75 },
  { maxDays: 60,       multiplier: 2.0  },
  { maxDays: 90,       multiplier: 3.75 },
  { maxDays: Infinity, multiplier: 5.0  },
],
```

Decay does not begin until `inactivityThresholdDays` (7) of inactivity. A `qualityShield` reduces decay for users with strong historical outcome quality.

**Cron as sole automated decay entry point:** `applyDecayToAllUsers()` follows a strict three-step sequence documented inline (MVP4 spec):

1. Persist `decay_applied` row in the `Event` table (orchestration audit log)
2. Emit `inactivity_decay` as an `AimEvent`
3. Call `recomputeAIMScore()` — never mutate `User.aimScore` directly

Decay is triggered by `POST /internal/cron/decay` (external cron with `x-cron-secret`) and an in-process scheduler at 03:00 UTC (`backend/src/index.ts`).

**Reason code on every score snapshot:** Each `AimScoreHistory` row stores a `context` field populated from `historyContext` at recompute time (e.g. `peer_endorsement`, `inactivity_decay`, `challenge_resolved_dismissed`, `consistency_check`). This provides full auditability: every score snapshot links to the triggering operation.

**Governance event log:** Contradiction detection writes `governance_log` events to the `Event` table before emitting scoring signals, recording rule name, domain, failed interaction IDs, and window metadata.

**MVP5 deferred capabilities:** Post-MVP governance extensions (external policy registry, multi-tenant scoring isolation, automated weight-change approval workflows) are scoped in the alignment spec referenced by inline MVP4 comments in `aimV2.ts` but intentionally not implemented in this MVP. The `Event` table and `context`/`explanations` fields on `AimScoreHistory` are designed to support those extensions without schema migration.

### Decay Cron Endpoint Snippet

```typescript
// backend/src/routes/internal.ts
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
```

### AI Assistance

Cursor helped enforce governance boundaries by flagging call sites still invoking the legacy `aim.ts` engine outside the approved `processAimSignal → recomputeAIMScore` path, and by tracing direct `User.aimScore` mutations in `posts.ts` that bypassed event persistence. Each finding was remediated to route through the governed pipeline.

---

## Tech Stack

The MVP uses **Next.js** (App Router, client components for interactive surfaces) on the frontend and **Express/Node.js** on the backend — a split that keeps scoring logic server-side and allows the frontend to proxy API calls without exposing secrets. **Prisma ORM** over **PostgreSQL** (hosted on Railway) provides typed queries and migration-managed schema evolution for AIM event tables. **Cloudinary** handles avatar uploads with server-side signing, avoiding direct S3 credential management. **Resend** delivers transactional email (password reset) from the verified `veraxius.com` domain. **Google OAuth** (via `google-auth-library`) provides passwordless sign-in with server-side ID token verification.

---

## AI-Assisted Development Highlights

- **Dual-engine consolidation:** Identified `aim.ts` and `aimV2.ts` running in parallel; refactored `AIMEngine`, `routes/aim.ts`, and related callers to a single `processAimSignal → recomputeAIMScore` path
- **Operator precedence bug in consistency checks:** Found `1 + length ? 1 : 1` making `latencyDev` always zero; replaced with relative activity frequency deviation
- **Score history chart flat-line:** Diagnosed `createdAt`/`created_at` mismatch and invalid `Date.parse()` filtering; hardened `normalizeHistory30d()` and chart timestamp parsing
- **Explanation pipeline wiring:** Verified `generateExplanations()` attached on every recompute exit with correct `historyContext` propagation
- **Governance path enforcement:** Surfaced legacy engine imports and direct score mutations that bypassed event persistence
- **Domain scoring integration:** Traced `domainScoreService.ts` calls to `recomputeAIMScore()` ensuring domain and global layers stay synchronized
- **Auth and validation hardening:** Applied consistent Zod schemas and `requireAuth` across AIM mutation endpoints during route consolidation

---

## Development Velocity

A system of this complexity — dual-layer scoring (global + domain), five signal variables with anti-abuse and voter-tier weighting, explainability, governed cron decay, real-time messaging, and a full social feed with domain classification — would typically require several weeks of traditional full-stack development for a small team: schema design, engine implementation, API surface, frontend integration, and iterative bug fixing across naming conventions and silent logic errors.

Using Cursor as an AI pair programmer under architectural oversight, the team compressed implementation into days. The engineering team retained decision authority on formula structure, governance freeze policy, and API contracts; Cursor accelerated boilerplate generation, cross-file refactors (engine consolidation spanned 6+ files), and defect detection (precedence bugs, field mismatches, orphaned code paths) that would otherwise surface only in production or manual QA.

The result is a production-deployed MVP on Railway with deterministic scoring, auditable event history, and explainable score changes — built with AI acceleration, not AI substitution for engineering judgment.
