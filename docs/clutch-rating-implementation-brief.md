# Clutch Rating — Implementation Brief

Read `clutch-rating-system-architecture.md` first for the full model design. This doc tells you what to build and where.

---

## What To Build (In Order)

### Step 1: Rating Calculation Engine

Build a service/utility that takes a user's data and outputs their Clutch Rating. This is the foundation everything else depends on.

**Input:** An owner's season history (wins, losses, PF, PA, championships, playoff appearances) + any Clutch-native activity data (draft grades, lineup decisions, Prove It predictions, trades)

**Output:**
```typescript
interface ClutchRating {
  overall: number;              // 0-100, the composite score
  tier: 'ELITE' | 'VETERAN' | 'COMPETITOR' | 'CONTENDER' | 'DEVELOPING' | 'ROOKIE' | 'UNRANKED';
  confidence: number;           // 0-100, how much data backs this rating
  trend: 'up' | 'down' | 'stable' | 'new';
  components: {
    winRate:        { score: number; confidence: number; active: boolean };
    draftIQ:        { score: number; confidence: number; active: boolean };
    rosterMgmt:     { score: number; confidence: number; active: boolean };
    predictions:    { score: number; confidence: number; active: boolean };
    tradeAcumen:    { score: number; confidence: number; active: boolean };
    championships:  { score: number; confidence: number; active: boolean };
    consistency:    { score: number; confidence: number; active: boolean };
  };
  dataSourceSummary: string;    // e.g., "Based on 16 seasons of imported data"
  activeSince: string;          // When this rating was first calculated
  lastUpdated: string;          // Last recalculation timestamp
}
```

**Key logic (see architecture doc for full formulas):**
- Each component has a score (0-100) and confidence (0-100%)
- Confidence follows the curves defined in the architecture doc per component
- Components with 0% confidence (no data) are excluded and their weight is redistributed proportionally to active components
- Overall score = weighted sum of (component_score * adjusted_weight * confidence_factor)
- confidence_factor = confidence ^ 0.6 (softened curve)
- Overall confidence = weighted average of component confidences
- Tier is determined by overall score thresholds (see architecture doc)
- Trend compares current rating to rating from 30 days ago

**For V1, implement these components:**
1. Win Rate Intelligence — can calculate from imported W/L/PF data
2. Championship Pedigree — can calculate from imported championship data
3. Consistency — can calculate from imported season-by-season records (needs 2+ seasons)
4. Draft IQ — Clutch-native only, activates after first draft on platform
5. Roster Management — Clutch-native only, activates after first lineup set
6. Prediction Accuracy — from Prove It data, activates after first predictions

**Save Trade Acumen for V2** — needs trade outcome tracking infrastructure that doesn't exist yet.

### Step 2: Rating Display Components

Build the shared UI components used across the vault, dashboard, profile, and share views.

**RatingRing component:**
- Circular progress ring showing the rating number
- Ring fill corresponds to the score (74/100 = 74% filled)
- Ring color matches the tier or owner's color (configurable via prop)
- Dashed/incomplete ring sections represent unmeasured confidence
- Accepts `animate` prop for the reveal experience (ring fills from 0 with eased animation)
- Size variants: large (profile/modal hero), medium (vault row), small (compact/inline)

**RatingBreakdown component:**
- Horizontal bar chart showing each component's score
- Active components show filled bars with score numbers
- Inactive/locked components show lock icon + unlock action text
- Component bars colored by owner color or component-specific color
- Accepts `animate` prop for staggered bar fill animation

**RatingTierBadge component:**
- Small pill/badge showing the tier label (ELITE, VETERAN, etc.)
- Colored by tier color
- Used inline next to names, in cards, etc.

**RatingTrendIndicator component:**
- Small arrow/icon showing trend direction (↗ up, ↘ down, → stable, ✦ new)
- Colored by trend (green up, red down, neutral stable, gold new)

**RatingConfidenceIndicator component:**
- Visual showing how much data backs the rating
- Could be text ("Based on 16 seasons") or visual (filled vs dashed segments)
- Used in modals and detail views

### Step 3: Integrate Into Vault Reveal

Modify the vault reveal (Phase 2A from the vault implementation plan) to include Clutch Ratings:

1. **Loading screen** — add "Calculating Clutch Ratings" as a second line below "Merging X seasons of data"
2. **League headline stats** — add "Avg Rating" as a 6th stat in the top row
3. **Rating introduction card** — new component between headline stats and rankings:
   - "Introducing Clutch Rating" header with ⚡ icon
   - Brief explanation of what it is
   - "This is just the beginning" callout explaining it gets better with Clutch activity
   - Animates in after headline stats, before owner cards
4. **Owner rankings** — sort by Clutch Rating instead of raw win%
   - Add mini RatingRing to each owner row (between rank and avatar)
   - Add TrendIndicator next to owner name
5. **Owner detail modal** — lead with RatingRing + RatingBreakdown
   - Show component bars with scores
   - Show locked components with unlock prompts
   - Add "Rating Insight" text block at bottom

**Reference prototype:** `clutch-rating.jsx` (Tab 1: "Import User: Vault Reveal + Rating")

### Step 4: Dashboard Widget for New Users

Build the rating builder widget for users who haven't imported any data.

**Location:** Dashboard page, prominent placement (probably top-right or as a featured card)

**States:**

1. **Locked state** (0-2 components active):
   - Dashed/locked ring with 🔒 icon
   - "Clutch Rating" label
   - "Unlock X more components to activate" message
   - Progress segments (one per component, filled when active)
   - Component list showing locked items with unlock actions

2. **Activating state** (3+ components active):
   - Ring partially filled, partially dashed
   - Rating number visible but marked as "calibrating"
   - Active components show scores
   - Remaining locked components still show unlock actions
   - "Calculate My Clutch Rating" CTA appears

3. **Active state** (rating calculated):
   - Full ring with rating number and tier
   - All active components with scores
   - Remaining locked components with unlock actions
   - Confidence indicator showing data depth
   - Trend indicator once enough history exists

**Import CTA:** Below the widget, always show "Have league history? Import to boost your rating" linking to the import flow.

**Reference prototype:** `clutch-rating.jsx` (Tab 2: "New User: Dashboard Rating Builder")

### Step 5: Integrate Into Share/Invite Flow

Update the share/invite email and landing page to include Clutch Ratings:

1. **Invite email** — add the recipient's Clutch Rating ring next to their personal stat card
2. **Landing page** — show Clutch Rating in the personalized hero card and next to each owner in the leaderboard
3. **Blurred teasers** — add "Your Full Rating Breakdown" as another blurred/locked section alongside H2H and draft history

---

## Data Storage

```typescript
// Per-user rating record
interface UserRatingRecord {
  userId: string;
  leagueId: string;
  rating: ClutchRating;          // The full computed rating object
  computedAt: timestamp;
  dataInputHash: string;         // Hash of input data, for cache invalidation
}

// Rating history for trend calculation
interface RatingSnapshot {
  userId: string;
  leagueId: string;
  overall: number;
  components: Record<string, number>;  // component key → score
  snapshotDate: timestamp;
}
```

**Recalculation triggers:**
- Season data imported → recalculate immediately
- Week completes (during active season) → recalculate daily
- Draft completes → recalculate
- Trade outcome resolves (4 weeks post-trade) → recalculate
- Prove It predictions resolve → recalculate (batch, not per-prediction)
- Manual recalculation endpoint for admin/debugging

**Caching:**
- Cache the computed rating per user per league
- Invalidate when input data changes (check hash)
- Don't recompute on every page load — serve cached rating

---

## Testing the Model

Before shipping, validate the model against real data:

1. **Take the BroMontana Bowl data** (16 seasons, 8 owners) and compute ratings for everyone
2. **Sanity check:** Does the ranking feel right? Would the league agree?
3. **Edge cases to test:**
   - Owner with 1 season (low confidence, should still have a usable rating)
   - Owner with 16 losing seasons (should be low but not insulting)
   - Owner with 3 dominant seasons and 2 titles (should be high despite short tenure)
   - Brand new user with 0 data (should show locked state, not a 0)
4. **Adjust weights if needed** — the architecture doc weights are a starting point. Real data will reveal if any component is over/under-weighted.

---

## Files To Reference

- `clutch-rating-system-architecture.md` — Full model design, component definitions, confidence curves, edge cases
- `clutch-rating.jsx` — UI prototype with both import-user vault view and new-user dashboard widget
- `league-reveal.jsx` — Original vault reveal (pre-rating integration)
- `vault-dual-mode.jsx` — Dual-mode vault (first visit vs returning)
- `share-experience.jsx` — Share/invite funnel
