/**
 * Build the shared decision-capture envelope on the server.
 *
 * Server-side counterpart to frontend/src/utils/decisionEnvelope.js.
 * Stamps the envelope columns (clientVersion, surface, leagueContext,
 * isMock, mockMeta) before persisting to a decision row.
 *
 * Spec: docs/CLUTCH_DECISION_CAPTURE_SPEC.md (DecisionEnvelope shape).
 *
 * Phase A ships this as a thin scaffold. Phase A.1 implements the
 * full leagueContext snapshot (roster strength, weekly win prob,
 * schedule strength) in a separate service — this helper just
 * accepts a precomputed leagueContext and merges it in.
 *
 * Usage:
 *   const { buildServerEnvelope } = require('../services/decisionEnvelope')
 *
 *   await prisma.draftPick.create({
 *     data: {
 *       ...pickData,
 *       ...buildServerEnvelope({
 *         req,
 *         surface: 'draft_room',
 *         leagueContext,         // optional — see leagueContextService.js (Phase A.1)
 *         isMock: false,
 *       }),
 *     },
 *   })
 */

const BACKEND_VERSION =
  process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 8) ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ||
  process.env.npm_package_version ||
  'dev'

const SERVER_VERSION_TAG = `api-${BACKEND_VERSION}`

/**
 * Build the envelope fields to merge into a Prisma `data: { ... }` payload.
 *
 * Trust order for clientVersion:
 *   1. Explicit override (when backfilling from imports, etc.)
 *   2. req.headers['x-clutch-client-version'] (frontend stamps this)
 *   3. server fallback (api-<sha>)
 *
 * @param {object}  args
 * @param {object}  [args.req]              Express request (used to read client header)
 * @param {string}  args.surface            'draft_room' | 'waiver_wire' | 'team_roster' | etc.
 * @param {object}  [args.leagueContext]    Precomputed snapshot from leagueContextService (Phase A.1)
 * @param {boolean} [args.isMock]           True only when MockDraftRoom is firing
 * @param {object}  [args.mockMeta]         { mockDraftId, botPickPct, ..., qualityTier }
 * @param {string}  [args.clientVersionOverride]  Explicit override for backfills
 */
function buildServerEnvelope({
  req = null,
  surface,
  leagueContext = null,
  isMock = false,
  mockMeta = null,
  clientVersionOverride = null,
} = {}) {
  const clientVersion =
    clientVersionOverride ||
    req?.headers?.['x-clutch-client-version'] ||
    SERVER_VERSION_TAG

  return {
    clientVersion: String(clientVersion).slice(0, 40),
    surface: String(surface || 'unknown').slice(0, 40),
    leagueContext: leagueContext || undefined,
    isMock: Boolean(isMock),
    mockMeta: mockMeta || undefined,
  }
}

/**
 * Async variant that computes leagueContext on demand.
 *
 * Use this when the caller has leagueId + teamId. If either is missing
 * (mock drafts, board edits), falls back to the sync envelope with
 * leagueContext: null.
 *
 * Wired into the Phase B decision routes so the leagueContext column
 * stops being null on every captured row.
 */
async function buildEnvelopeWithContext({
  req = null,
  surface,
  leagueId = null,
  teamId = null,
  prisma = null,
  isMock = false,
  mockMeta = null,
  clientVersionOverride = null,
} = {}) {
  let leagueContext = null
  if (leagueId && teamId && prisma) {
    const { buildLeagueContext } = require('./leagueContextService')
    leagueContext = await buildLeagueContext({ leagueId, teamId, prisma })
  }
  return buildServerEnvelope({
    req,
    surface,
    leagueContext,
    isMock,
    mockMeta,
    clientVersionOverride,
  })
}

module.exports = {
  buildServerEnvelope,
  buildEnvelopeWithContext,
  SERVER_VERSION_TAG,
}
