-- Step 4C: Add baseline_rank to draft board entries for divergence tracking
ALTER TABLE "clutch_draft_board_entries" ADD COLUMN "baseline_rank" INTEGER;

-- Step 5: Watch List
CREATE TABLE "clutch_watch_list" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "note" VARCHAR(280),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clutch_watch_list_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clutch_watch_list_userId_playerId_key" ON "clutch_watch_list"("userId", "playerId");
CREATE INDEX "clutch_watch_list_userId_sport_idx" ON "clutch_watch_list"("userId", "sport");

ALTER TABLE "clutch_watch_list" ADD CONSTRAINT "clutch_watch_list_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clutch_watch_list" ADD CONSTRAINT "clutch_watch_list_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Board Activity Log (Decision Journal)
CREATE TABLE "clutch_board_activities" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "playerId" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clutch_board_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "clutch_board_activities_boardId_createdAt_idx" ON "clutch_board_activities"("boardId", "createdAt");
CREATE INDEX "clutch_board_activities_userId_createdAt_idx" ON "clutch_board_activities"("userId", "createdAt");

ALTER TABLE "clutch_board_activities" ADD CONSTRAINT "clutch_board_activities_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "clutch_draft_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clutch_board_activities" ADD CONSTRAINT "clutch_board_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
