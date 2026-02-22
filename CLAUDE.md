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
| Data Feeds | DataGolf API (golf), nflverse (NFL) |
| File Storage | Cloudinary (images) |

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

### Current Status: PHASE 5 — IN PROGRESS
> Phases 1-4 complete (4E deferred). Phase 5B (Clutch Rating V2) built. Phase 6 (AI Engine) complete. League Vault V2 (owner assignment, reveal, sharing) built. Commissioner blog system built. Prisma singleton + connection pooling deployed. Next: finish Phase 5 remaining items, deploy migrations 43-44 to Railway.

### Phase 1: Core Platform — COMPLETE
Auth (JWT), league CRUD, commissioner tools, invite codes, snake+auction drafts (Socket.IO), roster management (add/drop/FAAB/rolling waivers), live scoring (DataGolf, 12 sync functions, 7 crons), H2H matchups, trading (veto voting, draft dollars), notifications (Socket.IO + web push), in-league chat, standings (H2H/Roto/Survivor/OAD/Segment), playoffs (bracket, seeding, auto-advance, history), IR slots, season recap & awards, security hardening (rate-limit + input validation), analytics foundation (Sport/Season/FantasyWeek/ScoringSystem models, 32 achievements), keeper leagues (no-cost/round penalty/auction/escalator), divisions, mobile responsive.
- [ ] PWA configuration — low priority, nice-to-have

### Phase 2: Engagement & Stickiness — COMPLETE
Event tracking (42+ events, console logging, PostHog-ready). Prediction engine (4 types, deadline enforcement, Sunday 10:15 PM auto-resolution, tier system rookie→elite, badges, leaderboard). "Prove It" hub (4 sections: slate, track record, leaderboards, analysts). Contextual prediction components (PlayerBenchmarkCard, EventPredictionSlate, PredictionWidget). Progressive rollout strategy with feature flags. See **PREDICTION SYSTEM — DESIGN RULES** section below for non-negotiable language rules.

### Phase 3: League Vault & Migration — COMPLETE
5 import platforms (Sleeper, ESPN, Yahoo, Fantrax, MFL). League Vault v1 (timeline + records). Player matching service. League history schema. League Vault V2 (owner assignment wizard, cinematic reveal, dual-mode display, public landing, sharing, settings auto-detection). Commissioner blog system (TipTap rich text, cover images via Cloudinary, emoji reactions, comments, view tracking). **Migrations 43-44 NOT YET DEPLOYED TO RAILWAY.**

### Phase 4: Data Architecture & Proprietary Metrics — COMPLETE (4E deferred)
4-layer database architecture (RawProviderData → canonical → ClutchScore → display). Rosetta Stone player/event ID mapping. ETL pipeline (DataGolf → canonical, raw data cleanup cron). Proprietary metrics: CPI (-3.0 to +3.0), Form Score (0-100), Pressure Score (-2.0 to +2.0), Course Fit (0-100). Transformation rules: never display raw provider numbers, always blend multiple inputs, always add Clutch branding, log formula version.
- [ ] **4E: Tier 1 Public Data Sources** — PGA Tour scraper, ESPN Golf endpoints, OWGR rankings. Evaluate SlashGolf API and SportsDataIO.

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
  - **MIGRATION 43 NOT YET DEPLOYED TO RAILWAY**

- [ ] **5C: Enhanced Prediction Categories** — Expand per sport (golf: winner, top 5/10/20, cut, H2H; NFL: game winner, player calls, weekly rankings)
- [ ] **5D: Enhanced Leaderboard** — Filters (sport/type/time/min calls), "Hot Right Now", "Most Consistent", auto-awards
- [ ] **5E: Badge & Achievement System v2** — Performance/milestone/consistency/sport-specific badges, social card generation
- [ ] **5F: Consensus Engine** — Aggregate top managers' calls weighted by Clutch Rating, track consensus accuracy

---

### Phase 6: AI Engine (Decision Intelligence) — COMPLETE

> **Master spec:** `docs/CLUTCH_AI_ENGINE_SPEC.md`
> **Philosophy:** Decision Loop (THINK → RESEARCH → DECIDE → RECORD → EXECUTE → AUDIT → IMPROVE). Three AI Modes: Ambient (free), Contextual (premium), Deep (premium).

All sub-phases complete (6A-6F): Data gap fixes (6 migrations, 27-32), decision graph + pattern engine, Claude API infrastructure, ambient insights (daily cron, 11 types), contextual nudges (draft room, board editor, prediction calibration), deep reports (pre-draft/mid-season/post-season), scout reports (golf + NFL), Clutch Sim matchup simulator, player AI briefs. Admin controls: kill switch, 7 feature toggles, daily token budget, spend tracking. User preferences: 4 AI coaching toggles. Data confidence gating.

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

All 5 platforms enhanced with raw data preservation, transaction import, opinion timeline bridge, settings snapshots, owner matching. Custom data import (spreadsheet/CSV/Google Sheets/website crawling with AI column mapping). Conversational league intelligence (Claude-powered league Q&A with context builder, session management, LeagueChat drawer component).

### Backlog (Low Priority)
- League Vault v3: H2H historical records, transaction log, "On This Day", PDF export
- Trading keeper rights between teams
- **NFL live scoring frequency review**: Current nflSync runs weekly. During game windows need 1-2 min updates. Evaluate nflverse latency, alternative live sources, WebSocket push, caching.
- **Cleanup NFL test data**: `node backend/prisma/seedNflTestLeague.js cleanup` — run before production deploy

---

## DATABASE SCHEMA

> Full SQL CREATE statements moved to **`docs/SCHEMA_REFERENCE.md`**.
> Authoritative schema: `backend/prisma/schema.prisma` (~2,800 lines, 91+ models, 44 migrations).

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
Data Layer 1-7 done → Lab Phases 1-5 done → Phase 6 AI done → Import Intelligence done → Vault V2 done → Rating V2 done → Blog done → **Next: Deploy migrations 43-44, finish Phase 5 (manager profile, leaderboards, badges v2), Phase 4E public data sources**

**Backlog:** NFL team pages need polish. Kicker/DST stats missing. NFL 2025 data not synced. NFL game weather pipeline needed (Open-Meteo, venue coordinates, dome/roof flags).

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

*Last updated: February 22, 2026*
*Phases 1-4 complete (4E deferred). Phase 5B (Clutch Rating V2) complete. Phase 6 complete (AI Engine). Import Intelligence Pipeline complete. League Vault V2 complete. Commissioner blog complete. Brand System Wave 1 deployed. 330+ commits. 91+ database models. 160+ API endpoints. 65+ frontend pages. 34 cron jobs. 27+ backend services. 44 migrations. 2 sports live.*

**Pending deployment:** Migrations 43 (Clutch Rating V2) and 44 (League Posts blog upgrade) need `prisma migrate deploy` on Railway.

**Infrastructure fix (Feb 2026):** All backend route files now import from `src/lib/prisma.js` singleton instead of creating individual PrismaClient instances. Pool: 20 connections, 30s timeout.
