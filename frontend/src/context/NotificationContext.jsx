import { createContext, useContext, useReducer, useCallback } from 'react'

const NotificationContext = createContext(null)

const initialState = {
  notifications: [],
}

let notificationId = 0

function notificationReducer(state, action) {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      }
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      }
    case 'CLEAR_ALL':
      return {
        ...state,
        notifications: [],
      }
    default:
      return state
  }
}

export function NotificationProvider({ children }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState)

  const addNotification = useCallback(({
    type = 'info', // 'success', 'error', 'warning', 'info', 'trade', 'draft', 'lineup', 'news'
    title,
    message,
    duration = 5000, // Auto-dismiss after 5 seconds, 0 for persistent
    action = null, // { label: 'View', onClick: () => {} }
  }) => {
    const id = ++notificationId

    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        id,
        type,
        title,
        message,
        action,
        createdAt: Date.now(),
      },
    })

    // Auto-dismiss after duration (if not persistent)
    if (duration > 0) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: id })
      }, duration)
    }

    return id
  }, [])

  const removeNotification = useCallback((id) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id })
  }, [])

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' })
  }, [])

  // Convenience methods for different notification types
  const notify = {
    success: (title, message, options = {}) =>
      addNotification({ type: 'success', title, message, ...options }),
    error: (title, message, options = {}) =>
      addNotification({ type: 'error', title, message, duration: 8000, ...options }),
    warning: (title, message, options = {}) =>
      addNotification({ type: 'warning', title, message, ...options }),
    info: (title, message, options = {}) =>
      addNotification({ type: 'info', title, message, ...options }),
    trade: (title, message, options = {}) =>
      addNotification({ type: 'trade', title, message, duration: 10000, ...options }),
    draft: (title, message, options = {}) =>
      addNotification({ type: 'draft', title, message, duration: 8000, ...options }),
    lineup: (title, message, options = {}) =>
      addNotification({ type: 'lineup', title, message, duration: 10000, ...options }),
    news: (title, message, options = {}) =>
      addNotification({ type: 'news', title, message, ...options }),
  }

  const value = {
    notifications: state.notifications,
    addNotification,
    removeNotification,
    clearAll,
    notify,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

export default NotificationContext
