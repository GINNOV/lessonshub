// file: src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

// Strip prisma debug tokens that would flood dev tools when DEBUG is set
if (process.env.DEBUG?.includes('prisma')) {
  process.env.DEBUG = process.env.DEBUG
    .split(/[,\s]+/)
    .filter(token => token && !token.startsWith('prisma:'))
    .join(',')
}

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const pool = global.pgPool || new Pool({ connectionString })
if (process.env.NODE_ENV !== 'production') {
  global.pgPool = pool
}

const shouldLogQueries = process.env.PRISMA_LOG_QUERIES === 'true'

const prisma =
  global.prisma ||
  new PrismaClient({
    adapter: new PrismaPg(pool),
    log: shouldLogQueries ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') global.prisma = prisma

export default prisma
