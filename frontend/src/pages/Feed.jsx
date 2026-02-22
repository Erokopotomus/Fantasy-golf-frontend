import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import FeedCard from '../components/feed/FeedCard'

const SPORTS = [
  { key: 'all', label: 'All' },
  { key: 'nfl', label: 'NFL', color: 'orange' },
  { key: 'golf', label: 'Golf', color: 'emerald-400' },
]

const QUICK_NAV = {
  all: [
    { label: 'NFL Hub', href: '/nfl' },
    { label: 'Golf Hub', href: '/golf' },
    { label: 'News', href: '/news' },
  ],
  nfl: [
    { label: 'Hub', href: '/nfl' },
    { label: 'Teams', href: '/nfl/teams' },
    { label: 'Players', href: '/nfl/players' },
    { label: 'Leaderboards', href: '/nfl/leaderboards' },
    { label: 'News', href: '/news' },
  ],
  golf: [
    { label: 'Hub', href: '/golf' },
    { label: 'Players', href: '/players' },
    { label: 'Tournaments', href: '/tournaments' },
    { label: 'News', href: '/news' },
  ],
}

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

  const quickLinks = QUICK_NAV[sport] || QUICK_NAV.all

  return (
    <div className="min-h-screen">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-text-primary tracking-tight">
                Feed
              </h1>
              <p className="text-text-secondary text-sm mt-1">
                Auto-generated insights from Clutch data
              </p>
            </div>
          </div>

          {/* Sport Toggle + Quick Nav */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Sport pills */}
            <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl p-1 shadow-sm">
              {SPORTS.map(s => (
                <button
                  key={s.key}
                  onClick={() => setSport(s.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    sport === s.key
                      ? 'bg-gold/20 text-gold'
                      : 'text-text-primary/30 hover:text-text-primary/60'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Contextual quick nav */}
            <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl p-1 shadow-sm">
              {quickLinks.map(link => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-text-primary/40 hover:text-text-primary hover:bg-[var(--surface-alt)] transition-all"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Cards */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl p-4 shadow-card animate-pulse">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--stone)]" />
                    <div className="h-3 w-20 bg-[var(--stone)] rounded" />
                  </div>
                  <div className="h-4 w-3/4 bg-[var(--stone)] rounded mb-2" />
                  <div className="h-3 w-full bg-[var(--stone)] rounded mb-1" />
                  <div className="h-3 w-2/3 bg-[var(--stone)] rounded mb-3" />
                  <div className="h-3 w-16 bg-[var(--stone)] rounded" />
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
              <div className="w-16 h-16 bg-[var(--surface-alt)] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-text-primary/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <p className="text-text-primary/30 text-sm mb-2">No updates for {sport === 'all' ? 'any sport' : sport.toUpperCase()} yet.</p>
              <p className="text-text-primary/20 text-xs">Feed cards are generated from game results, stat leaders, and tournament data.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Feed
