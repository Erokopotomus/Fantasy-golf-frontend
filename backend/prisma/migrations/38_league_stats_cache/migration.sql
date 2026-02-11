-- CreateTable
CREATE TABLE "LeagueStatsCache" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "stats" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueStatsCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeagueStatsCache_leagueId_key" ON "LeagueStatsCache"("leagueId");

-- AddForeignKey
ALTER TABLE "LeagueStatsCache" ADD CONSTRAINT "LeagueStatsCache_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
