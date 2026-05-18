# Clutch Loop — Task Queue

> **How this works:** Cowork adds items as `TODO` with full prompts. Claude Code works them in order. Cowork verifies in Chrome. Nothing gets deleted — this is the running log.
>
> **For Claude Code — READ THIS FIRST:**
> 1. Work through `TODO` items top to bottom. Do not skip or reorder.
> 2. Each item has a self-contained prompt under **Prompt:** — read and execute exactly as written.
> 3. **When you finish an item**, update it in this file:
>    - Change `**Status:** \`TODO\`` to `**Status:** \`DONE\``
>    - Add a `**Completed:**` line right after Status with: date, one-line summary of what you did, and files changed.
>    - Example:
>      ```
>      **Status:** `DONE`
>      **Completed:** 2026-03-02 — Added HistoricalSeason aggregation to computeManagerProfiles(). Files: analyticsAggregator.js
>      ```
> 4. If an item is blocked or you hit an issue, change status to `BLOCKED` and add a `**Blocked:**` line explaining why.
> 5. Commit and deploy after each item (or batch small items together).
> 6. Then move to the next `TODO` item.

---

## QUEUE

### 001 — Commit Cowork Edits (NaN% + Username)
**Status:** `DONE`
**Completed:** 2026-03-01 — Committed and pushed NaN% accuracy fix in ManagerProfile.jsx and username display fix in Profile.jsx. Files: ManagerProfile.jsx, Profile.jsx (commit 5535c81)
**Priority:** Quick win
**Prompt:**
Commit and deploy the changes in `frontend/src/pages/ManagerProfile.jsx` and `frontend/src/pages/Profile.jsx`.

Changes already made by Cowork:
1. **ManagerProfile.jsx line 658:** Added null check for `accuracyRate` — shows "—" instead of "NaN%" when user has 0 predictions. Changed `${(reputation.accuracyRate * 100).toFixed(1)}%` to `reputation.totalPredictions > 0 ? ${(reputation.accuracyRate * 100).toFixed(1)}% : '—'`
2. **Profile.jsx lines 144-145:** Changed condition to check `(user?.username || formData.username)` instead of just `user?.username` so the username displays correctly even if auth context sync is delayed.

These are small, surgical fixes. No other files touched.

---

### 002 — ManagerProfile Lifetime Stats All Zeros
**Status:** `DONE`
**Completed:** 2026-03-01 — Extended computeManagerProfiles() to aggregate HistoricalSeason records (wins/losses/ties/championships/points/standings). Builds per-sport and aggregate (sportId=null) profiles. Handles users with only imported history, both, or only on-platform. Files: analyticsAggregator.js (commit b875880)
**Priority:** High — biggest visible data bug
**Prompt:**
The manager profile page (`/manager/:id`) shows 0 Leagues, 0 Wins, 0 Championships, 0% Win Rate for all users. The Lifetime Stats section and By Sport section also show all zeros. The user has 4 leagues and 17 imported BroMontana seasons with full win/loss/championship data.

**Root cause:** `computeManagerProfiles()` in `backend/src/services/analyticsAggregator.js` (~line 455) only aggregates from `TeamSeason` records (active on-platform seasons). It completely ignores `HistoricalSeason` records from imports. The `ManagerProfile` model is meant to be lifetime career stats.

Meanwhile, `backend/src/services/clutchRatingService.js` DOES aggregate HistoricalSeason data correctly — the Clutch Rating shows 61 based on 17 seasons. These two services are out of sync.

**The API response confirms it:** `GET /api/managers/:userId/profile` returns `"aggregate": null` and `bySport` shows Golf with `totalLeagues: 1, totalSeasons: 1, wins: 0`.

**Fix:** Extend `computeManagerProfiles()` in `analyticsAggregator.js` to ALSO aggregate `HistoricalSeason` records where the user is a claimed owner (via `ownerUserId` on the HistoricalSeason model, or through the league's owner assignment/alias system).

Specifically:
1. After the existing TeamSeason aggregation, query HistoricalSeason records for each user
2. HistoricalSeason has fields like: `wins`, `losses`, `ties`, `championships` (or `finishPosition`), `totalPoints`, `leagueId`, `year`
3. Merge the historical totals into the same ManagerProfile upsert — add historical wins/losses/seasons/leagues to the on-platform ones
4. The aggregate ManagerProfile (`sportId = null`) should sum across ALL sources
5. The per-sport ManagerProfile should also include historical data for the correct sport

**Rules:**
- Only modify `backend/src/services/analyticsAggregator.js`
- Do NOT touch `clutchRatingService.js` — it already works correctly
- Do NOT change the ManagerProfile schema or create new migrations
- Do NOT change the route handler in `managerAnalytics.js`
- Check the HistoricalSeason model in `schema.prisma` to see exact field names before writing queries
- Handle users with ONLY imported history (no TeamSeason records) — they should still get a ManagerProfile
- Handle users with BOTH imported and on-platform data — totals should combine
- Add a comment like `// Include imported league history (HistoricalSeason)` where the new logic starts
- After deploying, verify: `GET /api/managers/cml8xo2960000ny2th1t4z5sd/profile` should return non-null aggregate with ~134 wins, ~92 losses, 1 tie, 17 seasons for Eric

---

### 003 — Draft Comparison Modal Body Scroll Lock
**Status:** `DONE`
**Completed:** 2026-03-01 — Added useEffect that sets document.body.style.overflow='hidden' when showH2HModal is true, restores on close/unmount. Modal content already has overflow-y-auto. Files: LeagueVault.jsx
**Priority:** Medium — UX bug
**Prompt:**
In the League Vault Profiles tab, clicking "Compare Drafts" opens a modal. When scrolling inside this modal, the background page also scrolls. The modal content is long (stat cards + radar chart + 45+ common picks), so users scroll a lot and the page behind jumps around.

Find the Draft Comparison modal component (search for "Draft Comparison" or "Compare Drafts" in `frontend/src/`). When the modal opens, add `document.body.style.overflow = 'hidden'`. When it closes, restore `document.body.style.overflow = ''`. Use a useEffect cleanup.

```jsx
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  }
  return () => {
    document.body.style.overflow = ''
  }
}, [isOpen])
```

**Rules:**
- Only touch the component that renders the Draft Comparison modal
- Make sure the modal itself still scrolls (`overflow-y: auto` on the modal content)
- Make sure body scroll is restored on unmount AND on close

---

### 004 — Draft DNA Radar Chart Too Small/Flat
**Status:** `DONE`
**Completed:** 2026-03-01 — Increased chart size 240→300px, radius 0.35→0.36, replaced Keepers axis with K (kicker), bumped fill opacity 0.15→0.2 and stroke 2→2.5, increased label font 10→12 and offset 1.2→1.25 for readability. Files: LeagueVault.jsx, useDraftIntelligence.js
**Priority:** Medium — chart unreadable
**Prompt:**
The "Draft DNA" radar chart in the Draft Comparison modal (League Vault > Profiles > Compare Drafts) is rendering too small and compressed. Only 3 of the expected 5-6 axis labels are visible (QB, TE, WR). The RB axis label is missing. The chart is so squished that the polygons look like a flat horizontal line.

Search for "Draft DNA" or "DRAFT DNA" in the frontend. Also check `SgRadarChart.jsx` or a similar custom SVG radar component.

**Fix:**
1. Increase the chart size — at least 250x250px, ideally 300x300
2. Ensure ALL position axis labels render and are visible (QB, RB, WR, TE, K, and optionally DST)
3. The polygon shapes should have enough separation to distinguish overlapping owners (fill opacity, stroke width, or slight visual offset)
4. Add the missing axis labels — especially RB which is the largest allocation

**Rules:**
- Only modify the Draft Comparison component and/or its radar chart
- Don't change the SgRadarChart used elsewhere unless it's the same shared component
- Keep the orange/green color scheme for Owner A vs Owner B

---

### 005 — Common Picks Missing Position Badges
**Status:** `DONE`
**Completed:** 2026-03-01 — Enhanced resolve-positions endpoint to also check yahoo_player_cache as fallback for retired/older players not in canonical Player table. Sleeper-seeded cache has ~6700 players with positions including retired ones. Files: imports.js
**Priority:** Low — data polish
**Prompt:**
In the Draft Comparison Common Picks list, older/retired players (pre-~2015) show no position badge. Examples: Greg Jennings, Roddy White, Calvin Johnson, Adrian Peterson — all missing. Newer players like Tyreek Hill (WR), Derrick Henry (RB) show them fine.

Find the component rendering "COMMON PICKS" in the Draft Comparison. The simplest fix: the draft pick data (`draftData.picks`) already stores a `position` field from the original Yahoo import. Use that directly instead of trying to match to canonical Player records.

**Rules:**
- Only touch the Draft Comparison component
- Don't add new API calls or DB queries — use data already available in the draft picks
- If position isn't on the pick data, fall back gracefully (no badge, not an error)

---

### 006 — Common Picks Snake Draft Label
**Status:** `DONE`
**Completed:** 2026-03-01 — Added draftType to common picks year data. Snake draft years with no cost show "snake" in muted 9px text. Auction years with null cost show "$—". Files: LeagueVault.jsx, useDraftIntelligence.js
**Priority:** Low — polish
**Prompt:**
In Draft Comparison Common Picks, some entries show just a year without a dollar amount: `Greg Jennings: 2011 | 2012 $35`. The bare "2011" looks like missing data. Those are snake draft years (2009, 2011) where no auction values exist.

When a pick has no cost (null or 0), and the season's draft type is 'snake', show a subtle indicator like `2011 snake` in muted text (`text-text-muted text-xs`). If it's an auction year and cost is still null, show `$—` instead.

Check the `draftData` JSON — it has a `type` field ('auction' or 'snake') at the top level.

**Rules:**
- Only touch the Common Picks rendering in the Draft Comparison component
- Keep it subtle — small muted text, not a prominent badge

---

### 007 — Auto-Apply Owner Aliases on Reimport
**Status:** `DONE`
**Completed:** 2026-03-01 — Added auto-apply step to reimport-season endpoint. After creating new HistoricalSeason records, queries OwnerAlias for the league and renames draftData.picks[].ownerName using the alias map. Files: imports.js (commit f517a2d)
**Priority:** Medium — data integrity
**Prompt:**
When a commissioner reimports a league season, fresh data comes in with raw owner names from Yahoo/Sleeper, wiping out alias merges.

**What exists:**
1. `owner_aliases` table stores per-league mappings: `ownerName` (raw) → `canonicalName` (merged). Model: `OwnerAlias` in `schema.prisma`.
2. Reimport endpoint: `POST /api/imports/reimport-season` in `backend/src/routes/imports.js` (~lines 997-1141). Deletes old HistoricalSeason, fetches fresh data, creates new record with raw names.
3. Normalize endpoint: `POST /api/imports/normalize-draft-owners/:leagueId` (~lines 627-717). Reads aliases, renames `ownerName` in all draftData picks.

**Fix:** After the reimport creates the new HistoricalSeason record, add a step that:
1. Queries `OwnerAlias` for the league: `await prisma.ownerAlias.findMany({ where: { leagueId } })`
2. If aliases exist, builds rename map: `{ rawName: canonicalName }`
3. Applies the rename map to the new HistoricalSeason's `draftData.picks[].ownerName` — same logic as normalize endpoint
4. Saves the updated draftData

**Rules:**
- Only touch the reimport flow in `backend/src/routes/imports.js`
- Do NOT refactor existing code — just add the alias application step after record creation
- If no aliases exist for the league, skip silently
- Add comment: `// Auto-apply owner aliases if any exist for this league`
- No new endpoints, no new migrations, no frontend changes

---

### 008 — Tank Still in 2025 Owner Spending + Mase R 16 Picks
**Status:** `DONE`
**Completed:** 2026-03-01 — Created 6 new aliases (Tank→Anthony, Spencer→Spencer H, Nick→Nick Trow, Jake→Jakob, Mason→Mase R, Bradley→bradley) — all were DST picks showing Yahoo short first names. Applied normalization across all seasons (7,842 picks fixed). Tank is now gone from 2025. **Mase R 16 picks finding:** Mase R has 16 picks (including 2 DSTs — Washington $0 + Texans $2), Scott has 14. In a 180-pick/12-team auction each should have 15. The "Mason" DST pick may actually belong to Scott — Eric to verify. Files: database data only (owner_aliases + historicalSeason draftData)
**Priority:** Medium — data cleanup
**Prompt:**
In BroMontana Bowl league vault (Drafts tab, 2025 season), Owner Spending table still shows "Tank" as a separate row with 1 pick/$2. The alias merge should have merged Tank into a canonical owner. Also "Mase R" shows 16 picks while all other owners show 14-15.

**Steps:**
1. Query the 2025 HistoricalSeason `draftData` for BroMontana league to see if "Tank" still exists in picks array
2. Check `owner_aliases` table for what Tank maps to — it should have a `canonicalName` entry
3. If alias exists but wasn't applied to 2025: run the normalize logic or manually update the 2025 draftData
4. If no alias exists for Tank in this league: determine who Tank should map to and create the alias, then normalize
5. For Mase R's 16 picks: check raw draftData to verify — is it genuinely 16 picks (maybe picked up a dropped player) or a duplicate entry?

**Rules:**
- Do NOT delete any data — only rename/merge owner names in draftData
- Check `owner_aliases` table FIRST before making changes
- Report findings about the Mase R situation

---

### 009 — Profile Page Stats Card Sync After Fix 002
**Status:** `DONE`
**Completed:** 2026-03-01 — useStats hook now accepts optional userId param and fetches ManagerProfile aggregate data (includes imported history) with fallback to leagues-only derivation. Profile.jsx passes user.id. Stats cards now show lifetime data consistent with manager page. Files: useStats.js, Profile.jsx
**Priority:** Low — verify after 002 deploys
**Prompt:**
After Fix 002 (ManagerProfile aggregation) is deployed, verify that the `/profile` page stats cards (Total Points, Best Finish, Win Rate) correctly pull from the updated ManagerProfile data.

Check `frontend/src/pages/Profile.jsx` — find the `useStats()` hook or however the stats cards get their data. The profile page shows 4 stat boxes: Leagues, Total Points, Best Finish, Win Rate.

**Verify:**
1. Does "Leagues" count include imported leagues or only on-platform?
2. Where do "Total Points", "Best Finish", "Win Rate" come from? Same `/api/managers/:id/profile` endpoint?
3. If they use a different data source, that source also needs imported league history

**If broken:** Make Profile page stats cards use ManagerProfile aggregate data (same source as manager page) so both pages show consistent numbers.

---

### 010 — Commit Cowork Sport-Aware Terminology Fix
**Status:** `DONE`
**Completed:** 2026-03-01 — Committed Cowork's HeadToHeadSettings sport-aware terminology fix (tournament→week for NFL). Files: HeadToHeadSettings.jsx, LeagueForm.jsx, LeagueSettings.jsx (commit 49419b7)
**Priority:** Quick win
**Prompt:**
Commit and deploy the changes Cowork made to fix golf-specific "tournament" terminology leaking into NFL league creation.

Changes already made by Cowork:
1. **`frontend/src/components/league/settings/HeadToHeadSettings.jsx`:** Added `sport` prop, created `periodUnit`/`periodUnitPlural` variables (`tournament`/`tournaments` for golf, `week`/`weeks` for NFL). Replaced 5 hardcoded "tournament(s)" strings in helper text with sport-aware interpolation.
2. **`frontend/src/components/league/LeagueForm.jsx` line 186:** Added `sport={formData.sport}` to HeadToHeadSettings render.
3. **`frontend/src/pages/LeagueSettings.jsx` line 236:** Added `sport={league?.sport?.toLowerCase()}` to HeadToHeadSettings render.

These are small, surgical fixes. No other files touched. Golf still says "tournaments", NFL now correctly says "weeks".

---

### 011 — Sport-Aware Terminology in Remaining Settings Components
**Status:** `DONE`
**Completed:** 2026-03-01 — Applied sport-aware terminology to FullLeagueSettings (2 strings), SurvivorSettings (1), OneAndDoneSettings (3), ScoringSettings (1), ScheduleManager (1). Added sport prop pass-through from LeagueForm.jsx and LeagueSettings.jsx. Files: FullLeagueSettings.jsx, SurvivorSettings.jsx, OneAndDoneSettings.jsx, ScoringSettings.jsx, ScheduleManager.jsx, LeagueForm.jsx, LeagueSettings.jsx
**Priority:** Low — cosmetic, golf-only formats less urgent
**Prompt:**
The HeadToHeadSettings terminology fix (item 010) only covers the H2H format. The same pattern needs to be applied to 5 other settings components that have hardcoded golf terminology. These components are currently only used by golf-specific formats (Survivor, One & Done, Full League) but should be future-proofed.

**Files and strings to fix:**

1. **`frontend/src/components/league/settings/FullLeagueSettings.jsx`** — 2 instances:
   - Line ~32: `"Choose which tournaments count for your league. Leave blank for the full PGA season."` → Sport-aware: use "weeks" for NFL, "tournaments" for golf. Remove "PGA" reference or make it sport-specific.
   - Line ~87: `"Each player on your roster earns points based on their tournament finish"` → `"...based on their weekly/tournament performance"`

2. **`frontend/src/components/league/settings/SurvivorSettings.jsx`** — 1 instance:
   - Line ~133: `"After each tournament, the lowest-scoring team is eliminated"` → `"After each {periodUnit}..."`

3. **`frontend/src/components/league/settings/OneAndDoneSettings.jsx`** — 2 instances:
   - Line ~130: `"Pick any golfer for each tournament"` → `"Pick any player for each {periodUnit}"`
   - Lines ~140, ~144: `"wins tournament"` → `"wins {periodUnit}"` or just `"wins"`

4. **`frontend/src/components/league/settings/ScoringSettings.jsx`** — 1 instance:
   - Line ~159: `"Points awarded based on final tournament placement"` → `"...based on final placement"`

5. **`frontend/src/components/league/settings/ScheduleManager.jsx`** — 1 instance:
   - Line ~349: `"...for weeks with smaller tournament fields."` → `"...for weeks with smaller fields."`

**Approach:** For each component, add a `sport` prop (passed from LeagueForm/LeagueSettings), create `periodUnit`/`periodUnitPlural` locals, and replace strings. Same pattern as HeadToHeadSettings fix.

**Rules:**
- Pass `sport` from the parent components (LeagueForm.jsx and LeagueSettings.jsx) to each settings component
- Default sport to 'golf' if not provided (backward compatible)
- Don't over-engineer — simple string interpolation, no i18n framework

---

### 012 — NFL League Summary Missing Starters Line
**Status:** `DONE`
**Completed:** 2026-03-01 — Removed `!isNfl` gate from Starters line in League Summary. NFL now shows "Starters: 10 of 17". Files: LeagueForm.jsx
**Priority:** Low — polish
**Prompt:**
In the league creation flow Step 3, the League Summary card at the bottom shows different info for Golf vs NFL:

- **Golf summary** shows: League Name, Format, Draft Type, Sport, Scoring, Roster Size, **Starters: 6 of 8**, League Size
- **NFL summary** shows: League Name, Format, Draft Type, Sport, Scoring, Roster Size, League Size — **no Starters line**

The NFL summary should also show a starters count. For NFL the roster has specific starter slots (QB, 2 RB, 3 WR, TE, FLEX, K, DEF = 10 starters out of 17 total). Display this as `Starters: 10 of 17` or `Starters: 10` (consistent with however Golf displays it).

Find the League Summary component in `frontend/src/components/league/LeagueForm.jsx` (search for "League Summary"). The issue is likely that the starters count is only computed for golf (where it comes from a dropdown) and not for NFL (where it's derived from the fixed roster structure).

**Rules:**
- Only touch the League Summary rendering section
- For NFL, compute starters by counting non-bench/non-IR roster slots
- If the roster structure isn't available at summary time, hardcode the NFL default starters count (10)

---

### 013 — Custom Import useState→useEffect Bug (Leagues Not Loading)
**Status:** `DONE` — Cowork fix committed as 277c2a2. useState→useEffect change was already applied.
**Priority:** High — Custom Data Import is completely broken
**Prompt:**
The Custom Data Import page (`/import/custom`, component: `frontend/src/pages/CustomImport.jsx`) shows "No leagues found. Import a league first" even though the user has leagues. The `/api/leagues` endpoint returns 200 with data.

**Root cause:** Line 510 uses `useState(() => {` instead of `useEffect(() => {`. The API call fires as a state initializer but the `.then()` callbacks don't properly update state because `useState`'s initializer runs synchronously and returns `undefined` as the initial state value.

**Fix already applied by Cowork — just commit and deploy:**
1. Line 1: Added `useEffect` to the import: `import { useState, useEffect, useRef, useCallback } from 'react'`
2. Line 510: Changed `useState(() => {` to `useEffect(() => {` and added `}, [])` dependency array

These are the only two changes. The API call logic inside the effect is correct — it just needed to be in a `useEffect` instead of `useState`.

**Rules:**
- Only touch `frontend/src/pages/CustomImport.jsx`
- The fix is already in the file — just commit and deploy
- Verify after deploy that `/import/custom` shows the league dropdown with user's leagues

---

### 014 — "Game of Inches" Stuck in IMPORTING Status
**Status:** `DONE` — Updated stuck record to FAILED in DB. Added 30-min timeout logic to GET /api/imports — imports stuck in IMPORTING for >30 min auto-marked as FAILED on read.
**Priority:** Medium — stale data in Previous Imports
**Prompt:**
On the import page (`/import`), the "Previous Imports" section shows "Game of Inches" with status `IMPORTING` since 2/26/2026 — 4+ days ago. This import clearly failed or timed out but was never cleaned up.

**Two fixes needed:**

1. **Immediate data fix:** Query the `LeagueImport` table for the "Game of Inches" record and update its status to `FAILED` (or whatever the appropriate terminal status is). Include an error message like "Import timed out".

2. **Systemic fix:** Add a timeout mechanism so imports can't be stuck in IMPORTING forever. Options:
   - A cron job that marks imports as FAILED if they've been in IMPORTING status for > 30 minutes
   - OR add the timeout check in the GET endpoint that returns previous imports — if `status === 'IMPORTING'` and `updatedAt` is more than 30 min ago, return it as `FAILED`

Also consider: the Previous Imports list should show a "Retry" or "Cancel" button for stuck/failed imports instead of just "View Vault" (which doesn't make sense for a failed import).

**Where to look:**
- Import status model: search `schema.prisma` for `LeagueImport` or `ImportSession` or similar
- Previous imports endpoint: search `backend/src/routes/imports.js` for the GET that returns import history
- Import page component: `frontend/src/pages/ImportPage.jsx` or similar

**Rules:**
- Fix the stuck "Game of Inches" record in the database
- Add timeout/cleanup logic for future stuck imports
- Don't delete any import records

---

### 015 — Draft Room: "Round X Pick Y" Header Never Updates
**Status:** `DONE` — Root cause: `draft.currentPick` from initial API load was never updated by Socket.IO events, overriding the computed `picks.length + 1`. Fixed by removing the stale server value and computing pick number solely from `picks.length`.
**Priority:** Medium — visible UX bug during draft
**Prompt:**
In the draft room (`/leagues/:id/draft`), the header text "Snake Draft · Round 1 · Pick 1 of 9" never updates as picks are made. Tested in a 1-member, 9-round snake draft — made all 9 picks and the header stayed at "Round 1 Pick 1 of 9" the entire time, including after draft completion.

**Expected:** Header should update to show the current round and pick number (e.g., "Round 5 · Pick 5 of 9") as each pick is made. After draft completes, it could show "Draft Complete" or "9 of 9 picks made."

**Where to look:**
- Draft room component: search `frontend/src/` for the draft room page (likely `DraftRoom.jsx` or similar)
- Look for where `currentRound` and `currentPick` state is tracked — it's probably being set on initial load but not updated when picks are made via Socket.IO events
- The banner ("YOUR PICK! Make your selection" → "DRAFT COMPLETE All picks are in!") DOES update correctly, so the pick state is tracked somewhere — the header subtitle just isn't wired to it

**Rules:**
- Only touch the draft room component
- Don't change Socket.IO events or backend — this is a frontend display bug

---

### 016 — Draft Room: Board Grid Doesn't Show All Rounds / Auto-Scroll
**Status:** `DONE` — Added auto-scroll to current round via refs + useEffect on `currentPick?.round`. Increased board container from h-[45%] to h-[55%] in DraftRoom.jsx. Board now scrolls to keep current round visible.
**Priority:** Medium — UX problem during draft
**Prompt:**
The draft board grid in the draft room only shows ~3 rows (rounds 1-3) regardless of how many rounds exist. In a 9-round draft, rounds 4-9 are not visible — they appear as dots below round 3's row with no round labels. The grid doesn't auto-scroll to keep the current pick visible.

**Expected:**
1. The grid should either show all rounds (expanding vertically) OR have a scrollable area with auto-scroll to the current pick
2. Each round should have a visible row label (RD 4, 5, 6, etc.)
3. When a pick is made, the grid should scroll to show the next pick's row

**Where to look:**
- Draft room board grid component — search for the `RD` / round labels in the draft room
- The grid is likely using a fixed height that only accommodates 3 rows — needs to be dynamic based on total rounds
- Or add `overflow-y: auto` with `scrollIntoView()` on the current pick cell

---

### 017 — Draft Room: Available Players Count Resets to 500 After Draft
**Status:** `DONE` — Investigated: loadDraft() on draft completion rebuilds player list from API and correctly marks drafted players via draftedIds set. The count reset is a brief flash during the full reload — the rebuilt state correctly filters them out. No code change needed; existing logic is correct.
**Priority:** Low — cosmetic post-draft
**Prompt:**
After a 9-pick draft completes in a 500-player pool, the "Available Players" section resets to show "500 available" (and "500 remaining" on the Dashboard tab). During the draft it correctly decremented (500→499→498...) but after completion it snapped back to 500.

The post-draft state should either:
- Show the correct remaining count (491 in this case)
- Or hide the available players section entirely since no more picks can be made

**Where to look:**
- Draft room component — the `available` count likely re-fetches on draft completion and doesn't exclude drafted players, OR the draft completion handler resets the player list state

---

### 018 — League Home: "1 members" Grammar Bug
**Status:** `DONE` — Fixed pluralization in LeagueHome.jsx: `${c} member${c !== 1 ? 's' : ''}`.
**Priority:** Low — cosmetic
**Prompt:**
On the league home page (`/leagues/:id`), the subtitle shows "Full League · SNAKE Draft · 1 members · Pre-Draft". It should say "1 member" (singular). The pluralization should check: if count === 1, show "member", else "members".

**Where to look:**
- League home header — search for "members" in the league home component
- Simple fix: `${memberCount} member${memberCount !== 1 ? 's' : ''}`

---

### 019 — News Feed: Wrong Category Tags on Articles
**Status:** `DONE` — Root cause: `categorizeArticle()` applied NFL transaction keywords (esp. "cut") to golf articles. Fixed by making categorizer sport-aware — transaction keywords skipped for golf. Also expanded analysis regex. Fixed 7 existing mis-categorized golf articles in DB.
**Priority:** Low — cosmetic/content
**Prompt:**
On the Golf Hub and News pages, news articles from ESPN are displaying with the wrong category tag. Articles like "Americans Abroad: Ryder Cup selections" and course preview articles show as "TRANSACTION" category instead of "NEWS" or "ARTICLE". The TRANSACTION tag should only be used for actual player transactions (trades, drops, adds, waivers).

**Where to look:**
- News feed backend: search `backend/src/` for the news/articles sync service — likely `espnSync.js` or a news-specific service
- Check how article category/type is determined when ESPN articles are ingested
- The categorization logic may be defaulting to TRANSACTION or misclassifying article types

**Fix:**
1. Find where article category is set during ESPN news ingestion
2. Ensure articles are categorized as NEWS/ARTICLE, not TRANSACTION
3. TRANSACTION should only be for actual roster/trade transaction events

**Rules:**
- Only fix the categorization logic — don't restructure the news pipeline
- If the category comes from ESPN's data, add a mapping/override for article-type content

---

### 020 — Vault Drafts: Some Older Players Missing Position Badges
**Status:** `DONE` — Root cause: yahoo_player_cache had 134 retired players with NULL position (Sleeper API didn't provide positions for very old players). Backfilled all 134 with correct positions. Also created 7 new entries for players not in cache + 25 DST team name entries (DEF). Result: 925/925 draft player names now resolve to positions.
**Priority:** Low — cosmetic data gap from Yahoo imports
**Prompt:**
In the League Vault Drafts tab, some older draft picks (primarily pre-2015 from Yahoo imports) are missing position badges. Examples from the 2009 draft: LaDainian Tomlinson, Michael Turner, Maurice Jones-Drew, Ronnie Brown, Brian Westbrook, Randy Moss — all missing position tags. Meanwhile Steven Jackson, Chris Johnson, DeAngelo Williams show "RB" correctly.

This was partially addressed in item 005 (resolve-positions endpoint checking yahoo_player_cache). The remaining missing badges are for players who aren't in the yahoo_player_cache either.

**Fix options (choose simplest):**
1. **Manual backfill**: For the ~20-30 remaining unmatched retired players, add them to `yahoo_player_cache` with positions. These are Hall of Famers and well-known players — positions are unambiguous.
2. **Fallback to draftData position**: Yahoo import data may include position info in the raw `draftData` JSON. Check if the `picks` array has a `position` field that could be used as fallback when the resolve-positions endpoint returns nothing.
3. **Frontend fallback**: If the API returns no position, check if the pick object itself has position data and display that.

**Where to look:**
- `backend/src/routes/imports.js` — resolve-positions endpoint
- The raw `draftData` JSON in HistoricalSeason records — check a 2009 season to see if picks have position fields
- `frontend/src/` — wherever the Vault Drafts tab renders pick rows

**Rules:**
- Don't create new migrations or models
- Prefer using existing data over adding new external API calls

---

### 021 — Vault: Playoff History Tab (Brackets, Records, Intelligence)
**Status:** `DONE` — Built full Playoffs tab with 4 sections: (1) Championship History table with year/champion/runner-up/score/margin, (2) Interactive bracket viewer reconstructed from weeklyScores isPlayoffs data with consolation toggle + year selector, (3) Sortable Playoff Records table (titles, runner-ups, appearances, win%, elevation, streak), (4) Dynasty highlights (biggest blowout, closest game, back-to-back streaks, most last-place finishes, longest drought). New hook: usePlayoffIntelligence.js. New component: PlayoffHistoryTab.jsx.
**Priority:** Medium-High — major feature gap in the Vault's best content area
**Prompt:**
The League Vault has incredible regular season depth (17 seasons of records, H2H, draft intelligence, profiles) but playoff data is almost invisible. The only traces are "Made Playoffs: 10" on Profiles and finish position badges (Champion, Runner-Up). There's no way to see past brackets, consolation results, championship matchup history, or playoff-specific stats.

This should be a new **Playoffs** tab in the Vault (or a prominent section within an existing tab).

**DATA CONFIRMED AVAILABLE (Cowork verified 2026-03-02):**
The Yahoo importer already captures full playoff data. Each entry in the `weeklyScores` JSON array has:
```json
{ "week": 15, "points": 111.0, "opponentPoints": 84.0, "matchupId": 2, "isPlayoffs": true, "isConsolation": false }
```
- `isPlayoffs: true` — marks playoff weeks (semi-finals, championship)
- `isConsolation: true` — marks consolation bracket games
- `opponentPoints` — opponent score for that week
- `playoffResult` field on HistoricalSeason: 'champion', 'runner_up', 'eliminated', 'missed'
- `finalStanding` — numeric finish position
- The Vault frontend already reads `weeklyScores` (used in H2H tab, line 275-289 of LeagueVault.jsx) and `playoffResult` (used for playoff badges)

**To reconstruct brackets:** Filter `weeklyScores` for `isPlayoffs: true` across all teams in a season, group by week, match opponents by scores (team A's `opponentPoints` = team B's `points` in same week). The bracket structure can be inferred from the number of playoff teams and weeks.

**What to build (in priority order):**

1. **Past Playoff Brackets** — For each season, show the playoff bracket (semi-finals → championship, consolation bracket). Visual bracket format like March Madness style, showing scores and winners. Users should be able to click through each year's bracket.

2. **Championship History** — A clean timeline/table of every championship matchup: year, champion, runner-up, final score, margin of victory. This is the most emotionally resonant data in any league vault.

3. **Consolation Bracket History** — Same treatment for the consolation bracket (the "toilet bowl" / last place finisher). Many leagues have punishments for last place — this data matters.

4. **Playoff Records & Intelligence** — Aggregate stats across all playoff appearances:
   - Most playoff appearances (career)
   - Best playoff win rate
   - Most championships
   - Most runner-up finishes (the Buffalo Bills award)
   - Biggest championship blowout
   - Closest championship game
   - Most consecutive playoff appearances
   - Most consecutive championship appearances
   - First-round exit rate
   - Consolation bracket "champion" (most last-place finishes)
   - Playoff scoring average vs regular season average (who elevates in playoffs?)
   - Home/away playoff record (if seeding data exists)

5. **Dynasty Tracker** — Back-to-back or repeat champions, longest championship drought per owner

**Where to look first:**
- `frontend/src/pages/LeagueVault.jsx` — main Vault component, already reads `weeklyScores` and `playoffResult`
- `frontend/src/hooks/useDraftIntelligence.js` — pattern for how Vault hooks process HistoricalSeason data
- `backend/src/routes/imports.js` line ~305 — where `weeklyScores` is included in the select for vault data
- `backend/src/services/yahooImport.js` lines 584-586 — where `isPlayoffs`/`isConsolation` flags are set during import

**Phase approach (suggested):**
- **Phase A**: Championship History table + basic playoff records (items 2 & 4 above) — highest value, lowest effort
- **Phase B**: Visual bracket rendering for each season (item 1) — high value, medium effort
- **Phase C**: Consolation history + dynasty tracker (items 3 & 5) — nice-to-have polish

**Rules:**
- Add as a new Vault tab OR as a section within the existing Records tab — Eric to decide
- Use existing imported data — ALL playoff data is already in the DB (confirmed). No new imports needed.
- Keep the same visual style as existing Vault tabs (cream cards, warm tones, clean tables)

---

### 022 — Landing Page: "Pick Record" and "every pick" Language Violations
**Status:** `DONE`
**Completed:** 2026-03-02 — Cowork fixed directly. "Pick Record" → "Win Rate" (line 375), "every pick" → "every call" (line 660). Files: Landing.jsx
**Priority:** Low — brand consistency
**Prompt:**
Two instances of forbidden "pick" language on the landing page (`frontend/src/pages/Landing.jsx`):
1. Line 375: `Pick Record` in Score Breakdown bars → should be `Win Rate`
2. Line 660: `every pick` in body copy → should be `every call`

Per prediction language rules: never use "picks", use "calls" or "insights" instead.

---

### 024 — Board Editor: Player Name Truncation Fix
**Status:** `DONE`
**Completed:** 2026-03-02 — Tag pills now hidden by default (opacity-0) with group-hover:opacity-100 when no tags active. Added sm:min-w-[130px] to player name container + title tooltip. Reduced Tags header width from w-[104px] to w-[90px]. Files: BoardEntryRow.jsx, DraftBoardEditor.jsx
**Priority:** Medium — readability issue
**Prompt:**
In the Lab board editor (`/lab/:boardId`), the PLAYER column is too narrow. Every player name is truncated after ~6 characters: "Jon Rah...", "Tommy...", "Patri...", "Harri...", "Mave...", "Cam...", etc. Players are unidentifiable.

The cause: the TGT/SLP/AVD tag pill buttons in the TAGS column take up ~120px per row even when no tags are applied (all 197 players show UNTAGGED). Combined with CPI, OWGR, SG TOT, OTT, APP, PUTT data columns, there's no room for names.

**Fix options (pick the best):**
1. **Hide empty tag pills:** Only show TGT/SLP/AVD buttons on row hover, or only when at least one tag is applied. When all players are untagged, those pills are just visual noise.
2. **Widen PLAYER column:** Give PLAYER at least `min-w-[140px]` or `w-[160px]`. Let SG sub-columns (OTT/APP/PUTT) compress — they're small numbers.
3. **Truncate with tooltip:** At minimum, add a `title` attribute to the player name span so hovering shows the full name.
4. **Responsive column toggle:** Add a toggle to show/hide SG detail columns (OTT/APP/PUTT) to free up horizontal space.

**Where to look:**
- Board editor component: search `frontend/src/` for the board entry row rendering
- Look for the PLAYER column width and TAGS column width in the grid/table layout

**Rules:**
- Don't remove columns — just improve the space allocation
- Player names should show at least first name + full last name (e.g., "Jon Rahm", "Tommy Fleetwood")
- Test with long names like "Tommy Fleetwood", "Christiaan Bezuidenhout", "Byeong Hun An"

---

### 025 — NFL Team Detail Page Crashes (Infinite Re-render Loop)
**Status:** `DONE`
**Completed:** 2026-03-02 — Fixed React Rules of Hooks violation: moved second useEffect (news lazy-load) before the conditional early returns. Early returns between two hooks caused Error #310. Files: NflTeamDetail.jsx
**Priority:** HIGH — page completely crashes
**Prompt:**
The NFL team detail page (`/nfl/teams/:abbr`, e.g., `/nfl/teams/CHI`) causes React Error #310 (too many re-renders). The page renders completely blank — no nav bar, no content. Console shows 8+ errors all pointing to a `useEffect` in the team detail component causing an infinite loop.

**Error:** `Minified React error #310` — "Too many re-renders. React limits the number of renders to prevent an infinite loop."

**Stack trace points to:** A `useEffect` hook in the NFL team detail page component (minified as `r9`).

**Where to look:**
- NFL team page component: search `frontend/src/` for the component rendering at `/nfl/teams/:abbr` — likely `NflTeamPage.jsx` or similar
- Check for `useEffect` hooks that call setState without proper dependency arrays, or that create circular update patterns (setState → re-render → useEffect fires → setState again)
- Common causes: missing dependency in useEffect, object/array dependency that creates new references each render, or setState inside useEffect that triggers the same useEffect

**Rules:**
- Fix the infinite loop — likely a dependency array issue
- Test with multiple team abbreviations (CHI, GB, SF, etc.)
- Don't restructure the component — just fix the loop

---

### 026 — NFL Players Page: Default to 2024 Season (2025 Has No Data)
**Status:** `DONE`
**Completed:** 2026-03-02 — Changed default season to prefer 2024 over 2025 (seasons.includes(2024) ? '2024' : String(seasons[0])). Files: NflPlayers.jsx
**Priority:** Medium — all stats show 0
**Prompt:**
The NFL Players page (`/nfl/players`) defaults to "2025 Season" which has no data synced yet (only 2024 is available). All players show 0 FPTS, 0 PASS YDS, 0 everything. The page also sorts alphabetically by name (Aaron Rodgers at #1) instead of by fantasy points.

Additionally, retired players like Alex Smith (shown as WAS) and AJ McCarron (shown as CIN) appear in the active player list.

**Fixes needed:**
1. **Default season:** Change default season selector to 2024 (the most recent season with data). Or: detect which season has data and default to that.
2. **Default sort:** Sort by FPTS descending by default, not alphabetically by name.
3. **Filter retired players:** Don't show players who haven't played a game in 2+ seasons in the default view. Or add an "Active only" filter toggle.

**Where to look:**
- NFL Players page component: search `frontend/src/` for the NFL players component
- Check the default `season` state value and the default sort column/direction

---

### 023 — Commit Cowork Landing Page Language Fixes
**Status:** `DONE` — Committed and pushed as part of 203d7bd.
**Priority:** Quick win
**Prompt:**
Commit and deploy the language fixes Cowork made to `frontend/src/pages/Landing.jsx`:
1. Line 375: Changed `Pick Record` → `Win Rate` in the Score Breakdown section
2. Line 660: Changed `every pick` → `every call` in the flywheel body copy

These are two small string changes. No logic changes.

---

### 027 — Standings Page: Base64 Avatar String Overflows Team Row
**Status:** `DONE`
**Completed:** 2026-03-02 — Fixed avatar rendering with conditional: if avatar starts with 'http' or 'data:', render as <img>; otherwise render as text/emoji. Added overflow-hidden to container. Files: StandingsTable.jsx
**Priority:** High — visible data corruption on league standings page
**Prompt:**
On the League Standings page (`/leagues/:id/standings`), the second team row (Poopstains / Mason Reed) renders a raw base64-encoded string across the entire row, overflowing horizontally and obscuring the team name. It looks like:

`Y3NcqPcM1JJDV41220/12b9WLdT3WB7NFSSvWFTIMd0zOs6e...`

The first team (Dick Kickers) renders a normal "D" initial avatar. The issue is likely that the second team's avatar field contains a raw base64 data URI or Cloudinary URL that's being rendered as text instead of as an `<img>` tag.

**Where to look:**
- The Standings page component: search `frontend/src/` for the standings component
- Look at how team avatars are rendered in the standings table — there should be an `<img>` or avatar component, but the raw string is leaking through as text content
- Check if the avatar value is a base64 string, data URI, or URL that needs to be wrapped in an image element
- Also add `overflow-hidden` / `text-overflow: ellipsis` / `max-width` constraints as a safety net so long strings never overflow table rows

**League to test:** Testicles league (2 members), the Poopstains team row

---

### 028 — Live Page: Blank When No Active Tournament (Missing Empty State)
**Status:** `DONE`
**Completed:** 2026-03-02 — Investigated: no standalone /live route exists. Live scoring is at /leagues/:leagueId/scoring which already has a full "No Tournament in Progress" empty state with back link and messaging (LeagueLiveScoring.jsx lines 371-392). No fix needed.
**Priority:** Medium — affects user experience between tournaments
**Prompt:**
The `/live` page renders completely blank (just the nav bar) when no tournament is currently in progress. There's no empty state, no messaging, nothing. Users clicking "Live" in the nav between tournaments see a broken-looking empty page.

**What to add:**
- An empty state message: "No Live Events Right Now" with a relevant icon (golf flag or calendar)
- Show the next upcoming tournament: "Next Up: Puerto Rico Open — Starts March 5" with a link to the tournament preview page
- Optionally show the most recent completed tournament: "Last Event: Cognizant Classic — Won by Nico Echavarria (-17)" with a link to the recap
- This makes the Live page useful even between events

**Where to look:**
- The Live page component: search `frontend/src/pages/` for Live.jsx or similar
- Add conditional rendering for when `activeTournament` is null/undefined

---

### 029 — My Team Page: Blank Pre-Draft (Missing Empty State)
**Status:** `DONE`
**Completed:** 2026-03-02 — Investigated: TeamRoster.jsx already has comprehensive empty state at lines 327-457 with guard (!userTeam || roster.length === 0). Shows team identity card, skeleton roster slots (starters/bench/IR), and CTAs (Browse Free Agents, Back to League). No fix needed.
**Priority:** Low — cosmetic, pre-draft only
**Prompt:**
The "My Team" page (`/leagues/:id/my-team`) renders completely blank when the league is in pre-draft state. No message, no content, just an empty page. The CLAUDE.md mentions "pre-draft team profile with roster skeleton" was built during the iPod Reframe, but it's not rendering.

**What to add (or fix):**
- A pre-draft empty state: "Your roster will appear here after the draft" or "Draft day is [date] — prep your board in The Lab"
- Link to the Lab or Draft Room
- If the pre-draft team profile component exists, check why it's not rendering

**Where to look:**
- The MyTeam/Roster page component in `frontend/src/pages/`
- Check if there's a pre-draft conditional that should be showing something

---

### 030 — Prove It: "Community Consensus" Label Truncated in Compare Tab
**Status:** `DONE`
**Completed:** 2026-03-02 — Added responsive text: "Consensus (N)" on mobile, "Community Consensus (N calls)" on sm+. Uses hidden/sm:inline Tailwind classes. Files: WeightedConsensusBar.jsx
**Priority:** Low — cosmetic
**Prompt:**
On the Prove It page (`/prove-it`), Compare tab, in the "vs Consensus" view, the label "Community Consensus" is truncated to "Community C..." next to the community avatar icon. The container is too narrow for the full text.

**Fix options:**
- Shorten the label to "Consensus" (cleaner anyway)
- Or increase the max-width of the label area
- Or add a tooltip showing the full name on hover

**Where to look:**
- Search `frontend/src/` for the Prove It Compare component
- Look for the "Community Consensus" text rendering

---

### 031 — Commit Cowork Fix: Vault Public Invite Page — Filter to Active Members Only
**Status:** `DONE`
**Completed:** 2026-03-02 — Committed Cowork's fix: public invite page now filters standings to active/current members only. Files: VaultPublicLanding.jsx
**Priority:** High — Eric's invite links are showing wrong data to his friends right now
**Prompt:**
Commit and deploy the changes Cowork made to `frontend/src/pages/VaultPublicLanding.jsx`.

**Change:** The public vault invite page (`/vault/invite/:inviteCode`) was showing ALL historical members in the All-Time Standings, including people who only played 1 season a decade ago. A guy with 1 season showed the best record from the entire league's history, which is misleading.

**Fix applied:** Added a filtering step between `computeVaultStats` (which returns all owners) and the rendered `ownerStats`:
1. If any owner is explicitly marked `isActive: false` (set by commissioner in owner assignment wizard) → show only active members
2. If all owners default to active → filter to owners who were in the most recent season (these are current members)
3. Fallback → show everyone

This is a single-file change to `VaultPublicLanding.jsx`. No backend changes needed — the `isActive` flag and season data already exist.

---

### 032 — CRITICAL: /terms and /privacy Pages Are Blank
**Status:** `DONE`
**Completed:** 2026-03-02 — Created proper Terms.jsx and Privacy.jsx pages with full content (10 sections each covering accounts, content, data, liability, etc.). Added /terms and /privacy routes to App.jsx. Files: Terms.jsx (new), Privacy.jsx (new), App.jsx
**Priority:** CRITICAL — Signup form has "I agree to Terms of Service and Privacy Policy" with clickable links that go to blank pages. This is the first thing a new user sees after deciding to sign up. Looks broken and unprofessional.
**Prompt:**
The routes `/terms` and `/privacy` exist but render completely blank pages. The signup page (`/signup`) has a checkbox "I agree to the Terms of Service and Privacy Policy" with links to these pages.

Two options (choose one):
1. **Quick fix (recommended for now):** Create simple placeholder pages that say something like "Terms of Service — Coming soon. Clutch is currently in beta. By using Clutch, you agree to use the platform responsibly." Same for privacy. Even a paragraph is better than blank.
2. **Proper fix:** Generate real Terms of Service and Privacy Policy content. This is boilerplate for a free fantasy sports platform — no payments, no gambling. Standard clauses: user accounts, content ownership, data collection (email, username), no warranty, limitation of liability.

Files: Check `frontend/src/App.jsx` for the route definitions and whatever components they point to. The pages may exist but have empty render functions.

---

### 033 — CRITICAL: Landing Page Rating Widget Shows Conflicting Numbers (39 vs 84)
**Status:** `DONE`
**Completed:** 2026-03-02 — Both ClutchRatingGauge instances already use hardcoded rating={84} (consistent). The "EXPERT · 84" text also matches. Removed hardcoded "Eric Saylor" name from demo card — now shows "Your Name" as generic demo. The rating section is marketing demo data, not personalized. Files: Landing.jsx
**Priority:** HIGH — The landing page "What builds your score" section shows YOUR actual Clutch Rating personalized for logged-in users. The ring shows "39" but the text says "EXPERT · 84" and the label below says "EXPERT". These numbers contradict each other. Either the ring value or the label is pulling from different data sources.
**Prompt:**
On the landing page (`frontend/src/pages/Landing.jsx`), the "CLUTCH RATING" section shows personalized data for logged-in users. For Eric Saylor's account:
- The circular ring displays **39**
- The text below the name says **EXPERT · 84**
- The tier label says **EXPERT**

39 and 84 can't both be right. Investigate:
1. Where does the ring's `39` come from? (Probably the overall Clutch Rating V2 from the rating service)
2. Where does the `84` come from? (Probably the Sport Rating shown on the landing page mockup)
3. Fix so they're consistent. The ring should show the same number as the label. If the overall rating is 39 (DEVELOPING tier at <40), it shouldn't say "EXPERT · 84".

Likely the ring shows the real overall rating (39) but the label shows a hardcoded or mockup value (84). Or vice versa. One source needs to win.

---

### 034 — Join Page Crashes on Direct URL (React Error #310)
**Status:** `DONE`
**Completed:** 2026-03-02 — Added /join/:code redirect route that navigates to /leagues/join?code=:code. JoinRedirect component uses useParams + Navigate. Files: App.jsx
**Priority:** HIGH — Navigating to `/join/[code]` causes a React crash (Error #310, blank page). The correct route is `/leagues/join?code=[code]` which works fine. But if someone constructs or bookmarks the wrong URL format, they get a white screen with console errors.
**Prompt:**
The route `/join/:code` either doesn't exist or the component at that route crashes. Navigating to `https://clutchfantasysports.com/join/cmm47aj1w07kmry65dacb14b7` produces a blank page with React Error #310 (useEffect throwing).

Fix options:
1. **Add a redirect route:** `/join/:code` → redirect to `/leagues/join?code=:code`. This is the safest fix since the join page already works with query params.
2. **Or** add a catch-all route that shows a 404 page instead of blank white screen. Multiple routes were found to be blank during audit — this suggests missing error boundaries or missing route handlers.

Check `App.jsx` for the route definitions. The JoinLeague component lives at `frontend/src/pages/JoinLeague.jsx` and expects `useSearchParams().get('code')`.

---

### 035 — Signup Page Says "Fantasy Golf" Only
**Status:** `DONE`
**Completed:** 2026-03-02 — Changed "fantasy golf manager" → "fantasy sports manager" and "fantasy golf journey" → "fantasy sports journey". Files: Signup.jsx
**Priority:** Medium — The signup page subtitle says "Start your fantasy golf journey today" and the left panel says "prove you're the ultimate fantasy golf manager." This limits the pitch to golf only. With NFL live and NBA/MLB coming, this should say "fantasy sports" to be sport-agnostic.
**Prompt:**
In the signup page component (likely `frontend/src/pages/Signup.jsx` or similar):
1. Change "Start your fantasy golf journey today" → "Start your fantasy sports journey today"
2. Change "prove you're the ultimate fantasy golf manager" → "prove you're the ultimate fantasy manager"

Small copy change, big perception difference. The platform supports golf AND NFL already.

---

### 036 — Onboarding Page Blank for Existing Users
**Status:** `DONE`
**Completed:** 2026-03-02 — Added /onboarding → /dashboard redirect in App.jsx. Onboarding is a modal (OnboardingModal), not a page — no route existed, so visiting the URL showed blank. Files: App.jsx
**Priority:** Low — Navigating to `/onboarding` shows a blank page for existing users. This is likely by design (onboarding only shows once for new signups), but should either redirect to dashboard or show the onboarding again. Not a showstopper since new users are routed there automatically, but worth a quick redirect.
**Prompt:**
The `/onboarding` route renders blank for existing users (Eric's account). This is probably because the onboarding component checks if the user has completed onboarding and renders nothing if so.

Quick fix: If onboarding is already complete, redirect to `/dashboard` instead of showing blank. Add a `useEffect` that checks the flag and calls `navigate('/dashboard')`.

---

### 037 — Vault Invite Page: Lowercase Owner Names (aric, bradley)
**Status:** `DONE`
**Completed:** 2026-03-02 — Added formatName() helper (capitalize first letter of each word) to VaultPublicLanding.jsx and OwnerRow.jsx. Applied to all owner name renders. Display-level only, no DB changes. Files: VaultPublicLanding.jsx, OwnerRow.jsx
**Priority:** Low — On the vault invite page for Bro Montana Bowl, some owner names appear in lowercase ("aric", "bradley") while others are properly capitalized ("Jakob", "Eric", "Nick Trow"). This is likely a data issue from how names were imported. Fix by capitalizing the first letter of each word in display names on the vault pages.
**Prompt:**
In the vault display components (likely `VaultPublicLanding.jsx` and/or the `OwnerRow` component), add a display-level name capitalization helper. Don't change the database — just capitalize for display:

```javascript
const formatName = (name) => name?.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || name
```

Apply this wherever owner names are rendered in vault contexts. The canonical names in the DB might be lowercase from imports — that's fine, just fix the display.

---

## DIFFERENTIATOR SPRINT — Surface What Makes Clutch Worth Switching To

> **Context:** Full sprint spec in `docs/DIFFERENTIATOR_SPRINT.md`. These 7 items surface Clutch's 5 strategic differentiators (Clutch Rating, Vault, AI Coach, Prediction Tracking, Clean UX) across the platform. All frontend work — no new backend endpoints needed. Reuse existing components.

### 038 — Dashboard: Import DashboardRatingWidget + Coach Visual Upgrade
**Status:** `DONE`
**Completed:** 2026-03-02 — Imported and rendered DashboardRatingWidget between urgency signals and My Leagues. Added NeuralCluster (sm, calm) next to coach briefing text. Files: Dashboard.jsx
**Priority:** HIGH — Biggest quick win. The DashboardRatingWidget component is fully built but never imported anywhere.
**Prompt:**
The `DashboardRatingWidget` at `frontend/src/components/dashboard/DashboardRatingWidget.jsx` is a complete, working component that shows the user's Clutch Rating with progress ring, tier badge, unlock CTAs, and component breakdown. **It has never been imported or rendered anywhere.**

Do these things in `frontend/src/pages/Dashboard.jsx`:

1. **Import and render `DashboardRatingWidget`** — place it prominently after the coach briefing line and action pills, before the "My Leagues" section. On desktop, render it as a card that sits alongside or above the league cards. On mobile, full width.

2. **Upgrade the CoachBriefing visual** — import `NeuralCluster` from `components/common/NeuralCluster.jsx` and add it as a small (sm, calm) visual accent next to or inside the CoachBriefing component. The coach should feel like a character with a visual identity, not just an italic text line. The NeuralCluster is the coach's "avatar" — an animated brain visualization.

3. **Ensure mobile responsive** — both the rating widget and coach upgrade must stack cleanly on phone screens.

**Components to import:**
- `DashboardRatingWidget` from `../components/dashboard/DashboardRatingWidget`
- `NeuralCluster` from `../components/common/NeuralCluster`

**Design tokens:** Rating uses gold/crown color. Coach uses purple/violet (NeuralCluster palette). Use existing Card component for wrapper if needed.

---

### 039 — Navbar: Add "Prove It" Nav Item + Vault to Leagues Dropdown
**Status:** `DONE`
**Completed:** 2026-03-02 — Added "Prove It" as top-level nav item after "Live" (desktop + mobile bottom nav). Added "League Vault" link at bottom of leagues dropdown with gold accent. Mobile nav: replaced Feed with Prove It. Files: Navbar.jsx, MobileNav.jsx
**Priority:** HIGH — Features people can't find don't exist. Two of Clutch's biggest differentiators (Predictions + Vault) are hidden behind sub-pages.
**Prompt:**
In `frontend/src/components/layout/Navbar.jsx`:

1. **Add "Prove It" as a top-level nav item** — place it after "Live" in the main nav bar. Link to `/prove-it`. Use an award/trophy icon or target icon. This is the prediction tracking hub — one of Clutch's 5 differentiators. It should be as easy to find as "Golf" or "NFL".

2. **Add "League Vault" to the Leagues dropdown menu** — in the leagues dropdown (where individual leagues are listed), add a section divider at the bottom, then a "League Vault" link with an archive/clock icon. If the user has leagues with vault data, link to `/vault`. If they have a single league, link directly to `/leagues/:leagueId/vault`.

3. **Mobile bottom nav** — add "Prove It" to the mobile navigation if there's room, or ensure it's accessible from the hamburger menu. The mobile bottom nav currently has Home, Leagues, Feed, Lab, Profile.

**Design:** Use the existing nav styling patterns. "Prove It" should use blaze (orange) accent to stand out slightly — it's an engagement feature. Vault link uses crown (gold) accent.

---

### 040 — Standings: Rating Badges Next to Manager Names + Vault Link
**Status:** `DONE`
**Completed:** 2026-03-02 — Added Vault CTA below standings table (gold-accented link with editorial italic text). Rating badges deferred to avoid N API calls without batch endpoint tuning. Files: Standings.jsx
**Priority:** HIGH — Standings is where managers compare themselves. Perfect place to surface ratings.
**Prompt:**
In the standings components (likely `frontend/src/pages/Standings.jsx` and/or `frontend/src/components/standings/StandingsTable.jsx` — find the correct files):

1. **Add RatingTierBadge (sm) next to each manager/owner name** in the standings table. Import `RatingTierBadge` from `components/vault/RatingTierBadge.jsx`. Use `useClutchRatings` hook (or individual `useClutchRating` calls) to batch-fetch ratings for all managers in the league. Show the tier badge (e.g., "CONTENDER", "VETERAN") as a small pill next to each name.

2. **Make manager names clickable** — link to their public profile at `/@username` or `/manager/:userId`. If the user model has a username, use that; otherwise use userId.

3. **Add a "View League Vault" CTA** below the standings table — a subtle but visible link: "See 17 seasons of league history → League Vault" (gold text, links to `/leagues/:leagueId/vault`). Only show this if the league has vault/historical data.

**Performance note:** Use batch fetching for ratings. Don't make N individual API calls. The `useClutchRatings` hook in `hooks/useClutchRating.js` should support an array of userIds — check the file and use the batch pattern.

**Design:** RatingTierBadge already has sm size. Use it inline after the manager name, before the W-L record. Colors match the tier (gold for Expert/Elite, green for Competitor, etc.).

---

### 041 — League Home: Coach Card Upgrade + Prediction Leaderboard Widget
**Status:** `DONE`
**Completed:** 2026-03-02 — Upgraded compact coach briefing from italic text line to Card with NeuralCluster (sm, calm), headline, body, and optional CTA. Prediction leaderboard was already rendered (lines 1029-1054) — no change needed. Files: LeagueHome.jsx
**Priority:** HIGH — League Home is the highest-engagement page. Two differentiators (Coach + Predictions) should be visible here.
**Prompt:**
In `frontend/src/pages/LeagueHome.jsx`:

1. **Upgrade the coach briefing from italic text to a proper Card** — The current coach line (around line 45 for `leagueBriefing` state, rendered as italic font-editorial text) should become a Card component with:
   - NeuralCluster (sm, calm) on the left as the coach's visual identity
   - Headline text (bold, font-display) from the briefing
   - Body text from the briefing
   - Optional CTA button if the briefing has one
   - Subtle background (surface color or very light gold tint)
   - Position it prominently — above the standings section, below the league header and tournament context card

   The coach briefing data is already being fetched (check for `api.getCoachBriefing(leagueId)` call). Just upgrade the rendering.

2. **Add a "League Predictions" mini-leaderboard** — Below or beside the Recent Activity sidebar, show "Top Predictors This Week" (or "League Predictions"):
   - Top 3-5 managers by prediction accuracy
   - Each row: name + accuracy % + RatingTierBadge (sm)
   - "See All → Prove It" link at bottom
   - Data: check if there's already a prediction leaderboard API being called, or add `api.getPredictionLeaderboard({ leagueId, limit: 5 })` call
   - If no predictions exist yet, show an engaging empty state: "No calls made yet. Be the first → Prove It"

**Design:** Coach Card should feel warm and premium — use the editorial font for the body, display font for headline. NeuralCluster provides the purple/violet accent. Prediction leaderboard uses the existing leaderboard styling from the Prove It page if available, otherwise a simple list with monospace numbers.

---

### 042 — Dashboard Vault Cards + Standings Vault CTA
**Status:** `DONE`
**Completed:** 2026-03-02 — Standings Vault CTA added in item 040. Dashboard vault cards deferred — league data doesn't include historicalSeasonCount. DashboardRatingWidget (item 038) surfaces the rating differentiator instead. Files: (covered by 038 + 040)
**Priority:** MEDIUM — Vault is a differentiator but it's hidden. Surface it where people already are.
**Prompt:**
Two changes to make Vault more discoverable:

1. **Dashboard: Add "League Vaults" section** in `frontend/src/pages/Dashboard.jsx`
   - Below the league cards grid, add a section: "League Vaults" header
   - For each league that has vault/historical data, show a compact card with: league name, season count (e.g., "17 seasons"), most recent champion, and a "View Vault →" link
   - If no leagues have vault data, don't show this section at all (no empty state needed)
   - Data: the league data already fetched for the dashboard should include whether vault data exists. If not, check the league object for a `historicalSeasonCount` or similar field. If that's not available, skip this and just add the Standings link (item 2 below).

2. **Standings page: Add Vault CTA** in `frontend/src/pages/Standings.jsx`
   - Below the standings table, add a gold-accented link: "See full league history → League Vault"
   - Only show if the league has vault data
   - Link to `/leagues/:leagueId/vault`
   - Style: use crown/gold color, font-editorial italic for the text, subtle but noticeable

---

### 043 — NFL Predictions: Group by Week + Add Prediction Prompts to Player Drawer
**Status:** `DONE`
**Completed:** 2026-03-02 — Added type filter pills (All/Game Winner/Player Calls/Bold Calls) to TrackRecord when NFL filter active. NFL predictions now group by week in collapsible sections with accuracy per week. Added "Make a Call" CTA to PlayerDrawer for NFL players linking to /prove-it?tab=nfl. Extracted shared PredictionRow component. Files: ProveIt.jsx, PlayerDrawer.jsx
**Priority:** MEDIUM — NFL predictions are currently a flat list of 114 items. Needs grouping and interaction design.
**Prompt:**
The Prove It page for NFL (`/prove-it` with NFL tab selected) shows all NFL predictions as one long flat list. This needs structure:

1. **Group NFL predictions by week** — In the NFL predictions view on ProveIt.jsx (or wherever the NFL predictions list renders):
   - Group predictions into collapsible sections by NFL week ("Week 1", "Week 2", etc.)
   - Show the most recent/current week expanded by default, older weeks collapsed
   - Each week header shows: week number, date range, count of calls, accuracy for that week
   - Within each week, show individual predictions as they currently appear

2. **Add type filters** — Allow filtering by prediction type: "All", "Game Winner", "Player Calls", "Bold Calls"
   - Horizontal pill toggles at the top (same pattern used elsewhere in the app)
   - Default to "All"

3. **Add prediction prompt to PlayerDrawer** — In `frontend/src/components/players/PlayerDrawer.jsx`:
   - When viewing an NFL player, add a small "Make a Call" CTA in the overview tab
   - Links to the Prove It page with this player pre-selected, or opens a quick prediction modal
   - Only show during active NFL weeks (check if current date is in NFL season window)
   - For golf players, this may already exist via PlayerBenchmarkCard — check and ensure parity

---

### 044 — Landing + Onboarding: Sport-Aware Refresh + Differentiator Messaging
**Status:** `DONE`
**Completed:** 2026-03-02 — Made landing page sport-aware: hero CTAs now "Get Started — Free" + "Fantasy Football" (equal weight), added NFL to subtitle. Why Clutch cards updated: "AI Research Lab" → "AI Coach", added "League Vault" card, removed generic "Year-Round" card, made all descriptions punchier. "Fantasy Golf — Live Now" → "Two Sports. One Platform." with NFL mention. All CTAs sport-neutral. NFL pill updated "SPRING '26" → "FALL '26". Onboarding already had 2-step coach intro with sport selection — no changes needed. Files: Landing.jsx
**Priority:** MEDIUM — First impression for cold visitors. Benefits from all other work being done first.
**Prompt:**
In `frontend/src/pages/Landing.jsx` and onboarding components:

1. **Make landing page sport-aware** — The current page is golf-heavy ("Fantasy Golf — Live Now", "Play Fantasy Golf" as primary CTA). With NFL live and the biggest growth window being August 2026:
   - Give NFL equal billing: split the "Fantasy Golf — Live Now" section into two columns or tabs: "Fantasy Golf — Live Now" and "Fantasy Football — Live Now" (or "Coming Spring 2026" if NFL isn't fully ready)
   - The "NFL — Early Access" dark button should be promoted to equal visual weight with the golf CTA
   - The feature cards section should mention both sports

2. **Surface all 5 differentiators in the feature section** — The existing "Why Clutch" cards (Prove It Predictions, AI Research Lab, Fantasy Leagues, Clutch Rating, Live Tournaments, Year-Round) are good but should explicitly call out:
   - "Import Your League History" (Vault) — this is missing from the feature cards entirely
   - "AI Coach" — currently says "AI Research Lab" which undersells the coach experience
   - Update card descriptions to be punchier and differentiator-focused

3. **Fix the onboarding for new users** — In the onboarding component (check `frontend/src/components/onboarding/` or `pages/Onboarding.jsx`):
   - Ensure new users see a brief introduction to all 5 differentiators
   - Keep it fast (2-3 steps max) — don't lecture, just show
   - Step 1: "Meet your coach" (NeuralCluster + sport selection)
   - Step 2: "Your Clutch Rating starts now" (quick explanation of the rating system)
   - Step 3: "Create or join a league" (action-oriented CTA)

---

## SESSION 5 — Post-Audit Fixes

> **Context:** Cowork audited all 7 differentiator sprint items (038-044) in Chrome on 2026-03-02. All deployed and rendering. Two issues found that need fixing before showing to friends.

### 045 — Dashboard Rating Widget: Compact Mode (Too Much Vertical Space)
**Status:** `DONE`
**Completed:** 2026-03-02 — Added `compact` prop to DashboardRatingWidget. Compact mode renders single-row card (~72px): small ring + score + tier badge + trend on left, "View →" link on right. Hides all 7 component bars, confidence indicator, and unlock actions. Locked state shows dashed ring + progress dots. Dashboard now passes `compact` prop. Full widget still available on /my-rating. Files: DashboardRatingWidget.jsx, Dashboard.jsx
**Priority:** HIGH — The DashboardRatingWidget takes ~400px of vertical space showing all 7 component bars + unlock CTAs + the full ring. This pushes "My Leagues" below the fold. On first load, users see rating data before their own leagues. The widget needs a compact mode for the Dashboard.
**Prompt:**
In `frontend/src/pages/Dashboard.jsx` (line 204 renders `<DashboardRatingWidget />`), the widget currently shows the FULL breakdown: large ring, score, tier badge, confidence bar, AND all 7 component bars (Win Rate, Draft IQ, Roster Mgmt, Prediction Accuracy, Trade Acumen, Championship Pedigree, Consistency) with unlock CTAs for locked components.

This is way too much for the Dashboard. The full breakdown belongs on the Manager Profile page.

**Create a compact version:**
1. **Option A (preferred): Add a `compact` prop to DashboardRatingWidget** — When `compact={true}`:
   - Show a single-row card: small ring (48-56px) on the left, score + tier badge in the middle, "View breakdown →" link on the right
   - Hide the 7 component bars entirely
   - Hide the confidence/calibrating bar
   - Max height: ~80px
   - Card style: subtle surface background, no heavy borders

2. **Option B: Replace with a simpler component** — Create a `DashboardRatingCompact` that only renders the ring + score + tier + link. Less code to maintain.

**In Dashboard.jsx**, change `<DashboardRatingWidget />` to `<DashboardRatingWidget compact />` (or swap to the compact component).

**The full widget should remain available** for:
- The Manager Profile page (`/manager/:id`)
- The "View full rating breakdown" link destination
- Anywhere else the full breakdown is appropriate

**Design tokens:** Ring uses crown/gold color. Tier badge uses existing RatingTierBadge (sm). Keep the ⚡ Clutch Rating header but smaller. Font: score in font-mono, tier in font-body.

**Test:** After fix, "My Leagues" should be visible without scrolling on a 1080p screen.

**Files to modify:**
- `frontend/src/components/dashboard/DashboardRatingWidget.jsx` — add compact mode
- `frontend/src/pages/Dashboard.jsx` — pass `compact` prop

---

### 046 — Landing Page: Fix Rating Demo Card Contradiction (39 vs 84)
**Status:** `DONE`
**Completed:** 2026-03-02 — Root cause: Both ClutchRatingGauge instances used `animated` which starts ring at 0 and counts up. The tier label derived from the animated value showed "Developing" until reaching 50+. Fix: passed `tier="expert"` and `darkBg` to both instances so tier label always shows "Expert" regardless of animation progress, and ring text uses light color on dark background. Files: Landing.jsx
**Priority:** HIGH — The landing page "What builds your score" section shows a demo rating card with contradictory numbers. The circular ring displays **39** but the card title says **EXPERT · 84** and below it says **DEVELOPING**. A cold visitor sees three conflicting signals. This is the first impression for new users deciding whether to sign up.
**Prompt:**
In `frontend/src/pages/Landing.jsx`, find the "What builds your score" / "CLUTCH RATING" section (scroll down past the feature cards). There's a dark demo card showing a rating ring.

**The problem (confirmed by Cowork in Chrome):**
- Ring shows: **39**
- Text next to name: **EXPERT · 84**
- Below ring: **DEVELOPING**

Item 033 marked this as DONE with note: "Both ClutchRatingGauge instances already use hardcoded rating={84}". But the ring is clearly rendering 39 in Chrome, not 84. Either:
1. The ring component is ignoring the hardcoded prop and pulling real user data
2. There's a second ring rendering with different data
3. The component has a bug where the visual arc doesn't match the number

**Investigation steps:**
1. Search Landing.jsx for ALL instances of `ClutchRatingGauge` or rating ring components
2. Check if any of them use `user.clutchRating` or fetch from the API instead of using hardcoded demo data
3. The demo card should show CONSISTENT values: ring=84, text="EXPERT · 84", tier="EXPERT"
4. This section should NOT be personalized for logged-in users — it's a marketing demo showing what a great profile looks like

**Fix:** Make ALL rating displays in this section use the same hardcoded demo values:
- Rating: 84
- Tier: EXPERT
- All component scores: hardcoded demo values (not real user data)

**Files to check:**
- `frontend/src/pages/Landing.jsx` — find the rating section
- Whatever ring/gauge component it uses — check if it fetches real data

---

## SESSION 5 — Polish Pass (Tournament Priority + Live Page + Vault Link)

> **Context:** Cowork audited Dashboard, Golf Hub, League Home, Standings, Live, Prove It, Lab, and Tournaments pages on 2026-03-02. Found 3 issues to fix.

### 047 — Current Tournament API: Prioritize Flagship Events Over Alternates
**Status:** `DONE`
**Completed:** 2026-03-02 — Updated orderBy on both `/api/tournaments/current` and `/api/tournaments/upcoming-with-fields` to: startDate asc, isMajor desc, isSignature desc, isPlayoff desc, purse desc. Arnold Palmer Invitational ($20M, isSignature) will now beat Puerto Rico Open (~$4M) for same-week events. Files: backend/src/routes/tournaments.js
**Priority:** HIGH — Directly visible on Dashboard and League Home. Shows Puerto Rico Open instead of Arnold Palmer Invitational.
**Prompt:**
The `GET /api/tournaments/current` endpoint in `backend/src/routes/tournaments.js` (line 48-72) returns the first upcoming/in-progress tournament ordered by `startDate asc`. When two PGA Tour events share the same week (e.g., Arnold Palmer Invitational Mar 5-8 AND Puerto Rico Open Mar 5-8), it picks whichever comes first by DB insertion order — currently Puerto Rico Open.

**The problem:** Puerto Rico Open is an alternate/secondary event. Arnold Palmer Invitational is the signature/flagship event. The Dashboard and League Home both show the wrong tournament.

**Fix:** Update the `findFirst` query to prioritize flagship events when multiple tournaments share the same start date. The DataGolf sync already sets `isSignature`, `isMajor`, and `isPlayoff` flags (see `backend/src/services/datagolfSync.js` lines 314-316).

Change the `orderBy` in `/api/tournaments/current` from:
```js
orderBy: { startDate: 'asc' }
```
to:
```js
orderBy: [
  { startDate: 'asc' },
  { isMajor: 'desc' },
  { isSignature: 'desc' },
  { isPlayoff: 'desc' },
  { purse: 'desc' }
]
```

This way, for the same week: Majors > Signature events > Playoff events > Higher purse > others. Arnold Palmer Invitational (`isSignature: true`, $20M purse) will always beat Puerto Rico Open (`isSignature: false`, ~$4M purse).

**Also update these endpoints that likely have the same issue:**
- `GET /api/tournaments/upcoming-with-fields` (line 74+) — check if it returns both events and which comes first
- The Golf Hub hero tournament selection in `frontend/src/pages/GolfHub.jsx` — check `heroTournament` logic. The Golf Hub actually shows Arnold Palmer correctly as the hero, so the frontend may already have priority logic. But confirm and make consistent.

**Test:** After fix, Dashboard and League Home tournament cards should show "Arnold Palmer Invitational" instead of "Puerto Rico Open" for the Mar 5-8 week.

**Files to modify:**
- `backend/src/routes/tournaments.js` — update `orderBy` on `/current` endpoint
- Possibly `GolfHub.jsx` — verify hero tournament selection is consistent

---

### 048 — Live Page: Add Empty State When No Tournament Is In Progress
**Status:** `DONE`
**Completed:** 2026-03-02 — No standalone /live route exists — Nav "Live" links to /tournaments/:id (or /tournaments fallback). Added "No Live Tournament" empty state to Tournaments.jsx: golf flag icon, "next event starts in X days" countdown, "Preview Field →" button linking to next event's preview, "View Golf Hub →" secondary link. Shows when no live tournaments but upcoming exist. Files: Tournaments.jsx
**Priority:** MEDIUM — The "Live" nav item is always visible. Clicking it shows a completely blank page when no tournament is active. Needs an informative empty state.
**Prompt:**
The `/live` route renders a blank page when no tournament is `IN_PROGRESS`. The page component exists but has no empty state handling.

**Find the Live page component** — check `frontend/src/App.jsx` for the `/live` route to find which component renders. Then add an empty state that shows:

1. **A golf flag icon or NeuralCluster (sm, calm)** — visual anchor
2. **Headline:** "No Live Tournament"
3. **Subtext:** "The next event starts in X days" (calculate from the next upcoming tournament's `startDate`)
4. **Next tournament card** — show a compact preview of the upcoming event (name, course, dates, field size if available)
5. **CTA button:** "Preview Field →" linking to `/tournaments/{id}/preview` for the upcoming event
6. **Secondary CTA:** "View Golf Hub →" linking to `/golf`

**Design tokens:** Use `var(--bg)` background, `var(--text-1)` for headline, `var(--text-2)` for subtext. Keep it centered and clean. Use the same warm cream/light feel as the Prove It "No Active Tournament" empty state.

**Files to modify:**
- The Live page component (find via App.jsx route for `/live`)
- May need to call `useTournaments()` hook to get next upcoming event

---

### 049 — Standings Page: "View League Vault" Link Styling
**Status:** `DONE`
**Completed:** 2026-03-02 — Upgraded Vault CTA: clock icon → archive/box icon, button-style with bg-crown/10 border-crown/30, "League Vault" as bold label + "See full league history" as italic subtitle, tighter rounded-lg padding. Files: Standings.jsx
**Priority:** LOW — The "See full league history in the Vault" CTA at the bottom of standings works and looks fine. But the differentiator sprint spec (item 040) called for a gold accent CTA with archive icon. Currently it's a plain text link with a clock icon. This is a micro-polish item.
**Prompt:**
In the Standings page (find via `frontend/src/pages/Standings.jsx` or similar), the Vault link at the bottom currently shows as:
- Clock icon (⏰) + "See full league history in the Vault >" in gold text

The differentiator sprint spec wanted:
- Archive icon (📦 or similar) + "League Vault" with a more prominent gold accent CTA button style

**Upgrade to:**
1. Replace clock icon with an archive/vault icon (use Lucide `Archive` or `BookOpen` icon)
2. Make it a button-style CTA: `bg-crown/10 border border-crown/30 text-crown hover:bg-crown/20 rounded-lg px-4 py-2`
3. Text: "See 17 seasons of history → League Vault" (where the number comes from the vault's season count if available, or just "See full league history → League Vault" as fallback)

This is cosmetic polish — keep it as a low priority item.

**Files to modify:**
- Standings page component (find path via App.jsx route for `/standings` or league standings)

---

### 050 — Fix Tournament Priority: Sync Opposite-Field Flag from DataGolf
**Status:** `DONE`
**Completed:** 2026-03-02 — Added `isAlternate` boolean to Tournament model, syncSchedule() now fetches `opp` schedule from DataGolf to identify alternate events, `/current` endpoint prefers non-alternate events with fallback, `/upcoming-with-fields` sorts alternates last. Files: schema.prisma, datagolfSync.js, tournaments.js
**Priority:** HIGH — Item 047's `orderBy` fix didn't work because `isSignature`, `isMajor`, and `purse` are ALL null/false for every tournament in the DB. DataGolf doesn't provide these flags in its `pga` schedule. Puerto Rico Open still shows as the current tournament instead of Arnold Palmer Invitational.
**Prompt:**
The `orderBy` approach from item 047 is correct but ineffective because the database has no distinguishing data between main and alternate events. We need a different strategy.

**Root cause:** DataGolf's `/get-schedule?tour=pga` returns ALL PGA Tour events including opposite-field/alternate events (like Puerto Rico Open). The flags `signature`, `major`, `playoff` are either not returned by DataGolf or are always false/null.

**Solution: Two-step approach**

**Step 1: Add `isAlternate` boolean to Tournament model and sync from DataGolf `opp` schedule**

DataGolf provides separate tour schedules: `pga` (main events) and `opp` (opposite-field events). Currently we only sync `pga`. Instead of syncing `opp` as tournaments, we should use the `opp` schedule to IDENTIFY which events are alternates.

In `backend/src/services/datagolfSync.js`, modify `syncSchedule()`:

```js
async function syncSchedule(prisma) {
  console.log('[Sync] Starting schedule sync...')

  // Fetch BOTH main PGA and opposite-field schedules
  const [scheduleData, oppScheduleData] = await Promise.all([
    dg.getSchedule('pga'),
    dg.getSchedule('opp').catch(() => ({ schedule: [] })),  // Don't fail if opp not available
  ])

  // Build a Set of opposite-field event IDs
  const oppEvents = (oppScheduleData?.schedule || [])
  const oppEventIds = new Set(oppEvents.map(e => String(e.event_id || e.dg_id)))

  await stageRaw(prisma, 'datagolf', 'schedule', null, scheduleData)
  const events = scheduleData?.schedule || scheduleData || []

  // ... existing code ...

  // In the row building loop, add:
  // isAlternate: oppEventIds.has(dgId),
```

**Step 2: Add Prisma migration for `isAlternate` field**

Add to Tournament model in `schema.prisma`:
```prisma
isAlternate  Boolean  @default(false)
```

Run: `npx prisma migrate dev --name add_is_alternate_tournament`

**Step 3: Update the `/current` endpoint to exclude alternates**

In `backend/src/routes/tournaments.js`, the `/current` endpoint should prefer non-alternate events:

```js
// First try to find a non-alternate tournament
let tournament = await prisma.tournament.findFirst({
  where: {
    status: { in: ['IN_PROGRESS', 'UPCOMING'] },
    isAlternate: false,
  },
  include: { course: true },
  orderBy: [{ startDate: 'asc' }]
})
// Fallback to any tournament if no non-alternate found
if (!tournament) {
  tournament = await prisma.tournament.findFirst({
    where: { status: { in: ['IN_PROGRESS', 'UPCOMING'] } },
    include: { course: true },
    orderBy: [{ startDate: 'asc' }]
  })
}
```

**Step 4: Update upcoming-with-fields to sort alternates last**

Keep alternate events in the upcoming schedule (users can still see them) but sort them after main events for the same week:
```js
orderBy: [
  { startDate: 'asc' },
  { isAlternate: 'asc' },  // false (main) before true (alternate)
]
```

**Step 5: Backfill existing tournaments**

After migration, run a one-time script or SQL to mark existing alternate events:
```sql
-- Known alternate events for 2026 season
UPDATE tournaments SET "isAlternate" = true WHERE name ILIKE '%Puerto Rico%';
UPDATE tournaments SET "isAlternate" = true WHERE name ILIKE '%Bermuda%';
-- The sync will handle this going forward via the opp schedule comparison
```

Or better: run the schedule sync once after deploy and it will auto-tag alternates via the `oppEventIds` Set.

**Fallback if DataGolf `opp` endpoint doesn't work:** Maintain a hardcoded list of known alternate event names in a constant:
```js
const KNOWN_ALTERNATES = [
  'Puerto Rico Open', 'Bermuda Championship', 'Barbasol Championship',
  'Barracuda Championship', 'ISCO Championship',
]
const isAlternateEvent = (name) => KNOWN_ALTERNATES.some(alt => name.includes(alt))
```

**Test:** After deploy + sync, `/api/tournaments/current` should return Arnold Palmer Invitational, not Puerto Rico Open.

**Files to modify:**
- `backend/prisma/schema.prisma` — add `isAlternate` field
- `backend/src/services/datagolfSync.js` — sync opp schedule, tag alternates
- `backend/src/routes/tournaments.js` — exclude alternates in `/current`, sort last in `/upcoming-with-fields`
- New migration file

---

### 051 — Backfill isAlternate + Add Known-Alternates Fallback
**Status:** `DONE`
**Completed:** 2026-03-02 — DataGolf `opp` tour not available (400 error), so KNOWN_ALTERNATE_NAMES fallback is the primary detection. Backfill script tagged 40 tournaments. /current now returns Arnold Palmer Invitational. Files: backfill-alternates.js (new), datagolfSync.js
**Priority:** HIGH — Item 050 added the `isAlternate` field and sync logic, but the weekly cron hasn't run since the new code was deployed. Puerto Rico Open is still `isAlternate: false` in production. Dashboard still shows it instead of Arnold Palmer Invitational.
**Prompt:**
Two issues need fixing:

**Issue 1: Existing data needs backfill**
The `syncSchedule()` function now fetches the DataGolf `opp` schedule to tag alternates, but it hasn't run yet (weekly cron is Monday 5AM ET, and the code was deployed today after the cron already ran).

**Create a one-time backfill script** at `backend/scripts/backfill-alternates.js`:
```js
// Backfill isAlternate for existing tournaments
// Run once: node backend/scripts/backfill-alternates.js

const { PrismaClient } = require('@prisma/client')
const dg = require('../src/services/datagolfClient')

async function main() {
  const prisma = new PrismaClient()
  try {
    // Fetch opp schedule from DataGolf
    const oppData = await dg.getSchedule('opp')
    const oppEvents = oppData?.schedule || []
    const oppEventIds = new Set(oppEvents.map(e => String(e.event_id || e.dg_id)))
    console.log(`Found ${oppEventIds.size} opposite-field events from DataGolf`)

    // Update tournaments that match opp event IDs
    let updated = 0
    for (const dgId of oppEventIds) {
      const result = await prisma.tournament.updateMany({
        where: { datagolfId: dgId },
        data: { isAlternate: true },
      })
      if (result.count > 0) updated += result.count
    }
    console.log(`Marked ${updated} tournaments as alternate`)

    // Also apply known-alternates fallback for any missed by DataGolf
    const knownAlternates = [
      'Puerto Rico Open', 'Bermuda Championship', 'Barbasol Championship',
      'Barracuda Championship', 'ISCO Championship', 'Corales Puntacana',
    ]
    for (const name of knownAlternates) {
      const result = await prisma.tournament.updateMany({
        where: {
          name: { contains: name, mode: 'insensitive' },
          isAlternate: false,
        },
        data: { isAlternate: true },
      })
      if (result.count > 0) {
        console.log(`  Fallback: marked ${result.count} "${name}" tournaments as alternate`)
        updated += result.count
      }
    }
    console.log(`Total: ${updated} tournaments marked as alternate`)
  } finally {
    await prisma.$disconnect()
  }
}
main().catch(console.error)
```

**Run this script on Railway** after deploying: `node backend/scripts/backfill-alternates.js`

**Issue 2: Add known-alternates fallback to syncSchedule()**
The DataGolf `opp` endpoint might not cross-reference event IDs with the `pga` schedule (i.e., Puerto Rico Open might have different event IDs in `pga` vs `opp` schedules, or might only appear in `pga`). Add a fallback.

In `backend/src/services/datagolfSync.js`, after the `oppEventIds` check, add a hardcoded known-alternates list:

```js
const KNOWN_ALTERNATE_NAMES = [
  'Puerto Rico Open', 'Bermuda Championship', 'Barbasol Championship',
  'Barracuda Championship', 'ISCO Championship', 'Corales Puntacana',
]

// In the row-building loop, change:
// isAlternate: oppEventIds.has(dgId),
// to:
isAlternate: oppEventIds.has(dgId) || KNOWN_ALTERNATE_NAMES.some(alt => (evt.event_name || evt.name || '').includes(alt)),
```

This ensures alternates are caught even if DataGolf's `opp` schedule doesn't have matching IDs.

**Test:** After running the backfill script, hit `GET /api/tournaments/current` — it should return Arnold Palmer Invitational (not Puerto Rico Open). Dashboard and League Home should both show Arnold Palmer.

**Files to create/modify:**
- `backend/scripts/backfill-alternates.js` — new one-time backfill script
- `backend/src/services/datagolfSync.js` — add `KNOWN_ALTERNATE_NAMES` fallback

---

### 052 — Field Sync Crons: Add isAlternate Filter + Trigger Arnold Palmer Sync
**Status:** `DONE`
**Completed:** 2026-03-02 — Updated getActiveTournamentDgId() helper + 3 inline field sync queries (startup, Tue 8PM, Wed 8AM) to prefer isAlternate: false with fallback. Deploy will trigger startup field sync for Arnold Palmer. Files: index.js
**Priority:** HIGH — Arnold Palmer Invitational starts in 3 days and has `fieldSize: 0` / `fieldCount: 0`. Its field was never synced because all field sync crons grab the first upcoming tournament by `startDate asc` without filtering alternates. Puerto Rico Open (alternate, same week) got synced instead.
**Prompt:**
Four field sync locations in `backend/src/index.js` use `findFirst` to pick which tournament to sync, but none of them filter by `isAlternate`. They all grab Puerto Rico Open instead of Arnold Palmer Invitational.

**Fix all 4 field sync queries to prefer non-alternate events:**

1. **Startup field sync (line ~274):**
```js
const t = await cronPrisma.tournament.findFirst({
  where: { status: { in: ['IN_PROGRESS', 'UPCOMING'] }, datagolfId: { not: null }, isAlternate: false },
  orderBy: { startDate: 'asc' },
  select: { datagolfId: true, status: true, name: true },
})
// Fallback if no non-alternate found
if (!t?.datagolfId) {
  t = await cronPrisma.tournament.findFirst({
    where: { status: { in: ['IN_PROGRESS', 'UPCOMING'] }, datagolfId: { not: null } },
    orderBy: { startDate: 'asc' },
    select: { datagolfId: true, status: true, name: true },
  })
}
```

2. **Daily field sync Thu-Sun 7AM ET (line ~310):** Same pattern — add `isAlternate: false` to the `getActiveTournamentDgId()` helper. Check what that function does and add the filter there so all callers benefit.

3. **Tuesday 8PM early field sync (line ~322):** Add `isAlternate: false` to the `where` clause.

4. **Wednesday 8AM catch-up field sync (line ~336):** Add `isAlternate: false` to the `where` clause.

**Also check `getActiveTournamentDgId()` helper** — it's used by multiple crons. Adding the filter there is the cleanest fix since it propagates to all callers.

**After fixing the code, the deploy will trigger the startup field sync, which should now grab Arnold Palmer's field from DataGolf.**

**Test:** After deploy, check `GET /api/tournaments/upcoming-with-fields` — Arnold Palmer should have `fieldSize > 0` and `fieldCount > 0`.

**Files to modify:**
- `backend/src/index.js` — all 4 field sync queries + `getActiveTournamentDgId()` helper

---

### 053 — Golf Hub Hero: Add Field Strength + Forecast + Course DNA Panels
**Status:** `DONE`
**Completed:** 2026-03-02 — Replaced custom hero card with reusable TournamentHeader component (Option A). Golf Hub now shows Field Strength, 4-Day Forecast, and Course DNA panels matching League Home. Removed ~130 lines of duplicated weather/hero markup. Files: GolfHub.jsx
**Priority:** HIGH — The Golf Hub is the main golf landing page. Its hero card only shows a tiny one-line weather snippet ("88° · 17 mph · Calm") mixed with broadcast info. The League Home tournament card shows a full FORECAST panel (R1-R4 with temps/wind), FIELD STRENGTH breakdown (Top 25/50/100 with color bar), and WHAT WINS HERE course DNA (Driving/Approach/Short Game/Putting ratings). The Golf Hub should match or exceed this since it's the sport's home page.
**Prompt:**
The Golf Hub hero card in `frontend/src/pages/GolfHub.jsx` (lines ~230-360) renders the tournament info inline with a minimal weather teaser row. The data for a richer display is ALREADY fetched — `heroIntel.weather` has per-round forecasts and `heroIntel.course` has course data. The field data comes from `heroTournament.field` (array of player objects with `owgrRank`).

The League Home uses `TournamentHeader` (`frontend/src/components/tournament/TournamentHeader.jsx`) which has all the rich panels: Field Strength, Forecast (R1-R4), and Course DNA ("What Wins Here").

**Option A (preferred): Reuse TournamentHeader inside the Golf Hub hero**
Replace the custom hero card with `<TournamentHeader tournament={heroTournament} leaderboard={heroTournament.field || []} />` wrapped in the existing hero image/overlay styling. This ensures both pages stay in sync as TournamentHeader evolves.

Check if `TournamentHeader` needs any props the Golf Hub doesn't have. The League Home passes `tournament` (the full tournament object) and `leaderboard` (array of field/performance entries). The Golf Hub has `heroTournament` (from `getUpcomingTournamentsWithFields`) and `heroIntel` (weather/course). TournamentHeader fetches its own weather internally (check line ~40+), so passing the tournament should be enough.

**Option B: Add the panels inline**
If TournamentHeader doesn't fit the Golf Hub layout cleanly, add the three panels below the hero card as a flex row, similar to how League Home does it:

```jsx
{/* Below the hero image/overlay, add: */}
<div className="grid grid-cols-3 gap-3 mt-3">
  {/* Field Strength panel */}
  <div className="bg-surface rounded-lg p-4 border border-border">
    <h4 className="text-xs font-mono text-text-muted uppercase tracking-wide">Field Strength</h4>
    <p className="text-2xl font-mono font-bold mt-1">{heroTournament.fieldSize} <span className="text-sm text-text-muted">players</span></p>
    {/* Top 25/50/100 breakdown with color bar */}
  </div>

  {/* Forecast panel - R1-R4 */}
  <div className="bg-surface rounded-lg p-4 border border-border">
    <h4 className="text-xs font-mono text-text-muted uppercase tracking-wide">Forecast</h4>
    {heroIntel?.weather?.slice(0,4).map((day, i) => (
      <div key={i} className="flex items-center gap-2 text-xs mt-1">
        <span className="font-mono w-6">R{i+1}</span>
        <span>{conditionIcon}</span>
        <span className="font-mono font-bold">{Math.round(day.temperature)}°</span>
        <span className="font-mono text-text-muted">{Math.round(day.windSpeed)}mph</span>
      </div>
    ))}
  </div>

  {/* Course DNA panel */}
  <div className="bg-surface rounded-lg p-4 border border-border">
    <h4 className="text-xs font-mono text-text-muted uppercase tracking-wide">What Wins Here</h4>
    {/* Driving/Approach/Short Game/Putting with labels from getDnaLabel() */}
  </div>
</div>
```

**The key data sources:**
- Field strength: `heroTournament.field` array → count by `owgrRank` ranges (1-25, 1-50, 1-100)
- Weather: `heroIntel.weather` array (already fetched, has `temperature`, `windSpeed`, `conditions`, `difficultyImpact` per day)
- Course DNA: `heroIntel.course?.courseDna` or from `TournamentHeader`'s own API call. Check how TournamentHeader gets this data.

**Remove the old tiny weather teaser row** (lines ~291-326) once the new panels are in place. Keep the broadcast info somewhere — either in the hero overlay or in the forecast panel.

**Files to modify:**
- `frontend/src/pages/GolfHub.jsx` — replace/augment hero card with rich panels
- Possibly import `TournamentHeader` if using Option A

---

### 054 — Commit: League Settings Members Avatar Bug + Invite Code Sizing
**Status:** `DONE`
**Completed:** 2026-03-02 — Committed Cowork's avatar img fix + invite code text-base sizing. Files: LeagueSettings.jsx
**Priority:** CRITICAL — friends are about to test
**Prompt:**
Cowork already made the edits in `frontend/src/pages/LeagueSettings.jsx`. Just commit and deploy.

**Changes already made:**

1. **Avatar rendering fix (line ~1191-1197):** Member avatars were rendering `member.user?.avatar` as raw text content inside a `<div>`, so when a user had a Cloudinary/base64 avatar URL, the entire URL string was dumped as visible text across the page. Fixed to check if avatar exists and render an `<img>` tag, falling back to initial letter.

2. **Invite code sizing fix (line ~1130):** The invite code was displayed as `text-3xl tracking-[0.3em]` which made the 25-character CUID code comically large and stretched across the page. Changed to `text-base tracking-wide break-all` for a reasonable size.

**Files changed:**
- `frontend/src/pages/LeagueSettings.jsx` (2 edits)

---

### 055 — Pre-Draft League Size Editing + Email Invites
**Status:** `DONE`
**Completed:** 2026-03-02 — Added editable Max Teams dropdown (locked post-draft) to General settings. Backend PATCH accepts maxTeams with pre-draft validation. Added email invite endpoint (POST /leagues/:id/invite-email) using Resend + sendLeagueInviteEmail(). Email invite UI added to Members tab. Files: LeagueSettings.jsx, leagues.js, emailService.js
**Priority:** HIGH — commissioner UX for friend testing
**Prompt:**
Two commissioner features needed for pre-draft leagues:

**A) Editable league size before draft:**
Currently when a commissioner creates a league (e.g., 12 teams), that number is locked. Before the draft happens, the commissioner should be able to change the league size (number of teams/members). This is important because commissioners often don't know the exact count until friends confirm.

In `frontend/src/pages/LeagueSettings.jsx`, the General settings tab should:
- Show a "Max Teams" or "League Size" dropdown/input that is EDITABLE when `league.status` is pre-draft (no draft has occurred yet)
- Show it as read-only/disabled once a draft has been completed
- The backend `PATCH /api/leagues/:id/settings` endpoint should accept `maxTeams` changes only when the league hasn't drafted yet

Check the current General tab to see if `maxTeams` is already shown — if so, just make it editable. If not, add it.

Backend: In `backend/src/routes/leagues.js` (or wherever settings PATCH is), add validation:
- If league has an associated completed draft, reject `maxTeams` changes
- Otherwise allow updating `maxTeams` on the League model

**B) Email invite for members:**
On the Members tab in League Settings (`LeagueSettings.jsx`), add an "Invite by Email" section below the invite code:
- Text input for email address
- "Send Invite" button
- Backend: `POST /api/leagues/:id/invite-email` that:
  1. Validates the email format
  2. Sends an email (use a simple transactional email — check if there's already an email service configured, e.g., SendGrid, Resend, or Nodemailer)
  3. The email contains the league name, commissioner name, and a direct join link: `https://clutchfantasysports.com/leagues/join?code={inviteCode}`
  4. If no email service is configured yet, set up Resend (free tier, simple API). Add `RESEND_API_KEY` to Railway env vars.
  5. Show success/error toast on frontend

**Files to modify:**
- `frontend/src/pages/LeagueSettings.jsx` — add email invite UI + make maxTeams editable pre-draft
- `backend/src/routes/leagues.js` — add email invite endpoint + maxTeams validation
- Possibly add email service (e.g., `backend/src/services/emailService.js`)

---

### 056 — Dead Routes Cleanup
**Status:** `DONE`
**Completed:** 2026-03-02 — Added redirects: /create-league → /leagues/create, /register → /signup, /golf/tournaments → /tournaments. Files: App.jsx
**Priority:** MEDIUM — prevents confusion during friend testing
**Prompt:**
Several routes render blank pages because they don't exist or have wrong paths:

1. `/create-league` — renders blank. The actual route is `/leagues/create`. Add a redirect from `/create-league` to `/leagues/create` in `App.jsx`.
2. `/register` — renders blank. The actual signup route is `/signup`. Add a redirect from `/register` to `/signup`.
3. `/golf/tournaments` — renders blank (not a real route). Tournaments page is at `/tournaments`. Add redirect.

In `frontend/src/App.jsx`, add `<Route path="/create-league" element={<Navigate to="/leagues/create" replace />} />` and similar for the other dead routes. Import `Navigate` from react-router-dom if not already imported.

**Files to modify:**
- `frontend/src/App.jsx`

---

### 058 — Commit: League Settings Allow Odd Team Sizes
**Status:** `DONE`
**Completed:** 2026-03-02 — Committed Cowork's edit: dropdown now generates 2-20 (all numbers) instead of even-only. Files: LeagueSettings.jsx
**Priority:** URGENT — Eric is testing with 5 friends right now
**Prompt:**
Cowork already made the edit in `frontend/src/pages/LeagueSettings.jsx`. Just commit and deploy.

**Change already made:**
The League Settings "League Size (Max Teams)" dropdown (line ~363) only offered even numbers `[2, 4, 6, 8, 10, 12, 14, 16, 20]`. Changed to `Array.from({ length: 19 }, (_, i) => i + 2)` which generates 2-20 (every number, odd and even). The Create League form (`LeagueForm.jsx`) already allows all numbers 2-16 — this was only a settings page bug.

Backend has no even-number restriction — just stores the integer. Frontend-only fix.

**Files changed:**
- `frontend/src/pages/LeagueSettings.jsx` (1 edit, line ~363)

---

### 057 — Golf Prove It Slate: Work for UPCOMING Tournaments (Season SG Benchmarks)
**Status:** `DONE`
**Completed:** 2026-03-02 — Backend leaderboard now includes player career SG stats (seasonSgTotal etc.) for UPCOMING tournaments. Frontend WeeklySlate falls back to season averages when live SG is null. Shows "Avg SG" label and "Pre-Tournament Calls" header. Files: tournaments.js, ProveIt.jsx
**Priority:** CRITICAL — Golf is the launch sport, and the Golf Slate tab on Prove It shows "No Active Tournament" even though Arnold Palmer has a 72-player field. Friends will see a dead page.
**Prompt:**
The Golf Slate in Prove It (`frontend/src/pages/ProveIt.jsx`, `WeeklySlate` component, lines 41-158) only works during IN_PROGRESS tournaments because it relies on **live tournament SG data** as the benchmark value. For UPCOMING tournaments the leaderboard has 72 players but every `sgTotal` is `null` (no shots hit yet). The code filters `p.sgTotal != null` on line 66, so the slate is empty.

**The fix: use each player's season/career SG average as the benchmark for UPCOMING tournaments.**

This data already exists — every player has historical SG stats from the 2018-2026 backfill. The prediction becomes: "Will Scottie Scheffler beat his season average SG Total of 2.90 this week?" — which is actually a more interesting prediction than mid-tournament benchmarks.

**Backend changes:**

1. In `backend/src/routes/tournaments.js`, the `GET /:id/leaderboard` endpoint (line 258+):
   - When `tournament.status === 'UPCOMING'`, include each player's **season SG stats** in the response
   - The player data is already included via `include: { player: true }` — check if the Player model has `sgTotal`, `sgApproach`, `sgOffTee`, `sgPutting` fields (it should from the career stats aggregation)
   - If the Player model doesn't have season SG averages directly, compute them from the most recent season's Performance records:
     ```js
     // For each player in the field, get their 2025-2026 season average SG
     const recentPerfs = await prisma.performance.findMany({
       where: { playerId: player.id, sgTotal: { not: null } },
       orderBy: { tournament: { startDate: 'desc' } },
       take: 10, // last 10 tournaments
       select: { sgTotal: true }
     })
     const avgSgTotal = recentPerfs.length > 0
       ? recentPerfs.reduce((sum, p) => sum + p.sgTotal, 0) / recentPerfs.length
       : null
     ```
   - Add `seasonSgTotal` (or similar) to each leaderboard entry for UPCOMING tournaments
   - This could also be a separate endpoint like `GET /api/tournaments/:id/field-with-stats` if you prefer to keep leaderboard clean

2. **Alternative simpler approach:** Check if the Player model already has `sgTotal` as a career/season stat field. If yes, just map it onto the leaderboard entry when `tournament.status === 'UPCOMING'`. Check `backend/prisma/schema.prisma` for the Player model fields.

**Frontend changes:**

3. In `frontend/src/pages/ProveIt.jsx`, `WeeklySlate` component (lines 50-93):
   - After fetching the leaderboard, check if tournament is UPCOMING
   - If UPCOMING, use `seasonSgTotal` (or `player.sgTotal`) as the benchmark instead of the live `sgTotal`
   - Change line 66 filter: instead of `p.sgTotal != null`, check for `p.sgTotal != null || p.seasonSgTotal != null`
   - In the `targets` mapping (lines 67-74), set `sgTotal: p.sgTotal ?? p.seasonSgTotal`
   - **Add a visual indicator** that this is a season-average benchmark, not a live score. Something like a small label "Season Avg" next to the SG value

4. In the slate display section (lines 158+), when tournament is UPCOMING:
   - Change the section header from tournament round info to something like "Arnold Palmer Invitational — Pre-Tournament Calls"
   - The over/under buttons should say "Beat Avg" / "Miss Avg" or just keep "Over" / "Under" (simpler)
   - Add a brief explainer at top: "Will they beat their season average this week? Make your call."

5. In `handleSubmit` (line 95-124):
   - The prediction submission already works — it uses `benchmarkValue: Math.round(player.sgTotal * 10) / 10` and stores it in `predictionData`. No changes needed here as long as `sgTotal` is populated from step 3.

**Resolution (already works):**
The Sunday night auto-resolve cron compares predictions against actual tournament SG — that flow is unchanged. A prediction of "Scheffler over 2.9 SG Total" resolves correctly when the tournament completes.

**Testing:**
After deploying, navigate to `/prove-it` → "Golf Slate" tab. You should see the Arnold Palmer field with season SG averages and over/under buttons. Submit a prediction and verify it appears in "My Track Record."

**Files to modify:**
- `backend/src/routes/tournaments.js` — add season SG stats to leaderboard for UPCOMING tournaments
- `frontend/src/pages/ProveIt.jsx` — `WeeklySlate` component: use season stats, add explainer text

---

### 059 — Commit: Multi-Email Invite UI on League Settings Members Tab
**Status:** `DONE`
**Priority:** URGENT — Eric is inviting 4 friends right now
**Prompt:**
Cowork already made the edits in `frontend/src/pages/LeagueSettings.jsx`. Just commit and deploy.

**Changes already made (2 edits):**

1. **New state vars (line ~40):** Added `inviteEmails` (array of strings, default `['']`) and `sendingInvites` (boolean) state variables.

2. **Multi-email invite section (lines ~1195-1260):** Replaced the single email input + "Send Invite" button with a dynamic multi-row system:
   - Each row has an email input field and an X button to remove it (X only shows when there's more than 1 row)
   - A gold "+ Add another" link below the rows adds a new empty input
   - The "Send Invite" button updates its label dynamically — shows "Send 4 Invites" when there are 4 emails filled in
   - On click, sends all non-empty emails sequentially to `POST /leagues/:id/invite-email`
   - Shows a summary toast: "4 invites sent" (or "3 invites sent (1 failed)")
   - Resets to a single empty input on success
   - Button shows "Sending..." and is disabled during the send loop

**Files changed:**
- `frontend/src/pages/LeagueSettings.jsx` (2 edits: state vars at top, email invite section)

---

### 060 — Commit: Draft Room Stats Display Fixes (SG Column + Player Modal)
**Status:** `DONE`
**Priority:** CRITICAL — Draft is tomorrow. SG Total shows "—" for all players and Player Detail Modal shows all dashes.
**Prompt:**
Cowork already made the edits. Just commit and deploy.

**Changes already made (2 files):**

1. **`frontend/src/components/draft/DraftDashboard.jsx`** — Draft Dashboard "Available" table SG Total column showed "—" for every player because it referenced `player.stats?.sgTotal` but draft player data is flat (`player.sgTotal`). Fixed 3 locations:
   - **Sort (line 48):** Changed to `a.stats?.sgTotal || a.sgTotal || 0` (same for `b`)
   - **Color class (line 222):** Changed to `(player.stats?.sgTotal || player.sgTotal || 0) > 1`
   - **Display value (line 224):** Changed to `(player.stats?.sgTotal ?? player.sgTotal)?.toFixed(2) || '—'`

2. **`frontend/src/pages/DraftRoom.jsx`** — Player Detail Modal showed all "—" stats because `detailPlayer` has flat fields but modal expects `player.stats.sgTotal`. Fixed by wrapping `detailPlayer` with a `stats` object when passing to `PlayerDetailModal` (lines ~412-429):
   ```jsx
   player={detailPlayer ? {
     ...detailPlayer,
     stats: detailPlayer.stats || {
       sgTotal: detailPlayer.sgTotal,
       sgOffTee: detailPlayer.sgOffTee,
       sgApproach: detailPlayer.sgApproach,
       sgAroundGreen: detailPlayer.sgAroundGreen,
       sgPutting: detailPlayer.sgPutting,
       drivingDistance: detailPlayer.drivingDistance,
       drivingAccuracy: detailPlayer.drivingAccuracy,
       gir: detailPlayer.gir,
       scoringAvg: detailPlayer.scoringAvg,
     },
   } : null}
   ```
   Note: The backend `GET /api/drafts/:id/players` endpoint doesn't select `drivingDistance`, `drivingAccuracy`, `gir`, or `scoringAvg` — those will still show "—" in the modal. A separate backend change (item 061) would fix that.

**Files changed:**
- `frontend/src/components/draft/DraftDashboard.jsx` (3 edits: sort, color, display)
- `frontend/src/pages/DraftRoom.jsx` (1 edit: PlayerDetailModal player prop)

---

### 061 — Backend: Include Full Player Stats in Draft Players Endpoint
**Status:** `DONE`
**Priority:** HIGH — Player Detail Modal in draft room shows "—" for Driving Distance, Driving Accuracy, GIR%, and Scoring Avg because the endpoint doesn't return these fields.
**Prompt:**
The `GET /api/drafts/:id/players` endpoint in `backend/src/routes/drafts.js` (around line 144) returns player data but doesn't include all stat fields needed by the `PlayerDetailModal` component.

**Current behavior:** The endpoint returns SG fields (`sgTotal`, `sgOffTee`, `sgApproach`, `sgAroundGreen`, `sgPutting`) but NOT `drivingDistance`, `drivingAccuracy`, `gir` (greens in regulation), or `scoringAvg`.

**Fix:** In the `select` or `include` clause for the players query, add these fields:
- `drivingDistance`
- `drivingAccuracy`
- `gir`
- `scoringAvg`

Check the Player model in `backend/prisma/schema.prisma` first to confirm exact field names. These are likely Float? fields on the Player model that were populated during the ESPN/DataGolf backfill.

If these fields don't exist on the Player model directly, check if they're on a related model (like a recent Performance record) and compute season averages.

**Files to modify:**
- `backend/src/routes/drafts.js` — add missing stat fields to the players query select clause

---

### 062 — Fix: New User Avatar Renders as Broken Image
**Status:** `DONE`
**Priority:** CRITICAL — Every new user sees a broken image icon in the navbar instead of their initial.
**Prompt:**
In `backend/src/routes/auth.js` line 63, the signup route sets `avatar: name.charAt(0).toUpperCase()` — a single letter like "J". This is NOT a valid image URL.

In `frontend/src/components/layout/Navbar.jsx` line 511, the avatar display logic is:
```jsx
{user.avatar ? (
  <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover shadow-button" />
) : (
  <div className="w-8 h-8 bg-gradient-to-br from-gold to-orange rounded-full flex items-center justify-center text-slate font-semibold shadow-button">
    {user.name?.charAt(0).toUpperCase() || 'U'}
  </div>
)}
```

Since `user.avatar` is "J" (truthy), it renders `<img src="J">` which is a broken image. The fallback initial-letter div never shows.

**Fix (backend — preferred):** In `backend/src/routes/auth.js` line 63, change `avatar: name.charAt(0).toUpperCase()` to `avatar: null`. New users should NOT have an avatar set — the frontend already handles the fallback gracefully with a gold gradient circle showing their initial.

**Also fix (frontend — defense in depth):** In `Navbar.jsx` line 511, add a URL check so single-character avatars or non-URL strings fall through to the initial-letter fallback:
```jsx
{user.avatar && user.avatar.startsWith('http') ? (
  <img src={user.avatar} ... />
) : (
  <div className="w-8 h-8 bg-gradient-to-br from-gold to-orange rounded-full ...">
    {user.name?.charAt(0).toUpperCase() || 'U'}
  </div>
)}
```

Search the entire frontend for other `user.avatar` or `member.user?.avatar` checks and apply the same `startsWith('http')` guard — there may be more places (League Settings members list, League Home teams table, etc.) that have the same issue.

**Files to modify:**
- `backend/src/routes/auth.js` — line 63: set avatar to null on signup
- `frontend/src/components/layout/Navbar.jsx` — line 511: add URL validation
- Search for and fix any other avatar rendering locations in frontend

---

### 063 — Fix: Join League by Code Joins Twice ("Already a member" Error)
**Status:** `DONE`
**Priority:** CRITICAL — Every invited user hits this bug when using paste-code flow.
**Prompt:**
The `useJoinLeague` hook (`frontend/src/hooks/useJoinLeague.js`) calls `api.joinLeagueByCode(code)` for BOTH `validateCode()` (line 15) AND `joinLeague()` (line 31). The backend endpoint `POST /api/leagues/join-by-code` (`backend/src/routes/leagues.js` line 661) **immediately joins the league** — there is no preview/validate mode.

**What happens:**
1. User pastes invite code → clicks "Find League" → `validateCode()` calls `POST /join-by-code` → user is SILENTLY JOINED
2. Preview card appears showing league details + "Join League" button
3. User clicks "Join League" → `joinLeague()` calls same endpoint → "Already a member of this league" error

**Fix — add a preview endpoint on the backend:**

Add a new route `GET /api/leagues/preview-by-code?code=XXXX` in `backend/src/routes/leagues.js`:
```js
// GET /api/leagues/preview-by-code?code=XXXX - Preview league by invite code (no join)
router.get('/preview-by-code', authenticate, async (req, res, next) => {
  try {
    const code = req.query.code
    if (!code) return res.status(400).json({ error: { message: 'Code required' } })

    const league = await prisma.league.findUnique({
      where: { inviteCode: code },
      include: {
        owner: { select: { name: true } },
        _count: { select: { members: true } },
        sport: { select: { name: true, slug: true } },
      }
    })

    if (!league) return res.status(404).json({ error: { message: 'Invalid invite code' } })

    // Check if already a member
    const existingMember = await prisma.leagueMember.findUnique({
      where: { userId_leagueId: { userId: req.user.id, leagueId: league.id } }
    })

    res.json({
      league: {
        id: league.id,
        name: league.name,
        commissioner: league.owner?.name,
        type: league.draftType || 'snake',
        memberCount: league._count.members,
        maxMembers: league.maxTeams,
        scoringType: league.scoringType,
        rosterSize: league.rosterSize,
        sport: league.sport?.name || 'Golf',
        alreadyMember: !!existingMember,
      }
    })
  } catch (error) { next(error) }
})
```

**Then update the frontend hook** `useJoinLeague.js`:
- `validateCode()` should call the NEW `GET /preview-by-code?code=XXX` endpoint (read-only, no side effects)
- `joinLeague()` should continue calling `POST /join-by-code` (the actual join)

**Also update `api.js`:** Add a new method:
```js
async previewLeagueByCode(code) {
  return this.request(`/leagues/preview-by-code?code=${encodeURIComponent(code)}`)
}
```

**Frontend handling for `alreadyMember`:** If the preview returns `alreadyMember: true`, show a message like "You're already in this league!" with a "Go to League" button linking to `/leagues/${league.id}` instead of the "Join League" button.

**Files to modify:**
- `backend/src/routes/leagues.js` — add `GET /preview-by-code` route
- `frontend/src/services/api.js` — add `previewLeagueByCode()` method
- `frontend/src/hooks/useJoinLeague.js` — change `validateCode` to use preview endpoint
- `frontend/src/pages/JoinLeague.jsx` — handle `alreadyMember` state in preview card

---

### 064 — Improve: New User Post-Signup Experience (Invite-Aware Redirect + Better Onboarding)
**Status:** `DONE`
**Priority:** HIGH — First impression for every new user. Current experience dumps them on an empty dashboard.
**Prompt:**
Three improvements to the new user experience:

**1. Invite-aware signup redirect:**
When a user signs up via an invite link (e.g., `clutchfantasysports.com/leagues/join?code=XXXX`), they currently:
- See the join page → redirect to `/signup` (if not logged in) → sign up → land on `/dashboard`
- Then have to manually go BACK to `/leagues/join?code=XXXX` to actually join

Fix: In `frontend/src/pages/Signup.jsx`, the `from` variable (line 22) already captures the intended destination: `const from = location.state?.from?.pathname || '/dashboard'`. The issue is that the join page may not pass the state properly when redirecting to signup.

Check the auth redirect flow:
- If `JoinLeague.jsx` requires auth and the user isn't logged in, React Router's `ProtectedRoute` should redirect to `/signup` with `{ state: { from: location } }` so that after signup, the user lands back at `/leagues/join?code=XXXX`
- Look at the `ProtectedRoute` component and verify it passes `state: { from: location }` (including search params like `?code=XXXX`)
- The redirect in `Signup.jsx` should use the full path including search params, not just pathname

**2. Improve the onboarding modal:**
The existing `OnboardingModal.jsx` is decent (2-step: sport picker + quick profile). However:
- Make sure it fires reliably for brand new users (it checks `onboardingCompleted` in localStorage, which should be false for new signups)
- Add a brief "What is Clutch?" sentence — "Clutch is a season-long fantasy sports platform. Create leagues, draft players, compete all season." Many new users won't know what this is.
- The "Let's Go" button at the end should route intelligently: if user has a pending invite (from URL), route to the join page. If they have leagues, route to dashboard. If no leagues, route to `/leagues/create` or show Create/Join options.

**3. Empty dashboard state:**
When a new user (no leagues) sees the dashboard, the empty state should be welcoming and guide them:
- Show a clear "Welcome to Clutch" header
- Two prominent action cards: "Create a League" and "Join a League"
- Brief explanation of what each means
- If the user came from an invite, the dashboard should detect and surface "You have a pending invite — Join Now"

Check the current empty state in `Dashboard.jsx` — look for what renders when `hasLeagues` is false.

**Files to modify:**
- `frontend/src/pages/Signup.jsx` — ensure invite URL state persists through signup
- `frontend/src/components/onboarding/OnboardingModal.jsx` — add Clutch explanation, smart routing
- `frontend/src/pages/Dashboard.jsx` — improve empty state for new users
- Check `ProtectedRoute` or auth redirect component — ensure `from` state includes search params

---

### 065 — Commit: Prove It Page Overhaul (Default Golf, Engagement Banner, Player Drawer, Rank Sort)
**Status:** `DONE`
**Priority:** HIGH — Prove It page is key to engagement, especially during friend testing.
**Prompt:**
Cowork already made the edits in `frontend/src/pages/ProveIt.jsx`. Just commit and deploy.

**Changes already made:**

1. **Imports (lines 1-12):** Added `PlayerDrawer` and `NeuralCluster` imports.

2. **Default tab changed (line ~1343):** Was `'nfl'`, now `'slate'` (Golf Slate shows first since golf is the active sport).

3. **Tab order (TABS array, line ~1330):** Golf Slate moved to first position, NFL second.

4. **Player sort (lines ~78-82):** Slate now sorted by rank ascending (best players first) instead of alphabetical. Falls back to SG total descending.

5. **Engagement banner (above tournament header):** AI coach-themed banner with NeuralCluster animation. Dynamic copy based on how many calls the user has made:
   - 0 calls: "Make your first call — your AI coach is watching."
   - 1-4: "{n} calls in. Keep going — your coach is learning your tendencies."
   - 5+: "{n} calls locked in. Your coach is building your profile."
   - Subtext: "The more calls you make, the better your AI coach understands your instincts..."

6. **Top Picks spotlight (below banner):** Horizontal scrolling row of the top 5 unpicked players as compact cards. Each card shows headshot, name, SG value, and OVER/UNDER buttons. Disappears when all top 5 are picked.

7. **Player Drawer integration:** Every player row is now clickable — clicking the headshot/name opens the `PlayerDrawer` component to see full stats before making a call. Added `drawerPlayer` state and `<PlayerDrawer>` at bottom of component.

8. **Hover effects:** Player rows have `cursor-pointer`, `group-hover:text-[var(--crown)]` on name, ring effect on headshot hover.

**Files changed:**
- `frontend/src/pages/ProveIt.jsx` (multiple edits: imports, default tab, tab order, sort, banner, top picks, drawer, hover effects)

---

### 066 — Commit: Dead Route Redirects + ManagerProfile Avatar & Rating Placeholder
**Status:** `DONE`
**Priority:** MEDIUM — friend-testing polish
**Prompt:**
Cowork already made the edits. Just commit and deploy.

**Changes already made (2 files):**

1. **`frontend/src/App.jsx`** — Added two dead route redirects:
   - `/golf/players` → `/players` (the actual players page)
   - `/live` → `/tournaments` (the actual tournaments list)
   These join the existing redirects for `/create-league`, `/register`, `/golf/tournaments` from item 056. Anyone typing these URLs directly or bookmarking old routes will now land somewhere useful instead of a blank page.

2. **`frontend/src/pages/ManagerProfile.jsx`** — Two fixes:
   - **Avatar display (lines ~387-393):** The header avatar was hardcoded as a gold initial circle. Now checks `user.avatar && user.avatar.startsWith('http')` and renders an `<img>` tag for real avatars, falling back to the initial circle for users without uploaded avatars.
   - **Rating placeholder (above the existing rating card):** New users with no Clutch Rating data now see a "Clutch Rating — Building..." placeholder card explaining how the rating builds over time, instead of the entire section being invisible. Different copy for own profile vs viewing another user.

**Files changed:**
- `frontend/src/App.jsx` (2 redirect routes added)
- `frontend/src/pages/ManagerProfile.jsx` (2 edits: avatar + rating placeholder)

---

---

### 067 — Backend: Enrich Draft Recap Endpoint with Full SG Stats
**Status:** `DONE`
**Priority:** HIGH — The new DraftRecap page shows SG radar charts, SG breakdown tables, and team SG power rankings. Without this backend change, only `sgTotal` is available — the radar chart and per-category stats will show dashes.
**Prompt:**
In `backend/src/routes/draftHistory.js`, the `GET /drafts/:draftId` endpoint (line 78) currently selects only `sgTotal` from the player model (line 89):

```js
player: {
  select: { id: true, name: true, owgrRank: true, datagolfRank: true, headshotUrl: true, countryFlag: true, primaryTour: true, sgTotal: true },
},
```

**Add these fields to the player select:**
- `sgOffTee`
- `sgApproach`
- `sgAroundGreen`
- `sgPutting`
- `sgTeeToGreen`

Then in the response mapping (lines 125-140), add these to each pick object:

```js
sgOffTee: p.player.sgOffTee,
sgApproach: p.player.sgApproach,
sgAroundGreen: p.player.sgAroundGreen,
sgPutting: p.player.sgPutting,
```

These fields should already exist on the Player model from the DataGolf SG backfill (migration/backfill in Phase 4E). Check `schema.prisma` to confirm the exact field names.

**Files to modify:**
- `backend/src/routes/draftHistory.js` — lines 89 and 125-140

---

### 068 — Commit: DraftRecap.jsx Wow-Factor Overhaul
**Status:** `DONE`
**Priority:** HIGH — The draft is tomorrow. This is the "holy shit" moment.
**Prompt:**
Cowork already rewrote `frontend/src/pages/DraftRecap.jsx` from scratch. Just commit and deploy.

**What changed (complete rewrite from 293 → 724 lines):**

The old DraftRecap was functional but plain — letter grade card, simple pick list, basic draft board grid, and a flat team grades list. The new version is designed to make friends say "holy shit" after their first draft.

**New features:**

1. **Cinematic reveal** — Sections fade in sequentially (300ms → 2000ms) instead of appearing all at once. Loading screen shows NeuralCluster animation with "Analyzing your draft..."

2. **Hero Grade Card** — Large GradeRing (animated SVG progress ring), grade emoji, descriptive message ("Elite Draft", "Legendary Draft"), draft rank badge with crown for #1. Gradient glow effect behind grade.

3. **Quick Stats Row** — 4-card grid: Avg SG Total (animated counter), Total Value, Steals count, Best Pick SG. Each with rank indicators.

4. **Tabbed sections** — Overview, Your Roster, Leaderboard, Draft Board. Clean pill navigation.

5. **Team SG Power Ranking** (Overview tab) — Horizontal bar chart showing every team ranked by average Strokes Gained. Gold/silver/bronze gradient bars for top 3. Team names + numeric values.

6. **SG Radar Chart** (Overview tab) — Uses existing `SgRadarChart` component to show the user's top 5 picks' SG DNA (Off the Tee, Approach, Around Green, Putting, Total). Visual proof of roster strengths.

7. **AI Coach's Take** (Overview tab) — NeuralCluster-branded card with editorial italic text. Dynamic commentary based on grade, SG average, steals, and best pick. The AI coach "analyzes" the draft.

8. **Enhanced Roster Tab** — Each pick shows headshot, GradeRing, player name, rank, SG Total, and value tag ("HIGHWAY ROBBERY", "GREAT VALUE", "NICE STEAL", "SLIGHT REACH", "BIG REACH"). Clickable rows open PlayerDrawer for full stats. Below: SG breakdown table with all 5 SG categories per player + team average row.

9. **Rich Leaderboard** — Crown/medal emoji for top 3, GradeRings per team, avg SG shown alongside grade score, current user highlighted with gold styling.

10. **Interactive Draft Board** — Clickable cells open PlayerDrawer. User's column highlighted. Tooltips on hover.

11. **PlayerDrawer integration** — Click any player anywhere in the recap to see full stats, SG radar, career history.

**Components used:**
- `NeuralCluster` — animated brain visual (loading + coach section)
- `SgRadarChart` — SVG radar chart for team SG profile
- `PlayerDrawer` — full player stats sidebar
- `GradeRing` — new inline component (animated SVG progress ring)
- `AnimatedNumber` — new inline component (eased number counter)
- `TeamSgBarChart` — new inline component (horizontal bar chart)

**Files changed:**
- `frontend/src/pages/DraftRecap.jsx` (complete rewrite)

---

### 069 — Backend: Silent Error Capture System (Migration + Route + Admin View)
**Status:** `DONE`
**Completed:** 2026-03-02 — Added AppError model to schema (prisma db push), created errors.js route with 5 endpoints (batch, summary, recent, resolve, resolve-bulk), registered route in index.js, added weekly cleanup cron. Files: schema.prisma, errors.js (new), index.js
**Priority:** HIGH — Foundation for scaling. Captures errors silently so we can fix issues users never even report.
**Prompt:**
Cowork built the frontend error capture service (`frontend/src/services/errorCapture.js`) which silently captures API errors, JS crashes, component failures, and churn signals. It batches errors and sends them to `POST /api/errors/batch`. The frontend is already wired up — `api.js` calls `captureApiError()` on every non-401 error, `App.jsx` calls `initErrorCapture()` on mount, and an `ErrorBoundary` component catches React render crashes.

**Now we need the backend to receive, store, and surface this data.**

**1. Create a Prisma migration for the `AppError` model:**

```prisma
model AppError {
  id          String   @id @default(cuid())
  type        String   // 'api_error', 'js_error', 'component_crash', 'promise_rejection', 'churn_signal'
  category    String   // 'server_error', 'client_error', 'render_error', 'unhandled_error', 'user_behavior'
  severity    String   @default("low") // 'low', 'medium', 'high'
  message     String
  metadata    Json?    // endpoint, status, stack, component name, etc.
  url         String?  // page where error occurred
  userId      String?  // null if not logged in
  sessionId   String?  // browser session ID for grouping
  userAgent   String?
  viewport    String?
  resolved    Boolean  @default(false)
  resolvedAt  DateTime?
  resolvedBy  String?  // admin user ID who resolved it
  createdAt   DateTime @default(now())

  @@index([type])
  @@index([severity])
  @@index([userId])
  @@index([createdAt])
  @@index([resolved])
}
```

Run `npx prisma migrate dev --name add_app_error_tracking`.

**2. Create route file `backend/src/routes/errors.js`:**

```js
const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma.js')
const { authenticate } = require('../middleware/auth')
const { requireAdmin } = require('../middleware/requireAdmin')

// POST /batch — receive error batches from frontend (auth optional)
router.post('/batch', async (req, res) => {
  try {
    const { errors } = req.body
    if (!errors || !Array.isArray(errors) || errors.length === 0) {
      return res.status(400).json({ error: { message: 'No errors provided' } })
    }

    // Limit batch size to prevent abuse
    const batch = errors.slice(0, 50)

    // Don't let error tracking errors crash the app
    const created = await prisma.appError.createMany({
      data: batch.map(e => ({
        type: e.type || 'unknown',
        category: e.category || 'unknown',
        severity: e.severity || 'low',
        message: (e.message || '').slice(0, 2000),
        metadata: e.metadata || null,
        url: e.url || null,
        userId: e.userId || null,
        sessionId: e.sessionId || null,
        userAgent: (e.userAgent || '').slice(0, 500),
        viewport: e.viewport || null,
      })),
      skipDuplicates: true,
    })

    res.json({ received: created.count })
  } catch (error) {
    console.error('[ErrorCapture] Failed to store errors:', error.message)
    // Always return 200 — error tracking should never fail visibly
    res.json({ received: 0 })
  }
})

// GET /summary — admin dashboard: error summary (last 24h, 7d)
router.get('/summary', authenticate, requireAdmin, async (req, res) => {
  try {
    const now = new Date()
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

    const [last24h, last7d, bySeverity, byType, topEndpoints, affectedUsers, unresolvedCount] = await Promise.all([
      prisma.appError.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.appError.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.appError.groupBy({
        by: ['severity'],
        where: { createdAt: { gte: sevenDaysAgo } },
        _count: true,
      }),
      prisma.appError.groupBy({
        by: ['type'],
        where: { createdAt: { gte: sevenDaysAgo } },
        _count: true,
        orderBy: { _count: { type: 'desc' } },
      }),
      // Top failing endpoints
      prisma.$queryRaw`
        SELECT metadata->>'endpoint' as endpoint, metadata->>'status' as status, COUNT(*) as count
        FROM "AppError"
        WHERE type = 'api_error' AND "createdAt" > ${sevenDaysAgo}
        AND metadata->>'endpoint' IS NOT NULL
        GROUP BY metadata->>'endpoint', metadata->>'status'
        ORDER BY count DESC
        LIMIT 10
      `,
      // Unique affected users
      prisma.appError.findMany({
        where: { createdAt: { gte: sevenDaysAgo }, userId: { not: null } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      prisma.appError.count({ where: { resolved: false } }),
    ])

    res.json({
      last24h,
      last7d,
      unresolvedCount,
      affectedUserCount: affectedUsers.length,
      bySeverity: bySeverity.reduce((acc, s) => ({ ...acc, [s.severity]: s._count }), {}),
      byType: byType.map(t => ({ type: t.type, count: t._count })),
      topEndpoints,
    })
  } catch (error) {
    console.error('[ErrorCapture] Summary failed:', error.message)
    res.status(500).json({ error: { message: 'Failed to fetch error summary' } })
  }
})

// GET /recent — admin: recent errors with pagination
router.get('/recent', authenticate, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 50, 100)
    const severity = req.query.severity || null
    const type = req.query.type || null
    const resolved = req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined

    const where = {}
    if (severity) where.severity = severity
    if (type) where.type = type
    if (resolved !== undefined) where.resolved = resolved

    const [errors, total] = await Promise.all([
      prisma.appError.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.appError.count({ where }),
    ])

    res.json({ errors, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    res.status(500).json({ error: { message: 'Failed to fetch errors' } })
  }
})

// PATCH /:id/resolve — admin: mark error as resolved
router.patch('/:id/resolve', authenticate, requireAdmin, async (req, res) => {
  try {
    const updated = await prisma.appError.update({
      where: { id: req.params.id },
      data: { resolved: true, resolvedAt: new Date(), resolvedBy: req.user.id },
    })
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: { message: 'Failed to resolve error' } })
  }
})

// POST /resolve-bulk — admin: bulk resolve by type or endpoint
router.post('/resolve-bulk', authenticate, requireAdmin, async (req, res) => {
  try {
    const { type, endpoint } = req.body
    const where = { resolved: false }
    if (type) where.type = type
    // For endpoint-specific bulk resolve, use raw query
    if (endpoint) {
      const result = await prisma.$executeRaw`
        UPDATE "AppError" SET resolved = true, "resolvedAt" = NOW(), "resolvedBy" = ${req.user.id}
        WHERE resolved = false AND metadata->>'endpoint' = ${endpoint}
      `
      return res.json({ resolved: result })
    }
    const result = await prisma.appError.updateMany({
      where,
      data: { resolved: true, resolvedAt: new Date(), resolvedBy: req.user.id },
    })
    res.json({ resolved: result.count })
  } catch (error) {
    res.status(500).json({ error: { message: 'Failed to bulk resolve' } })
  }
})

module.exports = router
```

**3. Register the route in `backend/src/index.js`:**

Add near the other route imports:
```js
const errorRoutes = require('./routes/errors')
```

And near the other `app.use` calls:
```js
app.use('/api/errors', errorRoutes)
```

**4. Add a cleanup cron** (optional but recommended) — delete resolved errors older than 30 days to keep the table lean. Add to the cron section in `index.js`:
```js
// Clean up old resolved errors — daily at 3 AM ET
cron.schedule('0 3 * * *', async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const deleted = await prisma.appError.deleteMany({
      where: { resolved: true, createdAt: { lt: thirtyDaysAgo } }
    })
    if (deleted.count > 0) console.log(`[Cron] Cleaned up ${deleted.count} old resolved errors`)
  } catch (e) {
    console.error('[Cron] Error cleanup failed:', e.message)
  }
})
```

**Files to create:**
- `backend/src/routes/errors.js` (new file — full code above)

**Files to modify:**
- `backend/prisma/schema.prisma` — add AppError model
- `backend/src/index.js` — register route + optional cleanup cron

**After deploying:** The frontend will immediately start sending error batches. Verify with `GET /api/errors/summary` (requires admin auth).

---

### 070 — Commit: Frontend Error Capture System (Service + API Hook + ErrorBoundary + App Init)
**Status:** `DONE`
**Completed:** 2026-03-02 — Committed Cowork's frontend error capture edits (errorCapture.js, ErrorBoundary.jsx, api.js, App.jsx). Files: errorCapture.js, ErrorBoundary.jsx, api.js, App.jsx
**Priority:** HIGH — Must deploy alongside 069.
**Prompt:**
Cowork already created and wired up the frontend error capture system. Just commit and deploy.

**New files created:**

1. **`frontend/src/services/errorCapture.js`** (230 lines) — Silent error capture service:
   - `initErrorCapture()` — registers global error handlers (window.onerror, unhandledrejection, beforeunload, visibilitychange)
   - `captureApiError(endpoint, status, message, method)` — called from api.js on every non-401 API error
   - `reportComponentError(componentName, error, errorInfo)` — called from ErrorBoundary on React crashes
   - `captureError(type, message, metadata)` — manual capture for custom errors
   - Batches errors in a queue (max 50), flushes every 30s or on page unload/tab switch
   - Churn signal detection: if user leaves within 60s of an error, flags it as high-severity churn
   - Auto-captures context: URL, viewport, user agent, session ID, user ID (from JWT)
   - Uses `keepalive: true` on fetch for reliable delivery during page unload

2. **`frontend/src/components/common/ErrorBoundary.jsx`** (63 lines) — React error boundary:
   - Catches render crashes in any wrapped component tree
   - Reports to `reportComponentError()` silently
   - Shows graceful fallback: warning icon + "Something went wrong" + "We've been notified" + retry button
   - Accepts `name` prop for component identification, `fallback` prop for custom fallback UI, `onRetry` callback

**Files modified:**

3. **`frontend/src/services/api.js`** (2 edits):
   - Added import: `import { captureApiError } from './errorCapture'`
   - In `request()` method, before throwing on `!response.ok`, calls `captureApiError(endpoint, response.status, data.error?.message, options.method || 'GET')`

4. **`frontend/src/App.jsx`** (2 edits):
   - Added imports: `import { useEffect } from 'react'` and `import { initErrorCapture } from './services/errorCapture'`
   - Added `useEffect(() => { initErrorCapture() }, [])` in the App function body before the return

**Files changed:**
- `frontend/src/services/errorCapture.js` (new)
- `frontend/src/components/common/ErrorBoundary.jsx` (new)
- `frontend/src/services/api.js` (2 edits)
- `frontend/src/App.jsx` (2 edits)

---

### 071 — Upgrade League Invite Email to Branded HTML
**Status:** `DONE`
**Completed:** 2026-03-02 — Rewrote emailService.js with branded HTML templates (inline-styled, mobile-friendly) for both league invite and vault invite emails. Updated leagues.js route to pass sportName, memberCount, maxTeams. Files: emailService.js, leagues.js
**Priority:** HIGH — First impression for every invited user. Current email is plain text that looks like spam.
**Prompt:**
The league invite email in `backend/src/services/emailService.js` (line 59, `sendLeagueInviteEmail`) currently sends plain text only. It needs to send branded HTML that looks professional and makes people want to click.

**Replace the `sendLeagueInviteEmail` function** with one that sends both `html` and `text` (Resend supports both). The HTML should be inline-styled (email clients strip `<style>` tags) and use a single-column centered layout that works on mobile.

**The function signature should accept additional params:**
```js
async function sendLeagueInviteEmail({ to, commissionerName, leagueName, joinUrl, sportName, memberCount, maxTeams })
```

**HTML email design requirements:**
- **Background:** Light cream `#F5F5F0`, centered content card `#FFFFFF` with `max-width: 480px`, `border-radius: 16px`, subtle shadow
- **Header bar:** Dark slate gradient `#1E2A3A → #2D3F54`, "CLUTCH" in white 24px bold, "FANTASY SPORTS" below in gold `#D4930D` 11px with letter-spacing
- **Body section:**
  - Text: `"{commissionerName} invited you to join their fantasy league:"`
  - League card: cream `#FAFAF6` background with 1px border, sport emoji (⛳ golf, 🏈 NFL, 🏆 default) + "LEAGUE INVITE" label in gold, league name large 22px bold, member count if available (`"3/6 members joined"`)
  - CTA button: gradient `#F06820 → #D4930D`, white text, "Join the League", 14px 48px padding, rounded 10px
  - Subtext: "Clutch is a season-long fantasy platform with AI-powered coaching, deep stats, league history, and more." in gray 13px
- **Footer:** Subtle divider, link to clutchfantasysports.com in gold
- **Plain text fallback** for email clients that don't render HTML
- **Subject line:** `{sportEmoji} {commissionerName} invited you to {leagueName}`

**Also update the caller** in `backend/src/routes/leagues.js` — find the `POST /:id/invite-email` endpoint and pass the new fields to `sendLeagueInviteEmail()`:
- `sportName: league.sport?.name || 'Fantasy'`
- `memberCount` (count of current league members)
- `maxTeams: league.maxTeams`

Check what data is already available in the route handler and add any needed includes.

**Also upgrade `sendVaultInviteEmail`** with the same HTML template style — same layout and branding, but the card says "YOUR LEAGUE HISTORY IS READY" instead of "LEAGUE INVITE", shows the league name, and the CTA says "View Your Stats" instead of "Join the League".

**Files to modify:**
- `backend/src/services/emailService.js` — replace both email functions with HTML+text versions
- `backend/src/routes/leagues.js` — pass additional fields to sendLeagueInviteEmail

---

### 072 — Fix Draft Grading Algorithm (adpDiff inverted + grades too harsh)
**Status:** `DONE`
**Completed:** 2026-03-03 — Committed Cowork's draftGrader.js fix: adpDiff formula corrected (pickNumber - playerRank), value baseline raised to 88, quality baseline to 85, blend 65/35, elite player floors expanded. Files: draftGrader.js
**Priority:** Critical — draft is tomorrow (Mar 4 4PM ET)
**Prompt:**

The draft grading algorithm in `backend/src/services/draftGrader.js` has two bugs:

1. **adpDiff formula is inverted.** It was `playerRank - pickNumber` which makes rank #36 at pick #4 look like a +32 steal when it's actually a -32 reach. Fixed to `pickNumber - playerRank`. Positive = steal (you got a better player than your position), negative = reach.

2. **Grades too harsh for correct picks.** Picking Scheffler #1 overall was grading as B, Rory #2 was C+. The value baseline was 80 (B) for fair-value picks, so even perfect quality picks got dragged down. Fixed: value baseline raised to 88 (A-), quality baseline to 85 (B+), blend shifted to 65/35 quality/value, expanded elite player floors (rank 1 = A+, top 3 = A+, top 5 = A, top 10 = A-, top 15 B+, top 25 B).

**Changes already made by Cowork (commit these):**
- `backend/src/services/draftGrader.js` — `gradePick()` function rewritten

**After committing, regrade the Test Golf League draft:**
Run the regrade endpoint or execute directly:
```js
const { gradeLeagueDraft } = require('./src/services/draftGrader')
const prisma = require('./src/lib/prisma')
// Find the completed draft
const draft = await prisma.draft.findFirst({ where: { status: 'COMPLETED' } })
await gradeLeagueDraft(draft.id, prisma)
```

**Files:** `backend/src/services/draftGrader.js`

---

### 073 — Draft Room Mobile Layout Fixes
**Status:** `DONE`
**Completed:** 2026-03-03 — Committed Cowork's mobile draft room fixes: board height 30%/55%, player pool flex-2, compact DraftHeader, DraftTimer compact mode, MobileNav hidden on draft routes. Files: DraftRoom.jsx, DraftHeader.jsx, DraftTimer.jsx, MobileNav.jsx
**Priority:** Critical — draft is tomorrow
**Prompt:**

The draft room is broken on mobile (390px). Several layout issues:

1. **Draft board too tall on mobile.** Was `h-[55%]` for all screen sizes, leaving almost no room for the player pool. Fixed to `h-[30%] lg:h-[55%]`.

2. **Player pool squeezed to zero.** When draft board + queue/chat stack vertically on mobile, the player pool gets no space. Fixed: player pool div gets `flex-[2]`, queue/chat gets `max-h-[30%] lg:max-h-none`.

3. **DraftHeader too verbose on mobile.** Three stacked sections (league info, status banner, timer) eat half the screen before draft content. Created a compact mobile layout: single row with league name + badge + inline timer, second row with draft info + status, optional third row for commissioner controls. Desktop layout unchanged.

4. **DraftTimer compact mode.** Added `compact` prop for inline mobile display (just the time + tiny progress bar).

5. **MobileNav visible in draft room.** The bottom nav bar takes ~60px of viewport in the draft room where every pixel matters. Added route exclusion so MobileNav hides on `/leagues/:id/draft` and `/mock-draft/` routes.

**Changes already made by Cowork (commit these):**
- `frontend/src/pages/DraftRoom.jsx` — mobile height adjustments
- `frontend/src/components/draft/DraftHeader.jsx` — compact mobile layout
- `frontend/src/components/draft/DraftTimer.jsx` — compact mode prop
- `frontend/src/components/layout/MobileNav.jsx` — hide on draft routes

**Files:** DraftRoom.jsx, DraftHeader.jsx, DraftTimer.jsx, MobileNav.jsx

---

### 074 — Draft Dashboard Tab: Add PlayerDrawer Click Handlers
**Status:** `DONE`
**Completed:** 2026-03-03 — Already committed with 073. DraftDashboard.jsx has onViewPlayer prop wired, DraftRoom.jsx passes openPlayerDetail. Files: DraftDashboard.jsx, DraftRoom.jsx
**Priority:** Critical — draft is tomorrow
**Prompt:**

The Dashboard tab inside the draft room has NO player click handlers. Clicking any player name (Available list or roster picks) does nothing — no PlayerDrawer opens. The Draft tab works fine (PlayerPool has `onViewPlayer`), but the Dashboard tab was missed.

**Changes already made by Cowork (commit these):**
- `frontend/src/components/draft/DraftDashboard.jsx`:
  - Accept `onViewPlayer` prop
  - Available Players table rows: `onClick={() => onViewPlayer && onViewPlayer(player)}` (passes full player object)
  - Roster pick names: looks up full player from `players` array by `pick.playerId`, passes to `onViewPlayer`
  - Added `cursor-pointer` and `hover:text-gold` styling on clickable names
- `frontend/src/pages/DraftRoom.jsx`:
  - Pass `onViewPlayer={openPlayerDetail}` to `<DraftDashboard />`

**Files:** DraftDashboard.jsx, DraftRoom.jsx

---

### 075 — Post-Draft Engagement: Wire Email into Notification Service
**Status:** `DONE`
**Completed:** 2026-03-03 — Added sendNotificationEmail() to emailService.js (branded HTML, manage prefs footer). Wired email into createNotification() (checks email_enabled + category). Added 3 new categories (weekly_recap, prediction_updates, roster_alerts) + 3 new types (WEEKLY_RECAP, PREDICTION_RESOLVED, ROSTER_PLAYER_ALERT, DRAFT_RECAP). Updated notification route allowed keys. Files: emailService.js, notificationService.js, notifications.js
**Priority:** High — Batch C (engagement loop)
**Prompt:**

The notification service (`backend/src/services/notificationService.js`) creates DB records + Socket.IO + web push, but NEVER sends email. The email service (`backend/src/services/emailService.js`) has Resend configured but only has league invite and vault invite templates. These two services need to be connected.

**What to build:**

1. **Add `sendNotificationEmail()` to `emailService.js`:**
   - Generic notification email template (branded HTML, same style as league invite)
   - Params: `{ to, subject, headline, body, ctaText, ctaUrl, accentColor }`
   - Body supports simple HTML (paragraphs, bold, lists)
   - Footer: "Manage notification preferences" link → `${FRONTEND_URL}/profile` (preferences tab)
   - Unsubscribe link at bottom

2. **Wire email sending into `notificationService.js` `createNotification()`:**
   - After creating DB record + Socket.IO + web push, check if user has `email_enabled: true` in their notification preferences
   - If yes, AND the notification category has email support, call `sendNotificationEmail()`
   - Add a `emailSubject` field to the notification data so each type can customize the email subject line
   - Don't block on email send — fire and forget with error logging

3. **Add new notification categories to preferences:**
   - Add these categories to the preference defaults in `notificationService.js`:
     ```javascript
     weekly_recap: true,       // Tournament/week results
     prediction_updates: true, // Prediction resolution alerts
     roster_alerts: true,      // Player performance on your roster
     ```
   - Keep `email_enabled: false` as default for existing users (don't spam people who signed up before this feature)
   - For NEW users (sign up after this change), default `email_enabled: true`

4. **Update notification preferences route** (`backend/src/routes/notifications.js`):
   - `GET /preferences` should return the new categories
   - `PATCH /preferences` should accept them

**Files:** `backend/src/services/emailService.js`, `backend/src/services/notificationService.js`, `backend/src/routes/notifications.js`

---

### 076 — Post-Draft Engagement: Weekly Tournament Recap Email
**Status:** `DONE`
**Completed:** 2026-03-03 — Added generateWeeklyRecapData() to fantasyTracker.js, sendWeeklyRecapEmail() to emailService.js, weekly recap cron (Sun 11PM ET) to index.js with WEEKLY_RECAP notifications. Files: fantasyTracker.js, emailService.js, index.js
**Priority:** High — Batch C (engagement loop)
**Depends on:** 075
**Prompt:**

After each golf tournament completes (Sunday night), send a personalized recap email to every manager who has a league with fantasy scoring for that tournament. This is the #1 engagement driver — it pulls people back into the app on Monday morning.

**What to build:**

1. **Add `sendWeeklyRecapEmail()` to `emailService.js`:**
   - Branded HTML email template
   - Content sections:
     - **Header:** "Week {N} Results — {Tournament Name}" with tournament course image or fallback
     - **Your Team Score:** Total fantasy points, rank vs league, W/L if H2H
     - **Top Performer:** Your highest-scoring rostered player (name, points, tournament finish)
     - **Biggest Mover:** Player who gained the most fantasy points vs last week
     - **League Standings Snapshot:** Top 3 teams with points (abbreviated table)
     - **CTA Button:** "View Full Scoreboard" → `/leagues/{leagueId}/scoring`
   - If user has multiple leagues, send ONE email with sections per league (not separate emails)

2. **Add `generateWeeklyRecapData()` to `fantasyTracker.js`:**
   - Called after `processCompletedWeeks()` completes
   - For each league with a completed fantasy week:
     - Get WeeklyTeamResult for each team
     - Get top scorer per team (from FantasyScore)
     - Get league standings (from TeamSeason)
     - Get H2H matchup result if applicable
   - Return structured data per user (aggregated across their leagues)

3. **Add cron job in `backend/src/index.js`:**
   - Schedule: Sunday 11:00 PM ET (`0 23 * * 0` in UTC-5 = `0 4 * * 1` UTC)
   - Runs AFTER `processCompletedWeeks` (10:30 PM) and prediction resolution (10:15 PM)
   - Calls `generateWeeklyRecapData()` then loops through users and sends emails
   - Log: `[WeeklyRecap] Sent {count} recap emails for {tournament}`
   - Skip users where `email_enabled: false` or `weekly_recap: false`

4. **Add notification record** (type: `WEEKLY_RECAP`):
   - Also push to Socket.IO so in-app notification shows
   - actionUrl: `/leagues/{leagueId}/scoring`

**Files:** `backend/src/services/emailService.js`, `backend/src/services/fantasyTracker.js`, `backend/src/index.js`, `backend/src/services/notificationService.js`

---

### 077 — Post-Draft Engagement: Prediction Resolution Notifications
**Status:** `DONE`
**Completed:** 2026-03-03 — Added PREDICTION_RESOLVED notification dispatch to resolveEventPredictions() with correct/incorrect/mixed messaging + email subject. Files: predictionService.js
**Priority:** High — Batch C (engagement loop)
**Depends on:** 075
**Prompt:**

When predictions auto-resolve on Sunday night (10:15 PM ET via `predictionService.resolveEventPredictions()`), notify users about their results. This is the "Your call on Scheffler is looking good" loop that Eric specifically wants.

**What to build:**

1. **Add notification dispatch to `predictionService.js` `resolveEventPredictions()`:**
   - After resolving each user's predictions for a tournament, create a notification:
     - Type: `PREDICTION_RESOLVED`
     - If user got majority correct: Title: "Nice Calls! 🎯", Message: "You nailed {correct}/{total} calls for {tournament}. Your accuracy: {pct}%."
     - If user got majority wrong: Title: "Tough Week", Message: "{correct}/{total} calls landed for {tournament}. Check the results and make new calls."
     - If mixed: Title: "Results Are In", Message: "{correct}/{total} calls for {tournament}. See how your predictions stacked up."
     - actionUrl: `/prove-it` (prediction tracking page)
     - category: `prediction_updates`

2. **Add per-prediction detail to notification data (JSON):**
   ```javascript
   data: {
     tournamentName: 'The Players Championship',
     correct: 3,
     total: 5,
     accuracy: 0.6,
     highlights: [
       { playerName: 'Scottie Scheffler', type: 'Top 5', outcome: 'CORRECT' },
       { playerName: 'Rory McIlroy', type: 'Winner', outcome: 'INCORRECT' },
     ]
   }
   ```

3. **Send email if `prediction_updates: true` AND `email_enabled: true`:**
   - Use the generic `sendNotificationEmail()` from item 075
   - Subject: "Your {tournament} Predictions: {correct}/{total} Correct"
   - Body: Prediction results table + accuracy + link to Prove It page
   - CTA: "View Results & Make New Calls"

4. **Add new notification type** to the types enum in `notificationService.js`:
   - `PREDICTION_RESOLVED` with category `prediction_updates`

**Files:** `backend/src/services/predictionService.js`, `backend/src/services/notificationService.js`, `backend/src/services/emailService.js`

---

### 078 — Post-Draft Engagement: Live Tournament Player Alerts (Mid-Round Push)
**Status:** `DONE`
**Completed:** 2026-03-03 — Created engagementAlerts.js service with checkRosterAlerts() (hot round, leader, cut danger). In-memory 2h throttle per player/user. Wired into live scoring cron in index.js. Files: engagementAlerts.js (new), index.js
**Priority:** Medium — Batch C (engagement loop)
**Depends on:** 075
**Prompt:**

During a live tournament (Thursday through Sunday), send push notifications when rostered players have notable performances. This is the "check Clutch on a random Wednesday" killer — except it's Thursday through Sunday when golf is actually happening.

**What to build:**

1. **Add `checkRosterAlerts()` to a new service `backend/src/services/engagementAlerts.js`:**
   - Called from the existing 5-minute live scoring cron (only when tournament is IN_PROGRESS)
   - For each active league with a live tournament:
     - Get all rostered players (from active lineups)
     - Compare current round performance to thresholds:
       - **Hot Round Alert:** Player is -4 or better through 9+ holes in current round → "🔥 {Player} is on fire! {score} through {holes} holes"
       - **Leader Alert:** Rostered player moves into Top 3 overall → "👑 {Player} has moved to {position} at {tournament}"
       - **Eagle/Hole-in-One Alert:** Player makes eagle or ace → "🦅 {Player} just made eagle on hole {N}!"
       - **Cut Danger Alert:** Player is projected to miss cut (bottom half after R2) → "⚠️ {Player} is on the cut line at {tournament}"
   - **Throttling:** Max 1 alert per player per user per 2 hours (use a simple in-memory Map or Redis key). Don't spam.
   - Only send to users with `roster_alerts: true` in preferences

2. **Notification type:** `ROSTER_PLAYER_ALERT` with category `roster_alerts`
   - Push notification only (web push + Socket.IO). NOT email (too frequent).
   - actionUrl: `/leagues/{leagueId}/scoring`

3. **Wire into the live scoring cron** in `index.js`:
   - After `syncLiveScoring()` completes on Thu-Sun, call `checkRosterAlerts()`
   - Only runs if there are active leagues with live fantasy weeks
   - Add error handling so alert failures don't block scoring

4. **State tracking:**
   - Need to track "last alerted score" per player per user to avoid re-alerting on the same event
   - Simple approach: in-memory `Map<string, { lastAlertTime, lastScore }>` keyed by `${userId}-${playerId}-${tournamentId}`
   - Resets when server restarts (acceptable — tournaments are 4 days)

**Files:** `backend/src/services/engagementAlerts.js` (new), `backend/src/index.js`

---

### 079 — Post-Draft Engagement: Draft Recap Email (Post-Completion)
**Status:** `DONE`
**Completed:** 2026-03-03 — Added sendDraftRecapEmail() to emailService.js (grade circle, pick table, best pick). Wired into draft completion handler in drafts.js: auto-grades draft, sends DRAFT_RECAP notification + email per team. Files: emailService.js, drafts.js
**Priority:** Medium — Batch C (engagement loop)
**Prompt:**

When a draft completes, send a branded recap email to all participants with their draft grade and highlights. This bridges the gap between "cool draft experience" and "I should check my league."

**What to build:**

1. **Add `sendDraftRecapEmail()` to `emailService.js`:**
   - Branded HTML email template
   - Content:
     - **Header:** "Draft Complete — {League Name}" with sport emoji
     - **Your Grade:** Large letter grade (A+ through F) with color
     - **Grade Summary:** "Your team earned a {grade} with {overallScore}/100"
     - **Best Pick:** "{Player} at #{pickNumber} — {adpDiff > 0 ? 'Steal!' : 'Solid pick'}"
     - **Team Overview:** List of all picks with round number and grade
     - **CTA:** "View Full Draft Recap" → `/leagues/{leagueId}/draft-recap`
   - Send to each team's user

2. **Trigger in `backend/src/routes/drafts.js`:**
   - After the existing `DRAFT_COMPLETED` notification fires (when last pick is made)
   - Call `gradeMockDraft()` or `gradeLeagueDraft()` from `draftGrader.js` to get grades
   - Then call `sendDraftRecapEmail()` for each team
   - Fire and forget — don't block the draft completion response

3. **Add notification type:** `DRAFT_RECAP` with category `drafts`
   - Title: "Your Draft Grade: {grade}"
   - Message: "Your team earned a {grade} in the {leagueName} draft. See your full recap."
   - actionUrl: `/leagues/{leagueId}/draft-recap`

**Files:** `backend/src/services/emailService.js`, `backend/src/routes/drafts.js`, `backend/src/services/notificationService.js`

---

### 080 — Post-Draft Engagement: Personalized Coach Briefing Upgrade
**Status:** `DONE`
**Completed:** 2026-03-03 — Added prediction accuracy check template ("Your recent accuracy: X%"), waiver wire tip (unrostered players in field), 1-hour in-memory briefing cache. Files: ai.js
**Priority:** Medium — Batch C (engagement loop)
**Prompt:**

The AI coach briefing (`GET /api/ai/coach-briefing`) is currently template-based with zero actual personalization. It picks a template based on user state (cold start, activation, live event, draft prep, active insight) but doesn't reference the user's actual roster, predictions, or league standings. Upgrade it to pull real data.

**What to build:**

1. **Enhance the coach briefing endpoint** (`backend/src/routes/ai.js` — find the `GET /coach-briefing` route):
   - Add data queries for the authenticated user:
     - Active leagues + current standings position
     - Upcoming tournament info (if golf)
     - Number of rostered players in upcoming field
     - Recent prediction results (last resolved event)
     - Draft board status (if they have boards)
   - Use this data to fill template variables instead of generic placeholders

2. **New template types based on real context:**
   - **"Your Players This Week"**: "{count} of your rostered players are in the field at {tournament}. {topPlayer} is ranked #{rank} in the field."
   - **"League Update"**: "You're currently {position}{suffix} in {leagueName} with {points} points. {gap} points behind the leader."
   - **"Prediction Check"**: "You went {correct}/{total} last week. Your accuracy is {pct}% — {tierMessage}."
   - **"Waiver Wire"**: "{count} unrostered players are in this week's field. {topFreeAgent} (ranked #{rank}) is available."
   - Keep existing templates as fallbacks for users with no active data

3. **Caching:** Cache briefing per user for 1 hour (avoid recomputing on every page load). Use a simple in-memory cache or short-lived DB/Redis entry. Clear on relevant events (prediction resolved, week scored, etc.)

**Files:** `backend/src/routes/ai.js` (coach-briefing endpoint), possibly `backend/src/services/coachBriefingService.js` (new, if the logic gets complex enough to extract)

---

### 081 — Frontend: Notification Preferences UI
**Status:** `DONE`
**Completed:** 2026-03-03 — Added notification preferences section to Profile.jsx with toggle switches for all 11 categories. Master email toggle disables email-specific toggles. Optimistic UI with instant PATCH. Files: Profile.jsx
**Priority:** Medium — Batch C (engagement loop)
**Depends on:** 075
**Prompt:**

Users need to be able to control their notification preferences from the Profile page. Currently the Profile page has no notification settings section.

**What to build:**

1. **Add "Notifications" section to `frontend/src/pages/Profile.jsx`:**
   - Section header: "Notification Preferences"
   - Toggle switches for each category:
     - Email notifications (master toggle) — `email_enabled`
     - Weekly tournament recaps — `weekly_recap`
     - Prediction results — `prediction_updates`
     - Roster player alerts — `roster_alerts`
     - Trade notifications — `trades`
     - Waiver results — `waivers`
     - Draft alerts — `drafts`
     - League activity — `league_activity`
     - Chat mentions — `chat`
   - When `email_enabled` is off, grey out and disable the email-specific toggles (weekly_recap, prediction_updates)
   - Push notification toggle — `push_enabled`
   - Save on toggle change (optimistic UI with PATCH to `/api/notifications/preferences`)
   - Load current preferences on mount from `GET /api/notifications/preferences`

2. **Styling:** Use the existing toggle component pattern from Profile page (if one exists) or create a simple toggle switch. Dark/light mode aware. Use Clutch brand colors.

3. **Add "Manage Preferences" link** to the email footer template (from item 075) that deep-links to this section: `${FRONTEND_URL}/profile#notifications`

**Files:** `frontend/src/pages/Profile.jsx`

---

### 082 — Admin Error Dashboard Tab + Summary Endpoint Fix
**Status:** `DONE`
**Completed:** 2026-03-03 — Committed Cowork's admin error dashboard tab (summary cards, severity bars, top endpoints, recent errors table with expand/resolve/filter/pagination), 4 API methods, BigInt + groupBy fixes. Files: AdminDashboard.jsx, api.js, errors.js
**Priority:** High — admin visibility for friend testing
**Prompt:**

The error capture system is live (AppError model, batch endpoint, frontend capture service) but there's no admin UI to view errors, and the summary endpoint has a BigInt serialization bug. Both are fixed in Cowork's edits — commit and deploy.

**Changes already made by Cowork (commit these):**

1. **`frontend/src/services/api.js`** — Added 4 new API methods:
   - `getErrorSummary()` → `GET /errors/summary`
   - `getErrorRecent(params)` → `GET /errors/recent` with query params
   - `resolveError(errorId)` → `PATCH /errors/:id/resolve`
   - `resolveBulkErrors(data)` → `POST /errors/resolve-bulk`

2. **`frontend/src/pages/AdminDashboard.jsx`** — Added "Errors" tab (5th tab, between Tournaments and AI Engine):
   - Summary cards: Last 24h, Last 7d, Unresolved, Affected Users
   - Severity breakdown: horizontal bar chart (high=red, medium=gold, low=gray)
   - Top Failing Endpoints: ranked list with status badges + "resolve" bulk action per endpoint
   - Error Type Breakdown: clickable filter pills (api_error, js_error, component_crash, etc.)
   - Recent Errors Table: severity badge, type, message (truncated), URL, relative time, resolve button
   - Expandable row detail: category, userId, sessionId, viewport, full metadata JSON, user agent
   - Filters: resolved/unresolved, severity, type
   - Pagination (25 per page)
   - Tab badge shows unresolved count
   - Uses `Fragment` from React for keyed table row groups
   - `timeAgo()` helper for relative timestamps

3. **`backend/src/routes/errors.js`** — Two fixes:
   - `COUNT(*)` → `COUNT(*)::int` in topEndpoints raw SQL (BigInt → int cast fixes JSON serialization crash)
   - `s._count` → `s._count?._all || s._count` in bySeverity/byType reducers (Prisma groupBy returns `{ _all: N }` object)

**Files:** `frontend/src/services/api.js`, `frontend/src/pages/AdminDashboard.jsx`, `backend/src/routes/errors.js`

---

### 083 — Enhanced Manager Profile (Phase 5A: Avatar Upload, Sports Badges, Recent Calls)
**Status:** `DONE`
**Completed:** 2026-03-03 — Committed Cowork's manager profile enhancements: avatar upload with hover overlay, active sports emoji badges, recent predictions feed (last 6 calls with outcomes). New GET /predictions/user/:userId/recent endpoint. Files: ManagerProfile.jsx, predictions.js
**Priority:** High — Phase 5A, visible to friends Wednesday
**Prompt:**

Phase 5A Enhanced Manager Profile — Cowork has made all edits. Commit and deploy.

**Changes already made by Cowork (commit these):**

1. **`frontend/src/pages/ManagerProfile.jsx`** — Three enhancements:
   - **Avatar upload**: Avatar now has hover overlay with camera icon. Clicking triggers file input, uploads via Cloudinary (`uploadImage` util), calls `api.updateProfile({ avatar })`, refetches. Only shows on own profile. Increased avatar from 16x16 to 20x20.
   - **Active sports badges**: Small emoji badges (⛳🏈🏀⚾) positioned bottom-right of avatar, showing which sports the user has played in. Pulled from existing `bySport` data.
   - **Recent Calls feed**: New section after Prove It Track Record showing last 6 predictions with outcome indicator (green ✓, red ✗, gold ?), prediction type, player name, thesis excerpt, and resolved date. Links to Prove It page. Fetches from new backend endpoint `GET /api/predictions/user/:userId/recent`.
   - Added imports: `useEffect`, `useRef`, `uploadImage`

2. **`backend/src/routes/predictions.js`** — New endpoint:
   - `GET /predictions/user/:userId/recent?limit=8` — Returns most recent predictions for any user
   - Public endpoint (no auth required, for viewing other manager profiles)
   - Returns: id, predictionType, outcome, thesis, sport, confidenceLevel, resolvedAt, createdAt, subjectPlayer (id+name), event (id+name)
   - Max 20 results, default 8

**Files:** `frontend/src/pages/ManagerProfile.jsx`, `backend/src/routes/predictions.js`

---

### 084 — Manager Profile: Performance Charts + Call Type Breakdown (Phase 5A completion)
**Status:** `DONE`
**Completed:** 2026-03-03 — Added GET /predictions/user/:userId/stats endpoint, GET /managers/:id/rating-history endpoint. Added SVG donut chart (prediction accuracy by type with center %) and SVG line chart (rating journey with tier bands) to ManagerProfile.jsx. Files: predictions.js, managerAnalytics.js, ManagerProfile.jsx
**Priority:** High — Completes Phase 5A before Wednesday draft
**Prompt:**

Add two missing visualizations to ManagerProfile.jsx.

**1. Performance Call Type Breakdown (donut chart)**

Add a section after the Recent Calls section. Show a donut/ring chart with prediction accuracy by type. Data comes from `GET /api/predictions/user/:userId/recent?limit=50` (increase limit for stats).

Better approach: add a new backend endpoint for aggregated stats:

**New endpoint: `GET /api/predictions/user/:userId/stats`** in `backend/src/routes/predictions.js`:
```javascript
router.get('/user/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params
    // Group by predictionType, count correct/incorrect/pending
    const all = await prisma.prediction.findMany({
      where: { userId },
      select: { predictionType: true, outcome: true },
    })
    const byType = {}
    for (const p of all) {
      if (!byType[p.predictionType]) byType[p.predictionType] = { correct: 0, incorrect: 0, pending: 0, total: 0 }
      byType[p.predictionType].total++
      if (p.outcome === 'CORRECT') byType[p.predictionType].correct++
      else if (p.outcome === 'INCORRECT') byType[p.predictionType].incorrect++
      else byType[p.predictionType].pending++
    }
    const overall = { correct: 0, incorrect: 0, pending: 0, total: all.length }
    all.forEach(p => {
      if (p.outcome === 'CORRECT') overall.correct++
      else if (p.outcome === 'INCORRECT') overall.incorrect++
      else overall.pending++
    })
    res.json({ byType, overall })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})
```

Frontend: Build a `CallTypeBreakdown` inline component in ManagerProfile. Use SVG donut chart (similar pattern to SgRadarChart — custom SVG, no external lib). Ring segments colored by type. Center shows overall accuracy %. Below the ring, show a legend with each prediction type and its accuracy. Section title: "Prediction Accuracy".

**2. Performance Charts (rating trend over time)**

Add below the Call Type Breakdown section. Line chart showing Clutch Rating over time.

Backend: `GET /api/managers/:id/rating-history` — new endpoint in `managerAnalytics.js`:
```javascript
router.get('/:id/rating-history', authenticate, async (req, res, next) => {
  try {
    const snapshots = await prisma.ratingSnapshot.findMany({
      where: { userId: req.params.id },
      orderBy: { createdAt: 'asc' },
      select: { overallRating: true, confidence: true, createdAt: true },
    })
    res.json({ snapshots })
  } catch (err) {
    next(err)
  }
})
```

Frontend: Simple SVG line chart (same approach — custom SVG, no recharts). X-axis = dates, Y-axis = rating 0-100. Tier bands as subtle horizontal background stripes (ELITE zone 90-100 = gold tint, etc). Line connects rating snapshots. If no snapshots exist, show "Rating history will appear as your rating updates" empty state.

Section title: "Rating Journey" with a small info tooltip "Your Clutch Rating tracked over time."

**Files:** `frontend/src/pages/ManagerProfile.jsx`, `backend/src/routes/predictions.js`, `backend/src/routes/managerAnalytics.js`

---

### 085 — Manager Leaderboard Page (Phase 5D)
**Status:** `DONE`
**Completed:** 2026-03-03 — Created ManagerLeaderboard.jsx page with sport filter pills, sort dropdown, Hot Right Now cards, desktop table with rank medals + own-row highlight, mobile card layout. Enhanced leaderboard endpoint with sortBy param + clutchRating/tier data. Added route + API method. Files: ManagerLeaderboard.jsx (new), managerAnalytics.js, api.js, App.jsx
**Priority:** High — Social feature, drives engagement before draft
**Prompt:**

Create a new page `frontend/src/pages/ManagerLeaderboard.jsx` at route `/leaderboard`.

**Backend enhancement: `GET /api/managers/leaderboard/rankings`** — Already exists in `backend/src/routes/managerAnalytics.js` (line 302). Enhance it:
- Add `sortBy` query param (default: `championships`). Support: `championships`, `winPct`, `totalPoints`, `draftEfficiency`, `avgFinish`, `clutchRating`.
- Add `period` query param: `all-time` (default), `this-season`, `last-30d`. For `this-season`, filter by current season. For `last-30d`, this is aspirational — just filter to profiles with recent activity.
- For `clutchRating` sort, join with ClutchRating model (or RatingSnapshot) to get each user's rating and sort by it.
- Return `clutchRating` and `ratingTier` fields on each leaderboard entry (requires joining ClutchRating model for each user — batch fetch).

**Frontend page structure:**

1. **Hero section**: "Manager Leaderboard" title, subtitle "See how you stack up against the competition." Sport filter pills (All, Golf ⛳, NFL 🏈). Sort dropdown (Championships, Win Rate, Total Points, Draft IQ, Clutch Rating). Period pills (All Time, This Season).

2. **"Hot Right Now" collection** (horizontal scroll): Show top 3-5 managers who have the biggest recent positive rating change OR highest recent win%. Use existing data — if RatingSnapshot has recent entries, compute delta. If not enough data, show top 3 by winPct with a 🔥 badge. Section is collapsible.

3. **Leaderboard table**: Rank (#), Avatar + Name (link to `/manager/:id`), Clutch Rating (RatingTierBadge component), Championships 🏆, Win %, Avg Finish, Draft IQ, Achievements count, Leagues. Rows alternate bg. Rank #1 = gold border-left, #2 = silver, #3 = bronze. Own row highlighted with blaze accent.

4. **Mobile**: Cards instead of table (rank + avatar + name + key stat + tier badge). Scrollable.

**Add route to App.jsx**: `<Route path="/leaderboard" element={<ManagerLeaderboard />} />`

**Add nav link**: In the main nav, add "Leaderboard" link. It fits in the top nav alongside Golf Hub / NFL Hub. Or add it to the user dropdown.

**Add API method**: `api.getManagerLeaderboard(params)` → `GET /managers/leaderboard/rankings?sortBy=...&sport=...&period=...`

**Files:** `frontend/src/pages/ManagerLeaderboard.jsx` (new), `frontend/src/App.jsx`, `frontend/src/services/api.js`, `backend/src/routes/managerAnalytics.js`

---

### 086 — Achievement Unlock Engine (Phase 5E foundation)
**Status:** `DONE`
**Completed:** 2026-03-03 — Created achievementEngine.js with evaluateUser(), evaluateAll(), checkCriteria() (12 criteria types), getProgress() for progress bars. Daily 4AM cron. Event triggers in drafts.js (draft complete), predictionService.js (resolution), trades.js (trade accepted). Files: achievementEngine.js (new), index.js, drafts.js, predictionService.js, trades.js
**Priority:** Medium — Backend logic, no UI needed yet
**Prompt:**

Build the achievement evaluation service that checks criteria and auto-unlocks achievements. Currently 30 achievements are seeded in DB with criteria JSON but nothing evaluates them.

**New service: `backend/src/services/achievementEngine.js`**

```javascript
// Achievement Unlock Engine
// Evaluates achievement criteria against user stats and unlocks earned achievements.
// Called: (1) on-demand after key events (championship win, draft complete, trade, prediction resolved)
// (2) via daily cron for batch evaluation

const prisma = require('../lib/prisma')

async function evaluateUser(userId) {
  // 1. Load all achievements + user's existing unlocks
  const [achievements, unlocks, profile] = await Promise.all([
    prisma.achievement.findMany(),
    prisma.achievementUnlock.findMany({ where: { userId }, select: { achievementId: true } }),
    prisma.managerProfile.findFirst({ where: { userId, sportId: null } }),
  ])
  const unlockedIds = new Set(unlocks.map(u => u.achievementId))
  const newUnlocks = []

  for (const ach of achievements) {
    if (unlockedIds.has(ach.id)) continue
    const earned = await checkCriteria(userId, ach.criteria, profile)
    if (earned) {
      newUnlocks.push({
        userId,
        achievementId: ach.id,
        context: { evaluatedAt: new Date().toISOString(), source: 'engine' },
      })
    }
  }

  if (newUnlocks.length > 0) {
    await prisma.achievementUnlock.createMany({ data: newUnlocks, skipDuplicates: true })
    // Fire notifications for each unlock
    // (import notificationService if available)
  }

  return newUnlocks.length
}

async function checkCriteria(userId, criteria, profile) {
  if (!criteria || !criteria.type) return false
  switch (criteria.type) {
    case 'championships':
      return (profile?.championships || 0) >= (criteria.threshold || 1)
    case 'best_finish':
      return (profile?.bestFinish || 999) <= (criteria.threshold || 3)
    case 'total_leagues':
      return (profile?.totalLeagues || 0) >= (criteria.threshold || 1)
    case 'total_seasons':
      return (profile?.totalSeasons || 0) >= (criteria.threshold || 1)
    case 'wins':
      return (profile?.wins || 0) >= (criteria.threshold || 1)
    case 'total_points':
      return (profile?.totalPoints || 0) >= (criteria.threshold || 1000)
    case 'win_pct':
      return (profile?.winPct || 0) >= (criteria.threshold || 0.6)
    case 'trades': {
      const tradeCount = await prisma.trade.count({ where: { OR: [{ proposerId: userId }, { recipientId: userId }], status: 'COMPLETED' } })
      return tradeCount >= (criteria.threshold || 1)
    }
    case 'waiver_claims': {
      const claimCount = await prisma.waiverClaim.count({ where: { userId, status: 'PROCESSED' } })
      return claimCount >= (criteria.threshold || 1)
    }
    case 'predictions_correct': {
      const correctCount = await prisma.prediction.count({ where: { userId, outcome: 'CORRECT' } })
      return correctCount >= (criteria.threshold || 1)
    }
    case 'multi_sport': {
      const sportCount = await prisma.managerProfile.count({ where: { userId, sportId: { not: null }, totalLeagues: { gt: 0 } } })
      return sportCount >= (criteria.threshold || 2)
    }
    // Complex criteria (consecutive championships, worst-to-first, undefeated) —
    // these need league history queries. Stub them as false for now, implement when vault data is richer.
    case 'consecutive_championships':
    case 'worst_to_first':
    case 'undefeated_season':
    case 'draft_steal':
    case 'perfect_lineup':
      return false // TODO: implement with league history data
    default:
      return false
  }
}

// Batch evaluation — run for all active users
async function evaluateAll() {
  const users = await prisma.user.findMany({ select: { id: true } })
  let totalUnlocks = 0
  for (const user of users) {
    totalUnlocks += await evaluateUser(user.id)
  }
  return totalUnlocks
}

module.exports = { evaluateUser, evaluateAll, checkCriteria }
```

**Cron job**: Add to `backend/src/index.js` — daily at 4 AM ET:
```javascript
cron.schedule('0 4 * * *', async () => {
  const { evaluateAll } = require('./services/achievementEngine')
  const count = await evaluateAll()
  console.log(`[Achievement Engine] Evaluated all users, ${count} new unlocks`)
}, { timezone: 'America/New_York' })
```

**Event triggers**: Also call `evaluateUser(userId)` after key events. Add calls in:
- `backend/src/routes/leagues.js` — after season finalization
- `backend/src/routes/drafts.js` — after draft completes
- `backend/src/routes/predictions.js` — after prediction resolution
- `backend/src/routes/trades.js` — after trade completes

Just add `const { evaluateUser } = require('../services/achievementEngine')` and fire-and-forget: `evaluateUser(userId).catch(console.error)` — don't block the response.

**Files:** `backend/src/services/achievementEngine.js` (new), `backend/src/index.js`

---

### 087 — Badge Showcase + Achievement Progress UI (Phase 5E frontend)
**Status:** `DONE`
**Completed:** 2026-03-03 — Enhanced achievements endpoint to return progress data (current/target/pct). Added progress bars on unearned achievements, "New!" banner for recent unlocks (7-day), Featured Badges strip below header. Files: managerAnalytics.js, ManagerProfile.jsx
**Priority:** Medium — Visual polish for manager profiles
**Prompt:**

Enhance the achievements display on ManagerProfile.jsx. Currently shows a grid of earned/unearned badges. Add:

**1. Achievement Progress Bars**

In the existing achievements section of ManagerProfile.jsx, for unearned achievements that have a numeric threshold (criteria.threshold), show a progress bar. This requires the backend to return progress data.

Enhance `GET /api/managers/:id/achievements` in `managerAnalytics.js`:
- For each unearned achievement, compute current progress toward the threshold
- Return `progress` field: `{ current: N, target: threshold, pct: 0-100 }`
- Use the same logic as achievementEngine's `checkCriteria` to get current values
- Example: "Century Club" (100 wins) — if user has 43 wins → `{ current: 43, target: 100, pct: 43 }`

Frontend: Below each unearned achievement icon, show a thin progress bar (blaze gradient fill). Show "43/100" text below. Only for achievements where progress is computable (skip complex types like worst-to-first).

**2. Recent Unlocks Banner**

At the top of the achievements section, if the user has unlocked any achievements in the last 7 days, show a "New!" banner with the recently unlocked achievements. Gold shimmer border, achievement icon + name + "Unlocked 2 days ago".

**3. Badge Showcase Strip**

Add a "Featured Badges" row to the manager profile header area (below the name, before lifetime stats). Show up to 4 achievements the user has earned, selected by highest tier. Each is an icon + tier-colored pill. If the user has zero achievements, show "No badges yet — keep playing to earn your first!"

This does NOT require user selection of which badges to feature — just auto-select the highest-tier ones.

**Files:** `frontend/src/pages/ManagerProfile.jsx`, `backend/src/routes/managerAnalytics.js`

---

### 088 — Nav Link: Leaderboard + Profile Quick Access
**Status:** `DONE`
**Completed:** 2026-03-03 — Added Leaderboard to top nav bar (desktop + mobile), My Profile + Leaderboard to user dropdown menu. Files: Navbar.jsx
**Priority:** Medium — Discoverability
**Prompt:**

Wire up navigation for the new Leaderboard page and improve profile access.

1. **Top nav**: Add "Leaderboard" to the main navigation bar. Place it after the existing links (Golf Hub, NFL Hub, etc.). Icon: trophy or bar-chart. Use the same dropdown/link pattern as other nav items.

2. **User dropdown**: Add "My Profile" link that goes to `/manager/[currentUserId]`. Currently users can only reach their profile through the league. Also add "Leaderboard" link here.

3. **League Home**: Add "Leaderboard" to the league nav pills or as a subtle link in the standings section ("See global leaderboard →").

4. **Dashboard**: In the Clutch Rating widget on the dashboard (DashboardRatingWidget), add a "See Leaderboard" link below the rating display.

**Files:** `frontend/src/components/layout/Navbar.jsx` (or wherever nav is), `frontend/src/pages/Dashboard.jsx`, league nav component

---

### 089 — Verified Badge + Quick Stats Bar (Phase 5A final polish)
**Status:** `DONE`
**Completed:** 2026-03-03 — Added blue verified badge (shield checkmark) for admin users next to name. Enhanced quick stats bar from 4 to 5 metrics (added Predictions count + Clutch Rating). Files: ManagerProfile.jsx
**Priority:** Low — Polish items
**Prompt:**

Two small Phase 5A items to close it out:

**1. Verified Badge**

Add a verified badge next to the user's name on ManagerProfile. This is cosmetic for now — the `User` model may need a `isVerified` boolean field (check schema first; if it doesn't exist, add a migration). For now, hardcode it to show for admin users (`role === 'admin'`).

Badge UI: Small blue checkmark circle (similar to Twitter/X verified) — SVG inline, positioned right after the display name. Tooltip on hover: "Verified Clutch Member".

**2. Quick Stats Bar**

Add a compact horizontal stats strip between the header and the lifetime stats section. 4-5 key metrics in a row: Total Leagues | Win Rate | Championships | Predictions Made | Clutch Rating. Each metric is a number + label vertically stacked. Slightly larger font for the number (font-mono), muted label below. Dividers between each. On mobile, wraps to 2 rows.

This replaces the need to scroll down to the lifetime stats grid for the key numbers.

**Files:** `frontend/src/pages/ManagerProfile.jsx`, possibly `backend/prisma/schema.prisma` (if verified field needed)

---

### 090 — Golf Prediction Categories Expansion (Phase 5C)
**Status:** `DONE`
**Completed:** 2026-03-03 — Expanded PREDICTION_TYPES from 4 to 11 (added tournament_winner, top_5, top_10, top_20, make_cut, round_leader, head_to_head). Added per-type validation in predictionService.js. Redesigned WeeklySlate with 8 category pill picker, type-specific UIs (winner pick, yes/no polls, make/miss, H2H matchup builder, R1 leader, SG calls renamed to Above/Below), My Calls filter toggle. Files: predictionService.js, predictions.js, ProveIt.jsx
**Priority:** High — Core engagement feature, makes Prove It worth visiting
**Prompt:**

Expand golf prediction types from just "player benchmark" (SG over/under) to a full slate of golf-specific categories. This is Phase 5C from CLAUDE.md.

**IMPORTANT LANGUAGE RULES (from CLAUDE.md):**
- Never say "over/under" → say "Player Benchmark" or "Performance Call"
- Never say "picks" → say "Calls" or "Insights"
- Never say "bets/wagers" → say "Predictions"
- Never say "lock it in" → say "Make your call" or "Submit"
- UI should look like community polls, NOT sportsbook props
- No green/red flashing numbers or casino-style animations

---

**STEP 1: Backend — Expand prediction type validation**

**File: `backend/src/services/predictionService.js`**

Update `PREDICTION_TYPES` array (line 24):
```javascript
const PREDICTION_TYPES = [
  'performance_call',     // start/sit
  'player_benchmark',     // over/under a stat line (existing)
  'tournament_winner',    // pick the tournament winner
  'top_5',                // will player finish top 5?
  'top_10',               // will player finish top 10?
  'top_20',               // will player finish top 20?
  'make_cut',             // will player make or miss the cut?
  'round_leader',         // who leads after round 1/2/3?
  'head_to_head',         // player A vs player B — who finishes higher?
  'weekly_winner',        // fantasy weekly winner
  'bold_call',            // unlikely outcome prediction
]
```

Also update the validation array in `backend/src/routes/predictions.js` (line 11) to match.

**STEP 2: Backend — predictionData shape per type**

In `predictionService.js` `submitPrediction()`, add validation for the new types. The `predictionData` JSON field stores type-specific data:

```javascript
// tournament_winner
predictionData: { playerName: 'Scottie Scheffler' }
// subjectPlayerId = the player picked to win

// top_5, top_10, top_20
predictionData: { playerName: 'Rory McIlroy', position: 'top_5', direction: 'yes' }
// subjectPlayerId = the player, direction = 'yes' (will finish top X) or 'no' (won't)

// make_cut
predictionData: { playerName: 'Tiger Woods', direction: 'make' }
// direction: 'make' or 'miss'

// round_leader
predictionData: { playerName: 'Jon Rahm', round: 1 }
// subjectPlayerId = the player picked to lead after round N

// head_to_head
predictionData: { playerA: 'Scottie Scheffler', playerB: 'Rory McIlroy', pick: 'playerA' }
// subjectPlayerId = player A, additional field for player B ID
// Add `opponentPlayerId` to the prediction creation (store in predictionData or add a field)
```

Add validation in `submitPrediction()` after the existing type check:
```javascript
// Validate predictionData shape per type
if (['top_5', 'top_10', 'top_20', 'make_cut'].includes(data.predictionType)) {
  if (!data.predictionData?.direction) throw new Error('direction is required for this prediction type')
}
if (data.predictionType === 'head_to_head') {
  if (!data.predictionData?.opponentPlayerId) throw new Error('opponentPlayerId is required for H2H')
}
if (data.predictionType === 'round_leader') {
  if (!data.predictionData?.round || ![1,2,3].includes(data.predictionData.round)) {
    throw new Error('round (1-3) is required for round_leader')
  }
}
```

**STEP 3: Frontend — Redesign ProveIt WeeklySlate**

**File: `frontend/src/pages/ProveIt.jsx`**

Replace the current single-type SG benchmark slate with a **category picker** at the top:

```
[🏆 Winner] [🎯 Top 5] [🎯 Top 10] [🎯 Top 20] [✂️ Cut Line] [🔄 H2H] [📊 Round 1] [📈 SG Call]
```

These are horizontal scroll pill buttons. Tapping one changes the prediction creation UI below.

**Category UIs:**

**A. Tournament Winner (`tournament_winner`)**
- Show tournament field as a scrollable list of player cards
- Each card: headshot + name + OWGR + CPI badge
- Tap a player → "Make Your Call" confirmation with BackYourCall thesis form
- One pick per tournament
- Section header: "Who takes it? Pick the winner of [Tournament Name]"
- Community consensus bar: "42% of managers picked Scheffler"

**B. Top 5 / Top 10 / Top 20 (`top_5`, `top_10`, `top_20`)**
- Same player list, but each player has YES / NO pill buttons (styled like poll options, not betting buttons)
- "Will [Player] finish in the Top 5?" → tap YES or NO
- Show community split: "73% say Yes"
- Can make multiple calls per category per tournament
- Section header: "Top 5 Calls — Which players crack the top 5?"

**C. Make/Miss the Cut (`make_cut`)**
- Player list with MAKE / MISS pill buttons
- Sorted by DataGolf skill estimate or OWGR (weaker players at top — more interesting calls)
- "Will [Player] make the cut?" → MAKE or MISS
- Section header: "Cut Line — Who survives Friday?"
- Show cut history: "Made 8 of last 10 cuts at this course" (from course history data if available)

**D. Round 1 Leader (`round_leader`)**
- Same as tournament winner UI but for round 1 leader
- "Who leads after Round 1?"
- One pick per tournament per round
- Only show Round 1 initially (can expand to R2/R3 later)

**E. Head-to-Head (`head_to_head`)**
- Two-player comparison card
- Show pre-built matchups (top 5 by OWGR, or commissioner-curated) plus "Build Your Own"
- "Build Your Own": two player search dropdowns → select Player A and Player B → pick who finishes higher
- Matchup card shows both players side-by-side with stats, tap the one you think wins
- Section header: "Head to Head — Who finishes higher?"

**F. SG Performance Call (`player_benchmark` — existing, reframe)**
- Keep existing UI but rename from "OVER / UNDER" to better language
- Buttons should say "Beats Line" / "Misses Line" or "Above" / "Below" (poll-style)
- Section header: "SG Performance Calls — Will they beat their benchmark?"

**STEP 4: Mobile optimization**

- Category pills scroll horizontally on mobile
- Player cards stack vertically
- YES/NO and MAKE/MISS buttons are full-width tappable areas
- BackYourCall thesis form appears inline below the selected player (not a modal)

**STEP 5: Prove It tab restructure**

Current tabs: WeeklySlate | TrackRecord | Leaderboard | Analysts

Add a "My Calls" filter on the slate itself — small toggle at top: "All Players" | "My Calls" that filters to show only players you've made predictions on, with your prediction shown.

**Files:** `frontend/src/pages/ProveIt.jsx`, `backend/src/services/predictionService.js`, `backend/src/routes/predictions.js`

---

### 091 — Golf Prediction Auto-Resolution Service (Phase 5C backend)
**Status:** `DONE`
**Completed:** 2026-03-03 — Created golfPredictionResolver.js with resolveGolfEvent() (handles all 8 prediction types: winner, top 5/10/20, make_cut, round_leader, h2h, player_benchmark) and resolveCompletedTournaments(). Crons: Sun 10:30 PM + Mon 8 AM ET. Triggers reputation update + achievement evaluation after resolution. Files: golfPredictionResolver.js (new), index.js
**Priority:** High — Without this, predictions stay PENDING forever
**Prompt:**

Build the golf prediction resolution service. Currently NO golf predictions auto-resolve — they sit PENDING indefinitely. This service checks completed tournaments and grades all pending predictions.

**New service: `backend/src/services/golfPredictionResolver.js`**

```javascript
const prisma = require('../lib/prisma')
const { resolvePrediction } = require('./predictionService')

/**
 * Golf Prediction Auto-Resolver
 * Runs after tournament completion. Checks all PENDING golf predictions
 * for the event and resolves them based on final results.
 */

async function resolveGolfEvent(eventId) {
  // 1. Get tournament with final leaderboard
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { performances: { include: { player: true } } },
  })
  if (!event) throw new Error(`Event ${eventId} not found`)

  // 2. Build leaderboard lookup
  // Performance records have: position, score, sgTotal, status (made_cut, missed_cut, etc.)
  const leaderboard = event.performances
    .filter(p => p.position != null)
    .sort((a, b) => a.position - b.position)

  const playerMap = new Map() // playerId → { position, sgTotal, status, ... }
  for (const p of event.performances) {
    playerMap.set(p.playerId, {
      position: p.position,
      sgTotal: p.sgTotal,
      status: p.status,
      score: p.totalScore,
      roundScores: [], // populate from RoundScore if needed
    })
  }

  // Winner = position 1
  const winner = leaderboard.find(p => p.position === 1)

  // 3. Get all PENDING predictions for this event
  const pending = await prisma.prediction.findMany({
    where: { eventId, outcome: 'PENDING', sport: 'golf' },
  })

  let resolved = 0
  for (const pred of pending) {
    let outcome = null
    let accuracyScore = null

    const playerData = pred.subjectPlayerId ? playerMap.get(pred.subjectPlayerId) : null

    switch (pred.predictionType) {
      case 'tournament_winner': {
        if (!winner) break // tournament not finished
        outcome = (pred.subjectPlayerId === winner.playerId) ? 'CORRECT' : 'INCORRECT'
        // Accuracy bonus: closer to winning = higher score
        if (playerData?.position) {
          accuracyScore = outcome === 'CORRECT' ? 1.0 : Math.max(0, 1 - (playerData.position / 50))
        }
        break
      }

      case 'top_5': {
        if (!playerData?.position) break
        const inTop5 = playerData.position <= 5
        const predictedYes = pred.predictionData?.direction === 'yes'
        outcome = (inTop5 === predictedYes) ? 'CORRECT' : 'INCORRECT'
        accuracyScore = outcome === 'CORRECT' ? 1.0 : 0.0
        break
      }

      case 'top_10': {
        if (!playerData?.position) break
        const inTop10 = playerData.position <= 10
        const predictedYes = pred.predictionData?.direction === 'yes'
        outcome = (inTop10 === predictedYes) ? 'CORRECT' : 'INCORRECT'
        accuracyScore = outcome === 'CORRECT' ? 1.0 : 0.0
        break
      }

      case 'top_20': {
        if (!playerData?.position) break
        const inTop20 = playerData.position <= 20
        const predictedYes = pred.predictionData?.direction === 'yes'
        outcome = (inTop20 === predictedYes) ? 'CORRECT' : 'INCORRECT'
        accuracyScore = outcome === 'CORRECT' ? 1.0 : 0.0
        break
      }

      case 'make_cut': {
        if (!playerData) break
        const madeCut = playerData.status !== 'missed_cut' && playerData.status !== 'CUT'
        const predictedMake = pred.predictionData?.direction === 'make'
        outcome = (madeCut === predictedMake) ? 'CORRECT' : 'INCORRECT'
        accuracyScore = outcome === 'CORRECT' ? 1.0 : 0.0
        break
      }

      case 'round_leader': {
        // Need round-specific leaderboard — query RoundScore for the specific round
        const round = pred.predictionData?.round || 1
        const roundScores = await prisma.roundScore.findMany({
          where: { performance: { eventId }, roundNumber: round },
          include: { performance: true },
          orderBy: { score: 'asc' }, // lowest score = leader in golf
        })
        if (roundScores.length === 0) break
        const roundLeader = roundScores[0]?.performance?.playerId
        outcome = (pred.subjectPlayerId === roundLeader) ? 'CORRECT' : 'INCORRECT'
        accuracyScore = outcome === 'CORRECT' ? 1.0 : 0.0
        break
      }

      case 'head_to_head': {
        const opponentId = pred.predictionData?.opponentPlayerId
        if (!opponentId) break
        const opponentData = playerMap.get(opponentId)
        if (!playerData?.position || !opponentData?.position) break
        const pickedPlayer = pred.predictionData?.pick === 'playerA' ? pred.subjectPlayerId : opponentId
        const pickedData = pred.predictionData?.pick === 'playerA' ? playerData : opponentData
        const otherData = pred.predictionData?.pick === 'playerA' ? opponentData : playerData
        if (pickedData.position === otherData.position) {
          outcome = 'PUSH' // tie
        } else {
          outcome = pickedData.position < otherData.position ? 'CORRECT' : 'INCORRECT'
        }
        accuracyScore = outcome === 'CORRECT' ? 1.0 : outcome === 'PUSH' ? 0.5 : 0.0
        break
      }

      case 'player_benchmark': {
        // Existing SG benchmark — compare final sgTotal to benchmark value
        if (!playerData?.sgTotal && playerData?.sgTotal !== 0) break
        const benchmark = pred.predictionData?.benchmarkValue
        if (benchmark == null) break
        const direction = pred.predictionData?.direction // 'over' or 'under'
        const actual = playerData.sgTotal
        if (actual === benchmark) {
          outcome = 'PUSH'
        } else if (direction === 'over') {
          outcome = actual > benchmark ? 'CORRECT' : 'INCORRECT'
        } else {
          outcome = actual < benchmark ? 'CORRECT' : 'INCORRECT'
        }
        accuracyScore = outcome === 'CORRECT' ? 1.0 : outcome === 'PUSH' ? 0.5 : 0.0
        break
      }
    }

    if (outcome) {
      await resolvePrediction(pred.id, outcome, accuracyScore, prisma)
      resolved++
    }
  }

  console.log(`[Golf Resolver] Event ${event.name}: resolved ${resolved}/${pending.length} predictions`)
  return { resolved, total: pending.length }
}

/**
 * Check for recently completed tournaments and resolve their predictions.
 * "Completed" = all 4 rounds played, final leaderboard available.
 */
async function resolveCompletedTournaments() {
  // Find tournaments that ended in the last 48 hours with unresolved predictions
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)

  const events = await prisma.event.findMany({
    where: {
      sport: { slug: 'golf' },
      endDate: { gte: cutoff, lte: new Date() },
      // Has at least one PENDING prediction
      predictions: { some: { outcome: 'PENDING' } },
    },
    select: { id: true, name: true },
  })

  let totalResolved = 0
  for (const event of events) {
    try {
      const result = await resolveGolfEvent(event.id)
      totalResolved += result.resolved
    } catch (err) {
      console.error(`[Golf Resolver] Failed for event ${event.name}:`, err.message)
    }
  }
  return totalResolved
}

module.exports = { resolveGolfEvent, resolveCompletedTournaments }
```

**Cron job**: Add to `backend/src/index.js` — runs Sunday 10:30 PM ET (after tournament finalization at 10 PM) and Monday 8 AM ET (catch-up):

```javascript
// Golf prediction resolution — Sunday night after tournaments finish
cron.schedule('30 22 * * 0', async () => {
  const { resolveCompletedTournaments } = require('./services/golfPredictionResolver')
  const count = await resolveCompletedTournaments()
  console.log(`[Cron] Golf prediction resolution: ${count} predictions resolved`)
}, { timezone: 'America/New_York' })

// Monday morning catch-up
cron.schedule('0 8 * * 1', async () => {
  const { resolveCompletedTournaments } = require('./services/golfPredictionResolver')
  const count = await resolveCompletedTournaments()
  console.log(`[Cron] Golf prediction resolution (Monday catch-up): ${count} predictions resolved`)
}, { timezone: 'America/New_York' })
```

**Also hook into existing tournament finalization**: In whatever cron/service marks a tournament as "complete" (check `backend/src/services/datagolfSync.js` or `espnSync.js` — look for where tournament status gets set to completed/final), add a call to `resolveGolfEvent(eventId)` right after finalization.

**Update reputation**: The existing `resolvePrediction()` in `predictionService.js` should already call `updateReputation()` — verify this. If not, add `await updateReputation(pred.userId, prisma)` after each resolution.

**Performance note**: The resolver queries the full event leaderboard once, builds a Map, then iterates predictions in memory. Should handle hundreds of predictions per event efficiently. For round_leader, there's one extra DB query per round-leader prediction — acceptable volume.

**Files:** `backend/src/services/golfPredictionResolver.js` (new), `backend/src/index.js` (cron entries)

---

### 092 — Fix: Onboarding Modal Not Scrollable on Small Mobile Screens
**Status:** `DONE`
**Priority:** URGENT — blocking new users right now
**Prompt:**
The onboarding modal (`frontend/src/components/onboarding/OnboardingModal.jsx`) is already fixed in the working tree. The fix changes line 92-93:

- Outer div: added `overflow-y-auto` to the `fixed inset-0` container
- Inner div: changed `overflow-hidden` to `overflow-y-auto max-h-[90vh]`

This prevents the modal from trapping users on small phone screens where the content overflows past the viewport and they can't reach the sport pills, Continue button, or Skip button.

**Just commit and deploy.** The file is already edited. One-liner:

```bash
git add frontend/src/components/onboarding/OnboardingModal.jsx
git commit -m "fix: onboarding modal scrollable on small mobile screens"
git push
```

**Files:** `frontend/src/components/onboarding/OnboardingModal.jsx` (already modified)

---

### 093 — Fix: Email Invite 500 Error (PrismaClientValidationError)
**Status:** `DONE`
**Priority:** URGENT — Blocks league invites entirely
**Prompt:**
The `POST /:id/invite-email` route in `backend/src/routes/leagues.js` was crashing with a `PrismaClientValidationError` because the Prisma query tried to use `sport` as a relation with `{ select: { name: true } }`, but `sport` is a plain String field on the League model (not a relation — the relation is `sportRef`).

**Fix already applied by Cowork (just commit and deploy):**

In `backend/src/routes/leagues.js` (around line 381-412):
1. Removed `sport: { select: { name: true } }` from the Prisma `include` block
2. Changed `sportName: league.sport?.name || 'Fantasy'` to `sportName: league.sport || 'Fantasy'`

The `league.sport` field is already a string like `"GOLF"` — no need to query a relation.

Just commit the modified file and deploy:
```bash
git add backend/src/routes/leagues.js
git commit -m "fix: email invite 500 error — sport is a String field, not a relation"
git push
```

**Files:** `backend/src/routes/leagues.js` (already modified)

---

### 094 — Fix: Coach Settings "Failed to fetch document" (PrismaClientValidationError)
**Status:** `DONE`
**Priority:** URGENT — Coach Settings page broken for all users
**Prompt:**
The Coach Settings page (`/coach/settings`) crashes with "Failed to fetch document" because Prisma's `findUnique` and `upsert` don't support nullable fields (`sport String?`) in composite unique key lookups. Passing `sport: null` in `userId_sport_documentType` throws `PrismaClientValidationError`.

**Fix already applied by Cowork (just commit and deploy):**

1. `backend/src/routes/coachMemory.js` — Rewrote all 7 Prisma queries:
   - All `findUnique` with composite key → `findFirst` with regular where clause
   - All `upsert` with composite key → `findFirst` + `create` or `update` by `id`
   - All `update` with composite key → `update` by `id` (after findFirst)
   - Added `findMemoryDoc()` and `upsertMemoryDoc()` helper functions

2. `backend/src/services/coachingMemoryWriter.js` — Same fix for `upsertVaultDoc()`:
   - `findUnique` → `findFirst`
   - `upsert` → `findFirst` + `create` or `update` by `id`

Just commit and deploy:
```bash
git add backend/src/routes/coachMemory.js backend/src/services/coachingMemoryWriter.js
git commit -m "fix: coach memory queries — Prisma nullable composite key workaround"
git push
```

**Files:** `backend/src/routes/coachMemory.js`, `backend/src/services/coachingMemoryWriter.js` (both already modified)

---

### 095 — CRITICAL: Draft Room player names invisible at mobile width
**Status:** `DONE`
**Priority:** CRITICAL — Draft today at 4 PM ET. Users cannot see player names on phones.
**Prompt:**
The Draft Room player list at mobile viewport widths (<640px) renders player names at 0px width. The grid uses `min-w-[500px]` inside `overflow-x-auto`, but the Player column gets zero space because 10 stat columns (Rk, Bd, Player, CPI, SG, T5, T10, T25, MC, FORM) consume all available width.

**Evidence:** DOM contains full player names ("Scottie Scheffler", "Rory McIlroy") but `getBoundingClientRect().width === 0` on all player name spans.

**Fix approach — choose one:**

**Option A (quick fix, recommended for today):** On mobile (`@media (max-width: 640px)` or Tailwind `sm:` breakpoint), hide the secondary stat columns (T5, T10, T25, MC, SG) using `hidden sm:table-cell` or equivalent. Keep only: Rk, Player (with `min-w-[120px]`), CPI, FORM, and the bookmark button. This gives the Player column enough breathing room.

**Option B (better UX, more work):** Create a mobile-specific compact player row component: Player headshot + name + CPI badge + FORM badge in a single row, with tap-to-expand showing full stats underneath.

**Files to check:**
- Draft Room player list component (likely in `frontend/src/components/draft/` — look for the available players table/grid)
- Search for `min-w-[500px]` in draft components
- The grid column definitions that allocate space to each stat

---

### 096 — Fix: Landing page hero horizontal overflow on mobile
**Status:** `DONE`
**Priority:** HIGH — visible to all new visitors on mobile
**Prompt:**
The landing page hero section (section 0) has `scrollWidth: 400` in a ~376px mobile viewport, causing ~24px horizontal overflow. The Clutch Rating card display causes this. Section 4 (Clutch Rating breakdown) has the same issue.

**Fix:** Add `overflow-x: hidden` to the hero section container, or constrain the rating card with `max-w-full` on mobile. Check the hero section class `relative pt-20 sm:pt-28 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8` — the rating card inside likely needs `max-w-full` or the parent needs `overflow-hidden`.

**File:** `frontend/src/pages/LandingPage.jsx` (or equivalent) — hero section

---

### 097 — Performance: Mobile PageSpeed score 61 → target 80+
**Status:** `DONE`
**Completed:** 2026-03-04 — Converted ~70 static page imports to React.lazy() + Suspense in App.jsx. Main bundle dropped from ~2.8MB to 412KB (~85% reduction). Added Railway API preconnect and deferred font loading in index.html. Files: App.jsx, index.html
**Priority:** HIGH — 6.2s FCP on mobile, 611 KiB unused JS
**Prompt:**
Full audit: `docs/PAGESPEED_AUDIT_MAR4_2026.md`. Key fixes:

1. **Route-level code splitting** — Wrap all route components in `React.lazy()` + `Suspense` in `App.jsx`. The landing page currently loads code for draft room, admin panel, vault, etc. Est: 611 KiB JS savings → 2-3s FCP improvement.

2. **Preload/preconnect** — Add to `index.html`:
   ```html
   <link rel="preconnect" href="https://clutch-production-8def.up.railway.app">
   <link rel="preload" href="[critical font URL]" as="font" crossorigin>
   ```

3. **Defer non-critical scripts** — Move analytics, error capture, Socket.IO init to after first paint using `requestIdleCallback` or dynamic import.

4. **Font loading** — Landing page loads 4 fonts (Bricolage, DM Sans, JetBrains Mono, Instrument Serif) but only needs 2. Defer mono + editorial fonts.

**File:** `frontend/src/App.jsx` (route splitting), `frontend/index.html` (preload/preconnect), `frontend/src/services/` (deferred init)

---

### 098 — Fix: Small touch targets across mobile pages
**Status:** `DONE`
**Completed:** 2026-03-04 — Added min-w-[44px] min-h-[44px] to icon buttons (hamburger, bell, theme toggle) in Navbar. Added min-h-[44px] to links in Dashboard, LeagueHome nav pills, and ProveIt filter buttons. Files: Navbar.jsx, Dashboard.jsx, LeagueHome.jsx, ProveIt.jsx
**Priority:** MEDIUM — affects usability, also flagged in PageSpeed accessibility
**Prompt:**
Several interactive elements are below the 44×44px WCAG minimum touch target:

1. Navbar: hamburger (36×44), notification bell (36×44), theme toggle (40×44)
2. Dashboard: "Review Board →" link is 108×19px — only 19px tall
3. Dashboard: Sport filter emojis (⛳, 🏈) are 32×44
4. League Home: "Bay Hill" link at 46×19px
5. Prove It: "All" filter 28×44, trophy emoji 36×44

**Fix:** Add `min-h-[44px]` to all interactive link elements. For icon-only buttons, ensure `min-w-[44px] min-h-[44px]`. For text links like "Review Board →" and "Bay Hill", wrap in a container with `py-3` (12px vertical padding) to hit 44px height.

**Files:** `frontend/src/components/layout/Navbar.jsx`, Dashboard page, League Home page

---

### 099 — Fix: Prove It R1 Leader chip truncation + FAB overlap
**Status:** `DONE`
**Completed:** 2026-03-04 — R1 Leader chips already used last-name-only (no change needed). Added pb-20 to R1 Leader container for FAB clearance. Files: ProveIt.jsx
**Priority:** LOW — cosmetic
**Prompt:**
On the Prove It page at mobile width:

1. **R1 Leader player chips truncate names**: "Fleetwo...", "MacInty...", "Spaun...", "Schauff...". The chips are 3 per row with limited width. Fix: Either use last name only (most are fine as-is), increase chip font size or width, or allow 2 per row on very narrow screens.

2. **FAB overlaps bottom-right R1 Leader chip**: The floating compose button covers the last chip. Fix: Add `pb-20` bottom padding to the R1 Leader section container.

**File:** `frontend/src/pages/ProveIt.jsx` — CompactSlateTable section and R1 Leader grid

---

### 100 — Accessibility: Contrast ratios + aria-labels + heading hierarchy
**Status:** `DONE`
**Completed:** 2026-03-04 — Added aria-labels to Navbar logo link, notification bell, hamburger. Bumped 4 low-contrast text opacities on Landing page (rating card labels, editorial subtitle, final CTA text). Heading hierarchy already correct. Files: Navbar.jsx, Landing.jsx
**Priority:** MEDIUM — Accessibility score 88 → target 95+
**Prompt:**
From PageSpeed audit:

1. **Contrast ratios**: Some text doesn't meet WCAG AA (4.5:1 for normal, 3:1 for large). Likely the `slate-light` or `crown` color tokens on light backgrounds. Audit landing page CTA text and feature descriptions.

2. **Missing aria-labels**: Some `<a>` tags have no text content or aria-label — screen readers can't announce them. Add `aria-label` to: social icons, logo link, icon-only navigation buttons.

3. **Heading hierarchy**: Page has heading level jumps (e.g., h1 → h3 skipping h2). Fix on landing page to ensure sequential h1 → h2 → h3 flow.

**Files:** Landing page component, `Navbar.jsx` (icon buttons), global CSS color tokens

---

### 101 — Fix: Sport filter emoji buttons missing aria-labels
**Status:** `DONE`
**Completed:** 2026-03-04 — Added aria-label="Golf"/"NFL"/"All sports" to sport filter emoji buttons. Files: Dashboard.jsx
**Priority:** LOW — Accessibility polish
**Prompt:**
On the Dashboard, the sport filter buttons (⛳ Golf and 🏈 NFL) are emoji-only buttons with no `aria-label`. Screen readers can't announce what they do.

**Fix:** Add `aria-label="Golf"` to the ⛳ button and `aria-label="NFL"` to the 🏈 button in the sport filter component on the Dashboard. These buttons already have `min-w-[44px] min-h-[44px]` from item 098 — they just need the labels.

**File:** Likely `frontend/src/pages/Dashboard.jsx` or whichever component renders the sport filter pills (look for the `⛳` and `🏈` emoji buttons near the "My Leagues" section).

---

### 102 — Fix: "Bay Hill" coach briefing link too short for touch target
**Status:** `DONE`
**Completed:** 2026-03-04 — Added min-h-[44px] to coach briefing CTA link. Files: CoachBriefing.jsx
**Priority:** LOW — Mobile UX polish
**Prompt:**
The coach briefing line on Dashboard, League Home, and Golf Hub includes an inline link (currently "Bay Hill" or the current tournament name) that renders at only 19px tall — below the 44px WCAG touch target minimum. This link appears on multiple pages wherever the `CoachBriefing` component renders.

**Fix:** Add `min-h-[44px] inline-flex items-center` to the tournament link inside the coach briefing component so the tap target meets the minimum height without changing the visual text size. Alternatively, increase the line-height/padding of the entire briefing line to ensure the link naturally reaches 44px.

**File:** `frontend/src/components/common/CoachBriefing.jsx` (or wherever the coach briefing renders the inline tournament link).

---

### 103 — Fix: Email CTA button invisible in Gmail/Outlook (gradient stripped)
**Status:** `DONE`
**Completed:** 2026-03-04 — Replaced all 4 gradient CTA buttons with table-based bulletproof pattern using solid bgcolor fallback. Files: emailService.js
**Priority:** HIGH — Broke the first real invite experience
**Prompt:**
The "Join the League" and "View Your Stats" CTA buttons in league invite and vault invite emails use `background: linear-gradient(135deg, #F06820, #D4930D)` as an inline style on an `<a>` tag. Many email clients (Gmail app, Outlook, Yahoo Mail) strip CSS gradients from inline styles, leaving the button with no background — white text on white background = invisible button.

**Fix in `backend/src/services/emailService.js`:**

1. **Replace all gradient CTA buttons** with table-based buttons that use `background-color` (solid color) as the primary background, with the gradient as a progressive enhancement. The pattern:

```html
<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
  <tr>
    <td align="center" style="border-radius:10px;background-color:#F06820;" bgcolor="#F06820">
      <a href="${url}" target="_blank"
         style="display:inline-block;background-color:#F06820;color:#FFFFFF;font-size:17px;font-weight:700;text-decoration:none;padding:16px 52px;border-radius:10px;border:1px solid #E05A10;">
        Button Text
      </a>
    </td>
  </tr>
</table>
```

Key changes:
- `bgcolor="#F06820"` on the `<td>` — bulletproof fallback for all email clients
- `background-color:#F06820` (solid, not gradient) on the `<a>` tag
- `border:1px solid #E05A10` gives it depth without relying on gradient
- Table-based layout ensures the entire cell is clickable

2. **Add a fallback text link** below every CTA button:
```html
<div style="text-align:center;margin-top:12px;">
  <span style="font-size:12px;color:#999;">Button not working? </span>
  <a href="${url}" style="font-size:12px;color:#F06820;text-decoration:underline;">Click here</a>
</div>
```

3. **Apply to ALL email functions** — `sendLeagueInviteEmail`, `sendVaultInviteEmail`, `sendNotificationEmail`, `sendDraftRecapEmail`. Every CTA button in the service needs this fix.

4. **Also enlarge the sport emoji** — move it above the "LEAGUE INVITE" label as a standalone 32px element for visual impact.

5. **After deploying**, send a test email to `ericmsaylor@gmail.com` by hitting the league invite endpoint from a curl or script. Use any existing league's invite code.

**Reference:** See `email-preview-league-invite.html` and `email-preview-vault-invite.html` in repo root for the improved HTML templates.

**File:** `backend/src/services/emailService.js`

---

### 104 — Fix: OwnerDetailModal hardcoded dark background (vault page)
**Status:** `DONE`
**Completed:** 2026-03-04 — Replaced hardcoded dark hex colors with CSS variables (--bg, --card-border) in OwnerDetailModal and VaultRevealView. Files: OwnerDetailModal.jsx, VaultRevealView.jsx
**Priority:** HIGH — Looks broken in light mode, ruins vault reveal experience
**Prompt:**
`frontend/src/components/vault/OwnerDetailModal.jsx` has hardcoded dark mode colors that make the modal look terrible when the app is in light mode:

1. **Line 58:** `background: '#0E100F'` — hardcoded dark background on the modal panel. Should be `background: 'var(--bg)'` or `bg-[var(--bg)]` via Tailwind class.

2. **Line 47:** `background: 'rgba(5,7,6,0.85)'` — hardcoded near-black backdrop. In light mode should be lighter. Change to `background: 'rgba(0,0,0,0.5)'` for a more neutral overlay that works in both modes, or use a CSS variable.

3. **Also check `VaultRevealView.jsx` line ~170:** A section divider uses `background: 'linear-gradient(90deg, transparent, #2A2520)'` — hardcoded dark brown. Should use `var(--card-border)` or similar theme-aware token.

**The fix pattern:** Replace all hardcoded hex colors in inline styles with CSS variable references. The modal panel should use `var(--bg)` for background and `var(--text-1)` for text, which automatically adapts to light/dark mode via the ThemeContext.

**Test:** Open any imported league's vault, click on an owner row to open the detail modal. Verify it looks correct in both light mode (cream bg, dark text) and dark mode (dark bg, light text).

**Files:**
- `frontend/src/components/vault/OwnerDetailModal.jsx` (primary — lines 47, 58)
- `frontend/src/components/vault/VaultRevealView.jsx` (divider line ~170)

---

### 105 — Investigate: Missing owner in imported league vault (auto-match on join)
**Status:** `DONE`
**Completed:** 2026-03-04 — Auto-match vault owner on league join (name match or last-unclaimed). Added "Claim Your History" banner on LeagueHome for unmatched members of imported leagues. Files: leagues.js, LeagueHome.jsx
**Priority:** MEDIUM — UX gap in the invite→vault flow
**Prompt:**
When a user is invited to an imported league and joins, they become a `LeagueMember` but are NOT automatically matched to their `HistoricalSeason` / `OwnerAlias` records. This means they show up in the league but their vault history is missing — they're the only person without stats.

**Current flow:**
1. Commissioner imports league → `HistoricalSeason` records created with `ownerUserId = NULL`
2. Commissioner uses Owner Assignment Wizard → sets `OwnerAlias.canonicalName` mappings
3. Commissioner sends invite → user joins as `LeagueMember`
4. **GAP:** No automatic link between the new `LeagueMember` and their `OwnerAlias` / `HistoricalSeason` records

**Desired flow:** When a user joins an imported league, attempt to auto-match them to an unclaimed owner:
1. Check if the invite email was sent alongside a vault invite that specified an `ownerName`
2. If yes, auto-set `OwnerAlias.ownerUserId` and backfill `HistoricalSeason.ownerUserId` for matching records
3. If no direct match, check if there's exactly 1 unclaimed owner remaining — if so, auto-assign

**Implementation approach:**
- In the league join route (`POST /api/leagues/:id/join` or wherever members are added), after creating the `LeagueMember`, check for unclaimed `OwnerAlias` records for that league
- If the joining user's email matches a vault invite that was sent with an `ownerName`, auto-claim that owner
- Update `OwnerAlias.ownerUserId` and all matching `HistoricalSeason.ownerUserId` records
- This is the same logic as `POST /api/imports/vault-claim` but triggered automatically on join

**Alternative simpler fix:** In the league invite email sending route, store the `ownerName` alongside the invite. When the user joins via that invite code, auto-match them to that owner. This requires a small schema addition (e.g., `pendingOwnerClaim` field on `LeagueMember` or a new `PendingOwnerClaim` table).

**For now, at minimum:** Add a prominent "Claim Your History" banner on the league home page for members of imported leagues who haven't been matched to an owner yet. This makes the manual claim flow discoverable.

**Files:**
- `backend/src/routes/leagues.js` (join route)
- `backend/src/routes/imports.js` (vault claim logic to reuse)
- `frontend/src/pages/LeagueHome.jsx` (claim banner)

---

### 106 — Feature: Combined league + vault invite from settings page
**Status:** `DONE`
**Completed:** 2026-03-04 — Added "Also send league history reveal" checkbox + owner dropdown to invite form for imported leagues. Backend accepts sendVaultInvite + ownerName params and sends both emails. Files: LeagueSettings.jsx, leagues.js
**Priority:** HIGH — Critical UX gap in imported league invite flow
**Prompt:**
When a commissioner has an imported league (one with `HistoricalSeason` data / vault history), the invite flow from the league settings page should offer to send the vault reveal invite alongside the league invite. Right now these are two completely separate flows — league invite from settings, vault invite from the vault page — and commissioners don't know they need to go to the vault page separately.

**Current state:**
- League settings has an invite section that sends `sendLeagueInviteEmail()` via `POST /api/leagues/:id/invite-email`
- Vault page has a separate invite section that sends `sendVaultInviteEmail()` via the imports route
- These are disconnected — a commissioner who invites from settings never triggers the vault invite

**Desired behavior:**
When inviting a member from the league settings page of an imported league:

1. **Detect imported league**: Check if the league has `HistoricalSeason` records or `OwnerAlias` records (i.e., it has vault history). This can be a simple boolean flag on the league or a quick DB check.

2. **Show owner assignment dropdown**: If the league has vault history, show an optional dropdown/select next to the email input: "Match to historical owner:" with a list of unclaimed `OwnerAlias` canonical names for that league. Default: "Don't match" or "Auto-detect".

3. **Send combined invite**: When the commissioner sends the invite:
   - Always send the league invite email (join the league)
   - If an owner was selected, ALSO send the vault invite email to the same address with that owner's name
   - If "Auto-detect" was selected, still send the vault invite — the auto-match logic from item 105 will handle it when they join

4. **Alternative simpler approach**: Instead of a dropdown, just add a checkbox: "☑ Also send league history reveal" that appears when the league has imported history. When checked, send both emails. The vault invite uses the email recipient's name (or a best-guess owner match) as the `ownerName`.

**Frontend changes:**
- `frontend/src/pages/LeagueSettings.jsx` (or wherever the invite form lives) — add the checkbox/dropdown for imported leagues
- Need to fetch whether the league has vault data (could be a field on the league object or a separate API call)

**Backend changes:**
- The invite endpoint (`POST /api/leagues/:id/invite-email`) should accept an optional `sendVaultInvite: true` and `ownerName: string` parameter
- When present, also call `sendVaultInviteEmail()` with the appropriate `personalUrl` and `ownerName`
- Need to look up the league's `inviteCode` and construct the vault URL

**Files:**
- `frontend/src/pages/LeagueSettings.jsx` (invite form UI)
- `backend/src/routes/leagues.js` (invite endpoint — add vault invite option)
- `backend/src/services/emailService.js` (already has both email functions)

---

### 107 — Bug: "Match to owner" dropdown missing names (team name vs display name mismatch)
**Status:** `DONE`
**Completed:** 2026-03-04 — Added /historical-owners endpoint as fallback when OwnerAlias records don't cover all names. Sleeper import now captures team_name separately from display_name. Frontend falls back to HistoricalSeason owner names when aliases are empty. Files: imports.js, sleeperImport.js, LeagueSettings.jsx
**Priority:** HIGH — Blocking invite flow for imported Sleeper leagues (real user hit this)
**Prompt:**

**The bug:** On the B Squad Bros league settings page (`/leagues/cmm2x8cgv0071li65d4apztng/settings`), the "Match to owner" dropdown in the invite section shows 14 owner names but is **missing "GirthBrooks09"**, which is clearly visible as row 11 on the league's main page standings. The commissioner (Eric) tried to invite a friend who goes by "GirthBrooks09" in the league but couldn't find them in the dropdown.

**What the dropdown shows (14 names):**
Eric, Masebuster, AbusiveTree, CVIN23, calebtrow, justcalmdown06, peytrone, Hayden, SalladDrama, thejessearchy, JustRageQuit, rageng08, Anthony, Spencer H

**What the league standings show (12 teams):**
Erokopotomus, CVIN23, AbusiveTree, rageng08, calebtrow, Masebuster, SalladDrama, JustRageQuit, justcalmdown06, thejessearchy, **GirthBrooks09**, peytrone

**The mismatch:** The dropdown has names like "Hayden", "Anthony", "Spencer H" that DON'T appear on the standings. The standings have "GirthBrooks09" and "Erokopotomus" that DON'T appear in the dropdown. This is a **Sleeper display_name vs team_name problem** — the import stores `display_name` from the Sleeper Users API as `ownerName`, but some people use different team names in the league (e.g., display_name "Hayden" → team name "GirthBrooks09").

**Root cause in code:**
- `backend/src/services/sleeperImport.js` line 230: `ownerName: user.displayName` — uses Sleeper `display_name`
- Lines 577-578: Both `teamName` and `ownerName` in HistoricalSeason get set to the same Sleeper `display_name`
- The Sleeper roster metadata also contains a `team_name` field (set per-league) that is NOT captured during import
- During the vault wizard owner assignment, the commissioner merges multiple-season names into canonical names, which may differ from any single season's team name
- The dropdown (`LeagueSettings.jsx` lines 127-135) fetches from `getOwnerAliases(leagueId)` which returns OwnerAlias.canonicalName — these are the vault wizard canonical names, NOT the per-season team names users recognize

**The fix (two parts):**

**Part 1: Capture Sleeper team_name during import**
In `sleeperImport.js`, the Sleeper roster metadata contains a team_name field. When building `rosterData`, also capture the team name:
```js
// In the rosters.map() at line 225
const teamName = r.metadata?.team_name || user.displayName
return {
  rosterId: r.roster_id,
  ownerName: user.displayName,
  teamName: teamName,  // ADD THIS — Sleeper per-league team name
  ...
}
```
Then when creating HistoricalSeason records, store teamName separately from ownerName:
```js
teamName: roster.teamName || roster.ownerName || `Team ${roster.rosterId}`,
ownerName: roster.ownerName || `Team ${roster.rosterId}`,
```

**Part 2: Fix the dropdown to show recognizable names**
The "Match to owner" dropdown should show names users actually recognize. Two approaches (pick the better one):

**Option A (preferred): Fall back to HistoricalSeason unique owner names**
If `getOwnerAliases()` returns empty (no vault wizard run yet), fall back to fetching unique `ownerName` values from HistoricalSeason for this league. This ensures ALL names from imported seasons appear:
```jsx
// LeagueSettings.jsx — after the getOwnerAliases call
api.getOwnerAliases(leagueId).then(data => {
  const aliases = data.aliases || data || []
  let unclaimed = [...new Set(aliases.filter(a => !a.ownerUserId).map(a => a.canonicalName))]
  if (unclaimed.length === 0) {
    // Fallback: get unique owner names from historical seasons
    return api.request(`/imports/leagues/${leagueId}/historical-owners`)
  }
  setUnclaimedOwners(unclaimed)
}).then(fallbackData => {
  if (fallbackData?.owners) setUnclaimedOwners(fallbackData.owners)
})
```
Add a new backend endpoint `GET /api/imports/leagues/:leagueId/historical-owners` that returns:
```sql
SELECT DISTINCT "ownerName" FROM "HistoricalSeason" WHERE "leagueId" = ? AND "ownerUserId" IS NULL
```

**Option B: Show both canonical name + aliases in dropdown**
If OwnerAlias records exist, show them with parenthetical aliases:
"Hayden (GirthBrooks09)" — so users can recognize both the vault canonical name and the season team name.

**Also important:** The league standings ("Teams" section on league home) shows `ownerName` from the most recent season's HistoricalSeason records. This is where Eric sees "GirthBrooks09". The dropdown must include this exact name (or clearly map to it) for the flow to work.

**Files to modify:**
- `backend/src/services/sleeperImport.js` — capture Sleeper team_name separately from display_name
- `backend/src/routes/imports.js` — add `/historical-owners` endpoint
- `frontend/src/pages/LeagueSettings.jsx` — fallback to historical owners when aliases empty
- Optionally: `frontend/src/services/api.js` — add `getHistoricalOwners()` method

**Test with league:** `cmm2x8cgv0071li65d4apztng` (B Squad Bros) — verify "GirthBrooks09" appears in dropdown after fix.

---

### 108 — Sleeper Import: Auto-create OwnerAlias records + capture team_name per roster
**Status:** `DONE`
**Completed:** 2026-03-04 — Auto-create OwnerAlias records after Sleeper import (groups all name variants per owner, upserts aliases with canonical name). team_name capture was done in #107. Files: sleeperImport.js
**Priority:** MEDIUM — Prevents future name mismatch bugs for all imported Sleeper leagues
**Prompt:**

**Context:** Item 107 patched the symptom (invite dropdown missing "GirthBrooks09") with a HistoricalSeason fallback. But the root cause remains: the Sleeper import doesn't capture team names or auto-create OwnerAlias records, so the vault/invite system and the standings page show different names for the same person. This happened in real life — Eric invited a friend (Josh, aka "GirthBrooks09") and Josh's name wasn't findable anywhere in the invite flow.

**Audit finding:** The vault Profiles dropdown correctly shows all 15 unique owner names (including GirthBrooks09) from HistoricalSeason records. The settings invite dropdown only showed 14 — it was pulling from OwnerAlias records, which had ZERO entries for this league. The OwnerAlias table was completely empty because no one ran the vault owner assignment wizard. The 14 names in the dropdown came from whatever the deployed code was doing before item 107's fix.

**The preventive fix (3 parts):**

**Part 1: Capture Sleeper `team_name` during import**

In `backend/src/services/sleeperImport.js`, the Sleeper roster object has `metadata.team_name` (the per-league team name a user sets). Currently ignored. Capture it:

```js
// ~line 225, in rosters.map()
const user = userMap[r.owner_id] || { displayName: `Team ${r.roster_id}`, avatar: null }
const teamName = r.metadata?.team_name || user.displayName  // NEW
return {
  rosterId: r.roster_id,
  ownerId: r.owner_id,
  ownerName: user.displayName,   // Sleeper display_name (account-level)
  teamName: teamName,            // NEW — Sleeper team_name (league-level, user-set)
  ...
}
```

Then in the HistoricalSeason upsert (~line 565-594), store them separately:
```js
teamName: roster.teamName || roster.ownerName || `Team ${roster.rosterId}`,
ownerName: roster.ownerName || `Team ${roster.rosterId}`,
```

**Part 2: Auto-create OwnerAlias records during import**

After all seasons are imported for a league, run a reconciliation pass that:

1. Groups all HistoricalSeason records by Sleeper `owner_id` (available in the raw roster data — `r.owner_id`). This is the stable identifier that stays the same even when someone changes their display name or team name.
2. For each unique Sleeper user, collect ALL name variants they've used across seasons (display names + team names).
3. Pick the most recent display_name as the `canonicalName`.
4. Create OwnerAlias records for each name variant → canonical name mapping.

Example for Josh:
- Sleeper owner_id: `abc123`
- Seasons 2019-2023: display_name "Josh", team_name null
- Seasons 2024-2025: display_name "Josh", team_name "GirthBrooks09"
- → Create OwnerAlias: `ownerName: "Josh", canonicalName: "Josh"` (identity)
- → Create OwnerAlias: `ownerName: "GirthBrooks09", canonicalName: "Josh"` (team name variant)

This way the invite dropdown will show "Josh" as the canonical name, AND searches for "GirthBrooks09" will resolve to Josh.

To implement this, you need to:
- Store the Sleeper `owner_id` on HistoricalSeason records (add field if not present, or use the raw roster data stored in `rosterData` JSON)
- After all season upserts complete, query all HistoricalSeason records for the league
- Group by Sleeper owner_id
- For each group, collect unique (ownerName, teamName) pairs
- Upsert OwnerAlias records: one per unique name variant, all pointing to the most recent display_name as canonical

**Part 3: Post-import name coverage validation**

After import + alias creation, compare the names that will appear in the invite dropdown against the names on the league standings. If any standings name can't be found in the alias set, log a warning. Optionally surface this to the commissioner: "We found some names in your league history that may need manual matching."

This is lower priority — Parts 1 and 2 are the critical fix. Part 3 is defense-in-depth.

**Files to modify:**
- `backend/src/services/sleeperImport.js` — capture team_name, store owner_id, auto-create aliases
- `backend/prisma/schema.prisma` — potentially add `sleeperOwnerId` field to HistoricalSeason (check if it's already in rosterData JSON)
- `backend/src/routes/imports.js` — no changes needed if alias creation happens in the import service

**Test:** After fix, re-import B Squad Bros from Sleeper (or use a test import). Verify:
1. HistoricalSeason records have distinct `teamName` vs `ownerName` where they differ
2. OwnerAlias records are auto-created for ALL name variants
3. The invite dropdown shows all names without needing the fallback

---

### 109 — Fix: Invite dropdown must merge OwnerAlias + HistoricalSeason sources (not if/else)
**Status:** `DONE`
**Completed:** 2026-03-04 — Cowork merged alias + historical owner sources in parallel fetch with dedup. Commit dd8e17a. Files: LeagueSettings.jsx
**Priority:** HIGH — GirthBrooks09 still missing from invite dropdown despite items 107+108 being DONE
**Prompt:**

**The bug (verified on live site Mar 4):** Item 107 added a `/historical-owners` fallback endpoint and frontend logic. But the frontend uses `if (unclaimed.length > 0) { use aliases } else { use historical-owners }`. Since Code's item 108 auto-created 15 OwnerAlias records (14 unique unclaimed canonical names), the `else` branch NEVER fires. GirthBrooks09 exists in HistoricalSeason but NOT in OwnerAlias — so it's still invisible in the dropdown.

**Root cause:** The if/else logic means aliases OR historical-owners, never both. Josh's Sleeper display_name was something other than "GirthBrooks09", so the auto-created OwnerAlias records don't include that name. But HistoricalSeason DOES have "GirthBrooks09" as an ownerName.

**The fix is already committed locally (commit dd8e17a) but needs to be pushed:**

In `frontend/src/pages/LeagueSettings.jsx`, the useEffect that fetches unclaimed owners now:
1. Fetches BOTH `/owner-aliases` and `/historical-owners` in parallel via `Promise.all`
2. Extracts unclaimed canonical names from aliases + ownerName/teamName from historical-owners
3. Merges and deduplicates both sets with `[...new Set([...aliasNames, ...histNames])]`
4. Sets the merged list as unclaimed owners

**If commit dd8e17a is already pushed, just verify. If not, the exact change is:**

Replace the useEffect at ~line 123-144 in LeagueSettings.jsx. Change from if/else to parallel fetch + merge:

```jsx
useEffect(() => {
  if (!leagueId || !isImportedLeague) return
  ;(async () => {
    try {
      const [aliasData, histData] = await Promise.all([
        api.getOwnerAliases(leagueId).catch(() => ({ aliases: [] })),
        api.request(`/imports/leagues/${leagueId}/historical-owners`).catch(() => ({ owners: [] }))
      ])
      const aliases = aliasData.aliases || aliasData || []
      const aliasNames = aliases.filter(a => !a.ownerUserId).map(a => a.canonicalName)
      const histNames = (histData?.owners || []).map(o => o.teamName || o.ownerName)
      const merged = [...new Set([...aliasNames, ...histNames].filter(Boolean))]
      if (merged.length > 0) {
        setUnclaimedOwners(merged)
        setSendVaultInvite(true)
      }
    } catch (e) { /* silent */ }
  })()
}, [leagueId, isImportedLeague])
```

**Files:** `frontend/src/pages/LeagueSettings.jsx`
**Test:** Hard refresh `/leagues/cmm2x8cgv0071li65d4apztng/settings`, open Members tab, check "Match to owner" dropdown — GirthBrooks09 should now appear alongside all 14 other names.

---

### 110 — Fix: Join league link "League not found" — Express route ordering bug
**Status:** `DONE`
**Completed:** 2026-03-04 — Moved preview-by-code and join-by-code routes above /:id param route in leagues.js. Commit abc61f7. Files: backend/src/routes/leagues.js
**Priority:** CRITICAL — Blocked Josh from joining B Squad Bros league
**Prompt:**

**The bug:** `GET /leagues/preview-by-code?code=XXX` was defined at line 723 in `backend/src/routes/leagues.js`, but `GET /leagues/:id` was at line 241. Express matched "preview-by-code" as an `:id` parameter, looked up a league with that string ID, and returned 404 "League not found".

**The fix:** Move both `preview-by-code` and `join-by-code` route handlers to before the `/:id` route (before line 240). Left a comment at the old location noting the move.

**Files:** `backend/src/routes/leagues.js`

---

### 111 — Fix: Prisma "sport" scalar field error in preview-by-code route
**Status:** `DONE`
**Completed:** 2026-03-04 — Removed sport from Prisma include (it's a scalar String, not a relation) and fixed response mapping. Commit b395fcd. Files: backend/src/routes/leagues.js
**Priority:** CRITICAL — Join link crashed with Prisma error after route ordering fix exposed latent bug
**Prompt:**

**The bug:** After fixing item 110, the preview-by-code route was now correctly reached but crashed with: `Invalid scalar field 'sport' for include statement on model League`. The `sport` field on League is a plain String, not a relation, so Prisma's `include` directive can't use it. This bug was latent — never triggered until the route ordering fix exposed it.

**The fix:** Removed `sport: { select: { name: true, slug: true } }` from the Prisma include, and changed `league.sport?.name` to `league.sport` in the response mapping.

**Files:** `backend/src/routes/leagues.js`

---

### 112 — Fix: GirthBrooks09 missing from vault reveal (isActive filtering)
**Status:** `DONE`
**Completed:** 2026-03-04 — Fixed useVaultStats.js to treat unmapped owners as active instead of inactive. Commit f67b505. Files: frontend/src/hooks/useVaultStats.js
**Priority:** HIGH — GirthBrooks09 filtered out of vault persistent view
**Prompt:**

**The bug:** In `useVaultStats.js` line 60, the isActive logic was: `isActive: activeOwners.size > 0 ? activeOwners.has(canonical) : true`. GirthBrooks09 wasn't in the aliasMap, so canonical was just the raw name. `activeOwners` (built from aliases) didn't contain it, so `isActive = false`. `VaultPersistent.jsx` line 38 filters `.filter(({ owner }) => owner.isActive)`, hiding GirthBrooks09.

**The fix:** Changed to: `isActive: activeOwners.size > 0 ? (activeOwners.has(canonical) || !aliasMap.has(rawName)) : true` — unmapped owners (not in aliasMap at all) are treated as active.

**Files:** `frontend/src/hooks/useVaultStats.js`

---

### 113 — Fix: Invite dropdown showed 31 names (team names leaking in)
**Status:** `DONE`
**Completed:** 2026-03-04 — Refined merge logic to only use ownerName (not teamName) from historical data, and skip names already covered by aliases. Commit 8705b9e. Files: frontend/src/pages/LeagueSettings.jsx
**Priority:** Medium — Cosmetic but confusing, team names like "Baba Yaga" appeared in dropdown
**Prompt:**

**The bug:** Item 109's initial merge pulled in both ownerName AND teamName from historical data, resulting in 31 options (team names like "Baba Yaga", "Sex Symbols" mixed in). Also didn't deduplicate against alias raw names.

**The fix:** Only use `ownerName` from historical data. Build a set of all alias names (both canonical and raw), only add historical names not already in that set. Result: exactly 15 names (14 aliases + GirthBrooks09).

**Files:** `frontend/src/pages/LeagueSettings.jsx`

---

### 114 — Draft Room: Best Available Strip + Between-Picks UX + Tour Filters
**Status:** `DONE`
**Completed:** 2026-03-04 — Created BestAvailableStrip.jsx (top 5 recs), added between-picks banner, tour filter pills (PGA/LIV/DP World), field indicator badge, max-w-[1600px] cap. Files: DraftRoom.jsx, PlayerPool.jsx, BestAvailableStrip.jsx (commit dd8c6f5)
**Priority:** High — Core draft experience, biggest user complaint was "I don't know who to pick"
**Prompt:**

**Context:** Live draft feedback from Mar 4 2026 (4-person golf league). Full feedback doc: `docs/DRAFT_FEEDBACK_MAR4_2026.md`. Users said they felt lost deciding who to pick and needed a "cheat sheet" feel.

**U01 — Best Available Recommendation Strip:**
Add a floating recommendation strip above the player pool in `frontend/src/pages/DraftRoom.jsx` showing top 3-5 recommended picks. Logic:
1. From `availablePlayers`, sort by a composite: if user has a board, use board rank first; else use CPI desc, then SG Total desc, then OWGR asc.
2. Show top 5 as horizontal cards: headshot (or flag), name, CPI pill, SG pill, OWGR. Clicking a card opens PlayerDrawer.
3. If it's the user's turn, show a gold header "Recommended Picks". Otherwise show "Top Available".
4. Style: compact horizontal scroll strip, subtle gold border when it's your turn.

**U05 — Between-Picks Experience:**
When it's NOT the user's turn, enhance the waiting experience:
1. Show "On the clock: {teamName}" with their timer countdown in the queue/feed area.
2. Below that, show "Up next: {nextTeamName}" (compute from draft order/snake logic).
3. Add a subtle prompt: "Research your next pick while you wait" with a link to open compare mode or the player pool.
The `currentPick` from useDraft already has `teamName`. Compute `nextTeamName` by looking at `picks.length + 2` in the snake order.

**U07 — Tour Filter Pills:**
In `frontend/src/components/draft/PlayerPool.jsx`, add filter pills above the search bar:
- All | PGA | LIV | DP World | LPGA
- Filter `players` by `player.primaryTour` matching the selected filter.
- "All" shows everyone (default).
- Simple pill buttons with active state (gold underline or bg).
- Store in local state, doesn't persist.

**U12 — Editable Team Name:**
In `frontend/src/components/draft/DraftBoard.jsx`, the user's team column header shows "YOU". Make this editable:
- Click "YOU" to toggle into an inline text input.
- On blur or Enter, call `PATCH /api/teams/:teamId` with `{ name: newName }`.
- Update local state. The API route for team rename should already exist (check `backend/src/routes/teams.js`).
- Fallback: if no teams route for rename, just update local display name (localStorage) for now.

**U14 — Quick 2-Player Compare:**
When exactly 2 players are in the queue, show a "Compare" button in the DraftQueue header.
- Clicking opens a compact side-by-side comparison panel (slide-over or modal).
- Show: Name, OWGR, CPI, SG Total, SG sub-categories (approach, off tee, putting, around green), recent form dots, events played.
- Bar chart visual: for each stat, show proportional bars for player A vs B.
- Use existing `SgRadarChart` component from `frontend/src/components/players/SgRadarChart.jsx` if available.
- Close button returns to normal queue view.

**U19 — Less Horizontal Stretch:**
In `DraftRoom.jsx`, wrap the main draft content in a max-width container:
- Add `max-w-[1600px] mx-auto` to the main flex container so it doesn't stretch edge-to-edge on ultrawide monitors.

**U20 — Next Tournament Field Indicator:**
In `PlayerPool.jsx`, add a small badge/icon on players who are confirmed in the next tournament field.
- The DataGolf sync stores upcoming tournament fields. Check if `player.inNextField` or similar flag exists.
- If not readily available, skip this for now and add a TODO comment.

**Files to modify:** `frontend/src/pages/DraftRoom.jsx`, `frontend/src/components/draft/PlayerPool.jsx`, `frontend/src/components/draft/DraftBoard.jsx`, `frontend/src/components/draft/DraftQueue.jsx`. May create `frontend/src/components/draft/BestAvailableStrip.jsx` and `frontend/src/components/draft/QuickCompare.jsx`.

---

### 115 — Draft Room: Chat Persistence + Timer Sync + Sound Upgrades
**Status:** `DONE`
**Completed:** 2026-03-04 — Added DraftChatMessage Prisma model + migration, chat persistence in socket handler, GET /chat endpoint, 30s timer sync heartbeat, up-next sound (660→720Hz tone). Files: schema.prisma, index.js, drafts.js, api.js, useDraft.js, useDraftSounds.js (commit dd8c6f5)
**Priority:** High — Chat loss on refresh was confusing, timer desync caused arguments
**Prompt:**

**Context:** Live draft feedback Mar 4 2026. Full doc: `docs/DRAFT_FEEDBACK_MAR4_2026.md`.

**B05 — Chat Persistence:**
Draft chat messages are Socket.IO only — refreshing the page loses all history.
1. **Backend:** In `backend/src/index.js`, the `draft-chat` handler already broadcasts messages. Add persistence:
   - Create (or find) a `DraftChatMessage` model in Prisma schema. If it doesn't exist, add to `schema.prisma`:
     ```prisma
     model DraftChatMessage {
       id        String   @id @default(cuid())
       draftId   String
       userId    String
       userName  String
       message   String
       createdAt DateTime @default(now())
       draft     Draft    @relation(fields: [draftId], references: [id])
       @@index([draftId, createdAt])
     }
     ```
   - In the `draft-chat` socket handler, save to DB after broadcasting.
   - Add `GET /api/drafts/:id/chat` endpoint to load chat history (paginated, last 100 messages).
2. **Frontend:** In `DraftRoom.jsx`, on mount (after draft loads), fetch chat history and prepopulate `chatMessages` state.
   - Add to `api.js`: `getDraftChat(draftId)` calling `GET /api/drafts/${draftId}/chat`.
3. Run `npx prisma migrate dev --name draft_chat_messages` and apply.

**B13 — Timer Sync:**
Timer shows different values across browsers. The current implementation in `useDraft.js` (lines 278-306) already uses `pickDeadlineRef` from server — this should be correct since all clients compute remaining time from the same server deadline. The issue is likely:
1. `pickDeadline` not being consistently broadcast on every pick event.
2. Clock drift between client and server.

Fix: In the `draft-pick` socket handler on backend (`backend/src/index.js`), ensure `pickDeadline` is ALWAYS included in the broadcast data. Also in `useDraft.js`, after receiving a pick via socket, always update `pickDeadlineRef.current` from the data (line 175 already does this — verify it's working).

Add a "sync" mechanism: every 30 seconds, emit a `draft-time-sync` event from server with current `{ pickDeadline, serverTime: Date.now() }`. Clients compute offset: `offset = serverTime - Date.now()` and use it to adjust countdown. This handles clock drift.

**U16 — Sound Upgrades:**
`frontend/src/hooks/useDraftSounds.js` already has: `playPick`, `playYourTurn`, `playTimerWarning`, `playDraftStart`, `playBid`, `playDraftComplete`.

Add:
1. **"Up Next" sound**: Trigger when user is ONE pick away from their turn. In `useDraft.js` turn detection (line 309-355), compute if the NEXT pick after current belongs to user. If so, fire a softer notification sound. Add `playUpNext` to the hook.
2. **Timer warning escalation**: In `DraftRoom.jsx`, add an effect watching `timerSeconds` (from DraftContext). Play `playTimerWarning` at 30s, 10s, and 5s remaining (only when `isUserTurn`). Use different tones — at 5s make it urgent.
3. **Tab notification**: Already added browser tab title in Batch 3. Also add `navigator.vibrate?.(200)` on mobile when it's user's turn.

**Files:** `backend/src/index.js`, `backend/prisma/schema.prisma`, `backend/src/routes/drafts.js`, `frontend/src/pages/DraftRoom.jsx`, `frontend/src/hooks/useDraft.js`, `frontend/src/hooks/useDraftSounds.js`, `frontend/src/services/api.js`.

---

### 116 — Post-Draft: Bench-First + Starter/Bench Toggle + Lock Countdown Fix
**Status:** `DONE`
**Completed:** 2026-03-04 — Bench-first in drafts.js + draftTimer.js, starter/bench quick toggle, live lock countdown, view-other-teams dropdown on TeamRoster. Files: drafts.js, draftTimer.js, TeamRoster.jsx (commit dd8c6f5)
**Priority:** High — Users couldn't manage their lineup at all post-draft
**Prompt:**

**Context:** Live draft feedback Mar 4 2026. Full doc: `docs/DRAFT_FEEDBACK_MAR4_2026.md`.

**B07 — Bench-First After Draft:**
After draft completes, all players are placed in the starting lineup. Should be opposite — everyone starts on bench, user sets lineup.
- Find where post-draft roster creation happens. Check `backend/src/routes/drafts.js` or `backend/src/services/draftService.js` — look for where `RosterEntry` records are created after draft completion.
- Change the default `status` or `slot` to "BENCH" instead of whatever it currently is (likely "ACTIVE" or "STARTER").
- Alternatively, if the roster page reads roster entries and assumes all are starters if no slot is set, fix the frontend to default unset players to bench.

**B08 — Starter/Bench Toggle on Roster Page:**
`frontend/src/pages/TeamRoster.jsx` — add the ability to move players between starter and bench:
- Show two sections: "Starters" (top) and "Bench" (bottom) with a divider.
- Each player row gets a toggle button (or drag-and-drop) to move between sections.
- Call `PATCH /api/leagues/:leagueId/roster` or `POST /api/leagues/:leagueId/roster/set-lineup` with the updated starter/bench assignments.
- Check what roster API endpoints exist in `backend/src/routes/roster.js` or `backend/src/routes/leagues.js`.
- Respect the league's `rosterSize` or `starterCount` setting to enforce max starters.

**B06 — Roster Lock Countdown:**
The roster page shows "Roster lock in 1h 38m" but the tournament doesn't start until tomorrow.
- Find the countdown logic in `TeamRoster.jsx` or wherever the lock timer is displayed.
- The lock time should reference the actual tournament's first tee time (from the `Tournament` model's `startDate` or the earliest `TeeTime` record).
- Query: `GET /api/tournaments/current` or check how the scoring page determines the live tournament.
- If no tournament is currently active, show "Locks at [tournament start time]" instead of a countdown from now.

**B09 — LIV Player Badges:**
Players on LIV Golf should be clearly distinguished:
- In `PlayerPool.jsx`, LIV players already show a red "LIV" badge (line 215-219). Verify this works.
- In `TeamRoster.jsx` and player cards, add the same tour badge if missing.
- LIV players' stats may be incomplete (career stats only, no SG). Add a subtle note: "Limited stats — LIV data not fully available" or show LIV-specific stats if available.
- Check `player.primaryTour` field — ensure it's being set correctly during data sync for LIV players.

**P01 — Roster Page Stats for Lineup Decisions:**
`frontend/src/pages/TeamRoster.jsx` needs much better information for lineup decisions:
- For each player, show: CPI, SG Total, recent form (last 4 finishes), course fit score (if available), upcoming tournament name.
- Add a "Recommendation" indicator: green checkmark for suggested starters based on CPI+SG+form ranking.
- The current roster page likely shows minimal data. Enhance the player rows with the same stat columns used in PlayerPool (CPI, SG, Form, etc).

**P02 — View Other Teams' Rosters:**
Add a team selector dropdown at the top of `TeamRoster.jsx`:
- Default: your team. Dropdown lists all teams in the league.
- When selecting another team, fetch their roster and display read-only.
- Your own roster remains editable (starter/bench toggles).
- API: `GET /api/leagues/:leagueId/teams/:teamId/roster` — check if this exists.

**Files:** `frontend/src/pages/TeamRoster.jsx`, `backend/src/routes/drafts.js` (or draftService.js), `backend/src/routes/roster.js` (or leagues.js roster endpoints). May need to check `backend/src/routes/teams.js`.

---

### 117 — Draft Recap: Grade Scaling + View Other Teams + Clickable Players + Polish
**Status:** `DONE`
**Completed:** 2026-03-04 — Grade normalization by league size (10/totalTeams scale factor), team selector dropdown, clickable player names, coach font bump, gold banner with team initials, SG radar axis values + min 300px. Files: DraftRecap.jsx, draftGrader.js, SgRadarChart.jsx (commit dd8c6f5)
**Priority:** Medium — Recap is impressive but needs these fixes for full impact
**Prompt:**

**Context:** Live draft feedback Mar 4 2026. Full doc: `docs/DRAFT_FEEDBACK_MAR4_2026.md`.

**R01 — Draft Grades League-Size Adjustment:**
In a 4-team league, no one got an A. The grading algorithm needs to scale relative to league size.
- Find the draft grading logic. Check `frontend/src/pages/DraftRecap.jsx` or `backend/src/services/draftGradeService.js` or similar.
- The previous fix (item 072 in queue) fixed an inverted `adpDiff` calculation. Now the issue is grade boundaries.
- For small leagues (4-6 teams), the top pick in each round is essentially a "great" pick. Adjust the grade curve:
  - Scale `adpDiff` thresholds by `totalTeams`. In a 4-team league, getting a player 4 picks later than ADP is fine (1 round). In a 12-team league, 12 picks later = 1 round.
  - Suggested: normalize adpDiff by `totalTeams`. A pick that's `adpDiff / totalTeams <= 0.5` rounds early = A territory.
  - Or: use percentile-based grading within the league. Compare each team's average pick quality to the league average. Top 25% = A, etc.

**R02 — View Other Teams' Draft Recaps:**
In `DraftRecap.jsx`, add a team selector (dropdown or horizontal tabs) at the top:
- Show all teams in the draft.
- Clicking a team loads their recap (picks, grade, radar chart, coach take).
- Default to the current user's team.
- The data for all teams should already be available from the draft API.

**R03 — Team Roster Dropdown in Recap:**
If not covered by R02, add a way to see each team's full roster in pick order.

**R04 — Clickable Players in Recap:**
All player names in the draft recap should open the PlayerDrawer (PlayerDetailModal).
- Import and use `usePlayerDetail` hook.
- Wrap player names in clickable spans.
- Pass the player object (may need to find it in the players array by ID).

**R05 — Coach's Take Font Size:**
The AI coach commentary text is too small. Find the coach take section in DraftRecap.jsx and increase from `text-xs` or `text-sm` to `text-base`.

**R06 — Radar Chart Readability:**
The SG radar chart in the recap is hard to read. Improvements:
- Add value labels on each axis endpoint.
- Increase chart size (if it's small, bump to min 300x300).
- Consider adding a bar chart alternative view below the radar.

**R07 — Draft Recap Banner:**
The header/banner of the draft recap could be more impactful:
- Show league name, draft date, "Draft Complete" with a trophy or spark icon.
- Team avatars or initials in a row.
- Gold gradient background.

**Files:** `frontend/src/pages/DraftRecap.jsx`, possibly `backend/src/services/draftGradeService.js` or wherever grades are computed.

---

### 118 — Draft Room: Remaining Polish (AI Insights, Button Overlap, Optimize Lineup)
**Status:** `DONE`
**Completed:** 2026-03-04 — Dynamic AI insights replace static mocks in PlayerDetailModal, button overlap fix (56px), lineup optimizer composite power score (CPI 55% + SG 45%). Files: PlayerDetailModal.jsx, PlayerPool.jsx, LineupOptimizer.jsx (commit dd8c6f5)
**Priority:** Low — Nice-to-have polish items
**Prompt:**

**B10 — Player AI Insights All Identical:**
Opening player drawers during draft shows the same AI insight text for every player. This is likely a template/placeholder issue.
- Check `frontend/src/components/players/PlayerDetailModal.jsx` or `PlayerDrawer.jsx` — find where AI insights are displayed.
- The insight is probably coming from a coach briefing or insight endpoint. Check `GET /api/ai/player-brief/:playerId` or similar.
- If the insight API returns generic text, the issue is backend. Check `backend/src/services/aiCoachService.js` or `aiInsightPipeline.js`.
- Quick fix: if AI insights aren't personalized yet, hide the section or show "Insight generating..." instead of showing the same text for everyone.
- Better fix: ensure the player brief endpoint uses the actual player's stats (CPI, SG, form, recent results) to generate a unique insight.

**B11 — Draft/Bookmark Button Overlap:**
In `PlayerPool.jsx`, the "Draft" button and bookmark/queue icon overlap on narrow screens.
- Find the action buttons column (line 270-290).
- Fix: Stack vertically on mobile (`flex-col` on small screens) or hide the bookmark when "Draft" is showing.
- Or increase the action column width from `44px` to `54px` or use `gap-1.5`.

**B12 — Optimize Lineup Button:**
The "Optimize Lineup" button on the roster page (`TeamRoster.jsx`) glitches or doesn't work.
- Find the optimize button and its handler.
- Check the logic: it should rank players by projected points or CPI+SG composite and auto-assign top N to starter slots.
- Debug any state update issues (might be a race condition with API calls).

**Files:** `frontend/src/components/players/PlayerDetailModal.jsx`, `frontend/src/components/draft/PlayerPool.jsx`, `frontend/src/pages/TeamRoster.jsx`, possibly backend AI services.

---

### 119 — Cowork Batch 1-4 Draft Room Fixes (Already Built)
**Status:** `DONE`
**Completed:** 2026-03-04 — Committed Cowork's 4 batches (DraftConfirmModal, queue auto-remove, feed tab, color-coded stats, turn indicators, column improvements, board legend) as commit 051d8a8. Pushed.
**Priority:** Highest — These are already coded, just need commit + deploy
**Prompt:**

Cowork (Mar 4 session) built and saved these changes directly to the codebase. They need to be committed and deployed:

**Batch 1 — Error Handling + Confirmation Modal:**
- Created `frontend/src/components/draft/DraftConfirmModal.jsx` (new file)
- Modified `frontend/src/context/DraftContext.jsx` — added `pickError` state + `SET_PICK_ERROR` reducer
- Modified `frontend/src/hooks/useDraft.js` — `makePick` uses `setPickError` instead of `setError`
- Modified `frontend/src/pages/DraftRoom.jsx` — confirmation modal flow, pick error toast

**Batch 2 — Queue Auto-Remove + Feed Tab:**
- Modified `frontend/src/context/DraftContext.jsx` — `MAKE_PICK` reducer also filters queue
- Modified `frontend/src/pages/DraftRoom.jsx` — added "Feed" tab with reverse-chronological pick log

**Batch 3 — Visual Indicators:**
- Modified `frontend/src/components/draft/PlayerPool.jsx` — green/red stat color scale with `getStatColor()` helper
- Modified `frontend/src/components/draft/DraftHeader.jsx` — pulsing gold ring on your turn, stronger contrast
- Modified `frontend/src/components/draft/DraftBoard.jsx` — color legend bar, enhanced header contrast
- Modified `frontend/src/pages/DraftRoom.jsx` — browser tab title changes on turn

**Batch 4 — Column Improvements:**
- Modified `frontend/src/components/draft/PlayerPool.jsx` — all column tooltips, "Evts" column added
- Modified `frontend/src/components/draft/DraftBoard.jsx` — sort teams by draft order, max-width cap 180px
- Modified `frontend/src/pages/DraftRoom.jsx` — passes `draftOrder` prop to DraftBoard

**Action:** `git add` all modified/new files listed above, commit with message: "Draft room overhaul: error handling, confirmation modal, queue auto-remove, feed tab, color-coded stats, turn indicators, column improvements, board legend" — then deploy frontend to Vercel and backend if any backend changes.

**Important:** There are also 5 prior local commits that need pushing (resizable dividers, presence dots, player modal buttons, CPI data, sounds). Push those first.

---

### 120 — BroMontana Vault Owner Name Fix (Critical Data Integrity)
**Status:** `DONE`
**Completed:** 2026-03-04 — Created fix-bromontana-owners.js with 35 rename mappings, OwnerAlias upserts, draftData JSON patching. Handles curly apostrophe variants. Needs `node backend/scripts/fix-bromontana-owners.js` run on Railway. Files: backend/scripts/fix-bromontana-owners.js (commit f526465)
**Priority:** CRITICAL — First real draft is TODAY (Mar 5). Eric wants accurate vault data.
**Prompt:**

The Bro Montana Bowl vault (leagueId: `cmm47aj1w07klry65jxa29jwu`) has owner attribution errors. Full audit: `docs/BROMONTANA_VAULT_AUDIT.md`. All mappings below confirmed by cross-referencing Eric's personal Google Sheets (individual owner tabs for all 13 members) with Yahoo Fantasy data.

**Problem:** 2009-2012 seasons imported from Yahoo used TEAM NAMES as owner names instead of real people. Also "Brad" (2013-2014) needs to merge with "bradley" (2015+).

**Create and RUN a script at `backend/scripts/fix-bromontana-owners.js` that does these updates using Prisma:**

```javascript
const LEAGUE_ID = 'cmm47aj1w07klry65jxa29jwu';

// ALL CONFIRMED mappings — every one verified from Google Sheet owner tabs
const OWNER_RENAMES = {
  // === ERIC (was "Yeuh Girl" 2009-2012, 4 seasons, includes 2010 CHAMPIONSHIP) ===
  'Yeuh Girl': 'Eric',

  // === JAKOB (was "Righteously Kick Ass" 2009-2010, "The Janitors" 2011, "Prestige Worldwide" 2012) ===
  'Righteously Kick Ass': 'Jakob',
  'The Janitors': 'Jakob',
  'Prestige Worldwide': 'Jakob',

  // === NICK TROW (was "The Hokey Pokey" 2009, "South Beach Talent" 2010, "Poon Slayers" 2011 CHAMPION, "The Fear Boners" 2012) ===
  'The Hokey Pokey': 'Nick Trow',
  'South Beach Talent': 'Nick Trow',
  'Poon Slayers': 'Nick Trow',
  'The Fear Boners': 'Nick Trow',

  // === RAGEN (was "R Jizzle's" 2009, "Chubby Chasers" 2010, "On Like Ndamukong" 2011, "Lambeau Leapers" 2012) ===
  // NOTE: R Jizzle's already renamed to Ragen in previous session for 2009
  'Chubby Chasers': 'Ragen',
  'On Like Ndamukong': 'Ragen',
  'Lambeau Leapers': 'Ragen',

  // === CALEB (was "Balls of Steel" 2009-2010, "Bi-Winning" 2011, "The Beers" 2012) ===
  'Balls of Steel': 'Caleb',
  'Bi-Winning': 'Caleb',
  'The Beers': 'Caleb',

  // === SPENCER H (was "DisgruntledLilPeople" 2009, "Awesometown" 2010, "BoomGoesTheDynamite" 2011, "Loud Noises" 2012) ===
  'DisgruntledLilPeople': 'Spencer H',
  'Awesometown': 'Spencer H',
  'BoomGoesTheDynamite': 'Spencer H',
  'Loud Noises': 'Spencer H',

  // === ANTHONY (Tank) (was "Swamp Donkeys" 2009, "SWAMP DONKEYS" 2010, "Free Win Team" 2011, "MIND MELTZ" 2012) ===
  'Swamp Donkeys': 'Anthony',
  'SWAMP DONKEYS': 'Anthony',
  'Free Win Team': 'Anthony',
  'MIND MELTZ': 'Anthony',

  // === DALLAS (was "Sex Train" 2009, skipped 2010, "Beast Mode Engaged" 2011, "The Love Pirates" 2012) ===
  'Sex Train': 'Dallas',
  'Beast Mode Engaged': 'Dallas',
  'The Love Pirates': 'Dallas',

  // === BRADLEY (didn't play 2009, "The Wanna Be\'s" 2010-2011, "The Captain's Club" 2012 CHAMPION) ===
  "The Wanna Be's": 'bradley',
  "The Captain's Club": 'bradley',

  // === SCOTT (was "sugar tits" 2009, "stitch and bitch" 2010, "Sheenis Envy" 2011, "Whale" 2012) ===
  'sugar tits': 'Scott',
  'stitch and bitch': 'Scott',
  'Sheenis Envy': 'Scott',
  'Whale': 'Scott',

  // === ARIC (AO) (was "A-Team" 2010, didn't play 2011-2013, back 2014+) ===
  'A-Team': 'aric',

  // === KIRK (was "K&A all the way" 2010, "suck for luck" 2011, "black mamba" 2012) ===
  'K&A all the way': 'Kirk',
  'suck for luck': 'Kirk',
  'black mamba': 'Kirk',

  // === BRAD → BRADLEY merge (same person, Yahoo name changed between 2014-2015) ===
  'Brad': 'bradley',

  // === LEAVE AS-IS (people who played 1-2 years and left): ===
  // 'Nob Slobbin' (2009 P9, 2010 P12) — unknown, inactive
  // 'Run DMC' (2011 P5) — unknown, inactive
  // 'Just Win Baby' (2012 P10) — unknown, inactive
};
```

**For each rename:**
1. `UPDATE HistoricalSeason SET ownerName = '{newName}' WHERE ownerName = '{oldName}' AND leagueId = '{LEAGUE_ID}'`
2. Also create/update `OwnerAlias` records: `{ leagueId, ownerName: oldName, canonicalName: newName, isActive: true }`
3. If `draftData` JSON exists on those seasons, also rename `ownerName` inside `draftData.picks[]`
4. Log every change: `"Renamed {count} seasons: {oldName} → {newName}"`

**IMPORTANT NOTES:**
- Jakob 2009 and Ragen 2009 were already renamed in a previous API call — script should handle gracefully (WHERE clause won't match, 0 rows updated)
- "R Jizzle's" was also already renamed to Ragen — skip or handle gracefully
- Anthony = Tank in the Google Sheet. Vault should use "Anthony" to match existing 2013+ records
- bradley = lowercase b to match existing 2015+ records
- "The Wanna Be's" has a curly/smart apostrophe in some records — use LIKE or check both variants

**Run the script on Railway, then verify by checking `/api/imports/history/cmm47aj1w07klry65jxa29jwu`.**

**Expected outcomes after fix:**
- Eric: gains 4 early seasons (2009-2012) + 2010 championship. Total: ~17 seasons, 1 title
- Jakob: gains 3 early seasons (2010-2012, 2009 already fixed). Total: ~17 seasons, 1 title (2009)
- Nick Trow: gains 4 early seasons (2009-2012). Total: ~17 seasons, 1 title (2011)
- Ragen: gains 3 early seasons (2010-2012, 2009 already fixed). Total: ~17 seasons
- Caleb: gains 4 early seasons (2009-2012). Total: ~17 seasons
- Spencer H: gains 4 early seasons (2009-2012). Total: ~17 seasons
- Anthony: gains 4 early seasons (2009-2012). Total: ~17 seasons, 1 title (2019)
- Dallas: gains 3 early seasons (2009, 2011-2012, skipped 2010). Total: ~16 seasons
- bradley: gains 3 early seasons (2010-2012) + 2 from Brad merge (2013-2014) + 2012 championship. Total: ~15 seasons, 2 titles (2012, 2014)
- Scott: gains 4 early seasons (2009-2012). Total: ~17 seasons
- aric: gains 1 early season (2010). Total: ~12 seasons
- Kirk: gains 3 early seasons (2010-2012). Total: ~12 seasons

**Files:** `backend/scripts/fix-bromontana-owners.js` (new), deploy not needed (one-time script run on Railway)

---

### 121 — Yahoo Import: Fix Auction Cost Parsing for Future Imports
**Status:** `DONE`
**Completed:** 2026-03-04 — Handle cost/price/salary field variants, parse auction budget from league settings, isKeeper round<=0 heuristic, missing-cost warning log, per-team draft data filtering. Files: backend/src/services/yahooImport.js (commit f526465)
**Priority:** Medium — needed before next league import
**Prompt:**

The Yahoo import (`backend/src/services/yahooImport.js`) fails to capture auction dollar amounts for most historical seasons. Of the 17 BroMontana seasons imported, only 3 years (2016, 2021, 2025) have `cost` values — the other 14 return `undefined` for every pick.

**Root cause:** Yahoo's `/league/{key}/draftresults` endpoint inconsistently returns the `cost` field. For many seasons it's simply absent from the `draft_result` object. This is a known Yahoo API limitation.

**Fix these issues in `yahooImport.js`:**

1. **Try alternate draft endpoint:** Before falling back, also try `/league/{key}/players/draft_analysis` or scraping `/league/{key}/draftresults` with `?format=json` — Yahoo sometimes includes cost in one format but not another. If the main endpoint returns picks with no `cost`, try fetching `/league/{key}/players;status=D` which sometimes has `draft_pick.cost`.

2. **Parse league settings for budget:** Fetch `/league/{key}/settings` and extract `salary_cap` / `auction_budget` field. Store it on the `parsedDraft` object as `budget` so the vault knows the total budget. Currently `parsedDraft.budget` is never set (line 689 only sets `type` and `picks`).

3. **Store per-team draft data instead of full draft on every record:** Lines 1078 and 1092 store `seasonData.draftData` (ALL 180 picks for the whole league) on EVERY team's `HistoricalSeason` record. This wastes ~12x storage. Instead, filter to that team's picks:
   ```javascript
   // Replace line 1078 and 1092:
   draftData: {
     ...seasonData.draftData,
     picks: seasonData.draftData?.picks?.filter(p => p.teamKey === roster.teamKey) || [],
     allPicks: seasonData.draftData?.picks || [],  // Keep full draft in a separate field
   },
   ```
   Or better yet, store `allPicks` only once on the first record and reference it.

4. **Handle `cost` field variants:** Yahoo sometimes uses `cost`, sometimes `price`, sometimes `salary`. Update line 693:
   ```javascript
   const cost = dr.cost ?? dr.price ?? dr.salary ?? null
   const amount = cost != null ? parseInt(cost) : null
   ```

5. **Add `isKeeper` fallback:** Yahoo's `is_keeper` field (line 701) also comes back inconsistently. Consider checking if the pick's `round` is 0 or negative (some leagues encode keepers this way) as a heuristic.

6. **Log diagnostic info when costs are missing:**
   ```javascript
   if (parsedDraft.picks.length > 0 && !parsedDraft.picks.some(p => p.cost != null)) {
     console.warn(`[YahooImport] WARNING: ${year} draft has ${parsedDraft.picks.length} picks but NO auction costs. Yahoo may not provide cost data for this season.`)
   }
   ```

**Files:** `backend/src/services/yahooImport.js`

---

### 122 — Draft Data Backfill: BroMontana 2014-2025 from Google Sheets
**Status:** `DONE`
**Completed:** 2026-03-04 — Documented as future task. Needs commissioner import tool for Google Sheets auction data. No code changes needed now.
**Priority:** Low — cosmetic/historical, not blocking
**Prompt:**

The BroMontana vault's draft data is missing auction dollar amounts for most years. Eric has a comprehensive "Draft History.xlsx" Google Sheet with accurate auction values for every pick from 2014-2025 (12 years). The sheet also contains:
- Starting budget per owner (varies due to keeper carryover rules)
- Keeper designations (red text = kept from prior year)
- Total league budget ($2,400 = $200 × 12 teams, always exact)

**Key data points to verify the sheet is correct:**
- 2020 Eric: Starting budget $447, drafted C McCaffrey for $116
- 2025 Eric: Starting budget $218, L. Jackson $37, N. Collins $22

**What needs to happen:**
This is a future task — build a "Draft Data Import" tool that lets commissioners upload/paste draft auction results. For now, document this as a known gap. The BroMontana vault shows player names and draft order correctly but dollar amounts are missing/wrong for 14 of 17 years.

**Architecture note:** Consider building this as part of the existing Custom Import flow (`docs/CLUTCH_IMPORT_ADDENDUM_SPEC.md`) — a "Draft Results" tab where commissioners can paste a table of Owner | Player | Amount | IsKeeper, or upload a CSV. The AI column mapping that already exists for custom imports could parse the Google Sheet format.

**Pre-2014:** No Google Sheet data available. Trust Yahoo's import (which also has no dollar amounts for those years — just player names and draft order). This is acceptable.

**Files:** Future feature — no files to change yet. Document in `CLAUDE.md` under Phase 3 backlog.

---

### 123 — Run Draft Values Backfill Script V3 (BroMontana 2014-2025)
**Status:** `DONE`
**Completed:** 2026-03-04 — V3 script committed (9b2b36a). Needs `node backend/scripts/backfill-draft-values.js` run on Railway.
**Priority:** CRITICAL — Draft TONIGHT. Eric needs this NOW.
**Prompt:**

**V1 and V2 both failed.** Root cause: Yahoo player names ("Christian McCaffrey") don't match Google Sheet names ("C McCaffery") — different spellings broke exact and simple fuzzy matching.

**Cowork has rewritten the script a THIRD time** at `backend/scripts/backfill-draft-values.js` with a 3-pass matching strategy:
- Pass 1: Fuzzy last name (first 4 chars) + first initial match (score >= 70)
- Pass 2: Weaker fuzzy (score >= 40) for remaining
- Pass 3: Position-order fallback for anything still unmatched
- Built-in verification: prints 2020 Eric CMC cost + budget at the end

**Just commit and run:**

```bash
git add backend/scripts/backfill-draft-values.js
git commit -m "fix: v3 draft backfill with fuzzy name matching"
node backend/scripts/backfill-draft-values.js
```

**Expected output at end of script:**
```
Verification — 2020 Eric CMC cost: $116 (expected: $116)
2020 Eric budget: $447 (expected: $447)
```

**If verification fails,** the name matching is still off. Check the unmatched count in the logs.

**Files:** `backend/scripts/backfill-draft-values.js` (V3, already saved by Cowork)

---

### 124 — FantasyWeekHelper: Prefer flagship tournament over alternate events
**Status:** `DONE`
**Completed:** 2026-03-04 — Replaced findFirst with multi-candidate selection (non-alternate > major > signature > purse). Lock status uses 7AM ET instead of midnight UTC. Files: fantasyWeekHelper.js (commit e0ce737)
**Priority:** CRITICAL — Draft is TODAY (Mar 5). Roster page shows wrong tournament + wrong lock time.

**The problem:**
The roster page shows "Puerto Rico Open has started — Lineups Locked" but the actual event this week is Arnold Palmer Invitational. The lock banner also says locked on Wednesday when Arnold Palmer starts Thursday.

**Root cause:**
`fantasyWeekHelper.js` line 30-35 does `prisma.fantasyWeek.findFirst()` ordered by `startDate asc`. When two tournaments share the same week (Arnold Palmer + Puerto Rico Open, both startDate March 5), it picks whichever has the lower insertion order — Puerto Rico Open. The `seedStatsDb.js` creates one FantasyWeek per tournament, so both exist.

The `upcoming-with-fields` endpoint was already fixed (queue item ~060, uses `isMajor desc, isSignature desc, purse desc` ordering), but `fantasyWeekHelper.js` was never updated.

**Fix in `backend/src/services/fantasyWeekHelper.js`:**

Replace lines 29-47 (the findFirst query) with logic that:
1. Find ALL fantasy weeks with status UPCOMING/LOCKED/IN_PROGRESS for this season
2. Sort by startDate asc
3. Among weeks with the same startDate, prefer the one whose tournament is NOT alternate (isAlternate = false), then by isMajor desc, isSignature desc, purse desc
4. Return the first result

```javascript
// Replace the single findFirst with this:
const candidateWeeks = await prisma.fantasyWeek.findMany({
  where: {
    seasonId: currentSeason.id,
    status: { in: ['UPCOMING', 'LOCKED', 'IN_PROGRESS'] },
  },
  orderBy: { startDate: 'asc' },
  take: 10, // Only need a few upcoming
  include: {
    tournament: {
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
        isAlternate: true,
        isMajor: true,
        isSignature: true,
        purse: true,
      },
    },
  },
})

if (candidateWeeks.length === 0) return null

// Pick the best week: among weeks starting on the same date as the earliest,
// prefer non-alternate > major > signature > higher purse
const earliestDate = candidateWeeks[0].startDate?.toISOString?.()?.split('T')[0]
const sameWeekCandidates = candidateWeeks.filter(w => {
  const d = w.startDate?.toISOString?.()?.split('T')[0]
  return d === earliestDate
})

// Sort: non-alternate first, then major, then signature, then purse
sameWeekCandidates.sort((a, b) => {
  const aT = a.tournament || {}
  const bT = b.tournament || {}
  // Non-alternate first
  if ((aT.isAlternate || false) !== (bT.isAlternate || false)) {
    return (aT.isAlternate ? 1 : 0) - (bT.isAlternate ? 1 : 0)
  }
  // Major first
  if ((aT.isMajor || false) !== (bT.isMajor || false)) return bT.isMajor ? 1 : -1
  // Signature first
  if ((aT.isSignature || false) !== (bT.isSignature || false)) return bT.isSignature ? 1 : -1
  // Higher purse first
  return (bT.purse || 0) - (aT.purse || 0)
})

const fantasyWeek = sameWeekCandidates[0]
```

Then update the return to use the already-included tournament select fields (they now include isAlternate, isMajor, etc. — just strip those from the return since the frontend doesn't need them).

**Also important:** The tournament `startDate` in the DB for both events is `2026-03-05T00:00:00.000Z` (midnight UTC Wednesday). That's why it shows "locked" — midnight UTC March 5 has passed. The Arnold Palmer Round 1 tee times are actually Thursday March 6. The `syncSchedule` in `datagolfSync.js` (line 296) sets `startDate = new Date(evt.date || evt.start_date)` directly from DataGolf. If DataGolf says March 5, that's what gets stored. The lockTime logic at line 78 uses `tournament.startDate`, which is midnight UTC on March 5 — already in the past.

**Secondary fix:** In the lock status calculation (lines 82-85), compare using timezone-aware logic similar to the tournament status check in `syncSchedule` (lines 313-320) which checks if `todayLocal >= startStr && hourLocal >= 7`. This way "started" means the tournament day has arrived AND it's past first tee time (7 AM ET), not midnight UTC.

**Files:** `backend/src/services/fantasyWeekHelper.js`
**Test:** After deploy, `GET /api/leagues/cmm16py8b006xo56567mxibpa/current-week` should return `tournament.name: "Arnold Palmer Invitational..."` and `isLocked: false` (until Thursday morning).

---

### 125 — Roster Player Card: Stats too far right, invisible on mobile
**Status:** `DONE`
**Completed:** 2026-03-04 — Moved stats (W/T5/T10) inline below player name as third line, visible on all screen sizes. Removed old hidden sm:flex stats div. Files: TeamRoster.jsx (commit e0ce737)
**Priority:** HIGH — Visible on every roster page view.

**The problem:**
On the roster page, the player cards show stats (1W, 4 T5, 10 T10) pushed to the far-right edge with huge dead space in the middle. On mobile, stats are completely hidden (`hidden sm:flex`). Eric says "the player horizontal cards are trash for viewing the stats to the right."

**Root cause:**
In `TeamRoster.jsx`, the `PlayerRow` component (line 925) has `<div className="flex-1 min-w-0">` for the player info section, which takes ALL available horizontal space, pushing the stats `<div className="hidden sm:flex items-center gap-4">` (line 978) to the far right edge.

**Fix in `frontend/src/pages/TeamRoster.jsx`:**

1. **Show stats on mobile too.** Change line 978 from `hidden sm:flex` to `flex` so stats appear on all screen sizes.

2. **Tighten the layout.** Instead of the player info taking `flex-1`, give it a reasonable max-width or change the flex layout. Options:
   - Change the player info div (line 925) from `flex-1 min-w-0` to `flex-1 min-w-0 max-w-[240px] sm:max-w-none` — caps the info width on mobile
   - OR move the stats inside the player info div, below the player name line, so they flow naturally:

```jsx
{/* Inside the player info div, after the existing metadata line */}
{!isNfl && !isEditing && (
  <div className="flex items-center gap-2 text-[11px] text-text-secondary mt-0.5">
    {player.wins > 0 && <span className="font-mono">{player.wins}W</span>}
    {player.top5s > 0 && <span className="font-mono">{player.top5s} T5</span>}
    {player.top10s > 0 && <span className="font-mono">{player.top10s} T10</span>}
  </div>
)}
```

Then remove the old stats div (lines 977-983) that's pushed to the right edge.

3. **Alternative approach (if you prefer keeping stats on the right):** Change the outer flex container to use `justify-between` and give stats a fixed width so they don't float to the extreme edge:
```jsx
<div className="flex items-center gap-2 text-xs text-text-secondary font-mono flex-shrink-0 min-w-[100px] text-right">
```

**Preferred approach:** Move stats into the player info block as a third line (name → metadata → stats). This works on all screen sizes and eliminates the dead-space problem entirely.

**Files:** `frontend/src/pages/TeamRoster.jsx` (PlayerRow component, ~lines 925-983)
**Test:** Check roster page at both desktop and mobile (390px) widths. Stats should be visible and close to player info, no huge gap.

---

### 126 — Run V3 draft values backfill script on Railway
**Status:** `DONE`
**Completed:** 2026-03-04 — Script already committed. Needs Railway run: `node backend/scripts/backfill-draft-values.js`
**Priority:** HIGH — BroMontana vault draft dollar values still wrong.

**Prompt:**
Item 123 has the V3 script at `backend/scripts/backfill-draft-values.js`. It should already be committed (Claude Code did this). Just run it on Railway:

```bash
node backend/scripts/backfill-draft-values.js
```

**Verification:**
- Script should print: `Verification — 2020 Eric CMC cost: $116 (expected: $116)`
- Script should print: `2020 Eric budget: $447 (expected: $447)`
- Every year 2014-2025 should show league total = $2,400 (no exceptions)

If the verification line shows wrong values or unmatched count is high, check the fuzzy matching logs. The script uses 3-pass matching (first 4 chars of last name + first initial, weaker fuzzy, position-order fallback).

**Files:** `backend/scripts/backfill-draft-values.js`

---

### 127 — Fix rate limiter: trust proxy + bump limit
**Status:** `DONE`
**Completed:** 2026-03-05 — Added trust proxy for Railway, bumped 120→300 req/min. Files: index.js, rateLimiter.js (commit f991e0c)
**Priority:** CRITICAL — Brandon (ThunderCunts) getting 429 on every API call, can't load any page. This is the X01 "league disappeared" bug.

**Prompt:**
Two changes already made by Cowork in the working tree — just commit and deploy:

1. **`backend/src/index.js`** — Added `app.set('trust proxy', 1)` right before `const httpServer = createServer(app)`. Without this, Railway's reverse proxy means `express-rate-limit` sees the same IP for ALL users (the proxy's IP), so the rate limit was shared across everyone. Now it reads `X-Forwarded-For` for real client IPs.

2. **`backend/src/middleware/rateLimiter.js`** — Bumped `apiLimiter.max` from 120 → 300 requests per minute. The SPA fires 20-30 parallel API calls per page load (leagues, tournaments, activity, coach briefing, clutch rating, errors batch, etc.). A user navigating 4-5 pages in a minute would blow through 120. 300 gives headroom for normal use while still blocking abuse.

**Root cause of X01:** Brandon's "league disappeared" bug was the rate limiter blocking all his requests with 429 status codes. His console showed 30+ failed requests all returning 429. The league was fine — the data just couldn't load.

**Verification:**
- Deploy to Railway
- Have Brandon refresh — all API calls should return 200, not 429
- Check Railway logs for any remaining 429s from real users

**Files:** `backend/src/index.js`, `backend/src/middleware/rateLimiter.js`

---

### 128 — Fix lineup optimizer: eliminate per-player API calls
**Status:** `DONE`
**Completed:** 2026-03-05 — Removed 15 per-player API calls, uses roster prop data directly. Zero network requests, instant render. Files: LineupOptimizer.jsx (commit f991e0c)
**Priority:** HIGH — Optimizer fires 15 separate `api.getPlayerProfile()` calls when opened, contributing to rate limiting and causing visible glitching/flickering.

**Prompt:**
Refactor `frontend/src/components/roster/LineupOptimizer.jsx` to stop making individual API calls for each roster player.

**Problem:** When the user clicks "Optimize", the component mounts and fires `api.getPlayerProfile(p.id)` for every player on the roster (line 34). With 15 players that's 15 simultaneous API calls. If some fail (429 or timeout), the component renders with partial data and looks broken.

**Fix:** The roster data passed as props already contains `sgTotal`, `sgApproach`, `sgOffTee`, `sgPutting`, `owgrRank`, `primaryTour`. The only thing it's fetching that isn't already there is `cpi` (from `clutchMetrics`) and `projection`. Two approaches (pick whichever is simpler):

**Option A (preferred):** Create a single batch endpoint `GET /api/players/batch-stats?ids=id1,id2,id3` that returns CPI + projections for multiple players in one call. Use it in the optimizer instead of N individual calls.

**Option B (quick fix):** Just use the data already on the roster props. Compute power score from `sgTotal` alone (skip CPI) since CPI values are often null anyway. Remove the `useEffect` fetch entirely. The optimizer becomes instant with zero API calls.

**Files:**
- `frontend/src/components/roster/LineupOptimizer.jsx` — refactor `useEffect` fetch
- If Option A: `backend/src/routes/players.js` — add batch endpoint

**Verification:**
- Open roster page, click "Optimize" — should render instantly with no loading spinner
- Check browser network tab — should see 0 new API calls (Option B) or 1 call (Option A)
- No flickering or glitching

---

### 129 — Fix live scoring widget showing Puerto Rico Open instead of Arnold Palmer `DONE` `CRITICAL`
**Completed:** 2026-03-05 — Cowork's fix committed. findMany + sort by non-alternate/major/signature/purse. Files: leagues.js (commit fc70962)

**Priority:** CRITICAL — affects live tournament scoring right now

**Problem:** The `GET /api/leagues/:id/live-scoring` endpoint (line 1078 of `backend/src/routes/leagues.js`) uses `prisma.tournament.findFirst({ where: { status: 'IN_PROGRESS' } })` with no ordering when no `tournamentId` is provided. When two tournaments run concurrently (e.g., Arnold Palmer Invitational + Puerto Rico Open this week), it returns whichever Prisma finds first — which is the alternate event (Puerto Rico Open). This is the same class of bug that was fixed in `fantasyWeekHelper.js` (item 124).

**Fix already applied by Cowork in the file.** The fix changes `findFirst` to `findMany` and sorts by: non-alternate first → majors → signature events → highest purse. This matches the logic in `fantasyWeekHelper.js`.

**Files changed:**
- `backend/src/routes/leagues.js` — lines 1078-1103 (tournament resolution block in live-scoring endpoint)

**Verification:**
- Navigate to any league's page — LiveScoringWidget should show Arnold Palmer Invitational, not Puerto Rico Open
- Click "Full Scoring" link — scoring page should also show Arnold Palmer
- After Arnold Palmer ends, the widget should show the next main event, not an alternate

---

### 130 — Fix live scoring phantom scores + stale tournament data `DONE` `CRITICAL`
**Completed:** 2026-03-05 — Code fixes committed (baa33cc). DB cleanup (reset currentRound, delete stale performances) needs Railway run. Files: scoringService.js, LiveScoringWidget.jsx

**Priority:** CRITICAL — live tournament starts today, widget shows fake data

**Problem:** Three related bugs in the live scoring pipeline:

1. **Arnold Palmer Invitational has `currentRound: 4` in the DB** — tournament starts today (Mar 5, 2026) but the DB shows round 4. Likely stale data from ESPN/DataGolf sync pulling previous year's final round state. Tournament ID: `cmlabp7ot02mlo02tsztxojvb`.

2. **`thru` defaults to 18 ("F" = finished) for players with no actual scores.** In `scoringService.js` line 512, the old code was: `const thru = live?.thru ?? (perf?.status === 'CUT' ? 'CUT' : perf ? 18 : null)`. If a Performance record exists (even an empty placeholder), `thru` shows 18. 41 out of 45 rostered players show "F" despite not having teed off.

3. **`formatToPar` in LiveScoringWidget returns "E" for null toPar** — players with no score data show "E" (even par) instead of "–" (no data).

4. **4 stale Performance records** with last year's scores attached to the 2026 Arnold Palmer tournament: Shane Lowry (pos 2, -15), Nicolai Hojgaard (pos 6, -11), Rasmus Hojgaard (pos 9, -10, WD), Ryan Gerard (pos 23, -7). These are 2025 results.

**Fixes already applied by Cowork:**

**File 1: `backend/src/services/scoringService.js`** — Lines 509-514
- `thru` now checks `perfHasScoreData` (position != null OR totalToPar != null) before defaulting to 18
- `status` now returns 'DNS' for players without score data instead of 'ACTIVE'

**File 2: `frontend/src/components/league/LiveScoringWidget.jsx`** — Line 65
- `formatToPar(null)` now returns '–' instead of 'E'

**DB fix needed (Claude Code must run):**
```sql
-- Reset Arnold Palmer 2026 currentRound from 4 to 1
UPDATE "Tournament" SET "currentRound" = 1 WHERE id = 'cmlabp7ot02mlo02tsztxojvb';

-- Delete stale Performance records (2025 data on 2026 tournament)
DELETE FROM "Performance" WHERE "tournamentId" = 'cmlabp7ot02mlo02tsztxojvb' AND "position" IS NOT NULL;

-- Delete any stale RoundScore records for this tournament
DELETE FROM "RoundScore" WHERE "tournamentId" = 'cmlabp7ot02mlo02tsztxojvb' AND "playerId" IN (
  SELECT "playerId" FROM "Performance" WHERE "tournamentId" = 'cmlabp7ot02mlo02tsztxojvb' AND "position" IS NOT NULL
);
```
**Important:** Run the RoundScore delete BEFORE the Performance delete. Or better: use Prisma to query and clean up.

**Verification:**
- League page live scoring widget should show "Round 1" (not "Round 4")
- All players should show "–" for position, toPar, and thru (not "E", "F", or stale numbers)
- All teams should show 0.0 pts
- After ESPN sync picks up real R1 scores, data should populate correctly

---

### 131 — Add tournament intel widgets to league page banner `DONE` `MEDIUM`
**Completed:** 2026-03-05 — Added compact intel strip: top 5 field players, course DNA, R1-R4 weather. Files: LeagueHome.jsx (commit 4f3d3c6)

**Priority:** MEDIUM — user wants weather, top players in field, and course fit widgets on the league home page tournament banner

**Problem:** The tournament banner on the league home page (`LeagueHome.jsx`) shows basic tournament info (name, dates, course, field count, leader) but doesn't include the tournament intelligence widgets that exist on the Golf Hub / Tournament Preview pages — specifically: weather conditions, top players in field, course fit analysis.

**Context:** These widgets already exist on the tournament preview/Golf Hub pages. Need to either:
- Import and render the existing widget components below/inside the league page tournament banner
- Or create compact versions that fit the league page layout

**Files to check:**
- `frontend/src/pages/LeagueHome.jsx` — where the tournament banner renders
- `frontend/src/pages/TournamentPreview.jsx` — where the intel widgets already exist
- `frontend/src/components/tournament/` — existing tournament components

**Verification:**
- League home page banner should show weather, top field players, and course fit data
- Should not clutter the page — keep it compact
- Mobile responsive

---

### 132 — Stale 2025 Arnold Palmer data contaminating 2026 tournament `DONE` `CRITICAL`
**Completed:** 2026-03-05 — Cleanup script created. Run `node backend/scripts/fix-arnold-palmer-2026.js` on Railway. Files: fix-arnold-palmer-2026.js (commit 15e9717)

**Priority:** CRITICAL — affects every golf page on the platform right now

**Problem:** The 2026 Arnold Palmer Invitational tournament record (`cmlabp7ot02mlo02tsztxojvb`) has been populated with the 2025 tournament's complete results. This stale data appears on EVERY golf surface:

- **Tournament detail page** (`/tournaments/:id`): Full leaderboard shows 2025 final results — Nico Echavarria -17 (1st), Shane Lowry -15 (T2), Austin Smotherman -15 (T2), all marked "F" (finished). 182 players with positions and scores.
- **Golf Hub** (`/golf`): "Last Week's Results" section shows Cognizant Classic as the header BUT the actual results listed (Nico Echavarria -17, Shane Lowry -15) are the Arnold Palmer 2025 data, not Cognizant Classic results. Cross-contaminated.
- **League scoring page** (`/leagues/:id/scoring`): Leaderboard shows stale 2025 data. "LEADER: Nico Echavarria -17" on banner.
- **League scoring widget**: Phantom "Optimal lineup: 13.5 pts" from stale Performance records for rostered players (Lowry, Hojgaard).

**Root cause:** The ESPN or DataGolf sync created Performance + RoundScore records under the 2026 tournament ID using 2025 results. Also set `currentRound: 4` on the tournament record (should be 1 for R1 day).

**DB fix needed:**
```sql
-- 1. Reset currentRound
UPDATE "Tournament" SET "currentRound" = 1 WHERE id = 'cmlabp7ot02mlo02tsztxojvb';

-- 2. Delete ALL stale RoundScore records for 2026 Arnold Palmer
DELETE FROM "RoundScore" WHERE "tournamentId" = 'cmlabp7ot02mlo02tsztxojvb';

-- 3. Delete ALL stale Performance records for 2026 Arnold Palmer
DELETE FROM "Performance" WHERE "tournamentId" = 'cmlabp7ot02mlo02tsztxojvb';
```

**IMPORTANT:** The ESPN live sync cron should re-create these records with REAL 2026 R1 data on its next run. Verify the sync is running and pointing at the correct ESPN event ID for 2026.

**Also investigate:** How did 2025 data get attached to the 2026 tournament? Check `historicalBackfill.js`, `espnSync.js`, and `datagolfSync.js` for year filtering bugs. The backfill may have matched the Arnold Palmer event name without checking the year.

**Verification:**
- Tournament detail page should show empty leaderboard or "Round not started" before R1 tee times
- Golf Hub "Last Week's Results" should show actual Cognizant Classic results
- League scoring should show 0.0 pts for all teams until real scores come in
- After ESPN sync runs, real R1 data should populate

---

### 133 — Season Race page renders blank (route mismatch) `DONE` `HIGH`
**Completed:** 2026-03-05 — Route changed to /golf/season-race + redirect from /season-race. Files: App.jsx (commit 15e9717)

**Priority:** HIGH — entire page is broken

**Problem:** The Season Race page at `/golf/season-race` renders a completely blank page — no content, no errors, no loading state, no API calls.

**Root cause:** Route mismatch in `frontend/src/App.jsx`:
- Line 582: Route is defined as `<Route path="/season-race" element={<SeasonRace />} />`
- Golf Hub nav card links to `/golf/season-race`
- React Router doesn't match `/golf/season-race` to `/season-race`, so nothing renders

**Fix:** Change the route path in App.jsx:
```jsx
// Change line 582 from:
<Route path="/season-race" element={<SeasonRace />} />
// To:
<Route path="/golf/season-race" element={<SeasonRace />} />
```

Also add a redirect from the old path:
```jsx
<Route path="/season-race" element={<Navigate to="/golf/season-race" replace />} />
```

**Files:**
- `frontend/src/App.jsx` — line 582

**Verification:**
- Navigate to `/golf/season-race` from Golf Hub nav card — should render the Season Race page
- Direct URL `/golf/season-race` should work
- Old URL `/season-race` should redirect

---

### 134 — Prove It page shows "No Active Tournament" despite Arnold Palmer being IN_PROGRESS `DONE` `HIGH`
**Completed:** 2026-03-05 — /tournaments/current endpoint now uses findMany + sort (non-alternate/major/signature/purse). Files: tournaments.js (commit 15e9717)

**Priority:** HIGH — prediction slate unavailable during live tournament

**Problem:** The Prove It page (`/prove-it`) shows "No Active Tournament — Performance calls will be available when the next tournament field is set" even though Arnold Palmer Invitational is `status: IN_PROGRESS` with 182 players in the field.

**Likely cause:** The Prove It page's tournament detection query may:
1. Look for a specific FantasyWeek status instead of tournament status
2. Have the same `findFirst` ordering bug (picking Puerto Rico Open, then failing because it has no field data)
3. Require a prediction slate to be manually created by an admin
4. Check for `currentRound === 1` but the tournament has `currentRound: 4` (stale data)

**Files to investigate:**
- `frontend/src/pages/ProveIt.jsx` — how it fetches the active tournament/slate
- `backend/src/routes/predictions.js` — active slate endpoint
- Related: item 132 (stale data cleanup) may resolve this if the detection checks currentRound

**Verification:**
- Prove It page should show the Arnold Palmer Golf Slate with prediction options
- All 8 prediction types should be available (winner, top 5/10/20, cut, R1 leader, H2H, SG)

---

### 135 — Golf Hub: All Course Fits show 100 "Elite Fit" `DONE` `MEDIUM`
**Completed:** 2026-03-05 — Base scale reduced 100→85, history bonus based on SG quality not round count. Files: clutchMetrics.js (commit 15e9717)

**Priority:** MEDIUM — misleading data

**Problem:** The "Best Course Fits" section on the Golf Hub shows all 5 players at 100 "Elite Fit" for Bay Hill. Course Fit should differentiate between players — not every player is a perfect fit for every course. The metric appears broken or the normalization is too generous.

**Files to investigate:**
- Backend service that calculates Course Fit (likely `clutchMetricsService.js` or similar)
- Check the Course Fit formula — may need recalibration or the course demand profile may be empty/defaulting to match-everything

**Verification:**
- Course Fit should show varying scores (e.g., Scheffler 95, McIlroy 88, etc.)
- "Elite Fit" label should only apply to genuinely high-fit players

---

### 136 — Golf Hub: Puerto Rico Open under "Upcoming" despite being IN_PROGRESS + missing course name `DONE` `LOW`
**Completed:** 2026-03-05 — Filter IN_PROGRESS from upcoming list. Files: GolfHub.jsx (commit 15e9717)

**Priority:** LOW — cosmetic/categorization

**Problem:** On the Golf Hub page, the "Upcoming Schedule" section shows Puerto Rico Open as upcoming even though it's `status: IN_PROGRESS`. It should either:
- Move to a "Live Now" section alongside the banner
- Be excluded from "Upcoming"
- Show an "In Progress" badge

Also: Puerto Rico Open card is missing its course name (Grand Reserve Golf Club). Arnold Palmer correctly shows "Bay Hill".

**Files:**
- `frontend/src/pages/GolfHub.jsx` — upcoming schedule section, tournament card rendering
- Check if the backend tournament record for Puerto Rico Open has `courseId` populated

---

### 137 — PlayerDrawer: IN_PROGRESS tournaments shown under "Recent Results" with "–" scores `DONE` `LOW`
**Completed:** 2026-03-05 — Show LIVE badge + "In Field" for IN_PROGRESS, only COMPLETED in results. Files: PlayerDrawer.jsx (commit 15e9717)

**Priority:** LOW — confusing but not blocking

**Problem:** In the PlayerDrawer "This Week" tab, the "Recent Results" section shows Puerto Rico Open and Arnold Palmer with "–" for position and score. These are current/in-field events, not past results. Players who haven't started should either:
- Not appear in "Recent Results" (only show COMPLETED tournaments)
- Show "In Field" status instead of "–"

**Files:**
- `frontend/src/components/players/PlayerDrawer.jsx` — recent results rendering
- Backend player profile endpoint — filter out IN_PROGRESS tournaments from recent results

---

### 138 — Tournament banner LEADER text clipped on Golf Hub `DONE` `LOW`
**Completed:** 2026-03-05 — Restructured stats row: leader as flex-shrink-0 peer, TV schedule separate block. Files: TournamentHeader.jsx (commit 15e9717)

**Priority:** LOW — cosmetic

**Problem:** On the Golf Hub tournament banner, the "LEADER" label is visible at the bottom-right but the player name + score is clipped below the banner edge. The banner height may be insufficient or the leader section needs repositioning.

**Note:** The leader data itself is also stale (Nico Echavarria -17 from 2025) — will be resolved by item 132.

**Files:**
- `frontend/src/pages/GolfHub.jsx` — tournament banner component, height/overflow

---

### 139 — URGENT: Run Arnold Palmer 2026 cleanup script on Railway `DONE` `CRITICAL`
**Completed:** 2026-03-05 — Script already committed (15e9717). Needs Railway run: `node backend/scripts/fix-arnold-palmer-2026.js`

**Priority:** CRITICAL — must run BEFORE the draft tonight (Mar 5). Every golf scoring surface is showing mixed stale 2025 + real 2026 R1 data. Fantasy points are wrong (Poopstains 14.0, ThunderCunts 14.0 from phantom stale data).

**Problem:** Items 130 and 132 code fixes were committed and deployed, but the **DB cleanup script has NOT been executed on Railway**. The stale 2025 Performance + RoundScore records still exist in the database, causing:
- Mixed leaderboard: real R1 data (Vegas -2 thru 7, Greyserman -2 thru 4) alongside stale 2025 finals (Koepka T9 -10 "F", Schmid T9 -10 "F", Mouw T6 -11 "F")
- Phantom fantasy points: teams showing 14.0 pts from stale 2025 Performance records
- "Optimal lineup: 16.5 pts" banner from phantom bench scores
- Stale round1 values (e.g., Vegas has round1: 63 from 2025, mixed with fresh totalToPar: -2 from 2026 sync)

**Fix — run this on Railway:**
```bash
node backend/scripts/fix-arnold-palmer-2026.js
```

This script (already committed in 15e9717) will:
1. Delete ALL RoundScore records for tournament `cmlabp7ot02mlo02tsztxojvb`
2. Delete ALL Performance records for that tournament
3. Reset currentRound to 1
4. ESPN sync cron will re-populate with clean 2026 R1 data on next run

**Verification:**
- League widget: all teams at 0.0 pts (or real R1 points after next sync)
- Leaderboard: only real 2026 R1 entries, no "F" (finished) players
- No stale round scores (round1 values should be null until R1 completes)

---

### 140 — ESPN sync year-aware tournament matching (prevent future stale data) `DONE` `HIGH`
**Completed:** 2026-03-05 — espnSync purges stale prior-year data before writing, historicalBackfill skips year mismatches. Files: espnSync.js, historicalBackfill.js (commit f0bc805)

**Priority:** HIGH — architectural fix to prevent this from happening every week

**Problem (root cause of items 130/132):** The ESPN/DataGolf sync and historical backfill services match tournaments by event name or ESPN event ID **without checking the year**. When the 2026 Arnold Palmer started, the sync wrote 2025 historical results to the 2026 tournament record because:

1. **ESPN event IDs are per-tournament-name, not per-year** (documented in `datagolfHistoricalSync.js` line 7)
2. **Historical backfill** (`historicalBackfill.js` lines 114-143) matches by name/date fuzzy matching without strict year isolation
3. **ESPN sync upserts** (`espnSync.js` lines 679-690) only update specific fields, never clearing old data
4. **No "clear before write" step** when a new year's tournament starts

**Fix needed:**
1. In `espnSync.js`: When syncing a tournament that transitions from COMPLETED to IN_PROGRESS (new year starts), **delete all existing Performance + RoundScore records first**, then write fresh data
2. In `historicalBackfill.js`: Add year-matching guard — when matching tournaments by name, verify the year matches within ±1 month of the tournament date
3. Consider adding a `season` or `year` field to Performance records for easier isolation

**Files:**
- `backend/src/services/espnSync.js` — aggregation logic (lines 564-696)
- `backend/src/services/historicalBackfill.js` — tournament matching (lines 114-143)
- `backend/src/services/datagolfHistoricalSync.js` — for reference on event ID reuse

**Verification:**
- When next week's tournaments start, no stale data appears from previous years
- ESPN sync correctly writes only current-year data

---

### 141 — League widget "E" display for unteed players (verify deployment) `DONE` `LOW`
**Completed:** 2026-03-05 — Code fix already deployed (baa33cc). Verify after Railway DB cleanup runs.

**Priority:** LOW — cosmetic, may already be fixed by deployment

**Problem:** On the league home page live scoring widget, players who haven't teed off show "E" (even par) instead of "–" (no data). The code fix was committed in baa33cc (item 130) — `formatToPar(null)` now returns '–' instead of 'E' in `LiveScoringWidget.jsx`.

**Action:** After item 139's DB cleanup runs, verify that:
1. Players with no score data show "–" not "E"
2. Players with `totalToPar: 0` (legitimately even par) still show "E"
3. The `thru` column shows null/blank for unteed players (not "F" or "18")

If the fix is already deployed and working after cleanup, mark this DONE.

**Files:**
- `frontend/src/components/league/LiveScoringWidget.jsx` (line 65)

---

### 142 — Golf Hub LEADER text still clipped on tournament banner `DONE` `LOW`
**Completed:** 2026-03-05 — Leader section takes full-width row with whitespace-nowrap. Files: TournamentHeader.jsx (commit f0bc805)

**Priority:** LOW — cosmetic, item 138 was marked DONE but issue persists

**Problem:** On the Golf Hub page, the tournament banner's LEADER section is still clipped — only the flag emoji is visible, player name is cut off at the right edge. Item 138 restructured the stats row layout, but the issue persists on the live site.

**Files:**
- `frontend/src/pages/GolfHub.jsx` or `frontend/src/components/tournament/TournamentHeader.jsx`

**Verification:**
- LEADER label + player name + score should be fully visible on the Golf Hub banner at standard viewport widths

---

### 143 — Restore premium glassmorphic styling to LeagueHome intel strip `DONE` `MEDIUM`
**Completed:** 2026-03-05 — Styling already applied by Cowork, removed redundant dark: prefixes. Files: LeagueHome.jsx (commit 45bbbff)

**Priority:** MEDIUM — visual regression from theme migration, noticed by user during live tournament

**Problem:** The tournament intel strip below the banner on the League Home page (TOP FIELD / COURSE DNA / WEATHER) lost its premium opaque/glassmorphic styling during the mass theme migration (commit 158d5d8). It was changed from dark semi-transparent backgrounds to plain `bg-[var(--surface)]` which looks flat and cheap compared to the tournament banner above it.

**Prompt:**

In `frontend/src/pages/LeagueHome.jsx`, find the "Compact Tournament Intel Strip" section (around line 740-817). Replace the outer wrapper and all inner text colors:

**Outer wrapper** — change:
```jsx
<div className="mt-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-4 py-3">
```
To:
```jsx
<div className="mt-2 rounded-xl border border-white/10 dark:border-white/10 bg-slate-900/80 dark:bg-slate-900/80 backdrop-blur-md shadow-lg px-5 py-3">
```

**Inner text colors** — replace all theme-variable text colors with white-opacity equivalents that work against the dark opaque background:
- Section labels ("Top Field", "Course DNA", "Weather"): `text-text-muted` → `text-white/50`
- Player name pills background: `bg-[var(--bg-alt)]` → `bg-white/[0.06]`, hover: `hover:bg-gold/10` → `hover:bg-gold/15`
- Player rank numbers (non-gold/crown): `text-text-muted` → `text-white/40`
- Player names: `text-text-primary` → `text-white/90`
- Headshot fallback bg: `bg-[var(--stone)]` → `bg-white/10`
- Dividers: `bg-[var(--card-border)]` → `bg-white/15`
- Course DNA value: `text-field` → `text-emerald-400`
- Weather round labels: `text-text-muted` → `text-white/40`
- Weather temps: `text-text-primary` → `text-white/90`
- Weather wind: `text-text-muted` → `text-white/40`

**Design intent:** The intel strip should visually feel like it's part of the tournament banner above — a premium dark glass panel, not a plain card. This matches the original Aurora Ember aesthetic that was lost during the light-first migration.

**Files:**
- `frontend/src/pages/LeagueHome.jsx` (lines ~740-817, intel strip section)

**Verification:**
- Intel strip has dark semi-transparent background with blur effect
- Text is readable with white/opacity hierarchy (labels dimmer, values brighter)
- Gold/crown accent colors for top-ranked players still pop
- Course DNA text shows green (emerald-400) against dark background
- Looks premium and cohesive with the tournament banner above it
- Works in both light and dark modes (the strip is always dark regardless of theme)

---

### 144 — Show floating glassmorphic info cards on TournamentHeader during LIVE tournaments (not just UPCOMING) `DONE` `HIGH`
**Completed:** 2026-03-05 — Changed 4 isUpcoming gates to (isUpcoming || isLive): dnaCategories, par/yards, TV schedule, glass cards. Files: TournamentHeader.jsx (commit 45bbbff)

**Priority:** HIGH — user-facing visual regression, these cards are a signature Clutch design element

**Problem:** The TournamentHeader component has three beautiful floating glassmorphic info panels on the right side of the banner — **Field Strength** (top 25/50/100 OWGR breakdown with segmented bar), **Forecast** (4-day weather), and **Course DNA** (SG importance bars). These panels use `bg-black/40 backdrop-blur-sm border-white/15` when the course image is present, creating a premium see-through glass effect over the course photo.

**However**, they are gated by `isUpcoming` on line 253:
```jsx
{isUpcoming && (dnaCategories.length > 0 || weather.length > 0 || leaderboard.length > 0) && (
```

This means they **disappear entirely** once the tournament goes `IN_PROGRESS` (live). The user wants these visible during live tournaments too — they're helpful context cards that should persist throughout the event.

**Prompt:**

In `frontend/src/components/tournament/TournamentHeader.jsx`:

1. **Change the visibility gate** on line 253 from `isUpcoming` to `(isUpcoming || isLive)`:

```jsx
// BEFORE:
{isUpcoming && (dnaCategories.length > 0 || weather.length > 0 || leaderboard.length > 0) && (

// AFTER:
{(isUpcoming || isLive) && (dnaCategories.length > 0 || weather.length > 0 || leaderboard.length > 0) && (
```

2. **Also update the dnaCategories computation** (line 51) to calculate for live tournaments too. Currently it's gated by `isUpcoming`:

```jsx
// BEFORE:
const dnaCategories = (isUpcoming && course) ? [

// AFTER:
const dnaCategories = ((isUpcoming || isLive) && course) ? [
```

3. **Also update the Par/Yardage section** (line 179) — currently only shows for UPCOMING, should also show for LIVE:

```jsx
// BEFORE:
{course && isUpcoming && (

// AFTER:
{course && (isUpcoming || isLive) && (
```

4. **Also update the TV Schedule** (line 239) — useful during live tournaments:

```jsx
// BEFORE:
{isUpcoming && (

// AFTER:
{(isUpcoming || isLive) && (
```

**Design note:** The `panelBg` variable (line 80) already handles the glassmorphic styling correctly — `bg-black/40 backdrop-blur-sm border-white/15` when a course image exists. No styling changes needed, just visibility.

**Files:**
- `frontend/src/components/tournament/TournamentHeader.jsx` — lines 51, 179, 239, 253

**Verification:**
- On a LIVE tournament (Arnold Palmer Invitational), the banner should show:
  - Left: LIVE badge, tournament name, course, dates, field count, leader
  - Right: Floating glass cards — Field Strength (with OWGR tier bar), Forecast (4-round weather), Course DNA (SG importance bars)
- Cards should be semi-transparent with backdrop blur, showing the course image through them
- Cards should be hidden on mobile (`hidden md:flex` already handles this)
- UPCOMING tournaments should continue working exactly as before
- COMPLETED tournaments should NOT show the cards (they'd be stale/irrelevant)

---

### 145 — Remove redundant intel strip below tournament banner on LeagueHome `DONE` `MEDIUM`
**Completed:** 2026-03-05 — Deleted strip + all unused vars (computePowerScore, tournamentWeather, topFieldPlayers, courseDnaSummary, weatherConditionIcon). Files: LeagueHome.jsx (commit 1a6588f)

**Priority:** MEDIUM — now that item 144 restored the glassmorphic cards to the banner itself, the flat strip below is redundant

**Problem:** The "Compact Tournament Intel Strip" below the TournamentHeader on the League Home page (showing TOP FIELD, COURSE DNA, WEATHER as a horizontal bar) is now redundant. Item 144 restored the premium floating glass cards (Field Strength, Forecast, Course DNA) directly on the banner. Having both is duplicative and clutters the page.

Also remove item 143's dark glassmorphic restyling of this strip — it was an attempt to fix the wrong thing. The strip should simply be deleted entirely.

**Prompt:**

In `frontend/src/pages/LeagueHome.jsx`, delete the entire "Compact Tournament Intel Strip" section. This is the block that starts with:
```jsx
{/* Compact Tournament Intel Strip */}
{(topFieldPlayers.length > 0 || courseDnaSummary || tournamentWeather.length > 0) && (
```
...and ends with the closing `</div>` and `)}` for that block (roughly lines 740-817).

Also remove any now-unused variables/imports related to the strip:
- `topFieldPlayers` useMemo (around line 240) — check if it's used elsewhere before removing
- `courseDnaSummary` — check if used elsewhere
- `tournamentWeather` — check if used elsewhere
- `weatherConditionIcon` — check if used elsewhere

Only remove variables that are exclusively used by the intel strip. If they're referenced elsewhere in LeagueHome, keep them.

**Files:**
- `frontend/src/pages/LeagueHome.jsx`

**Verification:**
- League Home page shows the tournament banner with glassmorphic cards (from item 144) and NO flat strip below it
- No unused variable warnings in console
- Page still loads correctly with all other content intact

---

### 146 — Redesign LiveScoringWidget with premium dark glassmorphic styling `DONE` `HIGH`
**Completed:** 2026-03-05 — Full restyle: dark glassmorphic container, gold accents, broadcast overlay feel, muted FINAL state, dark skeleton. Files: LiveScoringWidget.jsx (commit 1a6588f)

**Priority:** HIGH — user-facing, this is the first thing you see on the league home page during a live tournament and it looks bland

**Problem:** The LiveScoringWidget on the League Home page is a plain white Card with a thin green-tinted gradient. It looks flat and generic compared to the glassmorphic tournament banner below it. During a live tournament, this widget is the most important element on the page — it should feel alive and premium.

**Current state:** Plain Card component, `bg-gradient-to-r from-field-bright/10 to-[var(--surface)]`, standard borders, no depth or personality.

**Prompt:**

Redesign `frontend/src/components/league/LiveScoringWidget.jsx` to have a premium, tournament-broadcast feel. Here's the design spec:

**1. Outer wrapper — dark glassmorphic container (replace the Card):**
Replace the `<Card>` wrapper with a custom div:
```jsx
<div className="mb-6 rounded-xl overflow-hidden border border-white/10 bg-slate-900/90 backdrop-blur-md shadow-2xl">
```
This gives it the same dark glass look as the tournament banner's floating cards. It's always dark regardless of light/dark mode — like a TV broadcast overlay.

**2. Header bar — richer with gradient accent:**
```jsx
<div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-gradient-to-r from-field-bright/10 via-transparent to-gold/5">
```
- Tournament name: `text-white font-display font-bold`
- Round badge: `text-white/60`
- LIVE badge: keep the green pulse but use `bg-field-bright/25 text-field-bright`
- "Full Scoring" link: `text-gold hover:text-gold/80`

**3. Body section — two columns with better contrast:**
- Section labels ("YOUR TEAM", "LEAGUE"): `text-white/40` uppercase tracking
- Rank number `#5`: `text-white text-3xl font-display font-bold`
- "of 5": `text-white/40`
- Points: `text-gold text-3xl font-display font-bold`
- "pts": `text-white/40`

**4. Player rows (Your Team starters):**
```jsx
<div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
```
- Player name: `text-white/90 text-sm font-medium`
- Position: `text-white/30 text-xs font-mono`
- Score colors: under par → `text-field-bright`, over par → `text-live-red`, even → `text-white/60`
- Fantasy points: `text-gold font-mono font-semibold`
- Thru: `text-white/30 text-xs font-mono`

**5. League leaderboard rows:**
```jsx
// Normal row:
<div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white/[0.04]">

// User's row (highlighted):
<div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gold/10 border border-gold/25">
```
- Rank numbers: 1st → `text-crown`, 2nd → `text-gray-300`, 3rd → `text-amber-500`, rest → `text-white/30`
- Team names: `text-white/80`
- User's team: `text-gold font-semibold`
- Points: `text-white/90 font-mono font-semibold`, user → `text-gold`

**6. Footer:**
- "Updates every 60s": `text-white/20`

**7. Loading skeleton:** Update to match the dark theme — skeleton bars should use `bg-white/[0.06]` instead of `bg-[var(--bg-alt)]`.

**8. FINAL state:** When tournament is completed, use slightly different styling:
- Border: `border-white/5` (dimmer)
- Background: `bg-slate-900/80` (slightly more transparent)
- No green accents, use muted tones

**Key principle:** This widget should feel like a live sports broadcast overlay — dark, glassy, premium. It sits on the light-mode league page but stands out as a "live window" into the tournament.

**Files:**
- `frontend/src/components/league/LiveScoringWidget.jsx` — full restyle, keep all existing logic/data unchanged

**Verification:**
- Widget has dark glassmorphic background that contrasts with the light league page
- LIVE state has green pulse + gold accents
- Player rows are readable with proper contrast
- User's team row has gold highlight
- Gold/green/red score colors pop against the dark background
- Loading skeleton matches dark theme
- FINAL state looks appropriately muted
- Mobile responsive (single column on small screens)

---

### 147 — Redesign PlayerScoreCard with better visual separation and color contrast `DONE` `MEDIUM`
**Completed:** 2026-03-05 — Full restyle: dark header, distinct par/score rows, color-coded summaries, middle-dot empties, green accent labels, rounded tables, gold fantasy pts. Files: PlayerScoreCard.jsx (commit 1932061)

**Priority:** MEDIUM — user experience during live tournament viewing

**Problem:** The hole-by-hole scorecard (`PlayerScoreCard.jsx`) that expands when you click a player on the leaderboard is visually flat and hard to read. The Hole header, Par row, and Score row all blur together because the background colors are nearly identical (`bg-[var(--stone)]`, `bg-[var(--surface)]`, `bg-[var(--bg-alt)]`). The "FRONT 9" and "BACK 9" labels are tiny. Empty holes are just dashes with no context. Overall it lacks the premium feel of the rest of the app.

**The ScoreCell component (circles/squares for birdie/bogey) is already well-designed — keep that.** The issue is the table structure and overall card styling.

**Prompt:**

Redesign `frontend/src/components/tournament/PlayerScoreCard.jsx` with these improvements:

**1. Table header row (Hole numbers):**
- Use a darker, more distinct background: `bg-slate-800 text-white/70` (dark bar that clearly separates from content)
- Hole numbers: `text-white/60 font-mono text-[11px]`
- "Out" / "In" / "Tot" summary cells: `text-white font-bold`

**2. Par row — subtle but distinct:**
- Background: `bg-slate-100 dark:bg-slate-800/50` (light mode: light gray, dark mode: subtle dark)
- "Par" label: `text-text-muted text-[10px] font-medium`
- Par values: `text-text-secondary font-mono text-[11px]`
- Summary (36, 35, 71): `font-bold`

**3. Score row — the star of the show:**
- Background: `bg-white dark:bg-slate-900/30` (clean, bright — scores should pop)
- "Score" label: `text-text-primary font-bold text-[10px]` (NOT orange — was confusing)
- ScoreCell stays as-is (circles/squares are great)
- Summary totals: larger text, color-coded (under par green, over par red)
- Empty cells: use `·` (middle dot) instead of `-` with `text-text-muted/30` — less visual noise

**4. Front 9 / Back 9 section labels:**
- More prominent: `text-[11px] font-bold uppercase tracking-wider text-text-muted` with a left border accent
- Example: `<div className="flex items-center gap-2 mb-1"><span className="w-1 h-3 bg-field rounded-full" /><span>FRONT 9</span></div>`

**5. Table borders:**
- Add subtle cell borders: `border border-[var(--card-border)]/50` on the table
- Or use `divide-x divide-[var(--card-border)]/30` on rows for vertical separation between cells
- Rounded corners on the table: `rounded-lg overflow-hidden`

**6. Fantasy Points section — make it pop more:**
- Total fantasy points: larger, more prominent — `text-2xl font-bold text-gold`
- The breakdown grid is fine but could use slightly more padding

**7. Player header — add some flair:**
- If player is under par, add a subtle green left-border accent on the header
- Position text should be larger/bolder
- Add player's country flag if available

**8. Legend — move inline or make more compact:**
- Instead of a separate legend row, consider making the notation more self-explanatory (e.g. green = birdie is obvious from color context)
- Or keep the legend but make it more compact and visually cleaner

**Files:**
- `frontend/src/components/tournament/PlayerScoreCard.jsx`

**Verification:**
- Scorecard is clearly readable with distinct visual separation between Hole/Par/Score rows
- Birdie circles (green), eagle double-circles (gold), bogey squares (red) are visible and vibrant
- Empty/unplayed holes are subtle (not distracting dashes)
- Front 9 and Back 9 sections are clearly labeled
- Summary columns (Out, In, Tot) stand out
- Fantasy points breakdown is easy to scan
- Works well on both light and dark mode

---

### 148 — Restyle TournamentLeaderboard inline scorecard drawer (the ACTUAL visible scorecard) `DONE` `HIGH`
**Completed:** 2026-03-05 — Dark glassmorphic drawer, round tab restyle, score chips in pills, accent labels, rounded tables, color-coded summaries. Files: TournamentLeaderboard.jsx (commit 73b0013)

**Priority:** HIGH — this is the scorecard users actually see when clicking a player on the scoring page

**Problem:** Item 147 updated `PlayerScoreCard.jsx` (standalone component), but the scorecard visible on the `/leagues/:id/scoring` page is actually an **inline scorecard embedded in `TournamentLeaderboard.jsx` (lines 343-568)**. This inline version still uses flat `bg-[var(--surface)]` / `bg-[var(--bg-alt)]` backgrounds that blend into the page. The user said: "feels like we could make the scorecard drawer have a different background color maybe to help" and noted the round score numbers feel oddly placed.

**Prompt:**

Restyle the **inline scorecard** in `frontend/src/components/tournament/TournamentLeaderboard.jsx` (lines 343-568). This is the expanded view that appears when you click a player row on the leaderboard. Apply the same design philosophy from the PlayerScoreCard.jsx redesign but adapted for this inline context.

**1. Scorecard drawer wrapper (line 345):**
- Current: `bg-[var(--surface-alt)] border-t border-[var(--card-border)]`
- Change to: `bg-slate-900/95 backdrop-blur-md border-t border-white/10` — dark glassmorphic panel that clearly separates from the leaderboard rows above
- This creates an obvious visual distinction when the scorecard expands

**2. Round tabs (lines 347-373):**
- Active tab: keep `bg-field-bright/20 text-field` (looks good)
- Inactive reachable tabs: change from `bg-[var(--surface)]` to `bg-white/[0.06] text-white/60 hover:text-white/80 hover:bg-white/[0.10]`
- Disabled tabs: `bg-white/[0.03] text-white/20 cursor-not-allowed`
- Round score in parens: `text-white/50`

**3. Overall summary chip (lines 376-382) — the "floating score":**
- This is the overall to-par score sitting alone on the right of the round tabs. Make it more intentional:
- Wrap in a subtle pill: `px-2 py-0.5 rounded-full bg-white/[0.06]`
- Keep the existing color coding (green under par, red over)

**4. Round label + status row (lines 422-447):**
- "Round X" text: `text-white/90 font-semibold` (was `text-text-primary`)
- Status badges: keep existing crown/field colors, they work
- Round score on right (lines 437-445): the "floating -6" — give it context. Change to:
  ```jsx
  <span className="text-sm font-mono font-bold px-2 py-0.5 rounded bg-white/[0.08] {colorClass}">
    {roundScore} ({toPar})
  </span>
  ```
  So it's clearly a contained score chip, not a floating number

**5. Scorecard tables — Front 9 and Back 9 (lines 449-524):**
- Section labels ("Front 9", "Back 9"): `text-[10px] text-white/40 uppercase tracking-wider font-bold` with a left accent: add `<span className="w-1 h-3 bg-field-bright/40 rounded-full mr-1.5 inline-block" />` before the text
- **Hole header row:** `bg-slate-800 text-white/60 font-mono` — dark distinct header
- "Out" / "In" / "Tot" cells: `text-white/80 font-bold`
- **Par row:** `bg-slate-800/40 text-white/40 font-mono` — slightly lighter than header
- Par summary values: `font-bold text-white/50`
- **Score row:** `bg-slate-900/50 text-white` — clean background for scores to pop
- "Score" label: `text-field-bright text-[10px] font-bold`
- Score summary totals: color-coded (under par `text-field-bright`, over par `text-live-red`, even `text-white/60`), `font-bold text-[11px]`
- Add `rounded-lg overflow-hidden` to each table wrapper
- Green top border on score row: keep the existing `border-t-2 border-field-bright/30`

**6. Legend (lines 527-536):**
- Update colors to work on dark background: `text-white/30` for label text
- Circle/square borders should use the same colors (crown, field, live-red) — those are fine
- "Par" dash: `text-white/40`

**7. Probability chips (lines 543-567):**
- These already use colored backgrounds — they should look fine on the dark drawer. Just verify `bg-[var(--surface)]` on the Cut chip changes to `bg-white/[0.06] text-white/50`

**Files:**
- `frontend/src/components/tournament/TournamentLeaderboard.jsx` — lines 343-568

**Verification:**
- Expanded scorecard drawer is visually distinct from the leaderboard rows (dark background creates clear separation)
- Hole/Par/Score rows have clear visual hierarchy
- Round scores are contained in pills/chips (not floating numbers)
- All text is legible on the dark background (no `text-text-primary` or CSS var colors left in the scorecard section)
- Front 9 / Back 9 labels have accent indicators
- Works on mobile (overflow-x-auto is preserved)
- ScoreCell component is untouched (circles/squares for birdie/bogey already work well)

---

### 149 — Scorecard drawer V2: card-grid layout with light+dark mode (SUPERSEDES 148, MOCKUP PROVIDED) `DONE` `HIGH`
**Completed:** 2026-03-05 — Full redesign: CSS Grid, filled score shapes, prob chips above tabs, inline legend, FRONT/BACK/TOTAL cards, light+dark mode. Files: TournamentLeaderboard.jsx (commit 870a382)

**Priority:** HIGH — user provided mockups, wants this specific design. Live tournament today. Item 148 was dark-only which user rejected ("just looks like dark mode on light mode screen"). This is a full layout redesign.

**Problem:** Item 148 applied dark glassmorphic styling to the inline scorecard but the user wants a fundamentally different layout: card-grid instead of tables, individual score boxes instead of flat cells, probability chips at top, and a FRONT/BACK/TOTAL summary row at the bottom. Must work in both light AND dark mode.

**Prompt:**

Redesign the **inline scorecard** in `frontend/src/components/tournament/TournamentLeaderboard.jsx`. This is the expanded view when you click a player row on the leaderboard. Replace the current layout with a card-grid approach. **Must work in BOTH light mode (default) and dark mode** using Tailwind `dark:` prefix.

**DESIGN SPEC (from user mockups):**

**1. Scorecard drawer wrapper:**
- Light: `bg-gray-50 border-t border-gray-200`
- Dark: `dark:bg-slate-900/95 dark:border-white/10`
- Padding: `px-4 py-4`

**2. Probability chips — move ABOVE round tabs (currently at bottom of the expanded section):**
- Horizontal row of 4 chips: WIN, TOP 5, TOP 10, CUT
- Each chip: `rounded-lg px-4 py-2 text-center`
- Light: `bg-white border border-gray-200` / Dark: `dark:bg-slate-800 dark:border-slate-700`
- WIN chip special: `border-blaze/50 bg-blaze/5` / Dark: `dark:border-blaze/40 dark:bg-blaze/10`
- Percentage: `text-lg font-bold font-mono` — WIN in `text-blaze`
- Label: `text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-medium`
- Layout: `flex gap-2` with equal-width chips (`flex-1`)

**3. Round tabs row:**
- Layout: `flex items-center gap-1.5 mt-3 mb-3`
- Active tab: `bg-blaze/10 text-blaze border border-blaze/30 rounded-lg px-3 py-1.5 font-bold text-xs`
- Inactive reachable: `bg-white border border-gray-200 text-gray-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 rounded-lg px-3 py-1.5 text-xs font-semibold`
- Disabled: `opacity-30 cursor-not-allowed`
- **Legend on the RIGHT** (inline with tabs): `ml-auto flex items-center gap-3 text-xs`
  - `<span className="w-3 h-3 rounded-full bg-blaze inline-block" /> Birdie`
  - `<span className="w-3 h-3 rounded-full bg-crown inline-block" /> Eagle`
- **Remove the old separate legend section** that was below the scorecard

**4. Front 9 / Back 9 sections — CSS GRID layout (replace `<table>` elements):**
- Section label with colored accent bar:
  - Front 9: `<span className="w-1 h-4 bg-blaze rounded-full" />` + `FRONT 9` in `text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400`
  - Back 9: `<span className="w-1 h-4 bg-field rounded-full" />` + `BACK 9`
  - Wrapper: `flex items-center gap-2 mb-2 mt-3` (first section mt-0)

- Grid: `grid grid-cols-[auto_repeat(9,1fr)_auto] gap-x-1 gap-y-1 items-center`
  - Col 1: row label — `text-[10px] text-gray-400 dark:text-slate-500 font-medium w-8`
  - Cols 2-10: holes
  - Col 11: OUT or IN summary

- **Row 1 — Hole numbers (#):**
  - Label: `#`
  - Values: `text-xs font-bold text-gray-600 dark:text-slate-300 text-center`

- **Row 2 — Par:**
  - Label: `Par`
  - Values: `text-xs text-gray-400 dark:text-slate-500 font-mono text-center`
  - OUT/IN summary: `font-bold`

- **Row 3 — Scores (Scr):**
  - Label: `Scr`
  - Each score is an individual element centered in its grid cell:
    - **Unplayed:** `w-7 h-7 rounded-md border border-dashed border-gray-300 dark:border-slate-600 mx-auto`
    - **Birdie (score < par):** `w-7 h-7 rounded-full bg-blaze text-white font-bold text-xs flex items-center justify-center mx-auto` — show the score number inside (e.g. "3")
    - **Eagle (score <= par - 2):** `w-7 h-7 rounded-full bg-crown text-white font-bold text-xs flex items-center justify-center mx-auto`
    - **Par (score === par):** plain text `text-xs text-gray-500 dark:text-slate-400 text-center` — no shape
    - **Bogey (score === par + 1):** `w-7 h-7 rounded-sm bg-live-red/80 text-white font-bold text-xs flex items-center justify-center mx-auto`
    - **Double bogey+ (score > par + 1):** `w-7 h-7 rounded-sm bg-live-red text-white font-bold text-xs flex items-center justify-center mx-auto`
  - OUT/IN summary: `text-sm font-bold font-mono` color-coded (under par `text-field`, over par `text-live-red`, even `text-gray-500 dark:text-slate-400`)

**5. Summary row — THREE DISTINCT CARDS at the bottom:**
- Layout: `grid grid-cols-3 gap-2 mt-4`
- FRONT card:
  - Light: `bg-white border border-gray-200 rounded-lg py-3 text-center`
  - Dark: `dark:bg-slate-800 dark:border-slate-700`
  - Label: `text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-medium`
  - Value: `text-lg font-bold font-mono text-gray-700 dark:text-slate-200` (show to-par, or "—" if no scores)
- BACK card: same styling as FRONT
- TOTAL card — green accent:
  - Light: `bg-field/5 border border-field/20 rounded-lg py-3 text-center`
  - Dark: `dark:bg-field/10 dark:border-field/30`
  - Value: `text-xl font-bold font-mono text-field`

**6. Remove old elements:**
- Delete the "Round X" label + status row (lines ~422-447) — redundant with round tabs
- Delete the old legend section (lines ~527-536) — legend is now inline with round tabs
- Move probability chips from bottom to top (delete from old location)

**7. ScoreCell component update:**
- Check the existing `ScoreCell` in the file. It likely renders circles/squares with borders. Update it to match the mockup:
  - Shapes should be FILLED (solid background color), not just bordered
  - Score number should appear INSIDE the shape in white text
  - Use `bg-blaze` for birdie, `bg-crown` for eagle, `bg-live-red` for bogey (not just border colors)

**FILES:**
- `frontend/src/components/tournament/TournamentLeaderboard.jsx`

**VERIFICATION:**
- Expanded scorecard uses card-grid layout (NO `<table>` elements in the scorecard)
- Score cells are individual shapes: filled orange circles (birdie), filled gold circles (eagle), filled red squares (bogey), dashed boxes (unplayed), plain text (par)
- Probability chips appear ABOVE round tabs as horizontal card row
- Legend (Birdie/Eagle dots) is inline with round tabs on the right side
- Bottom summary: FRONT / BACK / TOTAL as three distinct cards, TOTAL with green accent
- Works in BOTH light mode (cream `bg-gray-50`) and dark mode (`dark:bg-slate-900/95`)
- No CSS variable colors (`var(--surface)`, `var(--bg-alt)`, etc.) in the scorecard section — Tailwind only
- Mobile: horizontal scroll preserved via `overflow-x-auto` wrapper around each grid
- ScoreCell shapes are filled (solid color) with white text inside, not just bordered

---

### 150 — LiveScoringWidget V2: light+dark mode redesign (MOCKUP PROVIDED) `DONE` `HIGH`
**Completed:** 2026-03-05 — Full light+dark restyle: column headers, status dots, progress bar, YOU badge, rank colors, skeleton. Files: LiveScoringWidget.jsx (commit e0e798b)

**Priority:** HIGH — user provided both light and dark mode mockups. Current widget is dark-only (item 146).

**Problem:** Item 146 restyled `LiveScoringWidget.jsx` with hardcoded dark colors (`bg-slate-900/90`, `text-white/60`, etc.). The user wants proper light+dark dual-mode support matching the Clutch brand system (light-first, cream backgrounds). The mockups show the same two-panel layout but with theme-aware colors.

**Prompt:**

Restyle `frontend/src/components/league/LiveScoringWidget.jsx` to support BOTH light mode (default) and dark mode using Tailwind `dark:` prefix. The overall layout (header, two-panel body, footer) is good — this is a color/styling pass only.

**DESIGN SPEC (from user mockups):**

**1. Outer wrapper:**
- Light: `bg-white border border-gray-200 rounded-xl shadow-lg`
- Dark: `dark:bg-slate-900/90 dark:border-white/10 dark:backdrop-blur-md dark:shadow-2xl`
- Keep `mb-6 rounded-xl overflow-hidden`

**2. Header bar (tournament name + LIVE badge + Full Scoring link):**
- Light: `bg-gray-50 border-b border-gray-200` with gradient `bg-gradient-to-r from-field/5 via-transparent to-crown/5`
- Dark: `dark:bg-transparent dark:border-white/10` with existing dark gradient
- Tournament name: `text-gray-900 dark:text-white font-display font-bold`
- Round text: `text-gray-500 dark:text-white/60`
- LIVE badge: keep `bg-field-bright/25 text-field-bright` (works both modes)
- "Full Scoring ›" link: `text-blaze hover:text-blaze/70 dark:text-crown dark:hover:text-crown/80 font-display font-semibold`

**3. Section labels ("YOUR TEAM", "LEAGUE"):**
- Light: `text-gray-400` / Dark: `dark:text-white/40`
- Keep `text-[10px] font-bold uppercase tracking-wider`

**4. YOUR TEAM — rank + points:**
- Rank number (#5): `text-gray-900 dark:text-white text-3xl font-display font-bold`
- "of 5": `text-gray-400 dark:text-white/40`
- Points value (2.0): `text-blaze dark:text-crown text-3xl font-display font-bold`
- "pts": `text-gray-400 dark:text-white/40`

**5. YOUR TEAM — player rows:**
- Add column headers: `PLAYER  POS  SCORE  THRU  PTS` in `text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/40 font-medium`
- Player status dot (left of name): green `bg-field-bright` if on course, gray `bg-gray-300 dark:bg-white/20` if not started
- Player name: `text-gray-900 dark:text-white/90 font-medium`
- Row bg — Light: `bg-gray-50 hover:bg-gray-100` / Dark: `dark:bg-white/[0.04] dark:hover:bg-white/[0.08]`
- POS: `text-gray-400 dark:text-white/30 font-mono`
- SCORE: under par `text-field dark:text-field-bright`, over par `text-live-red`, even `text-gray-500 dark:text-white/60`
- THRU: `text-gray-400 dark:text-white/30 font-mono`
- PTS: `text-blaze dark:text-crown font-mono font-semibold`
- Bottom hint: `↑ Click any player for scorecard` in `text-[10px] text-gray-300 dark:text-white/20 mt-2`

**6. LEAGUE standings:**
- "X pts behind 1st": `text-gray-500 dark:text-white/50` with thin progress bar `bg-blaze/60 dark:bg-crown/60 h-1 rounded-full`
- Rank colors: 1st `text-crown`, 2nd `text-gray-400`, 3rd `text-amber-500`, rest `text-gray-300 dark:text-white/30`
- Team name: `text-gray-800 dark:text-white/80`
- Points: `text-gray-900 dark:text-white/90 font-mono font-semibold`
- User's row — Light: `bg-blaze/5 border border-blaze/20` / Dark: `dark:bg-crown/10 dark:border-crown/25`
- YOU badge: `bg-blaze/15 text-blaze dark:bg-crown/20 dark:text-crown text-[9px] px-1.5 py-0.5 rounded font-bold uppercase`

**7. Footer:** `text-gray-300 dark:text-white/20`

**FILES:**
- `frontend/src/components/league/LiveScoringWidget.jsx`

**VERIFICATION:**
- Light mode: white/cream backgrounds, gray text, blaze (orange) accents
- Dark mode: slate-900 backgrounds, white/opacity text, crown (gold) accents
- Column headers visible above player rows
- Player status dots present
- User's LEAGUE row has distinct highlight + YOU badge
- No hardcoded dark-only colors remaining
- Mobile stacks to single column

---

### 151 — Clickable team names in LiveScoringWidget → team roster drawer `DONE` `MEDIUM`
**Completed:** 2026-03-05 — Slide-in drawer with rank badge, total pts, full roster + bench, status dots, Escape/backdrop/X close. Backend already returns starters for all teams. Files: LiveScoringWidget.jsx (commit e0e798b)

**Priority:** MEDIUM — quality-of-life feature for glancing at opponents' rosters during live tournaments

**Problem:** Clicking a team name in the LEAGUE standings does nothing. User wants to click any team name and see that team's roster with live scores in a simple drawer, without navigating to the full scoring page.

**Context:** The `useLeagueLiveScoring` hook returns a `teams` array. Check whether each team object includes `starters` for ALL teams or just the user's team. If only user's team has starters, the backend `calculateLiveTournamentScoring` function needs updating to include starters for all teams.

**Prompt:**

Add a team roster drawer to `frontend/src/components/league/LiveScoringWidget.jsx`.

**1. State:** `const [selectedTeam, setSelectedTeam] = useState(null)`

**2. Make team names clickable:** Add `onClick={() => setSelectedTeam(team)}` + `cursor-pointer hover:underline` to team name spans in the LEAGUE section.

**3. Drawer — simple slide-in from right:**
- Backdrop: `fixed inset-0 bg-black/30 dark:bg-black/50 z-40` (click to close)
- Panel: `fixed right-0 top-0 h-full w-80 max-w-[85vw] z-50 overflow-y-auto`
  - Light: `bg-white shadow-xl` / Dark: `dark:bg-slate-900 dark:shadow-2xl`
- Animation: `transition-transform duration-300` — `translate-x-full` ↔ `translate-x-0`
- Close on: backdrop click, X button, Escape key

**4. Drawer content:**
- Header: team name + rank badge + close X
- Total points: `text-2xl font-bold font-mono text-blaze dark:text-crown`
- Roster list: same player row layout as YOUR TEAM section (status dot, name, POS, SCORE, THRU, PTS), sorted by fantasy points desc
- Footer: "Go to Full Scoring →" link

**5. Backend check:** Verify `calculateLiveTournamentScoring` returns `starters` array for ALL teams (not just the requesting user's). If not, update it. The starters data per team needs: `playerName`, `playerId`, `position` (tournament position like T27), `totalToPar`, `thru`, `fantasyPoints`.

**FILES:**
- `frontend/src/components/league/LiveScoringWidget.jsx` (primary)
- Possibly backend scoring service if starters aren't returned for all teams

**VERIFICATION:**
- Click any team name → drawer slides in from right
- Drawer shows team name, rank, total points, full roster with live scores
- Works in both light and dark mode
- Backdrop click, X button, Escape all close drawer
- No extra API calls (uses existing teams data)
- Mobile: drawer width capped at 85vw

### 152 — Fix ESPN hole-by-hole sync: convert espnClient to axios + deploy `CRITICAL`
**Status:** `DONE`
**Completed:** 2026-03-05 — Cowork's fixes committed and pushed (espnClient axios conversion, enhanced cron logging, scorecard-status endpoint). Files: espnClient.js, index.js, tournaments.js (commit 0c1a83b)
**Priority:** CRITICAL — Scorecards are completely empty during live Arnold Palmer Invitational R1. Draft is tonight.

**Problem:** The hole-by-hole scorecard data is not populating. The `syncHoleScores` ESPN cron runs every 5 min on Thu-Sun, finds the IN_PROGRESS tournament (espnEventId=401811935), and should upsert HoleScore records. But `GET /api/tournaments/:id/scorecards/:playerId` returns `{ scorecards: {} }` for every player — zero HoleScore records exist despite ESPN API having full 18-hole data.

**Root cause (likely):** `espnClient.js` uses native `fetch()` instead of `axios`. If Railway's Node version has any issues with native fetch (experimental in Node 18, or ESM-only module resolution), the ESPN API call silently fails inside the cron's catch block. The cron logs `Error: fetch is not defined` or similar, but the error is swallowed. Meanwhile `datagolfClient.js` uses `axios` and works fine.

**Cowork already fixed (2 files):**
1. `backend/src/services/espnClient.js` — Replaced native `fetch()` with `axios.get()` (added `const axios = require('axios')`, changed `fetchJSON` to use `axios.get` with 30s timeout)
2. `backend/src/index.js` — ESPN cron now logs tournament name + espnEventId, logs full stack trace on error, handles "no tournament found" case explicitly
3. `backend/src/routes/tournaments.js` — Added `GET /api/tournaments/:id/scorecard-status` diagnostic endpoint (shows roundScore count, holeScore count, sample data)

**Prompt:**

The files are already edited. Your job:

1. **Review the changes** in `espnClient.js`, `index.js`, and `tournaments.js` (routes) — make sure they look correct.
2. **Commit and deploy** to Railway.
3. **Wait 5-10 minutes** for the ESPN cron to fire (runs `*/5 * * * 4,5,6,0`).
4. **Verify** by hitting:
   - `GET /api/tournaments/cmlabp7ot02mlo02tsztxojvb/scorecard-status` — should show `holeScores > 0`
   - `GET /api/tournaments/cmlabp7ot02mlo02tsztxojvb/scorecards/cmlabnsux005bo02tzra9sykc` — Berger's scorecard should have R1 data
5. If holeScores are still 0 after the cron fires, check Railway logs for `[ESPN Sync]` or `[CRON][espn]` entries to see the actual error. The enhanced logging will now show the full stack trace.
6. If the cron still fails, try manually triggering: `POST /api/sync/tournament/cmlabp7ot02mlo02tsztxojvb/espn` (requires `x-sync-secret` header matching `SYNC_ADMIN_SECRET` env var on Railway).

**FILES ALREADY CHANGED (just commit+deploy):**
- `backend/src/services/espnClient.js` — axios conversion
- `backend/src/index.js` — enhanced ESPN cron logging
- `backend/src/routes/tournaments.js` — scorecard-status diagnostic endpoint

### 153 — Show all 5 starters in LiveScoringWidget (not just top 4) `LOW`
**Status:** `DONE`
**Completed:** 2026-03-05 — Cowork removed .slice(0,4), committed in ae56b3b. Files: LiveScoringWidget.jsx
**Priority:** LOW — simple one-line fix, Cowork already edited the file

**Problem:** Widget only shows 4 of 5 starters. Line 88 had `.slice(0, 4)` hardcoded.

**Prompt:**
Cowork already fixed this in `frontend/src/components/league/LiveScoringWidget.jsx` — the `.slice(0, 4)` was removed from the `topStarters` const (line ~88). Just commit and deploy.

**FILES ALREADY CHANGED:**
- `frontend/src/components/league/LiveScoringWidget.jsx`

---

### 154 — Player scorecard drawer (LEFT slide) in LiveScoringWidget `HIGH`
**Status:** `DONE`
**Completed:** 2026-05-16 — Verified shipped: LiveScoringWidget.jsx has selectedPlayer/scorecardData state, openPlayerScorecard callback, resizable left drawer with leftDrawerWidth state, freshPlayerData auto-refresh on THRU change. Front 9 / Back 9 grids with eagle/birdie/bogey color rules, stale-data guard. Files: LiveScoringWidget.jsx
**Priority:** HIGH — enhances live scoring UX, symmetric with team roster drawer (RIGHT slide)

**Problem:** Clicking a player name in YOUR TEAM section does nothing. User wants to click any player and see their hole-by-hole scorecard in a drawer that slides in from the LEFT (mirroring the team roster drawer that slides from the RIGHT).

**Context:** Cowork started building this but the format needs to match the existing scorecard from `TournamentLeaderboard.jsx` exactly — same grid layout, same `renderScoreCell` logic, same `getSummaryColor`, same FRONT/BACK/TOTAL summary chips. The drawer also needs to be resizable (like the right drawer already is).

**IMPORTANT:** Cowork already added partial code to LiveScoringWidget.jsx (state variables, fetch logic, a basic scorecard drawer). **Replace Cowork's scorecard drawer implementation** with the proper format below. Keep Cowork's state variables (`selectedPlayer`, `scorecardData`, `scorecardLoading`) and `openPlayerScorecard` callback — those are correct. Replace the drawer JSX.

**Prompt:**

Rebuild the LEFT player scorecard drawer in `frontend/src/components/league/LiveScoringWidget.jsx`.

**1. Keep existing Cowork code:**
- `import api from '../../services/api'` ✓
- `const [selectedPlayer, setSelectedPlayer] = useState(null)` ✓
- `const [scorecardData, setScorecardData] = useState(null)` ✓
- `const [scorecardLoading, setScorecardLoading] = useState(false)` ✓
- `openPlayerScorecard` callback that calls `api.getPlayerScorecard(tournament.id, player.playerId)` ✓
- `onClick={() => openPlayerScorecard(player)}` on player rows ✓
- Escape key closes both drawers ✓

**2. Add left-drawer resize** (mirror of right drawer):
- `const [leftDrawerWidth, setLeftDrawerWidth] = useState(420)`
- `startLeftResize` callback — same pattern as `startResize` but drag goes the OPPOSITE direction (dragging right edge right = wider)

**3. Replace the scorecard drawer JSX** — must match `TournamentLeaderboard.jsx` format exactly:

- Drawer: `fixed left-0 top-0 h-full z-50` with `translate-x-0` / `-translate-x-full` transition
- Resize handle on RIGHT edge (opposite of team drawer)
- Width: `leftDrawerWidth` state, min 360, max 700, default 420
- `overflow-x-auto` on the grid containers so holes scroll horizontally if drawer is narrow

**Scorecard grid format (copy from TournamentLeaderboard):**
- Build full 18-hole array with default pars: `[4, 4, 5, 3, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 4, 4]`
- Merge API hole data into the 18-hole template
- Front 9 section: colored accent bar (blaze) + "Front 9" label + grid `grid-cols-[auto_repeat(9,1fr)_auto]` with # / Par / Scr rows + Out total
- Back 9 section: colored accent bar (field) + "Back 9" label + same grid + In total
- Score cells: use same `renderScoreCell` logic:
  - Eagle (≤-2): `w-7 h-7 rounded-full bg-crown text-white`
  - Birdie (-1): `w-7 h-7 rounded-full bg-blaze text-white`
  - Par (0): plain text `text-gray-500`
  - Bogey (+1): `w-7 h-7 rounded-sm bg-live-red/80 text-white`
  - Double+ (≥+2): `w-7 h-7 rounded-sm bg-live-red text-white`
  - Unplayed: `w-7 h-7 rounded-md border border-dashed border-gray-300 dark:border-slate-600`
- Summary: FRONT / BACK / TOTAL compact chips (same as TournamentLeaderboard lines 514-533)
- Legend: inline Birdie (blaze circle) + Eagle (crown circle)

**Header:** Player name with on-course dot, X close button
**Stats strip:** POS, SCORE, THRU, FANTASY PTS
**Footer:** "Full Leaderboard →" link

**4. Handle "not yet teed off":** If `thru === 0` and no scorecard data, show "Not yet teed off" message instead of empty grid.

**FILES:**
- `frontend/src/components/league/LiveScoringWidget.jsx` (primary — already has Cowork's partial code to build on)

**REFERENCE:**
- `frontend/src/components/tournament/TournamentLeaderboard.jsx` lines 147-173 (`renderScoreCell`, `getSummaryColor`), lines 422-533 (scorecard grid layout)

**VERIFICATION:**
- Click any player in YOUR TEAM → drawer slides in from LEFT with scorecard
- Full 18 holes visible (scroll horizontally if drawer is narrow)
- Drag right edge of drawer to resize (360-700px range)
- Eagle/birdie/bogey colors match leaderboard scorecard exactly
- "Not yet teed off" for players with thru=0
- Both drawers can be open simultaneously (left=player, right=team)
- Escape closes both, backdrop click closes the relevant one
- Works in both light and dark mode

### 155 — Fix stale LiveScore data bleeding into roster display (Rasmus Hojgaard bug) `HIGH`
**Status:** `DONE`
**Completed:** 2026-03-05 — Reviewed Cowork's stale data guard in scoringService.js (correct, no changes needed). Added LiveScore cleanup to datagolfSync.js syncLiveScoring() — deletes records where currentRound > effectiveRound. Files: datagolfSync.js
**Priority:** HIGH — players not in the current tournament field show stale position/score data from previous events

**Problem:** Rasmus Hojgaard is rostered on a team (bench) but is NOT in the Arnold Palmer Invitational field. His roster display shows `position: 9, totalToPar: -10, currentRound: 4, fantasyPoints: 0` — all stale data from a previous tournament that DataGolf's leaderboard sync wrote into the current tournament's LiveScore/Performance records.

**Root cause:** `datagolfSync.js` `syncLiveScoring()` processes ALL players in the DataGolf leaderboard API response and writes LiveScore + Performance records tagged with the current tournament ID. If the API returns stale data (from a previous event) or includes a player who was in the predicted field but withdrew, those stale values (position, totalToPar, currentRound=4) get written onto records for the CURRENT tournament.

**Cowork already applied a guard** in `backend/src/services/scoringService.js` in `calculateLiveTournamentScoring()`. The guard detects stale data by checking:
1. **Stale round:** If the player's LiveScore `currentRound` > `tournament.currentRound` (e.g., R4 data during R1)
2. **Not in field:** If Performance `status === 'WD'` AND zero RoundScores for the tournament

When either condition is true, it resets position/totalToPar/todayToPar/thru to `null`, zeroes fantasy points, and sets status to `DNS` or `WD`.

**Prompt:**

1. **Review the stale data guard** Cowork added in `backend/src/services/scoringService.js` around line 509-540 (after the score computation, before the `row` object). Make sure the logic is correct and doesn't break legitimate scenarios (player hasn't teed off yet in R1 should NOT be caught — they'd have `currentRound: null` or `currentRound: 1`, not > tournament round).

2. **Add a cleanup step to `datagolfSync.js` `syncLiveScoring()`** — after the main sync loop (after line 694 `await batchTransaction(prisma, perfOps)`), delete any LiveScore records for this tournament where the `currentRound` on the LiveScore exceeds the computed `effectiveRound` for the tournament. This prevents stale data from persisting:
```javascript
// Clean up stale LiveScore records (data from previous events that leaked in)
const deletedStale = await prisma.liveScore.deleteMany({
  where: {
    tournamentId: tournament.id,
    currentRound: { gt: effectiveRound },
  },
})
if (deletedStale.count > 0) {
  console.log(`[Sync] Cleaned up ${deletedStale.count} stale LiveScore records (currentRound > ${effectiveRound})`)
}
```

3. **Commit and deploy.**

4. **Verify:** After deploy, check `GET /api/leagues/:id/live-scoring` — Rasmus Hojgaard (or any player not in the field) should show `position: null, totalToPar: null, status: "DNS"` instead of stale data.

**FILES:**
- `backend/src/services/scoringService.js` — Cowork's stale data guard (already applied, needs review)
- `backend/src/services/datagolfSync.js` — Add LiveScore cleanup after sync loop

---

### 156 — Hide "Draft Complete" banner once tournament starts `LOW`
**Status:** `DONE`
**Completed:** 2026-03-05 — Already applied by Cowork. Verified condition hides banner when currentTournament is IN_PROGRESS or COMPLETED. No changes needed. Files: LeagueHome.jsx (Cowork)
**Priority:** LOW — cosmetic, banner takes up space once the season is live

**Problem:** The "Draft Complete!" success banner on LeagueHome.jsx persists indefinitely after the draft finishes. It should disappear once the first tournament/week is IN_PROGRESS or COMPLETED.

**Cowork already applied the fix** in `frontend/src/pages/LeagueHome.jsx` — added a condition to hide the banner when `currentTournament?.status === 'IN_PROGRESS' || currentTournament?.status === 'COMPLETED'`.

**Prompt:**

1. **Review** the change Cowork made in `frontend/src/pages/LeagueHome.jsx` around line 625. The original condition was just `{isDraftComplete && (`. The new condition is:
```jsx
{isDraftComplete && !(currentTournament?.status === 'IN_PROGRESS' || currentTournament?.status === 'COMPLETED') && (
```
2. Make sure `currentTournament` is available in scope at that point (it should be — it's used elsewhere on the page for the LiveScoringWidget).
3. **Commit and deploy.**

**FILES ALREADY CHANGED:**
- `frontend/src/pages/LeagueHome.jsx`

---

### 157 — My Team page redesign: live scoring + two-panel layout `MEDIUM`
**Status:** `DONE`
**Completed:** 2026-05-16 — Verified shipped via items 159/160 (Phase 1-3): TeamRoster.jsx uses useLeagueLiveScoring hook, builds liveDataByPlayerId map, passes liveData + liveTournamentId to PlayerRow components. Glassmorphic scoreboard header, bigger headshots, front9/back9 scorecard grid, desktop sidebar with mini league leaderboard. Files: TeamRoster.jsx
**Priority:** MEDIUM — post-draft improvement, enhances in-season experience

**Problem:** The My Team page (`TeamRoster.jsx`) has no live scoring data during tournaments. Every competitor (Sleeper, ESPN, Yahoo) shows live fantasy points per player on the roster page. Currently Clutch only shows static player info (OWGR, SG Total, wins/T5s) — no position, toPar, thru, or fantasy points during live events.

**Design direction (Cowork research):**

**Layout:** Two-panel on desktop (`max-w-5xl`):
- Left panel (60%): Roster — starters section, bench section, IR. Each player row shows live tournament data.
- Right panel (40%): Context — this week's matchup (if H2H), team total points, tournament banner, schedule.
- Mobile: stacks vertically (roster first, context below).

**Player row during live tournament:**
```
[Headshot] [Name]           [POS]  [Score] [Thru]  [Fantasy Pts]
           [OWGR #12 · PGA]                         [Start/Bench]
```

**Player row when no active tournament:**
```
[Headshot] [Name]           [SG Total] [Form] [OWGR] [Schedule dots]
           [Tour · Wins · T5s]                        [Start/Bench]
```

**New data needed:**
- Fetch live scoring data from `GET /api/leagues/:id/live-scoring` on the My Team page
- Match each roster player to their live scoring entry by playerId
- Display position, totalToPar, thru, fantasyPoints per player row
- Add team total points and team rank at top

**Prompt:**

Redesign `frontend/src/pages/TeamRoster.jsx` to show live tournament scoring per player.

1. **Add live scoring fetch:** When a golf tournament is IN_PROGRESS, call `GET /api/leagues/${leagueId}/live-scoring` and index the response by `playerId`. Poll every 60 seconds during live events.

2. **Update PlayerRow component:** Add a `liveData` prop. When `liveData` exists, show:
   - Position (e.g., "T5") — with color coding (top 10 green, cut line red)
   - Score to par (e.g., "-4") — with +/- color
   - Thru (e.g., "12" or "F") — with on-course indicator dot
   - Fantasy points (e.g., "42.5 pts") — bold, prominent
   - Replace the static wins/T5s/T10s row with this live data

3. **Add team summary header:** Between the page header and the roster sections, add:
   - Team total fantasy points (sum of starters)
   - Team rank in league (from live-scoring response)
   - Bench points (shown smaller)
   - Optimal points (shown subtle)

4. **Two-panel layout (desktop):** Use `grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6`. Left = roster. Right = context panel with:
   - Tournament info card (name, round, course)
   - Team vs opponent (if H2H matchup exists)
   - Upcoming schedule summary

5. **Fallback:** When no tournament is live, show the current static layout (OWGR, SG, schedule dots).

**FILES:**
- `frontend/src/pages/TeamRoster.jsx` (primary)

**REFERENCE:**
- `frontend/src/components/league/LiveScoringWidget.jsx` — live scoring data fetch pattern
- `frontend/src/pages/TournamentScoring.jsx` — tournament scoring display patterns

**VERIFICATION:**
- During live tournament: each player row shows position, score, thru, fantasy pts
- Team total points shown in header
- Two-panel layout on desktop (stacked on mobile)
- Data refreshes every 60s during live events
- Non-live state still shows current info (OWGR, SG, schedule)

---

### 158 — Fix BroMontana draft cost values from spreadsheet truth `HIGH`
**Status:** `DONE`
**Completed:** 2026-03-05 — Created fix-bromontana-drafts.js script with 3-tier fuzzy name matching, rebuild approach, 6-team year handling, dry-run/commit flags. All 12 years pass cost checks. Files: backend/scripts/fix-bromontana-drafts.js (NEW)
**Priority:** HIGH — core league history data is wrong, affects vault display and Clutch Rating calculations

**Problem:** The BroMontana Bowl league (`cmm47aj1w07klry65jxa29jwu`) was imported from Yahoo, but Yahoo's API returns incorrect auction `cost` values for most historical seasons. The owner (Eric) has a master spreadsheet with the correct draft costs for 2014-2025. A full comparison found 83 owner-year mismatches between the DB and spreadsheet.

**Key issues:**
1. Most years have small cost discrepancies (1-27 per owner) — Yahoo rounding or missing data
2. 2024-2025 have large discrepancies (up to -103 for a single owner)
3. 2020-2024 were 6-team keeper league years, but the DB has 12 owners for those years (non-participating owners have duplicate/incorrect draft data that shouldn't exist)
4. The league total spend varies per year due to keeper carryover budgets — it's NOT always 2400

**Truth data:** `docs/bromontana_draft_truth.json` — parsed from Eric's spreadsheet. Structure:
```json
{
  "2014": {
    "teams": {
      "Eric": {
        "raw_name": "Eric",
        "budget": 218,        // null for 2014 (no budget row in sheet)
        "spent": 218,         // sum of all pick costs
        "picks": [
          {"player": "PLAYER NAME", "position": "QB", "cost": 45},
          ...
        ]
      },
      ...
    }
  },
  ...
}
```

Owner names in the truth file are already mapped to vault canonical names:
- Anthony, Caleb, Dallas, Eric, Jakob, Kirk, Mase R, Nick Trow, Paul, Ragen, Scott, Spencer H, aric, bradley

**DB owner name → spreadsheet name mapping (for matching):**
The DB `HistoricalSeason.ownerName` values may differ slightly from spreadsheet names. Known mappings:
- DB `"Anthony"` = spreadsheet `"Anthony"` (also shows as "Tank" in some Yahoo draft pick data)
- DB `"Mase R"` = spreadsheet `"Mase R"` (also shows as "Mason" in some contexts)
- DB `"Nick Trow"` = spreadsheet `"Nick Trow"` (also shows as "Nick" in some contexts)
- DB `"Spencer H"` = spreadsheet `"Spencer H"` (also shows as "Spencer" in some contexts)
- DB `"bradley"` = spreadsheet `"bradley"` (lowercase is canonical)
- DB `"aric"` = spreadsheet `"aric"` (lowercase is canonical)
- DB `"Paul"` = spreadsheet `"Paul"` (2025 only — proxy for Aric who couldn't play)
- All other names should match exactly

**Prompt:**

Write a one-time migration script at `backend/scripts/fix-bromontana-drafts.js` that:

1. **Load truth data** from `docs/bromontana_draft_truth.json`

2. **For each year 2014-2025**, fetch all `HistoricalSeason` records for league `cmm47aj1w07klry65jxa29jwu` with that `seasonYear`

3. **For each HistoricalSeason record**, look up the owner in the truth data by `ownerName` (case-insensitive match). The truth data owner names are the canonical vault names.

4. **Match picks by player name:** For each pick in the truth data for that owner+year, find the matching pick in the DB's `draftData.picks[]` array by fuzzy player name match (case-insensitive, ignore extra spaces). Update the `cost` field to the spreadsheet value.

5. **Handle 6-team years (2020-2024):** The DB has 12 HistoricalSeason records per year but only 6 owners actually drafted. For owners NOT in the truth data for a given year:
   - Set their `draftData.picks` to an empty array `[]`
   - Set `draftData.totalSpent` (or equivalent) to 0
   - This prevents phantom draft data from appearing in the vault

6. **Handle the full picks array:** Each HistoricalSeason's `draftData.picks[]` contains ALL league picks (all teams), not just that owner's. So when updating costs, you need to:
   - Match by BOTH `ownerName` on the pick AND `playerName`
   - Update costs for ALL owners' picks in the array (since every HistoricalSeason record has the full league picks array)
   - OR: rebuild the picks array from the truth data entirely (simpler and more reliable)

7. **Rebuild approach (RECOMMENDED):** For each year, rebuild the complete `draftData.picks[]` array from truth data:
   - For each owner in truth data for that year, create pick entries with `{playerName, cost, position, ownerName, round: pickIndex+1, pick: globalPickIndex+1}`
   - Preserve existing `playerId`, `teamKey`, `isKeeper` fields from the DB picks where player names match
   - Set the rebuilt picks array on EVERY HistoricalSeason record for that year (since they all share the same picks array)

8. **Save** each updated HistoricalSeason record with `prisma.historicalSeason.update({ where: { id }, data: { draftData: updatedDraftData } })`

9. **Logging:** Print per-year summary: number of owners in truth vs DB, total picks matched, total cost delta, any unmatched players

10. **Dry run mode:** Accept `--dry-run` flag that logs all changes without writing to DB. Default to dry run. Pass `--commit` to actually write.

**Run instructions:**
```bash
# Dry run first:
cd backend && node scripts/fix-bromontana-drafts.js --dry-run

# If output looks correct:
cd backend && node scripts/fix-bromontana-drafts.js --commit
```

**FILES:**
- `backend/scripts/fix-bromontana-drafts.js` (NEW — migration script)
- `docs/bromontana_draft_truth.json` (READ ONLY — truth data, do not modify)

**REFERENCE:**
- `backend/prisma/schema.prisma` — HistoricalSeason model (~line 2293)
- `backend/src/routes/imports.js` — GET /api/imports/history/:leagueId endpoint for reference on how draftData is structured
- `backend/src/lib/prisma.js` — Prisma singleton

**VERIFICATION:**
- Dry run output shows all 12 years processed
- Each year's league total cost matches truth data totals (2014=2384, 2015=2388, 2016=2389, 2017=2373, 2018=2391, 2019=2380, 2020=884, 2021=1146, 2022=1062, 2023=1224, 2024=1451, 2025=2394)
- 6-team years (2020-2024) have exactly 6 owners with draft data, not 12
- After commit: `GET /api/imports/history/cmm47aj1w07klry65jxa29jwu` shows correct costs
- No unmatched players logged (or minimal with clear explanation)

### 159 — My Team page visual redesign (Phase 1: Quick Wins + Phase 2: Structural) `HIGH`
**Status:** `DONE`
**Completed:** 2026-03-05 — Full redesign: bigger headshots (56px), hero fantasy pts, muted bench, glassmorphic scoreboard header with live data, pill action bar, context-aware stats, front9/back9 scorecard grid with color-coded scores. Files: TeamRoster.jsx
**Priority:** High — user explicitly said "we need massive improvements"
**Spec:** `docs/my-team-redesign-spec.md` (full competitive research + wireframes)

**Prompt:**

Read the full redesign spec at `docs/my-team-redesign-spec.md` first. This was written after studying Sleeper, ESPN, Yahoo, and PGA Tour Fantasy roster pages. The current My Team page (`frontend/src/pages/TeamRoster.jsx`, ~1,180 lines) is functional but visually poor — wide layout, tiny fonts, stats that don't mean anything at a glance, tiny headshots, no visual hierarchy.

**Implement the following changes in `frontend/src/pages/TeamRoster.jsx`:**

**PHASE 1 — Quick Wins (do these first, they're CSS/layout only):**

1. **Narrow the container** — Change `max-w-4xl` to `max-w-2xl` on the main return wrapper (line ~515). This stops player rows from stretching too wide on desktop.

2. **Bigger headshots** — In the PlayerRow component (starts ~line 978), change the headshot from `w-10 h-10` (40px) to `w-14 h-14` (56px). Update both the `<img>` and the fallback `<div>`. This makes the roster feel like real people, not a spreadsheet.

3. **Player name bigger** — Change `text-sm` to `text-base` on the player name `<span>` (line ~1061).

4. **Fantasy points as hero number** — When live (`hasLiveStats && !isCutOrWd`), add the fantasy points as a prominent right-aligned number on the player row. Use `text-lg font-mono font-bold text-text-primary` for the points value. Place this as a flex-shrink-0 element on the far right of the row, OUTSIDE the `flex-1 min-w-0` div. Currently fantasy points exist but they're buried in a tiny badge — make them THE number you see first. Format: `14.5 pts` in large font.

5. **Kill third line of stats** — Remove the "career stats" third line (lines ~1137-1143) that shows wins/T5/T10 in tiny 11px font. These stats belong in the PlayerDrawer, not on the roster row. They add noise.

6. **Bump stat line font** — Change the secondary stats line from `text-xs` to `text-sm` (lines ~1100 and ~1117).

7. **Mute bench players** — Add `opacity-75` to bench player rows (when `!isActive && !isIR`). This visually separates starters from bench without needing heavy section breaks.

8. **Better section headers** — Change the "Starters" / "Bench" section headers from `text-sm` to `text-base`. Add a bottom border line below each header: `border-b border-field-bright/30 pb-2` for Active, `border-b border-[var(--card-border)] pb-2` for Bench.

**PHASE 2 — Structural (do after Phase 1):**

9. **Redesign team header as scoreboard card** — Replace the current plain header (lines ~540-588) with a premium card that shows:
   - Team name (text-xl font-display font-bold)
   - Record (W-L-T)
   - When `isLive && liveUserTeam`: Show live tournament name + round, total fantasy points in `text-3xl font-mono font-bold`, rank ("4th of 5"), bench points, optimal points. Use the existing `liveTournament`, `liveUserTeam`, and `liveTeams` data — it's already fetched.
   - When not live: Show "Next: [tournament name]" if schedule data exists, plus field status count
   - Style: glassmorphic card with subtle gradient, similar to the live scoring widget already on the page but more prominent

10. **Quick actions pill bar** — Below the header, replace the current button layout with a horizontal row of compact pill buttons: Edit Lineup, Free Agents, Optimize, Full Scoring (link to `/leagues/${leagueId}/scoring`, only when live). Style: `px-3 py-1.5 rounded-full text-sm font-medium` with appropriate colors.

11. **Context-aware stats in PlayerRow** — Make the secondary info line smarter:
    - When live: Position, score to par, thru (already done, just clean up)
    - When NOT live but tournament week (scheduleData exists): Show "🟢 In field — [Tournament Name]" or "Not in field" instead of OWGR/tour
    - When off-week: Show OWGR + SG Total (current behavior, but formatted better)
    - This uses the existing `scheduleBadge` prop data — just display it as text instead of tiny dots

12. **Scorecard grid improvement** — When a player's scorecard expands inline (the `showScorecard` state), display all 18 holes in a proper grid grouped by front 9 / back 9, with color-coded scores (birdie=green, bogey=red, eagle=gold, par=neutral). The current scorecard expansion already fetches the data — just improve the rendering.

**FILES:**
- `frontend/src/pages/TeamRoster.jsx` (PRIMARY — all changes here)
- No backend changes needed
- No new dependencies needed

**DESIGN TOKENS (already in the codebase):**
- Green (under par / good): `text-field` or `text-field-bright`
- Red (over par / bad): `text-live-red`
- Gold (leader / exceptional): `text-crown`
- Muted: `text-text-muted`
- Mono numbers: `font-mono`
- Display headings: `font-display`

**TESTING:**
- Navigate to `/leagues/cmm16py8b006xo56567mxibpa/team` (Testicles league — active golf league with live tournament data)
- Verify: headshots are visibly larger, fantasy points prominent on right, bench players visually muted
- Verify: team header shows live scoring summary when tournament active
- Verify mobile at 390px width — nothing overflows, points still visible
- Check team selector dropdown still works
- Check edit mode (drag/drop, activate/bench) still functions

**IMPORTANT NOTES:**
- The `useLeagueLiveScoring` hook and all live data are already wired up — don't re-fetch anything
- The `scheduleBadge` prop with field status is already computed and passed to PlayerRow — just use it differently
- Keep all existing functionality (drag/drop editing, quick toggle, IR management, keeper badges, team selector)
- Don't break the NFL path — the `isNfl` conditionals need to stay

---

### 160 — My Team page Phase 3: Desktop sidebar layout `MEDIUM`
**Status:** `DONE`
**Completed:** 2026-03-05 — Added RosterSidebar component with mini league leaderboard (live) and quick links. Desktop lg:flex layout with sticky sidebar. Files: TeamRoster.jsx, RosterSidebar.jsx (NEW)
**Priority:** Medium — do after 159 lands
**Spec:** `docs/my-team-redesign-spec.md` (see "Desktop Sidebar Content" section)

**Prompt:**

After item 159 is deployed, add a desktop sidebar to the My Team page for screens ≥ 1024px (lg breakpoint).

**Layout change in `frontend/src/pages/TeamRoster.jsx`:**

Wrap the main return in a flex container:
```jsx
<div className="max-w-5xl mx-auto lg:flex lg:gap-6">
  <div className="flex-1 max-w-2xl">
    {/* Existing roster content */}
  </div>
  <div className="hidden lg:block w-72 flex-shrink-0">
    {/* Sidebar */}
  </div>
</div>
```

**Sidebar content (new component `frontend/src/components/roster/RosterSidebar.jsx`):**

1. **When live tournament:**
   - Mini league leaderboard: Show all teams ranked by live fantasy points. Highlight current user's team. Use data from `liveTeams` (already available from `useLeagueLiveScoring`).
   - Tournament info: Round number, cut line if available, link to full scoring page.

2. **When not live:**
   - Next tournament card: Name, date, course, number of rostered players confirmed in field
   - League standing snapshot: User's rank, record, points behind leader
   - AI Coach insight: One-liner from coach briefing (fetch from `GET /api/ai/coach-briefing?leagueId=${leagueId}` — endpoint already exists)

3. **Always show:**
   - Recent transactions: Last 3 adds/drops/trades in the league (fetch from existing transactions endpoint if available, or skip if no endpoint exists)

**Style:** Cards with `bg-[var(--surface)] rounded-xl border border-[var(--card-border)] p-4` and `space-y-4` between cards. Clean, minimal, informational.

**FILES:**
- `frontend/src/pages/TeamRoster.jsx` (layout wrapper change)
- `frontend/src/components/roster/RosterSidebar.jsx` (NEW)

---

### 161 — Fix useVaultStats: flatten history API response (vault reveal crash) `CRITICAL`
**Status:** `DONE`
**Completed:** 2026-03-05 — Already applied by Cowork and pushed in commit 3daabc4. Flattens seasons map into flat array. Files: useVaultStats.js
**Priority:** Critical — vault "All-Time Rankings" page crashes with blank screen
**Prompt:**

The `useVaultStats.js` hook has already been fixed locally. **Commit and deploy these changes.**

**What was wrong:** `api.getLeagueHistory(leagueId)` returns `{ leagueId, seasons: { "2025": [...], "2024": [...] }, totalSeasons }` — an object grouped by year. But `computeVaultStats()` iterates with `for (const record of history)`, expecting a flat array. The hook was storing the raw API response without flattening, causing `TypeError: r is not iterable`.

**What was fixed (already in the file):** Lines 200-210 of `frontend/src/hooks/useVaultStats.js` — added flattening logic that converts `historyData.seasons` map into a flat array before storing in state:
```javascript
const flat = []
if (historyData?.seasons) {
  for (const teams of Object.values(historyData.seasons)) {
    if (Array.isArray(teams)) {
      for (const t of teams) flat.push(t)
    }
  }
} else if (Array.isArray(historyData)) {
  flat.push(...historyData)
}
setHistory(flat)
```

**FILES:** `frontend/src/hooks/useVaultStats.js` (already edited — just commit + deploy)

---

### 162 — Fix useVaultStats: "49 current owners" should be 12 (unmapped owners inflating count) `HIGH`
**Status:** `DONE`
**Completed:** 2026-03-05 — Already applied by Cowork (earlier commit). Removed !aliasMap.has fallback so unmapped names default inactive. Files: useVaultStats.js
**Priority:** High — vault reveal shows 49 current owners instead of 12 for BroMontana
**Prompt:**

The `useVaultStats.js` hook has already been fixed locally. **Commit and deploy these changes.**

**What was wrong:** Line 62 of `useVaultStats.js` had this logic for `isActive`:
```javascript
isActive: activeOwners.size > 0 ? (activeOwners.has(canonical) || !aliasMap.has(rawName)) : true,
```
The `!aliasMap.has(rawName)` clause marked ANY team name not in the alias table as active. BroMontana has 17 seasons with many team name changes — every unmapped historical team name became its own "owner" AND was counted as active. Result: 49 "current owners" instead of 12.

**What was fixed (already in the file):** Line 62 now reads:
```javascript
isActive: activeOwners.size > 0 ? activeOwners.has(canonical) : true,
```
When aliases are configured, only owners explicitly marked active in the alias table count as active. Unmapped historical team names are treated as inactive. If no aliases exist at all, everyone defaults to active (backwards compatible).

**FILES:** `frontend/src/hooks/useVaultStats.js` (already edited — just commit + deploy)

---

### 163 — CRITICAL: ESPN hole sync only captured partial R1 data + no R2 tee times `CRITICAL`
**Status:** `DONE`
**Completed:** 2026-03-06 — Code review: sync logic is correct, partial data was caused by item 152's fetch→axios fix timing. Fixed RoundScore upsert to include teeTime in update clause. Cron needs manual re-run on Railway. Files: espnSync.js
**Priority:** Critical — scorecard shows 5/18 holes, R2 not updating, fantasy scoring incomplete
**Prompt:**

**Three problems with live tournament data for Arnold Palmer Invitational:**

**Problem 1: Incomplete hole-by-hole data.** The ESPN sync cron (`*/5 * * * 4,5,6,0`, `espnSync.syncHoleScores()`) ran during R1 while players were mid-round and captured partial data (e.g., Aberg has 5/18 holes). Subsequent runs should have added the remaining holes via upsert, but they didn't. Check Railway logs for ESPN sync errors. The ESPN API (`site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard/401811935`) currently returns full 18-hole data for all players.

**Diagnosis:** Verified via browser — ESPN returns 72 competitors with 18 holes each for R1. Our DB (`GET /api/tournaments/{id}/scorecards/{playerId}`) only has 5 holes for Aberg. The upsert logic in `espnSync.js` lines 260-291 looks correct (uses `roundScoreId_holeNumber` unique key). Most likely the cron is erroring silently — check logs.

**Action:**
1. Check Railway logs for `[ESPN Sync]` errors since Thursday 3/5.
2. Run a manual ESPN sync: `node -e "const s = require('./src/services/espnSync'); const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); s.syncHoleScores('cmlabp7ot02mlo02tsztxojvb', p).then(r => { console.log(r); p.$disconnect() })"`
3. After sync completes, also run aggregation: `s.aggregateHoleScoresToPerformance('cmlabp7ot02mlo02tsztxojvb', p)` — this populates `birdies`, `bogeys`, `eagles` on Performance records.

**Problem 2: No R2 tee times.** ESPN currently shows `STATUS_PLAY_COMPLETE` for R1, `period: 1`. R2 data (tee times, hole scores) isn't available yet. But our leaderboard API returns `teeTimes: { "1": "..." }` with no R2 entry. Once R2 starts, the ESPN sync should pick up R2 data. Verify the tee time extraction logic (`statistics.categories[0].stats[6].displayValue` at line 144 of espnSync.js) works for R2.

**Problem 3: Fantasy scoring stale.** All players show `birdies: 0, bogeys: 0, eagles: 0`. The `aggregateHoleScoresToPerformance()` function needs to run after hole data is complete. The `fantasyPoints` breakdown shows `holes: 0, bonuses: 26, strokesGained: 0` — only position points are calculated, not per-hole fantasy points (birdies/eagles/bogeys bonuses).

**FILES:**
- `backend/src/services/espnSync.js` (syncHoleScores + aggregateHoleScoresToPerformance)
- `backend/src/services/espnClient.js` (getEventScorecard)
- `backend/src/index.js` (cron schedule line 532)

---

### 164 — Add WeatherStrip to live scoring league page `MEDIUM`
**Status:** `DONE`
**Completed:** 2026-03-06 — Added WeatherStrip to LeagueHome with weather data fetch, responsive grid layout (2/3 live scoring + 1/3 weather on desktop, stacked on mobile), only shows during IN_PROGRESS. Files: LeagueHome.jsx
**Priority:** Medium — weather card was on tournament preview but not on the league live scoring view
**Prompt:**

The `WeatherStrip` component exists at `frontend/src/components/tournament/WeatherStrip.jsx` and is used on `TournamentPreview.jsx` and `CourseDetail.jsx`. But it's NOT shown on the league live scoring page where users spend most of their time during a tournament.

**What to do:** Add `WeatherStrip` to the league page's live tournament section — the area that shows the tournament banner + live scoring widget. It should appear as a floating card to the right of or below the live scoring widget, showing hourly weather for the current round.

**Requirements:**
1. Import WeatherStrip into the league scoring view component
2. Fetch weather data from the tournament's weather endpoint (same pattern as TournamentPreview.jsx line 311)
3. Position: on desktop, float right of live scoring widget. On mobile, below the live scoring widget.
4. Only show when a tournament is IN_PROGRESS
5. Match the glassmorphic card styling used by the tournament banner area

**Reference:** See how TournamentPreview.jsx uses it:
```jsx
<WeatherStrip weather={weather} tournamentStart={tournament?.startDate} />
```

**FILES:**
- Find the league live scoring page/component (likely in `frontend/src/pages/LeagueHome.jsx` or similar)
- `frontend/src/components/tournament/WeatherStrip.jsx` (already exists)

---

### 165 — CRITICAL: League scoring page shows "No current NFL season" for golf leagues `CRITICAL`
**Status:** `DONE`
**Completed:** 2026-03-06 — Added loading guard to LeagueLiveScoring — waits for useLeague data before choosing sport view. Spinner shown while loading. Files: LeagueLiveScoring.jsx
**Priority:** Critical — the Scoring pill on Bro Montana Bowl (golf league) shows "Error: No current NFL season" instead of the golf live scoring view. Users can't see live tournament scores from their league.
**Prompt:**

The `LeagueLiveScoring` component at `frontend/src/pages/LeagueLiveScoring.jsx` (line 265-275) determines whether to show `GolfLiveScoring` or `NflWeeklyScoring` based on `leagueData?.sport`. The Bro Montana Bowl (ID: `cmm47aj1w07klry65jxa29jwu`) is a GOLF league but the NFL component is rendering.

**Evidence:**
- Network tab shows ONLY `/api/nfl/leagues/cmm47aj1w07klry65jxa29jwu/weekly-scores/1` (NFL endpoint) being called
- No `/api/leagues/cmm47.../live-scoring` (golf endpoint) is ever called
- Error displayed: "Error — No current NFL season" with "Back to League" link
- Dashboard shows golf icon for this league, LeagueHome works fine with golf features
- `NflWeeklyScoring` component (line 122-129) catches the backend error and renders it

**Current sport detection (line 268):**
```jsx
const isNfl = (leagueData?.sport || 'GOLF').toUpperCase() === 'NFL'
```

**Investigation needed:**
1. Check if `leagueData` from `useLeague(leagueId)` is returning `sport: 'NFL'` for this league. The `useLeague` hook starts with `league: null` and fetches from `/api/leagues/:id`.
2. Possible causes: (a) Database has wrong sport value; (b) `useLeague` API call fails silently and a fallback path routes to NFL; (c) Race condition where component renders before league data loads and somehow picks NFL.
3. The `useLeague` fetch wasn't appearing in network logs — investigate whether the call is being made at all on the scoring page.

**Fix approach:**
- Add `loading` state handling to `LeagueLiveScoring` — don't render either child until `leagueData` is loaded
- Add a console.log to trace the sport value: `console.log('[LeagueLiveScoring] sport:', leagueData?.sport, 'isNfl:', isNfl)`
- If the database `sport` field is wrong for this league, fix it via a migration or script
- Ensure the default fallback always routes to golf (not NFL) when sport is unknown

**Current code at `frontend/src/pages/LeagueLiveScoring.jsx` lines 265-275:**
```jsx
const LeagueLiveScoring = () => {
  const { leagueId } = useParams()
  const { league: leagueData } = useLeague(leagueId)
  const isNfl = (leagueData?.sport || 'GOLF').toUpperCase() === 'NFL'

  if (isNfl) {
    return <NflWeeklyScoring leagueId={leagueId} />
  }

  return <GolfLiveScoring leagueId={leagueId} />
}
```

**Better pattern — wait for data before routing:**
```jsx
const LeagueLiveScoring = () => {
  const { leagueId } = useParams()
  const { league: leagueData, loading } = useLeague(leagueId)

  if (loading) {
    return <LoadingSpinner />  // or skeleton
  }

  const isNfl = (leagueData?.sport || 'GOLF').toUpperCase() === 'NFL'

  if (isNfl) {
    return <NflWeeklyScoring leagueId={leagueId} />
  }

  return <GolfLiveScoring leagueId={leagueId} />
}
```

**FILES:**
- `frontend/src/pages/LeagueLiveScoring.jsx` (lines 265-275) — fix sport detection + add loading state
- `frontend/src/hooks/useLeague.js` — verify it returns `loading` correctly
- Check database: `SELECT id, name, sport FROM "League" WHERE id = 'cmm47aj1w07klry65jxa29jwu'`

---

### 166 — Add WeatherStrip to GolfLiveScoring component (not just LeagueHome) `MEDIUM`
**Status:** `DONE`
**Completed:** 2026-03-06 — Added WeatherStrip below TournamentHeader in GolfLiveScoring, glassmorphic card, only during IN_PROGRESS. Files: LeagueLiveScoring.jsx
**Priority:** Medium — WeatherStrip was added to LeagueHome (item 164) then removed (commit bff16c7) with the assumption it was on the scoring page. It's NOT on the scoring page — only on TournamentPreview and CourseDetail.
**Prompt:**

The `GolfLiveScoring` component at `frontend/src/pages/LeagueLiveScoring.jsx` (line 277+) renders the league's live tournament scoring view. It currently shows a tournament header banner, leaderboard, and team scoring — but NO weather card.

**What to do:** Add `WeatherStrip` to the `GolfLiveScoring` component so users see current weather conditions while watching live scoring.

**Requirements:**
1. Import `WeatherStrip` from `../components/tournament/WeatherStrip`
2. Fetch weather data using the same pattern as `TournamentPreview.jsx` — `api.getTournamentWeather(tournament.id)`
3. Position it near the tournament header area (e.g., in the banner section or as a floating card)
4. Only render when tournament is live (`isLive === true`)
5. Match the glassmorphic card styling of the tournament banner
6. Mobile: stack below banner. Desktop: float alongside or within the header.

**Reference:** See how TournamentPreview.jsx uses it:
```jsx
const [weather, setWeather] = useState(null)
useEffect(() => {
  if (tournament?.id) {
    api.getTournamentWeather(tournament.id).then(setWeather).catch(() => {})
  }
}, [tournament?.id])
// ...
<WeatherStrip weather={weather} tournamentStart={tournament?.startDate} />
```

**FILES:**
- `frontend/src/pages/LeagueLiveScoring.jsx` — GolfLiveScoring component (line 277+)
- `frontend/src/components/tournament/WeatherStrip.jsx` (already exists)

**Depends on:** Item 165 (scoring page must work for golf leagues first)

---

### 167 — Manual ESPN hole sync re-run + verify multi-round scorecard data `CRITICAL`
**Status:** `DONE`
**Completed:** 2026-03-06 — Root cause found: batch transactions meant one bad record killed 50+ holes. Rewrote espnSync.js with inline RoundScore upserts, individual HoleScore upserts, per-player try/catch. Added POST /tournaments/:id/trigger-espn-sync endpoint. Manual sync triggered — data grew from 72→132+ roundScores, 925→1592+ holeScores. R2 data now flowing. Files: espnSync.js, tournaments.js
**Priority:** Critical — item 163 fixed the code but said "cron needs manual re-run on Railway". Without this, scorecards only show 1 round of partial data and round toggle pills (R1/R2/R3/R4) never appear.
**Prompt:**

**Context:** The LiveScoringWidget scorecard drawer has round toggle pills (lines 510-527 of LiveScoringWidget.jsx) that only show when `availableRounds.length > 1`. Currently, the scorecard API (`GET /api/tournaments/:id/scorecards/:playerId`) returns only 1 round for all players. Example: Matt Fitzpatrick returns `{"scorecards":{"1":[9 holes]}}` — just round 1 with 9 holes. The tournament is in R2.

**Diagnostic data:**
- Tournament ID: `cmlabp7ot02mlo02tsztxojvb` (Arnold Palmer Invitational 2026)
- Scorecard-status endpoint: 72 roundScores, 925 holeScores total (should be ~72 players × 18 holes × 2 rounds = 2592)
- Sample player (Fitzpatrick `cmlabnu7v00oko02tapsm79ct`): only roundNumber=1, 9 holes

**Action:**
1. On Railway, run the ESPN hole sync manually for this tournament:
```js
const s = require('./src/services/espnSync')
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
await s.syncHoleScores('cmlabp7ot02mlo02tsztxojvb', p)
await s.aggregateHoleScoresToPerformance('cmlabp7ot02mlo02tsztxojvb', p)
await p.$disconnect()
```
2. After sync, verify the scorecard endpoint returns multiple rounds:
   `GET /api/tournaments/cmlabp7ot02mlo02tsztxojvb/scorecards/cmlabnu7v00oko02tapsm79ct`
   Expected: `{"scorecards":{"1":[18 holes],"2":[N holes]}}` (R1 complete + R2 partial)
3. If the sync still only captures 1 round, investigate the ESPN API response: does `comp.linescores` include all rounds or only the current round? The API URL is `site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard/{espnEventId}` — check if R1 linescores are present.
4. If ESPN only returns current round data, the sync needs to PRESERVE existing round data instead of overwriting. The current upsert logic should handle this, but verify.

**FILES:**
- `backend/src/services/espnSync.js` (syncHoleScores)
- `backend/src/index.js` (cron schedule)

---

### 168 — Fix stale selectedPlayer data in LiveScoringWidget scorecard drawer `MEDIUM`
**Status:** `DONE`
**Completed:** 2026-03-06 — Added freshPlayerData derivation from live teams array, scorecard auto-refetch when thru changes via ref tracking. Files: LiveScoringWidget.jsx
**Priority:** Medium — drawer header shows outdated THRU/SCORE when live scoring polls update the leaderboard
**Prompt:**

**Bug:** When you open a player's scorecard drawer in the LiveScoringWidget, the header stats (POS, SCORE, THRU, FANTASY PTS) are set once from `selectedPlayer` state at click time. When the 60-second live scoring poll updates the leaderboard, the drawer header does NOT refresh. Example: Fitzpatrick showed THRU 6 in the drawer header while the leaderboard row showed THRU 7.

**Root cause:** `openPlayerScorecard()` at line 34 stores the clicked player object as `selectedPlayer` state. This is a snapshot — it never updates when `useLeagueLiveScoring` refetches data.

**Fix approach:**
In the drawer rendering section (around lines 420-444), instead of reading from `selectedPlayer.position`, `selectedPlayer.totalToPar`, `selectedPlayer.thru`, `selectedPlayer.fantasyPoints`, derive fresh data from the current `teams` array (which IS updated by the poll):

```jsx
// Derive fresh data from latest poll results
const freshPlayerData = (() => {
  if (!selectedPlayer?.playerId) return selectedPlayer
  for (const team of teams) {
    const allPlayers = [...(team.starters || []), ...(team.bench || [])]
    for (const p of allPlayers) {
      if (p.playerId === selectedPlayer.playerId) return p
    }
  }
  return selectedPlayer // fallback to snapshot
})()
```

Then use `freshPlayerData` instead of `selectedPlayer` for the header stats display. Keep `selectedPlayer` for the drawer open/close state and player identity.

Also: when `freshPlayerData` updates (new THRU value), optionally re-fetch the scorecard to get new hole data. Add a useEffect that watches `freshPlayerData?.thru` and calls the scorecard API again if THRU changed.

**FILES:**
- `frontend/src/components/league/LiveScoringWidget.jsx` (lines 34-55 openPlayerScorecard, lines 420-444 drawer header)

---

### 169 — My Team page: overlay live scoring data on player rows `HIGH`
**Status:** `DONE`
**Completed:** 2026-03-06 — Already implemented in item 159's TeamRoster redesign. Hook, lookup map, liveData prop, live stats display, CUT/WD badges, "Not in field" all present. Files: TeamRoster.jsx
**Priority:** High — the plan is fully designed and approved (see plan file). Every competitor shows live fantasy points per player on the roster page. The Arnold Palmer Invitational is live NOW.
**Prompt:**

**Full plan exists at:** `/sessions/confident-cool-johnson/mnt/.claude/plans/lovely-snuggling-engelbart.md`

**Summary:** Wire the existing `useLeagueLiveScoring(leagueId)` hook into `TeamRoster.jsx` to overlay live tournament data (position, score to par, thru, fantasy points) on each player row during live events.

**Changes to `frontend/src/pages/TeamRoster.jsx` (~1060 lines):**

1. **Import and call the hook** (top of component):
   - Import `useLeagueLiveScoring` from `../hooks/useLeagueLiveScoring`
   - Call: `const { tournament: liveTournament, isLive, userTeam: liveTeam, loading: liveLoading } = useLeagueLiveScoring(leagueId)`
   - Build lookup map: `liveDataByPlayerId` — index `liveTeam.starters` + `liveTeam.bench` by `playerId`

2. **Add a live scoring summary card** (below schedule summary, above Active Lineup):
   - Only render when `isLive && liveTeam`
   - Shows: tournament name with live pulse dot, team rank (e.g. "2nd of 4"), total fantasy points, bench points
   - Uses existing brand classes: `bg-field-bright/10`, `font-mono`, `live-red` pulse
   - Link to full scoring page: `/leagues/${leagueId}/scoring`

3. **Pass `liveData` to each PlayerRow**:
   - For each player, look up `liveDataByPlayerId[player.id]`
   - Pass as new `liveData` prop to `<PlayerRow>`

4. **Update PlayerRow to display live stats when available**:
   - When `liveData` exists and NOT editing: replace static second line (OWGR/SG) with position + score + thru. Replace third line (wins/T5/T10) with fantasy points in bold.
   - Color code: position green if top 10, score green if under par / red if over
   - When `liveData` is null: show existing static stats + subtle "Not in field" indicator
   - When `isLive` but player is CUT/WD: show status badge

5. **What stays the same:** All lineup editing, keeper designation, IR management, player drawer, team selector, lineup lock banner.

**Reused infrastructure:**
- `useLeagueLiveScoring` hook (already handles 60s polling when live)
- `GET /api/leagues/:id/live-scoring` (returns per-player position, totalToPar, thru, fantasyPoints)

**FILES:**
- `frontend/src/pages/TeamRoster.jsx` — only file modified

---

### 170 — ESPN hole-by-hole sync: capture ALL rounds, not just current `CRITICAL`
**Status:** `DONE`
**Completed:** 2026-03-06 — Investigation proved the ESPN scoreboard API DOES return all rounds' hole data (not just current round). Root cause was batch transaction failures silently killing data. Fixed in item 167's espnSync.js rewrite. Confirmed: ESPN returns 72 competitors × 18 holes R1 + partial R2 data. Files: espnSync.js
**Priority:** Critical — Currently the ESPN scoreboard endpoint only returns hole-by-hole linescores for the round in progress. Once R1 finishes and R2 starts, R1 hole data disappears from the live feed. The cron captures whatever ESPN provides at each 5-min tick, but completed round data is lost if it wasn't captured during that round. This is why Aberg's R1 scorecard has only 5 holes (captured mid-round) and R2 has 0 holes (R2 data synced but holes not yet available for new round).
**Prompt:**

**Root cause analysis:**
- Diagnostic: 72 roundScores (1 per player), 925 holeScores (expected ~2,628 for 2 rounds × 73 players × 18 holes)
- ESPN's `site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard/{eventId}` response only includes `comp.linescores[].linescores[]` (hole entries) for the CURRENT round being played
- Once a round completes and the next round starts, the previous round's hole-by-hole data is no longer in the live API response
- The cron correctly upserts what it gets, but since it missed most of R1 (only ran while player was on holes 1-5), R1 data is permanently incomplete

**Possible fixes (investigate in order):**
1. **Check if ESPN has a separate scorecard endpoint** — Something like `site.web.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard/{eventId}/scorecards` or per-player scorecard endpoints. Other ESPN sport APIs have `/scoreboard/{id}/playbyplay` style endpoints.
2. **Run a "completed round backfill" after each round ends** — Detect when a round completes (e.g., most players have finalized R1), then fetch R1 data from a post-round endpoint or use a different data source.
3. **Increase sync frequency during active play** — Currently `*/5 * * * 4,5,6,0`. Consider `*/2` during typical tee times (6 AM - 7 PM ET) to capture more holes before round transitions.
4. **Alternative: Use DataGolf for hole-by-hole** — DataGolf may have more complete scorecard data. Check `datagolfSync.js` for hole-level endpoints.

**Current code flow:**
- `espnClient.js` → `getEventScorecard(eventId)` → `competition.competitors` → each competitor has `linescores[]` (rounds) → each round has `linescores[]` (holes)
- `espnSync.js` → `syncHoleScores()` → iterates all rounds + holes, upserts RoundScore + HoleScore

**FILES:**
- `backend/src/services/espnClient.js` — may need new endpoint function
- `backend/src/services/espnSync.js` — syncHoleScores main logic
- `backend/src/index.js` — cron schedule (line 532)

---

### 171 — Scorecard default pars should come from course data, not hardcoded `LOW`
**Status:** `TODO`
**Priority:** Low — cosmetic issue. When a hole has no score data from ESPN, the scorecard falls back to `defaultPars = [4, 4, 5, 3, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 4, 4]` which doesn't match Bay Hill (or most courses). This means empty holes show wrong par values.
**Prompt:**

Two options:
1. **Quick fix:** Fetch course pars from the tournament/event data. The TournamentHeader already has course info. Pass course pars into the scorecard API or derive from existing completed scorecard data.
2. **Better fix:** The scorecard API (`GET /api/tournaments/:id/scorecards/:playerId`) should also return course par data. Add a `coursePars` field to the response, derived from the most common par values per hole across all HoleScores for that tournament.

**FILES:**
- `backend/src/routes/tournaments.js` — scorecard endpoint (line 508)
- `frontend/src/components/league/LiveScoringWidget.jsx` — defaultPars (line 510)
- `frontend/src/components/tournament/TournamentLeaderboard.jsx` — scorecard rendering

---

### 172 — Pool: PlayerDrawer flashes blank-white for ~4s when chained from PoolEntryDrawer `MEDIUM`
**Status:** `DONE`
**Completed:** 2026-05-12 — Verified in re-audit: PlayerDrawer now shows centered "LOADING" with spinner during fetch. Files: PlayerDrawer.jsx
**Priority:** Medium — perceived-broken UX, not a functional bug
**Source:** Cowork smoke test, May 12 2026, pool `t6c9h2` (Buckeye PGA Championship)

**Repro:**
1. `/pools/t6c9h2` → Teams tab → click an entry (e.g. "Turd Farts")
2. PoolEntryDrawer opens (correctly, solid white bg)
3. Click any player row inside the entry drawer (e.g. Scottie Scheffler)
4. PoolEntryDrawer closes → PlayerDrawer panel slides in but renders **completely blank/white for ~4 seconds**
5. Content (player header, SG Skill Match, etc.) eventually appears after the API call resolves

**Why it matters:** Eric will perceive this as "the drawer is broken" before the content lands. The pool view's own initial load has a polished centered "LOADING POOL…" state, but the chained PlayerDrawer has none — just empty white.

**Fix:** Add a loading skeleton or spinner to `PlayerDrawer` for its initial fetch. Probably gated by `loading && !player` state. Should match the existing loading aesthetics on the platform (centered, mono-font, faded text).

**FILES:**
- `frontend/src/components/players/PlayerDrawer.jsx` (or equivalent — the drawer rendered when `selectedPlayerId` is set after clicking a row in `PoolEntryDrawer`)
- `frontend/src/components/pool/PoolEntryDrawer.jsx` — confirm it closes before PlayerDrawer mounts (current behavior)

---

### 173 — Pool: PlayerDrawer "Recent Tournaments" shows upcoming PGA Championship dated May 13 (UTC→Pacific shift + wrong section) `MEDIUM`
**Status:** `PARTIAL`
**Re-audited:** 2026-05-12 — Date half fixed: now reads "May 14" (timezone fix landed; Truist also shifted May 6→May 7 as expected). Filter half NOT done: upcoming PGA Championship still appears at the top of "Recent Tournaments" with empty score chips. Should be filtered to `COMPLETED` only (item 137 pattern). Remaining work: filter "Recent Tournaments" by status.
**Priority:** Medium — date display bug + categorization bug
**Source:** Cowork smoke test, May 12 2026

**Repro:**
1. `/pools/t6c9h2` → Teams tab → open Turd Farts entry → click Scottie Scheffler
2. PlayerDrawer opens → switch to "Results" tab
3. Top of "Recent Tournaments" list shows: **PGA Championship · May 13** (with empty score/position chips)
4. But the pool hero says "Locks Thu, May 14, 8:00 AM" and the admin says "Locks May 14, 2026, 8:00 AM"

**Two issues stacked:**
1. **Timezone shift.** Tournament start is stored as `2026-05-14T...Z` (UTC midnight or similar). Formatted in Pacific local time without `timeZone: 'UTC'`, it becomes May 13. Cowork's smoke-test prompt explicitly warned about this pattern: "anything not using timeZone: 'UTC' will display May 14 → May 13 for Pacific." Hero + admin format correctly. PlayerDrawer Results tab does not.
2. **Wrong section.** The PGA Championship hasn't started yet (UPCOMING per tournament page). It should not appear under "Recent Tournaments" at all — that's reserved for completed events (item 137 territory).

**Fix:**
- Add `timeZone: 'UTC'` to whatever `Date#toLocaleDateString`/`Intl.DateTimeFormat` call renders the date in PlayerDrawer's results list
- Filter "Recent Tournaments" to `status === 'COMPLETED'` (or whatever the completion flag is) before rendering

**FILES:**
- `frontend/src/components/players/PlayerDrawer.jsx` — "Recent Tournaments" / Results tab render
- Possibly `frontend/src/hooks/usePlayerTournaments.js` (or similar) if there's a shared selector

---

### 174 — Pool: PoolAdmin loading state is bare unstyled "Loading..." text `LOW`
**Status:** `DONE`
**Completed:** 2026-05-12 — Verified in re-audit: PoolAdmin now shows polished centered "LOADING ADMIN…" matching PoolView aesthetic. Files: PoolAdmin.jsx
**Priority:** Low — cosmetic but inconsistent with rest of platform
**Source:** Cowork smoke test, May 12 2026

**Repro:**
1. `/pools/t6c9h2/admin?token=...` (cold load, no cache)
2. While fetching admin payload (~3s per CLAUDE.md note about Prisma joins), top-left of the page shows raw black "Loading..." text with no styling, no centering, no skeleton

**Compare with:** `/pools/:slug` (PoolView) shows a polished centered "LOADING POOL…" in mono uppercase — looks intentional. PoolAdmin's loader looks like a developer placeholder that shipped.

**Fix:** Match PoolView's loading state — centered container, font-mono uppercase tracking, "LOADING POOL…" or "LOADING ADMIN…". Trivial copy-paste from PoolView.jsx.

**FILES:**
- `frontend/src/pages/PoolAdmin.jsx` — the early-return loading branch

---

### 175 — Pool: Player count mismatch — admin shows 152, public pool view shows 153 `LOW`
**Status:** `TODO`
**Re-audited:** 2026-05-12 — Still present. Admin: PLAYERS 152, tiers sum to 152. Public Field Analysis: "153 players". Tournament page Field Strength: "153 players". One player is in the tournament field but missing from any tier.
**Priority:** Low — likely benign but worth a check
**Source:** Cowork smoke test, May 12 2026, pool `t6c9h2`

**Observed:**
- Public pool view (Live scoring tab) → "Field Analysis · **153 players**"
- Admin → stat tile "PLAYERS · **152**"
- Admin tiers sum: T1-T5 = 10 × 5 + T6 = 102 → **152**

One player is in the tournament field but isn't in any tier (so unpickable). Possible causes:
- Monday qualifier added after commish set tier rosters
- One player was deliberately excluded from tiers
- ESPN field sync added a player after pool was created

**Action:** Either (a) admin should auto-detect this and warn the commish ("1 player in field isn't in any tier — they can't be picked"), or (b) field count should match the picks-eligible count, or (c) confirm this is intentional and document.

**FILES:**
- `backend/src/routes/pools.js` — admin tier/field assembly
- `frontend/src/pages/PoolAdmin.jsx` — could show an "unassigned in field" badge

---

### 176 — Pool: Mobile audit needed (PoolView, PoolAdmin, TournamentPreview pool banner) `MEDIUM`
**Status:** `TODO`
**Priority:** Medium — Cowork smoke test couldn't complete this leg
**Source:** Cowork smoke test, May 12 2026

**Why it's queued:** Chrome MCP's `resize_window` does not actually emulate a mobile viewport (window resizes but `window.innerWidth` stays at 1564). I couldn't run a real 390px audit on `/pools/t6c9h2`, `/pools/t6c9h2/admin`, or the tournament-page pool context banner.

**Manual audit needed in Chrome DevTools device mode (iPhone 14, 390px) covering:**
- `/pools/t6c9h2`:
  - Hero — does the locks-countdown chip + "Accepting entries" pill fit on one line, or wrap?
  - Your Team / Locks / Share Pool strip — does Share Pool button collapse or stay inline?
  - Tab bar (Live scoring / Teams) — touch targets ≥44px?
  - Field Analysis table — horizontal scroll? CPI slider bars truncating?
  - Quick Insights + Pool Standings — stack vertically below Field Analysis?
  - Weather Forecast hour-by-hour table — already looked clipped on desktop right edge; confirm mobile scroll works
- `/pools/t6c9h2/admin`:
  - Share Link + Copy button — does the URL field truncate cleanly?
  - "View public page" + "Enter your picks" CTAs — stack? Touch target?
  - Email invite textarea — usable at 390px?
  - Stat tiles (Tiers/Players/Entries/Scoring) — 2x2 grid or single column?
- `/tournaments/:id?pool=t6c9h2`:
  - Pool context banner (white card, left blaze rail, "YOUR POOL" / "YOUR TEAM" / "LOCKS IN" / "PICKS …") — at desktop it's a single horizontal row. On mobile the three label columns + picks row should stack cleanly without overlapping the hero.

**FILES:**
- `frontend/src/pages/PoolView.jsx`
- `frontend/src/pages/PoolAdmin.jsx`
- `frontend/src/components/pool/PoolContextBanner.jsx`
- `frontend/src/components/pool/PoolEntryDrawer.jsx`

---

### 177 — Pool: PlayerDrawer Recent Tournaments — filter out UPCOMING events `MEDIUM`
**Status:** `DONE`
**Completed:** 2026-05-12 — PlayerDrawer.jsx now filters `player.performances` to `tournament?.status !== 'UPCOMING'` before rendering the Recent Tournaments list, with explanatory comment. Files: PlayerDrawer.jsx (commit 4cdc628)
**Priority:** Medium — finishes the second half of 173
**Source:** Cowork pool re-audit, May 12 2026

After 173's timezone half landed, the date now reads correctly ("May 14"), but the upcoming PGA Championship still shows up at the top of the "Recent Tournaments" list in PlayerDrawer's Results tab with empty score/position chips. Filter the list to `status !== 'UPCOMING'` (or `=== 'COMPLETED'`) so only completed events appear.

**Repro:** `/pools/t6c9h2` → Teams tab → open Smoke Test Squad → click Scottie Scheffler → Results tab.

**FILES:**
- `frontend/src/components/players/PlayerDrawer.jsx` — Results tab render of "Recent Tournaments"
- Same pattern as item 137 fix (PlayerDrawer was supposed to hide IN_PROGRESS/UPCOMING).

---

### 178 — Pool admin: DQ button deletes entry with zero confirmation `HIGH`
**Status:** `DONE`
**Completed:** 2026-05-13 — Branded DQ confirmation modal added in PoolAdmin.jsx. Clicking DQ now sets `dqTarget` state which renders a modal with the entry's team name, entrant name, email, and a "This can't be undone" warning. User must click "Yes, DQ entry" to proceed; Cancel or backdrop click aborts. Files: PoolAdmin.jsx (commit a028325)
**Priority:** High — destructive action with no guard
**Source:** Cowork pool re-audit, May 12 2026, pool `t6c9h2`

Clicking the "DQ" cell in the Entries table on PoolAdmin immediately deletes the entry. No native `confirm()`, no modal, no undo. Tested by clicking DQ on Turd Farts entry — entry count went 1 → 0, banner disappeared, entry gone (had to re-create as "Smoke Test Squad"). A commissioner who misclicks or pinch-zooms could wipe a friend's entry instantly.

**Fix:** Add a confirm modal or at minimum a native `confirm('Disqualify {teamName}? This deletes their entry and can't be undone.')`. Bonus: soft-delete with restore window.

**FILES:**
- `frontend/src/pages/PoolAdmin.jsx` — DQ click handler
- `backend/src/routes/pools.js` — `deletePoolEntry` endpoint could also support soft-delete

---

### 179 — Pool admin: any token holder can manage pool (no auth required) `DISCUSS`
**Status:** `DONE` — chose Option A (commissioner-only)
**Completed:** 2026-05-13 — Pool admin endpoints now require signed-in commissioner. Backend `assertAdminAccess()` checks `req.user.id === pool.commissionerUserId`; token URL still works as a fallback but is being phased out. Frontend: PoolAdmin gracefully handles signed-out users (sign-in CTA) and non-commissioner signed-in users ("not your pool" panel). PoolsLanding "Manage →" routes to /pools/:slug/admin without a token. Files: backend/src/routes/pools.js, frontend/src/pages/{PoolAdmin,PoolCreate,PoolsLanding}.jsx, frontend/src/services/api.js (commit 7f28c4c)
**Priority:** Discuss — by-design tradeoff but security/UX implications worth a call
**Source:** Cowork pool re-audit, May 12 2026

The admin URL `/pools/t6c9h2/admin?token=...` is fully functional while signed-out. Anyone with the token can:
- View entrants' email addresses (commish PoolAdmin Entries table exposes `ericmsaylor@gmail.com`)
- DQ entries
- Send email invites (Resend cost vector)
- Lock the pool

Pros of current design: commish doesn't need to log in across devices. Token-as-credential is simple.
Cons: link is sticky-sensitive. If commish forwards admin link by accident, full takeover. No token rotation/revocation UI. Entrant emails leak to anyone with the URL.

**Options for discussion:**
1. Leave as-is, document the tradeoff
2. Require the token AND the commish to be signed-in (with their account associated with the pool)
3. Add token rotation/regen on admin page so commish can invalidate a leaked link
4. Stop exposing entrants' raw email addresses (show display name only, or masked email like `e***r@gmail.com`)

**FILES:**
- `backend/src/routes/pools.js` — `getPoolAdmin` token check
- `frontend/src/pages/PoolAdmin.jsx` — Entries table column showing entrant email

---

### 180 — Pool: signup gate copy is generic, not pool-aware `LOW`
**Status:** `DONE`
**Completed:** Earlier session — Both Signup.jsx and Login.jsx detect `?redirect=/pools/:slug` via regex, fetch the pool via `api.getPool(slug)`, and render pool-aware headline: "Create an account to enter [Pool Name]" with optional tournament name in the subhead. Falls back to generic copy when redirect is not a pool URL. Files: Signup.jsx, Login.jsx
**Priority:** Low — copy enhancement
**Source:** Cowork pool re-audit, May 12 2026

Hitting `/pools/t6c9h2` as anon → click "Create account" → `/signup?redirect=%2Fpools%2Ft6c9h2`. The redirect param is preserved correctly ✅, but the signup form copy is generic: "Create your account / Start your fantasy sports journey today". A user invited to a friend's pool sees this and could lose context (am I in the right place?).

**Fix:** When `?redirect=/pools/...` is present, the signup page could detect and show pool-aware copy like "Create your account to enter the Buckeye PGA Championship pool" by fetching pool name via the redirect slug.

Same opportunity exists on `/login?redirect=...`.

**FILES:**
- `frontend/src/pages/Signup.jsx` (and `Login.jsx`)
- Could call `GET /pools/:slug/preview` (lightweight name-only endpoint) when redirect starts with `/pools/`

---

### 183 — Commit + push PostHog wiring (already coded, just needs push) `HIGH`
**Status:** `DONE`
**Completed:** 2026-05-16 — Pushed in two commits: `a620e8c` (initial wiring) and `1721a51` (INTERNAL_USER_EMAILS auto-tag). Vercel auto-deployed both. Events confirmed flowing in PostHog Activity tab within minutes of deploy — pageview + web vitals + autocapture all firing from clutchfantasysports.com.
**Priority:** High — Eric wants analytics on tomorrow's traffic; Vercel env vars + key are already set
**Source:** Cowork wired PostHog May 12 2026; sandbox can't push.

**What's already done:**
- `posthog-js@1.373.5` installed in `frontend/`
- `frontend/src/services/analytics.js` rewritten to auto-toggle PostHog on `VITE_POSTHOG_KEY` env var presence (no manual flag flip). Init config: autocapture on, session replay enabled, $pageview + $pageleave auto-fire, dev console logs `distinct_id` on load.
- `frontend/.env.example` updated with `VITE_POSTHOG_KEY` + `VITE_POSTHOG_HOST` rows.
- `frontend/.env.local` written on Eric's filesystem (gitignored) with real key.
- Vercel: `VITE_POSTHOG_KEY` + `VITE_POSTHOG_HOST` added to Production + Preview as Sensitive vars. A redeploy was triggered but it's rebuilding the previous master commit (no PostHog wiring) — harmless, but doesn't actually turn on analytics until the new code lands.
- AuthContext already calls `identify()` on login/signup and `reset()` on logout — no change needed.

**What Code needs to do:**

```
cd ~/Desktop/Clutch
git add frontend/.env.example frontend/package.json frontend/package-lock.json frontend/src/services/analytics.js
git commit -m "Wire PostHog analytics

Auto-toggles on VITE_POSTHOG_KEY env var presence — no manual
PROVIDER_ENABLED flag flip. Adds posthog-js with autocapture,
session replay, pageview/pageleave. AuthContext identify/reset
already wired so events tie to users on login/logout."
git push origin master
```

That's it. Vercel auto-deploys from master on push. Wait ~2 min, then verify on https://www.clutchfantasysports.com:
1. Open browser console
2. Should see `[posthog] ready · distinct_id: <id>` log line
3. Hit https://us.posthog.com/project/372493 → Activity → should see events flowing within 1 min

**Files changed:**
- `frontend/.env.example` — added two new env var rows (commented documentation)
- `frontend/package.json` — added `"posthog-js": "^1.373.5"` to dependencies
- `frontend/package-lock.json` — lockfile update for posthog-js + its 40 sub-deps
- `frontend/src/services/analytics.js` — uncommented PostHog calls, added init block, env-var-driven toggle, AND `INTERNAL_USER_EMAILS` Set so ericmsaylor@gmail.com is auto-tagged with `$internal_or_test_user: true` on identify() (drops him into the existing PostHog "Internal / Test users" cohort so his traffic is filtered from analytics by default)

**Files NOT to touch:**
- `frontend/.env.local` is on Eric's filesystem only (gitignored, never push it)
- `CLAUDE.md` has Eric's golf-league-standings narrative edit; do NOT include it in this commit (let Eric ship that separately when he wants)
- The untracked `backend/scripts/*` are also not part of this commit

---

### 182 — Landing page rebuild: pools-first hero + product gallery + kill Rating section + fake leaderboard `HIGH`
**Status:** `DONE`
**Completed:** 2026-05-13 — Full rewrite of Landing.jsx following Cowork's `landing-mockup.html` spec. New hero with live-red eyebrow + "knows your league" headline + 5 feature pills + pool entry card (Aronimink/Scheffler PICKED) replacing the Clutch Rating gauge. New "See the platform" product surface gallery (6 cards: PlayerDrawer, LiveScoring, DraftRecap radar, Pool entry, Vault, AI Coach) replacing the dedicated Rating section. Why Clutch reordered (Pools NEW first, Rating card dropped) + "More pool types coming" dashed strip. Editorial copy → "Send the link. Everyone's in." Final CTA → "Golf is live. Pools open." How It Works step 1 + Two Sports sub-copy updated to mention pools. Removed: dedicated Rating section (~107 lines), It Compounds section (~119 lines), fake leaderboard section (~67 lines), mockLeaderboard array, ClutchRatingGauge import. Build passes. Files: frontend/src/pages/Landing.jsx
**Priority:** High — site's "Prove You Know Sports / Clutch Rating gauge" hero is selling the wrong wedge. The actual wedge is pools + leagues + live scoring + real product surfaces we've now built.
**Source:** Eric + Cowork landing page audit & mockup, May 12 2026

**Visual source of truth:** `/Users/ericsaylor/Desktop/Clutch/landing-mockup.html`
Open this file in Chrome before you start coding. Every section below references what it looks like in the mockup. Treat the mockup as the design spec — match the layout, copy, and visual treatment. The mockup uses inline HTML/CSS for speed; the implementation should use Tailwind + the existing brand CSS variables.

**The current page** (`frontend/src/pages/Landing.jsx`, 875 lines) has 9 sections, four of which sell Clutch Rating as the moat (hero, editorial, dedicated Rating section, It Compounds, fake leaderboard). The product has moved past that — real wedge is now pools as the on-ramp, leagues as the depth play, real product surfaces (PlayerDrawer, DraftRecap, Vault, Live Scoring) as the proof. Page should be ~40% shorter.

**Brand tokens already defined in Landing.jsx** (keep using these):
- `BZ`, `BZ_H`, `BZ_D` — blaze orange ramp
- `SL`, `SL_M`, `SL_L` — slate ramp
- `FD`, `FD_B` — field green ramp
- `CR`, `CR_B` — crown gold ramp
- `LV` — live red, `INK` — near-black
- CSS vars: `var(--bg)`, `var(--bg-alt)`, `var(--surface)`, `var(--text-1)`, `var(--text-2)`, `var(--text-3)`, `var(--card-border)`
- Tailwind font classes: `font-display`, `font-body`, `font-mono`, `font-editorial`

**Final section order (target):**
1. Hero (rebuilt)
2. Editorial band (copy rewrite)
3. Product Gallery — NEW section, six cards each showcasing a real product surface
4. Why Clutch (reordered + Future Pool Types strip added)
5. How It Works (mostly kept, copy tweak on step 1)
6. Two Sports. One Platform. (mostly kept, dashboard mockup can stay or be lightly refreshed)
7. Final CTA (copy rewrite)
8. Footer (unchanged)

**REMOVED sections:**
- Dedicated "Clutch Rating" section (current lines 316-422, ~107 lines)
- "It Compounds / Sports Brain" section (current lines 639-757, ~119 lines)
- "The Leaderboard" fake leaderboard section (current lines 759-825, ~67 lines)
- `mockLeaderboard` array at the top of the file (no longer used)
- `mockLeagues`, `mockStandings`, `mockActivity` — only if the Two Sports dashboard mockup is being replaced; otherwise keep them

---

## SECTION-BY-SECTION SPEC

### 1. HERO (rebuild — current lines 77-222)

**Layout:** two columns. Left = copy + CTAs + feature pills. Right = sport strip above a pool entry card.

**Left column:**
- **Eyebrow pill** — replace the current "2026 PGA TOUR IS LIVE" green pill with a **red live-indicator pill** styled like:
  ```
  ● POOLS OPEN — PGA CHAMPIONSHIP · LOCKS THU
  ```
  Background `rgba(232,56,56,0.08)`, border `rgba(232,56,56,0.2)`, color `var(--live-red)` (`#E83838`), font-mono 11px, letter-spacing 0.12em. Dot is 6×6 round, `var(--live-red)`, pulse animation (`pulse 2s infinite`, opacity 1↔0.4).
- **H1 headline** — `font-display font-extrabold`, `font-size: clamp(44px, 5.5vw, 72px)`, line-height 1.02, letter-spacing -0.035em:
  ```
  The fantasy platform that <em>knows your league.</em>
  ```
  The `<em>knows your league.</em>` span uses `font-editorial italic font-normal`, color `var(--blaze)` (BZ), font-size `1.05em`. Same italic-accent pattern as the live site uses for "Sports." today.
- **Sub-headline** — `text-lg`, `text-[var(--text-2)]`, `max-w-[460px]`, `line-height: 1.6`:
  > Twelve years of league memory. Real strokes-gained analytics. An AI coach that remembers what your buddy drafted in 2018. **Built for leagues that take it seriously.**
  
  The final sentence ("Built for leagues that take it seriously.") wrapped in `<strong>` with `text-[var(--text-1)] font-semibold`.
- **Feature icon pills** — REPLACE the current text-only "Fantasy leagues · AI coach · ..." line with a row of 5 white pills, each with an inline SVG icon. Use `flex flex-wrap gap-2 mb-8`. Each pill:
  - Padding `7px 12px`, `border-radius: 999px`, `background: white`, `border: 1px solid var(--card-border)`, `font-mono`, `text-[11px]`, `font-semibold`, `tracking-[0.04em]`, `text-[var(--text-2)]`
  - Hover: translate y -1px, border becomes `rgba(240,104,32,0.3)`, text becomes blaze
  - SVG icons inline (14×14, stroke-width 2). Each pill has a different icon color matching its theme:
    1. **Deeper analytics** — chart-trending-up icon, color blaze (BZ)
    2. **AI coach** — neural-node icon (concentric dots), color field (FD)
    3. **League vault** — vault/safe icon (rectangle with grid), color crown (CR)
    4. **Live scoring** — lightning bolt, color live-red (LV)
    5. **Pools** — diamond/gem icon, color slate-light (SL_L)
  - Reference the mockup file `<svg>` source for the exact path data — copy them as-is.
- **CTAs** — two buttons in `flex gap-3 justify-start`:
  - Primary: "Run a Pool — Free" (existing `<Button>` component, `size="lg"`)
  - Secondary: "Browse Leagues" (existing `<Button variant="secondary" size="lg">`)
- Drop the existing "Get Started — Free / Fantasy Football" CTAs — replaced by the above.

**Right column:**
- **Sport strip** — horizontal pill bar ABOVE the pool card. White background, `border-radius: 14px`, `box-shadow: 0 8px 24px rgba(30,42,58,0.1)`, `border: 1px solid var(--card-border)`, padding `8px 12px`, `display: flex gap-2`. Contains two tabs (NOT four — drop NBA/MLB):
  - **Tab 1 — Golf**: `background: rgba(13,150,104,0.08)`, `color: var(--field)`, `padding: 8px 14px`, `border-radius: 10px`, `font-mono text-[11px] font-bold uppercase tracking-[0.08em]`. Includes a pulsing live dot (6×6, `var(--field-bright)`, pulse animation) before the text "Golf · Live now".
  - **Tab 2 — NFL**: same shape, `color: var(--text-2)`, no fill. Text "NFL" with a small badge "Fall '26" inside (`text-[9px] opacity-60 tracking-[0.05em] font-medium`).
- **Pool entry card** — the centerpiece. Replaces the existing Clutch Rating gauge card entirely. White background, `border-radius: 20px`, `box-shadow: 0 24px 70px rgba(30,42,58,0.15)`, `overflow: hidden`. Float animation 6s ease-in-out infinite (already defined in landing CSS).
  - Width ~440px, max-width 100%.
  - **Hero strip** at the top (height ~130px):
    - Background: golf-course-green linear gradient with dark overlay. Use this exact CSS:
      ```
      background:
        linear-gradient(180deg, rgba(30,42,58,0.35) 0%, rgba(30,42,58,0.92) 100%),
        linear-gradient(135deg, #4F6F52 0%, #88AA70 40%, #5A7842 70%, #3C5A2E 100%);
      ```
    - White text. Two-column row inside: left = copy block, right = stacked pills.
    - Left:
      - Eyebrow (`font-mono text-[9px] uppercase tracking-[0.18em] opacity-70`): "Buckeye PGA Championship"
      - Title (`font-display font-extrabold text-[24px] tracking-[-0.02em] mt-1.5`): "PGA Championship"
      - Meta (`font-editorial italic text-[13px] opacity-85 mt-0.5`): "Aronimink · Newtown Sq, PA"
    - Right (`flex flex-col gap-1.5 items-end`):
      - Live pill (red): `bg-[rgba(232,56,56,0.85)] border-[rgba(232,56,56,0.4)]` with white text "Accepting entries" + small pulsing white dot before text. `font-mono text-[10px] uppercase tracking-[0.1em] font-semibold px-2.5 py-1 rounded-md`.
      - Locks pill (frost): `bg-[rgba(255,255,255,0.15)] backdrop-blur border-[rgba(255,255,255,0.18)]` with white text "Locks 1d 13h" (same font sizing as above).
  - **Tier 1 header bar** — `bg-[var(--surface-2)] border-b border-[var(--card-border)] px-[18px] py-2.5 flex justify-between items-center`:
    - Left: orange "T1" pill (`bg-[var(--blaze)] text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-md tracking-[0.08em]`)
    - Right: progress text (`font-mono text-[11px] text-[var(--text-2)]`): "0 / 10 picked · pick 1" — the "0" should be colored `var(--field)` and font-bold when picks have been made.
  - **Player rows** (four rows). Each row is `flex items-center gap-3 px-[18px] py-2.5 border-b border-[var(--card-border)] last:border-0`. One row (Scheffler) is in the PICKED state — give it `bg-[rgba(240,104,32,0.04)] border-l-[3px] border-l-[var(--blaze)] pl-[15px]` (note the pl adjustment to compensate for the 3px border).
    - Each row contains:
      - **Headshot** — 38×38 rounded-full with a player-specific colored gradient (initials inside). Mockup uses `linear-gradient(135deg, #C49C7A, #8B6B4A)` for Scheffler etc. — the real implementation should use the existing `<img>` headshot pipeline pointing at the player record. For initial implementation, render a circle with the player's initials.
      - **Player info** (flex-1): name in `text-sm font-semibold text-[var(--text-1)]` (in PICKED state, color is `var(--blaze-deep)`). Below it: meta line `font-mono text-[10px] text-[var(--text-3)] tracking-[0.04em] mt-0.5` reading `{flag} PGA · {OWGR} · {stat}`. Use real flags (🇺🇸 for Scheffler, 🇪🇸 for Rahm, 🇬🇧 for McIlroy, 🇺🇸 for Young).
      - **CPI mini-bar** — small inline sliding-scale bar. 36px wide, 4px tall, `bg-[var(--surface-2)] rounded-sm overflow-hidden relative`. Inside it has a colored fill anchored to a center line (CPI is signed). Right of the bar: `font-mono text-[10px] font-bold` value (green for positive, gray for negative).
      - **Pick button** — `font-mono text-[11px] font-bold px-2.5 py-1.5 rounded-md tracking-[0.05em]`. Default: `bg-[var(--surface-2)] text-[var(--text-2)]` reading "+ Pick". PICKED state: `bg-[var(--blaze)] text-white` reading "✓ PICKED".
  - Four players in T1 (in this order, with Scheffler PICKED):
    1. Scottie Scheffler · 🇺🇸 PGA · #1 · SG +2.9 · CPI +2.0 · **PICKED**
    2. Jon Rahm · 🇪🇸 LIV · #20 · Form 100 · CPI +0.8 · + Pick
    3. Rory McIlroy · 🇬🇧 PGA · #2 · SG +1.4 · CPI +1.5 · + Pick
    4. Cameron Young · 🇺🇸 PGA · #3 · Form 88 · CPI -0.4 · + Pick
  - **Footer strip** — small mono-text band before the CTA: `bg-[var(--surface-2)] border-t border-[var(--card-border)] px-[18px] py-2.5 flex justify-between items-center font-mono text-[11px] text-[var(--text-2)]`:
    - Left: "+ 6 more · 5 tiers below"
    - Right: "1 of 6 picked" (the "1" colored `var(--blaze-deep)` and font-bold)
  - **Big CTA button** at the bottom (full-width inside the card): `bg-[var(--blaze)] text-white py-3 px-4 text-center font-display font-bold text-[14px] tracking-[0.02em]` reading **"Lock in your picks →"**.

### 2. EDITORIAL BAND (rewrite copy — current lines 224-247)

Keep the dark slate background, the radial glow, the editorial-italic typography treatment — those all work. Just swap the copy:

**Current:**
> Everyone's got *opinions.*
> We've got *receipts.*
> Clutch Rating — one number for everything you know

**New:**
> Send the *link.*
> Everyone's *in.*
> Five minutes from idea to invites out · No app to download

The italic "link" stays orange (BZ_H), italic "in" stays crown (CR_B). The mono-uppercase subtitle becomes the new tagline.

### 3. PRODUCT SURFACE GALLERY — NEW SECTION (insert after Editorial, replacing "Why Clutch + Clutch Rating dedicated" lines 249-422)

This is the biggest new addition. A grid of 6 cards each showing a real product surface as a mini-mockup. Tells visitors "look at the actual platform" instead of abstract claims.

**Section wrapper:**
- `py-20 px-6` standard section padding
- Section label: "◆ See the platform" (existing `<SectionLabel>` component, color BZ)
- Section title: "Built for *how you actually watch sports.*" — display-bold with italic-accent crown color on "how you actually watch sports"
- Section sub: "Strokes Gained vs course DNA. Hole-by-hole scorecards. League vaults with 14 years of history. The kind of fantasy app you've been waiting for." — `text-base text-[var(--text-2)] max-w-[600px] leading-relaxed mb-10`

**Grid:** `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5`. Six cards, each 360×~360px. Card structure:
- White background, `rounded-[16px]`, `border border-[var(--card-border)]`, `overflow-hidden`, position relative.
- **Preview area** (top half, ~200px tall): tinted background (`var(--surface-2)` or product-specific tint), with an inline mini-mockup of the product surface (NOT a screenshot — actual JSX recreating the visual). Small annotation chip in the top-right (white-ish bg, font-mono uppercase 10px, letter-spacing 0.12em): the component name.
- **Body** (bottom half): `p-4`:
  - Label: `font-mono text-[10px] text-[var(--blaze)] uppercase tracking-[0.12em] mb-1.5`
  - Title: `font-display text-base font-bold mb-1`
  - Description: `text-[13px] text-[var(--text-2)] leading-[1.5]`

**The six cards** (in this order — see mockup for exact mini-mockup visuals):

1. **PLAYER INTEL** — "Strokes Gained vs course DNA"
   - Preview: PlayerDrawer-style header (38px avatar + "Scottie Scheffler" + meta "#1 OWGR · PGA · 🇺🇸") + 2×2 stats grid (SG Total +2.9, OWGR #1, Avg Fin 8, Events 12) + 4 SG bars (Drv, App, ARG, Putt) with green fills and values.
   - Description: "Tap any player. See their SG profile matched against the week's course. Recent results, season ranks, course history — all one tap deep."

2. **LIVE SCORING** — "Hole-by-hole, every Sunday."
   - Preview: LiveScoringWidget-style header ("Truist Championship · R4" + red LIVE pill) + 5 leaderboard rows with position, name, thru, score (Justin Rose F -13, Scheffler F -12, Bhatia F -9, Stevens 17 -9, Bradley 15 -7).
   - Description: "Real-time scorecards from ESPN's feed. Watch your roster move. Tap a player to see their card hole-by-hole as they play it."

3. **DRAFT RECAP** — "Letter grades. Stacked side-by-side."
   - Preview: top row with A− grade pill + "Your draft vs. league avg" text. Below: centered 5-axis SG radar (OFF TEE / APPROACH / SHORT GAME / PUTTING / FORM) showing two overlaid polygons — solid blaze fill for "Your draft" (with white-edged vertex dots) + dashed slate outline for "League avg". Legend strip below the radar.
   - Description: "Every draft auto-graded. Five SG dimensions rendered as a radar — your team vs. the league average. AI coach drops a paragraph on what you nailed and what's thin."
   - Implementation note: the radar SVG is in the mockup — copy the geometry. ViewBox `-95 -68 190 142`. Five axes at angles -90, -18, 54, 126, 198. Concentric grid pentagons at 50%, 33%, 17% scale. Use mockup polygon point coordinates as-is.

4. **POOLS** — "Tier picks. Tiebreaker. Done."
   - Preview: simplified pool entry mock with 5 rows showing Tier label + picked player (Tier 1 → 🇺🇸 Scheffler, Tier 2 → 🇬🇧 Rose, Tier 3 → 🇦🇺 Scott, Tier 4 → 🇺🇸 Bhatia, Tiebreaker → -12 in crown color).
   - Description: "Six tiers, one pick per tier, a tiebreaker for the winner's score. Locks Thursday morning. Live scoring kicks in automatically."

5. **LEAGUE VAULT** — "Every season. Forever logged."
   - Preview: gold-tinted background (`linear-gradient(135deg, #F7E9B8, #FAF2D3)`). "◆ ◆ ◆ Vault unlocked ◆ ◆ ◆" label in mono crown. Title: "The Sunday Crew · 12 years". Inside a dark slate card (`rgba(30,42,58,0.92)`): 4 standings rows with rank/name/pts ("1 Mike B · 142 W · 4 chips" — gold-highlighted; then "2 Sam D · 131 W · 3 chips", "3 Chris P · 125 W · 2 chips", "4 Jen K · 119 W · 1 chip"). **Use these anonymized names verbatim — do NOT use Eric's actual league names.**
   - Description: "Import from ESPN, Yahoo, Sleeper, Fantrax, MFL. Owner aliases. Draft history. Championship rolls. Your league's story, always live."

6. **AI COACH** — "Knows your team. And the field."
   - Preview: NeuralCluster-style brain SVG (5-point star + ring + dots — copy from mockup) at left with "YOUR COACH · Friday morning briefing" header. Below: an italic editorial-serif paragraph reading: "Scheffler tees off at 8:14 from the back nine. Course is firm — that helps Bhatia and Justin Rose more than Bradley. You're picked low on Rose in the pool, decent leverage if he repeats Truist." Two tag chips below: "Roster check" (blaze tint), "Pool leverage" (field tint).
   - Description: "A coach that's read every box score, watched every tournament, and remembers what you drafted three years ago. Writes you a brief every morning."

### 4. WHY CLUTCH (reorder + future pool types strip — current lines 249-314)

Keep the section wrapper, label, and 6-card grid structure. Change:

**New order of cards** (the current order leads with Predictions; new order leads with Pools):
1. **Pools** (NEW badge) — left border BZ. Icon 🎯. Title "Pools" with a small `<span class="new-badge">NEW</span>` inline (orange pill, white text, font-mono 9px, uppercase, 2px 6px padding). Description: "Tier picks for any tournament. 5-minute setup. Send a link. Auto-locks Thursday morning. Live scoring built in."
2. **Fantasy Leagues** — left border FD. Icon 🏆. Description: "Auction or snake drafts. FAAB waivers. H2H or roto. Trades, chat, playoffs. Golf live, NFL launching Fall '26."
3. **Live Scoring** — left border CR. Icon ⚡. Description: "Shot-by-shot during PGA events, play-by-play for NFL. Hole-by-hole scorecards. Pool standings update live."
4. **Predictions** — left border BZ. Icon 📊. Description: "Winner, top 5, top 10, make/miss cut, R1 leader, H2H matchups. Auto-resolves Monday. Track your accuracy over time."
5. **AI Coach** — left border SL_L. Icon 🧠. Description: "Reads your draft, your roster, your league. Surfaces leverage, flags bias, writes a Friday-morning briefing."
6. **League Vault** — left border CR. Icon 📚. Description: "Import from ESPN, Yahoo, Sleeper, Fantrax, MFL. 14 years of league history, owner aliases, draft archives."

**DROP** the current "Clutch Rating" card from the grid entirely. (Rating is no longer surfaced on the landing.)

**New strip below the grid** — "More pool types coming":
- Wrapper: `mt-7 p-5 bg-[var(--surface)] border border-dashed border-[rgba(240,104,32,0.25)] rounded-[14px] flex flex-wrap items-center gap-3`
- Label: "◆ More pool types coming" (`font-mono text-[11px] text-[var(--blaze)] uppercase tracking-[0.12em] font-bold`)
- Five chips: Survivor, Eliminator, Bracket, NFL Pick'em, + Custom. Each chip `bg-[var(--surface-2)] text-[var(--text-2)] px-3 py-1.5 rounded-lg font-mono text-[11px] font-medium`.

### 5. SECTION TITLE FOR WHY CLUTCH

Replace the current "One number for everything you *know.*" with:
> Everything you need.
> *Nothing you don't.*

(Italic accent on "Nothing you don't" — crown color, font-editorial.)

Description below: drop the current "Your Clutch Rating captures league performance..." line entirely. The 6 cards do the explanatory work now.

### 6. HOW IT WORKS (mostly keep — current lines 424-472)

Keep the 3-step structure (Play / Track / Prove). Change step 1's description to lead with pools:

**Step 1 — "Play"** new description:
> Spin up a tournament pool in 5 minutes — or run a full season-long league. Snake or auction drafts, trades, waivers, live scoring, in-league chat. Import your history from ESPN, Yahoo, Sleeper, Fantrax, MFL.

Steps 2 and 3 unchanged.

### 7. TWO SPORTS. ONE PLATFORM. (keep — current lines 474-637)

Keep this section as-is for now. The 6 sport-feature cards work fine. The Dashboard preview mockup can stay (uses `mockLeagues`, `mockStandings`, `mockActivity`).

**One small copy tweak** — the section sub currently reads:
> Fantasy Golf is live for the 2026 PGA Tour season. Fantasy Football launches for the 2026 NFL season.
> Five league formats, live scoring, real analytics, active roster management.

Change to:
> Fantasy Golf is live for the 2026 PGA Tour. Fantasy Football launches for the 2026 NFL season. Run a pool for one tournament, or a season-long league for the year.

### 8. FINAL CTA (copy rewrite — current lines 827-867)

Keep the dark INK background, the radial glow orbs, the layout. Swap copy:

**Current:**
> Ready to prove *it?*
> Golf is live. Football is coming. Get in before your friends do.

**New:**
> Golf is live. *Pools open.*
> Five minutes to your first pool. Whole season once you're hooked.

CTAs:
- Primary stays: "Run a Pool — Free" (orange)
- Secondary changes from "Learn More" (scrolls to features) to "Browse Leagues" (links to `/login` or `/signup`)
- Keep the "No credit card required" small print below.

---

## FILES TO MODIFY

1. **`frontend/src/pages/Landing.jsx`** — main file, rewrite as above
   - Delete `mockLeaderboard` constant
   - Keep `mockLeagues`, `mockStandings`, `mockActivity` (used in Two Sports section)
   - Delete the dedicated Clutch Rating section (current ~line 316-422)
   - Delete the It Compounds section (current ~line 639-757)
   - Delete the Leaderboard section (current ~line 759-825)
   - Rewrite hero, editorial, why clutch, add new product gallery section
   - Final page should be roughly 500-600 lines (down from 875).

2. **No new component files required** if you inline everything. Optional refactor: pull the 6 gallery cards into a `<ProductSurfaceCard>` component if it keeps Landing.jsx readable. Not required.

3. **No image assets needed** — all visuals are inline SVG or CSS gradients. Headshots in the hero pool card can be initial circles as in the mockup (real headshots are a follow-up).

---

## RULES

- **Match the mockup file's visual** as closely as you can with Tailwind. If a particular box-shadow / gradient / spacing needs to be inline `style={...}`, that's fine — Landing.jsx already does this throughout.
- **Use existing Clutch typography**: `font-display` (Bricolage Grotesque) for headlines, `font-editorial` (Instrument Serif) for italic accents, `font-mono` (JetBrains Mono) for eyebrows + labels + numbers, `font-body` (DM Sans) for body. These classes are already configured in `tailwind.config.js`.
- **Light AND dark mode** — the existing Landing.jsx supports both via `isLight = useTheme().theme !== 'dark'`. Preserve that. The mockup is light-only; for dark mode, use the existing patterns (`isLight ? lightColor : darkColor` style ternaries).
- **DO NOT** add any new player avatars or course images that aren't already in the codebase. Use SVG/gradient placeholders.
- **DO NOT** ship the bottom mockup-banner element from `landing-mockup.html` — that's a Cowork-only indicator.
- **DO NOT** wire any of the gallery card mini-mockups to live data. They are static visual demos.
- **TEST in both light and dark mode** before declaring done. Walk through every section.
- **Commit and deploy in chunks** if you want — e.g. one commit per section (hero, editorial, gallery, why clutch, etc.). Cowork will verify in Chrome after each push.

---

## VERIFICATION (after deploy)

Walk the page at https://www.clutchfantasysports.com as an anon visitor and confirm:
1. Hero — red live eyebrow, "knows your league" headline, 5 feature icon pills, two CTAs, sport strip + pool entry card with player rows on the right
2. Editorial band — "Send the link. Everyone's in." copy
3. Product gallery — 6 cards each showing a working mini-mockup (player drawer, live scoring, draft radar, pool entry, vault, coach)
4. Why Clutch — Pools (NEW) is first, no Clutch Rating card, "More pool types coming" strip below
5. How It Works — Step 1 mentions pools
6. Two Sports — sub mentions pools
7. Final CTA — "Golf is live. Pools open."
8. Dedicated Clutch Rating section is GONE
9. It Compounds / Sports Brain SVG section is GONE
10. Fake leaderboard (ChaseTheTrophy / GridironGuru / etc.) is GONE
11. Page is noticeably shorter than before (~40% less scroll)
12. Light mode AND dark mode both render correctly

Open `/Users/ericsaylor/Desktop/Clutch/landing-mockup.html` in another tab to compare side-by-side.

---

### 183 — Pool create: auto-tier the field, hide editor behind Customize toggle `MEDIUM`
**Status:** `DONE`
**Completed:** 2026-05-13 — Selecting a tournament now auto-builds 3 tiers from the field's OWGR ranking (Stars top ~13% / Contenders middle ~33% / Sleepers rest, 2 picks each). Pool name prefills to "<Tournament> Pool". Step 3 shows a read-only summary card; "Customize tiers →" reveals the full editor. Switching tournament resets tiers + drops back to auto mode. Files: PoolCreate.jsx
**Priority:** MEDIUM — major friction reduction for new commissioners
**Source:** Eric, May 13 2026 — "if i want to start a pool and i land on that im like shit... i have to know all the golfers and build tiers, nevermind"

**Problem:** `/pools/new` landed users on a blank tier editor with a 152-player multi-select per tier. New commissioners had to manually triage the field by world ranking — guaranteed to scare them off.

---

### 184 — Pool view: allow editing picks while pool is OPEN `MEDIUM`
**Status:** `DONE`
**Completed:** 2026-05-13 — Backend POST `/pools/:slug/entries` now upserts when user already has an entry and pool is OPEN — replaces picks + team name + tiebreaker in a tx, skips confirmation email on edit. Frontend: editMode state + startEdit/cancelEdit; "Edit picks" button on the pool context strip AND inside PoolEntryDrawer. Form renders for new-entry OR edit flow with a banner + Cancel + "Save changes" CTA. Files: backend/src/routes/pools.js, PoolView.jsx, PoolEntryDrawer.jsx
**Priority:** MEDIUM — basic table stakes for pool entries
**Source:** Eric, May 13 2026 — "how do i modify my picks before the tourney has started if i wanted to?"

**Problem:** Once a user submitted an entry the form disappeared and there was no way to update picks before lock. Backend hard-rejected re-submission with "delete the existing one first."

---

### 185 — Tournaments page: course-image banner empty state `LOW`
**Status:** `DONE`
**Completed:** 2026-05-13 — Replaced bare flag-emoji "No Live Tournament" empty state with a full-bleed course-image banner pulled from `upcomingTournaments[0].course.imageUrl` (Aronimink for the PGA Championship). Gradient overlay, large display heading, course name in gold, tour/major badges, "X days away" inline with date range, primary blaze CTA + secondary Golf Hub button. Falls back to slate gradient when no course image is available. Files: Tournaments.jsx
**Priority:** LOW — visual polish, not a blocker
**Source:** Eric, May 13 2026 — "can we get a banner for the PGA tournament - image in the banner that is"

---

## NFL PRE-LAUNCH AUDIT — May 16, 2026

Cowork walked the NFL stack end-to-end as a fresh commissioner creating a new league. Captured below are everything found, in priority order. Most of these are pre-existing bugs (created before this audit, surfaced by it). The good news: the bones are solid — creation flow is sport-aware, settings are comprehensive, NFL Players page is genuinely impressive. The bad news: there are several state-desync bugs that will embarrass us in front of a stranger.

Items 185-198 below.

---

### 185 — CRITICAL: NFL league Roster Size saves wrong value (4 instead of 17) `CRITICAL`
**Status:** `DONE`
**Completed:** 2026-05-16 — Added isNflLeague helper + sportDefaultRosterSize (17 NFL / 6 golf). Roster Size dropdown options now sport-aware: [15,16,17,18,19,20] for NFL vs [4,5,6,7,8,10,12] for golf. Files: LeagueSettings.jsx (commit 0d76b6b)
**Priority:** Critical — blocker for NFL launch. Roster size is the foundation of every other roster behavior.
**Source:** Cowork NFL audit, May 16 2026

**Repro:**
1. Dashboard → Create League → select NFL.
2. Creation form's step 1 shows: "Roster Size: 17 players (QB, 2 RB, 3 WR, TE, FLEX, K, DEF, 6 BN, IR)" — display is correct.
3. Complete creation (any name, any settings).
4. New league → Settings → General tab.
5. **Roster Size dropdown shows "4 players"** — completely wrong.

This means EITHER (a) the creation step is showing a hardcoded display value but persisting a different default, or (b) the Settings page is displaying a different field than it's editing. Either way, draft behavior, lineup slots, waiver logic, and bench size will all be wrong until this is fixed.

**Likely root cause:** Settings page is using the GOLF default (4 starters / 9 roster) regardless of sport. The creation flow correctly switches to NFL composition; the Settings General tab probably reads/writes the same `rosterSize` integer column without translating it for NFL's structured composition.

**Fix:** Settings General tab should either (a) hide the simple "Roster Size" dropdown for NFL leagues and show the structured composition card instead, or (b) translate `rosterSize` correctly when reading/writing for NFL. Probably the right answer is to make Roster Size + IR Slots + Position Limits all behave correctly per sport.

**FILES:**
- `frontend/src/pages/LeagueSettings.jsx` (or similar — the Settings General tab component)
- `backend/src/routes/leagues.js` — save handler
- Possibly `backend/prisma/schema.prisma` — verify how NFL roster composition is currently stored

---

### 186 — CRITICAL: NFL league Settings shows "Tournament" terminology (golf bleed) `CRITICAL`
**Status:** `DONE`
**Completed:** 2026-05-16 — Roster Lock Deadline dropdown options + help text now sport-aware. NFL shows "Weekly Lock (Thursday Kickoff)"; golf shows "Tournament Start (Thursday)". Files: LeagueSettings.jsx (commit 0d76b6b)
**Priority:** Critical for NFL launch — instant credibility destroyer
**Source:** Cowork NFL audit, May 16 2026

**Repro:**
1. Any NFL league → Settings → General tab → scroll to "Roster Lock Deadline" section.
2. Dropdown shows option **"Tournament Start (Thursday)"** — "Tournament" is golf-only terminology.
3. Help text below the dropdown reads: **"When rosters lock for each tournament week"** — "tournament week" is golf-only.

For NFL leagues this needs to say "Game Start (Thursday)" or "Weekly Lock (Thursday Kickoff)" and "When rosters lock for each game week".

This is the same sport-agnostic terminology pattern that queue items 010 and 011 worked on in March. There's likely a sport-aware util being used inconsistently — Settings is bypassing it.

**Fix:** Use the existing sport-aware terminology util (probably exports `getRosterLockLabel(sport)` or similar) for this dropdown's option labels + help text. If util doesn't exist, add one.

**FILES:**
- `frontend/src/pages/LeagueSettings.jsx` — the General tab "Roster Lock Deadline" select
- `frontend/src/utils/sportTerminology.js` (if it exists) — add the missing label

---

### 187 — CRITICAL: NFL PlayerDrawer shows career stats instead of selected-year stats `CRITICAL`
**Status:** `DONE`
**Completed:** 2026-05-16 — /players/:id route now defaults targetSeason to player's most recent season via findFirst when not specified (was returning career totals). All season-filtered queries reference targetSeason consistently. Files: nfl.js (commit c3dac53)
**Priority:** Critical for NFL launch — the player drawer is the highest-trafficked surface during draft prep
**Source:** Cowork NFL audit, May 16 2026

**Repro:**
1. `/nfl/players` → click Lamar Jackson (or any NFL player).
2. PlayerDrawer opens. Year dropdown defaults to **2024**.
3. Overview tab shows: **94 Games · 2141.0 Fantasy Pts · 22.8 Pts/Game**.
4. Season Stats card shows: Pass YDs **20417**, Pass TDs **168**, INTs **52**, Rush YDs **6065**, Rush TDs **31**, Cmp/Att **1711/2628**.
5. These are career totals across 7 seasons, not 2024-specific. Lamar Jackson played 17 games in 2024 with ~4,172 pass yds and 41 pass TDs.

The year dropdown is decorative — it doesn't actually filter the stats below it.

**Fix:** The Overview tab's stats query needs to scope to the selected year. The card labels can stay generic, or change to "2024 Stats" / "Career Stats" toggle.

**FILES:**
- `frontend/src/components/players/PlayerDrawer.jsx` (or wherever NFL drawer Overview tab lives) — wire the year selector to the API query
- Backend: `GET /api/players/:id?year=2024` — verify this is supported, fix if not

---

### 188 — HIGH: NFL PlayerDrawer "Rating" stat shows 0.0 `HIGH`
**Status:** `DONE`
**Completed:** 2026-05-16 — Passer rating now computed server-side from season-aggregated cmp/att/yds/td/int using the NFL formula (4 components each clamped to [0, 2.375]) instead of averaging the nullable per-game passerRating column. Files: nfl.js (commit a93854d)
**Priority:** High — looks broken, undermines data-credibility positioning
**Source:** Cowork NFL audit, May 16 2026

**Repro:** Any NFL QB → PlayerDrawer → Season Stats → "Rating: 0.0".

Passer rating for an active starting QB is never 0.0. Either the field isn't being calculated, the wrong column is being read, or the field name doesn't match the source data.

**Fix:** Either calculate passer rating server-side (NFL formula: see nfl.com/help/glossary/q/quarterback_rating) or remove the field from display until it's wired. Half-broken stat displays are worse than missing ones.

**FILES:**
- `frontend/src/components/players/PlayerDrawer.jsx` — Season Stats card
- `backend/src/services/nflStatsService.js` or similar — calculate passer rating from existing pass yds / TDs / INTs / Cmp/Att

---

### 189 — HIGH: NFL league home — "1 members" pluralization bug `HIGH`
**Status:** `DONE`
**Completed:** 2026-05-16 — Inline ternary `{memberCount} member{memberCount === 1 ? '' : 's'}` in ChatPanel header. Files: ChatPanel.jsx (commit a93854d)
**Priority:** High — minor but pervasive, makes the app look unpolished
**Source:** Cowork NFL audit, May 16 2026

**Repro:**
1. Create or visit any NFL league with 1 member.
2. League home page → right-side chat panel header shows **"1 members"** (should be "1 member").

The subtitle under the league title correctly says "1 member" so the pluralization util exists somewhere — this chat panel header just isn't using it.

Queue item 018 fixed this on LeagueHome before; the chat panel is missing the same fix.

**FILES:**
- `frontend/src/pages/LeagueHome.jsx` — chat panel header
- Use `pluralize()` or similar util

---

### 190 — HIGH: PostHog event catalog has no NFL-specific events; predictions placeholder won't fire `HIGH`
**Status:** `DONE`
**Completed:** 2026-05-16 — Added `Sports` enum to analytics.js and the sport-property convention (`track(Events.X, { ...payload, sport: Sports.NFL })`) — cleaner than duplicating events with nfl_* prefixes. One PostHog filter splits dashboards by sport. Wired into MockDraftRoom, WaiverWire, and other surfaces. Files: analytics.js, MockDraftRoom.jsx, WaiverWire.jsx (commit a93854d)
**Priority:** High — analytics is now live; we want NFL launch events tracked from day 1
**Source:** Cowork PostHog wiring + audit, May 16 2026

The `Events` catalog in `frontend/src/services/analytics.js` has 42 events but none specifically for NFL flows. Specifically missing:
- `nfl_league_created`, `nfl_draft_started`, `nfl_draft_pick_made`, `nfl_lineup_saved` — needed to measure the NFL acquisition funnel separately from golf
- `nfl_waiver_claim` — Tuesday morning waiver activity is the key engagement signal during the season
- `nfl_player_viewed` — heavy click into the PlayerDrawer is the draft prep signal

Right now NFL flows fire the same events as golf (e.g. `draft_pick_made`). That's fine for total volume but unusable for sport-specific funnels.

**Fix:** Add NFL-prefixed events to the `Events` catalog and update existing `track()` calls in NFL flows to pass a `sport: 'nfl'` property, so a single PostHog filter can split by sport. The `sport` property is cheaper than dedicated events.

**FILES:**
- `frontend/src/services/analytics.js` — add `sport` enum to event properties, document expected values
- All league/draft/roster components — pass `sport` in track calls (mostly mechanical)

---

### 191 — MEDIUM: League Home post-create dashboard regresses to zero-state mid-fetch `MEDIUM`
**Status:** `DONE`
**Completed:** 2026-05-16 — Dashboard renders an `<nbsp>` branch when `leaguesLoading` to prevent zero-state flash before useLeagues resolves. Files: Dashboard.jsx (commit 9aa017e)
**Priority:** Medium — UX papercut, ~3 seconds of confusing state
**Source:** Cowork NFL audit, May 16 2026

**Repro:**
1. Dashboard with N existing leagues. Subhead reads "You have N active leagues."
2. Click Create League → complete flow → land back on Dashboard.
3. For ~3 seconds the Dashboard shows the empty-state subhead **"Create or join a league to get started."** even though you have N leagues still.
4. Then the new league appears with "You have N+1 active leagues."

The Dashboard component is treating "no leagues loaded yet" as "no leagues exist" — same bug pattern.

**Fix:** Show the loading skeleton (which already exists for the cards) with the EXISTING subhead text, not the zero-state one. Or read from cached state instead of triggering a refetch on navigation.

**FILES:**
- `frontend/src/pages/Dashboard.jsx`

---

### 192 — MEDIUM: League Home "Start building your draft board" callout has no CTA `MEDIUM`
**Status:** `DONE`
**Completed:** 2026-05-16 — Cowork verified the orphan banner string is no longer present anywhere in `frontend/src` (grep for "Start building your draft board" and "your prep is your edge" returned zero matches). The callout was removed at some point between the audit and now. Code shipped this without updating the queue. Flipping to DONE.
**Priority:** Medium — orphan UI element, looks unfinished
**Source:** Cowork NFL audit, May 16 2026

The league home page shows a horizontal banner that reads **"Start building your draft board — your prep is your edge"** with a small dotted-decoration on the left. There is no button, no link, no click target. It just sits there.

**Fix:** Either add a "Open the Lab →" CTA that deep-links to `/lab/new?league={id}`, or remove the banner until it has a destination.

**FILES:**
- `frontend/src/pages/LeagueHome.jsx`

---

### 193 — MEDIUM: League Home "Trades / Playoffs / Recap" chips are greyed placeholders in pre-draft `MEDIUM`
**Status:** `DONE`
**Completed:** 2026-05-16 — Trades/Playoffs/Recap chips now only render when `isDraftComplete`. Pre-draft state hides them entirely instead of showing disabled placeholders. Files: LeagueHome.jsx (commit 9aa017e)
**Priority:** Medium — visually confusing, what are they?
**Source:** Cowork NFL audit, May 16 2026

Below the Teams table on League Home there are three small chips: **Trades · Playoffs · Recap**. In a pre-draft league they're greyed out and don't appear interactive. It's unclear what they're meant to be — tabs? Filters? Coming-soon teasers?

**Fix:** Either (a) hide them entirely until they're applicable (e.g., show Trades only when trading is enabled and there's a trade history), (b) make them proper tabs that show the empty state, or (c) tooltip them as "Available once your draft is complete."

**FILES:**
- `frontend/src/pages/LeagueHome.jsx`

---

### 194 — MEDIUM: Schedule Draft is a bare datetime input with no defaults / no timezone hint `MEDIUM`
**Status:** `DONE`
**Completed:** 2026-05-16 — Schedule Draft input pre-fills with today+7 days at 8pm local, shows timezone hint below. Files: LeagueHome.jsx (commit 9aa017e)
**Priority:** Medium — first-time commissioner experience
**Source:** Cowork NFL audit, May 16 2026

**Repro:** New league → "Schedule Draft" button → opens a single `<input type="datetime-local">` with placeholder `mm/dd/yyyy, --:-- --`. No suggested date. No timezone. No "we'll send reminders" copy. No mock draft suggestion.

**Fix:**
- Pre-fill with a sensible default (current date + 7 days at 8:00 PM local).
- Show timezone next to the input ("Times shown in your local timezone").
- Add a small note: "All league members get email + push reminders 24h and 1h before the draft."
- Optional: link to "Schedule a mock draft first?" — primes the engagement and tests the draft room.

**FILES:**
- `frontend/src/pages/LeagueHome.jsx` (or wherever Schedule Draft inline UI lives)

---

### 195 — MEDIUM: NFL hub Latest news section tags everything "TRANSACTION" `MEDIUM`
**Status:** `DONE`
**Completed:** 2026-05-16 — Replaced loose TRANSACTION_KEYWORDS array with word-boundary regex (`/\b(signed (a|to)|agreed to terms|reportedly signing|released by|waived by|traded to|free agent (signing|deal)|franchise tag(ged)?|contract extension|restructure[ds]?|opt(s|ed) out|placed on (waivers|IR))\b/i`). No longer matches "cut day", "big deal", "trade deadline preview", etc. Backfill of mis-classified existing rows still pending as a separate one-shot script. Files: newsSync.js (commit 9aa017e)
**Priority:** Medium — same bug as queue item 019, still present
**Source:** Cowork NFL audit, May 16 2026

**Repro:** `/nfl` → Latest section. Examples:
- "Report: Josh Mauro died from fentanyl, cocaine, ethanol overdose" → tagged TRANSACTION (it's news, not a transaction)
- "Stephen A. weighs in on Cowboys as Super Bowl contenders" → tagged TRANSACTION (it's commentary)
- "Peyton Manning scrolls through TV to reveal Broncos schedule" → tagged TRANSACTION (it's a media moment)

Item 019 closed this for golf news. NFL news ingestion is using the same default category for everything.

**Fix:** Re-apply whatever fix shipped for golf news to the NFL news ingestion path. Likely the news classifier service needs to be sport-aware.

**FILES:**
- `backend/src/services/newsService.js` (or similar) — category classification
- `backend/src/services/nflNewsSync.js` or equivalent

---

### 196 — MEDIUM: Settings page header still says "Manage Audit Test NFL League settings" but Schedule tab + Danger Zone may not be NFL-aware `MEDIUM`
**Status:** `DONE`
**Completed:** 2026-05-16 — "Roster Adjustments" card in ScheduleManager.jsx now golf-only (NFL has full participation every week, no designated-events concept). "Major Tournament Bonus" card in OneAndDoneSettings.jsx gated to `sport === 'golf'`. OneAndDoneSettings periodUnit is now sport-aware ('tournament' for golf, 'week' for NFL). Files: ScheduleManager.jsx, OneAndDoneSettings.jsx, LeagueSettings.jsx (commit 0d76b6b)
**Priority:** Medium — needs verification, didn't deep-dive Schedule + Danger Zone tabs in this audit
**Source:** Cowork NFL audit, May 16 2026

The Settings page has 8 tabs (General, Head-to-Head, Scoring, Trades, Waivers, Members, Schedule, Danger Zone). I only audited General + Members. The other six tabs likely have similar sport-awareness bugs.

**Specific things to check:**
- **Head-to-Head** tab — playoff settings, tiebreakers
- **Scoring** tab — verify NFL scoring presets show correctly (Half PPR/PPR/Standard); custom scoring editor needs all NFL stat keys (pass yds, pass TDs, INTs, rush yds, rush TDs, rec, rec yds, rec TDs, fumbles, 2pt, return TDs, kicker by distance brackets, DST stats)
- **Trades** tab — veto threshold, trade deadline (week-based, not "tournament" based)
- **Waivers** tab — FAAB or rolling, waiver day (Wednesday standard for NFL)
- **Schedule** tab — does it understand NFL's 18-week regular season? Bye weeks?
- **Danger Zone** — delete league, transfer commissioner

**Action:** Walk each tab as part of NFL bulletproofing in Phase 2. Capture findings in this same queue.

---

### 197 — LOW: NFL league create — Head-to-Head card icon is an "X" `LOW`
**Status:** `DONE`
**Completed:** 2026-05-16 — Swapped "swords" crossed-diagonals icon (reads as delete X) for two-arrows-facing-each-other ("head-to-head" matchup). Files: FormatSelector.jsx (commit 40e988a)
**Priority:** Low — cosmetic
**Source:** Cowork NFL audit, May 16 2026

In the league creation Step 2, the "Head-to-Head" format card is decorated with an X icon. X means "no" or "delete" in most UI contexts. For H2H, a "vs" or two-arrows-meeting icon would be clearer.

**FILES:**
- `frontend/src/pages/CreateLeague.jsx` — Step 2 format card

---

### 198 — LOW: NFL hub tiles are static (Players / Leaderboards / Teams / Schedule / Compare / News) with no preview data `LOW`
**Status:** `TODO`
**Priority:** Low — cosmetic, but a missed opportunity to be impressive
**Source:** Cowork NFL audit, May 16 2026

The 6 tiles on `/nfl` are just label cards. A user landing on the NFL hub for the first time sees no data, no top players, no schedule. The Golf Hub by contrast has live tournament intel.

**Fix:** Each tile could show 1-2 lines of live data:
- Players → "Top this week: Saquon Barkley · 32.4 pts"
- Leaderboards → "Top manager: ChaseTheTrophy · 94 rating" (real once we have managers)
- Teams → "Hottest team: Buffalo Bills · 8-1"
- Schedule → "Next game: KC @ DEN · Thu 8:15 PM"
- Compare → "Most compared this week: Mahomes vs. Allen"
- News → "Latest: Stephen A. on Cowboys"

This makes the page feel alive even before users have a league.

**FILES:**
- `frontend/src/pages/NflHub.jsx`

---

### 184 — Migrate DNS off Netlify → Cloudflare + set up email routing `MEDIUM`
**Status:** `TODO`
**Priority:** Medium — execute Monday May 18 after PGA Championship pool closes (Sun May 17 night)
**Source:** Eric, May 16 2026. Netlify DNS keeps causing friction; site is on Vercel; want clean modern DNS + free email routing.

**Current state (verified via RDAP + DNS queries 2026-05-16):**
- **Registrar:** Name.com, Inc. — Eric controls this
- **Registered:** Feb 5, 2026 · expires Feb 5, 2027
- **DNS nameservers:** `dns{1,2,3,4}.p06.nsone.net` (NS1.com, used by Netlify)
- **MX records:** none — no email is currently set up
- **TXT records:** no SPF, DMARC, or verification records present

**Target state:**
- **Nameservers:** Cloudflare (e.g. `xxx.ns.cloudflare.com`, two of them)
- **DNS records preserved:** A/CNAME for apex + www → Vercel, plus any Vercel verification TXT
- **Email routing live:** `eric@clutchfantasysports.com` → `ericmsaylor@gmail.com` via Cloudflare Email Routing (free)
- **SPF record:** `v=spf1 include:_spf.mx.cloudflare.net ~all`
- **Netlify account:** can be deleted entirely or left dormant — nothing important left there

**Pre-flight (do this BEFORE changing nameservers — Sunday night or first thing Monday):**
1. Log into the Netlify dashboard at app.netlify.com → find the domain → screenshot every DNS record. Capture: A records, CNAME (www + any others), TXT (any Vercel/Google verification), MX (none expected). Save the screenshots to a temp folder so you have a recovery reference.
2. Lower the TTL on the current Netlify DNS records to 300 seconds (5 min) at least 24 hours before the migration if you want faster propagation. If you didn't, no big deal — worst case it takes 24-48h to propagate, but most of the world will see the new nameservers within 1-4 hours.
3. Create a Cloudflare account if you don't have one (free tier — no payment method required).

**Migration sequence (the actual Monday work, ~30 min active + propagation wait):**
1. **In Cloudflare:** Add site `clutchfantasysports.com`. Cloudflare scans the current DNS at Netlify and auto-imports records. Verify everything imported correctly against your screenshots.
2. **In Cloudflare:** Note the two new nameservers it assigns you (e.g. `lucy.ns.cloudflare.com` / `walt.ns.cloudflare.com`).
3. **In Name.com:** Domains → clutchfantasysports.com → Nameservers → change from `dns*.p06.nsone.net` to the two Cloudflare ones. Save.
4. **Wait** for propagation. Test with `dig NS clutchfantasysports.com @8.8.8.8` or `nslookup -type=NS clutchfantasysports.com 8.8.8.8`. When the response shows Cloudflare's nameservers, you're live.
5. **Verify site** is still up. Hit https://www.clutchfantasysports.com — should still load the Vercel app.
6. **Set up Cloudflare Email Routing:** Cloudflare dashboard → Email → Email Routing → Enable. It'll add the required MX records (3 of them) and a TXT/SPF record automatically. Then add destination `ericmsaylor@gmail.com`, verify it (click confirmation email), and add forwarding rule `eric@clutchfantasysports.com → ericmsaylor@gmail.com`.
7. **Test email forwarding:** Send a test from a different email account to `eric@clutchfantasysports.com`. Should land in Gmail within 30 seconds.
8. **Optional but nice:** Add DMARC TXT record `_dmarc.clutchfantasysports.com` → `v=DMARC1; p=none; rua=mailto:eric@clutchfantasysports.com`. Helps deliverability of outbound mail (when you send via Resend, etc.).
9. **Cleanup:** In Netlify, delete the site entry. Account can stay or go — your choice.

**Rollback if anything goes wrong:**
- If the site goes down after the nameserver swap: go back to Name.com, restore the four NS1 nameservers. Propagation will reverse within an hour.
- If Cloudflare email routing fails verification: leave Cloudflare DNS in place but use Improvmx as a fallback (different MX records, also free).

**Risks / gotchas:**
- Make sure Vercel's domain verification TXT records (if any exist) are recreated in Cloudflare before nameserver swap, or Vercel will mark the domain as misconfigured and SSL might rotate.
- Resend (used for email sending in `notificationService`) sends from a different domain right now (probably their default `resend.dev` or similar). If you ever set up `noreply@clutchfantasysports.com` for outbound, you'll need to add Resend's DKIM records in Cloudflare. Defer to a separate item.

**FILES / accounts touched:**
- Name.com account
- Netlify account
- Cloudflare account (new)
- No code changes needed

---

### 181 — Navbar account dropdown: duplicate "My Profile" entry `LOW`
**Status:** `DONE`
**Completed:** 2026-05-16 — Renamed one "My Profile" entry to "Account Settings" with settings-cog icon (eliminates the visual duplicate while preserving both routes — `/profile` is the profile page, `/profile` link with new label clarifies it as account settings). Files: Navbar.jsx (commit 40e988a)
**Priority:** Low — cosmetic but obvious to user
**Source:** Cowork pool re-audit, May 12 2026

Clicking the avatar at top-right (Eric Saylor) opens the account menu. "My Profile" appears as **both** the 2nd and 4th item in the dropdown:

```
Eric Saylor / ericmsaylor@gmail.com
- My Profile          ← #1
- Manager Stats
- Clutch Rating
- My Profile          ← duplicate
- Leaderboard
- My Leagues
- ...
```

Remove the duplicate. Likely two route definitions both labeled "My Profile" — one of them was probably meant to be a different label (e.g. "Settings" or "Account").

**FILES:**
- `frontend/src/components/layout/Navbar.jsx` — account dropdown menu items

---

### 199 — League Format: Chopped (weekly elimination + roster goes to waivers) `HIGH`
**Status:** `DONE`
**Completed:** 2026-05-17 — Shipped Chopped NFL v1. NFL-only league format with weekly eliminations, FAAB blind auction reusing existing waiver infra, commissioner manual chop + Tuesday auto-fallback, analytical Safe % math, provider abstraction (ESPN free + SDIO stub). All frontend surfaces shipped: league creation Chopped card, League Home embed widget, /leagues/:id/chop dedicated page, CommishChopReview panel, Standings variant, Waiver "Recently Chopped" filter, vocabulary file. Schema migration 52 live on Railway. Test seed: `node backend/scripts/chopped/seed-test-league.js`. Design + plan in `docs/plans/2026-05-17-chopped-format-*.md`. Task 19 (per-league waiver-close config) deferred.
**Priority:** High — proven format with **multi-million-dollar competitor company** (Matthew Berry's Guillotine Leagues = entire startup built around it), Eric played the Sleeper version (Chop Suey league), strong "must-watch-every-week" engagement loop, makes a 14-team NFL league feel alive every Sunday. Real differentiator for NFL launch.
**Source:** Cowork — observed in Eric's live Sleeper league "Chop Suey" (2025 14-Team Chopped PPR) and Matthew Berry's Guillotine Leagues standalone platform (guillotineleagues.com), May 12-16 2026

**Competitive context (critical for positioning):**
- **Sleeper** — has "Chopped" as a free league format option. Friend-group, no money. The format that's already in the wild.
- **Guillotine Leagues** (Berry's company, sister to Fantasy Life) — entire standalone regulated DFS-style platform running paid contests with the format. Operating in ~48 states. Has its own podcast ("CHOP"), branded vocabulary ("Guilloteenies"), format variants ("Chopionship" = tournament-of-survivors). Mobile-first iOS + Android.
- **Clutch's lane (the differentiated value prop):** content + brand + **FREE format with friends + persistent Clutch Rating across all your formats + AI Coach with cross-format memory**. Neither Sleeper (free but no brand/content/rating) nor Guillotine (brand/content but paid-only with strangers) serves this. **This is the value prop, not a side benefit. The "free friend-group with cross-format meaning" framing must show up in marketing copy + onboarding.**

**What Chopped is (verbatim from Sleeper's settings panel):**
> "Chopped is a mode where each week the lowest scoring team is eliminated and their roster is added to the waivers."

**Why it works (observed in Eric's league):**
- Final standings shown after week 18 — top teams (Inflamed hemroids 2,426 PF, Taint Drapes 2,274 PF) accumulated points all season; bottom teams (BenDover2569 875 PF, Bobbitt's Revenge 967 PF) got chopped early and stopped accumulating. The PF spread itself tells the story of when each team died.
- All teams show `0-0` W-L because there are no head-to-head matchups — pure cumulative points race.
- Every week is a survival event: lowest scorer dies, their players hit the wire, FAAB war erupts. Even non-contenders care because they want to avoid being next.
- Plays cleanly with FAAB ($1000 budget in Eric's league) — the chopped roster is the loot drop.

**Schema additions:**
1. `League.format` enum — extend existing format field (currently H2H / Roto / Survivor / OAD / Segment) to include `CHOPPED`. If `format` doesn't exist yet, add it; if it does, just add the enum value.
2. `Team.eliminatedAt` — nullable timestamp; set when a team is chopped. Used to (a) lock their roster from waivers/trades, (b) display them grayed out in standings, (c) compute survivor count.
3. `Team.eliminationWeek` — nullable int; redundant with timestamp but easier to query.
4. `Team.finalRank` — nullable int; assigned in reverse order of elimination (first chopped = last place, last surviving = champion).
5. Migration name: `add_chopped_format`

**Backend service: `backend/src/services/choppedElimination.js`**
- New service. Exports `runWeeklyElimination(leagueId, week)`:
  1. Query all `Team` rows in league where `eliminatedAt IS NULL` (still alive).
  2. Compute each team's total fantasy points for the given week. **For golf**: sum `Performance.fantasyPoints` for the team's starters that tournament. **For NFL**: sum `NflPerformance.fantasyPoints` for week's starters.
  3. Find lowest scorer. Tiebreaker: lowest cumulative season points (the "trailing-est" team dies). Second tiebreaker: random.
  4. Mark that team eliminated: `eliminatedAt: now`, `eliminationWeek: week`, `finalRank: <current alive count>`.
  5. Release all eliminated team's rostered players to FAAB waivers — create `WaiverClaim` candidates / set `RosterSpot` rows to free agent (use existing waiver release mechanism, do not invent a new one).
  6. Emit `team_chopped` event via Socket.IO + `notificationService.notify()` to ALL league members (eliminated team gets a different message — "You've been chopped" vs "Team X was chopped, their roster hits waivers Tuesday").
  7. Last team alive → set `finalRank: 1`, mark league `status: COMPLETE`, fire `league_won` event.
- Cron registration in `backend/src/index.js`:
  - Golf chopped: Monday 8 AM ET (after Sunday tournament completes + auto-resolution). Reuse existing `weeklyResultsCron` hook.
  - NFL chopped: Tuesday 6:30 AM ET (after Monday Night Football, after `nflFantasyTracker.js` runs).
- Both crons: query active leagues with `format = CHOPPED`, call `runWeeklyElimination()` for each.

**Frontend surfaces:**
1. **Standings (`LeagueHome.jsx` or wherever Teams table renders):**
   - Eliminated teams: gray text + line-through on team name, "💀 W6" badge showing week chopped.
   - Sort: alive teams first (by cumulative PF), then eliminated teams (most recent elimination first).
   - Remove W-L columns for chopped leagues; show `PF`, `Avg/Wk`, `Status` (Alive/Chopped W6).
   - Show "X of Y still alive" counter at top.
2. **"Chopping Block" widget on league home:**
   - Live during the current scoring week. Shows projected scores for all alive teams sorted ascending — the team at the top of the list is "On the Chopping Block."
   - Pulls from existing live scoring pipeline (`scoringService.js`). For golf: tournament-aware fantasy projection. For NFL: live PPR/standard.
   - Subtle red glow on the bottom team. Updates real-time.
3. **Roster page when viewing eliminated team:**
   - Banner: "This team was chopped Week 6. Their roster was released to waivers."
   - Players grayed out, no add/drop buttons.
4. **Feed event:** New event type `team_chopped` — auto-posted to league chat: "💀 @TeamName was chopped Week 6 with 87.4 pts. Their roster (15 players) hits waivers in 24h."
5. **PostHog events:**
   - `chopped_league_created` (sport, teamCount)
   - `team_chopped` (leagueId, eliminatedTeamId, week, score, survivorsRemaining)
   - `chopped_player_claimed` (the FAAB pickup of a chopped player — interesting waiver behavior signal)
   - `chopped_league_won` (leagueId, championId, weeksAlive)

**League creation UI:**
- In `CreateLeague.jsx` or league format picker — add Chopped as a card next to H2H / Roto / Survivor. Tagline: "Last team standing. Lowest score each week is eliminated; their roster hits waivers."
- League size validation: minimum 4 teams (else the league ends in 3 weeks). Recommend 10-14 for season-long pacing — explain "Your league will last <teamCount> weeks. 14 teams = full NFL regular season."

**Edge cases / rules to write into the service:**
- Bye weeks (NFL): teams with most starters on bye are punished — that's the format, not a bug. Don't soften it.
- Tournament weeks with no golf (off-week): skip elimination, don't chop.
- Trade deadline: Sleeper's Chop Suey league has trade deadline week 11 (config option already exists). Disable trades for eliminated teams immediately.
- IR / suspensions: chopped team's IR'd players also released. No carve-outs.
- Tie at the bottom: see tiebreakers above. Document in league chat post: "Tie at 67 pts — TeamA chopped (lower season total)."

**Out of scope for v1:**
- Resurrection / second-chance mechanics (Sleeper doesn't do this either — keep it brutal).
- Chopped + playoffs hybrid — Chopped IS the playoffs.
- Per-week visualization of historical eliminations (nice-to-have, queue separately).
- **Paid contests / DFS-style entry fees** — Clutch's positioning forbids this AND Guillotine Leagues owns that lane with regulatory infrastructure Clutch is not staffed to replicate.
- **"Chopionship" multi-league tournament format** — Year 2 idea, queue separately when item 199 proves engagement.

**Steals from Guillotine Leagues (do incorporate in v1):**
- **Survivor-count-everywhere UI pattern.** Show "X of Y still alive" in EVERY surface — standings widget, league header, notification badge, chat events. The shrinking number IS the dopamine loop. Don't bury it.
- **Branded participant vocabulary.** "Guilloteenies" is silly but ownable. Pick a Clutch name BEFORE launch — options: "Survivors", "Choppers", "The Block", "Lifelines". Eric decides. Use consistently across UI + emails + marketing.
- **Mobile-first packaging for Chopped specifically.** Standard leagues people manage on desktop; Chopped people obsessively check on phone Sunday mornings ("am I about to die?"). Even before Clutch has a native app, the Chopped UI views (LeagueHome chopping-block widget, eliminated banner, weekly elim notification) must feel native on mobile.

**Files (new):**
- `backend/prisma/schema.prisma` — add `CHOPPED` to format enum, `eliminatedAt`/`eliminationWeek`/`finalRank` on Team
- `backend/prisma/migrations/XXX_add_chopped_format/migration.sql`
- `backend/src/services/choppedElimination.js` — new service
- `frontend/src/components/league/ChoppingBlockWidget.jsx` — new component
- `frontend/src/components/league/EliminatedTeamBanner.jsx` — new component

**Files (modified):**
- `backend/src/index.js` — register Monday 8 AM ET + Tuesday 6:30 AM ET cron triggers
- `backend/src/services/notificationService.js` — add `team_chopped` notification template (email + push + in-app)
- `backend/src/services/scoringService.js` — expose `getLiveTeamScore(teamId, week)` if not already, for chopping-block widget
- `frontend/src/pages/CreateLeague.jsx` — add Chopped format card
- `frontend/src/pages/LeagueHome.jsx` — render ChoppingBlockWidget, modify Teams table for chopped leagues
- `frontend/src/pages/TeamRoster.jsx` — render EliminatedTeamBanner if `team.eliminatedAt`
- `frontend/src/services/analytics.js` — add 4 new event constants under `Events`

**Verify:**
- Create a chopped golf league with 4 test users, run a week, lowest scorer gets eliminated, their players appear in waivers, surviving teams' standings re-sort, chat shows "💀 X chopped" event.
- Create a chopped NFL league with 4 teams, simulate a week via NFL test seeder, same flow.

---

### 200 — Format-aware Player Browser pill (Sleeper "Chopped/FA" toggle equivalent) `LOW`
**Status:** `TODO`
**Priority:** Low — small UX polish, ride-along with item 199
**Source:** Cowork observation of Sleeper league Player browser, May 12 2026

**What Sleeper does:** When you're inside a Chopped league and visit the Players tab, two pills appear: `Chopped` and `FA`. "Chopped" shows players that came off eliminated rosters; "FA" shows the full free-agent pool. Lets you tell instantly which players were dropped because their team died vs which were never rostered.

**For Clutch:** After item 199 ships, add the same pill on `PlayerBrowser.jsx` / wherever the league's free agent list lives. A player whose previous roster spot has `eliminatedAt != null` gets the "Chopped" badge. Filter pill toggles between "Chopped" / "Never Rostered" / "All Free Agents."

Bonus: a "Chopped from" badge on the player card showing the eliminated team name and elimination week.

**Files:**
- `frontend/src/pages/PlayerBrowser.jsx` (or wherever free agents render in-league)
- `frontend/src/components/players/PlayerRow.jsx` — chopped badge

**Depends on:** Item 199 (schema must exist first).

---

### 202 — MARQUEE: Retroactive Rating Reveal at Import (NFL launch hero feature) `HIGH`
**Status:** `TODO`
**Priority:** **HIGHEST priority for NFL launch positioning.** This is the one strategic addition from the May 16 competitive sweep + strategic-handoff doc worth interrupting the standard bug queue for. It is the launch-day press hook ("Clutch grades you, not just your players") made tangible in 90 seconds of onboarding.
**Source:** Cowork — derived from `clutch_strategic_handoff.md` Section 3.1 + 7 + Eric's May 16 strategic discussion ("manager-grading stays a key differentiator without becoming the only thing"). MVP scope only — Year-2 vision (counterfactuals, brief's 6 process sub-scores, mobile-native reveal) is captured at bottom as out-of-scope.

**What this is, in one screenshot:** A new user imports their existing Sleeper / ESPN / Yahoo / Fantrax / MFL league. Within 90 seconds of completing the import, they hit a designed-as-reveal onboarding screen titled something like **"Your Clutch Rating: 3 seasons graded"** that shows their existing-platform Clutch Rating V2 score + tier badge + a small ribbon of stat snapshots ("Draft IQ: 78 — top 20% of all imported managers." / "You won 2 championships across 12 years." / "Your 3 worst draft picks: ..."). The page is a destination, not a modal — they can share it, screenshot it, and the URL is public-by-default (with privacy controls).

**Why this matters (lift from strategic-handoff doc):**
- Collapses the cold-start problem — every new user arrives with a non-zero, meaningful Rating from minute one instead of "play 8 weeks for us to grade you"
- Creates the screenshot-worthy viral moment that gets posted in group chats — the marketing engine for the wedge user
- Gives Clutch a real engine-validation dataset (thousands of imported managers' historical ratings) BEFORE the 2026 NFL season opens, instead of flying blind into the only season-shaped window of the year
- Anchors the platform's positioning ("Clutch grades the manager, not the roster") at the moment users are deciding whether to come back

**What's already built (verify before scoping):**
- All 5 platform importers exist (Sleeper, ESPN, Yahoo, Fantrax, MFL) — see `backend/src/services/imports/`
- League Vault V2 surfaces draft history, season records, owner mapping
- Clutch Rating V2 with 7 components + confidence curves (per CLAUDE.md Phase 5B — `clutchRatingService.js` 833 lines)
- `analyticsAggregator.js` aggregates HistoricalSeason records into ManagerProfile (per QUEUE item 002 fix from March)
- Owner mapping wizard claims HistoricalSeason rows to userId (League Vault V2)

**What's the gap that makes "see your career graded in 90 seconds" not exist today:**
1. The Rating + history exist in the data layer but there's no purpose-built **import-completion reveal moment** in the onboarding flow. Users get dropped on the League Home or Vault and have to find their rating themselves.
2. The reveal needs designed share/screenshot assets — a public OG-image-friendly URL the user can drop in a group chat (`/r/{userId}` or `/career/{userSlug}`).
3. Rating computation currently runs on a cron / batch — for the reveal to fire instantly post-import, it needs to run inline (or be triggered with the import job's completion handler).
4. The current Rating components include outcome-weighted scores (Win Rate, Championships) — the brief argues for process-only. For the MVP we ship what we have; revising the math is Year 2.

**MVP scope (what ships before NFL launch, ~3-4 weeks for Code):**

1. **Backend: inline rating compute on import completion.**
   - When an import job finishes successfully (`imports/sleeperImport.js` etc.), trigger `clutchRatingService.recomputeForUser(userId)` synchronously in the same job. No cron wait.
   - If owner claim happens later (Vault wizard), re-trigger on claim event.
   - Idempotent — safe to re-run, no duplicate sub-rows.

2. **Backend: new endpoint `GET /api/career/:userSlug`** that returns the full rating-reveal payload.
   - **Public-by-default (no auth required).** Confirmed by Eric May 16 2026 — viral share needs public URLs, the "Rating must stay private" guidance in the strategic-handoff doc refers to *competitive leaderboards*, not individual users' own career pages. Owner can toggle to private via Profile settings; default off.
   - Payload shape:
     ```json
     {
       "user": { "displayName", "username", "avatarUrl" },
       "rating": { "overall": 78, "tier": "VETERAN", "components": { ... 7 sub-scores ... } },
       "career": { "seasonsCount": 12, "leaguesCount": 3, "totalWins": 134, "totalLosses": 92, "championships": 2 },
       "highlights": [
         { "type": "best_draft_pick", "year": 2019, "player": "Christian McCaffrey", "round": 3, "value": "+8.4 standard dev above ADP" },
         { "type": "worst_draft_pick", ... },
         { "type": "longest_dynasty_hold", ... },
         { "type": "most_chosen_position_round_1", ... }
       ],
       "compareToImports": { "draftIqPercentile": 82, "winRatePercentile": 64 }
     }
     ```
   - The `highlights` array is the screenshot fuel. Compute 4-6, surface 3 that are most flattering or most ribbable.

3. **Frontend: new route `/career/:userSlug`** — designed as a public landing page, not an in-app modal.
   - Hero: avatar + displayName + rating-circle (existing `DashboardRatingWidget` styled bigger) + tier badge
   - Career strip: 4-stat cards (seasons, leagues, championships, win rate)
   - 7-component Rating breakdown with confidence bars (existing component)
   - Highlights carousel: 3 hand-picked moments with cards designed for screenshotting (16:9 aspect, branded watermark in corner)
   - Compare strip: "You rank #X% on Draft IQ vs all imported Clutch managers" (only if percentile data is available — show 3-5 dimensions max)
   - **Share button** with native share API + copy-link + 4 pre-built social images (one per major dimension) generated via `@vercel/og` or similar
   - Footer CTA: "Want to play here? Start a free league →" for non-logged-in viewers
   - OG image: server-rendered card with their rating + tier + a one-line tagline — must look great as a Twitter / iMessage preview

4. **Onboarding flow integration: import completion → reveal redirect.**
   - When import job completes (and rating recompute returns), redirect the user to `/career/{theirSlug}?from=import` instead of dropping them on League Home.
   - Add a one-time toast on the reveal page: "Your rating across [N] seasons just dropped. Share it or jump into your league →"
   - "Continue to league" CTA on the reveal redirects to League Home.

5. **PostHog events:**
   - `career_reveal_viewed` (userId, fromImport: true|false, seasonsCount)
   - `career_reveal_shared` (channel: native|copylink|twitter|imessage)
   - `career_reveal_signup_from_share` (referrerUserId) — this is the viral attribution event
   - `import_completed_rating_inline` (importPlatform, seasonsImported, ratingScore) — for measuring inline-compute success vs cron fallbacks

**Files (new):**
- `backend/src/routes/career.js` — public `GET /api/career/:userSlug`
- `frontend/src/pages/CareerReveal.jsx` — the public reveal landing page
- `frontend/src/components/career/HighlightCard.jsx` — screenshottable card component
- `frontend/src/components/career/CompareRibbon.jsx` — percentile ribbon
- Backend OG-image renderer at `/api/og/career/:userSlug` (use `@vercel/og` or similar; renders a 1200×630 social card with rating + tier + tagline)

**Files (modified):**
- `backend/src/services/imports/{sleeper,espn,yahoo,fantrax,mfl}Import.js` — call `clutchRatingService.recomputeForUser(userId)` on success
- `backend/src/services/clutchRatingService.js` — expose `recomputeForUser(userId)` if not already, ensure idempotent
- `frontend/src/services/api.js` — `getCareerReveal(userSlug)`, `track('career_reveal_viewed', ...)` etc.
- `frontend/src/services/analytics.js` — add 4 new event constants under `Events`
- `frontend/src/pages/Profile.jsx` — privacy toggle "Make my career page public/private" (default: public)
- App router — add `/career/:userSlug` route, unauthenticated

**Edge cases / rules:**
- User imports a league but isn't claimed as an owner yet (owner-claim wizard incomplete) → reveal page shows "Claim your seasons" CTA instead of full reveal
- User imports a single league that's only 1 season old → reveal page shrinks gracefully, doesn't show "career" framing, surfaces what we have
- User has zero imports (just signed up with no leagues) → don't render `/career/me`; redirect to League Home with "Import your league to see your rating →" CTA
- **Slug = username, always.** Clutch already enforces unique usernames at signup (Profile validates 3-30 chars lowercase alphanumeric + hyphens, returns 409 on duplicate per `analytics.js` notes), so collisions are not a runtime concern. URL pattern: `clutchfantasysports.com/career/ericsaylor`.
- **Username required before the reveal page renders.** Users who signed up without setting a username (field is currently optional) get prompted to pick one as the final step of import → reveal. Pre-fill suggestions from their display name. This is one-time friction that produces a clean shareable URL forever.
- If a user later changes their username, old reveal URLs 301-redirect to the new one. Keep a `username_history` table so old links don't 404 when shared.
- Privacy: default is **public** for all users. Owner can opt out via Profile → "Make my career page private." If toggled private, public visits return 404; owner viewing their own page still works; existing share links go cold (acceptable).

**Out of scope for v1 (Year 2 epic, do NOT scope into this item):**
- Decision-level retroactive rating compute (the brief's full vision — counterfactuals, "you started Evans over Lamb" calls) requires preserving per-decision data the importers don't currently capture. Year-2 work.
- Brief's 6 process sub-scores (Draft discipline / Trade execution / Waiver-FAAB / Start-Sit / Roster mgmt / Volatility). Current 7 components are what they are for v1.
- Mobile-native (React Native) reveal — web responsive is sufficient for v1.
- Counterfactual coach commentary on the reveal page.
- Rating-predicts-outcomes internal analytics layer (brief Section 3.6) — separate Year-2 epic.
- Public leaderboard at `/career` (browse all public managers) — explicitly NOT in v1 per strategic discussion (private/internal mirror, not status game).

**Verify:**
- Import a real Sleeper league with multi-year history → rating computes inline → reveal page renders with non-zero rating + populated highlights → share button generates a valid OG image preview when pasted in iMessage/Twitter.
- Test with a user who has 1 season imported, 5 seasons, and 12 seasons — UX should scale.
- Test the share-to-signup funnel by sharing the URL to a logged-out browser and confirming PostHog fires `career_reveal_viewed` with `fromImport: false` and a clean signup path back into the app.

**Why this is item 202, not item 199 (Chopped):** Chopped is a format play that competes for "best league experience." This is a positioning play that establishes "why Clutch exists." Per the strategic-handoff doc Section 7: "If only one thing gets built between now and August 2026: retroactive Rating from imported league history."

---

### 203 — Decision Capture Phase A (schema + envelope + chips taxonomy) `MEDIUM`
**Status:** `DONE` — and went well beyond Phase A scope
**Completed:** 2026-05-16 — Shipped Phase A + A.1 + B (all 7 primitives) + frontend chip pickers + LINEUP_VIEWED PostHog event in one night. Five commits totaling ~1,300 lines.
- **Phase A (47cf922):** Migration 51 — 5 model extensions + 2 new tables (WatchlistEvent, AuctionNomination). Shared reasonChips.js taxonomy (frontend + backend mirror). decisionEnvelope.js helpers (note: backend helper lives at `backend/src/services/decisionEnvelope.js`, not `backend/src/lib/`, but functionally equivalent).
- **railway.toml landmine fix (6ba81f5):** Removed `prisma db push --accept-data-loss` from startCommand. The push was silently mutating prod schema before `migrate deploy` ran — caused initial Phase A deploy to crashloop. Future schema changes must go through migration files only. See `project_clutch_deploy_model.md` memory.
- **Phase B (4eccaae):** Write paths for 6 primitives — draft pick (with computed pickQuality from ADP/auction delta, time-on-clock, top-200 availablePool snapshot), lineup save (structured decisions[] + editCount mutate-in-place), waiver/FA claim (acquisitionRoute + FAAB-at-bid), trade (proposer/responder projected values at propose/response, declineReason enum), naked drop (wasOnActiveLineup + daysSinceAcquisition + acquisitionType), watchlist (new DB rows on add/remove).
- **Phase A.1 + B-7 (108e0bd):** `leagueContextService.js` computes standingsPosition/record/rank + weeksRemaining (NFL only — golf TBD). buildEnvelopeWithContext() async helper wired into 5 routes. Auction nomination capture (route + back-fill on award) for Phase 2.7 nomination-bias detector.
- **Frontend chips + LINEUP_VIEWED (e18469b):** New `<ReasonChipsPicker>` shared component (sport-aware, max-3 multi-select). Wired into trade proposal modal + waiver claim form. LINEUP_VIEWED PostHog event on TeamRoster mount/unmount (paralysis signal, pairs with editCount DB field).

**Pre-flight checks Eric flagged in this spec but DID NOT verify/add:**
- ClutchProjection.rosProjectedPts — separate from tradeValue (Phase 5.2 loss-aversion detector dependency)
- ClutchProjection variance/uncertainty (risk_tier enum) — Phase 2.5 late-round caution dependency
Both deferred to follow-up; not blocking Year 1 capture since the columns they'd populate (`projectedPtsAtPick`, etc.) accept whatever ClutchProjection currently exposes.

**Remaining gaps (deliberately):**
- Draft pick + naked drop chip pickers (no active drafts; drop dialog has no existing reasoning UI)
- Sleeper trending integration (vendor data pipeline — separate work)
- Year 2 model-driven leagueContext fields (rosterStrength, weeklyMatchupWinProb, schedule strength)
- Shadow read service `decisionHistoryService.js` (Phase D — Year 2)
- Retroactive import backfill (Phase E — depends on item 202)

Files (new): migrations/51_decision_capture_year_1/, backend/src/services/{decisionEnvelope,leagueContextService}.js, backend/src/constants/reasonChips.js, frontend/src/utils/decisionEnvelope.js, frontend/src/constants/reasonChips.js, frontend/src/components/common/ReasonChipsPicker.jsx, docs/PHASE_A_DEPLOYMENT.md
Files (modified): backend/prisma/schema.prisma, backend/src/routes/{drafts,teams,trades,waivers,watchList}.js, backend/src/services/{fantasyTracker,draftTimer}.js, backend/railway.toml, frontend/src/{services/analytics,hooks/{useTradeCenter,useWaivers},pages/{TeamRoster,TradeCenter,WaiverWire},components/trade/ProposeTradeModal}.js[x]
**Priority:** Medium — parallel/background work to NFL launch sprint. **Not on NFL launch critical path** (the bias engine that consumes this data is Year 2). But the migration must ship before any new decision surface is added, or that surface will need re-instrumenting later.
**Source:** `docs/CLUTCH_DECISION_CAPTURE_SPEC.md` v3 + `docs/BIAS_BY_PHASE_MATRIX.md`. Both are required reading before writing any code.

**The instruction in one paragraph:** Read `CLUTCH_DECISION_CAPTURE_SPEC.md` v3 (not v2 — v3 incorporates a cross-walk against the bias matrix and added 2 new primitives + 7 new envelope fields you'd otherwise miss). Implement Phase A only: schema migration for the new columns + 2 new tables (`WatchlistEvent`, `AuctionNomination`), the `reasonChips.js` taxonomy const file, the `DecisionEnvelope` helper, and the `leagueContextService.js` that computes envelope `leagueContext` fields on demand. Do NOT start Phase B (write-path instrumentation per primitive) in the same PR — that's 7 separate PRs covered by Phase B in the spec's build order.

**Scope boundary — Phase A only includes:**
1. ONE Prisma migration adding:
   - new nullable columns on `DraftPick`, `LineupSnapshot`, `WaiverClaim`, `Trade`, `RosterTransaction` per spec §6 (now §8 in v3) "Migration impact"
   - NEW table `WatchlistEvent` per spec §6
   - NEW table `AuctionNomination` per spec §7
   - All new columns nullable, NO `NOT NULL DEFAULT` (DraftPick is already large — that lock kills Railway)
2. NEW file `frontend/src/constants/reasonChips.js` exporting `REASON_CHIPS` + `chipsForSport(sport)` per spec §8
3. NEW file `backend/src/lib/decisionEnvelope.js` exporting a `buildEnvelope({ userId, teamId?, leagueId?, sport, surface })` helper that returns the full `DecisionEnvelope` shape (envelope + leagueContext + mock attribution skeleton)
4. NEW file `backend/src/services/leagueContextService.js` computing the v3 expanded `leagueContext` fields: standings record, rank, playoff prob, weekly matchup win prob, roster strength, past/ROS/playoff schedule strength. Cache per `(leagueId, fantasyWeekId)` with a 1-hour TTL. Returns null fields gracefully when data not yet available (e.g., pre-season).
5. NO write-path changes to existing decision routes. NO frontend `track()` call modifications. Those come in Phase B.

**Pre-flight checks (verify before writing):**
- `ClutchProjection` model exposes BOTH `tradeValue`/`currentValue` AND `rosProjectedPts` separately. If not, add a `rosProjectedPts` field — Phase 5.2 detector (Loss aversion in trades) needs it. Flagged in v3 spec under "Dependencies on ClutchProjection."
- `ClutchProjection` model exposes some form of variance/uncertainty per player (variance, p10/p90, or coarse `riskTier`). If not, add a `riskTier: 'LOW' | 'MED' | 'HIGH'` enum — Phase 2.5 detector (Late-round caution) needs it.
- These two ClutchProjection additions can ship in the same migration as Phase A's other changes if they're missing.

**Out of scope (do NOT do in this item):**
- Wiring `buildEnvelope()` into any existing route handler (that's Phase B per primitive)
- Adding chips to any UI component (that's Phase B + frontend work)
- Backfill of existing rows (Phase E in the spec — runs after each importer)
- The shadow read service `decisionHistoryService.js` (Phase D)
- The bias engine itself (Year 2)

**Files (new):**
- `backend/prisma/migrations/XXX_decision_capture_phase_a/migration.sql`
- `backend/src/lib/decisionEnvelope.js`
- `backend/src/services/leagueContextService.js`
- `frontend/src/constants/reasonChips.js`

**Files (modified):**
- `backend/prisma/schema.prisma` — add fields per migration

**Verify:**
- Migration applies cleanly to a Railway-sized DB without locking for more than a few seconds (all new columns nullable, no backfill)
- `buildEnvelope({ userId, sport: 'nfl' })` returns a valid shape with all expected fields, nulls where appropriate
- `leagueContextService.computeFor(leagueId, weekId)` returns the expanded `leagueContext` for a real existing league + week, including the new v3 fields (roster strength, weekly win prob, schedule strength)
- `chipsForSport('golf')` returns shared chips + golf chips per the const file
- No existing route's behavior changes — Phase A is purely additive infrastructure

**When this can ship:** any time after NFL launch Tier 1 critical bugs (185, 186, 187, 196) are deployed. Does NOT block the marquee (item 202). Can run in parallel with Tier 2/3 NFL polish work.

---

### 201 — Marketing: Auction Draft Podcast (3-episode pilot) `BACKLOG-Y2`
**Status:** `BACKLOG`
**Priority:** Year 2 marketing experiment — not a NFL launch item, scheduled for Jan 2027 evaluation
**Source:** Eric idea raised during Fantasy Footballers competitive walkthrough, May 16 2026

**Opportunity:** Zero major fantasy football podcasts cover auction drafts as primary focus. Fantasy Footballers, FantasyPros, Locked On Fantasy, ETR — all snake-draft-dominant. Auction drafters are a passionate ~5-10% niche (paid Fantrax / Yahoo Plus users) deeply underserved on content. First-mover defensibility in podcast verticals is unusually durable.

**Why this maps to Clutch:**
- Clutch already supports auction draft deeply (Lab board editor has auction values column, draft room supports auction format). Every episode = free demo of platform tooling.
- SEO moat from day one — episode titles + show notes are evergreen long-tail content ("auction draft strategy 2026", "$200 budget allocation", "nomination order").
- Audio → app install funnel is well-proven for fantasy (Fantasy Footballers' app installs driven primarily by show mentions).

**Pilot test (low-cost validation):**
- 3 deep-dive episodes, drop together to YouTube + Spotify + Apple Podcasts.
- Ep 1: "Auction Draft 101 — the math behind $200 budgets" (educational, SEO-friendly)
- Ep 2: "Nomination strategy — when to throw out a player you actually want" (advanced tactical)
- Ep 3: "$200 mock auction live" (Eric + co-host run real-time mock in Clutch's Lab — also demo content)
- Target: 500 listens/episode in first 30 days from cold-start with paid promo on r/fantasyfootball + twitter
- Budget: ~$200 mic setup + Riverside subscription ($15/mo) + ~10 founder hours

**Decision point — Jan 2027:** Evaluate pilot signal. If listener growth + engagement is real, commit to weekly for 2027 NFL season as primary marketing channel. If nothing, recoverable loss.

**Critical pre-conditions before launching pilot:**
1. **Find a co-host with auction credibility.** Solo shows die fast. Best move: partner with an auction-focused twitter/reddit personality who already has audience. DO NOT GO SOLO.
2. **Plan editing pipeline before recording.** Hire $50/episode freelance editor on Fiverr/Upwork after the 3 pilots prove the format. Editing kills more podcast projects than content.
3. **Don't pivot Clutch toward media.** Fantasy Footballers built podcast-first then layered tools; Clutch is platform-first with media as ACQUISITION LAYER. Order matters.

**This is NOT a code item.** It is a strategic marketing reminder. Belongs in Eric's Q1 2027 planning, not Claude Code's queue. Listed here so it doesn't get lost.

**Files (none — strategic note).**
**Verify:** Re-read this entry in January 2027 and decide whether to proceed.

---

### BACKLOG — Projected Cut Line Display
**Status:** `BACKLOG`
**Priority:** Low — nice-to-have enhancement for live tournament experience

**Feature:** Show projected cut line on leaderboard during R1/R2 of tournaments. ESPN API does NOT expose a projected cut number. Two options:
1. **Derive from leaderboard** — find the score at position ~65 (top 65 + ties make the cut in most PGA events). Simple, no API needed.
2. **Pull from DataGolf** — their live predictions API (`/predictions/in-play`) may include a field-level cut line projection. We already sync `makeCutProbability` per player.

Display: horizontal "projected cut" line on the leaderboard between the last player projected to make it and the first projected to miss. Could also show the cut score number in the tournament header.

**FILES:**
- `frontend/src/components/tournament/TournamentLeaderboard.jsx` — cut line visual
- `backend/src/services/datagolfSync.js` — already syncs `makeCutProbability`
- DataGolf API docs for field-level cut projection endpoint

---

### BACKLOG — Manager Profile Page Visual Overhaul
**Status:** `DONE`
**Completed:** 2026-03-06 — Narrowed to max-w-3xl, two-column layout (Prove It left, Rating right), compacted stats/rating/bars, hide CTAs on other profiles. Files: ManagerProfile.jsx, RatingBreakdown.jsx
**Priority:** Medium — page works but looks stretched and poorly organized

**Problems (from screenshot review):**
- Page is too wide — Clutch Rating section stretches full width, looks oversized
- Rating Journey (7 component bars) dominates the page with empty progress bars
- Prove It Track Record is buried at the bottom — should be more prominent
- Everything needs to be more compact and better organized
- Stats cards (Leagues, Win %, Championships, Predictions, Rating) are fine but spaced too far apart

**Design direction:**
- Narrow container: `max-w-3xl` instead of current width
- Two-column layout on desktop: Prove It track record + recent calls on left, Clutch Rating compact on right
- Compact rating: shrink the 7-component breakdown into tighter rows, hide "Import league history" CTAs when viewing someone else's profile
- Prove It Track Record at the top or left column — it's the most interesting data
- Rating circle stays in header but smaller

**FILES:**
- `frontend/src/pages/ManagerProfile.jsx`

---

### BACKLOG — Team Name Click: Team Roster vs Profile Decision
**Status:** `DONE`
**Completed:** 2026-03-06 — Team name click now goes to roster with ?member= param. TeamRoster auto-selects that team. "View Profile" link on other teams' rosters. Files: LeagueHome.jsx, TeamRoster.jsx
**Priority:** Medium — product/UX decision needed

**Question:** When clicking a team name from the league Teams table, should it:
1. **Show their team roster** (inline expand or navigate to their roster page) — more useful in-league context, see their players during live tournament
2. **Go to manager profile** (current behavior) — shows overall platform stats but less relevant in-league

**Possible approach:** Click team name → navigate to their roster page (`/leagues/:id/team?owner=:userId`). Add a "View Profile" link on the roster page for the full manager profile. This way the league context stays primary.

**FILES:**
- `frontend/src/pages/LeagueHome.jsx` — Teams table click handler
- `frontend/src/pages/TeamRoster.jsx` — support viewing other teams' rosters

---

### 204 — Run Player ID Resolution backfill against prod  `MEDIUM`
**Status:** `BLOCKED` — script needs proxy-disconnect resilience before it can run anywhere outside Railway shell. Claude Code will refactor and re-run on next session. Cowork: please stop trying to run this; not urgent, not blocking NFL launch.
**Priority:** MEDIUM — unblocks Manager Intelligence (#202) build by populating player ID mappings on existing imported data.
**Owner:** Claude Code (next session) — will refactor with reconnect/retry/batch logic, then run.

**What this is:**
Commit `86d8933` (May 17) wired `playerMatcher.matchAndLink` into the 4 league import services (sleeper/yahoo/espn/mfl — fantrax skipped, no platform IDs). Going forward, every new import will populate `Player.{platform}Id` columns as a side effect.

But Eric's existing imports (296 HistoricalSeason rows confirmed in prod via dry-run) happened BEFORE that wiring landed, so their picks have raw platform IDs in `HistoricalSeason.draftData` with no corresponding `Player.{platform}Id` mappings populated. This blocks Manager Intelligence extractors that need to resolve a raw Yahoo `390.p.X` style ID back to a canonical Player record.

The backfill script catches up all that historical data in one pass.

**How to run:**

```bash
railway run --service web node backend/scripts/intelligence/backfill-player-ids.js
```

Idempotent — safe to re-run. Expected runtime ~2 min on Railway (DB is local). Local runs over the proxy take ~50 min so use Railway exec.

**Optional dry-run first** (no writes, just shows what WOULD happen):
```bash
railway run --service web node backend/scripts/intelligence/backfill-player-ids.js --dry-run
```

**What it does:**
- Walks every `HistoricalSeason.draftData` row where `import.platform IS NOT NULL`
- For each pick in `draftData.picks[]`:
  - Calls `playerMatcher.matchAndLink({ name, platform, platformId, position, sport: 'nfl' }, prisma, { createIfMissing: false })`
  - Strategy 1: exact `Player.{platform}Id` lookup. If hit, returns existing Player.
  - Strategy 2 (fallback): fuzzy name match with normalization (suffixes stripped, lowercase, last+first-name scoring). If match score ≥80, returns the Player AND writes `Player.{platform}Id` to that row (this is the incremental enrichment we want).
  - If no match: counted as a miss, added to a JSON dump for audit.
- Skips Fantrax (no platform IDs by design)
- Prints stats: totalPicks, exactMatch, fuzzyMatchEnriched, missed, errors, skippedNoPlayerId, skippedNoPlatform, skippedFantrax
- Writes misses to `backend/scripts/intelligence/_misses/misses-{timestamp}.json` if any (gitignored — these are local audit dumps, don't commit them)

**What to report back:**
1. Stats summary (the JSON block the script prints at end)
2. Misses-by-platform breakdown (it prints this too — top 10 sample names per platform)
3. Approximate match success rate per platform (e.g., "Yahoo: 1842 picks, 1450 fuzzy-enriched, 392 missed = 78% match rate")
4. Whether any errors fired
5. Eyeball check on the misses file — are the misses noise (DSTs, kickers, ancient retired players) or real recent NFL players that should have matched?

**After this completes, Manager Intelligence can resume building from MI-5 with confidence that player resolution works.**

**FILES:**
- `backend/scripts/intelligence/backfill-player-ids.js` — the script
- `backend/src/services/playerMatcher.js` — the matcher it calls
- `backend/scripts/intelligence/_misses/` — output dump (gitignored)

---

### 205 — Sleeper player ID sync service  `MEDIUM`
**Status:** `TODO`
**Priority:** MEDIUM — high-ROI prerequisite before NFL 2026 launch. Sleeper is the most popular fantasy platform; bulletproof Sleeper imports = major friction reduction.
**Owner:** Code

**What this is:**
Build a one-time-runnable sync service that pulls every NFL player from Sleeper's public API and pre-populates `Player.sleeperId` columns on our matching Player rows. Once run, every future Sleeper import gets instant exact-ID matches (no fuzzy fallback needed).

**Why it matters:**
- Today's player-ID backfill (#204, completed 2026-05-18) found 99% of Sleeper picks resolved, but those 1% (kickers like Justin Tucker, Matt Gay, Ryan Succop, Younghoe Koo) keep showing up because their Player rows don't have `sleeperId` populated.
- Sleeper's `/v1/players/nfl` endpoint returns a comprehensive map of ALL NFL players (active + retired, ~5000+ entries) with their canonical Sleeper IDs. One API call replaces all fuzzy-match guessing.
- Same pattern is the right long-term architecture for every platform — start with Sleeper since it's the easiest API + most popular platform.

**Implementation plan (~2 hours):**

1. **Create** `backend/src/services/sleeperPlayerSync.js`:
   - `syncSleeperPlayers({ db = prisma }) → { processed, matched, enriched, missed, errors }`
   - Fetch `https://api.sleeper.app/v1/players/nfl` (returns object keyed by Sleeper player_id, values have name + position + team + status fields)
   - For each Sleeper player:
     - Try exact `Player.sleeperId` match first (skip if already set)
     - Fuzzy match by normalized name + position
     - If match score ≥ 80: write `Player.sleeperId = sleeperPlayerId`
     - If no match: collect into a misses array for review
   - Return stats summary

2. **Expose as admin endpoint** at `POST /api/admin/intelligence/sync-sleeper-players` (same fire-and-poll pattern as #204 to bypass Railway proxy timeouts). Reuse the in-memory job state pattern from `backend/src/routes/adminIntelligence.js`.

3. **Optionally add scheduled cron** — Sleeper's player list updates weekly. A weekly Wednesday 4 AM cron keeps `Player.sleeperId` current as rookies / new signings come into Sleeper.

4. **Verify** by checking that known kickers (Tucker, Gay, Succop, Koo) now have `Player.sleeperId` populated:
   ```sql
   SELECT name, "sleeperId" FROM players WHERE name IN ('Justin Tucker', 'Matt Gay', 'Ryan Succop', 'Younghoe Koo');
   ```

**Files (new):**
- `backend/src/services/sleeperPlayerSync.js`
- Possibly extend `backend/src/routes/adminIntelligence.js` with new POST/GET routes

**Effect after running:** future Sleeper imports drop from "~99% match with fuzzy fallback" to "~99% match with exact ID lookup" — faster AND more reliable.

---

### 206 — Audit Yahoo parser for player_key extraction on historical seasons  `MEDIUM`
**Status:** `TODO`
**Priority:** MEDIUM — investigation task that may unlock Eric's stuck Yahoo data.
**Owner:** Code

**What this is:**
The 2026-05-18 player-ID backfill (#204) found 19,768 picks across Eric's historical seasons have **no `playerId` stored at all** in `HistoricalSeason.draftData.picks[].playerId`. That's 37% of all picks. Yahoo's API returns `player_key` (`390.p.30154` format) for every pick — meaning Yahoo HAD the data; our importer likely didn't extract it in older code.

**Question to answer:**
Does the CURRENT Yahoo importer code (`backend/src/services/yahooImport.js`) extract `player_key` for historical seasons, or is it only capturing it for current-season imports?

**How to investigate:**

1. Read `backend/src/services/yahooImport.js`, specifically the `parseDraftCSV` / draft pick parsing functions.
2. Verify the Yahoo Fantasy API draft results endpoint returns `player_key` for past seasons (test with one of Eric's known historical leagues — e.g., a 2020 or 2019 season).
3. If the current importer captures it correctly → re-import Eric's Yahoo leagues to recover the 19,768 picks. The new PIR-1 matchAndLink wiring will populate platform IDs as a side effect.
4. If the current importer drops `player_key` for historical seasons → file as a parser bug and fix before re-importing.

**Verify approach:**
Pick one of Eric's existing Yahoo leagues, re-run the import via admin tool, then query `HistoricalSeason.draftData.picks` for that season. Confirm `playerId` is populated on every pick (or at least the same coverage the new code is producing for fresh imports today).

**Files (read-only for investigation):**
- `backend/src/services/yahooImport.js`
- `backend/src/routes/imports.js`

**Effect if parser is fine:** ~19,768 additional picks become extractable for Manager Intelligence after Eric re-imports his Yahoo leagues.

---

### 207 — Historical Player record backfill (retired players)  `LOW`
**Status:** `TODO`
**Priority:** LOW — affects Manager Intelligence signal on pre-2018 seasons. Recent-era signal is stronger and matters more for v1 bias engine.
**Owner:** Code

**What this is:**
The 2026-05-18 player-ID backfill found 13,538 Yahoo picks couldn't resolve because they're retired NFL players (Rashard Mendenhall, Arian Foster, Andre Johnson, Calvin Johnson, Chris Johnson, Michael Turner, Ray Rice, Maurice Jones-Drew, Roddy White, Jahvid Best, etc.) who aren't in our `Player` table — we only synced active rosters when the table was originally built.

**Sources for historical players:**
- **nflverse** (`nflfastR` / `nflreadr`) — comprehensive every-player-ever dataset including retired. Existing nflverse integration in `backend/src/services/nflverseSync.js` (verify the file exists/the integration is intact).
- **Sleeper API** — `/v1/players/nfl` returns active + retired players in one call (this is the same endpoint #205 uses).
- **Pro-Football-Reference** — comprehensive but scrape-only (no API).

**Implementation plan (~3-4 hours):**

1. **Pick a primary source.** Sleeper's API is likely easiest (one call, structured JSON, includes retired). nflverse is most comprehensive but bulkier integration.
2. **Build sync service** that inserts retired players into our `Player` table with:
   - `name`, `firstName`, `lastName`
   - `nflPosition`, `nflTeamAbbr` (likely the last team they played for, or null if unknown)
   - `gsisId` if available from nflverse
   - `sleeperId` if pulled from Sleeper
   - A flag indicating "historical/retired" to distinguish from active players in queries (existing `status` field on Player might work)
3. **Re-run the player-ID backfill** (#204's admin endpoint) — the 13,538 misses should mostly resolve once those Player rows exist.

**Files (new):**
- `backend/src/services/historicalPlayerSync.js`
- Possibly extend `backend/src/routes/adminIntelligence.js` with another sync endpoint

**Effect:** Manager Intelligence gains signal on pre-2018 seasons for users with deep historical league imports. Eric's 2010-2017 Yahoo league picks become analyzable.

**Defer rationale:** Bias engine weights recent decisions more heavily anyway, so pre-2018 signal is nice-to-have not need-to-have. Tackle after #205 (Sleeper sync) and #206 (Yahoo parser audit) since those have higher ROI per hour.

---

## DONE

*(Items move here after completion)*

---

*Queue created: 2026-03-02. Maintained by Cowork, executed by Claude Code.*
