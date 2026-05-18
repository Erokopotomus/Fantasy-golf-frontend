/**
 * MI-12 smoke test: simulates a post-import / post-claim event firing
 * `intelligence.runForUser` via the same fire-and-forget pattern used by
 * `routes/imports.js` and `routes/leagues.js`.
 *
 * Picks a real user with claimed HistoricalSeasons (`ownerUserId` set), fires
 * the trigger, awaits its settlement so we can observe results in the script,
 * and then dumps the persisted ManagerCharacteristic rows.
 *
 * Usage: node backend/scripts/intelligence/test-import-trigger.js
 */
const prisma = require('../../src/lib/prisma')
const intelligence = require('../../src/services/intelligence')

;(async () => {
  console.log(
    'Registered extractors:',
    intelligence.EXTRACTORS.map((e) => e.type).join(', ')
  )

  // Find a user with any claimed HistoricalSeason — same predicate the
  // extractors use to find data for a user.
  const candidate = await prisma.historicalSeason.findFirst({
    where: { ownerUserId: { not: null } },
    select: {
      ownerUserId: true,
      leagueId: true,
      seasonYear: true,
      ownerName: true,
    },
  })

  if (!candidate) {
    console.log(
      'No user with claimed HistoricalSeasons found. Wiring still works — extractors return null for users with no data, which is fine.'
    )
    process.exit(0)
  }

  const userId = candidate.ownerUserId
  console.log(
    `Simulating post-import trigger for user ${userId} (sample season: league ${candidate.leagueId}, year ${candidate.seasonYear}, ownerName "${candidate.ownerName}")`
  )

  // Mirror the exact pattern used in the production wiring. We capture the
  // promise here so the script can wait — in prod the response has already
  // been sent and this promise resolves in the background.
  let captured
  const startedAt = Date.now()
  Promise.resolve()
    .then(() => {
      captured = intelligence.runForUser(userId, { db: prisma })
      return captured
    })
    .catch((err) => {
      console.error('[intelligence] post-import extraction failed:', err.message)
    })

  // Allow the microtask above to populate `captured`
  await Promise.resolve()
  if (!captured) {
    console.error('Wiring smoke FAILED: trigger did not produce a promise')
    process.exit(1)
  }

  const result = await captured
  const ms = Date.now() - startedAt
  console.log(`\nrunForUser completed in ${ms}ms`)
  console.log('OK count:', result.ok.length)
  console.log('Skipped count:', result.skipped.length)
  console.log('Failed count:', result.failed.length)

  if (result.failed.length > 0) {
    console.error('\nFailed extractors:', JSON.stringify(result.failed, null, 2))
  }

  const persisted = await prisma.managerCharacteristic.findMany({
    where: { userId },
    select: {
      characteristicType: true,
      confidenceLabel: true,
      confidenceScore: true,
      sampleSize: true,
      computedAt: true,
    },
    orderBy: { characteristicType: 'asc' },
  })

  console.log(`\nPersisted rows for user ${userId}: ${persisted.length}`)
  console.table(
    persisted.map((r) => ({
      type: r.characteristicType,
      label: r.confidenceLabel,
      score: r.confidenceScore,
      n: r.sampleSize,
      computedAt: r.computedAt.toISOString(),
    }))
  )

  console.log('\nMI-12 wiring smoke passed.')
  process.exit(0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
