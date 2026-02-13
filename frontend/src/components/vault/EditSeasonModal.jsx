import { useState } from 'react'
import api from '../../services/api'

const PLAYOFF_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'champion', label: 'Champion' },
  { value: 'runner_up', label: 'Runner-Up' },
  { value: 'eliminated', label: 'Eliminated' },
  { value: 'missed', label: 'Missed Playoffs' },
]

const EditSeasonModal = ({ seasonYear, existingTeams, onClose, onSaved }) => {
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

  const hasChanges = (team) => {
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
            <h2 className="text-lg font-display font-bold text-white">Edit {seasonYear} Season</h2>
            <p className="text-xs text-text-secondary mt-1">
              {teams.length} teams &middot; {changedTeams.length > 0 ? `${changedTeams.length} modified` : 'No changes'}
            </p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-white text-xl">&times;</button>
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
          </div>

          <div className="space-y-1.5">
            {teams.map((team, idx) => {
              const changed = hasChanges(team)
              return (
                <div
                  key={team.id || idx}
                  className={`flex items-center gap-2 rounded-lg px-1 py-1 transition-colors ${changed ? 'bg-accent-gold/5 border border-accent-gold/20' : ''}`}
                >
                  <span className="text-xs font-mono text-text-secondary w-5 text-right flex-shrink-0">
                    {team.finalStanding || idx + 1}
                  </span>
                  <input
                    type="text"
                    value={team.ownerName}
                    onChange={e => updateTeam(idx, 'ownerName', e.target.value)}
                    className="flex-1 min-w-0 px-2 py-1.5 bg-dark-tertiary border border-dark-tertiary rounded text-white text-sm focus:outline-none focus:border-accent-gold"
                  />
                  <input
                    type="number"
                    value={team.wins}
                    onChange={e => updateTeam(idx, 'wins', e.target.value)}
                    className="w-14 px-1.5 py-1.5 bg-dark-tertiary border border-dark-tertiary rounded text-white text-sm text-center font-mono focus:outline-none focus:border-accent-gold"
                  />
                  <input
                    type="number"
                    value={team.losses}
                    onChange={e => updateTeam(idx, 'losses', e.target.value)}
                    className="w-14 px-1.5 py-1.5 bg-dark-tertiary border border-dark-tertiary rounded text-white text-sm text-center font-mono focus:outline-none focus:border-accent-gold"
                  />
                  <input
                    type="number"
                    value={team.ties}
                    onChange={e => updateTeam(idx, 'ties', e.target.value)}
                    className="w-14 px-1.5 py-1.5 bg-dark-tertiary border border-dark-tertiary rounded text-white text-sm text-center font-mono focus:outline-none focus:border-accent-gold"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={team.pointsFor}
                    onChange={e => updateTeam(idx, 'pointsFor', e.target.value)}
                    className="w-20 px-1.5 py-1.5 bg-dark-tertiary border border-dark-tertiary rounded text-white text-sm text-center font-mono focus:outline-none focus:border-accent-gold"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={team.pointsAgainst}
                    onChange={e => updateTeam(idx, 'pointsAgainst', e.target.value)}
                    className="w-20 px-1.5 py-1.5 bg-dark-tertiary border border-dark-tertiary rounded text-white text-sm text-center font-mono focus:outline-none focus:border-accent-gold"
                  />
                  <select
                    value={team.playoffResult}
                    onChange={e => updateTeam(idx, 'playoffResult', e.target.value)}
                    className="w-28 px-1 py-1.5 bg-dark-tertiary border border-dark-tertiary rounded text-white text-xs font-mono focus:outline-none focus:border-accent-gold"
                  >
                    {PLAYOFF_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
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
              className="px-4 py-2 text-sm text-text-secondary hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || changedTeams.length === 0}
              className="px-5 py-2.5 bg-gold text-dark-primary rounded-lg font-display font-bold text-sm hover:bg-gold-bright disabled:opacity-50 shadow-lg shadow-gold/30 transition-colors"
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
