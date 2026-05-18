/**
 * Smoke test for DS-4 (nflUnitRankSync).
 *
 * Runs syncUnitRanks() against ESPN's public JSON API and verifies:
 *   - >=150 rows upserted (>=78% of 192 expected = 32 × 2 × 3 seasons)
 *   - No errors array entries
 *   - KC's 2024 OL row is present (smoke-checks teamId join works)
 *   - Top 5 OL teams for 2024 look plausible (sanity check)
 *
 * Defaults to seasons [2023, 2024, 2025]. Override via SEASONS env var
 * (comma-separated, e.g. SEASONS=2024,2025). Exit 0 on pass, 1 on
 * any failure.
 */

try {
  require('dotenv').config({
    path: require('path').resolve(__dirname, '../../.env'),
  })
} catch {}

const { syncUnitRanks } = require('../../src/services/prep/nflUnitRankSync')
const prisma = require('../../src/lib/prisma')

;(async () => {
  console.log('=== Unit rank sync smoke test ===\n')
  const seasons = process.env.SEASONS
    ? process.env.SEASONS.split(',').map((s) => Number(s.trim())).filter(Boolean)
    : [2023, 2024, 2025]
  console.log(`Seasons: [${seasons.join(', ')}]\n`)

  const result = await syncUnitRanks({ seasons })
  console.log('\n=== Stats ===')
  console.log(JSON.stringify(result, null, 2))

  if (result.errors.length > 0) {
    console.error('\nErrors encountered:', result.errors)
    process.exit(1)
  }

  if (result.rowsUpserted < 150) {
    console.error(
      `\nExpected >=150 rows upserted, got ${result.rowsUpserted}`
    )
    process.exit(1)
  }

  // Spot-check: KC's OL rank for 2024 should exist.
  const kcOl2024 = await prisma.nflTeamUnitRank.findFirst({
    where: { team: { abbreviation: 'KC' }, season: 2024, unit: 'OL' },
    include: { team: { select: { abbreviation: true } } },
  })
  if (!kcOl2024) {
    console.error('\nKC 2024 OL row missing — teamId join may have failed')
    process.exit(1)
  }
  console.log(
    `\nKC 2024 OL rank: ${kcOl2024.rank} (score: ${kcOl2024.score}, source: ${kcOl2024.source})`
  )

  // Top 5 OL for 2024 (sanity check the data feels right).
  const top5Ol2024 = await prisma.nflTeamUnitRank.findMany({
    where: { season: 2024, unit: 'OL' },
    include: { team: { select: { abbreviation: true } } },
    orderBy: { rank: 'asc' },
    take: 5,
  })
  console.log('\n2024 Top 5 OL (by yards-per-rush-attempt rank):')
  for (const r of top5Ol2024) {
    console.log(`  ${r.rank}. ${r.team.abbreviation} (score: ${r.score})`)
  }

  // Top 5 DL for 2024.
  const top5Dl2024 = await prisma.nflTeamUnitRank.findMany({
    where: { season: 2024, unit: 'DL' },
    include: { team: { select: { abbreviation: true } } },
    orderBy: { rank: 'asc' },
    take: 5,
  })
  console.log('\n2024 Top 5 DL (by opponent yards-per-rush-attempt rank):')
  for (const r of top5Dl2024) {
    console.log(`  ${r.rank}. ${r.team.abbreviation} (score: ${r.score})`)
  }

  console.log('\nUnit rank smoke passed')
  process.exit(0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
