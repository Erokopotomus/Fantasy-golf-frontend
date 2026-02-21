import { useNavigate, Link } from 'react-router-dom'
import Card from '../components/common/Card'
import LeagueForm from '../components/league/LeagueForm'
import { useCreateLeague } from '../hooks/useCreateLeague'
import { track, Events } from '../services/analytics'

const CreateLeague = () => {
  const navigate = useNavigate()
  const { createLeague, loading, error } = useCreateLeague()

  const handleSubmit = async (leagueData) => {
    try {
      const result = await createLeague(leagueData)
      track(Events.LEAGUE_CREATED, { format: leagueData.format, draftType: leagueData.draftType, maxTeams: leagueData.maxTeams })
      navigate('/dashboard', {
        state: {
          notification: {
            type: 'success',
            message: `League "${result.name}" created! Share code: ${result.joinCode}`
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
        <div className="max-w-2xl mx-auto">
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
              Create a League
            </h1>
            <p className="text-text-secondary">
              Set up your league settings. You'll get a code to share with friends.
            </p>
          </div>

          {/* Import CTA */}
          <Link
            to="/import"
            className="mb-6 flex items-center gap-4 px-5 py-4 bg-accent-gold/5 border border-accent-gold/30 rounded-xl hover:bg-accent-gold/10 hover:border-accent-gold/50 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-accent-gold/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent-gold/20 transition-colors">
              <svg className="w-5 h-5 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-display font-bold text-text-primary group-hover:text-accent-gold transition-colors">
                Already have a league on another platform?
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                Import from Yahoo, ESPN, Sleeper, Fantrax, or MFL — bring your full history with you.
              </p>
            </div>
            <svg className="w-5 h-5 text-text-muted group-hover:text-accent-gold flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

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

          {/* Form Card */}
          <Card>
            <LeagueForm onSubmit={handleSubmit} loading={loading} />
          </Card>

          {/* Join League Link */}
          <div className="mt-6 text-center">
            <p className="text-text-secondary">
              Have a league code?{' '}
              <Link to="/leagues/join" className="text-gold hover:underline">
                Join an existing league
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default CreateLeague
