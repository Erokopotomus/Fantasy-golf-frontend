const PlayerHeader = ({ player, clutchMetrics, onAddToRoster, onProposeTrade, isOwned, isOnMyTeam, selectedYear, availableYears, onYearChange }) => {
  if (!player) return null

  const getRankBadge = (rank) => {
    if (rank === 1) return 'bg-crown/20 text-crown border-crown/50'
    if (rank <= 5) return 'bg-gold/20 text-gold border-gold/50'
    if (rank <= 10) return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
    if (rank <= 25) return 'bg-purple-500/20 text-purple-400 border-purple-500/50'
    return 'bg-[var(--stone)] text-text-secondary border-[var(--card-border)]'
  }

  const getTourBadge = (tour) => {
    if (!tour) return null
    const t = tour.toUpperCase()
    if (t === 'PGA') return { label: 'PGA TOUR', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/50' }
    if (t === 'LIV') return { label: 'LIV Golf', cls: 'bg-live-red/20 text-live-red border-live-red/50' }
    if (t === 'DP' || t === 'DP WORLD' || t === 'EURO') return { label: 'DP World', cls: 'bg-purple-500/20 text-purple-400 border-purple-500/50' }
    if (t === 'KFT' || t === 'KORN FERRY') return { label: 'Korn Ferry', cls: 'bg-crown/20 text-crown border-crown/50' }
    return null
  }

  const tourBadge = getTourBadge(player.primaryTour)

  // CPI color coding
  const getCPIColor = (cpi) => {
    if (cpi == null) return 'text-text-muted'
    if (cpi > 1.5) return 'text-gold'
    if (cpi > 0.5) return 'text-field'
    if (cpi > -0.5) return 'text-crown'
    return 'text-live-red'
  }

  // Form Score color
  const getFormColor = (score) => {
    if (score == null) return 'text-text-muted'
    if (score >= 80) return 'text-orange'
    if (score >= 60) return 'text-crown'
    if (score >= 40) return 'text-blue-400'
    return 'text-blue-300'
  }

  // Pressure Score color
  const getPressureColor = (score) => {
    if (score == null) return 'text-text-muted'
    if (score > 0.5) return 'text-gold'
    if (score > -0.5) return 'text-gray-400 dark:text-gray-300'
    return 'text-live-red'
  }

  // Recent form badge color
  const getFormBadgeStyle = (result) => {
    if (!result) return 'bg-[var(--stone)] text-text-muted'
    if (result === 'CUT') return 'bg-live-red/20 text-live-red'
    if (result === 'WD') return 'bg-gray-500/20 text-gray-400'
    const num = parseInt(result.replace('T', ''), 10)
    if (isNaN(num)) return 'bg-[var(--stone)] text-text-secondary'
    if (num === 1) return 'bg-gold/20 text-gold'
    if (num <= 10) return 'bg-field-bright/20 text-field'
    if (num <= 25) return 'bg-crown/20 text-crown'
    return 'bg-[var(--stone)] text-text-secondary'
  }

  // Compute age from birthDate
  const computeAge = (birthDate) => {
    if (!birthDate) return null
    const dob = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const monthDiff = today.getMonth() - dob.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--
    }
    return age
  }

  // Format earnings
  const formatEarnings = (val) => {
    if (val == null || val === 0) return null
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
    return `$${val}`
  }

  const cpi = clutchMetrics?.cpi
  const formScore = clutchMetrics?.formScore
  const pressureScore = clutchMetrics?.pressureScore
  const age = computeAge(player.birthDate)

  // Build bio parts — only show fields that exist
  const bioParts = []
  if (age) bioParts.push(`Age ${age}`)
  if (player.college) bioParts.push(player.college)
  if (player.turnedPro) bioParts.push(`Pro since ${player.turnedPro}`)
  if (player.height) bioParts.push(player.height)
  if (player.swings) bioParts.push(player.swings === 'R' ? 'Right' : player.swings === 'L' ? 'Left' : player.swings)

  // Recent form — last 5
  const recentForm = (player.recentForm || []).slice(0, 5)

  // Headshot: prefer no-bg (transparent), then regular, then flag fallback
  const headshotSrc = player.headshotNoBgUrl || player.headshotUrl
  const hasHeadshot = !!headshotSrc

  // Quick stats — 7 items
  const quickStats = [
    {
      label: 'CPI',
      value: cpi != null ? `${cpi > 0 ? '+' : ''}${cpi.toFixed(2)}` : null,
      color: getCPIColor(cpi),
    },
    {
      label: 'Form',
      value: formScore != null ? Math.round(formScore) : null,
      color: getFormColor(formScore),
    },
    {
      label: 'Pressure',
      value: pressureScore != null ? `${pressureScore > 0 ? '+' : ''}${pressureScore.toFixed(2)}` : null,
      color: getPressureColor(pressureScore),
    },
    {
      label: 'Events',
      value: player.events > 0 ? player.events : null,
      color: 'text-text-primary',
    },
    {
      label: 'Wins',
      value: player.wins > 0 ? player.wins : player.events > 0 ? '0' : null,
      color: player.wins > 0 ? 'text-crown' : 'text-text-primary',
    },
    {
      label: 'Top 10s',
      value: player.top10s > 0 ? player.top10s : player.events > 0 ? '0' : null,
      color: player.top10s > 0 ? 'text-field' : 'text-text-primary',
    },
    {
      label: 'FedEx Pts',
      value: player.fedexPoints > 0 ? player.fedexPoints.toLocaleString() : null,
      color: player.fedexPoints > 0 ? 'text-field' : 'text-text-muted',
    },
  ]

  return (
    <div className="bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl p-5 sm:p-6">
      {/* Top section: headshot + info + actions */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
        {/* Headshot */}
        <div className="flex-shrink-0 flex justify-center sm:justify-start">
          {hasHeadshot ? (
            <img
              src={headshotSrc}
              alt=""
              className="w-[120px] h-[120px] rounded-xl object-cover bg-[var(--stone)] border border-[var(--card-border)]"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
            />
          ) : null}
          <div
            className={`w-[120px] h-[120px] rounded-xl bg-[var(--stone)] flex items-center justify-center text-5xl border border-[var(--card-border)] ${hasHeadshot ? 'hidden' : ''}`}
          >
            {player.countryFlag}
          </div>
        </div>

        {/* Player info */}
        <div className="flex-1 min-w-0 text-center sm:text-left">
          {/* Name + My Player badge */}
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
            <h1 className="text-2xl font-bold font-display text-text-primary truncate">{player.name}</h1>
            {isOnMyTeam && (
              <span className="flex-shrink-0 px-2 py-0.5 bg-gold/20 text-gold text-xs rounded font-medium">
                My Player
              </span>
            )}
          </div>

          {/* Badges row: rank, FedEx, tour, country */}
          <div className="flex items-center justify-center sm:justify-start gap-2 text-sm flex-wrap mb-2">
            {player.rank && (
              <span className={`px-2 py-0.5 rounded border font-mono font-medium text-xs ${getRankBadge(player.rank)}`}>
                #{player.rank} OWGR
              </span>
            )}
            {player.fedexRank && (
              <span className="px-2 py-0.5 rounded border font-mono font-medium text-xs bg-field-bright/20 text-field border-field-bright/50">
                #{player.fedexRank} FedEx
              </span>
            )}
            {tourBadge && (
              <span className={`px-2 py-0.5 rounded border font-medium text-xs ${tourBadge.cls}`}>
                {tourBadge.label}
              </span>
            )}
            <span className="text-text-secondary text-sm">{player.countryFlag} {player.country}</span>
          </div>

          {/* Bio line */}
          {bioParts.length > 0 && (
            <p className="text-text-muted text-sm mb-2.5">
              {bioParts.join(' \u00B7 ')}
            </p>
          )}

          {/* Recent form badges */}
          {recentForm.length > 0 && (
            <div className="flex items-center justify-center sm:justify-start gap-1.5">
              <span className="text-text-muted text-xs mr-1">Recent</span>
              {recentForm.map((result, i) => (
                <span
                  key={i}
                  className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${getFormBadgeStyle(result)}`}
                >
                  {result}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex justify-center sm:justify-end sm:items-start gap-2">
          {!isOwned && (
            <button
              onClick={onAddToRoster}
              className="px-4 py-2 bg-gold text-text-primary rounded-lg font-medium hover:bg-gold/90 transition-colors text-sm"
            >
              Add to Roster
            </button>
          )}
          {isOwned && !isOnMyTeam && (
            <button
              onClick={onProposeTrade}
              className="px-4 py-2 bg-orange text-text-primary rounded-lg font-medium hover:bg-orange/90 transition-colors text-sm"
            >
              Propose Trade
            </button>
          )}
        </div>
      </div>

      {/* Season Stats Row */}
      <div className="mt-5 pt-5 border-t border-[var(--card-border)]">
        <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
          {availableYears && availableYears.length > 1 ? (
            <select
              value={selectedYear || new Date().getFullYear()}
              onChange={(e) => onYearChange?.(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="bg-[var(--surface)] border border-[var(--card-border)] rounded px-2 py-0.5 text-xs font-mono text-text-secondary cursor-pointer focus:outline-none focus:border-gold/50"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y} Stats</option>
              ))}
              <option value="all">All Time</option>
            </select>
          ) : (
            <p className="text-xs text-text-muted">
              {selectedYear === 'all' ? 'All Time' : `${selectedYear} Stats`}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {quickStats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className={`text-xl font-bold font-mono ${stat.value != null ? stat.color : 'text-text-muted'}`}>
              {stat.value ?? '\u2014'}
            </p>
            <p className="text-xs text-text-muted mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PlayerHeader
