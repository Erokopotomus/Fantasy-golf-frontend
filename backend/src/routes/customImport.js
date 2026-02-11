/**
 * Custom Import Routes (Addendum Part 2)
 *
 * Handles spreadsheet file uploads, Google Sheets URL imports,
 * and website crawling for custom league data.
 *
 * Routes:
 *   POST   /api/import/custom/spreadsheet       — Upload xlsx/csv file
 *   POST   /api/import/custom/sheets-url         — Import from Google Sheets URL
 *   POST   /api/import/custom/website            — Crawl and import website
 *   GET    /api/import/custom/:previewId/preview — Get import preview
 *   POST   /api/import/custom/:previewId/confirm — Confirm and finalize import
 *   GET    /api/leagues/:leagueId/custom-data    — Get all custom data for a league
 *   DELETE /api/leagues/:leagueId/custom-data/:dataId — Remove custom data record
 */

const express = require('express')
const router = express.Router()
const multer = require('multer')
const { authenticate } = require('../middleware/auth')
const customDataImport = require('../services/customDataImport')

// Configure multer for file uploads — 10MB limit, memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]
    // Also check extension since MIME types can be unreliable
    const ext = file.originalname.toLowerCase().split('.').pop()
    if (allowed.includes(file.mimetype) || ['csv', 'xlsx', 'xls'].includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Only .xlsx, .xls, and .csv files are supported'))
    }
  },
})

// ─── Upload Spreadsheet ─────────────────────────────────────────────────────
// POST /api/import/custom/spreadsheet
router.post('/spreadsheet', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: 'No file uploaded' } })
    }
    if (!req.body.leagueId) {
      return res.status(400).json({ error: { message: 'leagueId is required' } })
    }

    const preview = await customDataImport.previewSpreadsheetImport(
      req.file.buffer,
      req.file.originalname,
      req.body.leagueId,
      req.user.id
    )

    res.json(preview)
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
})

// ─── Google Sheets URL Import ───────────────────────────────────────────────
// POST /api/import/custom/sheets-url
router.post('/sheets-url', authenticate, async (req, res) => {
  try {
    const { url, leagueId } = req.body
    if (!url) {
      return res.status(400).json({ error: { message: 'Google Sheets URL is required' } })
    }
    if (!leagueId) {
      return res.status(400).json({ error: { message: 'leagueId is required' } })
    }

    const preview = await customDataImport.previewGoogleSheetsImport(
      url,
      leagueId,
      req.user.id
    )

    res.json(preview)
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
})

// ─── Website Crawl ──────────────────────────────────────────────────────────
// POST /api/import/custom/website
router.post('/website', authenticate, async (req, res) => {
  try {
    const { url, leagueId } = req.body
    if (!url) {
      return res.status(400).json({ error: { message: 'Website URL is required' } })
    }
    if (!leagueId) {
      return res.status(400).json({ error: { message: 'leagueId is required' } })
    }

    const preview = await customDataImport.previewWebsiteImport(
      url,
      leagueId,
      req.user.id
    )

    res.json(preview)
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
})

// ─── Confirm Import ─────────────────────────────────────────────────────────
// POST /api/import/custom/:previewId/confirm
router.post('/:previewId/confirm', authenticate, async (req, res) => {
  try {
    const { previewId } = req.params
    const { overrides, includedUrls } = req.body

    // Detect if this is a spreadsheet or website confirm
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    const preview = await prisma.rawProviderData.findUnique({
      where: { id: previewId },
    })

    if (!preview || preview.dataType !== 'import_preview') {
      return res.status(404).json({ error: { message: 'Import preview not found or expired' } })
    }

    let result
    if (preview.provider === 'website') {
      result = await customDataImport.confirmWebsiteImport(
        previewId,
        includedUrls || null,
        req.user.id
      )
    } else {
      result = await customDataImport.confirmSpreadsheetImport(
        previewId,
        overrides || {},
        req.user.id
      )
    }

    res.json({
      imported: result.length,
      records: result,
    })
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
})

// ─── Get Custom Data ────────────────────────────────────────────────────────
// GET /api/import/custom/league/:leagueId
router.get('/league/:leagueId', authenticate, async (req, res) => {
  try {
    const data = await customDataImport.getCustomData(req.params.leagueId)
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

// ─── Delete Custom Data Record ──────────────────────────────────────────────
// DELETE /api/import/custom/:dataId
router.delete('/:dataId', authenticate, async (req, res) => {
  try {
    await customDataImport.deleteCustomData(req.params.dataId, req.user.id)
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
})

module.exports = router
