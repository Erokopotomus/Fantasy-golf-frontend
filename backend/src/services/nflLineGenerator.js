/**
 * NFL Line Generator
 *
 * Generates weekly player prop lines from NflPlayerGame historical data.
 * Uses season averages with recency weighting to set O/U lines.
 *
 * This is Clutch-generated content — our own lines, not sportsbook pass-through.
 */

const prisma = require('../lib/prisma.js')
const { updateReputation } = require('./predictionService')
const { computeClutchRating } = require('./clutchRatingEngine')

// Prop types by position
const PROP_CONFIGS = {
  QB: [
    { propType: 'passing_yards', field: 'passYards', description: 'passing yards', minAvg: 150 },
    { propType: 'passing_tds', field: 'passTds', description: 'passing TDs', minAvg: 0.5 },
    { propType: 'rushing_yards', field: 'rushYards', description: 'rushing yards', minAvg: 15 },
  ],
  RB: [
    { propType: 'rushing_yards', field: 'rushYards', description: 'rushing yards', minAvg: 30 },
    { propType: 'receptions', field: 'receptions', description: 'receptions', minAvg: 1.5 },
    { propType: 'receiving_yards', field: 'recYards', description: 'receiving yards', minAvg: 10 },
  ],
  WR: [
    { propType: 'receiving_yards', field: 'recYards', description: 'receiving yards', minAvg: 30 },
    { propType: 'receptions', field: 'receptions', description: 'receptions', minAvg: 2 },
  ],
  TE: [
    { propType: 'receiving_yards', field: 'recYards', description: 'receiving yards', minAvg: 20 },
    { propType: 'receptions', field: 'receptions', description: 'receptions', minAvg: 2 },
  ],
}

// Positions to generate props for
const PROP_POSITIONS = ['QB', 'RB', 'WR', 'TE']

/**
 * Generate a line value from player stats.
 * Uses weighted average: recent games weighted more heavily.
 * Rounds to .5 to create clean O/U lines.
 */
function generateLine(games, field) {
  if (!games || games.length === 0) return null

  // Weight recent games more: game[0] is most recent
  let weightedSum = 0
  let totalWeight = 0
  for (let i = 0; i < games.length; i++) {
    const val = games[i][field]
    if (val == null) continue
    // Exponential decay: most recent game gets weight 1.0, oldest gets ~0.5
    const weight = Math.pow(0.9, i)
    weightedSum += val * weight
    totalWeight += weight
  }

  if (totalWeight === 0) return null
  const avg = weightedSum / totalWeight

  // Round to nearest 0.5
  return Math.round(avg * 2) / 2
}

/**
 * Generate all prop lines for a given NFL week.
 *
 * @param {number} season - NFL season (e.g., 2024)
 * @param {number} week - NFL week number (1-18)
 * @param {object} options - { dryRun, maxPropsPerPosition }
 * @returns {object} { created, skipped, errors }
 */
async function generateWeeklyProps(season, week, options = {}) {
  const { dryRun = false, maxPropsPerPosition = 5 } = options

  // Get games for this week
  const games = await prisma.nflGame.findMany({
    where: { season, week, gameType: 'REG' },
    include: {
      homeTeam: { select: { abbreviation: true, name: true } },
      awayTeam: { select: { abbreviation: true, name: true } },
    },
  })

  if (games.length === 0) {
    return { created: 0, skipped: 0, errors: ['No games found for this week'] }
  }

  // Get all teams playing this week
  const teamAbbrs = new Set()
  const gameByTeam = {}
  for (const g of games) {
    teamAbbrs.add(g.homeTeam.abbreviation)
    teamAbbrs.add(g.awayTeam.abbreviation)
    gameByTeam[g.homeTeam.abbreviation] = g
    gameByTeam[g.awayTeam.abbreviation] = g
  }

  // Get relevant players: those on teams playing this week
  const players = await prisma.player.findMany({
    where: {
      nflPosition: { in: PROP_POSITIONS },
      nflTeamAbbr: { in: [...teamAbbrs] },
    },
    select: {
      id: true,
      name: true,
      nflPosition: true,
      nflTeamAbbr: true,
    },
  })

  const playerIds = players.map(p => p.id)

  // Batch-load ALL player game stats for these players in one query
  const allPlayerGames = await prisma.nflPlayerGame.findMany({
    where: {
      playerId: { in: playerIds },
      game: {
        season,
        week: { lt: week },
        gameType: 'REG',
      },
    },
    include: { game: { select: { week: true } } },
    orderBy: { game: { week: 'desc' } },
  })

  // Group by player ID, keeping most recent 10
  const gamesByPlayer = {}
  for (const pg of allPlayerGames) {
    if (!gamesByPlayer[pg.playerId]) gamesByPlayer[pg.playerId] = []
    if (gamesByPlayer[pg.playerId].length < 10) {
      gamesByPlayer[pg.playerId].push(pg)
    }
  }

  const created = []
  const skipped = []
  const errors = []

  // Track how many props per position to limit output
  const positionCount = {}

  for (const player of players) {
    const pos = player.nflPosition
    if (!PROP_CONFIGS[pos]) continue

    const playerGames = gamesByPlayer[player.id] || []

    if (playerGames.length < 3) {
      // Not enough data to generate reliable lines
      continue
    }

    const game = gameByTeam[player.nflTeamAbbr]
    if (!game) continue

    for (const config of PROP_CONFIGS[pos]) {
      const lineValue = generateLine(playerGames, config.field)
      if (lineValue == null || lineValue < config.minAvg) continue

      // Limit props per position
      const posKey = `${pos}_${config.propType}`
      if (!positionCount[posKey]) positionCount[posKey] = 0
      if (positionCount[posKey] >= maxPropsPerPosition) continue
      positionCount[posKey]++

      const propData = {
        sport: 'nfl',
        season,
        week,
        playerId: player.id,
        gameId: game.id,
        teamAbbr: player.nflTeamAbbr,
        propType: config.propType,
        lineValue,
        category: 'player_prop',
        description: `${player.name} ${config.description}`,
        displayLine: `O/U ${lineValue}`,
        locksAt: game.kickoff,
        generatedFrom: {
          method: 'weighted_average',
          sampleSize: playerGames.length,
          seasonAvg: playerGames.reduce((s, g) => s + (g[config.field] || 0), 0) / playerGames.length,
          last3Avg: playerGames.slice(0, 3).reduce((s, g) => s + (g[config.field] || 0), 0) / Math.min(3, playerGames.length),
        },
        isActive: true,
      }

      if (dryRun) {
        created.push(propData)
      } else {
        try {
          await prisma.propLine.upsert({
            where: {
              sport_season_week_playerId_propType: {
                sport: 'nfl',
                season,
                week,
                playerId: player.id,
                propType: config.propType,
              },
            },
            create: propData,
            update: {
              lineValue: propData.lineValue,
              displayLine: propData.displayLine,
              generatedFrom: propData.generatedFrom,
              locksAt: propData.locksAt,
              gameId: propData.gameId,
              isActive: true,
            },
          })
          created.push(propData)
        } catch (err) {
          errors.push(`${player.name} ${config.propType}: ${err.message}`)
        }
      }
    }
  }

  // Also generate game-level props (game total O/U) from NflGame.totalLine
  for (const game of games) {
    if (game.totalLine) {
      const propData = {
        sport: 'nfl',
        season,
        week,
        playerId: null,
        gameId: game.id,
        teamAbbr: null,
        propType: 'game_total',
        lineValue: game.totalLine,
        category: 'game_prop',
        description: `${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation} total`,
        displayLine: `O/U ${game.totalLine}`,
        locksAt: game.kickoff,
        generatedFrom: { method: 'nflverse_line', source: 'nfl_games' },
        isActive: true,
      }

      if (!dryRun) {
        try {
          await prisma.propLine.upsert({
            where: {
              sport_season_week_playerId_propType: {
                sport: 'nfl',
                season,
                week,
                playerId: '', // No player for game props — need to handle null
                propType: `game_total_${game.id}`,
              },
            },
            create: { ...propData, propType: `game_total_${game.id}` },
            update: {
              lineValue: propData.lineValue,
              displayLine: propData.displayLine,
              locksAt: propData.locksAt,
              isActive: true,
            },
          })
          created.push(propData)
        } catch (err) {
          errors.push(`Game total ${game.awayTeam.abbreviation}@${game.homeTeam.abbreviation}: ${err.message}`)
        }
      } else {
        created.push(propData)
      }
    }
  }

  console.log(`[LineGen] Week ${week}: ${created.length} props created, ${skipped.length} skipped, ${errors.length} errors`)
  return { created: created.length, skipped: skipped.length, errors, props: dryRun ? created : undefined }
}

/**
 * Resolve prop lines for a completed week.
 * Checks actual stats against lines and marks over/under/push.
 */
async function resolveWeeklyProps(season, week) {
  const props = await prisma.propLine.findMany({
    where: {
      sport: 'nfl',
      season,
      week,
      isActive: true,
      resolvedAt: null,
    },
  })

  let resolved = 0
  let skipped = 0

  for (const prop of props) {
    // Get the actual stat value
    let actualValue = null

    if (prop.category === 'player_prop' && prop.playerId && prop.gameId) {
      const playerGame = await prisma.nflPlayerGame.findUnique({
        where: {
          playerId_gameId: {
            playerId: prop.playerId,
            gameId: prop.gameId,
          },
        },
      })

      if (!playerGame) {
        skipped++
        continue
      }

      // Map propType to the correct stat field
      const fieldMap = {
        passing_yards: 'passYards',
        passing_tds: 'passTds',
        rushing_yards: 'rushYards',
        receptions: 'receptions',
        receiving_yards: 'recYards',
        rushing_tds: 'rushTds',
      }

      const basePropType = prop.propType
      const field = fieldMap[basePropType]
      if (field && playerGame[field] != null) {
        actualValue = playerGame[field]
      }
    } else if (prop.category === 'game_prop' && prop.gameId) {
      const game = await prisma.nflGame.findUnique({
        where: { id: prop.gameId },
      })
      if (game && game.homeScore != null && game.awayScore != null) {
        actualValue = game.homeScore + game.awayScore
      }
    }

    if (actualValue == null) {
      skipped++
      continue
    }

    // Determine result
    let result
    if (actualValue > prop.lineValue) result = 'over'
    else if (actualValue < prop.lineValue) result = 'under'
    else result = 'push'

    await prisma.propLine.update({
      where: { id: prop.id },
      data: {
        actualValue,
        result,
        resolvedAt: new Date(),
      },
    })

    resolved++
  }

  // Now resolve user predictions that reference these props
  const resolvedProps = await prisma.propLine.findMany({
    where: {
      sport: 'nfl',
      season,
      week,
      resolvedAt: { not: null },
      result: { not: null },
    },
  })

  let predictionsResolved = 0
  for (const prop of resolvedProps) {
    // Find predictions that reference this prop via eventId
    const predictions = await prisma.prediction.findMany({
      where: {
        eventId: prop.id,
        outcome: 'PENDING',
      },
    })

    for (const pred of predictions) {
      const userDirection = pred.predictionData?.direction
      if (!userDirection) continue

      let outcome
      if (prop.result === 'push') {
        outcome = 'PUSH'
      } else if (userDirection === prop.result) {
        outcome = 'CORRECT'
      } else {
        outcome = 'INCORRECT'
      }

      await prisma.prediction.update({
        where: { id: pred.id },
        data: {
          outcome,
          resolvedAt: new Date(),
          accuracyScore: outcome === 'CORRECT' ? 1.0 : outcome === 'PUSH' ? 0.5 : 0.0,
        },
      })
      predictionsResolved++
    }
  }

  // Update user reputations
  if (predictionsResolved > 0) {
    await updatePickReputations()
  }

  console.log(`[PropResolve] Week ${week}: ${resolved} props resolved, ${predictionsResolved} predictions graded`)
  return { resolved, skipped, predictionsResolved }
}

/**
 * Update UserReputation + badges + Clutch Rating for NFL picks after resolution.
 * Uses the shared predictionService for badge-aware reputation updates,
 * then triggers Clutch Rating recomputation.
 */
async function updatePickReputations() {
  const usersWithNflPicks = await prisma.prediction.groupBy({
    by: ['userId'],
    where: {
      sport: 'nfl',
      predictionType: 'player_benchmark',
      outcome: { in: ['CORRECT', 'INCORRECT'] },
    },
  })

  let updated = 0
  for (const { userId } of usersWithNflPicks) {
    try {
      // Use shared reputation engine (includes badges, tiers, streaks)
      await updateReputation(userId, 'nfl', prisma)
      // Also update the 'all' aggregate
      await updateReputation(userId, 'all', prisma)
      // Recompute Clutch Rating (includes NFL predictions in breadth/volume)
      await computeClutchRating(userId, prisma)
      updated++
    } catch (err) {
      console.error(`[PropResolve] Failed to update reputation for ${userId}:`, err.message)
    }
  }

  console.log(`[PropResolve] Updated reputations + ratings for ${updated} users`)
}

module.exports = {
  generateWeeklyProps,
  resolveWeeklyProps,
  updatePickReputations,
  PROP_CONFIGS,
}
