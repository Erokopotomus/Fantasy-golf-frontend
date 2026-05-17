/**
 * Position-based standard deviation defaults derived from 2024 NFL
 * weekly fantasy point distributions. Tunable post-launch.
 */
const POSITION_SIGMA = {
  QB: 8.0,
  RB: 7.0,
  WR: 9.0,
  TE: 6.0,
  K: 4.0,
  DST: 6.0,
};

/**
 * Abramowitz & Stegun approximation of the standard normal CDF.
 * Accurate to ~7.5e-8. No external math library needed.
 */
function normalCdf(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
}

/**
 * Team variance = sum of per-starter position variances (independence
 * assumption — empirically good enough for v1 ranking purposes).
 *
 * @param {Array<{position: string}>} starters
 * @returns {number}
 */
function teamVariance(starters) {
  return starters.reduce((acc, s) => {
    const sigma = POSITION_SIGMA[s.position] || 7.0;
    return acc + sigma * sigma;
  }, 0);
}

module.exports = { POSITION_SIGMA, normalCdf, teamVariance };
