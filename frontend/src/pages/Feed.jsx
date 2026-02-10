import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import FeedCard from '../components/feed/FeedCard'

const SPORTS = [
  { key: 'all', label: 'All' },
  { key: 'nfl', label: 'NFL', color: 'orange' },
  { key: 'golf', label: 'Golf', color: 'emerald-400' },
]

const Feed = () => {
  const [sport, setSport] = useState('all')
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [limit] = useState(20)

  useEffect(() => {
    setLoading(true)
    api.getFeed(sport, { limit })
      .then(data => {
        setCards(data.cards || [])
        setTotal(data.total || 0)
      })
      .catch(() => setCards([]))
      .finally(() => setLoading(false))
  }, [sport, limit])

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
                Feed
              </h1>
              <p className="text-text-secondary text-sm mt-1">
                Auto-generated insights from Clutch data
              </p>
            </div>
          </div>

          {/* Sport Toggle */}
          <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1 mb-6 w-fit">
            {SPORTS.map(s => (
              <button
                key={s.key}
                onClick={() => setSport(s.key)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  sport === s.key
                    ? 'bg-gold/20 text-gold'
                    : 'text-white/30 hover:text-white/60'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Cards */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 animate-pulse">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-white/10" />
                    <div className="h-3 w-20 bg-white/10 rounded" />
                  </div>
                  <div className="h-4 w-3/4 bg-white/10 rounded mb-2" />
                  <div className="h-3 w-full bg-white/10 rounded mb-1" />
                  <div className="h-3 w-2/3 bg-white/10 rounded mb-3" />
                  <div className="h-3 w-16 bg-white/10 rounded" />
                </div>
              ))}
            </div>
          ) : cards.length > 0 ? (
            <div className="space-y-3">
              {cards.map(card => (
                <FeedCard key={card.id} card={card} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-white/[0.04] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <p className="text-white/30 text-sm mb-2">No updates for {sport === 'all' ? 'any sport' : sport.toUpperCase()} yet.</p>
              <p className="text-white/20 text-xs">Feed cards are generated from game results, stat leaders, and tournament data.</p>
            </div>
          )}

          {/* Footer links to hubs */}
          <div className="mt-8 flex items-center justify-center gap-6">
            <Link to="/nfl" className="text-orange text-xs font-semibold hover:text-orange/80 transition-colors flex items-center gap-1">
              NFL Hub
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link to="/golf" className="text-emerald-400 text-xs font-semibold hover:text-emerald-400/80 transition-colors flex items-center gap-1">
              Golf Hub
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Feed
