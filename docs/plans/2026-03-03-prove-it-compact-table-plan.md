# Prove It Compact Table — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the category-pill-driven prediction slate with a compact horizontal table where all prediction types are visible as columns simultaneously, enabling 12-15 players visible at once with one-tap submission.

**Architecture:** Extract the WeeklySlate rendering section from `ProveIt.jsx` into a new `CompactSlateTable` component and a reusable `PredictionCell` component. The existing data loading, state management, and API submission logic stays in WeeklySlate. The table replaces the category pills and per-category render blocks. H2H and R1 Leader remain as separate sections below the table.

**Tech Stack:** React 18 + Tailwind CSS. No new dependencies.

---

## Context for Implementer

### Current State

`frontend/src/pages/ProveIt.jsx` contains the `WeeklySlate` component (lines 65-608). It currently:
1. Loads tournament + top 50 leaderboard players + user predictions on mount (lines 79-122)
2. Uses a `SLATE_CATEGORIES` array (lines 43-52) and category pill picker (lines 236-252) to switch between 8 prediction types one at a time
3. Has a single `handleSubmit(player, direction, extraData)` function (lines 137-176) that reads `predType` from the currently selected category
4. Renders each category type in a separate JSX block (lines 281-598)
5. Builds a `myPredictions` lookup (lines 124-135) filtered to the active category only

### Design Doc

See `docs/plans/2026-03-03-prove-it-compact-table-design.md` for full design spec including:
- Table structure (Player | Winner | T5 | T10 | T20 | Cut | SG columns)
- Tap behavior (tap cycles through states per column type)
- Cell visual states (empty, positive, negative, resolved correct/incorrect)
- Mobile responsiveness (sticky player column, horizontal scroll)

### Key Files

- `frontend/src/pages/ProveIt.jsx` — Main file to modify (WeeklySlate component)
- `frontend/src/services/api.js` — `submitPrediction`, `updatePrediction`, `deletePrediction` already exist
- `frontend/src/components/predictions/BackYourCall.jsx` — Used after prediction submission (keep as inline below-row prompt)
- `frontend/src/components/predictions/HeadToHead.jsx` — Standalone component (keep as separate section below table)

### API Contracts

Submit a prediction:
```javascript
api.submitPrediction({
  sport: 'golf',
  predictionType: 'top_5' | 'top_10' | 'top_20' | 'make_cut' | 'player_benchmark' | 'tournament_winner' | 'round_leader' | 'head_to_head',
  category: 'tournament',
  eventId: currentTournament.id,
  subjectPlayerId: player.id,
  predictionData: { playerName, direction, ... },
  isPublic: true,
})
```

Update: `api.updatePrediction(id, { thesis, confidenceLevel, ... })`
Delete: `api.deletePrediction(id)`

### Prediction Type → Column Mapping

| Column | predictionType | Direction Values | Single-pick? |
|--------|---------------|-----------------|--------------|
| Winner | `tournament_winner` | (no direction — just pick) | Yes (one player only) |
| Top 5 | `top_5` | `yes` / `no` | No |
| Top 10 | `top_10` | `yes` / `no` | No |
| Top 20 | `top_20` | `yes` / `no` | No |
| Cut | `make_cut` | `make` / `miss` | No |
| SG | `player_benchmark` | `over` / `under` + benchmarkValue | No |

---

## Task 1: Create the PredictionCell Component

**Files:**
- Create: `frontend/src/components/predictions/PredictionCell.jsx`

**Step 1: Create the PredictionCell component**

This is a reusable tappable cell that handles tap cycling and visual states. Props:

```jsx
// PredictionCell.jsx
import { useState } from 'react'

/**
 * Tappable prediction cell for compact table.
 * Cycles through states on tap, immediately submits via onTap callback.
 *
 * Props:
 *   columnType: 'winner' | 'top' | 'cut' | 'sg'
 *   prediction: existing prediction object or null
 *   player: { id, name, sgTotal }
 *   disabled: boolean (submitting state)
 *   onTap: (direction) => void — called with the new direction, or null to clear
 *   benchmarkValue: number (only for SG column — player's sgTotal)
 *   isWinnerSelected: boolean (only for winner column — is this player the current pick)
 */
export default function PredictionCell({
  columnType,
  prediction,
  player,
  disabled,
  onTap,
  benchmarkValue,
  isWinnerSelected,
}) {
  const outcome = prediction?.outcome  // 'CORRECT' | 'INCORRECT' | 'PENDING' | null
  const isResolved = outcome === 'CORRECT' || outcome === 'INCORRECT'

  // Determine current state from prediction
  const currentDirection = prediction?.predictionData?.direction
  const hasPositive = columnType === 'winner'
    ? isWinnerSelected
    : currentDirection === 'yes' || currentDirection === 'over' || currentDirection === 'make'
  const hasNegative = currentDirection === 'no' || currentDirection === 'under' || currentDirection === 'miss'

  const handleTap = () => {
    if (disabled || isResolved) return

    if (columnType === 'winner') {
      // Winner: toggle on/off (single-pick handled by parent)
      onTap(isWinnerSelected ? null : 'pick')
      return
    }

    // All other columns: cycle empty → positive → negative → empty
    if (!hasPositive && !hasNegative) {
      // Empty → positive
      const dir = columnType === 'top' ? 'yes' : columnType === 'cut' ? 'make' : 'over'
      onTap(dir)
    } else if (hasPositive) {
      // Positive → negative
      const dir = columnType === 'top' ? 'no' : columnType === 'cut' ? 'miss' : 'under'
      onTap(dir)
    } else {
      // Negative → clear
      onTap(null)
    }
  }

  // --- Resolved states ---
  if (isResolved) {
    if (!prediction) return <td className="px-1 py-1 text-center"><div className="w-9 h-8" /></td>
    return (
      <td className="px-1 py-1 text-center">
        <div className={`w-9 h-8 rounded flex items-center justify-center text-xs font-bold ${
          outcome === 'CORRECT'
            ? 'bg-field-bright/20 text-field'
            : 'bg-rose-500/20 text-rose-400'
        }`}>
          {outcome === 'CORRECT' ? '✓' : '✗'}
        </div>
      </td>
    )
  }

  // --- Winner column ---
  if (columnType === 'winner') {
    return (
      <td className="px-1 py-1 text-center">
        <button
          onClick={handleTap}
          disabled={disabled}
          className={`w-9 h-8 rounded text-xs font-bold transition-all ${
            isWinnerSelected
              ? 'bg-crown/20 text-crown border border-crown/40'
              : 'bg-[var(--bg-alt)] text-text-primary/20 hover:text-text-primary/40 border border-transparent'
          } disabled:opacity-50`}
        >
          {isWinnerSelected ? '🏆' : '·'}
        </button>
      </td>
    )
  }

  // --- SG column (shows benchmark value) ---
  if (columnType === 'sg') {
    const sign = benchmarkValue >= 0 ? '+' : ''
    const displayVal = `${sign}${benchmarkValue?.toFixed(1)}`
    return (
      <td className="px-1 py-1 text-center">
        <button
          onClick={handleTap}
          disabled={disabled}
          className={`min-w-[3.5rem] h-8 rounded text-[10px] font-mono font-bold transition-all px-1 ${
            hasPositive
              ? 'bg-field/10 text-field border border-field/30'
              : hasNegative
                ? 'bg-live-red/10 text-live-red border border-live-red/30'
                : 'bg-[var(--bg-alt)] text-text-primary/40 hover:text-text-primary/60 border border-transparent'
          } disabled:opacity-50`}
        >
          {hasPositive ? `A ${displayVal}` : hasNegative ? `B ${displayVal}` : displayVal}
        </button>
      </td>
    )
  }

  // --- Top 5/10/20 and Cut columns ---
  const labels = columnType === 'cut'
    ? { positive: 'Make', negative: 'Miss' }
    : { positive: 'Yes', negative: 'No' }

  return (
    <td className="px-1 py-1 text-center">
      <button
        onClick={handleTap}
        disabled={disabled}
        className={`w-9 h-8 rounded text-[10px] font-bold transition-all ${
          hasPositive
            ? 'bg-field/10 text-field border border-field/30'
            : hasNegative
              ? 'bg-live-red/10 text-live-red border border-live-red/30'
              : 'bg-[var(--bg-alt)] text-text-primary/20 hover:text-text-primary/40 border border-transparent'
        } disabled:opacity-50`}
      >
        {hasPositive ? labels.positive : hasNegative ? labels.negative : '·'}
      </button>
    </td>
  )
}
```

**Step 2: Verify the file was created correctly**

Run: `cat frontend/src/components/predictions/PredictionCell.jsx | head -5`
Expected: The imports and component declaration.

**Step 3: Commit**

```bash
git add frontend/src/components/predictions/PredictionCell.jsx
git commit -m "feat: add PredictionCell component for compact table tap cycling"
```

---

## Task 2: Create the CompactSlateTable Component

**Files:**
- Create: `frontend/src/components/predictions/CompactSlateTable.jsx`

**Step 1: Create the CompactSlateTable component**

This component renders the horizontal table with sticky header and sticky player column. It receives all data from the parent WeeklySlate and delegates cell rendering to PredictionCell.

```jsx
// CompactSlateTable.jsx
import PredictionCell from './PredictionCell'

// Column definitions for the table (excludes H2H and R1 Leader)
const TABLE_COLUMNS = [
  { id: 'winner', label: 'W', fullLabel: 'Winner', type: 'tournament_winner', columnType: 'winner' },
  { id: 'top_5', label: 'T5', fullLabel: 'Top 5', type: 'top_5', columnType: 'top' },
  { id: 'top_10', label: 'T10', fullLabel: 'Top 10', type: 'top_10', columnType: 'top' },
  { id: 'top_20', label: 'T20', fullLabel: 'Top 20', type: 'top_20', columnType: 'top' },
  { id: 'cut', label: 'Cut', fullLabel: 'Cut Line', type: 'make_cut', columnType: 'cut' },
  { id: 'sg', label: 'SG', fullLabel: 'SG Call', type: 'player_benchmark', columnType: 'sg' },
]

/**
 * Compact horizontal prediction table.
 *
 * Props:
 *   players: array of { id, name, headshotUrl, rank, sgTotal }
 *   predictions: array of all user predictions for this event
 *   submitting: string|null — the submit key currently in-flight
 *   onCellTap: (player, predictionType, direction) => void
 *   onPlayerClick: (player) => void — opens PlayerDrawer
 */
export default function CompactSlateTable({
  players,
  predictions,
  submitting,
  onCellTap,
  onPlayerClick,
}) {
  // Build predictions lookup: { `${playerId}_${predType}`: prediction }
  const predLookup = {}
  for (const p of predictions) {
    const key = `${p.subjectPlayerId}_${p.predictionType}`
    predLookup[key] = p
  }

  // Find the current winner pick (tournament_winner is single-pick)
  const winnerPred = predictions.find(p => p.predictionType === 'tournament_winner')
  const winnerPlayerId = winnerPred?.subjectPlayerId

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full border-collapse min-w-[520px]">
        {/* Sticky header */}
        <thead>
          <tr className="border-b border-[var(--card-border)]">
            <th className="sticky left-0 z-10 bg-[var(--surface)] text-left px-2 py-2 text-xs font-semibold text-text-primary/50 w-40 min-w-[10rem]">
              Player
            </th>
            {TABLE_COLUMNS.map(col => (
              <th
                key={col.id}
                className="px-1 py-2 text-center text-[10px] font-semibold text-text-primary/40 uppercase tracking-wider"
                title={col.fullLabel}
              >
                <span className="sm:hidden">{col.label}</span>
                <span className="hidden sm:inline">{col.fullLabel}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map(player => (
            <tr
              key={player.id}
              className="border-b border-[var(--card-border)] last:border-0 hover:bg-[var(--bg-alt)] transition-colors"
            >
              {/* Sticky player column */}
              <td className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-1.5">
                <button
                  onClick={() => onPlayerClick(player)}
                  className="flex items-center gap-2 min-w-0 text-left group"
                >
                  {player.headshotUrl ? (
                    <img
                      src={player.headshotUrl}
                      alt=""
                      className="w-6 h-6 rounded-full shrink-0 object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[var(--bg-alt)] flex items-center justify-center text-text-primary/30 text-[10px] shrink-0">
                      {(player.name || '?').charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm text-text-primary truncate max-w-[7rem] group-hover:text-blaze transition-colors font-medium">
                      {player.name?.split(' ').pop() || player.name}
                    </div>
                    {player.rank && (
                      <div className="text-[10px] font-mono text-text-primary/30">#{player.rank}</div>
                    )}
                  </div>
                </button>
              </td>

              {/* Prediction cells */}
              {TABLE_COLUMNS.map(col => {
                const pred = predLookup[`${player.id}_${col.type}`]
                return (
                  <PredictionCell
                    key={col.id}
                    columnType={col.columnType}
                    prediction={pred}
                    player={player}
                    disabled={submitting != null}
                    onTap={(direction) => onCellTap(player, col.type, direction)}
                    benchmarkValue={col.columnType === 'sg' ? Math.round((player.sgTotal || 0) * 10) / 10 : undefined}
                    isWinnerSelected={col.columnType === 'winner' && winnerPlayerId === player.id}
                  />
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**Step 2: Verify the file was created**

Run: `cat frontend/src/components/predictions/CompactSlateTable.jsx | head -5`

**Step 3: Commit**

```bash
git add frontend/src/components/predictions/CompactSlateTable.jsx
git commit -m "feat: add CompactSlateTable component with sticky header and player column"
```

---

## Task 3: Refactor WeeklySlate — Remove Category Pills, Wire Up Table

**Files:**
- Modify: `frontend/src/pages/ProveIt.jsx` (lines 1-608)

This is the core refactor. We need to:
1. Add import for `CompactSlateTable`
2. Change the prediction lookup to be **all-types** (not filtered to active category)
3. Replace `handleSubmit` to accept `predictionType` as a parameter
4. Add a `handleCellTap(player, predictionType, direction)` that handles the tap cycling logic including:
   - Winner: single-pick (delete old winner if switching)
   - Clear (direction=null): delete prediction
   - New prediction: submit
   - Toggle (changing direction): update existing prediction
5. Remove the `activeCategory` state and category pill picker JSX
6. Remove the 6 per-category render blocks (SG, Winner, Top 5/10/20, Cut)
7. Replace with `<CompactSlateTable>` component
8. Keep H2H and R1 Leader sections below the table
9. Update the tournament header (remove category-specific subtitle)
10. Keep the "My Calls" filter (filter table rows to only players with any prediction)

**Step 1: Update imports at the top of ProveIt.jsx**

At line 7, after the BackYourCall import, add:
```jsx
import CompactSlateTable from '../components/predictions/CompactSlateTable'
```

**Step 2: Remove `activeCategory` state and the category pill picker**

In the WeeklySlate function:
- Remove `const [activeCategory, setActiveCategory] = useState('sg_call')` (line 74)
- Remove the `CATEGORY_HEADERS` constant (lines 54-63) — no longer needed
- The `SLATE_CATEGORIES` constant (lines 43-52) can stay for reference but the category picker JSX (lines 236-252) gets removed

**Step 3: Change the predictions lookup to be all-types**

Replace the current lookup (lines 124-135) which filters by `predType`:

```jsx
// Build predictions lookup — all types, keyed by `${playerId}_${predType}`
const allPredLookup = {}
for (const p of allPredictions) {
  if (p.predictionType === 'head_to_head') {
    allPredLookup[`${p.subjectPlayerId}_${p.predictionData?.opponentPlayerId}_h2h`] = p
  } else {
    allPredLookup[`${p.subjectPlayerId}_${p.predictionType}`] = p
  }
}
```

**Step 4: Replace handleSubmit with handleCellTap**

The new function handles the three cell tap scenarios:

```jsx
const handleCellTap = async (player, predictionType, direction) => {
  if (submitting || !currentTournament) return
  const submitKey = `${player.id}_${predictionType}`
  const existingPred = allPredLookup[submitKey] || allPredictions.find(
    p => p.subjectPlayerId === player.id && p.predictionType === predictionType
  )

  setSubmitting(submitKey)
  try {
    if (direction === null && existingPred) {
      // Clear: delete the prediction
      await api.deletePrediction(existingPred.id)
      setAllPredictions(prev => prev.filter(p => p.id !== existingPred.id))
      track(Events.PREDICTION_SUBMITTED, { sport: 'golf', type: predictionType, action: 'clear', context: 'prove_it_table' })
    } else if (existingPred && direction !== null) {
      // Toggle direction on existing prediction
      const updatedData = { ...existingPred.predictionData, direction }
      if (predictionType === 'player_benchmark') {
        updatedData.direction = direction
      }
      await api.updatePrediction(existingPred.id, { predictionData: updatedData })
      setAllPredictions(prev => prev.map(p =>
        p.id === existingPred.id ? { ...p, predictionData: updatedData } : p
      ))
      track(Events.PREDICTION_SUBMITTED, { sport: 'golf', type: predictionType, direction, action: 'update', context: 'prove_it_table' })
    } else if (direction !== null) {
      // New prediction
      const predictionData = { playerName: player.name }

      if (predictionType === 'player_benchmark') {
        predictionData.metric = 'sgTotal'
        predictionData.benchmarkValue = Math.round(player.sgTotal * 10) / 10
        predictionData.direction = direction
        predictionData.confidence = 'medium'
      } else if (predictionType === 'tournament_winner') {
        // Winner is single-pick — delete previous winner if exists
        const prevWinner = allPredictions.find(p => p.predictionType === 'tournament_winner')
        if (prevWinner) {
          await api.deletePrediction(prevWinner.id)
          setAllPredictions(prev => prev.filter(p => p.id !== prevWinner.id))
        }
      } else {
        predictionData.direction = direction
      }

      const res = await api.submitPrediction({
        sport: 'golf',
        predictionType,
        category: 'tournament',
        eventId: currentTournament.id,
        subjectPlayerId: player.id,
        predictionData,
        isPublic: true,
      })
      setAllPredictions(prev => [...prev, res.prediction || res])
      track(Events.PREDICTION_SUBMITTED, { sport: 'golf', type: predictionType, direction, action: 'new', context: 'prove_it_table' })
      onPredictionMade?.()
    }
  } catch (err) {
    console.error('Prediction failed:', err)
  } finally {
    setSubmitting(null)
  }
}
```

**Step 5: Update the "My Calls" filter**

The `filteredSlate` filter changes from checking `myPredictions[p.id]` (single category) to checking if the player has ANY prediction across all types:

```jsx
const filteredSlate = showMyCalls
  ? slate.filter(p => allPredictions.some(pred => pred.subjectPlayerId === p.id))
  : slate
```

**Step 6: Replace the JSX render section**

Remove:
- Category picker (lines 236-252)
- The per-category conditional blocks for sg_call, winner, top_5/10/20, cut (lines 281-446) — everything between the tournament header and the R1 Leader section

Replace with:
```jsx
{/* Compact prediction table */}
<div className="bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl overflow-hidden mb-4">
  <CompactSlateTable
    players={filteredSlate}
    predictions={allPredictions}
    submitting={submitting}
    onCellTap={handleCellTap}
    onPlayerClick={setDrawerPlayer}
  />
</div>
```

**Step 7: Update the tournament header subtitle**

Change the subtitle from category-specific to generic:
```jsx
<p className="text-text-primary/40 text-sm mt-0.5">
  Tap any cell to make your call. Tap again to change it.
</p>
```

**Step 8: Keep H2H and R1 Leader sections below the table**

The R1 Leader section (lines 448-481) and H2H section (lines 483-598) stay as compact card sections below the table. They should be wrapped in a section:

```jsx
{/* R1 Leader — separate compact section */}
<div className="bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl p-4 mb-4">
  <h4 className="text-xs font-bold text-text-primary/50 uppercase tracking-wider mb-3">
    Round 1 Leader — Who leads after day one?
  </h4>
  {/* Existing R1 Leader rendering with minor style compaction */}
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
    {filteredSlate.slice(0, 12).map(player => {
      const pred = allPredictions.find(p => p.subjectPlayerId === player.id && p.predictionType === 'round_leader')
      const isSelected = !!pred
      return (
        <button
          key={player.id}
          onClick={() => handleCellTap(player, 'round_leader', isSelected ? null : 'pick')}
          disabled={submitting != null}
          className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-all ${
            isSelected
              ? 'bg-crown/15 border border-crown/30 text-crown'
              : 'bg-[var(--bg-alt)] border border-transparent text-text-primary/60 hover:text-text-primary'
          } disabled:opacity-50`}
        >
          {player.headshotUrl ? (
            <img src={player.headshotUrl} alt="" className="w-5 h-5 rounded-full shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-[var(--stone)] text-[8px] flex items-center justify-center shrink-0">
              {(player.name || '?').charAt(0)}
            </div>
          )}
          <span className="truncate text-xs font-medium">{player.name?.split(' ').pop()}</span>
        </button>
      )
    })}
  </div>
</div>

{/* H2H section — keep existing */}
{/* ... existing H2H rendering stays ... */}
```

**Step 9: Commit**

```bash
git add frontend/src/pages/ProveIt.jsx
git commit -m "feat: replace category pills with compact prediction table in WeeklySlate"
```

---

## Task 4: Mobile Polish — Sticky Column, Touch Targets, Scroll Behavior

**Files:**
- Modify: `frontend/src/components/predictions/CompactSlateTable.jsx`
- Modify: `frontend/src/components/predictions/PredictionCell.jsx`

**Step 1: Ensure sticky player column works on mobile**

The `sticky left-0` on the player `<td>` and `<th>` needs a background color that covers the scrolling content. Verify the `bg-[var(--surface)]` class is applied to both the `<th>` and every `<td>` in the player column. Add `z-10` to ensure it sits above scrolling cells.

Also add a subtle right border to the sticky column for visual separation:
```
border-r border-[var(--card-border)]
```

**Step 2: Ensure minimum touch target sizes**

In PredictionCell, verify all button elements have at least `min-w-[36px] min-h-[32px]` (36px touch target per design spec). The current `w-9 h-8` (36px × 32px) meets this. For the SG column with wider content, `min-w-[3.5rem]` (56px) is fine.

**Step 3: Add hover row highlight that doesn't break on mobile**

The `hover:bg-[var(--bg-alt)]` on `<tr>` already handles this. On mobile, ensure the sticky player column also gets the hover background. Add `group` class to `<tr>` and `group-hover:bg-[var(--bg-alt)]` to the sticky `<td>`:

```jsx
<tr className="border-b ... group">
  <td className="sticky left-0 z-10 bg-[var(--surface)] group-hover:bg-[var(--bg-alt)] transition-colors ...">
```

**Step 4: Test scroll behavior**

The table wrapper `overflow-x-auto -mx-4 px-4` allows horizontal scroll on narrow screens. The negative margin + padding trick ensures the table content reaches screen edges on mobile while keeping the outer container padded.

**Step 5: Commit**

```bash
git add frontend/src/components/predictions/CompactSlateTable.jsx frontend/src/components/predictions/PredictionCell.jsx
git commit -m "fix: mobile polish for compact table — sticky column, touch targets, scroll"
```

---

## Task 5: Clean Up Removed Code and Unused State

**Files:**
- Modify: `frontend/src/pages/ProveIt.jsx`

**Step 1: Remove unused imports and state**

After the refactor in Task 3, clean up:
- Remove `activeCategory` state variable (should already be gone)
- Remove `CATEGORY_HEADERS` constant
- Remove the old `myPredictions` lookup (replaced by `allPredLookup` or inline lookups)
- Remove `h2hPlayerA`, `h2hPlayerB` state if H2H keeps its own state internally
- Remove `showBackingFor` and `backingData` state if BackYourCall is deferred (the compact table doesn't inline BackYourCall — users can access thesis via PlayerDrawer or a future inline prompt)
- Keep `handleBackingUpdate` only if BackYourCall is still wired up somewhere

**Step 2: Verify no broken references**

Search the file for any references to `activeCategory`, `activeCat`, `predType`, `myPredictions`, `CATEGORY_HEADERS` to ensure they're all removed or replaced.

**Step 3: Verify the old `handleSubmit` is removed**

It's replaced by `handleCellTap`. Make sure there are no remaining calls to the old `handleSubmit`.

**Step 4: Commit**

```bash
git add frontend/src/pages/ProveIt.jsx
git commit -m "chore: clean up unused state and references after compact table refactor"
```

---

## Task 6: Visual Verification and Edge Cases

**Files:**
- Modify: `frontend/src/components/predictions/PredictionCell.jsx` (if needed)
- Modify: `frontend/src/components/predictions/CompactSlateTable.jsx` (if needed)
- Modify: `frontend/src/pages/ProveIt.jsx` (if needed)

**Step 1: Verify the app builds without errors**

Run: `cd /Users/ericsaylor/Desktop/Clutch/frontend && npm run build`
Expected: Build succeeds with no errors.

**Step 2: Handle edge cases**

1. **No tournament active:** The existing empty state (lines 199-208) already handles this — verify it still renders.

2. **Player with no SG data:** The SG column should show `0.0` or a dash. Check `benchmarkValue` handling in PredictionCell for null/undefined:
```jsx
const displayVal = benchmarkValue != null ? `${sign}${benchmarkValue.toFixed(1)}` : '—'
```

3. **Empty predictions array:** Table should render all empty cells with `·` placeholder. No crash.

4. **Winner single-pick enforcement:** When tapping a new winner, the old winner prediction should be deleted first (handled in `handleCellTap`). Verify the UI updates immediately — the old player's winner cell goes empty, new player shows trophy.

**Step 3: Fix any issues found**

Apply fixes as needed.

**Step 4: Commit**

```bash
git add -A
git commit -m "fix: edge cases in compact table — null SG, empty state, winner toggle"
```

---

## Summary

| Task | What | New/Modified |
|------|------|-------------|
| 1 | PredictionCell component | New: `PredictionCell.jsx` |
| 2 | CompactSlateTable component | New: `CompactSlateTable.jsx` |
| 3 | Refactor WeeklySlate (core) | Modified: `ProveIt.jsx` |
| 4 | Mobile polish | Modified: both new components |
| 5 | Clean up dead code | Modified: `ProveIt.jsx` |
| 6 | Build verification + edge cases | Modified: as needed |

**No backend changes.** All prediction types and API endpoints remain the same. The table calls the same `POST /api/predictions`, `PATCH /api/predictions/:id`, and `DELETE /api/predictions/:id` endpoints.
