const COLORS = ['#D4930D', '#10B981', '#3B82F6', '#8B5CF6', '#F97316']

const AXES = [
  { key: 'sgOffTee', label: 'Off the Tee' },
  { key: 'sgApproach', label: 'Approach' },
  { key: 'sgAroundGreen', label: 'Around Green' },
  { key: 'sgPutting', label: 'Putting' },
  { key: 'sgTotal', label: 'Total' },
]

// Map SG value (-2 to +3 range) into 0-1
function normalize(val) {
  if (val == null) return 0.3 // neutral default for missing data
  return Math.max(0, Math.min(1, (val + 2) / 5))
}

// Get x,y for a given axis index and radius fraction (0-1)
function getPoint(axisIndex, fraction, center, radius) {
  const angle = (Math.PI * 2 * axisIndex) / AXES.length - Math.PI / 2
  return {
    x: center + radius * fraction * Math.cos(angle),
    y: center + radius * fraction * Math.sin(angle),
  }
}

const RINGS = [0.25, 0.5, 0.75, 1.0]

export default function SgRadarChart({ players, size = 280, showAxisValues = false }) {
  if (!players || players.length === 0) return null

  // R06: Enforce minimum 300px when showAxisValues is on for readability
  const effectiveSize = showAxisValues ? Math.max(size, 300) : size
  const center = effectiveSize / 2
  const radius = effectiveSize * 0.357 // ~100 at size 280

  // Build polygon points string for a player
  function polygonPoints(player) {
    return AXES.map((axis, i) => {
      const val = normalize(player[axis.key])
      const pt = getPoint(i, val, center, radius)
      return `${pt.x},${pt.y}`
    }).join(' ')
  }

  return (
    <div className="flex flex-col items-center">
      <svg width={effectiveSize} height={effectiveSize} viewBox={`0 0 ${effectiveSize} ${effectiveSize}`} className="overflow-visible">
        {/* Concentric rings */}
        {RINGS.map((r) => (
          <polygon
            key={r}
            points={AXES.map((_, i) => {
              const pt = getPoint(i, r, center, radius)
              return `${pt.x},${pt.y}`
            }).join(' ')}
            fill="none"
            stroke="var(--card-border)"
            strokeWidth={r === 0.5 ? 1 : 0.5}
            opacity={r === 0.5 ? 0.6 : 0.3}
          />
        ))}

        {/* Axis lines */}
        {AXES.map((_, i) => {
          const pt = getPoint(i, 1, center, radius)
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={pt.x}
              y2={pt.y}
              stroke="var(--card-border)"
              strokeWidth={0.5}
              opacity={0.4}
            />
          )
        })}

        {/* SG reference labels on rings */}
        <text x={center + 4} y={center - radius * 0.5 - 4} fontSize={8} fill="var(--text-1)" opacity={0.25} textAnchor="start">+0.5</text>
        <text x={center + 4} y={center - radius * 0.25 - 4} fontSize={8} fill="var(--text-1)" opacity={0.2} textAnchor="start">-0.75</text>
        <text x={center + 4} y={center - radius * 0.75 - 4} fontSize={8} fill="var(--text-1)" opacity={0.2} textAnchor="start">+1.75</text>

        {/* Player polygons */}
        {players.map((player, pi) => {
          const color = COLORS[pi % COLORS.length]
          return (
            <polygon
              key={player.id || pi}
              points={polygonPoints(player)}
              fill={color}
              fillOpacity={0.12}
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          )
        })}

        {/* Player dots at each vertex */}
        {players.map((player, pi) => {
          const color = COLORS[pi % COLORS.length]
          return AXES.map((axis, ai) => {
            const val = normalize(player[axis.key])
            const pt = getPoint(ai, val, center, radius)
            return (
              <circle
                key={`${pi}-${ai}`}
                cx={pt.x}
                cy={pt.y}
                r={3}
                fill={color}
                stroke="var(--surface)"
                strokeWidth={1}
              />
            )
          })
        })}

        {/* Axis labels */}
        {AXES.map((axis, i) => {
          const pt = getPoint(i, 1.18, center, radius)
          return (
            <text
              key={i}
              x={pt.x}
              y={pt.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={effectiveSize < 260 ? 9 : 10}
              fontWeight={600}
              fill="var(--text-1)"
              opacity={0.5}
            >
              {axis.label}
            </text>
          )
        })}

        {/* R06: Axis endpoint value labels — show avg SG per axis across players */}
        {showAxisValues && players.length > 0 && AXES.map((axis, i) => {
          const values = players.map(p => p[axis.key]).filter(v => v != null)
          if (values.length === 0) return null
          const avg = values.reduce((a, b) => a + b, 0) / values.length
          const pt = getPoint(i, 1.35, center, radius)
          return (
            <text
              key={`val-${i}`}
              x={pt.x}
              y={pt.y + 12}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={8}
              fontFamily="JetBrains Mono, monospace"
              fontWeight={700}
              fill={avg >= 0.5 ? '#10B981' : avg >= 0 ? 'var(--text-1)' : '#E83838'}
              opacity={0.65}
            >
              {avg >= 0 ? '+' : ''}{avg.toFixed(1)}
            </text>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        {players.map((player, pi) => {
          const label = player.label || player.name?.split(' ').pop() || 'Player'
          const eventCount = player.events
          return (
            <div key={player.id || pi} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[pi % COLORS.length] }}
              />
              <span className="text-xs text-text-primary/60 font-medium">
                {label}{eventCount ? ` (${eventCount} events)` : ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
