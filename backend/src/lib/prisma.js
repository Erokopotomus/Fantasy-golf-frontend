// Shared Prisma client singleton
// ALL files should import from here instead of creating new PrismaClient()
// This prevents connection pool exhaustion (was creating 56+ separate clients)

const { PrismaClient } = require('@prisma/client')

// Railway PostgreSQL allows ~100 connections.
// With one shared client, a pool of 20 handles bursts well while leaving
// headroom for Railway's own internal connections and any manual psql sessions.
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + (process.env.DATABASE_URL?.includes('?') ? '&' : '?') + 'connection_limit=20&pool_timeout=30',
    },
  },
  log: process.env.NODE_ENV === 'development'
    ? ['warn', 'error']
    : ['error'],
})

module.exports = prisma
