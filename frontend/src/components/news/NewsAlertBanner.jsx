import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHighPriorityNews } from '../../hooks/useNews'

const NewsAlertBanner = () => {
  const navigate = useNavigate()
  const { news, loading } = useHighPriorityNews()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (news.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % news.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [news.length])

  if (loading || news.length === 0 || !isVisible) return null

  const currentNews = news[currentIndex]

  const getTypeIcon = (type) => {
    const icons = {
      injury: '🏥',
      withdrawal: '⛔',
      'roster-alert': '⏰',
    }
    return icons[type] || '📢'
  }

  return (
    <div className="relative bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-lg p-3">
      {/* Close button */}
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 text-text-muted hover:text-text-primary transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-center gap-3 pr-6">
        {/* Type indicator */}
        <span className="text-xl animate-pulse">
          {getTypeIcon(currentNews.type)}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {currentNews.playerFlag && (
              <span>{currentNews.playerFlag}</span>
            )}
            <p className="text-sm font-medium text-text-primary truncate">
              {currentNews.headline}
            </p>
          </div>
          <p className="text-xs text-text-secondary truncate mt-0.5">
            {currentNews.summary}
          </p>
        </div>

        {/* Navigation dots */}
        {news.length > 1 && (
          <div className="flex gap-1">
            {news.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  idx === currentIndex ? 'bg-dark-tertiary' : 'bg-dark-tertiary/30'
                }`}
              />
            ))}
          </div>
        )}

        {/* View all link */}
        <button
          onClick={() => navigate('/news')}
          className="text-xs text-gold hover:underline whitespace-nowrap"
        >
          View all
        </button>
      </div>
    </div>
  )
}

export default NewsAlertBanner
