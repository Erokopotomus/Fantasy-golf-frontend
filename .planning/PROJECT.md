# Clutch Fantasy Sports

## What This Is

A season-long fantasy sports platform — golf-first, multi-sport by design. Combines Fantrax's deep customization with Sleeper's clean UX, plus AI-powered coaching, verified prediction tracking, league history preservation, and a creator ecosystem built on provable accuracy. No DFS, no gambling noise.

## Core Value

The platform that makes running a fantasy league with your friends feel effortless and fun — with AI coaching that actually helps you win.

## Requirements

### Validated

- ✓ Auth (JWT), league CRUD, commissioner tools, invite codes — Phase 1
- ✓ Snake + auction drafts with Socket.IO live updates — Phase 1
- ✓ Roster management (add/drop/FAAB/rolling waivers) — Phase 1
- ✓ Live scoring (DataGolf API, ESPN, 12 sync functions, 7 crons) — Phase 1
- ✓ H2H matchups, trading with veto voting, draft dollars — Phase 1
- ✓ Standings (H2H/Roto/Survivor/OAD/Segment), playoffs — Phase 1
- ✓ Keeper leagues (4 modes), divisions, mobile responsive — Phase 1
- ✓ Prediction engine (4 types, tiers, leaderboard, Prove It hub) — Phase 2
- ✓ Event tracking (42+ events, PostHog-ready) — Phase 2
- ✓ League import (Sleeper, ESPN, Yahoo, Fantrax, MFL) + custom — Phase 3
- ✓ League Vault v1+v2 (timeline, records, owner assignment, cinematic reveal) — Phase 3
- ✓ Commissioner blog (TipTap rich text, reactions, comments) — Phase 3
- ✓ 4-layer data architecture, proprietary metrics (CPI, Form, Pressure, Fit) — Phase 4
- ✓ ESPN + DataGolf historical backfill (2018-2026) — Phase 4E
- ✓ Clutch Rating V2 (7 components, confidence curve, 6 tiers) — Phase 5B
- ✓ AI Engine (Claude API, ambient insights, coaching, deep reports, scout, Sim) — Phase 6
- ✓ AI Coach as main character (NeuralCluster, briefings, onboarding) — Phase 6
- ✓ Tournament intelligence + SG Intelligence (radar charts, field analysis) — Phase 6
- ✓ Board editor overhaul (compare mode, SG columns, auction values, reason chips) — Phase 6F
- ✓ iPod Reframe (6 phases, IA restructure) — complete
- ✓ Profile enhancement (avatar, username, backend persist) — complete
- ✓ Nav + League UX (leagues dropdown, sport icons) — complete
- ✓ NFL data pipeline (2024 season, scoring, league infrastructure, UI pages) — Phase 7 partial
- ✓ Import Intelligence (all 5 platforms + custom + league Q&A) — complete

### Active

- [x] Platform QA & visual testing — V2 audit complete, all P0/P1/P2 fixed, 7 P3s remaining
- [ ] Owner Alias Merge Tool — Yahoo imports create fragmented owner identities ("Tank" vs "Anthony", "AO" vs "aric"). Build commissioner-facing merge wizard (similar to Owner Assignment Wizard) where commissioners map nicknames → canonical owners. On merge: update all `draftData` JSON across HistoricalSeason records, persist alias mappings. Critical for AI/rating accuracy — fragmented identities break Draft Intelligence, Clutch Rating, and coach feedback loops.
- [ ] Draft position auto-backfill — When import pipeline resolves a player name, also look up their position from the canonical Player table and write it into `draftData.picks[].position`. Fix the import services (Yahoo, Sleeper, ESPN) to do this automatically going forward. Write a one-time backfill script for existing historical seasons with missing positions.
- [ ] Remove dead OAuth buttons — Login.jsx and Signup.jsx have disabled Google/GitHub OAuth buttons with "(soon)" labels. Remove GitHub entirely (wrong audience for fantasy sports). Remove Google until actually wired up. DONE in Cowork, needs commit+deploy.
- [ ] Chat FAB mobile fix — `bottom-24` → `bottom-20`, auto-minimize after 4s. DONE in Cowork, needs commit+deploy.
- [ ] Polish live golf experience — tournament weekend battle-test, fix live scoring/tournament view/fantasy scoring pipeline
- [ ] Live golf scoring validation — end-to-end check: DataGolf/ESPN raw data → Performance/RoundScore → fantasyPoints → FantasyScore → WeeklyTeamResult → Matchups. Compare against real PGA Tour results.
- [ ] Manager Profile (Phase 5A) — social identity page with Clutch Rating display, stats, sport breakdown
- [ ] NFL player database, player cards, and drawers — continuing from other laptop work
- [ ] NFL 2025 data sync — check nflverse for 2025 CSVs periodically (dynasty/keeper managers peak Feb-May)
- [ ] Enhanced Leaderboard (5D) — filters, "Hot Right Now", "Most Consistent", auto-awards
- [ ] OWGR sync validation — low effort, improves Power Rank accuracy
- [ ] First-time user experience audit — fresh walkthrough as new user, check for overwhelm

### Out of Scope

- DFS / daily fantasy — season-long only, no gambling aesthetic
- Native mobile app — web-first PWA, validate before native (Phase 8)
- Stripe payments — Phase 8, after product-market fit
- NBA / MLB — after NFL 2025 is solid (Oct 2026 / Spring 2027)
- Verified Creator Program — Phase 8, needs ~50 active predictors first

## Context

- Codebase at `~/Desktop/Clutch/` — 567 commits, 104 DB models, 165+ endpoints, 73 pages, 176 components
- Deployed: Vercel (frontend) + Railway (backend + PostgreSQL)
- GitHub: `Erokopotomus/Clutch` (master branch)
- Extended docs in Obsidian vault: `~/Documents/obsidian-dev-vault/01_Projects/ClutchFantasySports/`
- CLAUDE.md in repo root is the compact dev guide (36KB)
- `.cowork-instructions` in repo root for Cowork visual testing
- Other laptop has in-progress NFL player card/drawer work — needs to be merged or rebuilt
- Feb 26 discussion identified live golf polish + Manager Profile as top priorities
- nflverse hasn't published 2025 player stats CSVs yet (check periodically)

## Constraints

- **Tech stack**: React 18 + Vite + Tailwind | Node.js + Express 5 | PostgreSQL + Prisma 6 — all locked in
- **Hosting**: Vercel (frontend) + Railway (backend/DB) — no changes planned
- **AI budget**: Claude API with daily token budget + kill switch (already built)
- **Brand**: Light-first, no gambling language, prediction cards look like polls not sportsbook
- **Architecture**: Sport-agnostic league infrastructure, only player DB/scoring/schedule are sport-specific

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| QA/testing pass before new features | Platform has grown fast, need to verify everything works before adding more | — Pending |
| Live golf polish as top priority | Golf season is year-round, this is the launch sport — needs to be solid | — Pending |
| Manager Profile (5A) next after polish | Social identity page drives engagement and makes ratings visible | — Pending |
| YOLO mode for development | Solo builder, 567 commits of battle-tested code, git as safety net | — Pending |
| Obsidian vault extends CLAUDE.md | Vault holds deep specs/architecture, CLAUDE.md stays compact dev guide | ✓ Good |

---
*Last updated: 2026-03-01 after initialization*
