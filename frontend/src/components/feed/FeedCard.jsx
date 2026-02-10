import { Link } from 'react-router-dom'

const CATEGORY_COLORS = {
  'Stat Leader': '#F59E0B',
  'Big Performance': '#EF4444',
  'Team Trend': '#3B82F6',
  'Game Result': '#10B981',
  'Tournament': '#A855F7',
  'Player Update': '#F97316',
  'Breaking News': '#DC2626',
  'Transaction': '#8B5CF6',
  'Injury Report': '#F59E0B',
  'Analysis': '#6366F1',
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const FeedCard = ({ card }) => {
  const dotColor = CATEGORY_COLORS[card.category] || '#F59E0B'

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl rounded-xl p-4 hover:bg-white/[0.06] transition-colors">
      {/* Optional image thumbnail for news cards */}
      {card.meta?.imageUrl && (
        <div className="mb-3 -mx-4 -mt-4 overflow-hidden rounded-t-xl">
          <img
            src={card.meta.imageUrl}
            alt=""
            className="w-full h-36 object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Category tag + timestamp */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: dotColor }}
          />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider" style={{ color: dotColor }}>
            {card.category}
          </span>
        </div>
        {card.timestamp && (
          <span className="text-[10px] text-white/25 font-mono">
            {timeAgo(card.timestamp)}
          </span>
        )}
      </div>

      {/* Headline */}
      <h3 className="text-white font-display font-bold text-sm leading-snug mb-1.5">
        {card.headline}
      </h3>

      {/* Context */}
      {card.context && (
        <p className="text-white/50 text-xs leading-relaxed mb-3 line-clamp-2">
          {card.context}
        </p>
      )}

      {/* Byline for news cards */}
      {card.meta?.byline && (
        <p className="text-white/30 text-[10px] font-mono mb-3">
          via {card.meta.byline}
        </p>
      )}

      {/* Action links */}
      {card.actions?.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {card.actions.map((action, i) =>
            action.external ? (
              <a
                key={i}
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold text-xs font-semibold flex items-center gap-1 hover:text-gold/80 transition-colors"
              >
                {action.label}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ) : (
              <Link
                key={i}
                to={action.href}
                className="text-gold text-xs font-semibold flex items-center gap-1 hover:text-gold/80 transition-colors"
              >
                {action.label}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )
          )}
        </div>
      )}
    </div>
  )
}

export default FeedCard
