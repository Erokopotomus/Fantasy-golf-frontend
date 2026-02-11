# THE LAB — Product Redesign Spec

## Clutch Fantasy Sports — Draft Prep Hub Redesign

*Created: February 10, 2026*
*Feed this document to Claude Code alongside existing build specs.*

---

## THE PROBLEM

The current "My Workspace" page is a generic file browser. It shows draft board cards with minimal metadata and gives no sense of what the space actually is. For a new user, it looks like an empty folder. For a returning user, it's just a list of boards with no context about their broader prep work.

This page is supposed to be the beginning of the entire Clutch flywheel — where months of intelligence gathering, conviction-building, and analysis converge into a draft-day edge. It should feel like walking into a war room, not opening a file drawer.

## THE INSIGHT

How serious fantasy managers actually prep for drafts:

1. **Primary intelligence source:** Podcasts and media takes (consumed passively, throughout the day)
2. **Secondary:** Personal stat research, conversations with league mates, accumulated gut feel
3. **What happens to that intelligence today:** Mental notes that fade. Occasional phone notes that get lost. Maybe a spreadsheet entry. Mostly nothing — the signal leaks out between intake and draft day.
4. **What they bring to the draft:** A printed cheat sheet, a laptop spreadsheet, and vibes.

**The core product thesis:** The Lab is the container that catches all of that leaking signal — every podcast take, every stat insight, every gut feeling — and over months, refines it into a personalized draft-day weapon. It's a working masterpiece you improve all year that gets boiled down to the most basic, best version for a draft.

---

## NAMING

**Old name:** My Workspace
**New name:** The Lab

**Why "The Lab":** It implies experimentation, building, iteration. You're testing hypotheses about players. You're mixing inputs from different sources. You're refining a formula. It's active, not passive. It's yours.

**Nav bar:** Change "Workspace" → "Lab" in the main navigation.

**Page header:**
```
THE LAB
Where your draft thesis takes shape.
```

Not "Personal draft boards, rankings & scouting notes." That's a feature list. The new subtitle communicates what this space IS, not what tools it contains.

---

## PAGE ARCHITECTURE

The Lab is a **hub page** with cards that route into deeper tools. It shows the state of your evolving draft thesis at a glance, with everything you need to understand where your prep stands and what to do next.

### Layout Structure (Top to Bottom)

```
┌─────────────────────────────────────────────────────────────┐
│  THE LAB                                                     │
│  Where your draft thesis takes shape.                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  🧠 AI INSIGHT (contextual, rotates)                   │  │
│  │  "You've been building your PPR board for 3 weeks but  │  │
│  │  haven't ranked any TEs yet. The top 5 TEs have a      │  │
│  │  huge ADP gap — worth looking at before it's too late." │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────────────┐  │
│  │  DRAFT READINESS      │  │  RECENT CAPTURES             │  │
│  │                       │  │                              │  │
│  │  2026 Redraft Season  │  │  📝 "Fade Saquon — Berry     │  │
│  │                       │  │  says O-line is a mess"      │  │
│  │  ✅ Big Board created │  │  → linked to Saquon Barkley  │  │
│  │  ✅ QBs ranked        │  │  2 hours ago                 │  │
│  │  ✅ RBs ranked        │  │                              │  │
│  │  ⬜ WRs ranked        │  │  📝 "McConkey breakout       │  │
│  │  ⬜ TEs ranked        │  │  candidate — target share    │  │
│  │  ⬜ Cheat sheet       │  │  data is insane"             │  │
│  │  reviewed             │  │  → linked to Ladd McConkey   │  │
│  │                       │  │  Yesterday                   │  │
│  │  [View Full Tracker]  │  │                              │  │
│  └──────────────────────┘  │  📝 "Rushing QBs undervalued  │  │
│                             │  in half-PPR leagues"         │  │
│                             │  → no player tag (general)    │  │
│                             │  3 days ago                   │  │
│                             │                              │  │
│                             │  [+ Quick Note]  [View All]  │  │
│                             └──────────────────────────────┘  │
│                                                              │
│  MY BOARDS                                        [+ New]    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ 2026 NFL     │ │ Dynasty      │ │ Keeper       │         │
│  │ Big Board    │ │ Startup      │ │ League       │         │
│  │ (VBD)        │ │              │ │ Board        │         │
│  │              │ │ 12-team      │ │              │         │
│  │ 12-team PPR  │ │ SF PPR       │ │ 10-team      │         │
│  │ 200 players  │ │ 150 players  │ │ Half-PPR     │         │
│  │ 4 positions  │ │ 2 positions  │ │ 0 players    │         │
│  │ ranked       │ │ ranked       │ │              │         │
│  │              │ │              │ │ 🆕 Just      │         │
│  │ Last edited  │ │ Last edited  │ │ created      │         │
│  │ 2 hours ago  │ │ 3 days ago   │ │              │         │
│  │              │ │              │ │ [Start       │         │
│  │ [Continue]   │ │ [Continue]   │ │  Ranking →]  │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                              │
│  WATCH LIST                                    [View All]    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 👁 8 players watched · 2 alerts this week              │  │
│  │                                                        │  │
│  │ 🔔 Ladd McConkey — ADP rose 8 spots in the last week  │  │
│  │ 🔔 Trey McBride — Report: Cardinals exploring TE-heavy │  │
│  │    offense in new scheme                               │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  DECISION JOURNAL                              [View All]    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 📓 12 entries · Last entry: yesterday                  │  │
│  │                                                        │  │
│  │ Latest: "Changed my mind on the Packers backfield.     │  │
│  │ Moving Jacobs up to RB5 from RB8. The volume floor     │  │
│  │ is too high to ignore."                                │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## COMPONENT SPECS

### 1. AI Insight Bar

**Position:** Top of page, below header
**Behavior:** Contextual, calendar-aware, rotates based on user state
**Tone:** Smart friend, not robot. Conversational nudges, not formal alerts.

Example insights by context:

- **New user, no boards:** "Welcome to The Lab. This is where your draft thesis takes shape. Start by creating your first board — we'll pre-load it with consensus rankings so you can start adjusting right away."
- **Has board, incomplete positions:** "You've ranked your RBs and QBs but haven't touched TEs yet. The TE landscape this year has a massive Tier 1 drop-off — worth getting your take down before it influences your overall board."
- **Has board, stale (2+ weeks no edits):** "Your Big Board hasn't been updated since January 28. A lot has happened — 3 players on your board have had ADP shifts of 10+ spots. Want to review what changed?"
- **Pre-draft season (July-August):** "Draft season is 3 weeks away. Your cheat sheet is ready to generate — review it now so you have time to make final adjustments."
- **Post-draft (September):** The Lab shifts to in-season mode. Insight becomes: "Your pre-season rankings are locked and tracking. Henry is on pace to finish as RB3 — you had him at RB8. Check your Prove It page for full tracking."
- **Offseason (Feb-March):** "Free agency is heating up. 4 players on your watch list have changed teams. Your dynasty board may need updates."

**Dismissable:** Yes, with an "x" — but a new insight replaces it on next visit.

**Database:**
```sql
-- No dedicated table needed; insights are generated dynamically
-- by querying user's board state, note recency, watch list alerts,
-- and calendar position. Cache the current insight per user.
clutch_lab_insights_cache
- user_id (PK)
- insight_text
- insight_type (enum: nudge, alert, seasonal, onboarding)
- generated_at
- dismissed_at (nullable)
```

---

### 2. Draft Readiness Tracker

**Position:** Left column, below AI insight
**Purpose:** Soft progress indicator showing what you've done and what's left — without a percentage score.

**Tracks per board:**
- Board created (yes/no)
- Positions ranked (which positions have rankings vs. not)
- Number of player notes added
- Watch list populated (yes/no)
- Cheat sheet generated and reviewed (yes/no)
- At least one mock draft completed (future feature)

**Display:** Checklist style with checkmarks and empty boxes. Not a progress bar. Not a percentage. Just "here's what you've done, here's what's left."

**Per-league context:** Each board is tied to a league context (team count, scoring format, league type). The readiness tracker is per-board, so if you have 3 leagues, you see 3 readiness states. The hub shows a summary; clicking opens the full tracker for that board.

**Seasonal behavior:**
- Pre-draft: Full tracker visible, emphasizing what's incomplete
- Post-draft: Collapses to "Your 2026 boards are locked and tracking" with a link to Prove It
- Offseason: Shifts to dynasty/keeper board readiness

---

### 3. Recent Captures (Quick Notes Feed)

**Position:** Right column, below AI insight
**Purpose:** Show the last 5-8 notes captured via the quick note system, with player tag links.

**Each capture shows:**
- Note text (truncated if long, expandable)
- Player tag(s) if detected/assigned (clickable → goes to player page)
- Source tag if provided (podcast name, article, "gut feel", etc.)
- Timestamp (relative: "2 hours ago", "Yesterday", "Feb 3")

**Quick Note button:** Prominent "+ Quick Note" button at the bottom opens the inline capture form (same form as the floating capture button, just embedded).

**"View All" link:** Goes to the full notes/captures page with search, filter by player, filter by source, date range, etc.

---

### 4. Board Cards (Enhanced)

**Position:** Below the insight/readiness/captures section
**What changed from current:** Much richer metadata on each card.

**Each board card shows:**
- Board name (editable)
- League context: team count, scoring format (PPR/Half/Std), league type (redraft/dynasty/keeper)
- Sport badge (NFL, Golf, etc.)
- Player count and position coverage (e.g., "200 players · 4 of 6 positions ranked")
- Last edited timestamp
- Status/CTA:
  - New board with no rankings: "Start Ranking →"
  - In-progress board: "Continue"
  - Complete board (all positions ranked): "Review" or "Generate Cheat Sheet"
  - Published/locked board: "Locked · Tracking on Prove It"

**Board creation flow (enhanced):**
When user clicks "+ New Board":

1. **Name your board** (default: "2026 NFL Big Board")
2. **Select league context:**
   - Sport: NFL / Golf
   - League type: Redraft / Dynasty / Keeper
   - Team count: 8 / 10 / 12 / 14 / 16
   - Scoring: PPR / Half-PPR / Standard / Custom
   - Draft type: Snake / Auction / Linear (affects cheat sheet output)
3. **Starting point:**
   - "Start from consensus ADP rankings" (pre-loads all players in ADP order — user adjusts from there)
   - "Start from last year's board" (if they have one)
   - "Start blank" (empty board, add players manually)

**The ADP pre-load is critical.** This is what FantasyPros does well — you don't start from zero. You start from the consensus and make YOUR adjustments. The act of "I'd move this guy up 3 spots" IS the opinion capture. It's the lowest-friction way to build a personalized board.

---

### 5. Watch List Summary

**Position:** Below boards
**Purpose:** Compact view of watch list state with recent alerts.

**Shows:**
- Total players watched
- Number of alerts this week (ADP movement, news, injury updates)
- Top 2-3 most recent alerts with one-line summaries
- "View All" → full watch list page

**Alert types:**
- ADP movement (player moved X spots in the last week)
- News/injury (from Feed data)
- Consensus rank change (expert rankings shifted significantly)
- Custom alert (user-defined thresholds)

---

### 6. Decision Journal Summary

**Position:** Below watch list
**Purpose:** Surface the most recent journal entry as a reminder of your latest thinking.

The Decision Journal is different from quick captures. Quick captures are raw inputs — "heard this on a podcast." Decision Journal entries are processed thoughts — "I've decided to move Jacobs up because of X, Y, Z." They represent conviction moments.

**Shows:**
- Total entries and last entry date
- Latest entry preview (truncated)
- "View All" → full journal with timeline view

**Inside the full Decision Journal page:**
- Chronological entries with timestamps
- Player tags on each entry
- "Before/After" snapshots: when you log a decision, optionally snapshot your board state so you can see what changed and why
- Search and filter by player, date, tag

---

## THE QUICK CAPTURE SYSTEM

This is the single most important UX innovation on the page. It solves the "podcast take → mental note → forgotten" problem.

### Two Entry Points

**1. Floating Action Button (site-wide)**
- Appears on every page of Clutch (bottom-right corner)
- Single tap opens a capture drawer/modal
- Available while browsing the Feed, player pages, anywhere
- The button is always there — like a "save to Lab" universal action

**2. Inline Quick Note (on The Lab hub page)**
- Same form, embedded directly in the Recent Captures section
- For when you're already in The Lab and want to jot something

### Capture Form

```
┌─────────────────────────────────────────────────┐
│  📝 Quick Capture                          [×]  │
│                                                  │
│  [What's on your mind?                        ]  │
│  [                                            ]  │
│  [                                            ]  │
│                                                  │
│  Players: [auto-detected] Saquon Barkley ×       │
│           [+ Add player]                         │
│                                                  │
│  Source:  ○ Podcast  ○ Article  ○ Stats           │
│          ○ Conversation  ○ Gut Feel  ○ Other      │
│                                                  │
│  Sentiment: 📈 Bullish  📉 Bearish  😐 Neutral   │
│                                                  │
│                              [Save to Lab]       │
│                                                  │
└─────────────────────────────────────────────────┘
```

### AI Auto-Tagging

When user types a note, AI scans for player names and suggests tags:

- User types: "Berry says fade Saquon because of the O-line. Also mentioned Breece Hall as a potential league-winner."
- AI detects: "Saquon Barkley" and "Breece Hall"
- Auto-populates the Players field with both names as suggested tags
- User can confirm, remove, or add more

**Implementation:** Client-side fuzzy matching against the player database first (fast, no API call). For ambiguous names or nicknames, fallback to a lightweight AI call. Priority is speed — this form should feel instant.

### Where Captures Flow

Once saved, a capture:
1. Appears in "Recent Captures" on The Lab hub
2. Is linked to tagged player profiles (visible on their player page under "Your Notes")
3. Is searchable from the full notes page
4. If sentiment is tagged (bullish/bearish), it can influence AI insights: "You've logged 3 bearish notes on Saquon but still have him ranked RB4. Worth reconsidering?"

**Database:**
```sql
clutch_lab_captures
- id
- user_id
- content (text)
- source_type (enum: podcast, article, stats, conversation, gut_feel, other)
- source_name (text, nullable — e.g., "Fantasy Footballers Ep. 412")
- sentiment (enum: bullish, bearish, neutral, nullable)
- created_at

clutch_lab_capture_players
- id
- capture_id (FK → clutch_lab_captures)
- clutch_player_id (FK → clutch_players)
- auto_detected (boolean — true if AI suggested, false if user manually added)
- confirmed (boolean — true if user confirmed the auto-detection)
```

---

## THE CHEAT SHEET (Lab Output)

The cheat sheet is the final distillation of all Lab work. It's the "boiled down to the most basic best version for a draft" that Eric described.

### Generation Flow

1. User clicks "Generate Cheat Sheet" from their board card (or from readiness tracker)
2. System auto-generates a first draft based on:
   - The user's board rankings (primary sort order)
   - Tier breaks (auto-detected from ranking gaps, or user-defined)
   - ADP divergence indicators (where you differ from consensus)
   - Key notes pulled from captures (the most relevant note per player, AI-selected)
   - Position scarcity markers
3. User reviews and can:
   - Override tier breaks
   - Add/remove notes from the sheet
   - Adjust the overall order with final drag-and-drop
   - Toggle which columns appear (ADP, notes, bye week, etc.)
4. Export options:
   - **Printable PDF** (clean, single-page or multi-page, optimized for draft day)
   - **Mobile view** (responsive web page, accessible on phone during draft)
   - **Shareable link** (optional — share your board with league mates or publicly)
   - **Publish to Prove It** (locks rankings for accuracy tracking)

### Cheat Sheet Layout

```
YOUR 2026 CHEAT SHEET — 12-Team PPR Redraft
Generated from: 2026 NFL Big Board (VBD)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OVERALL RANKINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Rank │ Player           │ Pos │ ADP  │ Gap   │ Your Note
─────┼──────────────────┼─────┼──────┼───────┼──────────────────
  1  │ Bijan Robinson   │ RB  │ 1    │  —    │
  2  │ Ja'Marr Chase    │ WR  │ 2    │  —    │
  3  │ Breece Hall      │ RB  │ 5    │ 🟢+2  │ "League winner"
  4  │ Saquon Barkley   │ RB  │ 3    │ 🔴-1  │
─── TIER BREAK ──────────────────────────────────────────────
  5  │ CeeDee Lamb      │ WR  │ 4    │ 🔴-1  │
  6  │ Amon-Ra St Brown │ WR  │ 8    │ 🟢+2  │ "Target monster"
  7  │ Garrett Wilson   │ WR  │ 11   │ 🟢+4  │ "Breakout Yr 4"
─── TIER BREAK ──────────────────────────────────────────────
...

VALUE TARGETS (Your biggest divergences from ADP)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 Garrett Wilson — You: WR5, ADP: WR9 (+4 spots)
🟢 Ladd McConkey — You: WR11, ADP: WR20 (+9 spots)
🟢 Trey McBride — You: TE2, ADP: TE5 (+3 spots)
🔴 Josh Jacobs — You: RB12, ADP: RB7 (-5 spots) — FADE

POSITION TIERS (Quick Reference)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RBs: T1 [Robinson, Hall, Barkley] T2 [Gibbs, Henry, Achane] ...
WRs: T1 [Chase, Lamb, St Brown] T2 [Wilson, Jefferson, Waddle] ...
TEs: T1 [Kelce, McBride] T2 [Kittle, Andrews] ...
QBs: T1 [Mahomes, Lamar] T2 [Daniels, Stroud, Allen] ...
```

---

## BOARD TIMELINE (Prep History)

Every ranking change on a board is tracked with a timestamp. This creates a timeline of how your draft thesis evolved.

### Timeline View (inside a board)

```
BOARD EVOLUTION — 2026 NFL Big Board
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Feb 10  Board created from consensus ADP
        200 players loaded

Feb 14  Moved Breece Hall RB5 → RB3
        📝 "Hall's receiving upside is elite in PPR"

Mar 2   Moved Derrick Henry RB6 → RB9
        📝 "Age concerns after OTA reports"

Mar 15  Added 12 notes from combine observations

Apr 28  Post-NFL-Draft update: moved 8 rookies
        Bowers TE3 → TE2 after round 1 landing spot

Jul 1   Major reshuffle: 15 players moved
        📝 "Training camp reports changing my RB tiers"

Aug 10  Final board locked. Cheat sheet generated.
        Published to Prove It.
```

**Database:** Already spec'd in previous docs:
```sql
clutch_draft_board_history
- id
- board_id
- clutch_player_id
- old_rank
- new_rank
- note (text, nullable — reason for change)
- changed_at
```

### Year-Over-Year View (future feature)

After multiple seasons, show how your approach evolved:
- "In 2026 you were heavy on Zero-RB. In 2027 you shifted to Hero-RB. Your 2027 results were 15% better."
- This feeds into the AI coaching layer in premium.

---

## SEASONAL BEHAVIOR

The Lab isn't static — it adapts to where you are in the sports calendar.

### February-March (Offseason Research)
- Emphasis: Watch list, dynasty boards, early notes from combine/free agency
- AI insight: "Free agency starts March 12. 6 players on your watch list are free agents."
- New content type: Prospect scouting notes (NFL Draft rookies)

### April-May (Post-NFL-Draft)
- Emphasis: Rookie integration into boards, landing spot analysis
- AI insight: "The NFL Draft just happened. 4 rookies landed in spots that affect your board."
- Auto-suggestion: "Add [Rookie] to your board? Consensus has him at WR18."

### June-August (Draft Prep Peak)
- Emphasis: Board finalization, cheat sheet generation, mock drafts
- AI insight: "Your draft is in 2 weeks. Your cheat sheet is ready — review it now."
- Readiness tracker becomes prominent
- "Draft Day Mode" teaser: companion tool for live draft (future feature)

### September-January (In-Season)
- The Lab de-emphasizes draft prep, shifts to:
  - Tracking accuracy of your pre-season board vs. actual results
  - In-season notebook: waiver wire notes, trade ideas, matchup analysis
  - Weekly quick captures still work (now for in-season decisions)
- AI insight: "Henry is on pace for RB3. You had him at RB9. Your biggest miss so far."

### Post-Season (January-February)
- Season review: "Your Lab work in 2026 — here's how your thesis played out."
- Carry-forward prompt: "Copy your 2026 board as a starting point for 2027?"

---

## FIRST-TIME USER EXPERIENCE

When a new user visits The Lab for the first time with no boards and no notes:

```
┌─────────────────────────────────────────────────────────────┐
│  THE LAB                                                     │
│  Where your draft thesis takes shape.                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  🧠 Welcome to The Lab.                                │  │
│  │                                                        │  │
│  │  This is where your draft-day edge gets built — one    │  │
│  │  take, one ranking, one conviction at a time. Start    │  │
│  │  by creating your first board. We'll load it with      │  │
│  │  consensus rankings so you can jump right into         │  │
│  │  making it yours.                                      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │                                                     │     │
│  │     Create Your First Board                         │     │
│  │                                                     │     │
│  │     Start from consensus rankings and make           │     │
│  │     your adjustments. Every move you make is         │     │
│  │     a conviction that gets tracked.                  │     │
│  │                                                     │     │
│  │              [ Create Board → ]                      │     │
│  │                                                     │     │
│  │     ── or ──                                        │     │
│  │                                                     │     │
│  │     📝 Just want to jot a note?                     │     │
│  │     [ Quick Capture → ]                              │     │
│  │                                                     │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key principle:** Never show an empty state. Either guide the user to their first action or give them something to react to (consensus rankings).

---

## LEAGUE-SPECIFIC BOARDS

Each board is tied to a specific league context. This matters because a player's value changes based on league settings.

### Board Settings
- **League type:** Redraft / Dynasty / Keeper
- **Team count:** 8, 10, 12, 14, 16
- **Scoring format:** PPR / Half-PPR / Standard / Custom
- **Draft type:** Snake / Auction / Linear
- **Roster spots:** QB, RB, WR, TE, FLEX, K, DEF, Bench (configurable)

### How League Context Affects the Board
- **ADP comparison:** Uses the correct ADP for that format (PPR ADP vs Standard ADP vs Dynasty ADP)
- **Fantasy point projections:** Calculated using the league's scoring system
- **Cheat sheet output:** Formatted for the draft type (overall rankings for snake, dollar values for auction)
- **Tier breaks:** May differ by format (a player's tier in PPR may differ from Standard)

### Cross-Board Intelligence
- When you rank a player on one board, the AI can suggest: "You have Hall as RB3 on your PPR board but RB5 on your Half-PPR board. That's consistent with his receiving profile."
- Notes and captures are shared across boards (a podcast take about Hall applies to all boards)
- Watch list is universal (not per-board)

---

## TECHNICAL IMPLEMENTATION NOTES

### New Database Tables

```sql
-- Quick captures (the core new table)
clutch_lab_captures
- id (uuid, PK)
- user_id (FK → users)
- content (text, max 2000 chars)
- source_type (enum: podcast, article, stats, conversation, gut_feel, other)
- source_name (varchar 255, nullable)
- sentiment (enum: bullish, bearish, neutral, nullable)
- created_at (timestamp)
- updated_at (timestamp)

clutch_lab_capture_players
- id (uuid, PK)
- capture_id (FK → clutch_lab_captures, ON DELETE CASCADE)
- clutch_player_id (FK → clutch_players)
- auto_detected (boolean, default false)
- confirmed (boolean, default true)

-- AI insight cache
clutch_lab_insights_cache
- user_id (PK, FK → users)
- insight_text (text)
- insight_type (enum: nudge, alert, seasonal, onboarding)
- generated_at (timestamp)
- dismissed_at (timestamp, nullable)

-- Decision journal (separate from quick captures)
clutch_lab_journal_entries
- id (uuid, PK)
- user_id (FK → users)
- content (text)
- board_snapshot_id (FK → nullable, for before/after tracking)
- created_at (timestamp)

clutch_lab_journal_entry_players
- id (uuid, PK)
- entry_id (FK → clutch_lab_journal_entries, ON DELETE CASCADE)
- clutch_player_id (FK → clutch_players)

-- Watch list (may already exist, adding alert tracking)
clutch_watch_list
- id (uuid, PK)
- user_id (FK → users)
- clutch_player_id (FK → clutch_players)
- sport (enum: nfl, golf)
- notes (text, nullable)
- alert_preferences (jsonb)
- created_at (timestamp)

clutch_watch_list_alerts
- id (uuid, PK)
- watch_list_id (FK → clutch_watch_list)
- alert_type (enum: adp_movement, news, injury, consensus_change, custom)
- alert_content (text)
- triggered_at (timestamp)
- read_at (timestamp, nullable)
```

### Existing Tables to Modify

```sql
-- clutch_draft_boards: add league context fields
ALTER TABLE clutch_draft_boards ADD COLUMN league_type enum('redraft','dynasty','keeper');
ALTER TABLE clutch_draft_boards ADD COLUMN team_count integer;
ALTER TABLE clutch_draft_boards ADD COLUMN draft_type enum('snake','auction','linear');
ALTER TABLE clutch_draft_boards ADD COLUMN roster_config jsonb;

-- clutch_draft_board_history: add optional note field
ALTER TABLE clutch_draft_board_history ADD COLUMN note text;
```

### API Endpoints Needed

```
POST   /api/lab/captures              — Create a quick capture
GET    /api/lab/captures              — List captures (with filters)
GET    /api/lab/captures/recent       — Get last N captures for hub display
DELETE /api/lab/captures/:id          — Delete a capture

POST   /api/lab/journal               — Create journal entry
GET    /api/lab/journal               — List journal entries
GET    /api/lab/journal/recent        — Latest entry for hub display

GET    /api/lab/insight               — Get current AI insight for user
POST   /api/lab/insight/dismiss       — Dismiss current insight

GET    /api/lab/readiness/:boardId    — Get readiness state for a board

POST   /api/lab/cheatsheet/generate   — Generate cheat sheet from board
GET    /api/lab/cheatsheet/:id        — Get generated cheat sheet
PUT    /api/lab/cheatsheet/:id        — Edit/override cheat sheet
GET    /api/lab/cheatsheet/:id/pdf    — Export as PDF
POST   /api/lab/cheatsheet/:id/publish — Publish to Prove It

GET    /api/lab/timeline/:boardId     — Get board evolution timeline

GET    /api/watch-list                — Get watch list with alerts
POST   /api/watch-list                — Add player to watch list
DELETE /api/watch-list/:id            — Remove from watch list
GET    /api/watch-list/alerts         — Get recent alerts
```

### Player Name Detection (Auto-Tagging)

**Client-side first pass:**
- Maintain a local JSON map of player names + common nicknames
- Fuzzy match against note text as user types
- Show suggested tags below the text field in real-time

**Server-side fallback:**
- For ambiguous names ("Smith", "Brown"), use context clues (position, team mention)
- Lightweight LLM call only if client-side match confidence is low
- Cache results — same note text always produces same tags

---

## BUILD PRIORITY ORDER

Feed this to Claude Code in this order:

### Phase 1: Core Hub Redesign
1. Rename Workspace → Lab in nav and all references
2. New hub page layout with sections (boards, captures, watch list, journal)
3. Enhanced board cards with league context and richer metadata
4. Board creation flow with league settings and ADP pre-load option

### Phase 2: Quick Capture System
5. Capture form component (reusable)
6. Floating action button (site-wide)
7. Inline capture on Lab hub
8. Player auto-detection (client-side fuzzy matching)
9. Recent captures feed on hub page
10. Full captures page with search/filter

### Phase 3: Readiness & Intelligence
11. Draft readiness tracker logic and display
12. AI insight generation (rule-based first, LLM-enhanced later)
13. Seasonal behavior switching (calendar-aware hub state)

### Phase 4: Cheat Sheet Generation
14. Auto-generate cheat sheet from board data
15. Cheat sheet review/edit interface
16. PDF export
17. Mobile-optimized view
18. Publish to Prove It integration

### Phase 5: Timeline & History
19. Board evolution timeline view
20. Decision journal full page
21. Year-over-year comparison (future)

---

## WHAT THIS CHANGES IN THE NAV

Current nav: `Dashboard | Draft | Workspace | Prove It | Feed | Research | Live`

New nav: `Dashboard | Draft | Lab | Prove It | Feed | Research | Live`

The Lab replaces Workspace everywhere. Same URL can redirect: `/workspace` → `/lab`

---

## SUCCESS METRICS

How to know The Lab is working:

- **Capture frequency:** Users logging 5+ notes per month during offseason
- **Board engagement:** Boards being edited 3+ times per month (not created and abandoned)
- **Cheat sheet generation:** 80%+ of boards with 100+ players generate a cheat sheet
- **Return visits:** Users visiting The Lab 2+ times per week during draft prep season
- **Note-to-board connection:** 60%+ of captures have confirmed player tags
- **Seasonal retention:** Users active in The Lab during Feb-May (the dead zone for other platforms)

---

*This document should be read alongside:*
- *CLUTCH_USER_PERSONAS.md (the six persona definitions)*
- *clutch-nfl-expansion.md (NFL data layer and build phases)*
- *clutch-fantasy-brain-ux.md (AI coaching and dashboard modes)*
- *clutch-testing-strategy.md (QA and launch plan)*
