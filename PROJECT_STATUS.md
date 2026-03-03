# CLUTCH FANTASY SPORTS — Project Status Report

> Generated: February 26, 2026 | Last session sync: March 3, 2026 (late night)
> Repository: github.com/Erokopotomus/Clutch
> Branch: master (590+ commits)

---

## HANDOFF NOTES (for next Cowork session — morning of Mar 4)

**What happened tonight (Mar 3 late session):**
1. Batch C (075-081, engagement loop) — all DONE by Claude Code during session
2. Admin error dashboard (082) — built by Cowork, committed by Claude Code, DONE
3. Manager profile Phase 5A (083) — avatar upload, sports badges, recent calls — built by Cowork, DONE by Claude Code
4. Queued Batch D (084-089) — profile charts, leaderboard page, achievement engine, badge showcase, nav links, verified badge
5. Queued Phase 5C (090-091) — golf prediction expansion (8 types) + auto-resolution service

**What Claude Code should be working on:** Items 084-091 in `docs/QUEUE.md`. Check which are DONE vs still TODO.

**What Cowork should do next:**
- Verify Claude Code's deploys for 084-091 in Chrome (check production site)
- First real draft is **Wednesday Mar 5** — make sure draft room works with friends
- After draft: verify draft recap email fires, draft grading works, engagement notifications flow
- Prove It page should look much richer once 090 ships (8 golf prediction categories vs just SG benchmark)
- Once 091 ships, predictions will actually auto-resolve — verify Sunday night cron grades them correctly
- The **personal AI coach vault** (per-user logic memory) is the next big thing Eric wants to discuss after Phase 5 items land

**Key decision still needed:** Eric mentioned wanting to discuss the AI coach vault concept — per-user Obsidian-style memory that remembers tendencies, patterns, coaching preferences over time. Not queued yet, needs product discussion first.

**Language reminder for Prove It:** The current UI says "OVER" / "UNDER" which violates CLAUDE.md design rules. Item 090 reframes this. Make sure new prediction UIs use poll-style language (yes/no, make/miss) not sportsbook language.

---

## Current Phase: Phase 5 (Manager Analytics)

| Phase | Status |
|-------|--------|
| Phase 1: Core Platform | COMPLETE |
| Phase 2: Engagement & Stickiness | COMPLETE |
| Phase 3: League History & Migration | COMPLETE |
| Phase 3F-3G: Vault V2 + Commissioner Blog | COMPLETE |
| Phase 4: Data Architecture & Metrics (4A-4D) | COMPLETE |
| Phase 4E: Tier 1 Public Data Sources | PARTIAL (ESPN + DataGolf SG done, OWGR pending) |
| Data Layer Steps 1-7 + Lab Phases 1-5 | COMPLETE |
| Phase 5B: Clutch Rating V2 | COMPLETE |
| Phase 6: AI Engine (all sub-phases + admin) | COMPLETE |
| Import Intelligence Pipeline (all 4 parts) | COMPLETE |
| Phase 7: NFL (partial), NBA/MLB pending | PARTIAL |
| Infrastructure: Prisma singleton + pooling | COMPLETE |
| iPod Reframe (6 phases) | COMPLETE |
| SG Intelligence + Golf Hub + Season Race | COMPLETE |
| Live Scoring Pipeline + Scoring Redesign | COMPLETE |
| Board Editor Overhaul + Compare Mode | COMPLETE |
| Profile Enhancement + Nav/League UX | COMPLETE |

---

## Tech Stack

| Layer | Technology | Status |
|-------|-----------|--------|
| Frontend | React 18 + Vite + Tailwind CSS | Deployed (Vercel) |
| Backend | Node.js + Express 5 | Deployed (Railway) |
| Database | PostgreSQL + Prisma 6 | Deployed (Railway) |
| Real-time | Socket.IO | Live |
| Auth | JWT (custom) | Live |
| Data (Golf) | DataGolf API + ESPN API | Live |
| Data (NFL) | nflverse CSVs | Live (2024 season) |
| Historical (Golf) | ESPN Free API + DataGolf SG | Live (2018-2026 backfilled) |
| News | ESPN API | Live (2-hour sync) |
| Projections | Sleeper API + FFC ADP | Live (daily sync) |
| AI/ML | Claude API (Anthropic) | Live (Phase 6 complete) |
| Images | Cloudinary | Live |
| Payments | Stripe | PLANNED |
| Cache | Redis | PLANNED |

---

## Platform Scale

- **91+ database models** — see `backend/prisma/schema.prisma`
- **165+ API endpoints** across 37 route files — see `backend/src/routes/`
- **70+ frontend pages/routes** — see `frontend/src/App.jsx`
- **34 cron jobs** — see schedule tables below
- **66 backend services** — see `backend/src/services/`
- **49 migrations** (1-47 deployed to Railway)

---

## Cron Jobs (34 scheduled tasks)

### Golf Data Sync
| Schedule | Task |
|----------|------|
| Daily 6 AM | Player data sync |
| Mon 5 AM | Schedule sync |
| Thu-Sun 7 AM | Tournament field + live scores sync |
| Tue 8 PM + Wed 8 AM | Early field sync (upcoming tournaments) |
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
| Mon 2:30 AM | NFL roster sync |
| Mon 3 AM | NFL stats sync |
| Mon 3:30 AM | NFL player sync |
| Wed 7:30 AM | NFL schedule sync |
| Sun 11 PM | NFL fantasy scoring |
| Tue 6:30 AM | NFL weekly scoring |
| Every 30 min | NFL week status transitions (Sep-Feb) |

### Platform
| Schedule | Task |
|----------|------|
| Daily 5 AM | AI insight pipeline (ambient intelligence) |
| Daily 6 AM | Clutch projections sync |
| Every 2 hours | ESPN news sync (NFL + Golf) |
| Wed 4 AM | User intelligence profile regen |
| Wed 9 AM | Manager ratings refresh (Clutch Rating V2) |
| Thu-Sun 6 AM | Ownership rates |
| Sun 4 AM | Season stats refresh |
| Mon 2 AM | Prediction badge processing |
| Tue 5 AM | Consistency metrics |
| Tue 5:30 AM | ADP tracking |
| Tue 6 AM | Draft value tracking |

---

## Recent Migrations

| # | Migration | Purpose | Status |
|---|-----------|---------|--------|
| **43** | `clutch_rating_v2` | Rating snapshots, 14 component columns, confidence | DEPLOYED |
| **44** | `league_posts_blog_upgrade` | Cover image, images JSONB, view_count, league_post_views | DEPLOYED |
| **45** | `weekly_roster_overrides` | Weekly roster override support | DEPLOYED |
| **46** | `draft_board_league_link` | Link draft boards to leagues | DEPLOYED |
| **47** | `draft_board_auction_value` | Auction value column on board entries | DEPLOYED |

> Full migration history (0-47): all applied. See `backend/prisma/migrations/` for details.

---

## What's Next

1. **Phase 5 Remaining**
   - 5A: Enhanced Manager Profile Page (redesigned with Clutch Rating display)
   - 5C: Enhanced Prediction Categories (per-sport expansion)
   - 5D: Enhanced Leaderboard (filters, special leaderboards)
   - 5E: Badge & Achievement System v2 (social cards)
   - 5F: Consensus Engine (weighted by Clutch Rating)

2. **Known Gaps**
   - NFL 2025 season data not yet synced (only 2024)
   - Kicker + DST stats missing from NFL data
   - Phase 4E remaining: OWGR rankings sync validation, PGA Tour scraper
   - Redis not yet deployed (planned for leaderboard caching)
   - PWA not configured
   - Stripe payments not integrated

---

*567 commits. 91+ database models. 165+ API endpoints. 70+ frontend pages. 34 cron jobs. 66 backend services. 49 migrations. 2 sports live.*
