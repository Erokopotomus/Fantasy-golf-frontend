-- CreateTable
CREATE TABLE "draft_grades" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "overallGrade" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "positionGrades" JSONB NOT NULL DEFAULT '{}',
    "pickGrades" JSONB NOT NULL DEFAULT '[]',
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bestPick" JSONB,
    "worstPick" JSONB,
    "sleepers" JSONB NOT NULL DEFAULT '[]',
    "reaches" JSONB NOT NULL DEFAULT '[]',
    "sportId" TEXT,
    "algorithm" TEXT NOT NULL DEFAULT 'v1',
    "gradedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draft_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_draft_results" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sportId" TEXT,
    "draftType" TEXT NOT NULL,
    "teamCount" INTEGER NOT NULL,
    "rosterSize" INTEGER NOT NULL,
    "userPosition" INTEGER,
    "dataSource" TEXT NOT NULL DEFAULT 'api',
    "picks" JSONB NOT NULL DEFAULT '[]',
    "userPicks" JSONB NOT NULL DEFAULT '[]',
    "teamNames" JSONB NOT NULL DEFAULT '[]',
    "overallGrade" TEXT,
    "overallScore" DOUBLE PRECISION,
    "positionGrades" JSONB NOT NULL DEFAULT '{}',
    "pickGrades" JSONB NOT NULL DEFAULT '[]',
    "bestPick" JSONB,
    "worstPick" JSONB,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mock_draft_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "draft_grades_draftId_teamId_key" ON "draft_grades"("draftId", "teamId");

-- CreateIndex
CREATE INDEX "mock_draft_results_userId_completedAt_idx" ON "mock_draft_results"("userId", "completedAt");

-- AddForeignKey
ALTER TABLE "draft_grades" ADD CONSTRAINT "draft_grades_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_grades" ADD CONSTRAINT "draft_grades_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_draft_results" ADD CONSTRAINT "mock_draft_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_draft_results" ADD CONSTRAINT "mock_draft_results_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
