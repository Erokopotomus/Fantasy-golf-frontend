# Personal AI Coach Vault — Design Document

> **Date:** 2026-03-03
> **Status:** Approved
> **Author:** Eric Saylor + Claude Code (brainstorming session)
> **Approach:** Structured Document Vault (Approach A)

---

## Problem

The current AI coach system is **stateless**. It knows what a user did this season (via Pattern Engine + Decision Graph), but it doesn't remember:

- What coaching it already delivered (and whether the user listened)
- Multi-season behavioral patterns ("You draft RBs too early every year")
- User-stated preferences ("I'm a homer for Ohio State players")
- Whether its coaching is actually changing behavior

The coach recomputes everything from scratch each time. As user data grows, stuffing raw Decision Graph data into API calls will blow up token costs.

## Solution

A **per-user coaching vault** — a set of structured JSON documents stored in PostgreSQL, organized by topic. A weekly cron ("Memory Writer") analyzes user behavior and distills it into compact vault documents. The AI coach reads relevant documents before generating output, keeping API calls small and context-rich.

### Industry Patterns Referenced

- **Meta/Spotify model:** Intelligence is in the distillation, not the storage. Behavior → compact profile → serve recommendations.
- **Layered memory:** Short-term (session context), medium-term (weekly patterns), long-term (multi-season profile). Different refresh cadences per layer.
- **Structured summaries over raw history:** Pre-distilled vault documents cap context size regardless of how long the user has been on the platform.

### Design Principles

1. **Cheap to run** — vault maintenance is pre-computed (weekly cron), no live AI calls for writes
2. **Aggregate-ready** — structured JSON is trivially queryable across all users for platform intelligence later
3. **Token-efficient** — coaching calls pull 2-3 relevant documents (~800-3,000 tokens) instead of raw data (50K+)
4. **Upgrade path** — vector embeddings can be bolted on later for similarity/clustering without changing vault structure
5. **Free-tier friendly** — vault runs for all users; premium tier unlocks richer AI narration on top

---

## Data Model

### CoachingMemory (vault documents)

```prisma
model CoachingMemory {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  sport         String?  // null = cross-sport
  documentType  String   // identity, draft_patterns, roster_patterns, predictions, coaching_log, season_narrative
  content       Json     // structured data — schema varies by type
  version       Int      @default(1)  // increments on each rewrite
  lastUpdatedBy String   // system_cron | user_input | coach_interaction
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([userId, sport, documentType])
  @@index([userId])
}
```

### CoachingInteraction (interaction tracking)

```prisma
model CoachingInteraction {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  insightType     String   // ambient, contextual, deep, briefing
  summary         String   // one-line summary of what was said
  context         String?  // what triggered it — draft, waiver, prediction, etc.
  userReaction    String?  // helpful, not_useful, ignored, null
  behaviorChanged Boolean  @default(false)
  createdAt       DateTime @default(now())

  @@index([userId])
  @@index([userId, createdAt])
}
```

### Vault Document Types

| Document | Written By | Contents |
|----------|-----------|----------|
| `identity` | User (Coach Settings page) + system defaults | Risk appetite, coaching tone, favorite teams/players, stated biases, self-described play style, user-typed notes |
| `draft_patterns` | Memory Writer cron | Multi-season draft tendencies, position allocation trends, reach frequency, board adherence, repeated mistakes, improvement signals |
| `roster_patterns` | Memory Writer cron | Waiver timing habits, trade style (aggressive/passive), lineup optimization rate, hold-too-long/drop-too-early tendencies |
| `predictions` | Memory Writer cron | Accuracy by category over time, calibration drift, blind spots, best/worst prediction types, streak patterns |
| `coaching_log` | System (after each coaching output) | Last 20 coaching interactions: what was said, whether user engaged, whether behavior changed within 2 weeks |
| `season_narrative` | Memory Writer cron (one per season per sport) | Season arc — draft grade, early moves, midseason pivot, playoff run, final outcome. Persists across years. |

### Identity Document Schema

```json
{
  "coachingTone": "encouraging",
  "coachingFrequency": "daily",
  "riskAppetite": "balanced",
  "draftPhilosophy": ["best_available"],
  "favoriteTeams": [],
  "statedBiases": [],
  "userNotes": [
    { "text": "I'm a homer for Ohio State players", "addedAt": "2026-03-15" },
    { "text": "Don't coach me on predictions", "addedAt": "2026-03-20" }
  ]
}
```

### Draft Patterns Document Schema

```json
{
  "seasonCount": 4,
  "lastUpdated": "2026-03-03",
  "positionAllocation": {
    "r1": { "RB": 3, "WR": 1, "QB": 0 },
    "r2": { "WR": 2, "RB": 1, "TE": 1 }
  },
  "reachFrequency": 0.32,
  "boardAdherence": 0.72,
  "boardAdherenceTrend": "improving",
  "repeatingPatterns": [
    { "pattern": "Reaches on RB in round 1", "occurrences": 3, "severity": "high" },
    { "pattern": "Ignores TE until round 8+", "occurrences": 4, "severity": "medium" }
  ],
  "improvements": [
    { "area": "Board adherence improved from 45% to 72%", "since": "2025" }
  ],
  "draftGrades": [
    { "season": "2024", "grade": "B-", "bestPick": "Amon-Ra St. Brown R3", "worstPick": "Josh Allen R1" },
    { "season": "2025", "grade": "B+", "bestPick": "Puka Nacua R4", "worstPick": "N/A" }
  ]
}
```

### Coaching Log Document Schema

```json
{
  "recentInteractions": [
    {
      "date": "2026-02-28",
      "type": "ambient",
      "summary": "Suggested diversifying draft positions based on 3-year RB-heavy pattern",
      "reaction": "helpful",
      "behaviorChanged": true
    },
    {
      "date": "2026-03-01",
      "type": "contextual",
      "summary": "Flagged prediction calibration — picking YES 78% but accuracy only 41% on top-10 calls",
      "reaction": null,
      "behaviorChanged": false
    }
  ],
  "ignoredAdviceCount": 3,
  "helpfulAdviceCount": 8,
  "behaviorChangeRate": 0.45,
  "topIgnoredTopics": ["draft position diversity"],
  "topHelpfulTopics": ["waiver timing", "prediction framing"]
}
```

### Season Narrative Document Schema

```json
{
  "season": "2025",
  "sport": "golf",
  "narrative": {
    "draft": "Drafted a balanced team with strong SG Approach players. Grade: B+. Best pick: Scottie Scheffler staying on board to pick 4.",
    "earlySeason": "Started 3-1 with strong waiver adds. Picked up Wyndham Clark after week 2.",
    "midSeason": "Hit a 3-game losing streak. Held too long on injured Rory McIlroy instead of streaming.",
    "lateSeason": "Recovered with aggressive waiver play. Made 2 trades to strengthen putting-heavy roster for playoff courses.",
    "playoffs": "Won semifinal by 12 points. Lost championship by 3.",
    "finalFinish": "2nd place. 11-5 record.",
    "keyLesson": "Holding injured players too long cost 2 wins in the middle stretch."
  }
}
```

---

## Memory Writer Service

**File:** `backend/src/services/coachingMemoryWriter.js`

**Cron schedule:** Wednesday 4:30 AM ET (runs after Pattern Engine at Wed 4 AM)

### Process Flow

1. Get all active users (activity in last 30 days)
2. For each user, pull:
   - Existing vault documents (`CoachingMemory` rows)
   - Fresh `UserIntelligenceProfile` (just computed by Pattern Engine)
   - `CoachingInteraction` records since last vault update
   - Relevant Decision Graph data (draft grades, roster moves, prediction outcomes)
3. **Diff against previous version** — only rewrite a document if meaningful change detected:
   - New season data added
   - Accuracy shift > 5%
   - New behavioral pattern detected (3+ occurrences)
   - New coaching interactions to roll up
4. Write updated documents with `version++`
5. Log: `[Memory Writer] Updated X documents for Y users`

### Distillation Logic (No AI calls — pure computation)

| Document | Input Sources | Logic |
|----------|-------------|-------|
| `draft_patterns` | Pattern Engine `draftPatterns` + historical draft grades + Decision Graph draft captures | Compare current season to prior seasons. Flag repeating patterns. Track improvements. |
| `roster_patterns` | Pattern Engine `rosterPatterns` + waiver/trade history + lineup decisions | Compute waiver timing distribution, trade win rate, avg days-held before drop. Flag tendencies. |
| `predictions` | Pattern Engine `predictionPatterns` + resolved predictions with timestamps | Rolling accuracy by type (30d, 90d, season). Calibration check. Streak tracking. |
| `coaching_log` | `CoachingInteraction` records | Summarize last 20 interactions. Flag ignored advice. Flag behavior changes. Compute rates. |
| `season_narrative` | Standings, draft grade, roster moves, prediction accuracy, final finish | One paragraph per section. Written as narrative the coach can reference in future seasons. |

**The `identity` document is NOT touched by the cron** — user-controlled only.

---

## Coach Context Assembly

**File:** `backend/src/services/coachContextAssembly.js`

**Function:** `assembleCoachContext(userId, situation)`

```javascript
// situation = { type, leagueId?, playerId?, sport }
// type = 'briefing' | 'draft_prep' | 'waiver_decision' | 'prediction' | 'live_scoring' | 'deep_report'
```

### Context Rules — What Gets Pulled Per Situation

| Situation | Vault Documents Pulled | Estimated Tokens |
|-----------|----------------------|-----------------|
| `briefing` | `identity` + `coaching_log` (last 5 interactions) | ~800 |
| `draft_prep` | `identity` + `draft_patterns` + `coaching_log` (last 3 draft-related) | ~1,200 |
| `waiver_decision` | `identity` + `roster_patterns` + `season_narrative` (current) | ~1,000 |
| `prediction` | `identity` + `predictions` + `coaching_log` (last 3 prediction-related) | ~900 |
| `live_scoring` | `identity` + `season_narrative` (current) | ~600 |
| `deep_report` | All documents for that sport | ~3,000 |

### Integration with Existing Coach System

Current flow: `generateInsight(userProfile, patternData)` — raw patterns, computed on the fly.

New flow: `generateInsight(coachContext)` — pre-distilled vault documents with multi-season memory + coaching history + user preferences.

The existing 3 modes stay the same:
- **Ambient (free):** Template narration reads from vault. Zero AI calls for most outputs.
- **Contextual (free now, premium later):** Vault documents injected as system context for Claude call.
- **Deep (premium later):** Full vault pulled. Richest coaching, highest token cost.

### Coach Voice Adaptation

Based on `identity.coachingTone`:
- `encouraging` (default) — "Your board discipline improved a lot this season — let's keep that momentum going."
- `direct` — "You reach on RBs every year. Stop."
- `analytical` — "Your R1 pick has finished outside top 12 in 3 of 4 drafts, suggesting ADP-anchoring bias."

---

## User-Facing UX: Coach Settings Page

**Route:** `/coach/settings` (or tab within profile page)

### Section 1: Coaching Preferences (toggles + dropdowns)

| Setting | Input Type | Options |
|---------|-----------|---------|
| Coaching tone | 3-way toggle | Encouraging (default) / Direct / Analytical |
| Coaching frequency | Dropdown | Daily nudges / Weekly summaries / Only when I ask |
| Risk appetite | Slider or 3-way | Conservative / Balanced (default) / Aggressive |
| Draft philosophy | Multi-select pills | Best available / Position scarcity / Stars & scrubs / Zero RB / Heavy RB |

### Section 2: Tell Your Coach (free text + saved entries)

Text input with "Save" button. User types notes like:
- "I'm a homer for Ohio State players"
- "I always overthink QB picks"
- "Don't coach me on predictions, I know what I'm doing"

Each entry saves as a line item in the `identity` vault document. User can see saved entries and delete any. Simple CRUD — no AI processing on save.

### Section 3: Coaching History (read-only)

Feed of recent `CoachingInteraction` records with thumbs up/down buttons. User sees what the coach has said and rates usefulness. Feeds into `coaching_log` vault document via Memory Writer.

### Navigation

Under user profile dropdown or sub-tab on Profile page. Not a top-level nav item.

### API Calls

No AI calls — pure CRUD. Reads/writes to `CoachingMemory` (identity document) and `CoachingInteraction` records.

---

## API Routes

**New route file:** `backend/src/routes/coachMemory.js`

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/coach/memory` | Get all vault documents for current user (optional `?sport=` filter) |
| `GET` | `/api/coach/memory/:documentType` | Get specific vault document |
| `PUT` | `/api/coach/identity` | Update identity document (Coach Settings save) |
| `POST` | `/api/coach/identity/notes` | Add a user note to identity document |
| `DELETE` | `/api/coach/identity/notes/:index` | Remove a user note |
| `GET` | `/api/coach/interactions` | Get recent coaching interactions (paginated) |
| `PATCH` | `/api/coach/interactions/:id/react` | Submit thumbs up/down on a coaching interaction |

---

## Future: Aggregate Intelligence (Designed For, Not Built Yet)

The structured vault enables platform-wide queries when user base grows:

- **Behavioral clustering:** Group users by draft patterns, risk appetite, prediction style
- **Comparative coaching:** "Users with your profile who diversified their draft saw 15% more wins"
- **Consensus intelligence:** Weighted aggregation of sharp users' vault patterns
- **Trend detection:** "Platform-wide, RB-heavy drafters are underperforming this season"
- **Anonymized vault analytics:** What coaching advice actually changes behavior across users?

Schema supports this — every `CoachingMemory` row is queryable by `documentType` across all users. No migration needed when this layer is built.

---

## Implementation Scope

### New Files
- `backend/src/services/coachingMemoryWriter.js` — Memory Writer cron service
- `backend/src/services/coachContextAssembly.js` — Context assembly for coaching calls
- `backend/src/routes/coachMemory.js` — API routes for vault + interactions
- `frontend/src/pages/CoachSettings.jsx` — Coach Settings page
- `frontend/src/hooks/useCoachMemory.js` — Hook for vault data
- `frontend/src/components/coaching/CoachingHistory.jsx` — Interaction history feed

### Modified Files
- `backend/prisma/schema.prisma` — Add CoachingMemory + CoachingInteraction models
- `backend/src/index.js` — Add Memory Writer cron (Wed 4:30 AM)
- `backend/src/services/aiCoachService.js` — Swap raw profile for assembled coach context
- `backend/src/services/aiInsightPipeline.js` — Log interactions to CoachingInteraction
- `backend/src/routes/ai.js` — Coach briefing uses vault context
- `frontend/src/App.jsx` — Add /coach/settings route
- `frontend/src/services/api.js` — Add coach memory API methods

### Migration
- One new migration: `coaching_memory_vault` — creates CoachingMemory + CoachingInteraction tables

---

*Design approved 2026-03-03. Next step: implementation plan via writing-plans skill.*
