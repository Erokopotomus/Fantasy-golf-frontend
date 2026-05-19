# Mock Draft Prep-Aesthetic Rebuild — Design

**Date:** 2026-05-19
**Status:** Approved, ready for implementation plan
**Author:** Claude Code (brainstorming with Eric)

## Goal

Bring the existing Mock Draft surfaces (Lobby / Room / Recap) up to the editorial × Topps annual aesthetic shipped with the NFL Prep Hub (Phase 5H), and swap the room's data source from stale 2024 actuals to the freshly-populated `NflPlayerProjection` table (Sleeper consensus + FFC ADP).

## Why now

Audit found all three Mock Draft surfaces are pre-Wave-1 Aurora-era — 80+ `gold` token uses in `MockDraftRoom.jsx`, zero `font-editorial`, no broadcast masthead, no team-color washes. Surfacing them from the Prep hub without a refresh would feel like a portal into the old app. Worse: the room labels its player list "LIVE DATA" while actually serving last-year aggregated `NflPlayerGame` totals — Phase 5H specifically populated `NflPlayerProjection` to unblock this and it's sitting unused.

## Constraint

**Presentation + data only.** The 2887-line `MockDraftRoom.jsx` is a working draft state machine — timer, pick handling, snake order, auction nomination, my-team accounting all stay byte-for-byte identical. Touching draft logic while reskinning is how we regress a live feature.

## Design decisions (resolved during brainstorm)

1. **Aesthetic scope:** sport-neutral "Lab draft" vocabulary (Bricolage display, Instrument Serif italic pull quotes, blaze accents, dark slate masthead). NFL gets team-color overlays as a sport-specific layer; golf will get its own overlay when DataGolf surfaces get their turn.
2. **Scoring format toggle:** lobby-only. Locked at draft start. Room shows a read-only format pill in the masthead. Recap respects the locked format (fixes the `MockDraftRecap.jsx:88` `'ppr'` hardcode bug).
3. **Default sort in the draft room:** ADP ascending. Sort toggle next to position filters flips to projected points descending.
4. **Nav placement:** `/lab/mock-draft` as top-level Lab sibling. PrepHub adds a CTA tile linking out. Mock Draft does NOT live inside `PrepSectionNav` — Prep is explicitly NFL-only, and Mock Draft has to work for golf too.
5. **Team-color depth (NFL):** medium. 2-3px left-border accent on each available-player row in their team's primary color. My-team panel header washes in a blend of drafted-team colors. Position chips stay generic. Reads as Prep-family at a glance without overwhelming a 200-row player list.

## Architecture

Three surfaces migrate in one PR. New routes:

- `/lab/mock-draft` (lobby, was `/mock-draft`)
- `/lab/mock-draft/room` (room, was `/mock-draft/room`)
- `/lab/mock-draft/recap/:id` (recap, was `/mock-draft/recap/:id`)

Old `/mock-draft/*` paths redirect to preserve any in-flight session links.

New shared directory `frontend/src/components/lab-draft/` holds primitives reused across surfaces. Backend gets one new endpoint that serves the draftable pool from `NflPlayerProjection`; legacy `getNflPlayers` stays in place for non-draft surfaces.

## Components

New (in `frontend/src/components/lab-draft/`):

- **`LabDraftMasthead.jsx`** — Dark slate broadcast ticker matching `PrepHub`. Props: `title`, `subtitle`, `format`, `backHref`. Compact variant for the room (lives in `h-[calc(100vh-64px)]`).
- **`FormatPill.jsx`** — Read-only pill, `font-mono text-[10px] uppercase tracking-[0.22em]`, blaze accent.
- **`FormatToggleGroup.jsx`** — 3-button lobby toggle. Replaces existing scoring buttons in `MockDraft.jsx:235-258`.
- **`PlayerRowAccent.jsx`** — Available-player row with team-color left-border accent.
- **`MyTeamPanel.jsx`** — User's drafted-team panel; header washes in a `teamBlend()` of drafted players' team colors.
- **`SortToggle.jsx`** — ADP / Projected two-button toggle.
- **`teamColorHelpers.js`** — `teamPrimary(abbr)`, `teamSecondary(abbr)`, `teamBlend(abbrs[])`. Wraps existing `frontend/src/utils/nflTeamColors.js`.

Modified (chrome only, no logic):

- `MockDraft.jsx` — replace gold tokens, swap to `LabDraftMasthead` + `FormatToggleGroup`.
- `MockDraftRoom.jsx` — replace header bar (`:1531-1665`) with compact masthead, swap player list to `PlayerRowAccent`, swap my-team panel to `MyTeamPanel`, swap data fetch (`:655`) to new endpoint. **Draft state machine untouched.**
- `MockDraftRecap.jsx` — replace header with masthead, swap gold tokens, fix `'ppr'` hardcode at `:88`.

## Data flow

**Backend** — new route `GET /api/nfl/draft-players?scoring=half_ppr` in `backend/src/routes/nfl.js`:

```sql
SELECT player + projection + team
FROM NflPlayerProjection
JOIN Player ON projection.playerId = player.id
LEFT JOIN NflTeam ON player.nflTeamAbbr = team.abbreviation
WHERE projection.season = currentYear
  AND projection.source = 'sleeper_consensus'
  AND projection.scoringType = :scoring
ORDER BY projection.adp ASC NULLS LAST, projection.projectedPoints DESC
```

Returns `{ id, name, position, teamAbbr, teamPrimaryColor, teamSecondaryColor, adp, projectedPoints }`. No 2024-actuals fallback — undrafted = undraftable, matching how real fantasy platforms work.

**Frontend** — `api.getDraftPlayers({ sport: 'NFL', scoring })` replaces `api.getNflPlayers({ scoring })` for Mock Draft only. Lobby validates pool size; if < 50 players, blocks draft start with an error banner.

**ADP-null** — players with null ADP sort to the bottom of the ADP view, float up in the projected-points view.

**Recap** — pulls `mock.scoring` (already persisted) and passes to import-to-board flow.

## Error handling

- **Empty pool** — banner: "Mock draft data is being refreshed — please try again in a few minutes." Log to silent error capture.
- **Backend route failure** — show same banner. Don't fall back to `getNflPlayers` silently.
- **Missing team color** — `teamPrimary(abbr)` returns blaze fallback.
- **Recap import with scoring mismatch** — prompt user before importing, don't silently miscompute values.
- **Mid-draft disconnect** — out of scope. Draft state machine handles its own resilience.

## Testing

- **Manual smoke test (before/after)** — full snake mock + full auction mock, desktop + iPhone 14 viewport (390px). Verify timer / pick advance / nomination / my-team / recap / import-to-board.
- **Backend route test** — one Jest/Vitest spec for `GET /api/nfl/draft-players`: returns sorted pool of expected size, includes team colors, excludes null-projection rows.
- **Visual diff** — screenshot all three surfaces desktop + mobile after migration, compare to `PrepHub` by eye.
- **No new unit tests for chrome components** — presentational, tested implicitly by smoke test.
- **Draft state machine** — out of scope. Not touching it; not re-verifying it.

## Out of scope

- Golf mock draft chrome refresh (deferred to a separate pass — different data layer).
- Splitting `MockDraftRoom.jsx` (2887 lines). Tempting, but it's working code and splitting it would risk the draft state machine.
- Visual regression tooling.
- Adding component tests for `<LabDraftMasthead>` etc.

## References

- Audit: subagent UI/UX audit, May 19 conversation
- Prep aesthetic source: `frontend/src/pages/PrepHub.jsx`, `PrepTeams.jsx`, `PrepChanges.jsx`, `components/prep/PrepSectionNav.jsx`, `components/prep/KickoffCountdown.jsx`
- Data source: `NflPlayerProjection` table (Phase 5H, migration 54). Populated by `nflProjectionSync.js` (Sleeper) + `ffcAdpSync.js` (FFC, shipped same-day as this design).
- Existing files: `frontend/src/pages/MockDraft.jsx`, `MockDraftRoom.jsx`, `MockDraftRecap.jsx`
