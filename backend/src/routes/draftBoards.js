const express = require('express')
const { authenticate } = require('../middleware/auth')
const svc = require('../services/draftBoardService')

const router = express.Router()

// All draft board routes require authentication
router.use(authenticate)

// GET /api/draft-boards — list user's boards
router.get('/', async (req, res, next) => {
  try {
    const boards = await svc.listBoards(req.user.id)
    res.json({ boards })
  } catch (err) { next(err) }
})

// POST /api/draft-boards — create board
router.post('/', async (req, res, next) => {
  try {
    const { name, sport, scoringFormat, boardType, season } = req.body
    if (!name || !name.trim()) {
      return res.status(400).json({ error: { message: 'Board name is required' } })
    }
    const board = await svc.createBoard(req.user.id, { name: name.trim(), sport, scoringFormat, boardType, season })
    res.status(201).json({ board })
  } catch (err) { next(err) }
})

// GET /api/draft-boards/:id — get board + entries + player data
router.get('/:id', async (req, res, next) => {
  try {
    const board = await svc.getBoard(req.params.id, req.user.id)
    res.json({ board })
  } catch (err) { next(err) }
})

// PATCH /api/draft-boards/:id — update board metadata
router.patch('/:id', async (req, res, next) => {
  try {
    const board = await svc.updateBoard(req.params.id, req.user.id, req.body)
    res.json({ board })
  } catch (err) { next(err) }
})

// DELETE /api/draft-boards/:id — delete board
router.delete('/:id', async (req, res, next) => {
  try {
    await svc.deleteBoard(req.params.id, req.user.id)
    res.json({ success: true })
  } catch (err) { next(err) }
})

// PUT /api/draft-boards/:id/entries — bulk save all entries (auto-save)
router.put('/:id/entries', async (req, res, next) => {
  try {
    const { entries } = req.body
    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: { message: 'entries must be an array' } })
    }
    const board = await svc.saveEntries(req.params.id, req.user.id, entries)
    res.json({ board })
  } catch (err) { next(err) }
})

// POST /api/draft-boards/:id/entries — add single player
router.post('/:id/entries', async (req, res, next) => {
  try {
    const { playerId } = req.body
    if (!playerId) {
      return res.status(400).json({ error: { message: 'playerId is required' } })
    }
    const board = await svc.addEntry(req.params.id, req.user.id, playerId)
    res.json({ board })
  } catch (err) { next(err) }
})

// DELETE /api/draft-boards/:id/entries/:playerId — remove player
router.delete('/:id/entries/:playerId', async (req, res, next) => {
  try {
    const board = await svc.removeEntry(req.params.id, req.user.id, req.params.playerId)
    res.json({ board })
  } catch (err) { next(err) }
})

// PATCH /api/draft-boards/:id/entries/:playerId/notes — update notes
router.patch('/:id/entries/:playerId/notes', async (req, res, next) => {
  try {
    const { notes } = req.body
    const result = await svc.updateEntryNotes(req.params.id, req.user.id, req.params.playerId, notes ?? null)
    res.json(result)
  } catch (err) { next(err) }
})

module.exports = router
