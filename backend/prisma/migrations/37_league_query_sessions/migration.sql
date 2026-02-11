-- CreateTable
CREATE TABLE "LeagueQuerySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueQuerySession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeagueQuerySession_userId_leagueId_idx" ON "LeagueQuerySession"("userId", "leagueId");

-- AddForeignKey
ALTER TABLE "LeagueQuerySession" ADD CONSTRAINT "LeagueQuerySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueQuerySession" ADD CONSTRAINT "LeagueQuerySession_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
