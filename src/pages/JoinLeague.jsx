import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Card from '../components/common/Card'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import { useJoinLeague } from '../hooks/useJoinLeague'

const JoinLeague = () => {
  const navigate = useNavigate()
  const { validateCode, joinLeague, loading, error, previewLeague, clearPreview } = useJoinLeague()
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')

  const handleCodeChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    setCode(value)
    setCodeError('')
    if (previewLeague) {
      clearPreview()
    }
  }

  const handleValidate = async (e) => {
    e.preventDefault()
    if (code.length !== 6) {
      setCodeError('Code must be 6 characters')
      return
    }
    try {
      await validateCode(code)
    } catch (err) {
      // Error handled by hook
    }
  }

  const handleJoin = async () => {
    try {
      await joinLeague(code)
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
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link
              to="/dashboard"
              className="inline-flex items-center text-text-secondary hover:text-white transition-colors mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Join a League
            </h1>
            <p className="text-text-secondary">
              Enter the 6-character code shared by your league commissioner.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Card className="mb-6 border-red-500 bg-red-500/10">
              <div className="flex items-center gap-3 text-red-500">
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
                placeholder="Enter 6-character code"
                error={codeError}
                maxLength={6}
                className="mb-4"
              />
              <div className="text-center mb-4">
                <span className="text-4xl font-mono tracking-[0.5em] text-white">
                  {code.padEnd(6, '_').split('').join('')}
                </span>
              </div>
              {!previewLeague && (
                <Button
                  type="submit"
                  fullWidth
                  loading={loading}
                  disabled={code.length !== 6}
                >
                  Find League
                </Button>
              )}
            </form>
          </Card>

          {/* League Preview */}
          {previewLeague && (
            <Card className="mb-6 border-accent-green/50">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-accent-green/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-lg">{previewLeague.name}</h3>
                  <p className="text-text-muted text-sm">
                    Created by {previewLeague.commissioner}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div className="bg-dark-primary rounded-lg p-3">
                  <span className="text-text-muted block">Type</span>
                  <span className="text-white capitalize">{previewLeague.type} Draft</span>
                </div>
                <div className="bg-dark-primary rounded-lg p-3">
                  <span className="text-text-muted block">Members</span>
                  <span className="text-white">
                    {previewLeague.memberCount} / {previewLeague.maxMembers}
                  </span>
                </div>
                <div className="bg-dark-primary rounded-lg p-3">
                  <span className="text-text-muted block">Scoring</span>
                  <span className="text-white capitalize">
                    {previewLeague.scoringType === 'strokes-gained' ? 'Strokes Gained' : 'Standard'}
                  </span>
                </div>
                <div className="bg-dark-primary rounded-lg p-3">
                  <span className="text-text-muted block">Roster Size</span>
                  <span className="text-white">{previewLeague.rosterSize} players</span>
                </div>
              </div>

              {previewLeague.memberCount >= previewLeague.maxMembers ? (
                <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3 text-yellow-500 text-sm text-center">
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
              <Link to="/leagues/create" className="text-accent-green hover:underline">
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
