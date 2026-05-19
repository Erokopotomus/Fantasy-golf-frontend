const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const TARGETS = [
  { name: 'Aaron Rodgers',  expectMin: 2005, expectMaxSeasons: 21 },
  { name: 'Matthew Stafford', expectMin: 2009, expectMaxSeasons: 17 },
  { name: 'Josh Allen',     expectMin: 2018, expectMaxSeasons: 8 },
  { name: 'Tom Brady',      expectMin: 2000, expectMaxSeasons: 23 },
  { name: 'Peyton Manning', expectMin: 1999, expectMaxSeasons: 18 },
]

;(async () => {
  try {
    for (const t of TARGETS) {
      const player = await prisma.player.findFirst({
        where: { name: { contains: t.name }, gsisId: { not: null } },
        select: { id: true, name: true },
      })
      if (!player) { console.log(`✗ ${t.name}: not found`); continue }
      const seasons = await prisma.$queryRaw`
        SELECT DISTINCT g.season
        FROM nfl_player_games pg
        JOIN nfl_games g ON g.id = pg."gameId"
        WHERE pg."playerId" = ${player.id}
        ORDER BY g.season ASC
      `
      const years = seasons.map(s => Number(s.season))
      const firstSeason = years[0] ?? '—'
      const lastSeason = years[years.length - 1] ?? '—'
      console.log(`${player.name}: ${years.length} seasons [${firstSeason}…${lastSeason}]`)
    }
  } finally {
    await prisma.$disconnect()
  }
})()
