# CLUTCH SPORTS — Strategic Update: Feed + Workspace Architecture
## February 2026 — Priority Revision for Claude Code

> **Context:** This document updates the build roadmap based on new product strategy work. The core insight: Clutch needs a reason for users to visit OUTSIDE of active fantasy seasons. The solution is a three-pillar architecture (Feed + Workspace + Prove It) that adapts to the sports calendar and serves six distinct user personas. This document should be read alongside the existing build specs and CLAUDE.md.

---

## WHAT CHANGED AND WHY

### The Problem We're Solving
Users look at Clutch during the offseason and think "what's the point right now?" The platform was built around participation (leagues, picks, predictions) but had no answer for the question: **"Why would I open this app on a Tuesday in March?"**

### The Answer: Three Pillars

```
┌─────────────────────────────────────────────────────┐
│                    CLUTCH SPORTS                     │
│                                                     │
│   ┌─────────┐    ┌─────────────┐    ┌────────────┐ │
│   │  FEED   │    │  WORKSPACE  │    │  PROVE IT  │ │
│   │         │    │             │    │            │ │
│   │ Why you │    │ Where your  │    │ Where your │ │
│   │ open    │    │ work lives  │    │ reputation │ │
│   │ the app │    │             │    │ lives      │ │
│   └────┬────┘    └──────┬──────┘    └─────┬──────┘ │
│        │                │                  │        │
│        └────────────────┼──────────────────┘        │
│                         │                           │
│              ┌──────────┴──────────┐                │
│              │    DATA LAYER       │                │
│              │  Player pages,      │                │
│              │  team pages,        │                │
│              │  stat leaderboards, │                │
│              │  historical data    │                │
│              └─────────────────────┘                │
└─────────────────────────────────────────────────────┘
```

**Feed** = Personalized content stream (why you open the app daily)
**Workspace** = Interactive tools for analysis and prep (why you stay)
**Prove It** = Prediction tracking and reputation (why you come back)
**Data Layer** = Player pages, stats, leaderboards (foundation everything sits on)

---

## THE SIX USER PERSONAS

Every feature should answer: "Which persona is this for?"

### 1. THE INFORMED FAN ⭐ (Primary Target)
- Plays 1-2 leagues, watches a lot of football, knows more than average
- Wants: Start/sit help, simple player lookups, bragging rights
- Doesn't want: Advanced analytics jargon, deep research tools
- Peak engagement: In-season (Sep-Jan), draft prep (Aug)
- Player page default: Clean stats, matchup rating, community consensus
- Feed emphasis: Team news, injury alerts, weekly matchup previews, waiver wire

### 2. THE GRINDER
- Plays 3-5+ leagues, knows advanced stats, wants to prove they're elite
- Wants: Raw data access, filterable leaderboards, global competition
- Doesn't want: Simplified recommendations — they want tools, not opinions
- Peak engagement: Year-round but daily during season
- Player page default: Full stat dashboard with advanced metrics visible
- Feed emphasis: Stat alerts, trending players, community rankings, data drops

### 3. THE CONTENT CREATOR / ANALYST
- Has a podcast/YouTube/Twitter following, credibility is their currency
- Wants: Verified track record, beautiful public profile, discoverability
- Doesn't want: To manage leagues on Clutch — they want the credibility platform
- Peak engagement: Year-round (always making picks for their profile)
- Player page: Same as Grinder + their own published takes visible
- Feed emphasis: Community activity, follower engagement, content tools

### 4. THE BETTOR
- Primarily interested in player props and game lines
- Wants: Prop projections vs book lines, value analysis, accuracy tracking
- Doesn't want: Fantasy league management, social features
- Peak engagement: In-season (Wed-Sun), dormant off-season
- Player page: Prop lines, historical prop performance, matchup data
- Feed emphasis: Prop movement, value alerts, results tracking

### 5. THE DYNASTY NERD
- Thinks in 3-year windows, plays keeper/dynasty leagues
- Wants: Rookie evaluations, trade values, age curves, career trajectories
- Doesn't want: Weekly start/sit, short-term analysis
- Peak engagement: OFFSEASON IS THEIR PEAK (Feb-May). Also active year-round
- Player page: Career arc emphasis, dynasty trade value, contract status
- Feed emphasis: Draft intel, FA analysis, career milestones, trade values
- **THIS PERSONA IS THE OFF-SEASON ANSWER. They never stop.**

### 6. THE SPORTS DEBATER
- Lives for being right and proving others wrong
- Wants: Bold prediction tracking, shareable receipts, argument-settling
- Doesn't want: Deep analysis, league management
- Peak engagement: Around bold prediction windows and result reveals
- Player page: Simplified — focused on "make a call" and community consensus
- Feed emphasis: Bold call results, hot takes leaderboard, receipts

---

## THE CLUTCH FEED — Specification

### What It Is
A personalized, always-updating stream of data-driven content tailored to the user's teams, interests, and the current sports calendar. NOT articles. NOT opinions. Data events, stat movements, automated insights, community activity, and news — all auto-generated from data pipelines.

Think Bloomberg Terminal meets Apple News for fantasy sports.

### Onboarding: Interest Selection
On signup (or accessible in settings), users configure:
- **Favorite teams** (multi-select with team logos)
- **Interests** (checkboxes: NFL Draft, Dynasty, Player Props, Weekly Fantasy, Golf, etc.)
- **Favorite players** (optional search + follow)
- **Follow analysts** (optional — shows top-rated Clutch users)

This takes 30-60 seconds and immediately personalizes the Feed.

### Feed Content Types (All Auto-Generated)

| Content Type | Data Source | Trigger | Example Card |
|-------------|-------------|---------|-------------|
| **Team News** | Public news/transaction APIs | New signing, trade, cut | "Ravens sign FA edge rusher — projected defensive impact: +1.2 pressure rate" |
| **Stat Alerts** | nflfastR computed trends | Significant stat movement | "Lamar Jackson rushing volume down 19% YoY — age curve analysis" |
| **Prop Movement** | Odds API | Line moves >1 point | "Mahomes passing yards moved from 278.5 to 285.5 — here's why" |
| **Draft Intel** | Mock draft aggregation + cfbfastR | New mocks, combine results | "Consensus QB1 shifted — 3 new mocks tracked this week" |
| **Community Activity** | Clutch user data | Top analyst publishes | "Top-rated analyst @SharpEdge published 2026 Dynasty Top 50" |
| **Workspace Nudges** | User's own data | Unranked players, stale board | "3 new rookies since you last updated your draft board" |
| **Injury Updates** | Public injury reports | Status change | "Player X ruled OUT — fantasy and prop impact analysis" |
| **Matchup Previews** | nflfastR + schedule | Weekly (in-season) | "Ravens vs Bengals: key stats, historical matchup data" |
| **Career Milestones** | Historical data | Milestone reached | "Player X passed 10,000 career yards — trajectory analysis" |
| **Value Alerts** | Clutch model vs odds | Model disagrees with books | "Clutch model sees +EV on this player prop" |
| **Bold Call Results** | Prove It system | Prediction resolved | "Your bold call from Week 3 was CORRECT ✅" |
| **Golf Previews** | DataGolf + schedule | Tournament week | "Genesis Invitational field set — 3 of your tracked players entered" |

### Feed Card Anatomy
Every feed card should have:
```
┌────────────────────────────────────────────────────────┐
│ [ICON/CATEGORY]  [HEADLINE]                [TIMESTAMP] │
│                                                        │
│ [2-3 lines of data-driven context — not opinion,       │
│  always grounded in specific numbers or facts]         │
│                                                        │
│ [ACTION LINK 1 →]  [ACTION LINK 2 →]                  │
└────────────────────────────────────────────────────────┘
```

Action links always drive deeper into the platform:
- "View Player Page →" (Data Layer)
- "Update Your Rankings →" (Workspace)
- "Make a Call →" (Prove It)
- "Compare to Yours →" (Workspace)
- "Save to Notes →" (Workspace)

### Feed Filtering
Users can filter their feed by:
- All / By Sport (NFL, Golf) / By Team / By Topic (Draft, Props, Dynasty)
- Default: All (personalized by their interest selections)

### Feed Seasonality
The Feed automatically adjusts content weight based on the sports calendar. See the Seasonal Flywheel section below for the full month-by-month breakdown.

---

## THE WORKSPACE — Specification

### What It Is
Interactive tools where users BUILD, DEVELOP, and REFINE their own analysis. This is where their WORK lives — draft boards, rankings, scouting notes, watch lists. Because their work lives on Clutch, they keep coming back to Clutch.

The Feed brings you in. The Workspace keeps you.

### Workspace Tool 1: My Draft Board
**Purpose:** Pre-season player rankings with personal notes, drag-and-drop reordering, and divergence alerts vs community consensus.

**Features:**
- Drag-and-drop player ranking (full position list or overall)
- Per-player notes field (free-form text — "Elite target share. Only concern is QB health.")
- Scoring format toggle (PPR / Half-PPR / Standard) — changes default sort
- Tier break markers (user can insert tier dividers between players)
- Divergence alerts: "You have Player X 12 spots higher than community average"
- Import from last year (carry forward and adjust)
- Share / Export options (shareable link, PDF cheat sheet, printable)
- Auto-sync with Prove It: when published, rankings become trackable predictions

**When it's used:** February through August (peak in July-August draft season)

**Database:**
```sql
clutch_draft_boards
- id
- user_id
- name (e.g., "My 2026 PPR Board")
- scoring_format (ppr | half_ppr | standard)
- sport (nfl | golf)
- season (2026)
- is_published (boolean — when true, feeds into Prove It)
- published_at (timestamp — locked for accuracy tracking)
- created_at
- updated_at

clutch_draft_board_entries
- id
- board_id (FK → clutch_draft_boards)
- clutch_player_id (FK → clutch_players)
- rank (integer — user's ranking position)
- tier (integer — which tier this player is in, nullable)
- notes (text — user's personal notes on this player)
- created_at
- updated_at

clutch_draft_board_history
- id
- board_id
- clutch_player_id
- old_rank
- new_rank
- changed_at
(Track movement over time for "your board evolution" features later)
```

### Workspace Tool 2: My Watch List
**Purpose:** Lightweight tracker for players you're monitoring but haven't ranked yet.

**Features:**
- Add any player with one click
- Feed alerts when something happens to watched players
- Quick-add to draft board or position rankings
- Notes field per player
- Organized by sport, filterable

**When it's used:** Year-round (low-commitment engagement tool)

**Database:**
```sql
clutch_watch_list
- id
- user_id
- clutch_player_id
- sport
- notes (text, nullable)
- alert_preferences (jsonb — what triggers notifications)
- created_at
```

### Workspace Tool 3: My Position Rankings
**Purpose:** Separate from draft board — analytical position-by-position rankings.

**Features:**
- QB / RB / WR / TE separate ranking lists
- Drag-and-drop reorder with notes
- Tier breaks
- Compare to consensus at any time
- Can be published to Clutch profile (becomes content + Prove It trackable)

**When it's used:** Year-round for Dynasty users, pre-season for others

**Database:** Uses same clutch_draft_boards / clutch_draft_board_entries tables with a `board_type` field (overall | qb | rb | wr | te)

### Workspace Tool 4: My Scouting Notes
**Purpose:** Free-form notebook for research, organized by player/team/topic.

**Features:**
- Create notes organized by: Player, Team, or custom Topic
- Attach data from the platform (link to a stat, chart, comparison)
- Private by default, shareable if desired
- Search across all notes
- Tag system for organization

**When it's used:** Year-round for Dynasty Nerds, pre-draft for Grinders

**Database:**
```sql
clutch_scouting_notes
- id
- user_id
- title
- content (rich text / markdown)
- note_type (player | team | topic | general)
- linked_player_id (nullable FK)
- linked_team_id (nullable FK)
- tags (text array)
- is_public (boolean, default false)
- created_at
- updated_at
```

---

## THE SEASONAL FLYWHEEL — What the Feed Emphasizes When

### Month-by-Month Platform Behavior

**FEBRUARY** (Current month — build for this NOW)
- Feed: Super Bowl aftermath, free agency speculation, team needs analysis, combine preview
- Workspace: Dynasty rankings refresh, watch list building
- Prove It: "Bold Offseason Predictions" opens
- Primary personas active: Dynasty Nerd, Grinder, Debater

**MARCH** — Free Agency + Combine
- Feed: REAL-TIME FA signings with fantasy/dynasty impact, combine results + athletic profiles, team roster changes, updated dynasty values
- Workspace: Draft board creation begins, FA impact notes, prospect scouting from combine
- Prove It: "Who predicted the landing spot" tracking
- Primary: Dynasty Nerd, Grinder, Debater
- 🔥 HIGH ENGAGEMENT — news is breaking daily

**APRIL** — NFL Draft
- Feed: Pick-by-pick with fantasy analysis, landing spot grades, rookie rankings, post-draft team outlook
- Workspace: Rookies auto-added to draft board for ranking, dynasty boards updated with draft capital
- Prove It: Draft prediction results, season-long contest starts opening
- Primary: ALL — Draft is the offseason Super Bowl
- 🔥🔥 PEAK OFFSEASON ENGAGEMENT

**MAY** — Post-Draft + OTAs
- Feed: Rookie OTA reports, depth chart projections, schedule release analysis
- Workspace: Season-long prediction contest OPENS, full projection rankings buildable
- Prove It: Prediction contest submission period begins
- Primary: Dynasty Nerd, Grinder
- ⛳ Golf in full swing — cross-sport engagement

**JUNE-JULY** — Quiet → Camp
- Feed: Lower volume → training camp buzz, breakout candidates, depth chart battles, ADP tracking
- Workspace: Draft board PEAK — finalizing rankings, adding notes
- Prove It: Contest deadline approaching
- Primary: Dynasty Nerd → ALL waking up
- ⛳ Golf carrying engagement load in June

**AUGUST** — Draft Season
- Feed: Final depth charts, injury updates (CRITICAL), last-minute ADP swings, preseason analysis
- Workspace: Draft board → live draft companion, cheat sheet export, auction values
- Prove It: Contest LOCKS at Week 1 kickoff, final bold calls
- Primary: ALL — Peak engagement approaching
- 🔥🔥🔥 DRAFT SEASON

**SEPTEMBER → JANUARY** — Regular Season + Playoffs
- Feed: COMPLETE MODE SHIFT — weekly matchup previews, start/sit consensus, waiver wire, prop analysis, injury impact, live game alerts
- Workspace: Shifts to weekly lineup tools, trade analyzer, waiver priority list
- Prove It: Weekly picks cycle, leaderboards, streaks, badges
- Primary: ALL at maximum
- 🔥🔥🔥 IN-SEASON MODE

### The Weekly In-Season Cycle
| Day | Feed Emphasis | Prove It |
|-----|--------------|----------|
| Monday | MNF + weekly results recap | Weekly accuracy update |
| Tuesday | Waiver wire analysis, biggest stat jumps | New weekly slate OPENS |
| Wednesday | Matchup previews begin, prop lines post, first injury reports | Pick window open |
| Thursday | TNF deep dive + props | TNF picks lock at kickoff |
| Friday | Injury report updates + impact analysis | — |
| Saturday | Final start/sit, weather, prop movement summary | Main slate lock countdown |
| Sunday | LIVE: Score alerts, real-time prop tracking | Picks lock per game kickoff |

### Cross-Sport Calendar
```
JAN  FEB  MAR  APR  MAY  JUN  JUL  AUG  SEP  OCT  NOV  DEC
NFL:  PLAYOFFS  FA  DRAFT  OTAs  ---  CAMP  PRE  ═══ SEASON ═══
GOLF: ---  ════  MASTERS ══════ MAJORS ══════════  ---  ---
```
No dead month. Golf fills NFL gaps. Different personas peak at different times.

---

## CLUTCH RATING ARCHITECTURE — Sport-Specific + Global

### The Problem with a Single Rating
A single Clutch Rating across all sports dilutes expertise. If someone is elite at NFL (95 rating) but dabbles poorly in golf (60 rating), their blended score (~78) misrepresents their NFL credibility. And when a user is looking for NFL help, they want the NFL expert — not the well-rounded generalist.

### The Solution: Sport-Specific Primary, Global Secondary

```
┌───────────────────────────────────────────────────────────┐
│                    USER PROFILE                            │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ NFL: 94  │  │ GOLF: 72 │  │ NBA: --  │  │ MLB: --  │ │
│  │ Expert   │  │ Sharp    │  │ (no data)│  │ (no data)│ │
│  │ #47 rank │  │ #203 rank│  │          │  │          │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🏆 GLOBAL CLUTCH RATING: 86 (Multi-Sport Elite)     │  │
│  │    Qualified in 2 sports | Global Rank: #112         │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Sport-Specific Rating (PRIMARY)
- **This is what matters.** This is what appears on player pages, analyst recommendations, sport-specific leaderboards, and search results.
- Calculated from picks, predictions, and accuracy WITHIN that sport only.
- Same 0-100 scale with tier badges per sport:
  - 90+ = Expert
  - 80-89 = Sharp
  - 70-79 = Proven
  - 60-69 = Contender
  - Below 60 = Rising
- Minimum volume threshold per sport to qualify (e.g., 50 graded picks in NFL)
- Each sport has its own leaderboard
- Users can earn specialty tags within a sport (e.g., "Elite QB Evaluator", "Prop King", "Draft Guru")

### Global Clutch Rating (PRESTIGE / BRAGGING RIGHTS)
- Rolls up from sport-specific ratings
- **Requires qualification in 2+ sports** to appear — you can't get a Global Rating from one sport alone
- Weighted formula: not a simple average. Accounts for:
  - Volume in each sport (more picks = more weight)
  - Recency (active ratings weighted more than stale ones)
  - Breadth bonus (being good at 3 sports is harder than being good at 1)
- Global leaderboard is the "best overall sports mind" competition
- Displayed on profile but BELOW sport-specific ratings
- Think of it as: sport ratings are your degrees, global rating is your GPA

### How This Affects Feature Behavior

**Player Pages:**
- "What Clutch experts are saying" section shows users sorted by THAT SPORT'S rating
- An NFL player page shows analysts ranked by NFL Clutch Rating
- A golf player page shows analysts ranked by Golf Clutch Rating

**Leaderboards:**
- Default leaderboard is SPORT-SPECIFIC (NFL leaderboard, Golf leaderboard)
- Global leaderboard is a separate tab — the "multi-sport elite" view
- Users land on the leaderboard for whichever sport they're currently viewing

**Feed:**
- "Top analyst published new rankings" cards show that analyst's SPORT rating, not global
- Community consensus weighting uses sport-specific ratings

**Prove It:**
- Picks are tagged by sport and only affect that sport's rating
- Weekly accuracy shown per sport
- "Your NFL accuracy this week: 8-3" separate from "Your Golf accuracy: 2-1"

**Search & Discovery:**
- "Find an NFL expert" filters by NFL rating
- "Find a multi-sport analyst" filters by Global rating
- Creator profiles lead with their BEST sport rating

### Database Schema Update
```sql
-- Replace single clutch_rating with sport-specific
clutch_user_sport_ratings
- id
- user_id
- sport (nfl | golf | nba | mlb | etc.)
- rating (0-100)
- tier (expert | sharp | proven | contender | rising)
- total_picks (volume in this sport)
- accuracy_pct
- current_streak
- rank_in_sport (their position on that sport's leaderboard)
- qualified (boolean — met minimum volume threshold)
- last_calculated_at
- created_at
- updated_at

clutch_user_global_rating
- id
- user_id
- global_rating (0-100, nullable — null if < 2 sports qualified)
- qualified_sports (integer — count of sports with enough volume)
- global_rank (their position on global leaderboard, nullable)
- last_calculated_at

-- Sport-specific specialty tags
clutch_user_sport_tags
- id
- user_id
- sport
- tag_name (e.g., "Elite QB Evaluator", "Prop King", "Draft Guru")
- earned_at
- criteria_met (jsonb — what they did to earn it)
```

### Example User Profiles

**"NFL Steve"** — Your buddy who's a football savant but doesn't follow golf
```
NFL Rating: 91 (Expert) — Rank #34
Golf Rating: -- (not enough picks)
NBA Rating: 65 (Contender) — Rank #891
Global Rating: -- (only 1 sport qualified at Expert+)
```
When someone searches for NFL help, Steve shows up ranked #34. His lack of golf knowledge is irrelevant. His profile LEADS with his NFL expertise.

**"Multi-Sport Mike"** — The rare analyst who's elite at everything
```
NFL Rating: 88 (Sharp) — Rank #67
Golf Rating: 85 (Sharp) — Rank #42
NBA Rating: 82 (Sharp) — Rank #103
Global Rating: 86 (Multi-Sport Elite) — Global Rank #12
```
Mike appears on sport-specific leaderboards at his sport rank AND on the global leaderboard. His profile can showcase the global badge as a prestige indicator.

**"Golf Gary"** — Deep golf expertise, casual NFL dabbler
```
Golf Rating: 96 (Expert) — Rank #3
NFL Rating: 71 (Proven) — Rank #445
Global Rating: 79 (Multi-Sport Proven) — Global Rank #201
```
On golf player pages, Gary's takes are near the top. On NFL pages, he's buried. Exactly right.

---

## PLAYER PAGE — Progressive Disclosure Layout

The player page serves ALL personas through progressive disclosure. Simple default, depth available on demand.

### Default View (Everyone sees this):
- Player name, team, position, headshot
- THIS WEEK module: matchup rating, community consensus (% starting), last 3 games
- Season stats summary (basic: yards, TDs, fantasy points)

### Expandable Sections:
- **Advanced Stats** (Grinder): EPA, CPOE, success rate, aDOT, target share, YPRR
- **Game Log** (Grinder): Week-by-week sortable table
- **Situational Splits** (Grinder): Home/away, by quarter, red zone, third down
- **Prop Lines** (Bettor): Current lines from books + Clutch model projection + historical hit rates
- **Career Arc** (Dynasty Nerd): Multi-season chart, age, contract, dynasty value, similar career paths
- **Community Calls** (Creator/Debater): Top-rated users' takes on this player, accuracy tagged
- **Make Your Call** (All): Quick Prove It entry point

### Behavioral Adaptation (Future — Phase 2)
Track which sections users expand most. After enough data, auto-expand their preferred sections. Start with progressive disclosure defaults, add personalization later.

---

## DATA PAGES TO BUILD NOW (SEO + Content Foundation)

### Tier 1: Immediate (nflfastR historical data, no season needed)
1. **Player Profile Pages** (~1,500+ pages) — career stats, game logs, fantasy points, advanced metrics
2. **Team Pages** (32) — roster, historical stats, schedule (when released)
3. **Stat Leaderboards** — filterable by season, position, stat, team; sortable columns
4. **Player Comparison Tool** — side-by-side any two players

### Tier 2: Offseason Build (public data + computation)
5. **Dynasty Rankings Page** — algorithmic or crowdsourced from users
6. **NFL Draft Hub** — prospect profiles, combine data, mock aggregation, landing spot analysis
7. **Strength of Schedule Pages** — once 2026 schedule drops

### Tier 3: Season Start (requires live data)
8. **Weekly Matchup Pages** — game preview + stats + props + community consensus
9. **Waiver Wire / Trending** — automated from stat movement + community activity
10. **Prop Analysis Pages** — per-player prop breakdowns + historical hit rates

---

## REVISED BUILD PRIORITY

### What This Means for Claude Code's Current Queue

Phase 6 (AI Coaching) and Phase 7 (Preseason Experience) from the current roadmap are being reorganized. Here's the new priority order:

#### IMMEDIATE PRIORITY: Data Layer + Feed + Workspace
These should be built BEFORE AI Coaching because they solve the "why would I visit?" problem:

**Step 1: Player Profile Pages (Data Layer)**
```
Task: Build player profile pages for all NFL players with 2+ seasons of data
- Source: nflfastR via nfl_data_py
- Pages include: career stats by season, game logs, fantasy points by format,
  advanced metrics (EPA, CPOE, success rate, aDOT, target share)
- Progressive disclosure: basic stats default, advanced expandable
- These are SEO-indexable public pages
- ~1,500+ pages auto-generated from data
- Use real stat names, not branded names
- Source attribution: "Data via nflverse"
```

**Step 2: Team Pages + Stat Leaderboards (Data Layer)**
```
Task: Build 32 NFL team pages + filterable stat leaderboards
- Team pages: roster with player links, historical team stats, schedule
- Leaderboards: filter by season, position, stat category, team
- Sortable by any column
- Both basic and advanced stat leaderboards
```

**Step 3: The Clutch Feed MVP**
```
Task: Build personalized feed system
- Interest selection on signup: favorite teams, topics, players
- Feed card template system (see Content Types table above)
- Initial content sources (no external APIs needed):
  - Stat trend cards generated from nflfastR data
  - Career milestone cards from historical data
  - "This day in NFL history" cards
  - Workspace nudges (when user has workspace data)
- Feed filtering: All / By Sport / By Team / By Topic
- Every card links deeper into the platform
- Store user interest preferences in user_preferences table
```

**Step 4: Workspace — Draft Board**
```
Task: Build interactive draft board workspace tool
- This IS the Phase 7 "Preseason Experience" but with full spec
- Drag-and-drop player rankings
- Per-player notes field (free-form text)
- Tier break markers
- Scoring format toggle (PPR / Half-PPR / Standard)
- Divergence alerts vs community consensus
- Import from last year
- Share / Export (shareable link, PDF cheat sheet)
- Publish to profile (feeds into Prove It accuracy tracking)
- Database: clutch_draft_boards + clutch_draft_board_entries tables (see schema above)
- Also build: clutch_draft_board_history for tracking rank changes over time
```

**Step 5: Workspace — Watch List + Position Rankings**
```
Task: Build watch list and position ranking tools
- Watch list: lightweight player tracker with notes + alert preferences
- Position rankings: QB/RB/WR/TE separate ranking lists with same
  drag-and-drop + notes as draft board
- Both shareable / publishable
- Database: clutch_watch_list table, extend clutch_draft_boards with board_type field
```

**Step 6: Workspace — Scouting Notes**
```
Task: Build free-form scouting notebook
- Notes organized by player, team, or custom topic
- Rich text / markdown support
- Tag system
- Private by default, shareable toggle
- Search across all notes
- Database: clutch_scouting_notes table
```

#### THEN: AI Coaching (Phase 6 from current roadmap)
After Feed + Workspace are live, AI Coaching becomes more powerful because it has context to work with:
- AI can reference the user's draft board and notes
- AI insights appear as feed cards
- Decision DNA analyzes patterns across their workspace activity + prediction history

#### THEN: Enhanced Feed Content (requires external data)
- News API integration for real-time team news cards
- Odds API integration for prop movement cards
- Mock draft aggregation for draft intel cards
- Injury report integration for injury impact cards

---

## HOW TO PROMPT CLAUDE CODE

### Starting the Session
```
"Read CLAUDE.md and /docs/CLUTCH_STRATEGY_UPDATE_FEB2026.md to understand 
the new Feed + Workspace architecture. We're reprioritizing: Data Layer 
and Feed/Workspace come before AI Coaching. Start with Step 1: Player 
Profile Pages."
```

### Task-by-Task Prompts

**For Player Profile Pages:**
```
"Build NFL player profile pages. Pull data from nflfastR via nfl_data_py 
for all players with 2+ seasons (2020-2025). Each page shows: career stats 
by season, game log, fantasy points (PPR/half/standard), and advanced 
metrics (EPA, CPOE, success rate, aDOT, target share, YPRR). Use 
progressive disclosure — basic stats visible by default, advanced stats 
in expandable section. Pages should be SEO-indexable. Attribute data to 
nflverse. Reference CLUTCH_STRATEGY_UPDATE_FEB2026.md for the full 
player page layout spec."
```

**For the Feed:**
```
"Build the Clutch Feed system. Start with: 1) User interest preferences 
(favorite teams, topics, players) stored in a user_preferences table. 
2) Feed card component with the anatomy from the strategy doc (icon, 
headline, timestamp, context, action links). 3) Initial auto-generated 
content: stat trend cards computed from nflfastR data, career milestone 
cards. 4) Feed page with filtering (all/sport/team/topic). Reference 
CLUTCH_STRATEGY_UPDATE_FEB2026.md for full Feed specification."
```

**For the Draft Board:**
```
"Build the Workspace Draft Board. Interactive drag-and-drop player 
ranking tool with: per-player notes, tier breaks, scoring format toggle 
(PPR/half/standard), divergence alerts vs community consensus, share/export, 
publish-to-profile toggle. Database tables: clutch_draft_boards, 
clutch_draft_board_entries, clutch_draft_board_history. Full schema in 
CLUTCH_STRATEGY_UPDATE_FEB2026.md."
```

### After Each Build Step
Update CLAUDE.md's completed checklist:
```
## Completed
- [x] Phase 1-5 (existing platform)
- [x] NFL Data Pipeline (nflfastR integration)
- [x] Player Profile Pages (Data Layer)
- [ ] Team Pages + Leaderboards (Data Layer) ← NEXT
- [ ] Feed MVP
- [ ] Draft Board Workspace
- [ ] Watch List + Position Rankings
- [ ] Scouting Notes
- [ ] AI Coaching (former Phase 6)
```

---

## WHAT TO ADD TO CLAUDE.md

Add this section to your existing CLAUDE.md:

```markdown
## Strategic Architecture Update (Feb 2026)
Read /docs/CLUTCH_STRATEGY_UPDATE_FEB2026.md for the Feed + Workspace 
architecture and revised build priorities.

### Three Pillars
- FEED: Personalized data stream (why users open the app)
- WORKSPACE: Interactive tools — draft boards, rankings, notes (why users stay)
- PROVE IT: Prediction tracking and reputation (why users come back)

### Six User Personas
Every feature should serve a specific persona. See strategy doc for details.
Primary target: The Informed Fan (plays 1-2 leagues, knows more than average)
Off-season engagement driver: The Dynasty Nerd (active year-round)

### Current Priority
Data Layer (player pages, team pages, leaderboards) → Feed MVP → 
Workspace (draft board) → AI Coaching

### Key Principle: Progressive Disclosure
Default UX is simple and clean (Informed Fan). Depth is always one 
click away (Grinder, Dynasty Nerd). Never overwhelm, never underserve.
```

---

*Document created: February 9, 2026*
*Version: 1.0*
*This supplements — does not replace — existing build specs and CLAUDE.md*
