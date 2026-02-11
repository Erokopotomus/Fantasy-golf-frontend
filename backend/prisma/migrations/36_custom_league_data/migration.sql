-- CreateTable
CREATE TABLE "CustomLeagueData" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "importedBy" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceFileName" TEXT,
    "dataCategory" TEXT NOT NULL,
    "seasonYear" INTEGER,
    "data" JSONB NOT NULL,
    "columnMapping" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomLeagueData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomLeagueData_leagueId_dataCategory_idx" ON "CustomLeagueData"("leagueId", "dataCategory");

-- CreateIndex
CREATE INDEX "CustomLeagueData_leagueId_seasonYear_idx" ON "CustomLeagueData"("leagueId", "seasonYear");

-- AddForeignKey
ALTER TABLE "CustomLeagueData" ADD CONSTRAINT "CustomLeagueData_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomLeagueData" ADD CONSTRAINT "CustomLeagueData_importedBy_fkey" FOREIGN KEY ("importedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
