#!/usr/bin/env node
/**
 * Fix BroMontana Bowl vault owner names
 *
 * Problem: The 2009-2012 Yahoo imports used TEAM NAMES as ownerName
 * instead of real people. Also "Brad" (2013-2014) needs to merge
 * with "bradley" (2015+).
 *
 * This script:
 *   1. Renames ownerName on HistoricalSeason records
 *   2. Creates OwnerAlias records so the vault remembers the mapping
 *   3. Patches ownerName inside draftData.picks[] JSON where applicable
 *
 * Usage:
 *   node backend/scripts/fix-bromontana-owners.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const prisma = require('../src/lib/prisma');

const LEAGUE_ID = 'cmm47aj1w07klry65jxa29jwu';

const OWNER_RENAMES = {
  'Yeuh Girl': 'Eric',
  'Righteously Kick Ass': 'Jakob',
  'The Janitors': 'Jakob',
  'Prestige Worldwide': 'Jakob',
  'The Hokey Pokey': 'Nick Trow',
  'South Beach Talent': 'Nick Trow',
  'Poon Slayers': 'Nick Trow',
  'The Fear Boners': 'Nick Trow',
  'Chubby Chasers': 'Ragen',
  'On Like Ndamukong': 'Ragen',
  'Lambeau Leapers': 'Ragen',
  'Balls of Steel': 'Caleb',
  'Bi-Winning': 'Caleb',
  'The Beers': 'Caleb',
  'DisgruntledLilPeople': 'Spencer H',
  'Awesometown': 'Spencer H',
  'BoomGoesTheDynamite': 'Spencer H',
  'Loud Noises': 'Spencer H',
  'Swamp Donkeys': 'Anthony',
  'SWAMP DONKEYS': 'Anthony',
  'Free Win Team': 'Anthony',
  'MIND MELTZ': 'Anthony',
  'Sex Train': 'Dallas',
  'Beast Mode Engaged': 'Dallas',
  'The Love Pirates': 'Dallas',
  "The Wanna Be's": 'bradley',
  "The Captain's Club": 'bradley',
  'sugar tits': 'Scott',
  'stitch and bitch': 'Scott',
  'Sheenis Envy': 'Scott',
  'Whale': 'Scott',
  'A-Team': 'aric',
  'K&A all the way': 'Kirk',
  'suck for luck': 'Kirk',
  'black mamba': 'Kirk',
  'Brad': 'bradley',
};

// Curly apostrophe variants for names containing straight apostrophes
const CURLY_APOSTROPHE_VARIANTS = {};
for (const oldName of Object.keys(OWNER_RENAMES)) {
  if (oldName.includes("'")) {
    const curlyVariant = oldName.replace(/'/g, '\u2019');
    if (curlyVariant !== oldName) {
      CURLY_APOSTROPHE_VARIANTS[curlyVariant] = OWNER_RENAMES[oldName];
    }
  }
}

async function main() {
  console.log('=== BroMontana Bowl Owner Name Fix ===\n');
  console.log(`League ID: ${LEAGUE_ID}`);

  // Merge curly apostrophe variants into renames
  const allRenames = { ...OWNER_RENAMES, ...CURLY_APOSTROPHE_VARIANTS };

  if (Object.keys(CURLY_APOSTROPHE_VARIANTS).length > 0) {
    console.log(`Added ${Object.keys(CURLY_APOSTROPHE_VARIANTS).length} curly apostrophe variant(s):`);
    for (const [curly, canonical] of Object.entries(CURLY_APOSTROPHE_VARIANTS)) {
      console.log(`  "${curly}" -> ${canonical}`);
    }
  }

  console.log(`\nProcessing ${Object.keys(allRenames).length} rename mappings...\n`);

  let totalSeasonsRenamed = 0;
  let totalAliasesCreated = 0;
  let totalDraftPicksPatched = 0;

  for (const [oldName, newName] of Object.entries(allRenames)) {
    try {
      // ── Step 1: Rename ownerName on HistoricalSeason records ──
      const updateResult = await prisma.historicalSeason.updateMany({
        where: {
          leagueId: LEAGUE_ID,
          ownerName: oldName,
        },
        data: {
          ownerName: newName,
        },
      });

      const count = updateResult.count;
      totalSeasonsRenamed += count;

      if (count > 0) {
        console.log(`Renamed ${count} season(s): "${oldName}" -> "${newName}"`);
      } else {
        console.log(`  (0 seasons found for "${oldName}" — may already be fixed)`);
      }

      // ── Step 2: Create/update OwnerAlias ──
      await prisma.ownerAlias.upsert({
        where: {
          leagueId_ownerName: {
            leagueId: LEAGUE_ID,
            ownerName: oldName,
          },
        },
        create: {
          leagueId: LEAGUE_ID,
          ownerName: oldName,
          canonicalName: newName,
          isActive: true,
        },
        update: {
          canonicalName: newName,
          isActive: true,
        },
      });
      totalAliasesCreated++;

      // ── Step 3: Patch ownerName inside draftData.picks[] ──
      // We need to find seasons that NOW have the newName but might still have
      // the oldName buried in their draftData JSON. Since we already renamed
      // the ownerName column, we query by newName + non-null draftData and
      // check the picks array for the old name.
      const seasonsWithDraft = await prisma.historicalSeason.findMany({
        where: {
          leagueId: LEAGUE_ID,
          ownerName: newName,
          draftData: { not: null },
        },
        select: {
          id: true,
          seasonYear: true,
          draftData: true,
        },
      });

      for (const season of seasonsWithDraft) {
        const draft = season.draftData;
        if (!draft || !Array.isArray(draft.picks)) continue;

        let changed = false;
        for (const pick of draft.picks) {
          if (pick.ownerName === oldName) {
            pick.ownerName = newName;
            changed = true;
            totalDraftPicksPatched++;
          }
        }

        if (changed) {
          await prisma.historicalSeason.update({
            where: { id: season.id },
            data: { draftData: draft },
          });
        }
      }
    } catch (err) {
      console.error(`  ERROR processing "${oldName}" -> "${newName}":`, err.message);
    }
  }

  // ── Summary ──
  console.log('\n=== Summary ===');
  console.log(`  Seasons renamed:      ${totalSeasonsRenamed}`);
  console.log(`  Aliases upserted:     ${totalAliasesCreated}`);
  console.log(`  Draft picks patched:  ${totalDraftPicksPatched}`);
  console.log('\nDone!');
}

main()
  .catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
