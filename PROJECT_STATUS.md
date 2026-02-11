# CLUTCH FANTASY SPORTS — Project Status Report

> Generated: February 10, 2026
> Repository: github.com/Erokopotomus/Clutch
> Branch: master (301 commits)
> Codebase: 250 frontend files, 84 backend files, 2,798-line Prisma schema

---

## Current Phase: Phase 4 (Data Architecture) + The Lab Complete + AI Coaching Next

| Phase | Status |
|-------|--------|
| Phase 1: Core Platform | COMPLETE |
| Phase 2: Engagement & Stickiness | COMPLETE |
| Phase 3: League History & Migration | COMPLETE |
| Phase 4: Data Architecture & Metrics (4A-4D) | COMPLETE |
| Phase 4E: Tier 1 Public Data Sources | NOT STARTED |
| Data Layer Steps 1-7 | COMPLETE |
| The Lab (Workspace) Phases 1-5 | COMPLETE |
| Lab Spec Gaps (cheat sheet edit, manual journal, player captures) | COMPLETE |
| NFL Mock Draft | COMPLETE |
| NFL Gameday UX Phases 1-6 (partial) | COMPLETE |
| Phase 6: AI Coaching | NEXT — Plan drafted |
| Phase 7: Multi-Sport Expansion (NFL complete, NBA/MLB pending) | PARTIAL |

---

## Tech Stack

| Layer | Technology | Status |
|-------|-----------|--------|
| Frontend | React 18 + Vite + Tailwind CSS | Deployed (Vercel) |
| Backend | Node.js + Express 5 | Deployed (Railway) |
| Database | PostgreSQL + Prisma 6 | Deployed (Railway) |
| Real-time | Socket.IO | Live |
| Auth | JWT (custom) | Live |
| Data (Golf) | DataGolf API | Live |
| Data (NFL) | nflverse CSVs | Live (2024 season) |
| News | ESPN API | Live (2-hour sync) |
| Projections | Sleeper API + FFC ADP | Live (daily sync) |
| Push Notifications | Web Push (VAPID) | Live |
| AI/ML | Claude API (Anthropic) | PLANNED (Phase 6) |
| Payments | Stripe | PLANNED |
| File Storage | S3/R2 | PLANNED |
| Cache | Redis | PLANNED |

---

## Functional Frontend Pages (60 routes)

### Core Platform
| Route | Page | Status |
|-------|------|--------|
| `/` | Landing | Live |
| `/login` | Login | Live |
| `/signup` | Signup | Live |
| `/dashboard` | Dashboard | Live |
| `/profile` | Profile Settings | Live |
| `/u/:username` | Public Profile | Live |
| `/manager/:userId` | Manager Profile (stats, achievements, H2H) | Live |
| `/settings/notifications` | Notification Preferences | Live |
| `/admin` | Admin Dashboard (users, leagues, tournaments) | Live |
| `/import` | League Import (Sleeper, Yahoo, ESPN, Fantrax, MFL) | Live |
| `/news` | Multi-Sport News Feed | Live |
| `/feed` | Content Feed (stats, trends, news cards) | Live |
| `/search` | Global Search | Live |

### League Management (17 routes under `/leagues/:leagueId`)
| Route | Page | Status |
|-------|------|--------|
| `/leagues` | My Leagues | Live |
| `/leagues/create` | Create League Wizard | Live |
| `/leagues/join` | Join via Invite Code | Live |
| `/leagues/:id` | League Home | Live |
| `/leagues/:id/draft` | Live Draft Room (snake + auction) | Live |
| `/leagues/:id/roster` | Team Roster Management | Live |
| `/leagues/:id/waivers` | Waiver Wire (FAAB + rolling priority) | Live |
| `/leagues/:id/standings` | Standings (H2H, Roto, Survivor, OAD) | Live |
| `/leagues/:id/scoring` | Live Scoring | Live |
| `/leagues/:id/trades` | Trade Center | Live |
| `/leagues/:id/settings` | League Settings (commissioner tools) | Live |
| `/leagues/:id/vault` | League Vault (historical seasons) | Live |
| `/leagues/:id/recap` | Season Recap & Awards | Live |
| `/leagues/:id/draft-dollars` | Draft Dollar Tracking | Live |
| `/leagues/:id/gameday` | NFL Gameday Portal | Live |
| `/leagues/:id/matchups` | H2H Weekly Matchups | Live |
| `/leagues/:id/categories` | Roto Category Standings | Live |
| `/leagues/:id/survivor` | Survivor Board | Live |
| `/leagues/:id/picks` | Pick Center | Live |
| `/leagues/:id/team-settings` | Team Settings | Live |

### Draft Tools
| Route | Page | Status |
|-------|------|--------|
| `/draft` | Draft Lobby | Live |
| `/mock-draft` | Mock Draft Setup (Golf + NFL) | Live |
| `/mock-draft/room` | Mock Draft Room (AI opponents, board integration) | Live |
| `/draft/history` | Draft History | Live |
| `/draft/history/:draftId` | League Draft Recap + Grades | Live |
| `/draft/history/mock/:id` | Mock Draft Recap | Live |

### Golf Data
| Route | Page | Status |
|-------|------|--------|
| `/golf` | PGA Tour Hub (schedule, field check, hero card) | Live |
| `/players` | Golf Player Database | Live |
| `/players/:id` | Golf Player Profile (stats, ClutchScore, course history, captures) | Live |
| `/tournaments` | Tournament List | Live |
| `/tournaments/:id` | Tournament Scoring / Leaderboard | Live |
| `/tournaments/:id/preview` | Tournament Preview (storylines, course DNA, players to watch) | Live |
| `/courses` | Course Database | Live |
| `/courses/:id` | Course Detail | Live |

### NFL Data
| Route | Page | Status |
|-------|------|--------|
| `/nfl` | NFL Hub | Live |
| `/nfl/players` | NFL Player Database | Live |
| `/nfl/players/:id` | NFL Player Detail (stats, news, fantasy points, captures) | Live |
| `/nfl/teams` | NFL Team Directory | Live |
| `/nfl/teams/:abbr` | NFL Team Detail | Live |
| `/nfl/schedule` | NFL Schedule | Live |
| `/nfl/leaderboards` | NFL Stat Leaderboards | Live |
| `/nfl/compare` | NFL Player Compare Tool | Live |

### The Lab (Draft Prep Workspace)
| Route | Page | Status |
|-------|------|--------|
| `/lab` | Lab Hub (boards, readiness, insights, captures, journal) | Live |
| `/lab/:boardId` | Draft Board Editor (drag-drop, tags, tiers, divergence) | Live |
| `/lab/watch-list` | Watch List | Live |
| `/lab/journal` | Decision Journal (auto-logged + manual entries) | Live |
| `/lab/captures` | Quick Capture Notes | Live |
| `/lab/cheatsheet/:id` | Cheat Sheet (tiers, value picks, print CSS, edit mode) | Live |

### Predictions
| Route | Page | Status |
|-------|------|--------|
| `/prove-it` | Prediction Hub (performance calls, benchmarks, expert tracking) | Live |

### Site-Wide Components
| Component | Description | Status |
|-----------|-------------|--------|
| FloatingCaptureButton | Bottom-right quick capture button (all pages) | Live |
| AddToBoardModal | Add player to board from any profile | Live |
| CaptureFormModal | Quick note capture with player auto-detection | Live |
| SearchModal | Global search (players, leagues, teams) | Live |
| OnboardingModal | First-time user wizard | Live |
| MobileNav | Bottom tab navigation (Dashboard, Leagues, Golf, Lab, More) | Live |

---

## Database Tables (91 Prisma Models)

### Users & Auth
| Model | Purpose |
|-------|---------|
| User | User accounts (email, password, role, avatar, bio, socialLinks) |
| PushToken | Web push notification tokens |
| UserOAuthToken | OAuth tokens (Yahoo integration) |

### Leagues & Teams
| Model | Purpose |
|-------|---------|
| League | Fantasy leagues (sport, format, draftType, status, settings) |
| LeagueMember | League membership (role: owner/manager/member) |
| Team | Fantasy teams (name, points, W-L-T record) |
| RosterEntry | Player roster assignments (position, status, keeper info) |
| TeamBudget | Auction budget tracking by position |
| DraftDollarAccount | Draft dollar balances (current + next year) |
| DraftDollarTransaction | Dollar transaction ledger |
| WaiverClaim | Waiver claims (FAAB bids, priority) |

### Drafts
| Model | Purpose |
|-------|---------|
| Draft | Draft sessions (status, currentPick, timePerPick) |
| DraftOrder | Draft order positions |
| DraftPick | Individual picks (round, amount, isAutoPick) |
| DraftGrade | Post-draft grades (overall, position, pick grades) |
| MockDraftResult | Mock draft results and grades |

### Scoring & Matchups
| Model | Purpose |
|-------|---------|
| Sport | Sport definitions (golf, nfl) |
| Season | Seasons per sport |
| FantasyWeek | Weekly periods per season |
| ScoringSystem | Scoring rules (Standard, PPR, Half-PPR, custom) |
| FantasyScore | Computed fantasy scores per player per week |
| Matchup | H2H matchups (scores, playoff info) |
| WeeklyTeamResult | Weekly team scores and results |
| LineupSnapshot | Locked lineup snapshots |
| LeagueSeason | Season-specific league data |
| TeamSeason | Season-specific team records |
| RosterTransaction | All roster moves (audit trail) |
| Pick | Tier-based picks |

### Golf Data
| Model | Purpose |
|-------|---------|
| Player | Universal player model (golf stats, NFL fields, external IDs) |
| Course | Golf courses (par, yardage, grass, architect, skill importance weights) |
| Hole | Individual holes per course |
| Tournament | PGA tournaments (dates, purse, status, format) |
| Performance | Tournament performances (score, position, SG stats, fantasy points) |
| RoundScore | Per-round scoring (SG breakdown, fairways, greens, putts) |
| HoleScore | Per-hole scoring (score, putts, fairway/green hit) |
| LiveScore | Real-time scoring (position, thru, probabilities) |
| PlayerPrediction | DataGolf predictions (win/top5/top10 probabilities, course fit) |
| PlayerCourseHistory | Aggregated player-course stats |
| Weather | Tournament weather data (hourly JSON) |

### NFL Data
| Model | Purpose |
|-------|---------|
| NflTeam | 32 NFL teams (abbreviation, city, conference, division) |
| NflGame | NFL games (season, week, scores, venue, odds) |
| NflPlayerGame | Per-game player stats (50+ stat fields, fantasy points 3 formats) |

### News & Content
| Model | Purpose |
|-------|---------|
| NewsArticle | ESPN news articles (sport, category, headline, playerIds, teamAbbrs) |

### Clutch Proprietary Metrics
| Model | Purpose |
|-------|---------|
| ClutchScore | CPI, Form Score, Pressure Score, Course Fit Score (per player per event) |
| ClutchProjection | Pre-computed rankings (VBD-based, 465 NFL + 250 golf players) |
| ClutchEventIdMap | Cross-provider event ID mapping |
| ClutchFormulaLog | Formula version tracking |
| ClutchManagerRating | Manager skill rating (accuracy, consistency, volume, breadth) |

### The Lab (Workspace)
| Model | Purpose |
|-------|---------|
| DraftBoard | User draft boards (sport, format, leagueType, teamCount, draftType) |
| DraftBoardEntry | Board rows (rank, tier, notes, tags, reasonChips, baselineRank) |
| BoardActivity | Activity log (moves, tags, notes, manual entries) |
| WatchListEntry | Player watch list per user |
| LabCapture | Quick capture notes (content, sourceType, sentiment) |
| LabCapturePlayer | Player-capture links (autoDetected flag) |
| LabInsightCache | Cached rule-based insights |
| LabCheatSheet | Generated cheat sheets (contentJson, formatSettings) |

### Predictions & Reputation
| Model | Purpose |
|-------|---------|
| Prediction | User predictions (type, outcome, accuracy) |
| UserReputation | Prediction accuracy tracking (tier: rookie to elite) |

### Analytics & Profiles
| Model | Purpose |
|-------|---------|
| PlayerSeasonStats | Aggregated season stats |
| ADPEntry | Average draft position data |
| PlayerConsistency | Boom/bust rates, floor/ceiling |
| OwnershipRate | Roster ownership percentages |
| DraftValueTracker | Draft pick value tracking |
| ManagerProfile | Manager stats across leagues |
| HeadToHeadRecord | Manager H2H records |
| ManagerSeasonSummary | Per-season manager stats |
| Achievement | Achievement definitions (32 achievements) |
| AchievementUnlock | User achievement unlocks |
| SportPlayerProfile | Sport-specific player profiles |

### Infrastructure
| Model | Purpose |
|-------|---------|
| Position | Sport positions (QB, RB, WR, etc.) |
| PlayerPosition | Player-position mappings |
| RosterSlotDefinition | Roster slot configs |
| RosterSlotEligibility | Position eligibility per slot |
| RosterSlotAssignment | Active slot assignments |
| PlayerTag | System tags (categories) |
| PlayerTagAssignment | Tag-player links |
| RawProviderData | Raw data ingestion log |
| LeagueImport | League import tracking |
| HistoricalSeason | Imported historical seasons |
| BettingOdds | Betting odds data |
| DFSSlate | DFS slate data |
| PlayerDFSEntry | DFS player entries |
| PropLine | Prop lines (generated for Prove It) |
| Trade | Trade proposals |
| Message | League chat messages |
| Notification | User notifications |

---

## API Routes (~150+ endpoints across 35 route files)

### Auth (`/api/auth`) — 7 routes
- POST `/signup`, `/login`, `/refresh`
- GET `/me`, `/yahoo`, `/yahoo/callback`, `/yahoo/status`
- DELETE `/yahoo`

### Users (`/api/users`) — 4 routes
- GET `/me`, `/:id`, `/by-username/:username`
- PATCH `/me`

### Leagues (`/api/leagues`) — 10+ routes
- GET `/`, `/:id`, `/:id/scoring-schema`
- POST `/`, `/:id/join`
- PATCH `/:id`, `/:id/scoring`
- DELETE `/:id`

### Waivers (`/api/leagues/:leagueId/waivers`) — 5 routes
- POST `/claim`
- GET `/claims`, `/history`
- PATCH `/claims/:claimId`
- DELETE `/claims/:claimId`

### Draft Dollars (`/api/leagues/:id/draft-dollars`) — 4 routes
- GET `/`, `/ledger`
- POST `/transaction`, `/adjust`

### Teams (`/api/teams`) — 9 routes
- GET `/:id`, `/:id/keepers`
- PATCH `/:id`, `/:id/roster/:playerId`
- POST `/:id/roster/add`, `/:id/roster/drop`, `/:id/lineup`, `/:id/keeper/designate`, `/:id/keeper/undesignate`

### Drafts (`/api/drafts`) — 11 routes
- GET `/league/:leagueId`, `/:id`, `/:id/players`
- POST `/:id/start`, `/:id/pick`, `/:id/pause`, `/:id/resume`, `/:id/undo-pick`, `/:id/nominate`, `/:id/bid`
- PATCH `/:id/schedule`

### Trades (`/api/trades`) — 7 routes
- GET `/`
- POST `/`, `/:id/accept`, `/:id/reject`, `/:id/cancel`, `/:id/vote`
- GET `/:id/votes`

### Players (`/api/players`) — 4 routes
- GET `/`, `/:id`, `/:id/stats`, `/:id/schedule`

### Tournaments (`/api/tournaments`) — 6 routes
- GET `/`, `/current`, `/upcoming-with-fields`, `/:id`, `/:id/leaderboard`, `/:id/scorecards/:playerId`

### Courses (`/api/courses`) — 2 routes
- GET `/`, `/:id`

### NFL (`/api/nfl`) — 8+ routes
- GET `/players`, `/players/:id`, `/games`, `/teams`, `/teams/:abbr`, `/leaderboards`

### Feed (`/api/feed`) — 1 route
- GET `/:sport`

### News (`/api/news`) — 3 routes
- GET `/`, `/team/:abbr`, `/player/:id`

### Projections (`/api/projections`) — 3 routes
- GET `/:sport/:format`, `/:sport/:format/adp`
- POST `/sync`

### Watch List (`/api/watch-list`) — 5 routes
- GET `/`, `/ids`
- POST `/`
- DELETE `/:playerId`
- PATCH `/:playerId/note`

### Draft Boards (`/api/draft-boards`) — 14 routes
- GET `/`, `/:id`, `/:id/activities`, `/:id/timeline`, `/journal/all`
- POST `/`, `/:id/entries`, `/:id/activities`, `/journal/entry`
- PATCH `/:id`, `/:id/entries/:playerId/notes`
- PUT `/:id/entries`
- DELETE `/:id`, `/:id/entries/:playerId`

### Lab Insights (`/api/lab`) — 3 routes
- GET `/insight`, `/readiness/:boardId`
- POST `/insight/dismiss`

### Lab Captures (`/api/lab/captures`) — 5 routes
- GET `/`, `/recent`, `/player/:playerId`
- POST `/`
- DELETE `/:id`

### Cheat Sheets (`/api/lab/cheatsheet`) — 5 routes
- GET `/board/:boardId`, `/:id`
- POST `/generate`, `/:id/publish`
- PUT `/:id`

### Predictions (`/api/predictions`) — 7 routes
- GET `/me`, `/reputation`, `/reputation/:userId`, `/leaderboard`, `/consensus-weighted`
- POST `/`
- PATCH `/:id`
- DELETE `/:id`

### Analytics (`/api/analytics`) — 9 routes
- GET `/player/:id/history`, `/player/:id/consistency`, `/rankings`, `/draft/adp`, `/draft/value`, `/ownership`, `/league/:id/history`
- POST `/backtest`, `/refresh`

### Manager Analytics (`/api/managers`) — 6 routes
- GET `/:id/profile`, `/:id/clutch-rating`, `/:id/season/:seasonSlug`, `/:id/h2h/:opponentId`, `/:id/achievements`, `/leaderboard/rankings`

### Notifications (`/api/notifications`) — 9 routes
- GET `/`, `/tokens`, `/preferences`
- POST `/tokens`
- PATCH `/:id/read`, `/read-all`, `/preferences`
- DELETE `/:id`, `/tokens/:id`

### Admin (`/api/admin`) — 4 routes
- GET `/stats`, `/users`, `/leagues`, `/tournaments`
- POST `/users/:id/role`

### Imports (`/api/imports`) — 14 routes
- POST `/sleeper/discover`, `/sleeper/import`, `/espn/discover`, `/espn/import`, `/yahoo/discover`, `/yahoo/import`, `/fantrax/discover`, `/fantrax/import`, `/mfl/discover`, `/mfl/import`
- GET `/`, `/:id`, `/history/:leagueId`
- DELETE `/:id`

### Draft History (`/api/draft-history`) — 3 routes
- GET `/leagues`, `/drafts/:draftId`, `/drafts/:draftId/grades`

### Sync (`/api/sync`) — 19 routes
- POST `/players`, `/schedule`, `/tournament/:dgId/field`, `/tournament/:dgId/live`, `/tournament/:dgId/predictions`, `/tournament/:dgId/projections`, `/tournament/:dgId/finalize`, `/tournament/:tournamentId/espn`, `/espn-ids`, `/espn-bios`, `/nfl/players`, `/nfl/schedule`, `/nfl/stats`, `/nfl/rosters`, `/nfl/backfill`, `/clutch-metrics`, `/course-history`, `/weather`
- GET `/status`

### Other
- GET `/api/health`
- POST `/api/seed`
- GET `/api/search`
- POST `/api/waitlist`
- GET `/api/sports/:slug/positions`

---

## Cron Jobs (33 scheduled tasks)

### Golf Data Sync
| Schedule | Task |
|----------|------|
| Daily 6 AM | Player data sync |
| Mon 5 AM | Schedule sync |
| Thu-Sun 7 AM | Tournament field + live scores sync |
| Tue 8 PM | Early field sync (upcoming tournaments) |
| Wed 8 AM | Early field sync (confirmation) |
| Wed-Thu 6 AM | Course history + weather sync |
| Thu-Sun every 5 min | Live scoring updates (2 crons) |

### Golf Analytics
| Schedule | Task |
|----------|------|
| Tue 4 AM | Clutch metrics computation |
| Tue 4:30 AM | Player season stats refresh |
| Wed 6 AM | Course history rebuild |
| Sun 10 PM | Tournament finalization |
| Sun 10:15 PM | Prediction resolution |
| Sun 10:30 PM | Fantasy scoring + matchup processing |
| Wed 12 PM | Draft grades refresh |

### NFL Data
| Schedule | Task |
|----------|------|
| Mon 3 AM | NFL stats sync |
| Mon 2:30 AM | NFL roster sync |
| Wed 7:30 AM | NFL schedule sync |
| Mon 3:30 AM | NFL player sync |
| Sun 11 PM | NFL fantasy scoring |
| Every 30 min | NFL week status transitions (Sep-Feb) |

### Platform
| Schedule | Task |
|----------|------|
| Wed 9 AM | Manager ratings refresh |
| Thu-Sun 6 AM | Ownership rates |
| Sun 4 AM | Season stats refresh |
| Mon 2 AM | Prediction badge processing |
| Every 2 hours | ESPN news sync (NFL + Golf) |
| Daily 6 AM | Clutch projections sync |

### Season Setup
| Schedule | Task |
|----------|------|
| Tue 5 AM | Consistency metrics |
| Tue 5:30 AM | ADP tracking |
| Tue 6 AM | Draft value tracking |
| Tue 6:30 AM | NFL fantasy scoring (weekly) |

---

## Database Migrations (26 applied)

| # | Migration | Purpose |
|---|-----------|---------|
| 0 | init | Core tables (users, leagues, teams, players, tournaments, etc.) |
| 1 | analytics_indexes | Performance indexes |
| 2 | universal_player_profile | Positions, tags, roster slots, budgets |
| 3 | manager_analytics | ManagerProfile, HeadToHeadRecord, achievements |
| 4 | manager_views | ManagerSeasonSummary |
| 5 | playoff_tracking / waiver_claims | Playoff fields + WaiverClaim model |
| 6 | draft_scheduled_for | Draft scheduling field |
| 7 | draft_grading | DraftGrade, MockDraftResult models |
| 8 | push_notifications | PushToken model |
| 9 | admin_role | Admin role on User model |
| 10 | predictions | Prediction, UserReputation models |
| 11 | league_history | LeagueImport, HistoricalSeason models |
| 12 | data_architecture | RawProviderData, ClutchScore, ClutchEventIdMap, ClutchFormulaLog |
| 13 | clutch_rating | ClutchManagerRating model |
| 14 | public_profiles | Public profile fields (username, bio, tagline) |
| 15 | nfl_expansion | NflTeam, NflGame, NflPlayerGame, PropLine models |
| 16 | nfl_scoring_yahoo_oauth | NFL scoring fields, UserOAuthToken |
| 17 | course_coordinates | Latitude/longitude on Course |
| 18 | workspace_draft_boards | DraftBoard, DraftBoardEntry models |
| 19 | clutch_projections | ClutchProjection model |
| 20 | weather_hourly_data | Weather hourly JSON field |
| 21 | board_tags_reason_chips | Tags + reasonChips JSON on DraftBoardEntry |
| 22 | divergence_watchlist_journal | baselineRank, WatchListEntry, BoardActivity models |
| 23 | lab_board_fields | leagueType, teamCount, draftType, rosterConfig on DraftBoard |
| 24 | lab_captures | LabCapture, LabCapturePlayer models |
| 25 | lab_insights | LabInsightCache model |
| 26 | lab_cheatsheets | LabCheatSheet model |

---

## Backend Services (20 service files)

| Service | Purpose |
|---------|---------|
| `datagolfSync.js` | DataGolf API sync (players, fields, live scores, predictions) |
| `espnSync.js` | ESPN API sync (live scores, event mapping) |
| `nflSync.js` | nflverse CSV sync (players, games, stats, rosters) |
| `newsSync.js` | ESPN news pipeline (NFL + Golf, 2-hour cron) |
| `projectionSync.js` | Clutch projections (Sleeper ADP + NflPlayerGame PPG blend) |
| `clutchMetrics.js` | Proprietary metrics (CPI, Form, Pressure, Course Fit) |
| `nflScoringService.js` | NFL fantasy point calculation (3 formats + custom) |
| `nflFantasyTracker.js` | NFL weekly scoring pipeline |
| `fantasyTracker.js` | Golf fantasy scoring pipeline |
| `fantasyWeekHelper.js` | Fantasy week creation + lock logic |
| `playoffService.js` | Playoff bracket generation + advancement |
| `predictionService.js` | Prediction submission + resolution |
| `draftBoardService.js` | Draft boards, entries, activities, journal, readiness |
| `captureService.js` | Quick captures CRUD + player linking |
| `cheatSheetService.js` | Cheat sheet generation (ADP divergence, tiers, value picks) |
| `insightGenerator.js` | Rule-based insight engine for Lab hub |
| `feedGenerator.js` | Feed card aggregation (10+ sources) |
| `storylineGenerator.js` | Tournament preview narratives |
| `seasonSetup.js` | Season initialization + NFL fantasy week creation |
| `draftGradeService.js` | Draft grading algorithms |

---

## Key Features by Category

### Fantasy League Management
- League creation (H2H, Roto, Survivor, One-and-Done formats)
- Snake + Auction drafts (live + mock)
- FAAB + rolling priority waivers
- Trade system with veto voting (33/50/67% thresholds)
- Draft dollar tracking with next-year trading
- Keepers (no-cost, round penalty, auction, auction escalator)
- Position limits, divisions, playoff byes
- IR slot management
- Commissioner tools (pause/resume/undo draft, manage members)
- Season recap and auto-generated awards

### Draft Tools
- Mock draft room with AI opponents (Golf + NFL)
- Sport-aware AI drafting (position soft caps for NFL)
- Board integration (pre-populate queue from Lab boards)
- Position filter pills, colored position badges
- Scoring format selector (Standard/Half PPR/PPR)
- Draft history with grades

### The Lab (Draft Prep Workspace)
- Draft boards with drag-and-drop ranking
- "Start From" board creation (Clutch rankings, ADP, previous board, scratch)
- Tags (Target/Sleeper/Avoid) with color coding
- Reason chips (20 quick-tap chips in 3 categories)
- Divergence tracking (baselineRank comparison)
- Watch list (star icon on boards + player profiles)
- Position rankings (NFL position filter bar)
- Decision journal (auto-logged + manual entries)
- Quick captures (notes with player auto-detection, sentiment, source)
- Floating capture button (site-wide)
- Cheat sheet generation (ADP divergence, tiers, value picks, print CSS)
- Cheat sheet edit mode (reorder, inline notes, column toggles)
- Readiness tracker + AI insight bar (rule-based)
- Board timeline (activity history grouped by date)

### Golf Features
- PGA Tour hub (schedule, roster check, field announcements)
- Player profiles (stats, ClutchScore metrics, course history, schedule)
- Tournament scoring with live leaderboard
- Tournament preview pages (storylines, course DNA, weather, players to watch)
- Course database with skill importance weights
- Early field sync (Tue 8PM + Wed 8AM crons)

### NFL Features
- NFL player database + detail pages
- NFL team pages
- NFL schedule + leaderboards
- Player comparison tool
- Weekly scoring pipeline (auto-score Tuesday 6:30 AM)
- Gameday portal with live matchup tracking
- Sport-aware league UI (positions, filters, slot labels)
- NFL mock draft with 150 fallback players

### Predictions (Prove It)
- Performance calls, player benchmarks, weekly winner, bold calls
- Automated resolution (Sunday 10:15 PM cron)
- Accuracy tracking + tier system (Rookie to Elite)
- Community consensus
- Reputation leaderboard

### Data & Analytics
- ClutchScore: CPI (-3 to +3), Form Score (0-100), Pressure Score (-2 to +2), Course Fit (0-100)
- ClutchProjection: VBD-based rankings, 465 NFL + 250 golf players
- Manager profiles with H2H records + 32 achievements
- Live news pipeline (ESPN NFL + Golf, 2-hour sync)
- Feed generator (10+ card types)

### Social & Engagement
- In-league chat (Socket.IO real-time)
- Push notifications (7 categories)
- Public profiles with pinned badges
- Shareable prediction cards
- Event tracking (42+ analytics events)

### Platform
- JWT auth (custom)
- Admin dashboard
- League import (Sleeper, Yahoo, ESPN, Fantrax, MFL)
- Global search
- Mobile responsive (all pages)
- Rate limiting (auth, API, sync endpoints)
- Input validation + sanitization

---

## What's Next

1. **Phase 6: AI Coaching** (plan drafted)
   - 6A: Clutch Scout (AI scouting reports for tournaments/weeks)
   - 6B: Clutch Advisor (personalized AI assistant in The Lab)
   - 6C: Clutch Sim (matchup simulator)

2. **Known Gaps**
   - NFL 2025 season data not yet synced (only 2024)
   - Kicker + DST stats missing from NFL data
   - No live data provider decision (DataGolf only for golf)
   - Redis not yet deployed (planned for leaderboard caching)
   - PWA not configured
   - Stripe payments not integrated

---

*301 commits. 91 database models. 150+ API endpoints. 60 frontend pages. 33 cron jobs. 20 backend services. 26 migrations. 2 sports live.*
