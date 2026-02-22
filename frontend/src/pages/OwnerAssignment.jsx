import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useOwnerAssignment, formatYearRanges } from '../hooks/useOwnerAssignment'
import VaultLoadingScreen from '../components/vault/VaultLoadingScreen'
import VaultRevealView from '../components/vault/VaultRevealView'
import ShareModal from '../components/vault/ShareModal'

// ─── Step Indicator ──────────────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: 'Identify Owners' },
  { num: 2, label: 'Assign Teams' },
  { num: 3, label: 'League Vault' },
]

const StepIndicator = ({ current }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {STEPS.map((s, i) => {
      const isComplete = current > s.num
      const isActive = current === s.num
      return (
        <div key={s.num} className="flex items-center gap-2">
          {i > 0 && (
            <div className={`w-8 sm:w-12 h-px ${isComplete || isActive ? 'bg-accent-gold/50' : 'bg-[var(--card-border)]'}`} />
          )}
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-colors ${
              isComplete ? 'bg-accent-gold text-slate' :
              isActive ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold' :
              'bg-[var(--bg-alt)] text-text-muted border border-[var(--card-border)]'
            }`}>
              {isComplete ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : s.num}
            </div>
            <span className={`text-xs font-display font-bold hidden sm:inline ${
              isActive ? 'text-text-primary' : 'text-text-muted'
            }`}>
              {s.label}
            </span>
          </div>
        </div>
      )
    })}
  </div>
)

// ─── Team Card (Step 2) ─────────────────────────────────────────────────────

const TeamCard = ({ rawName, years, totalWins, totalLosses, totalPF, hasChampionship, entries, isClaiming, isClickable, activeOwnerColor, onClick }) => (
  <button
    onClick={isClickable ? onClick : undefined}
    disabled={!isClickable}
    className={`w-full text-left p-3 rounded-xl border transition-all duration-300 ${
      isClaiming
        ? 'scale-95 opacity-0 pointer-events-none'
        : isClickable
          ? 'bg-[var(--surface)] border-[var(--card-border)] hover:bg-[var(--bg-alt)] cursor-pointer'
          : 'bg-[var(--surface)] border-[var(--card-border)]/50 opacity-60 cursor-default'
    }`}
    style={isClickable && activeOwnerColor ? { borderColor: activeOwnerColor + '40' } : {}}
  >
    <div className="flex items-center justify-between mb-1">
      <span className="text-sm font-display font-bold text-text-primary truncate pr-2" title={rawName}>{rawName}</span>
      {hasChampionship && <span className="text-accent-gold text-xs flex-shrink-0" title="Champion">&#9733;</span>}
    </div>
    <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
      <span>{years.length === 1 ? String(years[0]) : formatYearRanges(years)}</span>
      <span className="text-text-muted">|</span>
      <span>{totalWins}-{totalLosses}</span>
      <span className="text-text-muted">|</span>
      <span>{totalPF.toFixed(1)} PF</span>
    </div>
    {entries.length > 1 && (
      <div className="mt-1.5 text-[10px] font-mono text-text-muted">
        {entries.length} season{entries.length !== 1 ? 's' : ''}
      </div>
    )}
  </button>
)

// ─── Progress Bar ────────────────────────────────────────────────────────────

const ProgressBar = ({ progress, owners }) => {
  if (progress.total === 0) return null
  return (
    <div className="mb-4">
      <div className="h-2 bg-[var(--stone)] rounded-full overflow-hidden flex">
        {[...owners].map(([name, data]) => {
          const count = progress.perOwner.get(name) || 0
          const pct = (count / progress.total) * 100
          if (pct === 0) return null
          return (
            <div
              key={name}
              className="h-full transition-all duration-500 ease-out"
              style={{ width: `${pct}%`, backgroundColor: data.color }}
              title={`${name}: ${count}`}
            />
          )
        })}
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[11px] font-mono text-text-muted">
          {progress.claimed} of {progress.total} assigned
        </span>
        <span className="text-[11px] font-mono text-text-secondary">
          {progress.remaining} remaining
        </span>
      </div>
    </div>
  )
}

// ─── Owner Chip Bar ──────────────────────────────────────────────────────────

const OwnerChipBar = ({ owners, activeOwnerId, setActiveOwnerId, progress }) => (
  <div className="flex flex-wrap gap-1.5 mb-4">
    {[...owners].map(([name, data], i) => {
      const isActive = activeOwnerId === name
      const count = progress.perOwner.get(name) || 0
      return (
        <button
          key={name}
          onClick={() => setActiveOwnerId(isActive ? null : name)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-display font-bold transition-all duration-200 ${
            isActive
              ? 'text-slate shadow-lg ring-1'
              : 'text-text-primary/80 hover:text-text-primary border border-[var(--card-border)] hover:border-[var(--card-border)]'
          }`}
          style={isActive
            ? { backgroundColor: data.color, boxShadow: `0 0 16px ${data.color}40`, ringColor: data.color }
            : {}
          }
        >
          <span className="hidden sm:inline text-[9px] opacity-50 font-mono">{i + 1}</span>
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: data.color }}
          />
          {name}
          <span className={`text-[10px] font-mono ${isActive ? 'opacity-70' : 'opacity-50'}`}>{count}</span>
        </button>
      )
    })}
  </div>
)

// ─── Step 1: Identify Owners ─────────────────────────────────────────────────

const Step1IdentifyOwners = ({ wizard }) => {
  const [manualInput, setManualInput] = useState('')
  const inputRef = useRef(null)
  const {
    owners, detectedNames, uniqueRawNames, rawNameToEntries, nameToYears, availableYears,
    addOwner, removeOwner, renameOwner, toggleOwnerActive, dismissDetection,
    canProceedToStep2, setStep, assignments,
  } = wizard

  // Already-added owner names (to filter them from detected)
  const ownerNameSet = new Set([...owners.keys()].map(n => n.toLowerCase()))
  const filteredDetections = detectedNames.filter(d => !ownerNameSet.has(d.name.toLowerCase()))

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (manualInput.trim()) {
      const added = addOwner(manualInput.trim())
      if (added) setManualInput('')
    }
  }

  // Group rawNames by season (newest first) for reference panel
  const seasonGroups = [...availableYears].map(year => {
    const entries = []
    for (const [rawName, es] of rawNameToEntries) {
      const match = es.find(e => e.seasonYear === year)
      if (match) entries.push(match)
    }
    entries.sort((a, b) => (a.wins + a.losses > 0 && b.wins + b.losses > 0)
      ? (b.wins / (b.wins + b.losses || 1)) - (a.wins / (a.wins + a.losses || 1))
      : 0
    )
    return { year, entries }
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Main content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-text-primary mb-1">
            Who's in this league?
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Your imported history has fantasy team names — not real names. List every person who has
            ever played in this league so we can connect old team names to real owners and build
            accurate all-time records.
          </p>
        </div>

        {/* Auto-detected names */}
        {filteredDetections.length > 0 && (
          <div className="bg-accent-gold/5 border border-accent-gold/20 rounded-xl p-4">
            <h3 className="text-sm font-display font-bold text-accent-gold mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              We found some names
            </h3>
            <div className="space-y-1.5">
              {filteredDetections.map(({ name, seasons }) => (
                <div key={name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--bg-alt)] transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-text-primary font-display truncate">{name}</span>
                    {seasons.length > 0 && (
                      <span className="text-[10px] font-mono text-text-secondary/60 flex-shrink-0">
                        {formatYearRanges(seasons)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => addOwner(name)}
                      className="px-2.5 py-1 text-xs font-mono text-accent-green border border-accent-green/30 rounded-lg hover:bg-accent-green/10 transition-colors"
                    >
                      &#10003; Add
                    </button>
                    <button
                      onClick={() => dismissDetection(name)}
                      className="px-2.5 py-1 text-xs font-mono text-text-muted hover:text-text-secondary transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual input */}
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            placeholder="Type a name and press Enter..."
            className="flex-1 px-4 py-3 bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg text-text-primary text-sm font-display placeholder:text-text-muted focus:outline-none focus:border-accent-gold transition-colors"
          />
          <button
            type="submit"
            disabled={!manualInput.trim()}
            className="px-4 py-3 bg-accent-gold text-slate rounded-lg font-display font-bold text-sm hover:bg-accent-gold/90 disabled:opacity-30 disabled:cursor-default transition-colors"
          >
            Add
          </button>
        </form>

        {/* Owner lists — Active & Former */}
        {owners.size > 0 && (() => {
          const activeOwners = [...owners].filter(([, d]) => d.isActive)
          const formerOwners = [...owners].filter(([, d]) => !d.isActive)

          const OwnerRow = ({ name, data, index }) => {
            const years = nameToYears[name] || []
            return (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--card-border)]/50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xs font-mono text-text-muted/60 w-5 text-right flex-shrink-0">{index}</span>
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: data.color }}
                  />
                  <span className="text-sm text-text-primary font-display font-bold truncate">{name}</span>
                  {years.length > 0 && (
                    <span className="text-[10px] font-mono text-text-secondary/50 flex-shrink-0">
                      {formatYearRanges(years)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleOwnerActive(name)}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                      data.isActive
                        ? 'text-text-muted bg-[var(--surface)] border border-[var(--card-border)] hover:text-text-secondary'
                        : 'text-accent-green bg-accent-green/10 border border-accent-green/20 hover:bg-accent-green/20'
                    }`}
                    title={data.isActive ? 'Mark as former member' : 'Mark as active member'}
                  >
                    {data.isActive ? 'MARK FORMER' : 'MARK ACTIVE'}
                  </button>
                  <button
                    onClick={() => {
                      const newName = window.prompt('Rename owner:', name)
                      if (newName) renameOwner(name, newName)
                    }}
                    className="text-xs text-text-muted hover:text-accent-gold transition-colors"
                    title="Rename"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => { if (confirm(`Remove ${name}?`)) removeOwner(name) }}
                    className="text-xs text-text-muted hover:text-red-400 transition-colors"
                    title="Remove"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          }

          return (
            <div className="space-y-5">
              {/* Active Owners */}
              <div className="border border-accent-green/20 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-accent-green/5 border-b border-accent-green/20 flex items-center justify-between">
                  <h3 className="text-xs font-mono text-accent-green uppercase tracking-wider font-bold flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Active Owners
                  </h3>
                  <span className="text-sm font-mono font-bold text-accent-green">{activeOwners.length}</span>
                </div>
                <div className="p-2 space-y-1.5">
                  {activeOwners.length > 0 ? activeOwners.map(([name, data], i) => (
                    <OwnerRow key={name} name={name} data={data} index={i + 1} />
                  )) : (
                    <p className="text-xs text-text-muted text-center py-4 font-mono">No active owners yet — add names above</p>
                  )}
                </div>
              </div>

              {/* Former Owners */}
              {formerOwners.length > 0 && (
                <div className="border border-[var(--card-border)]/50 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-[var(--surface)] border-b border-[var(--card-border)]/50 flex items-center justify-between">
                    <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider font-bold flex items-center gap-2">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Former Owners
                    </h3>
                    <span className="text-sm font-mono font-bold text-text-muted">{formerOwners.length}</span>
                  </div>
                  <div className="p-2 space-y-1.5">
                    {formerOwners.map(([name, data], i) => (
                      <OwnerRow key={name} name={name} data={data} index={i + 1} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* Continue button */}
        <button
          onClick={() => setStep(2)}
          disabled={!canProceedToStep2}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-gold to-orange text-slate rounded-lg font-display font-bold text-sm hover:shadow-lg hover:shadow-gold/20 disabled:opacity-30 disabled:cursor-default transition-all"
        >
          Continue to Team Assignment &rarr;
        </button>
      </div>

      {/* Right: Reference panel */}
      <div className="lg:col-span-1">
        <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl p-4 max-h-[70vh] overflow-y-auto sticky top-24">
          <h3 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-3">
            All Imported Teams
          </h3>
          {seasonGroups.map(({ year, entries }) => (
            <div key={year} className="mb-4">
              <div className="text-[11px] font-mono text-accent-gold/70 mb-1.5">{year}</div>
              <div className="space-y-0.5">
                {entries.map((e, i) => (
                  <div key={`${e.rawName}-${i}`} className="flex items-center justify-between px-2 py-1 text-[11px] rounded hover:bg-[var(--surface)]">
                    <span className="text-text-secondary truncate font-display">{e.rawName}</span>
                    <span className="text-text-muted font-mono flex-shrink-0 ml-2">
                      {e.wins}-{e.losses}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {seasonGroups.length === 0 && (
            <p className="text-xs text-text-muted">No imported data yet</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step 2: Assign Teams ────────────────────────────────────────────────────

const Step2AssignTeams = ({ wizard }) => {
  const {
    owners, activeOwnerId, setActiveOwnerId,
    unclaimedCards, claimingCards, ownerClaimedEntries, progress,
    sortMode, setSortMode, seasonFilter, setSeasonFilter,
    availableYears, infoBannerDismissed, setInfoBannerDismissed,
    handleClaimAnimated, unassignTeam, undo, canUndo,
    lastClaimedName, setStep, nameToYears,
  } = wizard

  const activeOwner = activeOwnerId ? owners.get(activeOwnerId) : null
  const [sidebarOpen, setSidebarOpen] = useState(false) // mobile toggle

  // Combine unclaimed + claiming for display
  const allDisplayCards = [
    ...unclaimedCards,
    ...claimingCards.map(c => ({ ...c, isClaiming: true })),
  ]

  // Sort so claiming cards maintain position briefly
  const sortedDisplay = allDisplayCards.sort((a, b) => {
    if (a.isClaiming && !b.isClaiming) return 1
    if (!a.isClaiming && b.isClaiming) return -1
    return 0
  })

  return (
    <div>
      {/* Back to Step 1 */}
      <button
        onClick={() => setStep(1)}
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-accent-gold font-mono mb-4 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Identify Owners
      </button>

      {/* Why This Matters Banner */}
      {!infoBannerDismissed && (
        <div className="mb-5 bg-accent-gold/5 border border-accent-gold/20 rounded-xl p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-accent-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-display font-bold text-text-primary mb-2">Why do I need to do this?</p>
              <p className="text-xs text-text-secondary leading-relaxed mb-2">
                Your imported history has <span className="text-text-primary font-bold">fantasy team names</span>, not owner names.
                Names like "Prestige Worldwide" or "Loud Noises" don't tell us who that person was.
                Before we can build all-time records, head-to-head history, and championship counts,
                you need to connect each team name to the person who owned it.
              </p>
              <p className="text-xs text-text-secondary leading-relaxed">
                <span className="text-accent-gold font-bold">How it works:</span> Select an owner above, then tap every team card that belongs to them.
                Recent seasons are usually auto-assigned — older seasons with creative team names need your help.
              </p>
              <p className="text-[11px] text-text-muted mt-2 font-mono">
                Can't remember who had which team? League members can check their old Yahoo/ESPN accounts for past team names.
              </p>
            </div>
            <button
              onClick={() => setInfoBannerDismissed(true)}
              className="text-text-muted hover:text-text-primary flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Owner Chip Bar */}
      <OwnerChipBar
        owners={owners}
        activeOwnerId={activeOwnerId}
        setActiveOwnerId={setActiveOwnerId}
        progress={progress}
      />

      {/* Filter bar */}
      <div className="flex items-center justify-between mb-3 gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSeasonFilter(null)}
            className={`px-2.5 py-1 text-[11px] font-mono rounded-lg whitespace-nowrap transition-colors ${
              seasonFilter === null
                ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold/30'
                : 'text-text-muted hover:text-text-primary border border-[var(--card-border)]'
            }`}
          >
            All
          </button>
          {availableYears.map(year => (
            <button
              key={year}
              onClick={() => setSeasonFilter(seasonFilter === year ? null : year)}
              className={`px-2.5 py-1 text-[11px] font-mono rounded-lg whitespace-nowrap transition-colors ${
                seasonFilter === year
                  ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold/30'
                  : 'text-text-muted hover:text-text-primary border border-[var(--card-border)]'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setSortMode('season')}
            className={`px-2 py-1 text-[10px] font-mono rounded transition-colors ${
              sortMode === 'season' ? 'text-text-primary bg-[var(--bg-alt)]' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            By Season
          </button>
          <button
            onClick={() => setSortMode('alpha')}
            className={`px-2 py-1 text-[10px] font-mono rounded transition-colors ${
              sortMode === 'alpha' ? 'text-text-primary bg-[var(--bg-alt)]' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            A-Z
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <ProgressBar progress={progress} owners={owners} />

      {/* Main grid + sidebar layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Grid area */}
        <div className="lg:col-span-3">
          {!activeOwnerId && unclaimedCards.length > 0 && (
            <div className="text-center py-8 text-text-muted text-sm font-display">
              Select an owner above to start assigning teams
            </div>
          )}

          {unclaimedCards.length === 0 && claimingCards.length === 0 && (
            <div className="text-center py-12">
              <div className="w-14 h-14 bg-accent-green/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-display font-bold text-text-primary mb-1">All teams assigned!</p>
              <p className="text-xs text-text-secondary">Every team has been mapped to an owner.</p>
            </div>
          )}

          {(unclaimedCards.length > 0 || claimingCards.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {sortedDisplay.map(card => (
                <TeamCard
                  key={card.rawName}
                  rawName={card.rawName}
                  years={card.years}
                  totalWins={card.totalWins}
                  totalLosses={card.totalLosses}
                  totalPF={card.totalPF}
                  hasChampionship={card.hasChampionship}
                  entries={card.entries || card.allEntries}
                  isClaiming={!!card.isClaiming}
                  isClickable={!!activeOwnerId && !card.isClaiming}
                  activeOwnerColor={activeOwner?.color}
                  onClick={() => handleClaimAnimated(card.rawName)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Mobile toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden w-full flex items-center justify-between px-3 py-2 bg-[var(--surface)] border border-[var(--card-border)] rounded-lg mb-2 text-sm text-text-secondary"
          >
            <span className="font-display font-bold">
              {activeOwnerId ? `${activeOwnerId}'s teams` : 'Owner details'}
            </span>
            <svg className={`w-4 h-4 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block`}>
            <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl p-3 sticky top-24 max-h-[65vh] overflow-y-auto">
              {activeOwnerId && activeOwner ? (
                <>
                  {/* Active owner header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-display font-bold text-slate"
                      style={{ backgroundColor: activeOwner.color }}
                    >
                      {activeOwnerId.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-display font-bold text-text-primary">{activeOwnerId}</div>
                      <div className="text-[10px] font-mono text-text-muted">
                        {(ownerClaimedEntries.get(activeOwnerId) || []).length} team{(ownerClaimedEntries.get(activeOwnerId) || []).length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Claimed teams */}
                  <div className="space-y-1">
                    {(ownerClaimedEntries.get(activeOwnerId) || []).map(({ rawName, entries }) => {
                      const years = entries.map(e => e.seasonYear).sort()
                      const isFlashing = lastClaimedName === rawName
                      return (
                        <button
                          key={rawName}
                          onClick={() => unassignTeam(rawName)}
                          className={`w-full text-left flex items-center justify-between px-2.5 py-2 rounded-lg transition-all duration-500 group ${
                            isFlashing ? 'bg-accent-gold/20' : 'bg-[var(--surface)] hover:bg-[var(--surface-alt)]'
                          }`}
                          title="Click to unassign"
                        >
                          <div className="min-w-0">
                            <div className="text-xs text-text-primary font-display truncate">{rawName}</div>
                            <div className="text-[10px] font-mono text-text-muted">
                              {formatYearRanges(years)}
                            </div>
                          </div>
                          <svg className="w-3.5 h-3.5 text-text-muted group-hover:text-red-400 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )
                    })}
                    {(ownerClaimedEntries.get(activeOwnerId) || []).length === 0 && (
                      <p className="text-[11px] text-text-muted py-3 text-center font-mono">
                        Tap cards to assign teams
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-6 text-center">
                  <div className="w-12 h-12 border-2 border-dashed border-[var(--card-border)] rounded-xl flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <p className="text-xs text-text-muted font-display">Select an owner to see their teams</p>
                </div>
              )}

              {/* All owners summary */}
              {owners.size > 1 && (
                <div className="mt-4 pt-3 border-t border-[var(--card-border)]/50">
                  <h4 className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-2">All Owners</h4>
                  <div className="space-y-1">
                    {[...owners].map(([name, data]) => {
                      const count = progress.perOwner.get(name) || 0
                      return (
                        <button
                          key={name}
                          onClick={() => setActiveOwnerId(name)}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors ${
                            activeOwnerId === name ? 'bg-[var(--bg-alt)]' : 'hover:bg-[var(--surface)]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
                            <span className="text-xs text-text-secondary font-display">{name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-text-muted">{count}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--card-border)] p-3 sm:p-4 flex items-center justify-between z-40 md:relative md:bg-transparent md:backdrop-blur-none md:border-0 md:p-0 md:mt-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep(1)}
            className="px-3 py-2 text-xs text-text-secondary hover:text-text-primary font-display transition-colors"
          >
            &larr; Back
          </button>
          <button
            onClick={undo}
            disabled={!canUndo}
            className="px-3 py-2 text-xs font-mono text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Undo
          </button>
        </div>
        <button
          onClick={() => setStep(3)}
          className="px-5 py-2.5 bg-gradient-to-r from-gold to-orange text-slate rounded-lg font-display font-bold text-sm hover:shadow-lg hover:shadow-gold/20 transition-all"
        >
          Review & Save &rarr;
        </button>
      </div>
    </div>
  )
}

// ─── Step 3: Vault Reveal ────────────────────────────────────────────────────

const Step3VaultReveal = ({ wizard, onSaveSuccess }) => {
  const {
    vaultOwnerStats, vaultLeagueStats,
    saving, saveError, save, setStep,
  } = wizard

  const [phase, setPhase] = useState('loading') // loading → reveal
  const [showCards, setShowCards] = useState(false)

  // Phase transitions: loading → reveal → cards visible
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 2400)
    const t2 = setTimeout(() => setShowCards(true), 3800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const handleSave = async () => {
    const ok = await save()
    if (ok) onSaveSuccess()
  }

  // ── Loading Phase ──
  if (phase === 'loading') {
    return <VaultLoadingScreen seasonCount={vaultLeagueStats.totalSeasons} />
  }

  // ── Reveal Phase ──
  return (
    <div className="relative overflow-hidden -mx-4 sm:-mx-6 -mt-6 px-4 sm:px-6">
      <div className="max-w-[1100px] mx-auto pt-10 pb-24 relative">
        {/* Back link */}
        <button
          onClick={() => setStep(2)}
          className="text-xs font-mono text-text-muted hover:text-accent-gold mb-5 flex items-center gap-1.5 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Team Assignment
        </button>

        <VaultRevealView
          ownerStats={vaultOwnerStats}
          leagueStats={vaultLeagueStats}
          showCards={showCards}
        >
          {/* Save CTA */}
          <div className="text-xs font-mono text-text-muted mb-4 leading-relaxed">
            Everything look right? Once saved, your League Vault will be permanently unlocked<br className="hidden sm:block" />
            with unified all-time stats, head-to-head records, and more.
          </div>

          {/* Error */}
          {saveError && (
            <div className="mb-4 inline-flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-400">{saveError}</p>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-12 py-4 rounded-xl border-none text-base font-display font-bold cursor-pointer tracking-wide transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #D4A853 0%, #B8922E 100%)',
              color: '#0A0908',
              boxShadow: '0 6px 30px rgba(212,168,83,0.25)',
            }}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-[var(--card-border)] border-t-[var(--bg)] rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              'Save & Unlock Your League Vault'
            )}
          </button>

          <div className="text-[11px] font-mono text-text-muted/60 mt-2.5">
            You can always edit assignments later from League Settings
          </div>
        </VaultRevealView>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const OwnerAssignment = () => {
  const { leagueId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const wizard = useOwnerAssignment(leagueId)

  const {
    loading, error, league, teamEntries,
    step, hasChanges, inviteCode,
    vaultOwnerStats, vaultLeagueStats,
  } = wizard

  const [showShareModal, setShowShareModal] = useState(false)

  const isCommissioner = league?.ownerId === user?.id

  // Keyboard shortcuts (Step 2 only)
  useEffect(() => {
    if (step !== 2) return

    const handleKeyDown = (e) => {
      // Number keys 1-9 to select owner
      if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const ownerArray = [...wizard.owners.keys()]
        const idx = parseInt(e.key) - 1
        if (idx < ownerArray.length) {
          wizard.setActiveOwnerId(ownerArray[idx])
        }
        return
      }

      // Ctrl/Cmd+Z to undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        wizard.undo()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [step, wizard.owners, wizard.undo, wizard.setActiveOwnerId])

  // Warn before navigating away with unsaved changes
  useEffect(() => {
    if (!hasChanges) return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  const handleSaveSuccess = () => {
    // Mark vault reveal as seen so standalone page uses returning mode
    try { localStorage.setItem(`hasSeenVaultReveal_${leagueId}`, 'true') } catch { /* ignore */ }
    // Show share modal instead of immediately navigating
    setShowShareModal(true)
  }

  const handleShareModalClose = () => {
    setShowShareModal(false)
    navigate(`/leagues/${leagueId}/vault`, { replace: true })
  }

  // ─── Loading & Error States ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-3 border-accent-gold/20 border-t-accent-gold rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-text-secondary font-display">Loading league data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center py-20">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <Link to={`/leagues/${leagueId}/vault`} className="text-accent-gold text-sm hover:text-accent-gold/80">
            &larr; Back to League Vault
          </Link>
        </div>
      </div>
    )
  }

  if (!isCommissioner) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center py-20">
          <p className="text-text-secondary text-sm mb-4">Only the commissioner can manage owner assignments.</p>
          <Link to={`/leagues/${leagueId}/vault`} className="text-accent-gold text-sm hover:text-accent-gold/80">
            &larr; Back to League Vault
          </Link>
        </div>
      </div>
    )
  }

  if (teamEntries.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center py-20">
          <div className="w-14 h-14 bg-[var(--stone)] rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-text-primary font-display font-bold mb-2">No imported history yet</p>
          <p className="text-text-secondary text-sm mb-4">Import your league history first to start mapping owners.</p>
          <Link
            to="/import"
            className="inline-block px-5 py-2.5 bg-accent-gold text-slate rounded-lg font-display font-bold text-sm hover:bg-accent-gold/90"
          >
            Import League History
          </Link>
        </div>
      </div>
    )
  }

  // ─── Main Render ─────────────────────────────────────────────────────────

  // Step 3 (Vault Reveal) has its own fullscreen layout — no page shell needed
  if (step === 3) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <Step3VaultReveal wizard={wizard} onSaveSuccess={handleSaveSuccess} />
        {showShareModal && inviteCode && (
          <ShareModal
            isOpen={showShareModal}
            onClose={handleShareModalClose}
            leagueName={league?.name || 'League'}
            inviteCode={inviteCode}
            ownerStats={vaultOwnerStats}
            leagueStats={vaultLeagueStats}
            leagueId={leagueId}
          />
        )}
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8">
      {/* Back link */}
      <Link
        to={`/leagues/${leagueId}/vault`}
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-accent-gold font-mono mb-4 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        League Vault
      </Link>

      {/* Page title */}
      <h1 className="text-2xl sm:text-3xl font-display font-bold text-text-primary mb-6">
        Assign Teams to Owners
      </h1>

      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* Step content */}
      {step === 1 && <Step1IdentifyOwners wizard={wizard} />}
      {step === 2 && <Step2AssignTeams wizard={wizard} />}
    </div>
  )
}

export default OwnerAssignment
