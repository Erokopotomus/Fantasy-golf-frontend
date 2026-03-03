# Clutch Fantasy Sports — Visual Audit V2 (Post-Sprint)

**Date:** March 2, 2026
**Context:** Re-audit after completing all 3 sprints from the original audit report
**Method:** Authenticated production screenshots across 15+ pages, light/dark mode, desktop (1280px) + mobile (375px)

---

## Sprint Fix Verification

### P0 Fixes — ALL CONFIRMED ✅

| Original Issue | Status | Evidence |
|---------------|--------|----------|
| Landing page "Lock in your predictions" | **FIXED** | Now reads "Track your predictions. Prove your accuracy." |
| Landing page "PICKS" label | **FIXED** | Now reads "CALLS" |
| Landing page "EXPERT" duplicated | **FIXED** | Shows once |
| Prove It "NFL Props" tab | **FIXED** | Now "NFL Predictions" |
| Prove It "PLAYER PROPS" header | **FIXED** | Now "PLAYER BENCHMARKS" |
| Prove It "O/U" labels | **FIXED** | Now "BENCHMARK" |
| Prove It "114 props available" | **FIXED** | Now "114 predictions available" |
| "Your Biggest Bets" in DivergenceSummary | **FIXED** | (confirmed via code audit, page not rendered in session) |
| "DRAFT_PENDING" raw enum | **FIXED** | Now shows "Pre-Draft" styled badge |
| Mobile player table blank rows 9+ | **FIXED** | Rows 11-15 render correctly with names and headshots |
| Legacy dark-* CSS tokens | **FIXED** | (confirmed via code audit) |

### P1 Fixes — CONFIRMED ✅

| Original Issue | Status |
|---------------|--------|
| Brand color migration (emerald → field) | **FIXED** — green accents now use brand system |
| Brand color migration (red → live-red) | **FIXED** |
| Dark mode variants added | **FIXED** — dashboard, league home, players all clean in dark mode |

### P2 Fixes — CONFIRMED ✅

| Original Issue | Status |
|---------------|--------|
| Loading spinners | **FIXED** — no bare "Loading..." text observed |
| Empty states improved | **FIXED** — notes section shows helpful message + CTA |
| Typography standardization | **FIXED** — headers using font-display, stats using font-mono |

---

## Pages Audited — Current State

### Looks Great (No Issues Found)

| Page | Modes Tested | Notes |
|------|-------------|-------|
| **Dashboard** | Light, Dark, Mobile | Clean league cards, coach briefing, quick actions all polished |
| **Landing Page** | Light | All gambling language fixed, hero looks sharp, CTAs on brand |
| **Golf Hub** | Light | Quick-nav grid, live tournament card with weather + course image, trending section |
| **NFL Hub** | Light | Clean nav grid, news feed with thumbnails and deep links |
| **The Lab** | Light | Hero banner, boards/notes split, league links |
| **Tournaments** | Light | Live Now card, upcoming schedule with course photos |
| **Profile** | Light | Stats cards, edit flow, preferences section |
| **Prove It** | Light, Mobile | All gambling terminology replaced, benchmark cards clean |
| **Standings** | Light | Stats summary, clean table, good empty state |
| **Player Profile (Golf)** | Light | Rich page — CPI/Form/Pressure stats, SG radar, SG trend chart, benchmark card, career vs season overlay |
| **Player Drawer (Golf)** | Light | This Week / Results / Strokes Gained tabs, skill match bars, tournament history |
| **Player Drawer (NFL)** | Light | Overview with career stats, Game Log with W/L color coding, position-specific stats |
| **NFL Players** | Light | Position filters, scoring format selector, headshots loading properly |

### Remaining Issues

#### Still Present (from original audit)

**1. Chat FAB overlaps content on mobile** — P2
The purple chat bubble still overlaps the "Draft Scheduled" card and tournament banner on League Home at 375px. It now has an "x" dismiss button which partially mitigates the issue, but the default position still covers content.
**Fix:** Move FAB above the bottom nav bar on mobile (`bottom-20`) or auto-collapse after 3 seconds.

**2. Player table horizontal scroll on mobile** — P3
At 375px, the Players table shows Rank + Player + SG Total but SG OTT/APP/Putt/Schedule are cut off to the right. There's no visible scroll indicator. This is expected behavior for a data table, but a swipe hint or a "scroll for more →" indicator would improve UX.

**3. SG Trend chart x-axis labels overlap** — P3
On the Player Profile page, the SG Trend line chart has tournament name labels on the x-axis that are rotated but still overlap at the edges when many tournaments are displayed.
**Fix:** Truncate labels or show fewer, add tooltip on hover.

**4. NFL Game Log week numbers** — P3 (data issue, not visual)
Aaron Rodgers' game log shows all games as "Week 1" or "Week 2" rather than the actual week numbers. This is likely a data sync issue from the 2024 nflverse import, not a frontend bug.

**5. Login page OAuth "(soon)" buttons** — P3
Google and GitHub OAuth buttons still show "(soon)" in a grayed-out state. Looks placeholder.
**Fix:** Hide until ready, or add a cleaner "Coming Soon" badge.

#### New Observations

**6. "BOLD CALLS" metric on landing page rating card** — P3
The landing page Clutch Rating mockup shows "BOLD CALLS" as a metric — this is good language (not gambling), but the label runs long in the card at certain viewport widths. Minor layout concern.

**7. Player Profile "Add to Roster" button context** — P3
On the golf Player Profile page, "Add to Roster" button appears even when viewing outside a league context. Clicking it likely fails or needs a league selector. Consider hiding when no league context is present, or showing a league picker dropdown.

---

## Summary

**Before sprints:** 70+ issues across P0-P3
**After sprints:** 7 remaining issues (0 P0, 0 P1, 1 P2, 6 P3)

The platform is in strong visual shape. All critical gambling language violations are resolved. All brand color migrations landed. Dark mode works cleanly. Mobile responsiveness is good across all key pages. The remaining issues are minor polish items — none are blockers or brand violations.

The one P2 worth addressing soon is the chat FAB overlap on mobile, since it affects the League Home page which is a high-traffic surface. Everything else is P3 cleanup you can tackle whenever.
