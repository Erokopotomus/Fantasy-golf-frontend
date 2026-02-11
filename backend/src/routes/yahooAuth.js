/**
 * Yahoo OAuth Routes — Authorization flow for Yahoo Fantasy API
 *
 * GET  /api/auth/yahoo          — Redirect user to Yahoo login
 * GET  /api/auth/yahoo/callback — Handle OAuth callback, store tokens
 */

const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

const YAHOO_AUTH_URL = 'https://api.login.yahoo.com/oauth2/request_auth'
const YAHOO_TOKEN_URL = 'https://api.login.yahoo.com/oauth2/get_token'

// GET /api/auth/yahoo — Initiate Yahoo OAuth flow
// Supports JWT via query param (?token=...) since this is a browser redirect, not a fetch call
router.get('/yahoo', async (req, res, next) => {
  // Try query param token first (browser redirect), then fall back to header auth
  if (req.query.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`
  }
  authenticate(req, res, next)
}, (req, res) => {
  const clientId = process.env.YAHOO_CLIENT_ID
  const redirectUri = process.env.YAHOO_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/import?error=yahoo_not_configured`)
  }

  // Encode userId in state to link callback to the right user
  const state = Buffer.from(JSON.stringify({ userId: req.user.id })).toString('base64')

  // Build OAuth URL — send client_id raw (Yahoo doesn't decode %3D in base64 IDs)
  const trimmedClientId = clientId.trim()
  const authUrl = `${YAHOO_AUTH_URL}?client_id=${trimmedClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${encodeURIComponent(state)}`

  console.log('[Yahoo OAuth] Redirecting, client_id length:', trimmedClientId.length)
  res.redirect(authUrl)
})

// GET /api/auth/yahoo/callback — Handle Yahoo OAuth callback
router.get('/yahoo/callback', async (req, res) => {
  const { code, state, error: oauthError } = req.query

  if (oauthError) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/import?error=yahoo_denied`)
  }

  if (!code || !state) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/import?error=yahoo_missing_params`)
  }

  // Decode state to get userId
  let userId
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'))
    userId = decoded.userId
  } catch {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/import?error=yahoo_invalid_state`)
  }

  const clientId = process.env.YAHOO_CLIENT_ID
  const clientSecret = process.env.YAHOO_CLIENT_SECRET
  const redirectUri = process.env.YAHOO_REDIRECT_URI

  if (!clientId || !clientSecret) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/import?error=yahoo_not_configured`)
  }

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch(YAHOO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    })

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text()
      console.error('Yahoo token exchange failed:', errBody)
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/import?error=yahoo_token_failed`)
    }

    const tokenData = await tokenRes.json()

    // Calculate expiration
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null

    // Store tokens in DB
    await prisma.userOAuthToken.upsert({
      where: { userId_provider: { userId, provider: 'yahoo' } },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        expiresAt,
      },
      create: {
        userId,
        provider: 'yahoo',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        expiresAt,
      },
    })

    // Redirect to import page with success
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/import?yahoo=connected`)
  } catch (err) {
    console.error('Yahoo OAuth callback error:', err)
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/import?error=yahoo_callback_error`)
  }
})

// GET /api/auth/yahoo/status — Check if user has a Yahoo token
router.get('/yahoo/status', authenticate, async (req, res) => {
  try {
    const token = await prisma.userOAuthToken.findUnique({
      where: { userId_provider: { userId: req.user.id, provider: 'yahoo' } },
      select: { expiresAt: true, createdAt: true, updatedAt: true },
    })

    if (!token) {
      return res.json({ connected: false })
    }

    const isExpired = token.expiresAt && new Date() > new Date(token.expiresAt)

    res.json({
      connected: true,
      expiresAt: token.expiresAt,
      isExpired,
      lastUpdated: token.updatedAt,
    })
  } catch (error) {
    res.status(500).json({ error: { message: error.message } })
  }
})

// DELETE /api/auth/yahoo — Disconnect Yahoo
router.delete('/yahoo', authenticate, async (req, res) => {
  try {
    await prisma.userOAuthToken.deleteMany({
      where: { userId: req.user.id, provider: 'yahoo' },
    })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: { message: error.message } })
  }
})

/**
 * Refresh a Yahoo access token using the refresh token.
 * Called internally by yahooImport when a 401 is encountered.
 */
async function refreshYahooToken(userId) {
  const tokenRecord = await prisma.userOAuthToken.findUnique({
    where: { userId_provider: { userId, provider: 'yahoo' } },
  })

  if (!tokenRecord || !tokenRecord.refreshToken) {
    throw new Error('No Yahoo refresh token available. Please re-authorize.')
  }

  const clientId = process.env.YAHOO_CLIENT_ID
  const clientSecret = process.env.YAHOO_CLIENT_SECRET

  const tokenRes = await fetch(YAHOO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenRecord.refreshToken,
    }),
  })

  if (!tokenRes.ok) {
    throw new Error('Yahoo token refresh failed. Please re-authorize.')
  }

  const tokenData = await tokenRes.json()
  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null

  await prisma.userOAuthToken.update({
    where: { userId_provider: { userId, provider: 'yahoo' } },
    data: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || tokenRecord.refreshToken,
      expiresAt,
    },
  })

  return tokenData.access_token
}

module.exports = router
module.exports.refreshYahooToken = refreshYahooToken
