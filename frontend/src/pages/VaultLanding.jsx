import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/common/Card'
import api from '../services/api'

// Vault icon SVG — a stylized vault door
const VaultIcon = ({ size = 64, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Outer vault body */}
    <rect x="4" y="8" width="56" height="48" rx="4" stroke="url(#vaultGrad)" strokeWidth="3" fill="none" />
    {/* Inner door outline */}
    <rect x="10" y="14" width="44" height="36" rx="2" stroke="url(#vaultGrad)" strokeWidth="1.5" fill="none" opacity="0.5" />
    {/* Center dial */}
    <circle cx="32" cy="32" r="10" stroke="url(#vaultGrad)" strokeWidth="2.5" fill="none" />
    <circle cx="32" cy="32" r="4" fill="url(#vaultGrad)" />
    {/* Dial tick marks */}
    <line x1="32" y1="22" x2="32" y2="25" stroke="url(#vaultGrad)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="32" y1="39" x2="32" y2="42" stroke="url(#vaultGrad)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="22" y1="32" x2="25" y2="32" stroke="url(#vaultGrad)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="39" y1="32" x2="42" y2="32" stroke="url(#vaultGrad)" strokeWidth="1.5" strokeLinecap="round" />
    {/* Handle bar */}
    <rect x="48" y="26" width="4" height="12" rx="2" fill="url(#vaultGrad)" opacity="0.7" />
    {/* Hinges */}
    <rect x="6" y="16" width="3" height="6" rx="1" fill="url(#vaultGrad)" opacity="0.4" />
    <rect x="6" y="42" width="3" height="6" rx="1" fill="url(#vaultGrad)" opacity="0.4" />
    <defs>
      <linearGradient id="vaultGrad" x1="0" y1="0" x2="64" y2="64">
        <stop stopColor="#E8B84D" />
        <stop offset="1" stopColor="#E07838" />
      </linearGradient>
    </defs>
  </svg>
)

const VaultLanding = () => {
  const [leagues, setLeagues] = useState([])
  const [imports, setImports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getLeagues().catch(() => ({ leagues: [] })),
      api.getImports().catch(() => ({ imports: [] })),
    ]).then(([leagueRes, importRes]) => {
      setLeagues(leagueRes.leagues || leagueRes || [])
      setImports(importRes.imports || [])
    }).finally(() => setLoading(false))
  }, [])

  // Build set of league IDs that have completed imports
  const leaguesWithHistory = new Set()
  for (const imp of imports) {
    if (imp.status === 'COMPLETE' && imp.clutchLeagueId) {
      leaguesWithHistory.add(imp.clutchLeagueId)
    }
    if (imp.clutchLeague?.id) {
      leaguesWithHistory.add(imp.clutchLeague.id)
    }
  }

  // Sort: leagues with history first, then alphabetically
  const sortedLeagues = [...leagues].sort((a, b) => {
    const aHas = leaguesWithHistory.has(a.id) ? 0 : 1
    const bHas = leaguesWithHistory.has(b.id) ? 0 : 1
    if (aHas !== bHas) return aHas - bHas
    return (a.name || '').localeCompare(b.name || '')
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary">
        <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-dark-tertiary rounded w-1/3 mx-auto" />
              <div className="h-4 bg-dark-tertiary rounded w-1/2 mx-auto" />
              <div className="space-y-3 mt-8">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-dark-tertiary rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Hero header */}
          <div className="text-center mb-10">
            <VaultIcon size={80} className="mx-auto mb-4" />
            <h1 className="text-3xl sm:text-4xl font-bold font-display text-white mb-2">
              League Vault
            </h1>
            <p className="text-text-secondary max-w-md mx-auto">
              Your league's complete history — seasons, records, rivalries, and draft archives all in one place.
            </p>
          </div>

          {/* League list */}
          {sortedLeagues.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-text-secondary mb-4">You haven't joined any leagues yet.</p>
              <Link
                to="/leagues"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent-gold text-dark-primary rounded-lg font-display font-bold text-sm hover:bg-accent-gold/90"
              >
                Browse Leagues
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedLeagues.map(league => {
                const hasHistory = leaguesWithHistory.has(league.id)
                return (
                  <Link
                    key={league.id}
                    to={`/leagues/${league.id}/vault`}
                    className="block group"
                  >
                    <Card className="flex items-center gap-4 hover:border-accent-gold/30 transition-all duration-200 group-hover:bg-dark-tertiary/20">
                      {/* Vault mini icon */}
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        hasHistory
                          ? 'bg-gradient-to-br from-accent-gold/20 to-orange/20 border border-accent-gold/30'
                          : 'bg-dark-tertiary/50 border border-dark-tertiary'
                      }`}>
                        <VaultIcon size={28} className={hasHistory ? '' : 'opacity-30'} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-bold text-white truncate group-hover:text-accent-gold transition-colors">
                          {league.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono text-text-secondary">
                            {league.sport === 'NFL' ? '🏈' : '⛳'} {league.format?.replace('_', ' ') || 'League'}
                          </span>
                          {hasHistory ? (
                            <span className="text-xs font-mono text-accent-gold bg-accent-gold/10 px-1.5 py-0.5 rounded">
                              History Available
                            </span>
                          ) : (
                            <span className="text-xs font-mono text-text-secondary/50">
                              No history yet
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      <svg className="w-5 h-5 text-text-secondary group-hover:text-accent-gold transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Card>
                  </Link>
                )
              })}

              {/* Import CTA */}
              <div className="text-center pt-4">
                <Link
                  to="/import"
                  className="inline-flex items-center gap-1.5 text-sm text-accent-gold hover:text-accent-gold/80 font-display font-bold transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Import League History
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default VaultLanding
