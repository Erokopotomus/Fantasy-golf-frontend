/**
 * Shared numeric helpers for Manager Intelligence extractors.
 *
 * `mean` and `stdDev` are used by every extractor that aggregates per-pick or
 * per-draft numeric series. Centralized here so all extractors share one
 * definition (population stddev, zero-on-empty, length-1 → 0).
 */

function mean(values) {
  if (!values || values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Population (uncorrected) standard deviation. Returns 0 for arrays with
 * 0 or 1 elements (no variance to measure).
 */
function stdDev(values) {
  if (!values || values.length <= 1) return 0
  const m = mean(values)
  const variance =
    values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

module.exports = { mean, stdDev }
