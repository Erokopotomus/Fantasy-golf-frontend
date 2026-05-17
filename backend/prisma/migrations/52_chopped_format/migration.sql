-- AlterEnum
ALTER TYPE "LeagueFormat" ADD VALUE 'CHOPPED';

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "eliminatedAt" TIMESTAMP(3),
ADD COLUMN     "eliminationWeek" INTEGER,
ADD COLUMN     "finalRank" INTEGER;

