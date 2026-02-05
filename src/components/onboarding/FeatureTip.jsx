import { useState, useEffect } from 'react'
import { useOnboarding } from '../../context/OnboardingContext'

const FeatureTip = ({
  id,
  title,
  description,
  position = 'bottom', // top, bottom, left, right
  showOnce = true,
  delay = 0,
  children,
}) => {
  const { hasDismissedTip, dismissTip, isCompleted } = useOnboarding()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only show tips after onboarding is complete
    if (!isCompleted) return

    // Check if already dismissed
    if (showOnce && hasDismissedTip(id)) return

    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [id, showOnce, delay, isCompleted, hasDismissedTip])

  const handleDismiss = () => {
    setIsVisible(false)
    if (showOnce) {
      dismissTip(id)
    }
  }

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowStyles = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-accent-green',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-accent-green',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-accent-green',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-accent-green',
  }

  return (
    <div className="relative inline-block">
      {children}

      {isVisible && (
        <div
          className={`
            absolute z-50 w-64 p-3 bg-accent-green rounded-lg shadow-lg
            animate-fadeIn ${positionStyles[position]}
          `}
        >
          {/* Arrow */}
          <div
            className={`
              absolute w-0 h-0 border-8 ${arrowStyles[position]}
            `}
          />

          {/* Content */}
          <div className="relative">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="text-white font-semibold text-sm">{title}</h4>
              <button
                onClick={handleDismiss}
                className="text-white/70 hover:text-white transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-white/90 text-xs leading-relaxed">{description}</p>

            {/* Got it button */}
            <button
              onClick={handleDismiss}
              className="mt-2 text-xs font-medium text-white bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default FeatureTip
