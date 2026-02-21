import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'

function scoringLabel(fmt) {
  if (fmt === 'ppr') return 'PPR'
  if (fmt === 'half_ppr') return 'Half PPR'
  if (fmt === 'standard') return 'Standard'
  return fmt
}

function GapBadge({ gap }) {
  if (gap === null || gap === undefined) return <span className="text-text-primary/15">—</span>
  const isValue = gap > 0
  const color = isValue ? 'text-emerald-400' : gap < 0 ? 'text-red-400' : 'text-text-primary/30'
  return <span className={`font-mono text-xs ${color}`}>{isValue ? '+' : ''}{gap}</span>
}

function PosBadge({ pos }) {
  if (!pos) return null
  const colors = {
    QB: 'bg-red-500/20 text-red-400',
    RB: 'bg-blue-500/20 text-blue-400',
    WR: 'bg-emerald-500/20 text-emerald-400',
    TE: 'bg-orange/20 text-orange',
    K: 'bg-purple-500/20 text-purple-400',
    DEF: 'bg-yellow-500/20 text-yellow-400',
  }
  return <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${colors[pos] || 'bg-dark-tertiary/10 text-text-primary/40'}`}>{pos}</span>
}

export default function LabCheatSheet() {
  const { id } = useParams()
  const [sheet, setSheet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editedRankings, setEditedRankings] = useState(null)
  const [editedSettings, setEditedSettings] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.getCheatSheet(id)
      .then(res => setSheet(res.sheet))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const handlePublish = async () => {
    try {
      await api.publishCheatSheet(id)
      setSheet(prev => ({ ...prev, publishedAt: new Date().toISOString() }))
    } catch (err) {
      console.error('Publish failed:', err)
    }
  }

  const enterEdit = () => {
    const content = sheet.contentJson || {}
    setEditedRankings([...(content.overallRankings || [])])
    setEditedSettings({ ...(sheet.formatSettings || { showADP: true, showNotes: true, showTierBreaks: true }) })
    setEditMode(true)
  }

  const cancelEdit = () => {
    setEditedRankings(null)
    setEditedSettings(null)
    setEditMode(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Re-number ranks sequentially
      const renumbered = editedRankings.map((r, i) => ({ ...r, rank: i + 1 }))
      const updatedContent = { ...sheet.contentJson, overallRankings: renumbered }
      await api.updateCheatSheet(id, { contentJson: updatedContent, formatSettings: editedSettings })
      setSheet(prev => ({ ...prev, contentJson: updatedContent, formatSettings: editedSettings }))
      setEditMode(false)
      setEditedRankings(null)
      setEditedSettings(null)
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  const moveRow = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= editedRankings.length) return
    const next = [...editedRankings]
    ;[next[index], next[target]] = [next[target], next[index]]
    setEditedRankings(next)
  }

  const updateNote = (index, note) => {
    const next = [...editedRankings]
    next[index] = { ...next[index], note }
    setEditedRankings(next)
  }

  const hasChanges = editMode && editedRankings && (
    JSON.stringify(editedRankings) !== JSON.stringify(sheet.contentJson?.overallRankings || []) ||
    JSON.stringify(editedSettings) !== JSON.stringify(sheet.formatSettings || { showADP: true, showNotes: true, showTierBreaks: true })
  )

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !sheet) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center py-16 text-red-400 text-sm">{error || 'Sheet not found'}</div>
      </div>
    )
  }

  const { contentJson, board, formatSettings } = sheet
  const { overallRankings = [], tierBreaks = [], valuePicks = [], fades = [], positionTiers = {} } = contentJson || {}
  const settings = formatSettings || { showADP: true, showNotes: true, showTierBreaks: true }

  // Build tier break rank set for dividers
  const tierBreakRanks = new Set(tierBreaks.map(t => t.afterRank))

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 print:p-0 print:max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 print:mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/lab" className="text-text-primary/30 hover:text-text-primary/60 transition-colors print:hidden">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-display font-bold text-text-primary print:text-black">{sheet.title}</h1>
          </div>
          {board && (
            <div className="flex items-center gap-2 ml-8 print:ml-0">
              <span className="text-xs text-text-primary/30 print:text-gray-500">Generated from: {board.name}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                board.sport === 'nfl' ? 'bg-orange/20 text-orange print:bg-orange-100 print:text-orange-700' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {board.sport}
              </span>
              {board.scoringFormat && (
                <span className="px-1.5 py-0.5 bg-dark-tertiary/[0.04] rounded text-[9px] text-text-primary/40 print:bg-gray-100 print:text-gray-600">
                  {scoringLabel(board.scoringFormat)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 print:hidden">
          {editMode ? (
            <>
              <button
                onClick={cancelEdit}
                className="px-3 py-1.5 text-sm text-text-primary/50 border border-stone/30 rounded-lg hover:text-text-primary/70 hover:border-stone/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className="px-3 py-1.5 text-sm font-semibold bg-gold text-slate rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {saving && <div className="w-3.5 h-3.5 border-2 border-dark-primary/30 border-t-dark-primary rounded-full animate-spin" />}
                Save
              </button>
            </>
          ) : (
            <>
              <button
                onClick={enterEdit}
                className="px-3 py-1.5 text-sm text-text-primary/50 border border-stone/30 rounded-lg hover:text-text-primary/70 hover:border-stone/50 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 text-sm text-text-primary/50 border border-stone/30 rounded-lg hover:text-text-primary/70 hover:border-stone/50 transition-colors"
              >
                Export PDF
              </button>
              {!sheet.publishedAt && (
                <button
                  onClick={handlePublish}
                  className="px-3 py-1.5 text-sm font-semibold bg-gold text-slate rounded-lg hover:bg-gold/90 transition-colors"
                >
                  Publish to Prove It
                </button>
              )}
              {sheet.publishedAt && (
                <span className="px-3 py-1.5 text-sm text-emerald-400 border border-emerald-500/20 rounded-lg">Published</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Value Targets + Fades */}
      {(valuePicks.length > 0 || fades.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 print:mb-4">
          {/* Value targets */}
          {valuePicks.length > 0 && (
            <div className="p-4 bg-dark-secondary/60 border border-emerald-500/10 rounded-xl print:border-emerald-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400/60 mb-3 print:text-emerald-700">Your Value Targets</h3>
              <div className="space-y-1.5">
                {valuePicks.map(p => (
                  <div key={p.playerId} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <PosBadge pos={p.position} />
                      <span className="text-text-primary/70 print:text-black">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-primary/25 print:text-gray-400">ADP {p.adp}</span>
                      <span className="text-xs text-text-primary/25 print:text-gray-400">You: #{p.rank}</span>
                      <GapBadge gap={p.gap} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fades */}
          {fades.length > 0 && (
            <div className="p-4 bg-dark-secondary/60 border border-red-500/10 rounded-xl print:border-red-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-400/60 mb-3 print:text-red-700">Your Biggest Fades</h3>
              <div className="space-y-1.5">
                {fades.map(p => (
                  <div key={p.playerId} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <PosBadge pos={p.position} />
                      <span className="text-text-primary/70 print:text-black">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-primary/25 print:text-gray-400">ADP {p.adp}</span>
                      <span className="text-xs text-text-primary/25 print:text-gray-400">You: #{p.rank}</span>
                      <GapBadge gap={p.gap} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Column Toggles (edit mode only) */}
      {editMode && editedSettings && (
        <div className="flex items-center gap-4 mb-3 px-1">
          <span className="text-xs font-bold text-text-primary/30 uppercase tracking-wider">Show columns:</span>
          {[
            { key: 'showADP', label: 'ADP' },
            { key: 'showNotes', label: 'Notes' },
            { key: 'showTierBreaks', label: 'Tier Breaks' },
          ].map(col => (
            <label key={col.key} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={editedSettings[col.key] ?? true}
                onChange={e => setEditedSettings(prev => ({ ...prev, [col.key]: e.target.checked }))}
                className="w-3.5 h-3.5 rounded border-stone/50 bg-dark-secondary text-gold focus:ring-gold/30"
              />
              <span className="text-xs text-text-primary/50">{col.label}</span>
            </label>
          ))}
        </div>
      )}

      {/* Overall Rankings Table */}
      {(() => {
        const displayRankings = editMode && editedRankings ? editedRankings : overallRankings
        const displaySettings = editMode && editedSettings ? editedSettings : settings
        const colCount = 4 + (displaySettings.showADP ? 1 : 0) + 1 + (displaySettings.showNotes ? 1 : 0) + (editMode ? 1 : 0)
        return (
          <div className="bg-dark-secondary/60 border border-[var(--card-border)] rounded-xl overflow-hidden print:border-gray-200 mb-6">
            <div className="p-4 border-b border-[var(--card-border)] print:border-gray-200">
              <h3 className="text-sm font-bold text-text-primary print:text-black">Overall Rankings</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-text-primary/30 print:text-gray-500 border-b border-[var(--card-border)]">
                    <th className="px-4 py-2 w-12">#</th>
                    <th className="px-4 py-2">Player</th>
                    <th className="px-4 py-2 w-16">Pos</th>
                    <th className="px-4 py-2 w-16">Team</th>
                    {displaySettings.showADP && <th className="px-4 py-2 w-16 text-right">ADP</th>}
                    <th className="px-4 py-2 w-16 text-right">Gap</th>
                    {displaySettings.showNotes && <th className="px-4 py-2">Note</th>}
                    {editMode && <th className="px-4 py-2 w-20"></th>}
                  </tr>
                </thead>
                <tbody>
                  {displayRankings.map((r, i) => (
                    <React.Fragment key={r.playerId}>
                      {displaySettings.showTierBreaks && i > 0 && tierBreakRanks.has(displayRankings[i - 1].rank) && (
                        <tr>
                          <td colSpan={colCount} className="px-4 py-1">
                            <div className="border-t-2 border-gold/20 print:border-gold" />
                            <span className="text-[9px] font-bold uppercase text-gold/40 print:text-gold">Tier {r.tier}</span>
                          </td>
                        </tr>
                      )}
                      <tr className="border-b border-white/[0.03] hover:bg-dark-tertiary/[0.02] print:border-gray-100">
                        <td className="px-4 py-2 text-text-primary/30 print:text-gray-400 font-mono">{i + 1}</td>
                        <td className="px-4 py-2 text-text-primary print:text-black font-medium">{r.name}</td>
                        <td className="px-4 py-2"><PosBadge pos={r.position} /></td>
                        <td className="px-4 py-2 text-text-primary/40 print:text-gray-500">{r.team || ''}</td>
                        {displaySettings.showADP && <td className="px-4 py-2 text-right text-text-primary/30 print:text-gray-400">{r.adp || '—'}</td>}
                        <td className="px-4 py-2 text-right"><GapBadge gap={r.gap} /></td>
                        {displaySettings.showNotes && (
                          <td className="px-4 py-2 text-text-primary/25 print:text-gray-400 text-xs max-w-[200px]">
                            {editMode ? (
                              <input
                                type="text"
                                value={r.note || ''}
                                onChange={e => updateNote(i, e.target.value)}
                                placeholder="Add note..."
                                className="w-full bg-transparent border-b border-stone/30 focus:border-gold/40 text-text-primary/60 text-xs outline-none py-0.5 placeholder-white/15"
                              />
                            ) : (
                              <span className="truncate block">{r.note || ''}</span>
                            )}
                          </td>
                        )}
                        {editMode && (
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => moveRow(i, -1)}
                                disabled={i === 0}
                                className="p-1 text-text-primary/30 hover:text-text-primary/70 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                title="Move up"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => moveRow(i, 1)}
                                disabled={i === displayRankings.length - 1}
                                className="p-1 text-text-primary/30 hover:text-text-primary/70 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                title="Move down"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* Position Tiers Quick Reference */}
      {Object.keys(positionTiers).length > 0 && (
        <div className="bg-dark-secondary/60 border border-[var(--card-border)] rounded-xl p-4 print:border-gray-200">
          <h3 className="text-sm font-bold text-text-primary print:text-black mb-4">Position Tiers Quick Reference</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(positionTiers).map(([pos, tiers]) => (
              <div key={pos}>
                <h4 className="text-xs font-bold text-text-primary/40 print:text-gray-500 mb-2"><PosBadge pos={pos} /></h4>
                {Object.entries(tiers).sort(([a], [b]) => Number(a) - Number(b)).map(([tier, players]) => (
                  <div key={tier} className="mb-2">
                    <span className="text-[9px] font-bold uppercase text-gold/40 print:text-gold">Tier {tier}</span>
                    <div className="space-y-0.5">
                      {players.map(p => (
                        <div key={p.playerId} className="flex items-center justify-between text-xs">
                          <span className="text-text-primary/60 print:text-gray-700">{p.name}</span>
                          <span className="text-text-primary/20 print:text-gray-400">#{p.rank}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .bg-dark-primary, .bg-dark-secondary, .bg-dark-secondary\\/60 { background: white !important; }
          nav, .print\\:hidden { display: none !important; }
          * { color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  )
}
