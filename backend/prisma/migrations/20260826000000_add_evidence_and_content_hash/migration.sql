-- AlterTable: additive, nullable columns only — safe to roll back by
-- dropping these two columns, no data loss for existing rows.
ALTER TABLE "AimEvent" ADD COLUMN "contentHash" TEXT;
ALTER TABLE "DomainAimEvent" ADD COLUMN "contentHash" TEXT;

-- CreateTable: brand new table — safe to roll back by dropping it, no
-- existing table or data is touched.
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "aimEventId" TEXT,
    "domainAimEventId" TEXT,
    "challengeId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'validated',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Evidence_aimEventId_idx" ON "Evidence"("aimEventId");
CREATE INDEX "Evidence_domainAimEventId_idx" ON "Evidence"("domainAimEventId");
CREATE INDEX "Evidence_challengeId_idx" ON "Evidence"("challengeId");
CREATE INDEX "Evidence_uploadedBy_idx" ON "Evidence"("uploadedBy");

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_aimEventId_fkey" FOREIGN KEY ("aimEventId") REFERENCES "AimEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_domainAimEventId_fkey" FOREIGN KEY ("domainAimEventId") REFERENCES "DomainAimEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "AimChallenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
