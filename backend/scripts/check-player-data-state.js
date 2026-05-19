const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

;(async () => {
  const count = await prisma.nflPlayerDataState.count()
  console.log(`NflPlayerDataState rows: ${count}`)
  await prisma.$disconnect()
})()
