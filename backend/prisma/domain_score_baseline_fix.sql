-- ============================================================
-- Migration: Remove the artificial 0.5 baseline from domain scores
-- Domain AIM Score now starts at 0 and is driven only by real votes.
-- Run once after deploying the updated domainScoreService.ts
-- ============================================================

-- Step 1: For every UserDomainScore that has real DomainAimEvent records,
--         recalculate the score as the clamped sum of effectiveDeltas (0-based).
UPDATE "UserDomainScore" uds
SET "domainAimScore" = LEAST(1.0, GREATEST(0.0,
    COALESCE((
        SELECT SUM(dae."effectiveDelta")
        FROM "DomainAimEvent" dae
        WHERE dae."userId"     = uds."userId"
          AND dae."domainName" = uds."domainName"
          AND dae."isReversed" = false
    ), 0.0)
));

-- Step 2: Reset scores to 0 for domains that have ZERO vote events
--         (they were created with the fake 0.5 default and never voted on).
UPDATE "UserDomainScore"
SET "domainAimScore" = 0.0
WHERE "domainAimScore" = 0.5
  AND NOT EXISTS (
      SELECT 1
      FROM "DomainAimEvent" dae
      WHERE dae."userId"     = "UserDomainScore"."userId"
        AND dae."domainName" = "UserDomainScore"."domainName"
        AND dae."isReversed" = false
  );
