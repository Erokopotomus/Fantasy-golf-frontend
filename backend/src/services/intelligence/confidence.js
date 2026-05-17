/**
 * Composite confidence score 0-100 from three components:
 *   N (sample size): more observations = more reliable
 *   consistency (0-1, or 0-100): higher = pattern holds more often
 *   effectSize (standardized): higher absolute value = stronger signal vs baseline
 *
 * Designed to be tunable from the admin via per-class thresholdsOverride.
 */

const DEFAULT_THRESHOLDS = {
  highMinN: 5,
  highMinConsistency: 0.80,
  medMinN: 3,
  medMinConsistency: 0.60,
}

function sampleSizeWeight(n) {
  // 0 at N=0, ~0.45 at N=3, ~0.86 at N=10, ~0.98 at N=20+
  if (n <= 0) return 0
  return 1 - Math.exp(-n / 5)
}

function consistencyWeight(pct) {
  // pct in [0, 1]; S-curve favoring high consistency
  if (pct <= 0) return 0
  if (pct >= 1) return 1
  return Math.pow(pct, 1.5)
}

function effectSizeWeight(effect) {
  // Diminishing returns. effect of 0 = 0 weight, ~0.76 at 1.0 std dev, ~0.94 at 2.0
  // Scaled so a "strong" 1.5 std-dev signal contributes ~0.88 — keeps composite scores
  // for genuinely HIGH-confidence patterns above the 60-point threshold.
  return 1 - Math.exp(-Math.abs(effect) / 0.7)
}

/**
 * Normalize consistency to [0, 1] regardless of input scale.
 */
function normalizeConsistency(c) {
  if (c == null) return 0
  return c > 1 ? c / 100 : c
}

function computeConfidenceScore({ sampleSize, consistencyPct, effectSize }) {
  const c = normalizeConsistency(consistencyPct)
  const score = sampleSizeWeight(sampleSize) * consistencyWeight(c) * effectSizeWeight(effectSize) * 100
  return Math.round(score * 10) / 10 // one decimal
}

function computeLabel({ sampleSize, consistencyPct }, thresholds = DEFAULT_THRESHOLDS) {
  const c = normalizeConsistency(consistencyPct)
  if (sampleSize >= thresholds.highMinN && c >= thresholds.highMinConsistency) return 'HIGH'
  if (sampleSize >= thresholds.medMinN && c >= thresholds.medMinConsistency) return 'MEDIUM'
  return 'LOW'
}

module.exports = {
  computeConfidenceScore,
  computeLabel,
  normalizeConsistency,
  DEFAULT_THRESHOLDS,
}
