-- AlterTable: additive, nullable/defaulted columns only — safe to roll back
-- by dropping them, no data loss, no existing rows broken.
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "verificationCode" TEXT;
ALTER TABLE "User" ADD COLUMN "verificationCodeExpiry" TIMESTAMP(3);

-- Backfill: users who signed in with Google already had their email
-- verified by Google (the /google route already rejects unverified Google
-- emails) — mark them verified retroactively so they aren't asked to
-- verify an email they've already proven they own.
UPDATE "User" SET "emailVerified" = true WHERE "googleId" IS NOT NULL;
