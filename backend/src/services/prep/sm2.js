/**
 * SM-2 spaced-repetition scheduler (DS-9).
 *
 * Pure function. Given the current review state and a quality response,
 * returns the next state — no DB, no side effects.
 *
 * Reference: https://en.wikipedia.org/wiki/SuperMemo#Description_of_SM-2_algorithm
 *
 * The 4-button UI maps to a 0-3 quality scale:
 *   0 = Again  (wrong)
 *   1 = Hard
 *   2 = Good
 *   3 = Easy
 *
 * The classic SM-2 quality scale is 0-5, but the Anki 4-button variant we
 * follow only exposes 4 levels and applies slightly different interval
 * multipliers — see the design doc.
 */

const MIN_EASE = 1.3
const MAX_EASE = 2.5
const MS_PER_DAY = 86400000

/**
 * @typedef {{ easeFactor: number, interval: number, repetitions: number }} ReviewState
 * @typedef {{ easeFactor: number, interval: number, repetitions: number, dueDate: Date }} ReviewStateWithDue
 */

/**
 * Compute the next review state.
 *
 * @param {ReviewState} state
 * @param {0|1|2|3} quality
 * @param {Date} [now] — defaults to new Date(); injectable for deterministic tests
 * @returns {ReviewStateWithDue}
 */
function scheduleNext(state, quality, now = new Date()) {
  const { easeFactor, interval, repetitions } = state
  let nextEase = easeFactor
  let nextInterval = interval
  let nextReps = repetitions

  if (quality === 0) {
    // Again — wrong answer; reset interval, drop ease, reset reps.
    nextInterval = 1
    nextEase = Math.max(MIN_EASE, easeFactor - 0.2)
    nextReps = 0
  } else if (quality === 1) {
    // Hard — small bump, ease drops.
    nextInterval = Math.max(1, Math.round(interval * 1.2))
    nextEase = Math.max(MIN_EASE, easeFactor - 0.15)
    nextReps = repetitions + 1
  } else if (quality === 2) {
    // Good — standard SM-2 interval growth.
    nextInterval = Math.max(1, Math.round(interval * easeFactor))
    nextReps = repetitions + 1
  } else if (quality === 3) {
    // Easy — bigger interval bump, ease grows.
    nextInterval = Math.max(1, Math.round(interval * easeFactor * 1.3))
    nextEase = Math.min(MAX_EASE, easeFactor + 0.15)
    nextReps = repetitions + 1
  } else {
    throw new Error(`sm2.scheduleNext: invalid quality ${quality} (must be 0-3)`)
  }

  const dueDate = new Date(now.getTime() + nextInterval * MS_PER_DAY)
  return { easeFactor: nextEase, interval: nextInterval, repetitions: nextReps, dueDate }
}

module.exports = { scheduleNext, MIN_EASE, MAX_EASE }
