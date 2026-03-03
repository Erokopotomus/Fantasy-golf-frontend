# Clutch Platform — Vision Ideas

> **What this is:** Strategic product ideas generated during the March 2026 platform audit. Each idea is tagged with what triggered it (which page/feature audit), a rough effort estimate, and which user persona it serves most.
>
> **How to use:** Eric reviews, stars the ones worth pursuing, and they get spec'd out properly before entering the build queue. These are not bugs or fixes — those go in `QUEUE.md`.

---

## Categories

1. **Lab & Tools** — The Lab is underdeveloped. It should be the command center for fantasy decision-making.
2. **Connectivity & Cross-Linking** — Players, hubs, league pages, and the Lab should feel like one connected system, not separate pages.
3. **Predictions & Clutch Rating** — The "Prove It" system and rating engine are built but barely surfaced. This is Clutch's biggest differentiator.
4. **Social & Engagement** — What makes people open the app daily and talk about it with friends.
5. **Data & Intelligence** — Proprietary insights that no other platform has.
6. **Commissioner Experience** — Features that make commissioners choose Clutch over Yahoo/ESPN/Sleeper.
7. **Growth & Virality** — Features designed to bring new users in organically.
8. **Polish & Delight** — Small things that make the platform feel premium.

---

## Ideas

*(Added during audit — newest at top)*

---

### IDEA-001: Dashboard as a Living Feed, Not a League List
**Triggered by:** Dashboard audit — page is just a greeting + league cards + 1 activity item
**Category:** Social & Engagement
**Persona:** The Informed Fan, The Grinder
**Effort:** Medium-High

The Dashboard is the most important page in the app and right now it's essentially a static league directory. The iPod Reframe correctly stripped it down, but the rebuild hasn't materialized. This should be the **heartbeat** of your fantasy life.

**What "great" looks like:**
- **Personalized feed** combining: your matchup status, waiver deadlines, trade offers, league chat highlights, upcoming events (drafts, tournaments, NFL games), prediction deadlines, and coach nudges — all in a single chronological or priority-weighted stream
- **At-a-glance league health** — for each league card, show your current record, standing, and next matchup opponent with a score prediction. "You're 7-3, playing Spencer H this week (his team is ranked #2)"
- **"What to do right now" urgency bar** — ranked by deadline proximity: "Set lineup by Thursday 7pm" > "Waiver claims due tomorrow" > "Draft in 2 days" > "Make your prediction for Puerto Rico Open"
- **Cross-league rollup** — "Your best week across all leagues" or "You're in 1st place in 2 of 4 leagues"

This is how Sleeper keeps people opening the app — the feed. But Clutch can be smarter because you have AI coaching, prediction tracking, and multi-sport data.

---

### IDEA-002: Dashboard Coach Briefing Is Missing — Restore & Elevate
**Triggered by:** Dashboard audit — CoachBriefing component documented as complete but not visible
**Category:** Data & Intelligence
**Persona:** The Informed Fan
**Effort:** Low (component exists, may just need re-wiring)

The AI Coach reframe docs say a CoachBriefing component renders at top of Dashboard with personalized headline/body/CTA. It's not showing. This should be the first thing you see — a 2-3 sentence personalized brief: "Puerto Rico Open starts Thursday. Scottie Scheffler is favored but his approach game has been off — keep an eye on Collin Morikawa. Your draft for Testicles league is in 2 days — your board has 12 players tagged."

The coach should feel like a knowledgeable friend texting you what's important today.

---

### IDEA-003: League Cards Need Richer Context
**Triggered by:** Dashboard league cards showing contradictory status ("Active" + "Season hasn't started") and imported leagues showing "Waiting for 11 more members"
**Category:** Polish & Delight
**Persona:** All
**Effort:** Medium

League cards on the Dashboard should be the fastest way to understand the state of each league. Right now they're confusing: Bro Montana Bowl (a 17-year vault league) looks identical to a brand new league waiting for invites.

**Fixes and enhancements:**
- Imported/vault leagues should show differently — maybe "Vault League · 17 seasons" instead of "Pre-Draft · Waiting for 11 more members"
- Active leagues should show your record and standing, not "Season hasn't started"
- Show next matchup opponent and a mini score if in-season
- Show sport icon more prominently (the golf flag and football icons are tiny)
- Consider a "pinned" or "primary" league designation so your main league is always first

---

### IDEA-004: Landing Page Overhaul — Sell the Real Product
**Triggered by:** Landing page audit — page uses mock data and static mockups instead of real platform screenshots
**Category:** Growth & Virality
**Persona:** All (conversion-focused)
**Effort:** Medium

The landing page is well-designed visually but it's selling a concept, not the actual product. It shows mock leaderboards with fake names (ChaseTheTrophy, GridironGuru), mock league cards (Weekend Warriors, Masters Mania), and mock activity feeds. None of this is real data. A potential user doesn't see what the platform actually looks like.

**What "great" looks like:**
- **Show the real product**: Use actual screenshots or embedded live components from the platform — a real tournament leaderboard, a real draft board, the actual Golf Hub, a real Clutch Rating breakdown. This builds trust immediately.
- **Social proof section**: "17 years of BroMontana Bowl history, imported and preserved" or similar real-user testimonials / stats
- **Video walkthrough**: A 30-second auto-playing hero video showing: import → vault reveal → live scoring → predictions → rating. Better than 1000 words of feature cards.
- **Live data widget**: Show a real tournament leaderboard snippet or prediction slate right on the landing page — something that changes daily and gives a reason to come back
- **Commissioner-focused pitch**: Add a section specifically for commissioners: "Stop fighting Yahoo's bugs. Import your league, keep your history, use modern tools." This is the decision-maker persona.

---

### IDEA-005: Landing Page — Needs NFL Section Before August
**Triggered by:** Landing page audit — entire page is golf-focused, NFL is a badge on the hero card
**Category:** Growth & Virality
**Persona:** The Informed Fan
**Effort:** Medium

The landing page has a full "Fantasy Golf — Live Now" section with 6 feature cards and a mock dashboard, but NFL gets a single "NFL SPRING '26" badge and "NFL — Early Access" CTA button. By August 2026 when NFL draft season starts, this page needs a dedicated NFL section equal to golf, or NFL users will bounce immediately.

**What to build (before August 2026):**
- "Fantasy Football — Coming Fall 2026" section with NFL-specific feature cards (PPR/Standard scoring, FAAB waivers, trade analyzer, etc.)
- NFL-themed mock or real data (mock draft board, NFL player cards, weekly matchup preview)
- Early access email capture for NFL waitlist — builds the user base before launch
- Update the hero CTA to split equally: "Play Fantasy Golf" | "Join NFL Waitlist"

---

### IDEA-006: Landing Page — Flywheel Diagram Is the Best Pitch Element, Elevate It
**Triggered by:** Landing page audit — the "Research → Project → Draft → Compete → Learn" flywheel is buried near the bottom
**Category:** Growth & Virality
**Persona:** All
**Effort:** Low

The flywheel diagram (Research → Project → Draft → Compete → Learn, with CLUTCH RATING · SPORTS BRAIN · AI INSIGHTS at the center) is the single best visual on the entire landing page. It communicates the complete vision in one image. But it's buried in the 7th section of the page, below the fold. Most visitors never scroll that far.

**Suggestion:** Move this flywheel visual much higher — ideally as the 2nd or 3rd section. Pair it with the "One place for everything you know. One score to prove it." tagline, which is excellent copy.

---

### IDEA-007: The Lab Should Be the Command Center, Not Just a Board List
**Triggered by:** Lab audit — hub page is hero + 1 board card + empty notes + league list. That's it.
**Category:** Lab & Tools
**Persona:** The Grinder, The Informed Fan
**Effort:** High (but highest-impact feature gap on the platform)

Eric called this out specifically: "The Lab is super underdeveloped." He's right. The Lab has the bones of something powerful (draft boards, notes, watch list, decision journal, board insights) but the hub page makes it feel like a single-purpose tool when it should be the **command center** for all fantasy decision-making.

**Current state:** The Lab hub shows: a hero banner, one board card (truncated title), an empty notes section, and a league list. The watch list and journal are hidden sub-pages with no presence on the hub. Board Insights (tag distribution, SG profile) only appear inside the board editor. There's no at-a-glance intelligence.

**What "great" looks like — The Lab as Mission Control:**
- **Pre-Draft Mode:** When you have upcoming drafts, the Lab should feel like a war room. Show: days until draft, board completion % (how many players tagged/noted), AI coaching suggestions ("You haven't researched any WRs yet"), mock draft results, ADP comparisons.
- **In-Season Mode:** The Lab transforms. Show: this week's start/sit dilemma, waiver wire targets ranked by opportunity, trade value alerts ("Cam Young's value is up 15% this week"), AI coaching nudges.
- **Cross-Board Intelligence:** If you have multiple boards for different leagues, show a divergence matrix: "You have Scheffler #1 in one league but #3 in another — intentional?" This is unique Clutch value.
- **Research Feed:** Pull in relevant data automatically — upcoming tournament field analysis, injury reports, ownership % changes, ADP movement — surfaced contextually based on your boards and leagues.
- **Quick Actions Grid:** Prominent action buttons: "Prep for Testicles Draft (3 days away)", "Review waiver wire", "Check matchup projections", "Make this week's predictions"

---

### IDEA-008: Board Editor Player Names Truncation — Column Width Fix
**Triggered by:** Lab board editor audit — every player name truncated ("Jon Rah...", "Tommy...", "Patri...", "Harri...")
**Category:** Polish & Delight
**Persona:** All
**Effort:** Low

In the board editor, the PLAYER column is too narrow. Every name past ~6 characters gets truncated. Jon Rahm, Tommy Fleetwood, Patrick Cantlay, Harris English — all unreadable. The TGT/SLP/AVD tag pills take up space even when no tags are applied. When all 197 players are UNTAGGED, those 3 empty pill buttons per row waste ~120px per row.

**Fix options:**
- Only show tag pills on hover or when tags are actually applied (saves ~120px per row)
- Make the PLAYER column wider and let the SG sub-columns compress (they're already tight numbers)
- Add a tooltip on hover showing the full name
- Consider a compact/expanded view toggle

---

### IDEA-009: Lab Watch List Should Surface Alerts, Not Just Names
**Triggered by:** Lab watch list audit — empty state says "Star players from their profile pages"
**Category:** Lab & Tools
**Persona:** The Grinder, The Dynasty Nerd
**Effort:** Medium

The watch list is currently just a list of starred players. It should be a **monitoring tool** that tells you when something important changes about a player you're watching.

**What "great" looks like:**
- **Alert feed:** "Scottie Scheffler (starred) — CPI dropped from +2.1 to +1.6 this week"
- **Integration with predictions:** "You're watching Collin Morikawa — there's an open prediction for this week's tournament. Make your call?"
- **Integration with boards:** "3 of your watched players aren't on any draft board yet"
- **Ownership alerts:** "Viktor Hovland is on your watch list and was just dropped in your Testicles league"
- **Cross-platform price tracking:** Track ADP movement for watched players over time

---

### IDEA-010: Decision Journal Should Capture "Why", Not Just "What"
**Triggered by:** Lab journal audit — shows moves (Added, Removed, Moved) but no reasoning
**Category:** Lab & Tools, Data & Intelligence
**Persona:** The Informed Fan, The Content Creator
**Effort:** Medium

The Decision Journal currently auto-logs board activity: "Added Rory McIlroy at #197", "Moved Collin Morikawa ↑9 spots (#20 → #11)". This is the "what" — useful but not unique. What makes this transformative is capturing the **why**.

**What "great" looks like:**
- When you move a player, a small optional prompt appears: "Why did you move Morikawa up?" with quick-tap reasons (Form trending up / Course fit / Gut feeling / Podcast tip / Stats look good)
- These "why" annotations become the basis for the AI Self-Scouting Report: "You tend to move players up based on podcast tips, but those calls hit at only 45% — your stats-based calls hit at 68%"
- The journal becomes a searchable, filterable history of your decision-making — "Show me every time I moved someone based on course fit"
- This is the landing page promise: "Your Sports Journal" and "Self-Scouting Report" — the journal is the data source for both

---

### IDEA-011: Lab ↔ Player Pages ↔ League — Everything Should Cross-Link
**Triggered by:** Eric's explicit request — "we need to interweave more connectivity between players, hubs, league pages, and the lab"
**Category:** Connectivity & Cross-Linking
**Persona:** All
**Effort:** Medium-High

The platform has incredible depth across many pages (player profiles, Golf Hub, tournament pages, league home, board editor, vault) but they feel like separate islands. You can open a player drawer from the board, and the drawer has a "View Full Profile →" link, but the connections mostly stop there.

**Cross-link opportunities:**
- **Player page → Lab:** "Add to Board" / "Add to Watch List" buttons on every player profile and player drawer
- **Player page → Predictions:** "Make a call on this player" CTA on player profiles when there's an active prediction slate
- **Tournament page → Lab:** "Start a board for this tournament" or "Your board has 5 of the top 10 favorites"
- **League Home → Lab:** "Your draft is in 3 days — your board has 197 untagged players. Start prepping?" nudge
- **Lab → League:** Already has league links, but should show league-specific context: "In Testicles league, these board players are available on waivers"
- **Vault → Lab:** "You drafted WRs early in 12 of 17 seasons. Your board has zero WRs in the top 20 — breaking the pattern?"
- **Prove It → Lab:** "Your prediction accuracy for 'course fit' calls is 72% — here are players with high course fit this week"

The goal: no matter where you are in the platform, you're one click from the relevant context everywhere else. This is what makes Clutch feel like one integrated system instead of a collection of pages.

---

### IDEA-012: Golf Hub — Filter Gambling-Themed ESPN Articles
**Triggered by:** Golf Hub news feed — ESPN article "How to bet the Cognizant Classic: Best bets, DFS tips and more" surfaced prominently
**Category:** Polish & Delight
**Persona:** All
**Effort:** Low

Clutch's #1 brand rule is "no gambling aesthetic." But the ESPN news feed syncs articles with titles like "How to bet [tournament]: Best bets, DFS tips" — these are gambling/DFS articles that directly contradict Clutch's positioning. The article content is fine to have as reference, but the headlines on the Golf Hub feel wrong.

**Fix options:**
- **Filter by keyword:** Skip articles with "bet", "bets", "DFS", "parlay", "odds", "prop" in the title during ESPN sync
- **Re-categorize:** Move gambling articles to a "DFS & Betting" sub-category that's hidden by default but accessible via a filter toggle for users who want it
- **Softer approach:** Don't filter, but deprioritize gambling articles so they appear lower in the feed

---

### IDEA-013: Tournament Detail Page — Show Prediction Slate & League Context
**Triggered by:** Tournament detail audit — page shows course info, field, weather, but no predictions or league connection
**Category:** Connectivity & Cross-Linking, Predictions & Clutch Rating
**Persona:** The Informed Fan, The Sports Debater
**Effort:** Medium

The tournament detail page (e.g., Arnold Palmer Invitational) is excellent for data (course DNA, forecast, field analysis) but there's zero connection to the prediction system or your leagues.

**What to add:**
- **Prediction slate inline:** "Make your calls for this tournament" — winner, top 5, top 10, cut line predictions, all right on the tournament page
- **League context:** "You're in 2 leagues with this tournament. Your matchup: You vs Spencer H in BroMontana Bowl"
- **Board context:** "5 of your board's top 10 are in this field" with quick-access to adjust board
- **Past results connection:** "Last year at Bay Hill: Scheffler won (-18), your prediction was Rory (missed)"
- This turns the tournament page from a data reference into an **action hub** where you make decisions

---

### IDEA-014: Tournaments Page — Add Completed Results Section
**Triggered by:** Tournaments list audit — all tournaments show "Preview →" with no way to see past results
**Category:** Data & Intelligence
**Persona:** The Grinder, The Informed Fan
**Effort:** Low-Medium

The `/tournaments` page shows the full 2026 schedule but only as "Upcoming" — there's no "Completed" section showing past tournament results. Once a tournament is over, users should be able to see the final leaderboard, winner, and their fantasy scoring results.

**What to add:**
- A "Completed" section below "Upcoming" showing past tournaments with: winner, winning score, your fantasy result
- Each completed card links to the tournament recap page (which already exists at `/tournaments/:id/recap`)
- A year/season filter to browse historical tournament results

---

### IDEA-015: Prove It — NFL Prediction Slate Needs Grouping, Filtering & Interaction
**Triggered by:** Prove It audit — 114 benchmarks in a single flat list, no grouping or filters
**Category:** Predictions & Clutch Rating
**Persona:** The Informed Fan, The Sports Debater
**Effort:** Medium

The NFL Predictions tab shows 114 Player Benchmarks in one long scrolling list. There's no way to filter by position (QB/RB/WR/TE), stat type (passing TDs, passing yards, receiving yards, rushing yards), or team. Finding the prediction you want to make requires scrolling through the entire list.

**What "great" looks like:**
- **Position filter pills** at the top: All | QB | RB | WR | TE — instant filter
- **Stat type grouping** with collapsible sections: "Passing TDs (12 calls)", "Passing Yards (10 calls)", "Receiving Yards (20 calls)" — so users can focus on what they know best
- **Search/filter bar** to find a specific player quickly
- **Interactive cards** — clicking a resolved benchmark should expand to show: your call (if made), community consensus, result breakdown (over/under split), who got it right in your league
- **"Quick Call" mode** — swiping or tapping Over/Under directly on the card without needing to open a detail view. Friction-free interaction = more predictions = better data
- **Card visual upgrade** — resolved cards should show green ✓ or red ✗ for correct/incorrect, not just "Actual: 5" in grey text

---

### IDEA-016: Prove It — Surface Predictions Everywhere, Not Just in Prove It Hub
**Triggered by:** Prove It audit + CLAUDE.md prediction architecture review — predictions are built but buried
**Category:** Predictions & Clutch Rating, Connectivity & Cross-Linking
**Persona:** The Informed Fan, The Sports Debater
**Effort:** Medium-High

Eric called this out: "we haven't really even gotten to the whole make picks and clutch rating thing." The Prove It hub exists and works, but predictions are almost invisible outside of it. Nobody will go to a dedicated predictions tab daily — predictions need to appear where users already are.

**Where predictions should surface:**
- **Dashboard**: "3 open predictions for this week's tournament — make your calls" nudge card
- **Tournament page**: Inline prediction slate (IDEA-013 covers this)
- **League Home**: "Your league has 8 open predictions this week — you've made 2" progress bar
- **Player profile/drawer**: "Make a call on Scottie Scheffler for Arnold Palmer Invitational" when there's an active slate featuring that player
- **Golf Hub**: "This week's predictions" quick-access card with a count of open/resolved
- **Scoring page**: After tournament results are final, show "Your predictions for this event: 4/7 correct — View breakdown"
- **Coach Briefing**: "You haven't made your predictions for this week yet — your streak is at risk!" nudge

The prediction system is Clutch's biggest differentiator — the "Prove It" concept of verified track records is unique in fantasy. But it only works if predictions are frictionless and omnipresent.

---

### IDEA-017: Clutch Rating Should Be Visible on Every Surface
**Triggered by:** Manager Stats page audit — Clutch Rating (61, CONTENDER) is impressive but only visible on the manager stats page
**Category:** Predictions & Clutch Rating, Social & Engagement
**Persona:** All
**Effort:** Medium

The Clutch Rating system is built and working (61, CONTENDER, 17 seasons, 96% confidence, 7 components). It's the platform's crown jewel. But it's barely surfaced outside the manager stats page.

**Where Clutch Rating should appear:**
- **Navbar avatar dropdown**: Small rating number next to name (like a gamer score)
- **League standings**: Rating column showing each manager's Clutch Rating with tier badge
- **Draft room**: When viewing another team's picks, show their Clutch Rating (helps assess draft strategy)
- **Prove It leaderboard**: Already there — good
- **League Home team cards**: Mini rating badge next to each team name
- **Trade proposals**: Show both managers' Clutch Ratings — helps evaluate trade fairness from a credibility standpoint
- **Commissioner blog/chat**: Author's Clutch Rating tier badge next to their name
- **Public sharing**: "I'm rated CONTENDER (61) on Clutch — prove your fantasy skills at clutchfantasysports.com" shareable card

The rating system is what makes Clutch unique. Every time someone sees their number, they think about how to improve it — that's the engagement flywheel.

---

### IDEA-018: Live Page as a Multi-Sport Command Center
**Triggered by:** Live page audit — completely blank between tournaments
**Category:** Social & Engagement
**Persona:** The Informed Fan, The Grinder
**Effort:** Medium-High

The Live page is blank between tournaments. Even during tournaments it only shows golf scoring. This should be the real-time nerve center of the platform — the page you check compulsively during game windows.

**What "great" looks like:**
- **Between events**: Show a countdown to next event, recent results recap, your weekly prediction performance, trending player movements
- **During golf tournaments**: Current leaderboard with your roster players highlighted, your matchup score updating live, fantasy scoring sidebar (already works well in the Scoring page — bring it here)
- **During NFL game windows** (future): Red zone alerts for your players, live fantasy point updates, injury alerts, real-time matchup tracker
- **Multi-sport split view**: When golf and NFL are both active, split the page — golf leaderboard top, NFL scores bottom, your fantasy dashboard sidebar
- **Push notification integration**: "Your player just made a birdie — you're now leading your matchup" — driven from this page's live data

---

### IDEA-019: League Home Coach Briefing — Context-Specific & Expandable
**Triggered by:** League Home audit — Coach Briefing is working but limited to one message
**Category:** Data & Intelligence
**Persona:** The Informed Fan
**Effort:** Low-Medium

The Coach Briefing on the League Home page is working and contextual ("Draft day is in 2 days — are you ready? You have 197 players ranked but no targets tagged.") — this is excellent. But it's a single card that could do so much more.

**Enhancement ideas:**
- **Multiple briefing cards** that cycle or stack: draft prep, upcoming tournament preview, waiver suggestions, prediction reminders — each as a separate swipeable card
- **Expandable detail**: Clicking the briefing expands into a full coaching panel with specific recommendations: "Tag your top 5 targets for the draft," "Watch list alert: Cam Young dropped in another league," "Your prediction streak is at 3 — don't break it!"
- **Time-sensitive urgency**: Briefings should change as deadlines approach — 7 days out is informational, 24 hours is urgent, 1 hour is critical with red styling
- **Post-event debriefs**: After a tournament or NFL week, the coach should recap: "Your team scored 245.6 this week (3rd in league). Highlight: Scheffler earned +68. Suggestion: Consider picking up Cam Young — he outperformed your WR2 by 12 points."

---

### IDEA-020: Vault as a Social Flex — Shareable League History Cards
**Triggered by:** Vault audit + landing page "17 years of league history" pitch
**Category:** Social & Engagement, Growth & Virality
**Persona:** The Dynasty Nerd, The Sports Debater
**Effort:** Medium

The Vault already has a Share button and public landing page capability. But there's a huge opportunity to make league history viral. Most fantasy leagues have 10+ years of history — that's a goldmine of bragging rights.

**What to build:**
- **"On This Day" shareable cards**: "5 years ago, you drafted Patrick Mahomes in Round 8 — he won MVP that season. Your Clutch Rating Draft IQ: 92." Auto-generated, shareable to social media.
- **Championship ring collection**: Visual ring/trophy display for each championship won, with year and league name — like a virtual trophy case. Shareable image.
- **Rivalry cards**: "You vs Spencer: 12 H2H meetings, you lead 8-4. Your biggest win: 145.2 to 87.3 (Week 7, 2022)." Auto-generated from H2H vault data.
- **Draft Day Flashbacks**: "Your best draft ever: 2019 BroMontana Bowl — 4 of your first 5 picks finished top 10 at their position." Shareable card with a CTA to try Clutch.
- **Season recap shareable**: After each season, auto-generate a "Year in Review" card: record, best week, worst week, key moves, final standing. Shareable.

This is growth-by-bragging — the most organic way fantasy platforms spread. Nobody can resist sharing their championship record.

---

### IDEA-021: Commissioner Dashboard — The Reason to Switch from Yahoo/ESPN
**Triggered by:** Previous audit sessions (league creation + settings) + CLAUDE.md commissioner-centric positioning
**Category:** Commissioner Experience
**Persona:** Commissioner (decision-maker persona)
**Effort:** High (but highest-leverage feature for user acquisition)

Eric's positioning is clear: commissioners choose the platform, and 8-14 members follow. Every commissioner pain point is a priority. But the commissioner experience right now is mostly standard settings pages. To get commissioners to switch FROM Yahoo/ESPN/Sleeper, Clutch needs to be dramatically better for them.

**What a commissioner dashboard should include:**
- **League health overview**: Member activity (who hasn't set their lineup), roster compliance, trade activity, chat engagement — all at a glance
- **Announcement system**: Pin important messages, schedule announcements ("Playoffs start Week 14"), event reminders
- **Rule change proposals**: Propose rule changes, let the league vote, auto-apply approved changes next season
- **Dispute resolution**: Clear UI for handling disputes (trade vetoes, scoring corrections) with league vote integration
- **Season planning tools**: Schedule builder, playoff format configurator, keeper deadline management
- **Import one-click migration**: "Import from Yahoo" that pulls everything — settings, history, rosters, draft picks — in one click (mostly built, but needs to be THE selling point)
- **Multi-league management**: For commissioners running 2-3 leagues, show all leagues' health in one view

---

### IDEA-022: Draft Room as an Event, Not Just a Tool
**Triggered by:** Previous audit sessions (draft room audit) + Lab audit
**Category:** Social & Engagement, Commissioner Experience
**Persona:** All
**Effort:** Medium-High

The draft room works (snake + auction, Socket.IO, real-time) but it could feel more like the event it actually is. Draft night is the biggest day of the fantasy season — the UI should match that energy.

**Enhancement ideas:**
- **Draft countdown lobby**: 30-60 minutes before the draft, a lobby page opens with: draft order reveal animation, board integration (last chance to review), chat active, mock draft quick-link
- **Live reactions**: Emoji reactions to each pick visible to all drafters (🔥 for a great pick, 💀 for a reach, 🤔 for a surprise)
- **Pick grade overlay**: After each pick, show an instant AI grade: "A+ — Top value at this position" or "C — Reached 2 rounds early based on ADP"
- **Draft recap auto-generation**: Immediately after the draft, auto-generate a recap with: best value picks, biggest reaches, team grades, your team analysis. Shareable.
- **War room mode**: Split-screen with your board on one side and the live draft on the other, so you can reference your rankings while picking without switching tabs

---

### IDEA-023: Import Flow — Post-Import "Wow Moment" Needs to Be Bigger
**Triggered by:** Previous audit sessions (import flow audit) + Vault V2 reveal
**Category:** Growth & Virality, Polish & Delight
**Persona:** Commissioner, The Dynasty Nerd
**Effort:** Medium

The Vault V2 cinematic reveal exists, but the moment after importing a league should be the single most impressive moment on the platform. This is when a commissioner decides if they're switching or not.

**What "great" looks like:**
- **Immediate stats computation**: Right after import finishes, compute and show: total seasons imported, total games played, all-time records, championship history, biggest upsets, longest win streaks — before the user even navigates to the Vault
- **"Your Legacy" summary card**: A shareable single-image summary: "BroMontana Bowl — 17 seasons, 142 games, 4 championships, 1,247 total points. Commissioner: Eric Saylor." This is the viral moment.
- **Side-by-side before/after**: Show what the league looked like on Yahoo (screenshot?) vs how it looks in the Clutch Vault — the contrast sells the migration
- **Immediate Clutch Rating**: "Based on your 17 seasons, your Clutch Rating is 61 (CONTENDER). Import more leagues to improve it." Instant hook.
- **Commissioner CTA**: "Share your league's story — invite members with this link" with a pre-written invite message referencing the vault and their history

---

### IDEA-024: Onboarding — The First 5 Minutes Must Hook
**Triggered by:** Full platform audit — many features exist but new users may never find them
**Category:** Growth & Virality, Polish & Delight
**Persona:** All (especially new users)
**Effort:** Medium

A new user signs up and sees: Dashboard with no leagues, Coach Briefing (if working), Quick Actions. The platform has incredible depth (Lab, Prove It, Golf Hub, Vault, AI coaching) but a new user won't discover any of it without guided exploration.

**What "great" looks like:**
- **Sport-first onboarding**: "What do you play? Golf / NFL / Both" → immediately personalize everything (hub shown, predictions available, relevant news)
- **"Try the Lab" prompt**: Before they join a league, let them create a draft board for an upcoming tournament — zero commitment, high engagement
- **"Make your first call" prompt**: Show one prediction and let them make it before even creating an account — lowers the barrier dramatically
- **Import prompt for experienced players**: "Already have a league on Yahoo/ESPN/Sleeper? Import it and see your Clutch Rating instantly"
- **Progressive feature reveals**: Don't show everything at once. Week 1: Dashboard + League. Week 2: "Did you know about The Lab?" Week 3: "Track your predictions in Prove It." Drip-feed the features via Coach Briefing.

