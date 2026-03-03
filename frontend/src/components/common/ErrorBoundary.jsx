import { Component } from 'react'
import { reportComponentError } from '../../services/errorCapture'

/**
 * Generic error boundary that catches render crashes.
 * Silently reports to errorCapture, shows a graceful fallback.
 *
 * Usage:
 *   <ErrorBoundary name="DraftRoom">
 *     <DraftRoom />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    reportComponentError(this.props.name || 'Unknown', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      // If a custom fallback was provided, use it
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default graceful fallback
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="w-12 h-12 bg-[var(--bg-alt)] rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-text-primary font-medium mb-1">Something went wrong</p>
          <p className="text-text-muted text-sm mb-4">We've been notified and are looking into it.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              if (this.props.onRetry) this.props.onRetry()
            }}
            className="px-4 py-2 bg-[var(--crown)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
