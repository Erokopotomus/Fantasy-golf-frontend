import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import Card from '../components/common/Card'
import api from '../services/api'

const AwardCard = ({ award, index }) => {
  const isChampion = award.id === 'champion'

  return (
    <div
      className={`rounded-xl p-4 transition-all ${
        isChampion
          ? 'bg-gradient-to-br from-accent-gold/20 to-orange/20 border border-accent-gold/30 col-span-full'
          : 'bg-dark-secondary/50 border border-dark-tertiary/30 hover:border-accent-gold/20'
      }`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className={`flex items-center gap-4 ${isChampion ? 'flex-col sm:flex-row text-center sm:text-left' : ''}`}>
        <div className={`flex-shrink-0 ${isChampion ? 'text-5xl' : 'text-3xl'}`}>
          {award.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-display font-bold text-text-primary ${isChampion ? 'text-xl' : 'text-sm'}`}>
            {award.title}
          </h3>
          <p className="text-xs text-text-secondary">{award.subtitle}</p>
          <p className={`font-display font-bold mt-1 ${isChampion ? 'text-accent-gold text-lg' : 'text-accent-gold text-sm'}`}>
            {award.winner}
          </p>
        </div>
        <div className={`text-right ${isChampion ? 'mt-2 sm:mt-0' : ''}`}>
          <p className={`font-mono font-bold ${isChampion ? 'text-text-primary text-lg' : 'text-text-primary text-sm'}`}>
            {award.value}
          </p>
        </div>
      </div>
    </div>
  )
}

const SeasonRecap = () => {
  const { leagueId } = useParams()
  const [recap, setRecap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!leagueId) return
    setLoading(true)
    api.getSeasonRecap(leagueId)
      .then(setRecap)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [leagueId])

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary">
        <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-dark-tertiary rounded w-1/3" />
              <div className="h-32 bg-dark-tertiary rounded" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-24 bg-dark-tertiary rounded" />
                <div className="h-24 bg-dark-tertiary rounded" />
                <div className="h-24 bg-dark-tertiary rounded" />
                <div className="h-24 bg-dark-tertiary rounded" />
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-primary">
        <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center py-16">
            <p className="text-red-400 mb-4">{error}</p>
            <Link to={`/leagues/${leagueId}`} className="text-accent-gold hover:text-accent-gold/80">
              Back to League
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const { awards = [], standings = [], leagueName, seasonYear } = recap || {}

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link
              to={`/leagues/${leagueId}`}
              className="inline-flex items-center text-text-secondary hover:text-text-primary transition-colors mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to League
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary mb-1">
              Season Recap{seasonYear ? ` — ${seasonYear}` : ''}
            </h1>
            <p className="text-text-secondary">{leagueName}</p>
          </div>

          {/* Awards */}
          {awards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {awards.map((award, i) => (
                <AwardCard key={award.id} award={award} index={i} />
              ))}
            </div>
          ) : (
            <Card className="text-center py-12 mb-8">
              <div className="text-4xl mb-4">🏆</div>
              <h2 className="text-lg font-display font-bold text-text-primary mb-2">Season Not Complete</h2>
              <p className="text-text-secondary">Awards will be generated once the season wraps up and scores are finalized.</p>
            </Card>
          )}

          {/* Final Standings */}
          {standings.length > 0 && (
            <Card>
              <h2 className="text-lg font-display font-bold text-text-primary mb-4">Final Standings</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-text-secondary text-xs font-mono uppercase tracking-wider">
                      <th className="text-left pb-2">#</th>
                      <th className="text-left pb-2">Manager</th>
                      <th className="text-center pb-2">W</th>
                      <th className="text-center pb-2">L</th>
                      <th className="text-right pb-2">Points</th>
                      <th className="text-right pb-2 pr-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s, i) => (
                      <tr key={i} className={`border-t border-dark-tertiary/50 ${s.isChampion ? 'bg-accent-gold/5' : ''}`}>
                        <td className="py-2.5 font-mono text-text-secondary">{s.rank}</td>
                        <td className="py-2.5">
                          <Link to={`/manager/${s.userId}`} className="text-text-primary font-display font-semibold hover:text-accent-gold transition-colors">
                            {s.name}
                          </Link>
                        </td>
                        <td className="py-2.5 text-center font-mono text-green-400">{s.wins}</td>
                        <td className="py-2.5 text-center font-mono text-red-400">{s.losses}</td>
                        <td className="py-2.5 text-right font-mono text-text-primary">{s.totalPoints?.toFixed(1)}</td>
                        <td className="py-2.5 text-right pr-2">
                          {s.isChampion && <span className="text-accent-gold">🏆</span>}
                          {s.madePlayoffs && !s.isChampion && (
                            <span className="text-xs font-mono text-green-400 bg-green-500/20 px-1.5 py-0.5 rounded">Playoffs</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

export default SeasonRecap
