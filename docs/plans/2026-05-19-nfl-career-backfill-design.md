# NFL Career-Data Backfill — Design

> **Status:** Approved by Eric (2026-05-19 brainstorm). Followed by implementation plan at `docs/plans/2026-05-19-nfl-career-backfill-plan.md`.

## Goal

Backfill enough NFL career data that opening the PlayerDrawer for any active 2026 player — including veterans like Rodgers, Stafford, even ghost legends like Manning/Brady — surfaces a meaningful multi-season game log + career-totals strip, without ingesting every player who ever played.

## Why now

PlayerDrawer click was wired into `/lab/prep/teams/:abbr` (commit `8973116`). Drawer renders dynamically from `NflPlayerGame` data — so any season we have, it shows. Currently we have 2023/2024/2025 fully synced. For Josh Allen that's most of his career; for Rodgers it's 12% of his career; for retired legends, zero. The data gap is the blocker, not the UI.

## Core design decision

**Pooled qualifiers + lazy fetch**, not full historical sync of every player.

- **Pool**: Union of "position-tiered top players in any season 1999-2025."
- **For pool players**: ingest full weekly stat history from their rookie year through 2025.
- **For non-pool players**: lazy-fetch on first drawer open, cache forever.

## Pool definition

Per-season top N by position (Half PPR fantasy points):

| Position | Top N per season | Rationale |
|----------|-----------------|-----------|
| QB | 32 | One starter per team |
| RB | 60 | ~2 per team (RB1 + RB2/handcuff) |
| WR | 80 | ~2.5 per team |
| TE | 36 | Starters + a few top backups |
| K | 32 | One per team |
| DST | 32 | One per team |

**Total per season:** ~272 qualifiers. **Years:** 1999-2025 (27 seasons). **Naïve max:** 7,344 player-seasons. **Realistic unique players:** ~1,500-2,500 after dedup (elite guys recur).

## Year range

**1999 floor.** nflverse data quality drops pre-1999. Rodgers (2005), Stafford (2009), Brees (2001), and Manning/Favre (in nflverse range) all get full careers. Pre-1999 is out of scope — nobody making a 2026 draft decision needs Joe Montana game logs.

## What we ingest per pool player

- **Weekly stats** (passing/rushing/receiving) from `player_stats_week_{season}.csv`
- **Kicking stats** for kickers (2010+, to match nflverse coverage)
- **DST stats** from `stats_team_week_{season}.csv` — but DST is team-level, not player-level. The pool's K + DST entries are derived per-team, not per-player.
- **Schedule context** — NflGame records for each season (already imported by existing `nflHistoricalSync.backfillSeason` — we just trigger it for earlier years)

## What we skip

- Pre-1999 anything (data quality cliff)
- Per-game DST stats older than 2010 (granularity not worth the storage)
- Kicking stats older than 2010 (kickers are streamed; deep history not load-bearing)
- Players who never crack the pool in any season (lazy-fetch handles them on demand)
- Front-end "show full career" toggle (drawer already shows whatever seasons exist, gracefully)

## Lazy fetch model

New table: `NflPlayerDataState`

```prisma
model NflPlayerDataState {
  id              String   @id @default(cuid())
  playerId        String   @unique
  player          Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)

  // Backfill status
  inPool          Boolean  @default(false)   // covered by initial pool backfill
  fetchedThrough  Int?                       // most recent season with data
  earliestFetched Int?                       // earliest season with data
  lastFetchedAt   DateTime?

  // Lazy-fetch tracking (for non-pool players)
  lazyFetchedAt   DateTime?                  // null = never lazy-fetched
  lazyFetchError  String?                    // any failure message

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([inPool])
  @@map("nfl_player_data_state")
}
```

This is the single source of truth for "do we have this player's data, and how recent?"

**Trigger paths:**
1. **Pool backfill** sets `inPool=true`, `fetchedThrough=2025`, `earliestFetched={rookie year}` for every pool player.
2. **First-time drawer open** for a non-pool player: API route checks `NflPlayerDataState`. If `lazyFetchedAt` is null and `inPool=false`, it scans `getWeeklyStats(year)` for years 2021-2025 (5 most recent), inserts any matching rows, marks `lazyFetchedAt = now()`.
3. **Re-fetch** is opt-in (manual admin trigger) — we don't refetch lazy-loaded players unless data goes stale.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   computePool(seasons, scoring)  ──┐                            │
│        ↓                           │                            │
│   pool: Set<gsisId>                │                            │
│        ↓                           │                            │
│   filteredBackfill(seasons, pool)  │  one-shot backfill         │
│        ↓                                                        │
│   NflPlayerGame rows + Player rows + NflPlayerDataState rows   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   GET /api/nfl/players/:id                                      │
│        ↓                                                        │
│   has data? ──yes──→ return                                     │
│        ↓ no                                                     │
│   lazyFetchPlayer(id)  ←── runs inline (5-10s)                  │
│        ↓                                                        │
│   return                                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Storage estimate

- 1,500-2,500 pool players × avg 8 seasons each = ~16k player-season-careers
- ~17 weeks per season × 16k = ~272k `NflPlayerGame` rows added
- Plus regular season schedules 1999-2025: ~7,000 new `NflGame` rows
- Estimated DB growth: 200-400 MB. Well within Railway Postgres comfort zone.

## What does NOT change

- `NflPlayerGame` schema (existing columns suffice)
- `NflGame` schema (existing columns suffice)
- `Player` schema (existing `gsisId` is the join key)
- Frontend drawer (already dynamic, already supports arbitrary year list)
- Drawer API route (already returns `availableSeasons` dynamically — but we will add lazy-fetch trigger)

## Risk: backfill duration

`nflClient.rateLimitedFetch` has rate limiting (presumably a few hundred ms between calls). 27 seasons × ~4 endpoints = ~110 nflverse calls. Conservative estimate: 30-90 minutes for the full backfill, dominated by CSV parsing of older seasons (some files are ~50MB uncompressed). Acceptable — runs once.

## Verification approach

Backend has no formal test framework. We use verification scripts (in `backend/scripts/`) that exercise the new functions with real data and log expected outputs. Pattern matches existing `backend/scripts/backfill-*.js` scripts.

## Out of scope (deferred)

- "Show full career" toggle in drawer (current "all seasons available" suffices)
- Bulk re-fetch UI for lazy-loaded players
- DraftRecap / Compare-page integration for historical players
- 1990s+ data (data quality cliff)
- Playoffs game-log polish

## Approved scope ships when

- Eric can click any Rodgers/Stafford/Allen/Brady row in the prep depth chart and see a multi-year career history in the drawer
- Lazy fetch works for a player not in the pool (e.g., a current backup not in top-tier)
- Backfill takes < 2 hours end-to-end and can be re-run idempotently

---

*Brainstorm log: morning of 2026-05-19, after PlayerDrawer click wire-up. Three-way refinement of "tiered data depth + filtered pool + lazy cache" approach Eric proposed.*
