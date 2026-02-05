import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboarding } from '../../context/OnboardingContext'
import Button from '../common/Button'

const OnboardingModal = () => {
  const navigate = useNavigate()
  const { showOnboarding, completeOnboarding, skipOnboarding } = useOnboarding()
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      id: 'welcome',
      icon: '⛳',
      title: 'Welcome to Clutch!',
      description: 'Build your dream roster, compete against friends, and track live scoring.',
      image: null,
      features: [
        'Draft top PGA Tour players',
        'Compete in season-long leagues',
        'Track live tournament scores',
      ],
    },
    {
      id: 'leagues',
      icon: '🏆',
      title: 'Create or Join Leagues',
      description: 'Start your own league with custom settings or join an existing one with a code.',
      image: null,
      features: [
        'Snake or Auction draft styles',
        'Customizable scoring systems',
        'Invite friends with a league code',
      ],
    },
    {
      id: 'draft',
      icon: '📋',
      title: 'Draft Your Team',
      description: 'Select players to build your roster. Use stats and rankings to make informed picks.',
      image: null,
      features: [
        'Real-time draft room',
        'Player stats & rankings',
        'Pre-draft queue to plan ahead',
      ],
    },
    {
      id: 'scoring',
      icon: '📊',
      title: 'Live Tournament Scoring',
      description: 'Watch your players compete in real tournaments with live score updates.',
      image: null,
      features: [
        'Real-time leaderboard updates',
        'Track your players\' progress',
        'Fantasy point calculations',
      ],
    },
    {
      id: 'getstarted',
      icon: '🚀',
      title: 'Ready to Play?',
      description: 'Create your first league or join one with a code to start competing!',
      image: null,
      actions: true,
    },
  ]

  const currentStepData = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  const handleNext = () => {
    if (isLastStep) {
      completeOnboarding()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleCreateLeague = () => {
    completeOnboarding()
    navigate('/leagues/create')
  }

  const handleJoinLeague = () => {
    completeOnboarding()
    navigate('/leagues/join')
  }

  const handleExplore = () => {
    completeOnboarding()
  }

  if (!showOnboarding) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-dark-secondary rounded-2xl overflow-hidden shadow-2xl">
        {/* Progress indicator */}
        <div className="flex gap-1 p-4 pb-0">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`
                h-1 flex-1 rounded-full transition-colors
                ${idx <= currentStep ? 'bg-accent-green' : 'bg-dark-border'}
              `}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6 pt-4">
          {/* Skip button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={skipOnboarding}
              className="text-sm text-text-muted hover:text-white transition-colors"
            >
              Skip
            </button>
          </div>

          {/* Icon */}
          <div className="text-center mb-6">
            <span className="text-6xl">{currentStepData.icon}</span>
          </div>

          {/* Title & Description */}
          <h2 className="text-2xl font-bold text-white text-center mb-3">
            {currentStepData.title}
          </h2>
          <p className="text-text-secondary text-center mb-6">
            {currentStepData.description}
          </p>

          {/* Features list */}
          {currentStepData.features && (
            <div className="space-y-3 mb-6">
              {currentStepData.features.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-dark-tertiary rounded-lg"
                >
                  <div className="w-6 h-6 bg-accent-green/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white text-sm">{feature}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons for last step */}
          {currentStepData.actions && (
            <div className="space-y-3 mb-6">
              <Button
                onClick={handleCreateLeague}
                className="w-full"
              >
                Create a League
              </Button>
              <Button
                onClick={handleJoinLeague}
                variant="outline"
                className="w-full"
              >
                Join a League
              </Button>
              <button
                onClick={handleExplore}
                className="w-full py-2 text-text-muted hover:text-white transition-colors text-sm"
              >
                Just explore for now
              </button>
            </div>
          )}

          {/* Navigation */}
          {!currentStepData.actions && (
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrev}
                disabled={isFirstStep}
                className={`
                  flex items-center gap-1 text-sm font-medium transition-colors
                  ${isFirstStep ? 'text-dark-border cursor-not-allowed' : 'text-text-muted hover:text-white'}
                `}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <div className="flex gap-2">
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStep(idx)}
                    className={`
                      w-2 h-2 rounded-full transition-colors
                      ${idx === currentStep ? 'bg-accent-green' : 'bg-dark-border hover:bg-dark-tertiary'}
                    `}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                className="flex items-center gap-1 text-sm font-medium text-accent-green hover:text-accent-green/80 transition-colors"
              >
                {isLastStep ? 'Finish' : 'Next'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OnboardingModal
