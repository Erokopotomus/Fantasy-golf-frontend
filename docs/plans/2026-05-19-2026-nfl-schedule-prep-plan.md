# 2026 NFL Schedule Sync + Prep Team-Page Schedule Strip — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement this plan task-by-task.

**Goal:** Sync the 2026 NFL regular-season schedule into `NflGame` and surface it on Prep team detail pages as a two-panel schedule strip below "What changed for {abbr}".

**Architecture:** Four pieces — (1) one-time data ingest via existing `syncScheduleRaw(prisma, 2026)`, (2) backend route extension on `GET /api/prep/teams/:abbr`, (3) new `<TeamScheduleStrip />` component in `frontend/src/components/prep/`, (4) slot it into `PrepTeamDetail.jsx` between the existing "What Changed" and Depth Chart sections.

**Tech Stack:** Node.js + Express + Prisma + Postgres backend. React + Vite + Tailwind frontend.

**Design source:** `docs/plans/2026-05-19-2026-nfl-schedule-prep-design.md`

**Existing references (read first):**
- `backend/src/services/nflHistoricalSync.js:284-330` — `syncScheduleRaw(prisma, season)` (already implemented + tested for prior seasons)
- `backend/src/routes/prep.js:121-216` — existing `GET /teams/:abbr` route to extend
- `frontend/src/pages/PrepTeamDetail.jsx:438-642` — surface to add the strip (between What Changed at line 639 and Depth Chart at line 642)
- `frontend/src/utils/nflTeamColors.js` — `TEAM_COLORS` palette + `hexToRgba`
- `frontend/src/components/lab-draft/PlayerRowAccent.jsx` — visual pattern to mirror (left-border accent)

---

## Task 1: Run 2026 schedule sync

**Files:**
- Create: `backend/scripts/run-nfl-schedule-sync-2026.js`

**Step 1: Write the runner**

```javascript
try { require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }) } catch {}

const prisma = require('../src/lib/prisma')
const { syncScheduleRaw } = require('../src/services/nflHistoricalSync')

;(async () => {
  try {
    const season = parseInt(process.env.SEASON || '2026', 10)
    console.log(`[schedule-sync] Starting sync for ${season}...`)
    const result = await syncScheduleRaw(prisma, season)
    console.log(`[schedule-sync] Done:`, result)
  } finally {
    await prisma.$disconnect()
  }
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

**Step 2: Run it**

```bash
cd backend && node scripts/run-nfl-schedule-sync-2026.js
```

Expected: console output showing 272+ regular-season games upserted. Re-running should be idempotent (no duplicates).

**Step 3: Verify in DB**

```bash
node -e "
const prisma = require('./src/lib/prisma')
;(async () => {
  const count = await prisma.nflGame.count({ where: { season: 2026 } })
  const byTeam = await prisma.nflGame.groupBy({
    by: ['homeTeamId'],
    where: { season: 2026 },
    _count: { _all: true },
  })
  console.log('2026 games total:', count)
  console.log('Distinct home teams:', byTeam.length, '(expect 32)')
  await prisma.\$disconnect()
})()
"
```

Expected: ~272 games total, 32 distinct home teams.

**Step 4: Commit**

```bash
git add backend/scripts/run-nfl-schedule-sync-2026.js
git commit -m "feat(nfl): runner script for 2026 schedule sync"
```

Note: do NOT commit the data changes (sync output is in DB, not files). The script is reusable for any season.

---

## Task 2: Extend `GET /api/prep/teams/:abbr` with `schedule2026`

**Files:**
- Modify: `backend/src/routes/prep.js:129-203` (extend the existing route)

**Step 1: Add the schedule query**

In `backend/src/routes/prep.js`, find the `Promise.all` block at line 129 that fetches `staff`, `ranks`, `rosterSlots`. Add a fourth parallel query for the 2026 schedule:

```javascript
const [staff, ranks, rosterSlots, schedule2026] = await Promise.all([
  prisma.nflCoachingStaff.findMany({
    where: { teamId: team.id, season: 2026 },
  }),
  prisma.nflTeamUnitRank.findMany({
    where: { teamId: team.id, season: { in: [2023, 2024, 2025] } },
  }),
  prisma.nflRosterSlot.findMany({
    where: { teamId: team.id, snapshotType: 'current' },
    include: { player: true },
  }),
  prisma.nflGame.findMany({
    where: {
      season: 2026,
      gameType: 'REG',
      OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
    },
    orderBy: { week: 'asc' },
  }),
])
```

**Step 2: Build the schedule response shape**

Below the existing `roster` build (around line 196), before the final `res.json(...)`, add:

```javascript
// Resolve opponent team abbreviations in one query
const opponentIds = schedule2026
  .map(g => g.homeTeamId === team.id ? g.awayTeamId : g.homeTeamId)
  .filter((id, i, arr) => arr.indexOf(id) === i)
const opponents = opponentIds.length
  ? await prisma.nflTeam.findMany({
      where: { id: { in: opponentIds } },
      select: { id: true, abbreviation: true, name: true, city: true },
    })
  : []
const opponentById = new Map(opponents.map(t => [t.id, t]))

const schedule = schedule2026.map(g => {
  const isHome = g.homeTeamId === team.id
  const opponentId = isHome ? g.awayTeamId : g.homeTeamId
  const opponent = opponentById.get(opponentId)
  return {
    week: g.week,
    opponent: opponent
      ? { abbreviation: opponent.abbreviation, name: opponent.name, city: opponent.city }
      : null,
    isHome,
    kickoff: g.kickoff,
    gameType: g.gameType,
    isPrimetime: detectPrimetime(g.kickoff),
  }
})
```

**Step 3: Add `detectPrimetime` helper**

At the top of `prep.js`, near the existing helper functions, add:

```javascript
/**
 * Returns 'TNF' | 'SNF' | 'MNF' | null based on the kickoff timestamp.
 * Pure helper — used by the team-detail route to flag primetime games.
 * Times are checked against US Eastern Time (the league's broadcast frame).
 */
function detectPrimetime(kickoff) {
  if (!kickoff) return null
  const d = new Date(kickoff)
  // Get day-of-week + hour in US Eastern (the league frame). Use Intl to be
  // DST-safe: in-season runs Sep→Feb so we cross the EST↔EDT boundary.
  const tzOpts = { timeZone: 'America/New_York', hour12: false, weekday: 'short', hour: 'numeric', minute: 'numeric' }
  const parts = new Intl.DateTimeFormat('en-US', tzOpts).formatToParts(d)
  const weekday = parts.find(p => p.type === 'weekday')?.value // 'Mon' | 'Tue' | ...
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10)
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10)
  const minutesSinceMidnight = hour * 60 + minute

  // Thursday 8:15 PM ET or later
  if (weekday === 'Thu' && minutesSinceMidnight >= 20 * 60 + 15) return 'TNF'
  // Sunday 8:20 PM ET or later (note: London games at 9:30 AM are NOT primetime)
  if (weekday === 'Sun' && minutesSinceMidnight >= 20 * 60 + 20) return 'SNF'
  // Monday 8:15 PM ET or later
  if (weekday === 'Mon' && minutesSinceMidnight >= 20 * 60 + 15) return 'MNF'
  return null
}
```

**Step 4: Add `schedule` to the response**

Change the `res.json(...)` block at line 203 from:

```javascript
res.json({
  team: { ... },
  coaching,
  ranks: ranksOut,
  roster,
})
```

To:

```javascript
res.json({
  team: { ... },
  coaching,
  ranks: ranksOut,
  roster,
  schedule,
})
```

**Step 5: Quick verify via curl**

Start backend (`cd backend && npm start &`), then:

```bash
curl -s 'http://localhost:3001/api/prep/teams/KC' | python3 -c "import sys, json; d = json.load(sys.stdin); s = d.get('schedule', []); print(f'KC schedule length: {len(s)}'); print(f'Week 1: {s[0]}' if s else 'no games')"
```

Expected: schedule length 17 (regular season), week 1 entry with opponent + isHome + kickoff + isPrimetime. Kill backend with `pkill -f "node.*src/index.js"`.

**Step 6: Commit**

```bash
git add backend/src/routes/prep.js
git commit -m "feat(prep): add schedule2026 to GET /api/prep/teams/:abbr response"
```

---

## Task 3: Create `<TeamScheduleStrip />` component

**Files:**
- Create: `frontend/src/components/prep/TeamScheduleStrip.jsx`

**Step 1: Build the component**

```jsx
// frontend/src/components/prep/TeamScheduleStrip.jsx
import { TEAM_COLORS } from '../../utils/nflTeamColors'

const KICKOFF_DAY_LABEL = {
  0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed',
  4: 'Thu', 5: 'Fri', 6: 'Sat',
}

function kickoffDay(kickoff) {
  if (!kickoff) return null
  const d = new Date(kickoff)
  return KICKOFF_DAY_LABEL[d.getUTCDay()] ?? null
}

function ScheduleRow({ game }) {
  if (!game) {
    // Bye week row
    return (
      <div className="flex items-baseline gap-3 px-3 py-2.5 border-b border-[var(--color-border)]/50 last:border-0 bg-[var(--bg-alt)]/30">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted w-8 shrink-0">—</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted">BYE</span>
      </div>
    )
  }
  const accent = TEAM_COLORS[game.opponent?.abbreviation] ?? '#F06820'
  const opponentLabel = game.opponent?.abbreviation ?? '???'
  const opponentName = game.opponent?.name ?? ''
  return (
    <div
      className="flex items-baseline gap-3 px-3 py-2.5 border-b border-[var(--color-border)]/50 last:border-0 hover:bg-[var(--glass)] transition-colors"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted w-8 shrink-0">
        WK {game.week}
      </span>
      <span className="font-display font-bold text-sm text-[var(--text-1)] w-14 shrink-0">
        {game.isHome ? '' : '@'}{opponentLabel}
      </span>
      <span className="font-editorial italic text-sm text-text-secondary truncate flex-1">
        {opponentName}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted shrink-0">
        {kickoffDay(game.kickoff)}
      </span>
      {game.isPrimetime && (
        <span
          className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold px-1.5 py-0.5 rounded shrink-0 text-blaze"
          style={{ backgroundColor: 'rgba(240, 104, 32, 0.12)' }}
        >
          {game.isPrimetime}
        </span>
      )}
    </div>
  )
}

/**
 * Builds an 18-week array, slotting each game into its `week` index.
 * Empty slots become bye weeks.
 */
function buildWeekSlots(schedule) {
  const slots = Array(18).fill(null)
  for (const g of schedule) {
    if (g.week >= 1 && g.week <= 18) slots[g.week - 1] = g
  }
  return slots
}

export default function TeamScheduleStrip({ schedule, teamAbbreviation }) {
  if (!schedule || schedule.length === 0) {
    return (
      <div className="rounded-card border border-[var(--color-border)] bg-[var(--surface)] px-4 py-10 text-center font-mono text-xs text-text-muted">
        Schedule loading…
      </div>
    )
  }
  const slots = buildWeekSlots(schedule)
  const left = slots.slice(0, 9)
  const right = slots.slice(9, 18)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="rounded-card border border-[var(--color-border)] bg-[var(--surface)] overflow-hidden">
        {left.map((g, i) => (
          <ScheduleRow key={`L${i}`} game={g} />
        ))}
      </div>
      <div className="rounded-card border border-[var(--color-border)] bg-[var(--surface)] overflow-hidden">
        {right.map((g, i) => (
          <ScheduleRow key={`R${i}`} game={g} />
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/prep/TeamScheduleStrip.jsx
git commit -m "feat(prep): TeamScheduleStrip — two-panel 18-week schedule with team-color accents"
```

---

## Task 4: Slot the strip into PrepTeamDetail.jsx

**Files:**
- Modify: `frontend/src/pages/PrepTeamDetail.jsx`

**Step 1: Add the import**

At the top of the file, near the other prep component imports:

```jsx
import TeamScheduleStrip from '../components/prep/TeamScheduleStrip'
```

**Step 2: Slot the new section between What Changed and Depth Chart**

Find the closing `</section>` of the What Changed block (line ~639) and the opening of the Depth Chart section (line ~642). Insert the schedule section between them:

```jsx
            {/* 2026 Schedule */}
            <section className="mb-8">
              <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">
                    i·c
                  </span>
                  <h2 className="font-display font-extrabold text-2xl tracking-tight">
                    2026 schedule
                  </h2>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">
                  17 regular-season games · 1 bye
                </span>
              </div>
              <TeamScheduleStrip
                schedule={data.schedule}
                teamAbbreviation={normalizedAbbr}
              />
            </section>
```

The section markers in the page are `i·a` (hero), `i·b` (What Changed), then this new section should be `i·c` (Schedule), `ii` (Depth Chart). The visual cadence — Roman numeral subsections — matches the existing page rhythm.

**Step 3: Verify dev server still builds**

```bash
cd frontend && npx vite build
```

Expected: build passes with no new errors.

**Step 4: Commit**

```bash
git add frontend/src/pages/PrepTeamDetail.jsx
git commit -m "feat(prep): add 2026 schedule section between What Changed and Depth Chart"
```

---

## Task 5: Manual smoke test

**Manual checklist — no commits in this task.**

Start backend + frontend:
```bash
cd backend && npm start &
cd frontend && npm run dev
```

Open http://localhost:5173/lab/prep/teams/KC. Verify:

- [ ] **2026 Schedule** section appears below "What changed for KC"
- [ ] Left panel: weeks 1-9, right panel: weeks 10-18 (or stacked on narrow screens)
- [ ] Each game row shows: week label, opponent abbreviation with `@` prefix for road games, opponent name, kickoff day (Sun/Thu/Mon/etc.)
- [ ] Primetime games show a small TNF/SNF/MNF pip
- [ ] Bye week renders as a muted "BYE" row in the right place (KC's 2026 bye week, whichever it is)
- [ ] Team-color left-border accent on each row matches the opponent (Chiefs games would show their opponent's color; this is KC's own page so we never accent with KC color)
- [ ] Hover state on each row dims/brightens cleanly

Check 2-3 other teams: `/lab/prep/teams/SF`, `/lab/prep/teams/BUF`, `/lab/prep/teams/NYJ`. Each should render 17 games + 1 bye.

Mobile viewport (390px iPhone 14): panels stack vertically. Opponent name can wrap or truncate gracefully. Touch targets feel right.

Test data resilience:
- [ ] Team with no schedule data (manually delete a team's games in dev DB and reload) — shows "Schedule loading…" placeholder, not broken UI
- [ ] Opponent abbr not in `TEAM_COLORS` (shouldn't happen for NFL teams, but defensive) — falls back to blaze

If any check fails, fix at that step before declaring done.

---

## Out of scope

Reminder, NOT in this plan:
- Strength of Schedule difficulty coloring (queue #214 — paused)
- Cron-wiring `syncScheduleRaw` for ongoing flex-game updates (re-run script as needed for now; cron addition is a future small task)
- Game cell hover details (kickoff time, venue, weather forecast)
- Linking game cells to a game detail page (no such page exists yet)
- Postseason / playoff weeks (just regular season 1-18)

---

## Done

Plan complete and saved to `docs/plans/2026-05-19-2026-nfl-schedule-prep-plan.md`.

**Two execution options:**

1. **Subagent-Driven (this session)** — controller dispatches fresh subagent per task, two-stage review between tasks, fast iteration.
2. **Parallel Session (separate)** — open new session in a worktree, batch execution with checkpoints.

**Which approach?**
