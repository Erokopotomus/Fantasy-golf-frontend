-- AlterEnum
ALTER TYPE "LeagueFormat" ADD VALUE 'CHOPPED';

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "eliminatedAt" TIMESTAMP(3),
ADD COLUMN     "eliminationWeek" INTEGER,
ADD COLUMN     "finalRank" INTEGER;

-- CreateTable
CREATE TABLE "ChopEvent" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "scoredPoints" DOUBLE PRECISION NOT NULL,
    "safePercent" DOUBLE PRECISION NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggeredByUserId" TEXT,
    "tiebreakerUsed" TEXT,
    "reasoning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChopEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChopEvent_leagueId_week_idx" ON "ChopEvent"("leagueId", "week");

-- AddForeignKey
ALTER TABLE "ChopEvent" ADD CONSTRAINT "ChopEvent_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChopEvent" ADD CONSTRAINT "ChopEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

