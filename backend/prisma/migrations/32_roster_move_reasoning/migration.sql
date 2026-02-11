-- Phase 6A-6: Reasoning fields on roster moves
-- Captures user reasoning for waiver claims, trades, and lineup decisions

ALTER TABLE "waiver_claims" ADD COLUMN "reasoning" VARCHAR(280);
ALTER TABLE "trades" ADD COLUMN "proposerReasoning" VARCHAR(280);
ALTER TABLE "trades" ADD COLUMN "responderReasoning" VARCHAR(280);
ALTER TABLE "lineup_snapshots" ADD COLUMN "decisionNotes" JSONB;
