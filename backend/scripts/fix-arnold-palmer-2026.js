#!/usr/bin/env node
/**
 * Fix Arnold Palmer Invitational 2026 Tournament
 *
 * Problem: The 2026 API tournament record (ID: cmlabp7ot02mlo02tsztxojvb)
 * has stale 2025 results contaminating it. This script clears all data
 * associated with the tournament to prepare for fresh 2026 ingestion.
 *
 * Operations (in order):
 *   1. Delete ALL RoundScore records for this tournament
 *   2. Delete ALL Performance records for this tournament
 *   3. Reset currentRound to 1 on the Tournament record
 *   4. Log counts of deleted records
 *   5. Print verification summary
 *
 * Usage:
 *   node backend/scripts/fix-arnold-palmer-2026.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const prisma = require('../src/lib/prisma');

const TOURNAMENT_ID = 'cmlabp7ot02mlo02tsztxojvb';

async function main() {
  console.log('=== Arnold Palmer Invitational 2026 Fix ===\n');
  console.log(`Tournament ID: ${TOURNAMENT_ID}\n`);

  try {
    // Step 1: Delete all RoundScore records for this tournament
    console.log('Step 1: Deleting RoundScore records...');
    const deleteRoundScores = await prisma.roundScore.deleteMany({
      where: {
        tournament: {
          id: TOURNAMENT_ID,
        },
      },
    });
    console.log(`  ✓ Deleted ${deleteRoundScores.count} RoundScore records\n`);

    // Step 2: Delete all Performance records for this tournament
    console.log('Step 2: Deleting Performance records...');
    const deletePerformances = await prisma.performance.deleteMany({
      where: {
        tournament: {
          id: TOURNAMENT_ID,
        },
      },
    });
    console.log(`  ✓ Deleted ${deletePerformances.count} Performance records\n`);

    // Step 3: Reset currentRound to 1
    console.log('Step 3: Resetting currentRound to 1...');
    const updateTournament = await prisma.tournament.update({
      where: {
        id: TOURNAMENT_ID,
      },
      data: {
        currentRound: 1,
      },
    });
    console.log(`  ✓ Tournament currentRound reset to 1\n`);

    // Step 4: Fetch tournament for verification
    console.log('Step 4: Verification...');
    const tournament = await prisma.tournament.findUnique({
      where: {
        id: TOURNAMENT_ID,
      },
      select: {
        id: true,
        name: true,
        currentRound: true,
        _count: {
          select: {
            performances: true,
            roundScores: true,
          },
        },
      },
    });

    // Step 5: Print summary
    console.log('\n=== Summary ===');
    console.log(`Tournament: ${tournament.name}`);
    console.log(`  ID: ${tournament.id}`);
    console.log(`  Current Round: ${tournament.currentRound}`);
    console.log(`  Remaining Performances: ${tournament._count.performances}`);
    console.log(`  Remaining RoundScores: ${tournament._count.roundScores}`);
    console.log('\nRecords Deleted:');
    console.log(`  RoundScore: ${deleteRoundScores.count}`);
    console.log(`  Performance: ${deletePerformances.count}`);
    console.log('\nDone! Tournament cleaned and ready for 2026 data.\n');
  } catch (err) {
    console.error('Script failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
