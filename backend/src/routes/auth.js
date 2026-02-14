const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { body, validationResult } = require('express-validator')
const { authenticate } = require('../middleware/auth')

const router = express.Router()
const prisma = require('../lib/prisma.js')

// Validation middleware
const validateSignup = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username: letters, numbers, and underscores only')
]

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required')
]

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  })
}

// POST /api/auth/signup
router.post('/signup', validateSignup, async (req, res, next) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: errors.array()[0].msg } })
    }

    const { email, password, name, username } = req.body

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ error: { message: 'Email already in use' } })
    }

    // Check if username is taken
    const existingUsername = await prisma.user.findUnique({ where: { username } })
    if (existingUsername) {
      return res.status(400).json({ error: { message: 'Username already taken' } })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        username,
        avatar: name.charAt(0).toUpperCase()
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatar: true,
        role: true,
        createdAt: true
      }
    })

    // Generate token
    const token = generateToken(user.id)

    res.status(201).json({
      user,
      token
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/auth/login
router.post('/login', validateLogin, async (req, res, next) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: errors.array()[0].msg } })
    }

    const { email, password } = req.body

    // Find user
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ error: { message: 'Invalid email or password' } })
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ error: { message: 'Invalid email or password' } })
    }

    // Generate token
    const token = generateToken(user.id)

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role || 'user',
        createdAt: user.createdAt
      },
      token
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user })
})

// POST /api/auth/refresh
router.post('/refresh', authenticate, async (req, res) => {
  const token = generateToken(req.user.id)
  res.json({ token })
})

module.exports = router
