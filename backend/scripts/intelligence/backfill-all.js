#!/usr/bin/env node
/**
 * MI-19: Backfill script — re-run all 19 registered extractors for every
 * user with claimed HistoricalSeasons, then refresh the CharacteristicAggregate
 * snapshot. Safe to run repeatedly — each per-user pass upserts.
 *
 * Use when:
 *   - New users finish the vault-claim wizard (catch-up for existing seasons).
 *   - Extractor math changes (requires a full recompute).
 *
 * Runs sequentially per user — Prisma's connection pool can't absorb a
 * `Promise.all` over 100+ users hammering 19 extractors apiece. Sequential
 * isolation also means one user's failure can't poison the rest of the batch.
 *
 * Errors are collected and written to scripts/intelligence/_errors/ so an
 * operator can review without scrolling Railway logs.
 */
const fs = require('fs')
const path = require('path')
const prisma = require('../../src/lib/prisma')
const intelligence = require('../../src/services/intelligence')
const { aggregateAll } = require('../../src/services/intelligence/aggregateCron')

;(async () => {
  console.log('=== Manager Intelligence Backfill ===')
  const t0 = Date.now()

  // 1. Find every user with at least one claimed historical season.
  const userRows = await prisma.historicalSeason.findMany({
    where: { ownerUserId: { not: null } },
    distinct: ['ownerUserId'],
    select: { ownerUserId: true },
  })
  const userIds = userRows.map((r) => r.ownerUserId).filter(Boolean)
  console.log(`Found ${userIds.length} user(s) with claimed seasons`)

  if (userIds.length === 0) {
    console.log('Nothing to backfill. Exiting.')
    process.exit(0)
  }

  // 2. Per-user pass — sequential, isolated, idempotent.
  // totalFailed counts extractor-level failures (one user can contribute up to 19).
  // userCrashes counts users whose runForUser itself threw — distinct signal.
  let totalOk = 0
  let totalFailed = 0
  let totalSkipped = 0
  let userCrashes = 0
  let processed = 0
  const errors = []

  for (const userId of userIds) {
    const userT0 = Date.now()
    try {
      const result = await intelligence.runForUser(userId, { db: prisma })
      totalOk += result.ok.length
      totalFailed += result.failed.length
      totalSkipped += result.skipped.length
      if (result.failed.length > 0) {
        errors.push({ userId, failed: result.failed })
      }
    } catch (e) {
      console.error(`Failed for user ${userId}:`, e.message)
      errors.push({ userId, error: e.message, stack: e.stack })
      userCrashes += 1
    }
    processed++
    // Log on first user (so operator sees life), every 25 users, and final.
    if (processed === 1 || processed % 25 === 0 || processed === userIds.length) {
      const pct = Math.round((processed / userIds.length) * 100)
      const elapsedMs = Date.now() - t0
      const rate = processed / (elapsedMs / 1000)
      console.log(
        `[${pct}%] ${processed}/${userIds.length} users · ok=${totalOk} failed=${totalFailed} skipped=${totalSkipped} crashes=${userCrashes} · ${rate.toFixed(2)} users/sec · last user ${Math.round((Date.now() - userT0) / 1000)}s`
      )
    }
  }

  const perUserMs = Date.now() - t0
  console.log(
    `\n=== Per-user pass complete in ${Math.round(perUserMs / 1000)}s ===`
  )
  console.log(
    `Totals: ok=${totalOk}, failed=${totalFailed}, skipped=${totalSkipped}, userCrashes=${userCrashes}`
  )

  // 3. Persist any errors to disk for review.
  if (errors.length > 0) {
    const outDir = path.join(__dirname, '_errors')
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outPath = path.join(outDir, `backfill-errors-${stamp}.json`)
    fs.writeFileSync(outPath, JSON.stringify(errors, null, 2))
    console.log(
      `${errors.length} user(s) with errors → ${outPath}`
    )
  }

  // 4. Refresh CharacteristicAggregate snapshot so admin Library views see
  //    fresh totals immediately (the nightly cron would otherwise catch up).
  console.log('\n=== Refreshing CharacteristicAggregate snapshot ===')
  const aggResult = await aggregateAll()
  console.log(
    `Aggregated ${aggResult.results.length} types in ${aggResult.durationMs}ms`
  )

  console.log('\n=== Backfill complete ===')
  console.log(`Total runtime: ${Math.round((Date.now() - t0) / 1000)}s`)
  process.exit(0)
})().catch((e) => {
  console.error('Backfill crashed:', e)
  process.exit(1)
})
