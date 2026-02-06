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

  async saveLineup(teamId, activePlayerIds) {
    return this.request(`/teams/${teamId}/lineup`, {
      method: 'POST',
      body: JSON.stringify({ activePlayerIds }),
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

  async createDraft(leagueId) {
    return this.request(`/leagues/${leagueId}/draft`, {
      method: 'POST',
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

  // Standings & Scoring
  async getLeagueStandings(leagueId) {
    return this.request(`/leagues/${leagueId}/standings`)
  }

  async getLeagueScoring(leagueId, tournamentId) {
    return this.request(`/leagues/${leagueId}/scoring/${tournamentId}`)
  }
}

export const api = new ApiService()
export default api
