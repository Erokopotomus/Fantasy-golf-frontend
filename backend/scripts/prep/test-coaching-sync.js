/**
 * Smoke test for DS-3 (nflCoachingSync).
 *
 * Runs syncCoachingStaff() against the live source (GridironExperts
 * single-page table — see service header for why) and verifies:
 *   - <=5 team errors
 *   - >=80 rows upserted (>=83% of 96)
 *   - Spot-check the teams whose 2026 staff differs from 2025 — i.e.
 *     the offseason shuffle that exposed the prior Wikipedia approach
 *     as returning stale data (BUF, NYG, PIT, NE, CHI, NYJ, NO, DAL).
 *
 * Defaults to season 2026. Override via SEASON env var. Exit 0 on
 * pass, 1 on any failure.
 */

try {
  require('dotenv').config({
    path: require('path').resolve(__dirname, '../../.env'),
  })
} catch {}

const { syncCoachingStaff } = require('../../src/services/prep/nflCoachingSync')
const prisma = require('../../src/lib/prisma')

;(async () => {
  console.log('=== Coaching staff sync smoke test ===\n')
  const season = Number(process.env.SEASON) || 2026
  console.log(`Season: ${season}\n`)

  const result = await syncCoachingStaff({ season })
  console.log('\n=== Stats ===')
  console.log(JSON.stringify(result, null, 2))

  if (result.errors.length > 5) {
    console.error('\nToo many team errors:', result.errors)
    process.exit(1)
  }

  if (result.rowsUpserted < 80) {
    console.error(
      `\nExpected >=80 rows upserted (>=83% of 96), got ${result.rowsUpserted}`
    )
    process.exit(1)
  }

  // Spot-check the 8 teams Eric called out where 2026 staffs differ
  // from 2025 — these were the teams that proved Wikipedia was stale.
  const samples = await prisma.nflCoachingStaff.findMany({
    where: {
      season,
      team: {
        abbreviation: {
          in: ['BUF', 'NYG', 'PIT', 'NE', 'CHI', 'NYJ', 'NO', 'DAL'],
        },
      },
    },
    include: { team: { select: { abbreviation: true } } },
    orderBy: [
      { team: { abbreviation: 'asc' } },
      { role: 'asc' },
    ],
  })
  console.log('\n=== 2026 Sample (teams that changed) ===')
  for (const row of samples) {
    console.log(`  ${row.team.abbreviation} ${row.role}: ${row.name}`)
  }

  console.log('\nCoaching sync smoke passed')
  process.exit(0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
