import { useState } from 'react'
import api from '../../services/api'

const PLAYOFF_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'champion', label: 'Champion' },
  { value: 'runner_up', label: 'Runner-Up' },
  { value: 'eliminated', label: 'Eliminated' },
  { value: 'missed', label: 'Missed Playoffs' },
]

const EMPTY_TEAM = {
  ownerName: '',
  teamName: '',
  wins: 0,
  losses: 0,
  ties: 0,
  pointsFor: 0,
  pointsAgainst: 0,
  finalStanding: 0,
  playoffResult: '',
}

const EditSeasonModal = ({ leagueId, seasonYear, existingTeams, onClose, onSaved }) => {
  const [teams, setTeams] = useState(() =>
    existingTeams.map(t => ({
      id: t.id,
      ownerName: t.ownerName || t.teamName || '',
      teamName: t.teamName || '',
      wins: t.wins || 0,
      losses: t.losses || 0,
      ties: t.ties || 0,
      pointsFor: t.pointsFor || 0,
      pointsAgainst: t.pointsAgainst || 0,
      finalStanding: t.finalStanding || 0,
      playoffResult: t.playoffResult || '',
      _isNew: false,
      _original: {
        ownerName: t.ownerName || t.teamName || '',
        teamName: t.teamName || '',
        wins: t.wins || 0,
        losses: t.losses || 0,
        ties: t.ties || 0,
        pointsFor: t.pointsFor || 0,
        pointsAgainst: t.pointsAgainst || 0,
        finalStanding: t.finalStanding || 0,
        playoffResult: t.playoffResult || '',
      },
    }))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [savedCount, setSavedCount] = useState(0)

  const updateTeam = (idx, field, value) => {
    setTeams(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t))
  }

  const addTeam = () => {
    setTeams(prev => [...prev, {
      ...EMPTY_TEAM,
      finalStanding: prev.length + 1,
      _isNew: true,
      _original: { ...EMPTY_TEAM },
    }])
  }

  const removeNewTeam = (idx) => {
    setTeams(prev => prev.filter((_, i) => i !== idx))
  }

  const hasChanges = (team) => {
    if (team._isNew) return team.ownerName.trim().length > 0
    const o = team._original
    return (
      team.ownerName !== o.ownerName ||
      team.teamName !== o.teamName ||
      parseInt(team.wins) !== o.wins ||
      parseInt(team.losses) !== o.losses ||
      parseInt(team.ties) !== o.ties ||
      parseFloat(team.pointsFor) !== o.pointsFor ||
      parseFloat(team.pointsAgainst) !== o.pointsAgainst ||
      parseInt(team.finalStanding) !== o.finalStanding ||
      team.playoffResult !== o.playoffResult
    )
  }

  const changedTeams = teams.filter(hasChanges)
  const newTeams = teams.filter(t => t._isNew && t.ownerName.trim().length > 0)

  const handleSave = async () => {
    if (changedTeams.length === 0) {
      onClose()
      return
    }

    setSaving(true)
    setError(null)
    setSavedCount(0)

    try {
      for (const team of changedTeams) {
        if (team._isNew) {
          // Create new team
          await api.createHistoricalSeason({
            leagueId,
            seasonYear,
            ownerName: team.ownerName,
            teamName: team.teamName || team.ownerName,
            wins: parseInt(team.wins) || 0,
            losses: parseInt(team.losses) || 0,
            ties: parseInt(team.ties) || 0,
            pointsFor: parseFloat(team.pointsFor) || 0,
            pointsAgainst: parseFloat(team.pointsAgainst) || 0,
            finalStanding: parseInt(team.finalStanding) || 0,
            playoffResult: team.playoffResult || null,
          })
        } else {
          // Update existing team
          await api.updateHistoricalSeason(team.id, {
            ownerName: team.ownerName,
            teamName: team.teamName,
            wins: parseInt(team.wins) || 0,
            losses: parseInt(team.losses) || 0,
            ties: parseInt(team.ties) || 0,
            pointsFor: parseFloat(team.pointsFor) || 0,
            pointsAgainst: parseFloat(team.pointsAgainst) || 0,
            finalStanding: parseInt(team.finalStanding) || 0,
            playoffResult: team.playoffResult || null,
          })
        }
        setSavedCount(prev => prev + 1)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-dark-secondary border border-dark-tertiary rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-dark-tertiary flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-bold text-text-primary">Edit {seasonYear} Season</h2>
            <p className="text-xs text-text-secondary mt-1">
              {teams.length} teams &middot; {changedTeams.length > 0 ? `${changedTeams.length} modified` : 'No changes'}
              {newTeams.length > 0 && ` (${newTeams.length} new)`}
            </p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-xl">&times;</button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {/* Column headers */}
          <div className="flex items-center gap-2 mb-2 text-[10px] font-mono text-text-secondary uppercase tracking-wider">
            <span className="w-5">#</span>
            <span className="flex-1 min-w-0">Owner</span>
            <span className="w-14 text-center">W</span>
            <span className="w-14 text-center">L</span>
            <span className="w-14 text-center">T</span>
            <span className="w-20 text-center">PF</span>
            <span className="w-20 text-center">PA</span>
            <span className="w-28 text-center">Playoff</span>
            <span className="w-6"></span>
          </div>

          <div className="space-y-1.5">
            {teams.map((team, idx) => {
              const changed = hasChanges(team)
              return (
                <div
                  key={team.id || `new-${idx}`}
                  className={`flex items-center gap-2 rounded-lg px-1 py-1 transition-colors ${
                    team._isNew ? 'bg-green-500/5 border border-green-500/20' :
                    changed ? 'bg-accent-gold/5 border border-accent-gold/20' : ''
                  }`}
                >
                  <span className="text-xs font-mono text-text-secondary w-5 text-right flex-shrink-0">
                    {team.finalStanding || idx + 1}
                  </span>
                  <input
                    type="text"
                    value={team.ownerName}
                    onChange={e => updateTeam(idx, 'ownerName', e.target.value)}
                    placeholder={team._isNew ? 'Owner name...' : ''}
                    className="flex-1 min-w-0 px-2 py-1.5 bg-dark-tertiary border border-dark-tertiary rounded text-text-primary text-sm focus:outline-none focus:border-accent-gold"
                  />
                  <input
                    type="number"
                    value={team.wins}
                    onChange={e => updateTeam(idx, 'wins', e.target.value)}
                    className="w-14 px-1.5 py-1.5 bg-dark-tertiary border border-dark-tertiary rounded text-text-primary text-sm text-center font-mono focus:outline-none focus:border-accent-gold"
                  />
                  <input
                    type="number"
                    value={team.losses}
                    onChange={e => updateTeam(idx, 'losses', e.target.value)}
                    className="w-14 px-1.5 py-1.5 bg-dark-tertiary border border-dark-tertiary rounded text-text-primary text-sm text-center font-mono focus:outline-none focus:border-accent-gold"
                  />
                  <input
                    type="number"
                    value={team.ties}
                    onChange={e => updateTeam(idx, 'ties', e.target.value)}
                    className="w-14 px-1.5 py-1.5 bg-dark-tertiary border border-dark-tertiary rounded text-text-primary text-sm text-center font-mono focus:outline-none focus:border-accent-gold"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={team.pointsFor}
                    onChange={e => updateTeam(idx, 'pointsFor', e.target.value)}
                    className="w-20 px-1.5 py-1.5 bg-dark-tertiary border border-dark-tertiary rounded text-text-primary text-sm text-center font-mono focus:outline-none focus:border-accent-gold"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={team.pointsAgainst}
                    onChange={e => updateTeam(idx, 'pointsAgainst', e.target.value)}
                    className="w-20 px-1.5 py-1.5 bg-dark-tertiary border border-dark-tertiary rounded text-text-primary text-sm text-center font-mono focus:outline-none focus:border-accent-gold"
                  />
                  <select
                    value={team.playoffResult}
                    onChange={e => updateTeam(idx, 'playoffResult', e.target.value)}
                    className="w-28 px-1 py-1.5 bg-dark-tertiary border border-dark-tertiary rounded text-text-primary text-xs font-mono focus:outline-none focus:border-accent-gold"
                  >
                    {PLAYOFF_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <div className="w-6 flex-shrink-0">
                    {team._isNew && (
                      <button
                        onClick={() => removeNewTeam(idx)}
                        className="text-red-400 hover:text-red-300 text-sm"
                        title="Remove"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add Team button */}
          <button
            onClick={addTeam}
            className="mt-3 w-full py-2 border border-dashed border-dark-tertiary rounded-lg text-text-secondary text-sm hover:border-accent-gold/50 hover:text-accent-gold transition-colors"
          >
            + Add Team
          </button>
        </div>

        {error && (
          <div className="px-5 py-2">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="p-5 border-t border-dark-tertiary flex items-center justify-between">
          <span className="text-xs text-text-secondary font-mono">
            {saving ? `Saving ${savedCount}/${changedTeams.length}...` : `${changedTeams.length} change${changedTeams.length !== 1 ? 's' : ''}`}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || changedTeams.length === 0}
              className="px-5 py-2.5 bg-gold text-slate rounded-lg font-display font-bold text-sm hover:bg-gold-bright disabled:opacity-50 shadow-lg shadow-gold/30 transition-colors"
            >
              {saving ? 'Saving...' : changedTeams.length === 0 ? 'No Changes' : `Save ${changedTeams.length} Change${changedTeams.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditSeasonModal
