-- CreateTable: AI Engine Config (single-row, platform-wide settings)
CREATE TABLE "AiEngineConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "featureToggles" JSONB NOT NULL DEFAULT '{"ambient":false,"draftNudge":false,"boardCoach":false,"predictionContext":false,"deepReports":false,"scoutReports":false,"sim":false}',
    "dailyTokenBudget" INTEGER NOT NULL DEFAULT 100000,
    "tokensUsedToday" INTEGER NOT NULL DEFAULT 0,
    "tokensUsedThisWeek" INTEGER NOT NULL DEFAULT 0,
    "tokensUsedThisMonth" INTEGER NOT NULL DEFAULT 0,
    "lastDailyReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastWeeklyReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMonthlyReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalTokensAllTime" INTEGER NOT NULL DEFAULT 0,
    "totalCallsAllTime" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiEngineConfig_pkey" PRIMARY KEY ("id")
);

-- Insert default row (kill switch OFF)
INSERT INTO "AiEngineConfig" ("id") VALUES ('singleton');

-- Add aiPreferences JSON column to users table
ALTER TABLE "users" ADD COLUMN "aiPreferences" JSONB NOT NULL DEFAULT '{"ambient":true,"draftCoaching":true,"boardCoaching":true,"predictionCoaching":true}';
