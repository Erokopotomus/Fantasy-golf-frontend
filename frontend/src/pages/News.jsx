import { useState, useEffect, useCallback } from 'react'
import Card from '../components/common/Card'
import NewsCard from '../components/news/NewsCard'
import api from '../services/api'

const SPORT_TABS = [
  { id: 'all', label: 'All' },
  { id: 'nfl', label: 'NFL' },
  { id: 'golf', label: 'Golf' },
]

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'transaction', label: 'Transactions' },
  { id: 'injury', label: 'Injuries' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'news', label: 'General' },
]

const News = () => {
  const [sport, setSport] = useState('all')
  const [category, setCategory] = useState('all')
  const [articles, setArticles] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const LIMIT = 20

  const fetchNews = useCallback(async (resetOffset = false) => {
    setLoading(true)
    try {
      const newOffset = resetOffset ? 0 : offset
      const result = await api.getNews({
        sport: sport !== 'all' ? sport : undefined,
        category: category !== 'all' ? category : undefined,
        limit: LIMIT,
        offset: newOffset,
      })
      setArticles(resetOffset ? result.articles : [...articles, ...result.articles])
      setTotal(result.total)
      if (resetOffset) setOffset(0)
    } catch (err) {
      console.error('Failed to fetch news:', err)
    } finally {
      setLoading(false)
    }
  }, [sport, category, offset])

  useEffect(() => {
    fetchNews(true)
  }, [sport, category])

  const loadMore = () => {
    const newOffset = offset + LIMIT
    setOffset(newOffset)
  }

  useEffect(() => {
    if (offset > 0) fetchNews(false)
  }, [offset])

  const highPriority = articles.filter(a => a.priority === 1)
  const categoryCounts = articles.reduce((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + 1
    return acc
  }, {})

  return (
    <div className="min-h-screen">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold font-display text-text-primary">News</h1>
            <p className="text-text-secondary">
              Latest transactions, injuries, and analysis from across the sports world
            </p>
          </div>

          {/* Sport Toggle */}
          <div className="flex gap-1 bg-[var(--bg-alt)] rounded-lg p-1 w-fit">
            {SPORT_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setSport(tab.id)}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${
                  sport === tab.id
                    ? 'bg-gold/20 text-gold'
                    : 'text-text-primary/40 hover:text-text-primary/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* High Priority Alerts */}
          {highPriority.length > 0 && (
            <Card className="bg-gradient-to-r from-red-600/10 to-orange-600/10 border-red-500/30">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🚨</span>
                <h2 className="text-lg font-semibold font-display text-text-primary">Breaking</h2>
              </div>
              <div className="space-y-3">
                {highPriority.slice(0, 3).map(item => (
                  <NewsCard key={item.id} item={item} compact />
                ))}
              </div>
            </Card>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* News Feed - 2 columns */}
            <div className="lg:col-span-2">
              <Card padding="none">
                {/* Category Filter Pills */}
                <div className="border-b border-[var(--card-border)] px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_FILTERS.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setCategory(f.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          category === f.id
                            ? 'bg-gold/20 text-gold border border-gold/30'
                            : 'bg-[var(--bg-alt)] text-text-muted border border-transparent hover:text-text-primary'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* News List */}
                <div className="p-4">
                  {loading && articles.length === 0 ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="animate-pulse">
                          <div className="h-32 bg-[var(--stone)] rounded-lg"></div>
                        </div>
                      ))}
                    </div>
                  ) : articles.length === 0 ? (
                    <div className="text-center py-12 text-text-muted">
                      <p className="text-4xl mb-3">📰</p>
                      <p>No news available</p>
                      <p className="text-sm mt-1">Check back soon for the latest updates</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {articles.map(item => (
                        <NewsCard key={item.id} item={item} />
                      ))}
                      {articles.length < total && (
                        <button
                          onClick={loadMore}
                          disabled={loading}
                          className="w-full py-3 bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg text-text-secondary hover:text-text-primary hover:bg-[var(--surface-alt)] transition-colors text-sm font-medium"
                        >
                          {loading ? 'Loading...' : `Load More (${articles.length} of ${total})`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Category Summary */}
              <Card>
                <h3 className="text-lg font-semibold font-display text-text-primary mb-4">Categories</h3>
                <div className="space-y-3">
                  {[
                    { icon: '📋', label: 'Transactions', key: 'transaction', color: 'text-purple-400' },
                    { icon: '🏥', label: 'Injuries', key: 'injury', color: 'text-red-400' },
                    { icon: '📊', label: 'Analysis', key: 'analysis', color: 'text-indigo-400' },
                    { icon: '📰', label: 'General', key: 'news', color: 'text-blue-400' },
                  ].map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => setCategory(cat.key)}
                      className="flex items-center justify-between w-full hover:bg-[var(--surface-alt)] p-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cat.icon}</span>
                        <span className={`text-sm ${category === cat.key ? cat.color : 'text-text-secondary'}`}>
                          {cat.label}
                        </span>
                      </div>
                      <span className="text-text-primary font-medium text-sm">
                        {categoryCounts[cat.key] || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </Card>

              {/* Total Count */}
              <Card>
                <div className="text-center">
                  <p className="text-3xl font-bold text-text-primary">{total}</p>
                  <p className="text-text-muted text-sm">Total Articles</p>
                </div>
              </Card>

              {/* Refresh Button */}
              <button
                onClick={() => fetchNews(true)}
                className="w-full py-3 bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg text-text-secondary hover:text-text-primary hover:bg-[var(--surface-alt)] transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh News
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default News
