-- Phase 6A-3: Board vs Reality comparison
-- Tracks how actual draft picks compare to pre-draft board rankings

CREATE TABLE "draft_board_comparisons" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "draftId" TEXT,
  "mockDraftId" TEXT,
  "boardId" TEXT NOT NULL,
  "sport" TEXT NOT NULL,
  "comparisonData" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "draft_board_comparisons_draftId_boardId_key" ON "draft_board_comparisons"("draftId", "boardId") WHERE "draftId" IS NOT NULL;
CREATE UNIQUE INDEX "draft_board_comparisons_mockDraftId_boardId_key" ON "draft_board_comparisons"("mockDraftId", "boardId") WHERE "mockDraftId" IS NOT NULL;
CREATE INDEX "draft_board_comparisons_userId_idx" ON "draft_board_comparisons"("userId");
