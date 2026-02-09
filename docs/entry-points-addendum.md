# CLUTCH — Entry Points for Every Type of Fan
## Addendum to Fantasy Brain UX Architecture

---

## THE PROBLEM WITH PROJECTIONS-ONLY

The stat projection system is powerful but it's designed for die-hards.
The average fantasy fan — the person who listens to Fantasy Footballers,
reads FantasyPros, downloads an ESPN cheat sheet, does some mock drafts —
is NOT going to sit down and project 220 players' individual stats.

They have OPINIONS. They don't have PROJECTIONS.

"I like Bijan Robinson this year." ← That's an opinion.
"I think Bijan Robinson rushes for 1,385 yards." ← That's a projection.

Both are valuable. Both are scoreable. But only one of them requires
almost zero effort to express.

**The system needs to capture opinions at every fidelity level —
from a simple ranking to a full stat projection — and make all of
them scoreable, trackable, and useful.**

---

## THE THREE ENTRY TIERS (Revised)

### Tier 3: Weekly Picks Only (The Casual)
**Commitment:** 5 minutes per week during the season
**What they do:** Pick Overs/Unders on player props and game lines each week
**No preseason work required.** Just show up on Wednesdays, make picks, see results.
**Earns:** Pick record, win rate, streaks, basic Clutch Rating

This person might never touch projections or rankings. That's fine.
They're still building a tracked record, still on leaderboards, still
earning badges. And after a season of picks, the AI can still surface
patterns: "You're 14-4 on QB passing Overs but 3-9 on RB rushing props.
You know passing offense better than rushing — lean into that."

### Tier 2: Player Rankings (The Engaged Fan) ⭐ THE KEY UNLOCK
**Commitment:** 30-60 minutes preseason (can be done across sessions)
**What they do:** Rank players by position using drag-and-drop
**No stat projections needed.** Just "who's better than who" in your opinion.

This is the entry point for 80% of fantasy managers. Here's how it works:

#### The Ranking Interface

```
┌─────────────────────────────────────────────────────────────┐
│  BUILD YOUR 2026 BOARD                                      │
│  Drag players to rank them. That's it.                      │
│                                                             │
│  [QBs] [RBs ←active] [WRs] [TEs] [FLEX] [Overall]         │
│                                                             │
│  YOUR RUNNING BACK RANKINGS                                 │
│  ─────────────────────────────────────────────────────────  │
│  Drag to reorder. Your rankings become your cheat sheet.    │
│                                                             │
│  ── TIER 1 ──────────────────────────────────────           │
│  1. ≡ Bijan Robinson  ATL    (ADP: RB1)      —             │
│  2. ≡ Breece Hall     NYJ    (ADP: RB3)      🟢 +1         │
│  3. ≡ Jahmyr Gibbs    DET    (ADP: RB2)      🔴 -1         │
│                                                             │
│  ── TIER 2 ──────────────────────────────────────           │
│  4. ≡ Saquon Barkley  PHI    (ADP: RB4)      —             │
│  5. ≡ Josh Jacobs     GB     (ADP: RB7)      🟢 +2         │
│  6. ≡ Kyren Williams  LAR    (ADP: RB5)      🔴 -1         │
│  7. ≡ De'Von Achane   MIA    (ADP: RB6)      🔴 -1         │
│                                                             │
│  ── TIER 3 ──────────────────────────────────────           │
│  8. ≡ Derrick Henry   BAL    (ADP: RB9)      🟢 +1         │
│  9. ≡ Jonathan Taylor  IND   (ADP: RB8)      🔴 -1         │
│  ...                                                        │
│                                                             │
│  ┌────────────────────────────────────────────────┐         │
│  │ 📝 Optional: Why are you higher on Jacobs?     │         │
│  │ [Add a note to any player]                     │         │
│  └────────────────────────────────────────────────┘         │

#### Capturing Reasoning Without Killing Compliance

**The core tension:** Knowing WHY you ranked someone higher is 10x more
valuable than just knowing you did. But if capturing "why" feels like
homework, people won't rank at all. The insight dies with the friction.

**The solution: Quick-tap reason chips + optional text.**

When a manager moves a player UP or DOWN from their starting position,
a small row of tappable chips appears inline — not a modal, not a
separate page, just a subtle row below the player they just moved:

```
You moved Josh Jacobs UP 2 spots. Why? (optional, tap any that apply)

[Schedule ↑] [New OC/scheme] [Volume increase] [Less competition]
[Contract year] [Age concern ↓] [Injury risk ↓] [O-line change]
[Target share ↑] [Gut feel] [Podcast/article] [Game film]
[Revenge game narrative] [Team will be winning = more carries]

📝 Add a note...  (expandable text field, hidden by default)
```

**Key UX rules:**
- Chips appear ONLY when a player is moved from their starting position
  (no chips shown for players left at default ADP position)
- Tapping a chip is ONE TAP — no confirmation, no modal, no disruption
- Multiple chips can be selected (tap to toggle on/off)
- The chip row auto-dismisses after 5 seconds if ignored — ZERO penalty
  for skipping. The ranking is saved regardless.
- Text field is collapsed by default — tap to expand, never forced open
- On mobile: chips wrap naturally, easy thumb targets
- NEVER block the ranking flow. Chips are additive, not gates.

**Why chips > text boxes:**

1. **2 seconds vs 30 seconds.** Tapping "New OC" takes 2 seconds.
   Writing "I think the new offensive coordinator will increase his
   rushing attempts by 15%" takes 30 seconds. Both capture the same
   core insight. The chip gets 50x more compliance.

2. **Structured data.** Free-text is useful for the individual but
   hard to analyze at scale. Chips are structured — Clutch can aggregate:
   - "You cited 'age concern' on 6 players. 4 of the 6 declined.
     Your age instinct is reliable — trust it more."
   - "Every time you cited 'new OC' as a reason to upgrade a player,
     you were right 71% of the time."
   - Platform-wide: "Managers who cited 'schedule upgrade' as their
     primary reason were correct 58% of the time overall."

3. **Reason categories enable pattern detection.** Over 3 years:
   - "Your 'gut feel' picks are 64% accurate — better than your
     'podcast tip' picks at 51%. Your instincts outperform your sources."
   - "When you downgrade someone for 'injury risk,' you're right 72%
     of the time. But when you downgrade for 'age concern,' you're
     only right 45%. You might be applying age discounts too aggressively."

4. **Retroactive context at zero cost.** In December: "You ranked
   Jacobs RB5 and cited 'schedule upgrade' and 'less competition.'
   His actual SOS ranked 6th and the backup's snap share fell to 12%.
   Your reasoning was correct on both counts."
   The manager gets a full decision journal without ever writing a
   sentence. The chips WERE the journal.

**Chip categories (organized by signal type):**

POSITIVE signals (why you're upgrading a player):
- Schedule upgrade
- New OC / scheme fit
- Volume increase expected
- Less backfield / target competition
- Contract year motivation
- O-line improvement
- Target share increase
- Team will be winning (game script)
- Revenge game / prove-it narrative
- Sophomore leap / breakout

NEGATIVE signals (why you're downgrading):
- Age decline
- Injury risk / history
- New OC / scheme downgrade
- More competition (new draft pick, FA signing)
- Schedule downgrade
- O-line decline
- Team will be trailing (negative game script)
- Regression candidate (unsustainable efficiency)
- Coaching change
- Holdout / contract dispute

SOURCE signals (where the opinion came from):
- Gut feel / eye test
- Podcast or show
- Article or analysis
- Game film
- Statistical model or tool
- Friend or league mate

**The source signals are sneakily powerful.** Over time, Clutch can
tell you: "Your 'gut feel' rankings are 64% accurate. Your 'podcast
tip' rankings are 51% accurate. Your 'game film' rankings are 78%
accurate. Watch more film, listen to fewer podcasts."

That's self-scouting on your INFORMATION SOURCES, not just your opinions.

**For the text note:** When expanded, keep it short. Placeholder text:
"Quick thought — you'll thank yourself later (e.g., 'OL lost 2 starters,
expect fewer rushing lanes')"

Cap at 280 characters (tweet-length). Long enough to capture a thought,
short enough to not feel like an assignment.
│                                                             │
│  ┌────────────────────────────────────────────────┐         │
│  │ 💡 You have Hall over Gibbs and Jacobs over    │         │
│  │ Williams. The consensus disagrees on both.      │         │
│  │ These are your value targets on draft day.      │         │
│  └────────────────────────────────────────────────┘         │
│                                                             │
│  CHEAT SHEET PREVIEW:                                       │
│  Your top 12 overall: Robinson, Chase, Hall, Gibbs...       │
│  → View full cheat sheet                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Why Rankings Are Powerful

**They're fast.** Pre-loaded from ADP/consensus order. The manager just
adjusts. Move a few guys up, move a few guys down. 15-20 minutes per
position, done. Not filling in blank stat fields for 220 players.

**They're intuitive.** Every fantasy manager already thinks in rankings.
"I like Hall more than Gibbs this year." They don't think in "Hall will
have 1,247 rushing yards and 52 receptions." Rankings match how fans
ACTUALLY think.

**They're still scoreable.** At the end of the season:
- Your RB rankings vs actual RB finishes (by fantasy points)
- Scored by rank correlation (Spearman or similar)
- "You ranked 36 RBs. Your correlation with actual finishes: 0.74
  (82nd percentile). You nailed the top 5 but missed on the back half."
- Each player scored: "You ranked Henry RB8, he finished RB3 → off by 5"

**They still generate a cheat sheet.** Instead of stat-based point
projections, the cheat sheet uses the manager's RANKINGS as the order,
with ADP comparison and tier breaks. It's less data-rich than the
projection-based cheat sheet, but it's still PERSONALIZED — which is
the whole point.

**They capture divergence from consensus.** Every place where the
manager's ranking differs from ADP is a tracked opinion. "You had
Jacobs 2 spots higher than ADP." After the season: "Your ADP upgrades
hit at 40% — that's above average."

**They still allow reasoning notes.** Even without stat projections,
the manager can note WHY they're higher on someone. "New OC" or
"contract year" or "I just have a feeling." That note gets timestamped
and scored later — same decision journal, lighter commitment.

#### How Rankings Connect to the Ecosystem

Rankings feed EVERYTHING the stat projections feed, just at lower fidelity:

| Feature              | Stat Projections (Tier 1) | Rankings (Tier 2)        |
|----------------------|---------------------------|--------------------------|
| Cheat sheet          | Points-based, stat detail | Rank-based, ADP divergence|
| Auction values       | Dollar values from stats  | Relative tiers from ranks |
| Self-scouting        | "You overproject aging RBs"| "You overrank aging RBs" |
| Leaderboard          | MAE accuracy scoring      | Rank correlation scoring  |
| Draft companion      | "Waddle is $8 under value"| "Waddle is 6 spots below your rank"|
| Decision journal     | Full stat + reasoning     | Rank position + reasoning |
| Consensus comparison | Stat vs consensus stat    | Rank vs ADP              |
| Post-draft grade     | Against your projections  | Against your rankings    |
| Badges              | "Most Accurate WR Projector"| "Best WR Ranker"       |

**The manager gets 80% of the ecosystem value with 20% of the effort.**

### Tier 1: Full Stat Projections (The Die Hard)
**Commitment:** 3-5 hours preseason (spread across sessions)
**What they do:** Project individual stats for 200+ players
**Earns:** Maximum Clutch Rating weight, deepest AI coaching, full
stat-level self-scouting

This is the system already designed. It remains the prestige tier.
The "Full Slate Projector" badge signals that this person went ALL IN.

---

## THE PIGGYBACK STRATEGY — FOLLOWING EXPERTS

This is the other key insight. The user you're describing doesn't just
have their own opinions — they're INFLUENCED by experts. They listen to
Fantasy Footballers and adopt those rankings. They read FantasyPros
consensus and adjust a few spots. They use someone else's framework
as their starting point.

**Clutch should make this explicit and trackable.**

### "Start From" Templates

When a manager goes to build their rankings, they choose a starting point:

```
BUILD YOUR 2026 BOARD
Choose a starting point (you'll customize from here):

○ Start from ADP (consensus draft position)
○ Start from Clutch Consensus (average of all Clutch managers)
○ Start from [Expert Name]'s Rankings (if expert is on Clutch)
○ Start from My 2025 Rankings (carry over last year's board)
○ Start from Scratch (blank board, you build it)
```

**Why this matters:**

1. **Lower friction.** Starting from ADP means 80% of the work is done.
   The manager just adjusts the 10-20 players they disagree on. That's
   a 15-minute activity instead of ranking 200+ players from scratch.

2. **Tracks influence.** If a manager starts from FantasyPros ADP and
   only changes 12 players, Clutch knows: "You agreed with consensus on
   88% of players. Your 12 divergences were your actual opinions."
   THOSE 12 divergences are the most interesting data points — they
   represent the manager's genuine independent thought.

3. **Creates expert accountability.** If Fantasy Footballers has rankings
   on Clutch and 5,000 managers start from their template, Clutch can
   track: "Managers who followed Fantasy Footballers' RB rankings had
   68th percentile accuracy. Managers who followed [Other Expert] had
   74th percentile." This is a MASSIVE content engine — "Which expert
   should you actually listen to?" answered with data.

4. **Scores the delta.** The interesting question isn't "were your
   rankings accurate?" — if you just copied ADP, of course they were
   okay. The interesting question is: "Were your CHANGES accurate?"
   "You made 12 changes from ADP. 7 of them improved accuracy and
   5 made it worse. Net: your adjustments added value. You're better
   than just following the crowd."

### Following vs Leading Score

```
YOUR 2026 RANKING ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Starting template: ADP Consensus
Players you adjusted: 18 of 200 (9%)

YOUR ADJUSTMENTS SCORED:
✅ Moved Jacobs UP 2 spots → he finished 3 spots higher than ADP (you were right)
✅ Moved Henry DOWN 4 spots → he finished 5 spots lower than ADP (you were right)
✅ Moved Reed UP 8 spots → he finished 6 spots higher than ADP (you were right)
❌ Moved Achane UP 3 spots → he finished 2 spots lower than ADP (miss)
❌ Moved Stroud DOWN 3 spots → he finished 2 spots higher than ADP (miss)
...

YOUR ADJUSTMENTS: 11 improved accuracy, 7 made it worse
NET IMPACT: Your adjustments improved your overall ranking accuracy by +4%
vs just using ADP unchanged

VERDICT: "You add value when you override consensus. Trust your instincts —
especially on RBs, where your adjustments were right 71% of the time."
```

**This is incredible data.** It tells the casual fan: "When you disagree
with the experts, you're usually right about RBs but wrong about QBs.
Next year, trust your gut on running backs but stick with consensus on
quarterbacks."

---

## THE DRAFT IMPORT — PASSIVE DATA CAPTURE

For the user who doesn't even want to rank players preseason, there's
STILL a way to capture their opinions: **import their actual draft.**

After their fantasy draft (on ESPN, Yahoo, Sleeper, wherever), they can
import their draft results into Clutch. This captures:

- Which players they drafted (reveals who they valued)
- What round/price they paid (reveals how much they valued them)
- Who they passed on (reveals who they faded)
- Their roster construction strategy (zero-RB, hero-RB, etc.)

**This is passive data capture.** The manager didn't fill out a single
form. They just imported a draft they already did. But Clutch now has
enough data to:

- Score their draft against season outcomes
- Identify their drafting biases over multiple years
- Compare their draft strategy to other managers
- Surface patterns: "You've drafted a top-12 TE in Round 4 three
  years running. That strategy has worked 2 of 3 times."

### The Full Data Capture Stack (From Least to Most Effort)

```
EFFORT LEVEL          WHAT THEY DO                    WHAT CLUTCH CAPTURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Weekly picks only   Pick O/U each week              Pick record, prop tendencies
2. Draft import        Import their draft results      Draft strategy, player values
3. Rankings from ADP   Adjust a template ranking       Consensus divergences, opinions
4. Custom rankings     Rank from scratch               Full opinion set, tier breaks
5. Stat projections    Project individual stats        Deepest data, full analysis
```

**Every level feeds the ecosystem.** Every level earns a Clutch Rating.
Every level generates insights — just at different depths.

The key insight: **you don't need the user to do MORE work.
You need to capture the work they're ALREADY doing.**

They're already drafting → import it.
They're already forming opinions → capture them as rankings.
They're already listening to podcasts → let them start from expert templates.
They're already making weekly picks mentally → formalize it with a tap.

---

## HOW AI COACHING WORKS AT EACH LEVEL

### Level 1: Weekly Picks Only
"You're 14-4 on QB passing props but 3-9 on rushing props.
You understand passing offense better — lean into that edge."

### Level 2: Draft Import Only
"Three years of drafts show you always reach for a TE in rounds 3-4.
That strategy has outperformed in 2 of 3 years. Your RB picks after
round 6 underperform by 22% — consider spending that capital elsewhere."

### Level 3: Rankings (ADP-Adjusted)
"You made 18 adjustments from ADP. Your RB adjustments were right 71%
of the time, but your QB adjustments were only right 33%. Trust your
instincts on RBs, stick with consensus on QBs."

### Level 4: Custom Rankings
"Your full board had a .74 rank correlation with actual results (82nd
percentile). You nailed WRs (.81) but struggled with TEs (.52).
Your tier breaks were predictive — 78% of players stayed within the
tier you assigned them."

### Level 5: Full Stat Projections
"You overestimate aging RBs by 12%. Your WR yardage projections are
93rd percentile accurate. Your auction budget allocation matches your
projection strengths — you spend the most where you're smartest."

**Every level gets coaching. The depth scales with the data available.**

---

## THE UPGRADE PATH (PULL, NOT PUSH)

The product should NEVER pressure someone to do more than they want.
But it should make the next level feel natural and valuable.

**Level 1 → Level 2:**
After their draft: "Want to see how your draft stacks up? Import your
results and we'll grade it." (They were going to draft anyway.)

**Level 2 → Level 3:**
After importing a draft: "You drafted Jacobs in round 3 — that means
you're higher on him than ADP. Want to capture all your opinions?
Start from ADP and adjust — takes 15 minutes."

**Level 3 → Level 4:**
After a season of ranking accuracy: "Your RB adjustments beat consensus.
Next year, try building your full RB board from scratch instead of
starting from ADP — your instincts are good enough."

**Level 4 → Level 5:**
After two years of rankings: "You ranked Henry RB8 and he finished RB3.
Want to dig deeper? Try projecting his actual stats next year — it'll
show you if you're wrong about his usage or his efficiency."

**Each level upgrade is motivated by curiosity about their own data,
not by the platform nagging them.**

---

## EXPERT FOLLOWING — THE CONTENT ENGINE

### What Happens When Influencers Are on Clutch

When Fantasy Footballers (or any expert) publishes rankings on Clutch,
it creates a cascade:

1. **Thousands of managers "Start From" their rankings**
2. **Each manager adjusts a few spots — capturing their own opinions**
3. **At season's end, Clutch can score:**
   - The expert's accuracy: "Fantasy Footballers RB rankings: 71st pctl"
   - Each follower's adjustments: "Your changes improved accuracy by 4%"
   - Aggregate: "Managers who followed Expert A outperformed those who
     followed Expert B by 6% at WR"

4. **This generates massive content:**
   - "Which Fantasy Podcast Has the Most Accurate Rankings?" (annual article)
   - "Expert Accuracy Leaderboard" (verified, not self-reported)
   - "Your Adjustments vs [Expert] — Who Was Right?" (personal report)

5. **Experts WANT to be on this platform** because:
   - High accuracy = verified credibility = more followers
   - They can see which of their calls hit and which missed
   - Their audience engages with their rankings directly on Clutch
   - "Follow me on Clutch" becomes a real CTA on their podcast

6. **The flywheel accelerates:**
   - More experts → more followers using their templates
   - More followers → more data → better scoring
   - Better scoring → more content → more attention
   - More attention → more experts want in

---

## REVISED PARTICIPATION TIERS (Updated from NFL Expansion Doc)

The NFL expansion doc had tiers based on number of projections:
- Tier 3: My Team
- Tier 2: Position Expert
- Tier 1: Full Slate

**Updated tiers based on entry method AND scope:**

```
TIER     NAME              METHOD              SCOPE          TIME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5        The Picker        Weekly picks only    In-season      5 min/week
4        The Drafter       Draft import         Post-draft     10 min once
3        The Tweaker       Rankings from ADP    Preseason      30-60 min
2        The Ranker        Custom rankings      Preseason      1-2 hours
1        The Projector     Full stat projections Preseason     3-5 hours

Sub-tiers by scope:
- My Team only
- Position Expert (top 100-120 players)
- Full Slate (200+ players)
```

**Clutch Rating weight scales with tier AND scope:**
- A Tier 5 Picker who shows up every week still builds a meaningful
  Clutch Rating from pick record alone
- A Tier 3 Tweaker who adjusts ADP for all positions gets prediction
  accuracy credit (at reduced weight vs a Tier 1 Projector)
- A Tier 1 Full Slate Projector gets maximum credit across all dimensions

**No one is penalized for participating less. They just earn less
prediction credit, with the remaining weight shifting to other
Clutch Rating components (picks, consistency, etc.)**

---

*Created: February 8, 2026*
*Addendum to Fantasy Brain UX Architecture*
*Updates the participation tier system in the NFL Expansion doc*
