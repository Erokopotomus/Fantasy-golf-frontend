import { useState } from 'react'
import Card from '../../common/Card'
import useMatchups from '../../../hooks/useMatchups'
import api from '../../../services/api'

const ScheduleManager = ({ leagueId, league, notify }) => {
  const { schedule, standings, loading, refetch } = useMatchups(leagueId)
  const [generating, setGenerating] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [editingMatchup, setEditingMatchup] = useState(null)
  const [editHomeScore, setEditHomeScore] = useState('')
  const [editAwayScore, setEditAwayScore] = useState('')
  const [saving, setSaving] = useState(false)

  // Commissioner matchup builder state
  const [showMatchupBuilder, setShowMatchupBuilder] = useState(false)
  const [qualifiedTeams, setQualifiedTeams] = useState([])
  const [matchupSlots, setMatchupSlots] = useState([])
  const [submittingMatchups, setSubmittingMatchups] = useState(false)

  const playoffSeeding = league?.settings?.formatSettings?.playoffSeeding || 'default'

  const handleGenerate = async () => {
    try {
      setGenerating(true)
      const result = await api.generateMatchups(leagueId)
      notify?.success('Schedule Generated', result.message)
      refetch()
    } catch (err) {
      notify?.error('Error', err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleGeneratePlayoffs = async () => {
    try {
      setGenerating(true)
      const result = await api.generatePlayoffs(leagueId)

      if (result.mode === 'commissioner') {
        // Commissioner mode: show the matchup builder
        setQualifiedTeams(result.qualifiedTeams || [])
        const slotCount = Math.floor((result.qualifiedTeams || []).length / 2)
        setMatchupSlots(Array.from({ length: slotCount }, () => ({ homeTeamId: '', awayTeamId: '' })))
        setShowMatchupBuilder(true)
        notify?.success('Teams Qualified', result.message)
      } else {
        notify?.success('Playoffs Generated', result.message)
      }
      refetch()
    } catch (err) {
      notify?.error('Error', err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleSlotChange = (slotIndex, side, teamId) => {
    setMatchupSlots(prev => {
      const updated = [...prev]
      updated[slotIndex] = { ...updated[slotIndex], [side]: teamId }
      return updated
    })
  }

  const getUsedTeamIds = (excludeSlotIndex, excludeSide) => {
    const used = new Set()
    matchupSlots.forEach((slot, i) => {
      if (i === excludeSlotIndex && excludeSide === 'homeTeamId' && slot.awayTeamId) {
        used.add(slot.awayTeamId)
      } else if (i === excludeSlotIndex && excludeSide === 'awayTeamId' && slot.homeTeamId) {
        used.add(slot.homeTeamId)
      } else {
        if (slot.homeTeamId) used.add(slot.homeTeamId)
        if (slot.awayTeamId) used.add(slot.awayTeamId)
      }
    })
    return used
  }

  const allSlotsFilled = matchupSlots.every(s => s.homeTeamId && s.awayTeamId)

  const handleSubmitCustomMatchups = async () => {
    if (!allSlotsFilled) return
    try {
      setSubmittingMatchups(true)
      const matchups = matchupSlots.map(s => ({
        homeTeamId: s.homeTeamId,
        awayTeamId: s.awayTeamId,
      }))
      const result = await api.submitCustomPlayoffMatchups(leagueId, matchups)
      notify?.success('Matchups Set', result.message)
      setShowMatchupBuilder(false)
      setMatchupSlots([])
      setQualifiedTeams([])
      refetch()
    } catch (err) {
      notify?.error('Error', err.message)
    } finally {
      setSubmittingMatchups(false)
    }
  }

  const handleReset = async () => {
    try {
      setResetting(true)
      await api.resetMatchups(leagueId)
      notify?.success('Schedule Reset', 'All matchups have been deleted')
      setShowResetConfirm(false)
      setShowMatchupBuilder(false)
      setQualifiedTeams([])
      setMatchupSlots([])
      refetch()
    } catch (err) {
      notify?.error('Error', err.message)
    } finally {
      setResetting(false)
    }
  }

  const handleEditMatchup = (matchup) => {
    setEditingMatchup(matchup.id)
    setEditHomeScore(String(matchup.homeScore || 0))
    setEditAwayScore(String(matchup.awayScore || 0))
  }

  const handleSaveMatchup = async (matchupId) => {
    try {
      setSaving(true)
      await api.updateMatchup(leagueId, matchupId, {
        homeScore: parseFloat(editHomeScore) || 0,
        awayScore: parseFloat(editAwayScore) || 0,
        isComplete: true,
      })
      notify?.success('Matchup Updated', 'Score has been saved')
      setEditingMatchup(null)
      refetch()
    } catch (err) {
      notify?.error('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  // Build team lookup
  const teamLookup = standings.reduce((acc, team) => {
    acc[team.userId] = team
    return acc
  }, {})

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <Card>
        <h3 className="text-lg font-semibold font-display text-white mb-4">Matchup Schedule</h3>
        <p className="text-text-secondary text-sm mb-4">
          Generate a round-robin schedule for head-to-head matchups, or adjust individual matchup scores.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            {generating ? 'Generating...' : schedule.length > 0 ? 'Regenerate Schedule' : 'Generate Schedule'}
          </button>

          <button
            onClick={handleGeneratePlayoffs}
            disabled={generating}
            className="px-4 py-2 bg-gold text-white rounded-lg font-medium hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate Playoffs'}
          </button>

          {schedule.length > 0 && (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/30 transition-colors"
            >
              Reset All Matchups
            </button>
          )}
        </div>

        {playoffSeeding === 'commissioner' && !showMatchupBuilder && (
          <p className="text-text-muted text-xs mt-3">
            Commissioner's Choice seeding is active. After generating playoffs, you'll assign matchups manually.
          </p>
        )}

        {/* Reset Confirmation */}
        {showResetConfirm && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm mb-3">
              This will delete all matchups and scores. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                disabled={resetting}
                className="px-3 py-1.5 bg-red-500 text-white rounded font-medium text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {resetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 bg-dark-tertiary text-text-secondary rounded font-medium text-sm hover:bg-dark-border transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Commissioner Matchup Builder */}
      {showMatchupBuilder && qualifiedTeams.length > 0 && (
        <Card className="border-gold/30">
          <h3 className="text-lg font-semibold font-display text-white mb-2">Set Playoff Matchups</h3>
          <p className="text-text-muted text-sm mb-4">
            Assign matchups for the next playoff round. Each team can only appear once.
          </p>

          <div className="space-y-3">
            {matchupSlots.map((slot, idx) => {
              const usedForHome = getUsedTeamIds(idx, 'homeTeamId')
              const usedForAway = getUsedTeamIds(idx, 'awayTeamId')

              return (
                <div key={idx} className="flex items-center gap-3 p-3 bg-dark-tertiary rounded-lg">
                  <span className="text-text-muted text-sm font-medium w-16 shrink-0">Game {idx + 1}</span>

                  <select
                    value={slot.homeTeamId}
                    onChange={(e) => handleSlotChange(idx, 'homeTeamId', e.target.value)}
                    className="flex-1 p-2 bg-dark-primary border border-dark-border rounded-lg text-white text-sm focus:border-gold focus:outline-none"
                  >
                    <option value="">Select team...</option>
                    {qualifiedTeams.map(t => {
                      const disabled = usedForHome.has(t.teamId) && t.teamId !== slot.homeTeamId
                      return (
                        <option key={t.teamId} value={t.teamId} disabled={disabled}>
                          #{t.seed} {t.teamName || t.ownerName} ({t.wins}-{t.losses})
                        </option>
                      )
                    })}
                  </select>

                  <span className="text-text-muted font-bold text-sm">vs</span>

                  <select
                    value={slot.awayTeamId}
                    onChange={(e) => handleSlotChange(idx, 'awayTeamId', e.target.value)}
                    className="flex-1 p-2 bg-dark-primary border border-dark-border rounded-lg text-white text-sm focus:border-gold focus:outline-none"
                  >
                    <option value="">Select team...</option>
                    {qualifiedTeams.map(t => {
                      const disabled = usedForAway.has(t.teamId) && t.teamId !== slot.awayTeamId
                      return (
                        <option key={t.teamId} value={t.teamId} disabled={disabled}>
                          #{t.seed} {t.teamName || t.ownerName} ({t.wins}-{t.losses})
                        </option>
                      )
                    })}
                  </select>
                </div>
              )
            })}
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSubmitCustomMatchups}
              disabled={!allSlotsFilled || submittingMatchups}
              className="px-4 py-2 bg-gold text-white rounded-lg font-medium hover:bg-gold/90 transition-colors disabled:opacity-50"
            >
              {submittingMatchups ? 'Submitting...' : 'Confirm Matchups'}
            </button>
            <button
              onClick={() => {
                setShowMatchupBuilder(false)
                setMatchupSlots([])
                setQualifiedTeams([])
              }}
              className="px-4 py-2 bg-dark-tertiary text-text-secondary rounded-lg font-medium hover:bg-dark-border transition-colors"
            >
              Cancel
            </button>
          </div>
        </Card>
      )}

      {/* Current Schedule */}
      {schedule.length > 0 ? (
        <div className="space-y-4">
          {schedule.map(week => (
            <Card key={week.week}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-white">
                  Week {week.week}
                  {week.tournament && (
                    <span className="text-text-muted font-normal ml-2">- {week.tournament}</span>
                  )}
                </h4>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  week.matchups?.every(m => m.completed)
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {week.matchups?.every(m => m.completed) ? 'Final' : 'Pending'}
                </span>
              </div>

              <div className="space-y-2">
                {week.matchups?.map(matchup => {
                  const homeTeam = teamLookup[matchup.home]
                  const awayTeam = teamLookup[matchup.away]
                  const isEditing = editingMatchup === matchup.id

                  return (
                    <div
                      key={matchup.id}
                      className="flex items-center justify-between p-3 bg-dark-tertiary rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium text-sm">
                            {homeTeam?.name || 'Team'}
                          </span>
                          {isEditing ? (
                            <input
                              type="number"
                              value={editHomeScore}
                              onChange={(e) => setEditHomeScore(e.target.value)}
                              className="w-20 px-2 py-1 bg-dark-primary border border-dark-border rounded text-white text-center text-sm"
                              step="0.5"
                            />
                          ) : (
                            <span className="text-emerald-400 font-bold">{matchup.homeScore}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-text-secondary text-sm">
                            {awayTeam?.name || 'Team'}
                          </span>
                          {isEditing ? (
                            <input
                              type="number"
                              value={editAwayScore}
                              onChange={(e) => setEditAwayScore(e.target.value)}
                              className="w-20 px-2 py-1 bg-dark-primary border border-dark-border rounded text-white text-center text-sm"
                              step="0.5"
                            />
                          ) : (
                            <span className="text-text-secondary font-bold">{matchup.awayScore}</span>
                          )}
                        </div>
                      </div>

                      <div className="ml-3">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSaveMatchup(matchup.id)}
                              disabled={saving}
                              className="px-2 py-1 bg-emerald-500 text-white rounded text-xs font-medium hover:bg-emerald-600 disabled:opacity-50"
                            >
                              {saving ? '...' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingMatchup(null)}
                              className="px-2 py-1 bg-dark-border text-text-secondary rounded text-xs font-medium hover:text-white"
                            >
                              X
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditMatchup(matchup)}
                            className="p-1.5 text-text-muted hover:text-white transition-colors"
                            title="Edit score"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-8">
          <div className="w-16 h-16 bg-dark-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Schedule Yet</h3>
          <p className="text-text-secondary mb-4">Generate a matchup schedule to start head-to-head competition</p>
        </Card>
      )}
    </div>
  )
}

export default ScheduleManager
