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
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || 'Request failed')
    }

    return data
  }

  // Auth
  async signup(name, email, password) {
    const data = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
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

  async getTournamentLeaderboard(id, options = {}) {
    const params = new URLSearchParams(options).toString()
    return this.request(`/tournaments/${id}/leaderboard${params ? '?' + params : ''}`)
  }

  async getPlayerScorecard(tournamentId, playerId) {
    return this.request(`/tournaments/${tournamentId}/scorecards/${playerId}`)
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

  async getNflPlayer(id) {
    return this.request(`/nfl/players/${id}`)
  }

  async getNflTeams() {
    return this.request('/nfl/teams')
  }

  async getNflTeam(abbr) {
    return this.request(`/nfl/teams/${abbr}`)
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
}

export const api = new ApiService()
export default api
