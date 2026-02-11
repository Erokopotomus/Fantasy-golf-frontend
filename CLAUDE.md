# CLUTCH FANTASY SPORTS — Master Architecture & Development Guide

> **Purpose:** This document is the single source of truth for the Clutch Fantasy Sports platform. Claude Code should read this at the start of every session to understand the project vision, current state, architectural decisions, and what to build next. This document is maintained by the project owner and updated as phases are completed.

---

## PROJECT VISION

Clutch Fantasy Sports is a season-long fantasy sports platform. Golf-first, multi-sport by design. The goal is to combine the deep customization of Fantrax/MFL with the clean, modern UX of Sleeper — while adding features no competitor has: AI-powered insights, verified prediction tracking, league history preservation, and a creator ecosystem built on provable accuracy.

**Core positioning:** Season-long fantasy, no gambling noise. No DFS, no parlays, no prop bets, no sportsbook integrations. Clutch is for people who run leagues with their friends and want the best tools to do it.

**Target URL:** https://clutchfantasysports.com

---

## TECH STACK

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React + Vite + Tailwind CSS | SPA with client-side routing |
| Backend/API | Node.js + Express | Separate backend service |
| Database | PostgreSQL (via Prisma ORM) | Hosted on Railway |
| Cache/Real-time | Redis (planned) | Leaderboards (sorted sets), sessions, live scoring cache |
| Auth | JWT (custom) | Token-based auth with middleware |
| Payments | Stripe (planned) | Subscriptions + league entry fees (future) |
| Real-time | Socket.IO | Draft rooms, live scoring, notifications |
| AI/ML | Claude API (Anthropic) (planned) | AI Caddie feature (premium) |
| Hosting | Vercel (frontend) + Railway (backend/DB) | |
| Data Feeds | DataGolf API | PGA Tour live scoring, predictions, player data |
| File Storage | S3 or Cloudflare R2 (planned) | Avatars, league logos |

---

## CURRENT DEPLOYMENTS

- **Frontend:** Vercel at `clutch-pied.vercel.app` (custom domain: `clutchfantasysports.com`)
- **Backend:** Railway at `clutch-production-8def.up.railway.app`
- **Database:** PostgreSQL on Railway
- **GitHub:** `Erokopotomus/Clutch`

---

## SPORT SUPPORT PRIORITY

1. **Golf** — Launch sport. PGA Tour, LIV, DP World Tour, LPGA.
2. **NFL** — Add by August 2026 for football draft season. Biggest growth lever.
3. **NBA** — Add by October 2026 for basketball season.
4. **MLB** — Add by Spring 2027.

**Architectural rule:** All league infrastructure (invites, chat, trades, waivers, standings, draft room) must be **sport-agnostic**. Only the player database, scoring rules, and schedule integration are sport-specific modules.

---

## DEVELOPMENT PHASES

### Current Status: PHASE 4 — IN PROGRESS
> Phases 1, 2 & 3 complete. Phase 4A-4D built (migration, metrics engine, course fit, ETL, frontend). Migration 12_data_architecture pending deploy to Railway. Phase 4E (Tier 1 Public Data Sources) not yet started.

### Phase 1: Core Platform — COMPLETE ✓

- [x] **Authentication & User Profiles**
  - JWT-based registration/login (custom, not Clerk/Auth0)
  - Profile page (display name, avatar)
  - Role field on user model: `user`, `admin`
  - Admin role gates access to /admin routes
  - Admin dashboard with users/leagues/tournaments tabs

- [x] **League Creation & Management**
  - Create league flow: name, format (H2H/Roto/etc), scoring settings
  - Commissioner tools: edit rules, manage members, undo draft pick
  - League settings: roster size, bench spots, trade deadline, waiver type (FAAB/priority/rolling), lineup lock
  - Invite system: shareable invite codes, one-click join
  - Season setup auto-runs on draft completion (matchups, team seasons, budgets)
  - Position limits: per-position roster caps (NFL), enforced on roster add, trades, and waivers
  - Divisions: labels, team assignments, grouped standings with division W-L records
  - Keeper league support: designate/undesignate keepers, max keepers, cost models (no-cost/round penalty/auction/auction-escalator), draft pre-assignment
  - Auction escalator keepers: compounding cost formula `ceil(max(base × multiplier, base + floor))`, `keeperYearsKept` tracking, live cost preview in settings
  - Playoff byes: automatic bye calculation from playoff team count, bracket generation skips bye teams in round 1

- [x] **Draft Room**
  - Snake draft (live + mock)
  - Real-time Socket.IO connection: pick timer, pick queue, auto-pick
  - Draft board visualization (grid with color coding, quality dots)
  - Commissioner controls: pause, resume, undo pick
  - Mock draft room with AI opponents
  - Draft history & grading system (DraftGrade, MockDraftResult models)

- [x] **Roster Management**
  - Set lineups with active/bench positions
  - Add/drop players from free agent pool (soft-delete for history)
  - FAAB waiver bidding system
  - Rolling priority waiver system
  - Lineup lock at tournament tee time (fantasyWeekHelper + cron)

- [x] **Live Scoring & Standings**
  - DataGolf API integration (12 sync functions, 7 cron jobs)
  - Real-time score updates during tournaments
  - H2H matchup auto-scoring (WIN/LOSS/TIE)
  - TeamSeason record tracking (wins/losses/ties)

- [x] **Trading System**
  - Propose trades between league members
  - Trade accept/reject/cancel
  - Trade history log (RosterTransaction audit trail)
  - Trade deadline enforcement (date-based, configurable per league)
  - Trade veto voting: league-vote review mode with configurable threshold (33/50/67%), review period (24/48/72h), vote visibility (anonymous/visible/commissioner-only), auto-processor every 15 min
  - Draft dollar trading: trades can include current-year and next-year auction dollars alongside players, balances transfer atomically on trade acceptance

- [x] **Draft Dollar Tracking**
  - Per-team draft dollar accounts (current year + next year balances) with configurable default budget
  - Bumper enforcement: min/max budget limits validated on all transfers
  - Commissioner tools: record standalone transactions (side bets, adjustments), direct balance adjustments
  - Transaction ledger: full history with team filter, category badges (Trade/Side Bet/Adjustment), year badges
  - Trade integration: propose trades with dollar amounts, auto-transfer on acceptance
  - Season initialization: accounts auto-created for all teams when enabled
  - Settings: enable toggle, default budget, min/max bumpers, allow next-year trades toggle
  - Dedicated page: `/leagues/:leagueId/draft-dollars`
  - Backend: `draftDollarService.js` (transfers, validation), `draftDollars.js` route (4 endpoints)

- [x] **Notifications**
  - Socket.IO real-time notifications (user rooms)
  - Web push notifications (VAPID-based, service worker)
  - Configurable per-category preferences (7 categories)
  - Notification triggers: trades, waivers, drafts, roster moves, league activity
  - Notification inbox with polling + real-time updates

- [x] **Mobile Responsive Design**
  - All pages functional on mobile browsers
  - Touch-friendly draft room with tab navigation

- [x] **Analytics Foundation**
  - Sport & Season abstraction (Sport, Season, FantasyWeek, ScoringSystem models)
  - Fantasy performance tracking (FantasyScore, WeeklyTeamResult, LineupSnapshot)
  - Manager analytics & achievements (ManagerProfile, HeadToHeadRecord, 32 achievements)
  - Universal player profiles (Position, PlayerTag, RosterSlotDefinition, TeamBudget)
  - Event tracking abstraction layer (analytics.js with console logging)

- [x] **In-League Chat**
  - Socket.IO real-time group chat per league
  - Message types: CHAT, SYSTEM, TRADE, DRAFT (transaction feed integrated)
  - 100-message history on load, optimistic updates
  - ChatPanel, ChatMessage, ChatInput components + useChat hook

- [x] **Standings Page**
  - Format-aware standings (H2H, Roto, Survivor, One-and-Done)
  - Quick stats cards (rank, points, points behind)
  - Weekly breakdown with tournament-by-tournament results
  - StandingsTable, H2HStandings, RotoStandings, SurvivorStandings, OADStandings components

### Remaining Phase 1 items:
- [x] Playoff bracket generation, seeding, and auto-advancement — playoffService.js (generate, advance, getBracket), commissioner endpoint, auto-advance from fantasyTracker
- [x] IR slot management — backend lineup endpoint supports irPlayerIds, frontend IR zone in TeamRoster, irSlots setting in LeagueSettings
- [x] Auction draft room — BidPanel, nomination, bidding, socket events all wired
- [ ] PWA configuration (installable, offline-capable shell) — low priority, nice-to-have

- [x] **Season Recap & Awards**
  - Backend: `GET /api/leagues/:id/recap` — auto-generates awards from TeamSeason + WeeklyTeamResult data
  - Awards: Champion, MVP (most points), Best Week, Longest Win Streak, Worst Luck (bench pts), Biggest Blowout, Photo Finish, Mr. Consistent
  - Frontend: `SeasonRecap.jsx` at `/leagues/:leagueId/recap` — award cards + final standings
  - Linked from LeagueHome sidebar

- [x] **Security Hardening (v1)**
  - express-rate-limit: auth (20/15min), API (120/min), imports/sync (5/5min)
  - Input validation middleware: `validateBody()` + `sanitize()`
  - Applied to predictions (type/sport validation) and imports (leagueId validation)

- [x] **Manager Profile Enhancement**
  - Prediction reputation stats on ManagerProfile: accuracy, tier badge, streak, badges, tier progress bar

---

### Phase 2: Engagement & Stickiness — COMPLETE ✓

- [x] **Event Tracking System**
  - Analytics abstraction layer (platform-agnostic) — analytics.js with 42+ events
  - 28 track() calls across 12 files (drafts, chat, trades, waivers, roster, settings, navigation)
  - Console/local logging now, PostHog integration later
  - One-line swap when analytics provider is connected

- [x] **Prediction Engine MVP — Backend Complete**
  - Database tables: `predictions`, `user_reputation` (migration 10_predictions)
  - Prediction types: performance_call, player_benchmark, weekly_winner, bold_call
  - Submission API with deadline enforcement (locksAt field)
  - Automated resolution via Sunday 10:15 PM cron (after tournament finalize)
  - Accuracy tracking per user per sport with tier system (rookie→elite)
  - Community consensus endpoint
  - Reputation system with streaks, badges, confidence scoring
  - Frontend API methods wired (10 methods in api.js)
  - Migration `10_predictions` applied on Railway

  **LANGUAGE RULES FOR PREDICTIONS:**
  - Call them "Performance Calls" NOT "picks" or "bets"
  - Call them "Player Benchmarks" NOT "over/under" or "lines"
  - Call them "Projections" NOT "odds"
  - Call them "Insights" NOT "tips"
  - The UI should look like a community poll, NOT a sportsbook card
  - Never use gambling terminology anywhere in the prediction system

  **TWO USER PERSONAS — Both need great UX:**

  **Casual Predictor** (average league member, 3-5 calls/week):
  - Discovers predictions contextually — player cards, matchup pages, event pages
  - Sees a benchmark while researching a player, taps OVER/UNDER on impulse
  - Doesn't need a dedicated section — predictions come to them
  - Placement: expandable "Performance Call" section on player detail view, "Who wins?" widget on matchup page, "This Week's Calls" section on tournament/event page

  **Reputation Builder** (aspiring analyst, 15-30+ calls/week):
  - Actively grinding predictions to build accuracy, earn badges, climb leaderboard
  - Needs to make many predictions quickly without hunting through player cards one by one
  - Wants a shareable public profile proving their track record
  - These users are Clutch's organic marketing engine — they link profiles on podcasts, Twitter, YouTube
  - If their UX is painful, they won't use it, and the entire analyst/creator ecosystem dies

- [x] **Contextual Prediction Components — Complete**
  - PlayerBenchmarkCard — OVER/UNDER on player SG benchmark, consensus bar, integrated into PlayerProfile
  - EventPredictionSlate — sidebar card on TournamentScoring with rapid OVER/UNDER per player
  - PredictionWidget — dashboard widget with accuracy/streak/calls stats, CTA to Prove It
  - usePredictions hook — prediction state management, consensus, leaderboard hooks

- [x] **"Prove It" Hub — Main Nav Item**
  - Add "Prove It" to main navigation: Dashboard — Leagues — Draft — Live — **Prove It**
  - This is the reputation builder's home base AND the community discovery page

  **PROGRESSIVE ROLLOUT STRATEGY — DO NOT SKIP THIS:**

  An empty leaderboard with 12 predictions signals "nobody uses this" and kills credibility with new users. The Prove It hub must feel alive from the moment any user first sees it. Here's how:

  **Stage 1: Contextual Only (Day 1 — launch)**
  - Prove It does NOT appear in the main nav yet
  - Predictions exist only as contextual elements: Performance Call cards on player detail pages, "Who wins?" on matchup pages, "This Week's Calls" on event pages
  - These feel like natural parts of the platform even with low volume — a single prediction card on a player page doesn't look empty, it looks like a feature
  - Dashboard widget says "Make your first call" rather than showing empty stats
  - All prediction data is being stored and tracked behind the scenes
  - The `/prove-it` route exists and works but is not linked in nav — accessible via direct URL only (for founder/beta testers to use and grind)

  **Stage 2: Seeding Phase (Weeks 1-4 after launch)**
  - Founder + 10-15 early users (friends, beta testers) actively grind predictions via direct URL
  - Target: 30+ active predictors, 500+ total predictions before flipping the switch
  - Create a "Clutch HQ" editorial account that publishes curated weekly calls — gives the system content even if user participation is slow
  - Weekly leaderboard is the key metric to watch — it only needs ~20 people to feel competitive since it resets each week
  - League-level leaderboards also feel alive with small numbers (8-12 people per league is natural)

  **Stage 3: Nav Reveal (When thresholds are met)**
  - Flip "Prove It" on in the main nav when EITHER condition is met:
    - 30+ users have made at least 5 predictions each, OR
    - 500+ total resolved predictions exist on the platform
  - Announce it as a feature launch moment: "New: Prove your fantasy knowledge on Clutch"
  - Default leaderboard view is WEEKLY (feels active even with smaller user base) not all-time (which would expose small total numbers)
  - Analysts section defaults to "This Week's Top Performers" not "All-Time" for the same reason

  **Stage 4: Mature State (Ongoing)**
  - All sub-sections fully visible
  - All-time leaderboard becomes meaningful
  - Featured analysts section activates
  - Public profiles become the sharing/marketing engine

  **Implementation note for Claude Code:** Build the full Prove It hub from the start — all four sub-sections, all routes, all components. Just control visibility with a feature flag:
  ```
  // Feature flag — flip when thresholds met
  SHOW_PROVE_IT_NAV=false    // Controls main nav visibility
  PROVE_IT_DEFAULT_LB=weekly // Default leaderboard tab (weekly hides small total numbers)
  ```
  The contextual prediction components (player cards, matchup widgets) are always visible regardless of this flag.

  - Contains four sub-sections:

  **1. This Week's Slate** (the core grind experience)
  - All open Performance Calls for the current tournament/week in one place
  - Presented as a streamlined card stack — rapid-fire workflow
  - Each card shows: player name, team/position, benchmark number, community consensus %, OVER/UNDER buttons
  - One tap to submit, card animates away, next card appears
  - Running accuracy counter visible at top of stack ("12/15 this week · 80%")
  - Filter by: sport, category (start/sit, benchmarks, matchup winners, bold calls)
  - "Quick 10" mode: system picks 10 high-interest calls, challenges user to make them all
  - "Full Slate" mode: every available call for the week, organized by event/game
  - Deadline indicators on each card (locks in 2h 14m)
  - UX feel: Tinder for predictions, NOT a form. Fast, satisfying, one-handed on mobile.

  **2. My Track Record** (personal prediction dashboard)
  - Accuracy breakdown: overall, by sport, by category, by time period
  - Tier badge and progress to next tier (e.g., "Expert — 82% to Elite")
  - Active streak counter
  - Badge showcase (earned badges displayed prominently)
  - Prediction history: scrollable feed of all past calls with outcomes (✓/✗)
  - Filterable by sport, category, time range, outcome
  - Weekly/monthly accuracy graphs
  - This is the page users link from their Twitter bio, podcast show notes, YouTube descriptions
  - Must be beautiful, shareable, and feel like an achievement page

  **3. Leaderboards**
  - Global all-time rankings
  - Per-sport leaderboards (Golf, NFL, NBA, MLB)
  - Weekly leaderboard (resets each week — fresh competition)
  - League-level leaderboard (who's sharpest in YOUR league)
  - Category-specific (best at start/sit, best at benchmarks, best bold caller)
  - Each entry shows: rank, username, avatar, tier badge, accuracy %, total calls, streak
  - Tap any user to see their public profile

  **4. Analysts** (community discovery)
  - Browse top-performing predictors across the platform
  - Follow system: follow analysts, see their recent calls in a feed
  - Analyst cards show: name, tier, accuracy, specialty tags, recent calls
  - Search/filter by sport, tier, specialty
  - This is where the Fantasy Footballers' profiles live, where your buddy's profile becomes discoverable
  - Featured analysts section (editorially curated or algorithmically surfaced top performers)

  **Public Profile Page** (accessible at clutchfantasysports.com/u/username)
  - Shareable URL that works without login
  - Shows: display name, avatar, tier badge, accuracy stats, sport breakdown, badge showcase, recent calls with outcomes, league credentials (championships, years playing)
  - Open Graph tags for rich social previews when shared on Twitter/Discord/etc.
  - Embeddable widget (future): creators can embed their Clutch accuracy badge on their website

- [x] **Prediction Leaderboard Backend**
  - SQL-based leaderboards: global, per-sport, weekly, league-level
  - Tier system: Rookie → Contender → Sharp → Expert → Elite (min 20 predictions)
  - League-level leaderboard via leagueId query param
  - Redis sorted sets deferred to Phase 6 (scale optimization)

- [x] **Badge System**
  - Hot Streak (5/10/20 consecutive correct)
  - Upset Caller (correct when <20% of users agreed — checks consensus data)
  - Sharpshooter (80%+ accuracy with 10+ predictions)
  - Bold & Right (correct bold_call prediction, +Fearless at 5)
  - Iron Predictor (10/20 consecutive weeks with predictions)
  - Volume badges (50/100/500 predictions)
  - League Legend + Clutch Call deferred (require end-of-season + matchup context)

  **CONTEXTUAL PREDICTION PLACEMENT (for casual users):**
  Predictions also appear in these locations for organic discovery:
  - Player detail view: "Performance Call" expandable section
  - Matchup page: "Who wins this week?" widget
  - Tournament/event page: "This Week's Calls" curated section
  - Dashboard: small "Prove It" widget showing open calls count + current streak
  - These contextual placements funnel casual users into the prediction system without requiring them to visit the Prove It hub

---

### Phase 3: League Vault & Migration — COMPLETE ✓

> All 5 import platforms built (Sleeper, ESPN, Yahoo, Fantrax, MFL). League Vault v1 live with timeline + records.

- [x] **3A: Canonical Player Database Foundation**
  - Player cross-reference columns: `sleeperId`, `mflId`, `fantraxId` on players table
  - Player matching service: `playerMatcher.js` — exact platform ID match → fuzzy name match → manual resolution
  - `normalizeName()`, `matchPlayer()`, `matchAndLink()`, `batchMatch()`
  - Players created ON IMPORT via matchAndLink with createIfMissing option

- [x] **3B: League History Schema**
  - Migration `11_league_history` — applied on Railway (idempotent SQL)
  - `league_imports` table: tracks import jobs (source, status, progress, error log, seasons found)
  - `historical_seasons` table: per-team per-year records with JSONB for draftData, rosterData, weeklyScores
  - `ImportStatus` enum: PENDING → SCANNING → MAPPING → IMPORTING → REVIEW → COMPLETE → FAILED

- [x] **3C: Import Pipeline — Sleeper First**
  - `sleeperImport.js` service: `discoverLeague()` walks previous_league_id chain, `importSeason()` pulls all data, `runFullImport()` full pipeline
  - `routes/imports.js`: 6 endpoints (discover, import, list, status, history, delete)
  - Frontend: `useImports.js` hook (useImports, useSleeperImport, useLeagueHistory)
  - Frontend: `ImportLeague.jsx` — 5-step wizard (platform → connect → discovery → importing → complete)
  - Frontend: `api.js` — 6 import methods wired
  - Dashboard Quick Action link to `/import`

- [x] **3E: League Vault Display (v1)**
  - `LeagueVault.jsx` — Timeline tab (season-by-season expandable cards with standings) + All-Time Records tab
  - Season cards: champion highlight, full standings table with W/L/T/PF/PA/playoff result
  - All-time records: computed championships, most titles, best season PF, all-time standings by win%
  - League Vault link on LeagueHome for imported leagues

- [x] **3D: Additional Platform Imports**
  - ESPN: `espnImport.js` — cookie-based auth (espn_s2 + SWID), ESPN Fantasy API for 2018+ data, guided cookie extraction UI
  - Yahoo: `yahooImport.js` — OAuth access token, Yahoo Fantasy API with auto-detected game keys per year (2015-2025)
  - Fantrax: `fantraxImport.js` — CSV upload parsing (standings + draft), guided export instructions, robust CSV parser with quoted field handling
  - MFL: `mflImport.js` — XML/JSON API with commissioner API key, scans back to 2000 for deep historical data (15-20+ years)
  - All 4 platforms: discover + import routes in `imports.js`, API methods in `api.js`, per-platform hooks in `useImports.js`
  - `ImportLeague.jsx` updated: all 5 platforms available, per-platform connect UI (cookie inputs, OAuth token, CSV upload, API key)

### Backlog (Low Priority — Build When Needed)
- League Vault v2: Head-to-head historical records, draft history browser, transaction log, "On This Day" feature, PDF export
- Trading keeper rights between teams (keeper designation transfers as part of trades)
- **NFL live scoring frequency review**: Current nflSync crons run weekly (Tuesdays). During active NFL game windows (Sun 1pm-midnight, Mon/Thu night), need near-real-time stat updates (every 1-2 minutes minimum) for live fantasy point tracking. Evaluate: nflverse update latency during games, alternative live data sources (ESPN live endpoints, NFL API), WebSocket push vs polling, caching strategy for high-frequency reads. Users expect up-to-the-minute fantasy point updates during games — 30-min intervals are far too slow for game day.
- **Cleanup NFL test data**: `node backend/prisma/seedNflTestLeague.js cleanup` removes all `[TEST]`-prefixed data (league, teams, users, scores, matchups) and restores 2025 as current NFL season. Manifest file at `backend/prisma/nfl-test-manifest.json` tracks all created IDs. Also delete any orphaned 2024 NFL FantasyScores if needed. **Run this before any production deploy.**

---

### Phase 4: Data Architecture & Proprietary Metrics — IN PROGRESS

> **Philosophy:** Build on data you own, transform everything, license only what you can't replicate, architect for AI from day one. The 4-layer data system ensures no provider dependency — if DataGolf disappears tomorrow, nothing breaks except one ETL script.

> **Reference docs:** `clutch-data-strategy.md` (full data ownership framework), `clutch-build-specs.md` (Sections C & D)

- [x] **4A: 4-Layer Database Architecture**
  - Migration `12_data_architecture` — 4 new models (RawProviderData, ClutchScore, ClutchEventIdMap, ClutchFormulaLog)
  - Source tracking fields on Player, Performance, Tournament (sourceProvider, sourceIngestedAt, clutchTransformedAt)
  - Raw staging: `stageRaw()` calls in all 7 datagolfSync functions capture full API responses
  - ClutchScore model: per-player per-tournament computed metrics with formula versioning + input snapshots
  - ClutchFormulaLog: audit trail for formula versions with activation/deactivation dates
  - **NOT YET APPLIED:** Migration needs `prisma migrate deploy` on Railway

- [x] **4B: Rosetta Stone — Player & Event ID Mapping**
  - Existing Player model serves as player Rosetta Stone (11 cross-reference ID columns already present)
  - ClutchEventIdMap model links datagolfEventId → tournamentId with sport-level indexing
  - Auto-populated during `syncSchedule()` via `etl.upsertEventIdMap()`

- [x] **4C: ETL Pipeline — DataGolf → Canonical Tables**
  - New service: `etlPipeline.js` — stageRaw, markProcessed, upsertEventIdMap, bulkUpsert (with source tracking), cleanupOldRawData
  - `datagolfSync.js` refactored to call ETL pipeline for event ID mapping during schedule sync
  - Raw data cleanup cron: Sun 4AM ET — deletes raw_provider_data older than 90 days

- [x] **4D: Clutch Proprietary Metrics (Golf First)**
  - New service: `clutchMetrics.js` — 4 algorithms + batch functions
  - **CPI** (-3.0 to +3.0): Weighted SG blend × recency decay × field strength, z-score normalized across active players
  - **Form Score** (0-100): Last 4 events with weights [0.40, 0.25, 0.20, 0.15], field-strength + event-type adjusted
  - **Pressure Score** (-2.0 to +2.0): Pressure vs baseline round SG delta, scaled 1.5×
  - **Course Fit** (0-100): Player SG percentile profile × course importance weights dot product + quality floor + history bonus
  - Cron: Mon 2:30AM recomputeAll, Wed 7:30AM computeForEvent
  - Backend routes updated: GET /api/players, GET /api/players/:id, GET /api/tournaments/:id/leaderboard all serve clutchMetrics
  - Frontend: PlayerHeader shows CPI + Form Score in quick stats, PlayerStats has "Clutch Scores" card with all 4 metrics
  - Frontend: PlayerPool (draft) has sortable CPI column, useTournamentScoring passes clutchMetrics through
  - Course profile seed script: `seedCourseProfiles.js` with ~40 PGA Tour venue importance weights

- [ ] **4E: Tier 1 Public Data Sources**
  - PGA Tour website scraper (stats pages — driving, GIR, SG breakdown, scoring)
  - ESPN Golf public JSON endpoints (leaderboards, scorecards, historical results)
  - OWGR rankings scraper (rankings, tournament weights, points)
  - These serve as backup/enrichment data sources feeding Layer 1 → Layer 2
  - Evaluate SlashGolf API and SportsDataIO as potential commercial Tier 1 backbones

**Transformation Rules (apply to ALL data, ALL sports):**
1. Never display raw provider numbers with their label — always transform
2. Always give it a Clutch name — "Clutch Form Score" not "Strokes Gained Total"
3. Always blend multiple inputs — single raw stat = theirs; blended = yours
4. Always add editorial context — data + analysis = content
5. Log formula version, inputs, timestamp for every computation
6. Tag source_provider on every canonical record

---

### Phase 5: Manager Analytics & Clutch Rating

> **Reference doc:** `clutch-build-specs.md` (Sections A1-A6, adapted to fantasy-first language)

> **Note:** All prediction/performance tracking uses the existing non-gambling language: "Performance Calls", "Benchmarks", "Projections", "Insights". No odds, units, ROI, or sportsbook terminology.

- [ ] **5A: Enhanced Manager Profile Page**
  - Redesigned header: avatar/photo upload, display name, verified badge, tagline/bio (280 char), social links (Twitter/X, YouTube, podcast, website)
  - Overall Clutch Rating (0-100, prominent display — see 5B)
  - Quick stats bar: overall accuracy %, current streak, best sport, total calls, rank
  - Active sports badges (golf/football/basketball icons — lit for active sports)
  - Performance call type breakdown (tabbed): benchmarks, performance calls, weekly winners, bold calls — each shows record, accuracy %, chart over time
  - Sport-by-sport breakdown (tabbed): per-sport accuracy, best call, worst miss, recent calls
  - Recent calls feed: chronological list with sport, type, actual call, result, timestamp. Filterable.
  - Performance charts: accuracy rolling average, calls by sport (pie), hot/cold streaks (calendar heatmap)
  - Manager comparison: side-by-side stats with another manager

- [ ] **5B: Clutch Rating System (Sport-Specific + Global)**
  - **Sport Rating** (per sport, 0-100): Primary rating computed per sport (NFL, Golf, NBA, MLB). Like a credit score for fantasy analysis per sport.
  - Components (weighted): Accuracy (40%), Consistency (25% — low variance rewarded), Volume (20% — min calls required), Breadth by category (15%)
  - Sport rating tiers: Expert (90+), Sharp (80-89), Proven (70-79), Contender (60-69), Rising (<60)
  - Minimum 30 graded calls per sport to qualify for a sport rating
  - **Global Clutch Rating** (prestige, 0-100): Secondary rating requiring qualified ratings in 2+ sports. Weighted average of sport ratings + multi-sport breadth bonus.
  - Display: circular gauge/meter visual, color coded, trend arrow, hover shows sport breakdown + component details
  - Recalculates daily. 90-day recency weighting.
  - Schema: `clutch_user_sport_ratings` (per-sport), `clutch_user_global_rating` (cross-sport), `clutch_user_sport_tags` (expertise tags for discovery)

- [ ] **5C: Enhanced Prediction Categories**
  - Expand prediction types per sport (golf: tournament winner, top 5/10/20, make/miss cut, head-to-head matchup, round leader)
  - NFL: game winner, player performance calls, weekly fantasy rankings
  - Lock mechanism: calls immutable after event start (already built, enhance enforcement)
  - All calls timestamped and logged — this is the integrity layer
  - Pending calls visible but marked as "locked — awaiting result"

- [ ] **5D: Enhanced Leaderboard**
  - Filters: Sport, call type, time period (all time / this season / last 30 days / this week), minimum calls, sort by (Clutch Rating / accuracy / streak)
  - Columns: rank, manager (avatar + name), Clutch Rating, record, accuracy %, streak, trend (last 10 as mini dots), sport badges
  - Special leaderboards: "Hot Right Now" (7 days), "Most Consistent" (lowest variance, 100+ calls), "Golf Sharks", "NFL Sharps"
  - Weekly/monthly auto-awards: "Manager of the Week" based on period performance → feeds badge system

- [ ] **5E: Badge & Achievement System v2**
  - Performance badges: #1 Overall (period), Top 5/10 (period), Sport Champion
  - Milestone badges: Century Club (100 calls), 500 Club, Hot Streak (5/10 consecutive), Lightning Round (5+ correct in one day)
  - Consistency badges: Steady Hand (55%+ over 200 calls), Sharpshooter (60%+ over 100), Iron Man (calls every week for 3+ months)
  - Sport-specific badges: Golf Aces, NFL Clutch QB, etc.
  - Social card generation: each badge auto-generates a shareable image (Spotify Wrapped style) — optimized for Twitter/X, Instagram
  - Manager can share directly from profile page

- [ ] **5F: Consensus Engine**
  - Aggregate top managers' calls weighted by their sport-specific Clutch Rating
  - Generate "Clutch Consensus" for each event: "8 of 10 top managers like Scheffler this week"
  - Track consensus accuracy over time (does the crowd beat individuals?)
  - Premium: see which specific managers agree/disagree, filter by minimum sport rating tier

---

### Phase 6: AI Engine (Decision Intelligence)

> **Master spec:** `docs/CLUTCH_AI_ENGINE_SPEC.md` — replaces previous Phase 6 plan entirely.
> **Philosophy:** Decision Loop (THINK → RESEARCH → DECIDE → RECORD → EXECUTE → AUDIT → IMPROVE). AI powers AUDIT and IMPROVE. No chatbot — zero free-form text input.
> **Three AI Modes:** Mode 1 (Ambient/free), Mode 2 (Contextual/premium), Mode 3 (Deep/premium)

- [x] **6A: Data Gap Fixes** (COMPLETE — 6 migrations, 27-32)
  - 6A-1: Prediction thesis, confidence, key factors (BackYourCall component)
  - 6A-2: Draft pick tagging (6 tags: STEAL/REACH/PLAN/FALLBACK/VALUE/PANIC)
  - 6A-3: Board vs Reality comparison (DraftBoardComparison model, auto-generated on draft save)
  - 6A-4: Capture-to-outcome linking (outcomeLinked/outcomeData on LabCapture, cron Jan 15 + Nov 1)
  - 6A-5: Opinion evolution timeline (PlayerOpinionEvent model, hooks in 8 services, "Your History with [Player]")
  - 6A-6: Reasoning fields on roster moves (reasoning on WaiverClaim/Trade, decisionNotes on LineupSnapshot)

- [ ] **6B: Decision Graph + Pattern Engine** (NEXT)
  - DecisionPatternCache model, patternEngine.js, 12+ pattern detectors
  - Per-user query patterns stitching together opinion events, captures, board entries, draft picks, predictions
  - No Claude API — pure deterministic data analysis

- [ ] **6C: AI Infrastructure + Mode 1 (Ambient Intelligence)**
  - Claude API wrapper (claudeService.js), AiInsight model
  - 7 ambient insight types: decision_pattern, board_gap, capture_callback, prediction_accuracy, draft_tendency, roster_bias, season_narrative
  - Pre-computed by cron, cached, served from DB

- [ ] **6D: Mode 2 (Contextual Intelligence)**
  - Context-aware AI responses triggered by user actions
  - Player deep dives, board analysis, draft strategy

- [ ] **6E: Mode 3 (Deep Analysis)**
  - On-demand premium AI analysis
  - Decision audit, season review, league dynamics

- [ ] **6F: Polish + Integration**
  - Insight dismissal/feedback, analytics, rate limiting refinement

---

### Phase 7: Multi-Sport Expansion

- [ ] **NFL Fantasy Support** (Target: August 2026) — PARTIALLY COMPLETE
  - [x] NFL data pipeline (NFL-1): nflverse sync — players, games, weekly stats, kicking, DST (2024 season synced, 5,174 stat rows)
  - [x] NFL stats display (NFL-2): player browsing, team pages, schedule, compare tool, league-specific scoring applied
  - [x] NFL scoring calculation service: `nflScoringService.js` — Standard/PPR/Half-PPR/custom rules, all positions, bonuses, kicker distance tiers, DST points-allowed tiers
  - [x] NFL league infrastructure: sport-agnostic league creation, rosters, trades, waivers, draft room all work for NFL
  - [x] **NFL weekly scoring pipeline:** `nflFantasyTracker.js` — `scoreNflWeek()` creates FantasyScore records from NflPlayerGame data, `computeNflWeeklyResults()` aggregates team scores + processes H2H matchups, `processCompletedNflWeeks()` is the cron entry point. `createNflFantasyWeeks()` in seasonSetup.js generates 18 FantasyWeek records from NflGame kickoff dates. Tuesday 6:30 AM cron auto-scores, 30-min cron handles week status transitions (Sep-Feb). API: `GET /api/nfl/leagues/:id/weekly-scores/:week`, `POST /api/nfl/leagues/:id/score-week` (commissioner manual trigger).
  - [x] NFL lineup lock: `fantasyWeekHelper.js` detects NFL leagues and locks at earliest game kickoff in the week (not tournament start)
  - [x] **NFL frontend sport-awareness:** All frontend pages now detect NFL leagues and adapt terminology, filters, slot labels, and player stats. Fixes applied to: LeagueHome (position card, member count, team row clicks, draft banner), TeamRoster (NFL positions/teams, slot labels, lock messages), WaiverWire (NFL position filters QB/RB/WR/TE/K/DEF, NFL player display), Standings ("Weeks" not "Tournaments", "Weekly Results" not "Tournament Results"), LeagueLiveScoring (sport routing to NflWeeklyScoring), H2HStandings (floating point .toFixed fix), MatchupCard/MatchupList (tri-state: Final/In Progress/Upcoming), PlayerDrawer (NFL-aware stats). Backend: NFL available-players endpoint in nfl.js, Team model sync in nflFantasyTracker.js, fantasyWeekHelper sportId filter.
  - [x] **NFL matchups page rewrite:** `Matchups.jsx` computes currentWeek entirely from schedule data on the frontend using `useMemo` (active week → last completed → next upcoming), bypassing backend `currentWeek` field. Fixes 0-0 score display bug caused by browser HTTP caching. Also added `cache: 'no-store'` to all fetch calls in `api.js`.
  - [x] **NFL standings stat cards fix:** Standings.jsx stat cards now derive from matchup standings data (useMatchups) for H2H leagues instead of useStandings, which had stale data. Correctly shows user rank, points, points behind, and completed week count.
  - [x] **NFL test league seeder:** `backend/prisma/seedNflTestLeague.js` creates a complete test league with 8 teams, 15 players each, 4 scored weeks, H2H matchups, and standings. Manifest at `backend/prisma/nfl-test-manifest.json`.
  - [x] **NFL gameday UX spec:** Comprehensive UX document at `docs/nfl-gameday-ux.md` (v1.2) — two-layer platform architecture, weekly NFL manager flow, 9 page-by-page wireframes, reward engine (I Told You So engine, delta cards, Decision DNA, Clutch Rating, badges/streaks), golf parity, data dependencies by phase, mobile-first layouts, notification strategy, onboarding flow. 7 implementation phases mapped with blockers.
  - [ ] NFL 2025 season data sync (only 2024 synced)
  - [ ] NFL prediction categories (game winner, player performance calls, weekly fantasy rankings)

- [ ] **NBA Fantasy Support** (Target: October 2026)
- [ ] **MLB Fantasy Support** (Target: Spring 2027)

---

### Phase 8: Scale & Monetize

- [ ] **Verified Creator Program** — application flow, admin approval, verified badges, external channel links, creator-branded leagues, revenue share tracking
- [ ] **Premium Tiers** (Clutch Pro $7.99/mo, Clutch Elite $12.99/mo)
- [ ] **Native Mobile App** (React Native / Expo)
- [ ] **League Entry Fee Processing** (Stripe Connect, 5-10% platform fee)
- [ ] **In-Roster Expert Insights** — per-player expandable section showing consensus + top analyst calls (requires ~50 active predictors)

---

## DATABASE SCHEMA

### Existing Core Tables (built in Phase 1)
- `users` — id, email, name, avatar, role (user/admin), password, notificationPreferences, created_at
- `leagues` — id, name, format, draftType, maxTeams, settings (JSONB), sportId, scoringSystemId, status, inviteCode, ownerId
- `league_members` — league_id, user_id, role, joined_at
- `players` — id, name, sportId, rank, sgTotal, sgOffTee, sgApproach, sgAroundGreen, sgPutting, primaryTour, headshotUrl, countryFlag, recentForm, etc.
- `teams` — id, name, leagueId, userId, totalPoints
- `roster_entries` — id, teamId, playerId, position, rosterStatus, isActive, droppedAt, acquiredVia, isKeeper, keeperCost, keeperYear, keptAt, keeperYearsKept
- `matchups` — id, leagueId, fantasyWeekId, homeTeamId, awayTeamId, homeScore, awayScore, result
- `transactions` (RosterTransaction) — id, teamId, leagueId, type, playerId, playerName, metadata
- `draft_picks` — id, draftId, teamId, playerId, round, pickNumber, playerRank
- `notifications` — id, userId, type, title, message, actionUrl, isRead, data
- `draft_dollar_accounts` — id, teamId, leagueSeasonId, currentBalance, nextYearBalance (@@unique teamId+leagueSeasonId)
- `draft_dollar_transactions` — id, leagueId, leagueSeasonId, fromTeamId, toTeamId, amount, yearType, category, description, tradeId, initiatedById

### Sport/Season Infrastructure (built in Phase 1)
- `sports` — id, name, slug, config (JSONB)
- `seasons` — id, sportId, year, isCurrent, startDate, endDate
- `fantasy_weeks` — id, seasonId, name, status, startDate, endDate, tournamentId
- `scoring_systems` — id, sportId, name, config (JSONB)
- `league_seasons` — id, leagueId, seasonId, status
- `team_seasons` — id, teamId, leagueSeasonId, totalPoints, wins, losses, ties, rank
- `weekly_team_results` — id, teamSeasonId, fantasyWeekId, totalPoints, optimalPoints, benchPoints
- `fantasy_scores` — id, fantasyWeekId, playerRef, scoringSystemId, totalPoints, breakdown (JSONB)
- `lineup_snapshots` — id, teamId, fantasyWeekId, activePlayerIds, benchPlayerIds
- `team_budgets` — id, teamId, leagueSeasonId, totalBudget, remainingBudget

### Analytics & Profiles (built in Phase 1)
- `manager_profiles` — cross-sport lifetime stats per user per sport
- `head_to_head_records` — W/L/T between user pairs
- `achievements` — 32 seeded achievement definitions
- `achievement_unlocks` — per-user unlock records
- `manager_season_summaries` — per-user per-sport per-season rollups
- `positions`, `player_positions`, `roster_slot_definitions`, `player_tags`, `player_tag_assignments`, `sport_player_profiles`
- `draft_grades`, `mock_draft_results`
- `push_tokens` — web push subscription storage
- `waiver_claims` — FAAB/rolling waiver claim records

### New Tables (Phases 2-4)

#### predictions
```sql
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  sport VARCHAR(20) NOT NULL, -- 'golf', 'nfl', 'nba', 'mlb'
  prediction_type VARCHAR(30) NOT NULL, -- 'performance_call', 'player_benchmark', 'weekly_winner', 'bold_call', 'trade_value', 'draft_value', 'waiver_call'
  category VARCHAR(50) NOT NULL, -- 'weekly', 'season_long', 'tournament', 'draft'
  event_id VARCHAR(100), -- tournament ID, NFL week, matchup ID
  subject_player_id VARCHAR(100), -- player this prediction is about
  prediction_data JSONB NOT NULL, -- {action: 'start', benchmark_value: 18.5, confidence: 'high', reasoning: '...'}
  outcome VARCHAR(20) DEFAULT 'pending', -- 'pending', 'correct', 'incorrect', 'push', 'voided'
  accuracy_score DECIMAL(5,4), -- 0.0 to 1.0, allows partial credit
  is_public BOOLEAN DEFAULT true,
  league_id UUID REFERENCES leagues(id), -- optional league context
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
CREATE INDEX idx_predictions_user ON predictions(user_id, sport, outcome);
CREATE INDEX idx_predictions_event ON predictions(event_id, prediction_type);
CREATE INDEX idx_predictions_pending ON predictions(outcome) WHERE outcome = 'pending';
```

#### user_reputation
```sql
CREATE TABLE user_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  sport VARCHAR(20) NOT NULL,
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,4) DEFAULT 0,
  streak_current INTEGER DEFAULT 0,
  streak_best INTEGER DEFAULT 0,
  confidence_score DECIMAL(5,4) DEFAULT 0,
  percentile_rank INTEGER, -- 1-100
  tier VARCHAR(20) DEFAULT 'rookie', -- 'rookie', 'contender', 'sharp', 'expert', 'elite'
  badges JSONB DEFAULT '[]',
  weekly_rank INTEGER,
  season_rank INTEGER,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, sport)
);
CREATE INDEX idx_reputation_sport_tier ON user_reputation(sport, tier);
CREATE INDEX idx_reputation_leaderboard ON user_reputation(sport, accuracy_rate DESC);
```

#### analyst_profiles
```sql
CREATE TABLE analyst_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
  display_name VARCHAR(50) NOT NULL,
  bio TEXT, -- 280 char max
  avatar_url VARCHAR(500),
  specialties JSONB DEFAULT '[]', -- ['golf', 'dynasty', 'waiver_wire']
  is_verified BOOLEAN DEFAULT false,
  is_creator BOOLEAN DEFAULT false,
  external_links JSONB DEFAULT '{}', -- {youtube: '...', twitter: '...', podcast: '...'}
  follower_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  monetization_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### league_imports
```sql
CREATE TABLE league_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  source_platform VARCHAR(20) NOT NULL, -- 'espn', 'yahoo', 'sleeper', 'fantrax', 'mfl', 'manual_csv'
  source_league_id VARCHAR(200),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'scraping', 'parsing', 'mapping', 'review', 'complete', 'failed'
  progress_pct INTEGER DEFAULT 0,
  seasons_found INTEGER,
  seasons_imported JSONB DEFAULT '[]',
  mapping_data JSONB DEFAULT '{}',
  error_log JSONB DEFAULT '[]',
  raw_data_url VARCHAR(500),
  clutch_league_id UUID REFERENCES leagues(id),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

#### historical_seasons
```sql
CREATE TABLE historical_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id),
  import_id UUID REFERENCES league_imports(id),
  season_year INTEGER NOT NULL,
  team_name VARCHAR(100),
  owner_name VARCHAR(100),
  owner_user_id UUID REFERENCES users(id), -- nullable until claimed
  final_standing INTEGER,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  ties INTEGER DEFAULT 0,
  points_for DECIMAL(10,2) DEFAULT 0,
  points_against DECIMAL(10,2) DEFAULT 0,
  playoff_result VARCHAR(20), -- 'champion', 'runner_up', 'semifinal', 'eliminated', 'missed'
  draft_data JSONB,
  roster_data JSONB,
  transactions JSONB,
  weekly_scores JSONB,
  awards JSONB
);
CREATE INDEX idx_historical_league_year ON historical_seasons(league_id, season_year);
```

### New Tables (Phase 4 — Data Architecture)

#### clutch_player_id_map (Rosetta Stone)
```sql
CREATE TABLE clutch_player_id_map (
  clutch_player_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport VARCHAR(20) NOT NULL,
  player_name VARCHAR(200) NOT NULL,
  datagolf_id VARCHAR(100),
  pga_tour_id VARCHAR(100),
  espn_id VARCHAR(100),
  owgr_id VARCHAR(100),
  slashgolf_id VARCHAR(100),
  nflverse_id VARCHAR(100),
  pfr_id VARCHAR(100),
  yahoo_id VARCHAR(100),
  draftkings_id VARCHAR(100),
  fanduel_id VARCHAR(100),
  last_synced TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_player_map_sport ON clutch_player_id_map(sport);
CREATE INDEX idx_player_map_datagolf ON clutch_player_id_map(datagolf_id) WHERE datagolf_id IS NOT NULL;
```

#### clutch_event_id_map
```sql
CREATE TABLE clutch_event_id_map (
  clutch_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport VARCHAR(20) NOT NULL,
  event_name VARCHAR(200) NOT NULL,
  datagolf_event_id VARCHAR(100),
  espn_event_id VARCHAR(100),
  pga_tour_event_id VARCHAR(100),
  nflverse_game_id VARCHAR(100),
  start_date DATE,
  end_date DATE,
  venue_id VARCHAR(100)
);
```

#### clutch_player_rounds (canonical performance data)
```sql
CREATE TABLE clutch_player_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clutch_player_id UUID NOT NULL REFERENCES clutch_player_id_map(clutch_player_id),
  clutch_event_id UUID NOT NULL REFERENCES clutch_event_id_map(clutch_event_id),
  round_number INTEGER,
  score INTEGER,
  sg_total FLOAT,
  sg_ott FLOAT,
  sg_approach FLOAT,
  sg_arg FLOAT,
  sg_putting FLOAT,
  fairways_hit_pct FLOAT,
  gir_pct FLOAT,
  source_provider VARCHAR(50) NOT NULL,
  source_ingested_at TIMESTAMP,
  clutch_transformed_at TIMESTAMP DEFAULT NOW()
);
```

#### clutch_scores (proprietary computed metrics)
```sql
CREATE TABLE clutch_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clutch_player_id UUID NOT NULL REFERENCES clutch_player_id_map(clutch_player_id),
  clutch_event_id UUID REFERENCES clutch_event_id_map(clutch_event_id),
  clutch_performance_index FLOAT, -- CPI: -3.0 to +3.0
  clutch_course_fit_score FLOAT, -- 0-100
  clutch_form_score FLOAT,       -- 0-100
  clutch_pressure_score FLOAT,   -- -2.0 to +2.0
  formula_version VARCHAR(10) NOT NULL,
  computed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_clutch_scores_player ON clutch_scores(clutch_player_id, computed_at DESC);
```

#### clutch_user_sport_ratings (Sport-Specific Clutch Rating — 0-100)
```sql
CREATE TABLE clutch_user_sport_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  sport VARCHAR(20) NOT NULL, -- 'nfl', 'golf', 'nba', 'mlb'
  rating INTEGER, -- 0-100
  accuracy_component FLOAT,     -- 40% weight
  consistency_component FLOAT,  -- 25% weight
  volume_component FLOAT,       -- 20% weight
  breadth_component FLOAT,      -- 15% weight (breadth by category within sport)
  tier VARCHAR(20), -- 'expert', 'sharp', 'proven', 'contender', 'rising'
  trend VARCHAR(10), -- 'up', 'down', 'stable'
  total_graded_calls INTEGER DEFAULT 0,
  qualified BOOLEAN DEFAULT false, -- true when >= 30 graded calls
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, sport)
);
CREATE INDEX idx_sport_ratings_leaderboard ON clutch_user_sport_ratings(sport, rating DESC) WHERE qualified = true;
```

#### clutch_user_global_rating (Global Prestige Rating)
```sql
CREATE TABLE clutch_user_global_rating (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
  global_rating INTEGER, -- 0-100 (weighted avg of sport ratings + breadth bonus)
  sports_qualified INTEGER DEFAULT 0, -- count of sports with qualified rating
  breadth_bonus FLOAT DEFAULT 0, -- bonus for multi-sport breadth
  global_tier VARCHAR(20), -- same tiers as sport: 'expert', 'sharp', 'proven', 'contender', 'rising'
  trend VARCHAR(10), -- 'up', 'down', 'stable'
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### clutch_user_sport_tags (Expertise Tags for Discovery)
```sql
CREATE TABLE clutch_user_sport_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tag VARCHAR(50) NOT NULL, -- e.g., 'NFL Sharp', 'Golf Expert', 'Dynasty Guru'
  sport VARCHAR(20),
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, tag)
);
CREATE INDEX idx_sport_tags_discovery ON clutch_user_sport_tags(tag, sport);
```

---

## EVENT TRACKING SCHEMA

Every meaningful user action should fire an event. Build this as an abstraction layer now, connect to PostHog (or any provider) later.

```typescript
// lib/analytics.ts
type AnalyticsEvent = {
  // Auth
  'user_signed_up': { method: 'email' | 'google' | 'apple' }
  'user_logged_in': { method: string }

  // League
  'league_created': { sport: string, format: string, scoring_type: string }
  'league_joined': { league_id: string, via: 'invite_link' | 'search' | 'direct' }
  'league_settings_updated': { league_id: string, fields_changed: string[] }
  'member_invited': { league_id: string, method: 'link' | 'email' | 'sms' }

  // Draft
  'draft_started': { league_id: string, type: 'snake' | 'auction' | 'linear' }
  'draft_pick_made': { league_id: string, pick_number: number, is_auto: boolean }
  'draft_completed': { league_id: string, duration_minutes: number }

  // Roster
  'lineup_set': { league_id: string, changes_made: number }
  'player_added': { league_id: string, player_id: string, source: 'free_agent' | 'waiver' }
  'player_dropped': { league_id: string, player_id: string }
  'waiver_bid_placed': { league_id: string, amount: number }

  // Trading
  'trade_proposed': { league_id: string, players_offered: number, players_requested: number }
  'trade_accepted': { league_id: string }
  'trade_rejected': { league_id: string }
  'trade_vetoed': { league_id: string }

  // Chat
  'message_sent': { league_id: string, type: 'text' | 'image' | 'gif' | 'poll' }
  'poll_created': { league_id: string }

  // Predictions
  'prediction_submitted': { sport: string, type: string, confidence: string }
  'prediction_resolved': { sport: string, type: string, outcome: string }
  'leaderboard_viewed': { sport: string, timeframe: string }
  'badge_earned': { badge_type: string }

  // Migration
  'import_started': { source_platform: string }
  'import_completed': { source_platform: string, seasons_imported: number, duration_minutes: number }
  'import_failed': { source_platform: string, error_type: string }
  'league_vault_viewed': { league_id: string }
  'historical_team_claimed': { league_id: string }

  // Analyst
  'analyst_profile_created': {}
  'analyst_followed': { analyst_id: string }
  'analyst_unfollowed': { analyst_id: string }
  'expert_insight_viewed': { context: 'roster' | 'player_card' | 'feed' }

  // Premium
  'upgrade_started': { from_tier: string, to_tier: string }
  'upgrade_completed': { tier: string, price: number }
  'upgrade_cancelled': { tier: string, reason?: string }
  'ai_caddie_used': { sport: string, feature: 'start_sit' | 'trade_analysis' | 'waiver' }

  // Navigation
  'page_viewed': { path: string, referrer?: string }
  'feature_discovered': { feature: string } // first time user interacts with a feature
}
```

---

## ADMIN DASHBOARD

Route: `/admin` (gated by `role: admin` on user model)

### Built (Phase 1):
1. **Dashboard Overview** — Total users, leagues, active drafts, live tournaments (clickable stat cards)
2. **User Management** — Searchable/paginated user table with role management (make/remove admin)
3. **League Browser** — Searchable/paginated league table with format, status, member count
4. **Tournament Browser** — Searchable/filterable tournament table with status, purse, major/signature badges

### To Build (Phase 2+):
5. **Migration Tracker** — All imports with status, source platform, progress, error details
6. **Prediction Management** — Create/edit prediction slates, resolution queue, manual override
7. **Analyst Management** — Review creator applications, feature/unfeature analysts
8. **Financial** — Stripe integration: subscription counts by tier, MRR, churn

---

## THIRD-PARTY TOOLS TO INSTALL

### Day One (install as you build)
- [ ] **PostHog** (or start with console logging via analytics abstraction above) — Product analytics, funnels, session replay. Free up to 1M events/month.
- [ ] **Sentry** — Error tracking. Captures JS errors, API failures with full context. Free tier.
- [ ] **Vercel Analytics** (if on Vercel) or **Google Analytics 4** — Traffic analytics. Page views, referrers, geography.

### First Month
- [ ] **Stripe** — Payments, subscriptions, financial dashboard built in.
- [ ] **UptimeRobot** — Uptime monitoring, alerts if site goes down. Free for 50 monitors.
- [ ] **Hotjar** — Session recordings, heatmaps. Free tier. Install once you have real users.

### As You Scale
- [ ] **Attention Insight** ($24/mo) — AI-predicted heatmaps for testing page designs pre-launch.
- [ ] **Applitools or Mabl** — Visual regression testing in CI/CD.
- [ ] **Datadog or Grafana Cloud** — Infrastructure monitoring.

---

## UI/UX PRINCIPLES

1. **Season-long first.** Every design decision should optimize for the season-long league experience. DFS, pick'em, and one-off games are not the priority.
2. **Clean over cluttered.** Fantrax has the features but terrible UX. We have the features AND clean UX. When in doubt, simplify.
3. **Mobile-responsive from day one.** Every page must work on a phone. The draft room must be touch-friendly.
4. **No gambling aesthetic.** The prediction system uses community/poll/quiz visual language, NOT sportsbook card UI. No flashing numbers, no odds displays, no "lock it in" CTAs.
5. **Commissioner is king.** Commissioners choose the platform, and 8-14 members follow. Every commissioner pain point is a priority.
6. **Chat is central, not bolted on.** In-league chat is a first-class feature integrated with the transaction feed, not a separate tab people forget about.

---

## PREDICTION SYSTEM — DESIGN RULES

The prediction system is an engagement and reputation feature, NOT a gambling product. These rules are non-negotiable:

### Language
| Never use | Use instead |
|-------------|---------------|
| Picks | Calls or Insights |
| Bets / Wagers | Predictions |
| Over/Under | Player Benchmark |
| Lines | Projections |
| Odds | Consensus or Community View |
| Lock it in | Submit / Make your call |
| Payout / Winnings | Reputation / Rank / Badge |
| Parlay | (don't have an equivalent — this concept doesn't exist in our system) |

### UI Rules
- Prediction cards should look like community polls, not sportsbook props
- Never use green/red flashing numbers or casino-style animations
- The prediction section lives INSIDE the league experience, not as a standalone tab competing for attention
- On the roster page, community consensus is a subtle expandable section, never auto-expanded or attention-grabbing
- No real money is ever involved in predictions. No entry fees for prediction contests. No prizes with monetary value.

### Three Circles Architecture
- **Inner circle (core):** Leagues, drafts, rosters, scoring, chat, trades. Sacred. No prediction prompts intrude here.
- **Middle circle (enhancement):** Prediction accuracy tracking, community consensus indicators, analyst insights. Enhances the inner circle without disrupting it. Users pull info when they want it.
- **Outer circle (growth):** Analyst profiles, public leaderboards, creator partnerships. Lives on profile pages and dedicated sections. Attracts new users but never clutters the core league experience.

---

## REVENUE MODEL

### Subscription Tiers
| Tier | Price | Key Features |
|------|-------|-------------|
| Free | $0 | Full league management, ads, 3 AI Caddie uses/month, current season only, basic predictions |
| Clutch Pro | $7.99/mo | No ads, unlimited AI Caddie, full league history vault, advanced analytics, Draft Wizard, basic trade analyzer, premium themes |
| Clutch Elite | $12.99/mo | All Pro features + priority AI, history exports, full analytics with projections, full AI trade analyzer, mock simulator, full customization |

### Additional Revenue Streams (Future)
- League entry fee processing (5-10% platform fee via Stripe Connect)
- Creator revenue share program
- Branded content partnerships (golf equipment, courses)
- White-label licensing (golf courses, country clubs, corporate events)

---

## KEY COMPETITIVE INSIGHTS

These are research-backed pain points from Reddit, forums, and app reviews that Clutch should solve:

1. **MFL features + Sleeper UX gap** — Nobody combines deep customization with modern mobile UX. We do both.
2. **App crashes on game day** — Sleeper crashed on 2025 NFL opening night. Reliability is a differentiator.
3. **Yahoo hiding features behind paywalls** — Yahoo putting basic lineup tools behind Yahoo+. Users actively migrating.
4. **ESPN slow to innovate** — "Fine except entering waivers is too many clicks." We make everything fewer clicks.
5. **League history loss** — ESPN deleted pre-2018 data. MFL has history but terrible UX. Our League Vault + Migration solves this.
6. **Contract/salary cap dynasty poorly served** — MFL requires custom coding for contracts. We build it native.
7. **DFS/gambling creep** — Sleeper users hate the betting noise. We are explicitly no-gambling.
8. **No prediction accountability** — Every podcast host and Twitter expert talks big with no provable track record. We track accuracy.

---

## IMPORTANT ARCHITECTURAL DECISIONS

1. **Sport-agnostic league infrastructure.** League shell (invites, chat, trades, waivers, standings) is identical regardless of sport. Only player DB, scoring rules, and schedule integration are sport-specific modules.
2. **Event tracking from day one.** Every feature should include analytics.track() calls as it's built. Use the abstraction layer above.
3. **Prediction system is a feature, not a product.** It enhances the league experience. It does not compete with it for attention.
4. **Web-first as PWA.** Validate product-market fit on web before investing in native mobile apps. React Native comes later.
5. **Commissioner-centric design.** Every feature should ask: "Does this make the commissioner's life easier?" Commissioners choose the platform.
6. **No parallel Claude Code instances on foundational work.** One instance, one source of truth for schema, auth, and shared infrastructure. Parallel instances only for isolated feature branches later.

---

## DESIGN SYSTEM: AURORA EMBER

> **Full specification:** See `CLUTCH_BRAND_SYSTEM.md` for complete implementation details including CSS variables, component code, SVG logo, and usage rules.

**Brand direction:** Aurora Ember — warm glassmorphic dark theme, living aurora background, gold/orange accents.

**Key tokens:**
- Background: `#0A0908` (warm charcoal, NOT cool gray, NOT blue)
- Primary accent: `#E8B84D` (gold)
- Secondary accent: `#E07838` (burnt orange)
- Alert/danger: `#D4607A` (warm rose)
- Success/active: `#6ABF8A` (green — status only, never as brand color)
- Cards: Glassmorphic (translucent + backdrop-blur over aurora background)
- Primary gradient: `linear-gradient(135deg, #E8B84D, #E07838)`

**Typography:**
| Role | Font | Rule |
|------|------|------|
| Display | Syne 700-800 | 18px+ ONLY. Headlines, titles, wordmark, primary CTAs |
| Body | DM Sans 400-700 | Everything people read. Nav, descriptions, player names |
| Data | JetBrains Mono 400-700 | Scores, stats, badges, tags, numbers, timestamps |

**Logo:** "The Spark" — lightning bolt in a gold-gradient rounded square. SVG component at `src/components/ui/ClutchLogo.tsx`.

**Critical anti-Sleeper rules:**
1. No cyan/teal/blue as accent colors
2. No robot mascots or cartoon characters
3. Warm charcoal background, not cool gray or dark blue
4. Glass cards (translucent + blur), not solid-fill cards with gray borders
5. Gold gradient primary buttons, never green
6. JetBrains Mono for all data — this is the key differentiator

---

## PROJECT STRUCTURE

```
/Users/EricSaylor/Desktop/Golf/
├── CLAUDE.md                    ← THIS FILE
├── CLUTCH_BRAND_SYSTEM.md       ← Brand system spec (copy from Desktop if needed)
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        ← Database schema
│   │   ├── migrations/          ← Numbered migrations (1-9 applied)
│   │   ├── seedStatsDb.js       ← Sport/Season/FantasyWeek seed
│   │   ├── seedPlayerProfile.js ← Position/Tag/Profile seed
│   │   └── seedAchievements.js  ← Achievement definitions seed
│   ├── prisma/
│   │   ├── seedNflTestLeague.js ← NFL test league seeder (8 teams, 4 weeks scored)
│   │   └── nfl-test-manifest.json ← Tracks test data IDs for cleanup
│   └── src/
│       ├── index.js             ← Express app + cron jobs + Socket.IO
│       ├── middleware/           ← auth.js, requireAdmin.js
│       ├── routes/              ← All API routes
│       │   ├── auth.js, admin.js, leagues.js, teams.js
│       │   ├── drafts.js, trades.js, waivers.js
│       │   ├── players.js, tournaments.js, search.js
│       │   ├── notifications.js, draftHistory.js
│       │   ├── managerAnalytics.js, positions.js
│       │   ├── playerTags.js, rosterSlots.js, sync.js
│       │   ├── nfl.js           ← NFL-specific routes (scoring, available players)
│       │   ├── feed.js          ← GET /api/feed/:sport (auto-generated feed cards)
│       │   └── ...
│       └── services/            ← Business logic
│           ├── datagolfClient.js, datagolfSync.js
│           ├── scoringService.js, fantasyTracker.js
│           ├── nflFantasyTracker.js ← NFL scoring pipeline
│           ├── nflScoringService.js ← NFL scoring calculator
│           ├── seasonSetup.js, waiverProcessor.js
│           ├── notificationService.js, webPushService.js
│           ├── draftGrader.js, fantasyWeekHelper.js
│           ├── analyticsAggregator.js, viewRefresher.js
│           ├── feedGenerator.js    ← Auto-generates feed cards from existing data (5 generators)
│           └── ...
├── frontend/
│   ├── src/
│   │   ├── App.jsx              ← Routes + layout
│   │   ├── components/          ← Shared React components
│   │   │   ├── common/          ← Card, Button, Modal, etc.
│   │   │   ├── layout/          ← Navbar, MobileNav, Sidebar
│   │   │   ├── draft/           ← DraftBoard, DraftHeader, PlayerPool, etc.
│   │   │   ├── nfl/             ← NflWeeklyScoring.jsx (NFL scoring view)
│   │   │   ├── feed/            ← FeedCard.jsx, FeedList.jsx
│   │   │   ├── workspace/       ← The Lab components (BoardHeader, BoardEntryRow, AddToBoardModal, etc.)
│   │   │   └── dashboard/       ← LeagueCard, etc.
│   │   ├── pages/               ← Route pages
│   │   ├── hooks/               ← Custom React hooks
│   │   ├── context/             ← AuthContext
│   │   └── services/            ← api.js, socket.js, analytics.js, webPush.js
│   └── public/
│       └── service-worker.js
└── ...
```

---

## Strategic Architecture Update (Feb 2026)

> Read `/docs/CLUTCH_STRATEGY_UPDATE_FEB2026.md` for the full Feed + The Lab (formerly Workspace) architecture, seasonal flywheel, and revised build priorities.

### Three Pillars + Foundation
- **FEED**: Personalized data stream (why users open the app daily)
- **THE LAB** (formerly Workspace): Interactive tools — draft boards, rankings, notes, watch list, decision journal (where users' work lives). Routes: `/lab`, `/lab/:boardId`, `/lab/watch-list`, `/lab/journal`.
- **PROVE IT**: Prediction tracking and reputation (why users come back)
- **DATA LAYER** (foundation): Player pages, team pages, stat leaderboards, historical data (everything sits on this)

### Six User Personas
Every feature should answer: "Which persona is this for?" When in doubt, optimize for The Informed Fan.

| # | Persona | Description | Peak Engagement |
|---|---------|-------------|-----------------|
| 1 | **The Informed Fan** (primary target) | Plays 1-2 leagues, watches a lot of football, knows more than average. Wants start/sit help, simple player lookups, bragging rights. | In-season (Sep-Jan), draft prep (Aug) |
| 2 | **The Grinder** | Plays 3-5+ leagues, knows advanced stats, wants tools not opinions. Raw data access, filterable leaderboards, global competition. | Year-round, daily during season |
| 3 | **The Content Creator / Analyst** | Has a podcast/YouTube/Twitter following. Wants verified track record, beautiful public profile, discoverability. | Year-round (always making picks) |
| 4 | **The Bettor** | Primarily interested in player props and game lines. Wants prop projections, value analysis, accuracy tracking. | In-season (Wed-Sun) |
| 5 | **The Dynasty Nerd** (off-season driver) | Thinks in 3-year windows, plays keeper/dynasty leagues. Wants rookie evaluations, trade values, age curves. **OFFSEASON IS THEIR PEAK (Feb-May). They never stop.** | Year-round, peaks Feb-May |
| 6 | **The Sports Debater** | Lives for being right and proving others wrong. Wants bold prediction tracking, shareable receipts. | Around prediction windows + results |

### Sport-Specific Clutch Rating System

The Clutch Rating is now **sport-specific primary** with a **global prestige secondary**:

**Sport Rating (per sport, 0-100):**
- Primary rating, computed per sport (NFL, Golf, NBA, MLB)
- Components: Accuracy (40%), Consistency (25%), Volume (20%), Breadth by category (15%)
- Tiers: **Expert** (90+), **Sharp** (80-89), **Proven** (70-79), **Contender** (60-69), **Rising** (<60)
- Minimum 30 graded calls per sport to qualify
- Recalculates daily with 90-day recency weighting

**Global Clutch Rating (prestige):**
- Secondary/prestige rating — requires qualified ratings in 2+ sports
- Weighted average of sport ratings, bonus for multi-sport breadth
- Display: circular gauge, color-coded, trend arrow, hover shows sport breakdown
- This is the "credit score for fantasy analysis" — appears on public profiles

**Schema (replaces single `clutch_manager_ratings`):**
- `clutch_user_sport_ratings` — per-user per-sport rating (accuracy, consistency, volume, breadth components, tier, trend)
- `clutch_user_global_rating` — aggregated cross-sport rating (weighted avg, breadth bonus, global tier)
- `clutch_user_sport_tags` — per-user sport expertise tags for discovery (e.g., "NFL Sharp", "Golf Expert")

### Current Build Priority
Data Layer Steps 1-7 done → The Lab Phases 1-5 done (hub redesign, captures, insights, cheat sheets, timeline) → Lab spec gaps closed (cheat sheet edit, manual journal, player captures) → AI Coaching (next)

### Key Principle: Progressive Disclosure
Default UX is simple and clean (Informed Fan). Depth is always one click away (Grinder, Dynasty Nerd). Never overwhelm, never underserve.

### Seasonal Flywheel
The Feed auto-adjusts content by sports calendar. Golf fills NFL gaps (Feb-May majors). Dynasty Nerds drive off-season engagement. No dead months. See strategy doc for full month-by-month breakdown.

### Data Layer Build Progress
- [x] Step 1: Player Profile Pages (NFL) — Enhanced profiles with career stats, game logs, advanced metrics, progressive disclosure, public SEO routes
- [x] Step 2: Team Pages + Stat Leaderboards — Team stats (off/def aggregates, league rankings, top fantasy players), leaderboards (20+ stats, filters, pagination), NflTeams index page (NFC/AFC conference layout)
- [x] Step 3: Sport Hubs + Feed Cards — `/nfl` and `/golf` hub pages, FeedCard/FeedList components, feedGenerator.js (5 generators from existing data), `/api/feed/:sport` route, Dashboard feed tease, standalone `/feed` page with sport toggle, Feed nav item
- [x] Step 3.5: Live News Pipeline — ESPN NFL+Golf news API polling (`newsSync.js`), `NewsArticle` Prisma model, 3 news API endpoints (`/api/news`, `/api/news/team/:abbr`, `/api/news/player/:id`), `newsCards()` feed generator, enhanced FeedCard (images, external links, bylines), rewritten multi-sport News.jsx page (public), NewsCard NFL type configs, News tabs on NflTeamDetail + NflPlayerDetail, NflHub News link, 2-hour cron job, 75 initial articles synced
- [x] Step 3.6: PGA Hub Enhancement — Schedule Visibility & Roster Planning
  - **Backend:** Early field sync crons (Tue 8PM + Wed 8AM) pull confirmed fields before tournament week via `syncFieldAndTeeTimesForTournament()`. New `GET /api/tournaments/upcoming-with-fields` (next 5 tournaments with full field arrays + course info). New `GET /api/players/:id/schedule` (upcoming tournaments with `inField`/`fieldAnnounced` flags).
  - **GolfHub.jsx:** Redesigned as PGA command center — This Week hero card (live badge / countdown / purse / field size), 5 quick links (Players, Tournaments, Courses, Leaderboard, News), Upcoming Schedule (next 4 events with field status + roster player indicators), Roster Check (auth-gated: playing/not playing columns with links to roster + waiver wire), Feed section.
  - **TeamRoster.jsx:** Golf schedule awareness — schedule summary banner ("This Week: [Name] — 4/6 players confirmed"), per-player badges: green IN FIELD, yellow NEXT WEEK, gray NOT IN FIELD, or TBD. Fetches `getUpcomingTournamentsWithFields()` on mount.
  - **TournamentScoring.jsx:** UPCOMING tournament field view — confirmed field table sorted by OWGR (Player/OWGR/SG Total/Tour columns), roster players highlighted in gold with star, "Field Not Yet Announced" empty state. Replaces empty leaderboard for upcoming events.
  - **PlayerProfile.jsx:** "Upcoming Schedule" section — lists next tournaments with CONFIRMED/TBD/NOT IN FIELD/LIVE badges, course names, dates, major/signature badges.
  - **api.js:** `getUpcomingTournamentsWithFields()`, `getPlayerSchedule(playerId)`.
  - **Schedule Dots Visualization:** 5-dot inline indicator on Players table, TeamRoster, and WaiverWire — each dot = one of the next 5 upcoming events. Green filled = player confirmed in field, dim = field announced but player not in it, hollow outline = field not yet announced (TBD). Tooltip per dot shows tournament name + status.
  - **Startup Field Sync:** Backend syncs field for next upcoming tournament on every server boot (deploy), ensuring schedule dots have data immediately without waiting for Tue/Wed crons.
  - **Goal:** Make Clutch PGA experience superior to Fantrax by solving the #1 pain point — zero visibility into upcoming player schedules. No new files, no schema migrations.
- [x] Step 3.7: Tournament Preview Page — "This Week in Golf"
  - **New page:** `/tournaments/:tournamentId/preview` — magazine-style editorial experience auto-generated from existing data
  - **`storylineGenerator.js`:** Pure utility — `generateCourseNarrative()` (course DNA → prose), `selectPlayersToWatch()` (5-6 players via smart selection: Best Fit, Hot Form, Course History, Under the Radar, Top Ranked), `generateStorylines()` (3-5 narrative cards: Field Strength, Form Watch, Course History, Weather Factor, Sleeper Pick), `generatePlayerNarrative()` (fallback per-player narrative)
  - **`useTournamentPreview.js`:** Custom hook — parallel fetch (tournament + leaderboard + weather), chained course fetch, `flattenEntry` pattern reuse
  - **`TournamentPreviewPage.jsx`:** 7 editorial sections — Hero (name/course/dates/purse/badges), The Course (DNA bars + narrative + stat pills), Players to Watch (6-card grid with tags + metrics + narratives), Key Storylines (auto-generated narrative cards), Weather Outlook (4 round cards), Field Snapshot (stat pills + notable names grid), CTA (leaderboard + course links)
  - **Course-level fallbacks:** When field not yet announced (future events), shows Best Course Fits from `course.topCourseFits` and Course History Leaders from `course.playerHistory` — makes previews weeks out still rich
  - **Entry points:** Gold "This Week in Golf" banner on GolfHub, gold preview banner on TournamentScoring (UPCOMING), "Preview →" links on Tournaments list
  - **No new backend work** — all data from existing APIs
  - **Goal:** Surface Clutch's data as editorial content any golf fan would find valuable, whether they play fantasy or not
- [x] Step 3.8: Workspace Integration — "Connect the Pillars"
  - **AddToBoardModal.jsx:** Reusable modal for adding any player to any board from anywhere in the app. Fetches user's boards, checks for duplicates, supports "Create + Add" flow.
  - **Backend enrichment:** `draftBoardService.js` — golf boards enriched with ClutchScore (CPI, formScore, pressureScore) via batch load. NFL boards enriched with fantasy PPG/total from NflPlayerGame aggregation using `nflScoringService.calculateFantasyPoints()`.
  - **BoardEntryRow.jsx:** Golf rows show CPI pill (color-coded) + Form score + OWGR + SG. NFL rows show position badge + team + fantasy PPG + total pts.
  - **PlayerProfile.jsx + NflPlayerDetail.jsx:** "Add to Board" gold button, gated by auth.
  - **MockDraftRecap.jsx:** "Import to Board" creates new board from mock draft results (auto-names, detects sport, ranks by pick order).
  - **Dashboard.jsx:** "My Boards" widget (3 recent boards, sport badges, player counts, "View All →", empty state CTA). "My Workspace" Quick Action added.
  - **MobileNav.jsx:** "Lab" tab replaces Prove It, links to `/lab`.
- [x] Step 4A: Workspace — "Start From" Board Creation (see `docs/workspace-master-plan.md`)
  - **Backend:** `projectionSync.js` — fetches Sleeper players (ID linking), uses NflPlayerGame PPG as primary signal (offseason), Sleeper ADP as secondary, blends 60/40 into "Clutch Rankings". Golf: DataGolf + ClutchScore (CPI/Form). Stores in `ClutchProjection` model.
  - **ClutchProjection Prisma model** + migration `19_clutch_projections`: sport, scoringFormat, season, week, playerId, projectedPts, adpRank, clutchRank, position, metadata, computedAt.
  - **Projections API:** `GET /api/projections/:sport/:format` (ranked list), `POST /api/projections/sync` (admin trigger). Cron: daily 6 AM ET.
  - **Enhanced `createBoard()`:** `startFrom` param: `clutch` (pre-loads 200 ranked players with auto-tiers), `adp` (ADP-ordered), `previous` (copies most recent board with entries), `scratch` (empty).
  - **DraftBoards.jsx** upgraded: 2-step create modal (Name+Sport+Scoring → Start From options with radio cards). Auto-navigates to board editor on create.
  - **Data:** 465 NFL players ranked (PPR/Half/Std), 250 golf players ranked. 868 Sleeper IDs linked.
- [x] Step 4B+4C: Tags (Target/Sleeper/Avoid) + Reason Chips + Divergence Tracking — migration 21+22, tags/reasonChips/baselineRank on DraftBoardEntry, tag pills on BoardEntryRow, reason chip row on player move, tag filter bar, divergence badge, DivergenceSummary card.
- [x] Step 5: Watch List + Position Rankings — WatchListEntry model, star icon on boards/profiles, `/lab/watch-list` page, PositionTabBar for NFL on board editor.
- [x] Step 6: Decision Journal — BoardActivity model, activity logging on moves/tags/notes/adds/removes, `/lab/journal` page with chronological grouped feed.
- [x] Step 7: Board ↔ Draft Room integration — board as live cheat sheet, tier depletion alerts, board-aware auto-pick.
  - **MockDraft.jsx:** Board selector dropdown on setup page (fetches user's boards filtered by sport, saves boardId to mockConfig).
  - **MockDraftRoom.jsx:** Board fetch on load, `boardLookup` memo (by ID + name), queue pre-populated from board entries, "Board" tab in side panel (tier dividers, tag badges, strike-through drafted, team name on drafted), board rank badge (`B#N`) + tag dot in player table rows, tier depletion alert toasts (fires when ≤1 player left in a tier), board-aware auto-pick (queue IS board order).
- [x] The Lab Phase 1: Hub Redesign — Renamed "Workspace" → "The Lab" across all surfaces.
  - **Schema:** Migration `23_lab_board_fields` — adds `leagueType`, `teamCount`, `draftType`, `rosterConfig` (all nullable) to DraftBoard.
  - **Backend:** `listBoards()` returns `positionCoverage` (NFL: QB/RB/WR/TE counts + covered/total), `leagueType`, `teamCount`, `draftType`. `createBoard()` + `updateBoard()` accept new league context fields. POST route destructures new fields.
  - **Routes:** All `/workspace` routes changed to `/lab` in App.jsx. `WorkspaceRedirect` component catches `/workspace/*` → redirects to `/lab/*` preserving path + query.
  - **Navigation:** Desktop Navbar "Workspace" → "The Lab", MobileNav bottom tab "Boards" → "Lab", active checks updated to `/lab`.
  - **Internal links:** 14 files updated — BoardHeader, DraftBoardEditor, Dashboard, WatchList, DecisionJournal, MockDraftRecap all point to `/lab`. `components/workspace/` directory stays (file-system only, not user-visible).
  - **DraftBoards.jsx (full rewrite):** Hub layout with 6 sections: (1) Header ("THE LAB" + subtitle + New Board), (2) AI Insight Bar (gold-tinted placeholder, computes TE/QB coverage gaps), (3) Two-column readiness tracker + recent captures (journal), (4) Enhanced board card grid (league context pills, NFL position coverage pills green/dim, relative time, status CTA: Start Ranking/Continue/Ready/Locked), (5) Watch List summary (3 players + count), (6) Decision Journal summary (3 entries + View All).
  - **3-step creation flow:** Step 1 name+sport+scoring (unchanged), Step 2 league context (type/teams/draft type, all optional with Skip), Step 3 start from options (unchanged logic, renumbered).
  - **Empty state:** Flask icon, "Welcome to The Lab" heading, dual CTAs (Create Board + Mock Draft link).
  - **useDraftBoards.js:** Passes `leagueType`, `teamCount`, `draftType` through to createBoard.
- [x] The Lab Phases 2-5: Quick Capture, Readiness & Intelligence, Cheat Sheets, Timeline
  - **Phase 2 — Quick Capture:** `LabCapture` + `LabCapturePlayer` models (migrations 24-25). `captureService.js` (CRUD + player linking + recent + player-specific query). `/api/lab/captures` routes (create, list, recent, delete, player/:playerId). Client-side player name auto-detection (`playerDetect.js`). `CaptureFormModal` (textarea, source type pills, sentiment, auto-detected + manual player tags, initialPlayerTags prop). `FloatingCaptureButton` site-wide. `/lab/captures` page (LabCaptures.jsx: filters, search, sport toggle, sentiment, paginated feed). Hub captures section on DraftBoards.jsx.
  - **Phase 3 — Readiness & Intelligence:** `LabInsightCache` model (migration 26). `insightGenerator.js` rule-based engine (10 insight types: missing positions, no notes, no mock draft, stale board, low capture count, no cheat sheet, position imbalance, no watch list, single sport, untagged players). `/api/lab/insight` + `/api/lab/insight/dismiss` routes. `/api/lab/readiness/:boardId` endpoint. Dynamic AI insight bar on hub (gold-tinted, dismiss button, cycles through insights).
  - **Phase 4 — Cheat Sheet Generation:** `LabCheatSheet` model. `cheatSheetService.js` — ADP divergence analysis, tier break detection, value picks + fades identification, position tier grouping. `/api/lab/cheatsheet/generate` (POST), `/api/lab/cheatsheet/:id` (GET/PUT), `/api/lab/cheatsheet/board/:boardId` (GET), `/api/lab/cheatsheet/:id/publish` (POST). `LabCheatSheet.jsx` page — print-optimized CSS, value targets/fades cards, overall rankings table with tier breaks, position tiers quick reference. Board card CTA "Generate Cheat Sheet →". **Edit mode:** reorder arrows, inline note editing, column toggles (ADP/Notes/Tier Breaks), save/cancel with change detection.
  - **Phase 5 — Timeline & History:** `getBoardTimeline()` in `draftBoardService.js` (grouped by date, biggest move, activity summary). `BoardTimeline` component (date sections, activity counts, biggest move highlight). Mobile: timeline tab in `DraftBoardEditor`. Desktop: timeline modal triggered from BoardHeader.
  - **Spec Gap Closures:** (1) Cheat sheet edit mode with reorder/notes/column toggles/save — `LabCheatSheet.jsx`. (2) Manual journal entries via `POST /api/draft-boards/journal/entry` + inline form on `DecisionJournal.jsx` (+ New Entry button, board selector, player name field, `manual_entry` action type). (3) Player captures on profiles — `getCapturesByPlayer()` in captureService, `GET /api/lab/captures/player/:playerId`, "Your Notes" section on `PlayerProfile.jsx` + `NflPlayerDetail.jsx` (capture cards, + Add Note opening CaptureFormModal pre-tagged, "View all in Lab" link).
- [x] **Phase 6A — Data Gap Fixes** (6 sub-tasks): Prediction thesis+confidence, draft pick tags+boardRank, board comparison service, capture-to-outcome linking, opinion evolution timeline (PlayerOpinionEvent model + 8 fire-and-forget hooks), reasoning fields on roster moves. Migrations 27-32.
- [x] **Phase 6B — Decision Graph + Pattern Engine**: `decisionGraphService.js` (getPlayerGraph, getSeasonGraph, getDraftGraph, getPredictionGraph, getMultiSeasonGraph). `patternEngine.js` (detectDraftPatterns, detectPredictionPatterns, detectRosterPatterns, detectCapturePatterns, generateUserProfile). `UserIntelligenceProfile` model (cached, weekly regen). `/api/intelligence` routes. Migration 33.
- [ ] **Phase 6C — AI Foundation + Ambient Intelligence** (NEXT): Claude API wrapper, aiCoachService, ambient insight pipeline, AiInsight+AiReport models. See `docs/CLUTCH_AI_ENGINE_SPEC.md`.

**Backlog:** NFL team pages need more polish (logos, real records, deeper stats). Kicker stats missing. DST stats missing. NFL 2025 data not synced. **NFL game weather:** Same Open-Meteo hourly pipeline used for golf tournament rounds, keyed to NFL game venue coordinates + kickoff time windows. Wind/rain/temp affect kickers, deep-ball QBs/WRs, and overall game script. Need venue-to-coordinates mapping for all 32 stadiums (flag dome/retractable roof). Show on game preview pages + factor into fantasy projections.

---

## WORKSPACE DATA SOURCES (Free APIs for "Start From" Boards)

> **Full plan:** `docs/workspace-master-plan.md` — competitive research, data strategy, feature spec, build order

The Workspace "Start From" system pre-loads boards with projections so users customize rather than build from scratch. All data sources are free and legally safe for commercial use.

| Data Need | Source | Cost | Notes |
|-----------|--------|------|-------|
| NFL Projections | Sleeper API | Free | No auth. `GET /projections/nfl/{season}/{week}`. Cache daily. Stay under 1K calls/min. |
| NFL ADP | Fantasy Football Calculator API | Free | Commercial use OK with attribution. JSON REST. |
| NFL Trade Values | FantasyCalc API | Free | `GET /values/current?isDynasty=false&ppr=1`. Public endpoint. |
| NFL Historical Stats | nflverse | Free | Open source. Already synced via nfl_data_py. |
| NFL Expected Fantasy Pts | ffopportunity (nflverse) | Free | Pre-computed XGBoost model outputs. |
| NFL Trending Players | Sleeper API | Free | `GET /v1/players/nfl/trending/add`. |
| Golf Projections + Rankings | DataGolf API | Existing sub | Already integrated — DG rankings, skill estimates, course fit. |
| Expert Consensus (future premium) | FantasyPros Partners HQ | Paid license | Contact `partners@fantasypros.com`. Best-in-class ECR from 100+ experts. |

**"Clutch Rankings" formula (the default board baseline):**
- NFL: 60% Sleeper projected fantasy pts rank + 40% FFC ADP rank (blended, branded as Clutch's own)
- Golf: DataGolf skill estimates weighted by CPI + Form Score from `clutchMetrics.js`
- **Transformation Rule:** Never expose "Sleeper projections" or "FFC ADP" to users. Always label as "Clutch Rankings."

### The Lab Infrastructure (Already Built)

> Formerly "Workspace" — renamed to "The Lab" in Phase 1 hub redesign. Routes: `/lab`, `/lab/:boardId`, `/lab/watch-list`, `/lab/journal`. Old `/workspace/*` URLs auto-redirect.

| Component | What It Does |
|-----------|-------------|
| `DraftBoard` + `DraftBoardEntry` Prisma models | Board + entries with rank, tier, notes, tags, reasonChips, baselineRank. `boardType` (overall/qb/rb/wr/te), `scoringFormat`, `sport`, `isPublished`, `leagueType`, `teamCount`, `draftType`, `rosterConfig`. |
| `draftBoardService.js` | CRUD, bulk save, player enrichment (ClutchScore for golf, fantasy PPG for NFL). `listBoards` returns `positionCoverage` for NFL. Batch loading to avoid N+1. |
| `draftBoards.js` routes | 10 REST endpoints: list, create, get, update, delete, bulk save entries, add entry, remove entry, update notes, activity log. |
| `useDraftBoardEditor.js` hook | Load board, debounced auto-save (1.5s), moveEntry, addPlayer, removePlayer, updateNotes, insertTierBreak, removeTierBreak. |
| `useDraftBoards.js` hook | List all user boards, createBoard with league context fields. |
| `DraftBoards.jsx` (The Lab hub) | Full hub page: readiness tracker, AI insight bar, enhanced board cards (position coverage pills, league context, status CTA), watch list + journal summaries, 3-step creation flow, empty state. |
| Lab components (`components/workspace/`) | BoardHeader, BoardEntryRow (enriched), TierBreak, PlayerSearchPanel, PlayerNoteEditor, AddToBoardModal, DivergenceSummary. |
| `captureService.js` + `captures.js` routes | LabCapture CRUD, player linking, recent captures, per-player query (`getCapturesByPlayer`). |
| `CaptureFormModal.jsx` | Quick Capture modal: textarea, source pills, sentiment, auto-detected + manual player tags, `initialPlayerTags` prop for pre-tagging from player profiles. |
| `LabCaptures.jsx` | `/lab/captures` page: filters (sport/sentiment/search), paginated capture feed. |
| `insightGenerator.js` + insight routes | Rule-based engine (10 insight types), `/api/lab/insight` GET/dismiss, `/api/lab/readiness/:boardId`. |
| `cheatSheetService.js` + cheatsheet routes | ADP divergence, tier breaks, value picks/fades, position tiers. Generate/GET/PUT/publish endpoints. |
| `LabCheatSheet.jsx` | Cheat sheet page: print CSS, value targets/fades, rankings table with tier breaks, position tiers. Edit mode: reorder arrows, inline notes, column toggles, save/cancel. |
| `DecisionJournal.jsx` | `/lab/journal` page: chronological grouped feed, sport filter, manual entry form (+ New Entry, board selector, player name). |
| `BoardTimeline` component | Timeline grouped by date, activity counts, biggest move highlight. Mobile tab + desktop modal. |

### Competitive Positioning

| Competitor | Workspace Tools | Our Advantage |
|------------|----------------|---------------|
| **Sleeper** | No custom rankings, no cheat sheet, no workspace at all | We have the full workspace — Sleeper users need Chrome extensions for what we offer natively |
| **FantasyPros** | Best-in-class Cheat Sheet Creator, but always a layer on top of ESPN/Yahoo/Sleeper | We ARE the league host + the workspace. No sync required. |
| **PFF** | Rankings Builder from PFF projections, $80/yr paywall | We offer "Start From" for free with comparable UX |
| **ESPN/Yahoo** | Terrible or nonexistent custom ranking tools | Modern drag-and-drop with tiers, tags, notes, reason chips |

---

## REFERENCE DOCS (in repo)

All detailed spec documents live in `docs/` and are version-controlled with the repo:

| Doc | What It Contains |
|-----|-----------------|
| `docs/CLUTCH_STRATEGY_UPDATE_FEB2026.md` | **Feed + Workspace architecture**: three pillars, six user personas, seasonal flywheel, player page progressive disclosure, Feed spec, Workspace tools (draft board, watch list, rankings, scouting notes), revised build priority |
| `docs/nfl-expansion.md` | Complete NFL expansion plan: vision, data sources, pick types, metrics philosophy, schema, build phases (with completion status), dual-track pick system, projection contest, draft cheat sheets, self-scouting AI, monetization, competitive moat |
| `docs/entry-points-addendum.md` | Revised participation tiers (5 levels from weekly picks to full projections), drag-and-drop ranking interface, quick-tap reason chips, "Start From" expert templates, expert following as content engine |
| `docs/data-strategy.md` | Data ownership framework (3 tiers), golf free data sources, DataGolf transformation strategy, NFL data sources (nflfastR/nflverse), AI engines roadmap, 4-layer database architecture, modular provider design |
| `docs/build-specs.md` | Manager stats page spec (A1-A6), AI engines spec (B1-B5), database architecture (C1-C3), data transformation layer (D1-D2), original build priority queue |
| `docs/brand-system.md` | Full Aurora Ember brand system: colors, typography, glassmorphism, logo SVG, component code, anti-Sleeper rules |
| `docs/nfl-gameday-ux.md` | NFL gameday UX spec (v1.4): two-layer platform architecture, weekly manager flow, 9 page wireframes, reward engine (I Told You So, delta cards, Decision DNA), golf parity, data deps, mobile layouts, notifications, onboarding, 7 implementation phases |
| `docs/workspace-master-plan.md` | **Workspace master plan**: competitive research (Sleeper/FantasyPros/PFF/ESPN/Yahoo + 10 more), data source strategy (Sleeper API/FFC ADP/FantasyCalc/nflverse), "Start From" pre-loaded board system, full feature spec (board editor, tags, reason chips, divergence tracking, watch list, scouting notes, decision journal), draft room integration, Feed↔Workspace↔Prove It connections, 7-step build order with file-level specs |

**Desktop docs (not in repo, for reference):**
- `CLUTCH_ARCHITECTURE.md` — Original architecture doc (superseded by this CLAUDE.md)
- `clutch-landing-page-brief.md` — Landing page design brief
- `Clutch_Implementation_Plan.pdf` — Implementation plan document
- `CLUTCH_BUSINESS_ROADMAP.md.pdf` — Business roadmap

---

*Last updated: February 10, 2026*
*Phases 1-3 complete. Phase 4 in progress (4E not started). Data Layer Steps 1-7 complete. The Lab Phases 1-5 complete. Lab spec gaps closed. NFL Mock Draft complete. Phase 6A complete (data gap fixes). Phase 6B complete (Decision Graph + Pattern Engine). Next: Phase 6C (AI Foundation + Ambient Intelligence).*
