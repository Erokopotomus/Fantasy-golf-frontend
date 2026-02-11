-- Phase 6B: User Intelligence Profile (Decision Graph + Pattern Engine cache)
CREATE TABLE "UserIntelligenceProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sport" TEXT NOT NULL,
  "profileData" JSONB NOT NULL,
  "dataConfidence" TEXT NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("userId") REFERENCES "users"("id")
);

CREATE UNIQUE INDEX "UserIntelligenceProfile_userId_sport_key" ON "UserIntelligenceProfile"("userId", "sport");
CREATE INDEX "idx_intelligence_user" ON "UserIntelligenceProfile"("userId");
