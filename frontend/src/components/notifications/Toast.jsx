import { useState, useEffect } from 'react'

const Toast = ({ notification, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false)
  const [isEntering, setIsEntering] = useState(true)

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setIsEntering(false), 50)
    return () => clearTimeout(enterTimer)
  }, [])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => onDismiss(notification.id), 300)
  }

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      case 'trade':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        )
      case 'draft':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        )
      case 'lineup':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'news':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const getStyles = () => {
    switch (notification.type) {
      case 'success':
        return {
          bg: 'bg-accent-green/10 border-accent-green/50',
          icon: 'bg-accent-green/20 text-accent-green',
          title: 'text-accent-green',
        }
      case 'error':
        return {
          bg: 'bg-red-500/10 border-red-500/50',
          icon: 'bg-red-500/20 text-red-500',
          title: 'text-red-500',
        }
      case 'warning':
        return {
          bg: 'bg-yellow-500/10 border-yellow-500/50',
          icon: 'bg-yellow-500/20 text-yellow-500',
          title: 'text-yellow-500',
        }
      case 'trade':
        return {
          bg: 'bg-purple-500/10 border-purple-500/50',
          icon: 'bg-purple-500/20 text-purple-500',
          title: 'text-purple-400',
        }
      case 'draft':
        return {
          bg: 'bg-accent-blue/10 border-accent-blue/50',
          icon: 'bg-accent-blue/20 text-accent-blue',
          title: 'text-accent-blue',
        }
      case 'lineup':
        return {
          bg: 'bg-orange-500/10 border-orange-500/50',
          icon: 'bg-orange-500/20 text-orange-500',
          title: 'text-orange-400',
        }
      case 'news':
        return {
          bg: 'bg-cyan-500/10 border-cyan-500/50',
          icon: 'bg-cyan-500/20 text-cyan-500',
          title: 'text-cyan-400',
        }
      default:
        return {
          bg: 'bg-dark-tertiary border-dark-border',
          icon: 'bg-dark-border text-text-muted',
          title: 'text-white',
        }
    }
  }

  const styles = getStyles()

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm
        transition-all duration-300 transform
        ${styles.bg}
        ${isEntering ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        ${isExiting ? 'translate-x-full opacity-0' : ''}
      `}
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${styles.icon}`}>
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`font-semibold ${styles.title}`}>{notification.title}</p>
        {notification.message && (
          <p className="text-text-secondary text-sm mt-0.5">{notification.message}</p>
        )}
        {notification.action && (
          <button
            onClick={() => {
              notification.action.onClick?.()
              handleDismiss()
            }}
            className="mt-2 text-sm font-medium text-accent-green hover:underline"
          >
            {notification.action.label}
          </button>
        )}
      </div>

      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-text-muted hover:text-white transition-colors p-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default Toast
