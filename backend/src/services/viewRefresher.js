/**
 * Materialized View Refresher
 *
 * Refreshes the 3 materialized views used for fast analytics queries.
 * Called after analytics aggregation completes.
 */

const VIEWS = [
  'mv_player_fantasy_rankings',
  'mv_draft_strategy_outcomes',
  'mv_weekly_scoring_leaders',
]

/**
 * Refresh all materialized views concurrently.
 * CONCURRENTLY allows reads during refresh (requires unique index).
 */
async function refreshAllViews(prisma) {
  const results = []
  for (const view of VIEWS) {
    try {
      await prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`)
      results.push({ view, status: 'ok' })
    } catch (e) {
      // Fall back to non-concurrent refresh if concurrent fails
      try {
        await prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW ${view}`)
        results.push({ view, status: 'ok (non-concurrent)' })
      } catch (e2) {
        results.push({ view, status: 'error', error: e2.message })
      }
    }
  }
  return results
}

module.exports = { refreshAllViews, VIEWS }
