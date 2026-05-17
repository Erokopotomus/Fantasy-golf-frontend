# Phase A Deployment — Decision Capture Year 1

> **Status:** Code authored Sat May 16. Migration NOT generated, NOT deployed.
> **Run this Monday May 18** after PGA Championship ends Sunday night.
> **Spec:** `docs/CLUTCH_DECISION_CAPTURE_SPEC.md` (v3)

## What's in this phase

**Schema changes (`backend/prisma/schema.prisma`):**

- Added nullable columns to 5 existing models:
  - `DraftPick` — 15 new columns (pickIntent, pickQuality, timeOnClock*, adp/auction snapshots, availablePool, reasonChips, reasonText, envelope)
  - `LineupSnapshot` — 6 new columns (structured decisions, editCount, lastEditedAt, envelope)
  - `WaiverClaim` — 9 new columns (acquisitionRoute, faab*, trending*, reasonChips, envelope)
  - `Trade` — 8 new columns (proposer/responder ProjectedValue + reasonChips, declineReason, envelope)
  - `RosterTransaction` — 8 new columns (wasOnActiveLineup, daysSinceAcquisition, acquisitionType, reasonChips, reasonText, envelope)
- Added 2 new models:
  - `WatchlistEvent` (event log of watchlist add/remove with state snapshot)
  - `AuctionNomination` (auction nomination capture for Phase 2.7 nomination-bias detector)
- Added back-relations on `User`, `Team`, `Player`, `Draft` so Prisma queries work.

**All new columns are nullable.** No `NOT NULL DEFAULT`, no backfill required. Migration is fast and non-blocking even on the large `draft_picks` and `roster_transactions` tables.

**New files (already shipped, no migration needed):**

- `frontend/src/constants/reasonChips.js` — shared chip taxonomy
- `backend/src/constants/reasonChips.js` — server mirror + `sanitizeChips()`
- `frontend/src/utils/decisionEnvelope.js` — `buildClientEnvelope()` + `computeMockQualityTier()`
- `backend/src/services/decisionEnvelope.js` — `buildServerEnvelope()`

## Deployment steps (Monday)

### 1. Verify tournament is over

```bash
# Check pool cron isn't actively running
# PGA Championship final round Sunday — wait until Mon morning
```

### 2. Generate the migration locally

```bash
cd /Users/ericsaylor/Desktop/Clutch/backend

# Read DATABASE_URL from .env (LOCAL dev DB, not production)
# This applies the migration to local Postgres + writes the SQL file
npx prisma migrate dev --name 54_decision_capture_year_1
```

Expected output: a new `backend/prisma/migrations/54_decision_capture_year_1/migration.sql` file. Inspect it before committing — should be all `ALTER TABLE ... ADD COLUMN` (nullable) + 2 `CREATE TABLE` statements for `watchlist_events` and `auction_nominations`.

**Sanity checks on the generated SQL:**

- ✅ Every ALTER ADD COLUMN is nullable (no `NOT NULL` without `DEFAULT`)
- ✅ Two new tables created
- ✅ Foreign key constraints reference `users("id")`, `players("id")`, `drafts("id")`, `teams("id")`
- ✅ Indexes created on `(userId, occurredAt)` and friends
- ⚠️  If you see any `DROP COLUMN` or destructive operation — STOP. Something's wrong with the schema diff.

### 3. Commit

```bash
git add backend/prisma/schema.prisma \
        backend/prisma/migrations/54_decision_capture_year_1/ \
        backend/src/constants/reasonChips.js \
        backend/src/services/decisionEnvelope.js \
        frontend/src/constants/reasonChips.js \
        frontend/src/utils/decisionEnvelope.js \
        docs/CLUTCH_DECISION_CAPTURE_SPEC.md \
        docs/PHASE_A_DEPLOYMENT.md

git commit -m "feat: decision capture year 1 — schema + chips + envelope (phase A)

Adds the foundation for the Year 1 instrumentation layer described in
CLUTCH_DECISION_CAPTURE_SPEC.md. All new columns are nullable; no existing
behavior changes. Write-path wiring happens in Phase B (one PR per primitive).

- 5 model extensions: DraftPick, LineupSnapshot, WaiverClaim, Trade, RosterTransaction
- 2 new tables: WatchlistEvent, AuctionNomination
- Shared reasonChips taxonomy (frontend + backend mirror)
- Envelope helpers for clientVersion/surface/leagueContext/mockMeta"
```

### 4. Push — Railway auto-deploys

```bash
git push origin main
```

Railway pipeline runs `prisma migrate deploy` as the first step of `npm start` (`backend/package.json:7`). Watch the Railway logs to confirm the migration applies cleanly. Expected: <30 seconds since every change is additive.

### 5. Smoke verify

After deploy:

```bash
# Confirm new columns visible
railway run npx prisma db pull --print | grep -A 1 "pickIntent\|wasOnNominatorWatchlist" | head

# Confirm tables exist
railway run psql $DATABASE_URL -c "\d watchlist_events"
railway run psql $DATABASE_URL -c "\d auction_nominations"
```

## What this phase does NOT do

- ❌ No write-path code changes — `drafts.js`, `trades.js`, `waivers.js`, etc. still write the old shape. Phase B wires the new columns into the routes (5-7 PRs, ~2-3 days).
- ❌ No `leagueContext` computation yet. That's Phase A.1 — `leagueContextService.js`. Until it ships, `leagueContext` columns just stay null.
- ❌ No frontend chip UI changes. Existing surfaces (board editor, Prove It) keep their local chip lists. Phase B unifies them.
- ❌ No backfill of existing rows. Old draft picks / lineups / trades / waivers / drops get null for the new columns. That's expected — the spec calls this "missing not at random" and the bias engine handles it.

## Rollback (if something goes wrong)

The migration is purely additive — nothing breaks if we roll back the app code. To revert the schema:

```sql
-- Worst case: drop the 2 new tables (loses no production data because nothing writes to them yet)
DROP TABLE IF EXISTS auction_nominations;
DROP TABLE IF EXISTS watchlist_events;

-- New columns can stay; they're nullable and unused.
```

Don't actually do this unless something is on fire. The columns are dead-storage until Phase B wires them up — they cost ~16 bytes per row in TOAST overhead and nothing else.
