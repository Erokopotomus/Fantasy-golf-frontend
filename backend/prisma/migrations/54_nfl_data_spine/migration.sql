-- CreateTable
CREATE TABLE "nfl_coaching_staff" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "previousTeamAbbr" TEXT,
    "previousRole" TEXT,
    "hiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nfl_coaching_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nfl_roster_slots" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "snapshotType" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "depthRank" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nfl_roster_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nfl_team_unit_ranks" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nfl_team_unit_ranks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nfl_player_projections" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "scoringType" TEXT NOT NULL,
    "projectedPoints" DOUBLE PRECISION NOT NULL,
    "adp" DOUBLE PRECISION,
    "positionRank" INTEGER,
    "source" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nfl_player_projections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prep_quiz_cards" (
    "id" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "distractors" TEXT[],
    "difficulty" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "meta" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "prep_quiz_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prep_quiz_reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewed" TIMESTAMP(3),
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prep_quiz_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prep_user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "focusMode" TEXT,
    "cardsPerDay" INTEGER NOT NULL DEFAULT 10,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastQuizDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prep_user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nfl_coaching_staff_season_role_idx" ON "nfl_coaching_staff"("season", "role");

-- CreateIndex
CREATE UNIQUE INDEX "nfl_coaching_staff_teamId_season_role_key" ON "nfl_coaching_staff"("teamId", "season", "role");

-- CreateIndex
CREATE INDEX "nfl_roster_slots_snapshotType_teamId_position_idx" ON "nfl_roster_slots"("snapshotType", "teamId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "nfl_roster_slots_teamId_playerId_snapshotType_key" ON "nfl_roster_slots"("teamId", "playerId", "snapshotType");

-- CreateIndex
CREATE INDEX "nfl_team_unit_ranks_season_unit_idx" ON "nfl_team_unit_ranks"("season", "unit");

-- CreateIndex
CREATE UNIQUE INDEX "nfl_team_unit_ranks_teamId_season_unit_key" ON "nfl_team_unit_ranks"("teamId", "season", "unit");

-- CreateIndex
CREATE INDEX "nfl_player_projections_season_scoringType_positionRank_idx" ON "nfl_player_projections"("season", "scoringType", "positionRank");

-- CreateIndex
CREATE UNIQUE INDEX "nfl_player_projections_playerId_season_scoringType_source_key" ON "nfl_player_projections"("playerId", "season", "scoringType", "source");

-- CreateIndex
CREATE INDEX "prep_quiz_cards_category_idx" ON "prep_quiz_cards"("category");

-- CreateIndex
CREATE INDEX "prep_quiz_cards_isActive_idx" ON "prep_quiz_cards"("isActive");

-- CreateIndex
CREATE INDEX "prep_quiz_cards_templateName_idx" ON "prep_quiz_cards"("templateName");

-- CreateIndex
CREATE UNIQUE INDEX "prep_quiz_cards_templateName_subject_key" ON "prep_quiz_cards"("templateName", "subject");

-- CreateIndex
CREATE INDEX "prep_quiz_reviews_userId_dueDate_idx" ON "prep_quiz_reviews"("userId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "prep_quiz_reviews_userId_cardId_key" ON "prep_quiz_reviews"("userId", "cardId");

-- CreateIndex
CREATE UNIQUE INDEX "prep_user_settings_userId_key" ON "prep_user_settings"("userId");

-- AddForeignKey
ALTER TABLE "nfl_coaching_staff" ADD CONSTRAINT "nfl_coaching_staff_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "nfl_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfl_roster_slots" ADD CONSTRAINT "nfl_roster_slots_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "nfl_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfl_roster_slots" ADD CONSTRAINT "nfl_roster_slots_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfl_team_unit_ranks" ADD CONSTRAINT "nfl_team_unit_ranks_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "nfl_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfl_player_projections" ADD CONSTRAINT "nfl_player_projections_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prep_quiz_reviews" ADD CONSTRAINT "prep_quiz_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prep_quiz_reviews" ADD CONSTRAINT "prep_quiz_reviews_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "prep_quiz_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prep_user_settings" ADD CONSTRAINT "prep_user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

