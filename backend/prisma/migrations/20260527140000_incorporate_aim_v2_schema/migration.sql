-- incorporate_aim_v2_schema
-- ===========================
-- Tracks schema changes that previously lived only in standalone SQL files under prisma/:
--   aim_v2_migration.sql  → already applied via 20260408011606_add_domain_models
--   aim_v2_backfill.sql   → one-time DATA migration for legacy DBs (not run on fresh deploy)
--   domain_score_baseline_fix.sql → one-time DATA migration for legacy DBs (not run on fresh deploy)
--
-- This migration closes the remaining gap between schema.prisma and `prisma migrate deploy`
-- on a fresh database.

-- Event queue table (decay_applied, peer_feedback, score_recompute, …)
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- Align User.aimScore default with schema.prisma / AIM v2 neutral baseline (0.50)
ALTER TABLE "User" ALTER COLUMN "aimScore" SET DEFAULT 0.5;
