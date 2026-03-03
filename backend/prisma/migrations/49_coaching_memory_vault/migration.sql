-- Migration 49: Coaching Memory Vault
-- Per-user AI coach memory (documents) and interaction tracking

-- CoachingMemory: stores versioned coaching documents per user/sport
CREATE TABLE IF NOT EXISTS "CoachingMemory" (
    "id"            TEXT         NOT NULL,
    "userId"        TEXT         NOT NULL,
    "sport"         TEXT,
    "documentType"  TEXT         NOT NULL,
    "content"       JSONB        NOT NULL,
    "version"       INTEGER      NOT NULL DEFAULT 1,
    "lastUpdatedBy" TEXT         NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachingMemory_pkey" PRIMARY KEY ("id")
);

-- CoachingInteraction: tracks AI coach insights and user reactions
CREATE TABLE IF NOT EXISTS "CoachingInteraction" (
    "id"              TEXT         NOT NULL,
    "userId"          TEXT         NOT NULL,
    "insightType"     TEXT         NOT NULL,
    "summary"         TEXT         NOT NULL,
    "context"         TEXT,
    "userReaction"    TEXT,
    "behaviorChanged" BOOLEAN      NOT NULL DEFAULT false,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachingInteraction_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "CoachingMemory" ADD CONSTRAINT "CoachingMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoachingInteraction" ADD CONSTRAINT "CoachingInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Unique constraint: one document per user/sport/type combo
CREATE UNIQUE INDEX "CoachingMemory_userId_sport_documentType_key" ON "CoachingMemory"("userId", "sport", "documentType");

-- Indexes
CREATE INDEX "CoachingMemory_userId_idx" ON "CoachingMemory"("userId");
CREATE INDEX "CoachingMemory_documentType_idx" ON "CoachingMemory"("documentType");
CREATE INDEX "CoachingInteraction_userId_idx" ON "CoachingInteraction"("userId");
CREATE INDEX "CoachingInteraction_userId_createdAt_idx" ON "CoachingInteraction"("userId", "createdAt");
