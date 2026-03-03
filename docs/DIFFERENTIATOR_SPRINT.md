# Differentiator Sprint — Surface the 5 Things That Make Clutch Worth Switching To

> **Goal:** Make Clutch's differentiators visible within 30 seconds of using the platform. No new backend work — all data endpoints exist. This is a frontend surfacing sprint.

---

## THE 7 PHASES

### Phase 1: Dashboard — Rating Widget + Coach Upgrade
**Why first:** Every user lands here. The `DashboardRatingWidget` component is fully built but literally never imported anywhere.

- **Import and render DashboardRatingWidget** on Dashboard.jsx (after coach briefing, before league cards)
- **Upgrade CoachBriefing visual** — add NeuralCluster (sm) badge so the coach feels like a character, not a text line
- **Result:** Users see their Clutch Rating progress + AI Coach presence within 5 seconds of logging in

### Phase 2: Standings — Rating Badges Next to Manager Names
**Why:** Where managers compete. Perfect place to show who's rated what.

- **Add RatingTierBadge (sm) next to owner names** in StandingsTable
- **Make names clickable** → links to `/@username` manager profile
- **Add "View League Vault" link** below standings table (gold accent CTA)
- **Batch fetch ratings** via `useClutchRatings(userIds)` for performance

### Phase 3: League Home — Coach Card + Prediction Leaderboard
**Why:** Highest-engagement page. Coach is currently one italic line.

- **Replace italic coach line with a proper Card** — NeuralCluster (sm) + headline + body + CTA button
- **Add "League Predictions" mini-leaderboard widget** — top 5 managers by accuracy this week
- **Result:** Two differentiators (Coach + Predictions) visible on the page people visit most

### Phase 4: Navbar — Vault + Prove It Discovery
**Why:** Features people can't find don't exist. Vault and Predictions need nav presence.

- **Add "Prove It" to main nav** (next to Live) — links to `/prove-it`
- **Add Vault link to Leagues dropdown** — section divider + "League Vault" with archive icon
- **Result:** Both features one click away from every page

### Phase 5: Prediction UX — NFL Grouping + Surface Everywhere
**Why:** NFL predictions are a flat list of 114 items. Golf predictions work well but NFL needs parity.

- **Group NFL predictions by week/type** with collapsible sections
- **Add prediction counts/accuracy to league member cards** on League Home
- **Add "Make a Call" prompts on Player Drawer** when viewing NFL players
- **Result:** Predictions feel interactive, not like a data dump

### Phase 6: Vault Prominence — Dashboard Cards + Standings Links
**Why:** Vault is behind a nav pill. Needs to be surfaced where people already are.

- **Add "League Vaults" section on Dashboard** below league cards — thumbnail cards with champion name + record count
- **Add Vault CTA on Standings page** — "See 17 seasons of history → League Vault"
- **Result:** Vault becomes discoverable without hunting for it

### Phase 7: Landing + Onboarding Polish
**Why:** First impression for cold visitors. Do this last since it benefits from all other work being done.

- **Fix rating widget conflict** (39 vs 84 — already in queue as item 033)
- **Update landing page to be sport-aware** (NFL section equal to Golf, not secondary)
- **Refresh onboarding to mention all 5 differentiators** — Coach, Rating, Vault, Predictions, Clean UX
- **Result:** New visitors understand what makes Clutch different before they sign up

---

## IMPLEMENTATION ORDER FOR CLAUDE CODE

| Queue Item | Phase | Description | Complexity |
|-----------|-------|-------------|-----------|
| 038 | 1 | Dashboard: import DashboardRatingWidget + coach NeuralCluster upgrade | Small |
| 039 | 4 | Navbar: add Prove It nav item + Vault to Leagues dropdown | Small |
| 040 | 2 | Standings: RatingTierBadge next to names + clickable profiles + Vault link | Medium |
| 041 | 3 | League Home: coach Card upgrade + prediction leaderboard widget | Medium |
| 042 | 6 | Dashboard: Vault cards section + Standings Vault CTA | Small |
| 043 | 5 | NFL predictions: group by week/type, add prediction prompts to Player Drawer | Medium |
| 044 | 7 | Landing/onboarding: sport-aware refresh + differentiator messaging | Medium |

**Phases 1 and 4 are quick wins.** Dashboard widget import is literally adding an import statement and rendering a component that's already built. Navbar changes are small. These should go first.

**Phases 2, 3, and 5 are the meat.** Standings ratings, League Home coach upgrade, and NFL prediction UX are where the real differentiation becomes visible.

**Phases 6 and 7 are polish.** Vault discovery and landing page refresh are important but less urgent than the in-app changes.

---

## EXISTING COMPONENTS TO REUSE (NO NEW BUILDS NEEDED)

| Component | Location | What It Does | Currently Used? |
|-----------|----------|-------------|----------------|
| `DashboardRatingWidget` | `components/dashboard/` | Full rating card with progress, tier, unlock CTAs | **NO — never imported** |
| `RatingRing` | `components/vault/` | Circular progress ring (sm/md/lg) | Yes, in vault |
| `RatingTierBadge` | `components/vault/` | Pill badge showing tier name | Yes, in vault |
| `NeuralCluster` | `components/common/` | Animated brain visual (sm/md/lg) | Yes, limited |
| `PredictionWidget` | `components/predictions/` | Compact accuracy + streak widget | Yes, on Dashboard |
| `useClutchRating` | `hooks/` | Fetch single user rating | Yes |
| `useClutchRatings` | `hooks/` | Batch fetch ratings | Yes, in vault |

---

## DESIGN RULES

1. **No new backend endpoints.** Everything needed already exists.
2. **Reuse components.** DashboardRatingWidget is the biggest win — it's fully built and orphaned.
3. **Mobile-first.** All additions must stack cleanly on phone screens.
4. **Progressive disclosure.** Rating starts locked for new users and unlocks as they take actions — this is already built into the widget.
5. **Sport-agnostic.** All changes work for both Golf and NFL leagues.
6. **Consistent brand.** Gold for ratings, field-green for golf, blaze-orange for NFL, NeuralCluster for coach.

---

*Sprint designed: 2026-03-02. 7 phases, 7 queue items, zero new backend work.*
