import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import Card from '../components/common/Card'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import { useJoinLeague } from '../hooks/useJoinLeague'
import { track, Events } from '../services/analytics'

const JoinLeague = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { validateCode, joinLeague, loading, error, previewLeague, clearPreview } = useJoinLeague()
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const autoValidated = useRef(false)

  // Auto-fill code from URL parameter and auto-validate (once)
  useEffect(() => {
    if (autoValidated.current) return
    const urlCode = searchParams.get('code')
    if (urlCode && urlCode.trim()) {
      autoValidated.current = true
      const cleanCode = urlCode.trim()
      setCode(cleanCode)
      validateCode(cleanCode).catch(() => {})
    }
  }, [searchParams, validateCode])

  const handleCodeChange = (e) => {
    setCode(e.target.value)
    setCodeError('')
    if (previewLeague) {
      clearPreview()
    }
  }

  const handleValidate = async (e) => {
    e.preventDefault()
    if (!code.trim()) {
      setCodeError('Please enter an invite code')
      return
    }
    try {
      await validateCode(code.trim())
    } catch (err) {
      // Error handled by hook
    }
  }

  const handleJoin = async () => {
    try {
      await joinLeague(code)
      track(Events.LEAGUE_JOINED, { leagueName: previewLeague?.name })
      navigate('/dashboard', {
        state: {
          notification: {
            type: 'success',
            message: `You've joined "${previewLeague.name}"!`
          }
        }
      })
    } catch (err) {
      // Error handled by hook
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link
              to="/dashboard"
              className="inline-flex items-center text-text-secondary hover:text-text-primary transition-colors mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary mb-2">
              Join a League
            </h1>
            <p className="text-text-secondary">
              Enter the invite code shared by your league commissioner.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Card className="mb-6 border-live-red bg-live-red/10">
              <div className="flex items-center gap-3 text-live-red">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            </Card>
          )}

          {/* Code Input Card */}
          <Card className="mb-6">
            <form onSubmit={handleValidate}>
              <Input
                label="League Code"
                value={code}
                onChange={handleCodeChange}
                placeholder="Paste your invite code"
                error={codeError}
                className="mb-4 font-mono"
              />
              {!previewLeague && (
                <Button
                  type="submit"
                  fullWidth
                  loading={loading}
                  disabled={!code.trim()}
                >
                  Find League
                </Button>
              )}
            </form>
          </Card>

          {/* League Preview */}
          {previewLeague && (
            <Card className="mb-6 border-gold/50">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-gold/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-text-primary font-semibold text-lg">{previewLeague.name}</h3>
                  <p className="text-text-muted text-sm">
                    Created by {previewLeague.commissioner}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div className="bg-[var(--bg)] rounded-lg p-3">
                  <span className="text-text-muted block">Type</span>
                  <span className="text-text-primary capitalize">{previewLeague.type} Draft</span>
                </div>
                <div className="bg-[var(--bg)] rounded-lg p-3">
                  <span className="text-text-muted block">Members</span>
                  <span className="text-text-primary">
                    {previewLeague.memberCount} / {previewLeague.maxMembers}
                  </span>
                </div>
                <div className="bg-[var(--bg)] rounded-lg p-3">
                  <span className="text-text-muted block">Scoring</span>
                  <span className="text-text-primary capitalize">
                    {previewLeague.scoringType === 'strokes-gained' ? 'Strokes Gained' : 'Standard'}
                  </span>
                </div>
                <div className="bg-[var(--bg)] rounded-lg p-3">
                  <span className="text-text-muted block">Roster Size</span>
                  <span className="text-text-primary">{previewLeague.rosterSize} players</span>
                </div>
              </div>

              {previewLeague.memberCount >= previewLeague.maxMembers ? (
                <div className="bg-crown/10 border border-crown/50 rounded-lg p-3 text-crown text-sm text-center">
                  This league is full
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => { setCode(''); clearPreview(); }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleJoin}
                    loading={loading}
                    className="flex-1"
                  >
                    Join League
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Create League Link */}
          <div className="text-center">
            <p className="text-text-secondary">
              Want to start your own?{' '}
              <Link to="/leagues/create" className="text-gold hover:underline">
                Create a league
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default JoinLeague
