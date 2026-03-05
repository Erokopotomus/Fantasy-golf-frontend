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

## DONE

*(Items move here after completion)*

---

*Queue created: 2026-03-02. Maintained by Cowork, executed by Claude Code.*
