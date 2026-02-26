/**
 * Clutch Power Rank — composite tournament ranking.
 * Weights: Form 35%, CPI 25%, Fit 25%, OWGR 15%
 * Each component is normalized to 0-100 before weighting.
 */
export function computePowerScore(entry) {
  const cm = entry.clutchMetrics || {}
  if (cm.formScore == null && cm.cpi == null && cm.courseFitScore == null) return null

  // Normalize CPI (-3 to +3) → 0-100
  const cpiNorm = cm.cpi != null ? Math.min(Math.max((cm.cpi + 3) / 6 * 100, 0), 100) : 50
  // Form is already 0-100
  const formNorm = cm.formScore ?? 50
  // Fit is already 0-100
  const fitNorm = cm.courseFitScore ?? 50
  // OWGR: rank 1→100, rank 200→0 (inverted, lower rank = better)
  const owgrRank = entry.player?.owgrRank ?? entry.owgrRank
  const owgrNorm = owgrRank ? Math.max(100 - (owgrRank - 1) * 0.5, 0) : 25

  return formNorm * 0.35 + cpiNorm * 0.25 + fitNorm * 0.25 + owgrNorm * 0.15
}
