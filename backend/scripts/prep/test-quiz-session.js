/**
 * Smoke test for DS-10 quiz session service.
 *
 * Verifies:
 *   1. getDueCardsForUser returns >=1 card for a fresh test user
 *   2. recordReview creates a PrepQuizReview with SM-2 interval=3 on Good
 *   3. The just-reviewed card is excluded from the next getDueCardsForUser
 *      (dueDate is in the future)
 *   4. Streak goes 0 → 1 on first review of the day
 *   5. Focus mode 'AFC' filters to AFC team cards only
 *
 * Uses a synthetic test user created in this script and cleaned up at the
 * end so we don't pollute real user data.
 */

const prisma = require('../../src/lib/prisma')
const {
  getDueCardsForUser,
  recordReview,
  decodeFocusMode,
  teamAbbrsForFocusMode,
} = require('../../src/services/prep/quizSession')

let failures = 0
function check(label, cond, expected, actual) {
  if (cond) {
    console.log(`  ✅ ${label}`)
  } else {
    console.error(`  ❌ ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    failures++
  }
}

async function main() {
  console.log('\n=== DS-10 quiz session smoke test ===\n')

  // Create a synthetic test user.
  const testEmail = `test-prep-${Date.now()}@clutch.test`
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      username: `prep_test_${Date.now()}`,
      password: 'test-hash-not-used',
      name: 'Prep Test',
    },
  })
  console.log(`[smoke] created test user ${user.id}\n`)

  try {
    // 1. getDueCardsForUser returns >=1 card for a fresh user (cards exist from DS-8)
    const due1 = await getDueCardsForUser(user.id)
    check('Fresh user has due cards', due1.length >= 1, '>=1', due1.length)
    check('Fresh user cards have no userReview', due1.every((c) => c.userReview === null), 'all null', `${due1.filter((c) => c.userReview !== null).length} with reviews`)

    if (due1.length === 0) {
      throw new Error('No cards available — DS-8 must have populated PrepQuizCard first')
    }

    // 2. recordReview with Good (q=2) creates review with interval=3
    const firstCard = due1[0]
    const review = await recordReview(user.id, firstCard.id, 2)
    check('Review interval=3 on Good', review.interval === 3, 3, review.interval)
    check('Review repetitions=1', review.repetitions === 1, 1, review.repetitions)
    check('Review easeFactor=2.5', review.easeFactor === 2.5, 2.5, review.easeFactor)
    check('Review correctCount=1', review.correctCount === 1, 1, review.correctCount)
    const expectedDueMs = Date.now() + 3 * 86400000
    const actualDueMs = new Date(review.dueDate).getTime()
    const dueDelta = Math.abs(actualDueMs - expectedDueMs)
    check('Review dueDate ~+3d (within 60s)', dueDelta < 60000, '<60s drift', `${dueDelta}ms drift`)

    // 3. The just-reviewed card should be excluded next time (dueDate in future)
    const due2 = await getDueCardsForUser(user.id)
    const stillContainsFirst = due2.some((c) => c.id === firstCard.id)
    check('Just-reviewed card excluded next call', stillContainsFirst === false, 'excluded', stillContainsFirst)

    // 4. Streak: should be 1 after first review
    const settings = await prisma.prepUserSettings.findUnique({ where: { userId: user.id } })
    check('Streak created (settings row exists)', settings !== null, 'row', null)
    check('currentStreak=1 after first review', settings?.currentStreak === 1, 1, settings?.currentStreak)
    check('longestStreak=1 after first review', settings?.longestStreak === 1, 1, settings?.longestStreak)
    check('lastQuizDate set', settings?.lastQuizDate != null, 'set', null)

    // 5. Focus mode decoding
    check('decodeFocusMode(null) → null', decodeFocusMode(null) === null, null, decodeFocusMode(null))
    const afc = decodeFocusMode('AFC')
    check('decodeFocusMode("AFC") → conference filter', afc?.conference === 'AFC' && !afc.division, { conference: 'AFC' }, afc)
    const afcEast = decodeFocusMode('AFC_EAST')
    check('decodeFocusMode("AFC_EAST") → conf+div', afcEast?.conference === 'AFC' && afcEast?.division === 'EAST', { conference: 'AFC', division: 'EAST' }, afcEast)

    // 6. Focus mode filters cards (set settings to AFC, verify all returned cards are AFC team subjects)
    await prisma.prepUserSettings.update({
      where: { userId: user.id },
      data: { focusMode: 'AFC' },
    })
    const afcAbbrs = await teamAbbrsForFocusMode('AFC')
    check('AFC has 16 teams', afcAbbrs?.length === 16, 16, afcAbbrs?.length)

    const dueAfc = await getDueCardsForUser(user.id)
    const allAfc = dueAfc.every((c) => afcAbbrs.includes(c.subject))
    check('Focus=AFC: all returned cards have AFC subject', allAfc, true, allAfc)
  } finally {
    // Cleanup test user (cascade deletes PrepQuizReview + PrepUserSettings)
    await prisma.prepQuizReview.deleteMany({ where: { userId: user.id } })
    await prisma.prepUserSettings.deleteMany({ where: { userId: user.id } })
    await prisma.user.delete({ where: { id: user.id } })
    console.log(`\n[smoke] cleaned up test user ${user.id}`)
  }

  await prisma.$disconnect()
  if (failures > 0) {
    console.error(`\n❌ ${failures} check(s) failed\n`)
    process.exit(1)
  }
  console.log(`\n✅ DS-10 quiz session smoke test passed\n`)
}

main().catch(async (e) => {
  console.error('[smoke] fatal:', e)
  await prisma.$disconnect().catch(() => {})
  process.exit(1)
})
