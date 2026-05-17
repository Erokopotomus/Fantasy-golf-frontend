-- AlterTable
ALTER TABLE "draft_picks" ADD COLUMN     "adpAtPick" DOUBLE PRECISION,
ADD COLUMN     "auctionValueAtPick" DOUBLE PRECISION,
ADD COLUMN     "availablePool" JSONB,
ADD COLUMN     "clientVersion" VARCHAR(40),
ADD COLUMN     "isMock" BOOLEAN DEFAULT false,
ADD COLUMN     "leagueContext" JSONB,
ADD COLUMN     "mockMeta" JSONB,
ADD COLUMN     "pickIntent" VARCHAR(20),
ADD COLUMN     "pickQuality" VARCHAR(20),
ADD COLUMN     "projectedPtsAtPick" DOUBLE PRECISION,
ADD COLUMN     "reasonChips" JSONB,
ADD COLUMN     "reasonText" VARCHAR(280),
ADD COLUMN     "surface" VARCHAR(40),
ADD COLUMN     "timeOnClockMs" INTEGER,
ADD COLUMN     "timeOnClockPctOfMax" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "lineup_snapshots" ADD COLUMN     "clientVersion" VARCHAR(40),
ADD COLUMN     "decisions" JSONB,
ADD COLUMN     "editCount" INTEGER DEFAULT 0,
ADD COLUMN     "lastEditedAt" TIMESTAMP(3),
ADD COLUMN     "leagueContext" JSONB,
ADD COLUMN     "surface" VARCHAR(40);

-- AlterTable
ALTER TABLE "roster_transactions" ADD COLUMN     "acquisitionType" VARCHAR(20),
ADD COLUMN     "clientVersion" VARCHAR(40),
ADD COLUMN     "daysSinceAcquisition" INTEGER,
ADD COLUMN     "leagueContext" JSONB,
ADD COLUMN     "reasonChips" JSONB,
ADD COLUMN     "reasonText" VARCHAR(280),
ADD COLUMN     "surface" VARCHAR(40),
ADD COLUMN     "wasOnActiveLineup" BOOLEAN;

-- AlterTable
ALTER TABLE "trades" ADD COLUMN     "clientVersion" VARCHAR(40),
ADD COLUMN     "declineReason" VARCHAR(30),
ADD COLUMN     "leagueContext" JSONB,
ADD COLUMN     "proposerProjectedValue" DOUBLE PRECISION,
ADD COLUMN     "proposerReasonChips" JSONB,
ADD COLUMN     "responderProjectedValue" DOUBLE PRECISION,
ADD COLUMN     "responderReasonChips" JSONB,
ADD COLUMN     "surface" VARCHAR(40);

-- AlterTable
ALTER TABLE "waiver_claims" ADD COLUMN     "acquisitionRoute" VARCHAR(20),
ADD COLUMN     "clientVersion" VARCHAR(40),
ADD COLUMN     "faabPctAtBid" DOUBLE PRECISION,
ADD COLUMN     "faabRemainingAtBid" DOUBLE PRECISION,
ADD COLUMN     "leagueContext" JSONB,
ADD COLUMN     "reasonChips" JSONB,
ADD COLUMN     "surface" VARCHAR(40),
ADD COLUMN     "trendingRank" INTEGER,
ADD COLUMN     "trendingSources" JSONB;

-- CreateTable
CREATE TABLE "watchlist_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "sport" VARCHAR(10) NOT NULL,
    "action" VARCHAR(10) NOT NULL,
    "adpAtAction" DOUBLE PRECISION,
    "projectedPtsAtAction" DOUBLE PRECISION,
    "contentVelocityAtAction" INTEGER,
    "watchlistSizeBefore" INTEGER,
    "isMockTarget" BOOLEAN,
    "reasonChips" JSONB,
    "reasonText" VARCHAR(280),
    "clientVersion" VARCHAR(40),
    "surface" VARCHAR(40),
    "leagueContext" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_nominations" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "nominatedByUserId" TEXT NOT NULL,
    "nominatedByTeamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "openingBid" DOUBLE PRECISION NOT NULL,
    "nominationOrderIndex" INTEGER NOT NULL,
    "wasOnNominatorWatchlist" BOOLEAN NOT NULL DEFAULT false,
    "remainingBudgetAtNom" DOUBLE PRECISION,
    "remainingRosterSlotsAtNom" INTEGER,
    "marketValueAtNom" DOUBLE PRECISION,
    "finalPrice" DOUBLE PRECISION,
    "acquiredByUserId" TEXT,
    "wasNominatorTarget" BOOLEAN,
    "reasonChips" JSONB,
    "reasonText" VARCHAR(280),
    "clientVersion" VARCHAR(40),
    "surface" VARCHAR(40),
    "leagueContext" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_nominations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "watchlist_events_userId_occurredAt_idx" ON "watchlist_events"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "watchlist_events_userId_playerId_occurredAt_idx" ON "watchlist_events"("userId", "playerId", "occurredAt");

-- CreateIndex
CREATE INDEX "watchlist_events_playerId_occurredAt_idx" ON "watchlist_events"("playerId", "occurredAt");

-- CreateIndex
CREATE INDEX "auction_nominations_draftId_occurredAt_idx" ON "auction_nominations"("draftId", "occurredAt");

-- CreateIndex
CREATE INDEX "auction_nominations_nominatedByUserId_occurredAt_idx" ON "auction_nominations"("nominatedByUserId", "occurredAt");

-- CreateIndex
CREATE INDEX "auction_nominations_playerId_occurredAt_idx" ON "auction_nominations"("playerId", "occurredAt");

-- AddForeignKey
ALTER TABLE "watchlist_events" ADD CONSTRAINT "watchlist_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_events" ADD CONSTRAINT "watchlist_events_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_nominations" ADD CONSTRAINT "auction_nominations_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_nominations" ADD CONSTRAINT "auction_nominations_nominatedByUserId_fkey" FOREIGN KEY ("nominatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_nominations" ADD CONSTRAINT "auction_nominations_nominatedByTeamId_fkey" FOREIGN KEY ("nominatedByTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_nominations" ADD CONSTRAINT "auction_nominations_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_nominations" ADD CONSTRAINT "auction_nominations_acquiredByUserId_fkey" FOREIGN KEY ("acquiredByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

