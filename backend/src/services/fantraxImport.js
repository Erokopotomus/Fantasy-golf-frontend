/**
 * Fantrax Import Service (Enhanced)
 *
 * Imports league history from Fantrax via CSV upload.
 * Fantrax has no public API — the primary import mechanism is:
 *   1. User exports standings/roster CSV from Fantrax
 *   2. User uploads the CSV to Clutch
 *   3. We parse and import the data
 *
 * Enhancements:
 * - Raw CSV text stored in RawProviderData before normalization
 *
 * Note: No opinion timeline bridge for Fantrax — draft data uses player names
 * not IDs, so we can't reliably link to PlayerOpinionEvent without name resolution.
 *
 * CSV format varies by export type but generally includes:
 *   Standings: Team, W, L, T, PF, PA, GB, Streak
 *   Draft: Round, Pick, Team, Player, Position
 */

const prisma = require('../lib/prisma.js')

/**
 * Store raw CSV data in RawProviderData before normalization.
 */
async function storeRawCSV(dataType, leagueName, seasonYear, csvText) {
  try {
    await prisma.rawProviderData.create({
      data: {
        provider: 'fantrax',
        dataType,
        eventRef: leagueName || 'csv-upload',
        payload: { csvText, charCount: csvText.length },
        recordCount: csvText.split('\n').length - 1,
        processedAt: null,
      },
    })
  } catch (err) {
    console.error(`[FantraxImport] Failed to store raw ${dataType}:`, err.message)
  }
}

/**
 * Parse a Fantrax standings CSV string into structured data.
 * Handles common Fantrax CSV formats.
 */
function parseStandingsCSV(csvText) {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) throw new Error('CSV file appears empty')

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))

  // Find column indices — Fantrax uses various column names
  const findCol = (...names) => headers.findIndex(h => names.some(n => h.includes(n)))

  const teamCol = findCol('team', 'manager', 'owner', 'name')
  const winsCol = findCol('w', 'wins', 'win')
  const lossesCol = findCol('l', 'losses', 'loss')
  const tiesCol = findCol('t', 'ties', 'tie', 'draw')
  const pfCol = findCol('pf', 'points for', 'pts', 'points', 'total points')
  const paCol = findCol('pa', 'points against', 'pts against')
  const rankCol = findCol('rank', '#', 'pos', 'position', 'standing')

  if (teamCol === -1) {
    throw new Error('Could not find team/manager column in CSV. Expected column named "Team", "Manager", or "Owner".')
  }

  const teams = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < 2) continue

    const team = {
      teamName: cols[teamCol]?.replace(/"/g, '').trim() || `Team ${i}`,
      ownerName: cols[teamCol]?.replace(/"/g, '').trim() || `Team ${i}`,
      wins: winsCol >= 0 ? parseInt(cols[winsCol]) || 0 : 0,
      losses: lossesCol >= 0 ? parseInt(cols[lossesCol]) || 0 : 0,
      ties: tiesCol >= 0 ? parseInt(cols[tiesCol]) || 0 : 0,
      pointsFor: pfCol >= 0 ? parseFloat(cols[pfCol]) || 0 : 0,
      pointsAgainst: paCol >= 0 ? parseFloat(cols[paCol]) || 0 : 0,
      rank: rankCol >= 0 ? parseInt(cols[rankCol]) || i : i,
    }
    teams.push(team)
  }

  teams.sort((a, b) => a.rank - b.rank)
  return teams
}

/**
 * Parse a Fantrax draft CSV into structured data.
 */
function parseDraftCSV(csvText) {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return null

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))

  const findCol = (...names) => headers.findIndex(h => names.some(n => h.includes(n)))

  const roundCol = findCol('round', 'rd')
  const pickCol = findCol('pick', 'overall', '#')
  const teamCol = findCol('team', 'manager', 'owner')
  const playerCol = findCol('player', 'name')
  const posCol = findCol('position', 'pos')

  const picks = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < 2) continue

    picks.push({
      round: roundCol >= 0 ? parseInt(cols[roundCol]) || 0 : 0,
      pick: pickCol >= 0 ? parseInt(cols[pickCol]) || i : i,
      teamName: teamCol >= 0 ? cols[teamCol]?.replace(/"/g, '').trim() : null,
      playerName: playerCol >= 0 ? cols[playerCol]?.replace(/"/g, '').trim() : null,
      position: posCol >= 0 ? cols[posCol]?.replace(/"/g, '').trim() : null,
    })
  }

  return { type: 'snake', picks }
}

/**
 * Parse a CSV line, handling quoted fields with commas inside.
 */
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

/**
 * Discovery — parse uploaded CSV data and return what we found.
 * Unlike API-based imports, this takes the raw CSV text directly.
 */
async function discoverLeague(csvData) {
  const { standingsCSV, seasonYear, leagueName } = csvData

  if (!standingsCSV) {
    throw new Error('Standings CSV is required')
  }

  // Store raw CSV before parsing
  storeRawCSV('standings', leagueName, seasonYear, standingsCSV).catch(() => {})

  const teams = parseStandingsCSV(standingsCSV)

  return {
    name: leagueName || 'Fantrax League',
    sport: 'nfl',
    seasons: [{
      year: seasonYear || new Date().getFullYear(),
      name: leagueName || 'Fantrax League',
      teamCount: teams.length,
      status: 'complete',
    }],
    totalSeasons: 1,
    parsedTeams: teams,
  }
}

/**
 * Import a single Fantrax season from parsed CSV data.
 */
async function importSeason(csvData) {
  const { standingsCSV, draftCSV, seasonYear } = csvData

  const rosters = parseStandingsCSV(standingsCSV)

  // Store raw draft CSV if provided
  if (draftCSV) {
    storeRawCSV('draft', csvData.leagueName, seasonYear, draftCSV).catch(() => {})
  }

  const draftData = draftCSV ? parseDraftCSV(draftCSV) : null

  // No matchup data available from CSV export — build empty
  const playoffResults = {}
  if (rosters.length > 0) {
    playoffResults[0] = 'champion' // Rank 1 = champion
  }

  return {
    seasonYear: seasonYear || new Date().getFullYear(),
    rosters: rosters.map((r, i) => ({
      ...r,
      teamId: i + 1,
    })),
    matchups: {},
    draftData,
    playoffResults: { 1: 'champion' },
  }
}

/**
 * Full import pipeline for Fantrax CSV data.
 *
 * @param {Object} csvData - { standingsCSV, draftCSV?, seasonYear?, leagueName? }
 * @param {string} userId
 * @param {PrismaClient} prisma
 */
async function runFullImport(csvData, userId, prisma, targetLeagueId) {
  const importRecord = await prisma.leagueImport.create({
    data: {
      userId,
      sourcePlatform: 'fantrax',
      sourceLeagueId: csvData.leagueName || 'csv-upload',
      status: 'SCANNING',
    },
  })

  try {
    const discovery = await discoverLeague(csvData)

    await prisma.leagueImport.update({
      where: { id: importRecord.id },
      data: {
        sourceLeagueName: discovery.name,
        seasonsFound: discovery.totalSeasons,
        status: 'IMPORTING',
        progressPct: 30,
      },
    })

    let clutchLeague
    if (targetLeagueId) {
      clutchLeague = await prisma.league.findUnique({ where: { id: targetLeagueId } })
      if (!clutchLeague) throw new Error('Target league not found')
    } else {
      clutchLeague = await prisma.league.findFirst({
        where: {
          ownerId: userId,
          name: { contains: discovery.name, mode: 'insensitive' },
        },
      })

      if (!clutchLeague) {
        clutchLeague = await prisma.league.create({
          data: {
            name: discovery.name || 'Imported from Fantrax',
            sport: 'NFL',
            ownerId: userId,
            status: 'ACTIVE',
            settings: {
              importedFrom: 'fantrax',
            },
          },
        })
      }
    }

    // Ensure importing user is a member of the league
    await prisma.leagueMember.upsert({
      where: { userId_leagueId: { userId, leagueId: clutchLeague.id } },
      create: { userId, leagueId: clutchLeague.id, role: 'OWNER' },
      update: {},
    })

    await prisma.leagueImport.update({
      where: { id: importRecord.id },
      data: { clutchLeagueId: clutchLeague.id },
    })

    const seasonData = await importSeason(csvData)

    for (const roster of seasonData.rosters) {
      const standing = seasonData.rosters.indexOf(roster) + 1

      await prisma.historicalSeason.upsert({
        where: {
          leagueId_seasonYear_ownerName: {
            leagueId: clutchLeague.id,
            seasonYear: seasonData.seasonYear,
            ownerName: roster.ownerName || roster.teamName,
          },
        },
        create: {
          leagueId: clutchLeague.id,
          importId: importRecord.id,
          seasonYear: seasonData.seasonYear,
          teamName: roster.teamName,
          ownerName: roster.ownerName || roster.teamName,
          finalStanding: standing,
          wins: roster.wins,
          losses: roster.losses,
          ties: roster.ties,
          pointsFor: roster.pointsFor,
          pointsAgainst: roster.pointsAgainst,
          playoffResult: standing === 1 ? 'champion' : null,
          draftData: seasonData.draftData,
          rosterData: {},
          weeklyScores: [],
        },
        update: {
          wins: roster.wins,
          losses: roster.losses,
          ties: roster.ties,
          pointsFor: roster.pointsFor,
          pointsAgainst: roster.pointsAgainst,
          playoffResult: standing === 1 ? 'champion' : null,
          draftData: seasonData.draftData,
        },
      })
    }

    // ─── Auto-detect settings + active owners from most recent season ─────
    const settingsMapper = require('./settingsMapper')
    const mostRecentSeason = discovery.seasons[0]
    let detectedSettings = null
    let activeOwners = []

    if (mostRecentSeason) {
      detectedSettings = settingsMapper.mapSettingsForPlatform('fantrax', mostRecentSeason)

      if (!targetLeagueId && detectedSettings && detectedSettings.maxTeams) {
        try {
          await prisma.league.update({
            where: { id: clutchLeague.id },
            data: { maxTeams: detectedSettings.maxTeams, settings: { ...(clutchLeague.settings || {}), importedFrom: 'fantrax' } },
          })
        } catch (e) { /* non-fatal */ }
      }

      try {
        const recentOwners = await prisma.historicalSeason.findMany({
          where: { leagueId: clutchLeague.id, seasonYear: seasonData.seasonYear },
          select: { ownerName: true, teamName: true, wins: true, losses: true, ties: true, playoffResult: true, ownerUserId: true },
          orderBy: { finalStanding: 'asc' },
        })
        activeOwners = recentOwners.map(o => ({
          ownerName: o.ownerName, teamName: o.teamName,
          record: `${o.wins}-${o.losses}${o.ties > 0 ? `-${o.ties}` : ''}`,
          playoffResult: o.playoffResult, claimed: !!o.ownerUserId,
        }))
      } catch (e) { /* non-fatal */ }
    }

    await prisma.leagueImport.update({
      where: { id: importRecord.id },
      data: {
        status: 'COMPLETE',
        progressPct: 100,
        completedAt: new Date(),
        seasonsImported: [seasonData.seasonYear],
      },
    })

    return {
      importId: importRecord.id,
      leagueId: clutchLeague.id,
      leagueName: discovery.name,
      seasonsImported: [seasonData.seasonYear],
      totalSeasons: 1,
      detectedSettings,
      activeOwners,
      settingsApplied: !targetLeagueId,
    }
  } catch (err) {
    await prisma.leagueImport.update({
      where: { id: importRecord.id },
      data: {
        status: 'FAILED',
        errorLog: [{ message: err.message, timestamp: new Date().toISOString() }],
      },
    })
    throw err
  }
}

module.exports = {
  discoverLeague,
  importSeason,
  runFullImport,
  parseStandingsCSV,
  parseDraftCSV,
  parseCSVLine,
}
