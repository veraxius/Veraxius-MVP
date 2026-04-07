-- AlterTable
ALTER TABLE "AimChallenge" ADD COLUMN     "reason" TEXT NOT NULL,
ADD COLUMN     "resolution" TEXT,
ADD COLUMN     "severity" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "AimEvent" DROP COLUMN "context",
DROP COLUMN "type",
DROP COLUMN "value",
ADD COLUMN     "contextWeight" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "delta" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "domain" TEXT,
ADD COLUMN     "eventType" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "signal" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aimConfidence" DECIMAL(3,2),
ADD COLUMN     "aimDomainPrimary" TEXT,
ADD COLUMN     "lastActiveAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "users";

-- CreateTable
CREATE TABLE "AimOutcome" (
    "userId" TEXT NOT NULL,
    "interactionId" TEXT NOT NULL,
    "quality" DECIMAL(3,2) NOT NULL,
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AimOutcome_pkey" PRIMARY KEY ("userId","interactionId")
);

-- CreateTable
CREATE TABLE "AimConsistency" (
    "userId" TEXT NOT NULL,
    "breakCount" INTEGER NOT NULL DEFAULT 0,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "lastSnapshot" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AimConsistency_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AimDomainScore" (
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "interactionCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AimDomainScore_pkey" PRIMARY KEY ("userId","domain")
);

-- CreateTable
CREATE TABLE "AimFlag" (
    "userId" TEXT NOT NULL,
    "flagType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AimFlag_pkey" PRIMARY KEY ("userId","flagType","createdAt")
);

-- CreateIndex
CREATE INDEX "AimOutcome_userId_idx" ON "AimOutcome"("userId");

-- CreateIndex
CREATE INDEX "AimDomainScore_userId_idx" ON "AimDomainScore"("userId");

-- CreateIndex
CREATE INDEX "AimFlag_userId_idx" ON "AimFlag"("userId");

-- AddForeignKey
ALTER TABLE "AimOutcome" ADD CONSTRAINT "AimOutcome_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AimConsistency" ADD CONSTRAINT "AimConsistency_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AimDomainScore" ADD CONSTRAINT "AimDomainScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AimFlag" ADD CONSTRAINT "AimFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

