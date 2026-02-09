# CLUTCH SPORTS — NFL Expansion Plan
## Complete Build Spec for Claude Code

---

# ═══════════════════════════════════════════════════════════════
# PLATFORM VISION: THE CREDIBILITY FLYWHEEL
# ═══════════════════════════════════════════════════════════════

## What Clutch Actually Is

Clutch is not a stats site. Not a picks site. Not a fantasy tool. It's a **social
platform where your sports knowledge IS your reputation.**

The current sports media world is top-down: influencers, podcasters, and TV
personalities have audiences based on personality and platform access — not
accuracy. Nobody tracks whether their predictions are right. Nobody holds them
accountable. Their credibility comes from follower count, not track record.

Clutch flips this.

On Clutch, everyone — from a nobody in Ohio to the Fantasy Footballers — competes
on the same playing field. Predictions are locked, tracked, and scored. Records
are public. The leaderboard doesn't care how many followers you have.

## The Flywheel

```
   Established names join (bring audience)
              │
              ▼
   Their audience discovers Clutch
              │
              ▼
   Unknown managers also compete
              │
              ▼
   Some unknowns BEAT the big names
              │
              ▼
   "Nobody from Ohio outprojected the Fantasy Footballers"
   (That's a story. That drives signups.)
              │
              ▼
   More competition → better leaderboard → more credibility
              │
              ▼
   More big names HAVE to join (or look like they're hiding)
              │
              ▼
   Cycle repeats. Platform grows.
```

## Why This Works

**For established influencers:** Clutch is their public resume. A verified track
record they can point to. If they're good, Clutch PROVES it — and that's more
valuable than any self-reported claim. They share their Clutch profile, their
badges, their leaderboard rank. It's marketing they can't get anywhere else.

**For unknown managers:** Clutch is their launchpad. You don't need a podcast or
a YouTube channel to build credibility. You need a Clutch Rating. Nail your
projections, climb the leaderboard, and suddenly you have proof that you know
football. That proof is the foundation for building a following.

**For the platform:** Every person who competes creates content (picks, projections,
draft boards). Every leaderboard update is a story. Every upset (unknown beats
expert) is shareable. The platform generates its own engagement without Clutch
having to produce content — the managers ARE the content.

**For the founder:** You built the arena AND you compete in it. Your Clutch Rating
is public. If you're good, you climb alongside everyone else. That's a founder
story people root for.

## The Social Layer

People put their Clutch Rating in their Twitter bio.
They share their draft boards.
They trash talk other managers based on verified records.
They screenshot their badges after a big week.

The Clutch Rating becomes a **status symbol** in the sports community — like a
credit score for football knowledge. "What's your Clutch Rating?" becomes a
real question people ask.

This is the moat. Stats sites are commodities. Pick tracking is a feature.
A social platform where reputation is earned through verified performance —
that's something people build identity around.

---

# ═══════════════════════════════════════════════════════════════
# STRATEGIC CONTEXT: WHY NFL IS DIFFERENT FROM GOLF
# ═══════════════════════════════════════════════════════════════

## Key Structural Differences

| Dimension | Golf | NFL |
|-----------|------|-----|
| **Player vs Team** | Individual sport — one player, one score | Team sport — 22 on field, matchup-dependent |
| **Betting Markets** | Outrights, top finishes, matchups, props | Spreads (dominant), moneylines, totals, player props, team props, parlays |
| **Season Structure** | ~45 weeks/year, events every week | 18 weeks regular season + playoffs (Sep-Feb), dead offseason Mar-Aug |
| **Data Depth (Free)** | Moderate — public stats available but SG requires DataGolf | Massive — nflfastR provides 390 columns of play-by-play data back to 1999 for free |
| **Premium Provider** | DataGolf (~$30-50/mo consumer, cheap) | PFF (enterprise pricing, $10K+/yr for B2B data) |
| **Market Size** | Niche but passionate | Largest US sports betting market by far |
| **Fantasy** | DraftKings/FanDuel tournaments | DFS + season-long leagues (massive ecosystem) |
| **Content Cadence** | Weekly tournament previews | Weekly game previews + daily props/news during season |

## Strategic Implication
Golf is where you learn. NFL is where you scale. The same architecture works for both, but NFL brings 10x the audience, 10x the betting volume, and 10x the content surface area. Getting NFL right is what turns Clutch from a niche golf analytics site into a real platform.

## Cross-Sport Advantage
Having golf + NFL on one platform is a competitive moat in itself. Golf fills the NFL dead zone (April-August). NFL dominates September-February. A user who follows Clutch managers across both sports has year-round engagement. No one else is doing this well.

---

# ═══════════════════════════════════════════════════════════════
# SECTION 1: NFL DATA SOURCES (THE 3-TIER FRAMEWORK)
# ═══════════════════════════════════════════════════════════════

## TIER 1 — Foundation Data (Free/Open, YOU OWN)

### 1a. nflfastR / nflverse (THE CROWN JEWEL — MIT License)

**This is the most important free sports data source in any sport. Period.**

**Python access:** `nfl_data_py` package
```python
pip install nfl_data_py
import nfl_data_py as nfl
```

**What you get (ALL FREE):**

**Play-by-Play Data (390 columns, back to 1999)**
- Every single play from every NFL game since 1999
- Play type (pass, run, punt, field goal, kickoff, etc.)
- Yards gained, down, distance, field position
- Formation (shotgun, no huddle, etc.)
- QB dropbacks, scrambles, sacks
- Completion probability (CP), CPOE (completion % over expected)
- Expected Points Added (EPA) — per play
- Win Probability Added (WPA) — per play
- Expected yards after catch (xyac)
- Air yards, yards after catch
- Passer, rusher, receiver identification
- Drive information (start position, result)
- Series information (first downs, conversions)
- Weather, stadium, surface, roof type
- Game situation (score differential, time remaining, timeouts)
- Updated NIGHTLY during the season

**Weekly Player Stats**
- Passing: completions, attempts, yards, TDs, INTs, rating, EPA
- Rushing: carries, yards, TDs, fumbles, EPA
- Receiving: targets, receptions, yards, TDs, EPA
- Fantasy points (multiple scoring systems)

**Seasonal Stats**
- Full-season aggregated player stats
- By position breakdowns

**Rosters**
- Weekly rosters with player info (height, weight, age, college, draft round/pick)
- Position, jersey number, status

**Additional Datasets:**
- Schedules (full season + historical)
- Win totals and scoring lines (preseason Vegas numbers)
- Draft picks and draft pick values
- NFL Combine results
- Officials data
- Team descriptive info (colors, logos, abbreviations)
- ID mapping across sites (ESPN, Yahoo, PFR, etc.)
- FTN charting data (2022+, CC-BY-SA 4.0 with attribution)

**Key Computed Models (INCLUDED FREE):**
- Expected Points (EP) model
- Win Probability (WP) model — with and without spread
- Completion Probability (CP) model
- Expected Yards After Catch (xYAC) model
- CPOE (Completion Percentage Over Expected)

**License Notes:**
- R code: MIT License (open source)
- Python wrapper: MIT License
- The underlying NFL data "belongs to their respective owners and are governed by their terms of use"
- FTN charting data: CC-BY-SA 4.0 (requires attribution to FTN Data via nflverse)
- In practice: the community has used this data commercially for years (fantasy apps, analytics sites, betting models) without issue. The data comes from NFL's own JSON feeds.

### 1b. Pro-Football-Reference (Sports Reference)

**Terms:** They explicitly state: sharing/using data from individual pages is welcomed for commercial use WITH attribution. Prohibit bulk automated scraping and AI training on their data.

**What's available:**
- Player career stats (passing, rushing, receiving, defense, etc.)
- Box scores for every game in NFL history
- Draft data and combine results
- Coaching records
- Franchise histories
- Advanced stats (approximate value, etc.)
- Historical betting lines (via Warren Repole/Sports Odds History)

**How to use:** Manual reference and targeted, respectful page-by-page data pulls. NOT bulk scraping. Good for backfilling historical context and validation.

### 1c. NFL.com Official Stats
- Player stats, standings, schedules, rosters
- Game results and scores
- Public, factual data

### 1d. ESPN NFL Data
- Scores, standings, player stats
- Team stats, schedules
- Power rankings (ESPN's FPI)
- Fantasy data and projections

### 1e. The Odds API (the-odds-api.com) — MULTI-SPORT

**This is potentially your centralized Tier 1 odds backbone across ALL sports.**

**What's available:**
- Live and upcoming odds from 70+ sportsbooks globally
- NFL, NBA, MLB, NHL, college sports, golf, soccer, UFC, tennis
- Markets: moneylines (h2h), spreads, totals, outrights, player props
- Historical odds snapshots back to 2020 (at 5-minute intervals)
- Game scores and results

**Pricing:**
- Free tier: 500 requests/month
- Paid tiers scale up from there
- Explicitly built for commercial use

**Key value for Clutch:** One API for odds across every sport you'll ever add. NFL, golf, NBA, MLB — all from the same source, same schema, same canonical mapping.

### 1f. Sports Odds History / Historical Lines
- Historical NFL spreads, moneylines, totals
- Available from multiple public sources
- Free for research and commercial use

---

## TIER 2 — Transformed/Proprietary Data (YOUR IP)

See Section 3 below for NFL-specific Clutch metrics.

---

## TIER 3 — Licensed Intelligence (Evaluate, Don't Rush)

### PFF (Pro Football Focus) — The DataGolf of NFL

**What they offer:**
- Player grades (0-100) for every player on every play — this is their crown jewel
- Coverage schemes, route data, pressure rates
- Play-level detailed charting
- Matchup-specific grades
- Used by all 32 NFL teams

**Pricing:**
- Consumer (PFF+): ~$35-40/month — gives website access, articles, data tools. NO API.
- B2B Data: Enterprise pricing, "contact sales." Realistically $10K-50K+/year depending on package depth.
- Their most basic B2B package includes team grades, player grades, and basic charting.
- Premium packages include play-level grades, coverages, and schemes.

**Recommendation:** DO NOT license PFF yet. Unlike DataGolf which is cheap and essential for golf, PFF is expensive and you can build a strong NFL product without it using nflfastR + your own models. Revisit PFF licensing when Clutch has revenue to justify the cost. For now, PFF consumer subscription ($40/mo) gives you enough to validate your models against their grades without needing their API.

### SportsDataIO / FantasyData
- Comprehensive NFL API with commercial licensing
- Scores, stats, odds, projections, news, images
- Already partners with PFF for their data needs
- More affordable than PFF B2B
- Worth evaluating as a Tier 3 option that covers multiple sports

---

# ═══════════════════════════════════════════════════════════════
# SECTION 2: NFL PICK TYPES & AUTO-GRADING
# ═══════════════════════════════════════════════════════════════

## All NFL Pick Types (for Manager Tracking)

### Game-Level Picks
| Pick Type | Example | Auto-Grade Source |
|-----------|---------|-------------------|
| **Moneyline** | "Chiefs to beat Ravens" | Final score (nflfastR/The Odds API scores endpoint) |
| **Spread** | "Chiefs -3.5" | Final score vs spread |
| **Game Total (O/U)** | "Over 47.5 points" | Combined final score |
| **1st Half Spread** | "Chiefs -1.5 1H" | Halftime score |
| **1st Half Total** | "Over 23.5 1H" | Halftime combined score |

### Player Props
| Pick Type | Example | Auto-Grade Source |
|-----------|---------|-------------------|
| **Passing Yards** | "Mahomes Over 285.5 passing yards" | nflfastR weekly player stats |
| **Passing TDs** | "Mahomes Over 2.5 TDs" | nflfastR weekly player stats |
| **Rushing Yards** | "Henry Over 89.5 rushing yards" | nflfastR weekly player stats |
| **Receiving Yards** | "Hill Over 79.5 receiving yards" | nflfastR weekly player stats |
| **Receptions** | "Kelce Over 5.5 receptions" | nflfastR weekly player stats |
| **Anytime TD** | "Kelce anytime TD scorer" | nflfastR play-by-play |
| **First TD** | "Hill first TD scorer" | nflfastR play-by-play (first TD of game) |
| **Interceptions** | "Mahomes Under 0.5 INTs" | nflfastR weekly player stats |
| **Sacks** | "T.J. Watt Over 0.5 sacks" | nflfastR play-by-play |
| **Completions** | "Mahomes Over 22.5 completions" | nflfastR weekly player stats |

### Futures
| Pick Type | Example | Auto-Grade Source |
|-----------|---------|-------------------|
| **Super Bowl Winner** | "Chiefs to win Super Bowl" | End of season |
| **Conference Winner** | "Chiefs to win AFC" | Conference championship result |
| **Division Winner** | "Chiefs to win AFC West" | Final standings |
| **MVP** | "Mahomes NFL MVP" | Award announcement |
| **Win Total** | "Chiefs Over 11.5 wins" | Final regular season record |
| **Playoff Make/Miss** | "Jets to make playoffs" | Final standings |
| **Draft Position** | "Bears #1 overall pick" | Draft results |

### Fantasy Picks
| Pick Type | Example | Auto-Grade Source |
|-----------|---------|-------------------|
| **Weekly Start/Sit Rankings** | Position rankings for the week | FantasyPros-style accuracy gap method |
| **DFS Lineup** | Full DraftKings/FanDuel lineup | DFS scoring (nflfastR fantasy points) |
| **Season-Long Rankings** | Preseason draft rankings | End-of-season positional finishes |
| **Waiver Wire** | "Pick up Jayden Reed" | Fantasy production post-pickup |

### Parlays
| Pick Type | Example | Auto-Grade Source |
|-----------|---------|-------------------|
| **Same-Game Parlay** | "Chiefs ML + Mahomes O2.5 TDs + Kelce O5.5 rec" | Each leg graded individually, parlay graded as all-or-nothing |
| **Multi-Game Parlay** | "Chiefs -3 + Bills ML + Over 47.5 in DET/GB" | Each leg graded from respective game results |

### Auto-Grading Architecture
```
table: clutch_nfl_pick_grading_rules
- pick_type: "moneyline" | "spread" | "total" | "player_prop" | etc.
- data_source: "nflverse_scores" | "nflverse_player_stats" | "nflverse_pbp" | "odds_api_scores" | "manual"
- grading_logic: JSON (defines how to evaluate W/L/P for this pick type)
- requires_fields: ["home_score", "away_score"] or ["passing_yards"] etc.
```

**Auto-grading pipeline:**
1. Game ends → scores flow in from nflfastR or Odds API
2. Player stats computed from play-by-play data
3. Grading engine evaluates each pending pick against results
4. Pick status updated: pending → won | lost | push
5. Manager stats recalculated
6. Leaderboard updated

---

# ═══════════════════════════════════════════════════════════════
# SECTION 3: NFL CLUTCH METRICS (Transformation Layer)
# ═══════════════════════════════════════════════════════════════

## NFL DATA PHILOSOPHY: RAW STATS + INTELLIGENCE LAYER

### Why NFL Is Different From Golf (Critical)

In golf, raw stats (fairways hit, putts per round) are boring and shallow. You MUST transform
them into Strokes Gained, Course Fit, and Form Scores to create value. The transformation IS
the product.

**In NFL, the raw stats ARE the product.** Fans, bettors, and fantasy players want to see:
- Mahomes: 312 yards, 28/35, 3 TDs, 0 INT, 8.9 Y/A
- Henry: 24 carries, 142 yards, 2 TDs, 5.9 YPC
- Hill: 9 targets, 7 rec, 148 yards, 1 TD

They also want advanced stats that the analytics community has already standardized:
- EPA per play, CPOE, success rate, yards per route run
- Target share, air yards share, red zone targets

**These are real, established metrics. Do NOT rename them.** Calling EPA "Clutch Impact Score"
makes you look like you're hiding behind branding. The NFL analytics community (and it's huge)
will mock that. Show the real stats with their real names. Build credibility through depth and
presentation, not rebadging.

### The Two-Layer Model for NFL

```
┌────────────────────────────────────────────────────┐
│  LAYER 2: CLUTCH INTELLIGENCE (Your IP)            │
│  AI predictions, value detection, prop projections, │
│  matchup analysis, betting edge identification      │
│  → This is where Clutch branding lives              │
│  → "Clutch sees value on Mahomes Over 285.5"        │
│  → Always shows the underlying data that supports   │
├────────────────────────────────────────────────────┤
│  LAYER 1: RAW STATS & ADVANCED ANALYTICS (Trust)   │
│  Real stats, real names: EPA, CPOE, yards, TDs      │
│  Organized, searchable, filterable, beautiful UI    │
│  → This is what brings people to the site           │
│  → This is what builds credibility                  │
│  → Display with real stat names, no rebranding      │
└────────────────────────────────────────────────────┘
```

### Layer 1: Stats Destination (Show Everything)

**Player Pages — Show real stats with real names:**
- Traditional stats: passing yards, attempts, completions, TDs, INTs, passer rating
- Advanced stats: EPA/play, CPOE, success rate, air yards, aDOT (avg depth of target)
- Situational splits: home/away, by quarter, by down, vs blitz, under pressure, in red zone
- Game logs: every game this season with full stat line
- Career stats: year-by-year progression
- Fantasy stats: points scored in PPR, half-PPR, standard formats

**Team Pages — Show real team stats:**
- Offensive and defensive rankings (yards, points, EPA, success rate)
- Situational data: 3rd down %, red zone %, turnover margin
- Pace and play volume stats
- Strength of schedule data

**Game Pages — Show real game stats:**
- Full box score
- Key plays and drive summaries
- Win probability chart (nflfastR model)
- Player performance breakdown

**Why this matters:** People will come to Clutch for the stats. They'll discover the AI
predictions because they're already on the site. Making the stats destination great is
the growth engine. Every ESPN/PFR user who tries your stats page and finds it better
organized or faster is a potential Clutch user.

### Layer 2: Clutch Intelligence (Where Your IP Lives)

This is where proprietary value creation happens. The AI and models operate on the raw
data, and the output is clearly labeled as Clutch analysis — not rebranded stats.

#### Clutch Prop Model — Player Projections
- **What:** Projected stat lines for upcoming games
- **Inputs:** Rolling player averages + opponent defensive rates + game environment
- **Output:** Projected passing yards, rushing yards, receiving yards, TDs, receptions
- **Display:** "Clutch projects Mahomes at 298 passing yards (book line: 285.5)" — show the math

#### Clutch Value Detection — Betting Edge
- **What:** Where the betting market is mispricing
- **Inputs:** Clutch model probability vs sportsbook implied probability
- **Output:** Edge percentage for spreads, moneylines, totals, and player props
- **Display:** Show the book line, show Clutch's number, show the edge. Transparent.

#### Clutch Matchup Analysis — Game Previews
- **What:** AI-powered breakdown of how teams match up
- **Inputs:** Team and player stats, EPA splits, situational data, weather, injuries
- **Output:** Written analysis using real stats: "KC's pass rush ranks 3rd in pressure rate
  (38.2%). BAL's OL allows pressure on just 22.1% of dropbacks (5th best)."

#### Clutch Weather & Environment Analysis
- **What:** How weather and venue affect a specific game
- **Inputs:** Temperature, wind speed, precipitation, dome vs outdoor, surface type
- **Display:** "Wind advisory at Soldier Field (25mph gusts). Historically, games with
  20+ mph wind see 3.2 fewer points and 22% more rush attempts."

#### Clutch Game Predictions (Clutch Scout NFL)
- **What:** AI-written game previews with pick recommendations
- **Inputs:** All Layer 1 stats + odds + weather + injuries
- **Output:** Structured preview with betting angles and prop suggestions
- **This is premium content** — the AI insight is the paywall product

### NFL Data Display Rules (DIFFERENT from Golf)
1. **DO show real stat names** — EPA is EPA, CPOE is CPOE, yards are yards
2. **DO attribute data properly** — "Data via nflfastR" or "Source: nflverse"
3. **DO use Clutch branding on predictions and analysis** — "Clutch projects..." or "Clutch Edge sees value on..."
4. **DON'T rebrand existing metrics** — this destroys credibility with the analytics community
5. **DO add context and insight** — raw numbers + "here's what this means for Sunday" is the formula
6. **DO organize better than ESPN/PFR** — your edge is presentation, filters, and combining stats + betting in one place
7. **DO let users explore the data** — filterable tables, sortable columns, comparison tools
---

# ═══════════════════════════════════════════════════════════════
# SECTION 4: NFL DATABASE SCHEMA (Extending Canonical Layer)
# ═══════════════════════════════════════════════════════════════

## New Layer 1 Staging Tables
```
raw_nflverse_pbp            — play-by-play data from nfl_data_py
raw_nflverse_weekly_stats   — weekly player stats
raw_nflverse_seasonal_stats — seasonal aggregates
raw_nflverse_rosters        — roster data
raw_nflverse_schedules      — schedules
raw_nflverse_draft          — draft picks + combine
raw_odds_api_nfl            — NFL odds from The Odds API
raw_pfr_*                   — any Pro-Football-Reference data
```

## New Layer 2 Canonical Tables
```
clutch_nfl_games            — game-level info (teams, scores, venue, weather, surface)
clutch_nfl_plays            — play-by-play (normalized from nflfastR schema)
clutch_nfl_player_games     — player-game stats (passing, rushing, receiving, defense)
clutch_nfl_player_seasons   — season aggregates per player
clutch_nfl_teams            — team info (name, abbreviation, conference, division)
clutch_nfl_team_seasons     — team season stats
clutch_nfl_schedules        — upcoming and historical schedules
clutch_nfl_odds             — game odds (spread, moneyline, total) from multiple books
clutch_nfl_player_props     — player prop lines from books
clutch_nfl_draft            — draft picks, combine data
clutch_nfl_rosters          — weekly rosters
```

## New Layer 3 Computed Tables (Clutch Intelligence — Your IP)
```
clutch_nfl_prop_projections — Clutch prop model projections per player per week
clutch_nfl_value_ratings    — Edge detection: model probability vs market for all bet types
clutch_nfl_game_predictions — Clutch predicted spread/total per game per week
clutch_nfl_matchup_analysis — AI matchup breakdown data per game (key factors, angles)
clutch_nfl_weather_analysis — Weather impact analysis per game
```

Note: Layer 3 is ONLY for Clutch's proprietary predictions and analysis.
Raw stats and advanced analytics (EPA, CPOE, etc.) live in Layer 2 canonical
tables and are displayed AS-IS with real names. No rebranding.

## Rosetta Stone Additions
```
-- Add to clutch_player_id_map:
nflverse_gsis_id      nullable    -- NFL GSIS player ID
nflverse_espn_id      nullable    -- ESPN ID from nflverse mapping
nflverse_pfr_id       nullable    -- Pro-Football-Reference ID
nflverse_yahoo_id     nullable    -- Yahoo ID
nflverse_sleeper_id   nullable    -- Sleeper app ID
pff_id                nullable    -- PFF ID (for future use)

-- Add to clutch_event_id_map:
nflverse_game_id      nullable    -- nflfastR game_id format: "2025_01_KC_BAL"
nflverse_old_game_id  nullable    -- legacy NFL game ID
espn_game_id          nullable
```

**Key note:** nflfastR already provides ID mappings across ESPN, Yahoo, PFR, Sleeper, and more via `nfl.import_ids()`. Use this to pre-populate your Rosetta Stone for NFL players immediately.

---

# ═══════════════════════════════════════════════════════════════
# SECTION 5: NFL CONTENT & FEATURES
# ═══════════════════════════════════════════════════════════════

## Weekly Content Engine (Automated + AI)

### Thursday (Pre-Game Week Content)
- **Clutch Scout NFL:** AI-generated previews for every game
  - Matchup analysis (team CPR vs CPR)
  - Key player matchups
  - Weather impact assessment
  - Injury impact quantified
  - Historical trends (team vs spread, home/away splits)
- **Clutch Props Report:** AI-identified value props for the week
  - Model projections vs book lines for top props
  - "Best Bets" and "Fades" with reasoning

### Sunday (Game Day)
- **Clutch Live NFL:** Real-time win probability updates, in-play analysis
- **Live manager pick tracking** — see who's winning/losing in real time

### Monday/Tuesday (Post-Game)
- **Clutch Review:** What happened, who was right, who was wrong
- **Manager leaderboard updates**
- **Clutch Ratings recalculated**
- **Player rating updates**

### Offseason (March-August)
- **Draft Coverage:** Clutch Draft Scores for picks
- **Free Agency:** Impact analysis on team ratings
- **Futures:** Track futures picks all offseason
- **Golf fills the gap** — this is where cross-sport pays off

## Manager Stats Page — NFL-Specific Additions

The manager profile page (already spec'd in build-specs.md) extends for NFL:

**NFL-Specific Filters on Manager Profile:**
- Filter by: Spreads only | Moneylines only | Totals only | Props only | Parlays only
- Filter by: Specific team (e.g., "How does this manager do on Chiefs games?")
- Filter by: Favorites vs Underdogs
- Filter by: Home vs Away teams
- Filter by: Division games vs non-division

**NFL-Specific Badges:**
- 🏈 "Sunday Sweep" — went 10+ picks correctly in one week
- 🎯 "Prop King" — best prop record over 50+ props
- 📊 "Spread Shark" — best ATS record over 100+ spread picks
- 🔮 "Futures Genius" — hit a futures bet at +500 or longer
- ❄️ "Cold Weather King" — best record in outdoor cold-weather games

---

# ═══════════════════════════════════════════════════════════════
# SECTION 6: NFL BUILD PHASES (Queue for Claude Code)
# ═══════════════════════════════════════════════════════════════

## Phase NFL-1: Data Pipeline — COMPLETE ✓

> Built: nflSync.js, nflClient.js with batched upserts (50x faster), team abbreviation normalization, active roster filtering (~850 players + 32 DST). 2024 season data synced to Railway. Commits: 7d12289, 4355299, a900b97.

### NFL-1.1: nflfastR Integration — COMPLETE ✓
- [x] nflClient.js — nflverse CSV fetcher (players, stats, schedules, rosters)
- [x] nflSync.js — 5 sync functions with batched $transaction upserts
- [x] Prisma schema: NflTeam, NflGame, NflPlayerGame models
- [x] Player filtering: only active roster QB/RB/WR/TE/K (~850 players)
- [x] DST records: 32 team defense "player" records auto-created
- [x] Team abbreviation normalization (LA→LAR, OAK→LV, SD→LAC, STL→LAR, WSH→WAS)
- [x] Seed scripts: seedNflTeams.js, seedNflInfrastructure.js
- [x] 2024 season synced: 850 players + 32 DST + 285 games + 5,174 stat rows

**Remaining data gaps:**
- [ ] 2025 season data — only 2024 synced. 2025 is current season. Retry `player_stats_2025.csv`
- [ ] Kicker stats — nflverse `player_stats` CSV lacks kicking (FG, XP). Need separate data source (check nflverse `kicking` tag)
- [ ] DST stats — 32 DST records exist but zero NflPlayerGame rows. Team defense stats not in player_stats CSV. Need team-level data

### NFL-1.2: Odds Integration — NOT STARTED
```
Task: Set up The Odds API for NFL odds
- Register for The Odds API (free tier to start)
- Pull current NFL odds (spreads, moneylines, totals)
- Pull historical odds if available
- Store in raw_odds_api_nfl staging table
- ETL into clutch_nfl_odds canonical table
- Map sportsbook names to standardized identifiers
Note: This same pipeline will later serve golf, NBA, MLB, etc.
```

### NFL-1.3: NFL Pick Types — NOT STARTED
```
Task: Extend pick tracking system for NFL pick types
- Add NFL pick types to clutch_picks schema (spread, moneyline, total, player prop, parlay, future, fantasy)
- Build pick submission form with NFL-specific fields
  - For spreads: team + spread number
  - For props: player + stat category + line + over/under
  - For parlays: multi-leg builder
- Build auto-grading rules for each NFL pick type
- Connect grading engine to nflfastR weekly stats pipeline
Reference: /docs/build-specs.md Section A2
```

## Phase NFL-2: Stats Destination & Display — MOSTLY COMPLETE

> Built: NflPlayers.jsx, NflPlayerDetail.jsx, NflTeamDetail.jsx, NflSchedule.jsx, NflCompare.jsx. FPTS display with 2 decimal places, season selector on detail page, player compare at /nfl/compare, Research dropdown nav. Commits: 6654f8f, 956a979, 71f0905, 7c177fa, 1196716, c3777da.

### NFL-2.1: Player Stats Pages — COMPLETE ✓
- [x] NflPlayers.jsx — NFL player directory with stats table
- [x] NflPlayerDetail.jsx — Individual player stats page
- [x] Season selector dropdown on player detail page
- [x] FPTS display with 2 decimal places, '-' for irrelevant stats
- [x] Player compare tool at /nfl/compare
- [x] Research dropdown nav for universal player pools

**Remaining polish:**
- [ ] All stat columns sortable (currently only FPTS is sortable)
- [ ] Advanced stats from nflfastR: EPA/play, CPOE, success rate, aDOT (not yet displayed)
- [ ] Game logs per player (week-by-week stat lines)
- [ ] Career stats year-by-year view

### NFL-2.2: Team Stats Pages — COMPLETE ✓
- [x] NflTeamDetail.jsx — Team detail page
- [x] NflSchedule.jsx — NFL game schedule

### NFL-2.3: Game Pages — NOT STARTED
```
Task: Build NFL game detail pages
- Full box score (passing, rushing, receiving, defense)
- Win probability chart over time (from nflfastR WP model)
- Key plays and drive summaries
- Player of the game stats
- For upcoming games: odds comparison from multiple books (via Odds API)
```

### NFL-2.4: Leaderboards & Rankings — NOT STARTED
```
Task: Build NFL stat leaderboards
- Passing: yards, TDs, passer rating, EPA/play, CPOE
- Rushing: yards, TDs, yards/carry, EPA/rush
- Receiving: yards, TDs, receptions, targets, target share, yards/route
- Defense: sacks, INTs, passes defended, EPA allowed
- Filterable by: season, week range, team, position
- Sortable by any column
- This is where you compete with PFR/ESPN for search traffic
```

## Phase NFL-2.5: League Infrastructure — COMPLETE ✓

> Built: Sport-aware league creation, NFL scoring systems, NFL roster formats, sport-contextual navigation. Commits: 9e854e3, 59af577, c9f8e96, 6069f66, a62ecb1, 6654f8f.

- [x] Sport-aware league creation (NFL scoring, formats, roster)
- [x] Sport-aware league cards with separate sport + format badges
- [x] Contextual sport (no global switcher — sport comes from league)
- [x] NFL nav cleanup (Schedule instead of Tournaments/Live)
- [x] NFL scoring engine (nflScoringService.js)
- [x] Fix NFL league blank screen (isNflLeague declaration order)

## Phase NFL-3: Clutch Intelligence Layer — NOT STARTED

### NFL-3.1: Prop Projections Model
```
Task: Build Clutch Prop Model
- For each player in upcoming games, project stat lines
- Model: (player rolling baseline × opponent defense adjustment × game environment)
- Environment: home/away, weather, indoor/outdoor, game total, spread
- Compare projections to sportsbook prop lines (from Odds API)
- Flag value: where projection differs from book line by meaningful margin
- Display: "Clutch projects 298 passing yards (line: 285.5)" with supporting data
- Store in clutch_nfl_prop_projections and clutch_nfl_value_ratings
```

### NFL-3.2: Game Predictions
```
Task: Build game prediction model
- Predict spread and total for each game
- Inputs: team EPA differentials, situational data, home/away, weather, rest, injuries
- Compare to market spread/total → surface value
- Backtest against historical games
- Store in clutch_nfl_game_predictions
```

### NFL-3.3: Clutch Scout NFL (AI Content)
```
Task: Build AI-powered weekly game previews
- For each game: feed real stats + odds + weather + injuries into LLM
- Generate: matchup analysis citing real stats, betting angles, prop suggestions
- Uses real stat names throughout ("KC ranks 3rd in EPA/play on defense")
- Publish Thursday/Friday automatically
- Premium depth for paid users
```

### NFL-3.4: NFL Hub Page & Manager Integration
```
Task: Build NFL hub and extend manager profiles
- NFL hub page with weekly schedule + Clutch Matchup Scores
- Team rankings page (Clutch Power Ratings)
- Player rankings page (by position)
- NFL tab on manager profile
- NFL-specific pick filters (spreads, props, etc.)
- NFL badges
- NFL-specific leaderboard
- NFL auto-grading live during games
```

## Phase NFL-4: Live & Advanced — NOT STARTED

### NFL-4.1: Clutch Live NFL
```
Task: Real-time game analysis during NFL Sundays
- Win probability updates per play (from nflfastR models)
- Live EPA tracking
- Live prop status tracking ("Mahomes is at 243 passing yards, needs 43 more for Over")
- Live manager pick status updates
- Push notification framework for key moments
```

### NFL-4.2: Advanced Models
```
Task: Train custom prediction models
- Spread prediction model (features: CPR differential, home field, weather, rest days, injury impact)
- Prop prediction model (features: player baselines, opponent rates, game environment)
- Backtest against historical results
- Track model performance over time
- This becomes the engine behind Clutch Edge
```

## nflverse Column Name Gotchas
- Player team field: `latest_team` (NOT `team_abbr`)
- College: `college_name` (NOT `college`)
- Headshot: `headshot` (NOT `headshot_url`)
- Status values: `ACT` (active in-season), `RES` (reserved/offseason), `RET`, `CUT`, `SUS`, `INA`, `DEV`
- nflverse uses `LA` for Rams — normalizeTeamAbbr() in nflSync.js maps it to `LAR`

## Key NFL Files
- `backend/src/services/nflSync.js` — All 5 sync functions (batched)
- `backend/src/services/nflClient.js` — nflverse CSV fetcher
- `backend/src/services/nflScoringService.js` — NFL fantasy scoring
- `backend/src/routes/nfl.js` — GET /api/nfl/players (aggregates stats)
- `backend/prisma/seedNflTeams.js` — NFL team seed data
- `backend/prisma/seedNflInfrastructure.js` — NFL infrastructure seed
- `frontend/src/pages/NflPlayers.jsx` — NFL players table UI
- `frontend/src/pages/NflPlayerDetail.jsx` — NFL player detail page
- `frontend/src/pages/NflTeamDetail.jsx` — NFL team detail page
- `frontend/src/pages/NflSchedule.jsx` — NFL schedule page
- `frontend/src/pages/NflCompare.jsx` — Player comparison tool
- `frontend/src/services/api.js` — getNflPlayers() (~line 731)

---

# ═══════════════════════════════════════════════════════════════
# SECTION 7: PICK SYSTEM ARCHITECTURE — THE DUAL-TRACK MODEL
# ═══════════════════════════════════════════════════════════════

## Overview: Two Ways to Prove It

Clutch tracks manager credibility through TWO distinct but complementary systems.
This is a core differentiator — no one else does both.

```
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│   TRACK 1: LINE PICKS           │  │   TRACK 2: RAW PREDICTIONS      │
│   "Can you pick the right side?" │  │   "How well do you know football?"│
│                                 │  │                                 │
│   Over/Under against a line     │  │   Predict actual stat numbers   │
│   Binary: Win or Lose           │  │   Scored by accuracy (MAE)      │
│   Weekly game-by-game           │  │   Weekly + Season-long          │
│   Proves: market-beating skill  │  │   Proves: deep football knowledge│
│   Audience: sharps              │  │   Audience: fantasy, analysts,  │
│                                 │  │   media personalities           │
└─────────────────────────────────┘  └─────────────────────────────────┘
                    │                                │
                    └──────────┬─────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   CLUTCH RATING     │
                    │   Combined score    │
                    │   from both tracks  │
                    └─────────────────────┘
```

## Track 1: Line Picks (Over/Under)

### Where Lines Come From
**Approach: Snapshot book consensus at a fixed weekly cutoff, then freeze.**

- **Wednesday 12:00 PM ET** — system pulls consensus lines from The Odds API for all
  NFL games that week (game spreads, totals, and major player props)
- Lines are snapshotted and FROZEN on Clutch — they never move after this
- Managers pick against these frozen lines from Wednesday through game lock
- The line a manager picks against is permanently recorded with their pick

**Why this works:**
- Lines are realistic because they come from real books
- But Clutch is NOT a sportsbook — you're not tracking real-time movement
- Everyone picks against the same frozen line = fair comparison
- Wednesday lines for Sunday games are close enough to be meaningful
- Simple to implement, simple to explain

**For Thursday Night / Monday Night games:**
- Lines snapshot at 12:00 PM ET the day before the game

### Line Pick Types Available
- Game spread (e.g., Chiefs -3.5)
- Game total (e.g., Over/Under 47.5)
- Player passing yards (e.g., Mahomes Over/Under 285.5)
- Player rushing yards
- Player receiving yards
- Player receptions
- Player TDs (anytime TD scorer: Yes/No)
- Player pass attempts
- Player completions

### Line Pick Grading
- **Win:** Pick was correct against the frozen line
- **Loss:** Pick was incorrect
- **Push:** Actual result exactly equals the line → pick excluded from record
- **Void:** See void rules below

### Pick Lock Timing
- All picks lock at the scheduled kickoff time of the relevant game
- No edits after lock
- Timestamp is permanent and visible on the manager's profile

## Track 2: Raw Predictions

### Weekly Predictions
Managers can submit raw stat predictions for any upcoming game:
- "I think Mahomes throws for 310 yards this week"
- "I think Derrick Henry rushes for 88 yards"
- "I think the Chiefs score 27 points"

These are NOT over/under picks — they're precise predictions scored by accuracy.

### Season-Long Prediction Contest (THE BIG ONE)

**Opens:** Late spring / early summer (May-June)
**Locks:** Week 1 kickoff
**Scored:** Updated weekly throughout the season, final results after Week 18

**What managers predict (preseason):**

**QB Projections (all starting QBs):**
- Passing yards, passing TDs, INTs, completion %, passer rating

**RB Projections (top 40-50):**
- Rushing yards, rushing TDs, receptions, receiving yards

**WR Projections (top 50-60):**
- Receiving yards, receptions, receiving TDs, targets

**TE Projections (top 20-25):**
- Receiving yards, receptions, receiving TDs

**Team Projections (all 32 teams):**
- Win total, points scored, points allowed

**Awards & Outcomes:**
- MVP, OPOY, DPOY
- Division winners (8 divisions)
- Playoff teams (14 teams)
- Conference champions
- Super Bowl winner

### Raw Prediction Scoring

**Mean Absolute Error (MAE) with Consensus Bonus**

Base score: Average of |prediction - actual| across all predictions.
Lower = better. Simple, everyone understands "you were off by an average of X."

**Consensus bonus multiplier:** When a manager deviates from the field consensus
AND is closer to the actual result, they earn bonus credit.

```
Example:
- Consensus says: Lamar Jackson 4,600 passing yards
- Manager A predicts: 4,550 (playing it safe, near consensus)
- Manager B predicts: 3,900 (bold call — sees regression)
- Actual result: 4,000 passing yards

Base MAE:
- Manager A error: |4,550 - 4,000| = 550
- Manager B error: |3,900 - 4,000| = 100

Manager B was way more accurate AND made a bold, contrarian call.
The consensus bonus rewards this additional insight.
```

**Consensus bonus formula:**
```
If (manager error < consensus error):
    bonus = (consensus_error - manager_error) × 0.1
    adjusted_error = base_error - bonus
```

This means: playing it safe near consensus gets you a decent score. Making bold
calls that are WRONG hurts you normally. Making bold calls that are RIGHT gives
you outsized credit. Separates real football knowledge from following the crowd.

## Void Rules (Both Tracks)

### Automatic Void Conditions

**1. Player ruled inactive/out before kickoff**
- All picks involving that player are VOIDED automatically
- Source: nflverse roster/injury data + manual monitoring

**2. Player exits game early due to injury (mid-game void)**
- If a player plays LESS THAN 50% of their team's offensive/defensive snaps
  AND was removed due to injury (not benching for blowout):
  → All line picks for that player VOIDED
  → Raw predictions for that player EXCLUDED from that week's scoring
- Source: nflverse snap count data (available post-game)

**3. Game cancelled or postponed**
- All picks for that game VOIDED

**4. Player active but gets zero snaps (healthy scratch edge case)**
- Voided

### NOT Voided (Manager took the risk)
- Player plays full game but has a bad day (that's football)
- Player's team in a blowout, pulled in Q4 (50%+ snaps played)
- Key teammate injured but player still plays
- Weather significantly impacts the game (should have accounted for it)

### Void Impact on Scoring
- Voided picks COMPLETELY REMOVED from record — don't count as W, L, or against accuracy
- Manager's win rate, accuracy scores, and Clutch Rating only reflect real, completed picks

---

# ═══════════════════════════════════════════════════════════════
# SECTION 8: THE CLUTCH ECOSYSTEM — PREP, COMPETE, PROVE
# ═══════════════════════════════════════════════════════════════

## The Year-Round Loop

Clutch is not a stats site, not a picks site, not a fantasy site. It's the
ecosystem where serious football people LIVE. Prep, compete, and prove — all
in one place, all feeding each other.

```
    ┌──────────────────────────────────────────────────────────┐
    │                    THE CLUTCH LOOP                        │
    │                                                          │
    │   PREP ──────→ COMPETE ──────→ PROVE ──────→ PREP       │
    │    │              │               │             │         │
    │    │ Projections  │ Weekly picks  │ Leaderboard │         │
    │    │ Cheat sheets │ Predictions   │ Clutch Rating│        │
    │    │ Draft boards │ Contests      │ Badges      │         │
    │    │ Research     │ Head-to-head  │ Social cards │         │
    │    │              │               │              │        │
    │    └──────────────┴───────────────┴──────────────┘        │
    │                                                          │
    │    Everything feeds everything else.                      │
    │    Your projections become your cheat sheet.              │
    │    Your cheat sheet accuracy becomes your credibility.    │
    │    Your credibility drives your Clutch Rating.            │
    │    Your Clutch Rating makes people care about your prep.  │
    └──────────────────────────────────────────────────────────┘
```

## The Offseason Engine (March - August)

### Phase 1: Study Season (March-April)
- Free agency tracker: how do signings change team projections?
- NFL Draft coverage: rookie projections, draft grades
- nflfastR data available for deep dives into last season
- Managers start preliminary projections, test theories

### Phase 2: Prediction Contest Opens (May-June)
- Season-Long Prediction Contest launches
- Managers submit full projections for every relevant player and team
- As projections are entered, Clutch auto-generates a **custom draft cheat sheet**
  built FROM those projections
- The cheat sheet includes:
  - Manager's own player rankings (derived from their stat projections)
  - Tier breaks based on projected stat gaps
  - Value picks: players the manager is higher on than consensus
  - Fade list: players the manager is lower on than consensus
  - Positional rankings with the manager's projected stats inline
  - Printable / mobile-friendly for draft day use

**This is the magic:** By competing in the prediction contest, you're simultaneously
building your draft prep. The two activities are the same activity. You're not doing
extra work — the contest IS the prep.

### Phase 3: Draft Season (July-August)
- Managers finalize projections (lock before Week 1)
- Draft cheat sheets finalized and ready for draft day
- Managers can compare their boards to other managers
- "Manager X has Justin Jefferson as WR1 with 1,450 projected yards.
   Manager Y has him WR3 at 1,280. Who's right? We'll find out."
- Community discussion around projection disagreements
- Shareable draft boards: "Here's my 2026 board on Clutch" → social sharing

### Phase 4: Draft Day Tools
- Live draft companion using the manager's own Clutch cheat sheet
- Real-time tracking of which players are available
- Dynamic recommendations based on what's been drafted
- Post-draft grade: "Based on your projections, your team scored an A-"
  (graded against the manager's OWN rankings, not some generic system)

## The In-Season Engine (September - February)

### Weekly Cycle

**Tuesday-Wednesday:** Pick submission window opens
- Line picks: Wednesday noon ET lines are frozen, managers pick sides
- Raw predictions: submit projected stat lines for any player
- Content: Clutch Scout AI previews drop

**Thursday:** TNF picks lock at kickoff
- TNF prediction tracking begins

**Sunday:** Main slate
- All Sunday picks locked at respective kickoffs
- Live tracking: pick status, prediction accuracy updating in real-time
- "Mahomes at 198 passing yards through 3 quarters — you predicted 310"
- Live leaderboard updates

**Monday:** MNF + grading
- MNF picks lock and track
- Full week grading runs after MNF completes
- Manager profiles updated: new W/L, new accuracy scores
- Weekly leaderboard published
- Prediction contest standings updated
- Badges awarded

### In-Season Prediction Contest Tracking
Every week, the prediction contest updates:
- "Through Week 8, your Lamar Jackson projection of 3,900 yards is tracking at
   3,850 pace. You're currently the 3rd most accurate QB projector."
- Pace tracking: are players on pace to hit your projection?
- Managers can see where they're winning (great RB projections) and losing
  (bad WR projections)
- This keeps engagement with the prediction contest alive ALL season

## Manager Profile — Three Credibility Lanes

### Lane 1: Pick Record
- Weekly over/under line picks
- Win/Loss record, win rate, current streak
- By sport, by pick type (game picks vs player props)
- Proves: Can this person pick the right side consistently?

### Lane 2: Prediction Accuracy
- Raw stat predictions scored by MAE
- Weekly accuracy rank, rolling season accuracy
- Bold call bonus (consensus-beating correct predictions highlighted)
- Proves: Does this person deeply understand football?

### Lane 3: Draft Intelligence
- Preseason projection accuracy (scored after season ends)
- Player ranking accuracy vs actual positional finishes
- Draft cheat sheet performance
- Year-over-year improvement tracking
- Proves: Is this person's prep game elite?

### How They Feed the Clutch Rating

```
Clutch Rating (0-100) for NFL:
├── Pick Record:            30%
│   ├── Win rate (recency weighted)
│   ├── Volume (minimum picks required)
│   └── Consistency (low variance)
├── Prediction Accuracy:    30%
│   ├── Weekly prediction MAE
│   ├── Consensus bonus earned
│   └── Volume of predictions submitted
├── Draft Intelligence:     20%
│   ├── Season-long contest finish
│   ├── Player ranking accuracy
│   └── Projection calibration
├── Consistency:            10%
│   ├── Active every week
│   ├── Multiple categories
│   └── Year-over-year participation
└── Volume/Breadth:         10%
    ├── Total picks + predictions
    ├── Multiple sports (golf + NFL)
    └── Multiple pick types
```

## Draft Cheat Sheet — Product Spec

### Auto-Generated From Projections
When a manager enters projections in the Season-Long Contest, Clutch
auto-generates a personalized draft cheat sheet:

**Cheat Sheet Contents:**
- **Overall Rankings:** All players ranked by projected fantasy points
  (calculated from manager's stat projections × scoring system)
- **Positional Rankings:** QB, RB, WR, TE with projected stats inline
- **Tier Breaks:** Auto-detected based on point gaps between players
- **Value Column:** Where manager diverges from consensus
  - 🟢 Green: Manager higher than consensus (value target)
  - 🔴 Red: Manager lower than consensus (fade candidate)
- **Notes Field:** Personal notes per player
- **Scoring System Toggle:** PPR / Half-PPR / Standard / Custom
- **ADP Comparison:** Manager's rank vs current Average Draft Position

**Formats:**
- Interactive web version (drag to re-rank, expand player details)
- Printable PDF (clean, one-page-per-position layout)
- Mobile-optimized for draft day

**Sharing:**
- Public or private toggle
- Shareable link: "Check out my 2026 draft board on Clutch"
- Social card: top 5 overall + biggest value picks

### Customization Beyond Projections
Managers can manually adjust rankings after auto-generation:
- Drag players up/down to override projection-based ranking
- Add "DO NOT DRAFT" tags, "SLEEPER" tags
- Add round-target notes ("Target in Round 3-4")
- All manual adjustments tracked — end of season shows
  "Your manual overrides were right 60% of the time"

---

# ═══════════════════════════════════════════════════════════════
# SECTION 9: THE PROJECTION EXPERIENCE & YOUR FOOTBALL DATABASE
# ═══════════════════════════════════════════════════════════════

## The Pitch: Why Would Anyone Enter 200+ Projections?

This is the critical question. If the projection contest feels like homework,
nobody does it. The pitch has to be: **this is the most valuable thing you'll
ever build for yourself as a fantasy manager, and it happens to also be a
competition.**

### What You're Actually Building (The Manager Pitch)

**"Every serious fantasy manager has years of opinions trapped in their head."**

You were right about Jayden Daniels last year — but you can't prove it.
You always fade Bengals receivers — but you don't know why.
You keep drafting the wrong QB in round 5 — but you can't see the pattern.
Your draft prep lives in screenshots, text threads, and spreadsheets you
lose every year.

Clutch changes that.

When you enter your projections on Clutch, you're not just competing.
You're building a **permanent, searchable record of every football opinion
you've ever had — and whether you were right.** Year over year, it becomes
the most valuable tool you own as a fantasy manager.

**It's your draft journal.**
**It's your decision log.**
**It's your self-scouting report.**
**It's your cheat sheet.**
**It's your competition entry.**
**All the same activity.**

## The Projection Interface — Making It Worth the Time

### It Can't Feel Like a Spreadsheet

The #1 reason people won't enter projections is if it feels like filling out
a tax form. The interface has to make the process ENJOYABLE and VALUABLE
in itself — not just for the competition output.

### What the Manager Sees When Projecting a Player

When you click on, say, Derrick Henry to enter his rushing yard projection,
you don't see a blank text field. You see:

```
┌──────────────────────────────────────────────────────────────┐
│  DERRICK HENRY — RB — Baltimore Ravens                       │
│                                                              │
│  📊 LAST 3 SEASONS                                          │
│  2025: 1,407 rush yds | 13 TD | 4.8 YPC | 290 carries      │
│  2024: 1,921 rush yds | 16 TD | 5.1 YPC | 376 carries      │
│  2023: 1,167 rush yds | 12 TD | 4.2 YPC | 280 carries      │
│                                                              │
│  📈 CONTEXT                                                  │
│  • Age: 32 (entering age-32 season)                          │
│  • OL ranked: 8th in run blocking (nflfastR EPA)             │
│  • Offensive coordinator: Todd Monken (run rate: 42%)        │
│  • Team projected wins: consensus 10.5                       │
│  • Backup: Justice Hill (15% snap share last year)           │
│                                                              │
│  👥 WHAT OTHERS ARE PROJECTING                               │
│  • Clutch consensus: 1,180 rush yards (so far)               │
│  • Range: 850 — 1,400                                        │
│  • Your projection would rank: higher/lower than X% of field │
│                                                              │
│  YOUR PROJECTION                                             │
│  Rushing yards: [________]                                    │
│  Rushing TDs:   [________]                                    │
│  Receptions:    [________]                                    │
│  Receiving yds: [________]                                    │
│                                                              │
│  📝 YOUR REASONING (optional but powerful)                   │
│  [                                                    ]       │
│  [  "Age cliff year. OL lost two starters in FA.     ]       │
│  [   Think he drops to 250 carries. 4.3 YPC.         ]       │
│  [   Projecting 15% decline from 2025."              ]       │
│  [                                                    ]       │
│                                                              │
│  🏷️ TAGS                                                     │
│  [ ] Sleeper    [ ] Bust risk    [ ] Value    [ ] Fade       │
│  [ ] Breakout   [ ] Injury risk  [✓] Age decline             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**This is the key insight:** By showing context WHILE they project, you're making
the projection process itself a research experience. The manager is learning as
they go. They're not just typing numbers — they're forming opinions with data
in front of them. The process IS the prep.

### The Reasoning Field

The optional reasoning note is the single most valuable feature in the
entire projection system. Here's why:

**In the moment:** It forces the manager to articulate WHY they think what
they think. "I think Henry declines" is a feeling. "Henry is 32, lost two OL
starters, and I project 15% fewer carries" is analysis. Writing it down makes
you a better analyst.

**After the season:** The reasoning becomes a decision audit log. In December,
when Henry either did or didn't decline, you can go back and read exactly what
you were thinking. Not "I think I was high on Henry that year" — the actual
words you wrote and the logic you used.

**Across years:** THIS is where the real magic happens. See next section.

### Flow Optimization: Making 200+ Projections Manageable

**Nobody enters all 200+ in one sitting.** The system needs to support:

- **Save progress** — come back anytime, pick up where you left off
- **Position batches** — "Project all QBs" as a focused session
- **Quick mode** — just the numbers, no context panels, for experienced managers
  who already did their research
- **Guided mode** — full context panels, recommended for first-time users
- **Copy from last year** — pre-populate with your previous year's projections
  as a starting point, adjust from there
- **Import from spreadsheet** — for managers who already have projections in a
  spreadsheet, let them CSV upload and map columns
- **Progress tracker** — "You've projected 145 of 220 players (66%)"
- **Position completion badges** — "QBs ✅ RBs ✅ WRs ⬜ TEs ⬜"

### Tiered Participation — Meet People Where They Are

**Not everyone projects 220 players. That's okay. That's by design.**

The prediction contest supports three participation tiers. Each tier has its
own leaderboard and feeds the Clutch Rating appropriately. Managers can
always upgrade tiers by adding more projections before lock.

#### Tier 3: My Team (Casual Fan)
**Time commitment:** ~15-20 minutes
**What you project:** All starters and key backups for ONE team
- Example: "I'm a Rams fan" → project Stafford, Nacua, Kyren Williams,
  Kupp, key defensive players, team wins, team points
- Roughly 12-18 player projections + team totals
- **Who this is for:** The fan who knows their team cold but doesn't follow
  the whole league closely
- **What you get:**
  - Accuracy score for your team's projections
  - "Best [Team] Projector" leaderboard ranking
  - Your team-specific cheat sheet section
  - Self-scouting for your team's players only
  - Still builds your Clutch Rating (at reduced weight since fewer projections)

#### Tier 2: Position Expert (Serious Fan)
**Time commitment:** ~1-2 hours (can be spread across sessions)
**What you project:** Top tiers of the skill positions
- Tier 1/2 QBs (top 16-20)
- Tier 1/2/3 RBs (top 30-36)
- Tier 1/2/3 WRs (top 36-40)
- Tier 1/2 TEs (top 12-15)
- All 32 team win totals
- Roughly 100-120 projections
- **Who this is for:** The fantasy manager who preps for their draft but
  isn't going to project every backup and deep sleeper
- **What you get:**
  - Full positional accuracy scores
  - Eligible for main contest leaderboard (with tier badge)
  - Complete draft cheat sheet for all projected players
  - Self-scouting by position
  - Full Clutch Rating credit for prediction accuracy

#### Tier 1: The Full Slate (Die Hard)
**Time commitment:** ~3-5 hours (spread across weeks)
**What you project:** Every fantasy-relevant player
- All starting QBs + top backups (28-32)
- Top 50+ RBs
- Top 60+ WRs
- Top 25+ TEs
- All 32 team wins, points scored, points allowed
- Awards: MVP, OPOY, DPOY
- Playoff teams, division winners, conference champs, Super Bowl
- 200+ projections
- **Who this is for:** The grinder. The person who already does this in
  spreadsheets. Influencers and content creators who want the full record.
- **What you get:**
  - Everything from Tier 2, plus:
  - Eligible for "Full Slate" leaderboard (the prestige board)
  - Deep sleeper accuracy tracking
  - Complete self-scouting report with full positional breakdowns
  - Maximum Clutch Rating weight for prediction accuracy
  - "Full Slate" badge on profile (signals commitment)

### How Tiers Affect Leaderboards and Scoring

**Separate leaderboards by tier:**
- "Full Slate Top Projectors" — only Tier 1 managers (the prestige board)
- "Position Expert Top Projectors" — Tier 2+ managers
- "Best [Team Name] Projector" — anyone who projected that team (including Tier 3)
- "Best QB Projector" — anyone who projected QBs regardless of tier
- "Best RB Projector" — same, for any manager who did RBs

**You can only be compared on players you actually projected.** A Tier 3 Rams
fan is never scored on Patrick Mahomes projections they didn't make. Their
accuracy score is only for players they projected.

**Clutch Rating impact scales with tier:**
```
Prediction Accuracy weight in Clutch Rating:
- Tier 1 (Full Slate):    30% of total rating (full weight)
- Tier 2 (Position Expert): 22% of total rating
- Tier 3 (My Team):       12% of total rating

The remaining weight redistributes to other Clutch Rating components
(pick record, consistency, etc.) so no one is penalized — they just
get less CREDIT from predictions if they did fewer.
```

**Upgrade path is always open:**
- Start as Tier 3 in May
- Add more players over the summer as you do more research
- By August, you've worked your way up to Tier 2 or Tier 1
- The tier assignment is based on completeness at lock time, not at sign-up

### Why This Matters for Adoption

**The funnel:**
```
Casual fan hears about Clutch
        │
        ▼
"I'll just project my Rams" (Tier 3, 15 min)
        │
        ▼
Gets accuracy scores, sees leaderboard, thinks "I'm pretty good"
        │
        ▼
"Let me try the top RBs too" (adds projections, moves toward Tier 2)
        │
        ▼
By next year, they're doing the Full Slate (Tier 1)
        │
        ▼
Three years in, they have a comprehensive football database
```

**You never ask for everything upfront. You let the product pull them deeper.**

### Team-Specific Leaderboards (Powerful for Community)

Every NFL team gets its own "Best Projector" leaderboard. This is powerful because:

- **32 different communities** built into the product automatically
- Rams fans compete against other Rams fans
- Local pride drives engagement: "I'm the #1 Rams projector on Clutch"
- Team subreddits, fan forums, and team Twitter will share these
- Even Tier 3 casual fans can win their team's leaderboard
- Creates 32 shareable social cards per season
- Team-specific badges: "Top Rams Projector 2026" 🐏

## Your Football Database — The Multi-Year Self-Scouting Report

### What Accumulates Over Time

After one season on Clutch, you have a record.
After three seasons, you have a DATABASE. Here's what it contains:

**Every projection you ever made:**
- Player name, stat category, your number, actual result, error
- Your reasoning note (if entered)
- Your tags (sleeper, bust, value, fade, etc.)
- Where you ranked vs consensus and vs field
- Whether your projection was above or below actual

**Every pick you ever made:**
- Line picks: what side you took, the line, the result
- Timestamped, locked, immutable

**Every draft cheat sheet you ever built:**
- Your rankings by position, by year
- Where you diverged from ADP
- Which manual overrides you made and whether they were right

**Every weekly prediction:**
- Player stat predictions per week
- Accuracy scores per week

### Self-Scouting Reports (Automated Insights)

After accumulating data, Clutch can surface patterns the manager can't see
themselves. These are auto-generated insights on the manager's private dashboard:

**Positional Bias Detection:**
"Over the last 3 seasons, you've overestimated RB1s by an average of 8%
and underestimated WR2s by 12%. You might be anchoring too much to
previous-year production for running backs."

**Age Curve Blind Spots:**
"You've projected players age 30+ to maintain production 3 years in a row.
Actual results show an average 18% decline. Consider applying a stronger
age discount."

**Team Bias:**
"You've been 22% more accurate projecting AFC teams than NFC teams.
Your NFC West projections have been your weakest area."

**Breakout Detection Accuracy:**
"You tagged 8 players as 'sleeper' last year. 3 of them broke out (37.5%).
The Clutch average sleeper hit rate is 22%. You have a real eye for breakouts."

**Consistency Patterns:**
"Your Week 1-4 predictions are significantly less accurate than your
Week 8-17 predictions. You might benefit from being more conservative
early in the season before trends stabilize."

**Year-Over-Year Improvement:**
"Your overall projection accuracy improved 14% from 2026 to 2027.
Biggest improvement area: QB rushing yards (+31% more accurate).
Biggest decline area: TE touchdowns (-8% less accurate)."

**Draft Decision Audit:**
"In 2026, you tagged Jayden Reed as a 'sleeper' and ranked him WR18.
He finished WR11. Your reasoning: 'Targets will increase with new OC.'
You were right — target share went from 18% to 24%.
This is the kind of call that separates you."

### The Multi-Year View

```
YOUR CLUTCH FOOTBALL DATABASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Season   | Proj. Accuracy | Pick Record | Contest Rank | Clutch Rating
2026     | 82nd pctl      | 58.3% W     | 14th / 450   | 74
2027     | 89th pctl      | 61.1% W     | 6th / 1,200  | 82
2028     | 91st pctl      | 59.8% W     | 3rd / 3,400  | 88

Career Strengths: WR projections, player prop picks, breakout identification
Career Weaknesses: Aging RB projections, game total picks, TE touchdowns

Bold Calls That Hit:
• 2026: Called Jayden Daniels MVP (14:1 preseason)
• 2027: Projected Bijan Robinson 1,800 rush yards (actual: 1,744)
• 2028: Had Bears winning NFC North at +450

Your Legacy:
"3-year veteran. Top-15 projector every season. Known for WR accuracy
and breakout picks. Rising star on the platform."
```

**This is the pitch.** You're not asking someone to enter 200 numbers into a box.
You're asking them to build the most comprehensive record of their football
knowledge that has ever existed. And it gets more valuable every year they do it.

## Draft Cheat Sheet — Expanded Product Spec

### What Makes a Great Cheat Sheet

Most cheat sheets suck because they're generic. ESPN's cheat sheet is the same
for everyone. Yahoo's is the same for everyone. FantasyPros aggregates other
people's rankings — not yours.

A Clutch cheat sheet is built FROM YOUR OWN PROJECTIONS. It's the only cheat
sheet in the world that reflects what YOU actually think will happen. That's
why it's better.

### Auto-Generation From Projections

When a manager finishes entering projections, Clutch automatically generates:

**Overall Rankings (The Big Board)**
- Every projected player ranked by expected fantasy points
- Fantasy points calculated from the manager's OWN stat projections
- Scoring system toggle: PPR / Half-PPR / Standard / Custom
- The rankings ARE the manager's projections, just translated into draft order
- Example: if you project Henry at 1,100 rush yards / 10 TDs / 25 rec / 180 rec yds,
  Clutch calculates his PPR fantasy points and ranks him accordingly

**Positional Rankings with Context**
```
YOUR QB RANKINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Rank | Player          | Your Proj Pts | ADP  | Gap  | Notes
─────┼─────────────────┼───────────────┼──────┼──────┼──────
 1   | Mahomes         | 387.2         | QB1  | —    |
 2   | Lamar           | 374.8         | QB2  | —    |
 3   | Daniels         | 361.0         | QB5  | 🟢+2 | "Leap year"
─── TIER BREAK ──────────────────────────────────────────
 4   | Stroud          | 338.5         | QB3  | 🔴-1 |
 5   | Allen           | 335.1         | QB4  | 🔴-1 | "Less rushing"
─── TIER BREAK ──────────────────────────────────────────
 6   | Hurts           | 310.2         | QB6  | —    |
```

**Tier Breaks:** Auto-detected based on point gaps between consecutively ranked
players. Where there's a big drop-off in your projected points, that's a tier
break. This tells you during a draft: "I need to grab a QB before this tier
ends."

**Value Column (The Divergence Indicator):**
- 🟢 Green up arrow + number: You're higher than ADP (value target in drafts)
- 🔴 Red down arrow + number: You're lower than ADP (fade in drafts)
- This is the most actionable column on the sheet — it tells you exactly
  where to zig when others zag

**Your Notes:** Any reasoning notes you entered during projections appear here
as a reminder. During the draft, you can glance at your note and remember
WHY you're higher on Daniels and lower on Allen.

### Draft Day Live Companion

**Not just a printout — an active tool during the draft:**

- Connect to your league's draft (Sleeper, ESPN, Yahoo integration — future feature)
- As players are drafted, they're crossed off your board
- Dynamic recommendations: "Based on your rankings, best available value
  at your next pick is Jaylen Waddle (your WR8, ADP WR14 — you're 6 spots
  higher than the market)"
- Position scarcity alerts: "Only 2 TEs left in your Tier 1. Next pick
  might be your last shot."
- Real-time board: who's still available at each position, sorted by YOUR rankings

### Post-Draft Grade (Personalized)

After the draft, Clutch grades your team — but not against generic rankings.
Against YOUR OWN projections:

"Based on your projections, your drafted team projects to score 1,847 fantasy
points this season. Here's how that breaks down:

- QB: Lamar Jackson — YOUR QB2 — Great value, fell to round 5
- RB1: Bijan Robinson — YOUR RB1 — Reached slightly, but he's your guy
- RB2: Josh Jacobs — YOUR RB14 — You're lower on Jacobs than most.
  Your note said: 'regression candidate, new OC.' Interesting pick given
  your own projection. Are you overriding your own research?
- WR1: Jaylen Waddle — YOUR WR8 — Huge value pick, ADP was WR14

Draft Grade: A-
Consistency with your own research: 78%
Times you overrode your own rankings: 3"

**That last stat is gold.** It tells you whether you trust your own prep or
whether you panic-draft based on the room. Over multiple years, you can see
if you draft better when you stick to your board or when you go off-script.

## League Integration — The Connected Intelligence Layer

### Why This Changes Everything

Right now, a fantasy manager's data is scattered across five places:
- Projections: in a spreadsheet they lose every year
- Draft results: locked inside ESPN/Yahoo/Sleeper
- Weekly lineups: in the league app
- Results: on some scoreboard they never revisit
- Analysis: in their head, in text threads, gone forever

If Clutch connects to even SOME of this, the AI coaching becomes
transformational. You're not just tracking whether projections were right —
you're tracking whether the manager's ENTIRE DECISION CHAIN was right.
Projections → draft behavior → roster construction → lineup decisions → outcomes.
Nobody has this connected today.

### Integration Approaches (Phased)

**Phase 1: Manual League Import (MVP)**
- Manager enters: league format (snake/auction), roster settings,
  scoring system, number of teams
- Manager enters: their draft results (who they drafted, what round/price)
- Manager enters: final season record and finish
- This is enough to connect projections → draft → outcome
- Low technical lift, high insight value

**Phase 2: Platform API Integration (Future)**
- Sleeper API (most open, best documented, growing fast)
- ESPN Fantasy API
- Yahoo Fantasy API
- Auto-import: draft results, weekly rosters, scores, standings
- Real-time lineup tracking during season
- This is the full connected experience but requires API work

**Phase 3: Clutch-Native Leagues (Long-Term)**
- Host leagues directly on Clutch
- Full control of the data
- Every decision lives in the ecosystem natively
- This is the end state but years away — don't build this first

### What Connected Data Unlocks

#### The Projection-to-Draft Pipeline

When Clutch knows both your projections AND your draft results:

```
YOUR 2026 DRAFT ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Draft Type: Auction ($200 budget, 12-team PPR)
Strategy Detected: Zero-RB (72% of budget on WR/TE/QB)

BUDGET ALLOCATION vs YOUR PROJECTIONS:
Position  | You Spent | League Avg | Your Proj Accuracy
QB        |    $24    |   $21      | 88th percentile
RB        |    $19    |   $48      | 61st percentile  ← you overspend here
WR        |   $112    |   $78      | 93rd percentile  ← your edge
TE        |    $38    |   $31      | 79th percentile
Bench     |     $7    |   $22      | n/a

KEY INSIGHT: You allocated 56% of your budget to WRs, where your
projection accuracy is 93rd percentile. That's smart money — you're
spending the most where you have the most knowledge.

But you spent $19 on RBs where your projections are only 61st percentile.
Your bench RBs (the $1-3 guys) returned -34% vs your projections.

RECOMMENDATION: Next year, consider spending even LESS on RBs ($12-15)
and putting that $4-7 toward an extra mid-tier WR or better bench depth
at positions you project more accurately.
```

#### The Multi-Year Strategy Analysis

After 3 years of connected data, the AI can see deep patterns:

```
YOUR 3-YEAR AUCTION STRATEGY PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Strategy: Zero-RB (consistent across all 3 years)
League Record: 28-13 (.683) | 2 championships, 1 semifinal exit

WHAT'S WORKING:
✅ WR projection accuracy: 91st percentile (3-yr average)
✅ WR auction spend: 52% of budget → highest ROI position for you
✅ Late-round QB strategy: your QB picks outperform cost by 22%
✅ You identify WR breakouts at a 41% hit rate (platform avg: 22%)

WHAT'S NOT WORKING:
⚠️ RB projection accuracy: 58th percentile (3-yr average)
   You overproject RBs by ~10% every year. Specifically:
   - Aging RBs (28+): you overproject by 18%
   - Rookies: you overproject by 7%
   - Prime RBs (24-27): actually accurate (82nd percentile)

⚠️ BUT HERE'S THE INTERESTING PART:
   Your RB overvaluation might actually HELP you in auctions.
   You see RBs as more valuable than they are → you know the market
   also overvalues them → you avoid the bidding wars → you spend
   that money on WRs where you have a real edge.

   Your 0-RB strategy wins BECAUSE of your RB bias, not despite it.
   You're exploiting the market's overvaluation of the same position
   you personally overvalue.

⚠️ Bench RB picks: -22% vs projection across 3 years
   Your $1-3 auction RBs are consistently bad. Consider:
   - Spending that $3-9 total on a 2nd defense or kicker stream
   - Or rolling it into your WR budget

THE PATTERN YOU CAN'T SEE YOURSELF:
Your championship years (2026, 2027) had one thing in common:
you spent $35+ on a TE. Your semifinal exit year, you went cheap
at TE ($12). With your projection accuracy at TE (79th percentile),
you have enough edge there to justify the premium spend.

GOING INTO 2029, CONSIDER:
1. Keep zero-RB — it's working, your data proves it
2. Apply a 10% haircut to your RB projections manually (you'll be
   more accurate and it'll reinforce your draft strategy)
3. Budget $35+ for a TE — your data shows this is correlated with
   your championship finishes
4. Stop spending $1-3 on bench RBs — reallocate to WR depth
```

**This is AI coaching that can only exist because projections, draft data,
and outcomes all live in the same system.** No podcast can give you this.
No generic article can give you this. It's built from YOUR data, YOUR
patterns, YOUR history.

### Auction Draft — The Underserved Market

You're right that auction drafts are massively underserved in content.
Here's why Clutch is uniquely positioned to own this space:

**Why podcasters ignore auctions:**
- Hard to give generic advice ("it depends on your league")
- Budgets vary, league sizes vary, settings vary
- Can't say "draft Mahomes in round 4" — there are no rounds
- Auction strategy is deeply personal and contextual

**Why Clutch can serve auctions:**
- Your projections + your league settings = personalized dollar values
- Your draft history + your outcomes = personalized strategy insights
- AI can analyze YOUR specific auction tendencies, not generic advice

**Auction-Specific Tools (Built From Projections):**

**Dollar Value Generator:**
- Takes manager's stat projections → converts to fantasy points →
  applies auction value formula based on league settings
- "Based on YOUR projections, in YOUR 12-team PPR auction with $200 budget:
  Mahomes is worth $26, Lamar is worth $24, Daniels is worth $21"
- These values ARE the manager's projections translated to auction currency
- Adjusts for: league size, scoring format, roster spots, budget

**Budget Allocation Planner:**
- Based on manager's projections and historical draft behavior:
  "Given your projection profile, here's your optimal budget split"
- Shows: recommended spend per position vs what manager typically spends
- Highlights: where manager's accuracy justifies premium spend

**Live Auction Companion:**
- Track budget remaining for all teams in real-time
- "Manager X has $42 left with 6 spots to fill — they can't bid over $37"
- Shows your pre-set dollar values vs current bidding
- Alerts: "Waddle is going for $8 under YOUR value — bid!"
- Alerts: "Henry is $6 over YOUR value — let him go"
- Post-auction: immediate grade against your own values

### Snake Draft — Still Supported, Just Different Tools

**ADP Arbitrage View:**
- Your rankings vs ADP: where to target, where to let someone else pay
- Round-by-round recommendations based on YOUR tier breaks
- "In round 3, your top available targets are likely: [players in your
  Tier 2 WRs who typically go in this range]"

**Mock Draft Mode (Future):**
- Practice drafts using YOUR projections as the value backbone
- AI opponents draft based on ADP/consensus
- Tests whether your strategy plays out against realistic competition

### The League Commissioner Angle

**Getting whole leagues on Clutch:**

If one person in a league is on Clutch, that's one user.
If the whole league is on Clutch, that's 10-14 users who:
- All enter projections (friendly competition within the league)
- All have draft cheat sheets
- All get league-specific insights
- "Your league's best projector last year was Mike — he was 14% more
  accurate than the league average"
- League-specific leaderboard: who in YOUR league knows football best?
- Bragging rights that are verified and permanent

**The commissioner pitch:**
"Get your league on Clutch. Everyone enters projections before the draft.
At the end of the season, you'll know who actually knows football and who
just got lucky. Plus everyone gets a custom cheat sheet built from their
own research. It's free and it makes your league more competitive."

This is a powerful viral loop: one person joins → tells their league →
10+ new users → those users are in OTHER leagues too → tell those leagues.

## How This All Sells Itself

### The Word-of-Mouth Moments

These are the moments that make managers tell their friends about Clutch:

**"Dude, Clutch just told me I overestimate aging RBs every year"**
→ That's a self-scouting insight no one else provides

**"My cheat sheet was built from my own projections — it's not some generic ESPN list"**
→ That's a draft prep tool no one else provides

**"I can see my exact reasoning from last year's draft and whether I was right"**
→ That's a decision journal no one else provides

**"Some random guy from Ohio just outprojected the Fantasy Footballers and it's verified"**
→ That's a competition story no one else provides

**"My Clutch Rating went from 74 to 82 this year — I'm actually getting better"**
→ That's a self-improvement signal no one else provides

### The Pitch by Audience

**To the casual fantasy manager:**
"Stop losing your draft prep every year. Clutch remembers everything so
you don't have to. Enter your projections, get a custom cheat sheet, and
actually see if your takes were right."

**To the serious fantasy manager:**
"You already do this work in spreadsheets. Put it on Clutch and get a
permanent record, self-scouting insights, and a public ranking that
proves you know what you're doing."

**To the influencer/podcaster:**
"Your audience trusts you because of your personality. Clutch lets you
prove they SHOULD trust you because of your accuracy. Your Clutch profile
is your verified resume."

**To the league commissioner:**
"Get your whole league on Clutch. Everyone enters projections, everyone
gets a custom cheat sheet, and at the end of the season you know who
actually knows football and who just got lucky."

---

# ═══════════════════════════════════════════════════════════════
# SECTION 10: CROSS-SPORT CONSIDERATIONS
# ═══════════════════════════════════════════════════════════════

## Things That Must Stay Sport-Agnostic

These components should NEVER have sport-specific logic in the application layer:

1. **Pick tracking schema** — same `clutch_picks` table for golf and NFL
2. **Clutch Rating calculation** — same formula regardless of sport
3. **Leaderboard** — filters by sport but same ranking logic
4. **Badge system** — sport-specific badges but same awarding engine
5. **Manager profile** — same layout, sport tabs for detail
6. **Social card generation** — same templates, different content

## Things That ARE Sport-Specific (and that's okay)

1. **Data pipelines** — different providers per sport (DataGolf vs nflfastR)
2. **Clutch metrics** — CPI/Course Fit for golf vs CPR/QB Score for NFL
3. **Auto-grading rules** — different logic per pick type per sport
4. **Content templates** — tournament preview format vs game preview format
5. **Pick type definitions** — golf outrights vs NFL spreads

## The Odds API as Cross-Sport Backbone

**Strong recommendation:** Use The Odds API as your centralized odds provider across ALL sports.
- One API, one schema, one ETL pipeline
- Covers: NFL, NBA, MLB, NHL, college sports, golf, soccer, UFC, tennis
- Reduces the number of provider relationships you manage
- Odds data flows into the same `clutch_odds` canonical structure regardless of sport
- Makes the Clutch Edge value detection engine sport-agnostic

---

# ═══════════════════════════════════════════════════════════════
# SECTION 11: MONETIZATION — FREE VS PREMIUM
# ═══════════════════════════════════════════════════════════════

## The Rule: Free Gets Them In, AI Coaching Keeps Them Paying

Everything that creates engagement is free. Everything that creates
personalized insight is premium. The line is clean and defensible.

## Free Tier (The Funnel)

**Stats & Data:**
- Full NFL stats pages (player, team, game) with real stat names
- Leaderboards (all types — full slate, positional, team-specific)
- Public manager profiles and Clutch Ratings

**Participation:**
- Enter projections (all tiers — My Team through Full Slate)
- Make weekly line picks and raw predictions
- Basic cheat sheet auto-generated from projections
  (overall rankings + positional rankings + tier breaks)
- Basic accuracy scores and W/L records
- Badges and social card sharing

**Content:**
- Weekly Clutch Scout AI game previews (basic version)
- Consensus projections and pick aggregations
- Leaderboard updates and weekly recaps

**Community:**
- Compare your picks/projections to other managers
- Team-specific leaderboards
- League leaderboard (if league mates are on Clutch)

**Why it's free:** All of this creates content, engagement, and data.
Every projection entered makes the consensus better. Every pick made
makes the leaderboard more meaningful. Free users ARE the product's
value — their participation is what attracts premium users.

## Premium Tier — "Clutch Pro" (~$9.99-14.99/month or ~$79-99/year)

**AI Coaching (THE paywall feature):**
- Self-scouting reports: positional bias detection, accuracy patterns,
  blind spot identification, year-over-year improvement tracking
- Connected draft analysis: projection accuracy → draft behavior →
  budget allocation → roster construction → outcomes
- Multi-year strategy profile: "here's what's working, here's what isn't,
  here's what to change"
- Auction-specific insights: optimal budget allocation based on YOUR
  projection strengths, historical spending efficiency
- Pattern detection: "you always overproject aging RBs" or "your sleeper
  hit rate is elite — trust your instincts more"
- Personalized recommendations: "going into next year, here are 3
  specific adjustments backed by your data"

**Enhanced Draft Tools:**
- Advanced cheat sheet: value column with consensus divergence,
  ADP arbitrage indicators, round-by-round targeting suggestions
- Auction dollar value generator (personalized from YOUR projections
  and YOUR league settings)
- Budget allocation planner based on your historical patterns
- Live draft companion with real-time alerts and recommendations
- Post-draft grade against your own rankings with override tracking

**Enhanced Predictions:**
- Clutch Scout AI deep-dive previews (longer analysis, specific
  pick recommendations with reasoning, prop breakdowns)
- Clutch Edge value detection: where your projections disagree with
  market lines, quantified edge percentages
- Prop model projections: Clutch's AI stat projections compared to
  book lines with recommended picks

**Enhanced Profile:**
- Detailed analytics dashboard (performance charts, calendar heatmaps,
  rolling accuracy trends, position-by-position breakdowns)
- Head-to-head comparison tool (overlay your record against any manager)
- Export your data (CSV download of all projections, picks, and results)

## Why This Paywall Works

**It's not content behind a wall.** The free tier isn't a crippled version
of the product. It's a fully functional projection contest, pick tracker,
and cheat sheet generator. People who never pay still get genuine value
and still contribute to the platform.

**The premium is genuinely new insight.** The AI coaching analyzes YOUR
multi-year data in ways you can't do yourself. It connects dots across
seasons, across draft formats, across positions. It's not "more of the same
stuff but unlocked" — it's a different category of value.

**It gets more valuable over time.** Year 1 of premium: basic pattern
detection. Year 3 of premium: deep multi-year strategy analysis with
connected draft, lineup, and outcome data. The longer you pay, the more
your data accumulates, the better the insights get. Natural retention.

**The free-to-paid conversion is organic.** Someone enters projections for
free → sees their accuracy score → thinks "I wonder what I'm getting wrong
and how to improve" → that answer is behind the paywall. The curiosity is
built into the product.

---

# ═══════════════════════════════════════════════════════════════
# SECTION 12: THE COMPETITIVE MOAT
# ═══════════════════════════════════════════════════════════════

## Why This Is Hard to Copy

### Data Moat (Compounds Every Season)

After 3 seasons, Clutch has:
- Millions of timestamped, locked player projections with reasoning notes
- Hundreds of thousands of graded picks with verified outcomes
- Complete draft behavior data across auction and snake formats
- Connected outcome data linking projections → drafts → results
- Self-scouting history for every manager on the platform
- The most accurate consensus projections in fantasy sports
  (because the best projectors in the world are contributing)

A competitor launching in Year 4 starts with zero history.
They can copy every feature, but they can't copy 3 years of data.
Every manager on Clutch has a personal football database they can't
take with them. Switching costs increase every season.

### Network Moat (The Flywheel)

Clutch gets better as more people use it:
- More projections → better consensus → more useful for everyone
- More managers → more competitive leaderboard → more meaningful Clutch Ratings
- More influencers → more audience exposure → more unknown managers join
- More league mates → more league-specific features → stickier for everyone
- More data → better AI coaching → higher premium conversion → more investment
  in the platform → better features → more users

This flywheel is hard to kickstart and even harder to replicate.

### Brand Moat (Clutch Rating as Currency)

If "What's your Clutch Rating?" becomes a real question in the fantasy
sports community — and the product is designed to make that happen — then
Clutch owns a piece of the culture, not just a piece of the market.

A Clutch Rating in a Twitter bio. A "Top 10 Projector" badge on a podcast
intro. A "Best Rams Projector" social card shared on Reddit. These are
brand moments that compound into cultural ownership.

No competitor can create an alternative credibility currency once Clutch's
is established. There's only one credit score. There should be only one
Clutch Rating.

### The Sly Part

Everything the managers do — every projection, every pick, every draft
decision — lives in Clutch's ecosystem. The managers chose to be there
because the tools are genuinely useful. The influencers chose to be there
because the credibility is real. And all of it feeds the platform's data
advantage, which makes the AI better, which makes the tools more useful,
which brings more people in.

It's not extractive. Everyone gets genuine value. But the byproduct of
that value exchange is the most comprehensive fantasy sports dataset ever
assembled. And that dataset is the real asset.

---

# ═══════════════════════════════════════════════════════════════
# SECTION 13: DISCUSSION POINTS BEFORE FINALIZING
# ═══════════════════════════════════════════════════════════════

## Resolved Decisions

### ✅ Data Approach: Raw Stats + Intelligence Layer
Show real NFL stats with real names (EPA, CPOE, yards). Clutch branding lives
on predictions and analysis, not rebranded metrics.

### ✅ nflfastR for Enterprise Use
MIT-licensed code, public facts as data. Entire NFL analytics ecosystem uses it
commercially. Attribute properly ("Data via nflverse"), add value through analysis.

### ✅ Pick System: Dual-Track (Line Picks + Raw Predictions)
Both tracks feed the Clutch Rating. Line picks prove market skill. Raw predictions
prove football knowledge. Season-long contests prove prep depth.

### ✅ Prop Lines: Snapshot & Freeze
Wednesday noon ET consensus snapshot from The Odds API. Frozen, everyone picks
against the same line. Not a sportsbook — a proving ground.

### ✅ Void Rules: Generous (Mid-Game Injury Protection)
Void if player inactive pre-game OR plays <50% of snaps due to injury.
Protects manager records from random injuries.

### ✅ PFF: Skip for Now
Use PFF+ consumer subscription ($40/mo) for research only. No B2B licensing
until revenue justifies it. nflfastR + own models are sufficient.

## Open Questions

### Q1: NFL Launch Timing
The NFL offseason is happening now (Feb 2026). Season starts in September.
**Option A:** Build the full NFL data pipeline and metrics now, launch NFL features for Week 1 of the 2026 season. 7 months to build = plenty of time.
**Option B:** Soft launch NFL during the offseason with futures tracking and draft content. Full features for regular season.
**Recommended:** Option B — get NFL on the platform ASAP even if it's minimal. 
The Prediction Contest should open by May/June, which means the data pipeline 
and projection submission system need to be ready by then.

### Q2: Season-Long Contest Timing
When exactly does the prediction contest open and lock?
- Open: May 1? June 1? After the NFL Draft?
- Lock: Week 1 kickoff? Or allow updates through preseason?
- Suggestion: Open after NFL Draft (late April), lock at Week 1 kickoff

### Q3: Cross-Sport Prediction Contests
Should golf have a similar prediction contest structure?
- Season-long major championship predictions?
- Tournament-by-tournament field prediction contests?
- This could unify the product experience across sports

### Q4: Season-Long Content Strategy
How does the content calendar work across sports?
- **Sep-Feb:** NFL dominates, golf weekly supplements
- **Mar-May:** Golf takes over (Masters, PGA, majors), NFL draft/free agency coverage
- **Jun-Aug:** Golf is primary, NFL prediction contest + draft prep season
- This natural rotation keeps the platform active 52 weeks/year

---

*Document created: February 7, 2026*
*Version: 4.0 — Added league integration, connected AI coaching, auction tools, tiered participation, monetization framework, competitive moat analysis*
*Feed sections to Claude Code in order after completing golf Phase 1 and core platform from clutch-build-specs.md*
*Confidential — Clutch Sports Internal Use Only*
