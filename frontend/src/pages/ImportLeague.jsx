import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { useSleeperImport, useImports } from '../hooks/useImports'
import { track, Events } from '../services/analytics'

const PLATFORMS = [
  { id: 'sleeper', name: 'Sleeper', icon: '🌙', available: true, description: 'Public API — just paste your league ID' },
  { id: 'yahoo', name: 'Yahoo', icon: '🟣', available: false, description: 'OAuth connection — coming soon' },
  { id: 'espn', name: 'ESPN', icon: '🔴', available: false, description: 'Cookie-based auth — coming soon' },
  { id: 'fantrax', name: 'Fantrax', icon: '🟢', available: false, description: 'CSV export — coming soon' },
  { id: 'mfl', name: 'MFL', icon: '🔵', available: false, description: 'XML API — coming soon' },
]

const StepIndicator = ({ current, total }) => (
  <div className="flex items-center gap-2 mb-6">
    {Array.from({ length: total }, (_, i) => (
      <div key={i} className="flex items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono font-bold transition-colors ${
          i < current ? 'bg-accent-gold text-dark-primary' :
          i === current ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold' :
          'bg-dark-tertiary text-text-secondary'
        }`}>
          {i < current ? '✓' : i + 1}
        </div>
        {i < total - 1 && (
          <div className={`w-8 h-0.5 mx-1 ${i < current ? 'bg-accent-gold' : 'bg-dark-tertiary'}`} />
        )}
      </div>
    ))}
  </div>
)

const ImportLeague = () => {
  const navigate = useNavigate()
  const { discover, discovery, discovering, startImport, importing, result, error, reset } = useSleeperImport()
  const { imports, refetch } = useImports()
  const [step, setStep] = useState(0) // 0: platform, 1: connect, 2: discovery, 3: importing, 4: complete
  const [platform, setPlatform] = useState(null)
  const [leagueId, setLeagueId] = useState('')

  const handlePlatformSelect = (p) => {
    if (!p.available) return
    setPlatform(p)
    setStep(1)
  }

  const handleDiscover = async () => {
    if (!leagueId.trim()) return
    const data = await discover(leagueId.trim())
    if (data) setStep(2)
  }

  const handleImport = async () => {
    setStep(3)
    track(Events.IMPORT_STARTED, { source_platform: platform.id })
    const data = await startImport(leagueId.trim())
    if (data) {
      track(Events.IMPORT_COMPLETED, { source_platform: platform.id, seasons_imported: data.seasonsImported?.length || 0 })
      refetch()
      setStep(4)
    } else {
      track(Events.IMPORT_FAILED, { source_platform: platform.id, error_type: 'import_error' })
      setStep(2) // go back to discovery on failure
    }
  }

  const handleReset = () => {
    reset()
    setStep(0)
    setPlatform(null)
    setLeagueId('')
  }

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
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
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-white mb-2">
              Import League History
            </h1>
            <p className="text-text-secondary">
              Bring your league's history into Clutch. All your seasons, standings, and records preserved forever.
            </p>
          </div>

          <StepIndicator current={step} total={5} />

          {/* Step 0: Choose Platform */}
          {step === 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-display font-bold text-white mb-4">Choose your platform</h2>
              {PLATFORMS.map(p => (
                <Card
                  key={p.id}
                  className={`cursor-pointer transition-all ${
                    p.available ? 'hover:border-accent-gold/50' : 'opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => handlePlatformSelect(p)}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{p.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-display font-bold text-white">{p.name}</h3>
                      <p className="text-sm text-text-secondary">{p.description}</p>
                    </div>
                    {p.available ? (
                      <svg className="w-5 h-5 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    ) : (
                      <span className="text-xs font-mono text-text-secondary bg-dark-tertiary px-2 py-1 rounded">SOON</span>
                    )}
                  </div>
                </Card>
              ))}

              {/* Past imports */}
              {imports.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-3">Previous Imports</h3>
                  {imports.map(imp => (
                    <Card key={imp.id} className="mb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-display font-bold text-white text-sm">
                            {imp.sourceLeagueName || imp.sourceLeagueId}
                          </p>
                          <p className="text-xs text-text-secondary font-mono">
                            {imp.sourcePlatform} · {imp.status} · {new Date(imp.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {imp.clutchLeague && (
                          <Link
                            to={`/leagues/${imp.clutchLeague.id}/vault`}
                            className="text-xs text-accent-gold hover:text-accent-gold/80"
                          >
                            View Vault
                          </Link>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 1: Connect / Enter ID */}
          {step === 1 && (
            <Card>
              <h2 className="text-lg font-display font-bold text-white mb-4">
                Connect to {platform?.name}
              </h2>
              {platform?.id === 'sleeper' && (
                <div>
                  <p className="text-sm text-text-secondary mb-4">
                    Paste your Sleeper league ID below. You can find it in your Sleeper app under
                    League Settings, or in the URL when viewing your league on the web.
                  </p>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-text-secondary mb-1">League ID</label>
                    <input
                      type="text"
                      value={leagueId}
                      onChange={e => setLeagueId(e.target.value)}
                      placeholder="e.g. 784462345678901234"
                      className="w-full px-4 py-3 bg-dark-tertiary border border-dark-tertiary rounded-lg text-white font-mono text-sm focus:outline-none focus:border-accent-gold transition-colors"
                      onKeyDown={e => e.key === 'Enter' && handleDiscover()}
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-400 mb-4">{error}</p>
                  )}
                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => { setStep(0); reset() }}>Back</Button>
                    <Button onClick={handleDiscover} disabled={!leagueId.trim() || discovering}>
                      {discovering ? 'Scanning...' : 'Scan League'}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Step 2: Discovery Results */}
          {step === 2 && discovery && (
            <div className="space-y-4">
              <Card>
                <h2 className="text-lg font-display font-bold text-white mb-1">
                  {discovery.name}
                </h2>
                <p className="text-sm text-text-secondary mb-4 font-mono">
                  {discovery.sport?.toUpperCase()} · {discovery.totalSeasons} season{discovery.totalSeasons !== 1 ? 's' : ''} found
                </p>

                <div className="space-y-2 mb-4">
                  {discovery.seasons?.map(s => (
                    <div key={s.sleeperLeagueId} className="flex items-center justify-between py-2 px-3 bg-dark-tertiary/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-accent-gold">{s.season}</span>
                        <span className="text-sm text-white">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-text-secondary">{s.totalRosters} teams</span>
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                          s.status === 'complete' ? 'bg-green-500/20 text-green-400' : 'bg-accent-gold/20 text-accent-gold'
                        }`}>
                          {s.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {error && (
                  <p className="text-sm text-red-400 mb-4">{error}</p>
                )}

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => { setStep(1); reset() }}>Back</Button>
                  <Button onClick={handleImport}>
                    Import {discovery.totalSeasons} Season{discovery.totalSeasons !== 1 ? 's' : ''}
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Step 3: Importing */}
          {step === 3 && (
            <Card className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-accent-gold/20 border-t-accent-gold rounded-full mx-auto mb-4" />
              <h2 className="text-lg font-display font-bold text-white mb-2">
                Importing your league history...
              </h2>
              <p className="text-sm text-text-secondary">
                Pulling rosters, matchups, drafts, and standings for every season. This may take a minute.
              </p>
            </Card>
          )}

          {/* Step 4: Complete */}
          {step === 4 && result && (
            <Card className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-display font-bold text-white mb-2">
                Import Complete!
              </h2>
              <p className="text-sm text-text-secondary mb-1">
                <span className="text-accent-gold font-mono font-bold">{result.leagueName}</span>
              </p>
              <p className="text-sm text-text-secondary mb-6">
                {result.seasonsImported?.length || 0} season{(result.seasonsImported?.length || 0) !== 1 ? 's' : ''} imported successfully
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="ghost" onClick={handleReset}>Import Another</Button>
                <Button onClick={() => navigate(`/leagues/${result.leagueId}/vault`)}>
                  View League Vault
                </Button>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

export default ImportLeague
