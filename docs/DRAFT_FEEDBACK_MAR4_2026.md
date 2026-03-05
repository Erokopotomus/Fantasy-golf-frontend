# Clutch Fantasy Sports — Live Draft Feedback
**Date:** March 4, 2026
**Draft:** B Squad Bros (Snake Draft, 4 managers)
**Testers:** Eric, Josh (GirthBrooks09), Mason, Brandon (ThunderCunts)
**Method:** Real-time feedback during first live draft

---

## BUGS (Fix Before Next Draft)

### B01. Queue doesn't auto-remove drafted players
- **Severity:** HIGH
- **What:** When a player in your queue gets drafted by someone else, they stay in your queue instead of being removed or grayed out.
- **Expected:** Auto-remove or visually strike through queued players once drafted.

### B02. Full page reload after drafting a player
- **Severity:** HIGH
- **What:** After clicking "Draft" on a player, the entire page reloads/flashes instead of a smooth state update.
- **Expected:** Seamless pick confirmation — board updates, player pool removes player, turn advances, no full reload.

### B03. Clicking a player when it's NOT your turn → error → boots to dashboard
- **Severity:** HIGH
- **What:** If you click "Draft" on a player when it's not your turn, an unhandled error kicks you back to the dashboard.
- **Expected:** Button should be disabled/hidden when not your turn. If somehow clicked, show inline error, don't navigate away.

### B04. Drafting the same player twice → error → boots to dashboard
- **Severity:** HIGH
- **What:** Race condition or stale state allows attempting to draft an already-drafted player. Error crashes you out to dashboard.
- **Expected:** Already-drafted players should be instantly removed from pool. Server should return graceful error, frontend should show toast.

### B05. Chat messages lost on page refresh
- **Severity:** MEDIUM
- **What:** Draft chat is Socket.IO only — no persistence. Refreshing the page loses all chat history.
- **Fix:** Persist chat messages to DB (DraftChat model exists in socket service). Load history on join.

### B06. Roster lock countdown wrong
- **Severity:** MEDIUM
- **What:** Post-draft, roster page shows "Roster lock in 1h 38m" but the tournament doesn't start until tomorrow.
- **Fix:** Lock countdown should reference actual tournament first tee time, not a hardcoded offset.

### B07. All players auto-slotted to active lineup post-draft
- **Severity:** MEDIUM
- **What:** After draft completes, every drafted player is placed in the starting lineup. Should be opposite — everyone on bench, user selects starters.
- **Expected:** All players start on bench. User must manually set lineup before lock.

### B08. No starter/bench toggle on roster page
- **Severity:** MEDIUM
- **What:** No way to move players between starter and bench from the roster/my-team page.
- **Fix:** Add drag-and-drop or toggle buttons for starter ↔ bench movement.

### B09. LIV players showing career stats (possibly wrong)
- **Severity:** MEDIUM
- **What:** Bryson DeChambeau, Patrick Reed, Tyrrell Hatton, Jon Rahm — stats look wrong or are career-only without LIV context. LIV players not clearly distinguished.
- **Fix:** LIV players should show LIV tour badge prominently. Stats should reflect available data with disclaimer if incomplete.

### B10. Player AI insights all identical
- **Severity:** LOW
- **What:** Opening player drawers during draft shows the same AI insight text for every player.
- **Fix:** Insights should be player-specific. If AI insights aren't generated yet, show relevant stats instead of generic text.

### B11. Draft/bookmark button overlap
- **Severity:** LOW
- **What:** The "Draft" button and bookmark/queue icon overlap on player rows, especially on narrower screens.
- **Fix:** Adjust spacing or stack vertically on mobile.

### B12. Optimize lineup button glitching
- **Severity:** LOW
- **What:** "Optimize Lineup" button on roster page has visual glitch or doesn't work correctly.
- **Fix:** Debug optimize lineup logic and button state.

### B13. Draft timer not synced across browsers
- **Severity:** MEDIUM
- **What:** Timer countdown shows different values for different users.
- **Fix:** Server-authoritative timer. Broadcast remaining seconds from server, clients display server time.

---

## UX IMPROVEMENTS (Draft Room)

### U01. "Best Available" recommendation strip
- **Priority:** HIGH
- **What:** During the draft, it's not clear who the best available pick is. Users feel like they need a cheat sheet.
- **Proposal:** Floating strip above player pool showing top 3-5 recommended picks based on: board rank (if board exists), CPI, SG Total, positional need. AI coach one-liner for each.

### U02. Draft confirmation modal
- **Priority:** HIGH
- **What:** No "Are you sure?" when clicking Draft. Accidental clicks are a real risk.
- **Fix:** Modal: "Draft [Player Name]? Pick #X, Round Y" with Confirm/Cancel buttons.

### U03. Color-coded stats (green/red scale)
- **Priority:** HIGH
- **What:** CPI and SG values all look the same visually. No color gradient to quickly identify good vs bad.
- **Fix:** Green gradient for positive/high values, red for negative/low. Scale: dark green (elite) → light green → neutral → light red → dark red (poor). Apply to CPI, SG Total, and all SG sub-categories.

### U04. Stronger "your turn" visual indicator
- **Priority:** HIGH
- **What:** When it's your turn, the visual cue is too subtle. Easy to miss, especially if tabbed away.
- **Fix:** Gold border pulse on entire draft room, prominent banner "YOUR PICK — Round X, Pick Y", browser tab title change to "🟡 YOUR TURN — Clutch Draft".

### U05. Better between-picks experience
- **Priority:** HIGH
- **What:** When waiting for others to pick, the screen feels static and unhelpful. "Jake's" experience with just his queue box is underwhelming.
- **Fix:** Show: who's picking now (with timer), recent picks feed, suggested players to research, quick-compare tool. Make waiting time productive.

### U06. Feed tab (live pick log)
- **Priority:** HIGH
- **What:** No running log of picks as they happen. Have to look at the board to figure out what just happened.
- **Fix:** New "Feed" tab alongside Chat/Queue showing: "Round 2, Pick 3: Mason drafted Rory McIlroy (#3)" with timestamps. Real-time, auto-scrolling.

### U07. Tour filter pills (PGA / LIV / DP World)
- **Priority:** MEDIUM
- **What:** Can't filter player pool by tour. Mixed PGA/LIV/DP World players with no easy way to segment.
- **Fix:** Filter pills above search: All | PGA | LIV | DP World. Similar to dashboard player filters.

### U08. Column header tooltips
- **Priority:** MEDIUM
- **What:** "BD" column is confusing ("what the heck is the BD column?"). Column headers need explanations.
- **Fix:** Hover tooltips on every column header explaining the stat. BD = "Board Rank — your personal ranking from The Lab".

### U09. More stats on player rows
- **Priority:** MEDIUM
- **What:** Player rows need more information for decision-making. Specifically: OWGR (World Golf Ranking), tournaments played last season, next tournament field indicator.
- **Fix:** Add OWGR column (visible on desktop). Add "Events" count. Consider expandable row detail.

### U10. Games/tournaments played last season
- **Priority:** MEDIUM
- **What:** Knowing how many tournaments a player played last year helps predict availability this season.
- **Fix:** Add prior-year events count to player data. Show in player pool and player drawer.

### U11. Board columns sorted by draft order
- **Priority:** MEDIUM
- **What:** Draft board team columns should follow the draft order sequence, not alphabetical or creation order.
- **Fix:** Sort team columns left-to-right by draft position (1st pick → last pick). Snake direction arrows already shown per round.

### U12. Editable team name from draft room
- **Priority:** MEDIUM
- **What:** Team shows as "YOU" which feels impersonal. Users want to set/edit team name.
- **Fix:** Click "YOU" to edit team name inline. Or settings gear in draft header.

### U13. Team column max-width cap
- **Priority:** LOW
- **What:** With only 4 teams, columns stretch very wide horizontally. Feels sparse.
- **Fix:** Cap team column width (maybe 200px max). Center the board or use remaining space for a sidebar.

### U14. Quick 2-player compare
- **Priority:** MEDIUM
- **What:** When stuck deciding between two players, need a fast side-by-side comparison without leaving the draft.
- **Fix:** "Compare" button when 2 players are in queue, or select 2 players from pool. Slide-out panel with key stats side by side.

### U15. SG column not centered (Dashboard tab)
- **Priority:** LOW
- **What:** SG (Strokes Gained) column values aren't centered/aligned in the dashboard view of the draft.
- **Fix:** Text-align and tabular-nums on SG column.

### U16. Sound triggers (up next, timer warning)
- **Priority:** MEDIUM (partially done)
- **What:** Need distinct sounds for: your turn, you're up NEXT (one pick away), timer at 30s/10s/5s, draft started, draft complete.
- **Status:** Basic sounds wired (your turn, pick made, draft start/complete). Need: "up next" trigger, timer warning escalation.

### U17. Better contrast/color palette
- **Priority:** MEDIUM
- **What:** On a new monitor OR a washed-out work monitor, the color differences between elements are barely distinguishable. Both light and dark mode affected.
- **Fix:** Increase contrast ratios across the board. Ensure WCAG AA (4.5:1) for all text. Test on low-quality displays.

### U18. Draft board background color meaning unclear
- **Priority:** LOW
- **What:** Draft board cells have different background colors (gold tints, crown tints) but there's no legend explaining what they mean.
- **Fix:** Add subtle legend or tooltip: gold = your team, highlighted = current pick, tint intensity = player rank tier.

### U19. Less horizontal stretch (narrow viewport optimization)
- **Priority:** LOW
- **What:** Draft room feels very horizontally stretched on wide monitors.
- **Fix:** Max-width container for draft room content, or use extra space for supplementary panels.

### U20. Next tournament field indicator
- **Priority:** MEDIUM
- **What:** During a season-long draft, knowing which players are in NEXT WEEK's tournament field matters. Not visible in draft room.
- **Fix:** Badge or icon on players confirmed for next tournament. Filter option: "In next field".

---

## DRAFT RECAP IMPROVEMENTS

### R01. Draft grades need league-size adjustment
- **Priority:** MEDIUM
- **What:** No one got an A in a 4-person draft. Grading algorithm may be calibrated for larger leagues.
- **Fix:** Scale grades relative to league size. In a 4-team league, the #1 pick should be able to earn an A+.

### R02. View other teams' draft recaps
- **Priority:** HIGH
- **What:** Can only see your own draft recap. Want to see how other teams did.
- **Fix:** Dropdown or tabs to switch between teams' recaps.

### R03. Team roster dropdown in recap
- **Priority:** MEDIUM
- **What:** Should be able to view any team's full drafted roster from the recap page.
- **Fix:** Add team selector dropdown showing each team's picks in order.

### R04. Clickable players in recap
- **Priority:** MEDIUM
- **What:** Player names in the draft recap don't open player drawers.
- **Fix:** Wire onClick → PlayerDrawer for all player names in recap.

### R05. Coach's Take font too small
- **Priority:** LOW
- **What:** The AI coach commentary text in draft recap is too small to read comfortably.
- **Fix:** Increase font size from text-xs/text-sm to text-base.

### R06. Radar chart readability
- **Priority:** LOW
- **What:** The SG radar chart in draft recap is cool but hard to extract actionable info from.
- **Fix:** Add value labels on axes, increase chart size, consider alternative viz (bar chart) alongside radar.

### R07. Draft recap banner design
- **Priority:** LOW
- **What:** The banner/header of the draft recap could be more visually impactful.
- **Fix:** Cinematic design with league name, date, "Draft Complete" flourish, team avatars.

---

## POST-DRAFT / ROSTER PAGE

### P01. Roster page needs better stats for lineup decisions
- **Priority:** HIGH
- **What:** The roster/my-team page doesn't give enough information to make smart lineup decisions. "This is a shit screen for understanding who is going to be the best on the roster."
- **Fix:** Add: upcoming tournament name + course, course fit score, recent form trend, SG breakdown, projected fantasy points. Make it obvious who to start.

### P02. View other teams' rosters
- **Priority:** MEDIUM
- **What:** Can't view other managers' rosters from the league page.
- **Fix:** Team dropdown or clickable team names → view their roster.

---

## REPORTED BUGS (Post-Draft)

### X01. Brandon's league disappeared
- **Priority:** CRITICAL — Investigate immediately
- **What:** Brandon (ThunderCunts) reports his league is no longer visible/accessible.
- **Status:** Under investigation. Need to check: league membership, API response for his league ID, frontend routing.

---

## SUMMARY

| Category | Count | Critical | High | Medium | Low |
|----------|-------|----------|------|--------|-----|
| Bugs | 13 | 0 | 4 | 5 | 4 |
| UX Improvements | 20 | 0 | 6 | 9 | 5 |
| Draft Recap | 7 | 0 | 1 | 3 | 3 |
| Post-Draft | 2 | 0 | 1 | 1 | 0 |
| Post-Draft Bugs | 1 | 1 | 0 | 0 | 0 |
| **Total** | **43** | **1** | **12** | **18** | **12** |

---

## PRIORITY BUILD ORDER (Suggested)

**Immediate (before next draft):**
1. X01 — Brandon's league disappeared (CRITICAL)
2. B01 — Queue auto-remove drafted players
3. B02 — No full page reload on draft pick
4. B03/B04 — Error handling (don't boot to dashboard)
5. U02 — Draft confirmation modal
6. U04 — Stronger "your turn" visual

**Next sprint:**
7. U01 — Best available recommendation strip
8. U03 — Color-coded stats (green/red scale)
9. U06 — Feed tab (live pick log)
10. B05 — Chat persistence
11. B07/B08 — Bench-first post-draft + starter/bench toggle
12. P01 — Roster page stat overhaul
13. R01/R02 — Draft grades + view other teams

**Polish sprint:**
14. U05 — Between-picks experience
15. U07 — Tour filter pills
16. U08 — Column tooltips
17. U09/U10 — More stats + prior year events
18. U14 — Quick 2-player compare
19. U17 — Contrast/color improvements
20. Everything else

---

*Collected during first live draft, March 4, 2026. 4 managers, real-time feedback.*
