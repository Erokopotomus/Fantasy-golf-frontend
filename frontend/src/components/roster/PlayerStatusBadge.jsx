const PlayerStatusBadge = ({ status }) => {
  const statusConfig = {
    active: {
      label: 'Active',
      className: 'bg-gold/20 text-gold',
    },
    benched: {
      label: 'Benched',
      className: 'bg-[var(--card-bg)] text-text-muted',
    },
    injured: {
      label: 'Injured',
      className: 'bg-live-red/20 text-live-red',
    },
    questionable: {
      label: 'GTD',
      className: 'bg-crown/20 text-crown',
    },
    out: {
      label: 'OUT',
      className: 'bg-live-red/20 text-live-red',
    },
  }

  const config = statusConfig[status] || statusConfig.active

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

export default PlayerStatusBadge
