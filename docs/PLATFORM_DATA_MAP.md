# Platform Data Availability Map

> **Purpose:** Reference document mapping what each fantasy platform provides, what Clutch currently captures, and remaining gaps.
> **Generated:** February 11, 2026
> **Last Updated:** February 11, 2026 — Yahoo audit complete

---

## Yahoo Fantasy API

**Auth:** OAuth 2.0 (`fspt-r` scope)
**Base URL:** `https://fantasysports.yahooapis.com/fantasy/v2`
**Historical Depth:** 2015+ (game keys mapped per year, leagues keep same ID)

| Data Category | Endpoint | Fields Available | Currently Stored | Status |
|---|---|---|---|---|
| **League Settings** | `/league/{key}/settings` | name, season, num_teams, scoring_type, draft_type, roster_positions, playoff_start_week, waiver_type, waiver_rule, uses_faab, budget (FAAB), trade_end_date, trade_reject_time, max_teams, uses_playoff | name, num_teams, scoring_type, draft_type, roster_positions, playoff_start_week, waiver_type, uses_faab, budget, trade_end_date | CAPTURED |
| **Standings** | `/league/{key}/standings` | team_key, team_name, manager (nickname, guid), wins, losses, ties, points_for, points_against, rank, playoff_seed, streak | All fields captured | CAPTURED |
| **Weekly Scores** | `/league/{key}/scoreboard;week={n}` | team_ids, total_points, is_playoffs, is_consolation, is_tied, winner_team_key, matchup_recap_url | All fields captured | CAPTURED |
| **Draft** | `/league/{key}/draftresults` | round, pick, team_key, player_key, cost (auction), is_keeper | round, pick, team_key, player_key, cost, is_keeper | CAPTURED |
| **Transactions** | `/league/{key}/transactions` | transaction_key, type (add/drop/add_drop/trade/commish), timestamp, status, faab_bid, trade_note, players (key, name, position, source_team, dest_team, move_type) | All fields captured | CAPTURED |
| **Rosters (per-week)** | `/team/{key}/roster;week={n}` | player_key, player_name, position, roster_position (slot), is_starting, bye_week, injury_status, projected_points, actual_points | NOT captured — too API-intensive (12 teams × 17 weeks = 204 calls/season) | GAP — DEFERRED |
| **Player Details** | `/player/{key}` | player_key, full_name, first_name, last_name, team_abbr, position, uniform_number, bye_week, headshot_url, status, injury_note | NOT captured — player names not resolved from keys | GAP — LOW PRIORITY |
| **Record Book** | `/league/{key}` (sub-resources) | all_time_high_score, longest_win_streak, all_time_records | NOT captured — endpoint structure varies | GAP — MEDIUM PRIORITY |
| **Matchup Grades** | Varies | Yahoo sometimes provides start grades | NOT captured | GAP — LOW PRIORITY |

**Raw Data Preservation:** All API responses stored in `RawProviderData` before normalization.

**Opinion Timeline Bridge:** Draft picks → `DRAFT_PICK` events. Transactions → `WAIVER_ADD`, `WAIVER_DROP`, `TRADE_ACQUIRE`, `TRADE_AWAY` events. All tagged with `dataSource: 'yahoo_import'`. Historical timestamps used.

**Notes:**
- Per-week roster fetching deferred due to API call volume (204 calls × N seasons). Will implement as optional "deep scan" feature.
- Player name resolution (playerKey → full_name) deferred. Available from raw data if needed later.
- Yahoo rate limit (HTTP 999) can trigger during large imports — import pipeline handles gracefully.
- Draft results don't include player names directly — must cross-reference via player endpoint.

---

## ESPN Fantasy API

**Auth:** Cookies (espn_s2 + SWID) for private leagues, public leagues work without
**Base URL:** `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{id}`
**Historical Depth:** 2018+ (ESPN deleted pre-2018 data)

| Data Category | Endpoint | Fields Available | Currently Stored | Status |
|---|---|---|---|---|
| **League Settings** | `?view=mSettings` | name, size, scoringPeriodId, settings (roster, scoring, schedule, trade, waiver), draftSettings | name, size, basic settings | PARTIAL |
| **Standings** | `?view=mTeam` | wins, losses, ties, pointsFor, pointsAgainst, streakLength, playoffSeed, draftDayProjectedRank | wins, losses, ties, pointsFor, pointsAgainst, playoffSeed | PARTIAL — missing draftDayProjectedRank, streakLength |
| **Weekly Scores** | `?view=mMatchup` | matchupPeriodId, home/away team ids, home/away scores, winner, playoffTierType | matchup pairs with scores | PARTIAL — missing playoffTierType |
| **Rosters** | `?view=mRoster;week={n}` | playerId, playerName, position, lineupSlotId (slot), acquisitionType, projected, actual | Players per roster | PARTIAL — missing acquisitionType |
| **Draft** | `?view=mDraftDetail` | pickNumber, roundNumber, playerId, teamId, bidAmount, keeper, nominatingTeamId | round, pick, teamId, playerId, playerName, keeper | CAPTURED |
| **Transactions** | Recent activity endpoint | type, bidAmount, date, items (playerId, fromTeamId, toTeamId, type) | NOT captured | GAP |
| **Player Details** | `/players` | id, fullName, proTeamId, defaultPositionId, injuryStatus, seasonOutlook | NOT captured separately | GAP |

**Raw Data Preservation:** NOT YET — needs implementation.

**Notes:**
- ESPN API is undocumented — field names and structure discovered by inspection.
- `draftDayProjectedRank` is ESPN's preseason projection of team finish — valuable for analytics.
- `acquisitionType` on roster entries reveals how each player was acquired (draft/trade/waivers/FA).
- `playoffTierType` distinguishes winners bracket vs consolation bracket.

---

## Sleeper API

**Auth:** None required (public API)
**Base URL:** `https://api.sleeper.app/v1`
**Historical Depth:** All seasons available (walk `previous_league_id` chain)

| Data Category | Endpoint | Fields Available | Currently Stored | Status |
|---|---|---|---|---|
| **League Settings** | `/league/{id}` | name, season, total_rosters, roster_positions, scoring_settings, settings (waiver_type, trade_deadline, etc.) | name, roster_positions, scoring_settings | CAPTURED |
| **Standings** | `/league/{id}` (rosters) | wins, losses, ties, fpts, fpts_against, **ppts (potential points)**, roster | wins, losses, ties, fpts, fpts_against | PARTIAL — missing ppts |
| **Weekly Matchups** | `/league/{id}/matchups/{week}` | roster_id, starters[], players[], points, custom_points | All 18 weeks captured with starters | CAPTURED |
| **Rosters** | Derived from matchups | starters array = started, players minus starters = bench | starters + full player list | CAPTURED |
| **Draft** | `/draft/{draft_id}/picks` | pick_no, round, roster_id, player_id, amount (auction), is_keeper, metadata | round, pick, roster_id, player_id, amount, player_name, position | CAPTURED |
| **Transactions** | `/league/{id}/transactions/{round}` | type (trade/waiver/free_agent), adds, drops, roster_ids, settings (waiver_bid), created | NOT captured | GAP |
| **Player Details** | `/players/nfl` (static file) | player_id, full_name, team, position, age, years_exp, injury_status | Used for name resolution | CAPTURED |
| **Traded Picks** | `/league/{id}/traded_picks` | season, round, roster_id, previous_owner_id | NOT captured | GAP |

**Raw Data Preservation:** NOT YET — needs implementation.

**Notes:**
- `ppts` (potential points) is pre-computed optimal lineup points — free analytics data point.
- `traded_picks` endpoint is critical for dynasty leagues.
- Transaction endpoint uses "round" (week) parameter, need to loop through all weeks.
- `metadata` on draft picks sometimes includes keeper/dynasty metadata.

---

## Fantrax

**Auth:** CSV upload (no official API)
**Historical Depth:** One season per CSV upload

| Data Category | Method | Fields Available | Currently Stored | Status |
|---|---|---|---|---|
| **League Settings** | Inferred from CSV | team names, column headers | name, teamCount | MINIMAL |
| **Standings** | Standings CSV | team, wins, losses, ties, pointsFor, pointsAgainst, rank, roto_points, category_standings | team, wins, losses, ties, pointsFor, pointsAgainst, rank | CAPTURED |
| **Weekly Scores** | Not in standings CSV | week, team, score | NOT available from standings CSV | GAP |
| **Rosters** | Roster CSV export | player, team, position, roster_status, fantasy_points | NOT captured | GAP |
| **Draft** | Draft CSV export | round, pick, team, player, position, keeper, salary | round, pick, teamName, playerName, position | CAPTURED |
| **Transactions** | Transaction CSV export | date, type, team, player_added, player_dropped, claim_amount | NOT captured | GAP |

**Raw Data Preservation:** NOT YET — should store raw CSV text.

**Notes:**
- No API available — all data comes from commissioner CSV exports.
- Need to support multiple CSV types (standings, draft, roster, transactions) for complete import.
- Category/roto scoring format data partially captured.

---

## MFL (MyFantasyLeague)

**Auth:** API key (commissioner credentials)
**Base URL:** `https://api.myfantasyleague.com/{year}/export`
**Historical Depth:** 2000+ (~25 years of data — deepest available)

| Data Category | Endpoint | Fields Available | Currently Stored | Status |
|---|---|---|---|---|
| **League Settings** | `?TYPE=league` | name, baseURL, rosterSize, starters, salaryCapAmount, draftType, nflTeams | name, rosterSize | PARTIAL |
| **Standings** | `?TYPE=leagueStandings` | team_id, wins, losses, ties, pf, pa, powerRank, **allPlayWins, allPlayLosses** | wins, losses, ties, pf, pa | PARTIAL — missing allPlay, powerRank |
| **Weekly Scores** | `?TYPE=weeklyResults&W={week}` | matchup pairs with team_id, score, result, isPlayoff | week, points, opponentPoints | CAPTURED |
| **Rosters** | `?TYPE=rosters&W={week}` | player_id, status (starter/nonstarter/taxisquad/injuredreserve) | player_id, status | CAPTURED |
| **Draft** | `?TYPE=draftResults` | pick, round, player_id, franchise_id, amount, **comments**, timestamp | round, pick, player_id, franchise_id, salary | PARTIAL — missing comments |
| **Transactions** | `?TYPE=transactions` | type, franchise, transaction (adds/drops), amount, timestamp | NOT captured | GAP |
| **Salary/Contract** | `?TYPE=salaries` | player_id, salary, contractYear, contractInfo | Captured in roster data | PARTIAL |
| **Player Details** | `?TYPE=players` | player_id, name, position, team, birthdate, draft_year | Used for name resolution | CAPTURED |
| **Future Draft Picks** | `?TYPE=futureDraftPicks` | year, round, originalOwner, currentOwner | NOT captured | GAP |
| **All-Play Records** | `?TYPE=leagueStandings` | allPlayWins, allPlayLosses | NOT captured | GAP |

**Raw Data Preservation:** NOT YET — needs implementation.

**Notes:**
- MFL uses XML API — responses are parsed via JSON export parameter.
- `allPlayWins`/`allPlayLosses` are pre-computed by MFL — free analytics data.
- `comments` on draft picks can contain commissioner notes.
- `futureDraftPicks` is critical for dynasty leagues — tracks complete pick ownership chain.
- `salaryCapAmount` and salary data enables full contract/salary history.
- Commissioner credentials required — not all users will have API access.

---

## Implementation Priority

### Phase 1 (DONE — Yahoo)
- [x] Yahoo raw data preservation
- [x] Yahoo transactions import
- [x] Yahoo settings enhancement
- [x] Yahoo draft enhancement (cost, is_keeper)
- [x] Yahoo matchup enhancement (playoff flags)
- [x] Yahoo opinion timeline bridge

### Phase 2 (NEXT — Sleeper + ESPN)
- [ ] Sleeper raw data preservation
- [ ] Sleeper transactions import
- [ ] Sleeper `ppts` (potential points) capture
- [ ] Sleeper `traded_picks` capture
- [ ] ESPN raw data preservation
- [ ] ESPN `acquisitionType` capture
- [ ] ESPN `draftDayProjectedRank` capture
- [ ] ESPN `playoffTierType` capture

### Phase 3 (LATER — MFL + Fantrax)
- [ ] MFL `allPlayWins`/`allPlayLosses` capture
- [ ] MFL `futureDraftPicks` capture
- [ ] MFL draft `comments` capture
- [ ] MFL transactions import
- [ ] Fantrax multi-CSV support (roster, transactions)
- [ ] Fantrax raw CSV preservation

### Phase 4 (DEFERRED — Deep Scan)
- [ ] Yahoo per-week roster fetching (optional deep scan mode)
- [ ] Yahoo player name resolution (batch player key lookup)
- [ ] Yahoo record book import
- [ ] ESPN transaction import
