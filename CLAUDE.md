# CLUTCH FANTASY SPORTS — Master Architecture & Development Guide

> **Purpose:** This document is the single source of truth for the Clutch Fantasy Sports platform. Claude Code should read this at the start of every session to understand the project vision, current state, architectural decisions, and what to build next. This document is maintained by the project owner and updated as phases are completed.

---

## PROJECT VISION

Clutch Fantasy Sports is a season-long fantasy sports platform. Golf-first, multi-sport by design. The goal is to combine the deep customization of Fantrax/MFL with the clean, modern UX of Sleeper — while adding features no competitor has: AI-powered insights, verified prediction tracking, league history preservation, and a creator ecosystem built on provable accuracy.

**Core positioning:** Season-long fantasy, no gambling noise. No DFS, no parlays, no prop bets, no sportsbook integrations. Clutch is for people who run leagues with their friends and want the best tools to do it.

**Target URL:** https://clutchfantasysports.com

---

## TECH STACK

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS |
| Backend/API | Node.js + Express |
| Database | PostgreSQL (via Prisma ORM) on Railway |
| Auth | JWT (custom) |
| Real-time | Socket.IO |
| AI/ML | Claude API (Anthropic) |
| Hosting | Vercel (frontend) + Railway (backend/DB) |
| Data Feeds | DataGolf API (golf), ESPN API (golf historical + news), nflverse (NFL) |
| File Storage | Cloudinary (images) |

---

## CURRENT DEPLOYMENTS

- **Frontend:** Vercel at `clutch-pied.vercel.app` (custom domain: `clutchfantasysports.com`)
- **Backend:** Railway at `clutch-production-8def.up.railway.app`
- **Database:** PostgreSQL on Railway
- **GitHub:** `Erokopotomus/Clutch`

---

## DEVELOPMENT WORKFLOW: THE CLUTCH LOOP

Three agents work in parallel: **Cowork** (audit/fix/queue), **Claude Code** (build/deploy), **Eric** (decisions/routing/testing).

**The loop:** Audit → Fix → Queue → Build → Verify → Next

- **Cowork** audits pages in Chrome, fixes frontend issues on sight (edits files directly), writes detailed backend prompts for anything it can't test locally, adds items to `docs/QUEUE.md`, verifies deploys, maintains Obsidian vault + this file.
- **Claude Code** reads `docs/QUEUE.md` and works through `TODO` items top to bottom. Marks items `DONE` with a summary when complete. See QUEUE.md header for exact instructions.
- **Eric** routes work between agents, makes product decisions, tests in the real app.

**Key rule: Fix on sight, not later.** When auditing, fix issues immediately. Don't document bugs to fix later — that creates debt. Cowork edits frontend directly, queues backend prompts with full file paths and line numbers while context is fresh.

**Task queue:** `docs/QUEUE.md` — the single source of truth for what needs building. Cowork adds `TODO` items with self-contained prompts. Claude Code marks them `DONE`. Cowork marks `VERIFIED` after checking in Chrome.

**Session end protocol:** Say "sync up" and Cowork will update Obsidian vault (session-log, current-status, backlog, decisions-log) and this file.

---

## SPORT SUPPORT PRIORITY

1. **Golf** — Launch sport. PGA Tour, LIV, DP World Tour, LPGA.
2. **NFL** — Add by August 2026 for football draft season. Biggest growth lever.
3. **NBA** — Add by October 2026 for basketball season.
4. **MLB** — Add by Spring 2027.

**Architectural rule:** All league infrastructure (invites, chat, trades, waivers, standings, draft room) must be **sport-agnostic**. Only the player database, scoring rules, and schedule integration are sport-specific modules.

---

## DEVELOPMENT PHASES

### Current Status: PHASE 5 — IN PROGRESS (Friend Testing Sprint Active)
> Phases 1-4 complete (4E partially complete). Phase 5B (Clutch Rating V2) built. Phase 5C (Prediction Expansion + Compact Table) complete. Phase 6 (AI Engine) complete — including Personal AI Coach Vault (per-user coaching memory). League Vault V2 + Commissioner blog built. ESPN historical backfill (2018-2026, 9 years) complete. DataGolf SG backfill (2018-2026) complete. Tournament intelligence + SG Intelligence (radar charts, trend viz) live. Golf Hub + Season Race + Compare page live. Live fantasy scoring pipeline + scoring page redesign live. Board editor overhauled (compare mode, SG columns, auction values, reason chips). Draft room season stats + tooltips. iPod Reframe (all 6 phases) complete. Profile enhancement (avatar upload, username, backend persist) complete. Leagues dropdown nav. **Friend Testing Sprint (Mar 2026):** New user flow fixed (avatar bug, join-by-code double-join, post-signup routing). Prove It page overhauled (Golf Slate default, AI coach engagement banner, top picks spotlight, PlayerDrawer integration). DraftRecap completely rewritten with cinematic reveal, SG radar charts, team SG power ranking, AI coach commentary, animated counters, interactive draft board. Branded HTML email templates (league invite + vault invite). Silent error capture system built (frontend service + ErrorBoundary + backend AppError model + admin endpoints + churn detection). Dead route redirects. ManagerProfile avatar + rating placeholder. Any-member invite permissions. **Draft-Day Readiness Audit (Mar 3):** Draft grading algorithm fixed (adpDiff was inverted — reaches showed as steals; value baseline raised so Scheffler #1 = A not B). Draft room mobile layout overhauled (board 30%/55% split, compact DraftHeader, compact DraftTimer, MobileNav hidden on draft routes). DraftDashboard tab PlayerDrawer click handlers added (was completely missing — no player clicks worked). All queued as items 072-074. All queued as items 072-074. **Post-Draft Engagement Loop (Batch C, Mar 3):** Designed and queued 7 items (075-081) covering: email↔notification service wiring, weekly tournament recap emails, prediction resolution notifications, live roster player alerts (hot round, leader, eagle, cut danger), draft recap emails, personalized coach briefing upgrade (real data instead of templates), frontend notification preferences UI. Architecture: Resend API for email, existing notificationService gains email channel, new `engagementAlerts.js` service for live push alerts, cron at Sun 11PM ET for weekly recaps. Next: first real draft (Mar 5 Wed), Claude Code executes items 075-081, admin error dashboard, Phase 5 remaining items (manager profile, leaderboards, badges v2). **Phase 5 Batch D (Mar 3 late):** Batch C (075-081) all DONE by Claude Code. Admin error dashboard (082) DONE. Manager profile Phase 5A enhancements — avatar upload, sports badges, recent calls (083) DONE. Queued items 084-089: performance charts + call type breakdown on profile (084), manager leaderboard page with filters/Hot Right Now/sort (085), achievement unlock engine with criteria evaluation + cron + event triggers (086), badge showcase + achievement progress bars on profile (087), nav links for leaderboard + profile quick access (088), verified badge + quick stats bar (089). **Phase 5C Prediction Expansion (Mar 3 late):** Items 090-091 DONE. Golf prediction categories expanded from 1 type (SG benchmark) to 8 types: tournament winner, top 5/10/20, make/miss cut, round 1 leader, H2H matchups, SG performance call reframe. Auto-resolution service (`golfPredictionResolver.js`) with Sun 10:30 PM + Mon 8 AM crons. **Prove It Compact Table Redesign (Mar 3):** Replaced pill-driven slate with horizontal table — all prediction types as columns, 12-15 players visible, one-tap cell cycling, sticky headers. ~194 lines net reduction. **Personal AI Coach Vault (Mar 3):** Per-user coaching memory system — 6 vault document types in PostgreSQL, Memory Writer cron (Wed 4:30 AM), Coach Context Assembly, Coach Settings page, 7 new API routes, 2 new Prisma models.

### Phase 1: Core Platform — COMPLETE
Auth (JWT), league CRUD, commissioner tools, invite codes, snake+auction drafts (Socket.IO), roster management (add/drop/FAAB/rolling waivers), live scoring (DataGolf, 12 sync functions, 7 crons), H2H matchups, trading (veto voting, draft dollars), notifications (Socket.IO + web push), in-league chat, standings (H2H/Roto/Survivor/OAD/Segment), playoffs (bracket, seeding, auto-advance, history), IR slots, season recap & awards, security hardening (rate-limit + input validation), analytics foundation (Sport/Season/FantasyWeek/ScoringSystem models, 32 achievements), keeper leagues (no-cost/round penalty/auction/escalator), divisions, mobile responsive.
- [ ] PWA configuration — low priority, nice-to-have

### Phase 2: Engagement & Stickiness — COMPLETE
Event tracking (42+ events, console logging, PostHog-ready). Prediction engine (4 types, deadline enforcement, Sunday 10:15 PM auto-resolution, tier system rookie→elite, badges, leaderboard). "Prove It" hub (4 sections: slate, track record, leaderboards, analysts). Contextual prediction components (PlayerBenchmarkCard, EventPredictionSlate, PredictionWidget). Progressive rollout strategy with feature flags. See **PREDICTION SYSTEM — DESIGN RULES** section below for non-negotiable language rules.

### Phase 3: League Vault & Migration — COMPLETE
5 import platforms (Sleeper, ESPN, Yahoo, Fantrax, MFL). League Vault v1 (timeline + records). Player matching service. League history schema. League Vault V2 (owner assignment wizard, cinematic reveal, dual-mode display, public landing, sharing, settings auto-detection). Commissioner blog system (TipTap rich text, cover images via Cloudinary, emoji reactions, comments, view tracking).

### Phase 4: Data Architecture & Proprietary Metrics — COMPLETE (4E partially complete)
4-layer database architecture (RawProviderData → canonical → ClutchScore → display). Rosetta Stone player/event ID mapping. ETL pipeline (DataGolf → canonical, raw data cleanup cron). Proprietary metrics: CPI (-3.0 to +3.0), Form Score (0-100), Pressure Score (-2.0 to +2.0), Course Fit (0-100). Transformation rules: never display raw provider numbers, always blend multiple inputs, always add Clutch branding, log formula version.
- [x] **4E: ESPN Historical Backfill (2018-2026)** — ESPN free API used to backfill 9 years of tournament results (~338 tournaments, ~41,986 performances, 1,670 players with career stats, 2,510 ESPN ID mappings). Service: `backend/src/services/historicalBackfill.js`. Runner scripts: `backend/scripts/backfill-2026.js`, `backend/scripts/backfill-2018-2022.js`. Limitation: ESPN provides positions/scores/round-by-round only — no Strokes Gained, earnings, or FedEx points.
- [x] **4E: DataGolf Historical SG Backfill (2018-2026)** — Fills `sgTotal`, `sgPutting`, `sgApproach`, `sgOffTee`, `sgAroundGreen`, `sgTeeToGreen` on Performance + RoundScore records. ~274 tournaments with SG data, 25,085 performances updated, 77,142 rounds upserted. Service: `backend/src/services/datagolfHistoricalSync.js`. Bulk raw SQL INSERT ON CONFLICT for speed (~12 min total). Runner: `backend/scripts/backfill-datagolf-sg.js` (resumable, skips existing).
- [x] **4E: ESPN player bios/headshots + hole-by-hole scores** — `backend/src/services/espnSync.js`
- [ ] **4E (remaining): PGA Tour scraper, OWGR rankings sync** — OWGR sync service exists (`owgrSync.js`) but needs validation. Evaluate SlashGolf API and SportsDataIO.

### Phase 5: Manager Analytics & Clutch Rating — IN PROGRESS

> **Rating architecture:** `docs/clutch-rating-system-architecture.md`

- [ ] **5A: Enhanced Manager Profile Page**
  - Redesigned header: avatar upload, display name, verified badge, tagline/bio, social links
  - Overall Clutch Rating (0-100, prominent display)
  - Quick stats bar, active sports badges, performance call type breakdown
  - Sport-by-sport breakdown, recent calls feed, performance charts, manager comparison

- [x] **5B: Clutch Rating V2 System** (COMPLETE — migration 43)
  - 7 components: Win Rate (20%), Draft IQ (18%), Roster Mgmt (18%), Predictions (15%), Trade Acumen (12%, placeholder), Championships (10%), Consistency (7%)
  - Confidence curve: `confidence ^ 0.6` (1 season=25%, 3=55%, 5=75%, 12+=98%)
  - Tiers: ELITE (90+), VETERAN (80+), COMPETITOR (70+), CONTENDER (60+), DEVELOPING (50+), ROOKIE (40+), UNRANKED (<40)
  - Backend: `clutchRatingService.js` (833 lines). Frontend: `useClutchRating.js`, `DashboardRatingWidget.jsx`, vault components
  - Migration 43 deployed to Railway

- [x] **5C: Enhanced Prediction Categories** — COMPLETE (090-091). Golf expansion: 8 types (tournament winner, top 5/10/20, make/miss cut, round 1 leader, H2H matchups, SG performance call). Auto-resolution service with Sun 10:30 PM + Mon 8 AM crons. **Prove It Compact Table Redesign (Mar 2026):** Replaced category-pill-driven slate with horizontal table showing all prediction types as columns simultaneously. 12-15 players visible without scrolling (was ~5). One-tap cell submission with tap cycling (empty → positive → negative → clear). New components: `PredictionCell.jsx`, `CompactSlateTable.jsx`. Sticky header + sticky player column for mobile horizontal scroll. R1 Leader as compact grid below table, H2H always visible. Winner + R1 Leader enforced as single-pick. ~194 lines net reduction in `ProveIt.jsx`. NFL categories deferred.
- [x] **5D: Enhanced Leaderboard** — COMPLETE (085). Manager leaderboard page with filters (sport/type/time/min calls), "Hot Right Now", "Most Consistent", sort options.
- [x] **5E: Badge & Achievement System v2** — COMPLETE (086-087). Achievement unlock engine with criteria evaluation + cron + event triggers. Badge showcase + achievement progress bars on profile.
- [ ] **5F: Consensus Engine** — Aggregate top managers' calls weighted by Clutch Rating, track consensus accuracy

---

### Phase 6: AI Engine (Decision Intelligence) — COMPLETE

> **Master spec:** `docs/CLUTCH_AI_ENGINE_SPEC.md`
> **Philosophy:** Decision Loop (THINK → RESEARCH → DECIDE → RECORD → EXECUTE → AUDIT → IMPROVE). Three AI Modes: Ambient (free), Contextual (premium), Deep (premium).

All sub-phases complete (6A-6F): Data gap fixes (6 migrations, 27-32), decision graph + pattern engine, Claude API infrastructure, ambient insights (daily cron, 11 types), contextual nudges (draft room, board editor, prediction calibration), deep reports (pre-draft/mid-season/post-season), scout reports (golf + NFL), Clutch Sim matchup simulator, player AI briefs. Admin controls: kill switch, 7 feature toggles, daily token budget, spend tracking. User preferences: 4 AI coaching toggles. Data confidence gating. Personal AI Coach Vault (Mar 2026): per-user coaching memory with 6 document types, Memory Writer cron, context assembly, coach settings page.

#### AI Coach as Main Character (Feb 2026) — COMPLETE

Platform reframe: AI coach is the main character, visible on every surface (Dashboard, League Home, onboarding). Key components:

- **NeuralCluster** (`components/common/NeuralCluster.jsx`): Animated SVG brain visual — 8 nodes + connecting lines drifting with sine/cosine waves. Props: `size` (sm/md/lg), `intensity` (calm/active/thinking). Platform's visual signature.
- **Coach Briefing** (`GET /api/ai/coach-briefing`): Template-based, zero AI calls. Returns personalized headline/body/CTA based on user state (cold start, activation, live event, draft prep, active insight). Optional `?leagueId` for league-specific context. Frontend: `CoachBriefing.jsx` renders at top of Dashboard.
- **Onboarding rewrite**: 5-step feature slideshow replaced with 2-step coach introduction — "Meet Your Coach" (NeuralCluster hero + sport selection pills) then "Quick Profile" (3 tap-to-answer questions stored in `clutch-coach-profile` localStorage via `useCoachProfile` hook).
- **Quick Actions**: Contextual 4-button grid — users with leagues get Create League / The Lab / Prove It / Ask Coach; new users get Create / Join / Golf Hub / NFL Hub.
- **Coaching Corner upgrade**: NeuralCluster animation, "Your coach has been watching..." prefix on insights, engaging empty state with clickable prompt chips.
- **League Home coach line**: Compact italic `font-editorial` briefing below league header with NeuralCluster sm accent.

#### Tournament Intelligence & Scouting (Feb 2026) — COMPLETE

Tournament field analysis and player scouting features for upcoming events:

- **Clutch Power Rank**: Composite ranking for each tournament field. Formula: Form (35%) + CPI (25%) + Course Fit (25%) + OWGR (15%). Each normalized to 0-100. Stable rank regardless of sort column. Top 5 highlighted gold.
- **Field Analysis Table** (`TournamentPreview.jsx`): Sortable columns for CPI, Form, Fit, History, OWGR with hover tooltips. CPI column has mini sliding-scale bars with zero-line. 5-tier color gradients for CPI/Form/Fit.
- **Tournament-Aware Scouting Drawer**: `PlayerDrawer.jsx` accepts optional `tournamentContext` prop. When present, shows "This Week" tab with: Clutch metrics strip (CPI/Form/Fit/OWGR), SG vs Course DNA visual (player strength bars vs course demand with zero-line), course history card, recent results with avg finish. Hides empty/zero sections.
- **Players Table** (`PlayerTable.jsx`): Left-aligned Player column, SG column headers with hover tooltips explaining each metric.
- **Historical Backfill**: ESPN-powered backfill of 2018-2026 (~338 tournaments, ~41,986 performances). Career stats recalculated for 1,670 players. DataGolf SG backfill: 25,085 performances + 77,142 rounds with Strokes Gained data.

#### Board Editor Compare Mode (Feb 2026) — COMPLETE

Compare 2-5 players side by side from the draft board editor with SG radar chart overlay.

- **Compare Mode**: Toggle via pill button next to tag filters. Checkbox rows, gold tint on selected, banner with count + "Compare Now" button.
- **SgRadarChart** (`components/players/SgRadarChart.jsx`): Custom SVG radar/spider chart — 5 axes (Off the Tee, Approach, Around Green, Putting, Total), concentric pentagon rings, colored polygon overlays per player. No external library.
- **PlayerComparison** (`components/players/PlayerComparison.jsx`): Radar chart at top, player header cards with headshots + OWGR + CPI, stat bars for each category, categories-won summary with player-specific colors.
- **usePlayerComparison hook**: Supports flat fields (`p.sgTotal`) and nested (`p.stats?.sgTotal`), max 5 players, skips zero-data stats.
- **BoardEntryRow**: `compareMode`/`isCompareSelected`/`onToggleCompare` props — checkbox before drag handle, click override.

#### SG Intelligence & Player Insights (Feb 2026) — COMPLETE

Strokes Gained analytics surfaced across player pages, drawers, and tools:

- **SG Radar Chart on PlayerDrawer**: DNA radar chart in overview tab showing player's SG profile. Compare links to board editor and standalone Compare page.
- **SG Trend Visualization**: Time-series chart showing SG metrics over recent tournaments. Expand/collapse toggle. Positioned next to DNA radar on player profile.
- **Per-Season Stats**: `?year=` param on `GET /api/players/:id`, year dropdown in PlayerHeader + PlayerDrawer for season-filtered stats.
- **QuickInsights**: Contextual SG insights surfaced alongside player data.

#### Golf Hub, Season Race & Compare Page (Feb 2026) — COMPLETE

- **Golf Hub Enhancements**: Hub page upgraded with Tournament Recap section, richer upcoming schedule cards with course images.
- **Season Race Page**: Zoomed-out season view with rankings, SG data, and stats. Accessible from Golf Hub.
- **Standalone Compare Page**: Compare players outside the board editor context. Linked from PlayerDrawer and Golf Hub.

#### Live Scoring Pipeline & Scoring Page Redesign (Feb 2026) — COMPLETE

- **Live Fantasy Points Pipeline**: Aggregates ESPN hole-by-hole scores into Performance + RoundScore records for real-time fantasy scoring.
- **Scoring Page Redesign**: Transformed into live tournament experience with leaderboard + fantasy sidebar. Rich banner, "Next Up" card, player click routing.

#### Board Editor Overhaul (Feb 2026) — COMPLETE

- **Major UX upgrade**: Clickable player names (open drawer), persistent reason chips, auction value column, SG stat columns, sortable columns with tooltip headers, insights panel with CPI descriptions.
- **Smart Position Picker**: Intelligent position selection when adding players to board.
- **Lab-to-Draft Flow**: Print CSS for board export, board bridge to draft room, divider UX, remove confirmation.
- **Draft Board ↔ League Link**: Migration 46 (`draft_board_league_link`), migration 47 (`draft_board_auction_value`).

#### Draft Room Stats (Feb 2026) — COMPLETE

- Current season stats displayed instead of career totals.
- Stat tooltips explaining each column.
- Season stats columns added to draft room player lists.

#### iPod Reframe (Feb 2026) — ALL 6 PHASES COMPLETE

Strategic reset of the platform's information architecture. Spec: `docs/CLUTCH_IPOD_SPEC.md`.

- **Phase 1**: Dashboard stripped to league router (595 → 223 lines)
- **Phase 2**: League Home nav pills (15 buttons → compact pills)
- **Phase 3**: Coach briefing templates upgraded with real data (board stats, standings, live events)
- **Phase 4**: Board accessible from league context, waiver wire shows board tags
- **Phase 5**: Decision capture — opinion events for adds/drops/claims
- **Phase 6**: Coach references history — board cross-refs, roster loyalty, recent moves

#### Navigation & League UX (Feb 2026) — COMPLETE

- **Leagues Dropdown**: Top nav dropdown for one-click league access.
- **Nav Dropdown Menus**: Icons, sport-specific accent colors, bold accent entry points for hubs.
- **Vault Promoted**: Moved to top nav pills, always visible.
- **"My Team" Rename**: Roster → My Team, pre-draft team profile with roster skeleton.
- **Team Avatars**: Team avatar/emoji shown in Teams table on League Home.
- **2-Member Leagues**: Allowed in creation form.
- **Invite Code Fix**: Accept full CUID codes, auto-validate from URL.

#### Profile Enhancement (Feb 2026) — COMPLETE

- **Avatar Upload**: Cloudinary-powered `ImageUpload` component, avatar shown in Navbar instead of initial.
- **Username Field**: `@` prefix, client+server validation (3-30 chars, lowercase alphanumeric + hyphens), 409 duplicate detection.
- **Backend Persist**: `AuthContext.updateUser()` calls `PATCH /api/users/me` instead of localStorage-only.

#### Lab Hub & Dashboard Redesign (Feb 2026) — COMPLETE

- **Lab Hub** (`DraftBoards.jsx`): Hero banner with animated visuals + descriptive text. Split layout: boards left (3/5), notes+watchlist right (2/5), leagues below.
- **Dashboard**: League cards in 2-column grid (was full-width stacked). Cards tightened — sport accent border, compact stats, smaller buttons.

#### Personal AI Coach Vault (Mar 2026) — COMPLETE

Per-user coaching memory system — the AI coach remembers each user's tendencies, draft patterns, roster habits, and coaching preferences across sessions.

- **Coaching Memory Architecture**: Structured JSON documents stored in PostgreSQL via 2 new Prisma models: `CoachingMemory` + `CoachingInteraction`. 6 vault document types: `identity`, `draft_patterns`, `roster_patterns`, `predictions`, `coaching_log`, `season_narrative`.
- **Memory Writer**: Cron service (`coachingMemoryWriter.js`) runs Wed 4:30 AM ET — distills Pattern Engine output into vault documents. Analyzes draft history, roster moves, prediction accuracy, and coaching interactions to build persistent per-user coaching context.
- **Coach Context Assembly**: `coachContextAssembly.js` — pulls relevant vault docs per coaching situation (draft prep, roster advice, prediction calibration, general coaching). Assembles context window for AI coach calls.
- **Coach Settings Page**: `/coach/settings` — user preferences (coaching style, verbosity, focus areas), free-text notes to coach, coaching history feed showing past interactions.
- **API Routes**: 7 new routes under `/api/coach/memory` — CRUD for vault documents, interaction logging, context assembly endpoint.
- **Frontend**: `CoachSettings.jsx` page, `useCoachMemory.js` hook, `CoachingHistory.jsx` component.
- **Modified files**: `schema.prisma`, `index.js` (cron registration), `aiCoachService.js`, `aiInsightPipeline.js`, `ai.js` routes, `App.jsx`, `api.js`, `Navbar.jsx`.
- **Migration**: `coaching_memory_vault` (migration 53).

---

### Phase 7: Multi-Sport Expansion

- [ ] **NFL Fantasy Support** (Target: August 2026) — PARTIALLY COMPLETE
  - [x] NFL data pipeline: nflverse sync (players, games, weekly stats, kicking, DST — 2024 season synced)
  - [x] NFL stats display: player browsing, team pages, schedule, compare tool
  - [x] NFL scoring service: Standard/PPR/Half-PPR/custom, all positions, bonuses, kicker/DST tiers
  - [x] NFL league infrastructure: sport-agnostic creation, rosters, trades, waivers, draft room
  - [x] NFL weekly scoring pipeline: `nflFantasyTracker.js`, Tuesday 6:30 AM cron, 30-min status transitions
  - [x] NFL lineup lock: locks at earliest game kickoff in the week
  - [x] NFL frontend sport-awareness: all pages detect NFL and adapt terminology/filters/positions
  - [x] NFL matchups rewrite: currentWeek computed from schedule data on frontend
  - [x] NFL standings fix: stat cards derive from matchup data
  - [x] NFL test league seeder: `seedNflTestLeague.js` (8 teams, 4 weeks scored)
  - [x] NFL gameday UX spec: `docs/nfl-gameday-ux.md` (v1.2)
  - [x] NFL PlayerDrawer enrichment: position-specific stats (QB/RB/WR/TE/K/DST), bio strip, season selector (2019-2024), enriched game log with W/L results
  - [ ] NFL 2025 season data sync (only 2024 synced)
  - [ ] NFL prediction categories (game winner, player performance calls, weekly fantasy rankings)

- [ ] **NBA Fantasy Support** (Target: October 2026)
- [ ] **MLB Fantasy Support** (Target: Spring 2027)

---

### Phase 8: Scale & Monetize

- [ ] **Verified Creator Program** — application flow, admin approval, verified badges, revenue share
- [ ] **Premium Tiers** (Clutch Pro $7.99/mo, Clutch Elite $12.99/mo)
- [ ] **Native Mobile App** (React Native / Expo)
- [ ] **League Entry Fee Processing** (Stripe Connect, 5-10% platform fee)
- [ ] **In-Roster Expert Insights** — per-player consensus + top analyst calls (requires ~50 active predictors)

---

### Import Intelligence Pipeline — COMPLETE

> **Specs:** `docs/CLUTCH_IMPORT_ADDENDUM_SPEC.md`, `docs/PLATFORM_DATA_MAP.md`

All 5 platforms enhanced with raw data preservation, transaction import, opinion timeline bridge, settings snapshots, owner matching. Custom data import (spreadsheet/CSV/Google Sheets/website crawling with AI column mapping). Conversational league intelligence (Claude-powered league Q&A with context builder, session management, LeagueChat drawer component). Yahoo player cache (migration 48): persistent `yahoo_player_cache` table for Yahoo player ID → name resolution. 3-tier lookup: DB cache → Yahoo API → Sleeper fallback. All 53K+ Yahoo draft picks fully resolved.

### Backlog (Low Priority)
- League Vault v3: H2H historical records, transaction log, "On This Day", PDF export
- Trading keeper rights between teams
- **NFL live scoring frequency review**: Current nflSync runs weekly. During game windows need 1-2 min updates. Evaluate nflverse latency, alternative live sources, WebSocket push, caching.
- **Cleanup NFL test data**: `node backend/prisma/seedNflTestLeague.js cleanup` — run before production deploy
- **Draft Owner Name Merge Tool**: Yahoo-imported draft picks use short nicknames ("Tank", "AO", "Mase R", "Spencer H") that don't map to canonical owner names. Need a merge UI (similar to the owner assignment wizard in league import) where commissioners can map Yahoo draft nicknames → canonical owners, then persist the mappings. Final step of data backfill cleanup — cosmetic only, draft intelligence shows extra rows for unmapped names.
- **New Member Welcome Experience**: When a user joins a league via invite link, add a visually engaging "You're In" moment — welcome animation, league info reveal, team name prompt, meet-the-league roster preview. Think mini vault-reveal energy for first-time league entry. Makes joining feel like an event, not just a redirect.

---

## DATABASE SCHEMA

> Full SQL CREATE statements moved to **`docs/SCHEMA_REFERENCE.md`**.
> Authoritative schema: `backend/prisma/schema.prisma` (~2,800 lines, 94+ models, 53 migrations).

---

## EVENT TRACKING SCHEMA

> Full TypeScript event type definitions moved to **`docs/EVENT_TRACKING_SCHEMA.md`**. Implementation: `frontend/src/services/analytics.js` (42+ events, console logging, PostHog-ready swap).

---

## ADMIN DASHBOARD

Route: `/admin` (gated by `role: admin` on user model)

### Built (Phase 1):
1. **Dashboard Overview** — Total users, leagues, active drafts, live tournaments
2. **User Management** — Searchable/paginated user table with role management
3. **League Browser** — Searchable/paginated league table
4. **Tournament Browser** — Searchable/filterable tournament table
5. **AI Engine** — Kill switch, 7 feature toggles, budget input, spend dashboard

### To Build:
6. **Migration Tracker** — Import status, source platform, progress, errors
7. **Prediction Management** — Create/edit slates, resolution queue, manual override
8. **Analyst Management** — Creator applications, feature/unfeature
9. **Financial** — Stripe integration: subscription counts, MRR, churn

---

## THIRD-PARTY TOOLS / REVENUE MODEL / COMPETITIVE INSIGHTS

> Moved to **`docs/BUSINESS_REFERENCE.md`** — tooling checklist, subscription tiers, revenue streams, and 8 competitive pain points Clutch solves.

---

## SILENT ERROR CAPTURE SYSTEM (Mar 2026)

Automatic error tracking — no user-facing UI, fully invisible. Captures API errors, JS crashes, React component failures, and churn signals.

- **Frontend service:** `frontend/src/services/errorCapture.js` — hooks into API errors (via `api.js`), `window.onerror`, unhandled promise rejections, `beforeunload` (churn detection). Batches errors, flushes every 30s or on page unload. Initialized in `App.jsx` via `initErrorCapture()`.
- **ErrorBoundary:** `frontend/src/components/common/ErrorBoundary.jsx` — React error boundary, reports to `reportComponentError()`, graceful "Something went wrong" fallback with retry.
- **Backend:** `AppError` model (migration 49), `backend/src/routes/errors.js` — `POST /batch` (receives error batches, no auth required), `GET /summary` (admin: 24h/7d stats, top failing endpoints, affected users), `GET /recent` (admin: paginated error list with filters), `PATCH /:id/resolve`, `POST /resolve-bulk`.
- **Churn signal:** If user leaves within 60s of hitting an error, captured as high-severity `churn_signal` event.
- **Cleanup cron:** Daily 3 AM — deletes resolved errors older than 30 days.

**Future:** Admin dashboard panel to visualize errors. AI triage layer to auto-categorize and deduplicate. Auto-draft queue items from high-frequency errors.

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
- **Middle circle (enhancement):** Prediction accuracy tracking, community consensus indicators, analyst insights. Enhances the inner circle without disrupting it.
- **Outer circle (growth):** Analyst profiles, public leaderboards, creator partnerships. Attracts new users but never clutters the core league experience.

---

## IMPORTANT ARCHITECTURAL DECISIONS

1. **Sport-agnostic league infrastructure.** League shell (invites, chat, trades, waivers, standings) is identical regardless of sport. Only player DB, scoring rules, and schedule integration are sport-specific modules.
2. **Event tracking from day one.** Every feature should include analytics.track() calls as it's built.
3. **Prediction system is a feature, not a product.** It enhances the league experience. It does not compete with it for attention.
4. **Web-first as PWA.** Validate product-market fit on web before investing in native mobile apps.
5. **Commissioner-centric design.** Every feature should ask: "Does this make the commissioner's life easier?"
6. **No parallel Claude Code instances on foundational work.** One instance, one source of truth for schema, auth, and shared infrastructure.

---

## DESIGN SYSTEM: CLUTCH BRAND (Light-First + Dark Mode)

> **Brand spec:** See `ClutchBrandSpec.docx` for full brand direction. Legacy spec in `CLUTCH_BRAND_SYSTEM.md`.
> **Wave 1 (foundation) deployed.** ThemeContext, dual-mode CSS variables, new fonts, Tailwind brand colors.

**Brand direction:** Light-first (Clutch is the only fantasy platform defaulting to light mode). Dark mode via user toggle. Warm, premium, editorial feel.

**Theme system:**
- `ThemeContext.jsx` — `useTheme()` hook, `toggleTheme()`, localStorage key `clutch-theme`, manages `class="dark"` on `<html>`
- Light default: cream `#FAFAF6` background, dark text
- Dark mode: deep navy `#0E1015` background, AuroraBackground re-enabled
- CSS variables in `index.css`: `:root` (light) + `.dark` (dark) with legacy mappings
- Tailwind: `darkMode: 'class'` enabled, `dark:` prefix works

**Key color tokens (CSS vars + Tailwind):**
| Token | Light | Dark | Tailwind |
|-------|-------|------|----------|
| `--bg` | `#FAFAF6` | `#0E1015` | `bg-[var(--bg)]` |
| `--surface` | `#FFFFFF` | `#1A1D26` | — |
| `--text-1` | `#1A1A1A` | `#EEEAE2` | — |
| Blaze (primary) | `#F06820` | same | `blaze`, `blaze-hot`, `blaze-deep` |
| Slate (nav/headers) | `#1E2A3A` | same | `slate`, `slate-mid`, `slate-light` |
| Field (success) | `#0D9668` | same | `field`, `field-bright` |
| Crown (premium) | `#D4930D` | same | `crown`, `crown-bright` |
| Live red | `#E83838` | same | `live-red` |

**Typography:**
| Role | Font | Tailwind | Rule |
|------|------|----------|------|
| Display | Bricolage Grotesque 700-800 | `font-display` | Headlines, titles, wordmark, primary CTAs |
| Body | DM Sans 400-700 | `font-body` | Everything people read |
| Data | JetBrains Mono 400-700 | `font-mono` | Scores, stats, badges, tags, numbers |
| Editorial | Instrument Serif 400i | `font-editorial` | Pull quotes, accent text (always italic) |

**Legacy Aurora Ember tokens:** Still present in Tailwind (`dark-primary`, `gold`, `surface`, etc.) and CSS vars. These map to new-brand equivalents so existing components don't break. Being removed page-by-page during migration waves.

**Logo:** "The Spark" — lightning bolt in a gold-gradient rounded square. SVG component at `src/components/ui/ClutchLogo.tsx`.

---

## PROJECT STRUCTURE

```
/Users/EricSaylor/Desktop/Golf/
├── CLAUDE.md                    ← THIS FILE
├── PROJECT_STATUS.md            ← Current status report
├── CLUTCH_BRAND_SYSTEM.md       ← Brand system spec
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        ← Database schema (~2,800 lines, 91+ models)
│   │   ├── migrations/          ← 44 migrations (most applied)
│   │   ├── seed*.js             ← Seed scripts (stats, players, achievements, NFL test)
│   │   └── nfl-test-manifest.json
│   └── src/
│       ├── index.js             ← Express app + cron jobs + Socket.IO
│       ├── lib/prisma.js        ← Shared Prisma singleton (20 connections, 30s timeout)
│       ├── middleware/           ← auth.js, requireAdmin.js
│       ├── routes/              ← 35+ route files
│       └── services/            ← 25+ service files
├── frontend/
│   ├── src/
│   │   ├── App.jsx              ← Routes + layout (60+ routes)
│   │   ├── components/          ← common/, layout/, draft/, nfl/, feed/, workspace/, vault/, dashboard/, league/
│   │   ├── pages/               ← Route pages
│   │   ├── hooks/               ← Custom hooks
│   │   ├── utils/               ← commonNames.js, uploadImage.js
│   │   ├── context/             ← AuthContext, ThemeContext
│   │   └── services/            ← api.js, socket.js, analytics.js, webPush.js
│   └── public/service-worker.js
└── docs/                        ← Spec documents (version-controlled)
```

---

## Strategic Architecture Update (Feb 2026)

> Full doc: `/docs/CLUTCH_STRATEGY_UPDATE_FEB2026.md`

### Three Pillars + Foundation
- **FEED**: Personalized data stream (why users open the app daily)
- **THE LAB** (formerly Workspace): Interactive tools — draft boards, rankings, notes, watch list, decision journal. Routes: `/lab`, `/lab/:boardId`, `/lab/watch-list`, `/lab/journal`.
- **PROVE IT**: Prediction tracking and reputation (why users come back)
- **DATA LAYER** (foundation): Player pages, team pages, stat leaderboards, historical data

### Six User Personas
Every feature should answer: "Which persona is this for?" When in doubt, optimize for The Informed Fan.

| # | Persona | Description | Peak Engagement |
|---|---------|-------------|-----------------|
| 1 | **The Informed Fan** (primary) | 1-2 leagues, wants start/sit help, bragging rights | In-season, draft prep |
| 2 | **The Grinder** | 3-5+ leagues, advanced stats, raw data tools | Year-round, daily in-season |
| 3 | **The Content Creator** | Podcast/YouTube following, wants verified track record | Year-round |
| 4 | **The Bettor** | Player props, value analysis, accuracy tracking | In-season (Wed-Sun) |
| 5 | **The Dynasty Nerd** (off-season driver) | 3-year windows, keeper/dynasty. **OFFSEASON IS PEAK (Feb-May).** | Year-round, peaks Feb-May |
| 6 | **The Sports Debater** | Bold predictions, shareable receipts, proving others wrong | Around results |

### Sport-Specific Clutch Rating System

**Sport Rating (per sport, 0-100):** Accuracy (40%), Consistency (25%), Volume (20%), Breadth (15%). Tiers: Expert (90+), Sharp (80-89), Proven (70-79), Contender (60-69), Rising (<60). Min 30 graded calls to qualify. Daily recalc with 90-day recency.

**Global Clutch Rating (prestige):** Weighted average of sport ratings + multi-sport breadth bonus. Requires 2+ qualified sports. Circular gauge, color-coded, trend arrow.

### Key Principles
- **Progressive Disclosure:** Default UX is simple (Informed Fan). Depth is one click away (Grinder, Dynasty Nerd).
- **Seasonal Flywheel:** Feed auto-adjusts by sports calendar. Golf fills NFL gaps (Feb-May). No dead months.

### Current Build Priority
Data Layer 1-7 done → Lab Phases 1-5 done → Phase 6 AI done → Import Intelligence done → Vault V2 done → Rating V2 done → Blog done → AI Coach reframe done → Tournament Intelligence done → ESPN Historical Backfill (2018-2026) done → DataGolf SG Backfill done → SG Intelligence done → Golf Hub + Season Race + Compare done → Live Scoring Pipeline done → Scoring Page Redesign done → Board Editor Overhaul done → iPod Reframe (6 phases) done → Profile Enhancement done → Nav + League UX done → Clutch Loop audit (19 fixes deployed) → Friend Testing Sprint (new user flow, DraftRecap overhaul, Prove It engagement, branded emails, error capture) done → Phase 5C Prediction Expansion + Compact Table done → Personal AI Coach Vault done → **Next: First real draft (Mar 5 Wed), Phase 5 remaining (leaderboards 085, badges v2 086-087, profile charts 084, nav links 088, verified badge 089), NFL 2025 data sync**

**Backlog:** NFL team pages need polish. NFL 2025 data not synced. NFL game weather pipeline needed (Open-Meteo, venue coordinates, dome/roof flags). Vault Playoff History (brackets, championship history, consolation, playoff intelligence — data confirmed in DB).

---

## WORKSPACE DATA SOURCES (Free APIs for "Start From" Boards)

> **Full plan:** `docs/workspace-master-plan.md`

| Data Need | Source | Notes |
|-----------|--------|-------|
| NFL Projections | Sleeper API | Free, no auth. Cache daily. |
| NFL ADP | Fantasy Football Calculator API | Free, commercial OK with attribution. |
| NFL Trade Values | FantasyCalc API | Free public endpoint. |
| NFL Historical Stats | nflverse | Open source, already synced. |
| NFL Expected Fantasy Pts | ffopportunity (nflverse) | Pre-computed XGBoost outputs. |
| NFL Trending Players | Sleeper API | Free trending endpoint. |
| Golf Projections + Rankings | DataGolf API | Existing subscription, already integrated. |
| Expert Consensus (future) | FantasyPros Partners HQ | Paid license. |

**"Clutch Rankings" formula:** NFL: 60% Sleeper projected pts + 40% FFC ADP (blended, branded as Clutch's own). Golf: DataGolf skill estimates weighted by CPI + Form Score. **Never expose raw provider names to users.**

---

## REFERENCE DOCS (in repo)

| Doc | What It Contains |
|-----|-----------------|
| `docs/SCHEMA_REFERENCE.md` | **Full SQL schemas** for all tables (moved from this file) |
| `docs/EVENT_TRACKING_SCHEMA.md` | **Analytics event TypeScript types** (moved from this file) |
| `docs/BUSINESS_REFERENCE.md` | **Revenue model, tooling checklist, competitive insights** (moved from this file) |
| `docs/CLUTCH_STRATEGY_UPDATE_FEB2026.md` | Feed + Lab architecture, personas, seasonal flywheel, build priorities |
| `docs/CLUTCH_AI_ENGINE_SPEC.md` | AI Engine master spec (Modes 1-3, Scout, Sim) |
| `docs/clutch-rating-system-architecture.md` | Clutch Rating V2 design (7 components, confidence curves, tiers) |
| `docs/clutch-rating-implementation-brief.md` | Rating V2 implementation guide |
| `docs/phase-2-vault-and-sharing.md` | League Vault V2 spec (reveal, dual-mode, sharing) |
| `docs/CLUTCH_IMPORT_ADDENDUM_SPEC.md` | Import intelligence spec (max data capture, custom import, league Q&A) |
| `docs/PLATFORM_DATA_MAP.md` | Per-platform data audit (what each provides vs captures) |
| `docs/nfl-expansion.md` | NFL expansion plan (vision, data, schema, phases) |
| `docs/nfl-gameday-ux.md` | NFL gameday UX spec (v1.2, wireframes, reward engine) |
| `docs/workspace-master-plan.md` | Lab master plan (competitive research, data strategy, full feature spec) |
| `docs/entry-points-addendum.md` | Participation tiers, drag-and-drop rankings, reason chips |
| `docs/data-strategy.md` | Data ownership framework, 4-layer architecture, provider design |
| `docs/build-specs.md` | Manager stats spec, AI engines spec, database architecture |
| `docs/brand-system.md` | Aurora Ember brand system (legacy, being replaced) |

---

*Last updated: March 3, 2026 (Personal AI Coach Vault + Prove It Compact Table built)*
*Phases 1-4 complete (4E partially done). Phase 5B (Clutch Rating V2) complete. Phase 5C complete (prediction expansion + compact table redesign). Phase 6 complete (AI Engine + Coach reframe + Personal AI Coach Vault). Import Intelligence Pipeline complete. League Vault V2 complete. Commissioner blog complete. Brand System Wave 1 deployed. Tournament Intelligence & SG Intelligence complete. ESPN historical backfill (2018-2026) complete. DataGolf SG backfill complete. Golf Hub + Season Race + Compare page live. Live scoring pipeline + scoring page redesign live. Board editor overhauled + compare mode. iPod Reframe (6 phases) complete. Profile enhancement complete. Nav + League UX improvements live. Friend Testing Sprint complete. Batch C (engagement loop, 075-081) all DONE. Batch D (084-089) queued: profile charts, leaderboard page, achievement engine, badge showcase, nav links, verified badge. Phase 5C (090-091) DONE. Admin error dashboard (082) DONE. Manager profile Phase 5A (083) DONE. 606+ commits. 94+ database models. 177+ API endpoints. 71+ frontend pages. 38 cron jobs. 69 backend services. 53 migrations. 2 sports live.*

**All migrations (1-53) deployed to Railway.**

**Infrastructure fix (Feb 2026):** All backend route files now import from `src/lib/prisma.js` singleton instead of creating individual PrismaClient instances. Pool: 20 connections, 30s timeout.

---

## OBSIDIAN VAULT (Extended Documentation)

> **Location:** `~/Documents/obsidian-dev-vault/01_Projects/ClutchFantasySports/`

The Obsidian vault holds deeper reference documentation that extends this file. CLAUDE.md is the compact dev guide; the vault has full specs, architecture details, and session continuity docs.

### Vault Structure

| Folder | Contents |
|--------|----------|
| `architecture/` | `tech-stack.md`, `database-schema.md`, `api-catalog.md`, `data-pipeline.md`, `real-time.md` |
| `specs/` | `project-overview.md`, `ai-engine.md`, `prediction-system.md`, `clutch-rating.md`, `scoring-systems.md`, `draft-system.md`, `league-vault.md` |
| `context/` | `current-status.md`, `session-log.md`, `decisions-log.md` |
| `research/` | `competitive-landscape.md`, `data-sources.md` |
| `tasks/` | `backlog.md` |

### Session End Protocol

**At the end of each development session, update the Obsidian vault:**

1. **`context/session-log.md`** — Add entry: what was built, decisions made, what's next
2. **`context/current-status.md`** — Update phase status, migration count, any new cron jobs
3. **`tasks/backlog.md`** — Check off completed items, add any new discovered work
4. **`context/decisions-log.md`** — Log any new architectural decisions made during the session

**When a feature spec changes significantly, also update the relevant `specs/` or `architecture/` file.**

This keeps the vault in sync so the next session (even with a fresh context window) can quickly understand where things stand.
