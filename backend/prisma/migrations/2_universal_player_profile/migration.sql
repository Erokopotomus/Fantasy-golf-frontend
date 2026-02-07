-- Universal Player Profile Layer
-- 9 new models, 1 new enum, Player.sportId + RosterEntry.rosterStatus

-- CreateEnum
CREATE TYPE "TagCategory" AS ENUM ('STATUS', 'SKILL', 'HEALTH', 'CONTRACT', 'CUSTOM');

-- AlterTable
ALTER TABLE "players" ADD COLUMN     "sportId" TEXT;

-- AlterTable
ALTER TABLE "roster_entries" ADD COLUMN     "rosterStatus" TEXT NOT NULL DEFAULT 'BENCH';

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "abbr" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_positions" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster_slot_definitions" (
    "id" TEXT NOT NULL,
    "scoringSystemId" TEXT,
    "leagueId" TEXT,
    "slotKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "slotType" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "maxPlayers" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roster_slot_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster_slot_eligibility" (
    "id" TEXT NOT NULL,
    "rosterSlotDefinitionId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,

    CONSTRAINT "roster_slot_eligibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster_slot_assignments" (
    "id" TEXT NOT NULL,
    "rosterSlotDefinitionId" TEXT NOT NULL,
    "rosterEntryId" TEXT NOT NULL,
    "fantasyWeekId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roster_slot_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_tags" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TagCategory" NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_tag_assignments" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "seasonId" TEXT,
    "value" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_tag_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_budgets" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "leagueSeasonId" TEXT NOT NULL,
    "totalBudget" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remaining" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "spentByPosition" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sport_player_profiles" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "stats" JSONB NOT NULL DEFAULT '{}',
    "rankings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sport_player_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "positions_sportId_abbr_key" ON "positions"("sportId", "abbr");

-- CreateIndex
CREATE INDEX "player_positions_positionId_idx" ON "player_positions"("positionId");

-- CreateIndex
CREATE UNIQUE INDEX "player_positions_playerId_positionId_key" ON "player_positions"("playerId", "positionId");

-- CreateIndex
CREATE UNIQUE INDEX "roster_slot_definitions_scoringSystemId_slotKey_key" ON "roster_slot_definitions"("scoringSystemId", "slotKey");

-- CreateIndex
CREATE UNIQUE INDEX "roster_slot_definitions_leagueId_slotKey_key" ON "roster_slot_definitions"("leagueId", "slotKey");

-- CreateIndex
CREATE UNIQUE INDEX "roster_slot_eligibility_rosterSlotDefinitionId_positionId_key" ON "roster_slot_eligibility"("rosterSlotDefinitionId", "positionId");

-- CreateIndex
CREATE INDEX "roster_slot_assignments_rosterEntryId_fantasyWeekId_idx" ON "roster_slot_assignments"("rosterEntryId", "fantasyWeekId");

-- CreateIndex
CREATE UNIQUE INDEX "roster_slot_assignments_rosterSlotDefinitionId_fantasyWeekI_key" ON "roster_slot_assignments"("rosterSlotDefinitionId", "fantasyWeekId", "rosterEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "player_tags_sportId_slug_key" ON "player_tags"("sportId", "slug");

-- CreateIndex
CREATE INDEX "player_tag_assignments_tagId_idx" ON "player_tag_assignments"("tagId");

-- CreateIndex
CREATE INDEX "player_tag_assignments_seasonId_idx" ON "player_tag_assignments"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "player_tag_assignments_playerId_tagId_seasonId_key" ON "player_tag_assignments"("playerId", "tagId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "team_budgets_teamId_leagueSeasonId_key" ON "team_budgets"("teamId", "leagueSeasonId");

-- CreateIndex
CREATE INDEX "sport_player_profiles_sportId_seasonId_idx" ON "sport_player_profiles"("sportId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "sport_player_profiles_playerId_sportId_seasonId_key" ON "sport_player_profiles"("playerId", "sportId", "seasonId");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_positions" ADD CONSTRAINT "player_positions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_positions" ADD CONSTRAINT "player_positions_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_slot_definitions" ADD CONSTRAINT "roster_slot_definitions_scoringSystemId_fkey" FOREIGN KEY ("scoringSystemId") REFERENCES "scoring_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_slot_definitions" ADD CONSTRAINT "roster_slot_definitions_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_slot_eligibility" ADD CONSTRAINT "roster_slot_eligibility_rosterSlotDefinitionId_fkey" FOREIGN KEY ("rosterSlotDefinitionId") REFERENCES "roster_slot_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_slot_eligibility" ADD CONSTRAINT "roster_slot_eligibility_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_slot_assignments" ADD CONSTRAINT "roster_slot_assignments_rosterSlotDefinitionId_fkey" FOREIGN KEY ("rosterSlotDefinitionId") REFERENCES "roster_slot_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_slot_assignments" ADD CONSTRAINT "roster_slot_assignments_rosterEntryId_fkey" FOREIGN KEY ("rosterEntryId") REFERENCES "roster_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_slot_assignments" ADD CONSTRAINT "roster_slot_assignments_fantasyWeekId_fkey" FOREIGN KEY ("fantasyWeekId") REFERENCES "fantasy_weeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_tags" ADD CONSTRAINT "player_tags_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_tag_assignments" ADD CONSTRAINT "player_tag_assignments_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_tag_assignments" ADD CONSTRAINT "player_tag_assignments_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "player_tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_tag_assignments" ADD CONSTRAINT "player_tag_assignments_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_budgets" ADD CONSTRAINT "team_budgets_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_budgets" ADD CONSTRAINT "team_budgets_leagueSeasonId_fkey" FOREIGN KEY ("leagueSeasonId") REFERENCES "league_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sport_player_profiles" ADD CONSTRAINT "sport_player_profiles_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sport_player_profiles" ADD CONSTRAINT "sport_player_profiles_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sport_player_profiles" ADD CONSTRAINT "sport_player_profiles_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- GIN Index on TeamBudget.spentByPosition for fast JSONB queries
CREATE INDEX IF NOT EXISTS idx_team_budgets_spent_by_position_gin ON team_budgets USING GIN ("spentByPosition");

-- Backfill rosterStatus from position for existing rows
UPDATE roster_entries SET "rosterStatus" = position WHERE "rosterStatus" = 'BENCH' AND position != 'BENCH';
