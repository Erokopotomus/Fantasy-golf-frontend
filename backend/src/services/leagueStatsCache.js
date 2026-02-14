/**
 * League Stats Cache Service (Addendum Part 3F)
 *
 * Pre-computes commonly queried league stats for fast query responses.
 * Run after import completion and weekly cron (Tuesday 3 AM).
 *
 * Computed stats:
 *  - All-time standings (owner, total W/L, PF, PA, championships, playoff appearances)
 *  - Head-to-head matrix (every owner vs every other owner)
 *  - Records (highest/lowest scores, streaks, blowouts, etc.)
 *  - Season summaries (champion, runner-up, highest scorer per season)
 *  - Active streaks (championship droughts, playoff appearance streaks)
 */

const prisma = require('../lib/prisma.js')

/**
 * Compute all league stats from HistoricalSeason + CustomLeagueData.
 * Returns a comprehensive stats object for caching.
 */
async function computeLeagueStats(leagueId) {
  const seasons = await prisma.historicalSeason.findMany({
    where: { leagueId },
    orderBy: { seasonYear: 'asc' },
  })

  if (seasons.length === 0) return null

  // Fetch owner aliases and build resolution function
  const aliases = await prisma.ownerAlias.findMany({ where: { leagueId } })
  const aliasMap = {}
  for (const a of aliases) {
    aliasMap[a.ownerName] = a.canonicalName
  }
  const resolve = (name) => aliasMap[name] || name

  // Group by season year
  const byYear = {}
  for (const s of seasons) {
    if (!byYear[s.seasonYear]) byYear[s.seasonYear] = []
    byYear[s.seasonYear].push(s)
  }

  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b)

  // ── All-Time Standings ──
  const ownerStats = {}
  for (const season of seasons) {
    const name = resolve(season.ownerName || season.teamName)
    if (!ownerStats[name]) {
      ownerStats[name] = {
        name,
        wins: 0, losses: 0, ties: 0,
        totalPF: 0, totalPA: 0,
        championships: 0, playoffAppearances: 0,
        seasonsPlayed: 0,
        bestFinish: 99, worstFinish: 0,
      }
    }
    const o = ownerStats[name]
    o.wins += season.wins || 0
    o.losses += season.losses || 0
    o.ties += season.ties || 0
    o.totalPF += season.pointsFor || 0
    o.totalPA += season.pointsAgainst || 0
    o.seasonsPlayed++
    if (season.playoffResult === 'champion') o.championships++
    if (season.playoffResult && season.playoffResult !== 'missed') o.playoffAppearances++
    const standing = season.finalStanding || 99
    if (standing < o.bestFinish) o.bestFinish = standing
    if (standing > o.worstFinish) o.worstFinish = standing
  }

  const allTimeStandings = Object.values(ownerStats)
    .map(o => ({
      ...o,
      winPct: o.wins / Math.max(1, o.wins + o.losses + o.ties),
    }))
    .sort((a, b) => b.winPct - a.winPct)

  // ── Head-to-Head Matrix ──
  const headToHead = {}
  for (const [year, teams] of Object.entries(byYear)) {
    for (const team of teams) {
      const name = resolve(team.ownerName || team.teamName)
      const weekly = team.weeklyScores || []

      for (const week of weekly) {
        // Find opponent for this week using matchupId
        const opponent = teams.find(t => {
          if (resolve(t.ownerName || t.teamName) === name) return false
          const oppWeek = (t.weeklyScores || []).find(w =>
            w.week === week.week && w.matchupId === week.matchupId
          )
          return !!oppWeek
        })

        if (!opponent) continue
        const oppName = resolve(opponent.ownerName || opponent.teamName)

        const key = [name, oppName].sort().join('|||')
        if (!headToHead[key]) {
          headToHead[key] = { owner1: name, owner2: oppName, wins1: 0, wins2: 0, ties: 0, totalMargin: 0 }
        }

        const h2h = headToHead[key]
        const oppWeek = (opponent.weeklyScores || []).find(w => w.week === week.week && w.matchupId === week.matchupId)
        if (!oppWeek) continue

        const pts = week.points || 0
        const oppPts = oppWeek.points || 0

        if (h2h.owner1 === name) {
          if (pts > oppPts) h2h.wins1++
          else if (oppPts > pts) h2h.wins2++
          else h2h.ties++
          h2h.totalMargin += pts - oppPts
        } else {
          if (pts > oppPts) h2h.wins2++
          else if (oppPts > pts) h2h.wins1++
          else h2h.ties++
          h2h.totalMargin += oppPts - pts
        }
      }
    }
  }

  // ── Records ──
  const records = {
    highestWeekScore: null,
    lowestWeekScore: null,
    biggestBlowout: null,
    closestGame: null,
    longestWinStreak: null,
    longestLoseStreak: null,
    mostPointsInSeason: null,
    fewestPointsInSeason: null,
    bestRegularSeasonRecord: null,
    worstRegularSeasonRecord: null,
  }

  for (const season of seasons) {
    const name = resolve(season.ownerName || season.teamName)
    const year = season.seasonYear
    const pf = season.pointsFor || 0
    const wins = season.wins || 0
    const losses = season.losses || 0
    const games = wins + losses + (season.ties || 0)

    // Season records
    if (!records.mostPointsInSeason || pf > records.mostPointsInSeason.points) {
      records.mostPointsInSeason = { owner: name, points: pf, season: year }
    }
    if (pf > 0 && (!records.fewestPointsInSeason || pf < records.fewestPointsInSeason.points)) {
      records.fewestPointsInSeason = { owner: name, points: pf, season: year }
    }
    if (games > 0 && (!records.bestRegularSeasonRecord || wins / games > records.bestRegularSeasonRecord.winPct)) {
      records.bestRegularSeasonRecord = { owner: name, wins, losses, season: year, winPct: wins / games }
    }
    if (games > 0 && (!records.worstRegularSeasonRecord || wins / games < records.worstRegularSeasonRecord.winPct)) {
      records.worstRegularSeasonRecord = { owner: name, wins, losses, season: year, winPct: wins / games }
    }

    // Weekly records + streaks
    const weekly = season.weeklyScores || []
    let winStreak = 0, loseStreak = 0

    for (const w of weekly) {
      const pts = w.points || 0
      const oppPts = w.opponentPoints || 0

      if (pts > 0 && (!records.highestWeekScore || pts > records.highestWeekScore.score)) {
        records.highestWeekScore = { owner: name, score: pts, season: year, week: w.week }
      }
      if (pts > 0 && (!records.lowestWeekScore || pts < records.lowestWeekScore.score)) {
        records.lowestWeekScore = { owner: name, score: pts, season: year, week: w.week }
      }

      const margin = Math.abs(pts - oppPts)
      if (oppPts > 0) {
        if (!records.biggestBlowout || margin > records.biggestBlowout.margin) {
          records.biggestBlowout = {
            winner: pts > oppPts ? name : '(opponent)',
            loser: pts > oppPts ? '(opponent)' : name,
            margin, season: year, week: w.week,
            score: `${Math.max(pts, oppPts).toFixed(1)}-${Math.min(pts, oppPts).toFixed(1)}`,
          }
        }
        if (margin > 0 && (!records.closestGame || margin < records.closestGame.margin)) {
          records.closestGame = {
            winner: pts > oppPts ? name : '(opponent)',
            loser: pts > oppPts ? '(opponent)' : name,
            margin, season: year, week: w.week,
            score: `${Math.max(pts, oppPts).toFixed(1)}-${Math.min(pts, oppPts).toFixed(1)}`,
          }
        }
      }

      // Streaks
      if (pts > oppPts) {
        winStreak++; loseStreak = 0
        if (!records.longestWinStreak || winStreak > records.longestWinStreak.streak) {
          records.longestWinStreak = { owner: name, streak: winStreak, season: year }
        }
      } else if (oppPts > pts) {
        loseStreak++; winStreak = 0
        if (!records.longestLoseStreak || loseStreak > records.longestLoseStreak.streak) {
          records.longestLoseStreak = { owner: name, streak: loseStreak, season: year }
        }
      }
    }
  }

  // ── Season Summaries ──
  const seasonSummaries = {}
  for (const [year, teams] of Object.entries(byYear)) {
    const sorted = [...teams].sort((a, b) => (a.finalStanding || 99) - (b.finalStanding || 99))
    const champion = sorted.find(t => t.playoffResult === 'champion')
    const runnerUp = sorted.find(t => t.playoffResult === 'runner_up')
    const highScorer = [...teams].sort((a, b) => (b.pointsFor || 0) - (a.pointsFor || 0))[0]

    seasonSummaries[year] = {
      champion: champion ? resolve(champion.ownerName || champion.teamName) : null,
      runnerUp: runnerUp ? resolve(runnerUp.ownerName || runnerUp.teamName) : null,
      highestScorer: highScorer ? {
        name: resolve(highScorer.ownerName || highScorer.teamName),
        points: highScorer.pointsFor,
      } : null,
      teamCount: teams.length,
    }
  }

  return {
    allTimeStandings,
    headToHeadMatrix: Object.values(headToHead),
    records,
    seasonSummaries,
    years,
    totalSeasons: years.length,
  }
}

/**
 * Get cached stats or compute fresh ones.
 */
async function getLeagueStats(leagueId) {
  // Check cache first
  const cached = await prisma.leagueStatsCache.findUnique({
    where: { leagueId },
  })

  if (cached && new Date() < new Date(cached.expiresAt)) {
    return cached.stats
  }

  // Compute fresh
  const stats = await computeLeagueStats(leagueId)
  if (!stats) return null

  // Upsert cache (expires in 7 days)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  await prisma.leagueStatsCache.upsert({
    where: { leagueId },
    create: { leagueId, stats, expiresAt },
    update: { stats, computedAt: new Date(), expiresAt },
  })

  return stats
}

/**
 * Force recompute stats for a league (called after import or weekly cron).
 */
async function refreshLeagueStats(leagueId) {
  const stats = await computeLeagueStats(leagueId)
  if (!stats) return null

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  await prisma.leagueStatsCache.upsert({
    where: { leagueId },
    create: { leagueId, stats, expiresAt },
    update: { stats, computedAt: new Date(), expiresAt },
  })

  return stats
}

module.exports = {
  computeLeagueStats,
  getLeagueStats,
  refreshLeagueStats,
}
