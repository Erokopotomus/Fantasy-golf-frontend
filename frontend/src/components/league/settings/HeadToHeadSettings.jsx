import { useState } from 'react'
import Card from '../../common/Card'

const HeadToHeadSettings = ({ settings, onChange, teams }) => {
  const [localSettings, setLocalSettings] = useState({
    playoffTeams: settings?.playoffTeams || 4,
    playoffFormat: settings?.playoffFormat || 'single-elimination',
    playoffWeeksPerRound: settings?.playoffWeeksPerRound || 1,
    playoffSeeding: settings?.playoffSeeding || 'default',
    consolationBracket: settings?.consolationBracket || 'none',
    regularSeasonWeeks: settings?.regularSeasonWeeks || 12,
    tiebreakers: settings?.tiebreakers || ['total-points', 'head-to-head'],
    divisions: settings?.divisions || [],
    divisionAssignments: settings?.divisionAssignments || {},
    divisionsEnabled: settings?.divisions?.length > 0 || false,
  })

  const handleChange = (key, value) => {
    const updated = { ...localSettings, [key]: value }
    setLocalSettings(updated)
    onChange?.(updated)
  }

  const tiebreakerOptions = [
    { id: 'total-points', label: 'Total Points' },
    { id: 'head-to-head', label: 'Head-to-Head Record' },
    { id: 'points-against', label: 'Points Against' },
    { id: 'division-record', label: 'Division Record' },
  ]

  const toggleTiebreaker = (tiebreakerId) => {
    const current = localSettings.tiebreakers
    const updated = current.includes(tiebreakerId)
      ? current.filter(t => t !== tiebreakerId)
      : [...current, tiebreakerId]
    handleChange('tiebreakers', updated)
  }

  const moveTiebreaker = (index, direction) => {
    const current = [...localSettings.tiebreakers]
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= current.length) return
    const temp = current[index]
    current[index] = current[newIndex]
    current[newIndex] = temp
    handleChange('tiebreakers', current)
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold font-display text-white mb-4">Regular Season</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Regular Season Length
            </label>
            <select
              value={localSettings.regularSeasonWeeks}
              onChange={(e) => handleChange('regularSeasonWeeks', parseInt(e.target.value))}
              className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-gold focus:outline-none"
            >
              {[8, 10, 12, 14, 16, 18].map(weeks => (
                <option key={weeks} value={weeks}>{weeks} Weeks</option>
              ))}
            </select>
            <p className="text-xs text-text-muted mt-2">
              Number of tournaments in the regular season before playoffs
            </p>
          </div>
        </div>
      </Card>

      {/* Divisions */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold font-display text-white">Divisions</h3>
          <button
            type="button"
            onClick={() => {
              const enabled = !localSettings.divisionsEnabled
              const updated = {
                ...localSettings,
                divisionsEnabled: enabled,
                divisions: enabled && localSettings.divisions.length === 0 ? ['East', 'West'] : enabled ? localSettings.divisions : [],
                divisionAssignments: enabled ? localSettings.divisionAssignments : {},
              }
              setLocalSettings(updated)
              onChange?.({ ...updated, divisionsEnabled: undefined })
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              localSettings.divisionsEnabled ? 'bg-gold' : 'bg-dark-border'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                localSettings.divisionsEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {localSettings.divisionsEnabled && (
          <div className="space-y-4">
            {/* Division Names */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Division Names
              </label>
              <div className="space-y-2">
                {localSettings.divisions.map((div, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={div}
                      onChange={(e) => {
                        const oldName = localSettings.divisions[idx]
                        const newDivisions = [...localSettings.divisions]
                        newDivisions[idx] = e.target.value
                        // Update assignments that reference the old name
                        const newAssignments = { ...localSettings.divisionAssignments }
                        for (const [teamId, assignedDiv] of Object.entries(newAssignments)) {
                          if (assignedDiv === oldName) newAssignments[teamId] = e.target.value
                        }
                        const updated = { ...localSettings, divisions: newDivisions, divisionAssignments: newAssignments }
                        setLocalSettings(updated)
                        onChange?.({ ...updated, divisionsEnabled: undefined })
                      }}
                      className="flex-1 p-2 bg-dark-tertiary border border-dark-border rounded-lg text-white text-sm focus:border-gold focus:outline-none"
                    />
                    {localSettings.divisions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const removed = localSettings.divisions[idx]
                          const newDivisions = localSettings.divisions.filter((_, i) => i !== idx)
                          const newAssignments = { ...localSettings.divisionAssignments }
                          for (const [teamId, assignedDiv] of Object.entries(newAssignments)) {
                            if (assignedDiv === removed) delete newAssignments[teamId]
                          }
                          const updated = { ...localSettings, divisions: newDivisions, divisionAssignments: newAssignments }
                          setLocalSettings(updated)
                          onChange?.({ ...updated, divisionsEnabled: undefined })
                        }}
                        className="p-2 text-red-400 hover:text-red-300"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {localSettings.divisions.length < 4 && (
                <button
                  type="button"
                  onClick={() => {
                    const names = ['East', 'West', 'North', 'South']
                    const newName = names.find(n => !localSettings.divisions.includes(n)) || `Division ${localSettings.divisions.length + 1}`
                    const updated = { ...localSettings, divisions: [...localSettings.divisions, newName] }
                    setLocalSettings(updated)
                    onChange?.({ ...updated, divisionsEnabled: undefined })
                  }}
                  className="mt-2 px-3 py-1 text-xs bg-dark-primary border border-dark-border rounded-full text-text-muted hover:text-white hover:border-gold transition-colors"
                >
                  + Add Division
                </button>
              )}
            </div>

            {/* Team Assignments */}
            {teams && teams.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Team Assignments
                </label>
                <div className="space-y-2">
                  {teams.map(team => (
                    <div key={team.id} className="flex items-center gap-3 p-2 bg-dark-tertiary rounded-lg">
                      <span className="text-white text-sm flex-1 truncate">{team.name || team.user?.name || 'Unknown'}</span>
                      <select
                        value={localSettings.divisionAssignments[team.id] || ''}
                        onChange={(e) => {
                          const newAssignments = { ...localSettings.divisionAssignments }
                          if (e.target.value) {
                            newAssignments[team.id] = e.target.value
                          } else {
                            delete newAssignments[team.id]
                          }
                          const updated = { ...localSettings, divisionAssignments: newAssignments }
                          setLocalSettings(updated)
                          onChange?.({ ...updated, divisionsEnabled: undefined })
                        }}
                        className="p-1 bg-dark-primary border border-dark-border rounded text-white text-sm focus:border-gold focus:outline-none"
                      >
                        <option value="">Unassigned</option>
                        {localSettings.divisions.map(div => (
                          <option key={div} value={div}>{div}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-lg font-semibold font-display text-white mb-4">Playoff Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Playoff Teams
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[2, 4, 6, 8].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleChange('playoffTeams', num)}
                  className={`p-3 rounded-lg border-2 font-semibold transition-all ${
                    localSettings.playoffTeams === num
                      ? 'border-gold bg-gold/10 text-white'
                      : 'border-dark-border bg-dark-tertiary text-text-secondary hover:border-text-muted'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            {localSettings.playoffTeams === 6 && (
              <p className="text-xs text-gold mt-2">
                Top 2 seeds receive a first-round bye
              </p>
            )}
            {localSettings.playoffTeams === 5 && (
              <p className="text-xs text-gold mt-2">
                Top 3 seeds receive a first-round bye
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Playoff Format
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-dark-tertiary rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="playoffFormat"
                  value="single-elimination"
                  checked={localSettings.playoffFormat === 'single-elimination'}
                  onChange={(e) => handleChange('playoffFormat', e.target.value)}
                  className="text-gold"
                />
                <div>
                  <p className="text-white font-medium">Single Elimination</p>
                  <p className="text-text-muted text-xs">One loss and you're out</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-dark-tertiary rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="playoffFormat"
                  value="two-week"
                  checked={localSettings.playoffFormat === 'two-week'}
                  onChange={(e) => handleChange('playoffFormat', e.target.value)}
                  className="text-gold"
                />
                <div>
                  <p className="text-white font-medium">Two-Week Matchups</p>
                  <p className="text-text-muted text-xs">Combined points across two tournaments</p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Playoff Weeks Per Round
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-dark-tertiary rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="playoffWeeksPerRound"
                  value="1"
                  checked={localSettings.playoffWeeksPerRound === 1}
                  onChange={() => handleChange('playoffWeeksPerRound', 1)}
                  className="text-gold"
                />
                <div>
                  <p className="text-white font-medium">One Week Per Round</p>
                  <p className="text-text-muted text-xs">Each playoff round is a single tournament</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-dark-tertiary rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="playoffWeeksPerRound"
                  value="2-championship"
                  checked={localSettings.playoffWeeksPerRound === '2-championship'}
                  onChange={() => handleChange('playoffWeeksPerRound', '2-championship')}
                  className="text-gold"
                />
                <div>
                  <p className="text-white font-medium">Two-Week Championship Only</p>
                  <p className="text-text-muted text-xs">Only the finals span two tournaments</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-dark-tertiary rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="playoffWeeksPerRound"
                  value="2"
                  checked={localSettings.playoffWeeksPerRound === 2}
                  onChange={() => handleChange('playoffWeeksPerRound', 2)}
                  className="text-gold"
                />
                <div>
                  <p className="text-white font-medium">Two Weeks Per Round</p>
                  <p className="text-text-muted text-xs">Every playoff round spans two tournaments</p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Playoff Seeding
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-dark-tertiary rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="playoffSeeding"
                  value="default"
                  checked={localSettings.playoffSeeding === 'default'}
                  onChange={(e) => handleChange('playoffSeeding', e.target.value)}
                  className="text-gold"
                />
                <div>
                  <p className="text-white font-medium">Fixed Bracket</p>
                  <p className="text-text-muted text-xs">Seeding locked after regular season (1v8, 2v7, etc.)</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-dark-tertiary rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="playoffSeeding"
                  value="reseed"
                  checked={localSettings.playoffSeeding === 'reseed'}
                  onChange={(e) => handleChange('playoffSeeding', e.target.value)}
                  className="text-gold"
                />
                <div>
                  <p className="text-white font-medium">Re-seed Each Round</p>
                  <p className="text-text-muted text-xs">Remaining teams re-seeded after each round</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-dark-tertiary rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="playoffSeeding"
                  value="commissioner"
                  checked={localSettings.playoffSeeding === 'commissioner'}
                  onChange={(e) => handleChange('playoffSeeding', e.target.value)}
                  className="text-gold"
                />
                <div>
                  <p className="text-white font-medium">Commissioner's Choice</p>
                  <p className="text-text-muted text-xs">Commissioner assigns matchups manually before each round starts</p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Consolation Bracket
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-dark-tertiary rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="consolationBracket"
                  value="none"
                  checked={localSettings.consolationBracket === 'none'}
                  onChange={(e) => handleChange('consolationBracket', e.target.value)}
                  className="text-gold"
                />
                <div>
                  <p className="text-white font-medium">None</p>
                  <p className="text-text-muted text-xs">Eliminated teams are done</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-dark-tertiary rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="consolationBracket"
                  value="consolation"
                  checked={localSettings.consolationBracket === 'consolation'}
                  onChange={(e) => handleChange('consolationBracket', e.target.value)}
                  className="text-gold"
                />
                <div>
                  <p className="text-white font-medium">Consolation Bracket</p>
                  <p className="text-text-muted text-xs">Non-playoff teams play for pride</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-dark-tertiary rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="consolationBracket"
                  value="toilet-bowl"
                  checked={localSettings.consolationBracket === 'toilet-bowl'}
                  onChange={(e) => handleChange('consolationBracket', e.target.value)}
                  className="text-gold"
                />
                <div>
                  <p className="text-white font-medium">Toilet Bowl</p>
                  <p className="text-text-muted text-xs">Bottom teams play to avoid last place</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold font-display text-white mb-4">Tiebreakers</h3>
        <p className="text-sm text-text-muted mb-4">
          Select and order tiebreakers for determining playoff seeding
        </p>
        <div className="space-y-2">
          {localSettings.tiebreakers.map((tb, index) => {
            const option = tiebreakerOptions.find(o => o.id === tb)
            return (
              <div key={tb} className="flex items-center gap-2 p-3 bg-dark-tertiary rounded-lg">
                <span className="text-gold font-semibold w-6">{index + 1}.</span>
                <span className="text-white flex-1">{option?.label}</span>
                <button
                  type="button"
                  onClick={() => moveTiebreaker(index, -1)}
                  disabled={index === 0}
                  className="p-1 text-text-muted hover:text-white disabled:opacity-30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => moveTiebreaker(index, 1)}
                  disabled={index === localSettings.tiebreakers.length - 1}
                  className="p-1 text-text-muted hover:text-white disabled:opacity-30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => toggleTiebreaker(tb)}
                  className="p-1 text-red-400 hover:text-red-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {tiebreakerOptions
            .filter(opt => !localSettings.tiebreakers.includes(opt.id))
            .map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleTiebreaker(opt.id)}
                className="px-3 py-1 text-xs bg-dark-primary border border-dark-border rounded-full text-text-muted hover:text-white hover:border-gold transition-colors"
              >
                + {opt.label}
              </button>
            ))}
        </div>
      </Card>
    </div>
  )
}

export default HeadToHeadSettings
