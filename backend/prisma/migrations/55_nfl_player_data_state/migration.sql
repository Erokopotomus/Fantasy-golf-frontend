-- CreateTable
CREATE TABLE "nfl_player_data_state" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "inPool" BOOLEAN NOT NULL DEFAULT false,
    "fetchedThrough" INTEGER,
    "earliestFetched" INTEGER,
    "lastFetchedAt" TIMESTAMP(3),
    "lazyFetchedAt" TIMESTAMP(3),
    "lazyFetchError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nfl_player_data_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nfl_player_data_state_playerId_key" ON "nfl_player_data_state"("playerId");

-- CreateIndex
CREATE INDEX "nfl_player_data_state_inPool_idx" ON "nfl_player_data_state"("inPool");

-- AddForeignKey
ALTER TABLE "nfl_player_data_state" ADD CONSTRAINT "nfl_player_data_state_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
