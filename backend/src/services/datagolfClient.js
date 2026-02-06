const axios = require('axios')

const BASE_URL = 'https://feeds.datagolf.com'

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
})

// Append API key to every request
client.interceptors.request.use((config) => {
  const key = process.env.DATAGOLF_API_KEY
  if (!key) throw new Error('DATAGOLF_API_KEY is not set')
  config.params = { ...config.params, key }
  return config
})

// Log and unwrap responses
client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err.response?.status
    const url = err.config?.url
    console.error(`[DataGolf] ${status || 'NETWORK'} error on ${url}:`, err.response?.data || err.message)
    throw err
  }
)

// --- Player & ranking endpoints ---

/** Get full player list with IDs and basic info */
function getPlayerList() {
  return client.get('/get-player-list')
}

/** Get tour schedule. tour: pga | euro | kft | liv | opp | alt */
function getSchedule(tour = 'pga') {
  return client.get('/get-schedule', { params: { tour } })
}

/** Get field updates for a tournament. tourEvent e.g. "2025 masters" or event_id */
function getFieldUpdates(tourEvent) {
  const params = {}
  if (tourEvent) params.tour_event = tourEvent
  return client.get('/field-updates', { params })
}

// --- Predictions endpoints ---

/** DataGolf rankings (their proprietary ranking) */
function getRankings() {
  return client.get('/preds/get-dg-rankings')
}

/** Skill ratings with SG breakdowns. display: value | rank */
function getSkillRatings(display = 'value') {
  return client.get('/preds/skill-ratings', { params: { display } })
}

/** Pre-tournament win/top-N probabilities */
function getPreTournamentPredictions(tourEvent, market = 'win') {
  const params = { market }
  if (tourEvent) params.tour_event = tourEvent
  return client.get('/preds/pre-tournament', { params })
}

/** Live in-play probabilities during a tournament */
function getLiveInPlay(tourEvent) {
  const params = {}
  if (tourEvent) params.tour_event = tourEvent
  return client.get('/preds/in-play', { params })
}

/** Live tournament stats (SG, strokes, etc.) */
function getLiveTournamentStats(tourEvent, stats = 'sg_putt,sg_arg,sg_app,sg_ott,sg_t2g,sg_total') {
  const params = { stats }
  if (tourEvent) params.tour_event = tourEvent
  return client.get('/preds/live-tournament-stats', { params })
}

/** Player decompositions (expected SG by course fit) */
function getPlayerDecompositions(tourEvent) {
  const params = {}
  if (tourEvent) params.tour_event = tourEvent
  return client.get('/preds/player-decompositions', { params })
}

/** DFS fantasy projections. site: draftkings | fanduel | yahoo */
function getFantasyProjections(tourEvent, site = 'draftkings') {
  const params = { site }
  if (tourEvent) params.tour_event = tourEvent
  return client.get('/preds/fantasy-projection-defaults', { params })
}

// --- Betting tools ---

/** Outright odds. market: win | top_5 | top_10 | top_20 | make_cut etc. */
function getOutrightOdds(tourEvent, market = 'win', sportsbook) {
  const params = { market }
  if (tourEvent) params.tour_event = tourEvent
  if (sportsbook) params.sportsbook = sportsbook
  return client.get('/betting-tools/outrights', { params })
}

// --- Historical data ---

/** Historical round-level data */
function getHistoricalRounds(tour = 'pga', eventId, year) {
  const params = { tour }
  if (eventId) params.event_id = eventId
  if (year) params.year = year
  return client.get('/historical-raw-data/rounds', { params })
}

module.exports = {
  getPlayerList,
  getSchedule,
  getFieldUpdates,
  getRankings,
  getSkillRatings,
  getPreTournamentPredictions,
  getLiveInPlay,
  getLiveTournamentStats,
  getPlayerDecompositions,
  getFantasyProjections,
  getOutrightOdds,
  getHistoricalRounds,
}
