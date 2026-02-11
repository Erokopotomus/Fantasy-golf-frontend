-- CreateTable: Lab Cheat Sheets
CREATE TABLE "clutch_lab_cheatsheets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content_json" JSONB NOT NULL,
    "format_settings" JSONB,
    "generated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ,
    "published_at" TIMESTAMPTZ,

    CONSTRAINT "clutch_lab_cheatsheets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clutch_lab_cheatsheets_user_id_idx" ON "clutch_lab_cheatsheets"("user_id");

-- CreateIndex
CREATE INDEX "clutch_lab_cheatsheets_board_id_idx" ON "clutch_lab_cheatsheets"("board_id");

-- AddForeignKey
ALTER TABLE "clutch_lab_cheatsheets" ADD CONSTRAINT "clutch_lab_cheatsheets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clutch_lab_cheatsheets" ADD CONSTRAINT "clutch_lab_cheatsheets_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "clutch_draft_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
