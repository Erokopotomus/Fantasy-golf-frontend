const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { optionalAuth } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// GET /api/courses — List courses with optional search
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query

    const where = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nickname: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        select: {
          id: true,
          name: true,
          nickname: true,
          city: true,
          state: true,
          country: true,
          par: true,
          yardage: true,
          grassType: true,
          architect: true,
          imageUrl: true,
          _count: { select: { tournaments: true } },
        },
        orderBy: { name: 'asc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.course.count({ where }),
    ])

    res.json({
      courses,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + courses.length < total,
      },
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/courses/:id — Full course detail
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        tournaments: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true,
            purse: true,
            fieldSize: true,
            isMajor: true,
            isSignature: true,
          },
          orderBy: { startDate: 'desc' },
          take: 20,
        },
        playerHistory: {
          select: {
            id: true,
            rounds: true,
            avgScore: true,
            avgToPar: true,
            bestFinish: true,
            wins: true,
            top10s: true,
            lastPlayed: true,
            player: {
              select: {
                id: true,
                name: true,
                country: true,
                countryFlag: true,
                headshotUrl: true,
              },
            },
          },
          orderBy: { avgToPar: 'asc' },
          take: 25,
          where: { rounds: { gte: 4 } },
        },
      },
    })

    if (!course) {
      return res.status(404).json({ error: { message: 'Course not found' } })
    }

    res.json({ course })
  } catch (error) {
    next(error)
  }
})

module.exports = router
