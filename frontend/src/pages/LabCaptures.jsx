import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import CaptureFormModal from '../components/lab/CaptureFormModal'

const SOURCE_FILTERS = [
  { value: null, label: 'All' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'article', label: 'Article' },
  { value: 'stats', label: 'Stats' },
  { value: 'conversation', label: 'Conversation' },
  { value: 'gut_feel', label: 'Gut Feel' },
  { value: 'other', label: 'Other' },
]

const SENTIMENT_FILTERS = [
  { value: null, label: 'All' },
  { value: 'bullish', label: 'Bullish' },
  { value: 'bearish', label: 'Bearish' },
  { value: 'neutral', label: 'Neutral' },
]

function relativeTime(dateStr) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function sentimentBadge(s) {
  if (s === 'bullish') return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/15 text-emerald-400">Bullish</span>
  if (s === 'bearish') return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-500/15 text-red-400">Bearish</span>
  if (s === 'neutral') return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-white/10 text-white/40">Neutral</span>
  return null
}

function sourceBadge(type) {
  if (!type) return null
  const label = type === 'gut_feel' ? 'Gut Feel' : type.charAt(0).toUpperCase() + type.slice(1)
  return <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/[0.05] text-white/30">{label}</span>
}

function outcomeBadge(capture) {
  if (!capture.outcomeLinked || !capture.outcomeData) return null
  const players = capture.outcomeData.players || []
  if (players.length === 0) return null
  // Show verdict of the first player (most captures are single-player)
  const verdict = players[0].verdict
  if (verdict === 'CORRECT') return <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400">&#10003; You called it</span>
  if (verdict === 'INCORRECT') return <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/15 text-red-400">&#10007; Missed this one</span>
  if (verdict === 'TRENDING_CORRECT') return <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/15 text-orange-400">&#8599; Trending right</span>
  if (verdict === 'TRENDING_INCORRECT') return <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/15 text-orange-300">&#8600; Trending wrong</span>
  if (verdict === 'NOTED') return <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/[0.06] text-white/30">&#8212; Noted</span>
  return null
}

export default function LabCaptures() {
  const [captures, setCaptures] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sourceFilter, setSourceFilter] = useState(null)
  const [sentimentFilter, setSentimentFilter] = useState(null)
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const LIMIT = 20

  const loadCaptures = useCallback(async (reset = false) => {
    setLoading(true)
    try {
      const params = { limit: LIMIT, offset: reset ? 0 : offset }
      if (sourceFilter) params.sport = undefined // source type filter not sport filter
      if (sentimentFilter) params.sentiment = sentimentFilter
      if (search.trim()) params.search = search.trim()
      // We'll use the general captures endpoint; source type filtering is client-side for now
      const res = await api.getCaptures(params)
      if (reset) {
        setCaptures(res.captures || [])
        setOffset(LIMIT)
      } else {
        setCaptures(prev => [...prev, ...(res.captures || [])])
        setOffset(prev => prev + LIMIT)
      }
      setTotal(res.total || 0)
    } catch (err) {
      console.error('Failed to load captures:', err)
    } finally {
      setLoading(false)
    }
  }, [sourceFilter, sentimentFilter, search, offset])

  // Reset and reload when filters change
  useEffect(() => {
    setOffset(0)
    loadCaptures(true)
  }, [sourceFilter, sentimentFilter, search])

  const handleDelete = async (id) => {
    try {
      await api.deleteCapture(id)
      setCaptures(prev => prev.filter(c => c.id !== id))
      setTotal(prev => prev - 1)
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  // Client-side source type filter
  const filtered = sourceFilter
    ? captures.filter(c => c.sourceType === sourceFilter)
    : captures

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link to="/lab" className="text-white/30 hover:text-white/60 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-display font-bold text-white">Captures</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-white/[0.06] text-white/30 rounded">{total}</span>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-gold text-dark-primary text-sm font-semibold rounded-lg hover:bg-gold/90 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Capture
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-6">
        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search captures..."
          className="w-full px-3 py-2 text-sm bg-dark-secondary border border-white/[0.08] rounded-lg text-white placeholder-white/30 outline-none focus:border-gold/50"
        />

        {/* Source type pills */}
        <div className="flex flex-wrap gap-1.5">
          {SOURCE_FILTERS.map(f => (
            <button
              key={f.value || 'all'}
              onClick={() => setSourceFilter(f.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                sourceFilter === f.value
                  ? 'border-gold/40 bg-gold/10 text-gold'
                  : 'border-white/[0.06] text-white/30 hover:text-white/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sentiment pills */}
        <div className="flex gap-1.5">
          {SENTIMENT_FILTERS.map(f => (
            <button
              key={f.value || 'all'}
              onClick={() => setSentimentFilter(f.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                sentimentFilter === f.value
                  ? 'border-gold/40 bg-gold/10 text-gold'
                  : 'border-white/[0.06] text-white/30 hover:text-white/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Captures list */}
      {loading && captures.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-white/30">No captures yet — start jotting down your takes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.id} className="p-4 bg-dark-secondary/60 border border-white/[0.06] rounded-xl">
              {/* Content */}
              <p className="text-sm text-white/70 whitespace-pre-wrap mb-3">{c.content}</p>

              {/* Player tags */}
              {c.players && c.players.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {c.players.map(lp => (
                    <Link
                      key={lp.id}
                      to={lp.player?.nflPosition ? `/nfl/players/${lp.player.id}` : `/players/${lp.player?.id}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gold/10 text-gold/80 hover:bg-gold/20 transition-colors"
                    >
                      {lp.player?.name || 'Unknown'}
                    </Link>
                  ))}
                </div>
              )}

              {/* Meta row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {outcomeBadge(c)}
                  {sourceBadge(c.sourceType)}
                  {c.sourceName && <span className="text-[10px] text-white/20">{c.sourceName}</span>}
                  {sentimentBadge(c.sentiment)}
                  <span className="text-[10px] text-white/20">{relativeTime(c.createdAt)}</span>
                </div>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-white/15 hover:text-red-400 transition-colors"
                  title="Delete capture"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {/* Load more */}
          {filtered.length < total && (
            <div className="text-center py-4">
              <button
                onClick={() => loadCaptures(false)}
                disabled={loading}
                className="px-4 py-2 text-sm text-gold/60 hover:text-gold transition-colors"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CaptureFormModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setOffset(0); loadCaptures(true) }}
        />
      )}
    </div>
  )
}
