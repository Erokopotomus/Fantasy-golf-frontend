import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { useSleeperImport, useESPNImport, useYahooImport, useYahooOAuth, useFantraxImport, useMFLImport, useImports } from '../hooks/useImports'
import { track, Events } from '../services/analytics'
import api from '../services/api'

const PLATFORMS = [
  { id: 'sleeper', name: 'Sleeper', icon: '🌙', available: true, description: 'Public API — just paste your league ID' },
  { id: 'espn', name: 'ESPN', icon: '🔴', available: true, description: 'Cookie-based auth — private league support (2018+)' },
  { id: 'yahoo', name: 'Yahoo', icon: '🟣', available: true, description: 'One-click connect — full history import' },
  { id: 'fantrax', name: 'Fantrax', icon: '🟢', available: true, description: 'CSV export upload — standings & draft data' },
  { id: 'mfl', name: 'MFL', icon: '🔵', available: true, description: 'XML API — deepest historical data (15+ years)' },
]

const HelpGuide = ({ title, steps, tip }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-dark-tertiary/50 border border-dark-border rounded-lg mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-dark-tertiary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium text-accent-gold">{title}</span>
        </div>
        <svg className={`w-4 h-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-dark-border/50">
          <ol className="text-xs text-text-secondary space-y-2 mt-3 list-none">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-5 h-5 bg-accent-gold/20 text-accent-gold rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {tip && (
            <div className="mt-3 flex gap-2 items-start bg-accent-gold/5 rounded-lg p-2.5">
              <span className="text-accent-gold text-xs font-bold flex-shrink-0">TIP</span>
              <p className="text-xs text-text-muted">{tip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

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
  const [searchParams, setSearchParams] = useSearchParams()
  const sleeper = useSleeperImport()
  const espn = useESPNImport()
  const yahoo = useYahooImport()
  const yahooOAuth = useYahooOAuth()
  const fantrax = useFantraxImport()
  const mfl = useMFLImport()
  const { imports, refetch } = useImports()

  const [step, setStep] = useState(0)
  const [platform, setPlatform] = useState(null)
  const [showManualToken, setShowManualToken] = useState(false)
  const [yahooError, setYahooError] = useState(null)

  // Handle Yahoo OAuth callback redirect
  useEffect(() => {
    const yahooParam = searchParams.get('yahoo')
    const errorParam = searchParams.get('error')
    if (yahooParam === 'connected') {
      yahooOAuth.refetch()
      setPlatform(PLATFORMS.find(p => p.id === 'yahoo'))
      setStep(1)
      searchParams.delete('yahoo')
      setSearchParams(searchParams, { replace: true })
    }
    if (errorParam?.startsWith('yahoo_')) {
      setPlatform(PLATFORMS.find(p => p.id === 'yahoo'))
      setStep(1)
      const errorMessages = {
        yahoo_not_configured: 'Yahoo OAuth is not configured yet. The site admin needs to add Yahoo API credentials.',
        yahoo_denied: 'Yahoo authorization was denied. Please try again.',
        yahoo_token_failed: 'Failed to exchange Yahoo authorization code. Please try again.',
        yahoo_callback_error: 'Something went wrong during Yahoo authorization. Please try again.',
        yahoo_missing_params: 'Yahoo authorization returned incomplete data. Please try again.',
        yahoo_invalid_state: 'Yahoo authorization session expired. Please try again.',
      }
      setYahooError(errorMessages[errorParam] || 'Yahoo connection failed. Please try again.')
      searchParams.delete('error')
      setSearchParams(searchParams, { replace: true })
    }
  }, [])

  // Fetch existing leagues when step 2 (discovery results) is shown
  useEffect(() => {
    if (step === 2) {
      api.getLeagues().then(data => setExistingLeagues(data.leagues || [])).catch(() => {})
    }
  }, [step])

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

  // Target league for cross-platform merging
  const [targetLeagueId, setTargetLeagueId] = useState('')
  const [existingLeagues, setExistingLeagues] = useState([])

  // Season selection (checkboxes on Step 2)
  const [selectedSeasons, setSelectedSeasons] = useState([])

  // Confirmation step (Step 4) — detected settings + active owners
  const [detectedSettings, setDetectedSettings] = useState(null)
  const [activeOwners, setActiveOwners] = useState([])
  const [editSettings, setEditSettings] = useState({
    format: '',
    draftType: '',
    maxTeams: '',
    scoringType: '',
    rosterSize: '',
    waiverType: '',
    faabBudget: '',
    playoffTeams: '',
  })
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [selectedOwner, setSelectedOwner] = useState(null) // ownerName string or '__none__'

  // Health check (Step 5)
  const [health, setHealth] = useState(null)
  const [healthLoading, setHealthLoading] = useState(false)

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
        if (!leagueId.trim()) return
        if (!yahooOAuth.status?.connected && !yahooToken.trim()) return
        data = await yahoo.discover(leagueId.trim(), yahooToken.trim() || undefined)
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
    if (data) {
      // Initialize all seasons as selected
      setSelectedSeasons((data.seasons || []).map(s => parseInt(s.season || s.year)))
      setStep(2)
    }
  }

  const handleImport = async () => {
    setStep(3)
    track(Events.IMPORT_STARTED, { source_platform: platform.id })

    const mergeTarget = targetLeagueId || undefined
    // Only pass selectedSeasons if user deselected something
    const totalSeasons = activeHook.discovery?.seasons?.length || 0
    const seasonsArg = selectedSeasons.length < totalSeasons ? selectedSeasons : undefined
    let data = null
    switch (platform?.id) {
      case 'sleeper':
        data = await sleeper.startImport(leagueId.trim(), mergeTarget, seasonsArg)
        break
      case 'espn':
        data = await espn.startImport(leagueId.trim(), espnS2.trim(), espnSwid.trim(), mergeTarget, seasonsArg)
        break
      case 'yahoo':
        data = await yahoo.startImport(leagueId.trim(), yahooToken.trim() || undefined, mergeTarget, seasonsArg)
        break
      case 'fantrax':
        data = await fantrax.startImport({
          standingsCSV,
          draftCSV: draftCSV || null,
          seasonYear: parseInt(fantraxYear) || undefined,
          leagueName: fantraxName || undefined,
        }, mergeTarget)
        break
      case 'mfl':
        data = await mfl.startImport(leagueId.trim(), mflApiKey.trim(), mergeTarget, seasonsArg)
        break
    }

    if (data) {
      track(Events.IMPORT_COMPLETED, { source_platform: platform.id, seasons_imported: data.seasonsImported?.length || 0 })
      refetch()

      // Capture detected settings + active owners for confirmation step
      if (data.detectedSettings) {
        setDetectedSettings(data.detectedSettings)
        const s = data.detectedSettings.settings || {}
        setEditSettings({
          format: data.detectedSettings.format || '',
          draftType: data.detectedSettings.draftType || '',
          maxTeams: data.detectedSettings.maxTeams?.toString() || '',
          scoringType: s.scoringType || '',
          rosterSize: s.rosterSize?.toString() || '',
          waiverType: s.waiverType || '',
          faabBudget: s.faabBudget?.toString() || '',
          playoffTeams: s.playoffTeams?.toString() || '',
        })
      }
      if (data.activeOwners) {
        setActiveOwners(data.activeOwners)
        // Pre-select the auto-matched owner (the one with claimed: true)
        const autoMatched = data.activeOwners.find(o => o.claimed)
        setSelectedOwner(autoMatched?.ownerName || null)
      }

      setStep(4) // Go to confirmation step
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
    setTargetLeagueId('')
    setSelectedSeasons([])
    setDetectedSettings(null)
    setActiveOwners([])
    setEditSettings({ format: '', draftType: '', maxTeams: '', scoringType: '', rosterSize: '', waiverType: '', faabBudget: '', playoffTeams: '' })
    setSelectedOwner(null)
    setConfirmLoading(false)
    setHealth(null)
    setHealthLoading(false)
  }

  const handleConfirmSettings = async (apply) => {
    setConfirmLoading(true)
    try {
      const leagueId = activeHook.result?.leagueId
      if (leagueId && apply) {
        await api.confirmImportSettings(leagueId, {
          format: editSettings.format || null,
          draftType: editSettings.draftType || null,
          maxTeams: editSettings.maxTeams ? parseInt(editSettings.maxTeams) : null,
          settings: {
            scoringType: editSettings.scoringType || null,
            rosterSize: editSettings.rosterSize ? parseInt(editSettings.rosterSize) : null,
            waiverType: editSettings.waiverType || null,
            faabBudget: editSettings.faabBudget ? parseInt(editSettings.faabBudget) : null,
            playoffTeams: editSettings.playoffTeams ? parseInt(editSettings.playoffTeams) : null,
          },
          applySettings: true,
        })
      }
      // After settings save, claim owner identity (fire-and-forget)
      const claimLeagueId = activeHook.result?.leagueId
      if (claimLeagueId && selectedOwner && selectedOwner !== '__none__') {
        api.claimImportOwner(claimLeagueId, selectedOwner).catch(err => {
          console.error('Owner claim failed:', err)
        })
      }
    } catch (err) {
      console.error('Failed to confirm settings:', err)
    } finally {
      setConfirmLoading(false)
      setStep(5)
      // Fetch health report in background
      const leagueId = activeHook.result?.leagueId
      if (leagueId) {
        setHealthLoading(true)
        api.getImportHealth(leagueId).then(h => setHealth(h)).catch(() => {}).finally(() => setHealthLoading(false))
      }
    }
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
      case 'yahoo': return leagueId.trim().length > 0 && (yahooOAuth.status?.connected || yahooToken.trim().length > 0)
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
          </div>

          {/* Custom Data Import — Featured CTA */}
          <div className="mb-6 bg-gradient-to-r from-accent-gold/10 to-purple-500/10 border border-accent-gold/30 rounded-xl p-4 hover:border-accent-gold/50 transition-colors">
            <Link to="/import/custom" className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent-gold/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Custom Data Import</p>
                <p className="text-xs text-text-secondary">
                  Upload spreadsheets, paste from Google Sheets, or let us scrape your league website. Import trophies, punishments, records — anything your platform doesn't track.
                </p>
              </div>
              <svg className="w-5 h-5 text-accent-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <StepIndicator current={step} total={6} />

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
                    Sleeper is the easiest import — just paste your league ID and we'll pull everything automatically.
                  </p>
                  <HelpGuide
                    title="How do I find my Sleeper league ID?"
                    steps={[
                      'Open Sleeper on your phone or go to sleeper.com on desktop',
                      'Navigate to your league',
                      <span key="s3"><strong>Mobile:</strong> Tap Settings (gear icon) → scroll down to see your League ID</span>,
                      <span key="s4"><strong>Desktop:</strong> Look at the URL — it\'s the long number in <span className="font-mono text-accent-gold">sleeper.com/leagues/XXXXXXXXXX</span></span>,
                      'Copy the number and paste it below',
                    ]}
                    tip="Sleeper's API is public — no login or authorization needed. Any league member can import."
                  />
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
                    ESPN only stores data from 2018 onwards — Clutch preserves it forever.
                  </p>
                  <HelpGuide
                    title="How do I find my ESPN league ID?"
                    steps={[
                      <span key="e1">Go to <span className="font-mono text-accent-gold">fantasy.espn.com</span> and log in</span>,
                      'Click on your league name to open it',
                      <span key="e3">Look at the URL in your browser — find the number after <span className="font-mono text-accent-gold">leagueId=</span></span>,
                      <span key="e4">Example: fantasy.espn.com/football/league?leagueId=<span className="text-accent-gold font-bold">12345678</span></span>,
                    ]}
                    tip="For public leagues, you just need the ID. Private leagues also need your ESPN cookies (we'll show you how below)."
                  />
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-text-secondary mb-1">League ID</label>
                    <input
                      type="text"
                      value={leagueId}
                      onChange={e => setLeagueId(e.target.value)}
                      placeholder="e.g. 12345678"
                      className="w-full px-4 py-3 bg-dark-tertiary border border-dark-tertiary rounded-lg text-white font-mono text-sm focus:outline-none focus:border-accent-gold transition-colors"
                    />
                  </div>

                  <HelpGuide
                    title="Private league? How to get your ESPN cookies"
                    steps={[
                      <span key="c1">Open your ESPN league page in <strong>Chrome</strong> (make sure you're logged in)</span>,
                      <span key="c2">Press <span className="font-mono bg-dark-primary px-1 rounded">F12</span> (or right-click → Inspect) to open Developer Tools</span>,
                      <span key="c3">Click the <strong>Application</strong> tab at the top (you may need to click <span className="font-mono">&gt;&gt;</span> to find it)</span>,
                      <span key="c4">In the left sidebar, expand <strong>Cookies</strong> → click <strong>espn.com</strong></span>,
                      <span key="c5">Find <span className="font-mono text-accent-gold">espn_s2</span> — copy the entire value (it's long)</span>,
                      <span key="c6">Find <span className="font-mono text-accent-gold">SWID</span> — copy the value (looks like <span className="font-mono">&#123;GUID&#125;</span>)</span>,
                      'Paste both values below',
                    ]}
                    tip="Public leagues don't need cookies — leave these blank and just use your League ID."
                  />
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">espn_s2 cookie</label>
                      <input
                        type="text"
                        value={espnS2}
                        onChange={e => setEspnS2(e.target.value)}
                        placeholder="AEB... (leave blank for public leagues)"
                        className="w-full px-3 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white font-mono text-xs focus:outline-none focus:border-accent-gold transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">SWID cookie</label>
                      <input
                        type="text"
                        value={espnSwid}
                        onChange={e => setEspnSwid(e.target.value)}
                        placeholder="{XXXXXXXX-XXXX-...} (leave blank for public leagues)"
                        className="w-full px-3 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white font-mono text-xs focus:outline-none focus:border-accent-gold transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Yahoo */}
              {platform?.id === 'yahoo' && (
                <div>
                  {/* Yahoo OAuth Error */}
                  {yahooError && (
                    <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                      <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <p className="text-sm text-red-400">{yahooError}</p>
                        <button onClick={() => { setYahooError(null); setShowManualToken(true) }} className="text-xs text-text-muted hover:text-text-secondary mt-1">
                          Try pasting a token manually instead
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Connection Status */}
                  {yahooOAuth.loading ? (
                    <div className="flex items-center gap-2 mb-4 text-text-secondary text-sm">
                      <div className="animate-spin w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full" />
                      Checking Yahoo connection...
                    </div>
                  ) : yahooOAuth.status?.connected ? (
                    <div className="mb-4">
                      <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-4">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">Connected to Yahoo</p>
                          <p className="text-xs text-text-muted">
                            {yahooOAuth.status.isExpired
                              ? 'Token expired — will auto-refresh on import'
                              : `Last updated ${new Date(yahooOAuth.status.lastUpdated).toLocaleDateString()}`
                            }
                          </p>
                        </div>
                        <button
                          onClick={yahooOAuth.disconnect}
                          className="text-xs text-text-muted hover:text-red-400 transition-colors"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <p className="text-sm text-text-secondary mb-4">
                        Connect your Yahoo account to import your league history. You don't need to be commissioner — any league member can import.
                      </p>
                      <button
                        onClick={yahooOAuth.connect}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors mb-3"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.572 6.854L8.895 13.5h2.112l-1.253 3.646L14.23 10.5h-2.112l.454-3.646zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
                        </svg>
                        Connect with Yahoo
                      </button>
                      <p className="text-xs text-text-muted text-center">
                        You'll be redirected to Yahoo to authorize read-only access to your fantasy leagues.
                      </p>
                    </div>
                  )}

                  {/* League ID — always shown */}
                  <HelpGuide
                    title="How do I find my Yahoo league ID?"
                    steps={[
                      <span key="y1">Go to <span className="font-mono text-accent-gold">football.fantasysports.yahoo.com</span> and log in</span>,
                      'Click on your league name to open it',
                      <span key="y3">Look at the URL — the number at the end is your league ID</span>,
                      <span key="y4">Example: football.fantasysports.yahoo.com/f1/<span className="text-accent-gold font-bold">123456</span></span>,
                    ]}
                    tip="You don't need to be commissioner — any league member can import. We'll pull all available history automatically."
                  />
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-text-secondary mb-1">League ID (number only)</label>
                    <input
                      type="text"
                      value={leagueId}
                      onChange={e => setLeagueId(e.target.value)}
                      placeholder="e.g. 123456"
                      className="w-full px-4 py-3 bg-dark-tertiary border border-dark-tertiary rounded-lg text-white font-mono text-sm focus:outline-none focus:border-accent-gold transition-colors"
                      onKeyDown={e => e.key === 'Enter' && canDiscover() && handleDiscover()}
                    />
                  </div>

                  {/* Yahoo per-year ID education note */}
                  <div className="flex items-start gap-2.5 bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 mb-3">
                    <svg className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-xs text-text-secondary">
                      <p className="font-medium text-purple-300 mb-1">Yahoo assigns a new league ID each year</p>
                      <p>When your league renews, Yahoo creates a new numeric ID (e.g. 2019 = #1253891, 2020 = #1090977). We'll auto-discover linked seasons, but if older years are missing, import them separately using that year's ID and merge into the same Clutch league.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 mb-4">
                    <svg className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-xs text-text-secondary">
                      <p className="font-medium text-purple-300 mb-1">Yahoo's API can be slow</p>
                      <p>Yahoo aggressively rate-limits their fantasy API. If you see a rate limit error, that's Yahoo's servers — not us. Wait 30-60 seconds and try again.</p>
                    </div>
                  </div>

                  {/* Manual token fallback */}
                  {!yahooOAuth.status?.connected && (
                    <div className="border-t border-dark-border pt-3 mt-3">
                      <button
                        onClick={() => setShowManualToken(!showManualToken)}
                        className="flex items-center gap-2 text-xs text-text-muted hover:text-text-secondary transition-colors"
                      >
                        <svg className={`w-3 h-3 transition-transform ${showManualToken ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Already have an access token? Paste it manually
                      </button>
                      {showManualToken && (
                        <div className="mt-3">
                          <textarea
                            value={yahooToken}
                            onChange={e => setYahooToken(e.target.value)}
                            placeholder="Paste your Yahoo OAuth access token here..."
                            rows={3}
                            className="w-full px-4 py-3 bg-dark-tertiary border border-dark-tertiary rounded-lg text-white font-mono text-xs focus:outline-none focus:border-accent-gold transition-colors resize-none"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Fantrax */}
              {platform?.id === 'fantrax' && (
                <div>
                  <p className="text-sm text-text-secondary mb-4">
                    Fantrax doesn't have a public API, so we import via CSV export.
                  </p>
                  <HelpGuide
                    title="How do I export my data from Fantrax?"
                    steps={[
                      <span key="f1">Go to <span className="font-mono text-accent-gold">fantrax.com</span> and open your league</span>,
                      <span key="f2">Click <strong>League</strong> in the top nav → <strong>Standings</strong></span>,
                      <span key="f3">Look for the <strong>Export / CSV</strong> icon in the top-right corner of the standings table</span>,
                      'Click it to download the CSV file',
                      <span key="f5"><strong>Optional:</strong> Go to League → Draft Results and export that too for draft history</span>,
                      'Upload the file(s) below',
                    ]}
                    tip="You'll need to export one season at a time. Run the import multiple times for multiple years of history."
                  />

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
                  </p>
                  <HelpGuide
                    title="How do I find my MFL league ID and API key?"
                    steps={[
                      <span key="m1">Go to <span className="font-mono text-accent-gold">myfl.com</span> and log in to your league</span>,
                      <span key="m2">Your league ID is in the URL: myfl.com/20XX/home/<span className="text-accent-gold font-bold">XXXXX</span></span>,
                      <span key="m3"><strong>For the API key:</strong> Click <strong>Commissioner</strong> → <strong>My League</strong> → <strong>League Settings</strong></span>,
                      'Scroll down to find the API Key section and copy the key',
                    ]}
                    tip="The API key requires commissioner access. If you're not the commish, ask them to share it with you — it's read-only."
                  />
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-text-secondary mb-1">League ID</label>
                    <input
                      type="text"
                      value={leagueId}
                      onChange={e => setLeagueId(e.target.value)}
                      placeholder="e.g. 12345"
                      className="w-full px-4 py-3 bg-dark-tertiary border border-dark-tertiary rounded-lg text-white font-mono text-sm focus:outline-none focus:border-accent-gold transition-colors"
                    />
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
                  {activeHook.discovery.seasons?.map((s, idx) => {
                    const year = parseInt(s.season || s.year)
                    const isSelected = selectedSeasons.includes(year)
                    return (
                      <div
                        key={s.leagueKey || s.sleeperLeagueId || s.year || idx}
                        className={`flex items-center justify-between py-2 px-3 bg-dark-tertiary/50 rounded-lg cursor-pointer transition-opacity ${isSelected ? '' : 'opacity-40'}`}
                        onClick={() => setSelectedSeasons(prev =>
                          prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded border-dark-border text-accent-gold focus:ring-accent-gold/50 bg-dark-tertiary cursor-pointer"
                          />
                          <span className="font-mono font-bold text-accent-gold">{s.season || s.year}</span>
                          <span className="text-sm text-white">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {platform?.id === 'yahoo' && s.leagueKey && (
                            <span className="text-xs font-mono text-text-muted">ID: {s.leagueKey.split('.l.')[1] || s.leagueKey}</span>
                          )}
                          <span className="text-xs font-mono text-text-secondary">{s.totalRosters || s.teamCount} teams</span>
                          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                            s.status === 'complete' ? 'bg-green-500/20 text-green-400' : 'bg-accent-gold/20 text-accent-gold'
                          }`}>
                            {s.status}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className={`mb-4 p-4 rounded-lg border ${targetLeagueId ? 'bg-accent-gold/5 border-accent-gold/30' : 'bg-dark-tertiary/50 border-accent-gold/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <label className="text-sm font-display font-bold text-white">Where should this go?</label>
                  </div>
                  <select
                    value={targetLeagueId}
                    onChange={e => setTargetLeagueId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-tertiary border border-dark-border rounded-lg text-white text-sm font-medium focus:outline-none focus:border-accent-gold transition-colors"
                  >
                    <option value="">+ Create new league</option>
                    {existingLeagues.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                  {existingLeagues.length > 0 && !targetLeagueId && (
                    <p className="text-xs text-accent-gold mt-2">
                      Already imported this league from another platform? Select it above to merge seasons together.
                    </p>
                  )}
                  {targetLeagueId && (
                    <p className="text-xs text-green-400 mt-2">
                      Seasons will be added to the existing league vault.
                    </p>
                  )}
                </div>

                {activeHook.error && (
                  <p className="text-sm text-red-400 mb-4">{activeHook.error}</p>
                )}

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => { setStep(1); activeHook.reset() }}>Back</Button>
                  <Button onClick={handleImport} disabled={selectedSeasons.length === 0}>
                    {selectedSeasons.length === 0
                      ? 'Select at least 1 season'
                      : selectedSeasons.length < (activeHook.discovery.totalSeasons || 0)
                        ? `Import ${selectedSeasons.length} of ${activeHook.discovery.totalSeasons} Seasons`
                        : `Import ${activeHook.discovery.totalSeasons} Season${activeHook.discovery.totalSeasons !== 1 ? 's' : ''}`
                    }
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Step 3: Importing */}
          {step === 3 && (() => {
            const seasonCount = selectedSeasons.length || activeHook.discovery?.totalSeasons || 1
            const teamCount = activeHook.discovery?.teamCount || 12
            // Rough estimate: per season — ~17 weeks of matchups, rosters for each team, draft picks, transactions
            // Each season ≈ (teams × 17 weeks × 2 matchup sides) + (teams × roster) + (teams × draft picks) + transactions
            const dataPointsPerSeason = (teamCount * 17 * 2) + (teamCount * 15) + (teamCount * 15) + (teamCount * 8)
            const totalDataPoints = seasonCount * dataPointsPerSeason
            const formattedDataPoints = totalDataPoints >= 1000
              ? `${(totalDataPoints / 1000).toFixed(1).replace(/\.0$/, '')}k`
              : String(totalDataPoints)
            const timeEstimate = seasonCount <= 3 ? '2–3' : seasonCount <= 8 ? '3–5' : seasonCount <= 15 ? '5–10' : '10–15'

            return (
              <Card className="text-center py-12 px-6">
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-accent-gold/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-accent-gold animate-spin" />
                </div>
                <h2 className="text-xl font-display font-bold text-white mb-2">
                  Importing {seasonCount} season{seasonCount !== 1 ? 's' : ''} of history...
                </h2>
                <p className="text-sm text-text-secondary mb-6">
                  Pulling rosters, matchups, drafts, standings, and transactions for every season.
                </p>

                {/* Data volume callout */}
                <div className="inline-flex items-center gap-3 bg-dark-tertiary/40 border border-dark-border rounded-lg px-4 py-2.5 mb-5">
                  <span className="text-2xl font-mono font-bold text-accent-gold">{formattedDataPoints}+</span>
                  <span className="text-xs text-text-secondary text-left leading-tight">
                    data points across {seasonCount} season{seasonCount !== 1 ? 's' : ''}<br />
                    <span className="text-text-muted">matchups · rosters · drafts · transactions</span>
                  </span>
                </div>

                <div className="bg-accent-gold/10 border border-accent-gold/20 rounded-lg p-4 max-w-sm mx-auto">
                  <p className="text-sm font-medium text-accent-gold mb-1">This usually takes {timeEstimate} minutes</p>
                  <p className="text-xs text-text-muted">
                    We're pulling every detail from the API — one season at a time. Don't close this tab or press back. It's working.
                  </p>
                </div>
              </Card>
            )
          })()}

          {/* Step 4: Confirm Your League */}
          {step === 4 && activeHook.result && (
            <div className="space-y-4">
              <Card className="py-6 px-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-accent-gold/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-bold text-white">Confirm Your League</h2>
                    <p className="text-xs text-text-secondary">We detected these settings from your import. Review and adjust if needed.</p>
                  </div>
                </div>

                {/* Detected Settings */}
                <div className="space-y-3 mb-6">
                  <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">League Settings</h3>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Format */}
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Format</label>
                      <select
                        value={editSettings.format}
                        onChange={e => setEditSettings(s => ({ ...s, format: e.target.value }))}
                        className="w-full bg-dark-tertiary border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-gold focus:outline-none"
                      >
                        <option value="">Not detected</option>
                        <option value="HEAD_TO_HEAD">Head-to-Head</option>
                        <option value="FULL_LEAGUE">Total Points</option>
                        <option value="ROTO">Roto</option>
                        <option value="SURVIVOR">Survivor</option>
                        <option value="ONE_AND_DONE">One and Done</option>
                      </select>
                    </div>

                    {/* Draft Type */}
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Draft Type</label>
                      <select
                        value={editSettings.draftType}
                        onChange={e => setEditSettings(s => ({ ...s, draftType: e.target.value }))}
                        className="w-full bg-dark-tertiary border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-gold focus:outline-none"
                      >
                        <option value="">Not detected</option>
                        <option value="SNAKE">Snake</option>
                        <option value="AUCTION">Auction</option>
                        <option value="NONE">None</option>
                      </select>
                    </div>

                    {/* Team Count */}
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Teams</label>
                      <input
                        type="number"
                        value={editSettings.maxTeams}
                        onChange={e => setEditSettings(s => ({ ...s, maxTeams: e.target.value }))}
                        placeholder="Not detected"
                        min={2}
                        max={32}
                        className="w-full bg-dark-tertiary border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-gold focus:outline-none"
                      />
                    </div>

                    {/* Scoring Type */}
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Scoring</label>
                      <select
                        value={editSettings.scoringType}
                        onChange={e => setEditSettings(s => ({ ...s, scoringType: e.target.value }))}
                        className="w-full bg-dark-tertiary border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-gold focus:outline-none"
                      >
                        <option value="">Not detected</option>
                        <option value="standard">Standard</option>
                        <option value="ppr">PPR</option>
                        <option value="half_ppr">Half PPR</option>
                      </select>
                    </div>

                    {/* Roster Size */}
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Roster Size</label>
                      <input
                        type="number"
                        value={editSettings.rosterSize}
                        onChange={e => setEditSettings(s => ({ ...s, rosterSize: e.target.value }))}
                        placeholder="Not detected"
                        min={5}
                        max={53}
                        className="w-full bg-dark-tertiary border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-gold focus:outline-none"
                      />
                    </div>

                    {/* Waiver Type */}
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Waivers</label>
                      <select
                        value={editSettings.waiverType}
                        onChange={e => setEditSettings(s => ({ ...s, waiverType: e.target.value }))}
                        className="w-full bg-dark-tertiary border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-gold focus:outline-none"
                      >
                        <option value="">Not detected</option>
                        <option value="faab">FAAB</option>
                        <option value="rolling">Rolling Priority</option>
                      </select>
                    </div>

                    {/* FAAB Budget — only show if waiver type is FAAB */}
                    {editSettings.waiverType === 'faab' && (
                      <div>
                        <label className="text-xs text-text-muted block mb-1">FAAB Budget</label>
                        <input
                          type="number"
                          value={editSettings.faabBudget}
                          onChange={e => setEditSettings(s => ({ ...s, faabBudget: e.target.value }))}
                          placeholder="100"
                          min={0}
                          className="w-full bg-dark-tertiary border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-gold focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Playoff Teams */}
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Playoff Teams</label>
                      <input
                        type="number"
                        value={editSettings.playoffTeams}
                        onChange={e => setEditSettings(s => ({ ...s, playoffTeams: e.target.value }))}
                        placeholder="Not detected"
                        min={2}
                        max={16}
                        className="w-full bg-dark-tertiary border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-gold focus:outline-none"
                      />
                    </div>
                  </div>

                  {platform?.id === 'fantrax' && (
                    <p className="text-xs text-text-muted mt-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-accent-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Fantrax CSV imports have limited settings data. Fill in what you know — you can always update later.
                    </p>
                  )}
                </div>

                {/* Which Team Is Yours? */}
                {activeOwners.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-1">
                      Which Team Is Yours?
                    </h3>
                    <p className="text-xs text-text-muted mb-3">
                      Select your team so we can link your history to your Clutch Rating.
                    </p>
                    <div className="space-y-1.5">
                      {activeOwners.map((owner, i) => {
                        const isSelected = selectedOwner === owner.ownerName
                        const isAutoMatched = owner.claimed
                        return (
                          <label
                            key={i}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'border border-accent-gold/30 bg-accent-gold/5'
                                : 'bg-dark-tertiary/40 border border-transparent hover:border-dark-border'
                            }`}
                            onClick={() => setSelectedOwner(owner.ownerName)}
                          >
                            <input
                              type="radio"
                              name="ownerClaim"
                              checked={isSelected}
                              onChange={() => setSelectedOwner(owner.ownerName)}
                              className="w-4 h-4 text-accent-gold border-dark-border focus:ring-accent-gold/50 bg-dark-tertiary"
                            />
                            <div className="w-7 h-7 rounded-full bg-accent-gold/20 flex items-center justify-center text-xs font-mono font-bold text-accent-gold flex-shrink-0">
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-white font-medium truncate">{owner.ownerName}</p>
                                {isAutoMatched && (
                                  <span className="text-[10px] font-mono text-accent-gold/60 bg-accent-gold/10 px-1.5 py-0.5 rounded">Auto-detected</span>
                                )}
                              </div>
                              {owner.teamName && owner.teamName !== owner.ownerName && (
                                <p className="text-xs text-text-muted truncate">{owner.teamName}</p>
                              )}
                            </div>
                            <span className="text-xs font-mono text-text-secondary">{owner.record}</span>
                            {owner.playoffResult === 'champion' && (
                              <span className="text-xs bg-accent-gold/20 text-accent-gold px-2 py-0.5 rounded-full font-mono">🏆</span>
                            )}
                            {owner.playoffResult === 'runner_up' && (
                              <span className="text-xs bg-dark-tertiary text-text-muted px-2 py-0.5 rounded-full font-mono">🥈</span>
                            )}
                          </label>
                        )
                      })}
                      {/* None of these */}
                      <label
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-all ${
                          selectedOwner === '__none__'
                            ? 'border border-dark-border bg-dark-tertiary/60'
                            : 'bg-dark-tertiary/20 border border-transparent hover:border-dark-border'
                        }`}
                        onClick={() => setSelectedOwner('__none__')}
                      >
                        <input
                          type="radio"
                          name="ownerClaim"
                          checked={selectedOwner === '__none__'}
                          onChange={() => setSelectedOwner('__none__')}
                          className="w-4 h-4 text-accent-gold border-dark-border focus:ring-accent-gold/50 bg-dark-tertiary"
                        />
                        <p className="text-sm text-text-muted">None of these are me</p>
                      </label>
                    </div>
                    <p className="text-xs text-text-muted mt-2">
                      You can also claim your team later in the League Vault.
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => handleConfirmSettings(false)}
                    disabled={confirmLoading}
                    className="flex-1"
                  >
                    Skip for Now
                  </Button>
                  <Button
                    onClick={() => handleConfirmSettings(true)}
                    disabled={confirmLoading}
                    className="flex-1"
                  >
                    {confirmLoading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-dark-primary/30 border-t-dark-primary rounded-full animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      'Confirm & Save'
                    )}
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Step 5: Complete + Health Verification */}
          {step === 5 && activeHook.result && (
            <div className="space-y-4">
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

                {/* Health Score */}
                {healthLoading ? (
                  <div className="flex items-center justify-center gap-2 text-text-secondary text-sm mb-4">
                    <div className="animate-spin w-4 h-4 border-2 border-accent-gold/30 border-t-accent-gold rounded-full" />
                    Checking data quality...
                  </div>
                ) : health ? (
                  <div className="mb-4">
                    {/* Health bar */}
                    <div className="flex items-center gap-3 max-w-sm mx-auto mb-3">
                      <span className="text-xs font-mono text-text-secondary whitespace-nowrap">Import Health</span>
                      <div className="flex-1 h-3 bg-dark-tertiary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            health.overallStatus === 'green' ? 'bg-green-500' :
                            health.overallStatus === 'yellow' ? 'bg-accent-gold' : 'bg-red-500'
                          }`}
                          style={{ width: `${health.overallScore}%` }}
                        />
                      </div>
                      <span className={`text-sm font-mono font-bold ${
                        health.overallStatus === 'green' ? 'text-green-400' :
                        health.overallStatus === 'yellow' ? 'text-accent-gold' : 'text-red-400'
                      }`}>
                        {health.overallScore}%
                      </span>
                    </div>

                    {health.overallStatus === 'green' ? (
                      <p className="text-sm text-green-400 flex items-center justify-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        All seasons look healthy
                      </p>
                    ) : (
                      <p className={`text-sm ${health.overallStatus === 'yellow' ? 'text-accent-gold' : 'text-red-400'}`}>
                        {health.overallStatus === 'yellow' ? 'Needs Review' : 'Issues Detected'}
                      </p>
                    )}
                  </div>
                ) : null}

                {/* Next Steps */}
                <div className="bg-accent-gold/5 border border-accent-gold/20 rounded-xl p-4 max-w-md mx-auto mb-6 text-left">
                  <p className="text-sm font-display font-bold text-white mb-3">What's next?</p>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-accent-gold/20 flex items-center justify-center text-[10px] font-mono font-bold text-accent-gold flex-shrink-0 mt-0.5">1</span>
                      <div>
                        <p className="text-xs text-white font-bold">Assign teams to owners</p>
                        <p className="text-[11px] text-text-muted">
                          Your history has fantasy team names — connect them to real people so we can build accurate all-time records.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-accent-gold/20 flex items-center justify-center text-[10px] font-mono font-bold text-accent-gold flex-shrink-0 mt-0.5">2</span>
                      <div>
                        <p className="text-xs text-white font-bold">Explore your League Vault</p>
                        <p className="text-[11px] text-text-muted">
                          All-time standings, head-to-head records, championship counts, and more — all computed from your imported history.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-center">
                  <Button variant="ghost" onClick={handleReset}>Import Another</Button>
                  <Button onClick={() => navigate(`/leagues/${activeHook.result.leagueId}/vault`)}>
                    Open League Vault →
                  </Button>
                </div>
              </Card>

              {/* Issue List */}
              {health && health.issues && health.issues.length > 0 && health.overallStatus !== 'green' && (
                <Card>
                  <h3 className="font-display font-bold text-white mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    {health.issues.filter(i => i.severity !== 'info').length} issue{health.issues.filter(i => i.severity !== 'info').length !== 1 ? 's' : ''} found
                  </h3>

                  {/* Group missing seasons together */}
                  {health.missingYears?.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3">
                      <p className="text-sm text-white font-medium mb-1">
                        Missing: {health.missingYears.join(', ')}
                      </p>
                      <p className="text-xs text-text-secondary mb-2">
                        These years were not found in the import. You can add them manually.
                      </p>
                      <button
                        onClick={() => navigate(`/leagues/${activeHook.result.leagueId}/vault`)}
                        className="text-xs font-mono text-accent-gold hover:text-accent-gold/80"
                      >
                        Add Missing Seasons in Vault &rarr;
                      </button>
                    </div>
                  )}

                  {/* Other issues */}
                  {health.issues
                    .filter(i => i.type !== 'MISSING_SEASON' && i.severity !== 'info')
                    .map((issue, idx) => (
                      <div key={idx} className={`rounded-lg p-3 mb-2 ${
                        issue.severity === 'high' ? 'bg-red-500/10 border border-red-500/20' :
                        issue.severity === 'medium' ? 'bg-accent-gold/10 border border-accent-gold/20' :
                        'bg-dark-tertiary/50 border border-dark-border'
                      }`}>
                        <p className="text-sm text-white">{issue.message}</p>
                        {issue.repairLabel && (
                          <button
                            onClick={() => navigate(`/leagues/${activeHook.result.leagueId}/vault?editYear=${issue.seasonYear}`)}
                            className="text-xs font-mono text-accent-gold hover:text-accent-gold/80 mt-1"
                          >
                            {issue.repairLabel} &rarr;
                          </button>
                        )}
                      </div>
                    ))
                  }

                  {/* Info-only items (excluding orphan owners — shown separately) */}
                  {health.issues.filter(i => i.severity === 'info' && i.type !== 'ORPHAN_OWNER').length > 0 && (
                    <div className="mt-2 pt-2 border-t border-dark-tertiary/50">
                      {health.issues.filter(i => i.severity === 'info' && i.type !== 'ORPHAN_OWNER').map((issue, idx) => (
                        <p key={idx} className="text-xs text-text-secondary py-1">{issue.message}</p>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {/* Owner Mapping Callout — friendly, not scary */}
              {health && (() => {
                const orphans = health.issues?.filter(i => i.type === 'ORPHAN_OWNER') || []
                if (orphans.length === 0) return null
                return (
                  <Card>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">👥</span>
                      <div className="flex-1">
                        <h3 className="font-display font-bold text-white mb-1">One Quick Step: Map Your Owners</h3>
                        <p className="text-sm text-text-secondary mb-2">
                          Yahoo hides manager names on older seasons (pre-2013), so we imported them
                          using team names instead. This is a Yahoo limitation, not a bug — we pulled
                          all the data we could.
                          Just tap <strong className="text-white">Manage Owners</strong> in the Vault to
                          match team names to real people. Takes about a minute, and you only have to do it once.
                        </p>
                        <p className="text-xs text-text-secondary/60 font-mono mb-3">
                          {orphans.length} team name{orphans.length !== 1 ? 's' : ''} to map
                        </p>
                        <button
                          onClick={() => navigate(`/leagues/${activeHook.result.leagueId}/vault`)}
                          className="text-sm font-mono text-accent-gold hover:text-accent-gold/80"
                        >
                          Manage Owners in Vault &rarr;
                        </button>
                      </div>
                    </div>
                  </Card>
                )
              })()}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default ImportLeague
