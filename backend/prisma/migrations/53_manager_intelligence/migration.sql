-- CreateTable
CREATE TABLE "manager_characteristics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characteristicType" VARCHAR(50) NOT NULL,
    "value" JSONB NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "consistencyPct" DOUBLE PRECISION NOT NULL,
    "effectSize" DOUBLE PRECISION NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "confidenceLabel" VARCHAR(10) NOT NULL,
    "rawEvidence" JSONB NOT NULL,
    "sourceImportIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manager_characteristics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characteristic_aggregates" (
    "id" TEXT NOT NULL,
    "characteristicType" VARCHAR(50) NOT NULL,
    "totalUsers" INTEGER NOT NULL,
    "usersWithData" INTEGER NOT NULL,
    "highConfidenceCount" INTEGER NOT NULL DEFAULT 0,
    "medConfidenceCount" INTEGER NOT NULL DEFAULT 0,
    "lowConfidenceCount" INTEGER NOT NULL DEFAULT 0,
    "noDataCount" INTEGER NOT NULL DEFAULT 0,
    "avgConfidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "promoteToCoach" BOOLEAN NOT NULL DEFAULT false,
    "suppressed" BOOLEAN NOT NULL DEFAULT false,
    "thresholdsOverride" JSONB,
    "adminNotes" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "characteristic_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "manager_characteristics_characteristicType_confidenceScore_idx" ON "manager_characteristics"("characteristicType", "confidenceScore" DESC);

-- CreateIndex
CREATE INDEX "manager_characteristics_userId_idx" ON "manager_characteristics"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "manager_characteristics_userId_characteristicType_key" ON "manager_characteristics"("userId", "characteristicType");

-- CreateIndex
CREATE UNIQUE INDEX "characteristic_aggregates_characteristicType_key" ON "characteristic_aggregates"("characteristicType");

-- AddForeignKey
ALTER TABLE "manager_characteristics" ADD CONSTRAINT "manager_characteristics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

