# Mock Draft Prep-Aesthetic Rebuild Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement this plan task-by-task.

**Goal:** Migrate Mock Draft (Lobby / Room / Recap) to the Prep editorial × Topps aesthetic and swap the room's data source from stale 2024 actuals to the fresh `NflPlayerProjection` table.

**Architecture:** Three surfaces + one new backend endpoint + shared primitives directory `frontend/src/components/lab-draft/`. Big-bang single PR. **Hard constraint:** draft state machine in `MockDraftRoom.jsx` (pick handling, timer, snake/auction logic) stays byte-for-byte identical — we only touch chrome, data fetch, and sort.

**Tech Stack:** React 18, Vite, Tailwind, React Router, Express, Prisma. Tests: Vitest (frontend), Jest (backend — match existing patterns in `backend/scripts/test-*` files).

**Design source:** `docs/plans/2026-05-19-mock-draft-prep-rebuild-design.md`

**Aesthetic references (read these first):**
- `frontend/src/pages/PrepHub.jsx:273-296` — broadcast masthead pattern
- `frontend/src/components/prep/PrepSectionNav.jsx` — pill nav pattern
- `frontend/src/utils/nflTeamColors.js` — `TEAM_COLORS` + `hexToRgba` + `getTeamColor`

---

## Phase A — Backend foundation (data swap)

### Task 1: Backend `GET /api/nfl/draft-players` endpoint

**Files:**
- Modify: `backend/src/routes/nfl.js` (add new route handler near the existing `/players` route at line 25)
- Create: `backend/scripts/test-draft-players-route.js` (runner-style test matching existing `backend/scripts/test-*` pattern)

**Step 1: Write the failing test**

Create `backend/scripts/test-draft-players-route.js`:
```javascript
const prisma = require('../src/lib/prisma')
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args))

const BASE = process.env.TEST_BASE || 'http://localhost:3001/api'

async function run() {
  const failures = []

  // Test 1: PPR returns the full FFC pool (~170 players)
  const ppr = await (await fetch(`${BASE}/nfl/draft-players?scoring=ppr`)).json()
  if (!Array.isArray(ppr.players)) failures.push('ppr: players is not an array')
  if (ppr.players.length < 150 || ppr.players.length > 200) {
    failures.push(`ppr: expected 150-200 players, got ${ppr.players.length}`)
  }

  // Test 2: First player has ADP populated and lower than the last
  if (ppr.players[0]?.adp == null) failures.push('ppr: first player missing adp')
  if (ppr.players[0]?.adp >= ppr.players[ppr.players.length - 1]?.adp) {
    failures.push('ppr: not sorted ADP ascending')
  }

  // Test 3: Every returned player has team color fields (null acceptable, key must exist)
  const missingColor = ppr.players.find(p => !('teamPrimaryColor' in p))
  if (missingColor) failures.push(`ppr: player ${missingColor.name} missing teamPrimaryColor field`)

  // Test 4: half_ppr smaller than ppr (FFC publishes fewer half-ppr players)
  const half = await (await fetch(`${BASE}/nfl/draft-players?scoring=half_ppr`)).json()
  if (half.players.length >= ppr.players.length) {
    failures.push(`half_ppr should be <= ppr, got half=${half.players.length} ppr=${ppr.players.length}`)
  }

  // Test 5: Invalid scoring returns 400
  const bad = await fetch(`${BASE}/nfl/draft-players?scoring=bogus`)
  if (bad.status !== 400) failures.push(`invalid scoring: expected 400, got ${bad.status}`)

  if (failures.length) {
    console.error('FAIL:\n  ' + failures.join('\n  '))
    process.exit(1)
  }
  console.log(`PASS — ppr=${ppr.players.length} half_ppr=${half.players.length}`)
}

run().finally(() => prisma.$disconnect())
```

**Step 2: Run test to verify it fails**

Run (in two terminals):
```bash
# Terminal 1
cd backend && npm start

# Terminal 2
cd backend && node scripts/test-draft-players-route.js
```
Expected: FAIL with "404" or "Cannot GET /api/nfl/draft-players"

**Step 3: Implement the endpoint**

Insert before `router.get('/players/:id'...)` at `backend/src/routes/nfl.js:204`:

```javascript
// GET /api/nfl/draft-players — Draftable NFL pool for Mock Draft
// Pulls from NflPlayerProjection (Sleeper + FFC ADP), sorted by ADP ascending.
// Returns team colors inline so the frontend doesn't need a second fetch.
router.get('/draft-players', optionalAuth, async (req, res, next) => {
  try {
    const scoring = String(req.query.scoring || 'half_ppr')
    if (!['ppr', 'half_ppr', 'standard'].includes(scoring)) {
      return res.status(400).json({ error: 'scoring must be ppr, half_ppr, or standard' })
    }
    const season = parseInt(req.query.season, 10) || new Date().getUTCFullYear()

    const rows = await prisma.nflPlayerProjection.findMany({
      where: { season, source: 'sleeper_consensus', scoringType: scoring },
      include: {
        player: {
          select: {
            id: true, name: true, nflPosition: true, nflTeamAbbr: true,
            headshotUrl: true,
          },
        },
      },
      orderBy: [
        { adp: { sort: 'asc', nulls: 'last' } },
        { projectedPoints: 'desc' },
      ],
    })

    // Pull team colors once (32 rows, cached in-process is fine for now)
    const teams = await prisma.nflTeam.findMany({
      select: { abbreviation: true, primaryColor: true, secondaryColor: true },
    })
    const colorByAbbr = new Map(teams.map(t => [t.abbreviation, t]))

    const players = rows
      .filter(r => r.player) // skip orphaned projections (defensive)
      .map(r => {
        const team = colorByAbbr.get(r.player.nflTeamAbbr) || {}
        return {
          id: r.player.id,
          name: r.player.name,
          position: r.player.nflPosition,
          teamAbbr: r.player.nflTeamAbbr,
          headshotUrl: r.player.headshotUrl,
          teamPrimaryColor: team.primaryColor || null,
          teamSecondaryColor: team.secondaryColor || null,
          adp: r.adp,
          projectedPoints: r.projectedPoints,
        }
      })

    res.json({ players, scoring, season, count: players.length })
  } catch (err) {
    next(err)
  }
})
```

**Step 4: Run test to verify it passes**

```bash
cd backend && node scripts/test-draft-players-route.js
```
Expected: `PASS — ppr=170 half_ppr=143` (numbers may vary slightly with future syncs).

**Step 5: Commit**

```bash
git add backend/src/routes/nfl.js backend/scripts/test-draft-players-route.js
git commit -m "feat(nfl): GET /api/nfl/draft-players — projection-backed mock draft pool"
```

---

### Task 2: Frontend api.js wrapper

**Files:**
- Modify: `frontend/src/services/api.js` (add near `getNflPlayers` at line 1224)

**Step 1: Add the wrapper**

After the `getNflPlayers` method block (around line 1239), insert:

```javascript
async getDraftPlayers({ scoring = 'half_ppr', season } = {}) {
  const params = new URLSearchParams({ scoring })
  if (season) params.set('season', season)
  return this.request(`/nfl/draft-players?${params.toString()}`)
},
```

**Step 2: Verify it loads**

In browser devtools console on a running frontend:
```javascript
window.__api.getDraftPlayers({ scoring: 'ppr' }).then(r => console.log(r.count))
```
Expected: `170` (or close).

**Step 3: Commit**

```bash
git add frontend/src/services/api.js
git commit -m "feat(api): getDraftPlayers — projection-backed mock draft pool"
```

---

## Phase B — Shared primitives

### Task 3: `teamColorHelpers.js`

**Files:**
- Create: `frontend/src/components/lab-draft/teamColorHelpers.js`
- Create: `frontend/src/components/lab-draft/teamColorHelpers.test.js`

**Step 1: Write the failing test**

```javascript
import { describe, it, expect } from 'vitest'
import { teamPrimary, teamBlend } from './teamColorHelpers'

describe('teamPrimary', () => {
  it('returns the team color when abbr is known', () => {
    expect(teamPrimary('KC')).toBe('#E31837')
  })
  it('returns blaze fallback when abbr is unknown', () => {
    expect(teamPrimary('XXX')).toBe('#F06820')
  })
  it('returns blaze fallback when abbr is null', () => {
    expect(teamPrimary(null)).toBe('#F06820')
  })
})

describe('teamBlend', () => {
  it('returns blaze when no abbrs provided', () => {
    expect(teamBlend([])).toBe('#F06820')
    expect(teamBlend(null)).toBe('#F06820')
  })
  it('returns a single team color when only one abbr', () => {
    expect(teamBlend(['KC'])).toBe('#E31837')
  })
  it('returns a hex string when multiple abbrs', () => {
    const blend = teamBlend(['KC', 'BUF'])
    expect(blend).toMatch(/^#[0-9a-f]{6}$/i)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/components/lab-draft/teamColorHelpers.test.js
```
Expected: FAIL with "Cannot find module './teamColorHelpers'".

**Step 3: Implement**

```javascript
// frontend/src/components/lab-draft/teamColorHelpers.js
import { TEAM_COLORS } from '../../utils/nflTeamColors'

const BLAZE = '#F06820'

export function teamPrimary(abbr) {
  if (!abbr) return BLAZE
  return TEAM_COLORS[abbr] ?? BLAZE
}

export function teamSecondary(abbr) {
  // Secondary colors not in TEAM_COLORS yet — return primary darkened by 20%.
  // When backend NflTeam.secondaryColor is wired through, swap to that.
  const primary = teamPrimary(abbr)
  return darken(primary, 0.2)
}

export function teamBlend(abbrs) {
  if (!abbrs || abbrs.length === 0) return BLAZE
  if (abbrs.length === 1) return teamPrimary(abbrs[0])
  const rgbs = abbrs.map(a => hexToRgb(teamPrimary(a)))
  const r = Math.round(rgbs.reduce((s, c) => s + c.r, 0) / rgbs.length)
  const g = Math.round(rgbs.reduce((s, c) => s + c.g, 0) / rgbs.length)
  const b = Math.round(rgbs.reduce((s, c) => s + c.b, 0) / rgbs.length)
  return rgbToHex(r, g, b)
}

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')
}

function darken(hex, amount) {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(
    Math.round(r * (1 - amount)),
    Math.round(g * (1 - amount)),
    Math.round(b * (1 - amount)),
  )
}
```

**Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/components/lab-draft/teamColorHelpers.test.js
```
Expected: PASS, all 6 tests.

**Step 5: Commit**

```bash
git add frontend/src/components/lab-draft/teamColorHelpers.js frontend/src/components/lab-draft/teamColorHelpers.test.js
git commit -m "feat(lab-draft): teamColorHelpers — primary/secondary/blend with blaze fallback"
```

---

### Task 4: `LabDraftMasthead.jsx` + `FormatPill.jsx`

**Files:**
- Create: `frontend/src/components/lab-draft/LabDraftMasthead.jsx`
- Create: `frontend/src/components/lab-draft/FormatPill.jsx`

**Step 1: Build `FormatPill`**

```jsx
// frontend/src/components/lab-draft/FormatPill.jsx
const LABELS = {
  ppr: 'PPR',
  half_ppr: 'Half PPR',
  standard: 'Standard',
}

export default function FormatPill({ format }) {
  if (!format) return null
  return (
    <span className="inline-flex items-center px-2 py-1 rounded bg-blaze/15 text-blaze font-mono text-[10px] font-bold uppercase tracking-[0.22em]">
      {LABELS[format] || format}
    </span>
  )
}
```

**Step 2: Build `LabDraftMasthead`**

```jsx
// frontend/src/components/lab-draft/LabDraftMasthead.jsx
import { Link } from 'react-router-dom'
import FormatPill from './FormatPill'

/**
 * Broadcast-style ticker bar that matches the Prep aesthetic.
 * Use `compact` variant in the draft room (lives in h-[calc(100vh-64px)]).
 */
export default function LabDraftMasthead({
  title = 'Mock Draft',
  subtitle,
  format,
  backHref = '/lab',
  backLabel = '← The Lab',
  compact = false,
  rightSlot,
}) {
  return (
    <>
      <div className="h-0.5 bg-blaze" aria-hidden="true" />
      <div className={`bg-slate-mid text-white border-b border-black/20 ${compact ? 'py-1.5' : 'py-2.5'}`}>
        <div className="mx-auto max-w-6xl px-4 md:px-6 flex items-center justify-between gap-3 md:gap-6 font-mono text-[11px] uppercase tracking-[0.22em] flex-wrap">
          <Link to={backHref} className="text-white/60 hover:text-white transition-colors shrink-0">
            {backLabel}
          </Link>
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-white font-bold whitespace-nowrap">{title}</span>
            {subtitle && (
              <>
                <span className="text-white/40">·</span>
                <span className="text-white/60 truncate">{subtitle}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {format && <FormatPill format={format} />}
            {rightSlot}
          </div>
        </div>
      </div>
    </>
  )
}
```

**Step 3: Quick render check**

In a running frontend, drop `<LabDraftMasthead title="Test" format="ppr" />` into any page temporarily, verify it renders with dark slate background, blaze stripe above, PPR pill on the right. Remove the temp insertion.

**Step 4: Commit**

```bash
git add frontend/src/components/lab-draft/LabDraftMasthead.jsx frontend/src/components/lab-draft/FormatPill.jsx
git commit -m "feat(lab-draft): LabDraftMasthead + FormatPill — broadcast ticker chrome"
```

---

### Task 5: `FormatToggleGroup.jsx`

**Files:**
- Create: `frontend/src/components/lab-draft/FormatToggleGroup.jsx`

**Step 1: Build the component**

```jsx
// frontend/src/components/lab-draft/FormatToggleGroup.jsx
const FORMATS = [
  { key: 'standard', label: 'Standard' },
  { key: 'half_ppr', label: 'Half PPR' },
  { key: 'ppr', label: 'PPR' },
]

export default function FormatToggleGroup({ value, onChange }) {
  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted mb-2">
        Scoring Format
      </label>
      <div className="grid grid-cols-3 gap-2">
        {FORMATS.map(fmt => {
          const selected = value === fmt.key
          return (
            <button
              key={fmt.key}
              type="button"
              onClick={() => onChange(fmt.key)}
              className={`py-3 rounded-button font-display font-bold transition-all ${
                selected
                  ? 'bg-blaze text-white shadow-button'
                  : 'bg-[var(--surface)] text-text-secondary border border-[var(--color-border)] hover:text-text-primary'
              }`}
            >
              {fmt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/lab-draft/FormatToggleGroup.jsx
git commit -m "feat(lab-draft): FormatToggleGroup — lobby-only scoring picker"
```

---

### Task 6: `PlayerRowAccent.jsx`

**Files:**
- Create: `frontend/src/components/lab-draft/PlayerRowAccent.jsx`

**Step 1: Build the component**

```jsx
// frontend/src/components/lab-draft/PlayerRowAccent.jsx
import { teamPrimary } from './teamColorHelpers'

/**
 * Single available-player row. Left-border accent in team primary color.
 * Designed to slot into the existing MockDraftRoom available-players list
 * without changing the surrounding layout grid.
 */
export default function PlayerRowAccent({
  player,
  onPick,
  disabled,
  selected,
  showProjected,
}) {
  const accent = teamPrimary(player.teamAbbr)
  return (
    <button
      type="button"
      onClick={() => !disabled && onPick?.(player)}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors border-b border-[var(--color-border)] ${
        selected ? 'bg-blaze/10' : 'hover:bg-[var(--glass)]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <span className="font-mono text-[10px] text-text-muted w-10 shrink-0">
        {player.adp != null ? player.adp.toFixed(1) : '—'}
      </span>
      <span className="font-mono text-[10px] font-bold text-text-secondary uppercase w-10 shrink-0">
        {player.teamAbbr || '—'}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted w-8 shrink-0">
        {player.position}
      </span>
      <span className="font-display font-bold text-sm text-text-primary truncate flex-1">
        {player.name}
      </span>
      <span className="font-mono text-xs text-text-secondary tabular-nums shrink-0">
        {showProjected ? (player.projectedPoints?.toFixed(0) ?? '—') : ''}
      </span>
    </button>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/lab-draft/PlayerRowAccent.jsx
git commit -m "feat(lab-draft): PlayerRowAccent — team-color left accent row"
```

---

### Task 7: `MyTeamPanel.jsx`

**Files:**
- Create: `frontend/src/components/lab-draft/MyTeamPanel.jsx`

**Step 1: Build the component**

```jsx
// frontend/src/components/lab-draft/MyTeamPanel.jsx
import { teamBlend } from './teamColorHelpers'
import { hexToRgba } from '../../utils/nflTeamColors'

/**
 * User's drafted-team panel. Header washes in a teamBlend() of the
 * abbrs of every drafted player. Empty state: blaze.
 */
export default function MyTeamPanel({ teamName, picks = [], renderPick }) {
  const abbrs = picks.map(p => p.teamAbbr).filter(Boolean)
  const blend = teamBlend(abbrs)

  return (
    <div className="rounded-card overflow-hidden border border-[var(--color-border)]">
      <div
        className="px-4 py-3 border-b border-black/10"
        style={{ background: `linear-gradient(90deg, ${hexToRgba(blend, 0.18)}, ${hexToRgba(blend, 0.06)})` }}
      >
        <h3 className="font-display font-bold text-text-primary truncate">
          {teamName || 'Your Team'}
        </h3>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted mt-0.5">
          {picks.length} {picks.length === 1 ? 'pick' : 'picks'}
        </div>
      </div>
      <div className="bg-[var(--surface)]">
        {picks.length === 0 ? (
          <div className="px-4 py-6 text-center font-mono text-[11px] uppercase tracking-wider text-text-muted">
            No picks yet
          </div>
        ) : (
          picks.map((pick, i) => renderPick ? renderPick(pick, i) : (
            <div key={i} className="px-4 py-2 border-b border-[var(--color-border)] last:border-0">
              <div className="font-display text-sm text-text-primary">{pick.name}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/lab-draft/MyTeamPanel.jsx
git commit -m "feat(lab-draft): MyTeamPanel — team-color blend header"
```

---

### Task 8: `SortToggle.jsx`

**Files:**
- Create: `frontend/src/components/lab-draft/SortToggle.jsx`

**Step 1: Build the component**

```jsx
// frontend/src/components/lab-draft/SortToggle.jsx
const OPTIONS = [
  { key: 'adp', label: 'ADP' },
  { key: 'projected', label: 'Projected' },
]

export default function SortToggle({ value = 'adp', onChange }) {
  return (
    <div className="inline-flex items-center bg-[var(--surface)] rounded-button border border-[var(--color-border)] overflow-hidden">
      {OPTIONS.map(opt => {
        const selected = value === opt.key
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] transition-colors ${
              selected ? 'bg-blaze/15 text-blaze' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/lab-draft/SortToggle.jsx
git commit -m "feat(lab-draft): SortToggle — ADP / Projected switcher"
```

---

## Phase C — Surface migrations

### Task 9: `MockDraft.jsx` lobby migration

**Files:**
- Modify: `frontend/src/pages/MockDraft.jsx` (entire file — gold→blaze sweep + replace chrome)

**Step 1: Swap the back button and header (lines 95-109)**

Replace the whole `{/* Header */}` block:

```jsx
import LabDraftMasthead from '../components/lab-draft/LabDraftMasthead'
import FormatToggleGroup from '../components/lab-draft/FormatToggleGroup'
```

Then replace the existing header at `MockDraft.jsx:95-109`:

```jsx
{/* Masthead replaces back-button + h1 + tagline */}
<LabDraftMasthead title="Mock Draft" backHref="/lab" backLabel="← The Lab" />
<main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
  <div className="max-w-2xl mx-auto">
    <header className="mb-6">
      <h1 className="font-display font-extrabold text-3xl tracking-tight">
        Practice your draft
        <span className="font-editorial italic font-normal text-blaze"> in the lab.</span>
      </h1>
      <p className="font-body text-sm text-text-secondary mt-2">
        Mock against AI opponents. Experiment with picks. Test board strategy before draft day.
      </p>
    </header>
```

Note: the outer `<div className="min-h-screen ...">` already exists at line 91 — keep it, but move the masthead above the `<main>`.

**Step 2: Replace scoring buttons block (lines 234-258) with `FormatToggleGroup`**

Replace the whole `{/* Scoring Format (NFL only) */}` block:

```jsx
{sport === 'nfl' && (
  <FormatToggleGroup
    value={settings.scoring}
    onChange={(scoring) => setSettings(s => ({ ...s, scoring }))}
  />
)}
```

**Step 3: Sweep `gold` tokens → `blaze`**

In the rest of `MockDraft.jsx`, replace these tokens (use Edit `replace_all` with each):
- `border-gold` → `border-blaze`
- `bg-gold/10` → `bg-blaze/10`
- `bg-gold/20` → `bg-blaze/20`
- `text-gold` → `text-blaze`
- `bg-gold text-text-primary` → `bg-blaze text-white`
- `border-gold/30` → `border-blaze/30`
- `focus:border-gold` → `focus:border-blaze`

**Step 4: Update navigation target**

Find `navigate('/mock-draft/room')` at `MockDraft.jsx:87` and change to:
```jsx
navigate('/lab/mock-draft/room')
```

Find `navigate('/dashboard')` in the back-button (the one we're removing, but in case it lingers elsewhere) — the new masthead handles back-nav, so no other change needed.

**Step 5: Manual visual check**

```bash
cd frontend && npm run dev
```
Open http://localhost:5173/mock-draft (route works in current build). Verify: dark slate masthead, blaze stripe above, editorial italic in the heading, blaze (not gold) selection states.

**Step 6: Commit**

```bash
git add frontend/src/pages/MockDraft.jsx
git commit -m "refactor(mock-draft): lobby — masthead + FormatToggleGroup + gold→blaze sweep"
```

---

### Task 10: `MockDraftRoom.jsx` migration

**Files:**
- Modify: `frontend/src/pages/MockDraftRoom.jsx` (chrome + data fetch only; draft state machine untouched)

**STRICT RULE for this task:** Do NOT touch any code related to: `currentTeam`, `currentPick`, `isAuction`, `auctionPhase`, `nominator`, `budgets`, `picks`, `handlePick`, `handleNominate`, `handleBid`, `tick`, `draftSpeed`, `pickTimer`. If a line touches one of those identifiers, leave it alone. We are only changing the surrounding chrome and the data source.

**Step 1: Add imports at top of file**

```jsx
import LabDraftMasthead from '../components/lab-draft/LabDraftMasthead'
import PlayerRowAccent from '../components/lab-draft/PlayerRowAccent'
import MyTeamPanel from '../components/lab-draft/MyTeamPanel'
import SortToggle from '../components/lab-draft/SortToggle'
```

**Step 2: Swap data fetch at `MockDraftRoom.jsx:655`**

Replace:
```javascript
const data = await api.getNflPlayers({ limit: 300, sortBy: 'fantasyPts', sortOrder: 'desc', scoring: config.scoring || 'half_ppr' })
const players = data?.players
```

With:
```javascript
const data = await api.getDraftPlayers({ scoring: config.scoring || 'half_ppr' })
const players = data?.players
if (players && players.length < 50) {
  console.warn(`[mock-draft] only ${players.length} players for ${config.scoring} — projection data may not be loaded`)
}
```

And update the field mapping block (`MockDraftRoom.jsx:658-677`) to match the new response shape:
```javascript
setApiPlayers(players.map((p, i) => ({
  id: p.id,
  name: p.name,
  rank: i + 1,
  position: p.position,           // was: p.nflPosition
  team: p.teamAbbr,                // was: p.nflTeamAbbr
  teamAbbr: p.teamAbbr,            // expose for PlayerRowAccent
  teamPrimaryColor: p.teamPrimaryColor,
  adp: p.adp,
  projectedPoints: p.projectedPoints,
  headshot: p.headshotUrl,
  // Legacy fields PlayerRowAccent doesn't need but draft state machine reads:
  ppg: p.projectedPoints ? p.projectedPoints / 17 : 0,
  totalPts: p.projectedPoints || 0,
  gamesPlayed: 0,
})))
```

**Step 3: Replace the header bar (`MockDraftRoom.jsx:1531-1665`)**

The header bar block starts at `<div className="bg-[var(--surface)] border-b border-[var(--card-border)] flex-shrink-0 z-30">` (line 1534).

The new compact masthead handles back nav + title + format pill. The center pick-status pill and right-side controls (speed selector, sound, timer, pause, start) stay — they're part of the draft state machine UI. Wrap them in a secondary chrome row beneath the masthead.

Replace lines 1534-NNN (find the matching `</div>` for the header bar; it's the one before the main grid container starts) with:

```jsx
<LabDraftMasthead
  title="Mock Draft"
  subtitle={`${config.teamCount} teams · ${config.rosterSize} rds · ${isAuction ? 'Auction' : 'Snake'} · ${allPlayers.length} players`}
  format={config.sport === 'nfl' ? config.scoring : null}
  backHref="/lab/mock-draft"
  backLabel="← Setup"
  compact
/>
<div className="bg-[var(--surface)] border-b border-[var(--color-border)] flex-shrink-0 z-30">
  <div className="px-3 sm:px-4 py-2 flex items-center justify-between gap-3">
    {/* Center: Current Pick Status — UNCHANGED draft-state-machine UI */}
    {/* PASTE THE EXISTING isStarted && (isAuction || currentTeam) BLOCK HERE — DO NOT MODIFY IT */}

    {/* Right: Speed + Pause + Pick counter + Timer + Start — UNCHANGED */}
    {/* PASTE THE EXISTING "Right" controls block HERE — DO NOT MODIFY THE INNER CONTENT */}
  </div>
</div>
```

The two "PASTE" comments mean: cut out exactly the pick-status block and the right-controls block from the original header, paste them into the new chrome row unchanged. Use the existing JSX verbatim except for swapping `bg-gold/20 text-gold border-gold/40` → `bg-blaze/20 text-blaze border-blaze/40` and similar gold→blaze token swaps. Animations, conditions, click handlers, and state references stay identical.

**Step 4: Replace the available-players list rendering**

Find the section that maps over `availablePlayers` to render rows (search for `availablePlayers.map` in the file). Replace each row's JSX with `<PlayerRowAccent player={p} onPick={...} disabled={...} showProjected={sortMode === 'projected'} />`. The `onPick` handler stays the existing pick handler — DO NOT change the click handler logic.

Add sort state above the render block:
```javascript
const [sortMode, setSortMode] = useState('adp')
const sortedPlayers = useMemo(() => {
  const list = [...availablePlayers]
  if (sortMode === 'projected') {
    list.sort((a, b) => (b.projectedPoints || 0) - (a.projectedPoints || 0))
  } else {
    list.sort((a, b) => {
      if (a.adp == null) return 1
      if (b.adp == null) return -1
      return a.adp - b.adp
    })
  }
  return list
}, [availablePlayers, sortMode])
```

Drop a `<SortToggle value={sortMode} onChange={setSortMode} />` next to the existing position filters (search for "position filter" or `positionFilter` in the file to find the right spot).

**Step 5: Replace my-team panel rendering**

Find the user's drafted-team panel (search for `userTeamId` in render code, or `My Team`). Replace its outer JSX with `<MyTeamPanel teamName={...} picks={userPicks} renderPick={(pick) => (...existing pick row JSX...)} />`. Pass the existing pick row JSX as the `renderPick` prop to avoid touching pick rendering logic.

**Step 6: Gold→blaze sweep on remaining tokens**

For any `gold` tokens still in the file that are NOT inside a draft-state-machine block (timer, pick status, auction nominator pulse animation), swap to `blaze` equivalents. Use Edit with `replace_all: false` and surrounding context to avoid touching state-machine UI.

A safer alternative: leave the gold pulse animations on the `YOUR PICK` / `YOUR NOMINATION` indicators — they're identity-coded for "your turn" attention and changing them risks visual confusion. Swap chrome gold (header buttons, summary cards, info pills) only.

**Step 7: Update back-button target**

Search for `navigate('/mock-draft')` in the file and replace with `navigate('/lab/mock-draft')`.

**Step 8: Manual smoke test**

```bash
cd frontend && npm run dev
```

1. Open `/lab/mock-draft`, configure NFL snake mock, click Start.
2. Verify: masthead renders with format pill, player list has left-color accents matching team colors, sort toggle works, my-team panel shows blend wash.
3. Make 5 picks. Verify timer ticks, pick advances, AI picks happen, my-team updates.
4. Switch to auction mode in a new draft. Verify nomination flow, bidding, win state.
5. iPhone 14 viewport (390px): verify masthead doesn't overflow, player rows stay readable.

If anything in the draft state machine misbehaves, revert step by step until it works — the chrome/data work should not have touched it.

**Step 9: Commit**

```bash
git add frontend/src/pages/MockDraftRoom.jsx
git commit -m "refactor(mock-draft): room — masthead + PlayerRowAccent + MyTeamPanel + SortToggle + getDraftPlayers swap"
```

---

### Task 11: `MockDraftRecap.jsx` migration

**Files:**
- Modify: `frontend/src/pages/MockDraftRecap.jsx`

**Step 1: Add imports**

```jsx
import LabDraftMasthead from '../components/lab-draft/LabDraftMasthead'
```

**Step 2: Replace header (lines 119-144)**

Replace the entire `{/* Header */}` block with:

```jsx
<LabDraftMasthead
  title="Mock Draft Recap"
  subtitle={`${result.teamCount} teams · ${result.draftType} · ${new Date(result.completedAt).toLocaleDateString()}`}
  format={sport === 'nfl' ? (result.scoring || 'half_ppr') : null}
  backHref="/lab/mock-draft"
  backLabel="← Mock Draft"
/>
<main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
  <div className="max-w-4xl mx-auto">
    <header className="mb-6">
      <h1 className="font-display font-extrabold text-3xl tracking-tight">
        How the draft
        <span className="font-editorial italic font-normal text-blaze"> graded out.</span>
      </h1>
    </header>
```

**Step 3: Fix the scoring hardcode at `MockDraftRecap.jsx:88`**

Replace:
```jsx
scoringFormat: boardSport === 'nfl' ? 'ppr' : 'standard',
```

With:
```jsx
scoringFormat: boardSport === 'nfl' ? (result.scoring || 'half_ppr') : 'standard',
```

**Step 4: Add scoring mismatch prompt before import**

In `handleImportToBoard` (around line 80), before the `setImporting(true)` line, add:

```javascript
const draftScoring = result.scoring || 'half_ppr'
const boardScoring = boardSport === 'nfl' ? draftScoring : 'standard'
if (boardSport === 'nfl' && draftScoring !== 'ppr' && draftScoring !== 'half_ppr' && draftScoring !== 'standard') {
  // Defensive: unknown scoring, just continue (shouldn't happen)
}
// Note: future enhancement — if user can select a target board with different scoring,
// prompt here. Current flow creates a new board so the formats always match by definition.
```

(The prompt described in the design is for the future case where users import to an existing board with different scoring. The current import flow creates a new board, so the mismatch isn't possible yet — the bug we're fixing is just that the new board was being hardcoded to PPR regardless of what the user drafted in.)

**Step 5: Gold→blaze sweep**

In the rest of the file, swap `gold` tokens to `blaze` using the same mapping as Task 9 Step 3. Pay special attention to the `border-gold/30` grade card and `bg-gold/15 text-gold` LIVE DATA pill (which can be removed entirely now that we trust the data source).

**Step 6: Update back link**

Replace `<Link to="/draft/history">` (line 124) — actually the masthead now handles back nav, so the old back link can be deleted along with the rest of the original header block in Step 2.

**Step 7: Manual visual check**

Run a quick mock to completion, verify the recap loads, the format pill in the masthead matches what was drafted in, "Import to Board" creates a board with the correct scoring format.

**Step 8: Commit**

```bash
git add frontend/src/pages/MockDraftRecap.jsx
git commit -m "refactor(mock-draft): recap — masthead + fix scoring hardcode + gold→blaze"
```

---

## Phase D — Routes + Prep CTA

### Task 12: Add new routes + redirect old paths

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: Add the new routes**

Find the existing mock-draft routes (around `App.jsx:626`):
```jsx
path="/mock-draft"
```

Add three new routes that point to the same components:
```jsx
<Route
  path="/lab/mock-draft"
  element={<MockDraft />}
/>
<Route
  path="/lab/mock-draft/room"
  element={<MockDraftRoom />}
/>
<Route
  path="/lab/mock-draft/recap/:id"
  element={<MockDraftRecap />}
/>
```

**Step 2: Add redirects from old paths**

Below the new routes, add redirects so old links don't break:
```jsx
<Route path="/mock-draft" element={<Navigate to="/lab/mock-draft" replace />} />
<Route path="/mock-draft/room" element={<Navigate to="/lab/mock-draft/room" replace />} />
<Route path="/mock-draft/recap/:id" element={
  <Navigate to={location.pathname.replace('/mock-draft/recap', '/lab/mock-draft/recap')} replace />
} />
```

(If `Navigate` isn't already imported from react-router-dom, add it.)

**Step 3: Smoke test the redirects**

```bash
cd frontend && npm run dev
```

Visit `/mock-draft` → should redirect to `/lab/mock-draft`. Verify all three old paths redirect cleanly.

**Step 4: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat(routes): /lab/mock-draft canonical paths with redirects from /mock-draft"
```

---

### Task 13: PrepHub CTA tile

**Files:**
- Modify: `frontend/src/pages/PrepHub.jsx`

**Step 1: Add a CTA tile**

Find a natural insertion point — likely near the end of the hub layout, after the "biggest movers" panel or featured teams section. Add:

```jsx
<section className="mt-12 mb-8">
  <Link
    to="/lab/mock-draft"
    className="block rounded-card border border-[var(--color-border)] bg-[var(--surface)] hover:border-blaze/40 transition-colors p-6"
  >
    <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted mb-2">
      Ready to test it out?
    </div>
    <h3 className="font-display font-extrabold text-2xl tracking-tight">
      Mock draft
      <span className="font-editorial italic font-normal text-blaze"> against the field.</span>
    </h3>
    <p className="font-body text-sm text-text-secondary mt-2 max-w-2xl">
      Take what you know about every roster, every staff change, every unit rank — and stress-test it in a live mock draft against AI opponents.
    </p>
    <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-blaze mt-3">
      Open the lab →
    </div>
  </Link>
</section>
```

**Step 2: Visual check**

Reload `/lab/prep` in the browser, verify the CTA renders in-aesthetic and links to `/lab/mock-draft`.

**Step 3: Commit**

```bash
git add frontend/src/pages/PrepHub.jsx
git commit -m "feat(prep): CTA tile linking PrepHub → Mock Draft"
```

---

## Phase E — Verification

### Task 14: End-to-end smoke test

**Manual checklist (no code changes; do not commit anything from this task):**

Run `npm run dev` in both `backend/` and `frontend/`. Open browser to http://localhost:5173.

**NFL Snake mock (desktop):**
- [ ] `/lab/mock-draft` loads with masthead + blaze accents
- [ ] Sport pills, draft type pills, team count buttons, scoring format toggle all blaze (no gold)
- [ ] Click "Start Mock Draft" → routes to `/lab/mock-draft/room`
- [ ] Room masthead shows correct format pill (PPR / Half PPR / Standard)
- [ ] Available-player list shows left-color accents matching NFL team colors
- [ ] Top of list is Justin Jefferson / CMC / Bijan / etc. (ADP order), NOT alphabetical or by points
- [ ] Sort toggle flips to projected points view, top of list changes
- [ ] Make a pick — timer/AI mechanics work, my-team panel updates with a team-color blend wash
- [ ] Complete draft → recap loads, format pill matches, "Import to Board" creates board with the drafted format

**NFL Auction mock (desktop):**
- [ ] Auction nomination, bidding, win state all work unchanged
- [ ] Budget display, nominator indicator, auction pulse animations all work

**Mobile (390px viewport, both formats):**
- [ ] Masthead doesn't overflow
- [ ] Player rows still readable, accents visible
- [ ] My-team panel collapses gracefully

**Golf mock (regression check):**
- [ ] `/lab/mock-draft` works with sport=golf
- [ ] No NFL-specific UI leaks (format pill should be hidden)
- [ ] Existing golf player list still renders

**Redirects:**
- [ ] `/mock-draft` → `/lab/mock-draft`
- [ ] `/mock-draft/room` → `/lab/mock-draft/room`
- [ ] `/mock-draft/recap/SOME_ID` → `/lab/mock-draft/recap/SOME_ID`

If any checkbox fails, debug at that step before moving on. Do NOT commit a half-broken flow.

---

### Task 15: Visual diff vs. PrepHub

**Manual check:** Take screenshots of each new surface at 1440px and 390px viewports. Open `frontend/src/pages/PrepHub.jsx` rendered output side-by-side. Verify:

- [ ] Masthead height + slate color matches PrepHub exactly
- [ ] `font-display` weights match (Bricolage Grotesque extrabold for h1s)
- [ ] `font-editorial` italic phrase styling matches (Instrument Serif italic in blaze)
- [ ] Blaze accent stripe above masthead is the same `h-0.5`
- [ ] No `gold` token visible anywhere in screenshot

If anything is off by enough to notice, identify the specific token/class and patch it.

---

## Done

Plan complete and saved to `docs/plans/2026-05-19-mock-draft-prep-rebuild-plan.md`.

**Two execution options:**

1. **Subagent-Driven (this session)** — controller dispatches fresh subagent per task, two-stage review between tasks, fast iteration.
2. **Parallel Session (separate)** — open new session in a worktree, batch execution with checkpoints.

**Which approach?**
