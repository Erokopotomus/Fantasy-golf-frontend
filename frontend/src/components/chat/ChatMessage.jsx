import { useAuth } from '../../context/AuthContext'

const ChatMessage = ({ message }) => {
  const { user } = useAuth()
  const isOwnMessage = message.userId === user?.id

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' +
        date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
        date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
  }

  // System message
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-4">
        <div className="px-4 py-2 bg-dark-tertiary rounded-full text-text-muted text-sm">
          {message.content}
        </div>
      </div>
    )
  }

  // Activity message (trade, waiver, lineup)
  if (message.type === 'activity') {
    const getActivityIcon = () => {
      switch (message.activityType) {
        case 'trade':
          return (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          )
        case 'waiver':
          return (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          )
        case 'lineup':
          return (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        default:
          return (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
      }
    }

    const getActivityColor = () => {
      switch (message.activityType) {
        case 'trade':
          return 'bg-purple-500/20 border-purple-500/30 text-purple-400'
        case 'waiver':
          return 'bg-orange/20 border-orange/30 text-orange'
        case 'lineup':
          return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
        default:
          return 'bg-dark-tertiary border-dark-border text-text-secondary'
      }
    }

    return (
      <div className="flex justify-center my-3">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${getActivityColor()}`}>
          {getActivityIcon()}
          <span className="text-sm">{message.content}</span>
          <span className="text-xs opacity-60">{formatTime(message.timestamp)}</span>
        </div>
      </div>
    )
  }

  // Regular user message
  return (
    <div className={`flex gap-3 mb-4 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`
        w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold
        ${isOwnMessage ? 'bg-gold text-white' : 'bg-dark-tertiary text-text-secondary'}
      `}>
        {message.userAvatar || message.userName?.charAt(0).toUpperCase() || '?'}
      </div>

      {/* Message content */}
      <div className={`flex flex-col max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
          <span className="text-sm font-medium text-white">
            {isOwnMessage ? 'You' : message.userName}
          </span>
          <span className="text-xs text-text-muted">{formatTime(message.timestamp)}</span>
        </div>
        <div className={`
          px-4 py-2 rounded-2xl
          ${isOwnMessage
            ? 'bg-gold text-white rounded-br-md'
            : 'bg-dark-tertiary text-text-primary rounded-bl-md'
          }
        `}>
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    </div>
  )
}

export default ChatMessage
