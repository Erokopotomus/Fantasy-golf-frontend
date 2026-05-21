/**
 * Manager Intelligence → AI Coach Vault bridge (MI-18, Layer 2 stub).
 *
 * When an admin flips `promoteToCoach=true` on a CharacteristicAggregate row,
 * this module is responsible for appending the matching user's HIGH/MEDIUM
 * confidence ManagerCharacteristic facts into their CoachingMemory document
 * of the appropriate type.
 *
 * The actual AI coach context assembler (coachContextAssembly.js) already
 * reads CoachingMemory — once facts land here, the coach picks them up
 * automatically with no further wiring.
 *
 * Per-run semantics:
 *   - Each cron run REPLACES the MI facts for promoted types (because the
 *     underlying ManagerCharacteristic value may have been recomputed) but
 *     preserves any non-MI content already in the vault doc.
 *   - Facts are written under content.managerIntelligence.facts so they
 *     coexist with patternEngine-distilled fields written by the same cron.
 *   - Documents are written with sport: null because ManagerCharacteristic
 *     is cross-sport. coachContextAssembly treats null-sport docs as default
 *     context and lets sport-specific docs override.
 *
 * Default state: ALL characteristic types have promoteToCoach=false. With
 * nothing promoted, this function is effectively a no-op (one cheap query
 * to characteristicAggregate, no further writes).
 */

const defaultPrisma = require('../../lib/prisma.js')
const { CHARACTERISTIC_META, CATEGORY_TO_DOCUMENT_TYPE } = require('./characteristicMeta')

const SOURCE_TAG = 'manager_intelligence'

/**
 * Promote characteristics to a single user's vault.
 *
 * @param {string} userId
 * @param {object} [opts]
 * @param {object} [opts.db] - Prisma client (injectable for tests)
 * @returns {Promise<{promotedTypes: number, docsTouched: number, factsWritten: number}>}
 */
async function promoteCharacteristicsToVault(userId, opts = {}) {
  const db = opts.db || defaultPrisma

  // 1. Find every characteristic type the admin has flipped ON.
  //    Callers running a multi-user cron should pass `opts.promotedTypes`
  //    pre-fetched ONCE at the start of the run so the per-user loop is
  //    deterministic against admin activity mid-cron.
  let promotedTypes = opts.promotedTypes
  if (!promotedTypes) {
    const promoted = await db.characteristicAggregate.findMany({
      where: { promoteToCoach: true, suppressed: false },
      select: { characteristicType: true },
    })
    promotedTypes = promoted.map((p) => p.characteristicType)
  }

  if (promotedTypes.length === 0) {
    return { promotedTypes: 0, docsTouched: 0, factsWritten: 0 }
  }

  // 2. Fetch THIS user's rows for those types, HIGH/MEDIUM only.
  const userRows = await db.managerCharacteristic.findMany({
    where: {
      userId,
      characteristicType: { in: promotedTypes },
      confidenceLabel: { in: ['HIGH', 'MEDIUM'] },
    },
  })

  // 3. Group rows by destination documentType using the shared category map.
  /** @type {Record<string, Array<{type:string, fact:object}>>} */
  const grouped = {}
  for (const row of userRows) {
    const meta = CHARACTERISTIC_META[row.characteristicType]
    if (!meta) continue
    const docType = CATEGORY_TO_DOCUMENT_TYPE[meta.category]
    if (!docType) continue

    if (!grouped[docType]) grouped[docType] = []
    grouped[docType].push({
      type: row.characteristicType,
      fact: {
        source: SOURCE_TAG,
        characteristicType: row.characteristicType,
        characteristicDisplayName: meta.displayName,
        category: meta.category,
        value: row.value,
        confidenceLabel: row.confidenceLabel,
        confidenceScore: row.confidenceScore,
        sampleSize: row.sampleSize,
        observedAt: row.computedAt instanceof Date
          ? row.computedAt.toISOString()
          : row.computedAt,
      },
    })
  }

  // 4. For EVERY promoted documentType (not just ones the user has data for),
  //    we need to refresh — otherwise stale facts for types the user no
  //    longer qualifies for will linger forever. Build the full set of doc
  //    types that any promoted type maps to.
  const docTypesToRefresh = new Set()
  for (const type of promotedTypes) {
    const meta = CHARACTERISTIC_META[type]
    if (!meta) continue
    const docType = CATEGORY_TO_DOCUMENT_TYPE[meta.category]
    if (docType) docTypesToRefresh.add(docType)
  }

  // The set of characteristic types being refreshed in each doc, so we know
  // which facts to wipe out of existing managerIntelligence.facts arrays.
  /** @type {Record<string, Set<string>>} */
  const typesPerDoc = {}
  for (const type of promotedTypes) {
    const meta = CHARACTERISTIC_META[type]
    if (!meta) continue
    const docType = CATEGORY_TO_DOCUMENT_TYPE[meta.category]
    if (!docType) continue
    if (!typesPerDoc[docType]) typesPerDoc[docType] = new Set()
    typesPerDoc[docType].add(type)
  }

  let docsTouched = 0
  let factsWritten = 0

  for (const docType of docTypesToRefresh) {
    const newFacts = (grouped[docType] || []).map((g) => g.fact)
    const refreshedTypes = typesPerDoc[docType] || new Set()

    const touched = await mergeManagerIntelligenceIntoDoc({
      db,
      userId,
      documentType: docType,
      refreshedTypes,
      newFacts,
    })
    if (touched) docsTouched += 1
    factsWritten += newFacts.length
  }

  return {
    promotedTypes: promotedTypes.length,
    docsTouched,
    factsWritten,
  }
}

/**
 * Merge MI facts into a single CoachingMemory document.
 *
 *   - Preserves all non-MI fields (patternEngine output etc.).
 *   - Replaces facts whose characteristicType is in `refreshedTypes`
 *     with the supplied `newFacts`.
 *   - Leaves other previously-stored MI facts untouched (in case
 *     other types are still promoted but the user has no fresh row).
 *   - Skips writing when nothing actually changed (matches the
 *     existing memory writer's no-op-on-equal semantics).
 *
 * Returns true if a write happened.
 */
async function mergeManagerIntelligenceIntoDoc({
  db,
  userId,
  documentType,
  refreshedTypes,
  newFacts,
}) {
  const existing = await db.coachingMemory.findFirst({
    where: { userId, sport: null, documentType },
  })

  const existingContent = existing?.content || {}
  const existingMI = existingContent.managerIntelligence || {}
  const existingFacts = Array.isArray(existingMI.facts) ? existingMI.facts : []

  // Drop any prior facts whose characteristicType we're refreshing this run.
  const survivingFacts = existingFacts.filter(
    (f) => !refreshedTypes.has(f.characteristicType)
  )

  const mergedFacts = [...survivingFacts, ...newFacts]

  const nextManagerIntelligence = {
    facts: mergedFacts,
    lastUpdated: new Date().toISOString(),
  }

  const nextContent = {
    ...existingContent,
    managerIntelligence: nextManagerIntelligence,
  }

  // Compare ignoring lastUpdated so an empty no-op doesn't churn the row.
  const equalFacts = factsEqual(existingFacts, mergedFacts)
  if (existing && equalFacts) {
    return false
  }

  if (existing) {
    await db.coachingMemory.update({
      where: { id: existing.id },
      data: {
        content: nextContent,
        version: existing.version + 1,
        lastUpdatedBy: 'mi_promotion',
      },
    })
    return true
  }

  // No existing doc — only create one if we actually have MI facts to record.
  // (Don't create empty placeholder docs just because a type is promoted but
  // the user doesn't qualify.)
  if (mergedFacts.length === 0) return false

  await db.coachingMemory.create({
    data: {
      userId,
      sport: null,
      documentType,
      content: nextContent,
      version: 1,
      lastUpdatedBy: 'mi_promotion',
    },
  })
  return true
}

/** Deep-ish equality on the facts array. Key-order-independent so a
 *  round-trip through Postgres JSON storage (which may reorder keys)
 *  still compares equal to a freshly-built in-memory object. */
function factsEqual(a, b) {
  if (a.length !== b.length) return false
  const sa = [...a].sort(byType).map(canonicalize)
  const sb = [...b].sort(byType).map(canonicalize)
  return JSON.stringify(sa) === JSON.stringify(sb)
}

function byType(x, y) {
  return (x.characteristicType || '').localeCompare(y.characteristicType || '')
}

/** Recursively sort object keys so JSON.stringify yields a canonical form. */
function canonicalize(v) {
  if (Array.isArray(v)) return v.map(canonicalize)
  if (v && typeof v === 'object') {
    const out = {}
    for (const k of Object.keys(v).sort()) out[k] = canonicalize(v[k])
    return out
  }
  return v
}

module.exports = {
  promoteCharacteristicsToVault,
}
