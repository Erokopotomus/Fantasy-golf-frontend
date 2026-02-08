const PlayerHeader = ({ player, clutchMetrics, onAddToRoster, onProposeTrade, isOwned, isOnMyTeam }) => {
  if (!player) return null

  const getRankBadge = (rank) => {
    if (rank === 1) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
    if (rank <= 5) return 'bg-gold/20 text-gold border-gold/50'
    if (rank <= 10) return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
    if (rank <= 25) return 'bg-purple-500/20 text-purple-400 border-purple-500/50'
    return 'bg-dark-tertiary text-text-secondary border-dark-border'
  }

  const getTourBadge = (tour) => {
    if (!tour) return null
    const t = tour.toUpperCase()
    if (t === 'PGA') return { label: 'PGA TOUR', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/50' }
    if (t === 'LIV') return { label: 'LIV Golf', cls: 'bg-red-500/20 text-red-400 border-red-500/50' }
    if (t === 'DP' || t === 'DP WORLD' || t === 'EURO') return { label: 'DP World', cls: 'bg-purple-500/20 text-purple-400 border-purple-500/50' }
    if (t === 'KFT' || t === 'KORN FERRY') return { label: 'Korn Ferry', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' }
    return null
  }

  const tourBadge = getTourBadge(player.primaryTour)

  // CPI color coding
  const getCPIColor = (cpi) => {
    if (cpi == null) return 'text-text-muted'
    if (cpi > 1.5) return 'text-gold'
    if (cpi > 0.5) return 'text-green-400'
    if (cpi > -0.5) return 'text-yellow-400'
    return 'text-red-400'
  }

  // Form Score color
  const getFormColor = (score) => {
    if (score == null) return 'text-text-muted'
    if (score >= 80) return 'text-orange'
    if (score >= 60) return 'text-yellow-400'
    if (score >= 40) return 'text-blue-400'
    return 'text-blue-300'
  }

  // Pressure Score color
  const getPressureColor = (score) => {
    if (score == null) return 'text-text-muted'
    if (score > 0.5) return 'text-gold'
    if (score > -0.5) return 'text-gray-300'
    return 'text-red-400'
  }

  // Recent form badge color
  const getFormBadgeStyle = (result) => {
    if (!result) return 'bg-white/5 text-text-muted'
    if (result === 'CUT') return 'bg-red-500/20 text-red-400'
    if (result === 'WD') return 'bg-gray-500/20 text-gray-400'
    const num = parseInt(result.replace('T', ''), 10)
    if (isNaN(num)) return 'bg-white/5 text-text-secondary'
    if (num === 1) return 'bg-gold/20 text-gold'
    if (num <= 10) return 'bg-green-500/20 text-green-400'
    if (num <= 25) return 'bg-yellow-500/20 text-yellow-400'
    return 'bg-white/5 text-text-secondary'
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
      color: 'text-white',
    },
    {
      label: 'Wins',
      value: player.wins > 0 ? player.wins : player.events > 0 ? '0' : null,
      color: player.wins > 0 ? 'text-yellow-400' : 'text-white',
    },
    {
      label: 'Top 10s',
      value: player.top10s > 0 ? player.top10s : player.events > 0 ? '0' : null,
      color: player.top10s > 0 ? 'text-green-400' : 'text-white',
    },
    {
      label: 'Earnings',
      value: formatEarnings(player.earnings),
      color: player.earnings > 0 ? 'text-white' : 'text-text-muted',
    },
  ]

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 sm:p-6">
      {/* Top section: headshot + info + actions */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
        {/* Headshot */}
        <div className="flex-shrink-0 flex justify-center sm:justify-start">
          {hasHeadshot ? (
            <img
              src={headshotSrc}
              alt=""
              className="w-[120px] h-[120px] rounded-xl object-cover bg-dark-primary border border-white/10"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
            />
          ) : null}
          <div
            className={`w-[120px] h-[120px] rounded-xl bg-dark-primary flex items-center justify-center text-5xl border border-white/10 ${hasHeadshot ? 'hidden' : ''}`}
          >
            {player.countryFlag}
          </div>
        </div>

        {/* Player info */}
        <div className="flex-1 min-w-0 text-center sm:text-left">
          {/* Name + My Player badge */}
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
            <h1 className="text-2xl font-bold font-display text-white truncate">{player.name}</h1>
            {isOnMyTeam && (
              <span className="flex-shrink-0 px-2 py-0.5 bg-gold/20 text-gold text-xs rounded font-medium">
                My Player
              </span>
            )}
          </div>

          {/* Badges row: rank, tour, country */}
          <div className="flex items-center justify-center sm:justify-start gap-2 text-sm flex-wrap mb-2">
            {player.rank && (
              <span className={`px-2 py-0.5 rounded border font-mono font-medium text-xs ${getRankBadge(player.rank)}`}>
                #{player.rank} OWGR
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
              className="px-4 py-2 bg-gold text-white rounded-lg font-medium hover:bg-gold/90 transition-colors text-sm"
            >
              Add to Roster
            </button>
          )}
          {isOwned && !isOnMyTeam && (
            <button
              onClick={onProposeTrade}
              className="px-4 py-2 bg-orange text-white rounded-lg font-medium hover:bg-orange/90 transition-colors text-sm"
            >
              Propose Trade
            </button>
          )}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-5 pt-5 border-t border-white/10">
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
