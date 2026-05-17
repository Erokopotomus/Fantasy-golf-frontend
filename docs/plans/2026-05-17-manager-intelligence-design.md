# Manager Intelligence (Retroactive Characteristic Extraction) — Design

**Date:** 2026-05-17
**Status:** Approved, ready for implementation plan
**Origin:** Queue item #202 reframed. Cowork's spec was a marketing-and-virality reveal page. Eric reframed: this is fundamentally a **data extraction + observability layer**, not a user-facing reveal. The user surface comes later, once we trust what we're saying.

---

## Goal

Build a backward-looking pipeline that extracts behavioral characteristics from imported league history and surfaces them in an internal admin dashboard for Eric to study. Pairs with Decision Capture Year 1 (already shipped) — forward-looking decision data plus backward-looking historical signal feeds the eventual Bias Engine.

**Critical framing:** this is about US learning what's extractable, not about showing the user. Public-facing surfaces (career page, OG image shares, Clutch Rating in the wild) are deferred until extracted signal has earned credibility. The risk of premature exposure ("look how dumb their rating is") is real — we don't ship to users until we trust what we're saying.

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

## Initial characteristic set (v1)

Cheap to compute from existing imported data. All derive from `DraftPick`, `HistoricalSeason`, `LeagueImport` records.

**Draft-based (most platforms have this):**
1. **`position_round_preference`** — what round does this manager typically draft each position? Value: `{ QB: avgRound, RB: avgRound, ... }` plus league-baseline delta.
2. **`adp_discipline`** — average ADP delta per pick (negative = reach, positive = value). Value: `{ avgDelta, stdDev }`.
3. **`first_round_position_bias`** — distribution of R1 picks across positions. Value: `{ RB: 0.5, WR: 0.3, QB: 0.1, Other: 0.1 }`.
4. **`auction_spend_distribution`** — for auction drafts only: how concentrated is spend? Value: `{ topPickShare, balanceCoefficient }`. NULL when no auction history.

**Outcome-based (universal):**
5. **`finish_volatility`** — std dev of regular-season finish across imported seasons.
6. **`championship_rate`** — championships / total seasons.
7. **`playoff_rate`** — playoff appearances / total seasons.
8. **`career_trajectory`** — slope of finish across years (improving / declining / flat). Value: `{ slope, r2 }`.

**Transaction-based (partial coverage — will show as NO_DATA for unsupported platforms):**
9. **`trade_frequency`** — trades per season. Sleeper/ESPN/Yahoo only.
10. **`waiver_aggression`** — claims per season + FAAB spend distribution. Sleeper/ESPN/Yahoo only.

Including #9 and #10 even with uneven coverage is intentional — the admin will surface coverage as a first-class signal, so Eric can see "this characteristic has data on 312 of 1,000 users" and decide whether it's worth pursuing more aggressive import enrichment.

**Out of scope for v1:**
- Decision-level retroactive analysis (counterfactuals — "you started Evans over Lamb"). Requires per-decision data the importers don't capture today. Year-2 work.
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

- Eric can open `/admin/intelligence`, scan the Library, and within 30 seconds identify which characteristics are well-covered, which need more data, and which feel like noise.
- For any imported user, Eric can drill into User Profile and see their extracted characteristics with the evidence backing each one.
- Eric can adjust HIGH/MED/LOW thresholds and watch distributions re-bucket live.
- Once Eric flips "promote to coach" on a characteristic class, the Coach Vault starts receiving that signal on next memory writer run.
- No regressions to existing import flows. Extraction failures don't block imports.
- 1,000 users worth of characteristic extraction completes in under 2 hours.
