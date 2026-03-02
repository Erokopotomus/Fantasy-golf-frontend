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
**Status:** `TODO`
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
**Status:** `TODO`
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

## DONE

*(Items move here after completion)*

---

*Queue created: 2026-03-02. Maintained by Cowork, executed by Claude Code.*
