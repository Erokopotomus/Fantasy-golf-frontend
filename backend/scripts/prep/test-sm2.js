/**
 * Smoke test for DS-9 SM-2 scheduler. Pure function — no DB.
 *
 * Verifies the Anki 4-button variant behavior:
 *   - Good (q=2) from fresh card: interval grows by ease factor
 *   - Again (q=0): resets interval to 1, drops ease, zeroes reps
 *   - Easy (q=3) at max ease: ease stays at ceiling
 *   - Again (q=0) at min ease: ease stays at floor
 *   - Hard (q=1): 1.2x interval, ease drops 0.15
 *   - dueDate is interval days after `now`
 */

const { scheduleNext, MIN_EASE, MAX_EASE } = require('../../src/services/prep/sm2')

let failures = 0
function check(label, cond, expected, actual) {
  if (cond) {
    console.log(`  ✅ ${label}`)
  } else {
    console.error(`  ❌ ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    failures++
  }
}

console.log('\n=== DS-9 SM-2 scheduler smoke test ===\n')

const FIXED_NOW = new Date('2026-05-18T12:00:00Z')

// 1. Good (q=2) from fresh card: interval 1 * ease 2.5 = 3 (rounded), reps=1, ease unchanged
{
  const out = scheduleNext({ easeFactor: 2.5, interval: 1, repetitions: 0 }, 2, FIXED_NOW)
  check('Good from fresh: interval=3', out.interval === 3, 3, out.interval)
  check('Good from fresh: reps=1', out.repetitions === 1, 1, out.repetitions)
  check('Good from fresh: ease=2.5', out.easeFactor === 2.5, 2.5, out.easeFactor)
  const expectedDue = new Date(FIXED_NOW.getTime() + 3 * 86400000).toISOString()
  check('Good from fresh: dueDate=+3d', out.dueDate.toISOString() === expectedDue, expectedDue, out.dueDate.toISOString())
}

// 2. Again (q=0) on second card: interval=1, reps=0, ease drops 0.20
{
  const out = scheduleNext({ easeFactor: 2.5, interval: 3, repetitions: 1 }, 0, FIXED_NOW)
  check('Again: interval=1', out.interval === 1, 1, out.interval)
  check('Again: reps=0', out.repetitions === 0, 0, out.repetitions)
  check('Again: ease=2.3', Math.abs(out.easeFactor - 2.3) < 1e-9, 2.3, out.easeFactor)
}

// 3. Easy (q=3) when ease already at max: ease stays at MAX_EASE
{
  const out = scheduleNext({ easeFactor: MAX_EASE, interval: 6, repetitions: 2 }, 3, FIXED_NOW)
  check('Easy at ceiling: ease=MAX_EASE', out.easeFactor === MAX_EASE, MAX_EASE, out.easeFactor)
  // interval = round(6 * 2.5 * 1.3) = round(19.5) = 20
  check('Easy at ceiling: interval=20', out.interval === 20, 20, out.interval)
  check('Easy at ceiling: reps=3', out.repetitions === 3, 3, out.repetitions)
}

// 4. Again (q=0) when ease already at min: ease stays at MIN_EASE
{
  const out = scheduleNext({ easeFactor: MIN_EASE, interval: 10, repetitions: 3 }, 0, FIXED_NOW)
  check('Again at floor: ease=MIN_EASE', out.easeFactor === MIN_EASE, MIN_EASE, out.easeFactor)
  check('Again at floor: interval=1', out.interval === 1, 1, out.interval)
}

// 5. Hard (q=1): interval grows by 1.2x, ease drops 0.15
{
  const out = scheduleNext({ easeFactor: 2.5, interval: 5, repetitions: 2 }, 1, FIXED_NOW)
  check('Hard: interval=6 (round(5*1.2))', out.interval === 6, 6, out.interval)
  check('Hard: ease=2.35', Math.abs(out.easeFactor - 2.35) < 1e-9, 2.35, out.easeFactor)
  check('Hard: reps=3', out.repetitions === 3, 3, out.repetitions)
}

// 6. Invalid quality throws
{
  let threw = false
  try {
    scheduleNext({ easeFactor: 2.5, interval: 1, repetitions: 0 }, 5, FIXED_NOW)
  } catch (e) {
    threw = true
  }
  check('Invalid quality (5) throws', threw === true, true, threw)
}

console.log()
if (failures > 0) {
  console.error(`❌ ${failures} assertion(s) failed\n`)
  process.exit(1)
}
console.log(`✅ DS-9 SM-2 smoke test passed (all assertions)\n`)
