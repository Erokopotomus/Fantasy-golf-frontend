# Kill /lab/watch-list — Design

**Date:** 2026-05-20
**Status:** Approved
**Type:** Pure cleanup / surface removal

## Why

The `/lab/watch-list` page is a dead passive container — list of starred names with no signal to bring users back. Audit options were (A) just delete, (B) Thesis Tracker, (C) Compare Scratchpad. Decision: **A — delete, no replacement.** Boards already do tiered player lists, which is what watch-list was redundantly doing. The Lab still has 5 substantial surfaces without it (Boards, Mock Draft, Prep, Decision Journal, Lab Captures).

## Kill list

**Frontend pages / hooks:**
- Delete `frontend/src/pages/WatchList.jsx` (114 lines)
- Delete `frontend/src/hooks/useWatchList.js` (53 lines)

**Routing / nav:**
- Drop `/lab/watch-list` route from `frontend/src/App.jsx`
- Drop Watch List entry from Lab dropdown in `frontend/src/components/layout/Navbar.jsx`

**Lab hub (`/lab` = DraftBoards.jsx):**
- Remove `renderWatchList` block (lines 432-458)
- Remove `watchListEntries` state + `api.getWatchList()` fetch from hub loader (lines 124, 189, 192, 194)
- Remove right-column slot that renders it (line 581)

**Star UI on player surfaces:**
- Remove star button + handler from `PlayerProfile.jsx`, `NflPlayerDetail.jsx`, `DraftBoardEditor.jsx`
- Audit for any other `useWatchList` consumers before deleting (grep `useWatchList | addToWatchList | removeFromWatchList`)
- Rationale: if you want to track a player, drag them onto a Board. No separate "star" primitive needed.

**API surface:**
- Remove `getWatchList`, `addToWatchList`, `removeFromWatchList` from `frontend/src/services/api.js`
- Remove backend watchlist route file + service (find filename during execution)

**Data:**
- Keep both `WatchListEntry` (primary storage) and `WatchlistEvent` (audit log) Prisma models intact. No migration.
- Three backend services *read* `WatchListEntry` for Decision Capture signals: auction nomination capture (`wasOnNominatorWatchlist` flag), draft board service (`watchListPopulated` check), decision graph service. These calls handle empty-table gracefully (Prisma returns null/0/false) so they continue to function as no-ops once writes stop.
- All write paths die when the frontend hook + backend route file are deleted — no separate decision-capture write path to strip.

## Open questions resolved during execution

1. **Does any Manager Intelligence extractor depend on `WatchlistEvent`?** If yes, decide between (a) keeping the write path alive in headless form or (b) migrating the extractor. Likely-no — MI focuses on draft, trade, waiver, drop, lineup signals. Will grep `WatchlistEvent` in `backend/src/services/intelligence/` to confirm.
2. **Other `useWatchList` call sites beyond the three named?** Grep settles it.

## Verification

- After kill: `grep -rn "WatchList\|watch-list\|watchlist" frontend/src backend/src` should return zero matches outside the preserved `WatchlistEvent` Prisma model + this design doc.
- Frontend dev build (or production build) succeeds with no broken imports.
- Backend boots clean (no missing route imports in `index.js`).

## Execution mode

Single pass, single commit, single push. Too small for the full writing-plans → subagent-driven-development dance.

**Effort:** 30-45 min.
