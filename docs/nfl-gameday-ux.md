# CLUTCH — Platform UX Spec: Weekly Experience, Gameday Portal & Prediction Ecosystem
## The Manager's Week, Mapped to Every Screen — NFL + Golf

---

## DESIGN PHILOSOPHY

### The Two-Layer Platform

Clutch serves two types of users simultaneously, and neither should feel friction from the other's features:

**Layer 1: Fantasy Manager** — They're here to run their league. Set lineups, make trades, check scores, talk trash. This is the core product and it must be flawless, fast, and familiar. If someone comes from Yahoo or Sleeper, they should feel at home within 30 seconds.

**Layer 2: Clutch Competitor** — They want to prove they know football. They make picks, track their accuracy, build a Clutch Rating, and compete on leaderboards. This is the differentiated product — the thing nobody else does.

### The Cardinal Rule: Layer 2 Never Degrades Layer 1

The prediction ecosystem (picks, decision journal, AI insights, Clutch Rating) must be:
- **Discoverable but never intrusive** — a user who ignores it entirely should never feel nagged, blocked, or annoyed
- **Additive, not interruptive** — insights appear in context where they add value, never as popups, modals, or gates
- **Earned through use, not pushed through prompts** — the more you engage, the more surfaces light up. Zero engagement = zero noise.

This is the opposite of betting creep. ESPN shoves DraftKings odds into every box score. Yahoo puts betting CTAs above your lineup. Users hate it because it's irrelevant to what they're trying to do. Clutch's prediction layer is relevant — it's about YOUR decisions, YOUR accuracy, YOUR improvement — but it still must respect the user's attention. The moment it feels like an ad for a feature they don't use, we've failed.

### The Subtle Integration Pattern

Every Clutch-specific feature follows this pattern:

```
INVISIBLE     → User has never engaged with the feature
               No UI elements shown. Zero footprint.

HINT          → User has been on platform 2+ weeks
               A single small element appears in a natural location.
               Example: "You started Barkley over Henry — nice call (+12.4 pts)"
               shown as a quiet line in the post-game matchup result.
               No CTA. No button. Just a fact.

AVAILABLE     → User taps/clicks a hint or visits the feature
               The full feature surfaces. Picks interface, decision log, etc.
               From this point on, relevant data appears contextually.

ACTIVE        → User regularly engages
               Full integration: predictions in lineup view, weekly picks
               reminder (opt-in notification), AI coaching in week review.
```

Users self-select their depth. The platform watches behavior and adapts, never assumes.

---

## THE WEEKLY CYCLE

### Overview

An NFL week has a rhythm. Every fantasy manager lives it, whether they're casual or obsessed. Clutch should feel like it knows what day it is — surfacing the right tools and information at the right time without the user having to navigate.

```
TUESDAY        Waivers process → Results → Roster adjustments
WEDNESDAY      Lineup tinkering → Injury news → Pick window opens
THURSDAY       TNF kickoff → First scores of the week
FRI-SATURDAY   Final lineup decisions → Last-minute research
SUNDAY         Main slate → Gameday mode → Live scoring
MONDAY         MNF → Week finalizes → Results & review
```

---

## PAGE-BY-PAGE SPEC

### 1. LEAGUE HOME (The Hub)

**Purpose:** At-a-glance state of your league. What's happening right now, what do I need to do.

**Layout — Time-Aware Cards:**

The League Home should feel different depending on when you open it. Not through dramatic redesigns, but through which cards are emphasized and what data they surface.

**Tuesday-Wednesday (Post-Waiver / Pre-Games):**
```
┌─────────────────────────────────────────────────────┐
│  YOUR MATCHUP THIS WEEK                             │
│  Eric's Eagles vs Brooks Brigade                    │
│  [Set Lineup →]                                     │
│                                                     │
│  Projected: 142.3 — 128.7 (You're favored)         │
│  ── or if no projections built yet ──               │
│  Last week: W 205.5 — 40.8                          │
├─────────────────────────────────────────────────────┤
│  WAIVER RESULTS               LEAGUE ACTIVITY       │
│  ✓ Added: D. Henry            Trade proposed:        │
│  ✗ Missed: J. Addison         Tyler → Diego          │
│    (outbid by Tyler)          Voting ends Thu        │
├─────────────────────────────────────────────────────┤
│  STANDINGS          │  QUICK LINKS                   │
│  1. Eric    (4-1)   │  [Roster]  [Waivers]           │
│  2. Tyler   (3-2)   │  [Matchups] [Standings]        │
│  3. Brooks  (3-2)   │  [Scoring]                     │
│  ...                │                                │
└─────────────────────────────────────────────────────┘
```

**Sunday During Games (Gameday):**
```
┌─────────────────────────────────────────────────────┐
│  ● LIVE — YOUR MATCHUP                              │
│  Eric's Eagles  87.4  ━━━━━━━━━━░░░  Brooks Brigade │
│                       vs            52.1             │
│  [Open Gameday Portal →]                            │
├─────────────────────────────────────────────────────┤
│  LEAGUE SCOREBOARD (LIVE)                           │
│  Eric 87.4 vs Brooks 52.1     ● 3 players active    │
│  Tyler 65.2 vs Diego 71.8     ● 4 players active    │
│  Olivia 43.1 vs James 38.9   ● 2 players active    │
│  ...                                                │
└─────────────────────────────────────────────────────┘
```

**Monday Night / Post-Week:**
```
┌─────────────────────────────────────────────────────┐
│  WEEK 5 RESULT                                      │
│  ✓ WIN — Eric's Eagles 205.5, Brooks Brigade 40.8   │
│  Record: 5-0 (1st place)                            │
│  [View Full Matchup Breakdown →]                    │
│                                                     │
│  (Layer 2 hint, only if user has engaged before:)   │
│  Your start/sit decisions were 4/5 optimal this wk  │
├─────────────────────────────────────────────────────┤
│  THIS WEEK'S MATCHUP                                │
│  Eric's Eagles vs Tyler's Terrors                   │
│  [Preview →]                                        │
└─────────────────────────────────────────────────────┘
```

**Layer 2 elements on League Home** (only shown to engaged users):
- Small "Prove It" card at bottom: "Week 6 picks are open — 12 props available" (no badge count, no red dot, just informational)
- Clutch Rating shown next to user's name in standings (if they have one)
- Weekly recap line in matchup result card: "Your lineup decisions scored 4/5 this week" (appears as body text, not a banner)

---

### 2. TEAM ROSTER (The War Room Table)

**Purpose:** Manage your lineup. The most-visited page during the week.

**Core UX (Layer 1 — everyone sees this):**

```
┌─────────────────────────────────────────────────────┐
│  MY ROSTER — Week 6 vs Tyler's Terrors              │
│  Lineup locks: Thu 8:20 PM ET (in 2 days)           │
│                                                     │
│  STARTERS                                           │
│  QB   Josh Allen       BUF  vs MIA   32.4 proj      │
│  RB   Saquon Barkley   PHI  vs DAL   18.7 proj      │
│  RB   Derrick Henry    BAL  vs CIN   15.2 proj      │
│  WR   Ja'Marr Chase    CIN  @ BAL   21.1 proj      │
│  WR   CeeDee Lamb      DAL  @ PHI   17.8 proj      │
│  TE   Travis Kelce     KC   vs LV    12.4 proj      │
│  FLEX Jaylen Waddle    MIA  @ BUF   14.1 proj      │
│  K    Tyler Bass       BUF  vs MIA    8.2 proj      │
│  DEF  Philadelphia     PHI  vs DAL    7.5 proj      │
│                                                     │
│  BENCH                                              │
│  RB   Josh Jacobs      GB   BYE      —              │
│  WR   Terry McLaurin   WAS  vs NYG   15.9 proj      │
│  QB   Jalen Hurts      PHI  vs DAL   28.1 proj      │
│  ...                                                │
│                                                     │
│  [empty slot]  [+ Add Player]                       │
└─────────────────────────────────────────────────────┘
```

**Key roster page features:**
- Opponent matchup shown for each player (vs MIA, @ BAL)
- Bye weeks visually distinct (greyed out, "BYE" badge)
- Drag-to-reorder for start/sit (or tap-swap on mobile)
- Injury status badges: Q (questionable), D (doubtful), O (out), IR
- Lock indicator: which players have already kicked off (greyed, locked icon)
- Player card opens on name tap (slide-out drawer, not a new page)

**Layer 2 elements on Roster** (subtle, contextual):
- When a bench player is projected higher than a starter at the same position, a small dotted underline appears on the starter's name. No popup. No alert. Just a visual cue. Hovering/tapping shows: "McLaurin is projected 15.9 — Lamb is projected 17.8 — close matchup." This is insight, not a command.
- After the week completes: each player row can show actual points scored. A subtle color indicator (green/amber/red) next to the projection shows whether they hit their projection. This is post-hoc, not disruptive.
- The start/sit decision is silently logged. No UI for this — it's automatic. It feeds the decision journal and AI coaching.

**Player Card (Drawer):**
The player drawer is the deep-dive. Tap a player name from anywhere and it slides in.

```
┌─────────────────────────────────────────────┐
│  ← Back                                     │
│                                              │
│  [Headshot]  Saquon Barkley                 │
│              RB — Philadelphia Eagles        │
│              #26 | 6'0" | 233 lbs           │
│                                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│  │ 18.4 │ │  12  │ │ RB4  │ │ 92%  │       │
│  │Pts/G │ │Games │ │ Rank │ │Roster│       │
│  └──────┘ └──────┘ └──────┘ └──────┘       │
│                                              │
│  THIS WEEK: vs DAL                          │
│  Proj: 18.7 pts                             │
│  DAL allows 4th-most RB pts (22.1/game)     │
│                                              │
│  [Overview] [Game Log] [Splits]             │
│                                              │
│  SEASON STATS                               │
│  Rush: 198 att, 1,024 yds, 8 TD            │
│  Rec:  42 rec, 318 yds, 2 TD               │
│  Fantasy: 220.2 total (18.4/game)           │
│                                              │
│  GAME LOG                                   │
│  Wk  Opp    Pts    Result                   │
│  5   @NYG   24.3   W 31-17                  │
│  4   vs TB  12.1   L 20-24                  │
│  3   @NO    28.7   W 35-14                  │
│  ...                                        │
│                                              │
│  ACTIONS                                    │
│  [Drop] [Trade] [Move to Bench]             │
└─────────────────────────────────────────────┘
```

**Key player card design principles:**
- The top section (name, position, team, key stat boxes) should load instantly. This is what people glance at.
- "This Week" matchup context is the most time-sensitive info — show it prominently mid-week.
- Game log is the second-most-viewed tab — people want to see recent performance trends.
- Actions (drop, trade, bench) are at the bottom — they're intentional actions, not impulse taps.
- NO betting lines, NO DraftKings integration, NO "Bet on this player" CTAs. Ever.

---

### 3. WAIVERS / FREE AGENTS

**Purpose:** Find and acquire players not on any roster.

**Tuesday focus:** Waiver claims process. Show results prominently.
**Wednesday+ focus:** Free agent pickups (instant, no waiver priority needed).

**Core UX:**

```
┌─────────────────────────────────────────────────────┐
│  WAIVERS — [TEST] NFL Mock League                   │
│                                                     │
│  [All] [QB] [RB] [WR] [TE] [K] [DEF]              │
│  Search: [________________]                         │
│                                                     │
│  AVAILABLE PLAYERS                                  │
│  ┌─────────────────────────────────────────────┐    │
│  │ Player          Pos  Team  Pts/G  Action    │    │
│  │ Mike Evans      WR   TB    16.2   [+ Add]   │    │
│  │ Dalton Kincaid  TE   BUF   11.4   [+ Add]   │    │
│  │ Chase Brown     RB   CIN    9.8   [+ Add]   │    │
│  │ ...                                         │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  YOUR WAIVER CLAIMS (Tuesday only)                  │
│  Priority 1: Chase Brown (dropping: K. Herbert)     │
│  Priority 2: Dalton Kincaid (dropping: D. Goedert)  │
│  [Edit Priorities]                                  │
└─────────────────────────────────────────────────────┘
```

**Key waivers features:**
- Position filters are sport-aware (QB/RB/WR/TE/K/DEF for NFL)
- Points per game as the default sort (most useful signal)
- Bye week indicator for players on bye this week
- Roster % (what % of leagues roster this player) — social proof signal
- "This week" matchup shown in expanded row

**Layer 2 waivers integration (invisible unless engaged):**
- None. Waivers is a pure Layer 1 feature. No prediction elements, no picks integration, no AI hints. Keep it clean. The waiver decision itself is silently logged for the decision journal — that's all.

---

### 4. MATCHUPS

**Purpose:** See your H2H matchup, other league matchups, and results.

**Pre-Game (Wed-Sat):**

```
┌─────────────────────────────────────────────────────┐
│  YOUR MATCHUP — WEEK 6                              │
│                                                     │
│  Eric's Eagles          vs    Tyler's Terrors       │
│  Projected: 148.2             Projected: 131.7      │
│  Record: 5-0                  Record: 3-2           │
│                                                     │
│  YOUR STARTERS          │  THEIR STARTERS           │
│  QB Allen      32.4     │  QB Mahomes     31.2      │
│  RB Barkley    18.7     │  RB Gibbs       17.4      │
│  RB Henry      15.2     │  RB Achane      14.8      │
│  WR Chase      21.1     │  WR Jefferson   22.3      │
│  WR Lamb       17.8     │  WR Hill        19.1      │
│  TE Kelce      12.4     │  TE Andrews     10.2      │
│  FLEX Waddle   14.1     │  FLEX St-Brown  16.7      │
│  K Bass         8.2     │  K Tucker        8.4      │
│  DEF PHI        7.5     │  DEF SF          8.1      │
│  ─────────────────────────────────────────────────  │
│  Total Proj:   147.4    │  Total Proj:    148.2     │
│                                                     │
│  LEAGUE MATCHUPS — WEEK 6                           │
│  Eric 147.4 vs Tyler 148.2                          │
│  Olivia 132.1 vs James 119.8                        │
│  Brooks 125.7 vs Diego 141.3                        │
│  ...                                                │
└─────────────────────────────────────────────────────┘
```

**Post-Game:**

```
┌─────────────────────────────────────────────────────┐
│  WEEK 5 RESULT — FINAL                              │
│                                                     │
│  ✓ WIN                                              │
│  Eric's Eagles  205.5   —   Brooks Brigade  40.8    │
│                                                     │
│  TOP PERFORMERS                                     │
│  ★ Saquon Barkley    28.7 pts (your RB1)           │
│  ★ Josh Allen        34.2 pts (your QB)             │
│                                                     │
│  YOUR ROSTER BREAKDOWN                              │
│  QB Allen      34.2  ✓ Started                      │
│  RB Barkley    28.7  ✓ Started                      │
│  RB Henry      12.1  ✓ Started                      │
│  WR Chase      22.4  ✓ Started                      │
│  WR Lamb        8.3  ✓ Started (bench: McLaurin 19.1)│
│  ...                                                │
│                                                     │
│  [Full Schedule →]  [Standings →]                   │
└─────────────────────────────────────────────────────┘
```

**Layer 2 on matchup results** (subtle, post-game only):
- The line "bench: McLaurin 19.1" next to Lamb's 8.3 is a Layer 2 hint. It surfaces naturally in the roster breakdown — it's not a popup or a separate section. The user sees it and thinks "damn, I should have started McLaurin." That's the insight. No CTA. No "tap here to see your decision grade." Just the fact.
- If the user has made weekly picks, a small line at the bottom: "Your Week 5 picks: 4/6 correct" — a fact, not a funnel.

---

### 5. GAMEDAY PORTAL (New — The Centerpiece)

**Purpose:** The live experience during NFL games. This is where Clutch can feel genuinely different from every other platform.

**When it appears:** The Gameday Portal is accessible via the "Live" or "Scoring" nav item. During game windows (Sunday 1pm-midnight, Thursday night, Monday night), it becomes the default landing when tapping into a league.

**Design inspiration:** A war room. Think sports bar multiple-TV setup meets sportsbook live ticker meets fantasy RedZone. Information-dense but organized. Dark theme. Data updating in real-time.

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  ● LIVE — WEEK 6                                     1:42pm │
│  Eric's Eagles  67.2  ━━━━━━━━━░░░░░░  Tyler's Terrors     │
│                       vs               41.8                  │
│  Win Prob: 71%                                              │
├──────────────────────────────┬──────────────────────────────┤
│  YOUR PLAYERS                │  THEIR PLAYERS               │
│                              │                               │
│  QB Allen    18.4  ● LIVE    │  QB Mahomes   14.2  ● LIVE   │
│  BUF vs MIA  Q3 8:42        │  KC vs LV     Q3 9:15        │
│                              │                               │
│  RB Barkley  12.1  ● LIVE   │  RB Gibbs      8.7  ● LIVE  │
│  PHI vs DAL  Q2 4:18        │  DET vs GB    Q2 6:22        │
│                              │                               │
│  RB Henry     0.0  ○ 4:25pm │  RB Achane    11.4  ● LIVE   │
│  BAL vs CIN  (Later)        │  MIA @ BUF    Q3 8:42        │
│                              │                               │
│  WR Chase     0.0  ○ 4:25pm │  WR Jefferson 16.8  ● LIVE   │
│  CIN @ BAL  (Later)         │  MIN vs CHI   Q3 7:55        │
│                              │                               │
│  WR Lamb     14.3  ● LIVE   │  WR Hill       6.2  ● LIVE   │
│  DAL @ PHI   Q2 4:18        │  MIA @ BUF    Q3 8:42        │
│                              │                               │
│  TE Kelce     8.4  ● LIVE   │  TE Andrews    4.1  ● LIVE   │
│  FLEX Waddle  6.8  ● LIVE   │  FLEX St-Brown 0.0  ○ 4:25   │
│  K Bass       7.0  ● LIVE   │  K Tucker      0.0  ○ 4:25   │
│  DEF PHI      0.2  ● LIVE   │  DEF SF        3.4  ● LIVE   │
│  ────────────────────────────┼───────────────────────────────│
│  TOTAL: 67.2                 │  TOTAL: 41.8                 │
├──────────────────────────────┴──────────────────────────────┤
│  LEAGUE SCOREBOARD                                          │
│  Eric 67.2 vs Tyler 41.8   ● 6 live │ Olivia 52.1 vs       │
│  James 48.3                ● 5 live │ Brooks 31.7 vs Diego  │
│  44.9                      ● 4 live │                       │
├─────────────────────────────────────────────────────────────┤
│  LIVE FEED                                                  │
│  1:41  Saquon Barkley 8-yd rushing TD → +7.8 pts  (+5.1)  │
│  1:38  Josh Allen 42-yd pass to Diggs → +5.2 pts  (+1.2)  │
│  1:35  CeeDee Lamb 3 catches, 41 yds this drive           │
│  1:31  Tyreek Hill fumble lost → -2.0 pts (opponent)       │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

**Gameday Portal Design Principles:**

1. **Your Matchup is the hero.** The top bar always shows your score vs opponent. Everything below supports that story.

2. **Side-by-side roster comparison.** Your players on the left, opponent on the right. Each player shows: current fantasy points, live/later status, game clock. This is the core of the experience — watching your team compete against theirs in real time.

3. **Color-coded status:**
   - Green dot (● LIVE): player's game is currently in progress
   - Gray dot (○ 4:25pm): player's game hasn't started, shows kickoff time
   - Checkmark (✓ FINAL): player's game is complete
   - Red dot: player is injured / ruled out mid-game

4. **Live feed** at the bottom: a scrolling log of scoring plays affecting YOUR matchup. Not every play in the NFL — just the ones that matter to you. Each entry shows the point swing. This creates the drama. "Barkley TD → +7.8 pts → You now lead by 25.4."

5. **Win probability** (stretch goal): A simple percentage based on current scores, players remaining, and historical scoring distributions. Updates after every scoring play. "You have a 71% chance of winning" adds narrative tension without requiring any user action.

6. **League scoreboard** strip: See all other matchups at a glance. Know where you stand in the bigger picture.

7. **No clutter.** During gameday, strip away everything that isn't live scoring. No waiver wire. No trade proposals. No settings. The portal is a focused experience. There's a reason sports bars turn off the news during game time.

**Layer 2 on Gameday** (almost invisible):
- If the user has made weekly picks that are relevant to live games, a tiny indicator next to the live feed entry: "You picked Barkley Over 85.5 rush yds — currently at 78 yds" — only shown if they made the pick. Otherwise completely invisible.
- Post-game, the live feed becomes a recap log that feeds into the Week in Review.

**Gameday Portal — Mobile Considerations:**
- The side-by-side layout stacks vertically on mobile (your team on top, opponent below, swipeable)
- Live feed becomes a bottom sheet you can pull up
- The score bar at top is always fixed/visible
- Tap a player to see their game stats breakdown

---

### 6. STANDINGS

**Purpose:** Season-long leaderboard. Where you stack up.

Already mostly built. Key additions for NFL:
- Show W-L record prominently (it's the primary ranking metric in H2H)
- Points For / Points Against / Point Differential
- Playoff picture: "You clinch with a win next week" or "Projected seed: 3rd"
- Divisional standings (if league has divisions)

**Layer 2 on Standings:**
- None visible by default. If user has a Clutch Rating, show it as a column in the table (same as W-L-T, PF, PA). It's data, not a CTA.

---

### 7. SCORING (Week Detail)

**Purpose:** See the full scoring breakdown for any completed week.

This replaces the golf-specific tournament scoring page for NFL leagues.

```
┌─────────────────────────────────────────────────────┐
│  WEEK 5 SCORING                                     │
│  [Wk 1] [Wk 2] [Wk 3] [Wk 4] [Wk 5 ←]           │
│                                                     │
│  YOUR TEAM — 205.5 pts                              │
│                                                     │
│  Player         Pts    Breakdown                    │
│  QB Allen       34.2   312 yds, 3 TD, 1 INT, 28 ru │
│  RB Barkley     28.7   128 rush, 2 TD, 4 rec, 32yd │
│  RB Henry       12.1   67 rush, 0 TD, 2 rec, 18 yd │
│  WR Chase       22.4   8 rec, 124 yds, 1 TD        │
│  WR Lamb         8.3   4 rec, 52 yds, 0 TD         │
│  TE Kelce       14.8   6 rec, 78 yds, 1 TD         │
│  FLEX Waddle    11.2   5 rec, 64 yds, 0 TD, 1 rush │
│  K Bass          8.0   2 FG (37, 48), 2 XP         │
│  DEF PHI         7.5   1 sack, 1 INT, 0 TD allowed │
│                                                     │
│  BENCH                                              │
│  McLaurin       19.1   7 rec, 112 yds, 1 TD        │
│  Jacobs          BYE                                │
│  Hurts          26.8   278 yds, 2 TD, 0 INT, 45 ru │
│                                                     │
│  LEAGUE RANKINGS — WEEK 5                           │
│  1. Eric's Eagles      205.5                        │
│  2. Diego's Dynasty    168.2                        │
│  3. Tyler's Terrors    144.7                        │
│  ...                                                │
└─────────────────────────────────────────────────────┘
```

**Layer 2 on Scoring:**
- Bench players that outscored a starter are shown with a subtle amber highlight. Not a red error — just a visual note. "McLaurin 19.1" next to "Lamb 8.3" tells the whole story without any text.
- If the user has engaged with decision tracking: a small summary line at top: "Optimal lineup would have scored 218.9 (+13.4 pts left on bench)"

---

### 8. "PROVE IT" — WEEKLY PICKS (Layer 2 Only)

**Purpose:** The casual entry point to the Clutch prediction ecosystem. Make picks on props, game outcomes, and player performances each week.

**This page only exists for users who opt in.** It's never forced. It's accessed via the "Prove It" nav item, which appears for all users but feels like a feature tab, not a requirement.

**Access pattern:**
- "Prove It" link in main nav (between "Research" and "Live")
- The link is always visible but unobtrusive — same weight as other nav items
- First visit shows a brief explainer (one screen, dismissable, never shown again)
- No account setup required — same auth, just start picking

**Interface:**

```
┌─────────────────────────────────────────────────────┐
│  PROVE IT — WEEK 6 PICKS                            │
│  Picks lock at kickoff. 14 available.               │
│                                                     │
│  PLAYER PROPS                                       │
│                                                     │
│  Josh Allen passing yards    O/U 275.5              │
│  [OVER]  [UNDER]                                    │
│                                                     │
│  Saquon Barkley rushing yds  O/U 85.5               │
│  [OVER]  [UNDER]                                    │
│                                                     │
│  Ja'Marr Chase receptions    O/U 5.5                │
│  [OVER]  [UNDER]                                    │
│                                                     │
│  GAME PICKS                                         │
│                                                     │
│  PHI vs DAL    Spread: PHI -6.5                     │
│  [PHI -6.5]  [DAL +6.5]                            │
│                                                     │
│  BUF vs MIA    O/U 48.5                             │
│  [OVER]  [UNDER]                                    │
│                                                     │
│  ...                                                │
│                                                     │
│  YOUR RECORD: 38-22 (.633) — 81st percentile        │
│  Current streak: W4                                 │
└─────────────────────────────────────────────────────┘
```

**Picks Design Principles:**

1. **Fast.** Each pick is a single tap. Over or Under. Pick A or Pick B. No multi-step flow, no confirmation dialog, no "are you sure?" Just tap and it's locked.

2. **Optional depth.** After making a pick, a subtle row of reason chips appears (from the entry-points spec): [Matchup] [Weather] [Gut feel] [Volume] [Game script]. One tap to tag a reason, or ignore it completely. Auto-dismisses after 5 seconds.

3. **No mandatory quantity.** Pick 1 prop or pick all 14. No minimum. No penalty for skipping a week. The system scores what you give it.

4. **Results inline.** After games complete, each pick shows the result immediately. Green check or red X. Running record updates in real-time.

5. **Leaderboard access.** "Your Record: 38-22 (.633) — 81st percentile" links to the full picks leaderboard. This is where the competitive hook lives. But it's a link, not a popup.

6. **No money.** These are opinion picks, not bets. No odds, no spreads from sportsbooks, no "bet now" CTAs. Clutch is not a gambling platform. It tracks accuracy, not profit.

7. **Rewards are built in.** Every pick feeds the Clutch Rating, streaks, badges, and percentile rankings. See "The Reward Engine" section for the full gamification framework. The key: rewards surface naturally through results, not through a separate gamification layer that feels bolted on.

---

### 9. WEEK IN REVIEW (Layer 2 — Opt-In)

**Purpose:** Post-week analysis of your decisions. This is the AI coaching surface.

**This is NOT a mandatory page.** It generates automatically after each week but only surfaces if the user seeks it out. Access points:
- A "Week in Review" link appears in the matchup result card (League Home, post-game)
- A tab within the Scoring page
- Direct link in nav (under the user's profile)

**Never a popup. Never a push notification (unless user opts in). Never a modal.**

```
┌─────────────────────────────────────────────────────┐
│  WEEK 5 IN REVIEW                                   │
│                                                     │
│  RESULT: W 205.5 — 40.8 vs Brooks Brigade           │
│                                                     │
│  LINEUP DECISIONS                                   │
│  ✓ Started Barkley (28.7) over Jacobs (BYE)  — N/A │
│  ✓ Started Chase (22.4) over McLaurin (19.1) — Good │
│  ✗ Started Lamb (8.3) over McLaurin (19.1)  — Miss  │
│  ✓ Started Allen (34.2) over Hurts (26.8)   — Good  │
│                                                     │
│  OPTIMAL LINEUP: 218.9 pts                          │
│  Your lineup:    205.5 pts                          │
│  Difference:     -13.4 pts (93.9% optimal)          │
│                                                     │
│  POINTS LEFT ON BENCH: 45.9                         │
│  (McLaurin 19.1 would have replaced Lamb 8.3)       │
│                                                     │
│  ── SEASON TRENDS (appears after 3+ weeks) ──       │
│  Start/Sit Accuracy: 78% (above league avg 71%)     │
│  Biggest recurring miss: undervaluing slot WRs      │
│  Waiver hit rate: 2/5 pickups started within 2 wks  │
└─────────────────────────────────────────────────────┘
```

**Week in Review Design Principles:**

1. **Factual, not judgmental.** "McLaurin scored 19.1 on your bench" is a fact. "You should have started McLaurin" is a judgment. Show the fact. Let the user draw the conclusion. The AI coaching tone should be neutral and data-driven, not condescending.

2. **Trends > individual weeks.** A single bad start/sit decision is noise. A pattern over 5 weeks is signal. The "Season Trends" section only appears after enough data accumulates (3+ weeks minimum). This is where the real value lives.

3. **Opt-in depth.** The summary view shows the high-level facts. Tapping "See full analysis" opens detailed breakdowns: position-by-position accuracy, waiver player performance, trade win/loss analysis, etc. Layers of depth for those who want it.

4. **Connects to Clutch Rating.** Decision accuracy feeds into the user's Clutch Rating. But the rating update happens automatically — the user doesn't need to visit this page for their rating to update. The page is for self-improvement, not for score calculation.

---

## NAVIGATION STRUCTURE

### Primary Nav (Always Visible)

```
[Dashboard]  [Draft]  [Prove It]  [Research ▾]  [Live]  [Search]
```

- **Dashboard** — League Home (the hub)
- **Draft** — Draft room (seasonal, hides post-draft or shows draft recap)
- **Prove It** — Weekly picks (Layer 2, always accessible)
- **Research** — Dropdown: Player database, stats, rankings, news
- **Live** — Gameday Portal during game windows, Scoring page otherwise
- **Search** — Player/league search

### League Sub-Nav (Within a League)

```
[Home]  [Roster]  [Matchups]  [Standings]  [Scoring]  [Waivers]
```

These are the core fantasy management pages. No Layer 2 features in this nav — keep it clean and familiar.

### User Profile Section

- Clutch Rating (if earned)
- Pick record & accuracy
- Decision journal (season history)
- Badges & achievements
- Settings

The profile is where Layer 2 lives permanently. It's the user's "Clutch identity" — their tracked record, their accuracy, their growth over time. But it's their space to explore, not something pushed on them.

---

## INFORMATION HIERARCHY DURING GAME WINDOWS

During active NFL game windows, the entire app should shift its energy toward live information:

**Priority 1:** Your matchup score (always visible, top of screen)
**Priority 2:** Your players' live stats (the Gameday Portal)
**Priority 3:** League scoreboard (other matchups)
**Priority 4:** Live feed of scoring plays
**Priority 5:** Everything else (standings, waivers, research) — still accessible but de-emphasized

This creates a natural flow: the app feels alive on Sundays and calm on Tuesdays. Same pages, different energy.

---

## DATA CAPTURE MAP

Every user action that feeds the Clutch intelligence ecosystem, organized by visibility:

### Invisible Captures (User Never Knows)
- Lineup set/changes (timestamped) → decision journal
- Waiver claims → acquisition strategy patterns
- Trade proposals → valuation tendencies
- Page visits during game windows → engagement patterns
- Player card views → research behavior

### Subtle Captures (User Sees Result, Not Process)
- Start/sit outcomes → shown in Week in Review
- Bench vs starter scoring differential → shown in matchup results
- Optimal lineup calculation → shown in Week in Review
- Season trend analysis → shown in profile

### Explicit Captures (User Actively Participates)
- Weekly picks (Prove It) → pick record, Clutch Rating
- Reason chips on picks → structured reasoning data
- Player rankings (preseason) → prediction accuracy
- Stat projections (preseason) → deep accuracy scoring

### What the AI Learns Over Time
- Position-specific accuracy (are you better at evaluating QBs or WRs?)
- Information source quality (gut feel vs podcast tip vs film)
- Lineup management tendencies (set-and-forget vs constant tinkering)
- Waiver aggression and success rate
- Trade strategy patterns
- Matchup awareness (do you factor in opponent defense?)
- Bye week management
- Injury response patterns

All of this feeds back into personalized coaching. But the coaching only surfaces when the user asks for it (visits Week in Review, opens their profile, checks their Clutch Rating breakdown). Push nothing. Pull everything.

---

## THE REWARD ENGINE — GAMIFICATION WITHOUT GAMBLING

### The Core Question

If there's no money on the line, why would someone make picks every week? What's the payoff?

**The answer: verified credibility.** In a world where every sports fan has opinions and nobody tracks them, a verified track record IS the reward. It's social currency. The text you send your group chat saying "CALLED IT" — Clutch turns that into a permanent, shareable, provable asset.

The reward isn't dollars. It's identity.

### The "I Told You So" Engine

This is the emotional centerpiece of the prediction ecosystem. When you disagreed with consensus or a specific expert and you were RIGHT, Clutch should make that moment feel incredible.

**The Delta Card:**

When you rank a player differently from an expert or consensus and the season proves you right, Clutch generates a shareable card:

```
┌─────────────────────────────────────────────────────┐
│  YOUR CALL vs FANTASY FOOTBALLERS                   │
│                                                     │
│  Josh Jacobs                                        │
│                                                     │
│  YOUR RANK:    RB5                                  │
│  THEIR RANK:   RB12                                 │
│  ACTUAL FINISH: RB4                                 │
│                                                     │
│  You were off by 1. They were off by 8.             │
│  Your edge: +7 spots closer.                        │
│                                                     │
│  ┌──────────┐                                       │
│  │ SHARE ↗  │                                       │
│  └──────────┘                                       │
│                                       clutch logo   │
└─────────────────────────────────────────────────────┘
```

These cards are designed to be screenshotted and dropped in group chats, posted on Twitter/X, shared on Instagram stories. They look like sports broadcast graphics, not spreadsheets.

**The reverse matters too:**

```
┌─────────────────────────────────────────────────────┐
│  YOUR CALL vs CONSENSUS                             │
│                                                     │
│  De'Von Achane                                      │
│                                                     │
│  YOUR RANK:    RB3                                  │
│  CONSENSUS:    RB6                                  │
│  ACTUAL FINISH: RB14                                │
│                                                     │
│  You were off by 11. Consensus was off by 8.        │
│  Consensus was closer on this one.                  │
│                                                     │
│                                       clutch logo   │
└─────────────────────────────────────────────────────┘
```

**Showing losses builds trust.** If Clutch only surfaced wins, it would feel like a gimmick. Showing both directions makes the wins credible and the losses educational. "I keep overvaluing explosive athletes with injury risk" is a real insight that comes from seeing your misses.

**When delta cards appear:**
- End of season: full report on all ranking divergences vs experts
- Mid-season checkpoints (Week 8, Week 12): "Midseason check — your RB board is beating consensus by 6%"
- Anytime a user visits their profile or the "vs Expert" tracker
- Never as a push notification or popup

### Head-to-Head Expert Tracking

Users can follow specific experts (or friends) and Clutch maintains a running comparison all season:

```
┌─────────────────────────────────────────────────────┐
│  YOU vs FANTASY FOOTBALLERS — 2026 SEASON           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━           │
│                                                     │
│  WEEKLY PICKS                                       │
│  You: 38-22 (.633)    FF: 34-26 (.567)              │
│  You lead by 4 games                                │
│                                                     │
│  PRESEASON RANKINGS                                 │
│  QB Board:  You .71 corr  vs  FF .68 corr   You ✓  │
│  RB Board:  You .74 corr  vs  FF .69 corr   You ✓  │
│  WR Board:  You .61 corr  vs  FF .71 corr   FF ✓   │
│  TE Board:  You .58 corr  vs  FF .62 corr   FF ✓   │
│                                                     │
│  OVERALL: You're winning 3 of 5 categories          │
│                                                     │
│  ┌──────────┐                                       │
│  │ SHARE ↗  │                                       │
│  └──────────┘                                       │
└─────────────────────────────────────────────────────┘
```

This is fantasy football ABOUT fantasy football. It's addictive because it taps into the same competitive instinct that makes people play fantasy in the first place — but now the game is about who KNOWS football better, not who got lucky on the waiver wire.

**Who you can track against:**
- Verified experts on the platform (Fantasy Footballers, Matthew Berry, etc.)
- Friends / league mates (if they also make picks or rankings)
- Consensus (aggregate of all Clutch users)
- Your past self ("You vs 2025 You" — are you getting better?)

### The Reward Stack

Five reward layers, each targeting a different motivation:

#### 1. Clutch Rating (The Number)

A composite score (650-900 range) that represents overall sports knowledge accuracy. Think credit score for football intelligence.

**Components:**
- Pick accuracy (weekly O/U, game picks) — weighted by volume and consistency
- Ranking accuracy (preseason boards vs actual finishes) — Spearman correlation
- Lineup decision quality (start/sit optimization %) — invisible capture
- Consistency bonus (showing up week after week)
- Scope multiplier (full slate > position expert > my team only)

**Where it shows:**
- User profile (prominently)
- Next to user's name in league standings (if they have one)
- On shareable cards
- Leaderboard (global, by league, by friend group)

**What it doesn't do:**
- Never gates features. A 650 rating user has the same access as a 900.
- Never shows as a negative. If someone's accuracy is below average, show their strengths ("Your RB picks are 71st percentile") not their weaknesses.
- Never compares users directly in a way that feels shaming. Percentile ranking is competitive; "you're worse than John" is toxic.

#### 2. Streaks

Humans are wired to protect streaks. They create urgency without pressure.

**Streak types:**
- **Pick streak** — consecutive correct picks (e.g., "W7 — seven straight correct picks")
- **Weekly streak** — consecutive weeks making at least one pick (e.g., "12-week pick streak")
- **Beat-the-expert streak** — consecutive weeks outperforming a specific expert
- **Hot hand streak** — consecutive weeks in the top 25th percentile of picks accuracy

**UX for streaks:**
- Shown as a small badge on the Prove It page: "W7" next to your record
- When a streak is at risk (you haven't made picks and the window is closing), a single subtle notification IF the user has opted into notifications. One notification per week max. No spam.
- When a streak breaks, show it factually: "Your 7-pick streak ended. New streak starts now." No guilt, no drama.

#### 3. Badges (The Trophy Case)

Earned achievements that represent verified accomplishments. Each badge has a clear, hard-to-game criteria. No participation trophies.

**Accuracy Badges:**
```
[Sharp Shooter]      70%+ pick accuracy over a full season
[Sniper]             80%+ accuracy in any single month (min 15 picks)
[Season Sage]        Top 10% in season-long ranking accuracy
```

**Competitive Badges:**
```
[Expert Killer]      Outperformed a verified expert in season accuracy
[Better Than Berry]  Beat Matthew Berry's season-long pick record
[David vs Goliath]   Beat someone with 100+ more Clutch Rating points
[Consensus Breaker]  60%+ accuracy on picks that went AGAINST consensus
```

**Knowledge Badges:**
```
[QB Whisperer]       Top 15% in QB evaluation accuracy
[RB Guru]            Top 15% in RB evaluation accuracy
[Sleeper Scout]      Correctly identified 3+ breakout players (ranked 15+ spots above consensus, player finished top 20 at position)
[Bust Detector]      Correctly faded 3+ busts (ranked 15+ spots below consensus, player finished outside top 30)
```

**Insight Badges (from reason chips):**
```
[Gut Genius]         "Gut feel" tagged picks hit 65%+
[Film Room]          "Game film" tagged picks hit 70%+
[Weather Hawk]       "Weather" tagged picks hit 65%+
[Matchup Master]     "Matchup" tagged picks hit 70%+
```

**Consistency Badges:**
```
[Iron Man]           Made picks every week for a full season
[Ride or Die]        Maintained rankings without changes for 4+ weeks (conviction)
[Full Slate]         Completed rankings for all positions preseason
```

**Badge display:**
- Trophy case on user profile (shows earned badges with date earned)
- Up to 3 "pinned" badges shown next to username in leaderboards and league views
- Shareable card when a badge is earned: "I just earned Expert Killer on Clutch"

#### 4. Percentile Rankings

Every pick, every week, every season — ranked against all Clutch users.

```
Your Week 6 picks: 5/7 correct — 89th percentile
Your October picks: 22/31 correct — 76th percentile
Your 2026 season picks: 38-22 (.633) — 81st percentile
Your RB rankings: .74 correlation — 82nd percentile
```

Percentiles are powerful because they contextualize raw numbers. "38-22" doesn't mean much on its own. "81st percentile — you're more accurate than 4 out of 5 people on this platform" tells a story.

**Where percentiles show:**
- Prove It page (next to your record)
- Profile (season-long and all-time)
- Shareable moment cards
- Season-end report

#### 5. Shareable Moment Cards

Every moment of validation should be **one tap to share.** These are designed graphics — not screenshots of a table, but branded cards that look like sports broadcast graphics.

**Card types generated automatically:**
- Weekly picks result: "5/7 correct this week — 89th percentile"
- Streak milestone: "12-week pick streak and counting"
- Badge earned: "Just unlocked Expert Killer"
- Delta win: "I called Jacobs RB5 when everyone had him RB12. He finished RB4."
- Rating milestone: "My Clutch Rating just hit 800"
- Season-end summary: "2026 Season: 71% pick accuracy, beat Fantasy Footballers, earned 4 badges"
- Head-to-head result: "I outpicked [Expert] 38-34 this season"

**Card design principles:**
- Dark theme, consistent with Clutch brand (Aurora Ember system)
- Player photos when relevant (for delta cards)
- Clutch logo watermark (subtle, bottom corner — every share is brand awareness)
- Optimized for Instagram story dimensions AND Twitter/X horizontal format
- One-tap share to clipboard, or direct to platform (Twitter, iMessage, etc.)

**These cards are the organic growth engine.** Every share is an ad for Clutch that doesn't feel like an ad. It feels like bragging — which is exactly what sports fans want to do. The user gets their "I told you so" moment, and Clutch gets distribution.

### The AI Coaching Loop — How It All Connects

The gamification layer isn't just about dopamine hits. Every reward is backed by data that feeds the AI ecosystem, and the AI feeds back insights that make the user smarter.

**The Decision DNA Profile:**

After 1+ seasons of picks, rankings, and lineup decisions, Clutch builds a comprehensive profile of how you think about football:

```
┌─────────────────────────────────────────────────────┐
│  YOUR DECISION DNA — 2026 SEASON                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━           │
│                                                     │
│  STRENGTHS                                          │
│  • Game script analysis (73% accuracy)              │
│    You correctly predict game flow better than 85%  │
│    of users. When you tag "game script" as a reason │
│    your picks hit at elite rates.                   │
│                                                     │
│  • Identifying breakout RBs (4 of 6 hit)            │
│    Your "sleeper" RB picks outperform your other    │
│    position calls by a wide margin.                 │
│                                                     │
│  • QB rushing upside reads (81% accuracy)           │
│    When you pick a QB prop Over citing rushing       │
│    upside, you're almost always right.              │
│                                                     │
│  BLIND SPOTS                                        │
│  • Overvalue name recognition on aging stars        │
│    Players 30+ that you ranked above consensus      │
│    underperformed your rank 67% of the time.        │
│                                                     │
│  • WR target share changes (44% accuracy)           │
│    When a WR gets a new QB or OC, your predictions  │
│    on their usage are near coin-flip.               │
│                                                     │
│  • Weather impact (48% — basically random)           │
│    Your weather-tagged picks don't beat chance.     │
│    Consider ignoring weather in your analysis.      │
│                                                     │
│  RECOMMENDATION                                     │
│  Trust your instincts on RBs and rushing QBs.       │
│  On WRs with new situations, lean toward consensus  │
│  — your adjustments have hurt more than helped at   │
│  that position. Your game script reads are elite;   │
│  make sure you're factoring them into every pick.   │
│                                                     │
│                                       clutch logo   │
└─────────────────────────────────────────────────────┘
```

**This is the ultimate reward.** Not a badge. Not a number. Self-knowledge verified by data. The kind of insight that actually makes you better at evaluating football — and better at fantasy.

**The multi-year flywheel:**
- Year 1: Raw data collection. Basic pick accuracy. First badges.
- Year 2: "You vs 2025 You" comparisons. Pattern detection kicks in. Decision DNA takes shape. AI coaching gets specific.
- Year 3+: Deep longitudinal insights. "Over three seasons, your biggest improvement has been in WR evaluation — up from 44th percentile to 71st. Your RB instincts have been elite and consistent." The longer someone stays, the richer their profile, the harder it is to leave.

**How each capture feeds the AI:**

| User Action | Visible Reward | Invisible AI Capture |
|---|---|---|
| Makes a weekly pick | Win/loss, streak, record | Pick type preference, timing, confidence pattern |
| Tags a reason chip | Reason-specific accuracy badge | Structured reasoning data, source quality scoring |
| Ranks players preseason | Correlation score, delta cards | Position bias, consensus divergence patterns |
| Sets a lineup (start/sit) | Week in Review grade | Decision timing, risk tolerance, matchup awareness |
| Adds a waiver player | (none directly) | Acquisition strategy, reactivity, hit rate |
| Proposes a trade | (none directly) | Player valuation model, negotiation patterns |
| Views a player card | (none directly) | Research behavior, pre-decision information seeking |

The invisible captures are what make the AI powerful over time. The user never feels surveilled because the visible rewards are the focus — the data collection is a natural byproduct of engagement.

### Motivation by User Type

Different users are motivated by different parts of the reward stack:

**The Competitive Know-It-All:**
- Primary motivator: Leaderboard rank, Expert Killer badge, head-to-head records
- They want to PROVE they're smarter than the talking heads
- Give them: prominent percentile rankings, expert comparison trackers, shareable delta cards
- Retention hook: "You're 3 games ahead of Fantasy Footballers with 5 weeks left"

**The Self-Improver:**
- Primary motivator: Decision DNA, season-over-season improvement, AI coaching
- They want to GET BETTER at fantasy, not just win this year
- Give them: Week in Review depth, trend analysis, blind spot identification
- Retention hook: "Your WR accuracy improved from 44th to 71st percentile year over year"

**The Social Bragger:**
- Primary motivator: Shareable cards, badges, streak milestones
- They want content for their group chat and social media
- Give them: beautiful share cards, badge announcements, streak alerts
- Retention hook: "Your friends on Clutch can see your 12-week streak"

**The Casual Engager:**
- Primary motivator: Occasional dopamine hits, low-friction participation
- They pick when they feel strongly, skip weeks they don't
- Give them: no penalties for inactivity, instant results on picks, simple percentile context
- Retention hook: "You made 6 picks this month — all 6 were correct. 100% accuracy."

**None of these users should feel like they're using a different product.** The reward stack scales with engagement depth — casual users see less, active users see more — but the interface is the same for everyone.

---

## GOLF PARITY — HOW THE FRAMEWORK TRANSLATES

The weekly NFL cycle is the backbone of this doc, but Clutch is multi-sport. Golf has a fundamentally different rhythm, and the UX must adapt without feeling like a different product.

### The Structural Differences

| Dimension | NFL | Golf |
|---|---|---|
| **Cycle** | Weekly (Tue-Mon) | Tournament-based (Thu-Sun, ~40 events/year) |
| **Competition** | Team vs team (H2H matchups) | Individual vs field OR salary cap roster |
| **Gameday** | 3 windows (Sun 1pm, Sun 4pm, Sun/Mon night) | 4 rounds over 4 days, tee times staggered |
| **Lineup decisions** | Start/sit, waivers, trades | Roster locks at Round 1 tee-off (most formats) |
| **Live scoring** | Points spike in bursts (TDs) | Points trickle (birdies, bogeys, hole-by-hole) |
| **Season length** | 18 weeks + playoffs | 9-10 month season, events vary in prestige |

### Golf Weekly Cycle

```
MONDAY         New tournament field announced → Research begins
TUESDAY-WED    Set roster / make picks (tournament locks Thu morning)
THURSDAY       Round 1 → Live scoring begins
FRIDAY         Round 2 → Cut line drama (will your players make the cut?)
SATURDAY       Round 3 (Moving Day) → Leaderboard shuffles
SUNDAY         Final Round → Winner decided → Results & review
```

### Golf Gameday Portal

The live experience for golf is slower-burn but equally engaging. Instead of a matchup score ticking up in bursts, you're watching a leaderboard evolve over 4 days.

```
┌─────────────────────────────────────────────────────┐
│  ● LIVE — THE MASTERS — ROUND 3                     │
│                                                     │
│  YOUR ROSTER                  LEAGUE STANDINGS       │
│  1. Scheffler    -12 (T2)    1. Eric     312.4 pts  │
│     Hole 14: Par 5, 2nd shot │ 2. Tyler    298.1 pts │
│  2. Rahm         -8  (T7)    3. Brooks   287.6 pts  │
│     Hole 11: Par 4, on green │                       │
│  3. Morikawa     -6  (T15)   │                       │
│     Finished R3: 68 (-4)     │                       │
│  4. Hovland      -4  (T22)   │                       │
│     Hole 16: Par 3, tee shot │                       │
│                               │                       │
│  BENCH                        │                       │
│  Fleetwood      -5  (T18)    │                       │
│  Aberg          -3  (T28)    │                       │
├─────────────────────────────────────────────────────┤
│  LIVE FEED                                          │
│  2:14  Scheffler eagle on 13 → +4.0 pts → 1st!     │
│  2:08  Rahm birdie on 11 → +2.0 pts                │
│  2:01  Hovland bogey on 15 → -1.0 pts              │
│  1:55  CUT LINE UPDATE: Fleetwood safely through    │
└─────────────────────────────────────────────────────┘
```

**Key differences from NFL portal:**
- No "opponent" to compare against in most golf formats (season-long, salary cap). Show league standings instead.
- Hole-by-hole context matters — "Hole 14: Par 5, 2nd shot" tells you a birdie/eagle opportunity is live
- Cut line drama is golf-specific — players on the bubble create tension. Surface "cut line: -2, your player is at -2" as a live alert.
- Round-by-round progression — the portal spans 4 days, not 3 hours. It should feel like a slow build, not a sprint.
- For H2H golf formats, the side-by-side matchup view works identically to NFL.

### Golf "Prove It" Picks

Weekly picks translate naturally to golf tournaments:

```
THE MASTERS — PROVE IT PICKS
Picks lock: Thursday 7:45 AM ET (first tee time)

WINNER PICK
Who wins the tournament?
[Scheffler]  [Rahm]  [Morikawa]  [Other: ____]

TOP 5 FINISH
Will Rory McIlroy finish top 5?   [YES]  [NO]

MAKE THE CUT
Will Tiger Woods make the cut?     [YES]  [NO]

PLAYER PROPS
Scheffler Round 1 score    O/U 68.5    [OVER]  [UNDER]
Rahm driving accuracy %    O/U 64.5%   [OVER]  [UNDER]

H2H MATCHUP PICK
Who scores better this tournament?
[Scheffler]  vs  [Rahm]
```

**Golf-specific pick types:**
- Tournament winner (hardest, highest reward to Clutch Rating)
- Top 5 / Top 10 / Top 20 finish predictions
- Make/miss the cut
- Round score over/under
- H2H matchup picks (which player beats which)
- Course fit picks ("Will this bomber contend at Augusta?")

The reason chips adapt too: [Course fit] [Current form] [Weather] [Major experience] [Gut feel] [Data model] [Revenge narrative]

### Golf Reward Engine

Same reward stack, golf-flavored badges:

```
[Major Prophet]      Correctly picked a major winner
[Cut Line Surgeon]   80%+ accuracy on make/miss the cut picks
[Course Whisperer]   Top 10% accuracy on course-fit predictions
[Form Reader]        Identified 3+ hot streaks before consensus
[Strokes Gained Nerd] Full stat projection accuracy top 15%
```

### The Shared Layer

What stays IDENTICAL across sports:
- Clutch Rating (composite, cross-sport)
- Profile / trophy case / badge display
- Shareable cards (same design system, different content)
- Decision DNA (separate profiles per sport, combined Clutch Rating)
- Leaderboards (per-sport and overall)
- Subtle integration pattern (invisible → hint → available → active)
- Notification strategy (see below)

What adapts per sport:
- Weekly cycle / timing
- Gameday portal layout
- Pick types
- Player card data
- Badge criteria
- Lineup management specifics

---

## DATA DEPENDENCIES BY PHASE

Each build phase has hard data requirements. Building UI without the data behind it creates dead features. This section maps what we need, what we have, and what we must acquire.

### What We Have Today

| Data | Source | Status |
|---|---|---|
| NFL player stats (2024) | nflverse CSVs | Synced |
| NFL rosters & schedules | nflverse | Synced |
| NFL weekly scoring | Our scoring calculator | Built, working |
| Golf player stats | DataGolf API | Live, syncing |
| Golf tournament scores | DataGolf API | Live, syncing |
| Golf SG data | DataGolf API | Live (commercial license TBD) |
| User accounts / auth | Our platform | Built |
| Fantasy leagues / rosters | Our platform | Built |
| H2H matchups & scoring | Our platform | Built |

### What We Need Per Phase

**Phase 1: Fix Current Pages**
- Data needed: Nothing new. Uses existing data.
- Status: Can build now.

**Phase 2: Gameday Portal**
- NFL live scoring source (play-by-play, updating every 1-2 minutes during games)
  - Option A: nflverse live game data (free, but update frequency unclear during games)
  - Option B: ESPN/NFL.com JSON endpoints (public, scraping, fragile)
  - Option C: SportsDataIO or SportsRadar (paid, reliable, real-time)
  - **Decision needed:** Which live data source? Free but fragile, or paid but reliable?
- Golf live scoring source
  - DataGolf provides live tournament data (already integrated)
  - May need higher polling frequency during tournament hours
- **Blocker level: HIGH.** No live data = no Gameday Portal. Must resolve before building.

**Phase 3: Scoring Detail Page**
- NFL player game stats per week (passing yards, rushing yards, etc. — not just fantasy points)
  - We have weekly fantasy point totals from our scoring pipeline
  - We need the stat BREAKDOWN per player per week (how they scored those points)
  - Source: nflverse player_stats CSVs (already have 2024, need to parse into display format)
- Golf: Already have round-by-round scoring from DataGolf
- **Blocker level: LOW.** Data exists, just needs formatting/display work.

**Phase 4: Prove It (Weekly Picks)**
- NFL weekly props/lines
  - Option A: Scrape from public odds sites (fragile, legal gray area)
  - Option B: Use a sports odds API (The Odds API — free tier available, paid for volume)
  - Option C: Generate our own lines from statistical models (no external dependency, but requires model building)
  - Option D: Manually curate a small set of picks each week (labor-intensive, doesn't scale)
  - **Recommended:** Start with Option C (model-generated lines from nflverse data) + Option B as validation. This makes our lines proprietary Clutch content, not pass-through of sportsbook odds.
- Golf tournament props
  - Similar approach: generate from DataGolf data + historical performance
- **Blocker level: MEDIUM.** Need to build the line-generation model, but no external licensing required.

**Phase 5: Expert Tracking**
- Expert rankings data
  - Need actual expert rankings published on Clutch OR imported from public sources
  - Fantasy Footballers, Matthew Berry, FantasyPros consensus — most publish rankings publicly
  - Option A: Invite experts to publish directly on Clutch (ideal but requires business development)
  - Option B: Import public rankings with attribution (legal if done carefully with proper attribution)
  - Option C: Start with "Consensus" only (aggregate of all Clutch users) — no expert dependency
  - **Recommended:** Launch with Option C (consensus comparison). Add expert imports as growth strategy. Invite experts as platform scales.
- **Blocker level: LOW for consensus. HIGH for named experts (requires partnerships).**

**Phase 6: AI Coaching**
- Requires 3+ weeks of user data minimum (pick history, lineup decisions, waiver claims)
- Requires an LLM integration for generating natural language insights
  - Claude API (Anthropic) or similar for insight generation
  - Prompt engineering with user's structured data as context
- No external data dependency — all inputs come from user behavior already captured
- **Blocker level: LOW for data. MEDIUM for AI integration (need LLM pipeline).**

**Phase 7: Preseason Experience**
- ADP (Average Draft Position) data for rankings starting point
  - Source: FantasyPros ADP (public), ESPN ADP, or aggregated from multiple sources
  - Alternatively: build Clutch Consensus ADP from our own users' rankings over time
- NFL player universe for ranking (top 200-300 players by position)
  - Source: nflverse rosters + our existing NFL player database
- Expert ranking templates (see Phase 5 — same dependency)
- **Blocker level: LOW.** ADP data is widely available. Player universe already exists.

### Data Acquisition Priority

1. **NOW:** NFL 2025 data sync (we only have 2024). Needed for everything.
2. **Before Phase 2:** Decide on live scoring data source. Research options, test reliability.
3. **Before Phase 4:** Build statistical line-generation model for Prove It picks.
4. **Before Phase 5:** Decide on expert strategy (consensus first vs expert partnerships).
5. **Before Phase 6:** Set up LLM pipeline for AI-generated insights.

---

## MOBILE-FIRST DESIGN PRINCIPLES

### The Reality

80%+ of fantasy app usage happens on mobile. On Sundays, it's closer to 95%. The desktop wireframes in this doc establish information hierarchy, but **mobile is the primary experience.** Every screen must be designed mobile-first, then expanded for desktop.

### Global Mobile Patterns

**Bottom navigation (mobile only):**
```
┌─────────────────────────────────────────┐
│                                         │
│         [Page content here]             │
│                                         │
├─────────────────────────────────────────┤
│  🏠     📋     ⚡     📊     👤       │
│  Home   Roster  Live   Scores  Profile  │
└─────────────────────────────────────────┘
```

- 5 tabs maximum (iOS/Android convention)
- "Live" tab pulses or highlights during game windows
- "Prove It" is accessed via the Profile tab or a banner on Home — not a permanent nav tab (keeps the core 5 clean)

**Pull-to-refresh everywhere.** Fantasy managers compulsively refresh. Make it satisfying — quick animation, data updates, done.

**Swipe gestures:**
- Swipe between weeks (matchups, scoring)
- Swipe between your roster and opponent's roster (gameday)
- Swipe to dismiss player drawer
- Swipe player row to quick-add/drop (waivers)

**Sticky headers:** The matchup score bar (your score vs opponent) sticks to the top during scroll on gameday. It's always visible. This is the single most-checked piece of information on Sundays.

### Key Mobile Layouts

#### League Home (Mobile)

```
┌──────────────────────────┐
│  [TEST] NFL Mock League  │
│                          │
│  YOUR MATCHUP — WEEK 6   │
│  ┌──────────────────────┐│
│  │ Eric's Eagles  142.3 ││
│  │ vs                   ││
│  │ Tyler's Terrors 128.7││
│  │ [Set Lineup →]       ││
│  └──────────────────────┘│
│                          │
│  STANDINGS               │
│  1. Eric      5-0  312pts│
│  2. Tyler     3-2  278pts│
│  3. Brooks    3-2  265pts│
│  ...                     │
│                          │
│  LEAGUE ACTIVITY         │
│  Trade proposed: Tyler → │
│  Diego (voting ends Thu) │
│                          │
├──────────────────────────┤
│ 🏠  📋  ⚡  📊  👤    │
└──────────────────────────┘
```

Single column. Matchup card is the hero. Everything stacks vertically. No grid layouts on mobile.

#### Gameday Portal (Mobile)

This is the most critical mobile layout. On Sunday afternoon, this IS the app.

```
┌──────────────────────────┐
│  ● LIVE  Eric 67.2       │ ← Sticky score bar
│  vs Tyler 41.8  Win: 71% │    (always visible)
├──────────────────────────┤
│  [Your Team]  [Opponent] │ ← Swipeable tabs
│                          │
│  QB  Allen         18.4  │
│      BUF vs MIA  Q3 8:42│
│                          │
│  RB  Barkley       12.1  │
│      PHI vs DAL  Q2 4:18│
│                          │
│  RB  Henry          0.0  │
│      BAL vs CIN  4:25pm │
│                          │
│  WR  Chase          0.0  │
│      CIN @ BAL  4:25pm  │
│                          │
│  WR  Lamb          14.3  │
│      DAL @ PHI  Q2 4:18 │
│                          │
│  TE  Kelce          8.4  │
│  FX  Waddle         6.8  │
│  K   Bass           7.0  │
│  DEF PHI            0.2  │
│  ────────────────────────│
│  TOTAL             67.2  │
│                          │
│  ── LIVE FEED ──         │ ← Pull up for more
│  Barkley 8-yd rush TD    │
│  +7.8 pts  1:41pm        │
│                          │
├──────────────────────────┤
│ 🏠  📋  ⚡  📊  👤    │
└──────────────────────────┘
```

**Key mobile gameday decisions:**
- Opponent roster is one swipe away, not side-by-side (not enough screen width)
- Live feed is a collapsible bottom sheet — pull up to see full feed, collapse to focus on roster
- Score bar is ALWAYS visible at top, even when scrolling
- Tap any player to see their game stats in a bottom sheet (not a full page navigation)
- League scoreboard is a horizontal scrolling strip between score bar and roster, or accessible via a "League" toggle

#### Player Card (Mobile)

```
┌──────────────────────────┐
│  ← Back                  │
│                          │
│  [Photo]  Saquon Barkley │
│           RB · PHI · #26 │
│                          │
│  ┌─────┐┌─────┐┌─────┐  │
│  │18.4 ││ 12  ││ RB4 │  │
│  │Pts/G││Games││Rank │  │
│  └─────┘└─────┘└─────┘  │
│                          │
│  THIS WEEK: vs DAL       │
│  Proj: 18.7 pts          │
│  DAL allows 4th-most RB  │
│  pts (22.1/game)         │
│                          │
│  [Overview] [Game Log]   │
│  [Splits]                │
│                          │
│  SEASON STATS            │
│  Rush: 198-1024-8        │
│  Rec:  42-318-2          │
│  FPTS: 220.2 (18.4/gm)  │
│                          │
│  ┌────────┐ ┌────────┐  │
│  │  Drop  │ │ Trade  │  │
│  └────────┘ └────────┘  │
└──────────────────────────┘
```

**Mobile player card principles:**
- Slides up from bottom (bottom sheet), not a page navigation. User stays in context.
- Stat boxes are 3-across (tight but readable)
- Tabs for Overview / Game Log / Splits — swipeable
- Actions (Drop, Trade, Bench) are large tap targets at the bottom
- Dismiss by swiping down or tapping "Back"

#### Prove It (Mobile)

```
┌──────────────────────────┐
│  PROVE IT — WEEK 6       │
│  12 picks available      │
│  Your record: 38-22 W4   │
│                          │
│  Allen pass yds  O/U 275 │
│  ┌────────┐ ┌────────┐  │
│  │ OVER   │ │ UNDER  │  │
│  └────────┘ └────────┘  │
│                          │
│  Barkley rush yds O/U 85│
│  ┌────────┐ ┌────────┐  │
│  │ OVER ✓ │ │ UNDER  │  │ ← Already picked
│  └────────┘ └────────┘  │
│  [Matchup] [Volume]     │ ← Reason chips
│                          │
│  Chase receptions O/U 5.5│
│  ┌────────┐ ┌────────┐  │
│  │ OVER   │ │ UNDER  │  │
│  └────────┘ └────────┘  │
│  ...                     │
│                          │
├──────────────────────────┤
│ 🏠  📋  ⚡  📊  👤    │
└──────────────────────────┘
```

**Mobile picks principles:**
- Big tap targets for Over/Under (thumb-friendly, full width)
- Reason chips appear inline below a pick after it's made, auto-dismiss after 5s
- Already-made picks show with a check mark, tappable to change before lock
- Scrollable list, nothing fancy. Speed is the UX.

### Responsive Breakpoints

```
Mobile:     < 640px    Single column, bottom nav, bottom sheets
Tablet:     640-1024px Two-column where appropriate, side nav optional
Desktop:    > 1024px   Full layouts as shown in main wireframes, top nav
```

**Rule: design for mobile first, then ADD layout complexity for larger screens. Never design desktop first and "shrink" it.**

---

## NOTIFICATION STRATEGY

### The Tension

We said "push nothing, pull everything." That's the right default. But there are moments where a notification is genuinely wanted — and the absence of one would feel like the app isn't paying attention. The trick is making notifications feel like a helpful friend, not a needy app.

### The Opt-In Tiers

Users choose their notification level during onboarding (can change anytime in settings). The default is Tier 1 — minimal.

**Tier 0: Silent**
- Zero push notifications. Ever.
- The app never reaches out. User opens it when they want to.
- Some users want this. Respect it completely.

**Tier 1: Essential Only (Default)**
- Lineup not set and games start in 2 hours
- Waiver results processed (Tuesday morning)
- Trade proposed to you (requires your action)
- That's it. 3 notification types max. All require action from the user.

**Tier 2: Game Alerts**
- Everything in Tier 1, plus:
- Your player scored a TD / big play (during game window only)
- Your matchup lead changed (opponent overtook you, or you overtook them)
- Final score of your matchup
- Max frequency: 1 notification per 10 minutes during games. No spam.

**Tier 3: Full Experience**
- Everything in Tier 2, plus:
- Weekly picks window opens (Wednesday)
- Your pick streak is at risk (picks window closing, you haven't picked)
- Pick results (Monday: "Your Week 6 picks: 5/7 correct")
- Badge earned
- Clutch Rating milestone
- Max frequency: 1 notification per 5 minutes during games, 2-3 per day outside games.

### Notification Design Rules

1. **Every notification must pass the "would I want this?" test.** If the answer is "maybe, depends on my mood" — it's Tier 2 or 3, not Tier 1.

2. **Never stack.** If 3 events happen in 30 seconds (two TDs and a lead change), batch them into one notification: "Barkley TD (+7.8), Allen TD pass (+5.2) — you now lead by 14.2"

3. **Never guilt.** "You haven't made picks this week!" is guilt. "Week 6 picks close in 4 hours — 12 available" is information. The difference matters.

4. **Deep link.** Every notification taps directly to the relevant screen. TD notification → Gameday Portal. Trade notification → Trade review. Never to a generic home page.

5. **Respect time zones and game windows.** No notifications at 2 AM. No "gameday" notifications on a bye week. The system should know when games are happening and only send game-related notifications during those windows.

6. **One-tap mute.** Long-press any notification → "Mute for today" / "Mute this type" / "Change notification level." Never more than one tap to make it stop.

### Notification Cadence Per Week

```
TIER 1 (Default):
  Tuesday AM:    "Waivers processed — you got Chase Brown"
  Thursday 6pm:  "Lineup not set — games start at 8:20" (only if lineup has empty/bye players)
  [No other notifications all week]

TIER 2 (Game Alerts):
  + Sunday 1:05pm:  "Barkley 45-yd rush TD → +10.5 pts"
  + Sunday 2:30pm:  "Tyler just took the lead 78.2–76.1"
  + Sunday 8:15pm:  "FINAL: You win 205.5–148.3 (5-0)"
  [Max ~8-10 notifications on Sunday, 0-1 on other days]

TIER 3 (Full):
  + Wednesday 10am: "Week 7 picks are open — 14 available"
  + Sunday 11pm:    "Your Week 7 picks: 5/7 correct — 89th pctl"
  + Monday 8am:     "You earned the Sharp Shooter badge!"
  [Max ~12-15 notifications per week]
```

### In-App Notifications (The Notification Center)

Separate from push notifications. An in-app feed (bell icon in nav) that captures all activity:
- League activity (trades, waiver results, commissioner actions)
- Pick results
- Badge earned
- Matchup results
- Clutch Rating updates

This feed is always there. It's the pull mechanism. Users who set Tier 0 still see everything here — they just have to open the app to find it.

---

## ONBOARDING — THE FIRST FIVE MINUTES

### The Challenge

A new user lands on Clutch. They might be:
- A fantasy veteran coming from Yahoo/ESPN/Sleeper
- A casual fan who heard about it from a friend
- Someone who just wants to make picks (Tier 5 Picker)
- A commissioner who wants to move their whole league over

Each persona needs a different first 5 minutes. But we can't show 4 different onboarding flows. We need one flow that adapts.

### The Flow

**Step 1: Sign Up (30 seconds)**
- Name, email, password. That's it.
- No fantasy history quiz. No "what sports do you follow?" survey. No personality assessment.
- Optional: "Have a league invite code? [Enter it here]"
- If they have an invite code, skip to Step 3 (they already know why they're here).

**Step 2: What Brings You Here? (Single Tap)**

This is the ONLY onboarding question. It routes the user to the right first experience.

```
┌──────────────────────────────────────┐
│  Welcome to Clutch.                  │
│  What do you want to do first?       │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 🏈 Join or create a league    │  │
│  │ Play fantasy with friends     │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 🎯 Make picks & prove it      │  │
│  │ Test your knowledge weekly    │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 👀 Just looking around        │  │
│  │ Explore the platform          │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

**Route A: "Join or create a league"**
→ League creation flow or join-by-code
→ Lands on League Home
→ They're in fantasy manager mode (Layer 1). Prove It is visible in nav but not highlighted.

**Route B: "Make picks & prove it"**
→ Lands directly on the Prove It page for the current week
→ "Here are this week's picks. Tap to make your call."
→ They start picking immediately. Zero friction.
→ After making 3+ picks, a subtle prompt: "Want to play fantasy too? [Create a league]"

**Route C: "Just looking around"**
→ Lands on the Dashboard / explore page
→ Shows: public leaderboards, trending picks, featured leagues
→ Low commitment. They're browsing.

**Step 3: The First League Experience (Route A users)**

New league member sees:

```
┌──────────────────────────────────────┐
│  Welcome to [League Name]!           │
│                                      │
│  Here's what's happening:            │
│                                      │
│  📋 Your roster has 0 players        │
│     [Draft is scheduled for Mar 15]  │
│     OR                               │
│     [Pick your team now →]           │
│                                      │
│  📊 League has 6 of 8 members        │
│     Share invite: [Copy Link]        │
│                                      │
│  That's it. You're in.              │
│                                      │
│  ── QUICK TIP ──                     │
│  Check the Roster tab to manage      │
│  your team once the draft completes. │
└──────────────────────────────────────┘
```

**What the first experience does NOT include:**
- No tour. No tooltips. No "did you know?" popups. No coach marks.
- No prompt to make picks, rank players, or engage with Layer 2.
- No "complete your profile" nag.
- The user figures out the app by using it. Fantasy managers know what a roster page is.

### Layer 2 Discovery (The Subtle Reveal)

For users who entered via Route A (fantasy league), Layer 2 reveals itself naturally over time:

**Week 1:** Nothing. The user is learning the fantasy management basics. Zero Layer 2 visibility beyond the "Prove It" nav item existing.

**Week 2:** After their first matchup result, a single line appears in the result card:
> "You scored 148.2 this week. Your bench scored 62.4."
That's it. A fact. No CTA.

**Week 3:** After their second matchup, if they had a notable start/sit miss:
> "McLaurin scored 19.1 on your bench — would have been your WR1 this week."
Still just a fact. Still no CTA.

**Week 4:** In the League Home, a small card appears at the bottom (below the fold, must scroll to see):
> "Prove It: Week 4 picks are open. Test your knowledge — no fantasy impact, just bragging rights."
First CTA. But it's below the fold, small, and dismissable (X to close, never shows again if dismissed).

**Week 5+:** If the user has engaged with Prove It, Layer 2 elements start appearing contextually:
- Pick record in their profile
- Streak counter on the Prove It page
- Results in the notification center

**If the user never engages:** Layer 2 stays invisible forever. The small card from Week 4 doesn't come back after dismissal. No reminders. No FOMO tactics. They're a Layer 1 user and that's completely fine.

### Commissioner Onboarding

Commissioners get a few extra touches:
- League setup wizard (format, scoring, roster slots, draft date)
- "Invite your league" with shareable link/code
- Commissioner tools explainer (one page, shows what controls they have)
- Migration helper: "Coming from Yahoo/ESPN? [Import your league]"

The migration helper is the most important tool for growth. If a commissioner can import their Yahoo league (rosters, scoring settings, draft history), switching to Clutch is a one-click decision instead of a rebuild-from-scratch commitment.

---

## IMPLEMENTATION PHASES (with Data Dependencies)

### Phase 1: Fix What Exists (Current Sprint)
**Build:** Roster, matchups, standings, waivers, player cards — fully NFL-aware
**Data needed:** Nothing new (uses existing nflverse 2024 data + scoring pipeline)
**Blocker:** None
**Milestone:** All core fantasy management pages work correctly for the test NFL league

### Phase 2: Gameday Portal (Next Major Build)
**Build:** Live scoring matchup view, side-by-side roster, live feed, league scoreboard
**Data needed:** Live NFL scoring source (1-2 min polling during game windows)
**Blocker:** HIGH — Must select and integrate a live data provider
**Decision needed before starting:** Free (nflverse/ESPN scraping) vs paid (SportsDataIO/SportsRadar)?
**Golf equivalent:** Live tournament leaderboard (DataGolf already provides this, may need higher poll frequency)
**Milestone:** Open the app on Sunday and see your players scoring in real time

### Phase 3: Scoring Detail Page
**Build:** Week-by-week scoring breakdowns, stat lines per player, bench scoring, league weekly rankings
**Data needed:** Player game stat breakdowns (not just fantasy totals — need passing yds, rush yds, etc.)
**Blocker:** LOW — nflverse player_stats has this data, needs parsing into display format
**Golf equivalent:** Already exists via DataGolf round-by-round data
**Milestone:** Tap any completed week and see exactly how each player scored their points

### Phase 4: Prove It + Reward Foundation ✅ COMPLETE
**Build:** Picks interface, reason chips, record tracking, streaks, Clutch Rating v1, badges, leaderboard
**Data needed:** Weekly props/lines (generated from our own statistical models using nflverse data)
**What was built:**
- `nflLineGenerator.js` — weighted-average line generation from NflPlayerGame historical data
- `PropLine` Prisma model — stores generated O/U lines per week per player
- NFL Props tab on ProveIt page with Over/Under buttons, reason chips, week selector
- Props resolution pipeline (checks actual stats, grades predictions, updates reputations + Clutch Rating)
- NFL picks record endpoint, leaderboard endpoint
- Track Record tab updated with sport filter (All/NFL/Golf) and NFL record display
- Badge-aware reputation updates using shared predictionService
- 688 test props generated for 2024 weeks 5-10, 477 resolved

### Phase 5: Expert Tracking + Shareable Cards
**Build:** Expert comparison tracker, delta cards, shareable moment cards, badge milestone cards, trophy case
**Data needed:** Expert rankings (start with Clutch Consensus; named experts require partnerships)
**Blocker:** LOW for consensus, HIGH for named experts
**Shareable cards:** Must be designed for Instagram Stories (1080x1920) AND Twitter (1200x675)
**Milestone:** User shares an "I told you so" card in their group chat

### Phase 6: Week in Review + AI Coaching — ✅ PARTIAL (Review done, AI coaching not started)
**Build:** Decision grading, optimal lineup calc, season trends, Decision DNA, Clutch Rating v2
**Data needed:** 3+ weeks of user data (auto-captured from Phases 1-4)
**What was built:**
- `WeekInReview.jsx` — matchup result, optimal lineup comparison, decision grades, season efficiency trends
- Backend `week-review/:week` endpoint with optimal lineup calc, start/sit grading, efficiency tracking
- Integrated into NflWeeklyScoring page via "Week in Review" toggle button
**Still needed:** AI coaching (Claude API pipeline for natural language insights), Decision DNA

### Phase 7: Preseason Experience
**Build:** Rankings (drag-and-drop), reason chips on moves, stat projections, draft companion, cheat sheet, expert templates
**Data needed:** ADP data (FantasyPros or generated from Clutch users), full player universe by position
**Blocker:** LOW — ADP is publicly available, player universe already in our DB
**Milestone:** A user ranks their top 50 RBs in 15 minutes, gets a personalized cheat sheet, and uses it on draft day

---

*Document created: February 9, 2026*
*Version: 1.3 — Phases 4+6 (partial) implemented: Prove It picks, line generation, Week in Review*
*References: entry-points-addendum.md, data-strategy.md, nfl-expansion.md, brand-system.md*
