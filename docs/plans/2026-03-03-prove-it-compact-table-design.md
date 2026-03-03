# Prove It Compact Table Redesign — Design Document

> **Date:** 2026-03-03
> **Status:** Approved
> **Author:** Eric Saylor + Claude Code (brainstorming session)

---

## Problem

The current Prove It slate shows one prediction type at a time via category pills. Each player takes a full-width row (~80px tall) with only Above/Below buttons. Users see ~5 players before scrolling and must switch between 8 pill categories to make different types of calls. Too many clicks, too little density.

## Solution

Replace the category-pill-driven slate with a **horizontal table** where all prediction types are visible as columns simultaneously. Each player is one compact row (~40-44px). Cells are one-tap to submit. 12-15 players visible without scrolling.

## Design

### Table Structure

```
┌──────────────────────┬────────┬───────┬───────┬───────┬──────┬──────────┐
│ Player               │ Winner │ Top 5 │Top 10 │Top 20 │ Cut  │ SG       │
├──────────────────────┼────────┼───────┼───────┼───────┼──────┼──────────┤
│ [img] Scheffler  #1  │   🏆   │  Yes  │  Yes  │  Yes  │ Make │ Above+2.9│
│ [img] McIlroy    #2  │        │  Yes  │  Yes  │  Yes  │ Make │ Below+2.0│
│ [img] Fleetwood  #3  │        │  No   │  Yes  │  Yes  │ Make │ Above+1.8│
│ [img] Rose       #4  │        │       │  No   │  Yes  │ Miss │ Below+0.9│
│ [img] Morikawa   #5  │        │  Yes  │  Yes  │  Yes  │ Make │ Above+1.6│
└──────────────────────┴────────┴───────┴───────┴───────┴──────┴──────────┘
```

### Tap Behavior (One-Tap Submit)

| Column | Tap 1 | Tap 2 | Tap 3 |
|--------|-------|-------|-------|
| **Winner** | Select as pick (🏆) | Deselect | — |
| **Top 5/10/20** | "Yes" (green) | "No" (red) | Clear |
| **Cut** | "Make" (green) | "Miss" (red) | Clear |
| **SG** | "Above" (green) | "Below" (red) | Clear |

- **Winner** is single-pick only — selecting a new player deselects the previous one
- All other columns allow multiple players
- Each tap immediately submits/updates the prediction via API

### Cell Visual States

| State | Style |
|-------|-------|
| **Empty** (no prediction) | Muted gray, subtle border, tap target |
| **Positive call** (Yes/Above/Make/Pick) | `bg-field/10 text-field border-field` (green tint) |
| **Negative call** (No/Below/Miss) | `bg-live-red/10 text-live-red border-live-red` (red tint) |
| **Resolved correct** | Green background with ✓ |
| **Resolved incorrect** | Red background with ✗ |

### Column Headers

- Sticky at top of scroll area
- Short labels on mobile: `W`, `T5`, `T10`, `T20`, `Cut`, `SG`
- Full labels on desktop: `Winner`, `Top 5`, `Top 10`, `Top 20`, `Cut Line`, `SG Call`
- Light background to separate from data rows

### Row Layout

- Height: ~40-44px
- Tiny headshot: 24px circle
- Player name: truncated if needed, `font-body text-sm`
- OWGR rank: `font-mono text-xs text-[var(--text-3)]`
- SG benchmark value shown inside the SG cell: `+2.9` in `font-mono text-xs`

### H2H and R1 Leader

These prediction types don't fit the table pattern:
- **H2H** requires selecting two players (custom matchup builder)
- **R1 Leader** is a single-pick similar to Winner but round-specific

Keep these as separate mini-sections below the table, styled as compact cards. They're lower-volume prediction types that don't need the same density treatment.

### Mobile Responsiveness

- Table scrolls horizontally on mobile
- Player column is `sticky left` (always visible while scrolling columns)
- First 3-4 columns (Winner, Top 5, Top 10) visible without scroll on most phones
- Touch targets: minimum 36px for cells

### What Stays the Same

- Tournament header (name, dates, field info)
- Coach engagement banner (NeuralCluster + call count messaging)
- "My Calls" filter toggle (filters table rows to only predicted players)
- Total calls counter
- Track Record and Leaderboard tabs are untouched
- BackYourCall thesis prompt (appears inline below table row on selection)

### What Gets Removed

- Category pill picker (all types now visible as columns)
- Full-width player cards (replaced by compact table rows)
- Per-category player lists (unified into single table)

---

## Implementation Scope

### Modified Files
- `frontend/src/pages/ProveIt.jsx` — Replace WeeklySlate rendering section with compact table component. Keep all existing data loading, prediction submission, and state management logic.

### Potentially New Components
- `PredictionCell` — Reusable tappable cell component (handles tap cycling, visual states, submission)
- `CompactSlateTable` — Table wrapper with sticky header, sticky player column, horizontal scroll

### No Backend Changes
- All prediction types, API endpoints, and data structures remain the same
- The table just calls the same `POST /api/predictions` endpoint per cell tap

---

*Design approved 2026-03-03. Next step: implementation plan via writing-plans skill.*
