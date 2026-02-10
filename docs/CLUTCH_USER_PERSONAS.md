# CLUTCH SPORTS — User Personas & Adaptive UX Strategy

---

## Why This Document Exists

Every feature, every page layout, every piece of content on Clutch needs to answer one question: **which user is this for?** If we can't answer that, we shouldn't build it. This document defines who our users are, what they care about, what they don't, and how the platform adapts to serve each one without overwhelming any of them.

---

## The Six Clutch Personas

### 1. THE INFORMED FAN ⭐ (Primary Target)

**Who they are:** Plays in 1-2 leagues with friends. Watches a lot of football. Knows more than the average fan but doesn't treat fantasy as a second job. Checks their lineup Wednesday-Saturday, watches games Sunday, checks scores Monday morning. This is the biggest segment in fantasy sports.

**Real-world example:** Your buddy who told you "what's the point outside of fantasy?" — he IS this person. He's smart, he cares, but he's not going to dig through EPA charts at midnight.

**What they care about:**
- Start/sit decisions for their weekly lineup
- Quick player lookups — "is this guy good this week?"
- How they stack up against their league mates
- Simple, clear recommendations they can act on fast
- Bragging rights when they're right

**What they DON'T care about:**
- Advanced analytics terminology (EPA, CPOE, DVOA)
- Training camp reports, OTA updates, combine measurables
- 40-page draft guides
- Building their "brand" or public profile
- Prop betting markets

**When they visit Clutch:**
- **In-season (Sep-Feb):** 2-4x per week. Tuesday waiver wire, Wednesday-Saturday lineup decisions, Sunday scoreboard, Monday results
- **Off-season (Mar-Aug):** Maybe once around the draft. Maybe once before their league draft in August. Otherwise dormant
- **What brings them back:** Push notifications about their league, weekly lineup reminders, "your rival just made a move" alerts

**Their player page experience:**
- Default view: Clean stat summary — this season's numbers, recent game log (last 3-5 games), fantasy points by format
- "Should I start this guy?" indicator — a simple visual signal (green/yellow/red or similar) based on matchup + recent performance
- Community consensus — "72% of Clutch users are starting him this week"
- Advanced stats exist but are collapsed/hidden by default
- No jargon in the default view — "Yards per game" not "EPA/play"

**Their home dashboard:**
- My matchup this week (score projection, key lineup decisions)
- "Action needed" alerts (empty roster spots, players on bye, injury updates)
- Quick-pick widget — "Make 3 calls in 30 seconds" for Prove It engagement
- League standings snippet

**Content that serves them:**
- Weekly "Who to Start" consensus rankings
- Waiver wire pickups (simple: "grab this guy, drop that guy")
- Matchup previews written in plain English
- Push notifications: "Your player is questionable" / "Waiver wire closes tonight"

**Conversion path:** They come for their league → they make a few Prove It picks because it's easy → they start caring about their accuracy → they tell their friends about Clutch

---

### 2. THE GRINDER

**Who they are:** Plays in 3-5+ leagues across multiple platforms. Lives on the waiver wire. Knows what target share and air yards mean. Probably has a spreadsheet somewhere. Checks fantasy content daily, sometimes multiple times per day. This person already uses FantasyPros, Sleeper, and follows 10+ fantasy analysts on Twitter.

**Real-world example:** The person in every league who proposes the most trades, sends articles in the group chat to justify their takes, and tracks their season-long accuracy in a Google Doc because no platform does it well enough.

**What they care about:**
- Advanced player metrics and trends (target share changes, snap count trends, efficiency metrics)
- Proving they're better than other fantasy players — not just in their league, globally
- Having a track record they can point to
- Finding edges before the consensus catches on
- Multi-league management efficiency

**What they DON'T care about:**
- Simplified recommendations — they want the raw data to make their own calls
- Being told what to think — they want tools, not opinions
- Casual engagement features — they're already engaged
- Off-season content that's filler (generic "top 10 sleepers" articles)

**When they visit Clutch:**
- **In-season:** Daily. Sometimes multiple times. Checking stats, making Prove It picks, monitoring waiver targets, comparing projections
- **Off-season:** Weekly during free agency and draft season. Monthly otherwise. Dynasty rankings, rookie evaluations, trade calculators
- **What brings them back:** Leaderboard competition, new data drops, their Clutch Rating

**Their player page experience:**
- Default view: Full stat dashboard — season totals AND advanced metrics visible immediately
- Toggle between basic stats and advanced stats (EPA, CPOE, success rate, aDOT, air yards, target share, yards per route run)
- Situational splits visible: home/away, by quarter, red zone, third down
- Week-by-week game log with sortable columns
- Comparison tool — "compare this player vs" dropdown
- Historical trends — multi-season visualization
- They want to see REAL stat names, not branded "Clutch Scores"

**Their home dashboard:**
- Multi-league overview (all leagues at a glance)
- My Clutch Rating prominently displayed with trend line
- Prove It leaderboard position + weekly ranking
- "Hot takes" feed — contrarian calls from top-rated users
- Recent prediction results with accuracy breakdown
- Trending players (based on community activity + stat movement)

**Content that serves them:**
- Deep statistical analysis (target share trends, efficiency metrics by game)
- Sortable, filterable stat leaderboards
- Player comparison tools
- Historical data access (multi-season trends)
- Weekly "what the data says" automated insights — not opinion pieces, just "here's what moved this week"

**Conversion path:** They come because the data is better/cleaner than alternatives → they get addicted to Prove It because it finally tracks what they've always wanted tracked → they become your most vocal evangelists because their Clutch Rating IS their identity

---

### 3. THE CONTENT CREATOR / ANALYST

**Who they are:** Has a podcast, YouTube channel, Twitter following, or newsletter. Makes fantasy sports content for an audience. Their credibility is their currency. They're currently pointing to FantasyPros accuracy rankings or just asking people to "trust me." They range from the Fantasy Footballers (millions of followers) to a guy with 2,000 Twitter followers who's genuinely sharp.

**Real-world example:** The mid-tier podcast host who's actually really good at fantasy but has no way to prove it beyond anecdotes. Or the Twitter analyst who calls every breakout player a year early but nobody notices until after.

**What they care about:**
- A verified, public track record they can link from their content
- Beautiful, embeddable profile that makes them look credible
- Being discoverable by new audiences through the platform
- Badges, rankings, and credentials that enhance their brand
- Differentiation from other analysts — "I'm ranked #47 on Clutch"

**What they DON'T care about:**
- Managing their own fantasy leagues on Clutch (they have their own)
- Simplified recommendations (they ARE the recommendation)
- Privacy — they want maximum visibility
- Casual features — everything should showcase their expertise

**When they visit Clutch:**
- **In-season:** Daily. Making picks across every available category. Quantity matters for their track record
- **Off-season:** Regularly. Dynasty rankings, draft projections, bold predictions for next season — all content opportunities
- **What brings them back:** Their public profile stats, follower count, leaderboard position, "someone followed you" notifications

**Their player page experience:**
- Same as the Grinder, plus:
- Their own published takes on this player visible on the page (if they've made calls)
- Ability to write a short thesis ("Here's why I'm all-in on this player in 2026")
- Their calls are tagged with their Clutch Rating and accuracy — building trust with anyone who sees it

**Their profile page (this is their PRIMARY Clutch experience):**
- Hero banner with their photo/brand, tier badge, overall accuracy, follower count
- Prediction history with filters (by sport, category, time period)
- Specialty tags (auto-generated: "Elite QB Evaluator", "Waiver Wire Wizard")
- Links to their external channels (podcast, YouTube, Twitter, newsletter)
- Embeddable widget they can put on their own site
- Shareable "season in review" card for social media
- Verified Creator badge (if part of the partner program)

**Content that serves them:**
- Tools to create content FROM the platform (shareable stats, comparison graphics)
- Weekly automated summaries they could reference in their shows
- "This week's best calls" features that showcase top performers
- Profile analytics — who's viewing their profile, where traffic comes from

**Conversion path:** They sign up to build their verified track record → their audience follows them to Clutch → those followers become Informed Fans and Grinders → organic growth flywheel

---

### 4. THE BETTOR

**Who they are:** Primarily interested in player props and game lines. May or may not play season-long fantasy. Thinks in terms of value, edges, and expected value. Follows odds movement. Might use multiple sportsbooks. Ranges from recreational ($20/week) to semi-professional.

**Real-world example:** The person who watches a game differently — they're not rooting for a team, they're watching whether the over/under hits. They've got 3 sportsbook apps on their phone and compare lines.

**What they care about:**
- Player prop projections vs current book lines
- Where the value is — which props are mispriced
- Historical performance against specific betting lines
- Weather, injury, and game environment data that affects props
- Tracking their betting accuracy over time

**What they DON'T care about:**
- Fantasy league management
- Season-long rankings or dynasty
- Community social features
- Simplified "start/sit" recommendations
- Content that doesn't have a betting angle

**When they visit Clutch:**
- **In-season:** 3-5x per week. Primarily Thursday-Sunday. Checking prop projections, comparing to their own analysis, tracking results
- **Off-season:** Minimal. Maybe futures markets (Super Bowl odds, MVP odds). Mostly dormant
- **What brings them back:** Value alerts ("Clutch model sees +EV on this prop"), results tracking, accuracy metrics for their prop picks

**Their player page experience:**
- Default view: Current week's prop lines from major books + Clutch model projection
- Historical prop performance — "this player has hit the over on passing yards in 8 of his last 10 games"
- Matchup-specific data — "against this defense, similar QBs have averaged X"
- Environmental factors — indoor/outdoor, weather, game total, spread context
- Trend data — is this prop line moving? Which direction? Why?

**Their home dashboard:**
- This week's value picks (where Clutch model disagrees with books)
- My prop pick accuracy tracker
- Odds comparison grid for key games
- Results feed — how did yesterday's picks land

**Content that serves them:**
- Automated prop analysis pages (generated from model + data)
- Value alert notifications
- Historical betting performance data
- Game environment breakdowns (weather, stadium, ref tendencies)

**Conversion path:** They come for the prop analysis → they use Prove It to track their prop picks → they realize the community consensus data is valuable signal → they become paying users for premium prop projections (Clutch Edge)

---

### 5. THE DYNASTY NERD

**Who they are:** Thinks in 3-year windows, not weekly matchups. Plays in dynasty or keeper leagues where rookies and long-term value matter more than this week's start/sit. Lives in the offseason — the draft IS their Super Bowl. Trades constantly. Values age curves, opportunity projections, and developmental trajectories over weekly stat lines.

**Real-world example:** The person in your dynasty league who offers you a trade package every single week with a 200-word justification message. They know every 3rd-round rookie's college production and landing spot.

**What they care about:**
- Rookie evaluations and draft capital analysis
- Age curves and career trajectory modeling
- Trade value charts and calculators
- Long-term player outlook (not this week — next 2-3 years)
- Keeper/dynasty-specific rankings
- College stats and prospect profiles

**What they DON'T care about:**
- Weekly start/sit (they've already optimized their roster months ago)
- Current week's prop lines
- Short-term matchup data
- "Hot waiver wire pickups" — they owned those players before they broke out

**When they visit Clutch:**
- **In-season:** Periodically. Checking dynasty trade values, monitoring rookie development, evaluating trade targets
- **Off-season:** THIS IS THEIR PEAK. NFL Draft analysis (January-April), free agency impact, OTA reports, training camp buzz. The offseason is when they're most active
- **What brings them back:** Updated dynasty rankings, trade calculator, rookie scouting content, offseason player movement

**Their player page experience:**
- Default emphasis on career arc — multi-season stat visualization, age, contract status
- Dynasty trade value indicator
- Rookie profile data (if applicable): draft capital, college stats, athletic testing
- Opportunity metrics: target share trend over career, snap count trajectory
- "Similar players" comparison (career trajectory matching)
- Advanced long-term metrics over weekly snapshot

**Their home dashboard:**
- Dynasty rankings with movement arrows (who's rising, who's falling)
- Recent trades across leagues with value analysis
- Offseason news feed (signings, trades, draft picks)
- Rookie watch — tracking developmental progress
- My dynasty league rosters overview

**Content that serves them:**
- Dynasty trade value charts (updated regularly)
- Rookie scouting reports (pre-draft and post-draft)
- Age curve analysis by position
- "Buy low / Sell high" candidates based on career trajectory data
- NFL Draft coverage — round-by-round fantasy impact
- Free agency landing spot analysis

**Conversion path:** They come for dynasty rankings and trade values during the offseason → they stay because the data depth is better than alternatives → they're your year-round retention engine because they never stop thinking about fantasy → they recruit their entire dynasty league to Clutch

**THIS PERSONA IS YOUR OFF-SEASON ANSWER.** When your friend says "what's the point outside fantasy season?" — the Dynasty Nerd is the proof that there IS a point. They're the user who keeps the platform alive from February to August.

---

### 6. THE SPORTS DEBATER

**Who they are:** "I TOLD you Lamar Jackson was going to regress!" This person lives for being right and proving others wrong. They're in multiple group chats arguing about sports takes. They may or may not play fantasy, but they have OPINIONS and they want receipts. They're the person who screenshots their old tweets when a prediction comes true.

**Real-world example:** Your friend who texts the group chat "called it 🎯" every time one of their pre-season predictions hits, conveniently ignoring the 15 that didn't.

**What they care about:**
- Being proven right — publicly, with data
- Settling arguments with friends
- Making bold predictions and being tracked on them
- Sharing proof of their correct calls on social media
- Having a "receipts" page they can point to

**What they DON'T care about:**
- Deep statistical analysis
- Fantasy league management
- Betting lines and prop analysis
- Dynasty long-term planning
- Complex data tools

**When they visit Clutch:**
- **In-season:** Whenever they want to make a bold call or prove they were right about one
- **Off-season:** Pre-season predictions ("here are my 10 bold calls for 2026"), draft takes, award predictions
- **What brings them back:** Prediction results notifications ("Your bold call on X was RIGHT!"), shareable receipts, argument-settling tools

**Their player page experience:**
- Simplified view — they're not here for deep analysis
- They want to see: did my prediction about this player come true?
- Community consensus — are most people agreeing or disagreeing with their take?
- Quick "make a call" button — fast, easy, low friction

**Their profile page (their most important Clutch surface):**
- "My Receipts" — a timeline of predictions with outcomes
- Bold Calls showcase — their most contrarian picks with results
- Shareable cards for social media ("I called it on Clutch ✅")
- Accuracy rate prominently displayed
- Streak counter
- Badges for bold correct calls

**Content that serves them:**
- "Bold Predictions" templates (pre-season, weekly, etc.)
- Shareable results graphics auto-generated
- "Hot takes leaderboard" — who's making the wildest calls and still being right
- Weekly "receipts roundup" — whose predictions from last week actually hit

**Conversion path:** They hear about Clutch from a friend or social media → they sign up to make some bold calls → they share their results → their friends sign up to compete → viral loop

---

## Adaptive UI: How the Platform Serves All Six

### The Core Principle

**Don't build six different apps. Build one app with progressive disclosure.**

Progressive disclosure means: the simplest, most useful version of everything is the default. Complexity is available but never forced. Each persona naturally gravitates to their depth level without needing to configure anything.

### How This Works on a Player Page

```
┌─────────────────────────────────────────────┐
│  JOSH ALLEN — QB, Buffalo Bills             │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  THIS WEEK vs. Miami               │    │  ← Everyone sees this
│  │  ● Matchup rating: Favorable        │    │  ← Informed Fan stops here
│  │  ● Community: 78% say START          │    │
│  │  ● Last 3 games: 285, 312, 267 yds  │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [Season Stats] [Game Log] [Advanced]       │  ← Grinder clicks Advanced
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  2025 Season: 4,212 yds | 32 TD     │    │  ← Clean default table
│  │  [Expand: Situational Splits]        │    │  ← Grinder expands
│  │  [Expand: Historical Comparison]     │    │  ← Dynasty Nerd expands
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  PROP LINES (This Week)              │    │  ← Bettor's section
│  │  Pass Yds: O/U 278.5 | Clutch: 291  │    │  ← Hidden for non-bettors?
│  │  Pass TDs: O/U 2.5 | Clutch: 2.8    │    │     Or collapsed by default
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  WHAT CLUTCH EXPERTS SAY            │    │
│  │  @FantasyGuru (92% acc): "Must start"│    │  ← Creator's take visible
│  │  @BoldCallKing (78% acc): "OVER 290" │    │  ← Debater sees predictions
│  │  [Make Your Call →]                  │    │  ← Prove It entry point
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  CAREER ARC                         │    │  ← Dynasty Nerd's section
│  │  [Multi-year chart: production trend] │    │
│  │  Age: 29 | Contract: 2 yrs remain   │    │
│  │  Dynasty Value: Elite (Tier 1)       │    │
│  │  [Similar Career Paths →]            │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### How This Works on the Home Dashboard

The dashboard should adapt based on usage patterns. Not through explicit preference settings (nobody fills those out), but through behavioral signals:

| Signal | Inference | Dashboard Adapts |
|--------|-----------|-----------------|
| User only has 1 league | Likely Informed Fan | Simplify, show "this week" focus |
| User makes 20+ Prove It picks/week | Grinder or Creator | Show leaderboard position prominently |
| User clicks Advanced stats often | Grinder | Default to showing advanced data |
| User shares profile frequently | Creator or Debater | Emphasize profile stats and shareable cards |
| User checks prop lines regularly | Bettor | Surface prop analysis higher |
| User is active in offseason | Dynasty Nerd | Show dynasty rankings and trade values |
| User views career/multi-year data | Dynasty Nerd | Emphasize long-term player outlook |

**Phase 1 implementation:** Don't build adaptive behavior yet. Build the progressive disclosure layout (everything available, sensible defaults, expand for depth). Track the behavioral signals in analytics.

**Phase 2 implementation:** Use the tracked signals to personalize default views. "We noticed you check prop lines a lot — want to see those first?"

### Onboarding Flow (How We Learn Who They Are)

On first sign-up, ONE question that sorts them without feeling like a quiz:

**"What brings you to Clutch?"**
- 🏈 "I want help with my fantasy league" → Informed Fan defaults
- 📊 "I want to prove I know my stuff" → Grinder/Debater defaults
- 🎙️ "I create content and want to build my track record" → Creator defaults
- 💰 "I want an edge on player props" → Bettor defaults
- 🔄 "I play dynasty/keeper and think long-term" → Dynasty Nerd defaults

This isn't locking them in — it's setting the initial default layout. Everything is still accessible. They can change it anytime. But it means their first impression matches their intent.

---

## Content Strategy Per Persona

### What Each Persona Needs to See When They Land (Even Today, Pre-Launch)

| Persona | What makes the site feel "alive" for them |
|---------|------------------------------------------|
| Informed Fan | Player pages with current season stats, clean UI, "this week" focus |
| Grinder | Deep stat leaderboards, filterable data, player comparison tools |
| Creator | A beautiful public profile system they can see themselves using |
| Bettor | Prop line data, historical prop performance, value analysis |
| Dynasty Nerd | Multi-year career data, age curves, dynasty rankings, rookie profiles |
| Debater | A prediction system they can use to make bold calls and get receipts |

### Off-Season Content Calendar (Keeping the Site Alive Year-Round)

| Month | Primary Persona Served | Content Available |
|-------|----------------------|-------------------|
| **Feb** | Dynasty Nerd, Debater | Combine preview, bold offseason predictions, dynasty rankings reset |
| **Mar** | Dynasty Nerd, Bettor | Free agency landing spot analysis, futures odds movement, updated dynasty values |
| **Apr** | Dynasty Nerd, All | NFL Draft coverage — prospect profiles, landing spot grades, rookie rankings, dynasty impact |
| **May** | Grinder, Dynasty Nerd | Season-long prediction contest opens, OTA reports, updated rankings |
| **Jun-Jul** | Dynasty Nerd, Grinder | Training camp watch, depth chart battles, dynasty trade values, preseason rankings |
| **Aug** | ALL (draft season) | Fantasy draft rankings, draft tools, sleepers/busts, mock draft data |
| **Sep-Jan** | ALL (in-season) | Full weekly content: matchup previews, prop analysis, start/sit, waivers, results |

### Key Insight: The Dynasty Nerd Is Your Off-Season Bridge

Your friend's concern — "what's the point outside fantasy?" — is answered by the Dynasty Nerd. They're active 12 months a year. Their content needs (dynasty rankings, trade values, rookie scouting, career trajectory data) are the content that keeps the site indexed, keeps SEO working, and keeps SOME traffic flowing year-round. The Informed Fan comes back in August. The Dynasty Nerd never leaves.

---

## Data Pages We Can Build and Populate RIGHT NOW

### Tier 1: Build Immediately (nflfastR historical data, no season needed)

1. **Player Profile Pages (~1,500+ pages)**
   - Career stats by season (basic + advanced)
   - Game logs for every game played
   - Fantasy points by scoring format
   - Career trajectory visualization
   - Position: these are your SEO workhorses

2. **Team Pages (32 pages)**
   - Roster with links to player pages
   - Historical team stats by season
   - Offensive and defensive rankings
   - Schedule (once 2026 schedule releases)

3. **Stat Leaderboards**
   - Filterable by: season, position, stat category, team
   - Sortable by any column
   - Basic stats AND advanced stats (EPA, CPOE, etc.)
   - These compete with PFR for search traffic

4. **Player Comparison Tool**
   - Select any two players, see side-by-side stats
   - Career overlays on charts
   - Useful for Grinders and Dynasty Nerds year-round

### Tier 2: Build During Offseason (public data + computation)

5. **Dynasty Rankings Page**
   - Crowdsourced from user predictions (once contest opens)
   - Or: algorithmically generated from career trajectory data
   - Updated with free agency / draft impact
   - Dynasty Nerd magnet

6. **NFL Draft Hub (March-April)**
   - Prospect profiles with college stats (cfbfastR)
   - Combine results and athletic testing
   - Mock draft aggregation
   - Post-draft landing spot analysis with dynasty impact

7. **Strength of Schedule Pages**
   - Once 2026 schedule drops
   - Fantasy-relevant schedule analysis by position
   - Useful for Grinders and Dynasty Nerds pre-draft

### Tier 3: Build at Season Start (requires live data)

8. **Weekly Matchup Pages**
   - Game preview with relevant stats
   - Historical matchup data
   - Prop lines and Clutch model projections
   - Community consensus picks

9. **Waiver Wire / Trending Players**
   - Automated based on stat movement + community activity
   - Informed Fan's primary weekly content

10. **Prop Analysis Pages**
    - Per-player prop breakdowns
    - Historical hit rates on similar props
    - Clutch model vs book line comparison
    - Bettor's primary content

---

## The Projections Decision

### Recommendation: Invisible Engine, Not Visible Product

**Don't publish:** "Clutch projects Mahomes for 285 passing yards"
**Do publish:** "Clutch model sees value on OVER 278.5 passing yards — here's the data supporting it"

Projections power three things invisibly:
1. Prove It benchmarks (the over/under lines users pick against)
2. Value flags for bettors (where model disagrees with books)
3. Start/sit confidence indicators for Informed Fans

The one exception: **Crowdsourced consensus rankings** (from rated users) ARE a projection product worth publishing. "Clutch Consensus Top 200" is differentiated because it's community-generated with credibility weighting — not your model's opinion.

---

---

## THE CLUTCH FEED + WORKSPACE MODEL

### The Insight: It's Not a Dashboard — It's a Feed + a Workbench

The original dashboard design was structured around leagues and predictions — things the user has already committed to. But your friend's reaction reveals the problem: **if someone hasn't committed yet, the dashboard has nothing for them.** There's no reason to open the app.

The fix isn't more features on the dashboard. It's rethinking what the home experience IS.

**Two concepts that change everything:**

1. **The Feed** — a personalized, always-updating stream of data-driven content tailored to what you care about. Not articles. Not opinions. Data events, stat movements, automated insights, community activity, and news relevant to YOUR teams and YOUR interests. Think Bloomberg Terminal meets Apple News meets Twitter's "For You" — but for fantasy sports and powered by real data.

2. **The Workspace** — interactive tools where you build, develop, and refine YOUR analysis. Draft boards you can edit and annotate. Player rankings you can drag and reorder with notes. Comparison tools. Your personal scouting notebook. This is where your WORK lives — and because it lives on Clutch, you come back to Clutch.

The Feed gives you a reason to open the app every day.
The Workspace gives you a reason to never leave.

### How the Feed Works

**On signup (or in settings), you configure your interests:**
- Favorite teams: Ravens, etc.
- Interests: NFL Draft, Dynasty, Player Props, etc.
- Favorite players: Lamar Jackson, Derrick Henry, etc.
- Sports: NFL, Golf, etc.

**The Feed then populates with a personalized stream:**

```
┌─────────────────────────────────────────────────────────────┐
│  YOUR CLUTCH FEED                                [Filter ▼] │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🏈 RAVENS                                    2 hrs ago │  │
│  │ Baltimore signs FA edge rusher Marcus Collins           │  │
│  │ (3 yr / $42M). Projected defensive impact: +1.2        │  │
│  │ pressure rate. Fantasy impact: minimal direct,          │  │
│  │ but could improve secondary coverage stats.             │  │
│  │ [View Player Page →]  [Save to Notes]                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 📊 STAT ALERT                                 4 hrs ago │  │
│  │ Lamar Jackson career rushing yards by season:            │  │
│  │ 2024: 915 → 2025: 743 (↓19%)                           │  │
│  │ At age 29, Jackson's rushing volume is declining in      │  │
│  │ line with typical dual-threat QB age curves.             │  │
│  │ Dynasty value implication: Passing efficiency matters    │  │
│  │ more than ever for his long-term outlook.               │  │
│  │ [Full Career Analysis →]  [Add to Draft Notes]          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🎓 NFL DRAFT — MOCK TRACKER              yesterday     │  │
│  │ 3 new mock drafts tracked. Consensus QB1: Shedeur       │  │
│  │ Sanders (avg pick: 2.1). Biggest riser this week:       │  │
│  │ WR Tetairoa McMillan (moved from avg 12 → avg 8).      │  │
│  │ [View Full Mock Draft Board →]                          │  │
│  │ [Update Your Rankings →]                                │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🏌️ GOLF — THIS WEEK                        today      │  │
│  │ Genesis Invitational field is set. 3 of your tracked    │  │
│  │ players are in the field: Scheffler, Hovland, Homa.     │  │
│  │ Course fit analysis available.                          │  │
│  │ [View Tournament Preview →]                             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 👥 COMMUNITY                                 6 hrs ago │  │
│  │ Top Clutch analyst @SharpEdge (91% accuracy) just       │  │
│  │ published their 2026 Dynasty Top 50.                    │  │
│  │ Biggest surprise: Jaylen Waddle at #18 (consensus: #31) │  │
│  │ [View Their Rankings →]  [Compare to Yours →]           │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 📈 YOUR WORKSPACE UPDATE                     yesterday │  │
│  │ You have 3 unranked rookies on your draft board since   │  │
│  │ the combine results dropped. Want to update?            │  │
│  │ [Open Draft Board →]                                    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Feed Content Types (All Auto-Generated, No Writers Needed)

| Content Type | Data Source | Persona Served | Example |
|-------------|-------------|----------------|---------|
| **Team News** | Public news APIs + transaction data | Informed Fan, Dynasty Nerd | "Ravens sign FA WR — here's his stat profile" |
| **Stat Alerts** | nflfastR computed trends | Grinder, Dynasty Nerd | "Player X's target share has increased 3 consecutive weeks" |
| **Prop Movement** | Odds API | Bettor | "Mahomes passing yards line moved from 278.5 to 285.5" |
| **Draft Intel** | Mock draft aggregation + cfbfastR | Dynasty Nerd, Grinder | "Consensus top 5 shifted after combine" |
| **Community Activity** | Clutch user data | Creator, Debater | "Top analyst published new rankings" |
| **Workspace Nudges** | User's own data | All | "Your draft board needs updating" |
| **Injury Updates** | Public injury reports | Informed Fan, Bettor | "Player X ruled OUT — here's the fantasy/prop impact" |
| **Matchup Previews** | nflfastR + schedule | Informed Fan, Bettor | "This week: Ravens vs Bengals — key stats to know" |
| **Career Milestones** | Historical data | Dynasty Nerd, Debater | "Player X just passed 10,000 career yards — career trajectory analysis" |
| **Value Alerts** | Clutch model vs odds | Bettor | "Clutch model sees +EV on this week's player prop" |
| **Bold Call Results** | Prove It system | Debater, Creator | "Your bold call from Week 3 was CORRECT ✅" |
| **Tournament/Event Previews** | DataGolf + schedule | Golf fans | "Field set for The Masters — course fit analysis ready" |

### The Key: Every Feed Item Is Data-Generated, Not Written

None of this requires a content team. It requires:
1. Data pipelines that detect "events" (stat changes, news, transactions, odds movement)
2. Templates that turn those events into readable feed cards
3. A personalization layer that filters cards by user interests
4. Links from every card deeper into the platform (player pages, workspace, community)

This is the Bloomberg Terminal model. Bloomberg doesn't hire journalists for most of its feed — it surfaces data events with context. You're doing the same thing for fantasy sports.

### How the Workspace Works

The Workspace is where users DO things, not just consume. It's the other half of the equation — the Feed brings you in, the Workspace keeps you.

**Workspace Tools:**

#### 1. My Draft Board (Pre-season, Dynasty year-round)
```
┌─────────────────────────────────────────────────────┐
│  MY 2026 DRAFT BOARD          [PPR ▼] [Share] [Export] │
│                                                       │
│  Drag to reorder. Click a player to add notes.        │
│                                                       │
│  1.  ⬛ CeeDee Lamb         WR  DAL   [📝 Notes ▼]  │
│      "Elite target share. Only concern is Dak's       │
│       health. Floor is WR5 even in bad gamescript."   │
│                                                       │
│  2.  ⬛ Ja'Marr Chase       WR  CIN   [📝 Notes ▼]  │
│      "Burrow fully healthy = top 3 lock. My WR1      │
│       if Burrow plays 17."                            │
│                                                       │
│  3.  ⬛ Bijan Robinson      RB  ATL   [📝 Notes ▼]  │
│                                                       │
│  ...                                                  │
│                                                       │
│  [+ Add Player]  [Import from last year]              │
│                                                       │
│  ┌──────────────────────────────────────────────┐    │
│  │ DIVERGENCE ALERT: Your board vs Consensus     │    │
│  │ You have Jaylen Waddle 12 spots higher than   │    │
│  │ community average. 3 players you're fading    │    │
│  │ that consensus loves. [See Full Comparison →]  │    │
│  └──────────────────────────────────────────────┘    │
│                                                       │
└─────────────────────────────────────────────────────┘
```

This is your friend's "interactive rankings list with notes." He builds it over months. Every time draft news drops (a trade, an injury, a free agent signing), the Feed tells him, and he comes to the Workspace to adjust. The board is HIS — personal, annotated, evolving. And because it lives on Clutch, he opens Clutch.

The divergence alerts are the intelligence layer — Clutch is showing him where his rankings disagree with the community, prompting him to either double down or reconsider. That's value no spreadsheet gives him.

#### 2. My Player Watch List
A lightweight tracker for players you're monitoring but haven't ranked yet.
- Add any player
- Get feed alerts when something happens to them (stat change, injury, transaction)
- Quick-add to draft board or rankings
- Notes field per player

#### 3. My Scouting Notes (Dynasty / Draft Research)
- Free-form notebook organized by player, team, or topic
- Attach data from the platform (link a stat, a chart, a comparison)
- Private by default, shareable if desired
- Search across all your notes

#### 4. My Rankings (Position-Specific)
- Separate from the draft board — these are analytical rankings
- QB Rankings, RB Rankings, WR Rankings, TE Rankings
- Drag to reorder, add tier breaks, add notes
- Compare to consensus at any time
- Can be published to your Clutch profile (if Creator persona)
- When published, they become content on the platform AND they feed into the Prove It accuracy tracking

### How Feed + Workspace Connect to Each Persona

| Persona | Primary Feed Content | Primary Workspace Tool |
|---------|---------------------|----------------------|
| **Informed Fan** | Team news, injury alerts, weekly matchup previews | Watch list (simple, low commitment) |
| **Grinder** | Stat alerts, community rankings, trending players | Draft board + position rankings (comprehensive) |
| **Creator** | Community activity, follower engagement, content tools | Published rankings + scouting notes |
| **Bettor** | Prop movement, value alerts, results tracking | Watch list focused on prop targets |
| **Dynasty Nerd** | Draft intel, career milestones, trade values, FA analysis | Draft board + scouting notes (year-round) |
| **Debater** | Bold call results, community consensus, hot takes | Bold predictions board |

### The Onboarding Flow (Revised)

The original onboarding was "What brings you to Clutch?" — one question to set defaults. Now it needs two steps:

**Step 1: "What brings you to Clutch?"**
(Same as before — sets persona defaults for layout and feature emphasis)

**Step 2: "Personalize your feed"**
- Pick your favorite NFL teams (multi-select, team logos)
- Pick your interests: Draft Research, Dynasty, Player Props, Weekly Fantasy, Golf, etc.
- Follow any players (optional, can skip)
- Follow any Clutch analysts (shows top-rated users, optional)

This takes 30-60 seconds and immediately makes the Feed feel personalized on first visit. The user sees content about THEIR team and THEIR interests from the very first session.

### What This Means for Your Friend

Your Ravens-fan, draft-research friend would see:
- **Feed:** Ravens transaction news, draft prospect updates, mock draft movement, Lamar Jackson stat analysis, combine results for players projected to Baltimore
- **Workspace:** His personal 2026 draft board that he's been building since February, with notes on every player, divergence alerts vs consensus, and links to the data that informed each ranking
- **Prove It:** His pre-season bold calls ("Ravens win the AFC North", "Lamar MVP again") tracked and visible on his profile

He opens Clutch in February and there's stuff there FOR HIM. Not a generic homepage. Not an empty league page. A feed of Ravens intel and draft research, plus his personal draft board that he's been building. That's a daily destination.

---

## THE SEASONAL FLYWHEEL: What Matters When

### The Core Principle

The Feed isn't a static product. It's a system that understands where you are in the sports calendar and surfaces the highest-value content for THAT moment. What your friend needs in February is completely different from what he needs in October — and the platform should feel different too.

This is Clutch's moat. FantasyPros looks the same year-round (different articles, same layout). ESPN is always ESPN. Clutch should feel like it's breathing with the sports calendar — the workspace tools, the feed content, the engagement hooks all shift based on what's most valuable RIGHT NOW.

### The NFL Calendar Mapped to Platform Behavior

```
THE CLUTCH YEAR — NFL FOCUS
═══════════════════════════════════════════════════════════

FEB ──── Super Bowl aftermath, free agency speculation
         Feed: Team needs analysis, cap space breakdowns,
               FA target lists, combine preview
         Workspace: Dynasty rankings refresh, watch lists
         Prove It: "Bold Offseason Predictions" opens
         Primary personas: Dynasty Nerd, Grinder

MAR ──── Free Agency frenzy, Combine
         Feed: REAL-TIME FA signings + fantasy/dynasty impact,
               combine results + athletic profiles, team-by-team
               roster changes, updated dynasty values
         Workspace: Draft board creation, FA impact notes,
                    prospect scouting notes from combine
         Prove It: Track "who predicted the landing spot" calls
         Primary personas: Dynasty Nerd, Grinder, Debater
         🔥 HIGH ENGAGEMENT WINDOW — news is breaking daily

APR ──── NFL Draft
         Feed: Draft coverage — pick-by-pick with fantasy analysis,
               landing spot grades, rookie rankings, post-draft
               team outlook updates
         Workspace: Rookie rankings tool, draft board integration
                    (rookies auto-added for ranking), updated
                    dynasty boards with draft capital context
         Prove It: "Draft prediction results" — who called the
                   picks correctly? Season-long prediction
                   contest starts to open
         Primary personas: ALL — Draft is the offseason Super Bowl
         🔥🔥 PEAK OFFSEASON ENGAGEMENT

MAY ──── Post-draft analysis, OTAs begin
         Feed: Rookie OTA reports, depth chart projections,
               post-draft dynasty value shifts, schedule release
               analysis (strength of schedule, bye weeks)
         Workspace: Season-long prediction contest OPENS —
                    full player projection rankings buildable,
                    draft board refinement continues
         Prove It: Prediction contest submission period begins
         Primary personas: Dynasty Nerd, Grinder
         ⛳ Golf season in full swing — cross-sport engagement

JUN ──── Quiet period, minicamp
         Feed: Lower volume — minicamp reports, sleeper alerts,
               ADP movement tracking, golf tournament coverage
               fills the gap
         Workspace: Prediction contest grinding — users filling
                    out projections position by position,
                    draft board maturing
         Prove It: Contest leaderboard starts showing early
                   consensus vs contrarian calls
         Primary personas: Dynasty Nerd, Grinder
         ⛳ Golf carrying engagement load

JUL ──── Training camp begins
         Feed: Training camp buzz — breakout candidates, position
               battles, injury alerts, preseason rankings updates,
               ADP risers/fallers
         Workspace: Draft board PEAK — draft season is approaching,
                    users finalizing rankings, adding last notes
         Prove It: Prediction contest deadline approaching —
                   "You still have 45 players unranked"
         Primary personas: ALL personas waking up — draft season
         📈 Engagement ramping toward season

AUG ──── Preseason, fantasy draft season
         Feed: Preseason game analysis, final depth charts,
               injury updates (CRITICAL), last-minute ADP swings,
               "draft day cheat sheet ready" notifications
         Workspace: Draft board → Live draft companion tool,
                    cheat sheet export, auction value calculator
         Prove It: Prediction contest LOCKS at Week 1 kickoff,
                   final bold calls window
         Primary personas: ALL — Peak engagement approaching
         🔥🔥🔥 DRAFT SEASON — HIGHEST ENGAGEMENT OF YEAR

SEP ──── Regular season begins
         Feed: COMPLETE MODE SHIFT →
               Weekly matchup previews, start/sit consensus,
               waiver wire targets, prop line analysis,
               injury impact alerts, "your player is questionable"
         Workspace: Shifts from draft board → weekly lineup tools,
                    trade analyzer, waiver priority list
         Prove It: Weekly picks OPEN — make calls every week,
                   accuracy tracking begins, leaderboards live
         Primary personas: ALL at peak — Informed Fan is BACK
         🔥🔥🔥 IN-SEASON MODE — Everything is live

OCT-DEC ─ Mid-season grind
          Feed: Weekly cycle on repeat:
                Tue — Waiver wire analysis, Monday recap
                Wed — Matchup previews begin, prop lines open
                Thu — TNF preview + props, start/sit updates
                Fri — Injury report impact analysis
                Sat — Final start/sit, weather updates, prop movement
                Sun — LIVE: Score alerts, "your player just scored",
                      real-time prop tracking
                Mon — MNF + weekly results, Prove It accuracy update
          Workspace: Weekly lineup optimization, trade evaluator,
                     playoff projection tools
          Prove It: Weekly picks cycle, leaderboard updates,
                    streak tracking, badge earning
          Primary personas: ALL at maximum engagement
          Also: Golf events continue in Feed for golf users

JAN ──── Playoffs + championship
         Feed: Playoff matchup analysis, championship lineup help,
               season review content begins generating,
               "Your 2025 Clutch Year in Review" (Spotify Wrapped style)
         Workspace: Playoff lineup tools, dynasty offseason
                    prep begins (who to keep, who to trade)
         Prove It: Season-long prediction contest RESOLVES —
                   final accuracy scores, annual awards,
                   Clutch Rating recalculation
         Primary personas: Informed Fan (playoffs), Dynasty Nerd
                          (already thinking about next year)
         → Cycle restarts in February
```

### The Weekly In-Season Cycle (Detailed)

During the season, the Feed has a DAILY rhythm that experienced fantasy players will recognize and appreciate:

| Day | Feed Emphasis | Workspace Focus | Prove It |
|-----|--------------|-----------------|----------|
| **Monday** | MNF preview/recap, weekly Prove It results ("you went 8-4 this week"), power rankings movement | Review last week's lineup decisions | Weekly accuracy update, streak check |
| **Tuesday** | Waiver wire analysis (automated: "biggest stat jumps from Week X"), FA pickups by % rostered, "players to grab" | Waiver wire priority list tool, trade evaluator | New weekly picks slate OPENS |
| **Wednesday** | First injury reports, matchup previews start, prop lines begin posting | Lineup tool unlocks for the week, start/sit workspace | Pick submission window open |
| **Thursday** | TNF deep dive — full matchup preview + props for tonight's game, injury updates | Set TNF lineup, make TNF prop calls | TNF picks lock at kickoff |
| **Friday** | Injury report updates (designations: OUT/DOUBTFUL/QUESTIONABLE), impact analysis on affected players and their backups | Lineup adjustments based on injury news | — |
| **Saturday** | Final start/sit recommendations, weather impact (outdoor games), late-breaking news, prop line movement summary | Final lineup tweaks, last-minute swaps | Main slate picks lock countdown |
| **Sunday** | LIVE MODE: Score updates, "your player just scored", real-time fantasy scoring, red zone alerts, prop tracking | Live scoreboard, in-game lineup decisions (bench decisions for afternoon/night games) | Picks lock at each game's kickoff |
| **Monday** | Full week recap, results, what we learned | Season-long trend review | Cycle resets |

### Cross-Sport Calendar Integration

The beauty of having golf + NFL on one platform:

```
JAN  FEB  MAR  APR  MAY  JUN  JUL  AUG  SEP  OCT  NOV  DEC  JAN
 │    │    │    │    │    │    │    │    │    │    │    │    │
NFL PLAYOFFS     FA  DRAFT  OTAs  ----  CAMP  PRE  ════════ SEASON ════
 │    │    │    │    │    │    │    │    │    │    │    │    │
GOLF ----  ════  MASTERS ══════════ MAJORS ══════════  ----  ----
 │    │    │    │    │    │    │    │    │    │    │    │    │
ENGAGEMENT:
LOW   MED  HIGH  🔥🔥  HIGH  MED   MED  🔥🔥  🔥🔥🔥  🔥🔥🔥  🔥🔥🔥  🔥🔥  MED
```

There is NO dead month. When NFL goes quiet (June), golf is in peak major season. When golf slows down (November-January), NFL is at peak engagement. The Feed automatically shifts weight between sports based on what's happening. A user who follows both never has a reason to stop opening the app.

### How Each Persona's Feed Changes Seasonally

**The Informed Fan:**
- Off-season: Mostly dormant. Occasional team news. Feed is sparse for them — and that's okay. They'll come back.
- Pre-draft (Aug): Wakes up. Draft rankings, sleeper picks, "who should I draft?" content.
- In-season: PEAK. Weekly start/sit, matchup previews, injury alerts, waiver wire. This is when the Feed serves them best.

**The Grinder:**
- Off-season: Active but lower intensity. Stat analysis, early rankings, ADP tracking.
- Pre-draft: High. Workspace heavy — building their board, refining rankings.
- In-season: Maximum. Daily feed consumer. Makes tons of Prove It picks. Lives in the data.

**The Creator:**
- Off-season: Publishing bold predictions, building pre-season rankings, creating content from the platform's tools.
- Pre-draft: Publishing their draft boards, comparing to consensus, generating shareable content.
- In-season: Weekly content cycle — publishing picks, tracking accuracy, building their public profile.

**The Bettor:**
- Off-season: Minimal. Maybe futures markets. Mostly dormant.
- In-season: Peak. Props, value alerts, odds movement. The Feed is their primary tool Wed-Sun.

**The Dynasty Nerd:**
- Off-season: THIS IS THEIR PEAK. Trade values, rookie scouting, free agency impact, draft analysis. Most active persona Feb-May.
- In-season: Moderate. Still checking dynasty values, monitoring rookie development, evaluating trade targets. But less intense than their offseason.

**The Debater:**
- Off-season: Bold predictions, pre-season takes. Moderate engagement.
- In-season: Weekly hot takes, tracking results, sharing receipts. High engagement around results.

### The Key Insight

**No single persona carries engagement year-round. But collectively, they always overlap.**

| Month | Primary Engagement Driver |
|-------|--------------------------|
| Feb | Dynasty Nerd + Debater (offseason predictions) |
| Mar | Dynasty Nerd + Grinder (free agency) |
| Apr | ALL (NFL Draft) |
| May-Jun | Dynasty Nerd + Grinder + Golf users |
| Jul | Grinder + Dynasty Nerd (camp) + Golf users |
| Aug | ALL (draft season) |
| Sep-Jan | ALL (NFL season) + Golf users |

The platform is never dead because different personas peak at different times. The Feed adapts to who's active and what matters NOW. And golf fills gaps that NFL can't.

---

## Revised Architecture: Feed + Workspace + Prove It

The platform now has three pillars, not two:

```
┌─────────────────────────────────────────────────────┐
│                    CLUTCH SPORTS                      │
│                                                       │
│   ┌─────────┐    ┌─────────────┐    ┌────────────┐  │
│   │  FEED   │    │  WORKSPACE  │    │  PROVE IT  │  │
│   │         │    │             │    │            │  │
│   │ Why you │    │ Where your  │    │ Where your │  │
│   │ open    │    │ work lives  │    │ reputation │  │
│   │ the app │    │             │    │ lives      │  │
│   └────┬────┘    └──────┬──────┘    └─────┬──────┘  │
│        │                │                  │         │
│        └────────────────┼──────────────────┘         │
│                         │                            │
│              ┌──────────┴──────────┐                 │
│              │    DATA LAYER       │                 │
│              │  (Player pages,     │                 │
│              │   team pages,       │                 │
│              │   leaderboards,     │                 │
│              │   historical stats) │                 │
│              └─────────────────────┘                 │
└─────────────────────────────────────────────────────┘
```

**Feed** = Personalized content stream (why you open the app)
**Workspace** = Your tools and analysis (why you stay)
**Prove It** = Your track record and reputation (why you come back)
**Data Layer** = The foundation everything sits on (player pages, stats, leaderboards)

Each pillar serves different personas at different intensities, but they all connect. A Feed card about a player links to their Data page. The Data page has a "Make a Call" button that feeds Prove It. Prove It results appear in the Feed. Workspace rankings can be published to Prove It. The whole thing is a loop.

---

## Implementation Priority (Revised)

### Phase 0: Data Foundation (Build Now)
- Player profile pages populated with nflfastR historical data (~1,500 pages)
- Team pages (32)
- Stat leaderboards (filterable, sortable)
- Player comparison tool
- This is the Data Layer — everything else sits on top of it

### Phase 1: Feed MVP (Build Now — This Is the Off-Season Answer)
- Interest selection on signup (teams, topics, players)
- Auto-generated feed cards from:
  - Public NFL transaction/news data (free agency moves, trades)
  - nflfastR stat computations (career trends, historical analysis)
  - NFL Draft data (mock drafts, combine results) — as available
- Template engine that turns data events into readable cards
- Feed filtering (by team, by topic, all)
- Every card links deeper into the Data Layer

### Phase 2: Workspace MVP (Build Next — Before Draft Season)
- Interactive draft board with drag-and-drop and notes
- Player watch list
- Position rankings tool
- Divergence alerts (your rankings vs community consensus)
- These tools give people a reason to DO something on the platform pre-season

### Phase 3: Prove It + Community (Build for Season)
- Weekly picks system
- Season-long prediction contest
- Public profiles with accuracy tracking
- Leaderboard and badges
- Published rankings (Workspace → Prove It pipeline)

### Phase 4: Intelligence Layer (Build for Season)
- Clutch model projections (invisible engine powering value flags and benchmarks)
- Prop analysis pages
- AI Caddie integration
- Premium features (Clutch Edge, personalized recommendations)

---

## Next Steps

1. **Validate the Feed + Workspace concept** — does this feel right?
2. **Design the feed card templates** — what does each content type look like?
3. **Map the data pipeline for feed generation** — what events trigger what cards?
4. **Build the draft board workspace tool** — this is the killer app for pre-season
5. **Spec the interest selection onboarding flow**
6. **Start populating player profile pages with nflfastR data immediately**
