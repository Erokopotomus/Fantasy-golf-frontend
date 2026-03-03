/**
 * Coach Memory API Routes
 *
 * CRUD for the personal AI coach vault: identity prefs, memory documents,
 * coaching interactions, and reaction tracking.
 */

const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const prisma = require('../lib/prisma.js')
const { getDefaultIdentity } = require('../services/coachContextAssembly')

// All routes require authentication
router.use(authenticate)

// ═══════════════════════════════════════════════
//  GET /memory — All vault documents for current user
// ═══════════════════════════════════════════════
router.get('/memory', async (req, res) => {
  try {
    const userId = req.user.id
    const { sport } = req.query

    const where = { userId }
    if (sport) where.sport = sport

    const docs = await prisma.coachingMemory.findMany({ where })

    // Build vault object keyed by documentType
    const vault = {}
    for (const doc of docs) {
      vault[doc.documentType] = {
        content: doc.content,
        version: doc.version,
        lastUpdatedBy: doc.lastUpdatedBy,
        updatedAt: doc.updatedAt,
      }
    }

    res.json({ vault })
  } catch (err) {
    console.error('[CoachMemory] GET /memory error:', err.message)
    res.status(500).json({ error: { message: 'Failed to fetch vault documents' } })
  }
})

// ═══════════════════════════════════════════════
//  GET /memory/:documentType — Single document
// ═══════════════════════════════════════════════
router.get('/memory/:documentType', async (req, res) => {
  try {
    const userId = req.user.id
    const { documentType } = req.params
    const { sport } = req.query

    const doc = await prisma.coachingMemory.findUnique({
      where: {
        userId_sport_documentType: {
          userId,
          sport: sport || null,
          documentType,
        },
      },
    })

    // Return default identity if type is 'identity' and no doc exists
    if (!doc && documentType === 'identity') {
      return res.json({
        document: {
          content: getDefaultIdentity(),
          version: 0,
          lastUpdatedBy: 'default',
          updatedAt: null,
        },
      })
    }

    res.json({
      document: doc
        ? {
            content: doc.content,
            version: doc.version,
            lastUpdatedBy: doc.lastUpdatedBy,
            updatedAt: doc.updatedAt,
          }
        : null,
    })
  } catch (err) {
    console.error('[CoachMemory] GET /memory/:documentType error:', err.message)
    res.status(500).json({ error: { message: 'Failed to fetch document' } })
  }
})

// ═══════════════════════════════════════════════
//  PUT /identity — Update identity preferences
// ═══════════════════════════════════════════════
router.put('/identity', async (req, res) => {
  try {
    const userId = req.user.id
    const { coachingTone, coachingFrequency, riskAppetite, draftPhilosophy } = req.body

    // Fetch existing or default
    const existing = await prisma.coachingMemory.findUnique({
      where: {
        userId_sport_documentType: {
          userId,
          sport: null,
          documentType: 'identity',
        },
      },
    })

    const currentContent = existing ? existing.content : getDefaultIdentity()

    // Merge only provided fields
    const merged = { ...currentContent }
    if (coachingTone !== undefined) merged.coachingTone = coachingTone
    if (coachingFrequency !== undefined) merged.coachingFrequency = coachingFrequency
    if (riskAppetite !== undefined) merged.riskAppetite = riskAppetite
    if (draftPhilosophy !== undefined) merged.draftPhilosophy = draftPhilosophy

    const doc = await prisma.coachingMemory.upsert({
      where: {
        userId_sport_documentType: {
          userId,
          sport: null,
          documentType: 'identity',
        },
      },
      create: {
        userId,
        sport: null,
        documentType: 'identity',
        content: merged,
        version: 1,
        lastUpdatedBy: 'user',
      },
      update: {
        content: merged,
        version: existing ? existing.version + 1 : 1,
        lastUpdatedBy: 'user',
      },
    })

    res.json({
      document: {
        content: doc.content,
        version: doc.version,
        lastUpdatedBy: doc.lastUpdatedBy,
        updatedAt: doc.updatedAt,
      },
    })
  } catch (err) {
    console.error('[CoachMemory] PUT /identity error:', err.message)
    res.status(500).json({ error: { message: 'Failed to update identity' } })
  }
})

// ═══════════════════════════════════════════════
//  POST /identity/notes — Add user note
// ═══════════════════════════════════════════════
router.post('/identity/notes', async (req, res) => {
  try {
    const userId = req.user.id
    const { text } = req.body

    // Validate
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: { message: 'Note text is required' } })
    }
    if (text.length > 500) {
      return res.status(400).json({ error: { message: 'Note must be 500 characters or fewer' } })
    }

    // Fetch existing identity
    const existing = await prisma.coachingMemory.findUnique({
      where: {
        userId_sport_documentType: {
          userId,
          sport: null,
          documentType: 'identity',
        },
      },
    })

    const currentContent = existing ? existing.content : getDefaultIdentity()
    const notes = currentContent.userNotes || []

    if (notes.length >= 20) {
      return res.status(400).json({ error: { message: 'Maximum of 20 notes reached. Remove a note before adding another.' } })
    }

    notes.push({ text: text.trim(), addedAt: new Date().toISOString() })
    currentContent.userNotes = notes

    const doc = await prisma.coachingMemory.upsert({
      where: {
        userId_sport_documentType: {
          userId,
          sport: null,
          documentType: 'identity',
        },
      },
      create: {
        userId,
        sport: null,
        documentType: 'identity',
        content: currentContent,
        version: 1,
        lastUpdatedBy: 'user',
      },
      update: {
        content: currentContent,
        version: existing ? existing.version + 1 : 1,
        lastUpdatedBy: 'user',
      },
    })

    res.json({
      document: {
        content: doc.content,
        version: doc.version,
        lastUpdatedBy: doc.lastUpdatedBy,
        updatedAt: doc.updatedAt,
      },
    })
  } catch (err) {
    console.error('[CoachMemory] POST /identity/notes error:', err.message)
    res.status(500).json({ error: { message: 'Failed to add note' } })
  }
})

// ═══════════════════════════════════════════════
//  DELETE /identity/notes/:index — Remove note by index
// ═══════════════════════════════════════════════
router.delete('/identity/notes/:index', async (req, res) => {
  try {
    const userId = req.user.id
    const index = parseInt(req.params.index, 10)

    if (isNaN(index) || index < 0) {
      return res.status(400).json({ error: { message: 'Invalid note index' } })
    }

    const existing = await prisma.coachingMemory.findUnique({
      where: {
        userId_sport_documentType: {
          userId,
          sport: null,
          documentType: 'identity',
        },
      },
    })

    if (!existing) {
      return res.status(404).json({ error: { message: 'Identity document not found' } })
    }

    const notes = existing.content.userNotes || []
    if (index >= notes.length) {
      return res.status(400).json({ error: { message: `Note index ${index} out of range (${notes.length} notes)` } })
    }

    notes.splice(index, 1)
    existing.content.userNotes = notes

    const doc = await prisma.coachingMemory.update({
      where: {
        userId_sport_documentType: {
          userId,
          sport: null,
          documentType: 'identity',
        },
      },
      data: {
        content: existing.content,
        version: existing.version + 1,
        lastUpdatedBy: 'user',
      },
    })

    res.json({
      document: {
        content: doc.content,
        version: doc.version,
        lastUpdatedBy: doc.lastUpdatedBy,
        updatedAt: doc.updatedAt,
      },
    })
  } catch (err) {
    console.error('[CoachMemory] DELETE /identity/notes/:index error:', err.message)
    res.status(500).json({ error: { message: 'Failed to remove note' } })
  }
})

// ═══════════════════════════════════════════════
//  GET /interactions — Recent coaching interactions (paginated)
// ═══════════════════════════════════════════════
router.get('/interactions', async (req, res) => {
  try {
    const userId = req.user.id
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100)
    const offset = parseInt(req.query.offset, 10) || 0

    const [interactions, total] = await Promise.all([
      prisma.coachingInteraction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.coachingInteraction.count({ where: { userId } }),
    ])

    res.json({ interactions, total })
  } catch (err) {
    console.error('[CoachMemory] GET /interactions error:', err.message)
    res.status(500).json({ error: { message: 'Failed to fetch interactions' } })
  }
})

// ═══════════════════════════════════════════════
//  PATCH /interactions/:id/react — Submit thumbs up/down
// ═══════════════════════════════════════════════
router.patch('/interactions/:id/react', async (req, res) => {
  try {
    const userId = req.user.id
    const { id } = req.params
    const { reaction } = req.body

    if (!reaction || !['helpful', 'not_useful'].includes(reaction)) {
      return res.status(400).json({ error: { message: 'Reaction must be "helpful" or "not_useful"' } })
    }

    // Verify interaction belongs to user
    const interaction = await prisma.coachingInteraction.findUnique({
      where: { id },
    })

    if (!interaction) {
      return res.status(404).json({ error: { message: 'Interaction not found' } })
    }
    if (interaction.userId !== userId) {
      return res.status(403).json({ error: { message: 'Not authorized to react to this interaction' } })
    }

    const updated = await prisma.coachingInteraction.update({
      where: { id },
      data: { userReaction: reaction },
    })

    res.json({ interaction: updated })
  } catch (err) {
    console.error('[CoachMemory] PATCH /interactions/:id/react error:', err.message)
    res.status(500).json({ error: { message: 'Failed to record reaction' } })
  }
})

module.exports = router
