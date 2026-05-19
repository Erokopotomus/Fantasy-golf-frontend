/**
 * Prep Quiz Card Generator (DS-8)
 *
 * Regenerates the active PrepQuizCard set by running every template in
 * the library against a single bulk-loaded "spine" snapshot.
 *
 * Pipeline:
 *   1. loadSpineSnapshot() — ONE query per data source (teams, coaching
 *      staff, current roster slots w/ player names, 2025 unit ranks).
 *      Templates iterate these in-memory (no N+1).
 *   2. Run each template; on per-template failure, log + skip.
 *   3. Upsert cards by (templateName, subject). New cards land active;
 *      existing rows refresh question/answer/distractors/meta.
 *   4. Soft-deactivate any previously-active card whose (templateName,
 *      subject) wasn't regenerated this run. We never DELETE — that would
 *      cascade-delete PrepQuizReview rows tied to it (review state is
 *      precious; users with streaks shouldn't lose history just because
 *      a coach got fired).
 *   5. Batched upserts via Promise.all (chunks of 100) — mirrors PIR-7 /
 *      DS-2 patterns.
 */

const prisma = require('../../lib/prisma')
const { TEMPLATES } = require('./quizTemplates')

const UPSERT_BATCH_SIZE = 100

/**
 * Load every piece of data the templates need in as few queries as possible.
 *
 * Returns:
 *   {
 *     teams: NflTeam[],
 *     coachingStaff: NflCoachingStaff[] (season=2026),
 *     rosterSlots: NflRosterSlot[] (snapshotType='current')
 *       — each row .player included for name lookup,
 *     unitRanks: NflTeamUnitRank[] (season=2025),
 *   }
 */
async function loadSpineSnapshot(db) {
  const [teams, coachingStaff, rosterSlots, unitRanks] = await Promise.all([
    db.nflTeam.findMany(),
    db.nflCoachingStaff.findMany({ where: { season: 2026 } }),
    db.nflRosterSlot.findMany({
      where: { snapshotType: 'current' },
      include: { player: { select: { name: true } } },
    }),
    db.nflTeamUnitRank.findMany({ where: { season: 2025 } }),
  ])

  return { teams, coachingStaff, rosterSlots, unitRanks }
}

/**
 * Regenerate all active PrepQuizCards from the current data spine.
 *
 * @param {Object} [opts]
 * @param {PrismaClient} [opts.db]
 * @returns {Promise<{totalCards: number, byTemplate: Record<string, number>, deactivated: number, errors: Array}>}
 */
async function regenerateAllCards({ db = prisma } = {}) {
  const startedAt = Date.now()
  const stats = {
    totalCards: 0,
    byTemplate: {},
    deactivated: 0,
    errors: [],
  }

  console.log('[prep card-gen] loading spine snapshot...')
  const spine = await loadSpineSnapshot(db)
  console.log(
    `[prep card-gen] spine: ${spine.teams.length} teams, ` +
      `${spine.coachingStaff.length} coaching rows, ` +
      `${spine.rosterSlots.length} roster slots, ` +
      `${spine.unitRanks.length} unit ranks`
  )

  // 1. Run each template and collect cards.
  const allCards = []
  for (const template of TEMPLATES) {
    try {
      const cards = await template.generate(spine, db)
      stats.byTemplate[template.name] = cards.length
      allCards.push(...cards)
      console.log(`[prep card-gen] ${template.name}: ${cards.length} cards`)
    } catch (e) {
      console.error(`[prep card-gen] template ${template.name} failed:`, e.message)
      stats.errors.push({ phase: 'template', template: template.name, error: e.message })
      stats.byTemplate[template.name] = 0
    }
  }

  // 2. Batched upserts — chunks of 100 concurrent writes.
  const now = new Date()
  console.log(
    `[prep card-gen] writing ${allCards.length} upserts in batches of ${UPSERT_BATCH_SIZE}...`
  )

  for (let i = 0; i < allCards.length; i += UPSERT_BATCH_SIZE) {
    const chunk = allCards.slice(i, i + UPSERT_BATCH_SIZE)
    await Promise.all(
      chunk.map((card) =>
        db.prepQuizCard
          .upsert({
            where: {
              templateName_subject: {
                templateName: card.templateName,
                subject: card.subject,
              },
            },
            create: {
              templateName: card.templateName,
              subject: card.subject,
              question: card.question,
              answer: card.answer,
              distractors: card.distractors,
              difficulty: card.difficulty,
              category: card.category,
              meta: card.meta || {},
              isActive: true,
            },
            update: {
              question: card.question,
              answer: card.answer,
              distractors: card.distractors,
              difficulty: card.difficulty,
              category: card.category,
              meta: card.meta || {},
              isActive: true,
              generatedAt: now,
            },
          })
          .then(() => {
            stats.totalCards++
          })
          .catch((e) => {
            console.error(
              `[prep card-gen] upsert failed (${card.templateName}/${card.subject}):`,
              e.message
            )
            stats.errors.push({
              phase: 'upsert',
              templateName: card.templateName,
              subject: card.subject,
              error: e.message,
            })
          })
      )
    )
    const batchIndex = Math.floor(i / UPSERT_BATCH_SIZE)
    if (batchIndex % 5 === 0) {
      console.log(
        `[prep card-gen] ${Math.min(i + UPSERT_BATCH_SIZE, allCards.length)}/${allCards.length} upserts done`
      )
    }
  }

  // 3. Soft-deactivate any active card whose (templateName, subject) didn't
  //    appear in this run. Preserves PrepQuizReview FKs.
  const freshSet = new Set(
    allCards.map((c) => `${c.templateName}::${c.subject}`)
  )
  const existingActive = await db.prepQuizCard.findMany({
    where: { isActive: true },
    select: { id: true, templateName: true, subject: true },
  })
  const toDeactivate = existingActive.filter(
    (c) => !freshSet.has(`${c.templateName}::${c.subject}`)
  )
  console.log(
    `[prep card-gen] ${toDeactivate.length} stale cards to deactivate (of ${existingActive.length} previously active)`
  )

  for (let i = 0; i < toDeactivate.length; i += UPSERT_BATCH_SIZE) {
    const chunk = toDeactivate.slice(i, i + UPSERT_BATCH_SIZE)
    await Promise.all(
      chunk.map((card) =>
        db.prepQuizCard
          .update({ where: { id: card.id }, data: { isActive: false } })
          .then(() => {
            stats.deactivated++
          })
          .catch((e) => {
            console.error(
              `[prep card-gen] deactivate failed (${card.templateName}/${card.subject}):`,
              e.message
            )
            stats.errors.push({
              phase: 'deactivate',
              templateName: card.templateName,
              subject: card.subject,
              error: e.message,
            })
          })
      )
    )
  }

  stats.durationMs = Date.now() - startedAt
  console.log(
    `[prep card-gen] done in ${(stats.durationMs / 1000).toFixed(1)}s: ` +
      `${stats.totalCards} upserted, ${stats.deactivated} deactivated, ` +
      `${stats.errors.length} errors`
  )

  // Mass-failure detection: bail loud if >10% of upserts errored.
  const attempted = stats.totalCards + stats.errors.filter((e) => e.phase === 'upsert').length
  const errorRate = attempted > 0 ? stats.errors.filter((e) => e.phase === 'upsert').length / attempted : 0
  if (errorRate > 0.1) {
    throw new Error(
      `[prep card-gen] FAILED: ${stats.errors.length}/${attempted} upserts errored (${(errorRate * 100).toFixed(1)}% — threshold 10%)`
    )
  }

  return stats
}

module.exports = { regenerateAllCards, loadSpineSnapshot }
