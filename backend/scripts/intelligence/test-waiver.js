const prisma = require('../../src/lib/prisma')
require('../../src/services/intelligence/extractors/waiver')
const {
  runForUser,
  EXTRACTORS,
} = require('../../src/services/intelligence/extractor')

;(async () => {
  console.log(
    'Registered extractors:',
    EXTRACTORS.map((e) => e.type)
  )

  // Prefer a user with non-null transactions JSON.
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
    `Running waiver extractors for user ${userId} (sample season: league ${candidate.leagueId}, year ${candidate.seasonYear}, ownerName "${candidate.ownerName}", platform ${candidate.import?.sourcePlatform || 'unknown'})`
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

  const ourTypes = new Set(['faab_front_load_pct', 'top_bid_rate'])

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
    if (r.rawEvidence?.baseline) {
      console.log('  baseline:', r.rawEvidence.baseline)
    }
    if (r.rawEvidence?.coverageNote) {
      console.log('  coverageNote:', r.rawEvidence.coverageNote)
    }
    if (r.rawEvidence?.groupingNote) {
      console.log('  groupingNote:', r.rawEvidence.groupingNote)
    }
    if (r.rawEvidence?.platformsUsed?.length) {
      console.log('  platformsUsed:', r.rawEvidence.platformsUsed)
    }
  }

  const ourOk = result.ok.filter((o) => ourTypes.has(o.type))
  if (ourOk.length === 0) {
    console.log(
      '\nNeither waiver extractor produced data. Likely causes:\n' +
        '  - faab_front_load_pct: user had no successful FAAB-bid waiver claims.\n' +
        '  - top_bid_rate: failed waiver claims are not currently persisted by\n' +
        '    sleeperImport.js (status!=complete are filtered) → no contested\n' +
        '    waiver evidence to score. This is expected as of May 2026 and is\n' +
        '    documented in waiver.js.'
    )
    process.exit(1)
  }

  console.log(
    `\nwaiver smoke passed — ${ourOk.length} of 2 waiver extractors produced data`
  )
  process.exit(0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
