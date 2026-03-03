# Clutch Platform Audit Fixes — March 2, 2026

> **Source:** Cowork visual audit of Profile, Manager Profile, League Vault, Draft Comparison, and data pipeline validation.
> **Format:** Each fix is a self-contained Claude Code prompt. Work through them in order — they're prioritized by severity and dependency.

---

## FIX 1: Manager Profile Lifetime Stats Show All Zeros (DATA BUG — HIGH)

**Problem:** The manager profile page (`/manager/:id`) shows 0 Leagues, 0 Wins, 0 Championships, 0% Win Rate for all users. The Lifetime Stats section and By Sport section also show all zeros. This happens even though the user has 4 leagues on Clutch and 17 imported BroMontana seasons with full win/loss/championship data.

**Root cause:** `computeManagerProfiles()` in `backend/src/services/analyticsAggregator.js` (~line 455) only aggregates from `TeamSeason` records (active on-platform seasons). It completely ignores `HistoricalSeason` records from imports. The `ManagerProfile` model is meant to be lifetime career stats, but imported league history never flows into it.

Meanwhile, `clutchRatingService.js` DOES aggregate HistoricalSeason data correctly — the Clutch Rating shows 61 based on 17 seasons. These two services are out of sync.

**The API response confirms it:** `GET /api/managers/:userId/profile` returns `"aggregate": null` and `bySport` shows Golf with `totalLeagues: 1, totalSeasons: 1, wins: 0`.

### Prompt:

```
## Task: Fix ManagerProfile to include imported league history

The manager profile page (/manager/:id) shows 0 Leagues, 0 Wins, 0 Championships, 0% Win for users who have imported league history. The Clutch Rating correctly reads HistoricalSeason data (shows 61 based on 17 seasons), but the Lifetime Stats and top stat cards do not.

## Root cause

`computeManagerProfiles()` in `backend/src/services/analyticsAggregator.js` (~line 455) only aggregates from `TeamSeason` records (active on-platform seasons). It completely ignores `HistoricalSeason` records from imports. The ManagerProfile model is meant to be lifetime career stats.

Meanwhile, `backend/src/services/clutchRatingService.js` DOES aggregate HistoricalSeason data (lines ~69, 313, 377). These two services are out of sync.

## What to fix

Extend `computeManagerProfiles()` in `analyticsAggregator.js` to ALSO aggregate `HistoricalSeason` records where the user is a claimed owner (via `ownerUserId` on the HistoricalSeason model, or through the league's owner assignment/alias system).

Specifically:
1. After the existing TeamSeason aggregation, query HistoricalSeason records for each user
2. HistoricalSeason has fields like: `wins`, `losses`, `ties`, `championships` (or `finishPosition`), `totalPoints`, `leagueId`, `year`
3. Merge the historical totals into the same ManagerProfile upsert — add historical wins/losses/seasons/leagues to the on-platform ones
4. The aggregate ManagerProfile (sportId = null) should sum across ALL sources
5. The per-sport ManagerProfile should also include historical data for the correct sport

## Rules

- Only modify `backend/src/services/analyticsAggregator.js`
- Do NOT touch `clutchRatingService.js` — it already works correctly
- Do NOT change the ManagerProfile schema or create new migrations
- Do NOT change the route handler in `managerAnalytics.js`
- Check the HistoricalSeason model in schema.prisma to see exact field names before writing queries
- Make sure the aggregation handles users with ONLY imported history (no TeamSeason records) — they should still get a ManagerProfile
- Make sure it handles users with BOTH imported and on-platform data — totals should combine
- Add a comment like `// Include imported league history (HistoricalSeason)` where the new logic starts
- After deploying, verify by checking that GET /api/managers/cml8xo2960000ny2th1t4z5sd/profile returns non-null aggregate with correct totals (should show 134 wins, 92 losses, 1 tie, 17 seasons for Eric)
```

---

## FIX 2: Commit Cowork Edits — NaN% and Username Display (QUICK — already edited)

**Problem 1:** "Prove It Track Record" on the manager page shows "NaN%" for Accuracy when a user has 0 total predictions. Division by zero — `(reputation.accuracyRate * 100).toFixed(1)` produces NaN.

**Problem 2:** The `/profile` page shows "Set a username" in orange text even when the user already has a username set (`@erokopotomus` shows on the manager page). The condition checks `user?.username` but the auth context may not be fully synced.

**Both files are already edited and saved locally by Cowork. Just needs commit + deploy.**

### Prompt:

```
Commit and deploy the changes in frontend/src/pages/ManagerProfile.jsx and frontend/src/pages/Profile.jsx.

Changes made:
1. ManagerProfile.jsx line 658: Added null check for accuracyRate — shows "—" instead of "NaN%" when user has 0 predictions
2. Profile.jsx lines 144-145: Changed condition to check `(user?.username || formData.username)` instead of just `user?.username` so the username displays correctly even if auth context sync is delayed

These are small, surgical fixes. No other files touched.
```

---

## FIX 3: Draft Comparison Modal — Body Scroll Lock (UX BUG — MEDIUM)

**Problem:** When the Draft Comparison modal is open on the Vault Profiles tab, scrolling inside the modal also scrolls the background page. The modal content is long (stat cards + radar chart + 45+ common picks), so users will scroll a lot, and the page behind jumps around.

### Prompt:

```
## Task: Lock body scroll when Draft Comparison modal is open

In the League Vault Profiles tab, clicking "Compare Drafts" opens a modal (`Draft Comparison`). When scrolling inside this modal, the background page also scrolls. Fix this.

## Where to look

The Draft Comparison modal is rendered somewhere in the Vault Drafts or Profiles components. Search for "Draft Comparison" or "Compare Drafts" in frontend/src/. The modal likely uses a div with `overflow-y: auto` or similar.

## Fix

When the modal opens, add `document.body.style.overflow = 'hidden'` to prevent background scrolling. When it closes, restore `document.body.style.overflow = ''`. Use a useEffect cleanup to ensure it's always restored.

Standard pattern:
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

## Rules
- Only touch the component that renders the Draft Comparison modal
- Make sure the modal itself still scrolls (overflow-y: auto on the modal content)
- Make sure body scroll is restored on unmount AND on close
```

---

## FIX 4: Draft Comparison Radar Chart Too Small/Flat (UI BUG — MEDIUM)

**Problem:** The "Draft DNA" radar chart in the Draft Comparison modal is very small and horizontally compressed. It only shows 3 visible axis labels (QB at top, TE and WR at bottom). The RB, K, and DST axis labels appear to be missing or rendered outside the visible area. The chart polygons are so similar between two NFL drafters that they overlap into a nearly flat horizontal line.

### Prompt:

```
## Task: Fix Draft DNA radar chart in Draft Comparison modal

The Draft DNA radar chart in the Draft Comparison modal (League Vault > Profiles tab > Compare Drafts) is rendering too small and compressed. Only 3 of the expected 5-6 axis labels are visible (QB, TE, WR). The RB axis label is missing. The chart is so squished that the polygons look like a flat horizontal line.

## Where to look

Search for "Draft DNA" or "DRAFT DNA" in the frontend. The radar chart component is likely in the Vault section. Also check `SgRadarChart.jsx` or a similar custom SVG radar component — there may be a reusable radar chart, or the Draft Comparison may have its own inline SVG.

## What to fix

1. Increase the chart size — it needs more height/width to be readable (at least 250x250px, ideally 300x300)
2. Ensure all position axis labels render and are visible (QB, RB, WR, TE, K, and optionally DST)
3. The polygon shapes should have enough separation to see differences — if both owners have nearly identical position splits, the overlapping polygons should still be visually distinguishable (consider using fill opacity, stroke width, or a slight offset)
4. Add the missing axis labels — especially RB which is the largest allocation for both owners

## Rules
- Only modify the Draft Comparison component and/or its radar chart
- Don't change the SgRadarChart used elsewhere (player comparison) unless it's the same component
- Keep the orange/green color scheme for Owner A vs Owner B
```

---

## FIX 5: Common Picks Missing Position Badges (DATA — LOW)

**Problem:** In the Draft Comparison Common Picks list, older players (pre-~2015) show no position badge next to their name. Examples: Greg Jennings, Roddy White, Calvin Johnson, Adrian Peterson — all missing position tags. Newer players like Tyreek Hill (WR), Derrick Henry (RB), Christian McCaffrey (RB) show them correctly.

**Likely cause:** The common picks display tries to match draft pick player names to canonical Player records in the database to get position info. Retired players may not have canonical records, or the name matching fails for older imports.

### Prompt:

```
## Task: Fix missing position badges on common picks in Draft Comparison

In the Draft Comparison modal (League Vault > Profiles > Compare Drafts), the "Common Picks" section lists players both owners drafted. Newer players show position badges (WR, RB, QB) but older/retired players don't. Examples missing badges: Greg Jennings, Roddy White, Calvin Johnson, Adrian Peterson.

## Where to look

Find the component rendering "COMMON PICKS" in the Draft Comparison. Check how it resolves position for each player name. It likely tries to match the draft pick `playerName` to a canonical Player record in the DB.

## Fix options (pick the simplest)

Option A: If the draft pick data (`draftData.picks`) already has a `position` field stored from the original import, use that directly instead of looking up canonical Player records. The Yahoo import stores position on each pick.

Option B: If position is missing from some picks, fall back gracefully — show the player name without a badge (current behavior), but also check if the position can be inferred from the draft pick data across all seasons (e.g., if Adrian Peterson was drafted as "RB" in one year, apply that to all his entries).

The simplest fix is Option A — just use the position from the stored pick data. Check the draftData JSON structure to confirm picks have a `position` field.

## Rules
- Only touch the Draft Comparison component
- Don't add new API calls or DB queries — use data already available in the draft picks
```

---

## FIX 6: Common Picks — Show "Snake" Label for Non-Auction Years (POLISH — LOW)

**Problem:** In Common Picks, some entries show just a year without a dollar amount: `Greg Jennings: 2011 | 2012 $35`. The bare "2011" with no cost is confusing — users might think data is missing. Those are snake draft years (2009, 2011) where no auction values exist.

### Prompt:

```
## Task: Add "Snake" label for non-auction draft picks in Common Picks comparison

In the Draft Comparison Common Picks list, picks from snake draft years show only the year with no cost (e.g., "2011" instead of "2011 $35"). This looks like missing data. Add a subtle label so it reads "2011 Snake" or "2011 (snake)" to clarify.

## Where to look

The Common Picks rendering in the Draft Comparison component. Each pick entry shows `{year} ${cost}` — when cost is null/0, it just shows the year.

## Fix

When a pick has no cost (null or 0), append a subtle indicator like "(snake)" in muted text after the year. Example: `2011 snake` styled with text-text-muted text-xs.

Check the draftData to determine draft type — the HistoricalSeason has a `type` field on the draftData JSON ('auction' or 'snake'). If the season's draft type is 'snake', show the label. If it's 'auction' and cost is still null, show "—" for the cost.

## Rules
- Only touch the Common Picks rendering in the Draft Comparison component
- Keep it subtle — small muted text, not a badge or prominent label
- Don't change the data structure, just the display logic
```

---

## FIX 7: Auto-Apply Owner Aliases on Reimport (BACKEND — MEDIUM)

**Problem:** When a commissioner reimports a league season, the fresh data comes in with raw owner names from Yahoo/Sleeper, wiping out any alias merges they previously set up. The aliases survive in the `owner_aliases` table but aren't applied to the new data.

### Prompt:

```
## Task: Auto-apply owner aliases on league reimport

When a commissioner reimports a league season, the fresh data comes in with raw owner names from Yahoo/Sleeper/etc, wiping out any alias merges they previously set up. Fix this by applying existing aliases automatically after reimport.

## What exists today

1. `owner_aliases` table stores per-league mappings: `ownerName` (raw) → `canonicalName` (merged). Model: `OwnerAlias` in schema.prisma.

2. Reimport endpoint: `POST /api/imports/reimport-season` in `backend/src/routes/imports.js` (~lines 997-1141). It deletes the old HistoricalSeason record, fetches fresh data from the platform, and creates a new HistoricalSeason with raw owner names in the `draftData` JSON.

3. Normalize endpoint: `POST /api/imports/normalize-draft-owners/:leagueId` in the same file (~lines 627-717). It reads alias mappings, loops through all HistoricalSeason draftData picks, and renames `ownerName` fields.

## What to change

After the reimport creates the new HistoricalSeason record, add a step that:

1. Queries `OwnerAlias` for the league: `await prisma.ownerAlias.findMany({ where: { leagueId } })`
2. If aliases exist, build a rename map: `{ rawName: canonicalName }`
3. Apply the rename map to the newly created HistoricalSeason's `draftData.picks[].ownerName` — same logic as the normalize endpoint
4. Save the updated draftData

## Rules

- Only touch the reimport flow in `backend/src/routes/imports.js`
- Do NOT refactor or reorganize existing code — just add the alias application step
- If there are no aliases for the league, skip silently (no error, no log spam)
- Add a brief comment like `// Auto-apply owner aliases if any exist for this league`
- No new endpoints, no new migrations, no frontend changes
- Test by checking that the reimport response still works the same — this is additive only
```

---

## FIX 8: Tank Still Showing in 2025 Owner Spending (DATA — INVESTIGATE)

**Problem:** On the Drafts tab for BroMontana 2025, the Owner Spending table shows "Tank" with 1 pick/$2 as a separate row at the bottom. The alias merge was supposed to merge Tank → Anthony (or Spencer H). Either the 2025 draft data wasn't included in the merge, or Tank's pick in 2025 wasn't mapped.

Also: "Mase R" shows 16 picks while everyone else has 15. Verify if this is real data (maybe Mase R picked up a dropped player mid-draft) or a data issue.

### Prompt:

```
## Task: Investigate and fix remaining unmerged aliases in BroMontana 2025 draft

In the BroMontana Bowl league vault (Drafts tab, 2025 season), the Owner Spending table still shows "Tank" as a separate row with 1 pick for $2. The owner alias merge tool was run and should have merged Tank into a canonical owner name.

Also: "Mase R" shows 16 picks while all other owners show 14-15. Verify if this is correct data or a duplicate.

## Steps

1. Query the 2025 HistoricalSeason draftData for the BroMontana league to see if "Tank" still exists in the picks array
2. Check the owner_aliases table to see what Tank maps to — it should have a canonicalName entry
3. If the alias exists but wasn't applied to 2025: run the normalize endpoint or manually update the 2025 draftData
4. If no alias exists for Tank in this league: determine who Tank should map to and create the alias
5. For Mase R's 16 picks: check the raw draftData to see if there are genuinely 16 picks or if there's a duplicate entry

## Rules
- Do NOT delete any data — only rename/merge owner names in draftData
- Check the owner_aliases table FIRST before making changes
- If fixes are needed, use the existing normalize endpoint or the same update pattern
- Report what you find about the Mase R 16-pick situation
```

---

## FIX 9: Profile Page Stats Card Mismatch (UI — LOW)

**Problem:** The `/profile` page (settings view) shows "4 Leagues" but Total Points, Best Finish, and Win Rate are all dashes (—). Once Fix 1 is deployed, these should pull from the ManagerProfile data. But verify that the Profile page's stats cards actually read from the same source.

### Prompt:

```
## Task: Verify Profile page stats cards use ManagerProfile data

After Fix 1 (ManagerProfile aggregation) is deployed, verify that the /profile page stats cards (Total Points, Best Finish, Win Rate) correctly pull from the updated ManagerProfile.

## Where to look

`frontend/src/pages/Profile.jsx` — check the `useStats()` hook or however the stats cards get their data. The profile page shows 4 stat boxes: Leagues, Total Points, Best Finish, Win Rate.

## Verify

1. The "Leagues" count (currently shows 4) — is this counting on-platform leagues only, or does it include imported leagues?
2. "Total Points", "Best Finish", "Win Rate" — where do these come from? Do they use the same `/api/managers/:id/profile` endpoint that Fix 1 will populate?
3. If they use a different data source (like `useStats()` hook), that source also needs to include imported league history

## If broken
Make the Profile page stats cards use the ManagerProfile aggregate data (same source as the manager page), so both pages show consistent numbers.
```

---

## BACKLOG ITEMS (not urgent, document for later)

These are polish items identified during the audit. Don't fix now — just tracking them:

1. **Default profile avatars** — Replace initial-on-orange-circle with generated unique avatars (DiceBear/Boring Avatars). Every user looks the same right now.

2. **Profile bio/tagline + social links** — Phase 5A spec calls for these fields but the edit form only has Display Name, Username, Email, and avatar upload.

3. **Achievement card name truncation** — On the manager profile, achievement cards truncate names: "Podium Fini...", "First Champ...", "Commissio...". Cards are too narrow. Consider a tooltip on hover or a wider card layout.

4. **Clutch Rating component CTAs contradictory** — Shows "Based on 17 seasons" with 96% confidence, but individual rows say "Import league history" as if you haven't. The greyed-out CTAs should reflect that imported data exists.

5. **Draft Comparison "who paid more" indicator** — For common picks, highlight price differences between owners. If Eric got CMC for $36 in 2017 and Nick got him for $54 in 2022, show who got the deal.

---

*Generated by Cowork audit — March 2, 2026*
*Fixes 1-9 are actionable Claude Code prompts. Backlog items are future polish.*
