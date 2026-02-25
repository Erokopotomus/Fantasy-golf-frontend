import { useState, useRef, useCallback } from 'react'

const SERIES = [
  { key: 'sgTotal', label: 'Total', color: '#D4930D' },
  { key: 'sgOffTee', label: 'Off Tee', color: '#10B981' },
  { key: 'sgApproach', label: 'Approach', color: '#3B82F6' },
  { key: 'sgAroundGreen', label: 'Around Green', color: '#8B5CF6' },
  { key: 'sgPutting', label: 'Putting', color: '#F97316' },
]

const W = 600
const PAD = { top: 20, right: 20, bottom: 40, left: 40 }
const CHART_W = W - PAD.left - PAD.right
const ROLLING_WINDOW = 3

function computeRollingAvg(data, key) {
  const result = []
  for (let i = 0; i < data.length; i++) {
    const window = []
    for (let j = Math.max(0, i - ROLLING_WINDOW + 1); j <= i; j++) {
      if (data[j][key] != null) window.push(data[j][key])
    }
    result.push(window.length > 0 ? window.reduce((s, v) => s + v, 0) / window.length : null)
  }
  return result
}

function abbreviateName(name) {
  if (!name) return ''
  // Remove "The " prefix, common suffixes
  let short = name.replace(/^The\s+/i, '').replace(/\s+(Championship|Tournament|Classic|Open|Invitational|Memorial)$/i, '')
  if (short.length > 12) short = short.substring(0, 11) + '.'
  return short
}

export default function SgTrendChart({ performances, height = 200, showRollingAvg = true }) {
  const [activeSeries, setActiveSeries] = useState(new Set(['sgTotal']))
  const [hoverIndex, setHoverIndex] = useState(null)
  const svgRef = useRef(null)

  // Sort performances chronologically and filter to those with SG data
  const data = (performances || [])
    .filter(p => p.sgTotal != null)
    .sort((a, b) => {
      const dateA = a.tournament?.startDate || a.date || ''
      const dateB = b.tournament?.startDate || b.date || ''
      return dateA.localeCompare(dateB)
    })

  const toggleSeries = useCallback((key) => {
    setActiveSeries(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size > 1) next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center py-6 text-text-muted text-xs">
        No strokes gained trend data
      </div>
    )
  }

  const chartH = height - PAD.top - PAD.bottom

  // Compute Y range across all active series
  let yMin = Infinity, yMax = -Infinity
  for (const s of SERIES) {
    if (!activeSeries.has(s.key)) continue
    for (const d of data) {
      if (d[s.key] != null) {
        yMin = Math.min(yMin, d[s.key])
        yMax = Math.max(yMax, d[s.key])
      }
    }
  }
  // Ensure zero is visible and add some padding
  yMin = Math.min(yMin, -0.5)
  yMax = Math.max(yMax, 0.5)
  const yPad = (yMax - yMin) * 0.1
  yMin -= yPad
  yMax += yPad

  const xStep = data.length > 1 ? CHART_W / (data.length - 1) : CHART_W
  const toX = (i) => PAD.left + i * xStep
  const toY = (val) => PAD.top + chartH - ((val - yMin) / (yMax - yMin)) * chartH
  const zeroY = toY(0)

  // Build polyline points for a series (skip nulls → break line)
  function buildPolylineSegments(values) {
    const segments = []
    let current = []
    for (let i = 0; i < values.length; i++) {
      if (values[i] != null) {
        current.push(`${toX(i)},${toY(values[i])}`)
      } else {
        if (current.length > 1) segments.push(current.join(' '))
        current = []
      }
    }
    if (current.length > 1) segments.push(current.join(' '))
    return segments
  }

  // Handle mouse/touch hover
  const handleMove = useCallback((e) => {
    if (!svgRef.current || data.length === 0) return
    const rect = svgRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const svgX = ((clientX - rect.left) / rect.width) * W
    const dataX = svgX - PAD.left
    const idx = Math.round(dataX / xStep)
    setHoverIndex(Math.max(0, Math.min(data.length - 1, idx)))
  }, [data.length, xStep])

  const handleLeave = useCallback(() => setHoverIndex(null), [])

  // Y-axis tick marks
  const yTicks = []
  const yRange = yMax - yMin
  const tickStep = yRange > 3 ? 1 : yRange > 1.5 ? 0.5 : 0.25
  for (let v = Math.ceil(yMin / tickStep) * tickStep; v <= yMax; v += tickStep) {
    yTicks.push(Math.round(v * 100) / 100)
  }

  return (
    <div>
      {/* Toggle pills */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {SERIES.map(s => (
          <button
            key={s.key}
            onClick={() => toggleSeries(s.key)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all border ${
              activeSeries.has(s.key)
                ? 'border-transparent text-white'
                : 'border-[var(--card-border)] text-text-muted hover:text-text-secondary'
            }`}
            style={activeSeries.has(s.key) ? { backgroundColor: s.color } : {}}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* SVG Chart */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${height}`}
        className="w-full overflow-visible"
        onMouseMove={handleMove}
        onTouchMove={handleMove}
        onMouseLeave={handleLeave}
        onTouchEnd={handleLeave}
      >
        {/* Y-axis ticks + grid lines */}
        {yTicks.map(v => (
          <g key={v}>
            <line
              x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)}
              stroke="var(--card-border)" strokeWidth={0.5} opacity={0.3}
            />
            <text
              x={PAD.left - 6} y={toY(v)}
              textAnchor="end" dominantBaseline="central"
              fontSize={9} fill="var(--text-1)" opacity={0.4}
            >
              {v > 0 ? `+${v}` : v}
            </text>
          </g>
        ))}

        {/* Zero line (highlighted) */}
        <line
          x1={PAD.left} y1={zeroY} x2={W - PAD.right} y2={zeroY}
          stroke="var(--text-1)" strokeWidth={1} strokeDasharray="4,4" opacity={0.3}
        />

        {/* Data series */}
        {SERIES.map(s => {
          if (!activeSeries.has(s.key)) return null
          const values = data.map(d => d[s.key])
          const segments = buildPolylineSegments(values)

          return (
            <g key={s.key}>
              {/* Main line segments */}
              {segments.map((pts, i) => (
                <polyline
                  key={i}
                  points={pts}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}

              {/* Rolling average overlay */}
              {showRollingAvg && data.length >= ROLLING_WINDOW && (() => {
                const rolling = computeRollingAvg(data, s.key)
                const rollingSegments = buildPolylineSegments(rolling)
                return rollingSegments.map((pts, i) => (
                  <polyline
                    key={`r-${i}`}
                    points={pts}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={3}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    opacity={0.3}
                  />
                ))
              })()}

              {/* Data point dots */}
              {values.map((v, i) => {
                if (v == null) return null
                return (
                  <circle
                    key={i}
                    cx={toX(i)} cy={toY(v)} r={2.5}
                    fill={s.color}
                    stroke="var(--surface)" strokeWidth={1}
                  />
                )
              })}
            </g>
          )
        })}

        {/* X-axis labels (show every Nth tournament) */}
        {data.map((d, i) => {
          const showEvery = data.length > 20 ? 5 : data.length > 10 ? 3 : data.length > 6 ? 2 : 1
          if (i % showEvery !== 0 && i !== data.length - 1) return null
          const name = abbreviateName(d.tournament?.name || d.tournamentName || '')
          return (
            <text
              key={i}
              x={toX(i)} y={height - 6}
              textAnchor="middle" fontSize={8}
              fill="var(--text-1)" opacity={0.35}
              transform={`rotate(-20, ${toX(i)}, ${height - 6})`}
            >
              {name}
            </text>
          )
        })}

        {/* Hover line + tooltip */}
        {hoverIndex != null && (
          <>
            <line
              x1={toX(hoverIndex)} y1={PAD.top}
              x2={toX(hoverIndex)} y2={PAD.top + chartH}
              stroke="var(--text-1)" strokeWidth={1} opacity={0.2}
            />
            {/* Tooltip background */}
            {(() => {
              const d = data[hoverIndex]
              const tName = d.tournament?.name || d.tournamentName || ''
              const tooltipX = toX(hoverIndex)
              const flipRight = tooltipX > W / 2
              const tx = flipRight ? tooltipX - 130 : tooltipX + 8
              const activeList = SERIES.filter(s => activeSeries.has(s.key))
              const tooltipH = 16 + activeList.length * 14

              return (
                <g>
                  <rect
                    x={tx} y={PAD.top + 4}
                    width={125} height={tooltipH}
                    rx={4}
                    fill="var(--surface)" stroke="var(--card-border)" strokeWidth={1}
                    opacity={0.95}
                  />
                  <text x={tx + 6} y={PAD.top + 16} fontSize={9} fontWeight={600} fill="var(--text-1)">
                    {tName.length > 20 ? tName.substring(0, 19) + '.' : tName}
                  </text>
                  {activeList.map((s, si) => {
                    const val = d[s.key]
                    return (
                      <text key={s.key} x={tx + 6} y={PAD.top + 30 + si * 14} fontSize={9} fill={s.color}>
                        {s.label}: {val != null ? (val > 0 ? '+' : '') + val.toFixed(2) : '—'}
                      </text>
                    )
                  })}
                </g>
              )
            })()}
          </>
        )}
      </svg>
    </div>
  )
}
