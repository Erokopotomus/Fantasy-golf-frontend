# NFL Data Spine — Design

**Date:** 2026-05-18
**Status:** Approved, ready for implementation plan
**Origin:** Strategic pivot from "NFL 2025 data sync" framing to "NFL data spine that powers multiple features at once." Crystallized during 2026-05-18 conversation about pre-draft prep features (Team Browser / What Changed / SRS Quiz) and their compounding leverage with Manager Intelligence, AI Coach, Reveal Moment, and future NFL launch infrastructure.
**Blocks / unblocks:** Manager Intelligence NFL pick-quality extractors, NFL Draft Room readiness for August 2026 launch, Reveal Moment (#208) with NFL signal, AI Coach NFL context, Lab Watchlist/Board Editor NFL features.

---

## Goal

Build a unified NFL data foundation in The Lab that powers three pre-draft prep features (Team Browser, "What Changed", Daily SRS Quiz) AND unblocks every downstream NFL feature across the platform. The spine is provider-agnostic at the canonical layer — consumers don't know which provider populated which row, and provider migrations (e.g., nflverse → SportsRadar) happen below the consumer surface.

The prep features address a real fantasy problem nobody has built for: **league prep is mostly updating last year's mental model, not rebuilding it.** ESPN/Sleeper/FantasyPros have all the data; nothing exists designed for memorization. The wedge is the memorization tool, with the data spine as the foundation.

## Strategic context

This design replaces the simpler "NFL 2025 sync" recommendation that originally came out of the post-Manager-Intelligence brainstorm. The data spine framing dominates because:

1. **One foundation, many products.** Team Browser, What Changed, SRS Quiz, Draft Room, MI extractors, AI Coach, Reveal Moment all read from the same canonical layer.
2. **Daily engagement during the season that matters most.** Pre-draft prep is May-August — peak fantasy interest. SRS quizzes create daily compounding usage. Reveal Moment is one-shot virality; prep is ongoing.
3. **Differentiated by design.** No competitor has built memorization-optimized NFL prep. The build itself produces shareable content (quiz cards = X-post material).
4. **Architecture compounds.** Adding a new feature later only needs to read the canonical layer; no parallel data ingestion required.

## Architecture decisions (locked during brainstorming)

| # | Decision | Choice |
|---|---|---|
| 1 | Historical scope | **Scope B** — 3 seasons (2023, 2024, 2025) |
| 2 | Coaching depth | **A** — HC + OC + DC only (96 rows per active season) |
| 3 | "What Changed" scope | **B** — Medium (coordinators + headline FA + rookies + OL/DL rank deltas) |
| 4 | Quiz card strategy | **B** — Templated generators (~10-12 templates) |
| 5 | Quiz card scope | **A+** — All 32 teams equal default, optional conference/division focus toggle |
| 6 | SRS algorithm | **B** — Anki SM-2 (industry standard, per-card-per-user ease factor) |
| 7 | App home | **B** — Inside The Lab at `/lab/prep/*` |
| 8 | Roster sync cadence | **A** — Daily 4 AM ET cron from Sleeper + admin force-refresh button |

## Architecture overview — three layers

### Layer 1: Data spine (canonical tables)

Six new tables, additive migration 54. All provider-agnostic.

**NflCoachingStaff** (96 rows/season)
```prisma
model NflCoachingStaff {
  id                  String    @id @default(cuid())
  teamId              String
  team                NflTeam   @relation(fields: [teamId], references: [id])
  season              Int
  role                String    // 'HC' | 'OC' | 'DC'
  name                String
  previousTeamAbbr    String?   // for "came from" narrative cards
  previousRole        String?
  hiredAt             DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  @@unique([teamId, season, role])
  @@index([season, role])
  @@map("nfl_coaching_staff")
}
```

**NflRosterSlot** (~3,400 rows per snapshot)
Normalized depth chart per team per snapshot. v1 has two snapshot types: `"end_of_2024_season"` (frozen) + `"current"` (overwritten daily).
```prisma
model NflRosterSlot {
  id            String   @id @default(cuid())
  teamId        String
  team          NflTeam  @relation(fields: [teamId], references: [id])
  playerId      String
  player        Player   @relation(fields: [playerId], references: [id])
  snapshotType  String   // 'end_of_2024_season' | 'current'
  position      String   // 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST' | 'OL' | 'DL' | etc.
  depthRank     Int      // 1=starter, 2=backup, ...
  status        String   // 'active' | 'ir' | 'pup' | 'sus'
  snapshotDate  DateTime
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@unique([teamId, playerId, snapshotType])
  @@index([snapshotType, teamId, position])
  @@map("nfl_roster_slots")
}
```

**NflTeamUnitRank** (64 rows/season — OL + DL × 32 teams)
```prisma
model NflTeamUnitRank {
  id        String   @id @default(cuid())
  teamId    String
  team      NflTeam  @relation(fields: [teamId], references: [id])
  season    Int
  unit      String   // 'OL' | 'DL' — overall rank only in v1
  rank      Int      // 1-32
  score     Float?   // underlying metric (adjusted line yards etc.)
  source    String   // 'espn_aly'
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([teamId, season, unit])
  @@index([season, unit])
  @@map("nfl_team_unit_ranks")
}
```

**NflPlayerProjection** (~600 rows/season for fantasy-relevant players)
```prisma
model NflPlayerProjection {
  id              String   @id @default(cuid())
  playerId        String
  player          Player   @relation(fields: [playerId], references: [id])
  season          Int
  scoringType     String   // 'std' | 'ppr' | 'half_ppr'
  projectedPoints Float
  adp             Float?   // average draft position — the field that unblocks MI pick-quality
  positionRank    Int?     // RB12, WR8, etc.
  source          String   // 'fantasypros_consensus'
  updatedAt       DateTime @updatedAt
  createdAt       DateTime @default(now())
  @@unique([playerId, season, scoringType, source])
  @@index([season, scoringType, positionRank])
  @@map("nfl_player_projections")
}
```

**PrepQuizCard** (~300-500 rows after template generation)
```prisma
model PrepQuizCard {
  id           String   @id @default(cuid())
  templateName String   // 'team_oc' | 'fa_destination' | etc.
  subject      String   // e.g., 'BUF' for team_oc cards
  question     String
  answer       String
  distractors  String[] // 3 wrong-answer multiple-choice options
  difficulty   Int      // 1-5
  category     String   // 'coaching' | 'roster' | 'ranks' | 'movement'
  meta         Json     // template-specific generation context
  generatedAt  DateTime @default(now())
  isActive     Boolean  @default(true)
  @@index([category])
  @@index([isActive])
  @@index([templateName])
  @@map("prep_quiz_cards")
}
```

**PrepQuizReview** (per-user SM-2 state)
```prisma
model PrepQuizReview {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  cardId        String
  card          PrepQuizCard @relation(fields: [cardId], references: [id], onDelete: Cascade)
  easeFactor    Float    @default(2.5)
  interval      Int      @default(1) // days
  repetitions   Int      @default(0)
  dueDate       DateTime @default(now())
  lastReviewed  DateTime?
  correctCount  Int      @default(0)
  incorrectCount Int     @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@unique([userId, cardId])
  @@index([userId, dueDate])
  @@map("prep_quiz_reviews")
}
```

**PrepUserSettings** (per-user knobs)
```prisma
model PrepUserSettings {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  focusMode       String?  // null=all 32 | 'AFC' | 'NFC' | 'AFC_EAST' | 'NFC_SOUTH' | ...
  cardsPerDay     Int      @default(10)
  currentStreak   Int      @default(0)
  longestStreak   Int      @default(0)
  lastQuizDate    DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@map("prep_user_settings")
}
```

### Layer 2: Sync pipeline

| Sync | Service | Cadence | Provider |
|---|---|---|---|
| NFL stats backfill (2023, 2025) | `nflHistoricalSync.js` (existing, extend) | One-shot | nflverse |
| In-season stats | `nflSync.js` (existing) | Tuesday 6:30 AM ET | nflverse |
| Roster snapshots | `nflRosterSync.js` (new) | Daily 4 AM ET | Sleeper API |
| Coaching staff | `nflCoachingSync.js` (new) | Manual + monthly check | PFR + manual curation |
| Unit ranks (OL/DL) | `nflUnitRankSync.js` (new) | Weekly during season | ESPN adjusted line yards |
| Projections + ADP | `projectionSync.js` (existing, extend) | Daily Apr-Aug, weekly in-season | FantasyPros free tier |

Admin "force refresh" button on Lab Prep settings page — triggers manual sync for emergency situations (preseason injury, surprise trade).

### Layer 3: Product surface — three UI views under `/lab/prep/*`

**`/lab/prep` — Overview hub**
- Lab-style hero banner
- Three cards: "Team Browser", "What Changed", "Daily Quiz"
- Each card shows status (e.g., quiz: "12-day streak, 10 cards due today")

**`/lab/prep/teams/:abbr` — Team Browser**
- Header strip: logo, name, division, 2025 record (W-L, PF/PA)
- Coaching panel: HC | OC | DC with "← New from [team]" annotation if changed
- Rank panel: OL #X / DL #X / Positional SOS — color-coded (green top-10, yellow mid, red bottom-10)
- Depth chart grid: 6 columns (QB/RB/WR/TE/K/DST), 3 deep at each position, status pills (active/IR/PUP)
- Player clicks → existing `PlayerDrawer` component (no new drawer needed)
- "Browse all 32" navigation pills at the bottom

**`/lab/prep/changes` — What Changed**
- Top filter strip: All Teams | AFC | NFC | (8 divisions)
- Accordion sections (default all expanded):
  - **Coaching changes** — teams with new HC/OC/DC, with "from [previous team]" attribution
  - **Rookie spotlights** — top draftees by team, depth chart placement
  - **FA movement** — top 30 destinations with old → new team
  - **OL/DL rank movers** — top 5 climbers + top 5 fallers, year-over-year deltas

**`/lab/prep/quiz` — Daily Quiz**
- Header: `[3/10] · Streak: 12 days`
- Question card with 4 multiple choice
- Difficulty buttons (Again / Hard / Good / Easy) after answer reveal
- "Why this card?" tooltip explains template source
- Progress bar at bottom
- Settings cog: `cardsPerDay` (5/10/20/30), `focusMode` picker
- Completion screen: streak updated, "Come back tomorrow"
- Empty state: "Nothing due today — come back tomorrow"

## Quiz template library (v1)

10-12 templates, each a function `generateCards(spine, context) → Card[]`. Re-run nightly after sync; new cards added, stale cards (`isActive=false`).

**Coaching (96 cards)**
- `team_hc` — "Who is the [team]'s head coach?"
- `team_oc` — "Who is the [team]'s offensive coordinator?"
- `team_dc` — "Who is the [team]'s defensive coordinator?"

**Roster baseline (~128 cards)**
- `team_qb1`, `team_wr1`, `team_rb1`, `team_te1` — starters at each fantasy-relevant position

**Ranks (64 cards)**
- `team_ol_rank`, `team_dl_rank` — "What is the [team]'s OL rank entering 2026?"

**Movement / What Changed (~100 cards)**
- `fa_destination` — "Where did [free agent] sign?" (top ~30 FA per offseason)
- `rookie_draft_round` — "What round did [rookie] go in the 2026 draft?" (top ~40)
- `coordinator_movement` — "Which team has the new [role] who came from [previous team]?" (~10)
- `last_year_role` — "Who was the [team]'s [WR1/RB1] last year?" (memory tester)
- `ol_rank_delta` — "[Team]'s OL rank moved from [X] to [Y] this offseason" (top 5 movers)

Distractors auto-generated from the spine — for `team_hc` cards, 3 random other HCs from the same conference become wrong choices.

## SM-2 algorithm

Standard Anki spaced repetition. Each card review records a 4-button response:

| Button | Effect |
|---|---|
| **Again** (wrong) | `interval = 1`, `ease -= 0.20` (floor 1.3), `repetitions = 0` |
| **Hard** | `interval *= 1.2`, `ease -= 0.15` |
| **Good** | `interval *= ease` |
| **Easy** | `interval *= ease * 1.3`, `ease += 0.15` (ceiling 2.5) |

`dueDate = now() + interval days`. Daily query selects cards where `userId = ? AND dueDate <= now() AND isActive = true`, ordered `dueDate ASC`, limited to `cardsPerDay`.

For new users with no `PrepQuizReview` rows: all active cards are candidates; daily query simply returns the first N filtered by focus mode.

## Downstream unlocks (data spine compounds)

**Direct (blocked today by data, unblocked by spine)**
- MI pick-quality extractors come alive for NFL drafts (`NflPlayerProjection.adp` is the missing piece)
- AI Coach NFL context (3 seasons of stats + current projections)
- NFL Draft Room readiness for August 2026 launch (rosters + projections + ADP at draft time)
- Lab Watchlist + Board Editor for NFL (current rosters + status)
- NFL prediction categories (deferred from Phase 5C — game winner, player calls, weekly rankings)

**Transitive**
- Reveal Moment (#208) — needs MI NFL signal, which needs ADP, which needs spine
- NFL Tournament Intelligence equivalent — OL/DL ranks + SOS + weather composing into team drilldowns
- Consensus engine (Phase 5F) — needs prediction infrastructure → needs spine

## Out of scope (v1 — explicitly deferred)

- Two-player / shared-league quiz mode (v2)
- Prediction Journal (post-2026-season)
- Oracle layer (conditional historical base rates, needs 2026 season first)
- Factor weight calibrator
- Mock draft replay
- Live in-game scoring (separate concern, `nflSync.js` handles; SportsRadar migration separate)
- Pass/run-split OL ranks (overall only in v1)
- College stats for rookies
- Position coaches beyond HC/OC/DC
- Manual seed cards (option C from question 4 — templated only)

## Error handling

- **Sync failures** — per-team try/catch in roster sync; one team's Sleeper error doesn't poison the rest. Log to `AppError` with `[prep-sync]` prefix.
- **Card generation failures** — per-template try/catch; failing template logs + skips (doesn't block other templates).
- **Missing data graceful degradation** — Team Browser renders with "—" placeholder if OL rank missing. Quiz cards skip generation when underlying data null.
- **User-facing endpoints never 500** — daily quiz returns empty array if no cards due; frontend shows empty state.

## Testing

- Smoke tests per sync service in `backend/scripts/prep/test-*.js` mirroring MI smoke pattern
- Card generation tests — mock spine in, verify expected card count + format
- SM-2 unit test — feed input states + responses, verify next-state matches Anki reference
- No formal framework — matches project convention

## Success criteria

1. Spine populated: 3 seasons of NFL stats, 32-team coaching staffs, OL/DL ranks for 3 seasons, current roster snapshots, 2026 projections + ADP for ~600 fantasy-relevant players
2. Three UI views functional at `/lab/prep/teams/:abbr`, `/lab/prep/changes`, `/lab/prep/quiz`
3. Daily quiz produces 10 fresh cards with SM-2 scheduling — verified via 3-day manual test
4. MI pick-quality extractors come alive — at least 1 NFL draft now produces non-null `pick_*_rate` values
5. Daily sync stays under 60 seconds — measured via Railway cron logs
6. Templates generate ≥300 active cards across 32 teams

## Estimated build effort

~10-14 working days:
- Schema migration + sync services: 3-4 days
- 3-year historical backfill execution: 1-2 days
- Quiz engine (templates + SM-2 + scheduling): 3 days
- Three UI views: 3-4 days
- Wiring + integration testing + admin tools: 1-2 days
