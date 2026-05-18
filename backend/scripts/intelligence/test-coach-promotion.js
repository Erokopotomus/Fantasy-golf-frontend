/**
 * MI-18 smoke test — verify the Manager Intelligence → Coach Vault bridge.
 *
 * Plan:
 *   1. Find a user with an auction_spend_concentration row (Eric is the
 *      canonical candidate, but fall back to any user with HIGH/MED data).
 *   2. Flip promoteToCoach=true on the auction_spend_concentration
 *      CharacteristicAggregate row (upsert if missing).
 *   3. Snapshot the user's draft_patterns CoachingMemory row (if any).
 *   4. Run promoteCharacteristicsToVault(userId).
 *   5. Assert the draft_patterns doc now contains content.managerIntelligence.facts
 *      with an auction_spend_concentration fact carrying the right shape.
 *   6. Cleanup: restore promoteToCoach to its original state. Restore the
 *      draft_patterns doc content too if we mutated it.
 *
 * Idempotent — safe to re-run.
 */

const prisma = require('../../src/lib/prisma')
const {
  promoteCharacteristicsToVault,
} = require('../../src/services/intelligence/coachPromotion')

const TARGET_TYPE = 'auction_spend_concentration'

;(async () => {
  // 1. Find a user with a HIGH or MEDIUM row for the target type.
  const row = await prisma.managerCharacteristic.findFirst({
    where: {
      characteristicType: TARGET_TYPE,
      confidenceLabel: { in: ['HIGH', 'MEDIUM'] },
    },
    orderBy: { confidenceScore: 'desc' },
    include: { user: { select: { id: true, name: true, username: true, email: true } } },
  })

  if (!row) {
    console.log(
      `No HIGH/MEDIUM ${TARGET_TYPE} row in DB. Run the auction extractors first ` +
      `(scripts/intelligence/test-auction.js) and ensure an aggregate exists.`
    )
    process.exit(0)
  }

  const userId = row.userId
  console.log(
    `Target user: ${row.user.name || row.user.username || row.user.email} (${userId})`
  )
  console.log(
    `  ${TARGET_TYPE}: ${row.confidenceLabel} (${row.confidenceScore.toFixed(1)}), sample=${row.sampleSize}`
  )

  // 2. Flip promoteToCoach=true on the aggregate. Record prior state for cleanup.
  const priorAgg = await prisma.characteristicAggregate.findUnique({
    where: { characteristicType: TARGET_TYPE },
  })

  if (priorAgg) {
    await prisma.characteristicAggregate.update({
      where: { characteristicType: TARGET_TYPE },
      data: { promoteToCoach: true, suppressed: false },
    })
    console.log(
      `  aggregate existed (prior promoteToCoach=${priorAgg.promoteToCoach}, suppressed=${priorAgg.suppressed}); flipped to true`
    )
  } else {
    // No aggregate yet — create a minimal one so the promotion query matches.
    await prisma.characteristicAggregate.create({
      data: {
        characteristicType: TARGET_TYPE,
        totalUsers: 0,
        usersWithData: 0,
        highConfidenceCount: 0,
        medConfidenceCount: 0,
        lowConfidenceCount: 0,
        noDataCount: 0,
        avgConfidenceScore: 0,
        promoteToCoach: true,
        suppressed: false,
      },
    })
    console.log('  aggregate missing — created with promoteToCoach=true')
  }

  // 3. Snapshot existing draft_patterns doc.
  const priorDoc = await prisma.coachingMemory.findFirst({
    where: { userId, sport: null, documentType: 'draft_patterns' },
  })
  console.log(
    priorDoc
      ? `  prior draft_patterns doc found (id=${priorDoc.id}, version=${priorDoc.version})`
      : '  no prior draft_patterns doc (will be created)'
  )

  let didPass = false

  try {
    // 4. Run promotion.
    const result = await promoteCharacteristicsToVault(userId, { db: prisma })
    console.log('\nPromotion result:', JSON.stringify(result, null, 2))

    // 5. Verify the vault doc.
    const doc = await prisma.coachingMemory.findFirst({
      where: { userId, sport: null, documentType: 'draft_patterns' },
    })

    if (!doc) {
      console.error('FAIL: draft_patterns doc was not created.')
      process.exit(1)
    }

    const mi = doc.content?.managerIntelligence
    if (!mi || !Array.isArray(mi.facts)) {
      console.error('FAIL: doc.content.managerIntelligence.facts missing.')
      console.error('content keys:', Object.keys(doc.content || {}))
      process.exit(1)
    }

    const fact = mi.facts.find((f) => f.characteristicType === TARGET_TYPE)
    if (!fact) {
      console.error(`FAIL: no fact with characteristicType="${TARGET_TYPE}" found.`)
      console.error('facts present:', mi.facts.map((f) => f.characteristicType))
      process.exit(1)
    }

    console.log('\nVerified fact in draft_patterns:')
    console.log(JSON.stringify(fact, null, 2))

    // Sanity-check fact shape per spec.
    const requiredKeys = [
      'source',
      'characteristicType',
      'characteristicDisplayName',
      'value',
      'confidenceLabel',
      'confidenceScore',
      'sampleSize',
      'observedAt',
    ]
    const missing = requiredKeys.filter((k) => !(k in fact))
    if (missing.length > 0) {
      console.error(`FAIL: fact missing keys: ${missing.join(', ')}`)
      process.exit(1)
    }
    if (fact.source !== 'manager_intelligence') {
      console.error(`FAIL: fact.source="${fact.source}", expected "manager_intelligence"`)
      process.exit(1)
    }
    if (!['HIGH', 'MEDIUM'].includes(fact.confidenceLabel)) {
      console.error(`FAIL: fact.confidenceLabel="${fact.confidenceLabel}", expected HIGH or MEDIUM`)
      process.exit(1)
    }

    console.log('\nmanagerIntelligence.facts count:', mi.facts.length)
    console.log('Doc version:', doc.version, '— lastUpdatedBy:', doc.lastUpdatedBy)

    // Confirm idempotency — second run should be a no-op (no version bump).
    const secondResult = await promoteCharacteristicsToVault(userId, { db: prisma })
    const docAfter = await prisma.coachingMemory.findFirst({
      where: { userId, sport: null, documentType: 'draft_patterns' },
    })
    if (docAfter.version !== doc.version) {
      console.error(
        `WARN: idempotency check — version went ${doc.version} -> ${docAfter.version} on no-op second run`
      )
    } else {
      console.log('Idempotency OK — second run did not bump version.')
    }
    console.log('Second-run summary:', secondResult)

    didPass = true
  } finally {
    // 6. Cleanup: restore promoteToCoach to its prior state. We deliberately
    //    leave the vault doc in place — it's user-visible content with version
    //    history and the next memory writer run will refresh it naturally
    //    once the toggle is back to false (no facts written, but content not
    //    cleared since the no-op short-circuits before touching the doc).
    //    For a fully clean smoke test, we DO want to scrub the MI block we
    //    just injected, so flip promote OFF and manually delete the MI block.
    if (priorAgg) {
      await prisma.characteristicAggregate.update({
        where: { characteristicType: TARGET_TYPE },
        data: {
          promoteToCoach: priorAgg.promoteToCoach,
          suppressed: priorAgg.suppressed,
        },
      })
      console.log(
        `\nCleanup: restored aggregate (promoteToCoach=${priorAgg.promoteToCoach}, suppressed=${priorAgg.suppressed})`
      )
    } else {
      await prisma.characteristicAggregate.delete({
        where: { characteristicType: TARGET_TYPE },
      })
      console.log('Cleanup: removed the test-only aggregate row')
    }

    // Scrub the managerIntelligence block we injected so re-running the test
    // starts clean and we don't leave promotion artifacts in production data.
    const finalDoc = await prisma.coachingMemory.findFirst({
      where: { userId, sport: null, documentType: 'draft_patterns' },
    })
    if (finalDoc?.content?.managerIntelligence) {
      const restored = { ...finalDoc.content }
      delete restored.managerIntelligence
      if (priorDoc) {
        // Doc existed before — restore to prior state (keep content) so we
        // don't accidentally erase legitimate non-MI content.
        await prisma.coachingMemory.update({
          where: { id: finalDoc.id },
          data: {
            content: priorDoc.content,
            version: priorDoc.version,
            lastUpdatedBy: priorDoc.lastUpdatedBy,
          },
        })
        console.log('Cleanup: restored prior draft_patterns doc content + version')
      } else {
        // We created this doc — delete it entirely.
        await prisma.coachingMemory.delete({ where: { id: finalDoc.id } })
        console.log('Cleanup: deleted the test-only draft_patterns doc')
      }
    }
  }

  if (didPass) {
    console.log('\nMI-18 smoke PASSED.')
    process.exit(0)
  } else {
    process.exit(1)
  }
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
