import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'

function scoringLabel(fmt) {
  if (fmt === 'ppr') return 'PPR'
  if (fmt === 'half_ppr') return 'Half PPR'
  if (fmt === 'standard') return 'Standard'
  return fmt
}

function GapBadge({ gap }) {
  if (gap === null || gap === undefined) return <span className="text-white/15">—</span>
  const isValue = gap > 0
  const color = isValue ? 'text-emerald-400' : gap < 0 ? 'text-red-400' : 'text-white/30'
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
  return <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${colors[pos] || 'bg-white/10 text-white/40'}`}>{pos}</span>
}

export default function LabCheatSheet() {
  const { id } = useParams()
  const [sheet, setSheet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editMode, setEditMode] = useState(false)

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
            <Link to="/lab" className="text-white/30 hover:text-white/60 transition-colors print:hidden">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-display font-bold text-white print:text-black">{sheet.title}</h1>
          </div>
          {board && (
            <div className="flex items-center gap-2 ml-8 print:ml-0">
              <span className="text-xs text-white/30 print:text-gray-500">Generated from: {board.name}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                board.sport === 'nfl' ? 'bg-orange/20 text-orange print:bg-orange-100 print:text-orange-700' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {board.sport}
              </span>
              {board.scoringFormat && (
                <span className="px-1.5 py-0.5 bg-white/[0.04] rounded text-[9px] text-white/40 print:bg-gray-100 print:text-gray-600">
                  {scoringLabel(board.scoringFormat)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 text-sm text-white/50 border border-white/10 rounded-lg hover:text-white/70 hover:border-white/20 transition-colors"
          >
            Export PDF
          </button>
          {!sheet.publishedAt && (
            <button
              onClick={handlePublish}
              className="px-3 py-1.5 text-sm font-semibold bg-gold text-dark-primary rounded-lg hover:bg-gold/90 transition-colors"
            >
              Publish to Prove It
            </button>
          )}
          {sheet.publishedAt && (
            <span className="px-3 py-1.5 text-sm text-emerald-400 border border-emerald-500/20 rounded-lg">Published</span>
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
                      <span className="text-white/70 print:text-black">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/25 print:text-gray-400">ADP {p.adp}</span>
                      <span className="text-xs text-white/25 print:text-gray-400">You: #{p.rank}</span>
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
                      <span className="text-white/70 print:text-black">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/25 print:text-gray-400">ADP {p.adp}</span>
                      <span className="text-xs text-white/25 print:text-gray-400">You: #{p.rank}</span>
                      <GapBadge gap={p.gap} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overall Rankings Table */}
      <div className="bg-dark-secondary/60 border border-white/[0.06] rounded-xl overflow-hidden print:border-gray-200 mb-6">
        <div className="p-4 border-b border-white/[0.06] print:border-gray-200">
          <h3 className="text-sm font-bold text-white print:text-black">Overall Rankings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-white/30 print:text-gray-500 border-b border-white/[0.06]">
                <th className="px-4 py-2 w-12">#</th>
                <th className="px-4 py-2">Player</th>
                <th className="px-4 py-2 w-16">Pos</th>
                <th className="px-4 py-2 w-16">Team</th>
                {settings.showADP && <th className="px-4 py-2 w-16 text-right">ADP</th>}
                <th className="px-4 py-2 w-16 text-right">Gap</th>
                {settings.showNotes && <th className="px-4 py-2">Note</th>}
              </tr>
            </thead>
            <tbody>
              {overallRankings.map((r, i) => (
                <>
                  {settings.showTierBreaks && i > 0 && tierBreakRanks.has(overallRankings[i - 1].rank) && (
                    <tr key={`tier-${r.rank}`}>
                      <td colSpan={settings.showNotes ? 7 : 6} className="px-4 py-1">
                        <div className="border-t-2 border-gold/20 print:border-gold" />
                        <span className="text-[9px] font-bold uppercase text-gold/40 print:text-gold">Tier {r.tier}</span>
                      </td>
                    </tr>
                  )}
                  <tr key={r.playerId} className="border-b border-white/[0.03] hover:bg-white/[0.02] print:border-gray-100">
                    <td className="px-4 py-2 text-white/30 print:text-gray-400 font-mono">{r.rank}</td>
                    <td className="px-4 py-2 text-white print:text-black font-medium">{r.name}</td>
                    <td className="px-4 py-2"><PosBadge pos={r.position} /></td>
                    <td className="px-4 py-2 text-white/40 print:text-gray-500">{r.team || ''}</td>
                    {settings.showADP && <td className="px-4 py-2 text-right text-white/30 print:text-gray-400">{r.adp || '—'}</td>}
                    <td className="px-4 py-2 text-right"><GapBadge gap={r.gap} /></td>
                    {settings.showNotes && <td className="px-4 py-2 text-white/25 print:text-gray-400 text-xs truncate max-w-[200px]">{r.note || ''}</td>}
                  </tr>
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Position Tiers Quick Reference */}
      {Object.keys(positionTiers).length > 0 && (
        <div className="bg-dark-secondary/60 border border-white/[0.06] rounded-xl p-4 print:border-gray-200">
          <h3 className="text-sm font-bold text-white print:text-black mb-4">Position Tiers Quick Reference</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(positionTiers).map(([pos, tiers]) => (
              <div key={pos}>
                <h4 className="text-xs font-bold text-white/40 print:text-gray-500 mb-2"><PosBadge pos={pos} /></h4>
                {Object.entries(tiers).sort(([a], [b]) => Number(a) - Number(b)).map(([tier, players]) => (
                  <div key={tier} className="mb-2">
                    <span className="text-[9px] font-bold uppercase text-gold/40 print:text-gold">Tier {tier}</span>
                    <div className="space-y-0.5">
                      {players.map(p => (
                        <div key={p.playerId} className="flex items-center justify-between text-xs">
                          <span className="text-white/60 print:text-gray-700">{p.name}</span>
                          <span className="text-white/20 print:text-gray-400">#{p.rank}</span>
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
