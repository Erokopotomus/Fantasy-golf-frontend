const { PrismaClient } = require('@prisma/client')
const { lazyFetchPlayer } = require('../src/services/nfl/lazyFetch')
const prisma = new PrismaClient()

;(async () => {
  const candidate = await prisma.$queryRaw`
    SELECT p.id, p.name
    FROM players p
    LEFT JOIN nfl_player_games pg ON pg."playerId" = p.id
    LEFT JOIN nfl_player_data_state s ON s."playerId" = p.id
    WHERE p."gsisId" IS NOT NULL AND pg.id IS NULL AND s.id IS NULL
    LIMIT 1
  `
  if (!candidate.length) {
    console.log('No candidate found (every NFL player already has data or state)')
    return
  }
  const target = candidate[0]
  console.log(`Lazy-fetching: ${target.name} (${target.id})`)
  const result = await lazyFetchPlayer(prisma, target.id)
  console.log('Result:', result)
  await prisma.$disconnect()
})()
