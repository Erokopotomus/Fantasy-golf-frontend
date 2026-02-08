/**
 * One-time script to generate usernames for existing users.
 * Run on Railway after migration 14_public_profiles is applied:
 *   node scripts/backfillUsernames.js
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function generateUsername(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 6)
}

async function main() {
  const users = await prisma.user.findMany({
    where: { username: null },
    select: { id: true, name: true },
  })

  console.log(`Found ${users.length} users without usernames`)

  const existingUsernames = new Set(
    (await prisma.user.findMany({
      where: { username: { not: null } },
      select: { username: true },
    })).map(u => u.username)
  )

  let updated = 0
  for (const user of users) {
    let candidate = generateUsername(user.name)

    // Ensure min length
    if (candidate.length < 3) {
      candidate = candidate + randomSuffix()
    }

    // Ensure it doesn't start/end with hyphen after trimming
    candidate = candidate.replace(/^-|-$/g, '')
    if (candidate.length < 3) {
      candidate = 'user-' + randomSuffix()
    }

    // Handle collisions
    let finalUsername = candidate
    while (existingUsernames.has(finalUsername)) {
      finalUsername = candidate.slice(0, 25) + '-' + randomSuffix()
    }

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { username: finalUsername },
      })
      existingUsernames.add(finalUsername)
      updated++
      console.log(`  ${user.name} -> ${finalUsername}`)
    } catch (err) {
      console.error(`  Failed for ${user.name}: ${err.message}`)
    }
  }

  console.log(`\nDone. Updated ${updated}/${users.length} users.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
