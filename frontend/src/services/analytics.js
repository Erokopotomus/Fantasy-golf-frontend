/**
 * Event tracking abstraction layer.
 *
 * Sends events to PostHog when VITE_POSTHOG_KEY is set; otherwise
 * silent in prod / console-logs in dev. The provider toggles itself
 * based on env var presence — no manual flag flip needed.
 *
 * Usage:
 *   import { track } from '../services/analytics'
 *   track('draft_pick_made', { leagueId, playerId, round: 3 })
 */

import posthog from 'posthog-js'

// ─── Configuration ──────────────────────────────────────────────
const isDev = import.meta.env.DEV
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

// Provider is enabled whenever a project key is present.
// No key (e.g. local dev without .env.local) → silent + console only.
const PROVIDER_ENABLED = Boolean(POSTHOG_KEY)

// ─── Provider init ──────────────────────────────────────────────
if (PROVIDER_ENABLED) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,            // auto-fire $pageview on load
    capture_pageleave: true,           // auto-fire $pageleave on unload
    autocapture: true,                 // capture clicks/forms automatically alongside our explicit track() events
    persistence: 'localStorage+cookie',
    disable_session_recording: false,  // session replay opt-in; project-level setting still gates actual recording
    loaded: (ph) => {
      // In dev, surface PostHog distinct_id so we can match console events to PostHog records.
      if (isDev) console.log('%c[posthog]', 'color: #10b981; font-weight: bold', 'ready · distinct_id:', ph.get_distinct_id())
    },
  })
}

function send(event, properties) {
  if (PROVIDER_ENABLED) {
    posthog.capture(event, properties)
  }
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

// Internal users get auto-tagged with $internal_or_test_user so they fall into
// the PostHog "Internal / Test users" cohort and get filtered out of analytics.
const INTERNAL_USER_EMAILS = new Set([
  'ericmsaylor@gmail.com',
])

export function identify(userId, traits = {}) {
  try {
    const enriched = INTERNAL_USER_EMAILS.has(traits.email)
      ? { ...traits, $internal_or_test_user: true }
      : traits
    if (PROVIDER_ENABLED) posthog.identify(userId, enriched)
    if (isDev) {
      console.log('%c[identify]', 'color: #10b981; font-weight: bold', userId, enriched)
    }
  } catch {
    // never crash
  }
}

export function reset() {
  try {
    if (PROVIDER_ENABLED) posthog.reset()
    if (isDev) {
      console.log('%c[reset]', 'color: #10b981; font-weight: bold', 'session cleared')
    }
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
