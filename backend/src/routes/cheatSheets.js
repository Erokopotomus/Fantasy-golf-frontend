const express = require('express')
const { authenticate } = require('../middleware/auth')
const cheatSheetService = require('../services/cheatSheetService')

const router = express.Router()

router.use(authenticate)

// POST /api/lab/cheatsheet/generate — generate cheat sheet from board
router.post('/generate', async (req, res, next) => {
  try {
    const { boardId } = req.body
    if (!boardId) {
      return res.status(400).json({ error: { message: 'boardId is required' } })
    }
    const sheet = await cheatSheetService.generateCheatSheet(req.user.id, boardId)
    res.status(201).json({ sheet })
  } catch (err) { next(err) }
})

// GET /api/lab/cheatsheet/board/:boardId — get sheet by board
router.get('/board/:boardId', async (req, res, next) => {
  try {
    const sheet = await cheatSheetService.getCheatSheetByBoard(req.user.id, req.params.boardId)
    res.json({ sheet })
  } catch (err) { next(err) }
})

// GET /api/lab/cheatsheet/:id — get sheet
router.get('/:id', async (req, res, next) => {
  try {
    const sheet = await cheatSheetService.getCheatSheet(req.user.id, req.params.id)
    res.json({ sheet })
  } catch (err) { next(err) }
})

// PUT /api/lab/cheatsheet/:id — update
router.put('/:id', async (req, res, next) => {
  try {
    const sheet = await cheatSheetService.updateCheatSheet(req.user.id, req.params.id, req.body)
    res.json({ sheet })
  } catch (err) { next(err) }
})

// POST /api/lab/cheatsheet/:id/publish — publish
router.post('/:id/publish', async (req, res, next) => {
  try {
    const sheet = await cheatSheetService.publishCheatSheet(req.user.id, req.params.id)
    res.json({ sheet })
  } catch (err) { next(err) }
})

module.exports = router
