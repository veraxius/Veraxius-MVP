-- AlterTable: additive, nullable columns only — safe to roll back by
-- dropping them, no data loss, no existing rows affected.
ALTER TABLE "AimChallenge" ADD COLUMN "contextEventId" TEXT;
ALTER TABLE "AimChallenge" ADD COLUMN "contextEventKind" TEXT;
