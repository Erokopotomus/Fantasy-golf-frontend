const { PrismaClient } = require('@prisma/client')
const { getPlayerDataState } = require('../src/services/nfl/playerDataState')
const prisma = new PrismaClient()

;(async () => {
  const player = await prisma.player.findFirst({
    where: { gsisId: { not: null } },
    select: { id: true, name: true },
  })
  if (!player) {
    console.log('No NFL players found — run nflSync first')
    return
  }
  console.log(`Checking data state for ${player.name} (${player.id})`)
  const state = await getPlayerDataState(prisma, player.id)
  console.log('State:', state)
  await prisma.$disconnect()
})()
