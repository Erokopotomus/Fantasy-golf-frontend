import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

const ACTION_CONFIG = {
  board_created:  { icon: '\u2795', label: 'Created board', color: 'text-gold' },
  player_moved:   { icon: '\u21C5', label: 'Moved', color: 'text-blue-400' },
  player_tagged:  { icon: '\uD83C\uDFF7\uFE0F', label: 'Tagged', color: 'text-emerald-400' },
  note_added:     { icon: '\uD83D\uDCDD', label: 'Note added', color: 'text-gold' },
  player_added:   { icon: '\u2B06', label: 'Added', color: 'text-emerald-400' },
  player_removed: { icon: '\u2B07', label: 'Removed', color: 'text-red-400' },
  manual_entry:   { icon: '\uD83D\uDCD3', label: 'Journal Entry', color: 'text-purple-400' },
}

const TAG_LABELS = {
  target: 'Target',
  sleeper: 'Sleeper',
  avoid: 'Avoid',
}

const CHIP_LABELS = {
  schedule_upgrade: 'Schedule \u2191', volume_increase: 'Volume \u2191', less_competition: 'Less Competition',
  contract_year: 'Contract Year', oline_upgrade: 'O-Line \u2191', target_share_up: 'Target Share \u2191',
  breakout: 'Breakout', game_script_up: 'Game Script \u2191',
  age_decline: 'Age Decline', injury_risk: 'Injury Risk', more_competition: 'More Competition',
  schedule_downgrade: 'Schedule \u2193', oline_downgrade: 'O-Line \u2193', regression: 'Regression',
  scheme_downgrade: 'Scheme \u2193',
  gut_feel: 'Gut Feel', podcast_show: 'Podcast/Show', article: 'Article',
  game_film: 'Game Film', stat_model: 'Stat Model',
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTime(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function DecisionJournal() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [sportFilter, setSportFilter] = useState(null)
  const [showNewEntry, setShowNewEntry] = useState(false)
  const [entryContent, setEntryContent] = useState('')
  const [entryBoardId, setEntryBoardId] = useState('')
  const [entryPlayerName, setEntryPlayerName] = useState('')
  const [boards, setBoards] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    api.getDraftBoards().then(data => setBoards(data.boards || [])).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    api.getDecisionJournal({ sport: sportFilter, limit: 200 })
      .then(data => { setActivities(data.activities || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [sportFilter, refreshKey])

  const handleSubmitEntry = async () => {
    if (!entryContent.trim() || submitting) return
    setSubmitting(true)
    try {
      await api.createJournalEntry({
        content: entryContent.trim(),
        boardId: entryBoardId || undefined,
        playerName: entryPlayerName.trim() || undefined,
      })
      setEntryContent('')
      setEntryBoardId('')
      setEntryPlayerName('')
      setShowNewEntry(false)
      setRefreshKey(k => k + 1)
    } catch (err) {
      console.error('Failed to create journal entry:', err)
    } finally {
      setSubmitting(false)
    }
  }

  // Group by date
  const grouped = {}
  for (const a of activities) {
    const dateKey = formatDate(a.createdAt)
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(a)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Decision Journal</h1>
          <p className="text-xs text-text-primary/40 mt-0.5">Your board activity history</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewEntry(prev => !prev)}
            className="px-3 py-1.5 text-xs font-semibold bg-gold/15 text-gold border border-gold/30 rounded-lg hover:bg-gold/25 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Entry
          </button>
          <Link to="/lab" className="text-xs text-gold hover:underline">The Lab</Link>
        </div>
      </div>

      {/* New Entry Form */}
      {showNewEntry && (
        <div className="mb-4 p-4 bg-[var(--surface)] border border-purple-500/20 rounded-xl">
          <textarea
            autoFocus
            value={entryContent}
            onChange={e => setEntryContent(e.target.value)}
            placeholder="What's your take? A draft strategy thought, trade idea, player insight..."
            rows={3}
            className="w-full px-3 py-2 text-sm bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg text-text-primary placeholder-text-muted outline-none focus:border-gold/50 resize-none"
          />
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <select
              value={entryBoardId}
              onChange={e => setEntryBoardId(e.target.value)}
              className="px-2 py-1.5 text-xs bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg text-text-primary/60 outline-none focus:border-gold/50"
            >
              <option value="">No board (general)</option>
              {boards.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.sport})</option>
              ))}
            </select>
            <input
              value={entryPlayerName}
              onChange={e => setEntryPlayerName(e.target.value)}
              placeholder="Player name (optional)"
              className="px-2 py-1.5 text-xs bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg text-text-primary/60 placeholder-text-muted outline-none focus:border-gold/50 w-40"
            />
            <div className="flex-1" />
            <button
              onClick={() => { setShowNewEntry(false); setEntryContent(''); setEntryBoardId(''); setEntryPlayerName('') }}
              className="px-3 py-1.5 text-xs text-text-primary/40 hover:text-text-primary/60 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitEntry}
              disabled={!entryContent.trim() || submitting}
              className="px-4 py-1.5 text-xs font-semibold bg-gold text-slate rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </div>
      )}

      {/* Sport filter */}
      <div className="flex gap-2 mb-4">
        {[
          { key: null, label: 'All Sports' },
          { key: 'nfl', label: 'NFL' },
          { key: 'golf', label: 'Golf' },
        ].map(f => (
          <button
            key={f.key || 'all'}
            onClick={() => setSportFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
              ${sportFilter === f.key ? 'bg-gold/15 text-gold border border-gold/30' : 'text-text-primary/40 border border-[var(--card-border)] hover:border-stone/50'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-text-primary/40">No board activity yet</p>
          <p className="text-xs text-text-primary/25 mt-1">Create a board and start ranking players to build your journal</p>
          <Link to="/lab" className="inline-block mt-3 text-xs text-gold hover:underline">Go to The Lab</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-primary/30 mb-2">{date}</h3>
              <div className="space-y-1">
                {items.map(a => {
                  const cfg = ACTION_CONFIG[a.action] || { icon: '\u2022', label: a.action, color: 'text-text-primary/50' }
                  const details = a.details || {}
                  return (
                    <div key={a.id} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-alt)] transition-colors">
                      <span className={`text-sm shrink-0 mt-0.5 ${cfg.color}`}>{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-primary/80">
                          {a.action === 'board_created' && (
                            <>Created board <span className="text-text-primary font-medium">"{details.name}"</span> from {details.startFrom || 'scratch'}</>
                          )}
                          {a.action === 'player_moved' && (
                            <>
                              Moved <span className="text-text-primary font-medium">{details.playerName}</span>{' '}
                              <span className={details.delta > 0 ? 'text-emerald-400' : 'text-red-400'}>
                                {details.delta > 0 ? `\u2191${details.delta}` : `\u2193${Math.abs(details.delta)}`} spots
                              </span>
                              {' '}(#{details.from} {'\u2192'} #{details.to})
                            </>
                          )}
                          {a.action === 'player_tagged' && (
                            <>
                              Tagged <span className="text-text-primary font-medium">{details.playerName}</span>{' '}
                              {(details.tags || []).map(t => (
                                <span key={t} className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ml-1
                                  ${t === 'target' ? 'bg-emerald-500/20 text-emerald-400' : t === 'sleeper' ? 'bg-gold/20 text-gold' : 'bg-red-500/20 text-red-400'}`}>
                                  {TAG_LABELS[t] || t}
                                </span>
                              ))}
                            </>
                          )}
                          {a.action === 'note_added' && (
                            <>
                              Note on <span className="text-text-primary font-medium">{details.playerName}</span>
                              {details.note && <span className="text-text-primary/40">: "{details.note}"</span>}
                            </>
                          )}
                          {a.action === 'player_added' && (
                            <>Added <span className="text-text-primary font-medium">{details.playerName}</span> at #{details.rank}</>
                          )}
                          {a.action === 'player_removed' && (
                            <>Removed <span className="text-text-primary font-medium">{details.playerName}</span> from #{details.rank}</>
                          )}
                          {a.action === 'manual_entry' && (
                            <>
                              {details.playerName && <><span className="text-text-primary font-medium">{details.playerName}</span> — </>}
                              <span className="text-text-primary/60">{details.content}</span>
                            </>
                          )}
                        </p>
                        {/* Reason chips inline */}
                        {details.reasonChips?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {details.reasonChips.map(c => (
                              <span key={c} className="px-1.5 py-0.5 rounded-full text-[9px] font-medium border border-[var(--card-border)] text-text-primary/40">
                                {CHIP_LABELS[c] || c}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-text-primary/20">{formatTime(a.createdAt)}</span>
                          {a.board && <span className="text-[10px] text-text-primary/20">{a.board.name}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
