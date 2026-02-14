// settingsMapper.js — Maps platform-specific league settings → Clutch canonical format
// Used after import to auto-populate the League record with detected settings.
//
// Each mapper receives a season object from the platform's discoverLeague() response
// and returns: { format, draftType, maxTeams, settings: { ... } }

'use strict'

// ─── Sleeper ─────────────────────────────────────────────────────────────────

function mapSleeperSettings(season) {
  const s = season.settings || {}
  const scoring = season.scoringSettings || {}
  const positions = season.rosterPositions || []

  // Format: Sleeper type 0 = redraft, 1 = keeper, 2 = dynasty
  // All are typically H2H in Sleeper
  let format = 'HEAD_TO_HEAD'

  // Draft type
  let draftType = 'SNAKE'
  if (s.draft_rounds === 0 || s.type === 2) {
    // Dynasty leagues often use auction
    draftType = 'AUCTION'
  }

  // Scoring type: check the reception points value
  let scoringType = 'standard'
  if (scoring.rec === 1) scoringType = 'ppr'
  else if (scoring.rec === 0.5) scoringType = 'half_ppr'
  else if (scoring.rec > 0 && scoring.rec < 1) scoringType = 'half_ppr'

  // Waiver type: Sleeper waiver_type: 0 = normal/priority, 1 = FAAB, 2 = continual rolling
  let waiverType = 'rolling'
  if (s.waiver_type === 1) waiverType = 'faab'
  else if (s.waiver_type === 0) waiverType = 'rolling'
  else if (s.waiver_type === 2) waiverType = 'rolling'

  return {
    format,
    draftType,
    maxTeams: season.totalRosters || 10,
    settings: {
      scoringType,
      rosterSize: positions.length || 17,
      rosterPositions: positions,
      waiverType,
      faabBudget: s.waiver_budget || (waiverType === 'faab' ? 100 : null),
      playoffTeams: s.playoff_teams || null,
      tradeDeadline: s.trade_deadline ? true : false,
    },
  }
}

// ─── ESPN ────────────────────────────────────────────────────────────────────

function mapEspnSettings(season) {
  const s = season.settings || {}

  // Format: ESPN scoringType enum: 0=H2H Points, 1=H2H Category, 2=Total Points, 3=Roto
  let format = 'HEAD_TO_HEAD'
  if (s.scoringType === 3 || s.scoringType === 'roto') format = 'ROTO'
  else if (s.scoringType === 2 || s.scoringType === 'total_points') format = 'FULL_LEAGUE'

  // Draft type
  let draftType = 'SNAKE'
  const dt = (s.draftType || season.draftType || '').toString().toUpperCase()
  if (dt.includes('AUCTION')) draftType = 'AUCTION'

  // Scoring type: analyze scoringItems for reception points
  let scoringType = 'standard'
  if (Array.isArray(s.scoringItems)) {
    const recItem = s.scoringItems.find(i =>
      i.statId === 53 || i.statId === 'REC' || (i.label && i.label.toLowerCase().includes('recep'))
    )
    if (recItem) {
      const pts = recItem.pointsOverrides?.[53] ?? recItem.points ?? 0
      if (pts >= 1) scoringType = 'ppr'
      else if (pts >= 0.5) scoringType = 'half_ppr'
    }
  } else if (season.scoringType) {
    const st = season.scoringType.toUpperCase()
    if (st.includes('PPR') && !st.includes('HALF')) scoringType = 'ppr'
    else if (st.includes('HALF')) scoringType = 'half_ppr'
  }

  // Roster size from rosterSlots
  let rosterSize = 17
  if (s.rosterSlots && typeof s.rosterSlots === 'object') {
    rosterSize = Object.values(s.rosterSlots).reduce((sum, v) => sum + (parseInt(v) || 0), 0) || 17
  }

  // Waiver type
  let waiverType = 'rolling'
  if (s.acquisitionSettings) {
    const acq = s.acquisitionSettings
    if (acq.budgetAmount || acq.isUsingAcquisitionBudget) waiverType = 'faab'
  }

  return {
    format,
    draftType,
    maxTeams: season.teamCount || s.numTeams || 10,
    settings: {
      scoringType,
      rosterSize,
      waiverType,
      faabBudget: waiverType === 'faab' ? (s.acquisitionSettings?.budgetAmount || s.auctionBudget || 100) : null,
      playoffTeams: s.playoffTeamCount || null,
      tradeDeadline: s.tradeDeadline ? true : false,
      keeperCount: s.keeperCount || null,
    },
  }
}

// ─── Yahoo ───────────────────────────────────────────────────────────────────

function mapYahooSettings(season) {
  const s = season.settings || {}

  // Format
  let format = 'HEAD_TO_HEAD'
  const st = (s.scoringType || season.scoringType || '').toLowerCase()
  if (st.includes('roto')) format = 'ROTO'
  else if (st.includes('total') || st.includes('point')) format = 'FULL_LEAGUE'

  // Draft type
  let draftType = 'SNAKE'
  const dt = (s.draftType || season.draftType || '').toLowerCase()
  if (dt.includes('auction') || dt.includes('salary')) draftType = 'AUCTION'

  // Scoring type
  let scoringType = 'standard'
  const scType = (s.scoringType || season.scoringType || '').toLowerCase()
  if (scType.includes('ppr') && !scType.includes('half')) scoringType = 'ppr'
  else if (scType.includes('half')) scoringType = 'half_ppr'

  // Roster size
  const positions = s.rosterPositions || []
  const rosterSize = positions.length || 17

  // Waiver type
  let waiverType = 'rolling'
  if (s.usesFAAB) waiverType = 'faab'
  else if (s.waiverType && s.waiverType.toLowerCase().includes('faab')) waiverType = 'faab'

  return {
    format,
    draftType,
    maxTeams: season.teamCount || s.numTeams || 10,
    settings: {
      scoringType,
      rosterSize,
      rosterPositions: positions,
      waiverType,
      faabBudget: s.faabBalance || (waiverType === 'faab' ? 100 : null),
      playoffTeams: s.playoffStartWeek ? null : null, // Yahoo stores start week, not team count
      playoffStartWeek: s.playoffStartWeek || null,
      tradeDeadline: s.tradeEndDate ? true : false,
      tradeDeadlineDate: s.tradeEndDate || null,
    },
  }
}

// ─── MFL ─────────────────────────────────────────────────────────────────────

function mapMflSettings(season) {
  const s = season.settings || {}

  // Format — MFL doesn't have a clean format field, default H2H
  let format = 'HEAD_TO_HEAD'

  // Draft type
  let draftType = 'SNAKE'
  const dt = (s.draftType || '').toLowerCase()
  if (dt.includes('auction') || dt.includes('salary') || s.usesSalary) draftType = 'AUCTION'

  // Scoring type — MFL doesn't reliably expose this
  let scoringType = 'standard'

  // Roster size
  const rosterSize = s.rosterSize || season.rosterSize || 17

  return {
    format,
    draftType,
    maxTeams: season.teamCount || s.numTeams || 10,
    settings: {
      scoringType,
      rosterSize,
      waiverType: null, // MFL doesn't reliably expose this
      faabBudget: null,
      playoffTeams: s.playoffWeeks ? null : null, // MFL stores weeks, not teams
      tradeDeadline: s.tradeDeadline ? true : false,
      salaryCapAmount: s.salaryCapAmount || null,
      usesSalary: s.usesSalary || false,
      usesContractYear: s.usesContractYear || false,
    },
  }
}

// ─── Fantrax ─────────────────────────────────────────────────────────────────

function mapFantraxSettings(season) {
  // Fantrax is CSV-only — no settings available
  return {
    format: null,
    draftType: null,
    maxTeams: season.teamCount || 10,
    settings: {
      // Nothing detected from CSV
    },
  }
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

function mapSettingsForPlatform(platform, mostRecentSeason) {
  if (!mostRecentSeason) return { format: null, draftType: null, maxTeams: 10, settings: {} }

  switch (platform) {
    case 'sleeper': return mapSleeperSettings(mostRecentSeason)
    case 'espn':    return mapEspnSettings(mostRecentSeason)
    case 'yahoo':   return mapYahooSettings(mostRecentSeason)
    case 'mfl':     return mapMflSettings(mostRecentSeason)
    case 'fantrax': return mapFantraxSettings(mostRecentSeason)
    default:        return { format: null, draftType: null, maxTeams: 10, settings: {} }
  }
}

module.exports = {
  mapSleeperSettings,
  mapEspnSettings,
  mapYahooSettings,
  mapMflSettings,
  mapFantraxSettings,
  mapSettingsForPlatform,
}
