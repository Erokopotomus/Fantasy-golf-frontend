import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { useSleeperImport, useESPNImport, useYahooImport, useFantraxImport, useMFLImport, useImports } from '../hooks/useImports'
import { track, Events } from '../services/analytics'

const PLATFORMS = [
  { id: 'sleeper', name: 'Sleeper', icon: '🌙', available: true, description: 'Public API — just paste your league ID' },
  { id: 'espn', name: 'ESPN', icon: '🔴', available: true, description: 'Cookie-based auth — private league support (2018+)' },
  { id: 'yahoo', name: 'Yahoo', icon: '🟣', available: true, description: 'OAuth token — full history import' },
  { id: 'fantrax', name: 'Fantrax', icon: '🟢', available: true, description: 'CSV export upload — standings & draft data' },
  { id: 'mfl', name: 'MFL', icon: '🔵', available: true, description: 'XML API — deepest historical data (15+ years)' },
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
  const sleeper = useSleeperImport()
  const espn = useESPNImport()
  const yahoo = useYahooImport()
  const fantrax = useFantraxImport()
  const mfl = useMFLImport()
  const { imports, refetch } = useImports()

  const [step, setStep] = useState(0)
  const [platform, setPlatform] = useState(null)

  // Shared input state
  const [leagueId, setLeagueId] = useState('')

  // ESPN-specific
  const [espnS2, setEspnS2] = useState('')
  const [espnSwid, setEspnSwid] = useState('')

  // Yahoo-specific
  const [yahooToken, setYahooToken] = useState('')

  // Fantrax-specific
  const [fantraxName, setFantraxName] = useState('')
  const [fantraxYear, setFantraxYear] = useState(new Date().getFullYear().toString())
  const [standingsCSV, setStandingsCSV] = useState('')
  const [draftCSV, setDraftCSV] = useState('')
  const standingsFileRef = useRef(null)
  const draftFileRef = useRef(null)

  // MFL-specific
  const [mflApiKey, setMflApiKey] = useState('')

  // Get the active hook for the selected platform
  const getHook = () => {
    switch (platform?.id) {
      case 'sleeper': return sleeper
      case 'espn': return espn
      case 'yahoo': return yahoo
      case 'fantrax': return fantrax
      case 'mfl': return mfl
      default: return sleeper
    }
  }

  const activeHook = getHook()

  const handlePlatformSelect = (p) => {
    if (!p.available) return
    setPlatform(p)
    setStep(1)
  }

  const handleDiscover = async () => {
    let data = null
    switch (platform?.id) {
      case 'sleeper':
        if (!leagueId.trim()) return
        data = await sleeper.discover(leagueId.trim())
        break
      case 'espn':
        if (!leagueId.trim()) return
        data = await espn.discover(leagueId.trim(), espnS2.trim(), espnSwid.trim())
        break
      case 'yahoo':
        if (!leagueId.trim() || !yahooToken.trim()) return
        data = await yahoo.discover(leagueId.trim(), yahooToken.trim())
        break
      case 'fantrax':
        if (!standingsCSV) return
        data = await fantrax.discover({
          standingsCSV,
          draftCSV: draftCSV || null,
          seasonYear: parseInt(fantraxYear) || undefined,
          leagueName: fantraxName || undefined,
        })
        break
      case 'mfl':
        if (!leagueId.trim() || !mflApiKey.trim()) return
        data = await mfl.discover(leagueId.trim(), mflApiKey.trim())
        break
    }
    if (data) setStep(2)
  }

  const handleImport = async () => {
    setStep(3)
    track(Events.IMPORT_STARTED, { source_platform: platform.id })

    let data = null
    switch (platform?.id) {
      case 'sleeper':
        data = await sleeper.startImport(leagueId.trim())
        break
      case 'espn':
        data = await espn.startImport(leagueId.trim(), espnS2.trim(), espnSwid.trim())
        break
      case 'yahoo':
        data = await yahoo.startImport(leagueId.trim(), yahooToken.trim())
        break
      case 'fantrax':
        data = await fantrax.startImport({
          standingsCSV,
          draftCSV: draftCSV || null,
          seasonYear: parseInt(fantraxYear) || undefined,
          leagueName: fantraxName || undefined,
        })
        break
      case 'mfl':
        data = await mfl.startImport(leagueId.trim(), mflApiKey.trim())
        break
    }

    if (data) {
      track(Events.IMPORT_COMPLETED, { source_platform: platform.id, seasons_imported: data.seasonsImported?.length || 0 })
      refetch()
      setStep(4)
    } else {
      track(Events.IMPORT_FAILED, { source_platform: platform.id, error_type: 'import_error' })
      setStep(2)
    }
  }

  const handleReset = () => {
    activeHook.reset()
    setStep(0)
    setPlatform(null)
    setLeagueId('')
    setEspnS2('')
    setEspnSwid('')
    setYahooToken('')
    setFantraxName('')
    setFantraxYear(new Date().getFullYear().toString())
    setStandingsCSV('')
    setDraftCSV('')
    setMflApiKey('')
  }

  const handleFileUpload = (e, setter) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => setter(event.target.result)
    reader.readAsText(file)
  }

  const canDiscover = () => {
    switch (platform?.id) {
      case 'sleeper': return leagueId.trim().length > 0
      case 'espn': return leagueId.trim().length > 0
      case 'yahoo': return leagueId.trim().length > 0 && yahooToken.trim().length > 0
      case 'fantrax': return standingsCSV.length > 0
      case 'mfl': return leagueId.trim().length > 0 && mflApiKey.trim().length > 0
      default: return false
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
            <Link to="/import/custom" className="inline-flex items-center gap-1.5 mt-3 text-accent-gold text-sm hover:underline">
              Have custom data? Import spreadsheets or scrape your league website &rarr;
            </Link>
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

          {/* Step 1: Connect / Enter credentials */}
          {step === 1 && (
            <Card>
              <h2 className="text-lg font-display font-bold text-white mb-4">
                Connect to {platform?.name}
              </h2>

              {/* Sleeper */}
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
                </div>
              )}

              {/* ESPN */}
              {platform?.id === 'espn' && (
                <div>
                  <p className="text-sm text-text-secondary mb-4">
                    Enter your ESPN league ID. For private leagues, you'll also need your ESPN cookies.
                    ESPN only stores data from 2018 onwards — Clutch preserves it forever.
                  </p>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-text-secondary mb-1">League ID</label>
                    <input
                      type="text"
                      value={leagueId}
                      onChange={e => setLeagueId(e.target.value)}
                      placeholder="e.g. 12345678"
                      className="w-full px-4 py-3 bg-dark-tertiary border border-dark-tertiary rounded-lg text-white font-mono text-sm focus:outline-none focus:border-accent-gold transition-colors"
                    />
                    <p className="text-xs text-text-muted mt-1">Find this in your ESPN league URL: fantasy.espn.com/football/league?leagueId=XXXXXXXX</p>
                  </div>

                  <div className="bg-dark-tertiary/50 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-white mb-2">Private League? Add your ESPN cookies</p>
                    <p className="text-xs text-text-muted mb-3">
                      Open ESPN Fantasy in Chrome, press F12, go to Application &gt; Cookies &gt; espn.com, and copy these values:
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">espn_s2 cookie</label>
                        <input
                          type="text"
                          value={espnS2}
                          onChange={e => setEspnS2(e.target.value)}
                          placeholder="AEB..."
                          className="w-full px-3 py-2 bg-dark-primary border border-dark-border rounded-lg text-white font-mono text-xs focus:outline-none focus:border-accent-gold transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">SWID cookie</label>
                        <input
                          type="text"
                          value={espnSwid}
                          onChange={e => setEspnSwid(e.target.value)}
                          placeholder="{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}"
                          className="w-full px-3 py-2 bg-dark-primary border border-dark-border rounded-lg text-white font-mono text-xs focus:outline-none focus:border-accent-gold transition-colors"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-text-muted mt-2">Leave blank for public leagues.</p>
                  </div>
                </div>
              )}

              {/* Yahoo */}
              {platform?.id === 'yahoo' && (
                <div>
                  <p className="text-sm text-text-secondary mb-4">
                    Yahoo requires OAuth authorization to access your league data.
                    Enter your league number and Yahoo API access token.
                  </p>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-text-secondary mb-1">League ID (number only)</label>
                    <input
                      type="text"
                      value={leagueId}
                      onChange={e => setLeagueId(e.target.value)}
                      placeholder="e.g. 123456"
                      className="w-full px-4 py-3 bg-dark-tertiary border border-dark-tertiary rounded-lg text-white font-mono text-sm focus:outline-none focus:border-accent-gold transition-colors"
                    />
                    <p className="text-xs text-text-muted mt-1">Find this in your Yahoo league URL: football.fantasysports.yahoo.com/f1/XXXXXX</p>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-text-secondary mb-1">Access Token</label>
                    <textarea
                      value={yahooToken}
                      onChange={e => setYahooToken(e.target.value)}
                      placeholder="Paste your Yahoo OAuth access token here..."
                      rows={3}
                      className="w-full px-4 py-3 bg-dark-tertiary border border-dark-tertiary rounded-lg text-white font-mono text-xs focus:outline-none focus:border-accent-gold transition-colors resize-none"
                    />
                    <p className="text-xs text-text-muted mt-1">
                      Get your token from the Yahoo Developer Console or use a Yahoo OAuth tool.
                    </p>
                  </div>
                </div>
              )}

              {/* Fantrax */}
              {platform?.id === 'fantrax' && (
                <div>
                  <p className="text-sm text-text-secondary mb-4">
                    Fantrax doesn't have a public API. Export your league data as CSV from Fantrax and upload it here.
                  </p>

                  <div className="bg-dark-tertiary/50 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-white mb-2">How to export from Fantrax:</p>
                    <ol className="text-xs text-text-muted space-y-1 list-decimal list-inside">
                      <li>Go to your Fantrax league page</li>
                      <li>Click League &gt; Standings</li>
                      <li>Click the Export / CSV icon (top right)</li>
                      <li>Upload the downloaded CSV file below</li>
                    </ol>
                  </div>

                  <div className="space-y-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">League Name</label>
                      <input
                        type="text"
                        value={fantraxName}
                        onChange={e => setFantraxName(e.target.value)}
                        placeholder="e.g. The Gridiron Gang"
                        className="w-full px-4 py-3 bg-dark-tertiary border border-dark-tertiary rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Season Year</label>
                      <input
                        type="number"
                        value={fantraxYear}
                        onChange={e => setFantraxYear(e.target.value)}
                        min="2000"
                        max="2030"
                        className="w-full px-4 py-3 bg-dark-tertiary border border-dark-tertiary rounded-lg text-white font-mono text-sm focus:outline-none focus:border-accent-gold transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Standings CSV (required)</label>
                      <input
                        ref={standingsFileRef}
                        type="file"
                        accept=".csv"
                        onChange={e => handleFileUpload(e, setStandingsCSV)}
                        className="hidden"
                      />
                      <button
                        onClick={() => standingsFileRef.current?.click()}
                        className={`w-full px-4 py-3 border border-dashed rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${
                          standingsCSV
                            ? 'border-accent-gold/50 bg-accent-gold/10 text-accent-gold'
                            : 'border-dark-border bg-dark-tertiary text-text-muted hover:text-white hover:border-text-muted'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {standingsCSV ? 'Standings CSV uploaded' : 'Upload standings CSV'}
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Draft CSV (optional)</label>
                      <input
                        ref={draftFileRef}
                        type="file"
                        accept=".csv"
                        onChange={e => handleFileUpload(e, setDraftCSV)}
                        className="hidden"
                      />
                      <button
                        onClick={() => draftFileRef.current?.click()}
                        className={`w-full px-4 py-3 border border-dashed rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${
                          draftCSV
                            ? 'border-accent-gold/50 bg-accent-gold/10 text-accent-gold'
                            : 'border-dark-border bg-dark-tertiary text-text-muted hover:text-white hover:border-text-muted'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {draftCSV ? 'Draft CSV uploaded' : 'Upload draft CSV (optional)'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MFL */}
              {platform?.id === 'mfl' && (
                <div>
                  <p className="text-sm text-text-secondary mb-4">
                    MFL has the deepest historical data of any platform — some leagues go back 15-20+ years.
                    You'll need your league ID and API key (commissioner credentials).
                  </p>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-text-secondary mb-1">League ID</label>
                    <input
                      type="text"
                      value={leagueId}
                      onChange={e => setLeagueId(e.target.value)}
                      placeholder="e.g. 12345"
                      className="w-full px-4 py-3 bg-dark-tertiary border border-dark-tertiary rounded-lg text-white font-mono text-sm focus:outline-none focus:border-accent-gold transition-colors"
                    />
                    <p className="text-xs text-text-muted mt-1">Find this in your MFL league URL</p>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-text-secondary mb-1">API Key</label>
                    <input
                      type="password"
                      value={mflApiKey}
                      onChange={e => setMflApiKey(e.target.value)}
                      placeholder="Your MFL API key"
                      className="w-full px-4 py-3 bg-dark-tertiary border border-dark-tertiary rounded-lg text-white font-mono text-sm focus:outline-none focus:border-accent-gold transition-colors"
                    />
                    <p className="text-xs text-text-muted mt-1">
                      Commissioner: My League &gt; League Settings &gt; API Key
                    </p>
                  </div>
                </div>
              )}

              {activeHook.error && (
                <p className="text-sm text-red-400 mb-4">{activeHook.error}</p>
              )}

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => { setStep(0); activeHook.reset() }}>Back</Button>
                <Button
                  onClick={handleDiscover}
                  disabled={!canDiscover() || activeHook.discovering}
                >
                  {activeHook.discovering ? 'Scanning...' : 'Scan League'}
                </Button>
              </div>
            </Card>
          )}

          {/* Step 2: Discovery Results */}
          {step === 2 && activeHook.discovery && (
            <div className="space-y-4">
              <Card>
                <h2 className="text-lg font-display font-bold text-white mb-1">
                  {activeHook.discovery.name}
                </h2>
                <p className="text-sm text-text-secondary mb-4 font-mono">
                  {activeHook.discovery.sport?.toUpperCase()} · {activeHook.discovery.totalSeasons} season{activeHook.discovery.totalSeasons !== 1 ? 's' : ''} found
                </p>

                <div className="space-y-2 mb-4">
                  {activeHook.discovery.seasons?.map((s, idx) => (
                    <div key={s.leagueKey || s.sleeperLeagueId || s.year || idx} className="flex items-center justify-between py-2 px-3 bg-dark-tertiary/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-accent-gold">{s.season || s.year}</span>
                        <span className="text-sm text-white">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-text-secondary">{s.totalRosters || s.teamCount} teams</span>
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                          s.status === 'complete' ? 'bg-green-500/20 text-green-400' : 'bg-accent-gold/20 text-accent-gold'
                        }`}>
                          {s.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {activeHook.error && (
                  <p className="text-sm text-red-400 mb-4">{activeHook.error}</p>
                )}

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => { setStep(1); activeHook.reset() }}>Back</Button>
                  <Button onClick={handleImport}>
                    Import {activeHook.discovery.totalSeasons} Season{activeHook.discovery.totalSeasons !== 1 ? 's' : ''}
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
          {step === 4 && activeHook.result && (
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
                <span className="text-accent-gold font-mono font-bold">{activeHook.result.leagueName}</span>
              </p>
              <p className="text-sm text-text-secondary mb-6">
                {activeHook.result.seasonsImported?.length || 0} season{(activeHook.result.seasonsImported?.length || 0) !== 1 ? 's' : ''} imported successfully
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="ghost" onClick={handleReset}>Import Another</Button>
                <Button onClick={() => navigate(`/leagues/${activeHook.result.leagueId}/vault`)}>
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
