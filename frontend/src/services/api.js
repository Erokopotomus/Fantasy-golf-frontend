// Real API service for Clutch backend

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

class ApiService {
  constructor() {
    this.baseUrl = API_URL
    this.token = localStorage.getItem('clutch_token')
  }

  setToken(token) {
    this.token = token
    if (token) {
      localStorage.setItem('clutch_token', token)
    } else {
      localStorage.removeItem('clutch_token')
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`

    // Always get fresh token from localStorage
    const token = localStorage.getItem('clutch_token')

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
      cache: 'no-store',
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || 'Request failed')
    }

    return data
  }

  // Auth
  async signup(name, username, email, password) {
    const data = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, username, email, password }),
    })
    this.setToken(data.token)
    return data
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    this.setToken(data.token)
    return data
  }

  async getMe() {
    return this.request('/auth/me')
  }

  logout() {
    this.setToken(null)
  }

  // Users
  async getProfile() {
    return this.request('/users/me')
  }

  async updateProfile(data) {
    return this.request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async getPublicProfile(username) {
    return this.request(`/users/by-username/${encodeURIComponent(username)}`)
  }

  // Leagues
  async getLeagues() {
    return this.request('/leagues')
  }

  async getLeague(id) {
    return this.request(`/leagues/${id}`)
  }

  async createLeague(data) {
    return this.request('/leagues', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateLeague(id, data) {
    return this.request(`/leagues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteLeague(id) {
    return this.request(`/leagues/${id}`, {
      method: 'DELETE',
    })
  }

  async joinLeague(id, inviteCode) {
    return this.request(`/leagues/${id}/join`, {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    })
  }

  async joinLeagueByCode(inviteCode) {
    return this.request('/leagues/join-by-code', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    })
  }

  async getLeagueMessages(leagueId, options = {}) {
    const params = new URLSearchParams(options).toString()
    return this.request(`/leagues/${leagueId}/messages${params ? '?' + params : ''}`)
  }

  async sendMessage(leagueId, content) {
    return this.request(`/leagues/${leagueId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    })
  }

  // Players
  async getPlayers(options = {}) {
    const params = new URLSearchParams(options).toString()
    return this.request(`/players${params ? '?' + params : ''}`)
  }

  async getPlayer(id) {
    return this.request(`/players/${id}`)
  }

  async getPlayerStats(id) {
    return this.request(`/players/${id}/stats`)
  }

  async getPlayerProfile(id) {
    return this.request(`/players/${id}`)
  }

  // Teams
  async getTeam(id) {
    return this.request(`/teams/${id}`)
  }

  async updateTeam(id, data) {
    return this.request(`/teams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async addPlayerToRoster(teamId, playerId) {
    return this.request(`/teams/${teamId}/roster/add`, {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    })
  }

  async dropPlayerFromRoster(teamId, playerId) {
    return this.request(`/teams/${teamId}/roster/drop`, {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    })
  }

  async updateRosterPosition(teamId, playerId, position) {
    return this.request(`/teams/${teamId}/roster/${playerId}`, {
      method: 'PATCH',
      body: JSON.stringify({ position }),
    })
  }

  async saveLineup(teamId, activePlayerIds, irPlayerIds = []) {
    return this.request(`/teams/${teamId}/lineup`, {
      method: 'POST',
      body: JSON.stringify({ activePlayerIds, irPlayerIds }),
    })
  }

  async getAvailablePlayers(leagueId, options = {}) {
    const params = new URLSearchParams(options).toString()
    return this.request(`/leagues/${leagueId}/available-players${params ? '?' + params : ''}`)
  }

  async getNflAvailablePlayers(leagueId, options = {}) {
    const params = new URLSearchParams(options).toString()
    return this.request(`/nfl/leagues/${leagueId}/available-players${params ? '?' + params : ''}`)
  }

  async getNflWeeklyScores(leagueId, weekNumber) {
    return this.request(`/nfl/leagues/${leagueId}/weekly-scores/${weekNumber}`)
  }

  // Prove It — NFL Props & Picks
  async getNflProps(season, week) {
    return this.request(`/nfl/props/${season}/${week}`)
  }

  async submitNflPick(propId, direction, reasonChip) {
    return this.request(`/nfl/props/${propId}/pick`, {
      method: 'POST',
      body: JSON.stringify({ direction, reasonChip }),
    })
  }

  async getNflPickRecord() {
    return this.request('/nfl/picks/record')
  }

  async getNflPicksLeaderboard(limit = 25) {
    return this.request(`/nfl/picks/leaderboard?limit=${limit}`)
  }

  // Week in Review
  async getNflWeekReview(leagueId, week) {
    return this.request(`/nfl/leagues/${leagueId}/week-review/${week}`)
  }

  // Drafts
  async getDraft(id) {
    return this.request(`/drafts/${id}`)
  }

  async getDraftByLeague(leagueId) {
    return this.request(`/drafts/league/${leagueId}`)
  }

  async createDraft(leagueId, { scheduledFor } = {}) {
    return this.request(`/leagues/${leagueId}/draft`, {
      method: 'POST',
      body: JSON.stringify({ scheduledFor }),
    })
  }

  async scheduleDraft(draftId, scheduledFor) {
    return this.request(`/drafts/${draftId}/schedule`, {
      method: 'PATCH',
      body: JSON.stringify({ scheduledFor }),
    })
  }

  async startDraft(id) {
    return this.request(`/drafts/${id}/start`, {
      method: 'POST',
    })
  }

  async makeDraftPick(draftId, playerId, amount) {
    return this.request(`/drafts/${draftId}/pick`, {
      method: 'POST',
      body: JSON.stringify({ playerId, amount }),
    })
  }

  async getDraftPlayers(draftId, options = {}) {
    const params = new URLSearchParams(options).toString()
    return this.request(`/drafts/${draftId}/players${params ? '?' + params : ''}`)
  }

  async pauseDraft(draftId) {
    return this.request(`/drafts/${draftId}/pause`, {
      method: 'POST',
    })
  }

  async resumeDraft(draftId) {
    return this.request(`/drafts/${draftId}/resume`, {
      method: 'POST',
    })
  }

  async nominatePlayer(draftId, playerId, startingBid) {
    return this.request(`/drafts/${draftId}/nominate`, {
      method: 'POST',
      body: JSON.stringify({ playerId, startingBid }),
    })
  }

  async placeBid(draftId, amount) {
    return this.request(`/drafts/${draftId}/bid`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    })
  }

  // Trades
  async getTrades(options = {}) {
    const params = new URLSearchParams(options).toString()
    return this.request(`/trades${params ? '?' + params : ''}`)
  }

  async proposeTrade(data) {
    return this.request('/trades', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async acceptTrade(id) {
    return this.request(`/trades/${id}/accept`, {
      method: 'POST',
    })
  }

  async rejectTrade(id) {
    return this.request(`/trades/${id}/reject`, {
      method: 'POST',
    })
  }

  async cancelTrade(id) {
    return this.request(`/trades/${id}/cancel`, {
      method: 'POST',
    })
  }

  // Activity
  async getLeagueActivity(leagueId, limit = 20) {
    return this.request(`/leagues/${leagueId}/activity?limit=${limit}`)
  }

  // Commissioner - Matchup Management
  async generateMatchups(leagueId) {
    return this.request(`/leagues/${leagueId}/matchups/generate`, { method: 'POST' })
  }

  async updateMatchup(leagueId, matchupId, data) {
    return this.request(`/leagues/${leagueId}/matchups/${matchupId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async resetMatchups(leagueId) {
    return this.request(`/leagues/${leagueId}/matchups`, { method: 'DELETE' })
  }

  async generatePlayoffs(leagueId) {
    return this.request(`/leagues/${leagueId}/playoffs/generate`, { method: 'POST' })
  }

  async submitCustomPlayoffMatchups(leagueId, matchups) {
    return this.request(`/leagues/${leagueId}/playoffs/custom`, {
      method: 'POST',
      body: JSON.stringify({ matchups }),
    })
  }

  async getSeasonRecap(leagueId) {
    return this.request(`/leagues/${leagueId}/recap`)
  }

  // Courses
  async getCourses(options = {}) {
    const params = new URLSearchParams(options).toString()
    return this.request(`/courses${params ? '?' + params : ''}`)
  }

  async getCourse(id) {
    return this.request(`/courses/${id}`)
  }

  // Tournaments
  async getTournaments(options = {}) {
    const params = new URLSearchParams(options).toString()
    return this.request(`/tournaments${params ? '?' + params : ''}`)
  }

  async getCurrentTournament() {
    return this.request('/tournaments/current')
  }

  async getTournament(id) {
    return this.request(`/tournaments/${id}`)
  }

  async getUpcomingTournamentsWithFields() {
    return this.request('/tournaments/upcoming-with-fields')
  }

  async getPlayerSchedule(playerId) {
    return this.request(`/players/${playerId}/schedule`)
  }

  async getTournamentLeaderboard(id, options = {}) {
    const params = new URLSearchParams(options).toString()
    return this.request(`/tournaments/${id}/leaderboard${params ? '?' + params : ''}`)
  }

  async getPlayerScorecard(tournamentId, playerId) {
    return this.request(`/tournaments/${tournamentId}/scorecards/${playerId}`)
  }

  async getTournamentWeather(tournamentId) {
    return this.request(`/tournaments/${tournamentId}/weather`)
  }

  // Matchups
  async getLeagueMatchups(leagueId) {
    return this.request(`/leagues/${leagueId}/matchups`)
  }

  // Standings & Scoring
  async getLeagueStandings(leagueId) {
    return this.request(`/leagues/${leagueId}/standings`)
  }

  async getLeagueScoring(leagueId, tournamentId) {
    return this.request(`/leagues/${leagueId}/scoring/${tournamentId}`)
  }

  async getLeagueLiveScoring(leagueId, tournamentId = null) {
    const params = tournamentId ? `?tournamentId=${tournamentId}` : ''
    return this.request(`/leagues/${leagueId}/live-scoring${params}`)
  }

  // Notifications
  async getNotifications(options = {}) {
    const params = new URLSearchParams(options).toString()
    return this.request(`/notifications${params ? '?' + params : ''}`)
  }

  async markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, { method: 'PATCH' })
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/read-all', { method: 'PATCH' })
  }

  async deleteNotification(id) {
    return this.request(`/notifications/${id}`, { method: 'DELETE' })
  }

  // Push Tokens
  async registerPushToken(data) {
    return this.request('/notifications/tokens', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async unregisterPushToken(tokenId) {
    return this.request(`/notifications/tokens/${tokenId}`, { method: 'DELETE' })
  }

  async getPushTokens() {
    return this.request('/notifications/tokens')
  }

  // Notification Preferences
  async getNotificationPreferences() {
    return this.request('/notifications/preferences')
  }

  async updateNotificationPreferences(updates) {
    return this.request('/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  }

  // AI Coaching Preferences
  async getAiPreferences() {
    return this.request('/ai/preferences')
  }

  async updateAiPreferences(updates) {
    return this.request('/ai/preferences', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  }

  // Search
  async search(query, options = {}) {
    const params = new URLSearchParams({ q: query, ...options }).toString()
    return this.request(`/search?${params}`)
  }

  // Manager Analytics
  async getManagerProfile(userId) {
    return this.request(`/managers/${userId}/profile`)
  }

  async getManagerAchievements(userId) {
    return this.request(`/managers/${userId}/achievements`)
  }

  async getClutchRating(userId) {
    return this.request(`/managers/${userId}/clutch-rating`)
  }

  async getWeightedConsensus(eventId, playerId, type = 'player_benchmark') {
    const params = new URLSearchParams({ eventId, playerId, type }).toString()
    return this.request(`/predictions/consensus-weighted?${params}`)
  }

  // Waivers
  async submitWaiverClaim(leagueId, { playerId, bidAmount, dropPlayerId, priority }) {
    return this.request(`/leagues/${leagueId}/waivers/claim`, {
      method: 'POST',
      body: JSON.stringify({ playerId, bidAmount, dropPlayerId, priority }),
    })
  }

  async getWaiverClaims(leagueId) {
    return this.request(`/leagues/${leagueId}/waivers/claims`)
  }

  async updateWaiverClaim(leagueId, claimId, data) {
    return this.request(`/leagues/${leagueId}/waivers/claims/${claimId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async cancelWaiverClaim(leagueId, claimId) {
    return this.request(`/leagues/${leagueId}/waivers/claims/${claimId}`, {
      method: 'DELETE',
    })
  }

  async getWaiverHistory(leagueId, limit = 50) {
    return this.request(`/leagues/${leagueId}/waivers/history?limit=${limit}`)
  }

  // Draft History
  async getLeagueDraftHistory() {
    return this.request('/draft-history/leagues')
  }

  async getDraftRecap(draftId) {
    return this.request(`/draft-history/drafts/${draftId}`)
  }

  async getDraftGrades(draftId) {
    return this.request(`/draft-history/drafts/${draftId}/grades`)
  }

  async getMockDraftHistory(page = 1) {
    return this.request(`/draft-history/mock-drafts?page=${page}`)
  }

  async getMockDraftRecap(id) {
    return this.request(`/draft-history/mock-drafts/${id}`)
  }

  async saveMockDraft(data) {
    return this.request('/draft-history/mock-drafts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteMockDraft(id) {
    return this.request(`/draft-history/mock-drafts/${id}`, {
      method: 'DELETE',
    })
  }

  async getBoardComparison(mockDraftId) {
    return this.request(`/draft-history/board-comparison/${mockDraftId}`)
  }

  async getLatestBoardComparison() {
    return this.request('/draft-history/board-comparison-latest')
  }

  // Predictions
  async submitPrediction(data) {
    return this.request('/predictions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updatePrediction(id, data) {
    return this.request(`/predictions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deletePrediction(id) {
    return this.request(`/predictions/${id}`, { method: 'DELETE' })
  }

  async getMyPredictions(options = {}) {
    const params = new URLSearchParams(options).toString()
    return this.request(`/predictions/me${params ? '?' + params : ''}`)
  }

  async getMyReputation() {
    return this.request('/predictions/reputation')
  }

  async getUserReputation(userId) {
    return this.request(`/predictions/reputation/${userId}`)
  }

  async getPredictionLeaderboard(options = {}) {
    const params = new URLSearchParams(options).toString()
    return this.request(`/predictions/leaderboard${params ? '?' + params : ''}`)
  }

  async getPredictionConsensus(eventId, playerId, type = 'player_benchmark') {
    const params = new URLSearchParams({ eventId, playerId, type }).toString()
    return this.request(`/predictions/consensus?${params}`)
  }

  async getEventSlate(eventId, options = {}) {
    const params = new URLSearchParams(options).toString()
    return this.request(`/predictions/slate/${eventId}${params ? '?' + params : ''}`)
  }

  async getEventPredictions(eventId, options = {}) {
    const params = new URLSearchParams(options).toString()
    return this.request(`/predictions/event/${eventId}${params ? '?' + params : ''}`)
  }

  // Imports (League History / Migration)
  async discoverSleeperLeague(leagueId) {
    return this.request('/imports/sleeper/discover', {
      method: 'POST',
      body: JSON.stringify({ leagueId }),
    })
  }

  async importSleeperLeague(leagueId) {
    return this.request('/imports/sleeper/import', {
      method: 'POST',
      body: JSON.stringify({ leagueId }),
    })
  }

  async getImports() {
    return this.request('/imports')
  }

  async getImportStatus(id) {
    return this.request(`/imports/${id}`)
  }

  async getLeagueHistory(leagueId) {
    return this.request(`/imports/history/${leagueId}`)
  }

  async deleteImport(id) {
    return this.request(`/imports/${id}`, { method: 'DELETE' })
  }

  // ESPN Import
  async discoverESPNLeague(leagueId, espn_s2 = '', swid = '') {
    return this.request('/imports/espn/discover', {
      method: 'POST',
      body: JSON.stringify({ leagueId, espn_s2, swid }),
    })
  }

  async importESPNLeague(leagueId, espn_s2 = '', swid = '') {
    return this.request('/imports/espn/import', {
      method: 'POST',
      body: JSON.stringify({ leagueId, espn_s2, swid }),
    })
  }

  // Yahoo Import
  async discoverYahooLeague(leagueId, accessToken) {
    return this.request('/imports/yahoo/discover', {
      method: 'POST',
      body: JSON.stringify({ leagueId, accessToken }),
    })
  }

  async importYahooLeague(leagueId, accessToken) {
    return this.request('/imports/yahoo/import', {
      method: 'POST',
      body: JSON.stringify({ leagueId, accessToken }),
    })
  }

  // Fantrax Import (CSV)
  async discoverFantraxLeague({ standingsCSV, draftCSV, seasonYear, leagueName }) {
    return this.request('/imports/fantrax/discover', {
      method: 'POST',
      body: JSON.stringify({ standingsCSV, draftCSV, seasonYear, leagueName }),
    })
  }

  async importFantraxLeague({ standingsCSV, draftCSV, seasonYear, leagueName }) {
    return this.request('/imports/fantrax/import', {
      method: 'POST',
      body: JSON.stringify({ standingsCSV, draftCSV, seasonYear, leagueName }),
    })
  }

  // MFL Import
  async discoverMFLLeague(leagueId, apiKey) {
    return this.request('/imports/mfl/discover', {
      method: 'POST',
      body: JSON.stringify({ leagueId, apiKey }),
    })
  }

  async importMFLLeague(leagueId, apiKey) {
    return this.request('/imports/mfl/import', {
      method: 'POST',
      body: JSON.stringify({ leagueId, apiKey }),
    })
  }

  // Sync (admin)
  async getSyncStatus(adminSecret) {
    return this.request('/sync/status', {
      headers: { 'X-Sync-Secret': adminSecret },
    })
  }

  // Admin
  async getAdminStats() {
    return this.request('/admin/stats')
  }

  async getAdminUsers(params = {}) {
    const filtered = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined))
    const qs = new URLSearchParams(filtered).toString()
    return this.request(`/admin/users${qs ? '?' + qs : ''}`)
  }

  async getAdminLeagues(params = {}) {
    const filtered = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined))
    const qs = new URLSearchParams(filtered).toString()
    return this.request(`/admin/leagues${qs ? '?' + qs : ''}`)
  }

  async getAdminTournaments(params = {}) {
    const filtered = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined))
    const qs = new URLSearchParams(filtered).toString()
    return this.request(`/admin/tournaments${qs ? '?' + qs : ''}`)
  }

  async updateUserRole(userId, role) {
    return this.request(`/admin/users/${userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    })
  }

  // Admin AI Engine Config
  async getAiConfig() {
    return this.request('/admin/ai-config')
  }

  async updateAiConfig(updates) {
    return this.request('/admin/ai-config', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  }

  async getAiSpend() {
    return this.request('/admin/ai-spend')
  }

  // Draft - Undo Pick
  async undoDraftPick(draftId) {
    return this.request(`/drafts/${draftId}/undo-pick`, {
      method: 'POST',
    })
  }

  // League - Current Week
  async getCurrentWeek(leagueId) {
    return this.request(`/leagues/${leagueId}/current-week`)
  }

  async triggerSync(type, dgId, adminSecret) {
    const paths = {
      players: '/sync/players',
      schedule: '/sync/schedule',
      field: `/sync/tournament/${dgId}/field`,
      live: `/sync/tournament/${dgId}/live`,
      predictions: `/sync/tournament/${dgId}/predictions`,
      projections: `/sync/tournament/${dgId}/projections`,
      finalize: `/sync/tournament/${dgId}/finalize`,
    }
    return this.request(paths[type], {
      method: 'POST',
      headers: { 'X-Sync-Secret': adminSecret },
    })
  }
  // ─── Feed ─────────────────────────────────────────────────────────────────

  async getFeed(sport = 'all', options = {}) {
    const params = new URLSearchParams()
    if (options.limit) params.set('limit', options.limit)
    if (options.offset) params.set('offset', options.offset)
    if (options.types) params.set('types', options.types)
    if (options.season) params.set('season', options.season)
    const qs = params.toString()
    return this.request(`/feed/${sport}${qs ? '?' + qs : ''}`)
  }

  // ─── News ─────────────────────────────────────────────────────────────────

  async getNews(options = {}) {
    const params = new URLSearchParams()
    if (options.sport) params.set('sport', options.sport)
    if (options.limit) params.set('limit', options.limit)
    if (options.offset) params.set('offset', options.offset)
    if (options.category) params.set('category', options.category)
    const qs = params.toString()
    return this.request(`/news${qs ? '?' + qs : ''}`)
  }

  async getTeamNews(abbr, options = {}) {
    const params = new URLSearchParams()
    if (options.limit) params.set('limit', options.limit)
    if (options.offset) params.set('offset', options.offset)
    const qs = params.toString()
    return this.request(`/news/team/${encodeURIComponent(abbr)}${qs ? '?' + qs : ''}`)
  }

  async getPlayerNews(playerId, options = {}) {
    const params = new URLSearchParams()
    if (options.limit) params.set('limit', options.limit)
    if (options.offset) params.set('offset', options.offset)
    const qs = params.toString()
    return this.request(`/news/player/${encodeURIComponent(playerId)}${qs ? '?' + qs : ''}`)
  }

  // ─── NFL ──────────────────────────────────────────────────────────────────

  async getNflPlayers(options = {}) {
    const params = new URLSearchParams()
    if (options.search) params.set('search', options.search)
    if (options.position) params.set('position', options.position)
    if (options.team) params.set('team', options.team)
    if (options.season) params.set('season', options.season)
    if (options.limit) params.set('limit', options.limit)
    if (options.offset) params.set('offset', options.offset)
    if (options.sortBy) params.set('sortBy', options.sortBy)
    if (options.sortOrder) params.set('sortOrder', options.sortOrder)
    if (options.scoring) params.set('scoring', options.scoring)
    if (options.available) params.set('available', options.available)
    if (options.leagueId) params.set('leagueId', options.leagueId)
    const qs = params.toString()
    return this.request(`/nfl/players${qs ? '?' + qs : ''}`)
  }

  async getNflSeasons() {
    return this.request('/nfl/seasons')
  }

  async getNflPlayer(id, { season } = {}) {
    const params = new URLSearchParams()
    if (season) params.set('season', season)
    const qs = params.toString()
    return this.request(`/nfl/players/${id}${qs ? '?' + qs : ''}`)
  }

  async getNflPlayerProfile(id) {
    return this.request(`/nfl/players/${id}/profile`)
  }

  async getNflTeams() {
    return this.request('/nfl/teams')
  }

  async getNflTeam(abbr) {
    return this.request(`/nfl/teams/${abbr}`)
  }

  async getNflTeamStats(abbr, { season } = {}) {
    const params = new URLSearchParams()
    if (season) params.set('season', season)
    const qs = params.toString()
    return this.request(`/nfl/teams/${abbr}/stats${qs ? '?' + qs : ''}`)
  }

  async getNflLeaderboards(options = {}) {
    const params = new URLSearchParams()
    if (options.stat) params.set('stat', options.stat)
    if (options.season) params.set('season', options.season)
    if (options.position) params.set('position', options.position)
    if (options.team) params.set('team', options.team)
    if (options.limit) params.set('limit', options.limit)
    if (options.offset) params.set('offset', options.offset)
    const qs = params.toString()
    return this.request(`/nfl/leaderboards${qs ? '?' + qs : ''}`)
  }

  async getNflSchedule(options = {}) {
    const params = new URLSearchParams()
    if (options.season) params.set('season', options.season)
    if (options.week) params.set('week', options.week)
    const qs = params.toString()
    return this.request(`/nfl/schedule${qs ? '?' + qs : ''}`)
  }

  async getNflScoringSystems() {
    return this.request('/nfl/scoring-systems')
  }

  async getNflScoringSchema(leagueId) {
    return this.request(`/leagues/${leagueId}/scoring-schema`)
  }

  async updateNflScoring(leagueId, data) {
    return this.request(`/leagues/${leagueId}/scoring`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  // Keepers
  async designateKeeper(teamId, playerId) {
    return this.request(`/teams/${teamId}/keeper/designate`, {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    })
  }

  async undesignateKeeper(teamId, playerId) {
    return this.request(`/teams/${teamId}/keeper/undesignate`, {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    })
  }

  async getKeepers(teamId) {
    return this.request(`/teams/${teamId}/keepers`)
  }

  // Trade Veto Voting
  async castTradeVote(tradeId, vote) {
    return this.request(`/trades/${tradeId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ vote }),
    })
  }

  async getTradeVotes(tradeId) {
    return this.request(`/trades/${tradeId}/votes`)
  }

  // Draft Dollars
  async getDraftDollarBalances(leagueId) {
    return this.request(`/leagues/${leagueId}/draft-dollars`)
  }

  async getDraftDollarLedger(leagueId, params = {}) {
    const qs = new URLSearchParams(params).toString()
    return this.request(`/leagues/${leagueId}/draft-dollars/ledger${qs ? '?' + qs : ''}`)
  }

  async recordDraftDollarTransaction(leagueId, data) {
    return this.request(`/leagues/${leagueId}/draft-dollars/transaction`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async adjustDraftDollarBalance(leagueId, data) {
    return this.request(`/leagues/${leagueId}/draft-dollars/adjust`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ─── Workspace: Draft Boards ──────────────────────────────────────────────

  async getDraftBoards() {
    return this.request('/draft-boards')
  }

  async createDraftBoard(data) {
    return this.request('/draft-boards', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getDraftBoard(id) {
    return this.request(`/draft-boards/${id}`)
  }

  async updateDraftBoard(id, data) {
    return this.request(`/draft-boards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteDraftBoard(id) {
    return this.request(`/draft-boards/${id}`, { method: 'DELETE' })
  }

  async saveDraftBoardEntries(id, entries) {
    return this.request(`/draft-boards/${id}/entries`, {
      method: 'PUT',
      body: JSON.stringify({ entries }),
    })
  }

  async addDraftBoardEntry(id, playerId) {
    return this.request(`/draft-boards/${id}/entries`, {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    })
  }

  async removeDraftBoardEntry(id, playerId) {
    return this.request(`/draft-boards/${id}/entries/${playerId}`, { method: 'DELETE' })
  }

  async updateDraftBoardEntryNotes(id, playerId, notes) {
    return this.request(`/draft-boards/${id}/entries/${playerId}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    })
  }

  // ─── Workspace: Board Activities ─────────────────────────────────────────

  async logBoardActivity(boardId, data) {
    return this.request(`/draft-boards/${boardId}/activities`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getBoardActivities(boardId) {
    return this.request(`/draft-boards/${boardId}/activities`)
  }

  async getDecisionJournal({ sport, limit } = {}) {
    const params = new URLSearchParams()
    if (sport) params.set('sport', sport)
    if (limit) params.set('limit', limit)
    const qs = params.toString()
    return this.request(`/draft-boards/journal/all${qs ? '?' + qs : ''}`)
  }

  // ─── Workspace: Watch List ─────────────────────────────────────────────

  async getWatchList(sport) {
    const qs = sport ? `?sport=${sport}` : ''
    return this.request(`/watch-list${qs}`)
  }

  async getWatchListIds() {
    return this.request('/watch-list/ids')
  }

  async addToWatchList(playerId, sport, note) {
    return this.request('/watch-list', {
      method: 'POST',
      body: JSON.stringify({ playerId, sport, note }),
    })
  }

  async removeFromWatchList(playerId) {
    return this.request(`/watch-list/${playerId}`, { method: 'DELETE' })
  }

  async updateWatchListNote(playerId, note) {
    return this.request(`/watch-list/${playerId}/note`, {
      method: 'PATCH',
      body: JSON.stringify({ note }),
    })
  }

  // ─── Workspace: Clutch Rankings / Projections ────────────────────────────

  async getClutchRankings(sport, format, { season = 2026, limit = 300 } = {}) {
    return this.request(`/projections/${sport}/${format}?season=${season}&limit=${limit}`)
  }

  async triggerProjectionSync(season = 2026) {
    return this.request('/projections/sync', {
      method: 'POST',
      body: JSON.stringify({ season }),
    })
  }

  // ─── Workspace: Journal ─────────────────────────────────────────────

  async createJournalEntry(data) {
    return this.request('/draft-boards/journal/entry', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ─── The Lab: Captures ───────────────────────────────────────────────

  async createCapture(data) {
    return this.request('/lab/captures', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getCaptures(params = {}) {
    const qs = new URLSearchParams()
    if (params.sport) qs.set('sport', params.sport)
    if (params.sentiment) qs.set('sentiment', params.sentiment)
    if (params.search) qs.set('search', params.search)
    if (params.limit) qs.set('limit', params.limit)
    if (params.offset) qs.set('offset', params.offset)
    const str = qs.toString()
    return this.request(`/lab/captures${str ? '?' + str : ''}`)
  }

  async getRecentCaptures(limit = 5) {
    return this.request(`/lab/captures/recent?limit=${limit}`)
  }

  async deleteCapture(id) {
    return this.request(`/lab/captures/${id}`, { method: 'DELETE' })
  }

  async getPlayerCaptures(playerId, limit = 10) {
    return this.request(`/lab/captures/player/${encodeURIComponent(playerId)}?limit=${limit}`)
  }

  async getPlayerTimeline(playerId) {
    return this.request(`/lab/captures/timeline/${encodeURIComponent(playerId)}`)
  }

  // ─── The Lab: Insights ─────────────────────────────────────────────────

  async getLabInsight() {
    return this.request('/lab/insight')
  }

  async dismissLabInsight() {
    return this.request('/lab/insight/dismiss', { method: 'POST' })
  }

  async getBoardReadiness(boardId) {
    return this.request(`/lab/readiness/${boardId}`)
  }

  // ─── The Lab: Cheat Sheets ─────────────────────────────────────────────

  async generateCheatSheet(boardId) {
    return this.request('/lab/cheatsheet/generate', {
      method: 'POST',
      body: JSON.stringify({ boardId }),
    })
  }

  async getCheatSheet(id) {
    return this.request(`/lab/cheatsheet/${id}`)
  }

  async getCheatSheetByBoard(boardId) {
    return this.request(`/lab/cheatsheet/board/${boardId}`)
  }

  async updateCheatSheet(id, data) {
    return this.request(`/lab/cheatsheet/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async publishCheatSheet(id) {
    return this.request(`/lab/cheatsheet/${id}/publish`, { method: 'POST' })
  }

  // ─── The Lab: Timeline ─────────────────────────────────────────────────

  async getBoardTimeline(boardId) {
    return this.request(`/draft-boards/${boardId}/timeline`)
  }

  // Phase 5: Compare + Pinned Badges
  async comparePredictions(targetUserId, options = {}) {
    const params = new URLSearchParams(options).toString()
    return this.request(`/predictions/compare/${encodeURIComponent(targetUserId)}${params ? '?' + params : ''}`)
  }

  async updatePinnedBadges(pinnedBadges) {
    return this.request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ pinnedBadges }),
    })
  }

  // ── AI Engine (Phase 6C-6F) ──

  // Insights (Mode 1)
  async getAiInsights(sport) {
    const params = sport ? `?sport=${sport}` : ''
    return this.request(`/ai/insights${params}`)
  }

  async dismissAiInsight(insightId) {
    return this.request(`/ai/insights/${insightId}/dismiss`, { method: 'POST' })
  }

  async markAiInsightActed(insightId) {
    return this.request(`/ai/insights/${insightId}/acted`, { method: 'POST' })
  }

  // Contextual Coaching (Mode 2)
  async getDraftNudge(draftState) {
    return this.request('/ai/draft-nudge', { method: 'POST', body: JSON.stringify(draftState) })
  }

  async getBoardCoach(boardId, triggerAction, context) {
    return this.request('/ai/board-coach', { method: 'POST', body: JSON.stringify({ boardId, triggerAction, context }) })
  }

  async getPredictionContext(predictionData) {
    return this.request('/ai/prediction-context', { method: 'POST', body: JSON.stringify(predictionData) })
  }

  async getPredictionResolution(predictionData) {
    return this.request('/ai/prediction-resolution', { method: 'POST', body: JSON.stringify(predictionData) })
  }

  // Deep Reports (Mode 3)
  async generatePreDraftReport(sport) {
    return this.request('/ai/report/pre-draft', { method: 'POST', body: JSON.stringify({ sport }) })
  }

  async generateMidSeasonReport(sport, season) {
    return this.request('/ai/report/mid-season', { method: 'POST', body: JSON.stringify({ sport, season }) })
  }

  async generatePostSeasonReport(sport, season) {
    return this.request('/ai/report/post-season', { method: 'POST', body: JSON.stringify({ sport, season }) })
  }

  async getAiReports() {
    return this.request('/ai/reports')
  }

  async getAiReport(reportId) {
    return this.request(`/ai/reports/${reportId}`)
  }

  // Scout + Sim (Phase 6F)
  async getScoutReport(sport, eventId) {
    return this.request('/ai/scout-report', { method: 'POST', body: JSON.stringify({ sport, eventId }) })
  }

  async getPlayerBrief(playerId, sport) {
    return this.request('/ai/player-brief', { method: 'POST', body: JSON.stringify({ playerId, sport }) })
  }

  async simulateMatchup(player1Id, player2Id, sport) {
    return this.request('/ai/simulate', { method: 'POST', body: JSON.stringify({ player1Id, player2Id, sport }) })
  }
}

export const api = new ApiService()
export default api
