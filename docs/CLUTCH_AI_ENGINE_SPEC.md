# CLUTCH AI ENGINE — Comprehensive Build Specification

> **Purpose:** This is the master spec for the Clutch AI Engine. It replaces the previous Phase 6 plan. Claude Code should read this document in full before writing any code. Every section includes the WHY, the WHAT, and the HOW. Follow the implementation order exactly — each phase depends on the one before it.
>
> **Generated:** February 10, 2026
> **Author:** Eric + Claude Opus (strategic planning session)
> **Status:** APPROVED — Ready for implementation

---

## THE CORE PHILOSOPHY (Read This First)

The AI is NOT a feature. It is the invisible nervous system of the platform.

Every other fantasy platform helps you research players and manage rosters. Clutch is the only platform that captures your ENTIRE decision process — what you thought, why you thought it, what you did, and what happened — and then uses that history to help you get better.

The AI does not live on its own page. There is no "AI tab." The intelligence is woven through every existing feature, making each one smarter. Users should feel like Clutch *knows them* — not because they asked it questions, but because it's been quietly watching their patterns and connecting dots they can't see themselves.

### The Decision Loop

Every feature on Clutch serves one or more stages of this loop:

```
THINK → RESEARCH → DECIDE → RECORD → EXECUTE → AUDIT → IMPROVE
  │         │          │         │         │         │         │
  │         │          │         │         │         │         └─ AI coaching
  │         │          │         │         │         └─ Draft grades, prediction accuracy
  │         │          │         │         └─ Drafts, lineups, waivers, trades
  │         │          │         └─ Captures, journal, reason chips, thesis
  │         │          └─ Board rankings, tags, cheat sheets
  │         └─ Player profiles, stats, news, projections
  └─ Feed cards, scout reports, nudges
```

The AI Engine powers the AUDIT and IMPROVE stages — but it also enhances THINK (smarter feed), DECIDE (contextual nudges), and RECORD (prompting users to capture reasoning).

### Three Modes of AI Operation

| Mode | Name | Trigger | Cost Model | Tier |
|------|------|---------|------------|------|
| Mode 1 | Ambient Intelligence | Background schedule + user actions | Low (batch, cached) | Free |
| Mode 2 | Contextual Coaching | User performs specific actions | Medium (on-demand, short) | Premium |
| Mode 3 | Deep Coaching | User requests analysis | High (long-form, comprehensive) | Premium |

### The Decision Graph (Core Data Concept)

The Decision Graph is the per-user data structure that connects every action to every other action for a given player or season. It is NOT a separate database — it's a query pattern that stitches together existing tables:

```
For User X + Player Y, the Decision Graph includes:
├── Lab Captures mentioning Player Y (with dates, sentiment, content)
├── Watch List additions/removals for Player Y (with dates)
├── Draft Board entries for Player Y (rank changes over time, tags, reason chips, notes)
├── Draft picks of Player Y (round, amount, pick tag, board rank at time of pick)
├── Lineup decisions involving Player Y (starts, benches, with any notes)
├── Waiver/Trade actions involving Player Y (with reasoning notes)
├── Predictions involving Player Y (thesis, outcome, accuracy)
└── Player Y's actual performance data (stats, fantasy points, outcomes)
```

This graph tells the STORY of a user's relationship with a player. The AI reads this story and finds patterns.

---

## IMPLEMENTATION ORDER

```
Phase 6A: Data Gap Fixes (NO AI, NO Claude API)
    ↓
Phase 6B: Decision Graph + Pattern Engine (Backend services, NO Claude API)
    ↓
Phase 6C: AI Foundation + Ambient Intelligence (Claude API + Mode 1)
    ↓
Phase 6D: Contextual Coaching (Mode 2)
    ↓
Phase 6E: Deep Coaching Reports (Mode 3)
    ↓
Phase 6F: Scout Reports + Sim (Content layer)
```

DO NOT skip phases. DO NOT start Phase 6C before 6A and 6B are complete. The AI is only as smart as the data it has access to.

---

## PHASE 6A: DATA GAP FIXES

**Goal:** Fill the gaps in the decision loop so every user action captures both the WHAT and the WHY. No AI code. No Claude API. Pure schema changes, UI additions, and data connections.

**Why this comes first:** The AI Engine needs rich decision history to be useful. Right now, several features capture outcomes but not reasoning. Fixing this first means the AI has better data from day one.

### 6A-1: Prediction Thesis Field

**Problem:** When a user makes a prediction in Prove It, only the prediction itself is stored (player, type, outcome). There's no record of WHY they made the prediction. When it resolves as wrong, the AI can't tell them what their reasoning error was.

**Schema change — modify Prediction model:**
```prisma
model Prediction {
  // ... existing fields ...
  thesis         String?    @db.VarChar(280)  // Why the user believes this (optional, 280 chars like a tweet)
  confidenceLevel Int?      // 1-5 scale, optional
  keyFactors     Json?      // Array of quick-tap factor tags (see below)
}
```

**Key Factors tag options (store as JSON array of strings):**
```
MATCHUP, TRENDING_UP, TRENDING_DOWN, INJURY_RELATED, WEATHER,
COACHING_CHANGE, TARGET_SHARE, USAGE_INCREASE, REVENGE_GAME,
CONTRACT_YEAR, ROOKIE_BREAKOUT, AGING_DECLINE, SCHEDULE_SPOT,
DIVISIONAL_GAME, PRIME_TIME, GUT_FEELING, COMMUNITY_CONSENSUS,
CONTRARIAN, HISTORICAL_PATTERN, RECENT_FILM
```

**Frontend changes — modify prediction submission flow:**
- After the user selects their prediction type and target, show an OPTIONAL "Back your call" section:
  - Thesis text input (placeholder: "Why do you believe this? Optional but helps your future self...")
  - Confidence slider (1-5, default hidden, tap to reveal)
  - Key factor chips (quick-tap, multi-select, same UX pattern as reason chips on draft boards)
- This section should be collapsible/skippable — NEVER block submission
- On prediction resolution cards, if thesis exists, show it: "Your reasoning: [thesis]" with the outcome overlay
- Visual treatment: thesis text in italics, slightly muted, with a small brain/thought icon

**Migration 27: prediction_thesis**
```sql
ALTER TABLE "Prediction" ADD COLUMN "thesis" VARCHAR(280);
ALTER TABLE "Prediction" ADD COLUMN "confidenceLevel" INTEGER;
ALTER TABLE "Prediction" ADD COLUMN "keyFactors" JSONB;
```

### 6A-2: Draft Pick Tagging

**Problem:** When a user drafts a player, only the mechanical data is stored (round, pick number, auction amount). There's no record of how the user FELT about the pick — was it a steal? A reach? The plan all along? A panic pick?

**Schema change — modify DraftPick model:**
```prisma
model DraftPick {
  // ... existing fields ...
  pickTag        String?    // STEAL, REACH, PLAN, FALLBACK, VALUE, PANIC
  boardRankAtPick Int?      // Snapshot of where this player was on user's board at pick time
  boardId        String?    // Reference to which board was active during draft
}
```

**Pick tag options:**
```
STEAL    — "Got them way later than expected"
REACH    — "Took them earlier than I planned"
PLAN     — "Exactly where I wanted them"
FALLBACK — "Not my first choice but best available"
VALUE    — "Too good to pass at this price"
PANIC    — "Running out of options at this position"
```

**Frontend changes — modify draft room:**
- After each pick by the current user, show a subtle bottom-sheet or inline prompt (NOT a modal, NOT blocking):
  - 6 tag buttons in a horizontal row with icons, color-coded
  - Tap one → it saves → sheet auto-dismisses after 1.5 seconds
  - "Skip" option (or just tap anywhere else to dismiss)
  - If the user has an active draft board, auto-populate `boardRankAtPick` by looking up the player's rank on their board
- This must work in BOTH snake and auction draft rooms
- The prompt should feel fast and natural — like a quick reaction, not a form
- Show pick tags on the draft recap/history page as colored badges next to each pick

**Backend changes:**
- Modify draft pick endpoint to accept `pickTag` field
- When a pick is made, if the user has an active board (check DraftBoard where userId matches and sport matches), look up the player's `DraftBoardEntry.rank` and store as `boardRankAtPick`, store `boardId`
- This lookup should be automatic — don't require the user to do anything

**Migration 28: draft_pick_tags**
```sql
ALTER TABLE "DraftPick" ADD COLUMN "pickTag" VARCHAR(20);
ALTER TABLE "DraftPick" ADD COLUMN "boardRankAtPick" INTEGER;
ALTER TABLE "DraftPick" ADD COLUMN "boardId" TEXT;
```

### 6A-3: Board vs. Reality Connection

**Problem:** Users spend weeks building draft boards in The Lab. Then they draft. But there's no post-draft analysis that compares their board to their actual draft. Did they follow their own plan? Where did they deviate? How did those deviations perform?

**Schema change — new model:**
```prisma
model DraftBoardComparison {
  id              String   @id @default(cuid())
  userId          String
  draftId         String
  boardId         String
  sport           String
  comparisonData  Json     // See structure below
  createdAt       DateTime @default(now())

  user            User     @relation(fields: [userId], references: [id])
  draft           Draft    @relation(fields: [draftId], references: [id])
  board           DraftBoard @relation(fields: [boardId], references: [id])

  @@unique([draftId, boardId])
}
```

**comparisonData JSON structure:**
```json
{
  "totalPicks": 15,
  "picksMatchingBoard": 10,
  "picksDeviatingFromBoard": 5,
  "averageBoardRankDeviation": 3.2,
  "picks": [
    {
      "playerId": "abc123",
      "playerName": "Patrick Mahomes",
      "draftPosition": 5,
      "auctionAmount": null,
      "boardRank": 3,
      "deviation": -2,
      "pickTag": "PLAN",
      "tags": ["Target"],
      "reasonChips": ["elite_upside"],
      "boardNotes": "Best QB in fantasy, floor is QB3",
      "wasOnBoard": true
    },
    {
      "playerId": "def456",
      "playerName": "De'Von Achane",
      "draftPosition": 12,
      "auctionAmount": null,
      "boardRank": null,
      "deviation": null,
      "pickTag": "PANIC",
      "tags": [],
      "reasonChips": [],
      "boardNotes": null,
      "wasOnBoard": false
    }
  ],
  "boardPlayersNotDrafted": [
    {
      "playerId": "ghi789",
      "playerName": "Amon-Ra St. Brown",
      "boardRank": 8,
      "tags": ["Target"],
      "reasonChips": ["target_share"],
      "boardNotes": "PPR monster"
    }
  ]
}
```

**Backend changes:**
- New service: `backend/src/services/boardComparisonService.js`
  - `generateComparison(userId, draftId)` — called automatically when a draft completes
  - Finds the user's most recent board for the matching sport
  - Builds the comparison data structure above
  - Stores in DraftBoardComparison
- Hook into draft completion flow — when a draft status changes to COMPLETE, generate comparisons for all participants who have boards

**Frontend changes:**
- New section on Draft History page (`/draft/history/:draftId`): "Board vs. Reality"
  - Shows a side-by-side: "Your Board" column vs "Your Draft" column
  - Color coding: green for picks that matched board (within 3 spots), yellow for mild deviations, red for major deviations or off-board picks
  - Summary stats at top: "You followed your board on 10/15 picks (67%)"
  - Highlight "Players you targeted but didn't draft" section
  - Each pick row shows the pick tag badge if it exists
- Link from Lab Hub: "See how your last draft compared to your board →"

**Migration 29: draft_board_comparison**
```sql
CREATE TABLE "DraftBoardComparison" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "boardId" TEXT NOT NULL,
  "sport" TEXT NOT NULL,
  "comparisonData" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  UNIQUE ("draftId", "boardId"),
  FOREIGN KEY ("userId") REFERENCES "User"("id"),
  FOREIGN KEY ("draftId") REFERENCES "Draft"("id"),
  FOREIGN KEY ("boardId") REFERENCES "DraftBoard"("id")
);
```

### 6A-4: Capture-to-Outcome Linking

**Problem:** Users capture notes about players ("I think Bijan Robinson is being overdrafted"). These captures just sit there. They're never connected to what actually happened. The AI needs this connection to say "you called it" or "you missed it."

**Schema change — modify LabCapture model:**
```prisma
model LabCapture {
  // ... existing fields ...
  outcomeLinked    Boolean  @default(false)
  outcomeData      Json?    // Populated later when outcomes are known
  outcomeLinkedAt  DateTime?
}
```

**outcomeData JSON structure:**
```json
{
  "players": [
    {
      "playerId": "abc123",
      "playerName": "Bijan Robinson",
      "captureDate": "2026-03-15",
      "captureSentiment": "negative",
      "captureContext": "I think Bijan Robinson is being overdrafted at RB3",
      "outcomeMetrics": {
        "preSeasonADP": 3,
        "finalRank": 14,
        "fantasyPPG": 14.2,
        "gamesPlayed": 16
      },
      "verdict": "CORRECT"
    }
  ],
  "linkedAt": "2027-01-15T00:00:00Z",
  "season": "2026"
}
```

**Backend changes:**
- New service method in `captureService.js`: `linkCapturesToOutcomes(season)`
  - Runs as a post-season cron job (January, after fantasy championships)
  - For each capture that references a player (via LabCapturePlayer):
    - Pull the player's season outcome data (final rank, PPG, games played)
    - Pull the player's pre-season ADP at the time of the capture
    - Determine verdict: was the capture's sentiment aligned with the outcome?
      - If sentiment = "negative" and player underperformed ADP → CORRECT
      - If sentiment = "positive" and player outperformed ADP → CORRECT
      - If sentiment = "neutral" → NOTED (no verdict)
      - Otherwise → INCORRECT
    - Store in outcomeData JSON
    - Set outcomeLinked = true
  - This can also run mid-season (Week 8-ish) for partial verdicts with a "TRENDING" prefix

**Frontend changes:**
- On Lab Captures page, captured notes that have been outcome-linked show a small badge:
  - Green checkmark + "You called it" for CORRECT
  - Red X + "Missed this one" for INCORRECT
  - Gray dash for NOTED
  - Orange trending arrow for TRENDING_CORRECT / TRENDING_INCORRECT
- On player profile pages, if the current user has captures about this player, show them in a "Your Notes" section with outcome badges if linked
- Feed card type: "Capture Callback" — surfaces old captures with outcomes: "6 months ago you wrote: '[capture text]' — here's what happened..."

**Cron job:**
- Add to cron schedule: January 15, 6 AM — `linkCapturesToOutcomes('2026')`
- Add optional mid-season run: Week 9 Tuesday, 6 AM — `linkCapturesToOutcomes('2026', { partial: true })`

**Migration 30: capture_outcomes**
```sql
ALTER TABLE "LabCapture" ADD COLUMN "outcomeLinked" BOOLEAN DEFAULT false;
ALTER TABLE "LabCapture" ADD COLUMN "outcomeData" JSONB;
ALTER TABLE "LabCapture" ADD COLUMN "outcomeLinkedAt" TIMESTAMP(3);
```

### 6A-5: Opinion Evolution Thread

**Problem:** A user's opinion on a player evolves over months — they capture a note in March, add the player to their watch list in April, rank them on their board in July, change the tag from Sleeper to Target in August, then draft them in Round 3. This narrative exists across 5 different tables but nothing stitches it together. The AI needs to see the full arc.

**Schema change — new model:**
```prisma
model PlayerOpinionEvent {
  id            String   @id @default(cuid())
  userId        String
  playerId      String
  sport         String
  eventType     String   // CAPTURE, WATCH_ADD, WATCH_REMOVE, BOARD_ADD, BOARD_MOVE,
                         // BOARD_TAG, BOARD_NOTE, BOARD_REMOVE, DRAFT_PICK, LINEUP_START,
                         // LINEUP_BENCH, WAIVER_ADD, WAIVER_DROP, TRADE_ACQUIRE,
                         // TRADE_AWAY, PREDICTION_MADE, PREDICTION_RESOLVED
  eventData     Json     // Type-specific payload (see below)
  sentiment     String?  // positive, negative, neutral, mixed (auto-detected or inherited)
  sourceId      String?  // ID of the source record (captureId, boardEntryId, draftPickId, etc.)
  sourceType    String?  // LabCapture, DraftBoardEntry, DraftPick, Prediction, etc.
  createdAt     DateTime @default(now())

  user          User     @relation(fields: [userId], references: [id])

  @@index([userId, playerId, createdAt])
  @@index([userId, sport, createdAt])
}
```

**eventData examples by type:**
```json
// CAPTURE
{ "content": "I think this guy breaks out this year", "sentiment": "positive", "source": "podcast" }

// BOARD_ADD
{ "rank": 24, "tier": 3, "boardName": "NFL 2026 Main Board" }

// BOARD_MOVE
{ "previousRank": 24, "newRank": 12, "boardName": "NFL 2026 Main Board" }

// BOARD_TAG
{ "tag": "TARGET", "previousTag": "SLEEPER", "boardName": "NFL 2026 Main Board" }

// BOARD_NOTE
{ "note": "New OC should mean more targets", "boardName": "NFL 2026 Main Board" }

// DRAFT_PICK
{ "round": 3, "pick": 28, "auctionAmount": null, "pickTag": "PLAN", "boardRank": 12 }

// PREDICTION_MADE
{ "predictionType": "performance_call", "thesis": "Top 5 WR this season", "confidence": 4 }

// PREDICTION_RESOLVED
{ "outcome": "CORRECT", "accuracy": 0.85, "thesis": "Top 5 WR this season" }

// WAIVER_ADD
{ "faabBid": 15, "note": "Starter went down, this guy gets the volume now" }

// TRADE_ACQUIRE
{ "tradedAway": ["Player B", "Player C"], "note": "Buying low after bad week" }
```

**Backend changes:**
- New service: `backend/src/services/opinionTimelineService.js`
  - `recordEvent(userId, playerId, sport, eventType, eventData, sourceId, sourceType)` — creates a PlayerOpinionEvent
  - `getTimeline(userId, playerId)` — returns all events for a user+player, sorted chronologically
  - `getSeasonTimeline(userId, sport, season)` — returns all opinion events for a user across all players in a season
  - `getSentimentArc(userId, playerId)` — returns the sentiment trajectory over time (useful for AI)

- **Hook into existing services** (this is critical — the timeline must be populated automatically):
  - `captureService.js` → when a capture is created and has linked players, call `recordEvent` with type CAPTURE
  - `draftBoardService.js` → when an entry is added/moved/tagged/noted/removed, call `recordEvent` with appropriate type
  - Watch list service → on add/remove, call `recordEvent`
  - Draft pick flow → when a pick is made, call `recordEvent` with type DRAFT_PICK
  - `predictionService.js` → on submission and resolution, call `recordEvent`
  - Waiver claim flow → on successful claim, call `recordEvent`
  - Trade flow → on accepted trade, call `recordEvent` for both sides
  - Lineup submission → on lineup lock, for any player whose start/bench status changed, call `recordEvent`

- **IMPORTANT:** These hooks should be fire-and-forget (don't await, don't let failures block the primary action). Use a try/catch wrapper. The opinion timeline is supplementary data — it must never break core functionality.

**Frontend changes (minimal for now — this is primarily a backend data layer):**
- On player profile pages, if the current user has opinion events for this player, show a "Your History with [Player]" collapsible section:
  - Simple timeline view: chronological list of events with icons per type
  - Each event shows date, type icon, and a one-line summary
  - This replaces/enhances the existing capture display on player profiles
- On Lab Board Editor, for each player entry, add a small timeline icon that expands to show the opinion arc for that player

**Migration 31: opinion_timeline**
```sql
CREATE TABLE "PlayerOpinionEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "sport" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "eventData" JSONB NOT NULL,
  "sentiment" TEXT,
  "sourceId" TEXT,
  "sourceType" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
CREATE INDEX "idx_opinion_user_player" ON "PlayerOpinionEvent"("userId", "playerId", "createdAt");
CREATE INDEX "idx_opinion_user_sport" ON "PlayerOpinionEvent"("userId", "sport", "createdAt");
```

### 6A-6: Reasoning Fields on Roster Moves

**Problem:** Waiver claims, trades, and lineup decisions currently capture only the action, not the reasoning. These are some of the most important decision points in a season.

**Schema changes:**

```prisma
model WaiverClaim {
  // ... existing fields ...
  reasoning      String?   @db.VarChar(280)
}

model Trade {
  // ... existing fields ...
  proposerReasoning  String?  @db.VarChar(280)
  responderReasoning String?  @db.VarChar(280)
}

model LineupSnapshot {
  // ... existing fields ...
  decisionNotes  Json?    // { "benchedPlayers": [{ "playerId": "x", "reason": "matchup" }], "startedPlayers": [...] }
}
```

**Frontend changes:**
- Waiver claim form: add optional "Why this move?" text input (280 chars, collapsible)
- Trade proposal form: add optional "Pitch / reasoning" text input
- Trade response: add optional "Why I accepted/rejected" text input
- Lineup page: small note icon next to each player in starting lineup. Tap to add a quick note about why they're starting/sitting this week. This is VERY optional and should not add friction.

**Migration 32: roster_move_reasoning**
```sql
ALTER TABLE "WaiverClaim" ADD COLUMN "reasoning" VARCHAR(280);
ALTER TABLE "Trade" ADD COLUMN "proposerReasoning" VARCHAR(280);
ALTER TABLE "Trade" ADD COLUMN "responderReasoning" VARCHAR(280);
ALTER TABLE "LineupSnapshot" ADD COLUMN "decisionNotes" JSONB;
```

### Phase 6A Verification Checklist
- [ ] Prediction submission form has optional thesis, confidence, and key factor fields
- [ ] Draft room shows pick tag prompt after each user pick (both snake and auction)
- [ ] Draft completion auto-generates DraftBoardComparison for users with boards
- [ ] Draft history page shows "Board vs. Reality" section
- [ ] LabCapture model has outcome fields (can be null until cron runs)
- [ ] PlayerOpinionEvent table exists and is being populated by hooks in: capture service, board service, watch list, draft picks, predictions, waivers, trades, lineup snapshots
- [ ] Player profile pages show "Your History with [Player]" timeline
- [ ] Waiver, trade, and lineup forms have optional reasoning fields
- [ ] All new fields are OPTIONAL — no existing flows are blocked or slowed
- [ ] Build clean, no console errors

---

## PHASE 6B: DECISION GRAPH + PATTERN ENGINE

**Goal:** Build the backend intelligence layer that reads user decision history and identifies patterns, biases, and tendencies. NO Claude API yet — this is pure data analysis that produces structured insights the AI will later consume.

**Why this comes before the AI:** The Claude API calls will be expensive. If we send raw data to Claude and ask "find patterns," we'll burn tokens and get inconsistent results. Instead, we pre-compute patterns using deterministic code, then hand Claude the CONCLUSIONS to narrate and expand on. This is cheaper, faster, and more reliable.

### 6B-1: Decision Graph Service

**New file: `backend/src/services/decisionGraphService.js`**

This service assembles the complete decision history for a user, either for a specific player or for an entire season.

```javascript
// Core methods:

async function getPlayerGraph(userId, playerId) {
  // Returns the full opinion timeline for this user+player
  // Includes: all PlayerOpinionEvents, plus current board position,
  // plus outcome data if available
  // Sorted chronologically
  // Returns: { player, events[], currentBoardPosition, outcomeData }
}

async function getSeasonGraph(userId, sport, season) {
  // Returns the full decision history for a season
  // Includes: all board activity, all draft picks, all predictions,
  // all roster moves, all captures — grouped by player
  // Returns: { players: { [playerId]: playerGraph }, draftSummary, seasonOutcome }
}

async function getDraftGraph(userId, draftId) {
  // Returns the draft decision story
  // Includes: board state pre-draft, each pick with board comparison,
  // pick tags, deviations from plan
  // Returns: { board, picks[], comparison, deviationSummary }
}

async function getPredictionGraph(userId, sport, season?) {
  // Returns prediction history with theses and outcomes
  // Includes: all predictions with thesis, key factors, confidence, outcome
  // Groups by: prediction type, player, correct/incorrect
  // Returns: { predictions[], accuracyByType, accuracyByFactor, streaks }
}

async function getMultiSeasonGraph(userId, sport) {
  // Returns cross-season patterns (requires 2+ seasons of data)
  // Returns: { seasons[], crossSeasonPatterns }
}
```

### 6B-2: Pattern Engine Service

**New file: `backend/src/services/patternEngine.js`**

This service analyzes decision graphs and produces structured pattern objects. These are deterministic computations — no AI, no randomness. The patterns become the input for AI narration later.

```javascript
// Pattern detection methods:

async function detectDraftPatterns(userId, sport) {
  // Analyzes draft history across available drafts
  // Detects:
  return {
    positionAllocation: {
      // % of budget/picks spent per position vs league average
      // e.g., { "RB": 0.42, "WR": 0.31, "QB": 0.12, ... }
      // Flags: "RB_HEAVY" if >35%, "WR_LIGHT" if <25%, etc.
    },
    reachFrequency: {
      // How often user picks players above their board rank
      // Based on pickTag data and board comparison
      // e.g., { reachRate: 0.27, avgReachAmount: 8.3, reachHitRate: 0.40 }
    },
    boardAdherence: {
      // How closely user follows their own board
      // e.g., { followRate: 0.67, deviationAvg: 4.2, deviationHitRate: 0.45 }
      // KEY INSIGHT: do deviations from board perform better or worse than follows?
    },
    tagAccuracy: {
      // How accurate are user's Target/Sleeper/Avoid tags?
      // e.g., { targetHitRate: 0.62, sleeperHitRate: 0.35, avoidCorrectRate: 0.71 }
    },
    roundByRoundTendency: {
      // Performance patterns by draft round
      // e.g., rounds 1-3 hit rate vs rounds 10+ hit rate
    },
    auctionPatterns: {
      // If auction drafts exist: spending patterns, nomination strategy
      // e.g., { earlySpendRate: 0.55, endgameValueRate: 0.72 }
    }
  };
}

async function detectPredictionPatterns(userId, sport) {
  // Analyzes prediction history
  return {
    overallAccuracy: 0.58,
    accuracyByType: {
      // performance_call, weekly_winner, bold_call, benchmark
    },
    accuracyByConfidence: {
      // Do high-confidence picks hit more often? Calibration check
      // e.g., { conf5HitRate: 0.72, conf1HitRate: 0.41 }
    },
    accuracyByFactor: {
      // Which key factors correlate with correct predictions?
      // e.g., "MATCHUP" factor → 68% accuracy, "GUT_FEELING" → 42%
    },
    biases: {
      // e.g., "overvalues_home_teams", "fades_rookies_too_aggressively"
    },
    streaks: {
      // Current streak, longest streak, cold streaks
    },
    bestPlayerTypes: {
      // What types of players does user predict most accurately?
      // e.g., "elite_qb" accuracy 75%, "backup_rb" accuracy 30%
    }
  };
}

async function detectRosterPatterns(userId, sport, season) {
  // Analyzes in-season roster management
  return {
    waiverTendencies: {
      // Position bias in claims, hit rate, FAAB efficiency
      // e.g., { rbClaimRate: 0.55, rbClaimHitRate: 0.20, wrClaimHitRate: 0.45 }
    },
    tradingStyle: {
      // Buy low / sell high patterns, position seeking
    },
    lineupOptimality: {
      // How often does user make optimal start/sit decisions?
      // Points left on bench per week average
      // Position where most points are left on bench
    },
    holdPatterns: {
      // How long does user hold underperformers before acting?
      // e.g., { avgWeeksBeforeDrop: 4.2, avgWeeksBeforeTrade: 6.1 }
    }
  };
}

async function detectCapturePatterns(userId, sport) {
  // Analyzes capture/note behavior
  return {
    captureVolume: {
      // How many captures per month, trend over time
    },
    sentimentAccuracy: {
      // When user captures a positive note, does the player perform well?
      // Requires outcomeLinked captures
    },
    topicPatterns: {
      // What does user most often write about? Injuries? Matchups? Usage?
    },
    captureToActionRate: {
      // How often does a capture lead to a board add, draft pick, or prediction?
    }
  };
}

async function generateUserProfile(userId, sport) {
  // Rolls up all pattern detections into a single user profile
  // This is the master intelligence document about a user
  const draftPatterns = await detectDraftPatterns(userId, sport);
  const predictionPatterns = await detectPredictionPatterns(userId, sport);
  const rosterPatterns = await detectRosterPatterns(userId, sport, currentSeason);
  const capturePatterns = await detectCapturePatterns(userId, sport);

  return {
    userId,
    sport,
    generatedAt: new Date(),
    strengths: identifyStrengths(draftPatterns, predictionPatterns, rosterPatterns),
    weaknesses: identifyWeaknesses(draftPatterns, predictionPatterns, rosterPatterns),
    biases: identifyBiases(draftPatterns, predictionPatterns),
    tendencies: identifyTendencies(draftPatterns, rosterPatterns, capturePatterns),
    draftPatterns,
    predictionPatterns,
    rosterPatterns,
    capturePatterns,
    oneThingToFix: identifyTopPriority(draftPatterns, predictionPatterns, rosterPatterns),
    dataConfidence: assessDataConfidence(draftPatterns, predictionPatterns)
  };
}

// Helper: how much data do we actually have?
function assessDataConfidence(draftPatterns, predictionPatterns) {
  // Returns LOW / MEDIUM / HIGH based on data volume
  // LOW: < 1 draft, < 10 predictions
  // MEDIUM: 1-2 drafts, 10-50 predictions, some captures
  // HIGH: 3+ drafts, 50+ predictions, active capture usage
  // AI should caveat its coaching accordingly
}
```

**Schema change — cache computed profiles:**
```prisma
model UserIntelligenceProfile {
  id              String   @id @default(cuid())
  userId          String
  sport           String
  profileData     Json     // The full generateUserProfile output
  dataConfidence  String   // LOW, MEDIUM, HIGH
  generatedAt     DateTime @default(now())
  expiresAt       DateTime // Regenerate weekly or on significant new data

  user            User     @relation(fields: [userId], references: [id])

  @@unique([userId, sport])
  @@index([userId])
}
```

**Cron job:**
- Weekly (Wednesday 4 AM): Regenerate UserIntelligenceProfile for all active users
- Also regenerate on-demand when significant events occur (draft completion, season end)

**Migration 33: user_intelligence_profile**
```sql
CREATE TABLE "UserIntelligenceProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sport" TEXT NOT NULL,
  "profileData" JSONB NOT NULL,
  "dataConfidence" TEXT NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("userId", "sport")
);
CREATE INDEX "idx_intelligence_user" ON "UserIntelligenceProfile"("userId");
```

### Phase 6B Verification Checklist
- [ ] `decisionGraphService.js` returns complete player timelines from PlayerOpinionEvent data
- [ ] `decisionGraphService.js` returns season-wide decision graphs
- [ ] `patternEngine.js` detects draft patterns (position allocation, reach frequency, board adherence, tag accuracy)
- [ ] `patternEngine.js` detects prediction patterns (accuracy by type, by confidence, by factor, biases)
- [ ] `patternEngine.js` detects roster patterns (waiver tendencies, lineup optimality)
- [ ] `patternEngine.js` detects capture patterns (sentiment accuracy, capture-to-action rate)
- [ ] `generateUserProfile` rolls up all patterns into a single intelligence profile
- [ ] `UserIntelligenceProfile` is cached in DB and refreshed weekly
- [ ] Data confidence assessment works (LOW/MEDIUM/HIGH based on available data volume)
- [ ] Build clean, no console errors

---

## PHASE 6C: AI FOUNDATION + AMBIENT INTELLIGENCE (MODE 1)

**Goal:** Install the Claude API, build the service wrapper, and implement Mode 1 — background AI intelligence that surfaces insights through the Feed and existing UI without the user asking for anything.

### 6C-1: Claude API Foundation

**New file: `backend/src/services/claudeService.js`**
*(This matches Claude Code's original plan — keep this structure)*

```javascript
// Wrapper around @anthropic-ai/sdk
// - Reads ANTHROPIC_API_KEY from env
// - Exports generateCompletion(systemPrompt, userPrompt, options)
// - Handles retries (3 attempts with exponential backoff)
// - Rate limiting (internal queue to avoid API rate limits)
// - Token tracking per request
// - Model selection: default claude-sonnet-4-5-20250929, option for claude-opus-4-6
// - Usage logging: stores token counts per request for cost monitoring
// - Timeout: 30s default, configurable per call
// - Error handling: graceful degradation (if API fails, return null, don't crash features)
```

**Install:** `npm install @anthropic-ai/sdk` in backend

**New file: `backend/src/services/aiCoachService.js`**

```javascript
// AI coaching orchestrator — the brain that decides what to ask Claude and how

// CRITICAL DESIGN PRINCIPLE: This service receives PRE-COMPUTED pattern data
// from patternEngine.js and asks Claude to NARRATE and EXPAND, not to ANALYZE raw data.
// This keeps token usage low and responses consistent.

// System prompt template (used for all coaching interactions):
const CLUTCH_COACH_SYSTEM_PROMPT = `
You are the Clutch Coach — an AI coaching engine embedded in the Clutch Fantasy Sports platform.

Your role is to help fantasy sports managers improve their decision-making by analyzing
their personal history of predictions, draft decisions, roster moves, and research notes.

Key principles:
- Be specific. Reference actual players, actual decisions, actual outcomes.
- Be honest. Don't sugarcoat poor decisions, but be constructive.
- Be actionable. Every insight should include a concrete "what to do differently."
- Be concise. Users are busy. Lead with the insight, not the explanation.
- Never be generic. You have access to this specific user's data. Use it.
- Acknowledge data limitations. If you only have one season of data, say so.
- Use the user's own words when possible (from their captures and notes).

You are NOT a chatbot. You do NOT have conversations. You produce structured coaching
insights that appear inside the Clutch app at the right moment. Your output should feel
like a smart friend who watches all your games and remembers everything you said.

Output format: Always return valid JSON matching the requested schema.
`;

// Core methods:

async function generateAmbientInsight(userId, sport, insightType, contextData) {
  // Produces a single insight card for the Feed or Lab
  // insightType: see list below
  // contextData: pre-computed from patternEngine + decisionGraph
  // Returns: { title, body, type, playerId?, actionUrl?, priority }
}

async function generateCoachingNudge(userId, contextType, contextData) {
  // Produces a short contextual nudge (1-2 sentences) for Mode 2
  // Returns: { nudgeText, priority, dismissable }
}

async function generateDeepReport(userId, sport, reportType, contextData) {
  // Produces a full coaching report for Mode 3
  // Returns: { title, sections[], summary, topRecommendation }
}
```

**Schema change — AI content storage:**
```prisma
model AiInsight {
  id              String   @id @default(cuid())
  userId          String
  sport           String?
  insightType     String   // See insight types below
  title           String
  body            String   @db.Text
  metadata        Json?    // Type-specific data (playerIds, actionUrls, etc.)
  priority        Int      @default(5)  // 1=highest, 10=lowest
  status          String   @default("active")  // active, dismissed, expired, acted_on
  expiresAt       DateTime?
  generatedAt     DateTime @default(now())
  dismissedAt     DateTime?
  tokenCount      Int?     // Track AI cost

  user            User     @relation(fields: [userId], references: [id])

  @@index([userId, status, priority])
  @@index([userId, insightType])
}

model AiReport {
  id              String   @id @default(cuid())
  userId          String?  // null for global reports (scout reports)
  sport           String
  reportType      String   // scout_golf, scout_nfl, pre_draft, mid_season, post_season, player_brief
  subjectId       String?  // tournamentId, weekNumber, playerId, etc.
  contentJson     Json     // Full report content
  generatedAt     DateTime @default(now())
  expiresAt       DateTime
  tokenCount      Int?

  user            User?    @relation(fields: [userId], references: [id])

  @@index([sport, reportType, subjectId])
  @@index([userId, reportType])
}
```

**Migration 34: ai_insights_reports**
```sql
CREATE TABLE "AiInsight" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sport" TEXT,
  "insightType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "metadata" JSONB,
  "priority" INTEGER DEFAULT 5,
  "status" TEXT DEFAULT 'active',
  "expiresAt" TIMESTAMP(3),
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dismissedAt" TIMESTAMP(3),
  "tokenCount" INTEGER,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("userId") REFERENCES "User"("id")
);
CREATE INDEX "idx_insight_user_status" ON "AiInsight"("userId", "status", "priority");
CREATE INDEX "idx_insight_user_type" ON "AiInsight"("userId", "insightType");

CREATE TABLE "AiReport" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "sport" TEXT NOT NULL,
  "reportType" TEXT NOT NULL,
  "subjectId" TEXT,
  "contentJson" JSONB NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "tokenCount" INTEGER,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("userId") REFERENCES "User"("id")
);
CREATE INDEX "idx_report_sport_type" ON "AiReport"("sport", "reportType", "subjectId");
CREATE INDEX "idx_report_user" ON "AiReport"("userId", "reportType");
```

### 6C-2: Ambient Insight Types

These are the insight cards generated in the background and surfaced through the Feed and Lab. They are generated on a schedule (not on-demand) to control costs.

**Insight type definitions:**

| Insight Type | Trigger | Data Source | Example |
|---|---|---|---|
| `POSITION_BIAS_ALERT` | Pattern engine detects draft position imbalance | draftPatterns.positionAllocation | "Your boards have been RB-heavy in 3 consecutive drafts. Your best finishes came with balanced builds." |
| `BOARD_STALE_PLAYER` | Player on board hasn't been touched in 2+ weeks but news has changed | boardActivity + news | "You ranked Breece Hall WR12 three weeks ago. Since then, he's been listed as questionable twice. Worth revisiting?" |
| `CAPTURE_CALLBACK` | Capture from 2+ months ago has outcome data | captureOutcomes | "In March you wrote: 'Bijan Robinson is overdrafted.' He finished RB14 — you called it." |
| `PREDICTION_PATTERN` | Pattern engine finds accuracy trend | predictionPatterns | "Your bold calls hit at 62% — well above your safe picks at 51%. Trust your gut more." |
| `TAG_ACCURACY_UPDATE` | End of season tag accuracy computation | tagAccuracy | "Your 'Sleeper' tags hit at 35% this season. Your best sleeper call was [player] who finished top 10." |
| `BOARD_DIVERGENCE_TREND` | User's board differs significantly from consensus on 3+ players | boardEntries vs ADP | "You're higher than consensus on 4 players by 20+ spots. Last year your divergences hit 60% of the time." |
| `RESEARCH_INTENSITY` | User has been heavily researching a player (3+ captures, board add, watch list) | opinionTimeline | "You've been deep on [player] for 3 months. Ready to make it official with a Prove It call?" |
| `DRAFT_PREP_READINESS` | Pre-draft period, comparing board completeness to past years | boardReadiness + historical | "Your board has 45 players ranked — at this point last year you had 80. Draft is in 3 weeks." |
| `WAIVER_PATTERN` | Pattern engine detects waiver bias | rosterPatterns.waiverTendencies | "You've claimed 4 backup RBs this season with a 0% hit rate. Consider pivoting to WR on waivers." |
| `LINEUP_POINTS_LEFT` | Weekly calculation of points left on bench | lineupOptimality | "You've left an average of 12 points on the bench this season, mostly at flex. Your bench WRs have outscored your flex starts 5 of 8 weeks." |
| `OPINION_EVOLUTION` | User's opinion on a player has shifted significantly | opinionTimeline | "Your journey with [player]: Sleeper in March → Target in June → Drafted Round 3 → Trading away Week 8. The AI noticed you tend to sour on RBs after 2 bad games." |
| `SEASON_MILESTONE` | User hits a notable achievement or threshold | various | "You've made 50 predictions this season. Here's your accuracy dashboard so far." |

**Generation schedule:**
- Daily 5 AM: Generate up to 3 ambient insights per active user (rotate types, don't repeat)
- Post-draft: Generate draft-specific insights for each user who drafted
- Post-season: Generate season retrospective insights
- On-demand: When significant events occur (trade, player injury affecting user's roster)

**API routes:**
```
GET  /api/ai/insights          — Get active insights for current user (paginated, filtered by sport)
POST /api/ai/insights/:id/dismiss  — Dismiss an insight
POST /api/ai/insights/:id/acted    — Mark as acted upon (user clicked through)
```

**Frontend integration:**
- Feed: AI insights appear as a distinct card type in the Feed with a "Clutch Coach" badge and a subtle sparkle/brain icon
- Lab Hub: Replace the existing rule-based insight bar with AI-powered insights. Show the top 2-3 active insights. Keep the existing insight dismiss functionality.
- Dashboard: "Coaching Corner" widget showing the single highest-priority insight
- Notification: For high-priority insights (priority 1-3), send a push notification with the title

### 6C-3: Insight Generation Pipeline

**New file: `backend/src/services/aiInsightPipeline.js`**

This is the orchestrator that runs on schedule, determines which insights to generate for each user, calls the pattern engine and AI service, and stores results.

```javascript
async function runDailyInsightPipeline() {
  const activeUsers = await getActiveUsers(); // Users with activity in last 30 days

  for (const user of activeUsers) {
    // 1. Check what insights they already have (avoid duplicates)
    const existingInsights = await getActiveInsights(user.id);
    const existingTypes = existingInsights.map(i => i.insightType);

    // 2. Determine which insight types are eligible
    const eligibleTypes = await determineEligibleInsights(user.id, existingTypes);

    // 3. For each eligible type (max 3 per day), generate
    for (const type of eligibleTypes.slice(0, 3)) {
      const contextData = await gatherInsightContext(user.id, type);
      if (!contextData) continue; // Not enough data for this insight type

      const insight = await aiCoachService.generateAmbientInsight(
        user.id,
        contextData.sport,
        type,
        contextData
      );

      if (insight) {
        await storeInsight(user.id, insight);
      }
    }
  }
}

async function determineEligibleInsights(userId, existingTypes) {
  // Logic to pick which insights to generate based on:
  // - What data exists for this user
  // - What insights they haven't seen recently
  // - What's seasonally relevant (draft insights in July, lineup insights in October)
  // - Their data confidence level (don't generate pattern insights with LOW data)
}
```

**Cron job:** Daily 5 AM — `runDailyInsightPipeline()`

### Phase 6C Verification Checklist
- [ ] `claudeService.js` successfully calls Claude API with retries and error handling
- [ ] `aiCoachService.js` generates ambient insights using pattern engine data
- [ ] `AiInsight` records are created and stored in DB
- [ ] `AiReport` records are created and stored in DB
- [ ] Feed displays AI insight cards with "Clutch Coach" badge
- [ ] Lab Hub shows AI-powered insights (replacing rule-based where applicable)
- [ ] Dashboard shows "Coaching Corner" widget
- [ ] Users can dismiss insights
- [ ] Daily pipeline runs and generates up to 3 insights per active user
- [ ] Token usage is logged and within expected bounds
- [ ] API failures gracefully degrade (no broken pages)
- [ ] Build clean, no console errors

---

## PHASE 6D: CONTEXTUAL COACHING (MODE 2)

**Goal:** AI shows up inside features at the moment of decision — not as a chatbot, but as contextual cards and nudges that appear based on what the user is doing right now.

### 6D-1: Draft Room Coaching

**When:** User is in an active draft (snake or auction)

**Backend — add to `aiCoachService.js`:**
```javascript
async function generateDraftNudge(userId, draftState, pickNumber) {
  // Called after each pick (by any drafter, not just the user)
  // Uses: user's board, pick history so far, pattern engine data
  // Returns: null (no nudge) or { nudgeText, nudgeType, priority }

  // Nudge types:
  // BOARD_VALUE: "Player X is available 3 rounds below your board rank. Value pick."
  // POSITION_ALERT: "You've drafted 3 RBs in first 5 picks. Your best finishes were balanced."
  // BUDGET_WARNING: "You've spent 62% of budget with 8 spots left." (auction only)
  // AVOID_CONFLICT: "You tagged Player X as Avoid on [date]. Note: [their avoid reason]"
  // TARGET_AVAILABLE: "Your Target player [X] is still on the board. Board rank: [N]."
}
```

**API route:**
```
POST /api/ai/draft-nudge — Body: { draftId, currentPick }
```

**Frontend changes — modify draft room:**
- After each pick in the draft, call the nudge endpoint (debounced, only when it's approaching user's pick)
- Display nudge as a subtle banner at the top of the draft board area:
  - Colored by type (green = value, yellow = warning, blue = info)
  - Dismissable with X button
  - Auto-fades after 15 seconds if not dismissed
  - Never blocks the draft interface
  - Maximum 1 nudge visible at a time (highest priority wins)

### 6D-2: Board Editor Coaching

**When:** User is actively editing their draft board in The Lab

**Backend — add to `aiCoachService.js`:**
```javascript
async function generateBoardCoachingCard(userId, boardId, triggerAction) {
  // Called when user makes significant board changes
  // triggerAction: MAJOR_MOVE (10+ rank change), TAG_CHANGE, TIER_RESTRUCTURE, ENTRY_ADD
  // Returns: null or { cardTitle, cardBody, relatedPlayers[], actionSuggestion }

  // Card types:
  // HISTORICAL_ECHO: "Last year you moved a similar player up this much — here's how that turned out"
  // BLIND_SPOT: "You have no players from [team/position tier] in your top 30"
  // DIVERGENCE_INSIGHT: "You're 20+ spots higher on [player] than consensus. Your divergences hit 60% last year."
  // POSITION_SCARCITY: "Your top 24 has 2 TEs. TE falls off a cliff after pick 30 in most drafts."
  // CAPTURE_CONNECTION: "You captured a note about [player] 2 weeks ago: '[note]'. They're not on your board yet."
}
```

**API route:**
```
POST /api/ai/board-coach — Body: { boardId, triggerAction, movedPlayerId? }
```

**Frontend changes — modify DraftBoardEditor:**
- When user makes a significant move, call the coaching endpoint (debounced, max 1 call per 30 seconds)
- Display coaching card as a collapsible panel below the board or as a slide-in from the right edge
- Card has a "Clutch Coach" header with brain icon
- Card is dismissable and non-blocking
- Include a small "Was this helpful?" thumbs up/down for feedback tracking

### 6D-3: Prediction Coaching

**When:** User is submitting or viewing resolved predictions in Prove It

**On submission — add coaching context:**
```javascript
async function generatePredictionContext(userId, predictionData) {
  // Called when user is about to submit a prediction
  // Returns: { calibrationNote, historicalAccuracy, suggestedConfidence }

  // Examples:
  // "Your hit rate on QB rushing props is 72%. High confidence warranted."
  // "You're 2-for-7 on bold calls about rookies. Consider a lower confidence level."
  // "This is your 5th prediction about [player] this season. You're 3-1 so far."
}
```

**On resolution — add coaching reflection:**
```javascript
async function generateResolutionInsight(userId, predictionId) {
  // Called when a prediction resolves
  // Uses: prediction thesis, key factors, outcome, user's historical patterns
  // Returns: { insightText, whatWorked, whatMissed, patternNote }

  // Examples:
  // "CORRECT: Your thesis about target share was spot on. This is your strongest prediction factor (68% accuracy)."
  // "INCORRECT: You predicted based on matchup, but [player] has been matchup-proof this season. Your matchup-based picks are only 41% accurate."
}
```

**API routes:**
```
POST /api/ai/prediction-context — Body: { predictionType, playerId, sport }
POST /api/ai/prediction-resolution — Body: { predictionId }
```

**Frontend changes — modify Prove It:**
- Submission flow: Before the submit button, show a small coaching context card (if available). Non-blocking, informational only.
- Resolution cards: When a prediction resolves, show the resolution insight below the result. Include the user's original thesis and the coaching analysis side by side.
- Prediction history page: Add a "Patterns" tab that shows prediction accuracy breakdowns by type, factor, and confidence level (this data comes from the pattern engine, not AI — but displayed here for context)

### 6D-4: Mid-Season Check-In Prompts

**When:** Week 6-7 of NFL season (or mid-way through a golf season)

**Backend:**
```javascript
async function generateMidSeasonCheckIn(userId, sport, season) {
  // Produces a Feed card that reviews the user's pre-season thesis vs reality
  // Pulls: draft board targets, pre-season captures, predictions, actual results
  // Returns structured check-in content

  // Content sections:
  // 1. "Your pre-season targets — how they're doing" (board Target tags vs actual performance)
  // 2. "Your boldest calls — were you right?" (highest-confidence predictions status)
  // 3. "Your captures from the offseason" (revisit old notes with current context)
  // 4. "One thing to adjust" (actionable recommendation for second half of season)
}
```

**This is generated as a special AiInsight with insightType = MID_SEASON_CHECK_IN and priority = 1 (highest)**

### Phase 6D Verification Checklist
- [ ] Draft room shows contextual nudges based on board data and patterns
- [ ] Nudges are non-blocking, dismissable, and limited to 1 at a time
- [ ] Board editor shows coaching cards on significant moves
- [ ] Coaching cards reference historical patterns and previous decisions
- [ ] Prediction submission shows calibration/context notes
- [ ] Prediction resolution shows coaching reflection with thesis comparison
- [ ] Mid-season check-in generates as a high-priority Feed card
- [ ] All contextual coaching calls are debounced and rate-limited
- [ ] API failures gracefully degrade (feature works without coaching)
- [ ] Build clean, no console errors

---

## PHASE 6E: DEEP COACHING REPORTS (MODE 3)

**Goal:** On-demand premium reports that provide comprehensive analysis of a user's decision-making history. These are the meaty, valuable products that justify a subscription.

### 6E-1: Pre-Draft Report

**When:** User clicks "Pre-Draft Report" in The Lab (available 4 weeks before their earliest draft date, or on-demand)

**Backend — add to `aiCoachService.js`:**
```javascript
async function generatePreDraftReport(userId, sport) {
  // Input: UserIntelligenceProfile + current board + historical drafts + captures
  // Output: Full coaching report

  // Sections:
  return {
    reportType: "pre_draft",
    title: "Your Pre-Draft Coaching Report",
    sections: [
      {
        title: "Draft Tendencies",
        // Multi-year drafting patterns: position allocation, reach rate, timing
        // "You've gone RB-heavy in 3 of 4 drafts. It worked once (2024) and failed twice."
      },
      {
        title: "Board vs. Draft History",
        // How closely you follow your own board, and how deviations perform
        // "Last year you deviated from your board on 5 picks. 3 of those 5 underperformed."
      },
      {
        title: "Your Prediction Edge",
        // Where your projections/predictions have been most accurate
        // "Your WR projections are elite (top 15% accuracy). Trust your WR rankings."
      },
      {
        title: "Blind Spots",
        // Positions, player types, or situations where you consistently miss
        // "You've undervalued slot receivers in every draft. Three slot WRs finished top 20 last year."
      },
      {
        title: "This Year's Board Review",
        // AI analysis of the current board: balance, value, risks
        // "Your current board has no backup QB plan if your QB1 goes in Round 4 as projected."
      },
      {
        title: "Top 3 Recommendations",
        // Specific, actionable recommendations
        // "1. Consider taking a WR with your first pick — your WR accuracy suggests you can find value."
        // "2. Set a hard budget cap on RBs in auction. You overspent by 18% last year."
        // "3. Your Sleeper tags hit at 35%. Be more selective — quality over quantity."
      }
    ],
    dataConfidence: "MEDIUM", // From UserIntelligenceProfile
    caveat: "Based on 2 seasons of data. Patterns become more reliable with additional seasons."
  };
}
```

### 6E-2: Mid-Season Report

**When:** User clicks "Mid-Season Report" on their manager profile (available Weeks 7-10)

```javascript
async function generateMidSeasonReport(userId, sport, season) {
  return {
    reportType: "mid_season",
    title: "Mid-Season Coaching Report",
    sections: [
      {
        title: "Draft Grade Revisited",
        // Re-grade draft picks with current season data
        // Compare to original draft grades
      },
      {
        title: "Roster Management Review",
        // Waiver hits/misses, trade analysis, lineup optimality
      },
      {
        title: "Pre-Season vs. Reality",
        // Board targets vs actual performance
        // Captures from offseason vs what happened
      },
      {
        title: "Points Left on the Table",
        // Bench points analysis, missed waiver opportunities
      },
      {
        title: "Second Half Strategy",
        // Actionable recommendations for rest of season
      }
    ]
  };
}
```

### 6E-3: Post-Season Retrospective

**When:** After championship week, user clicks "Season Retrospective" on their manager profile

```javascript
async function generatePostSeasonReport(userId, sport, season) {
  return {
    reportType: "post_season",
    title: "Season Retrospective",
    sections: [
      {
        title: "Season Summary",
        // Overall record, finish, key stats
      },
      {
        title: "Best Calls",
        // Top 5 best decisions (drafts, waivers, trades, predictions) with evidence
      },
      {
        title: "Worst Calls",
        // Top 5 worst decisions with what went wrong and what you missed
      },
      {
        title: "Your Captures — What You Wrote vs What Happened",
        // Full capture-to-outcome review
      },
      {
        title: "Year-Over-Year Progress",
        // If multi-season data exists: are you getting better? Where specifically?
      },
      {
        title: "Your One Thing to Fix",
        // THE single most impactful recommendation for next season
        // Based on the biggest pattern in their weaknesses
      }
    ],
    shareableCard: {
      // Summary card for social sharing
      // "Season accuracy: 62% | Best call: [player] | Clutch Rating: [X]"
    }
  };
}
```

### 6E-4: Frontend — Report UI

**New file: `frontend/src/pages/CoachingReport.jsx` at `/coach/:reportType`**

- Clean, long-form report layout (similar to tournament preview pages)
- "Clutch Coach" header with brain icon and generation timestamp
- Each section is a collapsible card
- Data confidence indicator at the top: "Based on [N] seasons of data"
- "Regenerate" button (costs 1 API call, rate limited to 1 per day per report type)
- "Share Summary" button that generates a social card with key stats
- Print CSS for users who want to print their report

**Entry points:**
- Lab Hub: "Pre-Draft Report" card (when in pre-draft season)
- Manager Profile: "Coaching Reports" section with available reports
- Dashboard: "Your [Report Type] is Ready" card when new report is generated
- Feed: High-priority card when a report is auto-generated (post-season)

**API routes:**
```
POST /api/ai/report/pre-draft    — Body: { sport }
POST /api/ai/report/mid-season   — Body: { sport, season }
POST /api/ai/report/post-season  — Body: { sport, season }
GET  /api/ai/reports              — Get all reports for current user
GET  /api/ai/reports/:id          — Get specific report
```

### Phase 6E Verification Checklist
- [ ] Pre-draft report generates with all sections populated from pattern engine data
- [ ] Mid-season report generates with draft re-grade and roster analysis
- [ ] Post-season report generates with capture-to-outcome review
- [ ] Reports are stored in AiReport table and retrievable
- [ ] Report UI renders cleanly on desktop and mobile
- [ ] Shareable summary card generates for social sharing
- [ ] Reports acknowledge data confidence level
- [ ] Rate limiting prevents excessive regeneration
- [ ] Build clean, no console errors

---

## PHASE 6F: SCOUT REPORTS + MATCHUP SIM

**Goal:** Add the generic content layer — AI-generated scouting reports for tournaments/weeks and the matchup simulator. These are the features from Claude Code's original plan, but now they benefit from the personalization infrastructure built in 6A-6E.

### 6F-1: Clutch Scout Reports

*(Follow Claude Code's original 6A spec for these, with one critical addition:)*

**Personalization layer:** When a logged-in user views a Scout Report, overlay personalized annotations:
- "Clutch Scout rates Player X as a top play — **and your board agrees, you have them as a Target**"
- "Player Y is a popular start this week — **but you've been 2-for-6 on predictions involving similar player profiles**"
- "Course fit score: 85 — **you captured a note about this player's course history last month**"

This is a simple additional API call that checks the user's board, captures, and predictions for any players mentioned in the scout report and adds personal context overlays.

**Backend — add to `aiCoachService.js`:**
```javascript
async function personalizeScoutReport(userId, reportContent) {
  // Takes a generic scout report and adds user-specific annotations
  // Checks: user's board for mentioned players, captures, prediction history
  // Returns: augmented report content with personal overlays
}
```

**Frontend:** Scout Report pages render personal annotations as highlighted callout boxes within the report.

### 6F-2: Clutch Sim

*(Follow Claude Code's original 6C spec for the matchup simulator)*

**Additional personalization:**
- If the user has either player on their board, show their board rank and notes
- If the user has made predictions involving either player, show their track record
- If the user has captures about either player, surface the most recent capture

**New file: `frontend/src/pages/ClutchSim.jsx` at `/sim`**
- Two player selector dropdowns
- Optional event/week context
- "Simulate" button → AI-generated comparison
- Personal annotations if user has history with either player
- Shareable result card

### Phase 6F Verification Checklist
- [ ] Golf scout reports generate with field analysis, course fit, weather
- [ ] NFL scout reports generate with matchup analysis, start/sit, sleepers
- [ ] Scout reports show personal annotations for logged-in users with relevant data
- [ ] Reports are cached and regenerated on schedule (not per-request)
- [ ] Matchup simulator generates head-to-head analysis
- [ ] Sim shows personal context if user has history with either player
- [ ] Shareable cards work for both scout reports and sim results
- [ ] Build clean, no console errors

---

## API ROUTES SUMMARY (All Phases)

```
# Insights (Mode 1)
GET    /api/ai/insights                    — Get active insights for current user
POST   /api/ai/insights/:id/dismiss        — Dismiss an insight
POST   /api/ai/insights/:id/acted          — Mark as acted upon

# Contextual Coaching (Mode 2)
POST   /api/ai/draft-nudge                 — Get draft room nudge
POST   /api/ai/board-coach                 — Get board editor coaching card
POST   /api/ai/prediction-context          — Get prediction submission context
POST   /api/ai/prediction-resolution       — Get prediction resolution insight

# Deep Reports (Mode 3)
POST   /api/ai/report/pre-draft            — Generate pre-draft report
POST   /api/ai/report/mid-season           — Generate mid-season report
POST   /api/ai/report/post-season          — Generate post-season report
GET    /api/ai/reports                     — Get all reports for current user
GET    /api/ai/reports/:id                 — Get specific report

# Scout + Sim (Content)
POST   /api/ai/scout-report                — Generate/retrieve scout report
POST   /api/ai/player-brief                — Generate player AI brief
POST   /api/ai/simulate                    — Matchup simulator
```

**Rate limits:**
| Endpoint Group | Free Tier | Premium Tier |
|---|---|---|
| Insights | Unlimited (generated by system) | Unlimited |
| Draft nudges | 20/draft | Unlimited |
| Board coaching | 5/hour | 30/hour |
| Prediction context | 10/hour | 50/hour |
| Deep reports | Not available | 3/day per report type |
| Scout reports | 5/day | Unlimited |
| Player briefs | 10/day | Unlimited |
| Sim | 5/day | 30/day |

---

## MIGRATIONS SUMMARY

| Migration | Phase | Purpose |
|---|---|---|
| 27: prediction_thesis | 6A | Thesis, confidence, keyFactors on Prediction |
| 28: draft_pick_tags | 6A | pickTag, boardRankAtPick, boardId on DraftPick |
| 29: draft_board_comparison | 6A | DraftBoardComparison model |
| 30: capture_outcomes | 6A | outcomeLinked, outcomeData on LabCapture |
| 31: opinion_timeline | 6A | PlayerOpinionEvent model |
| 32: roster_move_reasoning | 6A | Reasoning fields on WaiverClaim, Trade, LineupSnapshot |
| 33: user_intelligence_profile | 6B | UserIntelligenceProfile model |
| 34: ai_insights_reports | 6C | AiInsight + AiReport models |

---

## NEW FILES SUMMARY

| File | Phase | Purpose |
|---|---|---|
| `backend/src/services/boardComparisonService.js` | 6A | Board vs. draft comparison |
| `backend/src/services/opinionTimelineService.js` | 6A | Opinion evolution event recording |
| `backend/src/services/decisionGraphService.js` | 6B | Decision history assembly |
| `backend/src/services/patternEngine.js` | 6B | Pattern detection and analysis |
| `backend/src/services/claudeService.js` | 6C | Claude API wrapper |
| `backend/src/services/aiCoachService.js` | 6C | AI coaching orchestrator |
| `backend/src/services/aiInsightPipeline.js` | 6C | Scheduled insight generation |
| `backend/src/routes/ai.js` | 6C | All AI API routes |
| `frontend/src/pages/CoachingReport.jsx` | 6E | Deep coaching report display |
| `frontend/src/pages/ScoutReport.jsx` | 6F | Scout report display |
| `frontend/src/pages/ClutchSim.jsx` | 6F | Matchup simulator |

---

## COST PROJECTIONS

**Assumptions:** 1,000 active users, Sonnet at $3/M input tokens, $15/M output tokens

| Feature | Calls/Day | Avg Tokens/Call | Est. Daily Cost |
|---|---|---|---|
| Ambient insights (3/user/day) | 3,000 | 2K in, 500 out | $25 |
| Draft nudges (seasonal) | 500 | 1K in, 200 out | $3 |
| Board coaching | 200 | 2K in, 300 out | $2 |
| Prediction context | 300 | 1K in, 200 out | $2 |
| Deep reports | 50 | 5K in, 2K out | $2 |
| Scout reports (cached) | 5 | 4K in, 2K out | $0.10 |
| Player briefs | 100 | 2K in, 500 out | $1 |
| Sim | 50 | 2K in, 500 out | $0.50 |
| **TOTAL** | | | **~$36/day ($1,080/mo)** |

**Cost optimization strategies:**
- Pattern engine does heavy lifting (no AI) → AI only narrates conclusions
- Ambient insights are batch-generated on schedule, not on-demand
- Scout reports are cached and shared across users
- Player briefs are cached 24 hours
- All contextual coaching uses Sonnet (fast, cheap), reports can use Opus
- Rate limits prevent abuse

---

## CRITICAL IMPLEMENTATION NOTES

1. **Phase order is mandatory.** 6A before 6B before 6C. The AI needs data infrastructure before it can be useful.

2. **Every new field is OPTIONAL.** No existing user flow should break or slow down. Thesis fields, pick tags, reasoning notes — all optional. The platform must work perfectly for users who never fill these in. The AI simply has less data to work with for those users, and should say so.

3. **Graceful degradation everywhere.** If the Claude API is down, every feature that uses it should work normally without coaching. Show the feature, hide the AI enhancement. Never show an error message because the AI failed.

4. **Opinion timeline hooks are fire-and-forget.** The `recordEvent` calls in existing services must never block the primary action. Wrap in try/catch, don't await. If the timeline write fails, the draft pick or board move still succeeds.

5. **Data confidence is honest.** If a user has 1 draft and 5 predictions, the AI should say "I don't have enough data to identify strong patterns yet, but here's what I'm seeing so far." Never present low-confidence insights with high-confidence language.

6. **The AI uses the user's own words.** When referencing captures, notes, and thesis fields, quote the user. "You wrote: 'This guy is the next Tyreek Hill.' He finished WR47." This makes coaching feel personal, not generic.

7. **No chatbot.** There is no free-form text input anywhere in this spec. The AI surfaces insights based on data and actions, not conversations. The "Ask Clutch" drawer from the original plan is intentionally removed. If we add conversational AI later, it's a separate phase.

8. **Test with synthetic data.** Before going live, create test users with 2-3 seasons of synthetic decision history. Run the pattern engine and verify insights are sensible. The pattern engine is the foundation — if it produces garbage, the AI will narrate garbage.

---

*This spec is the single source of truth for the AI Engine build. Follow it in order, verify each phase before proceeding, and reference this document at the start of every Claude Code session.*

*Document version: 1.0*
*Created: February 10, 2026*
