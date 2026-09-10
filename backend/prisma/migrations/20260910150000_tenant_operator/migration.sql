-- MVP5 gap-closure: real, authenticated human identity for Authority
-- approvals/revocations, replacing the previous free-text human_actor_id.

-- CreateTable
CREATE TABLE "TenantOperator" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "TenantOperator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantOperator_tenantId_idx" ON "TenantOperator"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantOperator_tenantId_email_key" ON "TenantOperator"("tenantId", "email");

-- AddForeignKey
ALTER TABLE "TenantOperator" ADD CONSTRAINT "TenantOperator_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
