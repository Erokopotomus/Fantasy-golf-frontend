-- Migration 39: Owner Aliases (Commissioner owner name grouping)
-- Column names use camelCase to match Prisma model (no @map decorators)

-- CreateTable
CREATE TABLE "owner_aliases" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "owner_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "owner_aliases_leagueId_ownerName_key" ON "owner_aliases"("leagueId", "ownerName");

-- CreateIndex
CREATE INDEX "owner_aliases_leagueId_idx" ON "owner_aliases"("leagueId");

-- AddForeignKey
ALTER TABLE "owner_aliases" ADD CONSTRAINT "owner_aliases_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_aliases" ADD CONSTRAINT "owner_aliases_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
