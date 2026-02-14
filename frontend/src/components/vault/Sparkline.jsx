// Mini SVG sparkline chart — shows win% trend by season
// Shared component used in OwnerRow and OwnerDetailModal

export default function Sparkline({ data, color = '#D4A853', width = 120, height = 32 }) {
  if (!data || data.length < 2) return null

  const min = Math.min(...data) - 0.05
  const max = Math.max(...data) + 0.05
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `0,${height} ${points} ${width},${height}`
  const gradientId = `spark-${color.replace('#', '')}-${width}`

  // Last point for end dot
  const lastX = width
  const lastY = height - ((data[data.length - 1] - min) / range) * height

  return (
    <svg width={width} height={height} className="block">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
    </svg>
  )
}
