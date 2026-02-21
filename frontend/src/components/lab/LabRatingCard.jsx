// Compact rating card for the Lab hub
// Shows Clutch Rating score + which components Lab work improves (Draft IQ + Roster Mgmt)
// Links to /my-rating

import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import useClutchRating from '../../hooks/useClutchRating'
import RatingRing from '../vault/RatingRing'
import RatingTierBadge from '../vault/RatingTierBadge'

export default function LabRatingCard() {
  const { user } = useAuth()
  const { rating, loading } = useClutchRating(user?.id)

  if (loading) {
    return (
      <div className="p-4 bg-dark-secondary/60 border border-[var(--card-border)] rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-dark-tertiary/50 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 bg-dark-tertiary/50 rounded animate-pulse" />
            <div className="h-3 w-40 bg-dark-tertiary/50 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  const isActive = rating?.overall != null
  const components = rating?.components || {}
  const draftIQ = components.draftIQ
  const rosterMgmt = components.rosterMgmt

  // Generate a Lab-specific nudge when no backend insight exists
  const nudge = !isActive
    ? 'Import history and complete drafts to start building your Clutch Rating.'
    : draftIQ?.active && draftIQ.score < 50
      ? `Your Draft IQ is ${draftIQ.score} — try creating a board to improve it.`
      : rosterMgmt?.active && rosterMgmt.score < 50
        ? `Your Roster Management is ${rosterMgmt.score} — Lab research helps.`
        : null

  return (
    <Link
      to="/my-rating"
      className="block p-4 bg-gradient-to-r from-accent-gold/[0.05] to-purple-500/[0.03] border border-accent-gold/10 rounded-xl hover:border-accent-gold/25 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          <RatingRing
            rating={isActive ? rating.overall : null}
            confidence={rating?.confidence || 0}
            tier={rating?.tier || 'UNRANKED'}
            size="sm"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-display font-bold text-text-primary group-hover:text-accent-gold transition-colors">
              {isActive ? `Clutch Rating: ${rating.overall}` : 'Clutch Rating'}
            </span>
            {isActive && rating.tier && <RatingTierBadge tier={rating.tier} size="sm" />}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-text-primary/40">
            {draftIQ?.active && (
              <span>Draft IQ: <span className="font-mono text-text-primary/60">{draftIQ.score}</span></span>
            )}
            {rosterMgmt?.active && (
              <span>Roster Mgmt: <span className="font-mono text-text-primary/60">{rosterMgmt.score}</span></span>
            )}
            {!draftIQ?.active && !rosterMgmt?.active && (
              <span>Lab work feeds Draft IQ + Roster Management</span>
            )}
          </div>
          {nudge && (
            <p className="text-[10px] text-accent-gold/60 mt-1 truncate">{nudge}</p>
          )}
        </div>
        <svg className="w-4 h-4 text-text-primary/20 group-hover:text-accent-gold/50 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}
