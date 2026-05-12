const crypto = require('crypto')
const prisma = require('../lib/prisma')

// Slug: 6 lowercase alphanumeric chars (~36^6 ≈ 2B possibilities, fine for low collision risk).
function randomSlug() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

async function generateUniqueSlug(maxAttempts = 8) {
  for (let i = 0; i < maxAttempts; i++) {
    const slug = randomSlug()
    const existing = await prisma.pool.findUnique({ where: { slug }, select: { id: true } })
    if (!existing) return slug
  }
  throw new Error('Could not generate unique slug after 8 attempts')
}

function generateAdminToken() {
  return crypto.randomBytes(24).toString('hex')
}

module.exports = { generateUniqueSlug, generateAdminToken, randomSlug }
