/**
 * nflScoringService.js — NFL fantasy point calculations
 *
 * Calculates fantasy points from NflPlayerGame stats using league scoring config.
 * Supports Standard, PPR, and Half-PPR presets + custom configs.
 */

// ─── Default Configs ────────────────────────────────────────────────────────

const STANDARD_CONFIG = {
  passing: { perYard: 0.04, perTd: 4, perInt: -2, per2pt: 2 },
  rushing: { perYard: 0.1, perTd: 6, per2pt: 2 },
  receiving: { perYard: 0.1, perTd: 6, perReception: 0, per2pt: 2 },
  fumbles: { perFumbleLost: -2 },
  kicking: { perFgMade: 3, perFg40_49: 4, perFg50Plus: 5, perFgMissed: -1, perXpMade: 1, perXpMissed: -1 },
  defense: { perSack: 1, perInt: 2, perFumbleRecovery: 2, perTd: 6, perSafety: 2 },
  bonuses: { passing300: 2, passing400: 4, rushing100: 2, rushing200: 4, receiving100: 2, receiving200: 4 },
}

const PPR_CONFIG = {
  ...STANDARD_CONFIG,
  receiving: { ...STANDARD_CONFIG.receiving, perReception: 1 },
}

const HALF_PPR_CONFIG = {
  ...STANDARD_CONFIG,
  receiving: { ...STANDARD_CONFIG.receiving, perReception: 0.5 },
}

const PRESETS = {
  standard: STANDARD_CONFIG,
  ppr: PPR_CONFIG,
  half_ppr: HALF_PPR_CONFIG,
}

// ─── Main Calculation ───────────────────────────────────────────────────────

/**
 * Calculate NFL fantasy points for a single player game
 *
 * @param {Object} stats — NflPlayerGame record (or subset of stat fields)
 * @param {Object|string} config — Scoring config object or preset name ('standard', 'ppr', 'half_ppr')
 * @returns {{ total: number, breakdown: Object }}
 */
function calculateFantasyPoints(stats, config) {
  const cfg = typeof config === 'string' ? (PRESETS[config] || STANDARD_CONFIG) : (config || STANDARD_CONFIG)

  const breakdown = {
    passing: 0,
    rushing: 0,
    receiving: 0,
    fumbles: 0,
    kicking: 0,
    defense: 0,
    bonuses: 0,
  }

  // Passing
  if (cfg.passing) {
    if (stats.passYards) breakdown.passing += stats.passYards * cfg.passing.perYard
    if (stats.passTds) breakdown.passing += stats.passTds * cfg.passing.perTd
    if (stats.interceptions) breakdown.passing += stats.interceptions * cfg.passing.perInt
  }

  // Rushing
  if (cfg.rushing) {
    if (stats.rushYards) breakdown.rushing += stats.rushYards * cfg.rushing.perYard
    if (stats.rushTds) breakdown.rushing += stats.rushTds * cfg.rushing.perTd
  }

  // Receiving
  if (cfg.receiving) {
    if (stats.recYards) breakdown.receiving += stats.recYards * cfg.receiving.perYard
    if (stats.recTds) breakdown.receiving += stats.recTds * cfg.receiving.perTd
    if (stats.receptions) breakdown.receiving += stats.receptions * cfg.receiving.perReception
  }

  // Fumbles
  if (cfg.fumbles && stats.fumblesLost) {
    breakdown.fumbles += stats.fumblesLost * cfg.fumbles.perFumbleLost
  }

  // Kicking
  if (cfg.kicking) {
    if (stats.fgMade) breakdown.kicking += stats.fgMade * cfg.kicking.perFgMade
    if (stats.xpMade) breakdown.kicking += stats.xpMade * cfg.kicking.perXpMade
    if (stats.fgAttempts && stats.fgMade) {
      const missed = stats.fgAttempts - stats.fgMade
      if (missed > 0) breakdown.kicking += missed * (cfg.kicking.perFgMissed || 0)
    }
    if (stats.xpAttempts && stats.xpMade) {
      const missed = stats.xpAttempts - stats.xpMade
      if (missed > 0) breakdown.kicking += missed * (cfg.kicking.perXpMissed || 0)
    }
  }

  // Defense
  if (cfg.defense) {
    if (stats.sacks) breakdown.defense += stats.sacks * cfg.defense.perSack
    if (stats.defInterceptions) breakdown.defense += stats.defInterceptions * cfg.defense.perInt
    if (stats.fumblesRecovered) breakdown.defense += stats.fumblesRecovered * cfg.defense.perFumbleRecovery
    if (stats.defTds) breakdown.defense += stats.defTds * cfg.defense.perTd
  }

  // Bonuses
  if (cfg.bonuses) {
    if (stats.passYards >= 400 && cfg.bonuses.passing400) {
      breakdown.bonuses += cfg.bonuses.passing400
    } else if (stats.passYards >= 300 && cfg.bonuses.passing300) {
      breakdown.bonuses += cfg.bonuses.passing300
    }

    if (stats.rushYards >= 200 && cfg.bonuses.rushing200) {
      breakdown.bonuses += cfg.bonuses.rushing200
    } else if (stats.rushYards >= 100 && cfg.bonuses.rushing100) {
      breakdown.bonuses += cfg.bonuses.rushing100
    }

    if (stats.recYards >= 200 && cfg.bonuses.receiving200) {
      breakdown.bonuses += cfg.bonuses.receiving200
    } else if (stats.recYards >= 100 && cfg.bonuses.receiving100) {
      breakdown.bonuses += cfg.bonuses.receiving100
    }
  }

  const total = Math.round(
    (breakdown.passing + breakdown.rushing + breakdown.receiving +
     breakdown.fumbles + breakdown.kicking + breakdown.defense + breakdown.bonuses) * 100
  ) / 100

  return { total, breakdown }
}

/**
 * Calculate fantasy points for multiple player games at once
 *
 * @param {Array} playerGames — Array of NflPlayerGame records
 * @param {Object|string} config — Scoring config
 * @returns {Array<{ playerId, gameId, total, breakdown }>}
 */
function calculateBatch(playerGames, config) {
  return playerGames.map(pg => ({
    playerId: pg.playerId,
    gameId: pg.gameId,
    ...calculateFantasyPoints(pg, config),
  }))
}

/**
 * Get the preset config name from a ScoringSystem rules object
 */
function getPresetFromRules(rules) {
  if (!rules) return 'standard'
  return rules.preset || 'standard'
}

module.exports = {
  calculateFantasyPoints,
  calculateBatch,
  getPresetFromRules,
  PRESETS,
  STANDARD_CONFIG,
  PPR_CONFIG,
  HALF_PPR_CONFIG,
}
