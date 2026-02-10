import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import FeedList from '../components/feed/FeedList'

const quickLinks = [
  {
    label: 'Players',
    href: '/players',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    label: 'Tournaments',
    href: '/tournaments',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'Courses',
    href: '/courses',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

const GolfHub = () => {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getFeed('golf', { limit: 8 })
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
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <span className="text-lg">⛳</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
                Golf
              </h1>
            </div>
            <p className="text-text-secondary text-sm sm:text-base max-w-xl">
              Tournament updates, player profiles, and course breakdowns — your golf research hub.
            </p>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-3 gap-3 mb-10">
            {quickLinks.map(link => (
              <Link
                key={link.href}
                to={link.href}
                className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-white/[0.08] hover:border-emerald-500/30 transition-all group"
              >
                <div className="text-white/40 group-hover:text-emerald-400 transition-colors">
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
              emptyMessage="No golf updates yet. Check back when tournaments are in progress."
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default GolfHub
