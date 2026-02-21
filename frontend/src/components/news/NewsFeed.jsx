import { useState } from 'react'
import Card from '../common/Card'
import NewsCard from './NewsCard'
import { useNews } from '../../hooks/useNews'

const NewsFeed = ({ limit, showFilters = true, compact = false, title = 'Player News' }) => {
  const [activeFilter, setActiveFilter] = useState('all')

  const filterOptions = activeFilter === 'all'
    ? { limit }
    : { type: activeFilter, limit }

  const { news, loading, error, refetch } = useNews(filterOptions)

  const filters = [
    { id: 'all', label: 'All', icon: '📰' },
    { id: 'injury', label: 'Injuries', icon: '🏥' },
    { id: 'trending', label: 'Trending', icon: '📈' },
    { id: 'hot', label: 'Hot', icon: '🔥' },
    { id: 'cold', label: 'Cold', icon: '❄️' },
  ]

  if (loading) {
    return (
      <Card>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-dark-tertiary rounded w-1/3"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-dark-tertiary rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <div className="p-6 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="text-gold hover:underline"
          >
            Try again
          </button>
        </div>
      </Card>
    )
  }

  return (
    <Card padding="none">
      {/* Header */}
      <div className="p-4 border-b border-dark-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold font-display text-text-primary">{title}</h3>
          <button
            onClick={refetch}
            className="text-text-muted hover:text-text-primary transition-colors"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {filters.map(filter => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                  whitespace-nowrap transition-colors
                  ${activeFilter === filter.id
                    ? 'bg-gold text-text-primary'
                    : 'bg-dark-tertiary text-text-muted hover:bg-dark-border hover:text-text-primary'
                  }
                `}
              >
                <span>{filter.icon}</span>
                <span>{filter.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* News List */}
      <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
        {news.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <p>No news available</p>
          </div>
        ) : (
          news.map(item => (
            <NewsCard key={item.id} item={item} compact={compact} />
          ))
        )}
      </div>
    </Card>
  )
}

export default NewsFeed
