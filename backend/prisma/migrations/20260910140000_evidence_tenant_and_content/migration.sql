-- MVP5 gap-closure: allow Evidence to be submitted directly by external
-- systems (Directive §8 "Evidence exists or arrives"), scoped to a Tenant,
-- carrying an inline JSON body for non-file evidence (attestations, API
-- responses, verified claims, etc.) instead of only file uploads.

-- AlterTable
ALTER TABLE "Evidence" ADD COLUMN     "content" JSONB,
ADD COLUMN     "tenantId" TEXT;


-- CreateIndex
CREATE INDEX "Evidence_tenantId_idx" ON "Evidence"("tenantId");
