import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

/**
 * PatternInsightsSection — Surfaces data from the Pattern Engine.
 * Card grid with 2-4 insight cards based on available data.
 * Template-based text — no AI call.
 */
export default function PatternInsightsSection({ phaseContext }) {
  const data = phaseContext || {}
  const summary = data.summary || {}
  const patterns = data.patterns || {}

  const cards = buildInsightCards(patterns, summary)

  if (cards.length === 0) return null

  return (
    <div className="mb-6">
      <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary/30 mb-3">Your Patterns</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map((card, i) => (
          <InsightCard key={i} {...card} />
        ))}
      </div>
    </div>
  )
}

function InsightCard({ icon, title, lines, link, linkLabel }) {
  return (
    <div className="p-3.5 bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <h3 className="text-xs font-semibold text-text-primary">{title}</h3>
      </div>
      {lines.map((line, i) => (
        <p key={i} className="text-xs text-text-primary/50 leading-relaxed">{line}</p>
      ))}
      {link && (
        <Link to={link} className="mt-2 inline-block text-[11px] font-semibold text-[var(--crown)] hover:underline">
          {linkLabel || 'See More'}
        </Link>
      )}
    </div>
  )
}

function buildInsightCards(patterns, summary) {
  const cards = []

  // Draft Tendencies
  const draft = patterns?.draftPatterns
  if (draft?.hasDraftData) {
    const lines = []
    if (draft.reachFrequency) {
      lines.push(`You reach ${Math.round(draft.reachFrequency.reachRate * 100)}% of the time.${
        draft.reachFrequency.avgReachAmount > 0 ? ` Avg reach: ${draft.reachFrequency.avgReachAmount} spots.` : ''
      }`)
    }
    if (draft.boardAdherence?.followRate != null) {
      lines.push(`Board follow rate: ${Math.round(draft.boardAdherence.followRate * 100)}%.`)
    }
    if (lines.length === 0) {
      lines.push(`${draft.draftCount} draft${draft.draftCount !== 1 ? 's' : ''} analyzed, ${draft.totalPicks} picks total.`)
    }
    cards.push({
      icon: <DraftIcon />,
      title: 'Draft Tendencies',
      lines,
    })
  }

  // Prediction Accuracy
  const pred = patterns?.predictionPatterns
  if (pred?.hasPredictionData) {
    const lines = []
    const pct = pred.overallAccuracy != null ? `${Math.round(pred.overallAccuracy * 100)}%` : 'N/A'
    lines.push(`${pct} overall accuracy (${pred.resolved || 0} resolved).`)
    const overconfidence = pred.biases?.find(b => b.type === 'overconfidence')
    if (overconfidence) {
      lines.push('Your high-confidence calls hit less often. Recalibrate?')
    }
    const wellCalibrated = pred.biases?.find(b => b.type === 'well_calibrated')
    if (wellCalibrated) {
      lines.push('Good news: your confidence levels are well-calibrated.')
    }
    cards.push({
      icon: <PredictionIcon />,
      title: 'Prediction Accuracy',
      lines,
      link: '/prove-it',
      linkLabel: 'See More',
    })
  }

  // Roster Moves
  const roster = patterns?.rosterPatterns
  if (roster?.hasRosterData) {
    const lines = []
    const waiver = roster.waiverTendencies
    if (waiver?.avgBid > 0) {
      lines.push(`Avg waiver bid: $${waiver.avgBid}. ${waiver.wonClaims} successful claims.`)
    } else if (waiver?.wonClaims > 0) {
      lines.push(`${waiver.wonClaims} successful waiver claims this season.`)
    }
    const trading = roster.tradingStyle
    if (trading?.totalProposed > 0) {
      lines.push(`${trading.totalProposed} trade${trading.totalProposed !== 1 ? 's' : ''} proposed, ${trading.totalAccepted} accepted.`)
    }
    if (lines.length > 0) {
      cards.push({
        icon: <RosterIcon />,
        title: 'Roster Moves',
        lines,
      })
    }
  }

  // Your Instincts (Captures)
  const capture = patterns?.capturePatterns
  if (capture?.hasCaptureData) {
    const lines = []
    lines.push(`${capture.totalCaptures} capture${capture.totalCaptures !== 1 ? 's' : ''} this season.`)
    if (capture.captureToActionRate?.rate != null) {
      lines.push(`${Math.round(capture.captureToActionRate.rate * 100)}% led to a roster action.`)
    }
    cards.push({
      icon: <InstinctIcon />,
      title: 'Your Instincts',
      lines,
    })
  }

  return cards.slice(0, 4)
}

function DraftIcon() {
  return (
    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}

function PredictionIcon() {
  return (
    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function RosterIcon() {
  return (
    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  )
}

function InstinctIcon() {
  return (
    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  )
}
