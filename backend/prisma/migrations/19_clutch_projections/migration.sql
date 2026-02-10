-- CreateTable
CREATE TABLE "clutch_projections" (
    "id" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "scoringFormat" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER,
    "playerId" TEXT NOT NULL,
    "projectedPts" DOUBLE PRECISION,
    "adpRank" INTEGER,
    "clutchRank" INTEGER NOT NULL,
    "tradeValue" INTEGER,
    "position" TEXT,
    "metadata" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clutch_projections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clutch_projections_sport_scoringFormat_season_clutchRank_idx" ON "clutch_projections"("sport", "scoringFormat", "season", "clutchRank");

-- CreateIndex
CREATE UNIQUE INDEX "clutch_projections_sport_scoringFormat_season_week_playerId_key" ON "clutch_projections"("sport", "scoringFormat", "season", "week", "playerId");

-- AddForeignKey
ALTER TABLE "clutch_projections" ADD CONSTRAINT "clutch_projections_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
