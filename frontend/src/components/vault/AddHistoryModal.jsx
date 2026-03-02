import { useState } from 'react'
import api from '../../services/api'

const PLAYOFF_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'champion', label: 'Champion' },
  { value: 'runner_up', label: 'Runner-Up' },
  { value: 'eliminated', label: 'Eliminated' },
  { value: 'missed', label: 'Missed Playoffs' },
]

const EMPTY_TEAM = () => ({ ownerName: '', teamName: '', wins: 0, losses: 0, playoffResult: '' })

const AddHistoryModal = ({ leagueId, mode, seasonYear, existingYears, onClose, onSaved }) => {
  const [year, setYear] = useState(seasonYear || '')
  const [teams, setTeams] = useState([EMPTY_TEAM(), EMPTY_TEAM()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const isSeasonMode = mode === 'season'
  const yearNum = parseInt(year)
  const yearValid = yearNum >= 1990 && yearNum <= new Date().getFullYear()
  const yearConflict = isSeasonMode && yearValid && existingYears?.includes(yearNum)
  const validTeams = teams.filter(t => t.ownerName.trim())
  const canSave = yearValid && !yearConflict && validTeams.length > 0

  const updateTeam = (idx, field, value) => {
    setTeams(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t))
  }

  const addRow = () => setTeams(prev => [...prev, EMPTY_TEAM()])

  const removeRow = (idx) => {
    if (teams.length <= 1) return
    setTeams(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      await api.addManualSeason(leagueId, yearNum, validTeams.map(t => ({
        ownerName: t.ownerName.trim(),
        teamName: t.teamName.trim() || t.ownerName.trim(),
        wins: parseInt(t.wins) || 0,
        losses: parseInt(t.losses) || 0,
        playoffResult: t.playoffResult || null,
      })))
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
        className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--card-border)] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-bold text-text-primary">
              {isSeasonMode ? 'Add Missing Season' : `Add Teams to ${seasonYear}`}
            </h2>
            <p className="text-xs text-text-secondary mt-1">
              {isSeasonMode
                ? 'Add a season that wasn\'t imported'
                : 'Add teams missing from this season'}
            </p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-xl">&times;</button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Year input (editable in season mode, locked in team mode) */}
          <div>
            <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Season Year</label>
            {isSeasonMode ? (
              <div>
                <input
                  type="number"
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  placeholder="e.g. 2015"
                  min={1990}
                  max={new Date().getFullYear()}
                  className="mt-1 w-32 px-3 py-2 bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg text-text-primary text-sm font-mono focus:outline-none focus:border-accent-gold"
                />
                {yearConflict && (
                  <p className="text-xs text-live-red mt-1">Season {yearNum} already exists — use the + button next to it instead</p>
                )}
              </div>
            ) : (
              <div className="mt-1 text-sm font-mono text-accent-gold">{seasonYear}</div>
            )}
          </div>

          {/* Team rows */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-[10px] font-mono text-text-secondary uppercase tracking-wider">
              <span className="flex-1">Owner Name</span>
              <span className="w-20">Team Name</span>
              <span className="w-12 text-center">W</span>
              <span className="w-12 text-center">L</span>
              <span className="w-24 text-center">Playoff</span>
              <span className="w-6"></span>
            </div>

            <div className="space-y-1.5">
              {teams.map((team, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={team.ownerName}
                    onChange={e => updateTeam(idx, 'ownerName', e.target.value)}
                    placeholder="Owner name"
                    className="flex-1 px-2 py-1.5 bg-[var(--bg-alt)] border border-[var(--card-border)] rounded text-text-primary text-sm focus:outline-none focus:border-accent-gold"
                  />
                  <input
                    type="text"
                    value={team.teamName}
                    onChange={e => updateTeam(idx, 'teamName', e.target.value)}
                    placeholder="Optional"
                    className="w-20 px-2 py-1.5 bg-[var(--bg-alt)] border border-[var(--card-border)] rounded text-text-primary text-xs focus:outline-none focus:border-accent-gold"
                  />
                  <input
                    type="number"
                    value={team.wins}
                    onChange={e => updateTeam(idx, 'wins', e.target.value)}
                    className="w-12 px-1 py-1.5 bg-[var(--bg-alt)] border border-[var(--card-border)] rounded text-text-primary text-sm text-center font-mono focus:outline-none focus:border-accent-gold"
                  />
                  <input
                    type="number"
                    value={team.losses}
                    onChange={e => updateTeam(idx, 'losses', e.target.value)}
                    className="w-12 px-1 py-1.5 bg-[var(--bg-alt)] border border-[var(--card-border)] rounded text-text-primary text-sm text-center font-mono focus:outline-none focus:border-accent-gold"
                  />
                  <select
                    value={team.playoffResult}
                    onChange={e => updateTeam(idx, 'playoffResult', e.target.value)}
                    className="w-24 px-1 py-1.5 bg-[var(--bg-alt)] border border-[var(--card-border)] rounded text-text-primary text-[11px] font-mono focus:outline-none focus:border-accent-gold"
                  >
                    {PLAYOFF_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeRow(idx)}
                    disabled={teams.length <= 1}
                    className="w-6 text-live-red hover:text-red-300 text-sm disabled:opacity-20 disabled:cursor-default"
                    title="Remove"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addRow}
              className="mt-2 w-full py-1.5 border border-dashed border-[var(--card-border)] rounded-lg text-text-secondary text-xs hover:border-accent-gold/50 hover:text-accent-gold transition-colors"
            >
              + Add Row
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-5 py-2">
            <p className="text-sm text-live-red">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="p-5 border-t border-[var(--card-border)] flex items-center justify-between">
          <span className="text-xs text-text-secondary font-mono">
            {validTeams.length} team{validTeams.length !== 1 ? 's' : ''} to add
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
              disabled={saving || !canSave}
              className="px-5 py-2.5 bg-gold text-slate rounded-lg font-display font-bold text-sm hover:bg-gold-bright disabled:opacity-50 shadow-lg shadow-gold/30 transition-colors"
            >
              {saving ? 'Saving...' : `Save ${validTeams.length} Team${validTeams.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddHistoryModal
