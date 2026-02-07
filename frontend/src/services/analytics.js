/**
 * Event tracking abstraction layer.
 *
 * Today: logs to console in dev, silent in prod.
 * Tomorrow: swap the `send` function to PostHog, Mixpanel, etc.
 *
 * Usage:
 *   import { track } from '../services/analytics'
 *   track('draft_pick_made', { leagueId, playerId, round: 3 })
 */

// ─── Configuration ──────────────────────────────────────────────
const isDev = import.meta.env.DEV

// Set to true when you wire up PostHog (or any provider)
const PROVIDER_ENABLED = false

// ─── Provider (swap this block when ready) ──────────────────────
// import posthog from 'posthog-js'
// posthog.init('phc_YOUR_KEY', { api_host: 'https://us.i.posthog.com' })

function send(event, properties) {
  // When you enable PostHog, uncomment:
  // posthog.capture(event, properties)

  if (isDev) {
    console.log(
      `%c[track] %c${event}`,
      'color: #10b981; font-weight: bold',
      'color: #e2e8f0',
      properties || ''
    )
  }
}

// ─── Public API ─────────────────────────────────────────────────

export function track(event, properties = {}) {
  try {
    send(event, {
      ...properties,
      timestamp: new Date().toISOString(),
    })
  } catch {
    // Analytics should never crash the app
  }
}

export function identify(userId, traits = {}) {
  try {
    if (isDev) {
      console.log('%c[identify]', 'color: #10b981; font-weight: bold', userId, traits)
    }
    // posthog.identify(userId, traits)
  } catch {
    // never crash
  }
}

export function reset() {
  try {
    if (isDev) {
      console.log('%c[reset]', 'color: #10b981; font-weight: bold', 'session cleared')
    }
    // posthog.reset()
  } catch {
    // never crash
  }
}

// ─── Event Catalog ──────────────────────────────────────────────
// Use these constants instead of raw strings so typos are caught at
// import time and you can grep for all usages of a given event.

export const Events = {
  // ── Auth ────────────────────────────────────────────────────
  SIGNED_UP:            'signed_up',
  LOGGED_IN:            'logged_in',
  LOGGED_OUT:           'logged_out',

  // ── League ─────────────────────────────────────────────────
  LEAGUE_CREATED:       'league_created',
  LEAGUE_JOINED:        'league_joined',
  LEAGUE_SETTINGS_UPDATED: 'league_settings_updated',
  LEAGUE_DELETED:       'league_deleted',
  INVITE_SENT:          'invite_sent',
  INVITE_LINK_COPIED:   'invite_link_copied',

  // ── Draft ──────────────────────────────────────────────────
  DRAFT_STARTED:        'draft_started',
  DRAFT_PICK_MADE:      'draft_pick_made',
  DRAFT_AUTO_PICK:      'draft_auto_pick',
  DRAFT_COMPLETED:      'draft_completed',
  DRAFT_PAUSED:         'draft_paused',
  DRAFT_RESUMED:        'draft_resumed',
  MOCK_DRAFT_STARTED:   'mock_draft_started',
  MOCK_DRAFT_COMPLETED: 'mock_draft_completed',

  // ── Roster / Lineup ────────────────────────────────────────
  LINEUP_SAVED:         'lineup_saved',
  LINEUP_OPTIMIZED:     'lineup_optimized',
  PLAYER_ADDED:         'player_added',
  PLAYER_DROPPED:       'player_dropped',
  PLAYER_DRAGGED:       'player_dragged',     // drag-and-drop lineup edit

  // ── Trades ─────────────────────────────────────────────────
  TRADE_PROPOSED:       'trade_proposed',
  TRADE_ACCEPTED:       'trade_accepted',
  TRADE_REJECTED:       'trade_rejected',
  TRADE_CANCELLED:      'trade_cancelled',

  // ── Chat ───────────────────────────────────────────────────
  MESSAGE_SENT:         'message_sent',

  // ── Waivers ────────────────────────────────────────────────
  WAIVER_CLAIM:         'waiver_claim',
  FREE_AGENT_PICKUP:    'free_agent_pickup',

  // ── Scoring / Tournaments ──────────────────────────────────
  LEADERBOARD_VIEWED:   'leaderboard_viewed',
  TOURNAMENT_VIEWED:    'tournament_viewed',
  LIVE_SCORING_VIEWED:  'live_scoring_viewed',

  // ── Player ─────────────────────────────────────────────────
  PLAYER_PROFILE_VIEWED: 'player_profile_viewed',
  PLAYER_SEARCHED:      'player_searched',

  // ── Navigation / Engagement ────────────────────────────────
  PAGE_VIEWED:          'page_viewed',        // supplement Vercel auto-tracking
  DASHBOARD_VIEWED:     'dashboard_viewed',
  STANDINGS_VIEWED:     'standings_viewed',

  // ── Predictions (Tier 2 — future) ─────────────────────────
  PREDICTION_SUBMITTED: 'prediction_submitted',
  PREDICTION_RESOLVED:  'prediction_resolved',

  // ── League Migration (Tier 3 — future) ────────────────────
  IMPORT_STARTED:       'import_started',
  IMPORT_COMPLETED:     'import_completed',
  IMPORT_FAILED:        'import_failed',

  // ── Premium (Tier 4 — future) ──────────────────────────────
  UPGRADE_CLICKED:      'upgrade_clicked',
  AI_CADDIE_USED:       'ai_caddie_used',
}
