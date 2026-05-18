const prisma = require('../../lib/prisma')
const { EXTRACTORS } = require('./index')

/**
 * Recompute CharacteristicAggregate snapshot for every registered characteristic.
 * Cheap: one groupBy + one count per characteristic type. No extractor re-runs.
 * Designed to be called from cron OR manually (admin "refresh aggregates" button).
 */
async function aggregateAll({ db = prisma } = {}) {
  const startedAt = Date.now()
  const totalUsers = await db.user.count()
  const types = EXTRACTORS.map((e) => e.type)
  const results = []

  for (const type of types) {
    try {
      // Pull confidenceLabel + confidenceScore for all rows of this type
      const rows = await db.managerCharacteristic.findMany({
        where: { characteristicType: type },
        select: { confidenceLabel: true, confidenceScore: true },
      })

      const highConfidenceCount = rows.filter((r) => r.confidenceLabel === 'HIGH').length
      const medConfidenceCount = rows.filter((r) => r.confidenceLabel === 'MEDIUM').length
      const lowConfidenceCount = rows.filter((r) => r.confidenceLabel === 'LOW').length
      const usersWithData = rows.length
      const noDataCount = Math.max(0, totalUsers - usersWithData)
      const avgConfidenceScore =
        rows.length > 0
          ? rows.reduce((sum, r) => sum + r.confidenceScore, 0) / rows.length
          : 0

      await db.characteristicAggregate.upsert({
        where: { characteristicType: type },
        create: {
          characteristicType: type,
          totalUsers,
          usersWithData,
          highConfidenceCount,
          medConfidenceCount,
          lowConfidenceCount,
          noDataCount,
          avgConfidenceScore,
        },
        update: {
          totalUsers,
          usersWithData,
          highConfidenceCount,
          medConfidenceCount,
          lowConfidenceCount,
          noDataCount,
          avgConfidenceScore,
          computedAt: new Date(),
        },
      })

      results.push({ type, ok: true, usersWithData, highConfidenceCount, medConfidenceCount, lowConfidenceCount })
    } catch (e) {
      console.error(`[intelligence aggregate] failed for type ${type}:`, e.message)
      results.push({ type, ok: false, error: e.message })
    }
  }

  const durationMs = Date.now() - startedAt
  console.log(`[intelligence aggregate] completed in ${durationMs}ms across ${types.length} types`)
  return { results, durationMs, totalUsers }
}

module.exports = { aggregateAll }
