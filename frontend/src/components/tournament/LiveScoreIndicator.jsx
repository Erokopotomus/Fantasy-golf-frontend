const LiveScoreIndicator = ({ isLive }) => {
  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
        ${isLive
          ? 'bg-live-red/20 text-live-red'
          : 'bg-[var(--card-bg)] text-text-muted'}
      `}
    >
      <span className={`relative flex h-2 w-2 ${isLive ? '' : 'opacity-50'}`}>
        {isLive && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live-red opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-live-red' : 'bg-[var(--card-border)]'}`}></span>
      </span>
      {isLive ? 'LIVE' : 'Not Live'}
    </div>
  )
}

export default LiveScoreIndicator
