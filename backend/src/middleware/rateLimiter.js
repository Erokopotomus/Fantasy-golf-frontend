const rateLimit = require('express-rate-limit')

// Strict limiter for auth endpoints (login/signup)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts. Please try again in 15 minutes.' } },
})

// Moderate limiter for general API endpoints
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests. Please slow down.' } },
})

// Strict limiter for mutation endpoints (POST/PUT/PATCH/DELETE on sensitive routes)
const mutationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 mutations per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests. Please slow down.' } },
})

// Very strict limiter for import/sync operations
const heavyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 operations per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Import operations are rate limited. Please wait a few minutes.' } },
})

module.exports = {
  authLimiter,
  apiLimiter,
  mutationLimiter,
  heavyLimiter,
}
