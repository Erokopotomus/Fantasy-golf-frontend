import { useNavigate } from 'react-router-dom'

const NewsCard = ({ item, compact = false }) => {
  const navigate = useNavigate()

  const getTypeConfig = (type) => {
    const configs = {
      injury: {
        icon: '🏥',
        label: 'Injury',
        bg: 'bg-red-500/20',
        border: 'border-red-500/30',
        text: 'text-red-400',
      },
      withdrawal: {
        icon: '⛔',
        label: 'Withdrawal',
        bg: 'bg-orange-500/20',
        border: 'border-orange-500/30',
        text: 'text-orange-400',
      },
      trending: {
        icon: '📈',
        label: 'Trending',
        bg: 'bg-blue-500/20',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
      },
      hot: {
        icon: '🔥',
        label: 'Hot',
        bg: 'bg-gold/20',
        border: 'border-gold/30',
        text: 'text-gold',
      },
      cold: {
        icon: '❄️',
        label: 'Cold',
        bg: 'bg-gold/20',
        border: 'border-gold/30',
        text: 'text-gold',
      },
      'course-fit': {
        icon: '⛳',
        label: 'Course Fit',
        bg: 'bg-purple-500/20',
        border: 'border-purple-500/30',
        text: 'text-purple-400',
      },
      'roster-alert': {
        icon: '⏰',
        label: 'Alert',
        bg: 'bg-yellow-500/20',
        border: 'border-yellow-500/30',
        text: 'text-yellow-400',
      },
      transaction: {
        icon: '📋',
        label: 'Transaction',
        bg: 'bg-purple-500/20',
        border: 'border-purple-500/30',
        text: 'text-purple-400',
      },
      breaking: {
        icon: '🚨',
        label: 'Breaking',
        bg: 'bg-red-600/20',
        border: 'border-red-600/30',
        text: 'text-red-400',
      },
      analysis: {
        icon: '📊',
        label: 'Analysis',
        bg: 'bg-indigo-500/20',
        border: 'border-indigo-500/30',
        text: 'text-indigo-400',
      },
      news: {
        icon: '📰',
        label: 'News',
        bg: 'bg-blue-500/20',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
      },
    }
    return configs[type] || configs.news
  }

  const getImpactStyle = (impact) => {
    if (impact === 'positive') return 'text-gold'
    if (impact === 'negative') return 'text-red-400'
    return 'text-text-muted'
  }

  const getPriorityIndicator = (priority) => {
    if (priority === 'high' || priority === 1) return 'border-l-4 border-l-red-500'
    if (priority === 'medium' || priority === 2) return 'border-l-4 border-l-yellow-500'
    return 'border-l-4 border-l-dark-border'
  }

  const formatTimeAgo = (timestamp) => {
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now - then
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const config = getTypeConfig(item.type || item.category)

  const handlePlayerClick = () => {
    if (item.playerId) {
      navigate(`/players/${item.playerId}`)
    } else if (item.playerIds?.length === 1) {
      navigate(`/nfl/players/${item.playerIds[0]}`)
    }
  }

  if (compact) {
    return (
      <div
        className={`
          p-3 bg-dark-secondary rounded-lg border border-dark-border
          ${getPriorityIndicator(item.priority)}
          hover:bg-dark-tertiary transition-colors cursor-pointer
        `}
        onClick={handlePlayerClick}
      >
        <div className="flex items-start gap-3">
          <span className={`text-lg ${config.text}`}>{config.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium line-clamp-2">{item.headline}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
              {item.playerFlag && <span>{item.playerFlag}</span>}
              <span>{formatTimeAgo(item.timestamp || item.published)}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`
        p-4 bg-dark-secondary rounded-lg border border-dark-border
        ${getPriorityIndicator(item.priority)}
        hover:bg-dark-tertiary transition-colors
      `}
    >
      {/* Header image */}
      {item.imageUrl && (
        <div className="mb-3 -mx-4 -mt-4 overflow-hidden rounded-t-lg">
          <img
            src={item.imageUrl}
            alt=""
            className="w-full h-40 object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
            ${config.bg} ${config.text}
          `}>
            <span>{config.icon}</span>
            <span>{config.label}</span>
          </span>
          {(item.priority === 'high' || item.priority === 1) && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
              Important
            </span>
          )}
        </div>
        <span className="text-xs text-text-muted whitespace-nowrap">
          {formatTimeAgo(item.timestamp || item.published)}
        </span>
      </div>

      {/* Player info (if applicable) */}
      {item.playerName && (
        <button
          onClick={handlePlayerClick}
          className="flex items-center gap-2 mb-2 hover:text-gold transition-colors"
        >
          <span className="text-lg">{item.playerFlag}</span>
          <span className="font-medium text-white">{item.playerName}</span>
        </button>
      )}

      {/* Content */}
      <h4 className="text-white font-semibold mb-2">{item.headline}</h4>
      {(item.summary || item.description) && (
        <p className="text-sm text-text-secondary mb-3 line-clamp-3">{item.summary || item.description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">
          {item.byline ? `via ${item.byline}` : item.source ? `Source: ${item.source}` : item.provider ? `via ${item.provider.toUpperCase()}` : ''}
        </span>
        <div className="flex items-center gap-3">
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:text-gold/80 font-medium transition-colors"
            >
              Read More →
            </a>
          )}
          {item.impact && (
            <span className={`font-medium ${getImpactStyle(item.impact)}`}>
              {item.impact === 'positive' && '↑ Positive'}
              {item.impact === 'negative' && '↓ Negative'}
              {item.impact === 'neutral' && '→ Neutral'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default NewsCard
