import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import FeedList from '../components/feed/FeedList'

const quickLinks = [
  {
    label: 'Players',
    href: '/nfl/players',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    label: 'Leaderboards',
    href: '/nfl/leaderboards',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    label: 'Teams',
    href: '/nfl/teams',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    label: 'Schedule',
    href: '/nfl/schedule',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'Compare',
    href: '/nfl/compare',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
]

const NflHub = () => {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getFeed('nfl', { limit: 8 })
      .then(data => setCards(data.cards || []))
      .catch(() => setCards([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange/20 flex items-center justify-center">
                <span className="text-lg">🏈</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
                NFL
              </h1>
            </div>
            <p className="text-text-secondary text-sm sm:text-base max-w-xl">
              Player stats, team breakdowns, leaderboards, and weekly highlights — all powered by Clutch data.
            </p>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-10">
            {quickLinks.map(link => (
              <Link
                key={link.href}
                to={link.href}
                className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-white/[0.08] hover:border-orange/30 transition-all group"
              >
                <div className="text-white/40 group-hover:text-orange transition-colors">
                  {link.icon}
                </div>
                <span className="text-white text-xs font-semibold">{link.label}</span>
              </Link>
            ))}
          </div>

          {/* Feed */}
          <div>
            <h2 className="text-lg font-display font-bold text-white mb-4">Latest</h2>
            <FeedList
              cards={cards}
              loading={loading}
              emptyMessage="No NFL updates yet. Check back during the season."
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default NflHub
