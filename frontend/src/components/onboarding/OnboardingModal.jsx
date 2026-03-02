import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useOnboarding } from '../../context/OnboardingContext'
import { useCoachProfile } from '../../hooks/useCoachProfile'
import NeuralCluster from '../common/NeuralCluster'

const SPORT_OPTIONS = [
  { key: 'golf', label: 'Golf', emoji: '\u26F3' },
  { key: 'nfl', label: 'NFL', emoji: '\uD83C\uDFC8' },
  { key: 'both', label: 'Both', emoji: '\uD83C\uDFC6' },
]

const QUESTIONS = [
  {
    key: 'leagueCount',
    question: 'How many fantasy leagues do you usually play?',
    options: [
      { value: '1', label: '1' },
      { value: '2-3', label: '2-3' },
      { value: '4+', label: '4+' },
      { value: 'new', label: 'New to fantasy' },
    ],
  },
  {
    key: 'draftStyle',
    question: 'Draft style?',
    options: [
      { value: 'prep', label: 'I prep for weeks' },
      { value: 'wing', label: 'I wing it' },
      { value: 'between', label: 'Somewhere in between' },
    ],
  },
  {
    key: 'motivation',
    question: 'What matters most?',
    options: [
      { value: 'championships', label: 'Winning championships' },
      { value: 'bragging', label: 'Bragging rights' },
      { value: 'community', label: 'The community' },
    ],
  },
]

const OnboardingModal = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { showOnboarding, completeOnboarding, skipOnboarding } = useOnboarding()
  const { setProfile } = useCoachProfile()
  const [step, setStep] = useState(0)
  const [selectedSports, setSelectedSports] = useState(null)
  const [answers, setAnswers] = useState({})

  if (!showOnboarding) return null

  const handleSportSelect = (key) => {
    setSelectedSports(key)
  }

  const handleContinue = () => {
    setStep(1)
  }

  const handleAnswer = (questionKey, value) => {
    setAnswers(prev => ({ ...prev, [questionKey]: value }))
  }

  const getPostOnboardingRoute = () => {
    // Check if there's a pending invite in the URL
    const params = new URLSearchParams(window.location.search)
    if (params.get('code') || location.pathname.includes('/leagues/join')) {
      return `${location.pathname}${location.search}`
    }
    return '/dashboard'
  }

  const handleComplete = () => {
    setProfile({
      preferredSports: selectedSports,
      ...answers,
    })
    completeOnboarding()
    navigate(getPostOnboardingRoute())
  }

  const handleSkipProfile = () => {
    setProfile({ preferredSports: selectedSports })
    completeOnboarding()
    navigate(getPostOnboardingRoute())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[var(--surface)] rounded-2xl overflow-hidden shadow-2xl">
        {/* Progress */}
        <div className="flex gap-1 p-4 pb-0">
          {[0, 1].map(idx => (
            <div
              key={idx}
              className={`h-1 flex-1 rounded-full transition-colors ${
                idx <= step ? 'bg-purple-500' : 'bg-[var(--stone)]'
              }`}
            />
          ))}
        </div>

        <div className="p-6 pt-4">
          {/* Skip */}
          <div className="flex justify-end mb-2">
            <button
              onClick={skipOnboarding}
              className="text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              Skip
            </button>
          </div>

          {step === 0 && (
            <>
              {/* Step 1: Meet Your Coach */}
              <div className="flex justify-center mb-6">
                <NeuralCluster size="lg" intensity="calm" />
              </div>

              <h2 className="text-2xl font-bold font-display text-text-primary text-center mb-3">
                Welcome to Clutch
              </h2>
              <p className="text-text-secondary text-center text-sm mb-4 leading-relaxed max-w-md mx-auto">
                Season-long fantasy sports with AI coaching, league history, and verified prediction tracking. Create leagues, draft players, compete all season.
              </p>
              <p className="text-lg font-display font-bold text-[var(--crown)] text-center mb-4">
                Every great manager has an edge. Yours just got a brain.
              </p>
              <p className="text-text-secondary text-center text-sm mb-6 leading-relaxed max-w-md mx-auto">
                Clutch Coach learns your draft tendencies, tracks your predictions,
                and calls you out when you're slipping. The more you play, the smarter it gets.
              </p>

              {/* Sport pills */}
              <div className="mb-6">
                <p className="text-xs text-text-muted text-center mb-3 uppercase tracking-wider font-semibold">
                  What do you follow?
                </p>
                <div className="flex justify-center gap-3">
                  {SPORT_OPTIONS.map(sport => (
                    <button
                      key={sport.key}
                      onClick={() => handleSportSelect(sport.key)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-semibold transition-all ${
                        selectedSports === sport.key
                          ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                          : 'border-[var(--card-border)] text-text-secondary hover:border-purple-500/50'
                      }`}
                    >
                      <span>{sport.emoji}</span>
                      <span>{sport.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleContinue}
                disabled={!selectedSports}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                  selectedSports
                    ? 'bg-purple-500 text-white hover:bg-purple-600'
                    : 'bg-[var(--stone)] text-text-muted cursor-not-allowed'
                }`}
              >
                Continue
              </button>
            </>
          )}

          {step === 1 && (
            <>
              {/* Step 2: Quick Profile */}
              <div className="flex items-center gap-2 mb-1 justify-center">
                <NeuralCluster size="sm" intensity="calm" className="shrink-0" />
                <h2 className="text-xl font-bold font-display text-text-primary">
                  Help your coach get to know you
                </h2>
              </div>
              <p className="text-text-muted text-sm text-center mb-6">
                Quick-fire questions — tap to answer
              </p>

              <div className="space-y-5 mb-6">
                {QUESTIONS.map(q => (
                  <div key={q.key}>
                    <p className="text-sm font-semibold text-text-primary mb-2">{q.question}</p>
                    <div className="flex flex-wrap gap-2">
                      {q.options.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => handleAnswer(q.key, opt.value)}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                            answers[q.key] === opt.value
                              ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                              : 'border-[var(--card-border)] text-text-secondary hover:border-purple-500/50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleComplete}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-purple-500 text-white hover:bg-purple-600 transition-all"
              >
                Let's Go
              </button>
              <button
                onClick={handleSkipProfile}
                className="w-full py-2 mt-2 text-text-muted hover:text-text-primary transition-colors text-sm"
              >
                Skip for now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default OnboardingModal
