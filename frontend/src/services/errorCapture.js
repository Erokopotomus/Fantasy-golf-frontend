/**
 * Silent Error Capture Service
 *
 * Automatically captures API errors, JS crashes, and component failures.
 * Batches them and sends to the backend every 30 seconds (or on page unload).
 * Users never see a form or a button — it just works.
 *
 * Captures:
 *   - API errors (4xx/5xx) with endpoint, status, user context
 *   - Unhandled JS errors (window.onerror)
 *   - Unhandled promise rejections
 *   - React error boundary catches (via reportComponentError)
 *   - Session context: page, referrer, viewport, user agent
 *   - Churn signal: if user leaves within 60s of an error
 *
 * Usage:
 *   import { initErrorCapture, captureApiError, reportComponentError } from './errorCapture'
 *   initErrorCapture()  // call once in App.jsx
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const isDev = import.meta.env.DEV
const BATCH_INTERVAL = 30_000 // 30 seconds
const MAX_QUEUE_SIZE = 50 // don't hoard more than 50 errors
const CHURN_WINDOW = 60_000 // 60 seconds — if user leaves this fast after error, it's churn

// ─── State ───────────────────────────────────────────────────────────────────

let errorQueue = []
let batchTimer = null
let lastErrorTime = null
let initialized = false
let sessionId = null

function getSessionId() {
  if (!sessionId) {
    sessionId = sessionStorage.getItem('clutch-error-session') || crypto.randomUUID()
    sessionStorage.setItem('clutch-error-session', sessionId)
  }
  return sessionId
}

function getUserId() {
  try {
    const token = localStorage.getItem('clutch_token')
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.userId || payload.id || null
  } catch {
    return null
  }
}

// ─── Context Snapshot ────────────────────────────────────────────────────────

function getContext() {
  return {
    url: window.location.pathname + window.location.search,
    referrer: document.referrer || null,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    userId: getUserId(),
  }
}

// ─── Queue Management ────────────────────────────────────────────────────────

function enqueue(error) {
  if (errorQueue.length >= MAX_QUEUE_SIZE) {
    errorQueue.shift() // drop oldest
  }
  errorQueue.push(error)
  lastErrorTime = Date.now()

  if (isDev) {
    console.log(
      '%c[errorCapture] %cQueued:',
      'color: #e83838; font-weight: bold',
      'color: #9ca3af',
      error.type,
      error.message?.slice(0, 80)
    )
  }
}

async function flush() {
  if (errorQueue.length === 0) return

  const batch = [...errorQueue]
  errorQueue = []

  try {
    const token = localStorage.getItem('clutch_token')
    await fetch(`${API_URL}/errors/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ errors: batch }),
      // Use keepalive for page unload scenarios
      keepalive: true,
    })
  } catch {
    // If the send fails, put them back (but don't exceed max)
    errorQueue = [...batch.slice(-20), ...errorQueue].slice(0, MAX_QUEUE_SIZE)
  }
}

// ─── Capture Functions ───────────────────────────────────────────────────────

/**
 * Capture an API error. Call this from the api.js request() method.
 */
export function captureApiError(endpoint, status, message, method = 'GET') {
  // Don't capture auth failures (expected behavior) or network-level noise
  if (status === 401) return

  enqueue({
    type: 'api_error',
    category: status >= 500 ? 'server_error' : 'client_error',
    severity: status >= 500 ? 'high' : 'medium',
    message: message || `${method} ${endpoint} returned ${status}`,
    metadata: {
      endpoint,
      method,
      status,
    },
    ...getContext(),
  })
}

/**
 * Capture a React component crash. Call from error boundaries.
 */
export function reportComponentError(componentName, error, errorInfo) {
  enqueue({
    type: 'component_crash',
    category: 'render_error',
    severity: 'high',
    message: error?.message || 'Component render failed',
    metadata: {
      component: componentName,
      stack: error?.stack?.split('\n').slice(0, 5).join('\n') || null,
      componentStack: errorInfo?.componentStack?.split('\n').slice(0, 5).join('\n') || null,
    },
    ...getContext(),
  })
}

/**
 * Capture a custom error or unusual state.
 */
export function captureError(type, message, metadata = {}) {
  enqueue({
    type,
    category: 'custom',
    severity: metadata.severity || 'low',
    message,
    metadata,
    ...getContext(),
  })
}

// ─── Global Handlers ─────────────────────────────────────────────────────────

function handleWindowError(event) {
  // Skip cross-origin script errors (we get no useful info)
  if (event.message === 'Script error.' && !event.filename) return

  enqueue({
    type: 'js_error',
    category: 'unhandled_error',
    severity: 'high',
    message: event.message || 'Unknown error',
    metadata: {
      filename: event.filename || null,
      line: event.lineno || null,
      col: event.colno || null,
      stack: event.error?.stack?.split('\n').slice(0, 5).join('\n') || null,
    },
    ...getContext(),
  })
}

function handleUnhandledRejection(event) {
  const error = event.reason
  const message = error?.message || (typeof error === 'string' ? error : 'Unhandled promise rejection')

  // Skip common non-bugs (e.g., user cancelled navigation)
  if (message.includes('AbortError') || message.includes('The user aborted')) return

  enqueue({
    type: 'promise_rejection',
    category: 'unhandled_rejection',
    severity: 'medium',
    message: message.slice(0, 500),
    metadata: {
      stack: error?.stack?.split('\n').slice(0, 5).join('\n') || null,
    },
    ...getContext(),
  })
}

function handleBeforeUnload() {
  // Check for churn signal: user leaving shortly after an error
  if (lastErrorTime && (Date.now() - lastErrorTime) < CHURN_WINDOW) {
    enqueue({
      type: 'churn_signal',
      category: 'user_behavior',
      severity: 'high',
      message: `User left within ${Math.round((Date.now() - lastErrorTime) / 1000)}s of an error`,
      metadata: {
        secondsSinceError: Math.round((Date.now() - lastErrorTime) / 1000),
        errorsInSession: errorQueue.length,
      },
      ...getContext(),
    })
  }

  // Flush whatever we have
  flush()
}

function handleVisibilityChange() {
  // Flush when user tabs away — they might not come back
  if (document.visibilityState === 'hidden') {
    flush()
  }
}

// ─── Initialization ──────────────────────────────────────────────────────────

export function initErrorCapture() {
  if (initialized) return
  initialized = true

  // Global error handlers
  window.addEventListener('error', handleWindowError)
  window.addEventListener('unhandledrejection', handleUnhandledRejection)
  window.addEventListener('beforeunload', handleBeforeUnload)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // Batch flush timer
  batchTimer = setInterval(flush, BATCH_INTERVAL)

  if (isDev) {
    console.log(
      '%c[errorCapture] %cInitialized — silent error tracking active',
      'color: #e83838; font-weight: bold',
      'color: #9ca3af'
    )
  }
}

export function destroyErrorCapture() {
  if (!initialized) return
  window.removeEventListener('error', handleWindowError)
  window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  clearInterval(batchTimer)
  flush()
  initialized = false
}
