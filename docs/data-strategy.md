# CLUTCH SPORTS — Data Strategy & AI Roadmap

## Executive Summary
This document outlines the complete data strategy for Clutch Sports, starting with golf and building a scalable framework for every sport. The core philosophy: **build on data you own, transform everything, license only what you can't replicate, and architect for AI from day one.**

---

## PART 1: THE DATA OWNERSHIP FRAMEWORK

### The Three Tiers

Every sport Clutch enters follows this same structure:

#### TIER 1 — Foundation Data (YOU OWN THIS 100%)
**Source:** Public websites, official tour/league stats, open-source projects
**What it includes:** Scores, results, standings, schedules, rosters, basic stats, historical records
**Legal basis:** These are facts. Nobody owns the fact that Scottie Scheffler shot 65 in round 2.
**Rule:** You pull from public sources, structure it YOUR way, store it in YOUR database. The schema, the structure, the accumulated depth — that's your asset.

#### TIER 2 — Transformed/Proprietary Data (YOU OWN THIS 100%)
**Source:** Your own models, calculations, and analysis built on top of Tier 1
**What it includes:** Clutch Scores, custom rankings, AI-generated insights, composite metrics, user engagement data
**Legal basis:** Your intellectual property. Your recipe, not their ingredients.
**Rule:** Every piece of data that touches your platform should go through a transformation layer. This is your moat.

#### TIER 3 — Licensed Intelligence (USE UNDER TERMS)
**Source:** Premium providers like DataGolf (golf), PFF (NFL), etc.
**What it includes:** Proprietary models, predictions, advanced analytics only they produce
**Legal basis:** Commercial license agreement — get it in writing
**Rule:** This enriches your product but never IS your product. It's a spice, not the meal. Always attribute where required.

---

## PART 2: GOLF — FREE PUBLIC DATA SOURCES (TIER 1)

These sources provide factual data you can aggregate into your own database without licensing concerns.

### 2a. PGA Tour Website (pgatour.com/stats)
- **What's available:** Dozens of stat categories — driving distance, accuracy, GIR, scrambling, SG putting, SG tee-to-green, SG total, scoring average, birdie average, top 10 finishes, cuts made, money list, FedExCup standings
- **Historical depth:** Multiple seasons of stats available on public pages
- **How to get it:** Web scraping (Python BeautifulSoup/Scrapy — multiple open-source scrapers exist on GitHub)
- **Key stats available:** Driving distance, driving accuracy, GIR%, scrambling%, SG putting, SG approach, SG off-the-tee, SG tee-to-green, SG total, scoring average, birdie average, par 3/4/5 scoring
- **Limitation:** PGA Tour has restructured their site multiple times; scrapers need maintenance. No official public API.

### 2b. ESPN Golf Data
- **What's available:** Leaderboards (live and historical), scorecards, player profiles, tournament results
- **Historical depth:** Results going back many years
- **How to get it:** Public pages, JSON endpoints behind their leaderboard pages
- **Limitation:** Less depth on advanced stats, but solid for scores/results

### 2c. Official World Golf Rankings (OWGR)
- **What's available:** Complete OWGR rankings, tournament performance history for every ranked player, points breakdowns
- **Historical depth:** Rankings data going back to 1986
- **How to get it:** owgr.com — scraping tools exist (see GitHub: Official_World_Golf_Ranking_Scraper)
- **Key value:** Universal player rankings across all tours worldwide, tournament points/weights

### 2d. European Tour / DP World Tour
- **What's available:** Scores, stats, rankings, tournament results
- **How to get it:** Public website scraping
- **Key value:** International coverage beyond PGA Tour

### 2e. Golf Course Data
- **GolfCourseAPI.com** — Free API, ~30,000 courses worldwide with basic info
- **GolfAPI.io** — 42,000+ courses, complete scorecard data, par/stroke indexes, tee distances, coordinates (paid, but designed for commercial use)
- **Key value:** Course database for course-fit analysis, hole-by-hole modeling

### 2f. Open Source Projects (GitHub)
- **bradklassen/Professional_Golf_Database** — 6 scrapers covering PGA stats, scorecards, course history, tournament history, OWGR, LPGA
- **btatkinson/golf_scraper** — PGA Tour, Euro Tour, Korn Ferry historical data
- **codyheiser/pga-data** — Historical scores and finishes
- **Multiple PGA Tour stat scrapers** — Various projects pulling from pgatour.com/stats

### 2g. SlashGolf API
- **What's available:** Live leaderboards, scorecards, hole-by-hole scores, earnings, FedExCup points, OWGR rankings, tournament schedules, entry lists
- **Tours covered:** PGA Tour, LIV Golf, DP World Tour
- **Pricing:** Tiered plans on RapidAPI — from free (exploring) through enterprise
- **Key value:** Built for commercial use, clean API, real-time scoring. Worth evaluating as a Tier 1 data backbone for golf.

### 2h. SportsDataIO / FantasyData Golf API
- **What's available:** Schedules, scores, odds, projections, stats, news, images, player data
- **Historical depth:** Decades of historical data available
- **Pricing:** Paid tiers with free trial; explicitly built for commercial applications
- **Key value:** Multi-sport provider — could serve as a Tier 1 backbone across golf AND other sports

---

## PART 3: DATA GOLF — TRANSFORMATION STRATEGY (TIER 2 + TIER 3)

### What You're Currently Displaying (SG Data)
You mentioned strokes-gained data is on the site. Here's how to transform it from raw DataGolf output into proprietary Clutch content:

### Transformation Playbook — Strokes Gained

**Instead of displaying raw DataGolf SG numbers, build these Clutch metrics:**

#### 1. Clutch Performance Index (CPI)
- **Formula:** Weighted blend of SG components with YOUR proprietary weights
- **Example:** (SG:OTT × 0.15) + (SG:Approach × 0.30) + (SG:ARG × 0.20) + (SG:Putting × 0.20) + (Form Recency Factor × 0.15)
- **Why it's yours:** Your weights, your recency decay formula, your normalization method

#### 2. Clutch Course Fit Score
- **Formula:** Map course demands (narrow fairways, long par 4s, firm greens, etc.) to player SG profiles
- **Example:** Augusta = heavy weight on SG:Approach + iron proximity + scrambling → score each player
- **Why it's yours:** Your course demand profiles, your weighting logic, your matchup algorithm

#### 3. Clutch Form Score
- **Formula:** Rolling performance metric with YOUR decay curve
- **Example:** Last 4 events weighted (40%, 25%, 20%, 15%) with adjustment for field strength
- **Why it's yours:** Your time windows, your decay function, your field strength adjustment

#### 4. Clutch Value Rating
- **Formula:** Your model's implied probability vs. sportsbook odds
- **Example:** Clutch model says 8% win probability, book offers +1400 (7.1% implied) = positive value
- **Why it's yours:** Your probability model, your edge calculation, your presentation

#### 5. Clutch Pressure Score
- **Formula:** Performance in high-leverage situations (final rounds, contention, major championships)
- **Example:** SG differential when inside top 10 entering final round vs. baseline
- **Why it's yours:** Your definition of "pressure," your calculation methodology

#### 6. Clutch Head-to-Head Rating
- **Formula:** Expected matchup outcome based on skill profiles and course fit
- **Example:** Player A vs Player B at Course X → Clutch model generates win probability
- **Why it's yours:** Your matchup model, your course adjustment, your presentation

### Transformation Rules (Apply to ALL data, ALL sports)
1. **Never display raw provider numbers with their label** — always apply at least one transformation
2. **Always give it a Clutch name** — "Clutch Form Score" not "Strokes Gained Total"  
3. **Always blend multiple inputs** — a single raw stat displayed as-is is their data; three stats blended with your formula is yours
4. **Always add editorial context** — data + analysis = content, not just data pass-through
5. **Document your formulas** — this is your IP, keep it internal

---

## PART 4: NFL DATA SOURCES (APPLYING THE SAME FRAMEWORK)

When Clutch expands to NFL, the exact same 3-tier framework applies:

### Tier 1 — Free/Open NFL Data

#### nflverse / nflfastR (THE GOLD STANDARD for free NFL data)
- **License:** MIT (code is open source). Data belongs to NFL but is publicly accessible.
- **What's available:** Play-by-play data back to 1999 (every single play), completion probability, CPOE, expected yards after catch, expected points added (EPA), win probability, drive/series info
- **Python access:** `nfl_data_py` package — easy import
- **Update frequency:** Nightly during season
- **Key value:** This is the closest thing to a free DataGolf equivalent in any sport. Incredibly deep.
- **Additional data:** FTN charting data (CC-BY-SA 4.0 license, requires attribution to FTN Data via nflverse)

#### NFL Official Stats (nfl.com)
- Player stats, game results, standings, schedules, rosters
- Public, factual data

#### Sports Reference / Pro-Football-Reference
- **Important note on their terms:** They explicitly state that sharing/using data from individual pages is welcomed for commercial use WITH attribution. However, they prohibit bulk scraping and AI training. Their approach: pull data page-by-page respectfully, credit them.
- **What's available:** Box scores, player career stats, draft data, combine results, coaching records, franchise histories

### Tier 3 — Licensed NFL Intelligence
- **PFF (Pro Football Focus):** Player grades, advanced metrics, matchup analysis — requires commercial license
- **SportsRadar:** Official NFL data partner — enterprise pricing
- **ESPN/FPI:** Proprietary power rankings and projections

---

## PART 5: AI ENGINES ROADMAP

### What You're Building Toward

The data lake (Tier 1 + Tier 2 + Tier 3) feeds AI engines that generate insights no human could produce manually at scale. Here's the progression:

### Phase 1: AI Content Generation (Months 1-3)
**"The Caddie" — Automated Tournament Previews**
- **Input:** Field list + player skill profiles + course fit data + historical performance + odds
- **Output:** AI-written scouting report for every tournament, every player in the field
- **How it works:** Structured prompt to LLM with your proprietary data as context
- **Value:** Produces in 30 seconds what takes a human analyst 4 hours
- **Revenue:** Free content drives traffic; premium version goes deeper

### Phase 2: AI Prediction Models (Months 3-6)
**"The Edge" — Proprietary Betting Intelligence**
- **Input:** Historical odds data + model predictions + actual outcomes (years of training data)
- **Output:** Where the market is mispricing, automated value alerts, expected value calculations
- **How it works:** Train ML models on your accumulated Tier 1+2 data to predict outcomes; compare predictions to live odds
- **Value:** Backtestable, improvable over time, unique to Clutch
- **Revenue:** Premium paywall — this is the crown jewel

### Phase 3: AI Personalization (Months 6-9)
**"My Caddie" — Personalized User Experience**
- **Input:** User preferences, betting history, favorite players, bankroll management style
- **Output:** Personalized picks, custom dashboards, tailored alerts
- **How it works:** Recommendation engine that learns user preferences over time
- **Value:** Stickiness. Users won't leave because the AI knows their preferences.
- **Revenue:** Premium tier feature, drives retention

### Phase 4: Real-Time AI (Months 9-12)
**"The Pulse" — Live Tournament Intelligence**
- **Input:** Live scoring + live SG data + live odds movement + weather
- **Output:** Real-time AI commentary, in-play value alerts, momentum analysis, projected outcomes
- **How it works:** Streaming data pipeline → AI analysis engine → push notifications
- **Value:** Nobody else is doing this well for golf
- **Revenue:** Premium + potential for push notification product

### Phase 5: Multi-Sport Expansion (Year 2+)
**"The Clutch Engine" — Sport-Agnostic AI Platform**
- Same architecture, new data sources per sport
- NFL, NBA, MLB, Tennis, Soccer — each plugs into the same framework
- The AI gets smarter across sports (pattern recognition transfers)
- User base compounds as you add sports

---

## PART 6: DATABASE ARCHITECTURE PRINCIPLES

### Build It Right From Day One

1. **Universal Player ID System** — create your own internal Clutch Player IDs that map to DataGolf IDs, PGA Tour IDs, ESPN IDs, etc. This is your Rosetta Stone.

2. **Source Tagging** — every record in your database should tag its source (pgatour.com, datagolf, espn, clutch-generated). This lets you audit compliance and know exactly what came from where.

3. **Transformation Logging** — when you compute a Clutch Score, log the formula version, inputs, and timestamp. This lets you backtest and improve.

4. **Modular Provider Architecture** — see detailed section below. This is critical.

5. **Historical Depth Priority** — the longer you've been accumulating data, the more valuable your database becomes. Start collecting everything now, even if you don't use it yet.

6. **User Data Collection** — with consent, every click, every bet tracked, every player followed is data that makes your AI smarter. This is the Meta playbook.

---

### CRITICAL: Modular Provider Architecture (The "Pull the Plug" Design)

**The Principle:** Your database and your application should NEVER know or care where a piece of data originally came from. If DataGolf disappears tomorrow, or doubles their price, or changes their terms — you swap in a different source and nothing else changes. Same goes for every provider in every sport, forever.

**How to build it:**

#### Layer 1: Provider Ingestion Tables (Raw Staging)
These are temporary holding areas. Raw data from each provider lands here EXACTLY as they send it, tagged with the source. Nothing else in your system ever reads from these tables directly.

```
table: raw_datagolf_sg_data
- source: "datagolf"
- ingested_at: timestamp
- raw_payload: (their exact JSON/fields)

table: raw_pgatour_stats
- source: "pgatour.com"
- ingested_at: timestamp  
- raw_payload: (their exact fields)

table: raw_slashgolf_scores
- source: "slashgolf"
- ingested_at: timestamp
- raw_payload: (their exact fields)
```

#### Layer 2: Clutch Canonical Tables (YOUR Schema)
This is YOUR data model. Standardized, normalized, provider-agnostic. An ETL (extract-transform-load) script maps from each provider's raw format into YOUR canonical format. Every table uses YOUR Clutch Player IDs, YOUR event IDs, YOUR column names.

```
table: clutch_player_rounds
- clutch_player_id: (YOUR universal ID)
- clutch_event_id: (YOUR universal event ID)
- round_number: int
- score: int
- sg_total: float
- sg_ott: float
- sg_approach: float
- sg_arg: float
- sg_putting: float
- fairways_hit_pct: float
- gir_pct: float
- source_provider: "datagolf" | "pgatour" | "espn"
- source_ingested_at: timestamp
- clutch_transformed_at: timestamp
```

The key: **multiple providers can feed the SAME canonical table.** If DataGolf provides SG data today and tomorrow you switch to a different provider, you just write a new ETL mapping script. The canonical table structure doesn't change. Your application doesn't change. Your AI models don't change. Your Clutch Scores don't change.

#### Layer 3: Clutch Computed Tables (YOUR Proprietary Metrics)
These read ONLY from Layer 2 canonical tables. They never reference a provider by name. They compute your Clutch Scores, your AI features, your transformed metrics.

```
table: clutch_scores
- clutch_player_id
- clutch_event_id
- clutch_performance_index: float (YOUR formula)
- clutch_course_fit_score: float (YOUR formula)
- clutch_form_score: float (YOUR formula)
- clutch_value_rating: float (YOUR formula)
- formula_version: "v1.2"
- computed_at: timestamp
```

#### Layer 4: Application / Display Layer
Your website, your API, your AI engines — they ONLY read from Layer 2 (canonical) and Layer 3 (computed). They have zero knowledge of DataGolf, ESPN, PGA Tour, or any provider.

#### Why This Matters — Real Scenarios:

**Scenario: DataGolf changes their pricing to $500/month**
- Impact: You evaluate whether it's worth it
- What changes: Nothing in your app. You either keep paying or write a new ETL script to map a different SG data source into your canonical table.
- Downtime: Zero

**Scenario: DataGolf revokes your access**
- Impact: Raw staging table stops receiving new data
- What changes: You write a new ETL script for an alternative provider (or compute your own SG from public round-level data)
- Everything downstream: Unchanged. Your canonical tables, your Clutch Scores, your AI, your website — all still work.

**Scenario: You find a BETTER data source for approach stats**
- Impact: You add a new raw staging table for the new provider
- What changes: New ETL script maps their data into your existing canonical format
- You can even run BOTH providers simultaneously and pick the better data per field

**Scenario: You add NFL**
- Impact: New canonical tables for NFL (clutch_nfl_plays, clutch_nfl_player_games, etc.)
- Same architecture: raw staging → canonical → computed → application
- Providers for NFL (nflfastR, PFF, etc.) plug in at Layer 1, everything else follows the same pattern

#### The ID Mapping Table (Your Rosetta Stone)

This is one of the most valuable tables in your entire database:

```
table: clutch_player_id_map
- clutch_player_id: (YOUR master ID)
- datagolf_id: (their ID)
- pgatour_id: (PGA Tour's ID)
- espn_id: (ESPN's ID)  
- owgr_id: (OWGR's ID)
- slashgolf_id: (SlashGolf's ID)
- player_name: text
- sport: "golf" | "nfl" | "nba"
- last_updated: timestamp
```

When any new provider is added, you just add a column. When any provider is removed, the column goes null but nothing breaks. Your internal `clutch_player_id` is the only key anything downstream ever references.

#### Bottom Line
**The rule is simple: no provider's name should appear anywhere in your codebase except in the raw ingestion layer and the ETL mapping scripts.** If you grep your application code and find "datagolf" anywhere, that's a red flag. Your app should only know about "clutch_player_rounds" and "clutch_scores" — never about where that data originally came from.

---

## PART 7: IMMEDIATE ACTION ITEMS

### This Weekend (Now)
- [ ] Review what DataGolf data is currently displayed on the site
- [ ] Identify which displays are raw DataGolf output vs. already transformed
- [ ] Start designing the first 3 Clutch transformation metrics (CPI, Course Fit, Form Score)
- [ ] Begin building Tier 1 scraping infrastructure for pgatour.com stats

### Monday
- [ ] Send DataGolf commercial licensing email
- [ ] Evaluate SlashGolf API and SportsDataIO as potential Tier 1 golf data backbones
- [ ] Set up source tagging in database architecture

### This Week
- [ ] Implement first Clutch Score transformation and replace raw SG display
- [ ] Build automated weekly data pull from at least 2 free public sources
- [ ] Design the Universal Player ID mapping table
- [ ] Begin accumulating historical data from public sources into your database

### This Month
- [ ] Have DataGolf commercial terms resolved
- [ ] Have 3+ Clutch proprietary metrics live on the site
- [ ] Have Tier 1 data pipeline running for golf
- [ ] Prototype "The Caddie" AI content generation for one tournament
- [ ] Begin researching NFL data sources for eventual expansion

---

*Document created: February 7, 2026*
*Version: 1.0*
*Confidential — Clutch Sports Internal Use Only*
