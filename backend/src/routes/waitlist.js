const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma.js')

// POST /api/waitlist — capture email for sport waitlist (no auth required)
router.post('/', async (req, res) => {
  try {
    const { email, sport } = req.body

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const sportTag = (sport || 'general').toLowerCase()

    // Use raw SQL to upsert into waitlist_signups (auto-creates table if needed)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS waitlist_signups (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        sport VARCHAR(50) NOT NULL DEFAULT 'general',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(email, sport)
      )
    `)

    await prisma.$executeRawUnsafe(`
      INSERT INTO waitlist_signups (email, sport)
      VALUES ($1, $2)
      ON CONFLICT (email, sport) DO NOTHING
    `, normalizedEmail, sportTag)

    res.json({ success: true, message: 'You\'re on the list!' })
  } catch (err) {
    console.error('Waitlist signup error:', err)
    res.status(500).json({ error: 'Failed to save signup' })
  }
})

module.exports = router
