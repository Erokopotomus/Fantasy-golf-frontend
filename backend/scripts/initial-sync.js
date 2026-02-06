#!/usr/bin/env node
/**
 * Initial Data Sync Script
 *
 * Populates the database with real DataGolf data:
 * 1. All PGA Tour players with rankings & strokes gained stats
 * 2. Full 2026 tournament schedule
 * 3. Pre-tournament predictions for completed events
 * 4. Current tournament field + tee times + DFS salaries
 *
 * Usage: node scripts/initial-sync.js
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const {
  syncPlayers,
  syncSchedule,
  syncFieldAndTeeTimesForTournament,
  syncPreTournamentPredictions,
} = require('../src/services/datagolfSync')

const prisma = new PrismaClient()

async function main() {
  console.log('='.repeat(60))
  console.log('  CLUTCH — Initial Data Sync')
  console.log('='.repeat(60))
  console.log()

  const results = {}

  // ── Step 1: Sync Players ──────────────────────────────────────
  console.log('▶ Step 1/4: Syncing players (rankings, SG stats)...')
  try {
    results.players = await syncPlayers(prisma)
    console.log(`  ✓ ${results.players.total} players (${results.players.created} new, ${results.players.updated} updated)\n`)
  } catch (err) {
    console.error(`  ✗ Player sync failed: ${err.message}\n`)
    results.players = { error: err.message }
  }

  // ── Step 2: Sync Schedule ─────────────────────────────────────
  console.log('▶ Step 2/4: Syncing 2026 tournament schedule...')
  try {
    results.schedule = await syncSchedule(prisma)
    console.log(`  ✓ ${results.schedule.total} tournaments (${results.schedule.created} new, ${results.schedule.updated} updated)\n`)
  } catch (err) {
    console.error(`  ✗ Schedule sync failed: ${err.message}\n`)
    results.schedule = { error: err.message }
  }

  // ── Step 3: Backfill predictions for completed events ─────────
  console.log('▶ Step 3/4: Backfilling predictions for completed events...')
  const completedTournaments = await prisma.tournament.findMany({
    where: { status: 'COMPLETED', datagolfId: { not: null } },
    orderBy: { startDate: 'asc' },
  })

  results.predictions = []
  for (const t of completedTournaments) {
    try {
      const pred = await syncPreTournamentPredictions(t.datagolfId, prisma)
      results.predictions.push({ name: t.name, ...pred })
      console.log(`  ✓ ${t.name}: ${pred.predictions} player predictions`)
    } catch (err) {
      console.log(`  ✗ ${t.name}: ${err.message}`)
      results.predictions.push({ name: t.name, error: err.message })
    }
  }
  if (completedTournaments.length === 0) {
    console.log('  (no completed tournaments found)')
  }
  console.log()

  // ── Step 4: Sync current tournament field ─────────────────────
  console.log('▶ Step 4/4: Syncing current tournament field...')
  const currentTournament = await prisma.tournament.findFirst({
    where: {
      status: { in: ['UPCOMING', 'IN_PROGRESS'] },
      datagolfId: { not: null },
    },
    orderBy: { startDate: 'asc' },
  })

  if (currentTournament) {
    try {
      results.field = await syncFieldAndTeeTimesForTournament(currentTournament.datagolfId, prisma)
      console.log(`  ✓ ${currentTournament.name}: ${results.field.playersInField} players, ${results.field.teeTimes} tee times, ${results.field.dfsSalaries} DFS salaries`)
    } catch (err) {
      console.error(`  ✗ ${currentTournament.name}: ${err.message}`)
      results.field = { error: err.message }
    }
  } else {
    console.log('  (no upcoming tournament found)')
  }

  // ── Summary ───────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60))
  console.log('  SYNC COMPLETE')
  console.log('='.repeat(60))

  const playerCount = await prisma.player.count()
  const tournamentCount = await prisma.tournament.count()
  const perfCount = await prisma.performance.count()
  const predCount = await prisma.playerPrediction.count()

  console.log(`  Players in DB:      ${playerCount}`)
  console.log(`  Tournaments in DB:  ${tournamentCount}`)
  console.log(`  Performances:       ${perfCount}`)
  console.log(`  Predictions:        ${predCount}`)
  console.log()
}

main()
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
