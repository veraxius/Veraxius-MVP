BEGIN;
DO $$ BEGIN ALTER TABLE "AimEvent" ADD COLUMN IF NOT EXISTS "delta" DOUBLE PRECISION; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AimEvent" ADD COLUMN IF NOT EXISTS "eventType" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AimEvent" ADD COLUMN IF NOT EXISTS "domain" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AimEvent" ADD COLUMN IF NOT EXISTS "signal" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AimEvent" ADD COLUMN IF NOT EXISTS "metadata" JSONB; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AimEvent" ADD COLUMN IF NOT EXISTS "weight" DOUBLE PRECISION; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AimEvent" ADD COLUMN IF NOT EXISTS "contextWeight" DOUBLE PRECISION; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
UPDATE "AimEvent" SET "delta" = COALESCE("delta", COALESCE("value", 0));
UPDATE "AimEvent" SET "eventType" = COALESCE("eventType", COALESCE("type", 'success'));
UPDATE "AimEvent" SET "weight" = COALESCE("weight", 1);
UPDATE "AimEvent" SET "contextWeight" = COALESCE("contextWeight", 1);
ALTER TABLE "AimEvent" ALTER COLUMN "delta" SET NOT NULL;
ALTER TABLE "AimEvent" ALTER COLUMN "eventType" SET NOT NULL;
DO $$ BEGIN ALTER TABLE "AimEvent" DROP COLUMN IF EXISTS "value"; ALTER TABLE "AimEvent" DROP COLUMN IF EXISTS "type"; ALTER TABLE "AimEvent" DROP COLUMN IF EXISTS "context"; EXCEPTION WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aimConfidence" DECIMAL(3,2); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aimDomainPrimary" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "AimChallenge" ADD COLUMN IF NOT EXISTS "reason" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AimChallenge" ADD COLUMN IF NOT EXISTS "severity" INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AimChallenge" ADD COLUMN IF NOT EXISTS "resolution" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
UPDATE "AimChallenge" SET "reason" = COALESCE("reason", 'unspecified');
UPDATE "AimChallenge" SET "severity" = COALESCE("severity", 1);
ALTER TABLE "AimChallenge" ALTER COLUMN "reason" SET NOT NULL;
ALTER TABLE "AimChallenge" ALTER COLUMN "severity" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "AimOutcome" (
  "userId" TEXT NOT NULL,
  "interactionId" TEXT NOT NULL,
  "quality" DECIMAL(3,2) NOT NULL,
  "verifiedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AimOutcome_pkey" PRIMARY KEY ("userId","interactionId")
);
CREATE INDEX IF NOT EXISTS "AimOutcome_userId_idx" ON "AimOutcome"("userId");
ALTER TABLE "AimOutcome" DROP CONSTRAINT IF EXISTS "AimOutcome_userId_fkey";
ALTER TABLE "AimOutcome" ADD CONSTRAINT "AimOutcome_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "AimConsistency" (
  "userId" TEXT NOT NULL,
  "breakCount" INTEGER NOT NULL DEFAULT 0,
  "matchCount" INTEGER NOT NULL DEFAULT 0,
  "lastSnapshot" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AimConsistency_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE IF NOT EXISTS "AimDomainScore" (
  "userId" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "interactionCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AimDomainScore_pkey" PRIMARY KEY ("userId","domain")
);
CREATE INDEX IF NOT EXISTS "AimDomainScore_userId_idx" ON "AimDomainScore"("userId");

CREATE TABLE IF NOT EXISTS "AimFlag" (
  "userId" TEXT NOT NULL,
  "flagType" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AimFlag_pkey" PRIMARY KEY ("userId","flagType","createdAt")
);
CREATE INDEX IF NOT EXISTS "AimFlag_userId_idx" ON "AimFlag"("userId");

COMMIT;

