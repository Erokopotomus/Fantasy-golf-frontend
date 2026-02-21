import { useState, useEffect, useRef } from 'react'
import api from '../../services/api'
import { detectPlayers } from '../../utils/playerDetect'

const SOURCE_TYPES = [
  { value: 'podcast', label: 'Podcast' },
  { value: 'article', label: 'Article' },
  { value: 'stats', label: 'Stats' },
  { value: 'conversation', label: 'Conversation' },
  { value: 'gut_feel', label: 'Gut Feel' },
  { value: 'other', label: 'Other' },
]

const SENTIMENTS = [
  { value: 'bullish', label: 'Bullish', icon: '↑', color: 'emerald' },
  { value: 'bearish', label: 'Bearish', icon: '↓', color: 'red' },
  { value: 'neutral', label: 'Neutral', icon: '–', color: 'white' },
]

export default function CaptureFormModal({ onClose, onSuccess, initialPlayerTags }) {
  const [content, setContent] = useState('')
  const [sourceType, setSourceType] = useState(null)
  const [sourceName, setSourceName] = useState('')
  const [sentiment, setSentiment] = useState(null)
  const [playerTags, setPlayerTags] = useState(initialPlayerTags || []) // [{ id, name, autoDetected }]
  const [saving, setSaving] = useState(false)

  // Player cache for detection
  const playerCacheRef = useRef(null)
  const [playerSearchOpen, setPlayerSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])

  // Load player cache on mount
  useEffect(() => {
    async function loadPlayers() {
      try {
        const [nflRes, golfRes] = await Promise.all([
          api.getNflPlayers({ limit: 500 }).catch(() => ({ players: [] })),
          api.getPlayers({ limit: 300, search: '' }).catch(() => ({ players: [] })),
        ])
        const all = []
        const seen = new Set()
        for (const p of (nflRes.players || [])) {
          if (!seen.has(p.id)) { seen.add(p.id); all.push({ id: p.id, name: p.name }) }
        }
        for (const p of (golfRes.players || [])) {
          if (!seen.has(p.id)) { seen.add(p.id); all.push({ id: p.id, name: p.name }) }
        }
        playerCacheRef.current = all
      } catch (err) {
        console.error('Failed to load player cache:', err)
        playerCacheRef.current = []
      }
    }
    loadPlayers()
  }, [])

  // Auto-detect players as user types
  useEffect(() => {
    if (!content || !playerCacheRef.current) return
    const timer = setTimeout(() => {
      const detected = detectPlayers(content, playerCacheRef.current)
      // Merge with existing manual tags (keep manual, add new auto-detected)
      setPlayerTags(prev => {
        const manualIds = new Set(prev.filter(p => !p.autoDetected).map(p => p.id))
        const prevAutoIds = new Set(prev.filter(p => p.autoDetected).map(p => p.id))
        const next = [...prev.filter(p => !p.autoDetected)] // keep manual tags
        for (const d of detected) {
          if (!manualIds.has(d.id)) next.push(d) // add auto-detected
        }
        return next
      })
    }, 500) // debounce 500ms
    return () => clearTimeout(timer)
  }, [content])

  // Player search
  useEffect(() => {
    if (!searchQuery.trim() || !playerCacheRef.current) {
      setSearchResults([])
      return
    }
    const lower = searchQuery.toLowerCase()
    const tagIds = new Set(playerTags.map(p => p.id))
    const filtered = playerCacheRef.current
      .filter(p => p.name.toLowerCase().includes(lower) && !tagIds.has(p.id))
      .slice(0, 8)
    setSearchResults(filtered)
  }, [searchQuery, playerTags])

  const removeTag = (id) => {
    setPlayerTags(prev => prev.filter(p => p.id !== id))
  }

  const addManualTag = (player) => {
    setPlayerTags(prev => [...prev, { id: player.id, name: player.name, autoDetected: false }])
    setSearchQuery('')
    setPlayerSearchOpen(false)
  }

  const handleSubmit = async () => {
    if (!content.trim() || saving) return
    setSaving(true)
    try {
      await api.createCapture({
        content: content.trim(),
        sourceType,
        sourceName: sourceName.trim() || undefined,
        sentiment,
        playerIds: playerTags.map(p => ({ id: p.id, autoDetected: p.autoDetected })),
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Save capture failed:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-dark-secondary border border-[var(--card-border)] rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--card-border)] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Quick Capture</h2>
          <button onClick={onClose} className="text-text-primary/30 hover:text-text-primary/60 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Textarea */}
          <div>
            <textarea
              autoFocus
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="What's on your mind? A podcast take, gut feeling, stat insight..."
              maxLength={2000}
              rows={4}
              className="w-full px-3 py-2.5 text-sm bg-dark-primary border border-[var(--card-border)] rounded-lg text-text-primary placeholder-text-muted outline-none focus:border-gold/50 resize-none"
            />
            <div className="flex justify-end mt-1">
              <span className={`text-[10px] ${content.length > 1800 ? 'text-orange' : 'text-text-primary/20'}`}>
                {content.length}/2000
              </span>
            </div>
          </div>

          {/* Player tags */}
          {playerTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {playerTags.map(p => (
                <span
                  key={p.id}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                    p.autoDetected ? 'bg-gold/15 text-gold border border-gold/20' : 'bg-dark-tertiary/10 text-text-primary/70 border border-stone/40'
                  }`}
                >
                  {p.name}
                  <button onClick={() => removeTag(p.id)} className="hover:text-red-400 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add player search */}
          <div className="relative">
            {playerSearchOpen ? (
              <div>
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search player name..."
                  className="w-full px-3 py-2 text-sm bg-dark-primary border border-gold/30 rounded-lg text-text-primary placeholder-text-muted outline-none"
                  onKeyDown={e => { if (e.key === 'Escape') { setPlayerSearchOpen(false); setSearchQuery('') } }}
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-dark-secondary border border-stone/30 rounded-lg overflow-hidden z-10 max-h-48 overflow-y-auto">
                    {searchResults.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addManualTag(p)}
                        className="w-full px-3 py-2 text-sm text-text-primary/70 hover:bg-dark-tertiary/[0.05] text-left transition-colors"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setPlayerSearchOpen(true)}
                className="text-xs text-gold/60 hover:text-gold transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add player
              </button>
            )}
          </div>

          {/* Source type pills */}
          <div>
            <label className="block text-xs font-medium text-text-primary/40 mb-2">Source</label>
            <div className="flex flex-wrap gap-1.5">
              {SOURCE_TYPES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setSourceType(sourceType === s.value ? null : s.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                    sourceType === s.value
                      ? 'border-gold/40 bg-gold/10 text-gold'
                      : 'border-[var(--card-border)] text-text-primary/30 hover:text-text-primary/50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Source name */}
          {sourceType && (
            <input
              value={sourceName}
              onChange={e => setSourceName(e.target.value)}
              placeholder={`e.g., "${sourceType === 'podcast' ? 'Fantasy Footballers Ep. 412' : sourceType === 'article' ? 'ESPN article on RB rankings' : 'Source details...'  }"`}
              className="w-full px-3 py-2 text-sm bg-dark-primary border border-[var(--card-border)] rounded-lg text-text-primary placeholder-text-muted outline-none focus:border-gold/50"
            />
          )}

          {/* Sentiment */}
          <div>
            <label className="block text-xs font-medium text-text-primary/40 mb-2">Sentiment</label>
            <div className="flex gap-2">
              {SENTIMENTS.map(s => (
                <button
                  key={s.value}
                  onClick={() => setSentiment(sentiment === s.value ? null : s.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    sentiment === s.value
                      ? s.color === 'emerald' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                        : s.color === 'red' ? 'border-red-500/40 bg-red-500/10 text-red-400'
                        : 'border-stone/60 bg-dark-tertiary/10 text-text-primary/70'
                      : 'border-[var(--card-border)] text-text-primary/30 hover:text-text-primary/50'
                  }`}
                >
                  <span>{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-primary/50 hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || saving}
              className="px-5 py-2 text-sm font-semibold bg-gold text-slate rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-dark-primary/30 border-t-dark-primary rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              Save to Lab
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
