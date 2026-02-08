# NFL Data Sync Status (Feb 8, 2026)

> This file exists so Claude Code on any machine has context. Delete when NFL-4 is complete.

## What's Done
- **nflSync.js** fully optimized: batched $transaction upserts (50x faster than individual queries)
- **nflClient.js** URLs fixed: `schedules/games.csv` (not `schedules.csv`)
- **Team abbreviation normalization**: `LA→LAR`, `OAK→LV`, `SD→LAC`, `STL→LAR`, `WSH→WAS`
- **Player filtering**: Only active roster QB/RB/WR/TE/K (~850 players, not 7500+)
- **DST records**: 32 team defense "player" records auto-created during syncPlayers
- **2024 season data synced to Railway**: 850 players + 32 DST + 285 games + 5,174 stat rows
- **LeagueHome.jsx bug fixed**: moved isNflLeague declaration above useEffects (was causing blank screen)
- **LeagueCard.jsx**: split single badge into two separate sport + format icon badges

## What's NOT Done (NFL-4 remaining work)

### Data Issues (priority order)
1. **Need 2025 season data** — We synced 2024 (last year). The 2025 NFL season is current (Super Bowl LX is today Feb 8 2026). `player_stats_2025.csv` returned 404 earlier — recheck, may be available now
2. **Kicker stats missing** — nflverse `player_stats` CSV has passing/rushing/receiving but NOT kicking (FG, XP). Need separate data source. Check nflverse releases for a `kicking` tag
3. **DST stats missing** — 32 DST player records exist but have zero NflPlayerGame rows. Team defense stats not in player_stats CSV. Need team-level data
4. **Season selector needed** — Frontend needs a year dropdown so users can switch between 2024/2025/etc

### Frontend Polish Needed
1. **All columns sortable** — Currently only FPTS column is sortable. Make every stat column header clickable
2. **FPTS decimal formatting** — Always show 1 decimal place (98.0 not 98)
3. **Season dropdown** — Add year selector in filter bar next to scoring type

## nflverse Column Name Gotchas
- Player team field: `latest_team` (NOT `team_abbr`)
- College: `college_name` (NOT `college`)
- Headshot: `headshot` (NOT `headshot_url`)
- Status values: `ACT` (active in-season), `RES` (reserved/offseason), `RET`, `CUT`, `SUS`, `INA`, `DEV`
- nflverse uses `LA` for Rams — normalizeTeamAbbr() in nflSync.js maps it to `LAR`

## How to Run NFL Sync Manually
```bash
cd ~/Desktop/Golf/backend
DATABASE_URL="postgresql://postgres:sGxxdJfAbPZFdnSgKpLmyuApUukFJOng@switchback.proxy.rlwy.net:18528/railway" node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const nflSync = require('./src/services/nflSync');
(async () => {
  const p = await nflSync.syncPlayers(prisma);
  console.log('Players:', p);
  const s = await nflSync.syncSchedule(prisma, 2025);
  console.log('Schedule:', s);
  const st = await nflSync.syncWeeklyStats(prisma, 2025);
  console.log('Stats:', st);
  const r = await nflSync.syncRosters(prisma, 2025);
  console.log('Rosters:', r);
  await prisma.\$disconnect();
})();
"
```

## Key Files
- `backend/src/services/nflSync.js` — All 5 sync functions (batched)
- `backend/src/services/nflClient.js` — nflverse CSV fetcher
- `backend/src/routes/nfl.js` — GET /api/nfl/players (aggregates stats)
- `frontend/src/pages/NflPlayers.jsx` — NFL players table UI
- `frontend/src/services/api.js` — getNflPlayers() (~line 731)
