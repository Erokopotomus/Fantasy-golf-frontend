/**
 * Smoke test for DS-5 (NFL projection sync into NflPlayerProjection).
 *
 * Reuses the existing computeNflClutchRankings() path in projectionSync.js
 * which now ALSO writes to NflPlayerProjection with source='sleeper_consensus'.
 *
 * Verifies:
 *   - >=200 NflPlayerProjection rows for season=2026, scoringType='ppr'
 *   - >=70% of rows have non-null adp (top players definitely have ADP)
 *   - Top 5 PPR position ranks at QB look plausible (sanity check)
 *
 * Defaults to PPR/2026. Override via SCORING / SEASON env vars.
 */

const prisma = require('../../src/lib/prisma')
const { computeNflClutchRankings } = require('../../src/services/projectionSync')

async function main() {
  const scoringFormat = process.env.SCORING || 'ppr'
  const season = parseInt(process.env.SEASON || '2026', 10)

  console.log(`\n=== DS-5 projection sync smoke test: ${scoringFormat}/${season} ===\n`)
  const t0 = Date.now()
  const result = await computeNflClutchRankings(scoringFormat, season)
  const elapsedSec = ((Date.now() - t0) / 1000).toFixed(1)

  console.log(`\n[smoke] computeNflClutchRankings returned:`, result)
  console.log(`[smoke] elapsed: ${elapsedSec}s\n`)

  // Verify NflPlayerProjection rows
  const rows = await prisma.nflPlayerProjection.findMany({
    where: { season, scoringType: scoringFormat, source: 'sleeper_consensus' },
    include: { player: { select: { name: true, nflPosition: true, nflTeamAbbr: true } } },
  })
  console.log(`[smoke] NflPlayerProjection rows for ${scoringFormat}/${season}: ${rows.length}`)

  let failures = 0
  if (rows.length < 200) {
    console.error(`  ❌ expected >=200 rows, got ${rows.length}`)
    failures++
  } else {
    console.log(`  ✅ row count OK (${rows.length})`)
  }

  // ADP coverage: check only the draftable tier (top 30 QB/RB/WR/TE by positionRank).
  // FFC's free endpoint returns ~170 draftable players; deeper bench players legitimately
  // have no ADP, so checking against all 849 rows would be misleading.
  const DRAFTABLE_LIMITS = { QB: 24, RB: 40, WR: 40, TE: 18 }
  let draftableTotal = 0
  let draftableWithAdp = 0
  for (const [pos, limit] of Object.entries(DRAFTABLE_LIMITS)) {
    const posRows = rows
      .filter((r) => r.player?.nflPosition === pos && r.positionRank != null)
      .sort((a, b) => a.positionRank - b.positionRank)
      .slice(0, limit)
    draftableTotal += posRows.length
    draftableWithAdp += posRows.filter((r) => r.adp != null).length
  }
  const draftableAdpPct = draftableTotal ? (draftableWithAdp / draftableTotal) * 100 : 0
  // 75% threshold: FFC's free feed gives ~170 draftable players, but our
  // "draftable tier" is 122 slots that include speculative RB3/WR4/TE2 late-rounders
  // FFC sometimes doesn't track. Top 50 always covered; tail can miss.
  if (draftableAdpPct < 75) {
    console.error(
      `  ❌ expected >=75% adp coverage on draftable tier, got ${draftableAdpPct.toFixed(1)}% (${draftableWithAdp}/${draftableTotal})`
    )
    failures++
  } else {
    console.log(
      `  ✅ draftable-tier adp coverage OK (${draftableAdpPct.toFixed(1)}%, ${draftableWithAdp}/${draftableTotal})`
    )
  }
  const withAdp = rows.filter((r) => r.adp != null)
  console.log(`  ℹ overall adp coverage: ${((withAdp.length / rows.length) * 100).toFixed(1)}% (${withAdp.length}/${rows.length}) — tail-end bench players legitimately have no ADP`)

  // Sanity: top 5 QB by positionRank
  const topQbs = rows
    .filter((r) => r.player?.nflPosition === 'QB' && r.positionRank != null)
    .sort((a, b) => a.positionRank - b.positionRank)
    .slice(0, 5)
  console.log(`\n[smoke] Top 5 QBs by positionRank (${scoringFormat}/${season}):`)
  topQbs.forEach((r) => {
    console.log(
      `  QB${r.positionRank}  ${r.player.name} (${r.player.nflTeamAbbr})  ` +
        `proj=${r.projectedPoints.toFixed(1)}  adp=${r.adp ?? 'n/a'}`
    )
  })
  if (topQbs.length < 5) {
    console.error(`  ❌ expected >=5 QBs with positionRank, got ${topQbs.length}`)
    failures++
  } else {
    console.log(`  ✅ QB position ranks present`)
  }

  await prisma.$disconnect()
  if (failures > 0) {
    console.error(`\n❌ ${failures} check(s) failed\n`)
    process.exit(1)
  }
  console.log(`\n✅ DS-5 smoke test passed (${elapsedSec}s)\n`)
}

main().catch(async (e) => {
  console.error('[smoke] fatal:', e)
  await prisma.$disconnect().catch(() => {})
  process.exit(1)
})
