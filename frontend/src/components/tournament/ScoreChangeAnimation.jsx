const ScoreChangeAnimation = ({ type, show }) => {
  if (!show) return null

  const config = {
    eagle: { icon: '🦅', color: 'text-crown', bg: 'bg-crown/20', label: 'Eagle!' },
    birdie: { icon: '🐦', color: 'text-live-red', bg: 'bg-live-red/20', label: 'Birdie' },
    bogey: { icon: '➕', color: 'text-blue-400', bg: 'bg-blue-400/20', label: 'Bogey' },
    double: { icon: '➕➕', color: 'text-purple-400', bg: 'bg-purple-400/20', label: 'Double' },
  }

  const c = config[type]
  if (!c) return null

  return (
    <span className={`
      inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
      ${c.bg} ${c.color} animate-pulse
    `}>
      <span>{c.icon}</span>
      <span>{c.label}</span>
    </span>
  )
}

export default ScoreChangeAnimation
