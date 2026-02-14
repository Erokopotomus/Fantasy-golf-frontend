# Clutch Rating System — Architecture & Model Design

## The Philosophy

The Clutch Rating is a **confidence-weighted composite score** that answers one question: "How skilled is this fantasy manager?" It's designed to be:

1. **Fair across experience levels** — A dominant 2-year player shouldn't be penalized, but a dominant 16-year player should be recognized for proving it over time
2. **Multi-dimensional** — Winning alone isn't enough. The best managers draft well, manage rosters intelligently, trade shrewdly, and make accurate predictions
3. **Progressive** — The rating becomes more accurate (and harder to move) as more data accumulates
4. **Platform-sticky** — Components that only Clutch can measure (Prove It, trade analysis, draft grading) create value that doesn't exist anywhere else

Think of it like a credit score:
- **FICO has 5 components** with different weights → Clutch Rating has 6-8 components
- **Length of credit history matters** but doesn't dominate → Longevity matters but is one of many factors
- **New accounts aren't penalized, they're uncertain** → New users have wider confidence intervals, not lower scores
- **Score is hard to game** → No single dimension can carry you to elite

---

## Rating Scale

**Range: 0-100**

| Rating | Tier | Description | Rough Percentile |
|--------|------|-------------|------------------|
| 90-100 | ELITE | Top-tier across multiple dimensions with proven track record | Top 5% |
| 80-89 | VETERAN | Consistently strong with clear expertise areas | Top 15% |
| 70-79 | COMPETITOR | Above average with developing strengths | Top 35% |
| 60-69 | CONTENDER | Solid foundation, room to grow | Top 55% |
| 50-59 | DEVELOPING | Building their track record | Top 75% |
| 40-49 | ROOKIE | Early stage, limited data | Top 90% |
| 0-39 | UNRANKED | Insufficient data or poor performance | Bottom 10% |

**Important:** The distribution should be roughly normal centered around 55-60. Most active fantasy players are decent — the system shouldn't make the majority feel bad. Elite should be genuinely hard to reach.

---

## Core Components

### 1. Win Rate Intelligence (Weight: 20%)
**What it measures:** Raw competitive results — wins, losses, and points scored relative to the league

**Inputs:**
- Overall win percentage (all-time)
- Recent win percentage (last 2-3 seasons, weighted heavier)
- Points For vs league average (measures team strength independent of H2H luck)
- Points Against vs league average (partially controls for schedule luck)
- Playoff appearance rate

**Score calculation:**
```
Base = (career_win_pct * 0.4) + (recent_win_pct * 0.4) + (pf_vs_avg_normalized * 0.2)
Adjusted for league competitiveness (more competitive leagues → higher scores for same win%)
```

**Confidence curve:**
- 1 season: 25% confidence
- 3 seasons: 55% confidence
- 5 seasons: 75% confidence
- 8 seasons: 90% confidence
- 12+ seasons: 98% confidence

**Why this matters:** This is the most basic "are you good?" signal. But it's only 20% because H2H fantasy has significant variance — the best team doesn't always win.

---

### 2. Draft IQ (Weight: 18%)
**What it measures:** Ability to identify value in the draft

**Inputs:**
- Draft pick value vs end-of-season value (did your picks outperform their ADP?)
- Hit rate on early-round picks (Rd 1-3 bust avoidance)
- Late-round value rate (finding starters in Rd 8+)
- Positional balance score
- Draft grade vs league average

**Score calculation:**
```
Base = (pick_value_over_expected * 0.35) + (early_hit_rate * 0.25) + (late_steal_rate * 0.25) + (positional_balance * 0.15)
```

**Confidence curve:**
- 1 draft: 30% confidence
- 3 drafts: 60% confidence
- 5 drafts: 80% confidence
- 8+ drafts: 95% confidence

**Why this matters:** The draft is the highest-leverage single event in fantasy. Elite managers consistently extract more value. This also has low variance — draft skill is one of the most stable predictors of season success.

**For imported data:** We may not have pick-by-pick draft data for old Yahoo seasons. In this case, Draft IQ starts as "unmeasured" and activates when the user completes their first draft on Clutch. The rating still works — it just has fewer components and wider confidence intervals.

---

### 3. Roster Management (Weight: 18%)
**What it measures:** In-season decision-making quality

**Inputs:**
- Optimal lineup percentage (how often did you start the right players?)
- Points left on bench (lower = better roster decisions)
- Waiver wire acquisition value (FAAB efficiency, waiver priority usage)
- Roster churn rate vs league average (shows engagement without rewarding random moves)
- Injury response time (how quickly you adapt to injuries)

**Score calculation:**
```
Base = (optimal_lineup_pct * 0.30) + (bench_efficiency * 0.25) + (waiver_value * 0.25) + (engagement_score * 0.10) + (injury_response * 0.10)
```

**Confidence curve:**
- 4 weeks: 20% confidence
- 8 weeks: 45% confidence
- 1 full season: 65% confidence
- 3 seasons: 85% confidence
- 5+ seasons: 95% confidence

**Why this matters:** This separates active managers from set-it-and-forget-it players. The best managers squeeze value every week.

**For imported data:** Limited — we probably only have final rosters and scores, not weekly lineup decisions. This component activates fully once playing on Clutch.

---

### 4. Prediction Accuracy (Weight: 15%)
**What it measures:** Sports knowledge and analytical ability via Prove It

**Inputs:**
- Overall prediction accuracy (% correct)
- Confidence calibration (when you say 80% confident, are you right 80% of the time?)
- Edge detection (do you outperform the consensus/market?)
- Prediction volume (more predictions = more data, but no volume bonus — quality over quantity)
- Streak consistency (avoiding hot/cold swings)

**Score calculation:**
```
Base = (accuracy_vs_baseline * 0.30) + (calibration_score * 0.25) + (edge_score * 0.25) + (consistency * 0.20)
```

**Confidence curve:**
- 10 predictions: 15% confidence
- 50 predictions: 40% confidence
- 200 predictions: 70% confidence
- 500+ predictions: 90% confidence

**Why this matters:** This is Clutch's unique differentiator. No other platform measures this. It also captures sports knowledge that's independent of fantasy roster management — someone might be an incredible analyst but play in a casual league. Prove It lets that skill show.

**For imported data:** Not available — this component is Clutch-only and activates when users engage with Prove It. This is intentional: it gives users a reason to use the platform beyond just running their league.

---

### 5. Trade Acumen (Weight: 12%)
**What it measures:** Ability to identify and execute value-positive trades

**Inputs:**
- Trade win rate (did you "win" the trade based on rest-of-season performance?)
- Value gained per trade (net fantasy points gained vs given up)
- Trade timing (buying low on underperformers who bounce back, selling high on overperformers)
- Trade volume relative to league (shows willingness to be active in the market)

**Score calculation:**
```
Base = (trade_win_rate * 0.35) + (value_gained_normalized * 0.30) + (timing_score * 0.20) + (activity_vs_league * 0.15)
```

**Confidence curve:**
- 1-2 trades: 15% confidence
- 5 trades: 35% confidence
- 10 trades: 55% confidence
- 20+ trades: 80% confidence
- 40+ trades: 95% confidence

**Why this matters:** Trade skill is hard to measure anywhere else. Clutch can track post-trade performance and assign value retroactively.

**For imported data:** Likely unavailable for old Yahoo data. Activates on Clutch.

---

### 6. Championship Pedigree (Weight: 10%)
**What it measures:** Ability to win when it matters most

**Inputs:**
- Championship count
- Championship rate (titles / seasons played)
- Playoff appearance rate
- Playoff win percentage
- Runner-up finishes (shows they get close, even if they don't always close)

**Score calculation:**
```
Base = (title_rate_normalized * 0.35) + (playoff_appearance_rate * 0.25) + (playoff_win_pct * 0.25) + (runner_up_bonus * 0.15)
```

**Confidence curve:**
- 1-2 seasons: 20% confidence (playoffs might be luck)
- 4 seasons: 50% confidence
- 8 seasons: 80% confidence
- 12+ seasons: 95% confidence

**Why this matters:** Regular season success is great, but championships are what people remember. This component rewards clutch performance in high-stakes situations.

---

### 7. Consistency (Weight: 7%)
**What it measures:** Reliability and stability across seasons

**Inputs:**
- Standard deviation of season win percentages (lower = more consistent)
- Longest streak without a losing season
- Season-over-season improvement trend
- Worst season floor (even consistent managers have bad years — how bad was their worst?)

**Score calculation:**
```
Base = (low_variance_score * 0.40) + (no_losing_streak * 0.25) + (improvement_trend * 0.20) + (floor_protection * 0.15)
```

**Confidence curve:**
- 1-2 seasons: 10% confidence (can't measure consistency with 1 data point)
- 4 seasons: 45% confidence
- 6 seasons: 70% confidence
- 10+ seasons: 90% confidence

**Why this matters:** Anyone can have one great year. Consistent performers demonstrate repeatable skill rather than luck.

---

## The Confidence System (Critical)

This is what makes the model fair across experience levels. Every component has a confidence value (0-100%) based on the amount of data available. The overall rating calculation uses confidence as a blending weight.

### How Confidence Affects the Score

```
component_contribution = component_score * component_weight * confidence_factor

Where confidence_factor = confidence ^ 0.6  (softened curve so low confidence still contributes)
```

**What happens with low confidence:**
- The component still contributes, but with reduced impact
- The "missing" weight gets redistributed proportionally to higher-confidence components
- This means a new user's rating is primarily driven by whatever they HAVE demonstrated, not penalized for what they haven't

### Example: New User vs Veteran

**Eric (16 seasons, imported):**
| Component | Score | Confidence | Effective Weight |
|-----------|-------|------------|-----------------|
| Win Rate | 68 | 98% | 20% |
| Draft IQ | — | 0% (no data) | 0% → redistributed |
| Roster Mgmt | — | 0% (no data) | 0% → redistributed |
| Predictions | — | 0% (no data) | 0% → redistributed |
| Trade Acumen | — | 0% (no data) | 0% → redistributed |
| Championships | 55 | 95% | 10% |
| Consistency | 72 | 90% | 7% |

With redistribution, Eric's rating is calculated from Win Rate, Championships, and Consistency with their weights scaled up proportionally. His rating: ~68. Honest reflection of a solid but not dominant career across the data we have.

Note: "—" doesn't mean 0, it means unmeasured. The rating clearly communicates this.

**Kirk (3 seasons, imported):**
| Component | Score | Confidence | Effective Weight |
|-----------|-------|------------|-----------------|
| Win Rate | 88 | 55% | 20% (reduced effective) |
| Draft IQ | — | 0% | 0% → redistributed |
| Roster Mgmt | — | 0% | 0% → redistributed |
| Predictions | — | 0% (no data) | 0% → redistributed |
| Trade Acumen | — | 0% (no data) | 0% → redistributed |
| Championships | 82 | 30% | 10% (reduced effective) |
| Consistency | 75 | 25% | 7% (reduced effective) |

Kirk's score components are higher than Eric's, but the confidence is lower. His rating: ~78. Still ahead of Eric because the raw performance is significantly better, but not as high as it would be with more data backing it up.

**Brand new user (1 month on Clutch, no import):**
| Component | Score | Confidence | Effective Weight |
|-----------|-------|------------|-----------------|
| Win Rate | 90 | 15% | tiny effective |
| Draft IQ | 85 | 30% | small effective |
| Roster Mgmt | 75 | 20% | small effective |
| Predictions | 80 | 15% (50 predictions) | tiny effective |
| Trade Acumen | — | 0% | 0% |
| Championships | — | 0% | 0% |
| Consistency | — | 0% | 0% |

Even with great scores, the low confidence keeps this user around 55-65. They can SEE their component scores are high, which is encouraging, but the overall rating honestly reflects "we need more data." As they play more, confidence rises and their rating quickly climbs if the performance holds.

---

## Rating Presentation in the UI

### What Users See

1. **The number** (e.g., 74) — big, prominent, with the tier label
2. **Component breakdown** — bar chart showing each component's score (0-100)
3. **Confidence indicator** — subtle but visible. Something like:
   - Full ring = high confidence rating
   - Partial/dashed ring = rating is still calibrating
   - Text like "Based on 16 seasons of data" vs "Based on 1 season — rating is calibrating"
4. **Trend arrow** — is the rating going up, down, or stable?
5. **"Unlock more" prompts** — for components that haven't been activated yet

### The Confidence Ring Visual

The rating ring's completeness should reflect overall confidence:
- A user with 16 seasons of history and active Prove It usage: full, solid ring
- A user with 2 seasons and no Prove It: ring is ~40% solid, ~60% dashed
- Brand new user: mostly dashed ring that fills in as they use the platform

This visual alone tells the story: "your rating is real but still being built."

### Component Display

Show all components, even unmeasured ones:
```
Draft IQ:         ████████░░  82   ← measured, showing score
Roster Mgmt:      ██████░░░░  63   ← measured, showing score  
Predictions:      🔒 Make 5 predictions to unlock
Trade Acumen:     🔒 Complete a trade to unlock
```

Unmeasured components show what action unlocks them. Measured components show the score with the bar. This creates a natural progression path.

---

## Handling Edge Cases

### Someone with imported data who's mediocre
Their rating honestly reflects mediocrity. If they're 50-50 over 10 years with no titles, they're probably around 50-55. The system shouldn't sugarcoat. But the messaging should be forward-looking: "Your rating is based on historical data. As you play on Clutch, new dimensions like Draft IQ and Prediction Accuracy will factor in."

### Someone who imports AND is active on Clutch
Best of both worlds. Their historical data provides the foundation (Win Rate, Championships, Consistency) and their Clutch activity fills in the forward-looking components (Draft IQ, Roster Mgmt, Predictions, Trades). Their confidence is highest and their rating is most accurate.

### Someone who's great at Prove It but bad at fantasy
Their Prediction Accuracy will be high, but Win Rate and Roster Mgmt will be low. The composite score reflects this honestly — maybe they're a great analyst but not a great roster manager. The component breakdown shows them exactly where to improve.

### League strength variation
A 70% win rate in a hyper-competitive 14-team league is different from a 70% win rate in a casual 8-team league with 3 inactive managers. We should factor in:
- League size (more teams = harder to win)
- League activity (avg transactions, lineup set rate)
- Score variance (tighter scores = more competitive)

This is a V2 consideration but important to architect for.

### Inflation/deflation over time
As the platform grows and more data feeds in, we need to ensure the rating distribution stays stable. If everyone's rating creeps up over time, the tiers become meaningless. Consider periodic normalization or using percentile-based tiers rather than absolute thresholds.

---

## Anti-Gaming Measures

- **Prediction volume doesn't help** — making 1000 random predictions doesn't boost your score. Only accuracy and calibration matter.
- **Trade volume has diminishing returns** — making lots of trades doesn't help if they're not value-positive.
- **Waiver wire churn is penalized** — dropping and adding players constantly without roster improvement signals noise, not skill.
- **Collusion detection** — trades that are severely lopsided should be flagged and excluded from Trade Acumen calculations.
- **Multi-league normalization** — if someone plays in 5 leagues and cherry-picks the best one, the rating should consider all leagues, not just the best.

---

## Data Sources by User Type

| Component | Import User (Yahoo/ESPN/Sleeper) | Clutch-Native User |
|-----------|----------------------------------|-------------------|
| Win Rate | ✅ Full history available | ✅ Builds over time |
| Draft IQ | ⚠️ Limited (may have pick data for recent seasons) | ✅ Full from first draft |
| Roster Mgmt | ❌ Not available from imports | ✅ Full from first week |
| Predictions | ❌ Clutch-only | ✅ From Prove It activity |
| Trade Acumen | ⚠️ Limited (trade history may exist for recent seasons) | ✅ Full from first trade |
| Championships | ✅ Available | ✅ Builds over time |
| Consistency | ✅ Requires 2+ seasons | ✅ Requires 2+ seasons |

This asymmetry is actually a feature, not a bug. Import users get instant credibility from Win Rate + Championships + Consistency, but they're missing 3-4 components that only Clutch can measure. This gives them a concrete reason to be active on the platform: "Your rating is based on 3 of 7 components. Unlock the rest to get your true Clutch Rating."

---

## Rating Update Frequency

- **Real-time components** (Predictions): Updated after each prediction resolves
- **Weekly components** (Roster Mgmt): Updated after each week's games complete
- **Seasonal components** (Win Rate, Draft IQ, Championships): Updated at end of season with mid-season projections available
- **Trade components**: Updated 4 weeks after each trade (to measure post-trade performance)
- **Overall rating**: Recalculated daily during active seasons, weekly during offseason

---

## V1 vs V2 Roadmap

### V1 (Launch)
- Win Rate Intelligence (from imports + Clutch data)
- Championship Pedigree (from imports + Clutch data)
- Consistency (from imports + Clutch data with 2+ seasons)
- Draft IQ (Clutch-native only)
- Roster Management (Clutch-native only)
- Prediction Accuracy (from Prove It)
- Basic confidence system
- Rating display in Vault + Dashboard + Profile

### V2 (Post-launch)
- Trade Acumen (need trade outcome tracking infrastructure)
- League strength adjustment
- Cross-league normalization
- Historical rating trajectory (show how your rating has changed over time)
- League-level Clutch Rating (average of all members — competitive leagues flex their avg rating)
- Head-to-head rating comparison tool
- Rating-based matchmaking for new leagues

### V3 (Future)
- Predictive modeling (what would your rating be if you made different decisions?)
- AI coaching tied to rating components ("Your Roster Mgmt score is 58 — here's what you could improve...")
- Rating milestones and achievements
- Seasonal rating snapshots for year-over-year comparison
- Public rating badges for social sharing
