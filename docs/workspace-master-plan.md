# CLUTCH WORKSPACE — Master Build Plan
## February 2026 — Research-Backed Strategy & Implementation Roadmap

> **What this doc covers:** The ecosystem vision, data source strategy, the "Start From" pre-loaded board system, full workspace feature spec, and step-by-step build order. Written to be executed immediately.

---

## PART 1: THE ECOSYSTEM VISION — PULL EVERYTHING IN

### The Problem: Fantasy Managers Live Across 6+ Apps

After researching 14 platforms (Sleeper, FantasyPros, ESPN, Yahoo, PFF, Underdog, FantasyLife, 4for4, KeepTradeCut, DynastyProcess, DynastyNerds, Fantrax, FantasyFootballCalculator, DraftSharks), the pattern is obvious: **no single product handles the full fantasy lifecycle.** A typical manager's workflow looks like this:

1. **Sleeper/ESPN/Yahoo** — host the league, draft, set lineups
2. **FantasyPros** — build a cheat sheet, get start/sit advice
3. **KeepTradeCut / FantasyCalc** — check trade values before proposing a trade
4. **PFF** — look up player grades and projections
5. **Twitter / Podcasts** — consume opinions, form takes
6. **Google Sheets / Notes app** — keep personal notes, track sleepers

Every time a user leaves their league platform, that's a broken experience. Sleeper knows this — they have no workspace tools at all (confirmed: no custom rankings, no cheat sheet, no scouting notes). FantasyPros knows this — but they'll always be a layer on top of someone else's league. ESPN and Yahoo have barely tried.

**Clutch's thesis: Build the ecosystem where you never need to leave.** We ARE the league host. We ARE the workspace. We ARE the prediction tracker. Research, prep, draft, manage, prove — all in one place.

### What Users Do Today (Across 6+ Apps) → What Clutch Absorbs

Every row below is an activity users currently scatter across multiple platforms. Clutch pulls each one into a single, native ecosystem — not by copying anyone's features, but by building original software that makes the tab-switching unnecessary.

| Activity | Where users do it today | How Clutch absorbs it |
|----------|------------------------|----------------------|
| **Build personal rankings / cheat sheet** | FantasyPros Cheat Sheet Creator, PFF Rankings Builder, Google Sheets | **Board Editor** — full-screen drag-and-drop with tiers, tags, notes. Pre-loaded with Clutch Rankings so you start full, not empty. |
| **Look up player projections** | FantasyPros ECR, Sleeper defaults, ESPN projections page | **Clutch Rankings** — our own blended projections surfaced everywhere a player appears. Built from free data (Sleeper API + FFC ADP + our metrics). |
| **Check trade values mid-season** | KeepTradeCut, FantasyCalc, DraftSharks | **Clutch Trade Values** — FantasyCalc data + league-context-aware valuation, shown right on the trade proposal screen. No tab switch. |
| **Track sleepers / players to watch** | Notes app, bookmarks, mental list, Sleeper watch list | **Watch List** — star any player anywhere in the app. Persistent across feed, player pages, board editor, draft room. |
| **Remember WHY they liked a player** | Memory, podcast notes, group chat | **Reason Chips + Scouting Notes** — structured decision capture. One-tap chips (Schedule upgrade, Injury risk, Gut feel) that auto-build a decision journal. |
| **Compare opinions to consensus** | FantasyPros ADP page, mock draft results, Reddit | **Divergence Tracking** — built into the board. "You're +8 on Jacobs vs consensus. Here are your biggest bets." |
| **Verify if their takes were right** | Nobody tracks this well. Self-reported Twitter threads. | **Prove It** — already built. Board accuracy scored end-of-season. Reason chip accuracy tracked. Your takes are receipts. |
| **Get draft-day advice in real time** | FantasyPros Draft Assistant ($9/mo), BeatADP Chrome extension | **Board ↔ Draft Room** — your board IS your cheat sheet in the draft room. Tier depletion alerts. Auto-queue from your rankings. |
| **Research player news + stats** | ESPN, Twitter, podcasts, PFF, random Google searches | **Feed + Player Pages + Data Layer** — already built. News, stats, Clutch metrics, course fit — all in-app. |
| **Mock draft to test strategies** | FantasyPros Draft Simulator, Sleeper mock lobby | **Mock Draft Room** — already built (Golf + NFL). Future: use your board as the AI recommendation engine. |

### The Ecosystem Flywheel

Every step feeds the next. Every step lives in Clutch. The user never leaves.

```
RESEARCH (Feed + Player Pages + News)
    → FORM OPINIONS (Board Editor + Reason Chips + Watch List)
        → PREPARE (Divergence Tracking + "Your Biggest Bets")
            → DRAFT (Board as Cheat Sheet + Tier Alerts)
                → MANAGE (Trade Values + Watch List + In-Season Tools)
                    → PROVE IT (Board Accuracy Scored + Reason Chips Graded)
                        → LEARN (AI Coaching from Your Patterns)
                            → RESEARCH BETTER NEXT YEAR
```

### Why This Works (Structural Advantages)

1. **No sync required.** FantasyPros needs you to import your league from ESPN/Yahoo/Sleeper. We already know your roster, your scoring, your opponents. Every tool is league-aware from the start.

2. **Data flows between tools.** Your board rankings inform your draft. Your draft results feed Prove It. Your Prove It track record informs next year's board suggestions. On other platforms, these are disconnected products from different companies.

3. **Research happens in context.** When you're reading a player's news on the Feed, the "Add to Board" button is right there. When you're building your board, the research sidebar shows that player's stats. Context is never lost to a tab switch.

4. **The act of using the platform creates data.** Every board reorder, every reason chip, every watch list star — it's all structured data that feeds the AI coaching layer later. Users get smarter about their own tendencies just by using the tools.

---

## PART 2: DATA SOURCE STRATEGY — THE "START FROM" FOUNDATION

### The Core Insight

> "How do we let them begin this process pre-loaded instead of raw-dogging a master ranking? Start with a projection from someone."

The answer: **free data APIs provide projections and ADP that pre-populate the board. The user adjusts 10-20 players. Their divergences are the interesting data.** This is the FantasyPros model, but native to our platform with free data sources.

### Data Source Stack (All Free, All Legal)

| Data Need | Source | Endpoint | Cost | Legal Status |
|-----------|--------|----------|------|-------------|
| **NFL Projections** (default board rankings) | Sleeper API | `GET https://api.sleeper.app/projections/nfl/{season}/{week}` | Free | No auth, no explicit commercial restriction |
| **NFL ADP** (consensus draft position) | Fantasy Football Calculator | `GET https://fantasyfootballcalculator.com/api/v1/adp/{format}?teams={n}&year={y}` | Free | Commercial use OK with attribution |
| **NFL Trade Values** | FantasyCalc API | `GET https://api.fantasycalc.com/values/current?isDynasty={bool}&numQbs={n}&ppr={v}` | Free | Public endpoint |
| **NFL Historical Stats** | nflverse | Pre-downloaded CSVs (already synced) | Free | Open source |
| **NFL Expected Fantasy Pts** | ffopportunity (nflverse) | Pre-computed GitHub releases | Free | Open source |
| **NFL All Players** | Sleeper API | `GET https://api.sleeper.app/v1/players/nfl` (cache daily, ~5MB) | Free | No auth |
| **NFL Trending Players** | Sleeper API | `GET https://api.sleeper.app/v1/players/nfl/trending/add` | Free | No auth |
| **Golf Projections** | DataGolf API | Existing integration — DG rankings, course fit, skill decomposition | Existing sub | Existing contract |
| **Golf Rankings** | DataGolf API | DG Rankings endpoint (includes OWGR) | Existing sub | Existing contract |
| **Expert Consensus** (future premium) | FantasyPros Partners HQ | Commercial API — `partners@fantasypros.com` | Paid license | Fully legal |

### Rate Limits & Caching Strategy

- **Sleeper API**: Stay under 1,000 calls/min. Cache `/players/nfl` daily (one call). Cache projections per-week.
- **FFC ADP**: No specific rate limit. Cache ADP per-format daily during draft season.
- **FantasyCalc**: No documented rate limit. Cache trade values daily.
- **DataGolf**: Existing caching patterns apply.

### "Start From" Options (What the User Sees)

When creating a new board:

```
BUILD YOUR 2026 BOARD
Choose a starting point (you'll customize from here):

NFL:
  ○ Start from Clutch Rankings (Recommended)
    Blended projections from Sleeper + our own metrics. Auto-updates weekly.
  ○ Start from ADP (consensus draft position)
    Based on thousands of real mock drafts. Updated daily.
  ○ Start from My 2025 Board (carry over last year)
    Your rankings from last season, adjusted for this year's ADP.
  ○ Start from Scratch (blank board)
    Build your own from zero. For the die-hards.

Golf:
  ○ Start from Clutch Rankings (Recommended)
    DataGolf skill estimates + Clutch metrics (CPI, Form, Course Fit).
  ○ Start from OWGR (official world ranking)
  ○ Start from My Last Board
  ○ Start from Scratch
```

### "Clutch Rankings" — Our Blended Default

This is the key product. Not raw Sleeper projections — a **Clutch-branded blend**:

**NFL Clutch Rankings formula:**
1. Fetch Sleeper season projections → calculate projected fantasy points per board's scoring format
2. Fetch FFC ADP for the board's format → convert to rank
3. Blend: 60% projected fantasy points rank + 40% ADP rank (ADP acts as crowd-sourced sanity check)
4. Apply position groupings (top 12 QBs, top 40 RBs, top 40 WRs, top 20 TEs, top 15 K, top 15 DEF)
5. Label it "Clutch Rankings" — never expose "Sleeper projections" or "FFC ADP" to the user

**Golf Clutch Rankings formula:**
1. DataGolf skill estimates (already have DG ranking)
2. Weight by CPI (Clutch Performance Index) + Form Score
3. For event-specific boards: factor in Course Fit score
4. Label it "Clutch Rankings"

**Transformation Rule #1 applies:** Never display raw provider numbers with their label. Always give it a Clutch name. Always blend multiple inputs. Single raw stat = theirs; blended = yours.

### Auto-Sync (FantasyPros "Expert Sync" Equivalent)

The pre-loaded rankings auto-update weekly (or when new data arrives):
- User's manual customizations (reorders, tier breaks, notes, tags) persist
- The underlying baseline shifts as projections change
- UI indicator: "Rankings updated 2h ago — 3 players moved" with a diff view option
- Toggle: "Auto-sync ON/OFF" per board (default ON for "Start From Clutch Rankings", OFF for "Start From Scratch")

---

## PART 3: WORKSPACE FEATURE SPEC

### What Exists Today (Already Built)

| Component | Status | What It Does |
|-----------|--------|-------------|
| `DraftBoard` / `DraftBoardEntry` Prisma models | Done | Board + entries with rank, tier, notes |
| `draftBoardService.js` | Done | CRUD + enrichment (ClutchScore for golf, fantasy PPG for NFL) |
| `draftBoards.js` routes | Done | 8 REST endpoints (list, create, get, update, delete, bulk save, add entry, remove entry, update notes) |
| `useDraftBoardEditor.js` hook | Done | Load board, auto-save (1.5s debounce), moveEntry, addPlayer, removePlayer, updateNotes, insertTierBreak, removeTierBreak |
| `useDraftBoards.js` hook | Done | List all boards |
| `BoardHeader.jsx` | Done | Board title/meta display |
| `BoardEntryRow.jsx` | Done | Player row with CPI/Form (golf), Fantasy PPG (NFL), drag handle |
| `TierBreak.jsx` | Done | Tier divider between rows |
| `PlayerSearchPanel.jsx` | Done | Search + add players to board |
| `PlayerNoteEditor.jsx` | Done | Inline note editing |
| `AddToBoardModal.jsx` | Done | Add player from any page to any board |
| Dashboard "My Boards" widget | Done | Shows 3 recent boards on dashboard |
| MobileNav "Boards" tab | Done | Bottom nav links to /workspace |
| Player pages "Add to Board" buttons | Done | Golf PlayerProfile + NFL NflPlayerDetail |
| Mock Draft Recap "Import to Board" | Done | Creates board from mock draft results |

### What Needs to Be Built

The workspace is organized into **6 build steps**, each shippable independently.

---

### Step 4A: "Start From" Board Creation + Data Pipeline

**The foundation.** Users can create boards pre-loaded with projections instead of starting empty.

#### Backend: Projection Sync Service

**New file:** `backend/src/services/projectionSync.js`

```
Responsibilities:
- fetchSleeperProjections(season, week) → normalized player projections
- fetchSleeperPlayers() → full player list with metadata (cache daily)
- fetchFfcAdp(format, teams, year) → ADP data
- fetchFantasyCalcValues(isDynasty, numQbs, ppr) → trade values
- computeClutchRankings(sport, scoringFormat, season) → blended rankings
- getCachedRankings(sport, scoringFormat) → return from cache or recompute
```

**Caching:** Store computed rankings in a new `ClutchProjection` model or in-memory cache (Redis when available, Map for now). Refresh via cron:
- NFL: Daily at 6 AM ET during season, weekly during offseason
- Golf: After each DataGolf sync (Monday mornings)

**New Prisma model:**
```prisma
model ClutchProjection {
  id             String   @id @default(cuid())
  sport          String   // nfl, golf
  scoringFormat  String   // ppr, half_ppr, standard
  season         Int
  week           Int?     // null = season-long
  playerId       String
  player         Player   @relation(fields: [playerId], references: [id])
  projectedPts   Float?
  adpRank        Int?
  clutchRank     Int
  tradeValue     Int?
  metadata       Json?    // raw inputs for transparency
  computedAt     DateTime @default(now())

  @@unique([sport, scoringFormat, season, week, playerId])
  @@index([sport, scoringFormat, season, clutchRank])
  @@map("clutch_projections")
}
```

#### Backend: "Start From" Board Creation

**Modified:** `draftBoardService.js` — `createBoard()` accepts optional `startFrom` param

```
createBoard(userId, { name, sport, scoringFormat, boardType, season, startFrom })

startFrom options:
  - "clutch"   → load ClutchProjection rankings for this sport/format/season
  - "adp"      → load FFC ADP rankings only
  - "previous" → copy entries from user's most recent board in this sport
  - "scratch"  → empty board (current behavior)
  - "mock:{id}" → already handled by mock draft import

When startFrom is "clutch" or "adp":
  1. Fetch ranked players from ClutchProjection or ADP cache
  2. Filter by boardType (overall: top 200, qb: top 30, rb: top 60, etc.)
  3. Create DraftBoardEntry for each with rank and auto-computed tiers
  4. Auto-tier: insert tier breaks using natural breakpoints in projected pts
```

#### Frontend: Enhanced Board Creation Flow

**New page:** `frontend/src/pages/WorkspaceHome.jsx` at `/workspace`

Currently there's no workspace landing page. This becomes the hub:
- Board list (existing `useDraftBoards` hook)
- "Create New Board" CTA → opens creation modal
- Sport tabs (NFL / Golf)
- Sort: Recent / Name / Season

**New component:** `frontend/src/components/workspace/CreateBoardModal.jsx`

Multi-step creation:
1. **Name & Sport** — board name, sport selector (NFL/Golf)
2. **Scoring Format** — PPR/Half PPR/Standard (NFL), or N/A (Golf)
3. **Start From** — the 4 options with descriptions
4. **Create** → redirects to board editor with pre-loaded entries

#### Frontend: Board Editor Page

**New page:** `frontend/src/pages/BoardEditor.jsx` at `/workspace/:boardId`

The main workspace experience. Full-screen editor (uses `h-[calc(100vh-64px)]` like mock draft room):

**Left panel (70%):** The board
- Drag-and-drop player rows (DnD Kit or similar)
- Tier breaks between groups
- Each row shows: rank #, player name, team, position badge, key stat (fantasy PPG / CPI), ADP comparison (green +3 / red -2), tag pills, note indicator
- Hover/long-press: quick actions (add note, add tag, remove)
- "Divergence alerts": when auto-sync shifts a player's baseline, highlight the row briefly

**Right panel (30%):** Research sidebar
- Tabs: Search | Available | Stats
- **Search tab**: find and add players (existing PlayerSearchPanel, enhanced)
- **Available tab**: top unranked players by projected points — easy "who am I missing?"
- **Stats tab**: when a board row is selected, show that player's full stat card (season stats, matchup, injuries, news)

**Top bar:**
- Board name (editable inline)
- Sport badge + scoring format
- Position filter pills: All | QB | RB | WR | TE | K | DEF (NFL) / All (Golf)
- Auto-save indicator ("Saved 5s ago" / "Saving...")
- Auto-sync toggle
- Share / Export dropdown

---

### Step 4B: Tags System

**Modeled after FantasyPros' tag system but enhanced with Clutch reason chips.**

#### Schema Addition

Add `tags` field to `DraftBoardEntry`:

```prisma
// Add to DraftBoardEntry model:
tags  Json?  // ["target", "sleeper", "avoid", "breakout", "injury_risk"]
```

Alternatively, store tags as a string array (Prisma `String[]` on PostgreSQL).

#### Default Tags

Three default tag types (like FantasyPros):
- **Target** (green) — player you're actively targeting in drafts
- **Sleeper** (gold) — undervalued player you think will outperform ADP
- **Avoid** (red) — player you're fading regardless of value

#### Reason Chips (from entry-points-addendum.md)

When a user moves a player UP or DOWN from their starting position, a subtle chip row appears. These are structured tags that feed into future AI coaching:

**Positive chips:** Schedule upgrade, New OC/scheme, Volume increase, Less competition, Contract year, O-line improvement, Target share increase, Game script advantage, Breakout candidate

**Negative chips:** Age decline, Injury risk, Scheme downgrade, More competition, Schedule downgrade, O-line decline, Negative game script, Regression candidate, Coaching change

**Source chips:** Gut feel, Podcast/show, Article/analysis, Game film, Statistical model, Friend/league mate

Store on the entry: `{ tags: ["target"], reasonChips: ["schedule_upgrade", "volume_increase"], reasonSource: "gut_feel" }`

#### Frontend

- One-tap tag toggle on each row (Target/Sleeper/Avoid pills)
- Reason chip row appears on move (auto-dismisses after 5 seconds if ignored)
- Filter board by tag: "Show only Targets" / "Show only Sleepers"

---

### Step 4C: Divergence Tracking & ADP Comparison

This is where Clutch's board becomes more than a ranking — it becomes a tracked opinion.

#### What Gets Tracked

For every board entry:
- `clutchRankAtCreation` — the Clutch/ADP rank when the player was first placed
- `userRank` — where the user actually ranked them
- `divergence` — `clutchRankAtCreation - userRank` (positive = user is higher on player)

#### Display

Each row shows a divergence indicator:
- Green `+3` = user ranks them 3 spots higher than Clutch baseline
- Red `-5` = user ranks them 5 spots lower than Clutch baseline
- Gray `—` = user agrees with baseline (within 1 spot)

#### "Your Divergences" Summary Card

At the top of the board or in a collapsible panel:
```
YOUR BIGGEST BETS
Players you disagree with most vs Clutch Rankings:
  ↑ Josh Jacobs  +8 spots  (You: RB5, Clutch: RB13)
  ↑ Keenan Allen +6 spots  (You: WR22, Clutch: WR28)
  ↓ De'Von Achane -7 spots (You: RB14, Clutch: RB7)

These are your value targets and fades on draft day.
```

This directly implements the insight from `entry-points-addendum.md` — the divergences are the most interesting data points.

---

### Step 5: Watch List + Position Rankings

#### Watch List

A separate lightweight list (not a board). Like Sleeper's watch list — a star/bookmark for quick tracking.

**How it differs from a board:**
- No ranking, no tiers, no drag-and-drop
- Just a list of players you're monitoring
- Persistent across the platform — star a player on their profile page, on the feed, on a leaderboard
- Watch list appears as a sidebar in the board editor and the draft room

**Schema:**
```prisma
model WatchListEntry {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  playerId  String
  player    Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)
  sport     String
  note      String?  @db.VarChar(280)
  createdAt DateTime @default(now())

  @@unique([userId, playerId])
  @@index([userId, sport])
  @@map("clutch_watch_list")
}
```

**Frontend:**
- Star icon on player rows everywhere (feed cards, player pages, leaderboards, board editor search)
- `/workspace/watch-list` page showing all watched players with real-time stats
- Watch list sidebar in board editor: "Players you're watching that aren't on this board yet"

#### Position Rankings Boards

A variation of the existing board — one board per position. Created automatically when you make an "Overall" board:

- Overall board is the master
- Position boards (QB, RB, WR, TE) are filtered views
- Changes in a position board reflect in the overall board and vice versa
- Tab navigation between them (matching FantasyPros Cheat Sheet Creator UX)

This is mostly a frontend UX pattern — the backend already supports `boardType` field.

---

### Step 6: Scouting Notes + Decision Journal

#### Enhanced Notes

Upgrade the existing `notes` field from plain text to structured notes:

**New component:** `ScoutingNoteEditor.jsx`
- Rich text (basic markdown: bold, italic, bullet lists)
- Max 500 characters
- Timestamps on each note revision
- "Source" tag (same as reason chips: gut feel, podcast, article, film, model)

#### Decision Journal

A read-only aggregation page that shows all your notes, tags, and reason chips chronologically:

**Page:** `/workspace/journal`

```
YOUR DECISION JOURNAL — 2026 NFL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Feb 15: Created board "My 2026 NFL Board" from Clutch Rankings
Feb 15: Moved Josh Jacobs ↑8 spots. Tags: [Target] [Schedule upgrade] [Volume increase]
Feb 15: Added note on Jacobs: "GB schedule is cake, Dillon gone, he's the bellcow"
Feb 18: Moved Keenan Allen ↑6 spots. Tags: [Sleeper] [New OC/scheme]
Mar 2: Auto-sync: Projections updated. 5 players shifted. Your customizations preserved.
Mar 2: Moved Achane ↓7 spots. Tags: [Avoid] [Injury risk] [More competition]
...
```

After the season, this journal becomes the AI coaching input:
- "Your 'schedule upgrade' chips hit 71% of the time"
- "Your 'gut feel' picks were 64% accurate — better than your 'podcast' picks at 51%"
- "You add +4% accuracy when you override consensus. Trust your instincts."

---

## PART 4: WORKSPACE → DRAFT ROOM CONNECTION

This is the killer integration that no competitor has natively.

### Board as Cheat Sheet in Draft Room

When entering the mock draft room (or a live league draft):
- User selects which board to use as their cheat sheet
- The board appears as a sidebar/panel in the draft room
- As players get drafted, they're crossed off the board in real-time
- **Tier depletion alerts**: "Only 1 player left in your Tier 2 RBs — grab one now"
- Pick suggestions come from the user's board, not generic ADP
- Post-draft: automatic grade against the user's own board rankings

### Mock Draft → Board Pipeline (Already Partially Built)

- Mock Draft Recap "Import to Board" ✓ (already built)
- Future: "Draft Again Using My Board" — mock draft AI uses your board rankings as its model for recommendations

### Board → Live Draft (Future)

When Clutch hosts live league drafts:
- Board becomes the live cheat sheet
- One-click "queue" players from your board
- Auto-queue top remaining player from your board if timer expires

---

## PART 5: WORKSPACE → FEED → PROVE IT CONNECTIONS

### Feed → Workspace

- Feed cards for players on your board get a gold border + "On Your Board" badge
- Breaking news about a player on your board triggers a push notification: "Josh Jacobs (Your Board: RB5) — MRI results negative, expected to play Week 1"
- Feed card actions include "Add to Board" (already built via AddToBoardModal)

### Workspace → Prove It

- Board rankings feed the prediction engine: "Your board says Jacobs is RB5 this season. Want to make it a Performance Call?"
- "Prove Your Board" one-click action: converts your top divergences into prediction calls
- End-of-season: board accuracy scored (Spearman rank correlation) and posted to Prove It profile

### Prove It → Workspace

- Prediction track record informs board suggestions: "Last year you were 78% accurate on WR rankings. You struggled with TEs (52%). Consider starting from Clutch Rankings for TEs."

---

## PART 6: BUILD ORDER

### Step 4A: "Start From" Board Creation + Board Editor Page
**Priority: HIGH — This is the next build.**

1. `projectionSync.js` service + Sleeper API + FFC ADP integration
2. `ClutchProjection` Prisma model + migration
3. Projection sync cron job
4. Enhanced `createBoard()` with `startFrom` param
5. `WorkspaceHome.jsx` — workspace landing page
6. `CreateBoardModal.jsx` — multi-step board creation with "Start From" options
7. `BoardEditor.jsx` — full-screen board editor with drag-and-drop + research sidebar

**Files:**
- New: `backend/src/services/projectionSync.js`
- New: `frontend/src/pages/WorkspaceHome.jsx`
- New: `frontend/src/pages/BoardEditor.jsx`
- New: `frontend/src/components/workspace/CreateBoardModal.jsx`
- New: `frontend/src/components/workspace/ResearchSidebar.jsx`
- Modified: `backend/prisma/schema.prisma` (ClutchProjection model)
- Modified: `backend/src/services/draftBoardService.js` (startFrom logic)
- Modified: `backend/src/index.js` (projection sync cron)
- Modified: `frontend/src/App.jsx` (routes)

### Step 4B: Tags + Reason Chips
**Priority: HIGH — Ships with board editor.**

1. Add `tags` and `reasonChips` fields to DraftBoardEntry
2. Tag toggle pills on BoardEntryRow
3. Reason chip row (appears on move, auto-dismisses)
4. Tag filter on board
5. Update auto-save to persist tags/chips

**Files:**
- Modified: `backend/prisma/schema.prisma` (tags, reasonChips fields)
- Modified: `frontend/src/components/workspace/BoardEntryRow.jsx`
- New: `frontend/src/components/workspace/ReasonChipRow.jsx`
- New: `frontend/src/components/workspace/TagFilterBar.jsx`
- Modified: `frontend/src/hooks/useDraftBoardEditor.js` (tag/chip mutations)

### Step 4C: Divergence Tracking
**Priority: MEDIUM — Ships with or shortly after board editor.**

1. Track `baselineRank` on each entry when created from a template
2. Compute and display divergence on each row
3. "Your Biggest Bets" summary card
4. Divergence data stored for end-of-season scoring

**Files:**
- Modified: `backend/prisma/schema.prisma` (baselineRank on DraftBoardEntry)
- Modified: `frontend/src/components/workspace/BoardEntryRow.jsx`
- New: `frontend/src/components/workspace/DivergenceSummary.jsx`

### Step 5: Watch List + Position Views
**Priority: MEDIUM**

1. WatchListEntry Prisma model + migration
2. Watch list API routes (add, remove, list)
3. Star icon on player components platform-wide
4. Watch list page at `/workspace/watch-list`
5. Watch list sidebar in board editor
6. Position tab navigation on board editor

**Files:**
- Modified: `backend/prisma/schema.prisma` (WatchListEntry model)
- New: `backend/src/routes/watchList.js`
- New: `frontend/src/hooks/useWatchList.js`
- New: `frontend/src/pages/WatchList.jsx`
- New: `frontend/src/components/workspace/WatchListSidebar.jsx`
- Modified: Multiple player display components (star icon)

### Step 6: Scouting Notes + Decision Journal
**Priority: MEDIUM-LOW**

1. Enhanced note editor with markdown + source tags
2. Note history tracking
3. Decision Journal page at `/workspace/journal`
4. Chronological view of all workspace actions

**Files:**
- New: `frontend/src/components/workspace/ScoutingNoteEditor.jsx`
- New: `frontend/src/pages/DecisionJournal.jsx`
- Modified: `backend/src/services/draftBoardService.js` (note metadata)

### Step 7 (Future): Board ↔ Draft Room Integration
**Priority: LOW — After draft room upgrades**

1. Board selector in draft room
2. Real-time cross-off as players are drafted
3. Tier depletion alerts
4. Post-draft grade against user's board
5. "Draft Again Using My Board" in mock draft room

---

## PART 7: DATA PIPELINE IMPLEMENTATION DETAILS

### Sleeper API Integration

```javascript
// projectionSync.js — key functions

const SLEEPER_BASE = 'https://api.sleeper.app'

async function fetchSleeperPlayers() {
  // Cache this — 5MB response, call once daily max
  const res = await fetch(`${SLEEPER_BASE}/v1/players/nfl`, { cache: 'no-store' })
  return res.json()
}

async function fetchSleeperProjections(season, week = 0) {
  // week=0 for season-long projections
  const positions = ['QB','RB','WR','TE','K','DEF']
  const params = positions.map(p => `position[]=${p}`).join('&')
  const url = `${SLEEPER_BASE}/projections/nfl/${season}/${week}?season_type=regular&${params}`
  const res = await fetch(url, { cache: 'no-store' })
  return res.json()
}
```

### FFC ADP Integration

```javascript
const FFC_BASE = 'https://fantasyfootballcalculator.com/api/v1'

async function fetchFfcAdp(format = 'ppr', teams = 12, year = 2026) {
  const res = await fetch(`${FFC_BASE}/adp/${format}?teams=${teams}&year=${year}`, { cache: 'no-store' })
  return res.json()
}
```

### Blended Ranking Computation

```javascript
async function computeClutchRankings(sport, scoringFormat, season) {
  if (sport === 'nfl') {
    // 1. Get Sleeper projections
    const projections = await fetchSleeperProjections(season)

    // 2. Calculate fantasy points per player using our nflScoringService
    const ranked = Object.entries(projections)
      .map(([sleeperId, proj]) => ({
        sleeperId,
        projectedPts: calculateProjectedPts(proj, scoringFormat),
      }))
      .filter(p => p.projectedPts > 0)
      .sort((a, b) => b.projectedPts - a.projectedPts)

    // 3. Get ADP from FFC
    const adp = await fetchFfcAdp(scoringFormat, 12, season)

    // 4. Blend: 60% projection rank + 40% ADP rank
    // 5. Map Sleeper IDs to our Player IDs
    // 6. Store in ClutchProjection table
  }

  if (sport === 'golf') {
    // Use existing DataGolf rankings + ClutchScore (CPI, Form)
    // Already computed in clutchMetrics.js
  }
}
```

### Player ID Mapping (Sleeper ↔ Clutch)

The existing `Player` model has a `sleeperId` column. For players that don't have one yet:
1. Match by name + team (Sleeper player data includes `full_name` and `team`)
2. Store the Sleeper ID on match
3. Log unmatched players for manual review

---

## PART 8: MOBILE UX PRIORITIES

The workspace must be fully functional on mobile — this is where Clutch beats FantasyPros (desktop-heavy tool).

### Board Editor on Mobile

- Full-width card list (no side panel)
- Long-press + drag to reorder (no tiny drag handles)
- Swipe left on row → actions (tag, note, remove)
- Swipe right → quick add to watch list
- Research panel slides up from bottom (sheet pattern)
- Reason chips: horizontal scroll, thumb-sized targets
- "Create Board" flow: full-screen steps, not a modal

### Watch List on Mobile

- Star button on every player card across the app
- Badge count on "Boards" tab shows watch list additions
- Watch list page: simple card list with swipe-to-remove

---

## VERIFICATION CHECKLIST

After building each step, verify:

- [ ] Board creation with "Start From Clutch Rankings" → pre-populated with 200+ ranked NFL players
- [ ] Board creation with "Start From ADP" → pre-populated from FFC data
- [ ] Drag-and-drop reorder works on desktop and mobile
- [ ] Tier breaks insert and remove correctly
- [ ] Auto-save triggers after 1.5s of inactivity
- [ ] Tags (Target/Sleeper/Avoid) toggle and persist
- [ ] Reason chips appear on move, auto-dismiss, and save
- [ ] Divergence indicators show correct +/- vs baseline
- [ ] Player search finds players and adds them to the board
- [ ] Research sidebar shows selected player stats
- [ ] "Add to Board" from player pages opens AddToBoardModal
- [ ] Dashboard "My Boards" widget shows recent boards
- [ ] Mobile bottom nav "Boards" tab works
- [ ] Watch list star appears on player components
- [ ] Board auto-syncs with updated projections (toggle ON)
- [ ] No N+1 queries on board load (batch enrichment)

---

*Created: February 10, 2026*
*Research sources: Sleeper, FantasyPros, ESPN, Yahoo, PFF, Underdog, FantasyLife, 4for4, KeepTradeCut, DynastyProcess, DynastyNerds, Fantrax, FantasyFootballCalculator, DraftSharks, nflverse*
*This document should be read alongside: CLAUDE.md, docs/CLUTCH_STRATEGY_UPDATE_FEB2026.md, docs/entry-points-addendum.md*
