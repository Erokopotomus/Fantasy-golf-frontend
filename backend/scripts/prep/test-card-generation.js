/**
 * Smoke test for DS-8 (quizCardGenerator).
 *
 * Runs regenerateAllCards() against the live DB and verifies:
 *   - Total active cards >= 280 (~9 templates × 32 teams = 288; some
 *     templates may legitimately skip a team that lacks the data)
 *   - Every team that has a 2026 HC in NflCoachingStaff also has an
 *     active team_hc card (template wiring sanity)
 *   - Every active card has exactly 3 distractors and none equal the
 *     answer
 *   - BUF's team_hc answer matches the HC stored in NflCoachingStaff
 *     for BUF (end-to-end data sanity)
 *
 * Exit 0 on pass, 1 on any failure.
 */

try {
  require('dotenv').config({
    path: require('path').resolve(__dirname, '../../.env'),
  })
} catch {}

const { regenerateAllCards } = require('../../src/services/prep/quizCardGenerator')
const prisma = require('../../src/lib/prisma')

const MIN_ACTIVE_CARDS = 280

;(async () => {
  let failures = 0

  try {
    console.log('=== Quiz card generator smoke test ===\n')
    const result = await regenerateAllCards()
    console.log('\n=== Stats ===')
    console.log(JSON.stringify(result, null, 2))

    // Check 1: per-upsert errors collected in stats
    const upsertErrors = result.errors.filter((e) => e.phase === 'upsert')
    if (upsertErrors.length > 0) {
      console.error(`\n❌ ${upsertErrors.length} upsert errors:`)
      console.error(JSON.stringify(upsertErrors.slice(0, 5), null, 2))
      failures++
    } else {
      console.log('\n✅ No upsert errors')
    }

    // Check 2: minimum total active cards
    const activeCount = await prisma.prepQuizCard.count({
      where: { isActive: true },
    })
    if (activeCount < MIN_ACTIVE_CARDS) {
      console.error(
        `❌ Only ${activeCount} active cards (expected >= ${MIN_ACTIVE_CARDS})`
      )
      failures++
    } else {
      console.log(`✅ ${activeCount} active cards (>= ${MIN_ACTIVE_CARDS})`)
    }

    // Check 3: every team with a 2026 HC has a team_hc card
    const hcRows = await prisma.nflCoachingStaff.findMany({
      where: { season: 2026, role: 'HC' },
      include: { team: { select: { abbreviation: true } } },
    })
    const hcCards = await prisma.prepQuizCard.findMany({
      where: { templateName: 'team_hc', isActive: true },
      select: { subject: true },
    })
    const hcCardSubjects = new Set(hcCards.map((c) => c.subject))
    const missingHcCards = hcRows
      .map((r) => r.team.abbreviation)
      .filter((abbr) => !hcCardSubjects.has(abbr))

    if (missingHcCards.length > 0) {
      console.error(
        `❌ Missing team_hc cards for ${missingHcCards.length} team(s): ${missingHcCards.join(', ')}`
      )
      failures++
    } else {
      console.log(
        `✅ All ${hcRows.length} teams with a 2026 HC have a team_hc card`
      )
    }

    // Check 4: every active card has exactly 3 distractors and none equal
    // the answer
    const allActive = await prisma.prepQuizCard.findMany({
      where: { isActive: true },
      select: {
        id: true,
        templateName: true,
        subject: true,
        answer: true,
        distractors: true,
      },
    })
    const badShape = []
    for (const card of allActive) {
      if (!Array.isArray(card.distractors) || card.distractors.length !== 3) {
        badShape.push({
          card: `${card.templateName}/${card.subject}`,
          reason: `distractor count = ${card.distractors?.length}`,
        })
        continue
      }
      const uniq = new Set(card.distractors)
      if (uniq.size !== 3) {
        badShape.push({
          card: `${card.templateName}/${card.subject}`,
          reason: 'duplicate distractors',
        })
        continue
      }
      if (card.distractors.includes(card.answer)) {
        badShape.push({
          card: `${card.templateName}/${card.subject}`,
          reason: `distractor equals answer "${card.answer}"`,
        })
      }
    }
    if (badShape.length > 0) {
      console.error(
        `❌ ${badShape.length} cards with bad distractor shape (showing first 5):`
      )
      console.error(JSON.stringify(badShape.slice(0, 5), null, 2))
      failures++
    } else {
      console.log(
        `✅ All ${allActive.length} active cards have 3 distinct distractors != answer`
      )
    }

    // Check 5: BUF team_hc answer matches NflCoachingStaff
    const bufHcRow = await prisma.nflCoachingStaff.findFirst({
      where: {
        season: 2026,
        role: 'HC',
        team: { abbreviation: 'BUF' },
      },
    })
    const bufHcCard = await prisma.prepQuizCard.findUnique({
      where: {
        templateName_subject: {
          templateName: 'team_hc',
          subject: 'BUF',
        },
      },
    })
    if (!bufHcRow) {
      console.error('❌ No 2026 HC row found for BUF in NflCoachingStaff')
      failures++
    } else if (!bufHcCard) {
      console.error('❌ No team_hc card found for BUF')
      failures++
    } else if (bufHcCard.answer !== bufHcRow.name) {
      console.error(
        `❌ BUF team_hc answer mismatch: card="${bufHcCard.answer}" vs staff="${bufHcRow.name}"`
      )
      failures++
    } else {
      console.log(`✅ BUF team_hc card answer="${bufHcCard.answer}" matches staff`)
    }

    // Per-template count summary
    console.log('\n=== Per-template active card counts ===')
    const templateNames = Object.keys(result.byTemplate)
    for (const tn of templateNames) {
      const count = await prisma.prepQuizCard.count({
        where: { templateName: tn, isActive: true },
      })
      console.log(`  ${tn}: ${count}`)
    }

    if (failures > 0) {
      console.error(`\n❌ Card generator smoke FAILED (${failures} check(s))`)
      process.exit(1)
    }
    console.log('\n✅ Card generator smoke passed')
    process.exit(0)
  } catch (e) {
    console.error('\n❌ Card generator smoke crashed:', e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
})()
