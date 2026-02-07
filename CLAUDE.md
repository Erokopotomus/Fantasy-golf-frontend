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

### Current Status: PHASE 2 — COMPLETE ✓
> Phases 1 & 2 built and deployed. Moving to Phase 3: League Vault & Migration.

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

### Phase 3: League Vault & Migration (Build in this order)

> **Critical build order:** Schema first → Player cross-reference table → Import pipeline → Vault display. The Vault is just the front-end for data the import pipeline stores. You do NOT need to pre-populate every historical player before importing — the import process itself populates the canonical player table.

- [ ] **3A: Canonical Player Database Foundation**
  - Extend `players` table with cross-reference support:
    - `external_ids` JSONB field: `{ "yahoo": "123", "espn": "456", "sleeper": "789", "mfl": "abc", "fantrax": "def" }`
    - Index on each external ID path for fast lookup
  - Player matching pipeline:
    1. Exact external ID match (fastest, most reliable)
    2. Fuzzy match fallback: normalize name + match team + position + season
    3. Manual resolution queue for unmatched players (admin tool)
  - Players are created ON IMPORT — no need to pre-seed the database
  - When an import encounters an unknown external ID, create the canonical record and store the mapping
  - Deduplication: if Yahoo import creates "Patrick Mahomes" and ESPN import later references the same player, the cross-reference table links them to one canonical record

- [ ] **3B: League History Schema**
  - Normalized structure that stores seasons/rosters/matchups/standings regardless of source platform
  - New tables: `league_imports`, `historical_seasons`, `historical_rosters`, `historical_matchups`, `historical_standings`, `historical_drafts`, `historical_transactions`
  - `league_imports`: tracks each import job (source, status, progress, error log, seasons found)
  - `historical_seasons`: season_year, league_id, champion_user_id, standings_json, settings snapshot
  - All historical data links to canonical player IDs via the cross-reference table
  - Owner mapping: imported team owners map to Clutch users OR placeholder profiles (claimable later via invite)

- [ ] **3C: Import Pipeline — Yahoo First**
  - OAuth 2.0 flow for commissioner authorization
  - Full history import going back to league creation (Yahoo has the best historical data)
  - Data pulled: rosters, scores, matchups, drafts, transactions, standings, record books
  - Import UX flow:
    1. Choose source platform
    2. Connect via OAuth (Yahoo) / paste ID (Sleeper) / upload CSV (Fantrax) / enter credentials (MFL)
    3. Discovery scan — show seasons found, team count, matchup count
    4. Player mapping review — auto-map 95%+, surface unmatched for manual resolution
    5. Owner mapping — map imported owners to existing Clutch users or create placeholders
    6. Import progress — real-time progress bar, per-season summary cards
    7. League Vault preview — the "wow moment": full history visualized
    8. Invite league members — one-click invite link, members claim their historical team

- [ ] **3D: Additional Platform Imports**
  - ESPN: cookie-based auth (espn_s2 + SWID) with guided extraction. Data from 2018+ only. Marketing: "ESPN deleted your history. Clutch preserves it forever."
  - Sleeper: public API, no auth, just league ID. Simplest import.
  - Fantrax: CSV export flow with guided instructions. Web scraping as backup.
  - MFL: XML API with commissioner credentials. Deepest historical data (15-20+ years).

- [ ] **3E: League Vault Display**
  - Interactive timeline of league history (built AFTER import pipeline works)
  - Season-by-season standings and champions
  - All-time records: highest week, biggest blowout, longest winning streak, most championships
  - Head-to-head historical records between any two owners
  - Draft history browser (every pick, every year)
  - Transaction log across all seasons
  - "On This Day" feature — what was happening in your league 1/2/5 years ago
  - Export option for premium users (PDF trophy case, shareable graphics)

---

### Phase 4: AI Caddie & Creator Ecosystem (After predictions are flowing + migration works)

> **Note:** Analyst profiles, public profiles, follow system, leaderboards, and specialty tags were moved into Phase 2 as part of the "Prove It" hub. Phase 4 covers features that DEPEND on having prediction data flowing and an active user base making calls.

- [ ] **Verified Creator Program**
  - This is a business/partnerships initiative, not just a feature build
  - Verified badge for partnered external creators (podcasters, YouTubers, Twitter analysts)
  - Creator application flow + admin approval queue
  - Creator profile enhancements: external channel links (podcast, YouTube, Twitter/X), creator-branded banner, featured placement in Analysts section
  - Creator-branded leagues: a creator can run a public league on Clutch that their audience joins
  - Revenue share tracking: when a creator's referral link drives a premium conversion, creator gets a cut
  - Outreach priority: Fantasy Footballers, Pat McAfee, Matthew Berry (Tier 1), then mid-tier podcast hosts, then emerging Twitter/Reddit analysts, then golf-specific creators (Rick Gehman, Pat Mayo, DataGolf)
  - Timing: reach out March/April 2026 when football creators are in offseason

- [ ] **In-Roster Expert Insights**
  - On roster management page, subtle expandable section per player
  - Shows: community consensus (% OVER/UNDER), top analyst calls with their accuracy rating
  - User pulls info — section is collapsed by default, never auto-expanded, never intrusive
  - Requires enough prediction data to be useful (minimum ~50 active predictors making calls)
  - Premium enhancement: AI Caddie synthesizes analyst picks + stats + projections into one recommendation

- [ ] **AI Caddie Integration**
  - Claude API (Anthropic) integration for personalized recommendations
  - Inputs: user's roster, league scoring settings, current matchup, analyst prediction consensus, player stats/projections, weather data (golf), course history (golf), injury reports
  - Output: natural language recommendation with cited reasoning ("82% of Expert-tier predictors say START. Scheffler's strokes gained on approach ranks #1 at this course type. I agree — start with confidence.")
  - Appears in two places:
    1. In-roster expandable section (per-player recommendation)
    2. Dashboard AI Caddie widget ("2 lineup suggestions ready")
  - Premium-only feature (Clutch Pro / Clutch Elite)
  - Rate limiting: Free tier gets 3 AI Caddie uses/month, Pro gets unlimited, Elite gets priority queue
  - The AI Caddie uses the ✦ icon, NOT a robot character (see Brand System anti-Sleeper rules)

---

### Phase 5: Multi-Sport Expansion

- [ ] **NFL Fantasy Support** (Target: August 2026)
  - NFL player database and data feed
  - NFL-specific scoring rules engine
  - NFL schedule integration
  - NFL draft room (snake + auction)
  - NFL prediction slates (weekly)

- [ ] **NBA Fantasy Support** (Target: October 2026)
- [ ] **MLB Fantasy Support** (Target: Spring 2027)

---

### Phase 6: Scale & Monetize

- [ ] **Creator Partnership Program** (formal)
- [ ] **Premium Tiers** (Clutch Pro $7.99/mo, Clutch Elite $12.99/mo)
- [ ] **Native Mobile App** (React Native / Expo)
- [ ] **League Entry Fee Processing** (Stripe Connect, 5-10% platform fee)

---

## DATABASE SCHEMA

### Existing Core Tables (built in Phase 1)
- `users` — id, email, name, avatar, role (user/admin), password, notificationPreferences, created_at
- `leagues` — id, name, format, draftType, maxTeams, settings (JSONB), sportId, scoringSystemId, status, inviteCode, ownerId
- `league_members` — league_id, user_id, role, joined_at
- `players` — id, name, sportId, rank, sgTotal, sgOffTee, sgApproach, sgAroundGreen, sgPutting, primaryTour, headshotUrl, countryFlag, recentForm, etc.
- `teams` — id, name, leagueId, userId, totalPoints
- `roster_entries` — id, teamId, playerId, position, rosterStatus, isActive, droppedAt, acquiredVia
- `matchups` — id, leagueId, fantasyWeekId, homeTeamId, awayTeamId, homeScore, awayScore, result
- `transactions` (RosterTransaction) — id, teamId, leagueId, type, playerId, playerName, metadata
- `draft_picks` — id, draftId, teamId, playerId, round, pickNumber, playerRank
- `notifications` — id, userId, type, title, message, actionUrl, isRead, data

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
│       │   └── ...
│       └── services/            ← Business logic
│           ├── datagolfClient.js, datagolfSync.js
│           ├── scoringService.js, fantasyTracker.js
│           ├── seasonSetup.js, waiverProcessor.js
│           ├── notificationService.js, webPushService.js
│           ├── draftGrader.js, fantasyWeekHelper.js
│           ├── analyticsAggregator.js, viewRefresher.js
│           └── ...
├── frontend/
│   ├── src/
│   │   ├── App.jsx              ← Routes + layout
│   │   ├── components/          ← Shared React components
│   │   │   ├── common/          ← Card, Button, Modal, etc.
│   │   │   ├── layout/          ← Navbar, Sidebar
│   │   │   ├── draft/           ← DraftBoard, DraftHeader, PlayerPool, etc.
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

*Last updated: February 7, 2026*
*Phase 1 complete. Phase 2 in progress.*
