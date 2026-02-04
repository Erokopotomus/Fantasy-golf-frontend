import { useState } from 'react'

const ActivityFeed = ({ activity, loading }) => {
  const [expandedId, setExpandedId] = useState(null)

  const formatTimeAgo = (timestamp) => {
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now - then
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return then.toLocaleDateString()
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'trade':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        )
      case 'pickup':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        )
      case 'drop':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        )
      case 'score':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )
      case 'lineup':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        )
      case 'join':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const getActivityColor = (type) => {
    switch (type) {
      case 'trade': return 'bg-purple-500/20 text-purple-400'
      case 'pickup': return 'bg-accent-green/20 text-accent-green'
      case 'drop': return 'bg-red-500/20 text-red-400'
      case 'score': return 'bg-yellow-500/20 text-yellow-400'
      case 'lineup': return 'bg-accent-blue/20 text-accent-blue'
      case 'join': return 'bg-cyan-500/20 text-cyan-400'
      default: return 'bg-dark-tertiary text-text-secondary'
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 bg-dark-tertiary rounded-full flex-shrink-0" />
            <div className="flex-1">
              <div className="h-4 bg-dark-tertiary rounded w-3/4 mb-2" />
              <div className="h-3 bg-dark-tertiary rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!activity || activity.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-text-muted text-sm">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
      {activity.map((item) => (
        <div
          key={item.id}
          className={`flex gap-3 p-2 rounded-lg transition-colors cursor-pointer hover:bg-dark-tertiary ${
            expandedId === item.id ? 'bg-dark-tertiary' : ''
          }`}
          onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(item.type)}`}>
            {getActivityIcon(item.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-white text-sm">
                  <span className="font-medium">{item.user.name}</span>
                </p>
                <p className="text-text-secondary text-xs truncate">
                  {item.description}
                </p>
              </div>
              <span className="text-text-muted text-xs flex-shrink-0">
                {formatTimeAgo(item.timestamp)}
              </span>
            </div>
            {expandedId === item.id && (
              <div className="mt-2 pt-2 border-t border-dark-border">
                <p className="text-text-muted text-xs">
                  League: <span className="text-text-secondary">{item.league}</span>
                </p>
                {item.players && item.players.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.players.map((player, idx) => (
                      <span key={idx} className="text-xs bg-dark-primary px-2 py-0.5 rounded text-accent-green">
                        {player}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default ActivityFeed
