const PlayerStatusBadge = ({ status }) => {
  const statusConfig = {
    active: {
      label: 'Active',
      className: 'bg-accent-green/20 text-accent-green',
    },
    benched: {
      label: 'Benched',
      className: 'bg-dark-tertiary text-text-muted',
    },
    injured: {
      label: 'Injured',
      className: 'bg-red-500/20 text-red-400',
    },
    questionable: {
      label: 'GTD',
      className: 'bg-yellow-500/20 text-yellow-400',
    },
    out: {
      label: 'OUT',
      className: 'bg-red-500/20 text-red-400',
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
