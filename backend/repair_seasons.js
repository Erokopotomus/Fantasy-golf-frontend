/**
 * Repair script: Re-parse stored raw Yahoo data for 2010-2012 seasons
 * and replace the broken 1-team records with the full 12-team data.
 *
 * No Yahoo OAuth needed — uses raw data already stored in RawProviderData.
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const LEAGUE_ID = 'cmlkzxdcr00itsz2t7ys484og' // Bro Montana
const YEARS_TO_FIX = [2010, 2011, 2012]

// Yahoo event refs for each year (from raw data audit)
const YEAR_EVENT_REFS = {
  2010: '242.l.263452',
  2011: '257.l.530973',
  2012: '273.l.104807',
}

function parseTeamsFromRaw(payload) {
  const data = typeof payload === 'string' ? JSON.parse(payload) : payload
  const league = data?.fantasy_content?.league
  const standingsArr = Array.isArray(league) ? league[1]?.standings : league?.standings
  const teams = standingsArr?.[0]?.teams || standingsArr?.teams || {}
  const teamEntries = typeof teams === 'object' ? Object.values(teams) : []

  const parsed = []
  for (const entry of teamEntries) {
    const teamArr = entry?.team
    if (!teamArr || !Array.isArray(teamArr)) continue

    const metaFields = Array.isArray(teamArr[0]) ? teamArr[0] : [teamArr[0]]
    const teamMeta = {}
    for (const f of metaFields) {
      if (f && typeof f === 'object') Object.assign(teamMeta, f)
    }
    if (!teamMeta.team_key) continue

    // Find standings
    let standings = null
    for (let j = 1; j < teamArr.length; j++) {
      if (teamArr[j]?.team_standings) {
        standings = teamArr[j].team_standings
        break
      }
    }

    const outcomes = standings?.outcome_totals
    const managers = teamMeta.managers || []
    const manager = Array.isArray(managers) ? managers[0]?.manager : managers.manager

    // Use team name as owner name (managers are --hidden-- for old seasons)
    const ownerName = (manager?.nickname && manager.nickname !== '--hidden--')
      ? manager.nickname
      : (teamMeta.name || manager?.guid || `Team ${teamMeta.team_id}`)

    parsed.push({
      teamName: teamMeta.name,
      ownerName,
      teamId: teamMeta.team_id,
      wins: parseInt(outcomes?.wins || 0),
      losses: parseInt(outcomes?.losses || 0),
      ties: parseInt(outcomes?.ties || 0),
      pointsFor: parseFloat(standings?.points_for || 0),
      pointsAgainst: parseFloat(standings?.points_against || 0),
      rank: parseInt(standings?.rank || 99),
      playoffSeed: standings?.playoff_seed || null,
    })
  }

  parsed.sort((a, b) => a.rank - b.rank)
  return parsed
}

async function main() {
  // Find the import record
  const importRecord = await prisma.leagueImport.findFirst({
    where: { clutchLeagueId: LEAGUE_ID, sourcePlatform: 'yahoo' },
    select: { id: true },
  })
  console.log('Import record:', importRecord?.id)

  for (const year of YEARS_TO_FIX) {
    const eventRef = YEAR_EVENT_REFS[year]
    console.log(`\n--- ${year} (${eventRef}) ---`)

    // Get raw data
    const raw = await prisma.rawProviderData.findFirst({
      where: { provider: 'yahoo', dataType: 'standings', eventRef },
      select: { payload: true },
    })

    if (!raw) {
      console.log(`  No raw data found for ${year}! Skipping.`)
      continue
    }

    const teams = parseTeamsFromRaw(raw.payload)
    console.log(`  Parsed ${teams.length} teams from raw data`)

    if (teams.length === 0) {
      console.log(`  No teams parsed! Skipping.`)
      continue
    }

    // Show what we found
    for (const t of teams) {
      console.log(`    ${t.rank}. ${t.ownerName} (${t.teamName}) ${t.wins}-${t.losses} PF:${t.pointsFor}`)
    }

    // Delete existing bad data
    const deleted = await prisma.historicalSeason.deleteMany({
      where: { leagueId: LEAGUE_ID, seasonYear: year },
    })
    console.log(`  Deleted ${deleted.count} existing record(s)`)

    // Determine playoff results from rank
    const playoffResults = {}
    for (const t of teams) {
      if (t.rank === 1) playoffResults[t.teamId] = 'champion'
      else if (t.rank === 2) playoffResults[t.teamId] = 'runner_up'
      else if (t.playoffSeed) playoffResults[t.teamId] = 'eliminated'
      else playoffResults[t.teamId] = 'missed'
    }

    // Insert all teams
    let savedCount = 0
    for (const team of teams) {
      try {
        await prisma.historicalSeason.create({
          data: {
            leagueId: LEAGUE_ID,
            importId: importRecord?.id || null,
            seasonYear: year,
            teamName: team.teamName,
            ownerName: team.ownerName,
            finalStanding: team.rank,
            wins: team.wins,
            losses: team.losses,
            ties: team.ties,
            pointsFor: team.pointsFor,
            pointsAgainst: team.pointsAgainst,
            playoffResult: playoffResults[team.teamId] || null,
            draftData: null,
            rosterData: {},
            weeklyScores: [],
            transactions: null,
          },
        })
        savedCount++
      } catch (err) {
        console.error(`  FAILED to save ${team.ownerName}:`, err.message)
      }
    }
    console.log(`  Saved ${savedCount}/${teams.length} teams`)
  }

  // Final verification
  console.log('\n--- Verification ---')
  for (const year of YEARS_TO_FIX) {
    const count = await prisma.historicalSeason.count({
      where: { leagueId: LEAGUE_ID, seasonYear: year },
    })
    console.log(`  ${year}: ${count} teams`)
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
