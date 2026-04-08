-- Migration: add_domain_models
-- Adds PostDomain, UserDomainScore, and DomainAimEvent tables for the Veraxius
-- per-domain AIM Score system.

-- PostDomain: one primary (and optionally one secondary) domain per post
CREATE TABLE "PostDomain" (
    "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "postId"          INTEGER NOT NULL,
    "userId"          TEXT NOT NULL,
    "domainName"      VARCHAR(50) NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isPrimary"       BOOLEAN NOT NULL DEFAULT true,
    "rawKeywordScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "classifiedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostDomain_pkey" PRIMARY KEY ("id")
);

-- One primary AND at most one secondary per post (isPrimary true/false are both unique per postId)
CREATE UNIQUE INDEX "PostDomain_postId_isPrimary_key" ON "PostDomain"("postId", "isPrimary");
CREATE INDEX "PostDomain_userId_idx" ON "PostDomain"("userId");
CREATE INDEX "PostDomain_domainName_idx" ON "PostDomain"("domainName");

ALTER TABLE "PostDomain"
    ADD CONSTRAINT "PostDomain_postId_fkey"
        FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostDomain"
    ADD CONSTRAINT "PostDomain_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- UserDomainScore: per-user, per-domain AIM score and metadata
CREATE TABLE "UserDomainScore" (
    "id"                   TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId"               TEXT NOT NULL,
    "domainName"           VARCHAR(50) NOT NULL,
    "domainAimScore"       DOUBLE PRECISION NOT NULL DEFAULT 0.50,
    "domainConfidence"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "interactionCount"     INTEGER NOT NULL DEFAULT 0,
    "positiveSignals"      INTEGER NOT NULL DEFAULT 0,
    "negativeSignals"      INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt"       TIMESTAMP(3),
    "isPublic"             BOOLEAN NOT NULL DEFAULT false,
    "scoreAt7dAgo"         DOUBLE PRECISION,
    "coordinatedBoostFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDomainScore_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserDomainScore_userId_domainName_key" ON "UserDomainScore"("userId", "domainName");
CREATE INDEX "UserDomainScore_userId_idx" ON "UserDomainScore"("userId");

ALTER TABLE "UserDomainScore"
    ADD CONSTRAINT "UserDomainScore_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- DomainAimEvent: full audit log of every domain-scoped AIM event
CREATE TABLE "DomainAimEvent" (
    "id"                   TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId"               TEXT NOT NULL,
    "postId"               INTEGER,
    "domainName"           VARCHAR(50) NOT NULL,
    "eventType"            VARCHAR(50) NOT NULL,
    "rawDelta"             DOUBLE PRECISION NOT NULL,
    "variableWeight"       DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "recencyFactor"        DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "contextWeight"        DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "confidenceMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    "antiAbuseMultiplier"  DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "effectiveDelta"       DOUBLE PRECISION NOT NULL,
    "voterUserId"          TEXT,
    "voterAimScore"        DOUBLE PRECISION,
    "isReversed"           BOOLEAN NOT NULL DEFAULT false,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainAimEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DomainAimEvent_userId_domainName_idx" ON "DomainAimEvent"("userId", "domainName");
CREATE INDEX "DomainAimEvent_postId_idx" ON "DomainAimEvent"("postId");

ALTER TABLE "DomainAimEvent"
    ADD CONSTRAINT "DomainAimEvent_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DomainAimEvent"
    ADD CONSTRAINT "DomainAimEvent_postId_fkey"
        FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DomainAimEvent"
    ADD CONSTRAINT "DomainAimEvent_voterUserId_fkey"
        FOREIGN KEY ("voterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
