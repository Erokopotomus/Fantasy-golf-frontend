-- CreateEnum: AchievementTier
CREATE TYPE "AchievementTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum: AchievementCategory
CREATE TYPE "AchievementCategory" AS ENUM ('SEASON', 'DRAFT', 'LINEUP', 'SOCIAL', 'MILESTONE');

-- CreateTable: manager_profiles
CREATE TABLE "manager_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sportId" TEXT,
    "totalLeagues" INTEGER NOT NULL DEFAULT 0,
    "totalSeasons" INTEGER NOT NULL DEFAULT 0,
    "championships" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "winPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgFinish" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bestFinish" INTEGER,
    "totalPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "auctionROI" DOUBLE PRECISION,
    "draftEfficiency" DOUBLE PRECISION,
    "stats" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: head_to_head_records
CREATE TABLE "head_to_head_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opponentUserId" TEXT NOT NULL,
    "sportId" TEXT,
    "leagueFormat" "LeagueFormat",
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsAgainst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "matchupsPlayed" INTEGER NOT NULL DEFAULT 0,
    "lastMatchupAt" TIMESTAMP(3),
    "stats" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "head_to_head_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable: achievements
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sportId" TEXT,
    "tier" "AchievementTier" NOT NULL,
    "icon" TEXT,
    "category" "AchievementCategory" NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "criteria" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable: achievement_unlocks
CREATE TABLE "achievement_unlocks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "context" JSONB,

    CONSTRAINT "achievement_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: manager_season_summaries
CREATE TABLE "manager_season_summaries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "leaguesPlayed" INTEGER NOT NULL DEFAULT 0,
    "championships" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "avgFinish" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bestFinish" INTEGER,
    "byFormat" JSONB NOT NULL DEFAULT '{}',
    "draftStats" JSONB NOT NULL DEFAULT '{}',
    "stats" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_season_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: manager_profiles
CREATE INDEX "manager_profiles_userId_idx" ON "manager_profiles"("userId");
CREATE UNIQUE INDEX "manager_profiles_userId_sportId_key" ON "manager_profiles"("userId", "sportId");

-- CreateIndex: head_to_head_records
CREATE INDEX "head_to_head_records_userId_idx" ON "head_to_head_records"("userId");
CREATE INDEX "head_to_head_records_opponentUserId_idx" ON "head_to_head_records"("opponentUserId");
CREATE UNIQUE INDEX "head_to_head_records_userId_opponentUserId_sportId_leagueFor_key" ON "head_to_head_records"("userId", "opponentUserId", "sportId", "leagueFormat");

-- CreateIndex: achievements
CREATE UNIQUE INDEX "achievements_slug_key" ON "achievements"("slug");

-- CreateIndex: achievement_unlocks
CREATE INDEX "achievement_unlocks_userId_idx" ON "achievement_unlocks"("userId");
CREATE UNIQUE INDEX "achievement_unlocks_userId_achievementId_key" ON "achievement_unlocks"("userId", "achievementId");

-- CreateIndex: manager_season_summaries
CREATE INDEX "manager_season_summaries_userId_idx" ON "manager_season_summaries"("userId");
CREATE INDEX "manager_season_summaries_seasonId_idx" ON "manager_season_summaries"("seasonId");
CREATE UNIQUE INDEX "manager_season_summaries_userId_sportId_seasonId_key" ON "manager_season_summaries"("userId", "sportId", "seasonId");

-- AddForeignKey: manager_profiles
ALTER TABLE "manager_profiles" ADD CONSTRAINT "manager_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "manager_profiles" ADD CONSTRAINT "manager_profiles_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: head_to_head_records
ALTER TABLE "head_to_head_records" ADD CONSTRAINT "head_to_head_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "head_to_head_records" ADD CONSTRAINT "head_to_head_records_opponentUserId_fkey" FOREIGN KEY ("opponentUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "head_to_head_records" ADD CONSTRAINT "head_to_head_records_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: achievements
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: achievement_unlocks
ALTER TABLE "achievement_unlocks" ADD CONSTRAINT "achievement_unlocks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "achievement_unlocks" ADD CONSTRAINT "achievement_unlocks_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: manager_season_summaries
ALTER TABLE "manager_season_summaries" ADD CONSTRAINT "manager_season_summaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "manager_season_summaries" ADD CONSTRAINT "manager_season_summaries_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "manager_season_summaries" ADD CONSTRAINT "manager_season_summaries_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
