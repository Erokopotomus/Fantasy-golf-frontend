import { createContext, useContext, useState, useEffect } from 'react'

const OnboardingContext = createContext()

const ONBOARDING_KEY = 'fantasy_golf_onboarding'

export const OnboardingProvider = ({ children }) => {
  const [onboardingState, setOnboardingState] = useState(() => {
    const stored = localStorage.getItem(ONBOARDING_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
    return {
      completed: false,
      currentStep: 0,
      seenFeatures: [],
      dismissedTips: [],
    }
  })

  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(onboardingState))
  }, [onboardingState])

  const startOnboarding = () => {
    setShowOnboarding(true)
  }

  const completeOnboarding = () => {
    setOnboardingState(prev => ({
      ...prev,
      completed: true,
    }))
    setShowOnboarding(false)
  }

  const skipOnboarding = () => {
    setOnboardingState(prev => ({
      ...prev,
      completed: true,
    }))
    setShowOnboarding(false)
  }

  const setCurrentStep = (step) => {
    setOnboardingState(prev => ({
      ...prev,
      currentStep: step,
    }))
  }

  const markFeatureSeen = (featureId) => {
    setOnboardingState(prev => ({
      ...prev,
      seenFeatures: [...new Set([...prev.seenFeatures, featureId])],
    }))
  }

  const dismissTip = (tipId) => {
    setOnboardingState(prev => ({
      ...prev,
      dismissedTips: [...new Set([...prev.dismissedTips, tipId])],
    }))
  }

  const resetOnboarding = () => {
    setOnboardingState({
      completed: false,
      currentStep: 0,
      seenFeatures: [],
      dismissedTips: [],
    })
  }

  const hasSeenFeature = (featureId) => {
    return onboardingState.seenFeatures.includes(featureId)
  }

  const hasDismissedTip = (tipId) => {
    return onboardingState.dismissedTips.includes(tipId)
  }

  return (
    <OnboardingContext.Provider
      value={{
        onboardingState,
        showOnboarding,
        isCompleted: onboardingState.completed,
        currentStep: onboardingState.currentStep,
        startOnboarding,
        completeOnboarding,
        skipOnboarding,
        setCurrentStep,
        markFeatureSeen,
        dismissTip,
        resetOnboarding,
        hasSeenFeature,
        hasDismissedTip,
        setShowOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

export const useOnboarding = () => {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}

export default OnboardingContext
