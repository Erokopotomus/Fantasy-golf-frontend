// Shared Prisma client singleton
// ALL files should import from here instead of creating new PrismaClient()
// This prevents connection pool exhaustion (was creating 56+ separate clients)

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  // Log slow queries in development
  log: process.env.NODE_ENV === 'development'
    ? ['warn', 'error']
    : ['error'],
})

module.exports = prisma
