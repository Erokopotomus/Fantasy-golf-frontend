# LEAGUE IMPORT INTELLIGENCE — Addendum: Maximum Capture, Custom Data, & Conversational Intelligence

> **Purpose:** This addendum extends CLUTCH_IMPORT_INTELLIGENCE_SPEC.md with three additions: (1) maximizing data capture from every platform import, (2) custom league data import from Google Sheets and external websites, and (3) a conversational league intelligence query engine. These should be built in sequence after the core import intelligence pipeline is functional.
>
> **Generated:** February 11, 2026
> **Author:** Eric + Claude Opus (strategic planning session)
> **Status:** APPROVED — Ready for implementation
> **Depends on:** CLUTCH_IMPORT_INTELLIGENCE_SPEC.md (Phases 1-3 should be complete or in progress)

---

## PART 1: MAXIMUM DATA CAPTURE FROM PLATFORM IMPORTS

### The Principle

Every platform returns different data. We should store ALL of it — even fields we don't use today. Raw data is an asset. A field we ignore in February might power a killer feature in August. The cost of storing extra JSON columns is near zero. The cost of re-importing thousands of leagues because we didn't capture something the first time is enormous.

### 1A: Platform Data Mapping

Before building import logic for any platform, create a comprehensive audit of what each platform provides. This is a reference document that Claude Code should consult when building or modifying any import pipeline.

**Create file: `docs/PLATFORM_DATA_MAP.md`**

This document should be populated by running audit scripts (like the Yahoo audit in the main spec) against each platform. The structure:

```markdown
# Platform Data Availability Map

## Yahoo Fantasy API
| Data Category | Endpoint | Fields Available | Currently Stored | Priority |
|---|---|---|---|---|
| League Settings | /league/{key} | name, season, num_teams, scoring_type, draft_type, trade_deadline, waiver_type, faab_balance, roster_positions, playoff_teams, playoff_start_week, uses_lock, max_moves, max_trades | ? | HIGH |
| Standings | /league/{key}/standings | team_key, team_name, manager_name, wins, losses, ties, points_for, points_against, streak, rank, playoff_seed, clinched | ? | HIGH |
| Weekly Scores | /league/{key}/scoreboard;week={n} | matchup_id, team1_key, team1_score, team2_key, team2_score, is_tied, winner_team_key, week, is_playoffs, is_consolation | ? | HIGH |
| Rosters | /team/{key}/roster;week={n} | player_key, player_name, position, roster_position (slot), is_starting, bye_week, injury_status, projected_points, actual_points | ? | HIGH |
| Draft | /league/{key}/draftresults | pick, round, team_key, player_key, cost (auction), is_keeper | ? | HIGH |
| Transactions | /league/{key}/transactions | type (add/drop/trade/commish), timestamp, players_added, players_dropped, faab_bid, trade_partner, waiver_priority_used | ? | HIGH |
| Player Details | /player/{key} | player_key, full_name, first_name, last_name, team_abbr, position, uniform_number, bye_week, headshot_url, status, injury_note | ? | MEDIUM |
| Record Book | /league/{key} (sub-resources) | all_time_high_score, longest_win_streak, all_time_records | ? | MEDIUM |
| Matchup Grades | varies | Yahoo sometimes provides start grades | ? | LOW |

## ESPN Fantasy API
| Data Category | Endpoint | Fields Available | Currently Stored | Priority |
|---|---|---|---|---|
| League Settings | /seasons/{year}/segments/0/leagues/{id} | name, size, scoringPeriodId, settings (roster, scoring, schedule, trade, waiver), draftSettings | ? | HIGH |
| Standings | mTeam view | wins, losses, ties, pointsFor, pointsAgainst, streakLength, playoffSeed, draftDayProjectedRank | ? | HIGH |
| Weekly Scores | mMatchup view | matchupPeriodId, home/away team ids, home/away scores, winner, playoffTierType | ? | HIGH |
| Rosters | mRoster view;week={n} | playerId, playerName, position, lineupSlotId (slot), acquisitionType, projected, actual | ? | HIGH |
| Draft | mDraftDetail view | picks: pickNumber, roundNumber, playerId, teamId, bidAmount, keeper, nominatingTeamId | ? | HIGH |
| Transactions | recent activity | type, bidAmount, date, items (playerId, fromTeamId, toTeamId, type) | ? | HIGH |
| Player Details | /players | id, fullName, proTeamId, defaultPositionId, injuryStatus, seasonOutlook | ? | MEDIUM |
| NOTE | ESPN data is only available from ~2018+ | Older data was deleted by ESPN | | |

## Sleeper API
| Data Category | Endpoint | Fields Available | Currently Stored | Priority |
|---|---|---|---|---|
| League Settings | /league/{id} | name, season, total_rosters, roster_positions, scoring_settings, settings (waiver_type, trade_deadline, etc.) | ? | HIGH |
| Standings | /league/{id} (rosters) | wins, losses, ties, fpts, fpts_against, ppts (potential points), roster | ? | HIGH |
| Weekly Matchups | /league/{id}/matchups/{week} | roster_id, starters[], players[], points, custom_points | ? | HIGH |
| Rosters | derived from matchups | starters array = started, players minus starters = bench | ? | HIGH |
| Draft | /draft/{draft_id}/picks | pick_no, round, roster_id, player_id, amount (auction), is_keeper, metadata | ? | HIGH |
| Transactions | /league/{id}/transactions/{round} | type (trade/waiver/free_agent), adds, drops, roster_ids, settings (waiver_bid), created | ? | HIGH |
| Player Details | /players/nfl (static) | player_id, full_name, team, position, age, years_exp, injury_status | ? | MEDIUM |
| Traded Picks | /league/{id}/traded_picks | season, round, roster_id, previous_owner_id | ? | MEDIUM |
| NOTE | No auth required. Public API. Just need league ID. | | | |

## Fantrax
| Data Category | Method | Fields Available | Currently Stored | Priority |
|---|---|---|---|---|
| League Settings | CSV export / scrape | name, season, teams, roster positions, scoring categories | ? | HIGH |
| Standings | CSV export | team, wins, losses, ties, points_for, points_against, roto_points, category_standings | ? | HIGH |
| Weekly Scores | CSV export / scrape | week, team, score, opponent, opponent_score | ? | HIGH |
| Rosters | CSV export | player, team, position, roster_status, fantasy_points | ? | MEDIUM |
| Draft | CSV export | round, pick, team, player, position, keeper, salary | ? | HIGH |
| Transactions | CSV export / scrape | date, type, team, player_added, player_dropped, claim_amount | ? | MEDIUM |
| NOTE | No official API. CSV export is most reliable. | | | |

## MFL (MyFantasyLeague)
| Data Category | Endpoint | Fields Available | Currently Stored | Priority |
|---|---|---|---|---|
| League Settings | /export?TYPE=league | name, baseURL, rosterSize, starters, salaryCapAmount, draftType, nflTeams | ? | HIGH |
| Standings | /export?TYPE=leagueStandings | team_id, wins, losses, ties, pf, pa, powerRank, allPlayWins, allPlayLosses | ? | HIGH |
| Weekly Scores | /export?TYPE=weeklyResults&W={week} | matchup pairs with team_id, score, result, isPlayoff | ? | HIGH |
| Rosters | /export?TYPE=rosters&W={week} | player_id, status (starter/nonstarter/taxisquad/injuredreserve) | ? | HIGH |
| Draft | /export?TYPE=draftResults | pick, round, player_id, franchise_id, amount, comments, timestamp | ? | HIGH |
| Transactions | /export?TYPE=transactions | type, franchise, transaction (adds/drops), amount, timestamp | ? | HIGH |
| Salary/Contract | /export?TYPE=salaries | player_id, salary, contractYear, contractInfo | ? | HIGH |
| Player Details | /export?TYPE=players | player_id, name, position, team, birthdate, draft_year | ? | MEDIUM |
| Future Draft Picks | /export?TYPE=futureDraftPicks | year, round, originalOwner, currentOwner | ? | MEDIUM |
| All-Play Records | /export?TYPE=leagueStandings | allPlayWins, allPlayLosses | ? | MEDIUM |
| NOTE | XML API. Requires commissioner credentials. Deepest data available (15-20+ years). | | | |
```

### 1B: Raw Data Preservation

**Principle: Store the raw API response alongside the normalized data.**

For every import, before any normalization or mapping, store the raw response from the source platform. This means if we later discover we missed a field, we can re-process from raw data without re-importing from the platform.

**Schema change — modify or ensure RawProviderData is used:**

The `RawProviderData` model already exists (migration 12). Verify it's being used during imports:

```prisma
model RawProviderData {
  // Should already exist — verify these fields:
  id            String   @id @default(cuid())
  provider      String   // yahoo, espn, sleeper, fantrax, mfl
  dataType      String   // league_settings, standings, matchups, rosters, draft, transactions
  externalId    String   // league_key or league_id from source
  seasonYear    Int?
  week          Int?
  rawPayload    Json     // THE COMPLETE API RESPONSE — store everything
  processedAt   DateTime?
  createdAt     DateTime @default(now())

  @@index([provider, externalId, dataType])
  @@index([provider, dataType, seasonYear])
}
```

**Implementation rule for ALL import pipelines:**

```javascript
// BEFORE normalizing any API response, store it raw:
async function importSeasonData(provider, leagueKey, season, endpoint, response) {
  // Step 1: Store raw (ALWAYS)
  await prisma.rawProviderData.create({
    data: {
      provider,
      dataType: endpoint, // 'standings', 'rosters', 'draft', etc.
      externalId: leagueKey,
      seasonYear: season,
      rawPayload: response, // Complete API response, no filtering
      processedAt: null
    }
  });

  // Step 2: Normalize into Clutch models
  const normalized = await normalizeResponse(provider, endpoint, response);
  // ... store in HistoricalDraft, HistoricalMatchup, etc.

  // Step 3: Mark as processed
  await markProcessed(rawRecord.id);
}
```

**This applies to every platform.** Yahoo, ESPN, Sleeper, Fantrax, MFL — all raw responses go into RawProviderData before any processing. This is non-negotiable.

### 1C: Platform-Specific Capture Maximization

For each platform, here are the fields that are especially valuable and easy to miss:

**Yahoo — don't miss these:**
- `projected_points` on roster entries (allows "did you start the projected-higher player?" analysis)
- `injury_status` and `injury_note` at time of lineup (context for start/sit decisions)
- `waiver_priority_used` on transactions (reveals priority management strategy)
- Record book data (pre-computed all-time records — free league vault content)
- `bye_week` on players at time of roster (reveals bye week management skill)

**ESPN — don't miss these:**
- `acquisitionType` on roster entries (draft, trade, free_agent, waivers — shows how the roster was assembled)
- `draftDayProjectedRank` on teams (ESPN's own preseason projection — compare to actual finish)
- `playoffTierType` on matchups (distinguishes winners bracket, losers bracket, consolation)

**Sleeper — don't miss these:**
- `ppts` (potential points) on standings — Sleeper pre-computes optimal lineup points! Free data point.
- `metadata` on draft picks (Sleeper sometimes includes keeper/dynasty metadata)
- `traded_picks` endpoint — tracks future pick ownership (critical for dynasty leagues)

**MFL — don't miss these:**
- `allPlayWins` / `allPlayLosses` — MFL tracks all-play records (how you'd fare against every team every week)
- `salaryCapAmount` and salary data — full contract/salary history for dynasty/keeper leagues
- `comments` on draft picks — commissioners sometimes add pick notes!
- `futureDraftPicks` — complete future draft pick ownership chain

### Phase 1 Verification Checklist
- [ ] PLATFORM_DATA_MAP.md is populated with actual audit results for each platform
- [ ] RawProviderData stores complete API responses before normalization for all platforms
- [ ] Yahoo import captures projected_points, injury_status, record book data
- [ ] ESPN import captures acquisitionType, draftDayProjectedRank
- [ ] Sleeper import captures ppts (potential points), traded_picks
- [ ] MFL import captures salary data, allPlay records, draft pick comments
- [ ] Fantrax CSV import stores raw CSV alongside normalized data
- [ ] No platform data is silently dropped during normalization

---

## PART 2: CUSTOM LEAGUE DATA IMPORT

### The Problem

Serious leagues track stats that no platform provides. Commissioner spreadsheets with all-time records, trophy tracking, punishment histories, draft grade archives, rivalry records, power rankings, season awards, and more. This data lives in Google Sheets, Excel files, and WordPress/custom websites. It's the soul of the league — and it's currently inaccessible to any fantasy platform.

### The Opportunity

If Clutch can ingest this custom data, two things happen:
1. The League Vault becomes the definitive home for the league's entire history — not just what Yahoo tracked
2. The conversational query engine can answer questions about data that came from the commissioner's records, not just platform data

### 2A: Spreadsheet Import Pipeline

**New file: `backend/src/services/customDataImport.js`**

**Supported formats:** `.xlsx`, `.xls`, `.csv`, Google Sheets (via share link)

**Import flow:**

```
Step 1: Commissioner uploads file or pastes Google Sheets link
Step 2: System reads headers and sample rows, presents preview
Step 3: AI-powered column mapping (see below)
Step 4: Commissioner confirms mapping
Step 5: Data imported into custom league data tables
Step 6: Data becomes queryable in league intelligence
```

**The AI column mapping is the key innovation.** Commissioners structure their sheets differently. One might have "Total Pts" while another has "Points For" while another has "PF". Rather than building rigid templates, use Claude to interpret the spreadsheet.

**Backend — AI-powered sheet interpretation:**

```javascript
async function interpretSpreadsheet(headers, sampleRows, leagueContext) {
  // Send headers + 3-5 sample rows to Claude
  // Ask it to map columns to known Clutch data types
  //
  // System prompt: "You are analyzing a fantasy sports league spreadsheet.
  // Map each column to a Clutch data category. If a column doesn't match
  // any known category, label it as CUSTOM with a description."
  //
  // Known categories:
  //   SEASON_YEAR, TEAM_NAME, OWNER_NAME, WINS, LOSSES, TIES,
  //   POINTS_FOR, POINTS_AGAINST, FINAL_STANDING, PLAYOFF_RESULT,
  //   CHAMPIONSHIP_WON, DRAFT_PICK, DRAFT_ROUND, PLAYER_NAME,
  //   PLAYER_POSITION, TRADE_DATE, TRADE_DETAILS, WAIVER_CLAIM,
  //   FAAB_SPENT, WEEKLY_SCORE, WEEK_NUMBER, OPPONENT,
  //   ALL_TIME_WINS, ALL_TIME_LOSSES, TROPHY_NAME, AWARD_NAME,
  //   PUNISHMENT, NICKNAME, NOTES, CUSTOM
  //
  // Returns: { columns: [{ header, mappedTo, confidence, description }] }

  const response = await claudeService.generateCompletion(
    SHEET_INTERPRETATION_PROMPT,
    JSON.stringify({ headers, sampleRows, leagueContext }),
    { model: 'claude-sonnet-4-5-20250929' } // Sonnet is fine for this
  );

  return JSON.parse(response);
}
```

**Frontend — spreadsheet import page:**

**New route: `/import/custom` (or add as a tab on existing `/import` page)**

```
1. Upload zone: drag-and-drop .xlsx/.csv OR paste Google Sheets URL
2. Sheet selection: if workbook has multiple sheets, show tabs to select
3. AI mapping preview: show a table with:
   - Column header (from sheet)
   - Detected type (from AI)
   - Confidence indicator (green/yellow/red)
   - Override dropdown (user can correct the AI mapping)
4. Row preview: show first 5 rows with the mapped types applied
5. Confirm & import button
6. Progress indicator
7. Completion: "Imported X records. View in League Vault →"
```

**Schema — custom league data storage:**

```prisma
model CustomLeagueData {
  id              String   @id @default(cuid())
  leagueId        String
  importedBy      String   // userId
  sourceType      String   // spreadsheet, website
  sourceFileName  String?  // original filename or URL
  dataCategory    String   // standings, records, awards, trophies, draft_history,
                           // transactions, custom_stats, punishments, nicknames, other
  seasonYear      Int?     // null for all-time records
  data            Json     // Flexible JSON storage — structure varies by category
  columnMapping   Json?    // The AI-generated column mapping used during import
  createdAt       DateTime @default(now())

  league          League   @relation(fields: [leagueId], references: [id])
  user            User     @relation(fields: [importedBy], references: [id])

  @@index([leagueId, dataCategory])
  @@index([leagueId, seasonYear])
}
```

**data JSON examples by category:**

```json
// dataCategory: "standings"
{
  "rows": [
    { "owner": "Eric", "team": "Erok's Empire", "wins": 10, "losses": 3, "pf": 1842.5, "standing": 1, "champion": true },
    { "owner": "Jake", "team": "Jake's Squad", "wins": 8, "losses": 5, "pf": 1721.3, "standing": 3, "champion": false }
  ]
}

// dataCategory: "awards"
{
  "rows": [
    { "season": 2023, "award": "Biggest Bust Pick", "winner": "Jake", "details": "Drafted CMC #1 overall, finished RB22" },
    { "season": 2023, "award": "Waiver Wire King", "winner": "Eric", "details": "Picked up Puka Nacua week 1" }
  ]
}

// dataCategory: "all_time_records"
{
  "rows": [
    { "record": "Highest Single Week Score", "holder": "Eric", "value": 212.4, "season": 2022, "week": 8 },
    { "record": "Longest Win Streak", "holder": "RJ", "value": 11, "season": "2021-2022" },
    { "record": "Most Championships", "holder": "Nick", "value": 3, "seasons": "2019, 2021, 2024" }
  ]
}

// dataCategory: "trophies"
{
  "rows": [
    { "trophy": "The Golden Toilet", "description": "Awarded to last place", "history": [
      { "season": 2023, "winner": "Jake" },
      { "season": 2022, "winner": "Mike" }
    ]},
    { "trophy": "Sacko Bowl Champion", "description": "Winner of consolation bracket", "history": [...] }
  ]
}

// dataCategory: "punishments"
{
  "rows": [
    { "season": 2023, "owner": "Jake", "punishment": "Ran a 5K in a costume", "completed": true },
    { "season": 2022, "owner": "Mike", "punishment": "Had to change fantasy team name to 'I Suck'", "completed": true }
  ]
}

// dataCategory: "custom_stats"
{
  "rows": [
    { "owner": "Eric", "stat": "All-Time Points", "value": 12483.2 },
    { "owner": "Eric", "stat": "Playoff Record", "value": "12-7" },
    { "owner": "Jake", "stat": "All-Time Points", "value": 11891.8 },
    { "owner": "Jake", "stat": "Playoff Record", "value": "8-11" }
  ]
}
```

**Migration 36: custom_league_data**
```sql
CREATE TABLE "CustomLeagueData" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "importedBy" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceFileName" TEXT,
  "dataCategory" TEXT NOT NULL,
  "seasonYear" INTEGER,
  "data" JSONB NOT NULL,
  "columnMapping" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("leagueId") REFERENCES "League"("id"),
  FOREIGN KEY ("importedBy") REFERENCES "User"("id")
);
CREATE INDEX "idx_custom_data_league" ON "CustomLeagueData"("leagueId", "dataCategory");
CREATE INDEX "idx_custom_data_season" ON "CustomLeagueData"("leagueId", "seasonYear");
```

### 2B: Website Content Import

**For leagues with WordPress sites or custom websites**, we need a different approach. The user provides a URL and we scrape/interpret the content.

**Flow:**

```
Step 1: Commissioner pastes their league website URL
Step 2: System crawls the site (limited depth — max 20 pages)
Step 3: AI interprets page content and categorizes it
Step 4: Commissioner reviews what was found and confirms import
Step 5: Data stored in CustomLeagueData
```

**Backend — website crawler + AI interpretation:**

```javascript
async function crawlLeagueWebsite(url, maxPages = 20) {
  // 1. Fetch the main page
  // 2. Extract links that look like league content (not external links, not nav chrome)
  // 3. For each link (up to maxPages), fetch content
  // 4. Extract text content (strip HTML, keep tables and lists)
  // 5. Return array of { url, title, textContent, tables[] }
}

async function interpretWebsiteContent(pages, leagueContext) {
  // Send page content to Claude in batches
  // Ask it to identify and extract structured data
  //
  // System prompt: "You are analyzing a fantasy sports league website.
  // Extract any structured data you find: standings, records, awards,
  // historical results, trophies, punishments, draft results, etc.
  // Return as JSON matching the CustomLeagueData schema categories."
  //
  // This is a more complex AI task — use Opus for quality
  //
  // Returns: {
  //   pages: [
  //     {
  //       url, title,
  //       extractedData: [
  //         { category: "all_time_records", data: { rows: [...] } },
  //         { category: "awards", seasonYear: 2023, data: { rows: [...] } }
  //       ]
  //     }
  //   ]
  // }
}
```

**Frontend — website import page:**

**Add to `/import/custom` as a tab alongside spreadsheet upload:**

```
1. URL input: "Paste your league website URL"
2. Crawl progress: "Scanning your site... found X pages"
3. Content preview: For each page, show what was found:
   - Page title
   - Data categories detected
   - Preview of extracted records
   - Toggle: include/exclude this page
4. Confirm & import
5. Completion with summary
```

**Important constraints:**
- Rate limit crawling (1 request per second, max 20 pages)
- Only crawl within the same domain (don't follow external links)
- Skip obviously non-content pages (login, contact, about the platform itself)
- Store raw page content in RawProviderData with provider = "website"
- The AI interpretation should err on the side of extracting too much — the user can exclude during review

### 2C: League Vault Integration

**Modify: League Vault page (`/leagues/:id/vault`)**

Custom imported data should appear in the League Vault alongside platform-imported data:

- **Records tab:** Merge custom all_time_records with computed records from platform data
- **Awards tab:** Show custom awards/trophies with season history
- **Punishments tab:** New tab if punishment data exists (this is gold for engagement)
- **Custom Stats tab:** Any custom_stats data that doesn't fit other categories
- **Data source badge:** Each record shows a small badge: "Yahoo" / "Custom" / "Clutch" to indicate provenance

**API routes for custom data:**
```
POST   /api/import/custom/spreadsheet  — Upload spreadsheet file
POST   /api/import/custom/sheets-url   — Import from Google Sheets URL
POST   /api/import/custom/website      — Crawl and import website
GET    /api/import/custom/:importId/preview — Get AI mapping preview
POST   /api/import/custom/:importId/confirm — Confirm and finalize import
GET    /api/leagues/:id/custom-data    — Get all custom data for a league
DELETE /api/leagues/:id/custom-data/:dataId — Remove custom data record
```

### Phase 2 Verification Checklist
- [ ] Spreadsheet upload works (.xlsx, .csv)
- [ ] Google Sheets URL import works (public sheets)
- [ ] AI column mapping correctly identifies common fantasy data columns
- [ ] Commissioner can override AI mappings before confirming
- [ ] Website crawler fetches pages within the same domain (max 20)
- [ ] AI website interpretation extracts structured data from page content
- [ ] CustomLeagueData records are created with appropriate categories
- [ ] League Vault displays custom data alongside platform data
- [ ] Raw content stored in RawProviderData for all custom imports
- [ ] Build clean, no console errors

---

## PART 3: CONVERSATIONAL LEAGUE INTELLIGENCE

### The Vision

A league member opens their league page, taps a chat icon, and types: "Who has more all-time points, me or Jake?" The system queries the league's complete dataset — platform imports, custom data, live Clutch data — and returns an answer in natural language. With stats. With context. With trash talk ammunition.

This is NOT a general-purpose chatbot. This is a natural language query engine scoped to a specific league's data. It can only answer questions about data it has. It cannot hallucinate stats. Every answer is backed by actual records.

### 3A: League Data Context Builder

**New file: `backend/src/services/leagueIntelligenceService.js`**

This service assembles the complete queryable dataset for a league. It pulls from ALL data sources:

```javascript
async function buildLeagueContext(leagueId, queryHint) {
  // Assemble the data the AI needs to answer questions about this league
  // queryHint is used to load only relevant data (not the entire history for every query)

  const context = {
    leagueInfo: {},     // name, sport, seasons, format, scoring type
    owners: [],         // all-time owner list with Clutch usernames
    standings: {},      // per-season standings
    allTimeRecords: {}, // computed + custom records
    headToHead: {},     // owner vs owner lifetime records
    drafts: {},         // per-season draft data
    matchups: {},       // per-season weekly results
    transactions: {},   // waiver/trade history
    awards: {},         // custom awards/trophies
    customData: {},     // any other custom imported data
    rosterHistory: {}   // only loaded if query relates to rosters/lineups
  };

  // Load league basics (always)
  context.leagueInfo = await getLeagueInfo(leagueId);
  context.owners = await getLeagueOwners(leagueId);

  // Load data based on query relevance
  // (The AI first classifies the query, then we load targeted data)
  const queryClass = classifyQuery(queryHint);

  if (queryClass.needsStandings) {
    context.standings = await getAllSeasonStandings(leagueId);
  }
  if (queryClass.needsHeadToHead) {
    context.headToHead = await getHeadToHeadRecords(leagueId);
  }
  if (queryClass.needsRecords) {
    context.allTimeRecords = await getAllTimeRecords(leagueId); // platform + custom merged
  }
  if (queryClass.needsDrafts) {
    context.drafts = await getDraftHistory(leagueId);
  }
  if (queryClass.needsMatchups) {
    context.matchups = await getMatchupHistory(leagueId, queryClass.seasonFilter);
  }
  if (queryClass.needsTransactions) {
    context.transactions = await getTransactionHistory(leagueId, queryClass.seasonFilter);
  }
  if (queryClass.needsCustom) {
    context.customData = await getCustomLeagueData(leagueId);
  }
  if (queryClass.needsRosters) {
    context.rosterHistory = await getRosterHistory(leagueId, queryClass.seasonFilter, queryClass.weekFilter);
  }

  return context;
}

function classifyQuery(query) {
  // Quick keyword-based classification to determine what data to load
  // This runs BEFORE the AI call to minimize token usage
  const q = query.toLowerCase();

  return {
    needsStandings: /record|wins|losses|standing|finish|place|champion/.test(q),
    needsHeadToHead: /vs|versus|head.to.head|beat|against|record against|rivalry/.test(q),
    needsRecords: /record|highest|lowest|most|best|worst|all.time|history/.test(q),
    needsDrafts: /draft|pick|round|auction|keeper|sleeper|bust|steal/.test(q),
    needsMatchups: /score|week|matchup|points|beat|margin|blowout|close/.test(q),
    needsTransactions: /trade|waiver|add|drop|faab|claim|pickup|transaction/.test(q),
    needsCustom: /trophy|award|punishment|custom|record/.test(q),
    needsRosters: /roster|lineup|start|bench|sit|play/.test(q),
    seasonFilter: extractSeasonFromQuery(q),
    weekFilter: extractWeekFromQuery(q),
    ownerFilter: extractOwnersFromQuery(q)
  };
}
```

### 3B: Query Engine

**Add to `backend/src/services/leagueIntelligenceService.js`:**

```javascript
const LEAGUE_QUERY_SYSTEM_PROMPT = `
You are the Clutch League Intelligence engine. You answer questions about a specific
fantasy sports league using ONLY the data provided to you. You have access to the
league's complete history including standings, matchups, drafts, transactions, records,
and any custom data the commissioner has imported.

CRITICAL RULES:
1. ONLY use data provided in the context. NEVER make up stats or records.
2. If the data doesn't contain the answer, say so clearly: "I don't have that data for your league."
3. Be specific — use actual numbers, actual names, actual seasons.
4. Be conversational — this is used during arguments between league mates.
   Light trash talk is encouraged when the data supports it.
5. When comparing two owners, present both sides fairly but don't be afraid to
   declare a winner if the data clearly supports one.
6. Always cite the source: "Based on your Yahoo import data" or "From your league records"
7. If the user asks "me" or "my", resolve their identity from the owner mapping.
8. Keep answers concise but complete. Lead with the answer, then provide context.
9. Format numbers for readability (1,842.5 not 1842.5).
10. For multi-season comparisons, show the data per season AND the aggregate.

OUTPUT FORMAT: Return a JSON object:
{
  "answer": "The natural language response",
  "data": { ... relevant stats used in the answer ... },
  "sources": ["yahoo_import", "custom_data", "clutch_live"],
  "suggestedFollowUps": ["What about playoff record?", "Who has the most championships?"]
}
`;

async function queryLeague(userId, leagueId, question) {
  // 1. Resolve the asking user's identity in this league
  const userOwnerInfo = await resolveOwnerIdentity(userId, leagueId);

  // 2. Build targeted context based on the question
  const context = await buildLeagueContext(leagueId, question);

  // 3. Add user identity to context so AI can resolve "me" and "my"
  context.askingUser = userOwnerInfo;

  // 4. Call Claude with the league context and question
  const response = await claudeService.generateCompletion(
    LEAGUE_QUERY_SYSTEM_PROMPT,
    JSON.stringify({
      question,
      leagueContext: context
    }),
    {
      model: 'claude-sonnet-4-5-20250929', // Sonnet for speed — these should feel instant
      maxTokens: 1000
    }
  );

  // 5. Parse and validate response
  const parsed = JSON.parse(response);

  // 6. Log the query for analytics and improvement
  await logLeagueQuery(userId, leagueId, question, parsed);

  return parsed;
}

async function resolveOwnerIdentity(userId, leagueId) {
  // Find this user's team(s) in the league — current and historical
  // Returns: { currentTeamName, ownerName, historicalTeams: [...], seasonsActive }
  // This allows the AI to resolve "me", "my team", "my record", etc.
}
```

### 3C: Conversation History

League queries should support follow-up questions. "Who has the most championships?" → "What about in the last 3 years?" → "And how does their playoff record compare?"

**Schema:**

```prisma
model LeagueQuerySession {
  id          String   @id @default(cuid())
  userId      String
  leagueId    String
  messages    Json     // Array of { role: "user"|"assistant", content, timestamp }
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  expiresAt   DateTime // Sessions expire after 24 hours

  user        User     @relation(fields: [userId], references: [id])
  league      League   @relation(fields: [leagueId], references: [id])

  @@index([userId, leagueId])
}
```

**Implementation:**

```javascript
async function queryLeagueWithHistory(userId, leagueId, question, sessionId?) {
  // If sessionId provided, load conversation history
  let messages = [];
  if (sessionId) {
    const session = await getSession(sessionId);
    messages = session?.messages || [];
  }

  // Add new question
  messages.push({ role: "user", content: question, timestamp: new Date() });

  // Build context (use the latest question + conversation history for context)
  const context = await buildLeagueContext(leagueId, question);
  context.conversationHistory = messages.slice(-10); // Keep last 10 messages for context
  context.askingUser = await resolveOwnerIdentity(userId, leagueId);

  // Call Claude with full conversation context
  const response = await claudeService.generateCompletion(
    LEAGUE_QUERY_SYSTEM_PROMPT,
    JSON.stringify({ question, leagueContext: context, conversationHistory: context.conversationHistory }),
    { model: 'claude-sonnet-4-5-20250929', maxTokens: 1000 }
  );

  const parsed = JSON.parse(response);

  // Add response to history
  messages.push({ role: "assistant", content: parsed.answer, timestamp: new Date() });

  // Save/update session
  const session = await upsertSession(userId, leagueId, sessionId, messages);

  return { ...parsed, sessionId: session.id };
}
```

**Migration 37: league_query_sessions**
```sql
CREATE TABLE "LeagueQuerySession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "messages" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("userId") REFERENCES "User"("id"),
  FOREIGN KEY ("leagueId") REFERENCES "League"("id")
);
CREATE INDEX "idx_query_session_user_league" ON "LeagueQuerySession"("userId", "leagueId");
```

### 3D: API Routes

```
POST   /api/ai/league-query        — Body: { leagueId, question, sessionId? }
                                      Returns: { answer, data, sources, suggestedFollowUps, sessionId }
GET    /api/ai/league-query/sessions — Get user's recent query sessions
DELETE /api/ai/league-query/sessions/:id — Delete a session
```

**Rate limits:**
| Tier | Limit |
|---|---|
| Free | 10 queries/day per league |
| Premium | 50 queries/day per league |

### 3E: Frontend — League Chat Interface

This is a chat component that appears in multiple places. Build it as a reusable component.

**New file: `frontend/src/components/ai/LeagueChat.jsx`**

```
Design:
- Floating action button (bottom-right) with a brain/chat icon — same position pattern as FloatingCaptureButton
- Tap to expand into a chat drawer (slides up from bottom on mobile, slides in from right on desktop)
- Chat interface:
  - Message history (scrollable)
  - Input field at bottom with send button
  - Suggested queries shown as tappable chips above the input when chat is empty or after each response
  - "Powered by League Intelligence" badge
  - Session indicator: "Conversation • [X] messages"
  - New conversation button (clears session)
- Each AI response shows:
  - The natural language answer
  - A small "Sources: Yahoo Import, League Records" tag
  - Suggested follow-up chips

Suggested query chips (context-aware):
  On League Home:
    "Who's the all-time points leader?"
    "What's the head-to-head record between [owner A] and [owner B]?"
    "Who has the most championships?"

  On League Vault:
    "What's the closest game in league history?"
    "Who's had the best draft pick of all time?"
    "What are the all-time records?"

  On Matchup page:
    "What's my record against [this week's opponent]?"
    "How do we compare in playoff appearances?"

  On Standings page:
    "Who's the most consistent team this season?"
    "What's the highest points scored this week across all seasons?"
```

**Where it appears:**

| Page | How It Appears | Context |
|---|---|---|
| `/leagues/:id` (League Home) | Floating chat button (bottom-right) | Full league context |
| `/leagues/:id/vault` (League Vault) | Floating chat button + inline "Ask about this" on record rows | Records-focused context |
| `/leagues/:id/standings` | Floating chat button | Standings-focused context |
| `/leagues/:id/matchups` | Floating chat button | Matchup-focused context |
| `/dashboard` | "Ask about your leagues" card (if user has imported leagues) | Multi-league — user picks which league |

**IMPORTANT UX details:**
- The chat button should NOT conflict with the FloatingCaptureButton. If both are on screen:
  - Capture button stays bottom-right
  - League chat button goes bottom-right but stacked above the capture button
  - Or: capture button is bottom-right, league chat is bottom-left
  - Pick whichever feels better — just don't overlap
- Chat drawer should be dismissable (tap outside, swipe down on mobile, Escape key)
- Chat should persist within a session. If user closes the drawer and reopens it, the conversation is still there.
- On mobile, the chat drawer should take up ~70% of screen height, not full screen
- Loading state: show a typing indicator while AI processes

### 3F: Pre-Computed League Stats Cache

To keep query response times fast, pre-compute common league stats that get asked about frequently.

**New file: `backend/src/services/leagueStatsCache.js`**

```javascript
async function computeLeagueStats(leagueId) {
  // Pre-compute and cache commonly queried stats
  // Run after import completion and weekly during active seasons

  return {
    allTimeStandings: {
      // Owner, total wins, total losses, total PF, total PA, championships, playoff appearances
      // Sorted by wins
    },
    headToHeadMatrix: {
      // Every owner vs every other owner: wins, losses, total margin
    },
    records: {
      highestWeekScore: { owner, score, season, week },
      lowestWeekScore: { owner, score, season, week },
      biggestBlowout: { winner, loser, margin, season, week },
      closestGame: { winner, loser, margin, season, week },
      longestWinStreak: { owner, streak, seasons },
      longestLoseStreak: { owner, streak, seasons },
      mostPointsInSeason: { owner, points, season },
      fewestPointsInSeason: { owner, points, season },
      bestRegularSeasonRecord: { owner, wins, losses, season },
      worstRegularSeasonRecord: { owner, wins, losses, season },
      mostTransactionsInSeason: { owner, count, season },
      bestDraftPick: { owner, player, round, finishRank, season }, // lowest round, highest finish
      worstDraftPick: { owner, player, round, finishRank, season }, // highest round, lowest finish
    },
    seasonSummaries: {
      // Per season: champion, runner-up, sacko, highest scorer, best record, most trades
    },
    activeStreaks: {
      // Current winning streaks, playoff appearance streaks, championship droughts
    }
  };
}
```

**Store in a cache table or use the existing `LabInsightCache` pattern:**

```prisma
model LeagueStatsCache {
  id          String   @id @default(cuid())
  leagueId    String   @unique
  stats       Json     // Full computed stats object
  computedAt  DateTime @default(now())
  expiresAt   DateTime

  league      League   @relation(fields: [leagueId], references: [id])
}
```

**When the league intelligence query runs, load from cache first.** Only query raw tables if the cache doesn't have the answer or if the query is about something unusual.

**Migration 38: league_stats_cache**
```sql
CREATE TABLE "LeagueStatsCache" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL UNIQUE,
  "stats" JSONB NOT NULL,
  "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("leagueId") REFERENCES "League"("id")
);
```

**Cron job:** Weekly Tuesday 3 AM — recompute stats for all active leagues with import data.
**On-demand:** Recompute after any import completes or after weekly scoring updates.

### Phase 3 Verification Checklist
- [ ] League context builder assembles data from platform imports + custom data + live Clutch data
- [ ] Query classification correctly identifies what data to load (doesn't over-fetch)
- [ ] AI correctly resolves "me"/"my" to the asking user's teams
- [ ] AI answers questions using ONLY provided data (no hallucinated stats)
- [ ] Conversation history works for follow-up questions
- [ ] Suggested follow-up queries appear after each response
- [ ] LeagueChat component renders correctly on all league pages
- [ ] Chat button doesn't conflict with FloatingCaptureButton
- [ ] Chat drawer is dismissable and persists conversation within session
- [ ] Pre-computed league stats cache is populated and used for fast responses
- [ ] Rate limiting works (10/day free, 50/day premium)
- [ ] Works on mobile (drawer takes ~70% height, not full screen)
- [ ] Build clean, no console errors

---

## MIGRATION SUMMARY

| Migration | Part | Purpose |
|---|---|---|
| 36: custom_league_data | 2 | CustomLeagueData model for spreadsheet/website imports |
| 37: league_query_sessions | 3 | LeagueQuerySession for conversational history |
| 38: league_stats_cache | 3 | LeagueStatsCache for pre-computed league stats |

---

## NEW FILES SUMMARY

| File | Part | Purpose |
|---|---|---|
| `docs/PLATFORM_DATA_MAP.md` | 1 | Reference document for all platform data availability |
| `backend/src/services/customDataImport.js` | 2 | Spreadsheet + website import pipeline |
| `backend/src/services/leagueIntelligenceService.js` | 3 | League query engine + context builder |
| `backend/src/services/leagueStatsCache.js` | 3 | Pre-computed league stats |
| `frontend/src/components/ai/LeagueChat.jsx` | 3 | Reusable league chat component |

---

## HOW THIS CONNECTS TO EVERYTHING ELSE

```
CLUTCH_AI_ENGINE_SPEC.md
├── Phase 6A: Data Gap Fixes ✅ (prerequisite)
├── Phase 6B: Pattern Engine ← historicalPatternService feeds into this
├── Phase 6C: Ambient Intelligence ← Import insights feed into this
├── Phase 6D: Contextual Coaching ← League query data enriches coaching
├── Phase 6E: Deep Reports ← Import Summary Report is a Deep Report
└── Phase 6F: Scout + Sim

CLUTCH_IMPORT_INTELLIGENCE_SPEC.md
├── Phase 1: Yahoo Import Hardening ← This addendum's Part 1 extends capture
├── Phase 2: Historical Pattern Extraction
├── Phase 3: Import-to-Intelligence Bridge
├── Phase 4: Pattern Engine Integration
└── Phase 5: Import UX Polish

THIS ADDENDUM
├── Part 1: Maximum data capture from ALL platforms
├── Part 2: Custom data import (spreadsheets + websites)
├── Part 3: Conversational league intelligence (query engine + chat UI)
└── Part 4: Opinion timeline bridge (imports → Decision Graph → coaching loop)
```

The conversational league intelligence is a NEW AI touchpoint that doesn't exist in the original AI Engine spec. It lives alongside the coaching engine but serves a different purpose — it's about league history and rivalry, not personal improvement. Both use the same Claude API wrapper and the same data infrastructure, but the system prompts and use cases are distinct.

---

## PART 4: OPINION TIMELINE BRIDGE (CLOSING THE FEEDBACK LOOP)

### The Problem

The AI Engine spec (Phase 6A-5) creates the `PlayerOpinionEvent` table and hooks into live platform actions — captures, board moves, draft picks, predictions, waivers, trades, lineups — to build a per-user opinion timeline for every player. But imported historical data doesn't generate these events. That means a user with 5 imported seasons has a rich pattern engine profile but an EMPTY opinion timeline. The Decision Graph (the core data structure the AI reads to tell the *story* of a user's relationship with a player) has no imported history in it.

### The Fix

**When processing historical imports, generate `PlayerOpinionEvent` records for every decision-point action.** This populates the opinion timeline with historical behavior so the Decision Graph has depth for imported users.

### 4A: Import-to-Opinion-Timeline Hooks

**Modify: the import processing pipeline (wherever HistoricalDraft, HistoricalRoster, HistoricalTransaction records are created)**

After storing each historical record in its granular table, also create corresponding `PlayerOpinionEvent` records:

```javascript
// In the draft import processing:
async function processHistoricalDraft(leagueId, userId, seasonYear, picks) {
  // ... existing logic to store HistoricalDraft ...

  // Generate opinion events for each pick
  for (const pick of picks) {
    if (!pick.playerId || !userId) continue; // skip if no player match or no claimed owner

    await opinionTimelineService.recordEvent(
      userId,
      pick.playerId,
      'nfl', // or detect sport
      'DRAFT_PICK',
      {
        round: pick.round,
        pick: pick.pick,
        auctionAmount: pick.auctionAmount || null,
        pickTag: null,            // No pick tags from imports — behavioral data only
        boardRank: null,          // No board data from imports
        dataSource: 'yahoo_import',
        season: seasonYear,
        leagueName: pick.leagueName || null
      },
      null, // sourceId — no direct reference
      'HistoricalDraft',
      // Use a synthetic timestamp: draft day of that season (approximate)
      new Date(`${seasonYear}-09-01T12:00:00Z`) // Approximate draft date
    );
  }
}

// In the transaction import processing:
async function processHistoricalTransactions(leagueId, userId, seasonYear, transactions) {
  // ... existing logic to store HistoricalTransaction ...

  for (const txn of transactions) {
    if (!userId) continue;

    // Generate events for added players
    if (txn.playersAdded) {
      for (const player of txn.playersAdded) {
        if (!player.playerId) continue;

        const eventType = txn.transactionType === 'TRADE' ? 'TRADE_ACQUIRE' :
                          txn.transactionType === 'WAIVER_CLAIM' ? 'WAIVER_ADD' :
                          'WAIVER_ADD'; // free agent adds also count

        await opinionTimelineService.recordEvent(
          userId,
          player.playerId,
          'nfl',
          eventType,
          {
            transactionType: txn.transactionType,
            faabAmount: txn.faabAmount || null,
            tradePartner: txn.tradePartnerKey || null,
            note: null,             // No reasoning from imports
            dataSource: 'yahoo_import',
            season: seasonYear,
            week: txn.week
          },
          null,
          'HistoricalTransaction',
          txn.timestamp || new Date(`${seasonYear}-10-01T12:00:00Z`)
        );
      }
    }

    // Generate events for dropped players
    if (txn.playersDropped) {
      for (const player of txn.playersDropped) {
        if (!player.playerId) continue;

        const eventType = txn.transactionType === 'TRADE' ? 'TRADE_AWAY' : 'WAIVER_DROP';

        await opinionTimelineService.recordEvent(
          userId,
          player.playerId,
          'nfl',
          eventType,
          {
            transactionType: txn.transactionType,
            dataSource: 'yahoo_import',
            season: seasonYear,
            week: txn.week
          },
          null,
          'HistoricalTransaction',
          txn.timestamp || new Date(`${seasonYear}-10-01T12:00:00Z`)
        );
      }
    }
  }
}

// In the roster import processing (selective — only for significant events):
async function processHistoricalRosters(leagueId, userId, seasonYear, weeklyRosters) {
  // ... existing logic to store HistoricalRoster ...

  // DON'T generate opinion events for every start/bench decision across every week
  // of every season — that would be thousands of events and mostly noise.
  //
  // Instead, generate events only for NOTABLE lineup decisions:
  // 1. The first time a player appears in the starting lineup (LINEUP_START)
  // 2. When a player is benched after being a consistent starter (LINEUP_BENCH)
  //
  // These are detected by comparing consecutive weeks:

  for (let i = 1; i < weeklyRosters.length; i++) {
    const prevWeek = weeklyRosters[i - 1];
    const currWeek = weeklyRosters[i];

    if (!userId) continue;

    // Find players who moved from bench to starter
    const newStarters = findNewStarters(prevWeek, currWeek);
    for (const player of newStarters) {
      // Only log if player was on bench for 2+ weeks before being promoted
      // This filters out bye-week shuffles
      if (wasOnBenchConsecutiveWeeks(player.playerId, weeklyRosters, i, 2)) {
        await opinionTimelineService.recordEvent(
          userId,
          player.playerId,
          'nfl',
          'LINEUP_START',
          {
            week: currWeek.week,
            slot: player.slot,
            dataSource: 'yahoo_import',
            season: seasonYear
          },
          null,
          'HistoricalRoster',
          new Date(`${seasonYear}-09-${7 + (currWeek.week * 7)}T13:00:00Z`) // Approximate game day
        );
      }
    }

    // Find players who moved from starter to bench (and it wasn't bye week)
    const newBenched = findNewlyBenched(prevWeek, currWeek);
    for (const player of newBenched) {
      if (!isOnBye(player.playerId, currWeek.week, seasonYear)) {
        await opinionTimelineService.recordEvent(
          userId,
          player.playerId,
          'nfl',
          'LINEUP_BENCH',
          {
            week: currWeek.week,
            previousSlot: player.previousSlot,
            dataSource: 'yahoo_import',
            season: seasonYear
          },
          null,
          'HistoricalRoster',
          new Date(`${seasonYear}-09-${7 + (currWeek.week * 7)}T13:00:00Z`)
        );
      }
    }
  }
}
```

### 4B: Data Source Tagging

**CRITICAL:** Every `PlayerOpinionEvent` generated from imported data MUST include `dataSource: '[platform]_import'` in its `eventData` JSON. This allows the AI to distinguish between:
- Imported behavioral data (what you did — no reasoning attached)
- Live Clutch data (what you did AND why — reasoning, tags, captures attached)

The AI coaching should use this distinction:
- "Based on your Yahoo history, you've drafted 3 backup RBs in round 8+ across 4 seasons. None became starters." (behavioral pattern from import)
- "You tagged De'Von Achane as a Sleeper in March and drafted him in Round 4 — your instinct was right, he finished RB6." (reasoning + behavior + outcome from live Clutch data)

When the AI only has imported data, it should encourage the user to add reasoning on Clutch: "We can see your draft patterns, but not your reasoning. Start using Lab captures and pick tags so we can give you deeper coaching on *why* your patterns work or don't."

### 4C: League Intelligence → Coaching Bridge

The conversational league intelligence (Part 3) should be able to tap into coaching insights when relevant. When a user asks a league rivalry question, the system can optionally enrich the answer with coaching context.

**Modify the league query system prompt to include an optional coaching connection:**

```
When answering comparative questions between two owners (e.g., "Who performs
better in the playoffs?"), you may OPTIONALLY add a brief coaching note if the
data supports it. For example:

Query: "How does RJ perform in the playoffs vs Nick?"
Answer: "Nick has a 9-4 playoff record compared to RJ's 3-8. Nick averages 
128.4 points in playoff weeks vs RJ's 109.2."
Coaching bridge: "RJ's playoff struggles may be lineup-related — his points 
left on bench increase by 40% in playoff weeks compared to regular season, 
suggesting pressure-based decision-making that hurts performance."

This coaching bridge should ONLY appear when:
1. The data clearly supports it (roster data shows the pattern)
2. The asking user is one of the people being compared
3. The insight is genuinely useful, not generic

Do NOT add coaching bridges to every answer. Most league queries are about 
facts and bragging rights — keep them fun. Save coaching for moments where 
the data reveals something the user would genuinely want to know.
```

### Phase 4 Verification Checklist
- [ ] Historical draft picks generate `PlayerOpinionEvent` records with type `DRAFT_PICK`
- [ ] Historical waiver claims generate events with type `WAIVER_ADD`
- [ ] Historical trades generate events with types `TRADE_ACQUIRE` and `TRADE_AWAY`
- [ ] Historical roster drops generate events with type `WAIVER_DROP`
- [ ] Significant lineup changes generate `LINEUP_START` and `LINEUP_BENCH` events (filtered, not every week)
- [ ] ALL imported opinion events include `dataSource: '[platform]_import'` in eventData
- [ ] Opinion events use approximate historical timestamps (not current date)
- [ ] Decision Graph (`getPlayerGraph`) returns imported events alongside live events
- [ ] The AI distinguishes between imported behavioral data and live reasoning data in its coaching
- [ ] League intelligence conversational queries include optional coaching bridges when relevant
- [ ] Import-generated events are fire-and-forget (don't block import processing on opinion event failures)
- [ ] Build clean, no console errors

---

## CRITICAL IMPLEMENTATION NOTES

1. **Raw data preservation is non-negotiable.** Every API response, every uploaded spreadsheet, every crawled webpage gets stored in RawProviderData before ANY processing. This is insurance against future requirements.

2. **The AI column mapping for spreadsheets needs to be impressive.** Commissioners will test it with weird column names and messy data. Use 3-5 sample rows (not just headers) to give the AI enough context. Show confidence levels so users know when to override.

3. **Website crawling must be respectful.** 1 request/second max, robots.txt compliance, max 20 pages. If a site blocks crawling, fail gracefully and suggest the commissioner export data manually.

4. **The conversational query engine must NEVER hallucinate.** This is the highest-stakes AI feature on the platform because users will immediately verify answers against their own records. If the AI says "Eric has 12,483 all-time points" and Eric knows it's 12,291, trust is destroyed. The system prompt must be extremely strict about only using provided data.

5. **League chat is a premium conversion tool.** Free users get 10 queries/day — enough to experience the magic. Premium removes the cap. This is the feature league group chats will use during arguments. "Hold on, let me ask Clutch..." becomes the catchphrase.

6. **Multi-league support matters.** Users play in multiple leagues. The chat must be scoped to a specific league. On the dashboard, if a user has multiple imported leagues, let them pick which one to query.

7. **The suggested follow-up queries are critical UX.** Most users won't know what to ask. The suggested chips teach them what's possible and drive engagement. Make them contextual — different suggestions on the standings page vs the vault page vs after a specific answer.

---

*This addendum extends CLUTCH_IMPORT_INTELLIGENCE_SPEC.md. Build Parts 1-4 in order after the core import pipeline is functional. Part 3 (conversational intelligence) is the user-facing wow feature — Parts 1 and 2 ensure it has rich data to work with. Part 4 closes the loop between imported history and the AI coaching engine's Decision Graph.*

*Document version: 1.1*
*Updated: February 11, 2026 — Added Part 4: Opinion Timeline Bridge*
