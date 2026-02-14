-- AlterTable: Add blog fields to league_posts
ALTER TABLE "league_posts" ADD COLUMN IF NOT EXISTS "cover_image" TEXT;
ALTER TABLE "league_posts" ADD COLUMN IF NOT EXISTS "images" JSONB DEFAULT '[]';
ALTER TABLE "league_posts" ADD COLUMN IF NOT EXISTS "view_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "league_posts" ADD COLUMN IF NOT EXISTS "excerpt" TEXT;

-- CreateTable: league_post_views (unique view tracking)
CREATE TABLE IF NOT EXISTS "league_post_views" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_post_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "league_post_views_post_id_user_id_key" ON "league_post_views"("post_id", "user_id");
CREATE INDEX IF NOT EXISTS "league_post_views_post_id_idx" ON "league_post_views"("post_id");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "league_post_views" ADD CONSTRAINT "league_post_views_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "league_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "league_post_views" ADD CONSTRAINT "league_post_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
