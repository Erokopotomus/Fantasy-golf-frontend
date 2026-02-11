const express = require('express')
const { authenticate } = require('../middleware/auth')
const captureService = require('../services/captureService')

const router = express.Router()

router.use(authenticate)

// POST /api/lab/captures — create capture
router.post('/', async (req, res, next) => {
  try {
    const { content, sourceType, sourceName, sentiment, playerIds } = req.body
    if (!content || !content.trim()) {
      return res.status(400).json({ error: { message: 'Content is required' } })
    }
    if (content.length > 2000) {
      return res.status(400).json({ error: { message: 'Content must be 2000 characters or less' } })
    }
    const capture = await captureService.createCapture(req.user.id, {
      content: content.trim(),
      sourceType,
      sourceName,
      sentiment,
      playerIds,
    })
    res.status(201).json({ capture })
  } catch (err) { next(err) }
})

// GET /api/lab/captures/recent — quick feed for hub
router.get('/recent', async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 5
    const captures = await captureService.getRecentCaptures(req.user.id, limit)
    res.json({ captures })
  } catch (err) { next(err) }
})

// GET /api/lab/captures — paginated list with filters
router.get('/', async (req, res, next) => {
  try {
    const { sport, sentiment, search, limit, offset } = req.query
    const result = await captureService.listCaptures(req.user.id, { sport, sentiment, search, limit, offset })
    res.json(result)
  } catch (err) { next(err) }
})

// DELETE /api/lab/captures/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await captureService.deleteCapture(req.user.id, req.params.id)
    res.json(result)
  } catch (err) { next(err) }
})

module.exports = router
