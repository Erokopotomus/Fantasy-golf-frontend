const prisma = require('../src/lib/prisma')
const sync = require('../src/services/datagolfSync')

async function main() {
  const result = await sync.syncLiveScoring('553', prisma)
  console.log('Result:', result)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
