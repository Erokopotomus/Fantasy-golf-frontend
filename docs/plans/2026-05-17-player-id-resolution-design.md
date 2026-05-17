# Player ID Resolution — Bridge Build

**Date:** 2026-05-17
**Status:** Approved, ready for implementation
**Origin:** MI-4 surfaced that imports store raw platform player IDs in `HistoricalSeason.draftData` but never call the player matching service. Every downstream extractor that needs to resolve a player hits a wall.
**Blocks:** MI-5 through MI-20 (most extractors need playerId resolution to work)

---

## Goal

Make sure every historical draft pick's platform `playerId` is resolvable to a canonical `Player.id`. Two paths:

- **A.** New imports auto-populate platform-ID mappings on the Player row at write time.
- **C.** One-time backfill script catches up the existing historical data we already have.

After this build, calling `prisma.player.findFirst({ where: { yahooId: '390.p.30154' } })` actually returns a Player row.

## Architecture decision (already made — see brainstorming dialogue)

- **NOT building a dedicated `PlayerExternalId` mapping table.** The schema already has per-platform columns on Player (`yahooId`, `sleeperId`, `espnId`, `mflId`, `fantraxId`, `externalId`, `gsisId`, `datagolfId`, etc.) and that's working architecture for v1.
- **Existing `backend/src/services/playerMatcher.js` is the canonical matcher.** Uses exact platform-ID lookup → fuzzy name match → null fallback. Has a `matchAndLink` function that auto-fills platform IDs when fuzzy match succeeds.
- **Single-user scale (Eric only).** Backfill runs against ~hundreds of picks. Audit the misses after running to decide if per-platform API research is the next priority.

## Approach A — Wire matcher into 5 importers

Each import service has its own draft-pick parsing logic. The matcher gets called inside the loop that builds `draftData.picks` (or shortly after, before write).

Per import service:

```js
const { matchAndLink } = require('./playerMatcher')

// For each pick:
const match = await matchAndLink({
  name: pick.playerName,        // platform-provided name
  platform: 'yahoo',            // 'sleeper' | 'yahoo' | 'espn' | 'fantrax' | 'mfl'
  platformId: pick.playerId,    // raw platform ID string
  position: pick.position,
  sport: 'nfl',                 // or 'golf' depending on importer
}, prisma, { createIfMissing: false })
```

`matchAndLink` does:
1. Try exact platform ID match (`Player.yahooId === '390.p.30154'`)
2. If miss, fuzzy name match using normalized name + position bonus
3. If fuzzy match found, ALSO write `Player.yahooId = '390.p.30154'` so next time it's an exact hit (incremental enrichment)
4. Return matched Player or null

The picks themselves still store the raw platform ID in `draftData.picks[].playerId` — we don't rewrite the JSON. The benefit is on Player rows: their `yahooId` / `sleeperId` / etc. columns get populated.

**v1 scope intentionally:** don't create new Player rows when matching fails. `createIfMissing: false`. Logging the names that fail to match becomes the audit data for "do we need to sync more players?" or "do we need better matching logic?"

## Approach C — One-time backfill script

`backend/scripts/intelligence/backfill-player-ids.js`:

1. Iterate all `HistoricalSeason` rows where `draftData IS NOT NULL`
2. For each pick in `draftData.picks`, call `matchAndLink` (same as Approach A would have done at import time)
3. Track:
   - Total picks processed
   - Matches via exact ID (already had mapping)
   - Matches via fuzzy name (mapping just got created — the incremental enrichment)
   - Misses (no match — needs investigation)
4. Print summary at end. Optionally write misses to `backend/scripts/intelligence/_misses-{timestamp}.json` for audit

Also iterate `HistoricalSeason.transactions` JSON for trades/adds/drops which also reference player IDs. Same matching logic.

Idempotent — safe to re-run. Will quickly skip already-matched picks because exact ID lookup hits.

## Misses audit — what to do with them

After backfill, the misses are sorted into categories:

- **Name typos / spelling variants** (e.g., "DJ Moore" vs "D.J. Moore") — fuzzy matcher should handle most, but some slip through. Improving matcher = future Phase.
- **Defunct players** (retired before our Player table existed) — acceptable to leave unmapped.
- **Platform-specific quirks** (e.g., Yahoo uses old-format IDs from before they renamed) — flag for API research.
- **DSTs and kickers** — often have weird name conventions ("KC D/ST" vs "Kansas City Chiefs"). Worth a dedicated normalization pass if many.

Decide per-category whether v1 is complete or whether more work is justified.

## Out of scope for v1

- New `PlayerExternalId` mapping table (architectural refactor, not justified yet)
- Multi-ID-per-platform support (e.g., Yahoo old + new format on same player)
- Cross-platform deduplication (detecting that Player A and Player B are the same person and merging)
- Automatic Player record creation on match failure (`createIfMissing: true`) — would need careful sport/position validation
- Per-platform API research (do this AFTER backfill audit reveals what's actually needed)

---

## Implementation plan

### Task PIR-1: Wire `matchAndLink` into the 5 importers

Files to modify (1 per platform):
- `backend/src/services/sleeperImport.js`
- `backend/src/services/yahooImport.js`
- `backend/src/services/espnImport.js`
- `backend/src/services/fantraxImport.js`
- `backend/src/services/mflImport.js`

For each: find the loop that builds `picks` array (look for `playerId` and `playerName` references), call `matchAndLink` per pick. Don't block on match failures — log and continue.

Single commit per importer, or one big commit if you prefer.

### Task PIR-2: Backfill script

File: `backend/scripts/intelligence/backfill-player-ids.js`

Run once locally (or via Railway exec) after PIR-1 deploys. Reports stats. Writes misses to JSON for audit.

### Task PIR-3: Audit Eric's data

Run backfill against Eric's imported leagues. Review the misses JSON. Decide next step:
- Misses are all noise (DSTs, kickers, weird names) → accept
- Misses include real recent players → fuzzy matcher needs improvement, or platforms need API integration

### Task PIR-4: Re-run MI-4 smoke test

After PIR-1 + PIR-2 land, `node backend/scripts/intelligence/test-pick-quality.js` should now actually return data (assuming NFL ADPEntry has any coverage — which is a separate question to look at).

## Success criteria

- PIR-1: imports populate Player platform-ID columns inline as a side effect of running
- PIR-2: backfill catches up existing draftData → Player mappings
- PIR-3: ≥80% of Eric's recent (2020+) NFL draft picks resolve to Players. <2020 misses are acceptable (historical names, retired players, old DSTs).
- Then MI-5 onwards can resume building extractors with confidence player resolution works.
