/**
 * Seed script for Universal Player Profile Layer
 * Seeds: Positions, PlayerTags, NFL sport+positions, backfills Player.sportId,
 *        RosterEntry.rosterStatus, PlayerPosition, SportPlayerProfile, TeamBudget
 *
 * Run: node prisma/seedPlayerProfile.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('--- Universal Player Profile Seed ---\n')

  // ── 1. Find or create Golf sport ─────────────────────────────────────────
  console.log('1. Finding Golf sport...')
  let golf = await prisma.sport.findUnique({ where: { slug: 'golf' } })
  if (!golf) {
    golf = await prisma.sport.create({
      data: {
        slug: 'golf',
        name: 'Golf',
        isActive: true,
        config: {
          seasonType: 'wrap-around',
          weekDefinition: 'tournament',
          positionBased: false,
          statCategories: [
            'sgTotal', 'sgPutting', 'sgApproach', 'sgOffTee', 'sgAroundGreen',
            'drivingDistance', 'drivingAccuracy', 'gir', 'scrambling', 'puttsPerRound'
          ],
          rosterPositions: ['ACTIVE', 'BENCH', 'IR'],
          defaultScoringPresets: ['standard', 'draftkings'],
        },
      },
    })
    console.log(`   Created Golf sport: ${golf.id}`)
  } else {
    // Ensure positionBased flag is set
    if (!golf.config?.positionBased === undefined) {
      await prisma.sport.update({
        where: { id: golf.id },
        data: { config: { ...golf.config, positionBased: false } },
      })
    }
    console.log(`   Golf sport found: ${golf.id}`)
  }

  // ── 2. Create Golf position (Golfer) ─────────────────────────────────────
  console.log('2. Creating Golf position...')
  const golferPos = await prisma.position.upsert({
    where: { sportId_abbr: { sportId: golf.id, abbr: 'G' } },
    update: {},
    create: {
      sportId: golf.id,
      abbr: 'G',
      name: 'Golfer',
      sortOrder: 1,
      config: { scoringPositions: ['ACTIVE'], benchable: true },
    },
  })
  console.log(`   Position: ${golferPos.name} (${golferPos.abbr})`)

  // ── 3. Backfill Player.sportId ────────────────────────────────────────────
  console.log('3. Backfilling Player.sportId...')
  const playerUpdate = await prisma.player.updateMany({
    where: { sportId: null },
    data: { sportId: golf.id },
  })
  console.log(`   Updated ${playerUpdate.count} players with sportId`)

  // ── 4. Backfill RosterEntry.rosterStatus from position ────────────────────
  console.log('4. Backfilling RosterEntry.rosterStatus...')
  const rosterBackfill = await prisma.$executeRaw`
    UPDATE roster_entries SET "rosterStatus" = position WHERE "rosterStatus" = 'BENCH' AND position != 'BENCH'
  `
  console.log(`   Updated ${rosterBackfill} roster entries with rosterStatus`)

  // ── 5. Create PlayerPosition rows for all players (batch) ──────────────────
  console.log('5. Creating PlayerPosition rows (batch)...')
  const allPlayers = await prisma.player.findMany({
    where: { sportId: golf.id },
    select: { id: true },
  })

  // Get already-created positions to skip
  const existingPP = await prisma.playerPosition.findMany({
    where: { positionId: golferPos.id },
    select: { playerId: true },
  })
  const existingSet = new Set(existingPP.map(pp => pp.playerId))

  const newRows = allPlayers
    .filter(p => !existingSet.has(p.id))
    .map(p => ({
      playerId: p.id,
      positionId: golferPos.id,
      isPrimary: true,
      source: 'seed',
    }))

  if (newRows.length > 0) {
    // Batch in chunks of 500
    for (let i = 0; i < newRows.length; i += 500) {
      const chunk = newRows.slice(i, i + 500)
      await prisma.playerPosition.createMany({ data: chunk, skipDuplicates: true })
      console.log(`   ... ${Math.min(i + 500, newRows.length)}/${newRows.length}`)
    }
  }
  console.log(`   Created ${newRows.length} PlayerPosition rows (${existingPP.length} already existed)`)

  // ── 6. Create default golf roster slot definitions ────────────────────────
  console.log('6. Creating default golf roster slot definitions...')
  const standardSS = await prisma.scoringSystem.findFirst({
    where: { sportId: golf.id, slug: 'standard' },
  })

  if (standardSS) {
    const golfSlots = [
      { slotKey: 'G1', displayName: 'Golfer 1', slotType: 'STARTER', sortOrder: 1 },
      { slotKey: 'G2', displayName: 'Golfer 2', slotType: 'STARTER', sortOrder: 2 },
      { slotKey: 'G3', displayName: 'Golfer 3', slotType: 'STARTER', sortOrder: 3 },
      { slotKey: 'G4', displayName: 'Golfer 4', slotType: 'STARTER', sortOrder: 4 },
      { slotKey: 'BN1', displayName: 'Bench 1', slotType: 'BENCH', sortOrder: 5 },
      { slotKey: 'BN2', displayName: 'Bench 2', slotType: 'BENCH', sortOrder: 6 },
    ]

    for (const slot of golfSlots) {
      const rsd = await prisma.rosterSlotDefinition.upsert({
        where: { scoringSystemId_slotKey: { scoringSystemId: standardSS.id, slotKey: slot.slotKey } },
        update: {},
        create: {
          scoringSystemId: standardSS.id,
          ...slot,
        },
      })

      // Add eligibility for starter slots (Golfer position)
      if (slot.slotType === 'STARTER') {
        await prisma.rosterSlotEligibility.upsert({
          where: {
            rosterSlotDefinitionId_positionId: {
              rosterSlotDefinitionId: rsd.id,
              positionId: golferPos.id,
            },
          },
          update: {},
          create: {
            rosterSlotDefinitionId: rsd.id,
            positionId: golferPos.id,
          },
        })
      }
      // Bench slots: zero eligibility rows = accepts any position
    }
    console.log(`   Created ${golfSlots.length} roster slot definitions for Standard scoring`)
  } else {
    console.log('   Standard scoring system not found — skipping roster slots')
  }

  // ── 7. Seed Golf tags ────────────────────────────────────────────────────
  console.log('7. Seeding Golf tags...')
  const golfTags = [
    { slug: 'rookie', name: 'Rookie', category: 'STATUS', color: '#22c55e', icon: 'star' },
    { slug: 'veteran', name: 'Veteran', category: 'STATUS', color: '#6366f1', icon: 'shield' },
    { slug: 'elite', name: 'Elite', category: 'SKILL', color: '#f59e0b', icon: 'crown' },
    { slug: 'sleeper', name: 'Sleeper', category: 'SKILL', color: '#8b5cf6', icon: 'eye' },
    { slug: 'major-winner', name: 'Major Winner', category: 'SKILL', color: '#eab308', icon: 'trophy' },
    { slug: 'injury-prone', name: 'Injury Prone', category: 'HEALTH', color: '#ef4444', icon: 'alert' },
    { slug: 'hot-streak', name: 'Hot Streak', category: 'STATUS', color: '#f97316', icon: 'flame' },
    { slug: 'pga-tour', name: 'PGA Tour', category: 'CONTRACT', color: '#3b82f6', icon: 'badge' },
    { slug: 'liv', name: 'LIV Golf', category: 'CONTRACT', color: '#10b981', icon: 'badge' },
    { slug: 'dp-world', name: 'DP World Tour', category: 'CONTRACT', color: '#6366f1', icon: 'badge' },
  ]

  for (const tag of golfTags) {
    await prisma.playerTag.upsert({
      where: { sportId_slug: { sportId: golf.id, slug: tag.slug } },
      update: {},
      create: { sportId: golf.id, ...tag },
    })
  }
  console.log(`   Created ${golfTags.length} golf tags`)

  // ── 8. Seed NFL sport (isActive: false) + positions ───────────────────────
  console.log('8. Seeding NFL sport + positions...')
  const nfl = await prisma.sport.upsert({
    where: { slug: 'nfl' },
    update: {},
    create: {
      slug: 'nfl',
      name: 'NFL',
      isActive: false,
      config: {
        seasonType: 'calendar',
        weekDefinition: 'game-week',
        positionBased: true,
        statCategories: [
          'passingYards', 'passingTDs', 'rushingYards', 'rushingTDs',
          'receivingYards', 'receivingTDs', 'receptions', 'interceptions',
          'fumbles', 'sacks', 'fieldGoals', 'extraPoints'
        ],
        rosterPositions: ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'FLEX', 'BENCH', 'IR'],
        defaultScoringPresets: ['standard', 'ppr', 'half-ppr'],
      },
    },
  })
  console.log(`   NFL sport: ${nfl.id} (isActive: ${nfl.isActive})`)

  const nflPositions = [
    { abbr: 'QB', name: 'Quarterback', sortOrder: 1 },
    { abbr: 'RB', name: 'Running Back', sortOrder: 2 },
    { abbr: 'WR', name: 'Wide Receiver', sortOrder: 3 },
    { abbr: 'TE', name: 'Tight End', sortOrder: 4 },
    { abbr: 'K', name: 'Kicker', sortOrder: 5 },
    { abbr: 'DEF', name: 'Defense/Special Teams', sortOrder: 6 },
  ]

  for (const pos of nflPositions) {
    await prisma.position.upsert({
      where: { sportId_abbr: { sportId: nfl.id, abbr: pos.abbr } },
      update: {},
      create: { sportId: nfl.id, ...pos, config: {} },
    })
  }
  console.log(`   Created ${nflPositions.length} NFL positions`)

  // ── 9. Seed NFL tags ──────────────────────────────────────────────────────
  console.log('9. Seeding NFL tags...')
  const nflTags = [
    { slug: 'rookie', name: 'Rookie', category: 'STATUS', color: '#22c55e', icon: 'star' },
    { slug: 'veteran', name: 'Veteran', category: 'STATUS', color: '#6366f1', icon: 'shield' },
    { slug: 'franchise-tag', name: 'Franchise Tag', category: 'CONTRACT', color: '#f59e0b', icon: 'tag' },
    { slug: 'injury-reserve', name: 'Injury Reserve', category: 'HEALTH', color: '#ef4444', icon: 'medical' },
    { slug: 'breakout', name: 'Breakout Candidate', category: 'SKILL', color: '#8b5cf6', icon: 'rocket' },
    { slug: 'bust-risk', name: 'Bust Risk', category: 'SKILL', color: '#ef4444', icon: 'warning' },
    { slug: 'handcuff', name: 'Handcuff', category: 'STATUS', color: '#6b7280', icon: 'link' },
    { slug: 'hold-out', name: 'Holdout', category: 'CONTRACT', color: '#f97316', icon: 'pause' },
  ]

  for (const tag of nflTags) {
    await prisma.playerTag.upsert({
      where: { sportId_slug: { sportId: nfl.id, slug: tag.slug } },
      update: {},
      create: { sportId: nfl.id, ...tag },
    })
  }
  console.log(`   Created ${nflTags.length} NFL tags`)

  // ── 10. Backfill SportPlayerProfile from Player flat columns ──────────────
  console.log('10. Backfilling SportPlayerProfile from Player stats...')
  const currentSeason = await prisma.season.findFirst({
    where: { isCurrent: true, sportId: golf.id },
  })

  if (currentSeason) {
    const playersWithStats = await prisma.player.findMany({
      where: {
        sportId: golf.id,
        OR: [
          { sgTotal: { not: null } },
          { events: { gt: 0 } },
        ],
      },
      select: {
        id: true,
        sgTotal: true, sgPutting: true, sgApproach: true, sgOffTee: true,
        sgAroundGreen: true, sgTeeToGreen: true, sgBallStriking: true,
        drivingDistance: true, drivingAccuracy: true, gir: true,
        scrambling: true, puttsPerRound: true, scoringAvg: true,
        birdieAvg: true, events: true, wins: true, top5s: true,
        top10s: true, top25s: true, cutsMade: true, earnings: true,
        owgrRank: true, fedexRank: true, datagolfRank: true,
        datagolfSkill: true, owgr: true, fedexPoints: true,
      },
    })

    // Check which profiles already exist
    const existingSPP = await prisma.sportPlayerProfile.findMany({
      where: { sportId: golf.id, seasonId: currentSeason.id },
      select: { playerId: true },
    })
    const existingSPPSet = new Set(existingSPP.map(s => s.playerId))

    const newProfiles = playersWithStats
      .filter(p => !existingSPPSet.has(p.id))
      .map(p => ({
        playerId: p.id,
        sportId: golf.id,
        seasonId: currentSeason.id,
        stats: {
          sgTotal: p.sgTotal, sgPutting: p.sgPutting, sgApproach: p.sgApproach,
          sgOffTee: p.sgOffTee, sgAroundGreen: p.sgAroundGreen,
          sgTeeToGreen: p.sgTeeToGreen, sgBallStriking: p.sgBallStriking,
          drivingDistance: p.drivingDistance, drivingAccuracy: p.drivingAccuracy,
          gir: p.gir, scrambling: p.scrambling, puttsPerRound: p.puttsPerRound,
          scoringAvg: p.scoringAvg, birdieAvg: p.birdieAvg,
          events: p.events, wins: p.wins, top5s: p.top5s, top10s: p.top10s,
          top25s: p.top25s, cutsMade: p.cutsMade, earnings: p.earnings,
        },
        rankings: {
          owgrRank: p.owgrRank, fedexRank: p.fedexRank,
          datagolfRank: p.datagolfRank, datagolfSkill: p.datagolfSkill,
          owgr: p.owgr, fedexPoints: p.fedexPoints,
        },
      }))

    if (newProfiles.length > 0) {
      for (let i = 0; i < newProfiles.length; i += 500) {
        const chunk = newProfiles.slice(i, i + 500)
        await prisma.sportPlayerProfile.createMany({ data: chunk, skipDuplicates: true })
        console.log(`   ... ${Math.min(i + 500, newProfiles.length)}/${newProfiles.length}`)
      }
    }
    console.log(`   Created ${newProfiles.length} SportPlayerProfile rows (${existingSPP.length} already existed)`)
  } else {
    console.log('   No current season found — skipping SportPlayerProfile backfill')
  }

  // ── 11. Backfill TeamBudget for completed auction drafts ──────────────────
  console.log('11. Backfilling TeamBudget for auction drafts...')
  const auctionDrafts = await prisma.draft.findMany({
    where: {
      status: 'COMPLETED',
      league: { draftType: 'AUCTION' },
    },
    include: {
      league: true,
      picks: {
        include: {
          player: {
            include: {
              positions: {
                include: { position: { select: { abbr: true } } },
                where: { isPrimary: true },
              },
            },
          },
        },
      },
    },
  })

  let budgetsCreated = 0
  for (const draft of auctionDrafts) {
    const leagueSeason = await prisma.leagueSeason.findFirst({
      where: { leagueId: draft.leagueId },
      orderBy: { createdAt: 'desc' },
    })
    if (!leagueSeason) continue

    // Group picks by team
    const teamPicks = {}
    for (const pick of draft.picks) {
      if (!teamPicks[pick.teamId]) teamPicks[pick.teamId] = []
      teamPicks[pick.teamId].push(pick)
    }

    const totalBudget = draft.league.settings?.budget || 200

    for (const [teamId, picks] of Object.entries(teamPicks)) {
      const spent = picks.reduce((sum, p) => sum + (p.amount || 0), 0)
      const spentByPosition = {}

      for (const pick of picks) {
        const posAbbr = pick.player?.positions?.[0]?.position?.abbr || 'G'
        spentByPosition[posAbbr] = (spentByPosition[posAbbr] || 0) + (pick.amount || 0)
      }

      await prisma.teamBudget.upsert({
        where: { teamId_leagueSeasonId: { teamId, leagueSeasonId: leagueSeason.id } },
        update: { spent, remaining: totalBudget - spent, spentByPosition },
        create: {
          teamId,
          leagueSeasonId: leagueSeason.id,
          totalBudget,
          spent,
          remaining: totalBudget - spent,
          spentByPosition,
        },
      })
      budgetsCreated++
    }
  }
  console.log(`   Created ${budgetsCreated} TeamBudget rows`)

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\n--- Universal Player Profile Seed Complete ---')
  console.log(`   Golf position: ${golferPos.abbr} (${golferPos.name})`)
  console.log(`   Players backfilled: ${playerUpdate.count}`)
  console.log(`   PlayerPositions: ${newRows.length}`)
  console.log(`   Golf tags: ${golfTags.length}`)
  console.log(`   NFL positions: ${nflPositions.length}`)
  console.log(`   NFL tags: ${nflTags.length}`)
  console.log(`   TeamBudgets: ${budgetsCreated}`)
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
