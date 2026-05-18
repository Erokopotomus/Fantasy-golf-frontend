const prisma = require('../../src/lib/prisma')
require('../../src/services/intelligence/extractors/drop')
const {
  runForUser,
  EXTRACTORS,
} = require('../../src/services/intelligence/extractor')

;(async () => {
  console.log(
    'Registered extractors:',
    EXTRACTORS.map((e) => e.type)
  )

  // Prefer a user with non-null transactions JSON (drop extractors lean on
  // it). Fall back to any owner-linked season if no transactions exist.
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
    `Running drop extractors for user ${userId} (sample season: league ${candidate.leagueId}, year ${candidate.seasonYear}, ownerName "${candidate.ownerName}", platform ${candidate.import?.sourcePlatform || 'unknown'})`
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

  const ourTypes = new Set(['naked_drop_frequency', 'drop_lag_games'])

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
    if (perSeason.length > 0) {
      console.log(`  rawEvidence: ${perSeason.length} seasons contributing`)
      console.log(
        '  sample (first 3 seasons):',
        JSON.stringify(perSeason.slice(0, 3), null, 2)
      )
    }
    const dropSample = r.rawEvidence?.sample || []
    if (dropSample.length > 0) {
      console.log(`  rawEvidence: ${dropSample.length} drop samples`)
      console.log(
        '  longest-lag samples (first 5):',
        JSON.stringify(dropSample.slice(0, 5), null, 2)
      )
    }
    if (r.rawEvidence?.coverageNotes?.length) {
      console.log('  coverageNotes:', r.rawEvidence.coverageNotes)
    }
    if (r.rawEvidence?.coverageNote) {
      console.log('  coverageNote:', r.rawEvidence.coverageNote)
    }
    if (r.rawEvidence?.definitionNote) {
      console.log('  definitionNote:', r.rawEvidence.definitionNote)
    }
    if (r.rawEvidence?.thresholdDefinition) {
      console.log('  thresholdDefinition:', r.rawEvidence.thresholdDefinition)
    }
    if (r.rawEvidence?.uncomputableReasons) {
      console.log(
        '  uncomputableReasons:',
        JSON.stringify(r.rawEvidence.uncomputableReasons, null, 2)
      )
    }
  }

  const ourOk = result.ok.filter((o) => ourTypes.has(o.type))
  if (ourOk.length === 0) {
    console.log(
      '\nNeither drop extractor produced data. Likely causes:\n' +
        '  - naked_drop_frequency: no seasons had naked-drop rows with >=2\n' +
        '    teams attributed (cohort z-score gate).\n' +
        '  - drop_lag_games: canonical Player ID resolution failed for every\n' +
        '    dropped player, OR no NflPlayerGame records existed for resolved\n' +
        '    players. This is expected as of May 2026 for users with sparse\n' +
        '    NFL canonical-player coverage — see drop.js header.'
    )
    process.exit(1)
  }

  console.log(
    `\ndrop smoke passed — ${ourOk.length} of 2 drop extractors produced data`
  )
  process.exit(0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
