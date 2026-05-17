# Clutch Decision Capture Spec (Year 1)

> **Status:** Draft v3 · May 16, 2026 (incorporates BIAS_BY_PHASE_MATRIX cross-walk gaps)
> **Owner:** Eric
> **Companion doc:** `BIAS_BY_PHASE_MATRIX.md` (the bias engine this data eventually feeds)

## Philosophy

**Instrument first, model later.** The bias engine is a Year 2+ read layer over a structured decision history. Year 1 is about capturing the right rows in the right shape — so when we turn on coaching, the data is already there.

Every user decision should be persisted as a row with:

1. **Who** (userId, teamId, leagueId, sport)
2. **What** (event type + the player/players/value involved)
3. **When** (timestamp, season, week/tournament context)
4. **Why** (reasonChips[] + free-text, both optional)
5. **State at decision time** (snapshot of inputs the user had — ADP, projection, FAAB remaining, board rank, etc.)
6. **Where the user stood** (`leagueContext` — standings, playoff prob, weekly win prob, roster strength, schedule strength)
7. **What surface they did it on** (`clientVersion`, `surface`)

Points 5–7 are what's mostly missing today. This spec locks them down.

**v3 additions (from BIAS_BY_PHASE_MATRIX cross-walk):** 8 primitives instead of 6 — added `watchlist_event` and `auction_nomination` as standalone primitives because they power Phase 1 + Phase 2 bias detectors (availability bias, narrative bias, loss aversion to "my guy", nomination bias) that the previous 6 primitives can't see. Also expanded `leagueContext` with roster strength + weekly win probability + schedule strength snapshots (Phase 3.3, 5.1, 5.4, 6.2, 7.1, 7.4 detectors). Also added `LINEUP_VIEWED` event for lineup-paralysis detection (Phase 6.5). Also restructured `availablePool` from flat string[] to include tier classification (Phase 2.2). See **§7 + §8 + the expanded envelope** below.

---

## Shared envelope (every captured event)

Every row across all 6 primitives includes this envelope. One source of truth; copy/paste server-side helper.

```ts
type DecisionEnvelope = {
  userId: string
  teamId?: string                // null for mocks/board edits
  leagueId?: string              // null for mocks
  sport: 'golf' | 'nfl'
  occurredAt: DateTime

  // NEW — surface attribution
  clientVersion: string          // e.g. "web-2026.05.16" (set in build)
  surface: string                // 'draft_room' | 'waiver_wire' | 'team_roster' | 'lab_editor' | 'mock_room' | 'prove_it' | 'chop_zone' | ...

  // NEW — league state at decision time (v3 expanded)
  leagueContext?: {
    // standings
    standingsPosition?: int           // 1 = first place
    standingsRecord?: { wins?: int, losses?: int, ties?: int }  // structured, per v2 critique
    standingsRank?: int               // "Nth of M" formatted server-side from rank + leagueSize
    playoffProbability?: float        // 0-1, null if unknown (season-long)
    weeksRemaining?: int              // regular season weeks left
    isInPlayoffs?: boolean
    isEliminated?: boolean

    // v3 — roster strength + matchup context (powers Phase 3.3, 5.1, 5.4, 6.1, 6.2)
    rosterStrengthRank?: int          // 1 = strongest underlying roster in league
    rosterStrengthScore?: float       // 0-100, normalized power-rank
    recordVsStrengthGap?: float       // standingsRank - rosterStrengthRank; positive = unlucky, negative = lucky
    weeklyMatchupWinProb?: float      // 0-1, current-week head-to-head win probability (NFL H2H + golf H2H only)

    // v3 — schedule context (powers Phase 4.4, 5.5, 6.4, 7.2)
    pastScheduleStrength?: float      // 0-100, average opponent strength faced through current week
    rosScheduleStrength?: float       // 0-100, average opponent strength remaining (regular season)
    playoffScheduleStrength?: float   // 0-100, opponent strength weeks 15-17 (NFL playoff weeks)
  }

  // NEW — mock-draft attribution
  isMock: boolean                // false for real-league actions
  mockMeta?: {
    mockDraftId: string
    botPickPct: float            // 0-1, share of picks made by autodrafter
    realParticipantPct: float    // share of seats with a human who completed
    completedFully: boolean      // did the mock reach the final pick?
    qualityTier: 'HIGH' | 'MEDIUM' | 'LOW'  // derived: HIGH = fully human + completed, LOW = mostly bots
  }
}
```

**Why mock-draft attribution matters:** Mocks are useful intent signals but noisy. A solo mock against bots is very different from a mock with 11 real people where 4 drop out by round 3. The bias engine should accept all mock data but downweight LOW-quality mocks heavily. Per Eric: "if you're mocking with real people they tend to be way lazier and leave the draft early so it's not a perfect representation… we can't *not* use the data, we just have to be careful how we do it."

---

## Audit Summary

| Primitive | Model | Exists today | Year 1 additions |
|---|---|---|---|
| **1. Draft pick** | `DraftPick` | `pickTag`, `boardRankAtPick`, `boardId`, `amount` (auction) | Split `pickTag` → `pickIntent` + `pickQuality`; add `timeOnClockMs` + `timeOnClockPctOfMax`; sport-conditional `adpAtPick` / `auctionValueAtPick`; `projectedPtsAtPick`; **`availablePool` now `{playerId, tier}[]` (v3, was `string[]`)**; `reasonChips[]`; envelope |
| **2. Lineup decision** | `LineupSnapshot` | `lineup` Json, free-form `decisionNotes`, `activePoints`, `optimalPoints` | Structured `decisions[]` with per-slot `projectedAtLock` + `reasonChips`; `editCount`; `lastEditedAt`; envelope. **v3:** `LINEUP_VIEWED` PostHog event fires on every lineup-decision UI open (no DB row needed — paralysis signal lives in PostHog only) |
| **3. Waiver / FAAB claim** | `WaiverClaim` + `RosterTransaction` | `bidAmount`, `priority`, 280-ch `reasoning`, `status` | `acquisitionRoute`; `faabRemainingAtBid`; `faabPctAtBid`; `trendingSources[]`; `reasonChips[]`; envelope |
| **4. Trade event** | `Trade` | `proposerReasoning`, `responderReasoning`, JSON player arrays | Snapshot `proposerProjectedValue` at proposal time **and** `responderProjectedValue` at response time (NOT both at proposal); split `declineReason`; both sides' `reasonChips[]`; envelope |
| **5. Naked roster drop** | `RosterTransaction` w/ `type: FREE_AGENT_DROP` | `playerId`, `teamId`, `timestamp` | `reasonChips[]`; free-text `reason`; was-starter flag (`wasOnActiveLineup`); `daysSinceAcquisition`; envelope |
| **6. Watchlist event (v3)** | NEW: `WatchlistEvent` | nothing yet — `WATCHLIST_ADDED` PostHog event exists but no DB primitive | New table. Captures add + remove with `playerId`, `action: 'ADD' \| 'REMOVE'`, `reasonChips[]`, envelope. Powers availability bias, narrative bias, loss aversion to "my guy" — Phase 1.1, 1.4, 2.4 detectors |
| **7. Auction nomination (v3)** | NEW: `AuctionNomination` | nothing — nominations currently aren't tracked as decisions | New table. Captures `playerId`, `nominatedByUserId`, `wasOnNominatorWatchlist`, `openingBid`, `finalPrice` (set after auction resolves), `wasNominatorTarget` (resolved from watchlist + later acquisition). Powers Phase 2.7 (nomination bias). Required for every auction draft — including all golf drafts |
| **8. Reason chips taxonomy** | scattered | Board editor + Prove It have local lists | Shared sport-aware taxonomy used everywhere (covers all 7 primitives above) |

**Frontend `track()` coverage today** (already firing via `analytics.js`):
- ✅ `DRAFT_PICK_MADE` · `DRAFT_AUTO_PICK` · `MOCK_DRAFT_*`
- ✅ `LINEUP_SAVED`
- ✅ `WAIVER_CLAIM` · `FREE_AGENT_PICKUP` (both with `sport`)
- ✅ `TRADE_PROPOSED` · `TRADE_ACCEPTED` · `TRADE_REJECTED` · `TRADE_CANCELLED`
- ⚠️ All currently send `{ leagueId, playerId, ... }` — none include the state snapshot the bias engine needs.

---

## The 8 Event Shapes (Year 1 lock-down)

### 1. `draft_pick_made`

**DB:** `DraftPick` row. **PostHog:** `Events.DRAFT_PICK_MADE`.

```ts
{
  ...DecisionEnvelope,           // includes isMock + mockMeta

  // existing — keep
  draftId: string
  pickNumber: int
  round: int
  playerId: string
  isAutoPick: boolean
  boardRankAtPick?: int
  boardId?: string

  // NEW — split intent from assessment
  pickIntent?: 'PLAN' | 'FALLBACK' | 'PANIC' | 'COUPLED'  // user-tagged at pick time
  pickQuality?: 'STEAL' | 'VALUE' | 'PAR' | 'REACH'       // computed server-side from adp/auction delta

  // NEW — sport-conditional valuation
  adpAtPick?: float              // NFL only — snapshot from ADPEntry
  auctionValueAtPick?: float     // golf + NFL auction — snapshot from ClutchProjection.tradeValue or scoringSystem
  projectedPtsAtPick?: float     // both sports — ClutchProjection.projectedPts at pick time

  // NEW — clock + alternatives
  timeOnClockMs?: int            // ms used before submitting
  timeOnClockPctOfMax?: float    // 0-1, normalized across leagues with different clocks
  availablePool: { playerId: string, tier?: int }[]
                                 // v3: structured to include tier classification at pick time
                                 // ~100-150 entries × ~30 bytes ≈ 5-10KB compressed
                                 // tier is computed from ClutchProjection snapshot — null if no tier model for sport
                                 // Powers Phase 2.2 (tier blindness): "user picked WR2 of tier when WR1 was still available"

  // NEW — reasoning
  reasonChips?: string[]         // shared chip taxonomy
  reasonText?: string            // 280-ch free-text
}
```

**Notes:**
- `pickQuality` is **computed**, not user-claimed. Server compares pick slot to `adpAtPick` (NFL) or `auctionValueAtPick` (golf/auction) and bucket: ≥10-spot gain = STEAL, +3-9 = VALUE, ±2 = PAR, ≤-3 = REACH. Otherwise the bias engine would learn "user thinks they steal" instead of "user actually steals."
- `availablePool` is the full remaining player set, not top-3. Compressed array of IDs only. Enables retroactive "user always passes on QBs in round 2" detection.
- `adpAtPick` vs `auctionValueAtPick` are **mutually exclusive by sport** — golf has no ADP (auction-only); NFL snake has ADP; NFL auction has both. Spec is explicit: golf event has `adpAtPick: null` and the bias engine knows to use `auctionValueAtPick`.

**When it fires:** `POST /api/drafts/:id/pick` success. Extend `backend/src/routes/drafts.js:553-587` with the new snapshots. Mock drafts in `MockDraftRoom.jsx` fire the same event with `isMock: true` + `mockMeta`.

---

### 2. `lineup_decision`

**DB:** `LineupSnapshot` row. **PostHog:** `Events.LINEUP_SAVED` (+ new `Events.LINEUP_PLAYER_BENCHED` for in-flight events if/when we want them).

```ts
{
  ...DecisionEnvelope,

  fantasyWeekId: string

  // existing
  lineup: [{
    playerId: string
    playerName: string
    position: 'ACTIVE' | 'BENCH' | 'IR'
    slot: string
  }]
  activePoints?: float
  benchPoints?: float
  optimalPoints?: float

  // NEW — structured decisions
  decisions: [{
    playerId: string
    action: 'STARTED' | 'BENCHED' | 'MOVED'
    fromSlot?: string
    toSlot?: string
    projectedAtLock: float
    reasonChips?: string[]
    reasonText?: string
  }]

  // NEW — meta
  editCount: int                 // saves before final lock
  lastEditedAt: DateTime
  lockedAt: DateTime
}
```

**When it fires:** every lineup save (not just lock). `POST /api/teams/:id/roster/save-lineup`. Drag-and-drop saves count too.

**v3 addition — `LINEUP_VIEWED` PostHog event:** Fires on every open of the lineup-decision UI for a given week, even when the user makes no edit and doesn't save. PostHog-only, no DB row. Captures `{ leagueId, teamId, fantasyWeekId, viewDurationMs, openedSlots: string[] }`. Powers Phase 6.5 (lineup paralysis): "user opened lineup 5+ times for same slot without committing." DB-side, we can derive paralysis from `editCount + lastEditedAt` already — the view event just adds the "looked but didn't touch" signal.

**Lineup table size note:** ONE `LineupSnapshot` row per `(teamId, fantasyWeekId)`, mutated in place. `editCount` increments on each save. Do NOT create a new row per save — table will balloon.

---

### 3. `waiver_or_fa_claim`

**DB:** `WaiverClaim` (FAAB/priority) or `RosterTransaction` w/ `type: FREE_AGENT_ADD` (instant). **PostHog:** `Events.WAIVER_CLAIM` or `Events.FREE_AGENT_PICKUP`.

```ts
{
  ...DecisionEnvelope,

  playerId: string
  acquisitionRoute: 'WAIVER_FAAB' | 'WAIVER_PRIORITY' | 'FREE_AGENT'
  bidAmount?: float              // null for FA + priority
  priority?: int                 // null for FAAB
  dropPlayerId?: string

  // existing
  reasoning?: string             // 280-ch (legacy free-text — keep for back-compat)

  // NEW
  faabRemainingAtBid?: float
  faabPctAtBid?: float           // bid / (faabRemaining + bid)
  trendingSources?: string[]     // ['sleeper'], ['clutch'], or both — vendor-neutral
  trendingRank?: int             // 1-N if on any list, null otherwise
  reasonChips?: string[]
}
```

**Pushed to Year 2:** `oppLostStarter` (requires cross-team roster scan at write time — expensive query, harvest later from `RosterTransaction` history).

---

### 4. `trade_event`

**DB:** `Trade` row, mutated through proposal → response. **PostHog:** existing `TRADE_*` constants.

```ts
{
  ...DecisionEnvelope,

  tradeId: string
  initiatorTeamId: string
  receiverTeamId: string

  // existing
  senderPlayers: string[]
  receiverPlayers: string[]
  senderPicks?: Json
  receiverPicks?: Json
  proposerReasoning?: string
  responderReasoning?: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED'

  // NEW — value snapshots at the moment each side decides
  proposerProjectedValue?: float    // snapshot at proposal
  responderProjectedValue?: float   // snapshot at response (NOT at proposal — values drift)

  proposerReasonChips?: string[]
  responderReasonChips?: string[]

  // NEW — granular decline taxonomy
  declineReason?:
    | 'VALUE'
    | 'POSITIONAL_NEED'
    | 'DISTRUST_OFFERER'
    | 'PROTECTING_LEAD'
    | 'DISLIKE_PLAYER'
    | 'OTHER'
}
```

**When it fires:**
- Proposal: `POST /api/trades` — snapshot `proposerProjectedValue` only.
- Response: `PATCH /api/trades/:id` — snapshot `responderProjectedValue` from a fresh ClutchProjection read at response time.

---

### 5. `roster_drop` (naked drop)

**DB:** `RosterTransaction` w/ `type: FREE_AGENT_DROP` and no paired add. **PostHog:** new `Events.PLAYER_DROPPED` (constant already exists in `analytics.js:142`).

```ts
{
  ...DecisionEnvelope,

  playerId: string
  wasOnActiveLineup: boolean       // were they starting at time of drop?
  daysSinceAcquisition: int        // how long held before dropping
  acquisitionType?: 'DRAFTED' | 'TRADED' | 'WAIVER' | 'FREE_AGENT'  // how they came onto roster
  reasonChips?: string[]
  reasonText?: string              // 280-ch
}
```

**Why this is its own primitive:** A naked drop is more revealing than a paired add/drop. It shows what the user is willing to walk away from with no replacement lined up. Especially informative when `wasOnActiveLineup === true` (giving up a starter) or `acquisitionType === 'DRAFTED'` (cutting a draft pick — sunk-cost violation).

---

### 6. `watchlist_event` (v3 — new primitive)

**DB:** new `WatchlistEvent` table. **PostHog:** `Events.WATCHLIST_ADDED` (already exists per `analytics.js`) + new `Events.WATCHLIST_REMOVED`.

```ts
{
  ...DecisionEnvelope,

  playerId: string
  action: 'ADD' | 'REMOVE'

  // state at decision time
  adpAtAction?: float            // ADP snapshot — captures "added during ADP rise"
  projectedPtsAtAction?: float
  contentVelocityAtAction?: int  // optional — mentions in fantasy media in last 7 days (Year 2: requires external feed)
  watchlistSizeBefore?: int      // how many players were already on watchlist
  isMockTarget?: boolean         // did user just draft this player in a recent mock?

  // why
  reasonChips?: string[]
  reasonText?: string
}
```

**Why this is its own primitive:** Three Phase 1 + Phase 2 bias detectors are dead without watchlist visibility:
- **1.1 Availability bias** — "user adds the player everyone is talking about" requires watchlist + content velocity
- **1.4 Narrative bias** — "user added 3 players from the bounce-back narrative team" requires watchlist additions clustered by team
- **2.4 Loss aversion to 'my guy'** — "player was on user's OR another team's watchlist" requires both this primitive AND cross-team visibility

Currently `WATCHLIST_ADDED` fires to PostHog but no DB row exists. New table is required because the bias engine needs to query "all watchlist actions for user X across all leagues over all time."

**When it fires:**
- `POST /api/users/:id/watchlist` (add) — currently fires PostHog event, needs DB write
- `DELETE /api/users/:id/watchlist/:playerId` (remove) — also currently lossy

**Schema notes:** `contentVelocityAtAction` is the Year-2 external-data dependency (podcast / Twitter / fantasy-media mention counts). Capture it as null in v1; backfill the column when the content velocity pipeline ships. The bias engine treats null as "we didn't know yet" — appropriate for "missing not at random" handling.

---

### 7. `auction_nomination` (v3 — new primitive)

**DB:** new `AuctionNomination` table. **PostHog:** new `Events.AUCTION_NOMINATION`.

```ts
{
  ...DecisionEnvelope,

  draftId: string                // joins to existing Draft
  nominatedByUserId: string      // who nominated (the bias subject)
  playerId: string
  openingBid: float              // nominator's opening bid (often $1)
  nominationOrderIndex: int      // 1st nomination of the auction = 1, etc.

  // state at decision time
  wasOnNominatorWatchlist: boolean  // CRITICAL signal — nominating own target leaks info
  remainingBudgetAtNom?: float      // dollars left for nominator
  remainingRosterSlotsAtNom?: int   // slots left to fill
  marketValueAtNom?: float          // ClutchProjection.auctionValue snapshot

  // resolved later (when auction completes)
  finalPrice?: float             // back-filled when player is acquired
  acquiredByUserId?: string      // who actually won them
  wasNominatorTarget?: boolean   // derived: wasOnNominatorWatchlist AND acquiredByUserId === nominatedByUserId

  reasonChips?: string[]
  reasonText?: string
}
```

**Why this is its own primitive:** Phase 2.7 (nomination bias) is the most studied auction bias and has a clean behavioral signature — "user nominates players they want, signaling preferences to the room, inflating their own cost." Cannot be inferred from draft pick data alone because nominations and final purchases are separate decisions. **Every Clutch golf draft is auction-only**, so this primitive is mandatory for golf leagues (not nice-to-have).

**When it fires:** new endpoint when a player is nominated mid-auction. Likely `POST /api/drafts/:id/nominate`. Existing draft engine sets aside the nominated player + opens bidding window; nomination event captures the "who, what, when, was it on their watchlist" snapshot at that moment.

**Back-fill pass:** After auction completes (or player resolves), update `finalPrice`, `acquiredByUserId`, `wasNominatorTarget`. Single batch update at draft-complete.

**Edge case:** if nomination doesn't resolve (e.g., draft abandoned), `finalPrice` and `acquiredByUserId` stay null. Bias engine treats these as inconclusive.

---

### 8. Shared `reasonChips` taxonomy

One sport-aware taxonomy used by all 5 event types above.

```ts
// frontend/src/constants/reasonChips.js (new file)
export const REASON_CHIPS = {
  shared: [
    'Gut feel',
    'Hot streak',
    'Slumping',
    'News-driven',
    'Coach said',
    'Roster construction',   // positional need, scarcity, balance
  ],
  golf: [
    'Course fit',
    'Recent form',
    'Major prep',
    'SG model',
    'Weather',
    'Field weakness',        // weak field = more likely to contend
    'Cut probability',
  ],
  nfl: [
    'Matchup',
    'Volume',
    'Game script',
    'Weather',
    'Injury return',
    'Bye coverage',
    'Stack',                 // QB + WR same team
    'Bring-back',            // correlation against opponent
  ],
}

export function chipsForSport(sport) {
  return [...REASON_CHIPS.shared, ...(REASON_CHIPS[sport] || [])]
}
```

Every event field of shape `reasonChips?: string[]` validates against `chipsForSport(sport)` server-side. Unknown chips dropped. Optional everywhere — null is itself a signal (declined to explain).

**Migration impact:** new columns + new tables
- `DraftPick.reasonChips Json?` + `reasonText` + v3 `availablePool Json` (structured `{playerId, tier?}[]`)
- `LineupSnapshot.decisions Json?` (structured) — keep legacy `decisionNotes` for back-compat
- `WaiverClaim.reasonChips Json?` (alongside existing `reasoning`)
- `Trade.proposerReasonChips Json?` + `Trade.responderReasonChips Json?`
- `RosterTransaction.reasonChips Json?` + `reasonText`
- **v3:** new `WatchlistEvent` table (primitive 6) — fields per §6 above
- **v3:** new `AuctionNomination` table (primitive 7) — fields per §7 above

**Important migration discipline:** All new columns added as **nullable** (no `NOT NULL DEFAULT`). The `DraftPick` table is already large; a `NOT NULL` migration with backfill would lock Railway for minutes. Existing rows get null for new fields and are simply unavailable to the bias engine — exactly the "missing not at random" treatment the engine expects.

---

## Mock drafts: capture, but downweight

Per the philosophy: mocks ship with `isMock: true` and full `mockMeta`. The bias engine **must** treat them as a separate (lower-weight) signal.

Heuristic for `mockMeta.qualityTier`:

| Tier | Criteria |
|---|---|
| `HIGH` | `realParticipantPct ≥ 0.8` AND `completedFully === true` AND `botPickPct ≤ 0.15` |
| `MEDIUM` | `realParticipantPct ≥ 0.5` AND `completedFully === true` |
| `LOW` | Everything else (solo-vs-bots, abandoned mocks, late-round bot-fests) |

In Year 2, bias engine weights: real picks = 1.0, HIGH mocks = 0.5, MEDIUM mocks = 0.25, LOW mocks = 0.05 (still capture, but barely move the needle). Tunable.

---

## Retroactive backfill from imports

Item 202 (Retroactive Rating Reveal at Import) is the silent dependency. When Sleeper / ESPN / Yahoo / Fantrax / MFL import a user's prior seasons, which fields of the 5 event shapes can be backfilled?

| Field | Sleeper | ESPN | Yahoo | Fantrax | MFL |
|---|---|---|---|---|---|
| Draft pick player + round + timestamp | ✅ | ✅ | ✅ | ✅ | ✅ |
| `timeOnClockMs` | partial (timestamps between picks) | ❌ | ❌ | ❌ | ❌ |
| `adpAtPick` / `auctionValueAtPick` | recoverable from historical ADP tables | recoverable | recoverable | recoverable | recoverable |
| `availablePool` at pick | computable from pick order | computable | computable | computable | computable |
| `pickIntent` / `reasonChips` | ❌ forward-only | ❌ | ❌ | ❌ | ❌ |
| Lineup decisions per week | ✅ (lineup snapshots) | ✅ | ✅ | partial | partial |
| `projectedAtLock` | ❌ (projections weren't snapshotted) | ❌ | ❌ | ❌ | ❌ |
| Waiver/FA claims + amounts | ✅ | ✅ | ✅ | ✅ | ✅ |
| `faabRemainingAtBid` | computable from transaction history | computable | computable | computable | computable |
| `trendingSources` | ❌ forward-only (Sleeper trending API has no history endpoint) | ❌ | ❌ | ❌ | ❌ |
| Trades + players involved | ✅ | ✅ | ✅ | ✅ | ✅ |
| Trade `*ProjectedValue` snapshots | ❌ forward-only | ❌ | ❌ | ❌ | ❌ |
| Decline reasons / reasoning | ❌ forward-only | ❌ | ❌ | ❌ | ❌ |
| `leagueContext` at decision time | computable from final standings + week | computable | computable | computable | computable |

**Forward-only fields** (any free-text or chip the user provides, plus any vendor data with no history endpoint) cannot be backfilled. Bias engine in Year 2 must treat these as "missing not at random" — older decisions intrinsically have less context.

**Computable fields** (ADP, available pool, FAAB remaining, standings position) require import scripts to do the work, but the data exists. Item 202 sprint should add a `decisionBackfill.js` service that runs after the existing importers and fills these fields per primitive.

---

## Year 1 Build Order

| Phase | Scope | Deliverable |
|---|---|---|
| **A. Schema + chips** | Migrations for new columns + 2 new tables (WatchlistEvent, AuctionNomination); ship `reasonChips.js`; envelope helper with expanded `leagueContext` | 1 migration, 2 new files |
| **A.1 — `leagueContext` snapshot service (v3)** | Build `leagueContextService.js` that computes roster strength, weekly win prob, schedule strength on demand for embedding into envelope. Cached per (leagueId, week). | 1 service file |
| **B. Write path** | Server routes snapshot new fields. Frontend `track()` calls add envelope + state. | **7 PRs, one per primitive** (draft pick, lineup, waiver/FA, trade, drop, watchlist, nomination) |
| **C. Mock attribution** | `MockDraftRoom.jsx` computes `mockMeta.qualityTier`; mocks fire same event with `isMock: true` | 1 PR |
| **D. Shadow read service** | `decisionHistoryService.js` joins all 7 sources into a unified view per user. No UI. | 1 service file |
| **E. Backfill from imports** | Extend each importer with a backfill pass over computable fields | 5 importer updates |
| **F. Validation** | After 1 real draft + 4 NFL weeks, audit 50 rows per primitive. Confirm snapshot fields populate when expected. | 1 audit script |
| **G. Year 2** | Bias engine reads from shadow view. Coaching surfaces opt-in. User data export endpoint. Content velocity ingestion. Coach intervention attribution (followed / ignored / partial). | Out of scope. |

---

## What we explicitly are NOT building in Year 1

- ❌ Bias engine / coaching UI surfaces
- ❌ Real-time intervention prompts
- ❌ User-facing decision journal export (Year 2)
- ❌ Cross-league pattern detection
- ❌ `oppLostStarter` (waivers) — Year 2
- ❌ Live "decision quality" badges
- ❌ Auto-generated "your tendencies" reports
- ❌ **Coach intervention attribution** (`user_response_to_coach: followed | ignored | partial`) — required by `BIAS_BY_PHASE_MATRIX` decision record but cannot exist until coach interventions exist. Year 2.
- ❌ **Content velocity / external media mention ingestion** — required by 1.1 availability bias + 1.4 narrative bias, but is a separate data pipeline (podcasts, Twitter, fantasy media) not a capture concern. Year 2 infra.
- ❌ **Decision-skipped events** (e.g., user viewed waiver page, didn't bid on trending player) — impression tracking, deferred to Year 2.

All of these become possible once the 8 primitives are captured cleanly. None are needed to start capturing.

---

## Dependencies on `ClutchProjection` (v3 audit)

The bias matrix demands two things from `ClutchProjection` that we should verify exist or add:

1. **Rest-of-season (ROS) projection distinct from trade value.** Phase 5.2 (loss aversion in trades) needs to compare "ROS projection of give-side" vs "ROS projection of receive-side." If `ClutchProjection.tradeValue` collapses ROS + current-form into one number, we lose that ability. **Action:** verify `ClutchProjection` exposes both `currentTradeValue: float` and `rosProjectedPts: float` (or equivalent). If not, add a column.
2. **Projection variance / uncertainty per player.** Phase 2.5 (late-round caution) needs to identify "high-variance upside" vs "low-floor safety" picks. Requires the projection model to expose an uncertainty estimate (std dev, p10/p90 bands, or similar). **Action:** verify `ClutchProjection` has a `variance` or `floorCeiling` field. If not, add one — even a coarse bucket (`riskTier: 'LOW' | 'MED' | 'HIGH'`) is enough to power v1 detectors.

These are model-side, not capture-side, but the capture spec depends on both. Flag for the projections team / cron owner before Phase B kicks off.

---

## Open questions

1. **Free agent vs waiver split** — keep separate models (current). Different fields, no value in merging.
2. **Slot-level lineup events** — fire one batched `lineup_decision` per save with `decisions[]` array. Per-slot PostHog events only if Year 2 bias engine needs them in stream form.
3. **`availablePool` size cap** — uncapped for snake (~150 IDs ≈ 5 KB compressed); capped at remaining-roster-eligible for auction (irrelevant IDs filtered out).
4. **`clientVersion` source** — Vite injects build hash at build time. Backend stamps its own version when writing without a client-supplied value.
5. **PostHog vs DB redundancy** — both. PostHog for funnel/cohort analysis; DB is the source of truth for the bias engine.

---

*This spec is the gate: any new decision surface (NFL waiver page, weekly start/sit modal, lineup builder, etc.) must conform to these shapes before shipping. Pre-launch NFL items 187/195/202 should all snapshot-test against this doc.*

**Chopped format note (May 17 2026):** `chop_zone` is now a recognized `surface` value, emitted by `/leagues/:id/chop` and the LeagueHome embed widget. **For v1, the `ChopEvent` table is the canonical decision-capture audit for elimination events** — one row per chop with `triggerType` (`manual` | `auto_fallback`), `triggeredByUserId`, `safePercent`, `tiebreakerUsed`, and free-text `reasoning`. Per-player `RosterTransactions` are **NOT** written when a chopped roster releases to waivers; the downstream FAAB pickups are captured through the existing `waiver_or_fa_claim` primitive. Revisit roster-release transaction logging when the Bias Engine starts consuming this data (Year 2).

---

## v3 changelog (May 16, 2026)

Cross-walked the spec against every bias detector in `BIAS_BY_PHASE_MATRIX.md`. 25 of 32 detectors were already covered by v2's 6 primitives. The 7 gaps below were addressed in v3:

| Gap | Biases blocked | v3 fix |
|---|---|---|
| Watchlist add/remove not captured | 1.1 Availability, 1.4 Narrative, 2.4 Loss aversion to "my guy" | New primitive #6 `watchlist_event` |
| Auction nominations not captured | 2.7 Nomination bias (every golf draft) | New primitive #7 `auction_nomination` |
| Roster strength / power rank not in envelope | 3.3 Loss chase, 5.1 Status quo, 5.4 Standings myopia | Added `rosterStrengthRank` + `rosterStrengthScore` + `recordVsStrengthGap` to `leagueContext` |
| Weekly matchup win prob not snapshotted | 6.2 Risk-shift, 7.1 Ceiling chasing, 7.4 Risk-reward inversion | Added `weeklyMatchupWinProb` to `leagueContext` |
| Schedule strength not snapshotted | 4.4 Schedule blindness, 5.5 ROS schedule, 6.4 Playoff schedule | Added `pastScheduleStrength` + `rosScheduleStrength` + `playoffScheduleStrength` to `leagueContext` |
| Tier classification not in `availablePool` | 2.2 Tier blindness | Restructured `availablePool` from `string[]` to `{ playerId, tier? }[]` |
| Lineup view events not tracked | 6.5 Lineup paralysis | New PostHog event `LINEUP_VIEWED` (no DB row) |

Net: 6 primitives → 8, envelope `leagueContext` grew by 7 fields, one event added.

5 detectors remain Year-2-dependent on external infra (not capture gaps):
- 1.1 Availability + 1.4 Narrative — need content velocity / external media mention pipeline
- 3.2 Endowment effect — needs decision-skipped event impressioning (Year 2)
- All "user_response_to_coach" attribution — requires coach interventions to exist first

Also flagged 2 `ClutchProjection` model dependencies (ROS projection split from trade value, projection variance/uncertainty band) that need the projections team's attention before Phase B starts.
