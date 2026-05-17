const prisma = require('../../lib/prisma')
const { computeConfidenceScore, computeLabel } = require('./confidence')

/**
 * Registry of extractor functions. Each entry:
 *   type: characteristicType string (e.g., 'pick_reach_rate')
 *   fn: async (userId, prismaClient) => result | null
 *
 *   where result has shape:
 *     {
 *       value: JSON,
 *       sampleSize: number,
 *       consistencyPct: number,        // 0-1 OR 0-100; helper normalizes
 *       effectSize: number,            // standardized effect size
 *       rawEvidence: JSON,             // drill-down data
 *       sourceImportIds: string[]      // which imports contributed
 *     }
 *
 *   Returning null means "no data for this user" — recorded as skipped, no row written.
 *
 * Per-characteristic modules (MI-4 onwards) call registerExtractor at module load.
 */
const EXTRACTORS = []

function registerExtractor(type, fn) {
  // Idempotent: replacing an existing registration is allowed (useful in tests)
  const idx = EXTRACTORS.findIndex(e => e.type === type)
  const entry = { type, fn }
  if (idx >= 0) EXTRACTORS[idx] = entry
  else EXTRACTORS.push(entry)
}

/**
 * Run all registered extractors for one user. Errors per extractor are
 * isolated — one failure doesn't poison the rest.
 *
 * @returns {Promise<{ok: Array, failed: Array, skipped: Array}>}
 */
async function runForUser(userId, { db = prisma } = {}) {
  if (!userId) throw new Error('userId required')

  const ok = []
  const failed = []
  const skipped = []

  for (const { type, fn } of EXTRACTORS) {
    try {
      const result = await fn(userId, db)
      if (!result) {
        skipped.push({ type, reason: 'no data' })
        continue
      }
      const score = computeConfidenceScore(result)
      const label = computeLabel(result)
      await db.managerCharacteristic.upsert({
        where: { userId_characteristicType: { userId, characteristicType: type } },
        create: {
          userId,
          characteristicType: type,
          value: result.value,
          sampleSize: result.sampleSize,
          consistencyPct: result.consistencyPct,
          effectSize: result.effectSize,
          confidenceScore: score,
          confidenceLabel: label,
          rawEvidence: result.rawEvidence || {},
          sourceImportIds: result.sourceImportIds || [],
        },
        update: {
          value: result.value,
          sampleSize: result.sampleSize,
          consistencyPct: result.consistencyPct,
          effectSize: result.effectSize,
          confidenceScore: score,
          confidenceLabel: label,
          rawEvidence: result.rawEvidence || {},
          sourceImportIds: result.sourceImportIds || [],
          computedAt: new Date(),
        },
      })
      ok.push({ type, score, label })
    } catch (e) {
      console.error(`[intelligence] extractor ${type} failed for user ${userId}:`, e.message)
      failed.push({ type, error: e.message })
    }
  }

  return { ok, failed, skipped }
}

module.exports = { runForUser, registerExtractor, EXTRACTORS }
