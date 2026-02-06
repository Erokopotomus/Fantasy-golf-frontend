import { useMemo } from 'react'

// League format definitions
export const LEAGUE_FORMATS = {
  'full-league': {
    id: 'full-league',
    name: 'Full League',
    description: 'Classic season-long format where everyone competes for total points',
    icon: 'trophy',
    hasDraft: true,
    features: ['Total points accumulation', 'Season-long standings', 'Segment bonuses'],
  },
  'head-to-head': {
    id: 'head-to-head',
    name: 'Head-to-Head',
    description: 'Weekly matchups against league opponents with playoffs',
    icon: 'swords',
    hasDraft: true,
    features: ['Weekly 1v1 matchups', 'Win/Loss record', 'Playoff bracket'],
  },
  'roto': {
    id: 'roto',
    name: 'Rotisserie',
    description: 'Compete across multiple statistical categories',
    icon: 'chart',
    hasDraft: true,
    features: ['Category rankings', 'Sum of category ranks', 'Balanced competition'],
  },
  'survivor': {
    id: 'survivor',
    name: 'Survivor',
    description: 'Last team standing - lowest scorer eliminated each week',
    icon: 'skull',
    hasDraft: true,
    features: ['Weekly eliminations', 'Buy-back option', 'High stakes'],
  },
  'one-and-done': {
    id: 'one-and-done',
    name: 'One & Done',
    description: 'Pick one player per tournament - can\'t reuse all season',
    icon: 'target',
    hasDraft: false,
    features: ['No draft required', 'Tier multipliers', 'Strategic player usage'],
  },
}

export const DRAFT_TYPES = {
  'snake': {
    id: 'snake',
    name: 'Snake Draft',
    description: 'Draft order reverses each round',
  },
  'auction': {
    id: 'auction',
    name: 'Auction Draft',
    description: 'Bid on players with a fixed budget',
  },
  'none': {
    id: 'none',
    name: 'No Draft',
    description: 'Pick players freely (for One & Done format)',
  },
}

// Default format settings
export const DEFAULT_FORMAT_SETTINGS = {
  'full-league': {
    segments: 4,
    pointsPerPosition: {
      1: 100,
      2: 75,
      3: 60,
      top5: 50,
      top10: 35,
      top20: 20,
      top30: 10,
      made_cut: 5,
    },
  },
  'head-to-head': {
    playoffTeams: 4,
    playoffFormat: 'single-elimination',
    regularSeasonWeeks: 12,
    tiebreakers: ['total-points', 'head-to-head'],
  },
  'roto': {
    categories: ['wins', 'top10s', 'cuts_made', 'birdies', 'eagles', 'scoring_avg'],
  },
  'survivor': {
    eliminationsPerWeek: 1,
    buyBacks: { allowed: true, max: 1 },
  },
  'one-and-done': {
    tiers: [
      { tier: 1, maxRank: 10, multiplier: 1.0 },
      { tier: 2, maxRank: 30, multiplier: 1.25 },
      { tier: 3, maxRank: 60, multiplier: 1.5 },
      { tier: 4, maxRank: null, multiplier: 2.0 },
    ],
    majorMultiplier: 1.5,
  },
}

// Available roto categories
export const ROTO_CATEGORIES = [
  { id: 'wins', name: 'Wins', description: 'Tournament wins' },
  { id: 'top5s', name: 'Top 5s', description: 'Top 5 finishes' },
  { id: 'top10s', name: 'Top 10s', description: 'Top 10 finishes' },
  { id: 'top25s', name: 'Top 25s', description: 'Top 25 finishes' },
  { id: 'cuts_made', name: 'Cuts Made', description: 'Made the cut' },
  { id: 'birdies', name: 'Total Birdies', description: 'Total birdies across all rounds' },
  { id: 'eagles', name: 'Total Eagles', description: 'Total eagles across all rounds' },
  { id: 'scoring_avg', name: 'Scoring Avg', description: 'Average score per round (lower is better)' },
  { id: 'sg_total', name: 'SG: Total', description: 'Strokes gained total' },
]

// Map backend enum values to frontend format keys
const FORMAT_ENUM_MAP = {
  'FULL_LEAGUE': 'full-league',
  'HEAD_TO_HEAD': 'head-to-head',
  'ROTO': 'roto',
  'SURVIVOR': 'survivor',
  'ONE_AND_DONE': 'one-and-done',
}

const DRAFT_ENUM_MAP = {
  'SNAKE': 'snake',
  'AUCTION': 'auction',
  'NONE': 'none',
}

function normalizeFormat(format) {
  return FORMAT_ENUM_MAP[format] || format
}

function normalizeDraftType(draftType) {
  return DRAFT_ENUM_MAP[draftType] || draftType
}

/**
 * Hook to get format information and utilities for a league
 */
export const useLeagueFormat = (league) => {
  const normalizedFormat = normalizeFormat(league?.format)
  const normalizedDraftType = normalizeDraftType(league?.draftType)

  const format = useMemo(() => {
    if (!league) return null
    return LEAGUE_FORMATS[normalizedFormat] || LEAGUE_FORMATS['full-league']
  }, [league, normalizedFormat])

  const draftType = useMemo(() => {
    if (!league) return null
    return DRAFT_TYPES[normalizedDraftType] || DRAFT_TYPES['snake']
  }, [league, normalizedDraftType])

  const formatSettings = useMemo(() => {
    if (!league) return null
    return {
      ...DEFAULT_FORMAT_SETTINGS[normalizedFormat],
      ...league.settings?.formatSettings,
    }
  }, [league, normalizedFormat])

  const hasDraft = useMemo(() => {
    return format?.hasDraft && normalizedDraftType !== 'none'
  }, [format, normalizedDraftType])

  const isHeadToHead = normalizedFormat === 'head-to-head'
  const isRoto = normalizedFormat === 'roto'
  const isSurvivor = normalizedFormat === 'survivor'
  const isOneAndDone = normalizedFormat === 'one-and-done'
  const isFullLeague = normalizedFormat === 'full-league'

  // Get the appropriate nav items based on format
  const formatNavItems = useMemo(() => {
    const items = []

    if (isHeadToHead) {
      items.push({ path: 'matchups', label: 'Matchups', icon: 'swords' })
    }

    if (isRoto) {
      items.push({ path: 'categories', label: 'Categories', icon: 'chart' })
    }

    if (isSurvivor) {
      items.push({ path: 'survivor', label: 'Survivor Board', icon: 'skull' })
    }

    if (isOneAndDone) {
      items.push({ path: 'picks', label: 'Pick Center', icon: 'target' })
    }

    return items
  }, [isHeadToHead, isRoto, isSurvivor, isOneAndDone])

  return {
    format,
    draftType,
    formatSettings,
    hasDraft,
    isHeadToHead,
    isRoto,
    isSurvivor,
    isOneAndDone,
    isFullLeague,
    formatNavItems,
  }
}

export default useLeagueFormat
