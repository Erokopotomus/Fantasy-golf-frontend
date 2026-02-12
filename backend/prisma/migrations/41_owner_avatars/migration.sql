-- CreateTable
CREATE TABLE IF NOT EXISTS "owner_avatars" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "owner_avatars_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "owner_avatars_leagueId_idx" ON "owner_avatars"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "owner_avatars_leagueId_ownerName_key" ON "owner_avatars"("leagueId", "ownerName");

-- AddForeignKey (idempotent: only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'owner_avatars_leagueId_fkey') THEN
        ALTER TABLE "owner_avatars" ADD CONSTRAINT "owner_avatars_leagueId_fkey"
            FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
