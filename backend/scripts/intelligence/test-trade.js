const prisma = require('../../src/lib/prisma')
require('../../src/services/intelligence/extractors/trade')
const {
  runForUser,
  EXTRACTORS,
} = require('../../src/services/intelligence/extractor')

;(async () => {
  console.log(
    'Registered extractors:',
    EXTRACTORS.map((e) => e.type)
  )

  // Prefer a user with non-null transactions JSON. Fall back to any user with
  // an ownerUserId so the extractors at least get a chance to return null.
  let candidate = await prisma.historicalSeason.findFirst({
    where: {
      ownerUserId: { not: null },
      transactions: { not: null },
    },
    select: {
      ownerUserId: true,
      leagueId: true,
      seasonYear: true,
      ownerName: true,
      import: { select: { sourcePlatform: true } },
    },
  })

  if (!candidate) {
    candidate = await prisma.historicalSeason.findFirst({
      where: { ownerUserId: { not: null } },
      select: {
        ownerUserId: true,
        leagueId: true,
        seasonYear: true,
        ownerName: true,
        import: { select: { sourcePlatform: true } },
      },
    })
  }

  if (!candidate) {
    console.log('No imported user found in DB. Smoke test skipped.')
    process.exit(0)
  }

  const userId = candidate.ownerUserId
  console.log(
    `Running trade extractors for user ${userId} (sample season: league ${candidate.leagueId}, year ${candidate.seasonYear}, ownerName "${candidate.ownerName}", platform ${candidate.import?.sourcePlatform || 'unknown'})`
  )

  const result = await runForUser(userId)
  console.log('\n=== Result ===')
  console.log('OK:', JSON.stringify(result.ok, null, 2))
  console.log('Failed:', JSON.stringify(result.failed, null, 2))
  console.log('Skipped:', JSON.stringify(result.skipped, null, 2))

  if (result.failed.length > 0) {
    console.error('\nSome extractors failed — investigate the errors above')
    process.exit(1)
  }

  const ourTypes = new Set(['trade_frequency', 'roster_endowment_ratio'])

  const rows = await prisma.managerCharacteristic.findMany({
    where: {
      userId,
      characteristicType: { in: [...ourTypes] },
    },
    select: {
      characteristicType: true,
      value: true,
      confidenceLabel: true,
      confidenceScore: true,
      sampleSize: true,
      consistencyPct: true,
      effectSize: true,
      rawEvidence: true,
    },
  })

  console.log('\n=== Persisted rows ===')
  for (const r of rows) {
    console.log(`\n--- ${r.characteristicType} ---`)
    console.log('  label:', r.confidenceLabel)
    console.log('  score:', r.confidenceScore)
    console.log('  sampleSize:', r.sampleSize)
    console.log('  consistencyPct:', r.consistencyPct)
    console.log('  effectSize:', r.effectSize)
    console.log('  value:', JSON.stringify(r.value, null, 2))
    const perSeason = r.rawEvidence?.perSeason || []
    console.log(`  rawEvidence: ${perSeason.length} seasons contributing`)
    if (perSeason.length > 0) {
      console.log(
        '  sample (first 3 seasons):',
        JSON.stringify(perSeason.slice(0, 3), null, 2)
      )
    }
    if (r.rawEvidence?.coverageNotes?.length) {
      console.log('  coverageNotes:', r.rawEvidence.coverageNotes)
    }
    if (r.rawEvidence?.skipReasons?.length) {
      console.log('  skipReasons:', r.rawEvidence.skipReasons)
    }
    if (r.rawEvidence?.platformsSeen?.length) {
      console.log('  platformsSeen:', r.rawEvidence.platformsSeen)
    }
  }

  const ourOk = result.ok.filter((o) => ourTypes.has(o.type))
  if (ourOk.length === 0) {
    console.log(
      '\nNeither trade extractor produced data. Likely causes: user has only Yahoo data with no per-user trade attribution (parser limitation — see transactionParser header), AND rosterData is empty (Yahoo importer does not capture end-of-season roster).'
    )
    process.exit(1)
  }

  console.log(
    `\ntrade smoke passed — ${ourOk.length} of 2 trade extractors produced data`
  )
  process.exit(0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
