/**
 * Build the shared decision-capture envelope on the client.
 *
 * Used wherever we call track() for a decision event. Stamps
 * clientVersion + surface so we can A/B-attribute decision quality
 * shifts to UI changes later.
 *
 * Spec: docs/CLUTCH_DECISION_CAPTURE_SPEC.md (DecisionEnvelope shape).
 *
 * Usage:
 *   import { buildClientEnvelope } from '../utils/decisionEnvelope'
 *   import { track, Events } from '../services/analytics'
 *
 *   track(Events.DRAFT_PICK_MADE, {
 *     ...buildClientEnvelope({ surface: 'draft_room', sport: 'nfl' }),
 *     leagueId, playerId, pickNumber,
 *   })
 *
 * leagueContext + mockMeta are computed elsewhere (server-side and
 * inside MockDraftRoom respectively) and merged in by the caller —
 * this helper only stamps client-side fields.
 */

// Vite injects this at build time via define: { __BUILD_VERSION__ }
// Fallback to 'web-dev' so local dev events still tag.
const CLIENT_VERSION =
  // eslint-disable-next-line no-undef
  (typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : null) ||
  import.meta.env?.VITE_BUILD_VERSION ||
  `web-dev-${new Date().toISOString().slice(0, 10)}`

export function buildClientEnvelope({ surface, sport, isMock = false, mockMeta = null } = {}) {
  return {
    clientVersion: CLIENT_VERSION,
    surface: surface || 'unknown',
    sport: sport || null,
    isMock,
    ...(mockMeta ? { mockMeta } : {}),
    occurredAt: new Date().toISOString(),
  }
}

/**
 * Compute mockMeta.qualityTier from raw mock-draft state.
 * Called by MockDraftRoom.jsx on mock completion.
 *
 * Tiers per spec:
 *   HIGH   — ≥80% real participants, completed fully, ≤15% bot picks
 *   MEDIUM — ≥50% real participants, completed fully
 *   LOW    — everything else (solo-vs-bots, abandoned, late-round bot-fests)
 */
export function computeMockQualityTier({ realParticipantPct, completedFully, botPickPct }) {
  if (realParticipantPct >= 0.8 && completedFully && botPickPct <= 0.15) return 'HIGH'
  if (realParticipantPct >= 0.5 && completedFully) return 'MEDIUM'
  return 'LOW'
}
