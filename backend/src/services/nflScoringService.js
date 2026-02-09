/**
 * nflScoringService.js — NFL fantasy point calculations
 *
 * Calculates fantasy points from NflPlayerGame stats using a flat key-value
 * scoring map (Sleeper-style). Supports Standard, PPR, Half-PPR presets
 * plus fully custom per-league scoring configs.
 *
 * Design: scoring rules are a flat { stat_key: point_value } object.
 * This makes them trivially extensible — add a new key = add a new stat.
 */

// ─── Full Scoring Schema ────────────────────────────────────────────────────
// Every available stat key with its default value (Standard scoring).
// Grouped by category for UI display. The actual rules object is flat.

const NFL_SCORING_SCHEMA = {
  // ── Passing ──
  pass_yd:       { default: 0.04, category: 'passing', label: 'Passing Yards (per yard)' },
  pass_td:       { default: 4,    category: 'passing', label: 'Passing TD' },
  pass_2pt:      { default: 2,    category: 'passing', label: 'Passing 2-Point Conversion' },
  pass_int:      { default: -2,   category: 'passing', label: 'Interception Thrown' },
  pass_cmp:      { default: 0,    category: 'passing', label: 'Completion' },
  pass_att:      { default: 0,    category: 'passing', label: 'Pass Attempt' },
  pass_inc:      { default: 0,    category: 'passing', label: 'Incompletion' },
  pass_sack:     { default: 0,    category: 'passing', label: 'Sack Taken' },
  pass_fd:       { default: 0,    category: 'passing', label: 'Passing First Down' },
  pass_td_40p:   { default: 0,    category: 'passing', label: '40+ Yard Passing TD Bonus' },
  pass_td_50p:   { default: 0,    category: 'passing', label: '50+ Yard Passing TD Bonus' },

  // ── Rushing ──
  rush_yd:       { default: 0.1,  category: 'rushing', label: 'Rushing Yards (per yard)' },
  rush_td:       { default: 6,    category: 'rushing', label: 'Rushing TD' },
  rush_2pt:      { default: 2,    category: 'rushing', label: 'Rushing 2-Point Conversion' },
  rush_att:      { default: 0,    category: 'rushing', label: 'Rush Attempt' },
  rush_fd:       { default: 0,    category: 'rushing', label: 'Rushing First Down' },
  rush_td_40p:   { default: 0,    category: 'rushing', label: '40+ Yard Rushing TD Bonus' },
  rush_td_50p:   { default: 0,    category: 'rushing', label: '50+ Yard Rushing TD Bonus' },

  // ── Receiving ──
  rec:           { default: 0,    category: 'receiving', label: 'Reception' },
  rec_yd:        { default: 0.1,  category: 'receiving', label: 'Receiving Yards (per yard)' },
  rec_td:        { default: 6,    category: 'receiving', label: 'Receiving TD' },
  rec_2pt:       { default: 2,    category: 'receiving', label: 'Receiving 2-Point Conversion' },
  rec_tgt:       { default: 0,    category: 'receiving', label: 'Target' },
  rec_fd:        { default: 0,    category: 'receiving', label: 'Receiving First Down' },
  rec_td_40p:    { default: 0,    category: 'receiving', label: '40+ Yard Receiving TD Bonus' },
  rec_td_50p:    { default: 0,    category: 'receiving', label: '50+ Yard Receiving TD Bonus' },

  // ── Fumbles ──
  fum:           { default: 0,    category: 'fumbles', label: 'Fumble' },
  fum_lost:      { default: -2,   category: 'fumbles', label: 'Fumble Lost' },
  fum_rec:       { default: 0,    category: 'fumbles', label: 'Own Fumble Recovery' },
  fum_rec_td:    { default: 0,    category: 'fumbles', label: 'Fumble Recovery TD' },

  // ── Kicking ──
  fgm:           { default: 3,    category: 'kicking', label: 'FG Made (any distance)' },
  fgm_0_19:      { default: 0,    category: 'kicking', label: 'FG Made 0-19 Yards' },
  fgm_20_29:     { default: 0,    category: 'kicking', label: 'FG Made 20-29 Yards' },
  fgm_30_39:     { default: 0,    category: 'kicking', label: 'FG Made 30-39 Yards' },
  fgm_40_49:     { default: 4,    category: 'kicking', label: 'FG Made 40-49 Yards' },
  fgm_50p:       { default: 5,    category: 'kicking', label: 'FG Made 50+ Yards' },
  fgmiss:        { default: -1,   category: 'kicking', label: 'FG Missed' },
  xpm:           { default: 1,    category: 'kicking', label: 'Extra Point Made' },
  xpmiss:        { default: -1,   category: 'kicking', label: 'Extra Point Missed' },

  // ── Team Defense/Special Teams ──
  def_td:        { default: 6,    category: 'defense', label: 'Defensive TD' },
  sack:          { default: 1,    category: 'defense', label: 'Sack' },
  int:           { default: 2,    category: 'defense', label: 'Interception' },
  ff:            { default: 0,    category: 'defense', label: 'Forced Fumble' },
  def_fum_rec:   { default: 2,    category: 'defense', label: 'Fumble Recovery' },
  safe:          { default: 2,    category: 'defense', label: 'Safety' },
  blk_kick:      { default: 2,    category: 'defense', label: 'Blocked Kick' },
  def_2pt:       { default: 2,    category: 'defense', label: 'Defensive 2-Point Return' },

  // Points-allowed tiers (team DST)
  pts_allow_0:     { default: 10,  category: 'defense', label: '0 Points Allowed' },
  pts_allow_1_6:   { default: 7,   category: 'defense', label: '1-6 Points Allowed' },
  pts_allow_7_13:  { default: 4,   category: 'defense', label: '7-13 Points Allowed' },
  pts_allow_14_20: { default: 1,   category: 'defense', label: '14-20 Points Allowed' },
  pts_allow_21_27: { default: 0,   category: 'defense', label: '21-27 Points Allowed' },
  pts_allow_28_34: { default: -1,  category: 'defense', label: '28-34 Points Allowed' },
  pts_allow_35p:   { default: -4,  category: 'defense', label: '35+ Points Allowed' },

  // Special teams player
  st_td:         { default: 6,    category: 'special_teams', label: 'Special Teams TD' },
  pr_yd:         { default: 0,    category: 'special_teams', label: 'Punt Return Yards (per yard)' },
  kr_yd:         { default: 0,    category: 'special_teams', label: 'Kick Return Yards (per yard)' },

  // ── Bonuses ──
  bonus_pass_yd_300: { default: 2, category: 'bonuses', label: '300+ Passing Yard Bonus' },
  bonus_pass_yd_400: { default: 4, category: 'bonuses', label: '400+ Passing Yard Bonus' },
  bonus_rush_yd_100: { default: 2, category: 'bonuses', label: '100+ Rushing Yard Bonus' },
  bonus_rush_yd_200: { default: 4, category: 'bonuses', label: '200+ Rushing Yard Bonus' },
  bonus_rec_yd_100:  { default: 2, category: 'bonuses', label: '100+ Receiving Yard Bonus' },
  bonus_rec_yd_200:  { default: 4, category: 'bonuses', label: '200+ Receiving Yard Bonus' },
  bonus_rec_te:      { default: 0, category: 'bonuses', label: 'TE Premium (extra per reception)' },
  bonus_rec_rb:      { default: 0, category: 'bonuses', label: 'RB Reception Bonus' },
  bonus_rec_wr:      { default: 0, category: 'bonuses', label: 'WR Reception Bonus' },

  // ── IDP (future — keys defined, default 0) ──
  idp_tkl_solo:   { default: 0, category: 'idp', label: 'Solo Tackle' },
  idp_tkl_ast:    { default: 0, category: 'idp', label: 'Assisted Tackle' },
  idp_tkl_loss:   { default: 0, category: 'idp', label: 'Tackle for Loss' },
  idp_sack:       { default: 0, category: 'idp', label: 'IDP Sack' },
  idp_qb_hit:     { default: 0, category: 'idp', label: 'QB Hit' },
  idp_int:        { default: 0, category: 'idp', label: 'IDP Interception' },
  idp_ff:         { default: 0, category: 'idp', label: 'IDP Forced Fumble' },
  idp_fum_rec:    { default: 0, category: 'idp', label: 'IDP Fumble Recovery' },
  idp_def_td:     { default: 0, category: 'idp', label: 'IDP Defensive TD' },
  idp_pass_def:   { default: 0, category: 'idp', label: 'Pass Defended' },
  idp_saf:        { default: 0, category: 'idp', label: 'IDP Safety' },
  idp_blk_kick:   { default: 0, category: 'idp', label: 'IDP Blocked Kick' },
}

// ─── Build preset flat maps from schema ──────────────────────────────────────

function buildDefaultMap() {
  const map = {}
  for (const [key, def] of Object.entries(NFL_SCORING_SCHEMA)) {
    map[key] = def.default
  }
  return map
}

const STANDARD_RULES = buildDefaultMap()

const PPR_RULES = { ...STANDARD_RULES, rec: 1 }

const HALF_PPR_RULES = { ...STANDARD_RULES, rec: 0.5 }

const PRESETS = {
  standard: STANDARD_RULES,
  ppr: PPR_RULES,
  half_ppr: HALF_PPR_RULES,
}

// ─── Stat Mapping ───────────────────────────────────────────────────────────
// Maps flat scoring keys to NflPlayerGame field names.
// Stats not in this map are computed (bonuses, tiers, etc.)

function mapStatsToKeys(stats) {
  return {
    // Passing
    pass_yd: stats.passYards || 0,
    pass_td: stats.passTds || 0,
    pass_2pt: stats.pass2pt || 0,
    pass_int: stats.interceptions || 0,
    pass_cmp: stats.passCompletions || 0,
    pass_att: stats.passAttempts || 0,
    pass_inc: (stats.passAttempts || 0) - (stats.passCompletions || 0),
    pass_sack: stats.sacked || 0,

    // Rushing
    rush_yd: stats.rushYards || 0,
    rush_td: stats.rushTds || 0,
    rush_2pt: stats.rush2pt || 0,
    rush_att: stats.rushAttempts || 0,

    // Receiving
    rec: stats.receptions || 0,
    rec_yd: stats.recYards || 0,
    rec_td: stats.recTds || 0,
    rec_2pt: stats.rec2pt || 0,
    rec_tgt: stats.targets || 0,

    // Fumbles
    fum: stats.fumbles || 0,
    fum_lost: stats.fumblesLost || 0,

    // Kicking (per-distance breakdowns)
    fgm_0_19: stats.fgMade0_19 || 0,
    fgm_20_29: stats.fgMade20_29 || 0,
    fgm_30_39: stats.fgMade30_39 || 0,
    fgm_40_49: stats.fgMade40_49 || 0,
    fgm_50p: stats.fgMade50Plus || 0,
    fgmiss: (stats.fgAttempts || 0) - (stats.fgMade || 0),
    xpm: stats.xpMade || 0,
    xpmiss: (stats.xpAttempts || 0) - (stats.xpMade || 0),
    // Generic fgm = total FG made (used if per-distance not available)
    fgm: stats.fgMade || 0,

    // Defense
    sack: stats.sacks || 0,
    int: stats.defInterceptions || 0,
    ff: stats.fumblesForced || 0,
    def_fum_rec: stats.fumblesRecovered || 0,
    def_td: stats.defTds || 0,
    safe: stats.safeties || 0,
    blk_kick: stats.blockedKicks || 0,

    // Special teams
    st_td: stats.returnTds || 0,
    pr_yd: 0, // Not tracked separately yet
    kr_yd: stats.returnYards || 0,

    // IDP (from defense fields for now)
    idp_tkl_solo: stats.tacklesSolo || 0,
    idp_tkl_ast: stats.tacklesAssist || 0,
    idp_sack: 0, // separate from team sacks — not yet tracked
    idp_int: 0,
    idp_ff: 0,
    idp_fum_rec: 0,
    idp_def_td: 0,
    idp_pass_def: stats.passesDefended || 0,
  }
}

// ─── Main Calculation ───────────────────────────────────────────────────────

/**
 * Calculate NFL fantasy points for a single player game
 *
 * @param {Object} stats — NflPlayerGame record (or subset of stat fields)
 * @param {Object|string} config — Flat scoring rules map or preset name
 * @returns {{ total: number, breakdown: Object }}
 */
function calculateFantasyPoints(stats, config) {
  // Resolve config: preset name → flat rules, or legacy nested config → convert
  let rules
  if (typeof config === 'string') {
    rules = PRESETS[config] || STANDARD_RULES
  } else if (config && typeof config === 'object') {
    // Check if it's a flat map (has pass_yd) or legacy nested config (has passing.perYard)
    if (config.pass_yd !== undefined || config.rec !== undefined) {
      // Flat map — use directly, fill in missing keys with defaults
      rules = { ...STANDARD_RULES, ...config }
    } else if (config.passing || config.rushing) {
      // Legacy nested config — convert to flat map for backward compat
      rules = convertLegacyConfig(config)
    } else if (config.preset) {
      // Config object with preset field
      rules = PRESETS[config.preset] || STANDARD_RULES
    } else {
      rules = STANDARD_RULES
    }
  } else {
    rules = STANDARD_RULES
  }

  const mapped = mapStatsToKeys(stats)
  const breakdown = {
    passing: 0,
    rushing: 0,
    receiving: 0,
    fumbles: 0,
    kicking: 0,
    defense: 0,
    special_teams: 0,
    bonuses: 0,
    idp: 0,
  }

  // ── Passing ──
  breakdown.passing += mapped.pass_yd * (rules.pass_yd || 0)
  breakdown.passing += mapped.pass_td * (rules.pass_td || 0)
  breakdown.passing += mapped.pass_2pt * (rules.pass_2pt || 0)
  breakdown.passing += mapped.pass_int * (rules.pass_int || 0)
  breakdown.passing += mapped.pass_cmp * (rules.pass_cmp || 0)
  breakdown.passing += mapped.pass_att * (rules.pass_att || 0)
  breakdown.passing += mapped.pass_inc * (rules.pass_inc || 0)
  breakdown.passing += mapped.pass_sack * (rules.pass_sack || 0)

  // ── Rushing ──
  breakdown.rushing += mapped.rush_yd * (rules.rush_yd || 0)
  breakdown.rushing += mapped.rush_td * (rules.rush_td || 0)
  breakdown.rushing += mapped.rush_2pt * (rules.rush_2pt || 0)
  breakdown.rushing += mapped.rush_att * (rules.rush_att || 0)

  // ── Receiving ──
  breakdown.receiving += mapped.rec * (rules.rec || 0)
  breakdown.receiving += mapped.rec_yd * (rules.rec_yd || 0)
  breakdown.receiving += mapped.rec_td * (rules.rec_td || 0)
  breakdown.receiving += mapped.rec_2pt * (rules.rec_2pt || 0)
  breakdown.receiving += mapped.rec_tgt * (rules.rec_tgt || 0)

  // ── Fumbles ──
  breakdown.fumbles += mapped.fum * (rules.fum || 0)
  breakdown.fumbles += mapped.fum_lost * (rules.fum_lost || 0)

  // ── Kicking ──
  // If per-distance values are set, use them instead of generic fgm
  const hasDistanceKicking = (rules.fgm_0_19 || rules.fgm_20_29 || rules.fgm_30_39 || rules.fgm_40_49 || rules.fgm_50p)
  if (hasDistanceKicking) {
    breakdown.kicking += mapped.fgm_0_19 * (rules.fgm_0_19 || 0)
    breakdown.kicking += mapped.fgm_20_29 * (rules.fgm_20_29 || 0)
    breakdown.kicking += mapped.fgm_30_39 * (rules.fgm_30_39 || 0)
    breakdown.kicking += mapped.fgm_40_49 * (rules.fgm_40_49 || 0)
    breakdown.kicking += mapped.fgm_50p * (rules.fgm_50p || 0)
  } else {
    // Fallback: generic FG made value
    breakdown.kicking += mapped.fgm * (rules.fgm || 0)
  }
  breakdown.kicking += mapped.fgmiss * (rules.fgmiss || 0)
  breakdown.kicking += mapped.xpm * (rules.xpm || 0)
  breakdown.kicking += mapped.xpmiss * (rules.xpmiss || 0)

  // ── Team Defense ──
  breakdown.defense += mapped.sack * (rules.sack || 0)
  breakdown.defense += mapped.int * (rules.int || 0)
  breakdown.defense += mapped.ff * (rules.ff || 0)
  breakdown.defense += mapped.def_fum_rec * (rules.def_fum_rec || 0)
  breakdown.defense += mapped.def_td * (rules.def_td || 0)
  breakdown.defense += mapped.safe * (rules.safe || 0)
  breakdown.defense += mapped.blk_kick * (rules.blk_kick || 0)

  // Points-allowed tier scoring (for team DST)
  if (stats.pointsAllowed !== undefined && stats.pointsAllowed !== null) {
    const pa = stats.pointsAllowed
    if (pa === 0) breakdown.defense += (rules.pts_allow_0 || 0)
    else if (pa <= 6) breakdown.defense += (rules.pts_allow_1_6 || 0)
    else if (pa <= 13) breakdown.defense += (rules.pts_allow_7_13 || 0)
    else if (pa <= 20) breakdown.defense += (rules.pts_allow_14_20 || 0)
    else if (pa <= 27) breakdown.defense += (rules.pts_allow_21_27 || 0)
    else if (pa <= 34) breakdown.defense += (rules.pts_allow_28_34 || 0)
    else breakdown.defense += (rules.pts_allow_35p || 0)
  }

  // ── Special Teams ──
  breakdown.special_teams += mapped.st_td * (rules.st_td || 0)
  breakdown.special_teams += mapped.kr_yd * (rules.kr_yd || 0)
  breakdown.special_teams += mapped.pr_yd * (rules.pr_yd || 0)

  // ── Bonuses ──
  const passYds = mapped.pass_yd
  const rushYds = mapped.rush_yd
  const recYds = mapped.rec_yd

  if (passYds >= 400 && rules.bonus_pass_yd_400) {
    breakdown.bonuses += rules.bonus_pass_yd_400
  } else if (passYds >= 300 && rules.bonus_pass_yd_300) {
    breakdown.bonuses += rules.bonus_pass_yd_300
  }

  if (rushYds >= 200 && rules.bonus_rush_yd_200) {
    breakdown.bonuses += rules.bonus_rush_yd_200
  } else if (rushYds >= 100 && rules.bonus_rush_yd_100) {
    breakdown.bonuses += rules.bonus_rush_yd_100
  }

  if (recYds >= 200 && rules.bonus_rec_yd_200) {
    breakdown.bonuses += rules.bonus_rec_yd_200
  } else if (recYds >= 100 && rules.bonus_rec_yd_100) {
    breakdown.bonuses += rules.bonus_rec_yd_100
  }

  // ── IDP ──
  breakdown.idp += mapped.idp_tkl_solo * (rules.idp_tkl_solo || 0)
  breakdown.idp += mapped.idp_tkl_ast * (rules.idp_tkl_ast || 0)
  breakdown.idp += mapped.idp_pass_def * (rules.idp_pass_def || 0)
  breakdown.idp += mapped.idp_sack * (rules.idp_sack || 0)
  breakdown.idp += mapped.idp_int * (rules.idp_int || 0)
  breakdown.idp += mapped.idp_ff * (rules.idp_ff || 0)
  breakdown.idp += mapped.idp_fum_rec * (rules.idp_fum_rec || 0)
  breakdown.idp += mapped.idp_def_td * (rules.idp_def_td || 0)

  const total = Math.round(
    (breakdown.passing + breakdown.rushing + breakdown.receiving +
     breakdown.fumbles + breakdown.kicking + breakdown.defense +
     breakdown.special_teams + breakdown.bonuses + breakdown.idp) * 100
  ) / 100

  return { total, breakdown }
}

/**
 * Convert legacy nested config (from existing seed/presets) to flat map
 */
function convertLegacyConfig(config) {
  const rules = { ...STANDARD_RULES }

  if (config.passing) {
    if (config.passing.perYard !== undefined) rules.pass_yd = config.passing.perYard
    if (config.passing.perTd !== undefined) rules.pass_td = config.passing.perTd
    if (config.passing.perInt !== undefined) rules.pass_int = config.passing.perInt
    if (config.passing.per2pt !== undefined) rules.pass_2pt = config.passing.per2pt
    if (config.passing.perSack !== undefined) rules.pass_sack = config.passing.perSack
  }
  if (config.rushing) {
    if (config.rushing.perYard !== undefined) rules.rush_yd = config.rushing.perYard
    if (config.rushing.perTd !== undefined) rules.rush_td = config.rushing.perTd
    if (config.rushing.per2pt !== undefined) rules.rush_2pt = config.rushing.per2pt
  }
  if (config.receiving) {
    if (config.receiving.perYard !== undefined) rules.rec_yd = config.receiving.perYard
    if (config.receiving.perTd !== undefined) rules.rec_td = config.receiving.perTd
    if (config.receiving.perReception !== undefined) rules.rec = config.receiving.perReception
    if (config.receiving.per2pt !== undefined) rules.rec_2pt = config.receiving.per2pt
  }
  if (config.fumbles) {
    if (config.fumbles.perFumbleLost !== undefined) rules.fum_lost = config.fumbles.perFumbleLost
  }
  if (config.kicking) {
    if (config.kicking.perFgMade !== undefined) rules.fgm = config.kicking.perFgMade
    if (config.kicking.perFg40_49 !== undefined) rules.fgm_40_49 = config.kicking.perFg40_49
    if (config.kicking.perFg50Plus !== undefined) rules.fgm_50p = config.kicking.perFg50Plus
    if (config.kicking.perFgMissed !== undefined) rules.fgmiss = config.kicking.perFgMissed
    if (config.kicking.perXpMade !== undefined) rules.xpm = config.kicking.perXpMade
    if (config.kicking.perXpMissed !== undefined) rules.xpmiss = config.kicking.perXpMissed
  }
  if (config.defense) {
    if (config.defense.perSack !== undefined) rules.sack = config.defense.perSack
    if (config.defense.perInt !== undefined) rules.int = config.defense.perInt
    if (config.defense.perFumbleRecovery !== undefined) rules.def_fum_rec = config.defense.perFumbleRecovery
    if (config.defense.perTd !== undefined) rules.def_td = config.defense.perTd
    if (config.defense.perSafety !== undefined) rules.safe = config.defense.perSafety
    if (config.defense.perBlockedKick !== undefined) rules.blk_kick = config.defense.perBlockedKick
    if (config.defense.pointsAllowed) {
      const pa = config.defense.pointsAllowed
      if (pa['0'] !== undefined) rules.pts_allow_0 = pa['0']
      if (pa['1-6'] !== undefined) rules.pts_allow_1_6 = pa['1-6']
      if (pa['7-13'] !== undefined) rules.pts_allow_7_13 = pa['7-13']
      if (pa['14-20'] !== undefined) rules.pts_allow_14_20 = pa['14-20']
      if (pa['21-27'] !== undefined) rules.pts_allow_21_27 = pa['21-27']
      if (pa['28-34'] !== undefined) rules.pts_allow_28_34 = pa['28-34']
      if (pa['35+'] !== undefined) rules.pts_allow_35p = pa['35+']
    }
  }
  if (config.bonuses) {
    if (config.bonuses.passing300 !== undefined) rules.bonus_pass_yd_300 = config.bonuses.passing300
    if (config.bonuses.passing400 !== undefined) rules.bonus_pass_yd_400 = config.bonuses.passing400
    if (config.bonuses.rushing100 !== undefined) rules.bonus_rush_yd_100 = config.bonuses.rushing100
    if (config.bonuses.rushing200 !== undefined) rules.bonus_rush_yd_200 = config.bonuses.rushing200
    if (config.bonuses.receiving100 !== undefined) rules.bonus_rec_yd_100 = config.bonuses.receiving100
    if (config.bonuses.receiving200 !== undefined) rules.bonus_rec_yd_200 = config.bonuses.receiving200
  }

  return rules
}

/**
 * Calculate fantasy points for multiple player games at once
 */
function calculateBatch(playerGames, config) {
  return playerGames.map(pg => ({
    playerId: pg.playerId,
    gameId: pg.gameId,
    ...calculateFantasyPoints(pg, config),
  }))
}

/**
 * Get the flat rules map from a ScoringSystem record
 */
function resolveRules(scoringSystem) {
  if (!scoringSystem || !scoringSystem.rules) return STANDARD_RULES
  const rules = scoringSystem.rules

  // If rules has a preset field, start from that preset
  if (rules.preset && PRESETS[rules.preset]) {
    // Legacy format — config is nested with a preset key
    if (rules.passing || rules.rushing) {
      return convertLegacyConfig(rules)
    }
    return { ...PRESETS[rules.preset], ...rules }
  }

  // If rules has flat keys (pass_yd, rec, etc.), use directly
  if (rules.pass_yd !== undefined || rules.rec !== undefined) {
    return { ...STANDARD_RULES, ...rules }
  }

  // Legacy nested format
  if (rules.passing || rules.rushing) {
    return convertLegacyConfig(rules)
  }

  return STANDARD_RULES
}

/**
 * Get the scoring schema metadata (categories, labels, defaults)
 * Useful for building the frontend settings UI
 */
function getScoringSchema() {
  const categories = {}
  for (const [key, def] of Object.entries(NFL_SCORING_SCHEMA)) {
    if (!categories[def.category]) {
      categories[def.category] = []
    }
    categories[def.category].push({
      key,
      label: def.label,
      default: def.default,
    })
  }
  return { categories, allKeys: Object.keys(NFL_SCORING_SCHEMA) }
}

module.exports = {
  calculateFantasyPoints,
  calculateBatch,
  resolveRules,
  convertLegacyConfig,
  getScoringSchema,
  PRESETS,
  STANDARD_RULES,
  PPR_RULES,
  HALF_PPR_RULES,
  NFL_SCORING_SCHEMA,
}
