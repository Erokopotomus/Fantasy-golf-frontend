/**
 * Backfill Yahoo Draft Data — ownerName + playerName
 *
 * Fixes two issues in Yahoo-imported historical seasons:
 * 1. Draft picks lack ownerName (only have teamKey like "406.l.643521.t.12")
 * 2. Draft picks lack playerName (Yahoo API returns player keys, not names)
 *
 * Solution:
 * - ownerName: extracted from raw standings data stored in RawProviderData
 * - playerName: resolved via Sleeper's free public player API (which has Yahoo IDs)
 *
 * Usage:
 *   DATABASE_URL="..." node prisma/backfillYahooDraftData.js [--league=LEAGUE_ID]
 *
 * If --league is provided, only backfills that league. Otherwise backfills all Yahoo-imported leagues.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ─── Sleeper Player Name Resolution ─────────────────────────────────────────

async function buildYahooPlayerNameMap() {
  console.log('Fetching Sleeper player database...')
  const res = await fetch('https://api.sleeper.app/v1/players/nfl')
  const players = await res.json()

  const yahooIdToName = {}
  let count = 0
  for (const [, p] of Object.entries(players)) {
    if (p.yahoo_id && p.full_name) {
      yahooIdToName[String(p.yahoo_id)] = p.full_name
      count++
    }
  }
  console.log(`Built Yahoo ID → name map: ${count} entries`)
  return yahooIdToName
}

// ─── Team Key → Owner Name from Raw Standings ───────────────────────────────

async function buildTeamKeyToOwnerMap() {
  // Fetch all Yahoo standings raw data
  const rawStandings = await prisma.rawProviderData.findMany({
    where: { provider: 'yahoo', dataType: 'standings' },
    select: { eventRef: true, payload: true },
  })

  // Map: leagueKey → { teamKey → ownerName }
  const map = {}

  for (const row of rawStandings) {
    const leagueKey = row.eventRef
    if (!leagueKey) continue

    try {
      const league = row.payload?.fantasy_content?.league
      const standingsArr = Array.isArray(league) ? league[1]?.standings : league?.standings
      const teams = standingsArr?.[0]?.teams || standingsArr?.teams || {}

      for (const entry of Object.values(teams)) {
        const teamArr = entry?.team
        if (!Array.isArray(teamArr)) continue

        const metaFields = Array.isArray(teamArr[0]) ? teamArr[0] : [teamArr[0]]
        const teamMeta = {}
        for (const f of metaFields) {
          if (f && typeof f === 'object') Object.assign(teamMeta, f)
        }

        if (!teamMeta.team_key) continue

        const managers = teamMeta.managers || []
        const manager = Array.isArray(managers) ? managers[0]?.manager : managers?.manager
        const ownerName = manager?.nickname || teamMeta.name || `Team ${teamMeta.team_id}`

        if (!map[leagueKey]) map[leagueKey] = {}
        map[leagueKey][teamMeta.team_key] = ownerName
      }
    } catch (err) {
      console.error(`Error parsing standings for ${leagueKey}:`, err.message)
    }
  }

  console.log(`Built teamKey → owner maps for ${Object.keys(map).length} league keys`)
  return map
}

// ─── Extract Yahoo Player ID Number from Key ────────────────────────────────

function extractYahooPlayerId(playerKey) {
  if (!playerKey) return null
  // Format: "406.p.30121" → "30121"
  const match = playerKey.match(/\.p\.(\d+)$/)
  return match ? match[1] : null
}

// ─── Extract League Key from Team Key ───────────────────────────────────────

function extractLeagueKey(teamKey) {
  if (!teamKey) return null
  // Format: "406.l.643521.t.12" → "406.l.643521"
  const match = teamKey.match(/^(\d+\.l\.\d+)/)
  return match ? match[1] : null
}

// ─── Main Backfill ──────────────────────────────────────────────────────────

async function backfill(targetLeagueId) {
  const yahooNameMap = await buildYahooPlayerNameMap()
  const teamOwnerMap = await buildTeamKeyToOwnerMap()

  // Find all Yahoo-imported historical seasons
  const where = {}
  if (targetLeagueId) {
    where.leagueId = targetLeagueId
  }

  const allSeasons = await prisma.historicalSeason.findMany({
    where,
    select: {
      id: true,
      leagueId: true,
      seasonYear: true,
      ownerName: true,
      teamName: true,
      draftData: true,
      import: { select: { sourcePlatform: true } },
    },
  })

  // Filter to Yahoo-imported seasons with draft data that has picks lacking playerName or ownerName
  const yahooSeasons = allSeasons.filter(s => {
    if (s.import?.sourcePlatform !== 'yahoo') return false
    const picks = s.draftData?.picks
    if (!picks || picks.length === 0) return false
    return picks.some(p => !p.playerName || !p.ownerName)
  })

  console.log(`Found ${yahooSeasons.length} Yahoo seasons with draft picks to backfill`)

  let updatedCount = 0
  let namesResolved = 0
  let ownersResolved = 0

  for (const season of yahooSeasons) {
    const draft = season.draftData
    if (!draft?.picks) continue

    let changed = false

    // Determine the league key from draft picks
    const sampleTeamKey = draft.picks.find(p => p.teamKey)?.teamKey
    const leagueKey = extractLeagueKey(sampleTeamKey)
    const ownerMap = leagueKey ? teamOwnerMap[leagueKey] : null

    for (const pick of draft.picks) {
      // Resolve playerName
      if (!pick.playerName && pick.playerId) {
        const yahooId = extractYahooPlayerId(pick.playerId)
        if (yahooId && yahooNameMap[yahooId]) {
          pick.playerName = yahooNameMap[yahooId]
          namesResolved++
          changed = true
        }
      }

      // Resolve ownerName
      if (!pick.ownerName && pick.teamKey && ownerMap) {
        const owner = ownerMap[pick.teamKey]
        if (owner) {
          pick.ownerName = owner
          ownersResolved++
          changed = true
        }
      }
    }

    if (changed) {
      await prisma.historicalSeason.update({
        where: { id: season.id },
        data: { draftData: draft },
      })
      updatedCount++
    }
  }

  console.log(`\nBackfill complete:`)
  console.log(`  Seasons updated: ${updatedCount}`)
  console.log(`  Player names resolved: ${namesResolved}`)
  console.log(`  Owner names resolved: ${ownersResolved}`)
}

// ─── Run ────────────────────────────────────────────────────────────────────

const leagueArg = process.argv.find(a => a.startsWith('--league='))
const targetLeagueId = leagueArg ? leagueArg.split('=')[1] : null

backfill(targetLeagueId)
  .then(() => {
    console.log('Done.')
    return prisma.$disconnect()
  })
  .catch(err => {
    console.error('Backfill failed:', err)
    return prisma.$disconnect().then(() => process.exit(1))
  })
