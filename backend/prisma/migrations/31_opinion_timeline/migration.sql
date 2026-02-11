-- Phase 6A-5: Opinion Evolution Timeline
-- Tracks per-user-per-player opinion events across the platform

CREATE TABLE "PlayerOpinionEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "sport" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "eventData" JSONB NOT NULL,
  "sentiment" TEXT,
  "sourceId" TEXT,
  "sourceType" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

CREATE INDEX "idx_opinion_user_player" ON "PlayerOpinionEvent"("userId", "playerId", "createdAt");
CREATE INDEX "idx_opinion_user_sport" ON "PlayerOpinionEvent"("userId", "sport", "createdAt");
