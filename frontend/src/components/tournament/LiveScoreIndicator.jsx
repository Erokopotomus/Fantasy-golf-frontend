const LiveScoreIndicator = ({ isLive }) => {
  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
        ${isLive
          ? 'bg-red-500/20 text-red-400'
          : 'bg-dark-tertiary text-text-muted'}
      `}
    >
      <span className={`relative flex h-2 w-2 ${isLive ? '' : 'opacity-50'}`}>
        {isLive && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-red-500' : 'bg-dark-border'}`}></span>
      </span>
      {isLive ? 'LIVE' : 'Not Live'}
    </div>
  )
}

export default LiveScoreIndicator
