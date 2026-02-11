-- CreateTable: Lab Captures
CREATE TABLE "clutch_lab_captures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source_type" TEXT,
    "source_name" TEXT,
    "sentiment" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clutch_lab_captures_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Lab Capture Players
CREATE TABLE "clutch_lab_capture_players" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "capture_id" UUID NOT NULL,
    "player_id" TEXT NOT NULL,
    "auto_detected" BOOLEAN NOT NULL DEFAULT false,
    "confirmed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "clutch_lab_capture_players_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clutch_lab_captures_user_id_created_at_idx" ON "clutch_lab_captures"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "clutch_lab_capture_players_capture_id_idx" ON "clutch_lab_capture_players"("capture_id");

-- CreateIndex
CREATE INDEX "clutch_lab_capture_players_player_id_idx" ON "clutch_lab_capture_players"("player_id");

-- AddForeignKey
ALTER TABLE "clutch_lab_captures" ADD CONSTRAINT "clutch_lab_captures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clutch_lab_capture_players" ADD CONSTRAINT "clutch_lab_capture_players_capture_id_fkey" FOREIGN KEY ("capture_id") REFERENCES "clutch_lab_captures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clutch_lab_capture_players" ADD CONSTRAINT "clutch_lab_capture_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
