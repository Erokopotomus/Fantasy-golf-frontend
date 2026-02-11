-- Phase 6A-1: Prediction thesis, confidence, key factors
-- Adds reasoning fields to predictions for the Decision Graph

ALTER TABLE "predictions" ADD COLUMN "thesis" VARCHAR(280);
ALTER TABLE "predictions" ADD COLUMN "confidenceLevel" INTEGER;
ALTER TABLE "predictions" ADD COLUMN "keyFactors" JSONB;
