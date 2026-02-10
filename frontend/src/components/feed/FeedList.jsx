import { Link } from 'react-router-dom'
import FeedCard from './FeedCard'

const SkeletonCard = () => (
  <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 animate-pulse">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-2 h-2 rounded-full bg-white/10" />
      <div className="h-3 w-20 bg-white/10 rounded" />
    </div>
    <div className="h-4 w-3/4 bg-white/10 rounded mb-2" />
    <div className="h-3 w-full bg-white/10 rounded mb-1" />
    <div className="h-3 w-2/3 bg-white/10 rounded mb-3" />
    <div className="h-3 w-16 bg-white/10 rounded" />
  </div>
)

const FeedList = ({ cards, loading, viewAllHref, emptyMessage = 'No updates yet.' }) => {
  if (loading) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-white/30 text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="grid gap-3">
        {cards.map((card) => (
          <FeedCard key={card.id} card={card} />
        ))}
      </div>
      {viewAllHref && (
        <div className="mt-4 text-center">
          <Link
            to={viewAllHref}
            className="text-gold text-xs font-semibold hover:text-gold/80 transition-colors"
          >
            View All Updates
          </Link>
        </div>
      )}
    </div>
  )
}

export default FeedList
