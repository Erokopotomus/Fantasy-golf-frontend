# CLUTCH SPORTS — Build Specs for Claude Code

## How to Use This Document
This is a structured build queue. Each section is a feature spec that can be fed to Claude Code as a task. Work through them in order — later features depend on earlier ones.

---

# ═══════════════════════════════════════════════════════════════
# SECTION A: MANAGER STATS PAGE ("THE PROVE IT PAGE")
# ═══════════════════════════════════════════════════════════════

## Context
This is the landing page for content creators, analysts, and "managers" (experts/personalities like The Fantasy Footballers, Sean Koerner, etc.). Think of it as their public resume on Clutch — proving their track record with real data. This page needs to be SO good that managers WANT to share it. It's their credibility badge.

### What FantasyPros Does (Competitive Analysis)
FantasyPros is the gold standard for expert accuracy tracking. Here's what they do:
- Track 150+ experts across NFL, MLB, NBA, NHL
- Measure "Accuracy Gap" — the difference between predicted rank and actual outcome
- Rank experts by position (QB, RB, WR, TE) and overall
- Rolling 3-year multi-year leaderboard for consistency
- Expert profile pages with bio, links, accuracy history, badges
- Award badges (Gold, Silver, Bronze, Top 5, Top 10) experts display on their own sites
- Expert Consensus Rankings (ECR) — aggregate the best experts' picks
- Weekly snapshots locked at game time so picks can't be edited after the fact
- Z-score normalization so bad weeks for everyone don't unfairly punish individuals
- Drop worst week after Week 8 as a mulligan

### What Clutch Does DIFFERENTLY (Our Competitive Edge)
FantasyPros is expert-rankings focused (who should I start/sit). Clutch is broader:
- We track BETTING picks, not just fantasy rankings
- We track across ALL sports (golf, NFL, NBA, etc.) on one profile
- We track MULTIPLE pick types: outrights, props, matchups, over/unders, fantasy, parlays
- We provide deeper analytics on HOW they win (what types of bets, what sports, streaks)
- We make the profile page a CONTENT HUB, not just a stats table
- We're sport-agnostic from day one — the same system works for golf, NFL, everything

---

## A1: MANAGER PROFILE PAGE (The Landing Page)

### Build Spec

**Header Section**
- Manager avatar/photo (upload or link)
- Display name + verified badge (for authenticated managers)
- Tagline/bio (280 char max)
- Social links: Twitter/X, YouTube, podcast, website, Instagram
- "Follow" button (for future notification system)
- Overall Clutch Rating (see A3 below) — prominent display, think credit score visual
- Member since date
- Total tracked picks count
- Active sports badges (golf icon, football icon, etc. — lights up for sports they're active in)

**Quick Stats Bar (at-a-glance row)**
- Overall Win Rate: XX%
- ROI (Return on Investment): +X.X%
- Current Streak: W5 / L2
- Best Sport: [icon + name]
- Total Units Profit: +XX.X
- Rank: #XX of XXX managers

**Badge/Trophy Shelf**
- Visual display of earned achievements (see A5 below)
- Examples: "Top 10 Golf Q1 2026", "5-Pick Win Streak", "Best ROI — NFL Week 4"
- Clickable — shows details of how badge was earned
- Shareable — each badge generates a social card image

**Pick Type Performance Breakdown (Tabbed or Segmented)**
Tabs or toggle for each pick type:
- Outrights (tournament winners, game winners)
- Props (player props, team props)
- Over/Unders
- Matchups / Head-to-Head
- Parlays / Multi-leg
- Fantasy (lineup advice, start/sit)
- Futures (season-long picks)

Each tab shows:
- Record (W-L or W-L-P for pushes)
- Win %
- ROI %
- Units +/-
- Average odds of picks made
- Chart: performance over time (line graph)

**Sport-by-Sport Breakdown (Tabbed)**
Tabs for each sport the manager is active in:
- Golf
- NFL
- NBA
- MLB
- (expandable as sports are added)

Each sport tab shows:
- Record + Win% + ROI for that sport
- Best pick (highest odds winner)
- Worst pick (biggest miss)
- Recent picks list (last 10-20)
- Season-over-season comparison if multi-year data exists

**Recent Picks Feed**
- Chronological list of recent picks
- Each pick shows: date, sport, pick type, the actual pick, odds, result (W/L/pending), units
- Pending picks shown with current status
- Filter by: sport, pick type, result, date range
- This is the "proof" — real picks, real results, timestamped

**Performance Charts Section**
- Cumulative profit/loss line chart over time (the money chart)
- Win rate rolling average (last 20, 50, 100 picks)
- ROI by month (bar chart)
- Pick volume by sport (pie chart)
- Hot/cold streaks visualization (calendar heatmap — green/red days)
- Odds distribution histogram (what odds ranges do they bet at)

**Comparison Feature**
- "Compare with another manager" button
- Side-by-side stats comparison
- Overlay profit charts
- Who's better at what sport/pick type

---

## A2: PICK TRACKING SYSTEM (The Engine Behind the Page)

### Build Spec

**Pick Submission**
- Managers submit picks through a form or API
- Required fields: sport, pick type, specific pick (player/team/outcome), odds, units risked, timestamp
- Optional: confidence level (1-5 stars), written analysis/reasoning
- Picks are LOCKED at a defined cutoff (event start time, game kickoff, tee time)
- After lock, picks cannot be edited or deleted — this is the integrity layer
- Pending picks visible but marked as "locked — awaiting result"

**Pick Verification / Grading**
- Automated grading where possible (scores come in, pick is graded W/L/P)
- Manual grading option for picks the system can't auto-verify
- Grace period for grading disputes
- All grading is timestamped and logged

**Pick Categories (Sport-Agnostic Framework)**

For GOLF:
- Tournament winner (outright)
- Top 5 / Top 10 / Top 20 finish
- Head-to-head matchups
- Round leader
- Nationality of winner / prop bets
- Make/miss cut
- First round leader
- Fantasy lineup (DraftKings/FanDuel)

For NFL:
- Game winner (moneyline)
- Spread picks
- Over/under (game totals)
- Player props (passing yards, TDs, rushing, receiving)
- Parlays
- Futures (division winner, MVP, Super Bowl)
- Fantasy start/sit rankings
- Fantasy DFS lineups

For NBA/MLB/etc:
- Same framework — moneyline, spread, totals, props, futures, fantasy

**Key Principle: The pick tracking schema must be SPORT-AGNOSTIC.** Use a universal pick structure:

```
table: clutch_picks
- pick_id (unique)
- manager_id
- sport: "golf" | "nfl" | "nba" | "mlb" (expandable)
- pick_type: "outright" | "prop" | "spread" | "over_under" | "matchup" | "parlay" | "future" | "fantasy"
- pick_description: text (human readable: "Scottie Scheffler Top 5 at Masters")
- pick_details: JSON (structured data for auto-grading)
- odds_american: int (-110, +1400, etc.)
- odds_decimal: float
- units_risked: float
- confidence: int (1-5, optional)
- analysis: text (optional written reasoning)
- submitted_at: timestamp
- locked_at: timestamp (when it became immutable)
- event_id: (links to clutch_events table)
- status: "pending" | "won" | "lost" | "push" | "void"
- graded_at: timestamp
- graded_by: "auto" | "manual"
- units_profit: float (calculated on grade)
- clutch_verified: boolean (was this timestamped before event start?)
```

---

## A3: CLUTCH RATING SYSTEM (The Score)

### Build Spec

**The Clutch Rating is a single number (0-100) that represents a manager's overall credibility.**

Think of it like a credit score for sports picks.

Components (weighted):
- **Accuracy (35%):** Win rate across all picks, weighted by recency
- **Profitability (25%):** ROI — not just winning, but winning at good odds
- **Volume (15%):** Must have minimum pick count to get a meaningful rating. More tracked picks = more confidence in the score. Penalizes tiny sample sizes.
- **Consistency (15%):** Low variance is rewarded. A steady 55% winner is rated higher than someone who swings between 70% and 30%
- **Breadth (10%):** Active across multiple sports and pick types shows range

**Rating Tiers:**
- 90-100: Elite (top 1%)
- 80-89: Expert (top 5%)
- 70-79: Sharp (top 15%)
- 60-69: Solid (top 30%)
- 50-59: Average
- Below 50: Developing

**Display:**
- Circular gauge/meter visual (like a speedometer or credit score widget)
- Color coded (green = elite, blue = expert, yellow = solid, gray = developing)
- Shows trend arrow (rating going up or down)
- Hover/tap shows component breakdown

**Rules:**
- Minimum 50 graded picks to receive a Clutch Rating
- Rating recalculates daily
- More recent picks weighted heavier (90-day recency bias)
- Parlays count but are weighted differently (higher variance expected)
- Fantasy rankings use their own accuracy methodology (similar to FantasyPros gap method)

---

## A4: LEADERBOARD PAGE

### Build Spec

**The Global Leaderboard — who's the best on Clutch?**

**Filters:**
- Sport: All / Golf / NFL / NBA / MLB
- Pick Type: All / Outrights / Props / Spreads / Over-Unders / Matchups / Parlays / Fantasy
- Time Period: All Time / This Season / Last 30 Days / Last 7 Days / This Week / Custom Range
- Minimum Picks: slider (10, 25, 50, 100)
- Sort By: Clutch Rating / Win % / ROI / Units Profit / Current Streak

**Columns in Leaderboard Table:**
- Rank
- Manager (avatar + name, linked to profile)
- Clutch Rating (with color indicator)
- Record (W-L)
- Win %
- ROI %
- Units +/-
- Avg Odds
- Current Streak
- Trend (last 10 picks shown as mini W/L dots — like a sparkline)
- Sport badges (which sports they're active in)

**Special Leaderboards:**
- "Hot Right Now" — best performers last 7 days
- "Most Consistent" — lowest variance over 100+ picks
- "Parlay Kings" — best parlay records
- "Long Shot Hunters" — best record on +500 or higher odds
- "Golf Sharks" — golf-specific leaderboard
- "NFL Sharps" — NFL-specific leaderboard
- Per-sport and per-pick-type leaderboards

**Weekly/Monthly Awards:**
- Auto-generated: "Manager of the Week" based on that week's performance
- Feeds into badge system

---

## A5: BADGE & ACHIEVEMENT SYSTEM

### Build Spec

**Badges are automatically awarded based on tracked performance. They display on the manager profile and are shareable as social cards.**

**Performance Badges:**
- 🥇 #1 Overall (time period)
- 🥈 Top 5 Overall (time period)  
- 🥉 Top 10 Overall (time period)
- 🏆 Sport Champion: #1 in a specific sport (time period)
- 📈 Best ROI: Highest ROI in a time period (min picks required)

**Milestone Badges:**
- 💯 Century Club: 100 tracked picks
- 🎯 500 Club: 500 tracked picks
- 🔥 Hot Streak: 5+ consecutive wins
- 🔥🔥 Fire Streak: 10+ consecutive wins
- ⚡ Lightning Round: 5+ wins in a single day
- 🎰 Parlay Hitter: Won a 4+ leg parlay
- 🦄 Unicorn: Hit a +1000 or longer outright

**Consistency Badges:**
- 📊 Steady Hand: 55%+ win rate over 200+ picks
- 🎯 Sharpshooter: 60%+ win rate over 100+ picks
- 📅 Iron Man: Submitted picks every week for 3+ months straight

**Sport-Specific Badges:**
- ⛳ Golf: "Aces" for golf-specific achievements
- 🏈 NFL: "Clutch QB" for NFL achievements
- (Expandable per sport)

**Social Card Generation:**
- Each badge auto-generates a shareable image (think Spotify Wrapped card)
- Optimized for Twitter/X, Instagram stories
- Shows badge, manager name, the stat that earned it, Clutch branding
- Manager can share directly from profile page

---

## A6: CONSENSUS ENGINE (Future — After Core is Built)

### Build Spec (Design Now, Build Later)

**Clutch Expert Consensus — aggregate the best managers' picks**

Similar to FantasyPros ECR but for betting:
- Weight each manager's picks by their Clutch Rating
- Higher-rated managers' picks count more
- Generate a "Clutch Consensus Pick" for each event
- Show agreement level: "8 of 10 top managers like Scheffler this week"
- Track consensus accuracy over time (does the crowd beat individuals?)

**This becomes a powerful free content feature:**
- "Clutch Consensus Picks" published weekly
- Premium: see which specific managers agree/disagree
- Premium: filter consensus by sport, pick type, minimum Clutch Rating

---

# ═══════════════════════════════════════════════════════════════
# SECTION B: AI ENGINES (Renamed for Multi-Sport)
# ═══════════════════════════════════════════════════════════════

## Renaming from Golf-Specific to Sport-Agnostic

| Old Name | New Name | What It Does |
|----------|----------|--------------|
| "The Caddie" | **Clutch Scout** | Pre-event AI scouting reports (any sport) |
| "The Edge" | **Clutch Edge** | Betting value finder / market mispricing detector |
| "My Caddie" | **Clutch Advisor** | Personalized AI assistant for YOUR preferences |
| "The Pulse" | **Clutch Live** | Real-time in-event AI analysis and alerts |
| "The Simulator" | **Clutch Sim** | Custom matchup and scenario simulator |

### B1: Clutch Scout (Pre-Event AI Reports)
**Golf:** Tournament preview — field analysis, course fit, SG breakdowns, value picks
**NFL:** Game preview — matchup analysis, key stats, injury impact, prop suggestions
**NBA/MLB:** Same framework, different data inputs
**Output:** AI-written scouting report, publishable as content, updated as data changes

### B2: Clutch Edge (Value Finder)
**Input:** Odds from sportsbooks + Clutch model probabilities
**Output:** Where the market is wrong — value alerts, expected value calculations
**Learns:** Over time, trains on historical odds vs outcomes to get smarter
**Revenue:** Premium paywall — this is the crown jewel product

### B3: Clutch Advisor (Personalized AI)
**Input:** User preferences, favorite sports/teams, betting style, bankroll
**Output:** Personalized pick suggestions, custom dashboards, tailored alerts
**Key:** Learns user patterns over time — gets stickier the longer they use it
**Revenue:** Premium tier feature

### B4: Clutch Live (Real-Time Analysis)
**Input:** Live scoring data + live odds movement + pre-event model
**Output:** Real-time AI commentary, in-play value alerts, momentum shifts
**Delivery:** Push notifications, live dashboard, streaming feed
**Revenue:** Premium feature

### B5: Clutch Sim (Matchup Simulator)
**Input:** Any two players/teams + event/course/venue context
**Output:** Full AI breakdown — who wins, why, key factors, historical data
**Use case:** Content tool + user engagement feature
**Revenue:** Free (drives engagement) with premium depth

---

# ═══════════════════════════════════════════════════════════════
# SECTION C: DATABASE ARCHITECTURE (The Foundation)
# ═══════════════════════════════════════════════════════════════

## C1: The "Pull the Plug" Provider Architecture

### The 4-Layer System

**Layer 1: Raw Provider Staging (provider-specific, temporary)**
```
raw_datagolf_*        — DataGolf API dumps
raw_pgatour_*         — PGA Tour scraped data
raw_espn_*            — ESPN public data
raw_nflverse_*        — nflfastR/nflverse data
raw_slashgolf_*       — SlashGolf API data
raw_[provider]_*      — any future provider
```
Each table has: source, ingested_at, raw_payload
These are NEVER read by the application. Only ETL scripts read these.

**Layer 2: Clutch Canonical Tables (YOUR schema, provider-agnostic)**
```
clutch_players         — universal player table with Clutch IDs
clutch_player_id_map   — Rosetta Stone mapping all provider IDs
clutch_events          — universal event/tournament/game table
clutch_courses         — golf courses (expandable to venues)
clutch_player_rounds   — round/game level performance data
clutch_player_stats    — normalized stats (SG, passing yards, etc.)
clutch_odds            — normalized odds from any sportsbook
clutch_schedules       — upcoming events across all sports
clutch_fields          — who's playing in upcoming events
```
These use ONLY clutch_player_id and clutch_event_id. No provider references.

**Layer 3: Clutch Computed Tables (YOUR proprietary metrics)**
```
clutch_scores              — CPI, Course Fit, Form Score, etc.
clutch_predictions         — your model's predicted outcomes
clutch_value_ratings       — edge calculations (your probability vs market)
clutch_player_profiles     — AI-generated player intelligence profiles
clutch_consensus           — aggregated manager consensus picks
clutch_manager_ratings     — computed Clutch Ratings for managers
```

**Layer 4: Application reads from Layers 2 + 3 only.**

### C2: The Rosetta Stone (Player ID Mapping)
```
table: clutch_player_id_map
- clutch_player_id      (YOUR master key)
- sport                 "golf" | "nfl" | "nba" | "mlb"
- player_name           canonical display name
- datagolf_id           nullable
- pga_tour_id           nullable
- espn_id               nullable
- owgr_id               nullable
- slashgolf_id          nullable
- nflverse_id           nullable
- pfr_id                nullable (Pro Football Reference)
- yahoo_id              nullable
- draftkings_id         nullable
- fanduel_id            nullable
- last_synced            timestamp
```
When a new provider is added: add a column. When one is removed: column goes null. Nothing breaks.

### C3: Event ID Mapping
Same pattern for events:
```
table: clutch_event_id_map
- clutch_event_id       (YOUR master key)
- sport
- event_name
- datagolf_event_id     nullable
- espn_event_id         nullable
- pga_tour_event_id     nullable
- nflverse_game_id      nullable
- start_date
- end_date
- venue_id
```

---

# ═══════════════════════════════════════════════════════════════
# SECTION D: DATA TRANSFORMATION LAYER
# ═══════════════════════════════════════════════════════════════

## D1: Clutch Proprietary Metrics (Golf — Build First)

### Clutch Performance Index (CPI)
- Formula: Weighted blend of SG components with YOUR weights
- Inputs: sg_ott, sg_approach, sg_arg, sg_putting, recent_form_factor
- Weights: [0.15, 0.30, 0.20, 0.20, 0.15] (adjustable, versioned)
- Normalization: Z-score against field average
- Output: Single number, -3.0 to +3.0 scale, higher = better
- Update: Recomputed weekly with latest data

### Clutch Course Fit Score
- Formula: Dot product of player skill profile vs course demand profile
- Inputs: Player SG components + course characteristics (fairway width, green size, rough severity, elevation, grass type, historical scoring)
- Course profiles: YOU define these (this is proprietary IP)
- Output: 0-100 scale, higher = better fit
- Update: Computed per player per event

### Clutch Form Score
- Formula: Recency-weighted rolling performance
- Inputs: Last N events' performance with exponential decay
- Decay: 40% / 25% / 20% / 15% for last 4 events (adjustable)
- Field strength adjustment: Performance weighted by field quality
- Output: 0-100 scale
- Update: After each event completes

### Clutch Value Rating
- Formula: (Clutch model probability - implied probability from odds) / implied probability
- Inputs: Your prediction model output + current sportsbook odds
- Output: Percentage edge (positive = value, negative = overpriced)
- Threshold: Flag anything above +5% as "Clutch Value Pick"

### Clutch Pressure Score
- Formula: Performance differential in high-leverage vs normal situations
- Inputs: Final round performance when in contention, major championship performance, playoff performance
- Output: -2.0 to +2.0 scale (positive = clutch performer)

## D2: Transformation Rules (ALL Data, ALL Sports)
1. Never display raw provider numbers with their label
2. Always give it a Clutch name
3. Always blend multiple inputs (single raw stat = theirs; blended = yours)
4. Always add editorial context
5. Log formula version, inputs, timestamp for every computation
6. Tag source_provider on every canonical record

---

# ═══════════════════════════════════════════════════════════════
# SECTION E: BUILD PRIORITY QUEUE
# ═══════════════════════════════════════════════════════════════

## Phase 1: Foundation (THIS WEEK)
1. [ ] Database Layer 2 canonical tables (clutch_players, clutch_events, clutch_player_id_map, clutch_event_id_map)
2. [ ] ETL script: DataGolf → canonical tables (with source tagging)
3. [ ] Pick tracking schema (clutch_picks table + submission form)
4. [ ] Basic manager profile page (header, quick stats, recent picks)
5. [ ] Transform SG display: implement CPI and Course Fit Score
6. [ ] Pick lock mechanism (immutable after event start)

## Phase 2: Manager Stats Buildout (NEXT WEEK)
7. [ ] Clutch Rating system (calculation engine + display widget)
8. [ ] Performance charts (cumulative P/L, rolling win rate, ROI by month)
9. [ ] Pick type breakdown tabs on manager profile
10. [ ] Sport-by-sport breakdown tabs
11. [ ] Leaderboard page with filters
12. [ ] Badge system (auto-awarding + display)

## Phase 3: Data Independence (WEEK 3)
13. [ ] Layer 1 raw staging tables for each provider
14. [ ] ETL scripts for free public sources (PGA Tour stats, ESPN)
15. [ ] Tier 1 data pipeline: automated scraping/pulling from public sources
16. [ ] Historical data backfill from public sources
17. [ ] Rosetta Stone ID mapping build (cross-reference all providers)

## Phase 4: AI Engines (MONTH 2)
18. [ ] Clutch Scout: pre-tournament AI scouting reports (golf first)
19. [ ] Clutch Edge: value detection engine (compare model vs odds)
20. [ ] Social card generation for badges and achievements
21. [ ] Consensus engine: aggregate top managers' picks

## Phase 5: Expansion (MONTH 3+)
22. [ ] NFL data pipeline (nflfastR integration)
23. [ ] NFL pick types and grading
24. [ ] Clutch Advisor: personalized AI recommendations
25. [ ] Clutch Live: real-time tournament/game analysis
26. [ ] Clutch Sim: matchup simulator

---

*Document created: February 7, 2026*
*Version: 1.0*
*Feed sections to Claude Code in order. Each section is a self-contained build spec.*
*Confidential — Clutch Sports Internal Use Only*
