-- CreateEnum
CREATE TYPE "PredictionOutcome" AS ENUM ('PENDING', 'CORRECT', 'INCORRECT', 'PUSH', 'VOIDED');

-- CreateTable
CREATE TABLE "predictions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "predictionType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "eventId" TEXT,
    "subjectPlayerId" TEXT,
    "leagueId" TEXT,
    "predictionData" JSONB NOT NULL,
    "outcome" "PredictionOutcome" NOT NULL DEFAULT 'PENDING',
    "accuracyScore" DOUBLE PRECISION,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "locksAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_reputation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "totalPredictions" INTEGER NOT NULL DEFAULT 0,
    "correctPredictions" INTEGER NOT NULL DEFAULT 0,
    "accuracyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "streakCurrent" INTEGER NOT NULL DEFAULT 0,
    "streakBest" INTEGER NOT NULL DEFAULT 0,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentileRank" INTEGER,
    "tier" TEXT NOT NULL DEFAULT 'rookie',
    "badges" JSONB NOT NULL DEFAULT '[]',
    "weeklyRank" INTEGER,
    "seasonRank" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_reputation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "predictions_userId_sport_outcome_idx" ON "predictions"("userId", "sport", "outcome");

-- CreateIndex
CREATE INDEX "predictions_eventId_predictionType_idx" ON "predictions"("eventId", "predictionType");

-- CreateIndex
CREATE INDEX "predictions_outcome_idx" ON "predictions"("outcome");

-- CreateIndex
CREATE INDEX "predictions_subjectPlayerId_idx" ON "predictions"("subjectPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "user_reputation_userId_sport_key" ON "user_reputation"("userId", "sport");

-- CreateIndex
CREATE INDEX "user_reputation_sport_tier_idx" ON "user_reputation"("sport", "tier");

-- CreateIndex
CREATE INDEX "user_reputation_sport_accuracyRate_idx" ON "user_reputation"("sport", "accuracyRate");

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_reputation" ADD CONSTRAINT "user_reputation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
