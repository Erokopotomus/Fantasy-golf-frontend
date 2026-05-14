import { useEffect, useState } from 'react'
import api from '../../services/api'

/**
 * Left-slide drawer showing a player's hole-by-hole scorecard for the
 * current tournament. Matches the visual pattern from LiveScoringWidget
 * (Front 9 / Back 9 grids with colored cells, R1-R4 round pills).
 *
 * Props:
 *   tournamentId   — needed to fetch scorecard
 *   coursePar      — total par per round (default 72)
 *   player         — { id, name, country, countryFlag, position, scoreToPar, thru, status, headshotUrl }
 *   isOpen         — whether the drawer is open
 *   onClose        — close handler
 */
export default function PlayerScorecardDrawer({ tournamentId, coursePar = 72, player, isOpen, onClose }) {
  const [scorecards, setScorecards] = useState({}) // { 1: [holes], 2: [holes], ... }
  const [loading, setLoading] = useState(false)
  const [selectedRound, setSelectedRound] = useState(null)

  // Close on escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Fetch scorecard when drawer opens / player changes
  useEffect(() => {
    if (!isOpen || !tournamentId || !player?.id) return
    let cancelled = false
    setLoading(true)
    setScorecards({})
    setSelectedRound(null)
    api.getPlayerScorecard(tournamentId, player.id)
      .then(data => {
        if (cancelled) return
        const sc = data.scorecards || {}
        setScorecards(sc)
        const playedRounds = Object.keys(sc).map(Number).filter(r => sc[r]?.length > 0).sort((a, b) => a - b)
        if (playedRounds.length > 0) setSelectedRound(playedRounds[playedRounds.length - 1])
      })
      .catch(() => { if (!cancelled) setScorecards({}) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isOpen, tournamentId, player?.id])

  if (!isOpen || !player) return null

  const availableRounds = Object.keys(scorecards).map(Number).filter(r => scorecards[r]?.length > 0).sort((a, b) => a - b)
  const activeRound = selectedRound ?? availableRounds[availableRounds.length - 1] ?? 1
  const holeData = scorecards[activeRound] || []

  // Pre-tournament default pars (par 4 majority, mix of par 3s and par 5s).
  const defaultPars = [4, 4, 5, 3, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 4, 4]
  const holeDataMap = {}
  for (const h of holeData) holeDataMap[h.hole] = h
  const holes = defaultPars.map((defPar, i) => {
    const holeNum = i + 1
    return holeDataMap[holeNum] || { hole: holeNum, par: defPar, score: null }
  })
  const front9 = holes.slice(0, 9)
  const back9 = holes.slice(9, 18)
  const front9Par = front9.reduce((s, h) => s + h.par, 0)
  const back9Par = back9.reduce((s, h) => s + h.par, 0)
  const front9Played = front9.filter(h => h.score != null)
  const back9Played = back9.filter(h => h.score != null)
  const front9Score = front9Played.length > 0 ? front9Played.reduce((s, h) => s + h.score, 0) : null
  const back9Score = back9Played.length > 0 ? back9Played.reduce((s, h) => s + h.score, 0) : null
  const totalScore = front9Score != null || back9Score != null ? (front9Score || 0) + (back9Score || 0) : null

  // Pre-round / not-yet-teed-off state
  const noHoleData = availableRounds.length === 0
  const notYetTeedOff = !loading && noHoleData

  const renderScoreCell = (score, par) => {
    if (score == null) {
      return <div className="w-7 h-7 rounded-md border border-dashed border-text-2/30 mx-auto" />
    }
    const diff = score - par
    if (diff <= -2) return <div className="w-7 h-7 rounded-full bg-crown text-white font-bold text-xs flex items-center justify-center mx-auto">{score}</div>
    if (diff === -1) return <div className="w-7 h-7 rounded-full bg-blaze text-white font-bold text-xs flex items-center justify-center mx-auto">{score}</div>
    if (diff === 0) return <div className="text-xs text-text-2 text-center">{score}</div>
    if (diff === 1) return <div className="w-7 h-7 rounded-sm bg-live-red/80 text-white font-bold text-xs flex items-center justify-center mx-auto">{score}</div>
    return <div className="w-7 h-7 rounded-sm bg-live-red text-white font-bold text-xs flex items-center justify-center mx-auto">{score}</div>
  }

  const getSummaryColor = (score, par) => {
    if (score == null) return 'text-text-2/60'
    if (score < par) return 'text-field'
    if (score > par) return 'text-live-red'
    return 'text-text-2'
  }

  const scoreToParDisplay = (v) => {
    if (v == null) return '—'
    if (v === 0) return 'E'
    return v > 0 ? `+${v}` : `${v}`
  }
  const scoreToParColor = (v) => {
    if (v == null) return 'text-text-2'
    if (v < 0) return 'text-field'
    if (v > 0) return 'text-live-red'
    return 'text-text-primary'
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <aside className="fixed left-0 top-0 h-full w-full sm:w-[480px] bg-[var(--surface)] z-50 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--surface)] border-b border-text-2/15 px-5 py-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {player.headshotUrl ? (
              <img src={player.headshotUrl} alt="" className="w-11 h-11 rounded-full object-cover bg-text-2/10 shrink-0" />
            ) : (
              <span className="w-11 h-11 rounded-full bg-text-2/10 shrink-0 flex items-center justify-center text-lg" aria-hidden="true">
                {player.countryFlag || '🏌'}
              </span>
            )}
            <div className="min-w-0">
              <div className="font-display font-extrabold text-lg text-text-primary truncate flex items-center gap-2">
                {player.name}
                {(player.status === 'ACTIVE' || (player.thru != null && player.thru !== 'F' && player.thru !== 18 && player.status !== 'CUT')) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-field shrink-0" title="On course" />
                )}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-text-2 mt-0.5">
                {player.countryFlag && <span className="mr-1">{player.countryFlag}</span>}
                {player.position && <span>{player.position} </span>}
                {player.status === 'CUT' && <span className="text-live-red">· CUT</span>}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-8 h-8 rounded-full hover:bg-bg flex items-center justify-center text-text-2 hover:text-text-primary transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Quick stats strip */}
        <div className="px-5 py-3 border-b border-text-2/10 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-text-2">To par</div>
            <div className={`font-mono font-bold text-2xl ${scoreToParColor(player.scoreToPar)}`}>{scoreToParDisplay(player.scoreToPar)}</div>
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-text-2">Thru</div>
            <div className="font-mono font-bold text-2xl text-text-primary">
              {player.thru != null && player.thru !== '' ? (player.thru === 18 ? 'F' : player.thru) : '—'}
            </div>
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-text-2">Round</div>
            <div className="font-mono font-bold text-2xl text-text-primary">R{activeRound}</div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {loading && (
            <div className="text-center py-12 text-text-2 font-mono text-sm uppercase tracking-wider animate-pulse">Loading scorecard…</div>
          )}

          {!loading && notYetTeedOff && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blaze/10 mb-3">
                <svg className="w-7 h-7 text-blaze" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="font-display font-bold text-text-primary text-base mb-1">Not yet teed off</div>
              <p className="font-editorial italic text-sm text-text-2 max-w-[260px] mx-auto">
                Scorecard will populate hole-by-hole once they start the round.
              </p>
            </div>
          )}

          {!loading && !notYetTeedOff && (
            <>
              {/* Round toggle */}
              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4].map(r => {
                  const hasData = availableRounds.includes(r)
                  const isActive = r === activeRound
                  return (
                    <button
                      key={r}
                      onClick={() => hasData && setSelectedRound(r)}
                      disabled={!hasData}
                      className={`px-3 py-1 rounded-full text-xs font-mono font-medium transition-colors ${
                        isActive
                          ? 'bg-blaze text-white'
                          : hasData
                            ? 'bg-bg text-text-2 border border-text-2/20 hover:border-text-2/40'
                            : 'bg-bg text-text-2/30 border border-dashed border-text-2/15 cursor-default'
                      }`}
                    >
                      R{r}
                    </button>
                  )
                })}
              </div>

              {/* Front 9 */}
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1 h-4 bg-blaze rounded-full" />
                <span className="text-xs font-bold uppercase tracking-wider text-text-2">Front 9</span>
              </div>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-[auto_repeat(9,1fr)_auto] gap-x-1 gap-y-1 items-center min-w-[340px]">
                  <div className="text-[10px] text-text-2/70 font-medium w-8">#</div>
                  {front9.map((h, i) => <div key={i} className="text-xs font-bold text-text-2 text-center">{i + 1}</div>)}
                  <div className="text-xs font-bold text-text-2 text-center">Out</div>

                  <div className="text-[10px] text-text-2/70 font-medium w-8">Par</div>
                  {front9.map((h, i) => <div key={i} className="text-xs text-text-2/70 font-mono text-center">{h.par}</div>)}
                  <div className="text-xs text-text-2/70 font-mono text-center font-bold">{front9Par}</div>

                  <div className="text-[10px] text-text-2/70 font-medium w-8">Scr</div>
                  {front9.map((h, i) => <div key={i}>{renderScoreCell(h.score, h.par)}</div>)}
                  <div className={`text-sm font-bold font-mono text-center ${getSummaryColor(front9Score, front9Par)}`}>
                    {front9Score != null ? front9Score : '–'}
                  </div>
                </div>
              </div>

              {/* Back 9 */}
              <div className="flex items-center gap-2 mb-2 mt-4">
                <span className="w-1 h-4 bg-field rounded-full" />
                <span className="text-xs font-bold uppercase tracking-wider text-text-2">Back 9</span>
              </div>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-[auto_repeat(9,1fr)_auto] gap-x-1 gap-y-1 items-center min-w-[340px]">
                  <div className="text-[10px] text-text-2/70 font-medium w-8">#</div>
                  {back9.map((h, i) => <div key={i} className="text-xs font-bold text-text-2 text-center">{i + 10}</div>)}
                  <div className="text-xs font-bold text-text-2 text-center">In</div>

                  <div className="text-[10px] text-text-2/70 font-medium w-8">Par</div>
                  {back9.map((h, i) => <div key={i} className="text-xs text-text-2/70 font-mono text-center">{h.par}</div>)}
                  <div className="text-xs text-text-2/70 font-mono text-center font-bold">{back9Par}</div>

                  <div className="text-[10px] text-text-2/70 font-medium w-8">Scr</div>
                  {back9.map((h, i) => <div key={i}>{renderScoreCell(h.score, h.par)}</div>)}
                  <div className={`text-sm font-bold font-mono text-center ${getSummaryColor(back9Score, back9Par)}`}>
                    {back9Score != null ? back9Score : '–'}
                  </div>
                </div>
              </div>

              {/* Summary chips */}
              <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-text-2/10">
                <SummaryChip label="FRONT" value={front9Score} />
                <SummaryChip label="BACK" value={back9Score} />
                <SummaryChip label="TOTAL" value={totalScore} highlight />
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-3 text-[10px] font-mono">
                <Legend swatch={<span className="w-3 h-3 rounded-full bg-crown inline-block" />} label="Eagle" />
                <Legend swatch={<span className="w-3 h-3 rounded-full bg-blaze inline-block" />} label="Birdie" />
                <Legend swatch={<span className="w-3 h-3 rounded-sm bg-live-red/80 inline-block" />} label="Bogey" />
                <Legend swatch={<span className="w-3 h-3 rounded-sm bg-live-red inline-block" />} label="Double+" />
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

function SummaryChip({ label, value, highlight }) {
  return (
    <div className={`flex-1 rounded px-2 py-1 text-center ${highlight ? 'bg-field/5 border border-field/20' : 'bg-bg border border-text-2/15'}`}>
      <span className="text-[8px] uppercase tracking-wider text-text-2 font-medium mr-1">{label}</span>
      <span className={`${highlight ? 'text-sm' : 'text-xs'} font-bold font-mono ${value != null ? 'text-text-primary' : 'text-text-2/40'}`}>
        {value != null ? value : '–'}
      </span>
    </div>
  )
}

function Legend({ swatch, label }) {
  return (
    <span className="flex items-center gap-1">
      {swatch}
      <span className="text-text-2">{label}</span>
    </span>
  )
}
