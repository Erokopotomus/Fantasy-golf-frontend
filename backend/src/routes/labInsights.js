const express = require('express')
const { authenticate } = require('../middleware/auth')
const insightGenerator = require('../services/insightGenerator')
const svc = require('../services/draftBoardService')

const router = express.Router()

router.use(authenticate)

// GET /api/lab/insight — get/generate insight for current user
router.get('/insight', async (req, res, next) => {
  try {
    const insight = await insightGenerator.generateInsight(req.user.id)
    res.json({ insight })
  } catch (err) { next(err) }
})

// POST /api/lab/insight/dismiss — dismiss current insight
router.post('/insight/dismiss', async (req, res, next) => {
  try {
    const result = await insightGenerator.dismissInsight(req.user.id)
    res.json(result)
  } catch (err) { next(err) }
})

// GET /api/lab/readiness/:boardId — get readiness for specific board
router.get('/readiness/:boardId', async (req, res, next) => {
  try {
    const readiness = await svc.getBoardReadiness(req.params.boardId, req.user.id)
    res.json({ readiness })
  } catch (err) { next(err) }
})

module.exports = router
