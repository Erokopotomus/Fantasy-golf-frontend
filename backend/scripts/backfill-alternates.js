// Backfill isAlternate for existing tournaments
// Run once: node backend/scripts/backfill-alternates.js

const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  try {
    // Known PGA Tour alternate/opposite-field events
    const knownAlternates = [
      'Puerto Rico Open', 'Bermuda Championship', 'Barbasol Championship',
      'Barracuda Championship', 'ISCO Championship', 'Corales Puntacana',
    ]

    let updated = 0
    for (const name of knownAlternates) {
      const result = await prisma.tournament.updateMany({
        where: {
          name: { contains: name, mode: 'insensitive' },
          isAlternate: false,
        },
        data: { isAlternate: true },
      })
      if (result.count > 0) {
        console.log(`Marked ${result.count} "${name}" tournaments as alternate`)
        updated += result.count
      }
    }
    console.log(`Total: ${updated} tournaments marked as alternate`)

    // Verify: show current tournament that would be returned by /current
    const current = await prisma.tournament.findFirst({
      where: {
        status: { in: ['IN_PROGRESS', 'UPCOMING'] },
        isAlternate: false,
      },
      orderBy: [{ startDate: 'asc' }],
      select: { name: true, status: true, startDate: true, isAlternate: true },
    })
    console.log('\nCurrent tournament (non-alternate):', current?.name || 'none')

    // Also show what was being returned before (first by date regardless)
    const first = await prisma.tournament.findFirst({
      where: { status: { in: ['IN_PROGRESS', 'UPCOMING'] } },
      orderBy: [{ startDate: 'asc' }],
      select: { name: true, status: true, startDate: true, isAlternate: true },
    })
    console.log('First by date (any):', first?.name, first?.isAlternate ? '(ALTERNATE)' : '')
  } finally {
    await prisma.$disconnect()
  }
}
main().catch(console.error)
