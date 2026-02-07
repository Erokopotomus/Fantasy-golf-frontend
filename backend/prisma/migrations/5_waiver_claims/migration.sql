-- CreateEnum
CREATE TYPE "WaiverClaimStatus" AS ENUM ('PENDING', 'WON', 'LOST', 'CANCELLED', 'INVALID');

-- CreateTable
CREATE TABLE "waiver_claims" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "dropPlayerId" TEXT,
    "bidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "WaiverClaimStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waiver_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waiver_claims_leagueId_status_idx" ON "waiver_claims"("leagueId", "status");

-- CreateIndex
CREATE INDEX "waiver_claims_teamId_status_idx" ON "waiver_claims"("teamId", "status");

-- CreateIndex
CREATE INDEX "waiver_claims_playerId_idx" ON "waiver_claims"("playerId");

-- AddForeignKey
ALTER TABLE "waiver_claims" ADD CONSTRAINT "waiver_claims_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiver_claims" ADD CONSTRAINT "waiver_claims_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiver_claims" ADD CONSTRAINT "waiver_claims_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
