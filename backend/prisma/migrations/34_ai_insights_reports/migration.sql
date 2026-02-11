-- Phase 6C: AI Insights + Reports
CREATE TABLE "AiInsight" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sport" TEXT,
  "insightType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "metadata" JSONB,
  "priority" INTEGER DEFAULT 5,
  "status" TEXT DEFAULT 'active',
  "expiresAt" TIMESTAMP(3),
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dismissedAt" TIMESTAMP(3),
  "tokenCount" INTEGER,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("userId") REFERENCES "users"("id")
);

CREATE INDEX "idx_insight_user_status" ON "AiInsight"("userId", "status", "priority");
CREATE INDEX "idx_insight_user_type" ON "AiInsight"("userId", "insightType");

CREATE TABLE "AiReport" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "sport" TEXT NOT NULL,
  "reportType" TEXT NOT NULL,
  "subjectId" TEXT,
  "contentJson" JSONB NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "tokenCount" INTEGER,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("userId") REFERENCES "users"("id")
);

CREATE INDEX "idx_report_sport_type" ON "AiReport"("sport", "reportType", "subjectId");
CREATE INDEX "idx_report_user" ON "AiReport"("userId", "reportType");
