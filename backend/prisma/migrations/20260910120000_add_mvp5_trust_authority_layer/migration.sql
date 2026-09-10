-- MVP5 — AIM Trust & Authority Layer (Architecture Alignment FINAL, all 10
-- corrections applied). Purely additive: 8 new nullable columns on the
-- existing Evidence table, and 14 new tables. No existing table, column,
-- constraint, or row is altered, dropped, or renamed. Reversible by dropping
-- the new tables/columns.

-- AlterTable
ALTER TABLE "Evidence" ADD COLUMN     "canonicalizationVersion" TEXT,
ADD COLUMN     "claimId" TEXT,
ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "decisionId" TEXT,
ADD COLUMN     "evidenceType" TEXT,
ADD COLUMN     "hashAlgorithm" TEXT,
ADD COLUMN     "observedAt" TIMESTAMP(3),
ADD COLUMN     "provenance" JSONB;


-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "linkedUserId" TEXT,
    "externalRef" TEXT,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subjectEntityId" TEXT NOT NULL,
    "predicate" TEXT NOT NULL,
    "objectValue" JSONB NOT NULL,
    "assertedByEntityId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "confidence" DOUBLE PRECISION,
    "contextId" TEXT,
    "assertedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contradiction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subjectEntityId" TEXT NOT NULL,
    "claimId" TEXT,
    "evidenceIds" JSONB NOT NULL,
    "signalIds" JSONB,
    "severity" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'detected',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolutionEvidenceId" TEXT,

    CONSTRAINT "Contradiction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "sourceEntityId" TEXT,
    "sourceEvidenceId" TEXT,
    "sourceOutcomeId" TEXT,
    "targetEntityId" TEXT,
    "targetClaimId" TEXT,
    "targetDecisionId" TEXT,
    "direction" TEXT NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "operatorVersion" TEXT,
    "metadata" JSONB,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proposedByEntityId" TEXT NOT NULL,
    "targetEntityId" TEXT,
    "decisionType" TEXT NOT NULL,
    "proposedAction" TEXT NOT NULL,
    "modelConfidence" DOUBLE PRECISION,
    "contextId" TEXT,
    "riskClass" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustState" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subjectEntityId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "contextId" TEXT,
    "trustScore" DOUBLE PRECISION NOT NULL,
    "evidenceConfidence" DOUBLE PRECISION NOT NULL,
    "reliability" DOUBLE PRECISION,
    "consistency" DOUBLE PRECISION,
    "evidenceStrength" DOUBLE PRECISION,
    "peerValidation" DOUBLE PRECISION,
    "contradiction" DOUBLE PRECISION,
    "decay" DOUBLE PRECISION,
    "trustClass" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "engineVersion" TEXT NOT NULL,
    "explanation" JSONB NOT NULL,

    CONSTRAINT "TrustState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Context" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contextType" TEXT NOT NULL,
    "riskClass" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Context_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "policyKey" TEXT NOT NULL,
    "decisionType" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Authority" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "trustStateId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "authorityState" TEXT NOT NULL,
    "permittedActions" JSONB,
    "prohibitedActions" JSONB,
    "constraints" JSONB,
    "humanRequired" BOOLEAN NOT NULL DEFAULT false,
    "reasonCodes" JSONB,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "supersedesAuthorityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Authority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HumanApproval" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "humanActorId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "authorityId" TEXT NOT NULL,
    "scope" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HumanApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Action" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "authorityId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outcome" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "outcomeType" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "observations" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Outcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "entityId" TEXT,
    "decisionId" TEXT,
    "trustStateId" TEXT,
    "authorityId" TEXT,
    "actionId" TEXT,
    "outcomeId" TEXT,
    "evidenceIds" JSONB,
    "signalIds" JSONB,
    "contradictions" JSONB,
    "rejectedAlternatives" JSONB,
    "policyId" TEXT,
    "policyVersion" TEXT,
    "trustEngineVersion" TEXT,
    "humanActorId" TEXT,
    "humanOverride" BOOLEAN,
    "eventPayload" JSONB NOT NULL,
    "previousHash" TEXT,
    "eventHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_apiKeyHash_key" ON "Tenant"("apiKeyHash");

-- CreateIndex
CREATE INDEX "Entity_tenantId_idx" ON "Entity"("tenantId");

-- CreateIndex
CREATE INDEX "Entity_linkedUserId_idx" ON "Entity"("linkedUserId");

-- CreateIndex
CREATE INDEX "Claim_tenantId_idx" ON "Claim"("tenantId");

-- CreateIndex
CREATE INDEX "Claim_subjectEntityId_idx" ON "Claim"("subjectEntityId");

-- CreateIndex
CREATE INDEX "Contradiction_tenantId_idx" ON "Contradiction"("tenantId");

-- CreateIndex
CREATE INDEX "Contradiction_subjectEntityId_idx" ON "Contradiction"("subjectEntityId");

-- CreateIndex
CREATE INDEX "Contradiction_claimId_idx" ON "Contradiction"("claimId");

-- CreateIndex
CREATE INDEX "Signal_tenantId_idx" ON "Signal"("tenantId");

-- CreateIndex
CREATE INDEX "Signal_targetEntityId_idx" ON "Signal"("targetEntityId");

-- CreateIndex
CREATE INDEX "Signal_sourceEntityId_idx" ON "Signal"("sourceEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "Decision_idempotencyKey_key" ON "Decision"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Decision_tenantId_idx" ON "Decision"("tenantId");

-- CreateIndex
CREATE INDEX "Decision_proposedByEntityId_idx" ON "Decision"("proposedByEntityId");

-- CreateIndex
CREATE INDEX "Decision_targetEntityId_idx" ON "Decision"("targetEntityId");

-- CreateIndex
CREATE INDEX "TrustState_tenantId_idx" ON "TrustState"("tenantId");

-- CreateIndex
CREATE INDEX "TrustState_subjectEntityId_idx" ON "TrustState"("subjectEntityId");

-- CreateIndex
CREATE INDEX "TrustState_decisionId_idx" ON "TrustState"("decisionId");

-- CreateIndex
CREATE INDEX "Context_tenantId_idx" ON "Context"("tenantId");

-- CreateIndex
CREATE INDEX "Policy_tenantId_idx" ON "Policy"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Policy_tenantId_policyKey_version_key" ON "Policy"("tenantId", "policyKey", "version");

-- CreateIndex
CREATE INDEX "Authority_tenantId_idx" ON "Authority"("tenantId");

-- CreateIndex
CREATE INDEX "Authority_decisionId_idx" ON "Authority"("decisionId");

-- CreateIndex
CREATE INDEX "HumanApproval_tenantId_idx" ON "HumanApproval"("tenantId");

-- CreateIndex
CREATE INDEX "HumanApproval_authorityId_idx" ON "HumanApproval"("authorityId");

-- CreateIndex
CREATE UNIQUE INDEX "Action_idempotencyKey_key" ON "Action"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Action_tenantId_idx" ON "Action"("tenantId");

-- CreateIndex
CREATE INDEX "Action_authorityId_idx" ON "Action"("authorityId");

-- CreateIndex
CREATE INDEX "Action_decisionId_idx" ON "Action"("decisionId");

-- CreateIndex
CREATE INDEX "Outcome_tenantId_idx" ON "Outcome"("tenantId");

-- CreateIndex
CREATE INDEX "Outcome_actionId_idx" ON "Outcome"("actionId");

-- CreateIndex
CREATE INDEX "GovernanceEvent_tenantId_idx" ON "GovernanceEvent"("tenantId");

-- CreateIndex
CREATE INDEX "GovernanceEvent_correlationId_idx" ON "GovernanceEvent"("correlationId");

-- CreateIndex
CREATE INDEX "Evidence_claimId_idx" ON "Evidence"("claimId");

-- CreateIndex
CREATE INDEX "Evidence_decisionId_idx" ON "Evidence"("decisionId");

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contradiction" ADD CONSTRAINT "Contradiction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustState" ADD CONSTRAINT "TrustState_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Context" ADD CONSTRAINT "Context_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Authority" ADD CONSTRAINT "Authority_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanApproval" ADD CONSTRAINT "HumanApproval_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceEvent" ADD CONSTRAINT "GovernanceEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

