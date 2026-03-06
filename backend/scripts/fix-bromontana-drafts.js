#!/usr/bin/env node
/**
 * Fix BroMontana Bowl draft cost values from spreadsheet truth data
 *
 * Problem: Yahoo API returned incorrect auction cost values for most historical
 * seasons. This script rebuilds draftData.picks[] arrays from the master
 * spreadsheet truth data (docs/bromontana_draft_truth.json).
 *
 * Key behaviors:
 *   - Rebuilds the complete picks[] array from truth data for each year
 *   - Preserves existing playerId, teamKey, isKeeper from DB where player names match
 *   - Handles 6-team years (2020-2024): non-participating owners get empty picks
 *   - Sets the same rebuilt picks on ALL HistoricalSeason records for that year
 *
 * Usage:
 *   cd backend && node scripts/fix-bromontana-drafts.js --dry-run   # default
 *   cd backend && node scripts/fix-bromontana-drafts.js --commit     # write to DB
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const path = require('path');
const prisma = require('../src/lib/prisma');

const LEAGUE_ID = 'cmm47aj1w07klry65jxa29jwu';
const TRUTH_PATH = path.resolve(__dirname, '../../docs/bromontana_draft_truth.json');
const SIX_TEAM_YEARS = [2020, 2021, 2022, 2023, 2024];

// Expected league total costs per year (for verification)
const EXPECTED_TOTALS = {
  2014: 2384, 2015: 2388, 2016: 2389, 2017: 2373,
  2018: 2391, 2019: 2380, 2020: 884,  2021: 1146,
  2022: 1062, 2023: 1224, 2024: 1451, 2025: 2394,
};

// ── Helpers ──

/**
 * Normalize a player name for fuzzy matching:
 * lowercase, collapse whitespace, strip periods/dots
 */
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Try to match a truth pick player name to a DB pick player name.
 * Uses progressively looser matching:
 *   1. Exact normalized match
 *   2. One name contains the other
 *   3. Last-name match (last word)
 */
function findMatchingDbPick(truthPlayerName, dbPicks, ownerName) {
  const truthNorm = normalizeName(truthPlayerName);
  const ownerNorm = normalizeName(ownerName);

  // Filter DB picks to same owner
  const ownerPicks = dbPicks.filter(
    (p) => normalizeName(p.ownerName) === ownerNorm
  );

  // 1. Exact normalized match
  const exact = ownerPicks.find(
    (p) => normalizeName(p.playerName) === truthNorm
  );
  if (exact) return exact;

  // 2. Contains match (either direction)
  const contains = ownerPicks.find((p) => {
    const dbNorm = normalizeName(p.playerName);
    return dbNorm.includes(truthNorm) || truthNorm.includes(dbNorm);
  });
  if (contains) return contains;

  // 3. Last name match (last word of each)
  const truthLast = truthNorm.split(' ').pop();
  if (truthLast && truthLast.length >= 3) {
    const lastMatch = ownerPicks.find((p) => {
      const dbLast = normalizeName(p.playerName).split(' ').pop();
      return dbLast === truthLast;
    });
    if (lastMatch) return lastMatch;
  }

  return null;
}

async function main() {
  const isCommit = process.argv.includes('--commit');
  const isDryRun = !isCommit;

  console.log('=== BroMontana Bowl Draft Cost Fix ===');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no writes)' : 'COMMIT (will write to DB)'}`);
  console.log(`League ID: ${LEAGUE_ID}\n`);

  // Load truth data
  const truthData = require(TRUTH_PATH);
  const truthYears = Object.keys(truthData).map(Number).sort();
  console.log(`Truth data loaded: ${truthYears.length} years (${truthYears[0]}-${truthYears[truthYears.length - 1]})\n`);

  let totalUpdated = 0;
  let totalPicksRebuilt = 0;
  let totalCostDelta = 0;
  let totalUnmatched = 0;
  let totalOwnersCleared = 0;
  const yearSummaries = [];

  for (const year of truthYears) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`YEAR ${year}`);
    console.log('─'.repeat(60));

    const truthYear = truthData[String(year)];
    const truthOwners = Object.keys(truthYear.teams);
    const isSixTeam = SIX_TEAM_YEARS.includes(year);

    console.log(`  Truth owners: ${truthOwners.length} (${truthOwners.join(', ')})`);

    // Fetch all DB records for this year
    const dbSeasons = await prisma.historicalSeason.findMany({
      where: { leagueId: LEAGUE_ID, seasonYear: year },
      select: { id: true, ownerName: true, draftData: true },
    });
    console.log(`  DB records: ${dbSeasons.length}`);

    // Get existing picks from any DB record (they all share the same picks array)
    const sampleSeason = dbSeasons.find((s) => s.draftData?.picks?.length > 0);
    const existingDbPicks = sampleSeason?.draftData?.picks || [];
    const existingType = sampleSeason?.draftData?.type || 'auction';
    const existingRounds = sampleSeason?.draftData?.rounds || null;

    console.log(`  Existing DB picks: ${existingDbPicks.length}`);

    // ── Build the new picks array from truth data ──
    const newPicks = [];
    let globalPickIndex = 0;
    let yearCostDelta = 0;
    let yearUnmatched = 0;
    let yearMatched = 0;

    for (const ownerName of truthOwners) {
      const ownerData = truthYear.teams[ownerName];

      for (let i = 0; i < ownerData.picks.length; i++) {
        const truthPick = ownerData.picks[i];
        globalPickIndex++;

        // Try to find matching DB pick to preserve playerId, teamKey, isKeeper
        const dbMatch = findMatchingDbPick(
          truthPick.player,
          existingDbPicks,
          ownerName
        );

        const newPick = {
          playerName: truthPick.player,
          ownerName: ownerName,
          position: truthPick.position || (dbMatch?.position || null),
          cost: truthPick.cost,
          round: i + 1,
          pick: globalPickIndex,
          // Preserve DB fields if matched
          playerId: dbMatch?.playerId || null,
          teamKey: dbMatch?.teamKey || null,
          isKeeper: dbMatch?.isKeeper || false,
        };

        // Track cost delta
        if (dbMatch) {
          const oldCost = dbMatch.cost || 0;
          const delta = truthPick.cost - oldCost;
          yearCostDelta += delta;
          yearMatched++;
        } else {
          yearUnmatched++;
          if (isDryRun) {
            console.log(
              `    UNMATCHED: ${ownerName} — "${truthPick.player}" ($${truthPick.cost}) — no DB match found`
            );
          }
        }

        newPicks.push(newPick);
      }
    }

    // Verify total cost matches expected
    const truthTotalCost = newPicks.reduce((sum, p) => sum + p.cost, 0);
    const expectedTotal = EXPECTED_TOTALS[year];
    const costCheckPassed = truthTotalCost === expectedTotal;

    console.log(`  Rebuilt picks: ${newPicks.length}`);
    console.log(`  Matched: ${yearMatched}, Unmatched: ${yearUnmatched}`);
    console.log(`  Total cost: $${truthTotalCost} (expected: $${expectedTotal}) ${costCheckPassed ? 'PASS' : 'FAIL'}`);
    console.log(`  Cost delta vs DB: ${yearCostDelta >= 0 ? '+' : ''}${yearCostDelta}`);

    if (!costCheckPassed) {
      console.log(`  ** WARNING: Total cost mismatch! Expected ${expectedTotal}, got ${truthTotalCost}`);
    }

    // ── Identify owners to clear (6-team years) ──
    let clearedOwners = [];
    if (isSixTeam) {
      const truthOwnerSet = new Set(truthOwners.map((n) => normalizeName(n)));
      clearedOwners = dbSeasons
        .filter((s) => !truthOwnerSet.has(normalizeName(s.ownerName)))
        .map((s) => s.ownerName);
      if (clearedOwners.length > 0) {
        console.log(`  6-team year: clearing draft data for ${clearedOwners.length} non-participants: ${clearedOwners.join(', ')}`);
      }
    }

    // ── Build the new draftData for participating owners ──
    const newDraftData = {
      type: existingType,
      rounds: existingRounds,
      picks: newPicks,
    };

    // ── Build empty draftData for non-participating owners ──
    const emptyDraftData = {
      type: existingType,
      rounds: existingRounds,
      picks: [],
    };

    // ── Apply updates ──
    let yearUpdated = 0;
    for (const season of dbSeasons) {
      const isParticipant =
        !isSixTeam ||
        truthOwners.some(
          (t) => normalizeName(t) === normalizeName(season.ownerName)
        );

      const targetDraftData = isParticipant ? newDraftData : emptyDraftData;

      if (!isDryRun) {
        await prisma.historicalSeason.update({
          where: { id: season.id },
          data: { draftData: targetDraftData },
        });
      }

      yearUpdated++;
      if (!isParticipant) {
        totalOwnersCleared++;
      }
    }

    totalUpdated += yearUpdated;
    totalPicksRebuilt += newPicks.length;
    totalCostDelta += yearCostDelta;
    totalUnmatched += yearUnmatched;

    yearSummaries.push({
      year,
      truthOwners: truthOwners.length,
      dbRecords: dbSeasons.length,
      picksRebuilt: newPicks.length,
      matched: yearMatched,
      unmatched: yearUnmatched,
      totalCost: truthTotalCost,
      expectedCost: expectedTotal,
      costCheck: costCheckPassed,
      costDelta: yearCostDelta,
      cleared: clearedOwners.length,
    });

    console.log(`  Records updated: ${yearUpdated} ${isDryRun ? '(dry run)' : ''}`);
  }

  // ── Final Summary ──
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'COMMITTED'}`);
  console.log(`Years processed: ${yearSummaries.length}`);
  console.log(`Total records updated: ${totalUpdated}`);
  console.log(`Total picks rebuilt: ${totalPicksRebuilt}`);
  console.log(`Total cost delta vs DB: ${totalCostDelta >= 0 ? '+' : ''}${totalCostDelta}`);
  console.log(`Total unmatched players: ${totalUnmatched}`);
  console.log(`Non-participant owners cleared (6-team years): ${totalOwnersCleared}`);
  console.log('');

  // Cost verification table
  console.log('Cost verification:');
  console.log('  Year  | Truth | Expected | Status');
  console.log('  ------+-------+----------+-------');
  for (const s of yearSummaries) {
    console.log(
      `  ${s.year}  | ${String(s.totalCost).padStart(5)} | ${String(s.expectedCost).padStart(8)} | ${s.costCheck ? 'PASS' : 'FAIL'}`
    );
  }

  const allPassed = yearSummaries.every((s) => s.costCheck);
  console.log(`\nAll cost checks: ${allPassed ? 'PASSED' : 'SOME FAILED'}`);

  if (isDryRun) {
    console.log('\nThis was a dry run. To apply changes, run:');
    console.log('  cd backend && node scripts/fix-bromontana-drafts.js --commit');
  } else {
    console.log('\nAll changes committed to database.');
  }
}

main()
  .catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
