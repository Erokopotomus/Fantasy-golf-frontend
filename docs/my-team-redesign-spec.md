# My Team Page Redesign — Competitive Research & Design Spec

> **Date:** March 6, 2026
> **Author:** Cowork (competitive audit)
> **Status:** Design spec for review
> **Current page:** `frontend/src/pages/TeamRoster.jsx` (~1,180 lines)

---

## Executive Summary

The current My Team page is **functional but visually underwhelming**. It looks like a developer prototype — wide layout, small text, dense stats that don't mean anything at a glance, and zero visual hierarchy. Every competitor we studied has moved toward **card-based player rows with prominent headshots, clear status indicators, and fantasy points as the primary number**.

This spec defines a complete visual redesign of the My Team page based on competitive research across Sleeper, ESPN, Yahoo, PGA Tour Fantasy, and modern Dribbble/Behance fantasy UI concepts.

---

## Current Problems (Eric's Feedback)

1. **"Wide stretched out"** — `max-w-4xl` container leaves player rows spanning too wide on desktop
2. **"Dumb scores that mean nothing"** — OWGR rank, SG Total, and wins/T5s/T10s are advanced stats that don't tell a casual user anything useful at a glance
3. **"Weird small font stuff"** — 10px/11px badges, `text-xs` everything, three lines of tiny stats crammed under each player name
4. **No visual punch** — Headshots are 40px circles (tiny), no color, no personality
5. **No fantasy context** — Static roster view doesn't show "how am I doing" or "what's happening now"

---

## Competitive Research Findings

### Sleeper (2025 Redesign) — BEST IN CLASS

**What they do right:**
- **Dark theme, high contrast** — Player names pop against dark background
- **Position badges** — Color-coded (QB blue, RB green, WR purple, TE orange) to the LEFT of the player row
- **Headshot prominence** — Circular ~48px headshots, clean cropping
- **Two key numbers on the right** — Projected points + actual points (or Rost% / Start%)
- **Game context inline** — "Sun 1:00PM v LA" right below player name
- **Tab navigation** — TEAM | MATCHUP | PLAYERS | LEAGUE across top
- **Team score prominently displayed** — Score shown large at the very top
- **Action buttons as icon row** — +Players, Trade, Trans, News as compact icon buttons
- **Compact rows** — Each player row is exactly the right density: name, team/pos, game info, and the ONE number you care about

**Key design pattern:** Every pixel of the player row answers ONE question: *"How is this player doing for me?"*

### ESPN (2025 Redesign)

**What they do right:**
- **Three states** — PRE-GAME, IN-GAME, POST-GAME — the page visually transforms based on game state
- **Slot labels** — "QB", "RB", "WR1", "FLEX" shown as left-aligned position slot labels
- **Player cards** — Headshot + Name + Team Pos | Opp + Game Time | Projected/Actual points
- **Quick Lineup and Matchup Stats** — Pill buttons at top for fast mode switching
- **Matchup context** — Shows opponent team score next to your score
- **Roster % / Start %** — Shown as subtle secondary info
- **Bench clearly separated** — Visual break between starters and bench
- **Drop shadows on active state** — Selected players have elevated card treatment

**Key design pattern:** The page is a **scoreboard first, roster manager second**. Your score and matchup are the hero.

### Yahoo (2024 Redesign)

**What they do right:**
- **Team name + record prominent** — "THE LEGIT TEAM" with record "0-0-0" and projected score
- **Week navigation** — `< Week 1 >` with Stats dropdown
- **"Start Optimal Players" CTA** — Smart action button with player update alerts
- **Season countdown widget** — When pre-season, shows countdown timer to first game
- **Compact player rows** — Headshot, player name, position/team, game time, projected score aligned right
- **Tab structure** — TEAM | MATCHUP | PLAYERS | LEAGUE

**Key design pattern:** **Smart suggestions front and center** — Yahoo surfaces "you should start this player" and "player updates" as primary CTAs, not hidden behind menus.

### PGA Tour Fantasy (2026)

**What they do right:**
- **Roster card layout** — Team name as hero header, then a horizontal row of player headshots (circular, ~80px) with names below
- **Captain designation** — "C" badge on captain, numbered badges (1, 2) on bench
- **Starters vs Bench visual split** — Starters shown prominently, bench players smaller/grayed
- **Salary cap display** — Dollar values next to each player for salary cap leagues
- **Stats per player** — T10s, Cuts, FPPG, AVG — shown in a compact line
- **"Build Your Dream Roster Today"** — CTA when roster isn't complete
- **Shareable roster card** — "Check out my PGA TOUR Fantasy Roster" — designed for social sharing

**Key design pattern:** **Hero headshots as visual identity** — Your team IS the faces of your players.

### Modern Fantasy UI (Dribbble/Behance)

**Common patterns across top designs:**
- **Large player headshots** — 64-80px, often with team color gradient backgrounds
- **Card-based layouts** — Each player is a self-contained card, not just a list row
- **Fantasy points as the HERO number** — Biggest font on the row, right-aligned
- **Color-coded performance** — Green for good, red for bad, gold for exceptional
- **Gradient backgrounds** — Subtle sport/team gradients behind player cards
- **Minimal text, maximum meaning** — 2 pieces of info max per player, not 6

---

## Design Recommendations

### 1. Container & Layout

**Problem:** `max-w-4xl` (896px) is too wide — player rows stretch out with empty space.

**Fix:**
- Change to `max-w-2xl` (672px) for the main roster column
- On desktop (lg+), add a sidebar (right column) for context: this week's tournament info, team standings snapshot, quick actions
- Mobile: single column, full width

```
Desktop (lg+):
┌────────────────────────────────┬──────────────────┐
│  ROSTER (max-w-2xl)            │  SIDEBAR (280px)  │
│  Team header + score           │  Tournament card   │
│  Starters                      │  League standing   │
│  Bench                         │  Quick actions     │
│  IR                            │  Coach insight     │
└────────────────────────────────┴──────────────────┘

Mobile:
┌──────────────────────────────────────────────────────┐
│  Team header + score (compact)                        │
│  Tournament context bar                               │
│  Starters                                             │
│  Bench                                                │
│  IR                                                   │
└──────────────────────────────────────────────────────┘
```

### 2. Team Header — Make It a Scoreboard

**Current:** Plain text "My Team" + "X/Y players" + buttons

**Redesign:** Premium header card that answers "How am I doing?"

```
┌──────────────────────────────────────────────────────┐
│  [Avatar]  TESTICLES            4th of 5   [Edit ⚙]  │
│            W1 - L0 - T0                               │
│                                                       │
│     🔴 LIVE — Arnold Palmer Invitational R1           │
│                                                       │
│       88.0 pts          Bench: 22.5                   │
│       ████████████░░░   Optimal: 95.2                 │
│       ↑ 2nd place                                     │
└──────────────────────────────────────────────────────┘
```

Key elements:
- **Team name large** (font-display, text-xl)
- **Live tournament context** — name, round, live pulse
- **Fantasy points as HERO number** — text-3xl font-mono font-bold
- **Rank indicator** — "4th of 5" or "2nd place" with trend arrow
- **Progress bar** — visual representation of points vs league leader
- **Bench / Optimal** — secondary info showing unrealized potential

When NOT live, show:
- Record (W-L-T)
- Next tournament name + date
- Players confirmed in field (e.g., "7/9 in field for Arnold Palmer")

### 3. Player Rows — Card-Based, Data-Dense but Clean

**Current:** 40px headshot, tiny name, three lines of 10-11px stats

**Redesign:** Each player row is a mini-card with clear visual hierarchy

```
WHEN LIVE:
┌────────────────────────────────────────────────────┐
│  [Headshot]  Scottie Scheffler           14.5 pts  │
│   56px       T3 • -4 • thru 12       ──────────── │
│              today: -2                  ▲ +3.5     │
└────────────────────────────────────────────────────┘

WHEN NOT LIVE:
┌────────────────────────────────────────────────────┐
│  [Headshot]  Scottie Scheffler           #1 OWGR   │
│   56px       🟢 In field — Arnold Palmer            │
│              SG Total: +2.1                         │
└────────────────────────────────────────────────────┘

BENCH PLAYER (NOT IN FIELD):
┌────────────────────────────────────────────────────┐
│  [Headshot]  Tom Kim                  NOT IN FIELD  │
│   56px       Next: Valspar Championship (Mar 13)    │
│              SG Total: +0.8            [opacity-60] │
└────────────────────────────────────────────────────┘
```

Key changes:
- **Headshots bumped to 56px** (from 40px) — makes the roster feel like real people, not a spreadsheet
- **Fantasy points on the RIGHT, large** — text-lg font-mono font-bold, the number users care about
- **Position + score + thru on ONE line** — clean, scannable
- **"In field" / "Not in field" as contextual info** — replaces meaningless OWGR/SG when there's no tournament context
- **Color coding:** Green for under par / top 10, red for over par / cut, gold for leader
- **Points delta** — Show "+3.5" or "-1.2" vs previous refresh (trending indicator)

### 4. Stats That Matter (Kill the Noise)

**Current stats shown (non-live):** OWGR rank, primary tour, SG Total, wins, T5s, T10s — SIX pieces of information, all in tiny font, none of which answer "should I start this guy?"

**Redesign — show contextual stats:**

**During tournament week (pre-round):**
- Field status: "In field" or "Not in field"
- Course history: "Avg finish: T15 (3 starts)" or "First time at Bay Hill"
- Form: "Last 5: T3, T12, MC, T8, T22" — one compact line

**During live tournament:**
- Position + Score + Thru (the ONLY three things that matter)
- Fantasy points (the ONLY number that matters for the game)
- Today's score (secondary)

**Off-week / no tournament:**
- OWGR rank
- SG Total (or CPI/Form Score — our proprietary metrics)
- Recent results: "Last: T8 at Genesis"

**The principle:** Never show all stats at once. Show THE stats that matter RIGHT NOW based on game state.

### 5. Section Headers — Bolder, Clearer

**Current:** `text-sm font-bold text-field uppercase tracking-wider` — tiny, easy to miss

**Redesign:**
```
┌──────────────────────────────────────────┐
│  ACTIVE LINEUP                    4 / 5  │
│  ═══════════════════════════════════════  │
│  [Player rows...]                        │
│                                          │
│  BENCH                            4 / 4  │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  [Player rows, slightly muted...]        │
└──────────────────────────────────────────┘
```

- Active lineup header: `text-base font-bold text-field` with a solid line below
- Bench header: `text-base font-bold text-text-muted` with a dashed line
- Count badge: `text-sm font-mono` right-aligned
- Bench players rendered at `opacity-80` to visually distinguish from starters

### 6. Quick Actions Bar

**Inspired by Sleeper's icon row and Yahoo's smart suggestions:**

```
┌────────────────────────────────────────────────────────┐
│  [📋 Edit Lineup]  [🔄 Free Agents]  [⚡ Optimize]    │
│  [📊 Full Scoring]  [💬 Trade Block]                   │
└────────────────────────────────────────────────────────┘
```

- Compact pill buttons below the team header
- Context-aware: "Edit Lineup" disabled when locked, "Full Scoring" only shown when live
- Mobile: horizontal scroll row

### 7. Scorecard Expansion (Live)

**Current:** Click player → fetch scorecard → show inline below row. Only shows 5-6 holes.

**Redesign:** Keep the inline expansion but improve it:
- Show ALL holes (1-18) in a compact grid, group by front 9 / back 9
- Color-code: Eagle (gold), Birdie (green), Par (neutral), Bogey (red), Double+ (dark red)
- Show round selector tabs if multiple rounds played
- If hole data isn't available, show "Hole-by-hole data updates during play"

```
┌─────────────────────────────────────────────────────────┐
│  R1: 1  2  3  4  5  6  7  8  9  │ 10 11 12 13 14 ...  │
│      4  3  🟢 4  5  4  🟢 3  4  │  4  3  4  ...       │
│     par birdie        birdie     │                      │
│                                  │  Front: -2  Back: —  │
└─────────────────────────────────────────────────────────┘
```

### 8. Desktop Sidebar Content

When screen is wide enough (lg+), show a right sidebar:

**When live:**
- Mini leaderboard (your league teams ranked by live points)
- Tournament round + cut line info
- Link to full scoring page

**When not live:**
- This week's tournament + field status count
- Next lineup deadline
- AI Coach insight (one-liner from coach briefing)
- Recent transactions in the league

### 9. Mobile Optimizations

- Player rows: Stack live stats below name (not inline) on screens < 400px
- Fantasy points: Always visible, right-aligned, never truncated
- Touch targets: 48px minimum for all interactive elements
- Swipe gestures: Consider swipe-to-bench / swipe-to-activate in edit mode

### 10. Empty/Skeleton States

**Pre-draft skeleton** is already decent but could be more engaging:
- Show slot labels with position context (G1, G2, G3, G4, G5 for golf; QB, RB1, RB2 for NFL)
- Show "Draft is in X days" countdown
- Show "Browse prospects" CTA

---

## Implementation Priority

### Phase 1: Quick Wins (can do now)
1. Bump headshots from 40px to 56px
2. Change container from `max-w-4xl` to `max-w-2xl`
3. Make fantasy points the prominent right-aligned number (text-lg font-bold)
4. Remove third line of stats (wins/T5/T10) — move to player drawer
5. Bump all font sizes: names to `text-base`, stats to `text-sm`
6. Add color-coding to live scores (green under par, red over par) — already partially done
7. Make bench players slightly muted (opacity-80)

### Phase 2: Structural (medium effort)
1. Redesign team header as scoreboard card
2. Add quick actions pill bar
3. Context-aware stat display (live vs pre-tournament vs off-week)
4. Improve section headers with line separators
5. Fix scorecard expansion (full 18 holes, color-coded)

### Phase 3: Layout (larger effort)
1. Add desktop sidebar (lg+ breakpoint)
2. Mini league leaderboard in sidebar
3. Tournament context in sidebar
4. AI Coach insight in sidebar

---

## File Impact

- **Primary:** `frontend/src/pages/TeamRoster.jsx` — full visual overhaul of PlayerRow, header, and layout
- **No backend changes needed** — all data already available via existing hooks
- **No new components needed for Phase 1** — just CSS/layout changes to existing code
- **Phase 2-3 may add:** `TeamHeader.jsx`, `RosterSidebar.jsx`, `ScorecardGrid.jsx` as extracted components

---

## Design Principles (from competitors)

1. **Fantasy points are the hero number** — Every competitor puts the one number that matters biggest and on the right
2. **Headshots make it personal** — Sleeper, ESPN, PGA Tour all use 48-80px headshots prominently
3. **Context over raw data** — Show "In field for Arnold Palmer" not "OWGR #3, SG: +2.1, PGA Tour"
4. **The page should tell a story** — "You're in 2nd place with 88 pts, Scheffler is carrying you at T3" not just a list of names
5. **Less is more** — Two pieces of info per player row, not six
6. **State-aware display** — The page should look different when a tournament is live vs when nothing is happening
