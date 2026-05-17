# Manager Intelligence (Retroactive Characteristic Extraction) — Design

**Date:** 2026-05-17
**Status:** Approved, ready for implementation plan
**Origin:** Queue item #202 reframed. Cowork's spec was a marketing-and-virality reveal page. Eric reframed: this is fundamentally a **data extraction + observability layer**, not a user-facing reveal. The user surface comes later, once we trust what we're saying.

---

## Goal

Build a backward-looking pipeline that extracts behavioral characteristics from imported league history and surfaces them in an internal admin dashboard for Eric to study. This is the **backward-looking twin of Decision Capture Year 1** (already shipped) — same bias dimensions, same vocabulary, same engine consumer. Imports provide the historical bootstrap; forward decision capture provides the live stream.

**Why this matters — defeating the cold-start problem.** A new user signing up today has zero behavioral signal in our system. They have to play a season or two before our coach can say anything personalized. With this pipeline, the moment they complete an import, we extract the equivalent of years of decision history — pick quality patterns, roster endowment habits, FAAB recency, sunk-cost drop behavior — and the bias engine treats them as a managed user with a real history. From day one of NFL 2026 season they get coaching that's calibrated to who they actually are, not the average of who everyone is.

**Critical framing for this build:** this is about US learning what's extractable, not about showing the user. Public-facing surfaces (career page, OG image shares, Clutch Rating in the wild) are deferred until extracted signal has earned credibility. The risk of premature exposure ("look how dumb their rating is") is real — we don't ship to users until we trust what we're saying.

## Confidence promotion model

Three layers; v1 ships **Layer 1 only**.

- **Layer 1 — Internal observation.** Extract → store privately → Eric reviews via admin dashboard. No user surface, no coach context, no marketing.
- **Layer 2 — Coach private context.** Once Eric validates a characteristic class, promote it to feed the Coach Vault. The AI coach reasons about it silently. Toggled per-class in admin.
- **Layer 3 — User-facing.** Only once durably trusted. Public characteristics on user profile, shareable cards, Cowork's reveal page idea. Future epic.

Each layer is gated by Eric's review. Promotion is explicit, never automatic.

---

## Storage

Single table: `ManagerCharacteristic`.

```prisma
model ManagerCharacteristic {
  id                  String   @id @default(cuid())
  userId              String
  user                User     @relation(fields: [userId], references: [id])

  characteristicType  String   // e.g., 'late_round_qb', 'finish_volatility'
  value               Json     // shape varies per type — structured per characteristic
  sampleSize          Int      // N observations (drafts, seasons, etc.)
  consistencyPct      Float    // 0-100, what % of observations match the pattern
  effectSize          Float    // standardized — how far from baseline
  confidenceScore     Float    // composite 0-100 — derived from N, consistency, effect
  confidenceLabel     String   // 'HIGH' | 'MEDIUM' | 'LOW'

  rawEvidence         Json     // drill-down detail (the picks/seasons/etc. behind this)
  sourceImportIds     String[] // which import jobs contributed to this characteristic
  computedAt          DateTime @default(now())

  @@unique([userId, characteristicType])
  @@index([characteristicType, confidenceScore])
  @@index([userId])
}
```

Why a structured table instead of JSON blobs on ManagerProfile:
- Need to query by `characteristicType` for aggregates ("how many users have HIGH on late-round QB?")
- Need to sort by `confidenceScore` for Top-N views
- Need to filter for cohort building (Filter/Experiment page)
- Index strategy supports both per-user lookup and aggregate scanning at scale (target: 100k users without rework)

## Confidence scoring

Composite 0-100 score, derived from three components:

```
confidenceScore = (sampleSizeWeight × consistencyWeight × effectSizeWeight) × 100
```

Where each weight maps to [0, 1] via simple curves (sigmoid-ish), tunable from the admin if needed.

**Default thresholds for labels:**
- **HIGH** (green) — N ≥ 5 AND consistency ≥ 80%
- **MEDIUM** (yellow) — 3 ≤ N < 5 OR consistency 60–79%
- **LOW** (gray) — N < 3 OR consistency < 60%

The composite score lets the UI sort and threshold-tweak. The label is for at-a-glance scanning.

## Initial characteristic set (v1) — bias-vocab aligned

Every extracted characteristic is the backward-looking twin of a forward decision capture signal (see `docs/CLUTCH_DECISION_CAPTURE_SPEC.md` v3 — 8 primitives, shared chips taxonomy, computed `pickQuality`). Same labels (REACH / VALUE / PAR / STEAL), same thresholds, same engine consumer.

**Pick quality** (forward: `draft_pick_made.pickQuality`)
1. `pick_reach_rate` — % of historical picks classified REACH (same ≤-3 spot ADP delta threshold as the server-side computation)
2. `pick_steal_rate` — % classified STEAL (≥+10 delta)
3. `pick_par_rate` — % PAR (±2)
4. `pick_value_rate` — % VALUE (+3 to +9)

**Auction discipline** (forward: `auctionValueAtPick` + `auction_nomination` primitive — only computed when auction history exists)
5. `auction_overpay_rate` — % auction wins above market value
6. `auction_bargain_rate` — % below market
7. `auction_spend_concentration` — top-3 spend as % of total budget (top-heavy vs balanced)

**Positional anchoring**
8. `r1_position_distribution` — historical first-round pick distribution: `{ RB: 0.5, WR: 0.3, QB: 0.1, Other: 0.1 }`
9. `position_round_profile` — per-position avg draft round + league-baseline delta

**Trade behavior** (forward: `trade_event` primitive)
10. `trade_frequency` — trades per season
11. `roster_endowment_ratio` — avg roster tenure of drafted players vs traded-in players (proxy for endowment effect — do they hold their own picks longer than acquired pieces?)

**Waiver behavior** (forward: `waiver_or_fa_claim` primitive)
12. `faab_front_load_pct` — % of FAAB spent in first 4 weeks (recency / chase-the-shiny signal)
13. `top_bid_rate` — % of claims won as the top bidder

**Drop behavior** (forward: `roster_drop` primitive — naked drops are the strongest sunk-cost signal)
14. `naked_drop_frequency` — drops with no replacement add per season
15. `drop_lag_games` — avg games of underperformance before drop (sunk cost lag)

**Outcome baseline** (NOT bias signals — these are the correlation targets the bias engine measures biases AGAINST. "Does this user's high reach_rate correlate with their finish_volatility?")
16. `finish_volatility` — std dev of regular-season finish across imported seasons
17. `championship_rate` — championships / total seasons
18. `playoff_rate` — playoff appearances / total seasons
19. `career_trajectory_slope` — slope of finish across years (improving / declining / flat) + `r²`

**Each characteristic is a separate row in `ManagerCharacteristic`** — so each is independently queryable, sortable, indexable in the admin. The Library page groups them visually by bias theme but the underlying storage is granular.

### Primitives unreachable from imports

Three of the 8 forward primitives have no historical equivalent in import data. They stay forward-only (Decision Capture Year 1 covers them going forward):

- `lineup_decision` — most platforms don't expose historical weekly lineups. Yahoo exposes some; Sleeper not really.
- `watchlist_event` — no platform exposes historical watchlist behavior. Watchlists are a Clutch-only concept.
- `auction_nomination` (behavior) — auction final values come through for most platforms, but the nomination sequence (who nominated whom, in what order) is generally lost.

These three biases (availability, narrative bias, nomination bias) will have **cold-start gaps for imported users.** Decision Capture Year 1 fills them in over the first season of forward play.

**Out of scope for v1:**
- Decision-level retroactive counterfactuals ("you started Evans over Lamb"). Requires per-decision data the importers don't capture. Year-2 work.
- Comparison vs. league-peer baselines (per-league relative ranking).
- Multi-year drift tracking (how characteristics change over time for the same user).

---

## Admin UI — 3 pages (v1 MVP)

Lives at `/admin/intelligence`. Admin-only auth.

### Page 1 — Library (`/admin/intelligence`)

The home page. Grid of every characteristic class.

Each card:
- Name + 1-sentence description
- Coverage badge: "data on 847 of 1,000 users"
- Distribution mini-histogram: HIGH/MED/LOW/NO_DATA counts
- Average confidenceScore across users
- Click → Characteristic Detail

Filter strip:
- Sort by coverage, avg confidence, alphabetical
- Filter by source platform (Sleeper/ESPN/Yahoo/Fantrax/MFL)
- "Promoted to coach" toggle filter

### Page 2 — Characteristic Detail (`/admin/intelligence/:characteristicType`)

Deep-dive on one class.

- Full histogram of values (e.g., "round QB drafted: bar chart")
- Top 25 highest-confidence users showing this pattern (clickable to User Profile)
- Threshold sliders: drag HIGH/MED/LOW boundaries, see distribution re-bucket live. Persist as default if liked.
- "Promote to coach context" toggle — when ON, this characteristic starts feeding the Coach Vault for matched users. OFF by default.
- "Suppress" flag — hide from Library without deleting data.
- Notes field — scratchpad for "this one feels noisy, revisit at 500 users."

### Page 3 — User Profile (`/admin/intelligence/users/:userId`)

Deep-dive on one user.

- Identity strip: avatar, displayName, username, # of imports, # of seasons, source platforms
- Every characteristic for this user, with confidence label + components (N, consistency %, effect size)
- Expandable evidence drill-down per characteristic: "show me the 8 actual drafts that produced this pattern"
- Year-by-year breakdown of seasons available

Drill-down links from any user reference in pages 1 or 2.

### Deferred to phase 1.5 (post-launch, decide if needed)

**Page 4 — Filter / Experiment.** Cohort builder: "show users HIGH on A AND HIGH on B." Save cohorts. Compare rating distributions across cohorts. Useful for the "lever-pulling" work but not blocking the core learning loop.

---

## Extraction pipeline

**Trigger points:**
1. **Import job completion** — when `sleeperImport.js` / `espnImport.js` / etc. finishes successfully, kick off `characteristicExtractor.runForUser(userId)` async (don't block the import response).
2. **Owner-claim event** — when the Vault wizard maps a user to historical season records, re-run extraction.
3. **Manual admin re-run** — button in admin to force re-compute for one user or all users.

**Architecture:**
- `characteristicExtractor.runForUser(userId, prisma)` — top-level entry
- Iterates over each characteristic-class extractor function: `extractLateRoundQB(userId, prisma)`, `extractFinishVolatility(userId, prisma)`, etc.
- Each extractor returns `{ value, sampleSize, consistencyPct, effectSize, rawEvidence }` or `null` (no data)
- Compute confidenceScore + confidenceLabel
- Upsert into `ManagerCharacteristic` by `(userId, characteristicType)`
- Errors per extractor are isolated and logged — one failure doesn't poison the rest

**Idempotency:** safe to re-run anytime. Always recomputes from current data, no incremental state.

**Performance budget:** target 5 seconds per user across all characteristics. At 1,000 users, full re-extraction is ~80 minutes single-threaded — fine for nightly batch.

## Aggregate caching

Library page queries (coverage counts, distribution histograms) hit a pre-computed daily aggregate table, not raw rows.

```prisma
model CharacteristicAggregate {
  id                  String   @id @default(cuid())
  characteristicType  String   @unique
  totalUsers          Int
  usersWithData       Int
  highConfidenceCount Int
  medConfidenceCount  Int
  lowConfidenceCount  Int
  noDataCount         Int
  avgConfidenceScore  Float
  computedAt          DateTime @default(now())
}
```

Cron: nightly at 3 AM ET, recompute all aggregates. ~30 seconds total. Library page is instant.

## Scale notes

- **1,000 users today, target 100k without rework.**
- Aggregates cached daily — Library page never hits raw `ManagerCharacteristic`.
- User Profile + Characteristic Detail pages use indexes: `(userId)` and `(characteristicType, confidenceScore desc)`.
- Top-25 queries are O(log N) via index.
- Threshold-slider re-bucketing happens client-side against the already-loaded distribution — instant.
- Histogram drill-downs paginate.

## Tweakability hooks

- **Threshold sliders** on Characteristic Detail — adjust HIGH/MED/LOW boundaries, persist as new defaults.
- **"Promote to coach context" toggle** per class — once trusted, flips on the Layer 2 promotion (feeds Coach Vault).
- **"Suppress" toggle** per class — hide from Library without deleting data.
- **Notes field** per class — Eric's scratchpad.
- **Manual re-extract** button — useful when extraction logic changes.
- **Force re-aggregate** button — recompute the aggregate cache on demand.

## Error handling

- Extractor errors per-class are caught, logged, and reported on the user's admin profile ("3 of 10 characteristic extractors failed for this user — click to see why"). Other characteristics still compute.
- If extraction fails entirely for a user (DB unreachable, etc.), it's logged but doesn't block import.
- Aggregate cron failures retry once, then log to AppError table.

## Testing

- **Unit tests per extractor:** seed a fixture user with known draft/season data, assert the extractor produces expected `{ value, sampleSize, consistencyPct, effectSize }`.
- **Integration test:** seed a multi-platform user with imports → run `runForUser` → assert 10 ManagerCharacteristic rows are written with reasonable shapes.
- **Admin UI smoke test:** load `/admin/intelligence` with a seeded characteristic distribution, click through Library → Detail → User Profile drill-downs.

## Out of scope (explicit)

- User-facing characteristic display (Layers 2 and 3 — coach context promotion, public career page).
- OG image rendering for shareable cards.
- Decision-level counterfactual extraction (started Evans over Lamb).
- Per-league relative characteristic comparison ("you're top-3 in this league on X").
- Multi-year drift / time-series tracking of characteristics.
- Predictive: "users with this profile tend to win N% more" — that's the Bias Engine, Year 2.

## Decision capture integration

None for v1. Characteristics are purely retroactive (from imports). When the Bias Engine is built, it will consume both `ManagerCharacteristic` (backward) and `RosterTransaction` envelope data + `ChopEvent` audit (forward — from Decision Capture Year 1 + the just-shipped Chopped format).

---

## Success criteria

- Every extracted characteristic uses the same vocabulary as the forward Decision Capture Year 1 spec (REACH / VALUE / PAR / STEAL labels, same primitives, same chips taxonomy). The bias engine treats backward + forward data as one corpus.
- A newly imported user has 15+ characteristics computed within 5 seconds of import completion, with reasonable confidence labels reflecting how much historical data they brought.
- Eric can open `/admin/intelligence`, scan the Library, and within 30 seconds identify which characteristics are well-covered, which need more data, and which feel like noise.
- For any imported user, Eric can drill into User Profile and see their extracted characteristics with the evidence backing each one.
- Eric can adjust HIGH/MED/LOW thresholds and watch distributions re-bucket live.
- Once Eric flips "promote to coach" on a characteristic class, the Coach Vault starts receiving that signal on next memory writer run.
- No regressions to existing import flows. Extraction failures don't block imports.
- 1,000 users worth of characteristic extraction completes in under 2 hours.

## Why this beats a cold start

Without this pipeline, a new Clutch user arrives at the platform with zero behavioral signal. Our coach defaults to generic advice for the first 8-12 weeks of play until enough decisions accumulate. Many users churn before that horizon.

With this pipeline:
- User imports a 5-year Sleeper league → 19 characteristics computed in seconds
- The bias engine sees a managed user with `pick_reach_rate: 38% (HIGH confidence, N=42)`, `roster_endowment_ratio: 1.8 (HIGH confidence, N=63)`, `drop_lag_games: 4.2 (HIGH confidence, N=12)` etc.
- Day 1 coaching is calibrated: "you've historically reached on QBs in round 5 — the projection model says wait until round 8 this year." That's a personalized intervention earned from imports, not from playing on Clutch.
- The forward Decision Capture stream from their actual Clutch play layers on top, refining the picture every week.

This is the engine moat. Sleeper, Yahoo, ESPN have years of decision data on every user — but they don't apply it as personalized coaching. Clutch will, and imports are how we get there without making users wait two seasons.
