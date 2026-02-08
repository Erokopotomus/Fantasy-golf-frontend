/**
 * Simple input validation middleware.
 * Validates request body fields and returns 400 if validation fails.
 */

function validateBody(rules) {
  return (req, res, next) => {
    const errors = []

    for (const [field, checks] of Object.entries(rules)) {
      const value = req.body[field]

      if (checks.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`)
        continue
      }

      if (value === undefined || value === null) continue

      if (checks.type === 'string' && typeof value !== 'string') {
        errors.push(`${field} must be a string`)
      }

      if (checks.type === 'number' && typeof value !== 'number') {
        errors.push(`${field} must be a number`)
      }

      if (checks.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`${field} must be a boolean`)
      }

      if (checks.enum && !checks.enum.includes(value)) {
        errors.push(`${field} must be one of: ${checks.enum.join(', ')}`)
      }

      if (checks.maxLength && typeof value === 'string' && value.length > checks.maxLength) {
        errors.push(`${field} must be at most ${checks.maxLength} characters`)
      }

      if (checks.minLength && typeof value === 'string' && value.length < checks.minLength) {
        errors.push(`${field} must be at least ${checks.minLength} characters`)
      }

      if (checks.min !== undefined && typeof value === 'number' && value < checks.min) {
        errors.push(`${field} must be at least ${checks.min}`)
      }

      if (checks.max !== undefined && typeof value === 'number' && value > checks.max) {
        errors.push(`${field} must be at most ${checks.max}`)
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: { message: errors[0], errors } })
    }

    next()
  }
}

/**
 * Sanitize a string — trim whitespace and remove any null bytes.
 */
function sanitize(str) {
  if (typeof str !== 'string') return str
  return str.trim().replace(/\0/g, '')
}

module.exports = { validateBody, sanitize }
