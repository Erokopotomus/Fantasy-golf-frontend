#!/usr/bin/env node
/**
 * Fix BroMontana Bowl draft cost values — V2 (corrected)
 *
 * V1 had bad truth data (some years parsed as 6-team when they're all 12-team).
 * V2 uses bromontana_draft_truth_v2.json which correctly parses ALL 12 owners
 * for every year from the original spreadsheet.
 *
 * Usage:
 *   cd backend && node scripts/fix-bromontana-drafts-v2.js --dry-run
 *   cd backend && node scripts/fix-bromontana-drafts-v2.js --commit
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const path = require('path');
const prisma = require('../src/lib/prisma');

const LEAGUE_ID = 'cmm47aj1w07klry65jxa29jwu';
const TRUTH_PATH = path.resolve(__dirname, '../../docs/bromontana_draft_truth_v2.json');

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
}

function findMatchingDbPick(truthPlayerName, dbPicks, ownerName) {
  const truthNorm = normalizeName(truthPlayerName);
  const ownerNorm = normalizeName(ownerName);
  const ownerPicks = dbPicks.filter(p => normalizeName(p.ownerName) === ownerNorm);

  const exact = ownerPicks.find(p => normalizeName(p.playerName) === truthNorm);
  if (exact) return exact;

  const contains = ownerPicks.find(p => {
    const dbNorm = normalizeName(p.playerName);
    return dbNorm.includes(truthNorm) || truthNorm.includes(dbNorm);
  });
  if (contains) return contains;

  const truthLast = truthNorm.split(' ').pop();
  if (truthLast && truthLast.length >= 3) {
    const lastMatch = ownerPicks.find(p => {
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

  console.log('=== BroMontana Bowl Draft Cost Fix V2 ===');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'COMMIT'}`);
  console.log(`League: ${LEAGUE_ID}\n`);

  const truthData = require(TRUTH_PATH);
  const truthYears = Object.keys(truthData).map(Number).sort();
  console.log(`Truth: ${truthYears.length} years, ALL should be 12 owners\n`);

  for (const year of truthYears) {
    const truth = truthData[String(year)];
    const truthOwners = Object.keys(truth.teams);

    console.log(`--- ${year}: ${truthOwners.length} owners, $${truth.league_total} total, ${truth.total_picks} picks ---`);

    if (truthOwners.length !== 12) {
      console.log(`  ** WARNING: Expected 12 owners, got ${truthOwners.length} — SKIPPING`);
      continue;
    }

    const dbSeasons = await prisma.historicalSeason.findMany({
      where: { leagueId: LEAGUE_ID, seasonYear: year },
      select: { id: true, ownerName: true, draftData: true },
    });

    const sampleSeason = dbSeasons.find(s => s.draftData?.picks?.length > 0);
    const existingDbPicks = sampleSeason?.draftData?.picks || [];
    const existingType = sampleSeason?.draftData?.type || 'auction';

    // Build new picks array from truth
    const newPicks = [];
    let pickIndex = 0;
    let matched = 0, unmatched = 0;

    for (const ownerName of truthOwners) {
      const ownerData = truth.teams[ownerName];
      for (let i = 0; i < ownerData.picks.length; i++) {
        const tp = ownerData.picks[i];
        pickIndex++;
        const dbMatch = findMatchingDbPick(tp.player, existingDbPicks, ownerName);

        newPicks.push({
          playerName: tp.player,
          ownerName: ownerName,
          position: tp.position || (dbMatch?.position || null),
          cost: tp.cost,
          round: i + 1,
          pick: pickIndex,
          playerId: dbMatch?.playerId || null,
          teamKey: dbMatch?.teamKey || null,
          isKeeper: dbMatch?.isKeeper || false,
        });

        if (dbMatch) matched++;
        else unmatched++;
      }
    }

    const totalCost = newPicks.reduce((s, p) => s + p.cost, 0);
    console.log(`  Picks: ${newPicks.length}, Matched: ${matched}, Unmatched: ${unmatched}, Total: $${totalCost}`);

    const newDraftData = { type: existingType, picks: newPicks };

    if (!isDryRun) {
      for (const season of dbSeasons) {
        await prisma.historicalSeason.update({
          where: { id: season.id },
          data: { draftData: newDraftData },
        });
      }
      console.log(`  Updated ${dbSeasons.length} records`);
    }
  }

  if (isDryRun) {
    console.log('\nDry run complete. Run with --commit to apply.');
  } else {
    console.log('\nAll changes committed.');
  }
}

main()
  .catch(err => { console.error('Failed:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
