-- Migration 39: Owner Aliases (Commissioner owner name grouping)
-- Matches Prisma's expected format (CREATE UNIQUE INDEX, not ALTER TABLE ADD CONSTRAINT)

-- CreateTable
CREATE TABLE "owner_aliases" (
    "id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "canonical_name" TEXT NOT NULL,
    "owner_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "owner_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "owner_aliases_league_id_owner_name_key" ON "owner_aliases"("league_id", "owner_name");

-- CreateIndex
CREATE INDEX "owner_aliases_league_id_idx" ON "owner_aliases"("league_id");

-- AddForeignKey
ALTER TABLE "owner_aliases" ADD CONSTRAINT "owner_aliases_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_aliases" ADD CONSTRAINT "owner_aliases_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
