-- CreateTable
CREATE TABLE "ChoppedLiveSnapshot" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "safePercent" DOUBLE PRECISION NOT NULL,
    "mean" DOUBLE PRECISION NOT NULL,
    "variance" DOUBLE PRECISION NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChoppedLiveSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChoppedLiveSnapshot_leagueId_tournamentId_idx" ON "ChoppedLiveSnapshot"("leagueId", "tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "ChoppedLiveSnapshot_leagueId_tournamentId_teamId_key" ON "ChoppedLiveSnapshot"("leagueId", "tournamentId", "teamId");

-- AddForeignKey
ALTER TABLE "ChoppedLiveSnapshot" ADD CONSTRAINT "ChoppedLiveSnapshot_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoppedLiveSnapshot" ADD CONSTRAINT "ChoppedLiveSnapshot_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoppedLiveSnapshot" ADD CONSTRAINT "ChoppedLiveSnapshot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
