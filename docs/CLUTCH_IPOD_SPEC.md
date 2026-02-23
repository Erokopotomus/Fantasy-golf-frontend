# CLUTCH iPOD SPEC — The Core Fantasy Experience

> **What this document is:** A reset directive. We've been building great pieces but lost the thread connecting them. This spec defines what Clutch actually IS at its core, reorganizes existing features around a single user loop, and establishes the sport-agnostic architecture so golf and NFL (and future sports) run on the same system. Nothing gets deleted. Everything gets refocused.

> **How to use this:** Read this BEFORE doing any more feature work, brainstorming, or architectural planning. This is the north star. If something isn't in this doc, it's not in scope right now. The Hub/Notebook/Lens architecture, the Feed, the year-round engagement flywheel — all of that is parked. It's Season 2. This is the iPod.

---

## THE ONE TRUTH

**People come to Clutch to play fantasy sports and win their leagues.**

Everything else — the AI coach, the Clutch Rating, Prove It, the social layer — exists to make that experience better than anywhere else. These are not separate products. They are not side quests. They are enhancements woven INTO the act of playing fantasy sports.

If a feature doesn't help someone prepare for their draft, manage their team, or compete in their league, it waits.

---

## THE CORE LOOP

Every user, every sport, every league follows this loop:

```
PREP → DRAFT → MANAGE → COMPETE → (repeat weekly)
```

### PREP (Pre-Draft / Pre-Tournament / Pre-Week)
The user gets ready. The AI coach makes them feel like they have an unfair advantage.
- Review the upcoming event/week/matchup
- Study the player pool with AI-powered insights (not just stats — context, narratives, recommendations)
- Build/refine their draft board with tags (Target / Sleeper / Avoid)
- Get coached: "Here's what you should be paying attention to"

### DRAFT
The user picks their team. The experience is electric, not spreadsheet-y.
- Snake or auction draft with real-time WebSocket
- AI coach whispers during the draft: "He's a reach here" / "This is your guy at this spot"
- Draft board tags carry through — your prep work is visible
- Post-draft grade and analysis

### MANAGE (In-Season / In-Tournament)
The user runs their team week to week. The AI removes the guesswork.
- Set lineups with coach recommendations
- Waiver wire / free agent pickups with AI-suggested moves
- Trade evaluation (when trades exist for that sport)
- Live scoring with real-time updates

### COMPETE
The user sees how they stack up. This is where the emotional hook lives.
- Matchup results and standings
- Clutch Rating builds passively from every action (not a separate destination)
- Quick predictions surface IN CONTEXT (not on a separate Prove It page)
- League activity and light social features

---

## SPORT-AGNOSTIC ARCHITECTURE

### The Universal Shell

These components are IDENTICAL regardless of sport. They should be built once and parameterized:

| Component | What It Does | Sport-Specific Data |
|-----------|-------------|-------------------|
| **League Creation** | Name, format, invite, settings | Scoring categories, roster slots, schedule type |
| **Draft Room** | Real-time pick interface, timer, queue, board | Player pool, position labels, default rankings |
| **Draft Board / Lab** | Pre-draft rankings with tagging system | Players, stat columns, AI insight content |
| **Roster Management** | Set lineups, bench, add/drop | Position slots, lineup lock rules, waiver rules |
| **Matchup View** | Weekly/event head-to-head or points comparison | Scoring breakdown by category |
| **Standings** | Season-long leaderboard within league | Points format, record format, tiebreakers |
| **Live Scoring** | Real-time score updates during events | Data feed source, scoring calculation |
| **League Home** | Central hub for a specific league | Contextual coach briefing, upcoming event info |
| **Dashboard** | Cross-league home screen | Active leagues list, next actions, router |
| **Coach Briefings** | AI-generated contextual guidance | Sport/event/player specific content |
| **Clutch Rating** | Composite skill score that builds from actions | Rating components may differ by sport |

### Sport Modules

Each sport plugs into the universal shell by defining:

```
SportModule {
  sport_key: string           // "golf", "nfl", "nba", etc.
  display_name: string        // "Golf", "NFL Football"
  
  // Player & Roster
  positions: Position[]       // e.g., ["G", "G", "G", "G", "BENCH"] for golf
  roster_size: number
  bench_size: number
  
  // Scoring
  scoring_categories: Category[]
  default_scoring_rules: ScoringRule[]
  
  // Schedule
  schedule_type: "tournament" | "weekly_matchup" | "daily"
  event_source: string        // API endpoint for schedule/events
  
  // Data
  player_data_source: string  // API for player stats
  live_scoring_source: string // WebSocket/API for real-time scores
  stat_columns: StatColumn[]  // What stats to show on draft board, player cards
  
  // AI Coach
  insight_generators: InsightGenerator[]  // Sport-specific coaching logic
}
```

---

## GOLF MODULE

### What Exists Today (Keep & Refine)
- ✅ League creation with golf-specific settings
- ✅ Snake draft format
- ✅ Draft board with 200 players, SG (Strokes Gained) stats, tagging system
- ✅ PGA Tour event schedule integration
- ✅ Live scoring during tournaments (Genesis Invitational bottom bar is working)
- ✅ Standings page
- ✅ Basic roster management

### What Needs to Change

**Draft Board (The Lab)**
Currently: A ranked list of 200 golfers with SG numbers and tag filters. Functional but flat.

Target experience: The board should feel like your personal war room, not a spreadsheet. The AI coach should be contextually present ON the board — not behind a separate button or page.

Specific changes:
- When a user hovers or expands a player row, show a coach insight panel: recent form, tournament history at the upcoming course, weather/course fit analysis, how this player compares to others in their tier
- The tag system (Target/Sleeper/Avoid) should feel more prominent — color-coded rows, filter counts visible, maybe a "conviction meter" for how many players you've tagged
- Add a "Coach's Take" banner at the top of the board that rotates through 3-5 key insights: "Scheffler is the clear #1 but the gap to the field is smaller at Riviera" / "Rahm hasn't played a PGA Tour event in 14 months — price him accordingly"
- The board IS the Lab. Don't make users navigate to a separate page. If they're in their league and click "Draft Prep" or "The Lab," they land here.

**League Home**
Currently: Coach briefing + 10 navigation tabs + draft countdown + action cards. Too much competing for attention.

Target experience: One screen that answers "what do I need to do right now?"

Specific changes:
- Primary content area: THE CURRENT/NEXT TOURNAMENT. Show the event name, dates, course, field strength. If a tournament is live, show the leaderboard with your rostered players highlighted. If a draft is upcoming, show the countdown with a single CTA to prep your board.
- Coach briefing should be specific and actionable, not "stay sharp." Examples: "The Genesis is a ball-striker's course — your roster is heavy on bombers. Consider swapping [Player X] for [Player Y] before lineups lock." / "Draft in 4 days: you've tagged 12 targets but only 3 sleepers. The mid-rounds win drafts — spend 10 minutes on the 50-100 range."
- Navigation tabs: reduce visual weight. Keep My Roster, Draft Room, Players, Standings, Scoring, Settings. Remove or collapse: Waivers (put in Players), Trades (not applicable for most golf formats), Vault (Season 2).
- Your team's current tournament score should be visible WITHOUT clicking into a sub-page.

**Dashboard**
Currently: Coach briefing card, Quick Actions (Create League, The Lab, Prove It, Ask Coach), This Week section, My Leagues section, Clutch Rating widget, My Boards, Recent Activity. It's a portal page trying to do everything.

Target experience: A router. Get the user INTO their league in 2 seconds.

Specific changes:
- If the user has 1 active league: the dashboard should basically BE that league's home page, or route them there immediately with a minimal interstitial
- If the user has multiple leagues: show a prioritized list. The league with the most urgent action (draft today > lineup due > tournament live > nothing pending) is at the top, expanded, with a single CTA. Other leagues are collapsed cards below.
- The coach briefing at the top should be a single sentence about the most important thing across ALL leagues: "Your draft for Test Golf League is in 4 days. Start prepping your board →"
- Quick Actions: remove. These are navigation crutches for a cluttered page. If the dashboard routes you to the right place, you don't need shortcut tiles.
- Clutch Rating: move to the user's profile page. It should NOT be on the dashboard. The dashboard is about your leagues. The rating builds in the background.
- Recent Activity: keep but minimize. Small feed at the bottom.

### Golf-Specific Data

```
golf_positions: ["G", "G", "G", "G", "G", "G", "BENCH", "BENCH"]  // Typical 6-starter, 2-bench
golf_scoring: "total_strokes" | "points_per_stat" | "salary_cap"
golf_stats: ["sg_total", "sg_off_tee", "sg_approach", "sg_around_green", "sg_putting", "driving_distance", "driving_accuracy", "gir", "scrambling"]
golf_events: PGA Tour schedule, LIV events, majors
golf_data_source: DataGolf API / SportsDataIO
```

---

## NFL MODULE (Base Level — Architecture Ready, Build Later)

### Overview
NFL is the growth engine. Golf is the niche differentiator. NFL needs to be architecturally ready so when build time comes (target: July 2026 for August draft season), the sport-agnostic shell just needs the NFL module plugged in.

### How NFL Differs from Golf

| Dimension | Golf | NFL |
|-----------|------|-----|
| Season structure | Tournament-by-tournament, ~30 events/year | 18-week regular season + playoffs |
| Matchup format | Total points per tournament period | Head-to-head weekly matchups |
| Roster structure | All same position (golfers) | Multi-position (QB, RB, WR, TE, K, DEF, FLEX) |
| Draft complexity | Simple — pick golfers | Complex — positional scarcity, bye weeks, handcuffs |
| In-season management | Minimal — swap before tournament lock | Heavy — weekly lineups, waiver wire, trades |
| Live scoring | 4 days (Thu-Sun for PGA) | Primarily Sunday, with Thu/Mon games |
| Trade market | Rare/simple | Active and complex |
| Data richness | Strokes Gained, course fit | Targets, snap counts, red zone, matchup grades |

### NFL Sport Module Definition

```
nfl_positions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF", "BENCH", "BENCH", "BENCH", "BENCH", "BENCH", "BENCH", "IR"]
nfl_scoring_formats: ["standard", "half_ppr", "full_ppr", "custom"]
nfl_league_formats: ["redraft", "keeper", "dynasty"]
nfl_schedule_type: "weekly_matchup"
nfl_draft_types: ["snake", "auction", "slow_email"]
nfl_waivers: ["faab", "priority", "continuous"]
```

### NFL-Specific Features (Build When Ready)
- **Weekly matchup view**: Your team vs. opponent, position-by-position, with projected scores and live scores on game day
- **Waiver wire with FAAB**: Blind bidding system for player pickups — this is where the AI coach shines ("Bid $12 on Player X — he's a league-winner that 80% of managers will underbid")
- **Trade analyzer**: AI evaluates trade proposals — "You're giving up the WR3 overall for an RB2 and a flex. In full PPR, this makes your team worse by ~4 points/week."
- **Bye week planner**: Coach alerts you weeks in advance about bye week hell
- **Playoff probability**: "You're 6-3 and have a 78% chance of making playoffs. Here's the scenario math."

### NFL AI Coach Content Examples
Pre-draft: "In PPR leagues, target RBs who catch 50+ passes. Here are the top 5 pass-catching backs going outside the first 3 rounds..."
Weekly: "Start Jayden Daniels over Jalen Hurts this week. Daniels faces the league's worst pass defense and Hurts is dealing with a knee issue that limits his rushing upside."
Waiver: "Grab [Player X] NOW. He just got promoted to the starting role and is available in 70% of leagues."
Trade: "You're being offered Cooper Kupp for your De'Von Achane. Kupp is 32 with an injury history. Achane is a top-5 asset in dynasty. Decline."

### Database Considerations for NFL
- `players` table needs: position, team, bye_week, injury_status, depth_chart_position
- `matchups` table: weekly head-to-head pairings within a league
- `projections` table: weekly player projections (can be AI-generated or from data feeds)
- `transactions` table: trades, add/drops, waiver claims — with full audit trail
- `league_settings` needs: scoring_format, roster_slots, trade_deadline_week, playoff_weeks, waiver_type, faab_budget

---

## THE AI COACH — HOW IT ACTUALLY WORKS

### Principle: The Coach Comes to You

The coach is NOT a page. The coach is NOT a chatbot in the corner. The coach is contextual intelligence that appears WHERE you already are, WHEN you need it.

| Where You Are | What the Coach Does |
|--------------|-------------------|
| Dashboard | Single-sentence priority: "Draft in 4 days — prep your board" |
| League Home | Event-specific briefing: "Riviera favors ball-strikers. Your roster is well-positioned." |
| Draft Board | Player-level insights on hover/expand. Board-level insights as a banner. |
| Draft Room | Whisper mode: quick recommendations as picks happen around you |
| Roster/Lineup | "Start X over Y because..." — attached to the lineup decision, not a separate page |
| Matchup View | "You're projected to win by 8. Your risk is at the TE position." |
| Waiver Wire | "Pick up X, drop Y. Here's why." — right in the player list |
| Post-Game | "Your team scored 4th this week. Here's what went right and what to adjust." |

### Coach Implementation Notes
- Coach insights are generated server-side and cached. They update when new data arrives (injury reports, odds changes, stat updates), not on every page load.
- Start with TEMPLATE-BASED insights (fill-in-the-blank with data), not full LLM generation for every insight. LLM-generated coaching is Season 2 when you have the Claude API integration dialed in.
- Template examples:
  - `"{player} has gained {sg_total} strokes on the field in his last {n} tournaments. That ranks #{rank} on tour."`
  - `"{player} has missed the cut in {n} of his last {m} events at {course}. Fade candidate."`
  - `"Your roster's average SG: Approach is {value}, which ranks #{rank} among all teams in your league."`

### Coach Personality
Tone: Sharp, confident, slightly irreverent. Like a smart friend who watches too much sports. Not corporate. Not robotic. Not sycophantic.
- YES: "Rahm at 2? Bold. He hasn't played against this field in over a year. I'd slot him 6-8."
- NO: "Based on our analysis, Jon Rahm presents an elevated risk profile due to competitive absence."
- YES: "Your team is sneaky good this week. Low-key top 3 roster in the league."
- NO: "Your team's projected performance indicates a favorable competitive position."

---

## CLUTCH RATING — THE BACKGROUND GAME

### Principle: You Never "Go To" Your Rating. It Comes to You.

The Clutch Rating is the game-within-the-game. It makes every action on the platform feel meaningful. But it is NEVER the primary reason someone is on a page. It's ambient. It's the XP bar, not the quest.

### How It Builds (Per Sport)

| Action | Rating Component | Points |
|--------|-----------------|--------|
| Complete a draft | Draft IQ | Graded post-draft |
| Tag players on your board | Draft IQ (prep) | Small bump for engagement |
| Win a weekly matchup | Win Rate Intelligence | Based on margin, opponent strength |
| Make a roster move that improves projected score | Roster Management | AI evaluates the move quality |
| Make a prediction (Prove It) | Prediction Accuracy | Graded on outcome |
| Consistency over time | Consistency | Rolling calculation |
| Win a league/finish top 3 | Championship Pedigree | Season-end bonus |

### Where the Rating Appears
- **User profile page**: Full breakdown with all components, history, badges. This is the "home" of the rating.
- **League standings**: Small badge next to each manager's name showing their overall rating tier (Rookie → Contender → Veteran → Expert → Elite)
- **Draft room**: Your rating badge visible to other drafters. Social proof / intimidation.
- **Micro-animations**: When you complete an action that affects your rating, a subtle "+2 Draft IQ" toast appears. Not disruptive, but satisfying.

### Where the Rating Does NOT Appear
- Dashboard (clutters the routing function)
- Draft board (you're here to prep, not admire your score)
- Lineup management (you're here to set your lineup)

### Sport-Specific Ratings
Each sport has its own Clutch Rating. If you play golf and NFL, you have two ratings. A Global Rating (weighted rollup) is calculated if you're active in 2+ sports. This is Season 2 — for now, just golf.

---

## PROVE IT — CONTEXTUAL, NOT A DESTINATION

### Current Problem
Prove It is a separate nav item and a separate page. It feels disconnected from the league experience. The user has to actively choose to go make predictions, which most won't.

### Target Experience
Predictions surface WHERE the action is:

- **Tournament leaderboard (golf)**: "Scheffler is -8 through 36 holes. Think he wins? Call it." One tap.
- **Pre-draft board**: "Who goes #1 overall in your league's draft? Lock in your prediction."
- **Weekly matchup (NFL)**: "You're facing Jake this week. Confident? Predict your margin of victory."
- **Waiver wire**: "You think [Player X] finishes top 10 ROS? Tag it."

These micro-predictions are captured, tracked, and feed into the Prediction Accuracy component of the Clutch Rating. The user never has to navigate to a predictions page. They just react to prompts that appear naturally in their workflow.

### The Prove It Profile
A user's prediction history lives on their profile (same place as Clutch Rating). It's their track record. This is where the influencer / analyst angle eventually lives — people with amazing prediction accuracy get credibility badges. But that's discovery and social, which is Season 2.

For now: capture predictions contextually, grade them, show them on the profile. That's it.

---

## WHAT TO BUILD NEXT (PRIORITY ORDER)

### Priority 1: Fix the Dashboard → League Home Flow
**Goal**: Eliminate the "now what" feeling. When someone logs in, they should be IN their league within 2 seconds.

Tasks:
1. Simplify the Dashboard to be a league router. One coach sentence at the top. Active leagues prioritized by urgency. Minimal chrome.
2. Redesign League Home to lead with the current/next event (golf) or current/next matchup (NFL). Coach briefing is specific and actionable. Your team's status is immediately visible.
3. Remove Quick Actions tiles from Dashboard.
4. Move Clutch Rating off the Dashboard to the user profile.
5. Reduce League Home navigation tabs — consolidate where possible.

### Priority 2: Make the Draft Board Feel Alive
**Goal**: The draft board should be the best draft prep experience in fantasy sports.

Tasks:
1. Add coach insights to player rows (expandable detail with AI-generated or template-based scouting notes).
2. Add a "Coach's Take" banner at the top with rotating key insights about the upcoming event.
3. Make the tagging system more visually prominent — color-coded rows, conviction tracking.
4. Ensure the board is the ONLY draft prep destination — no separate "Lab" concept.

### Priority 3: Coach Integration Points
**Goal**: The AI coach appears where you are, not on a separate page.

Tasks:
1. League Home coach briefing: specific, actionable, updated based on upcoming event data.
2. Draft board inline insights: player-level context on expand.
3. Lineup management recommendations: "Start X over Y" with reasoning.
4. Post-event/week summary: "Here's how your team did and what to adjust."

### Priority 4: NFL Module Scaffolding
**Goal**: Architect the NFL module so it plugs into the existing sport-agnostic shell when build time comes.

Tasks:
1. Ensure the league creation flow accepts sport-specific configuration (positions, scoring format, schedule type).
2. Create the NFL sport module definition (positions, scoring rules, default settings).
3. Verify the database schema supports NFL-specific needs (weekly matchups, multi-position rosters, trades, FAAB waivers).
4. Stub out NFL data feed integration points.

### Priority 5: Contextual Predictions (Prove It Lite)
**Goal**: Capture predictions without a separate page.

Tasks:
1. Add prediction prompts to the tournament leaderboard view.
2. Add pre-draft prediction captures.
3. Store predictions and grade them when outcomes resolve.
4. Show prediction history on the user profile.

---

## WHAT IS EXPLICITLY PARKED (SEASON 2)

These are good ideas. They are not iPod ideas. Do not build them now.

- **Hubs / Sport Workspaces**: The concept of a Golf Hub or NFL Hub as a research workspace outside of leagues. Park it.
- **Player Notebook**: Global research notes that sync across leagues. Park it.
- **The OS/App Layer Model**: Research globally, compete locally, AI bridges the gap. Beautiful architecture. Park it.
- **Feed**: Cross-league social activity feed. Park it.
- **Neural Cluster Animation**: The breathing, floating brain visualization for the coach. Park it. (Use a simple, clean coach icon/avatar for now.)
- **Influencer / Analyst Leaderboards**: Public prediction leaderboards for building credibility. Park it.
- **League Import / Vault**: Importing history from Yahoo/ESPN/Sleeper. Park it.
- **Year-Round Engagement Flywheel**: The offseason engagement strategy. Park it.
- **Global Clutch Rating**: Multi-sport rollup rating. Park it. (Single-sport ratings only for now.)
- **Ask Coach Chatbot**: Free-form AI chat. Park it. (Coach delivers insights contextually, not via chat.)

---

## HOW TO USE THIS DOC IN CLAUDE CODE

### Prompt to Start a New Session

Paste this into Claude Code:

```
Read CLUTCH_IPOD_SPEC.md before doing anything. This is a strategic reset document. We've been building great features but lost the thread connecting them. The spec defines the core user loop (Prep → Draft → Manage → Compete), establishes sport-agnostic architecture, and reprioritizes what to build next.

KEY CONTEXT:
- We are NOT throwing away existing work. We are reorganizing and refocusing it.
- The existing draft board, league infrastructure, scoring, and UI are good. They need refinement, not rebuilding.
- The immediate priorities are: (1) simplify Dashboard to be a league router, (2) make the draft board feel alive with coach insights, (3) integrate the AI coach contextually into existing pages, (4) scaffold the NFL module.
- Everything in the "PARKED" section is off-limits until the core loop is airtight.
- The Clutch Rating still exists but moves off the Dashboard to the user profile. It builds in the background from user actions.
- Prove It still exists but predictions surface contextually, not on a separate page.
- The coach is NOT a chatbot or a separate page. It's contextual intelligence woven into existing pages.

Start by reviewing the current Dashboard (frontend/src/pages/Dashboard.jsx) and League Home (frontend/src/pages/LeagueHome.jsx) against the spec's recommendations, then propose specific changes.
```

### Prompt for Subsequent Sessions

```
Re-read CLUTCH_IPOD_SPEC.md for context. We're building the iPod — the core fantasy sports experience for golf (now) and NFL (architecture-ready). The spec defines the priorities. Where did we leave off?
```

---

## DESIGN PRINCIPLES (REMINDERS)

1. **The user came to play fantasy sports.** Everything else serves that purpose.
2. **The coach comes to you.** Never make the user seek out intelligence.
3. **One clear action per screen.** If you can't answer "what should the user do here?" in one sentence, the page is doing too much.
4. **Sport-agnostic shell, sport-specific data.** Build it once, parameterize it.
5. **Ambient rating, not destination rating.** The Clutch Rating is the XP bar, not the quest.
6. **Show, don't tell.** Instead of "Go to The Lab to prep," show the user their draft board with a coach insight already loaded.
7. **The existing brand system (Aurora Ember) stays.** Dark theme, warm charcoal, gold accents, glass cards, Syne/DM Sans/JetBrains Mono. Don't change the visual identity — refine the information architecture within it.
