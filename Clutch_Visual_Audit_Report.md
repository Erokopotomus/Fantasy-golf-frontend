# Clutch Fantasy Sports — Visual Audit Report

**Date:** March 1, 2026
**Auditor:** Claude (source code analysis + production site screenshots)
**Scope:** All major pages — theme consistency, mobile responsiveness, typography, empty states, brand compliance

---

## Executive Summary

The Clutch platform has a strong visual foundation — the light-first brand, typography system, and overall layout are well-executed. However, the audit uncovered **70+ distinct issues** across 6 categories. The most critical finding: the **Prove It page uses pervasive gambling language** ("Props", "O/U", sportsbook-style cards) that directly violates the non-negotiable Prediction System Design Rules. Beyond that, the most systemic problems are: (1) hundreds of Tailwind color classes used without `dark:` variants, meaning dark mode has widespread contrast and visibility bugs; (2) data-heavy tables and grids that break on mobile; and (3) legacy "dark-*" CSS tokens referenced in code that no longer exist.

**What looks great:** Dashboard (both modes), Golf Hub, The Lab, Tournaments page, Navbar/MobileNav responsive behavior, Profile page, league cards, course image backgrounds on schedule cards.

---

## Issue Severity Scale

| Tier | Label | Definition |
|------|-------|------------|
| P0 | **Critical** | Broken functionality, unreadable content, or brand violations visible to all users |
| P1 | **High** | Significant visual bugs affecting entire pages or features |
| P2 | **Medium** | Noticeable polish issues, inconsistencies, or partial breakage |
| P3 | **Low** | Minor refinements, maintainability concerns |

---

## P0 — CRITICAL ISSUES

### 1. Gambling Language on Landing Page
**Location:** Landing page hero (`clutchfantasysports.com`)
**Issue:** The hero text reads "Lock in your predictions" — "Lock in" is prohibited gambling language per the Prediction System Design Rules. The Clutch Rating card also displays "PICKS" as a metric label — should be "CALLS".
**Rule violated:** CLAUDE.md Prediction System — Language table: "Lock it in" → use "Submit / Make your call"; "Picks" → use "Calls or Insights"
**Fix:** Change "Lock in your predictions" → "Track your predictions" or "Submit your predictions". Change "PICKS" → "CALLS".

### 2. Prove It Page — Entire Section Uses Gambling Language
**Location:** Prove It page (`/prove-it`) — visible on both desktop and mobile
**Issue:** The entire NFL predictions section uses prohibited gambling terminology:
- Tab label: **"NFL Props"** — "Props" is sportsbook language
- Section header: **"PLAYER PROPS"** — same violation
- Card labels: **"O/U"** (Over/Under) — explicitly banned, should be "Benchmark" or "Projection"
- Count text: **"114 props available"** — more prohibited language
- Card design looks like sportsbook prop cards with O/U numbers, violating the rule: "Prediction cards should look like community polls, not sportsbook props"
**Fix:** Rename "NFL Props" → "NFL Calls" or "NFL Predictions". Replace "O/U" → "Benchmark". Replace "PLAYER PROPS" → "PLAYER BENCHMARKS". Redesign cards to look like polls (e.g., "Will Joe Burrow throw more than 2 TDs? Yes/No" with a vote-style interface).

### 3. Gambling Language in Code — "Your Biggest Bets"
**Location:** `frontend/src/components/workspace/DivergenceSummary.jsx:23`
**Issue:** UI text reads "Your Biggest Bets" — uses "Bets" which is explicitly banned.
**Fix:** Change to "Your Biggest Calls" or "Your Boldest Divergences".

### 4. Landing Page — "EXPERT" Label Duplicated + "PICKS" Label
**Location:** Landing page hero, Clutch Rating card mockup
**Issue:** The tier label "EXPERT" appears twice (once below the 84 score and again below that). The metric card shows "PICKS" which is banned language — should be "CALLS".

### 5. Legacy CSS Tokens — Undefined Classes Causing Invisible Elements
**Location:** Multiple draft components
**Files affected:**
- `components/draft/DraftTimer.jsx` — uses `bg-dark-tertiary`, `bg-dark-primary`
- `components/draft/DraftHeader.jsx` — uses `bg-dark-secondary`, `bg-dark-tertiary`
- `components/dashboard/ActivityFeed.jsx` — uses `bg-dark-tertiary`

**Issue:** These classes (`dark-primary`, `dark-secondary`, `dark-tertiary`) do not exist in `index.css` or `tailwind.config.js`. They were legacy Aurora Ember tokens that were removed but never replaced in these components. Affected elements render with **no background color**, making them invisible or broken depending on the page context.
**Fix:** Replace all `dark-*` legacy tokens with proper CSS variable equivalents (e.g., `bg-[var(--surface)]`, `bg-[var(--card-bg)]`).

### 6. Draft Room Not Mobile-Friendly
**Location:** `components/draft/PlayerPool.jsx`, `components/draft/DraftBoard.jsx`
**Issue:** PlayerPool uses a hardcoded 10-11 column CSS Grid with pixel widths (`grid-cols-[26px_26px_1fr_36px_40px_30px_30px_30px_46px_38px_44px]`). DraftBoard has `min-w-[500px]`. These force horizontal scroll on any screen under ~800px. The CLAUDE.md states: "The draft room must be touch-friendly." It currently is not.
**Fix:** Implement column hiding on mobile (show only essential: player name, position, key stat), or add a responsive card-based layout at `md:hidden`.

---

### 7. "DRAFT_PENDING" Raw Enum Displayed on League Home
**Location:** League Home page header (e.g., `/leagues/:id`)
**Issue:** The league status badge shows the raw database enum value `DRAFT_PENDING` instead of a user-friendly label. This is visible on both desktop and mobile, in both light and dark mode.
**Fix:** Map enum values to display labels: `DRAFT_PENDING` → "Pre-Draft", `ACTIVE` → "Active", `COMPLETED` → "Complete", etc.

---

## P1 — HIGH ISSUES

### 8. 520+ Non-Brand Color Instances
**Issue:** Massive use of raw Tailwind colors (`emerald-400`, `green-400`, `red-400/500`, `yellow-400`, `blue-400`, `purple-400`) instead of brand tokens.
**Breakdown:**
- `emerald-400` used ~462 times where brand `field` color should be used
- `red-400/500` used ~80+ times where brand `live-red` should be used
- `green-400` used in tier colors, sport context, CPI indicators
- `orange-400` used for NFL sport color instead of `blaze`
- `yellow-400` used for gold/premium instead of `crown`

**Impact:** Inconsistent brand identity across the platform. Colors don't match the brand spec.
**Fix:** Systematic find-and-replace: `emerald-400` → `field` / `field-bright`; `red-500` → `live-red`; `yellow-400` → `crown`; `orange-400` → `blaze`.

### 6. Dark Mode Broken on Multiple Components
**Issue:** Many components use Tailwind color classes without `dark:` variants:
- `text-amber-600` (medal colors in LeagueCard, LiveScoringWidget) — nearly invisible on dark backgrounds
- `text-gray-300` (silver medal) — works by accident in dark but wrong in light
- `bg-yellow-500/20`, `bg-red-500/20`, `bg-blue-500/20` without dark alternatives
- Position badge colors in `NflWeeklyScoring.jsx` (QB red, RB blue, WR emerald, etc.) — all hardcoded without `dark:` variants
- Tier colors in `TierDisplay.jsx` — `ring-white` is invisible on light backgrounds

**Files affected:** LeagueCard.jsx, LiveScoringWidget.jsx, NflWeeklyScoring.jsx, TierDisplay.jsx, DraftBoard.jsx, PlayerPool.jsx, FeedCard.jsx
**Fix:** Add `dark:` variant for every hardcoded Tailwind color class, or migrate to CSS variables.

### 10. Players Table Broken on Mobile — Missing Player Data in Rows
**Location:** `/players` on 375px mobile
**Issue:** When scrolling the players table on mobile: (a) the table is cut off on the right with no visible scroll indicator — only Rank, Player, SG Total, and partial SG OTT columns are visible; (b) rows 9+ render as blank rows with only the PGA badge and stats visible — player names and headshots are missing. This appears to be a lazy-loading or virtualization bug where player data fails to render for off-screen rows.
**Fix:** Investigate the lazy-load/render logic in PlayerTable. Add horizontal scroll indicator. Consider a mobile card layout.

### 11. Chat FAB Overlaps Content on Mobile
**Location:** League Home page on 375px mobile
**Issue:** The purple chat floating action button (bottom-left) overlaps the "Draft Scheduled" card content, making it partially unreadable.
**Fix:** Adjust FAB position on mobile to avoid overlapping page content, or make it collapsible.

### 12. Tables Break on Mobile (min-w-[800px])
**Location:** Multiple table components
**Files:**
- `components/players/PlayerTable.jsx:76` — `min-w-[800px]`
- `components/roto/CategoryTable.jsx:37` — `min-w-[800px]`
- `pages/SeasonRace.jsx` — `min-w-[800px]`
- `components/tournament/TournamentLeaderboard.jsx` — 18 hole columns with fixed widths

**Issue:** Forces horizontal scroll at 800px minimum. On a 375px phone, users see less than half the table. No mobile card layout fallback exists (only H2HStandings has one).
**Fix:** Add `overflow-x-auto` wrapper (already present on PlayerTable but not others) and implement `md:hidden` card layouts for mobile.

### 8. SVG/Inline Style Colors Bypass Theme System
**Location:**
- `components/layout/AuroraBackground.jsx` — hardcoded hex gradients (`#E8B84D`, `#E07838`, `#D4607A`)
- `components/common/ClutchRatingGauge.jsx` — SVG fill colors hardcoded (`#D4930D`, `#6B7280`, `#6ABF8A`, `#EF4444`)
- `components/common/Button.jsx` — inline gradient style (`linear-gradient(135deg, #F06820, #FF8828)`)

**Issue:** Inline styles and SVG fills never respond to CSS variable changes. They're frozen regardless of theme.
**Fix:** Pass colors as props derived from CSS variables, or use `currentColor` with `style` attributes.

---

## P2 — MEDIUM ISSUES

### 9. Loading States — Plain Text Without Spinners (7 instances)
**Files:**
- `components/layout/Navbar.jsx:207` — `Loading...` text only
- `components/players/PlayerDrawer.jsx:391` — fallback text `Loading...`
- `pages/NflPlayerDetail.jsx:763` — text at 20% opacity
- `pages/PlayerProfile.jsx:339` — text at 20% opacity
- `pages/NflTeamDetail.jsx:56` — text at 30% opacity
- `pages/NflCompare.jsx:240, 359` — text only

**Issue:** These show bare "Loading..." text without any spinner, skeleton loader, or animation. Looks unpolished.
**Fix:** Use existing animated spinner pattern from `ProtectedRoute.jsx` or add skeleton loaders.

### 10. Empty States — Generic or Missing
**Files:**
- `components/draft/PickHistory.jsx` — "No picks yet" (no context or CTA)
- `components/search/SearchModal.jsx:152` — minimal "No results found"
- `pages/NflPlayers.jsx:282` — "No players found" (no suggestions)
- `pages/NflLeaderboards.jsx:246` — "No data for these filters" (dismissive tone)
- `components/one-and-done/PlayerPicker.jsx:100` — "No players found matching your criteria"
- `components/one-and-done/PickHistory.jsx:11` — "No picks made yet"
- `components/players/SgRadarChart.jsx:29` — returns `null` silently

**Fix:** Create a reusable `EmptyState` component with icon, message, and CTA button. Replace all bare text fallbacks.

### 11. Grid Layouts Without Responsive Column Counts
**Files:**
- `components/one-and-done/PickHistory.jsx` — `grid-cols-3` (no mobile fallback)
- `components/roster/TradeProposal.jsx` — `grid-cols-2` (cramped on phone)
- `components/players/PlayerDetailModal.jsx` — `grid-cols-3` for stats
- `components/players/PlayerDrawer.jsx` — `grid-cols-4` and `grid-cols-5` for SG stats
- `components/roster/LineupOptimizer.jsx` — fixed pixel column grid

**Fix:** Add responsive breakpoints: `grid-cols-1 sm:grid-cols-2 md:grid-cols-4`.

### 12. Typography — Missing font-display on Headlines
**Files:**
- `components/roster/LineupOptimizer.jsx` — `<h3>` without `font-display`
- `components/draft/PlayerPool.jsx` — `<h3>` without `font-display`
- `components/tournament/TournamentPreview.jsx` — multiple `<h3>` without `font-display`
- Inconsistent heading sizes: some `<h3>` use `text-sm`, others use `text-lg`

**Fix:** Add `font-display` to all `<h1>`, `<h2>`, `<h3>` elements. Standardize heading size hierarchy.

### 13. Typography — Missing font-mono on Stats/Numbers
**Files:**
- `components/survivors/SurvivorBoard.jsx:130` — points displayed without `font-mono`
- `components/one-and-done/UsedPlayersGrid.jsx:64` — rank number without `font-mono`
- `components/players/PlayerDetailModal.jsx:271` — stat values without font spec

**Fix:** Add `font-mono` to all numerical displays (scores, rankings, stats, percentages).

### 14. FeedCard Category Colors — Not Theme-Aware
**File:** `components/feed/FeedCard.jsx:3-15`
**Issue:** `CATEGORY_COLORS` dictionary maps categories to hardcoded hex values (`#F59E0B`, `#EF4444`, `#3B82F6`, etc.) applied via inline `style={{}}`. These bypass the entire theme system.
**Fix:** Convert to CSS variable-based or Tailwind class-based color system.

---

## P3 — LOW ISSUES

### 15. Landing Page — "EXPERT" Label Duplicated
**Location:** Landing page hero, Clutch Rating card
**Issue:** The tier label "EXPERT" appears twice — once below the 84 score and again below it. Likely a rendering bug.
**Note:** This is also documented as P0 item #4 for the "PICKS" label — but the duplication itself is P3.

### 16. Login Page — Google/GitHub "Soon" Buttons
**Location:** `/login`
**Issue:** Google and GitHub OAuth buttons show "(soon)" in a grayed-out state. These placeholder buttons look unfinished. Consider hiding them entirely until ready, or adding a cleaner "coming soon" badge.

### 17. Button.jsx — References Undefined `dark-primary` Token
**File:** `components/common/Button.jsx:16`
**Issue:** Focus ring references `focus:ring-offset-dark-primary` which doesn't exist.
**Fix:** Replace with `focus:ring-offset-[var(--bg)]`.

### 18. Sport Context Colors Don't Use Brand Tokens
**File:** `context/SportContext.jsx`
**Issue:** Golf uses `text-green-400` (should use `field`), NFL uses `text-orange-400` (should use `blaze`).
**Fix:** Update to brand tokens.

### 19. Navbar Logo — Hardcoded Color
**File:** `components/layout/Navbar.jsx:351`
**Issue:** `text-[#F06820]` hardcoded. Minor since blaze is the same across themes, but should use `text-blaze` for maintainability.

### 20. Medal Colors Inconsistent Across Components
**Files:** LeagueCard.jsx, LiveScoringWidget.jsx
**Issue:** Gold/silver/bronze medal colors are defined separately in each component with slightly different values (e.g., `text-amber-500` vs `text-amber-600`).
**Fix:** Create shared `medalColors` utility.

---

## Live Screenshot Observations

### Pages That Look Great
| Page | Mode | Notes |
|------|------|-------|
| Dashboard | Light + Dark | Clean league cards, 2-col grid, coach briefing, quick actions. Dark mode theme switches cleanly. |
| Golf Hub | Light + Dark + Mobile | Quick-nav 3x2 grid adapts well. Live tournament card with weather strip. Course images on schedule. |
| NFL Hub | Light + Mobile | Clean 2-col nav grid, proper spacing, good empty state. |
| The Lab | Dark | Hero banner, boards/notes split layout, league links section all polished. |
| Tournaments | Light | Live Now card, upcoming schedule with course photos, clean badges. |
| Profile | Light | Stats cards with dashes for empty data, clean edit flow, "Set a username" CTA. |
| Standings | Light | Stats summary cards, clean table, "No tournament results yet" decent empty state. |
| Navbar/MobileNav | Both | Desktop nav properly hides on mobile, bottom nav shows correctly, hamburger menu works. |

### Pages With Issues
| Page | Mode | Issues Found |
|------|------|-------------|
| Landing page | Light | "Lock in your predictions" (gambling language), "PICKS" label, "EXPERT" duplicated |
| Prove It | Light + Mobile | Pervasive gambling language: "NFL Props", "O/U", "PLAYER PROPS", sportsbook card design |
| League Home | Light mobile | "DRAFT_PENDING" raw enum, chat FAB overlaps content |
| Players | Dark mobile | Table cut off on right, rows 9+ missing player names/headshots |
| Login | Light | "(soon)" OAuth buttons look placeholder |

### Landing Page Detail
| Item | Status | Notes |
|------|--------|-------|
| Logo + nav | Good | Clean, well-spaced, dark slate nav bar |
| Hero typography | Good | Bricolage Grotesque display font looks sharp |
| "Sports" italic accent | Good | Instrument Serif editorial font applied correctly |
| Blaze orange CTAs | Good | Both buttons use correct brand orange |
| Dark mode toggle | Present | Moon icon in nav, functional |
| Rating card mockup | Broken | "EXPERT" duplicated, "PICKS" should be "CALLS" |
| Login page layout | Good | Clean two-column, form left, illustration right |
| Login page OAuth | Needs work | "(soon)" badges look placeholder |

---

## Recommended Fix Priority

### Sprint 1 (This Week) — P0 Fixes
1. Fix Prove It page: rename "NFL Props" → "NFL Calls", "PLAYER PROPS" → "PLAYER BENCHMARKS", "O/U" → "Benchmark", redesign cards to poll style
2. Fix landing page: "Lock in" → "Track", "PICKS" → "CALLS", fix "EXPERT" duplication
3. Fix "Your Biggest Bets" → "Your Biggest Calls" in DivergenceSummary
4. Replace all legacy `dark-*` token references (DraftTimer, DraftHeader, ActivityFeed)
5. Fix "DRAFT_PENDING" raw enum display on League Home
6. Fix mobile player table — blank rows for players 9+ and missing scroll indicator

### Sprint 2 (Next Week) — P1 Fixes
7. Brand color migration: `emerald-400` → `field`, `red-500` → `live-red`, etc.
8. Add `dark:` variants to all hardcoded Tailwind color classes
9. Add mobile card layouts for data tables (PlayerTable, CategoryTable, SeasonRace)
10. Make draft room mobile-responsive
11. Fix chat FAB overlapping content on mobile

### Sprint 3 — P2 Polish
12. Replace all "Loading..." text with spinner components
13. Build reusable `EmptyState` component, deploy across all pages
14. Add responsive grid breakpoints to all fixed-column grids
15. Standardize typography (font-display on headers, font-mono on stats)

### Sprint 4 — P3 Cleanup
16. Fix landing page "EXPERT" duplication rendering bug
17. Hide or improve OAuth "(soon)" buttons
18. Create shared color utilities (medal colors, tier colors, category colors)
19. Migrate inline SVG colors to CSS variables

---

## Appendix: Files Most Needing Attention

| File | Issues Count | Types |
|------|-------------|-------|
| `draft/PlayerPool.jsx` | 4 | Mobile, colors, typography, grid |
| `draft/DraftTimer.jsx` | 3 | Legacy tokens, colors, dark mode |
| `draft/DraftHeader.jsx` | 3 | Legacy tokens, colors, dark mode |
| `dashboard/LeagueCard.jsx` | 2 | Medal colors, dark mode |
| `dashboard/ActivityFeed.jsx` | 2 | Legacy tokens, dark mode |
| `nfl/NflWeeklyScoring.jsx` | 2 | Position colors, dark mode |
| `players/PlayerTable.jsx` | 2 | Mobile, fixed width |
| `one-and-done/TierDisplay.jsx` | 2 | Tier colors, dark mode |
| `feed/FeedCard.jsx` | 2 | Category colors, dark mode |
| `common/ClutchRatingGauge.jsx` | 2 | SVG colors, dark mode |
| `workspace/DivergenceSummary.jsx` | 1 | Gambling language |
| Landing page (public) | 3 | Gambling language, duplication |

---

*This audit was performed via source code analysis of 50+ component files AND authenticated production site screenshots across Dashboard, League Home, Players, Golf Hub, NFL Hub, The Lab, Prove It, Tournaments, Standings, and Profile — in both light/dark mode at desktop (1280px) and mobile (375px). All P0 issues are confirmed visually. Pages not yet fully screenshotted: Draft Room (requires active draft), Matchups, Scoring, Vault, Settings detail pages. The mobile player table rendering bug (blank rows 9+) needs investigation with dev tools.*
