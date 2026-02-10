-- CreateTable
CREATE TABLE "clutch_draft_boards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scoringFormat" TEXT NOT NULL DEFAULT 'ppr',
    "sport" TEXT NOT NULL DEFAULT 'nfl',
    "season" INTEGER NOT NULL DEFAULT 2026,
    "boardType" TEXT NOT NULL DEFAULT 'overall',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clutch_draft_boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clutch_draft_board_entries" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "tier" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clutch_draft_board_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clutch_draft_boards_userId_idx" ON "clutch_draft_boards"("userId");

-- CreateIndex
CREATE INDEX "clutch_draft_boards_userId_sport_idx" ON "clutch_draft_boards"("userId", "sport");

-- CreateIndex
CREATE INDEX "clutch_draft_board_entries_boardId_idx" ON "clutch_draft_board_entries"("boardId");

-- CreateIndex
CREATE INDEX "clutch_draft_board_entries_boardId_rank_idx" ON "clutch_draft_board_entries"("boardId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "clutch_draft_board_entries_boardId_playerId_key" ON "clutch_draft_board_entries"("boardId", "playerId");

-- AddForeignKey
ALTER TABLE "clutch_draft_boards" ADD CONSTRAINT "clutch_draft_boards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clutch_draft_board_entries" ADD CONSTRAINT "clutch_draft_board_entries_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "clutch_draft_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clutch_draft_board_entries" ADD CONSTRAINT "clutch_draft_board_entries_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
