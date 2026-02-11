-- CreateTable: Lab Insight Cache
CREATE TABLE "clutch_lab_insights_cache" (
    "user_id" TEXT NOT NULL,
    "insight_text" TEXT NOT NULL,
    "insight_type" TEXT NOT NULL,
    "generated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissed_at" TIMESTAMPTZ,

    CONSTRAINT "clutch_lab_insights_cache_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "clutch_lab_insights_cache" ADD CONSTRAINT "clutch_lab_insights_cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
