// file: src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'
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
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const shouldLogQueries = process.env.PRISMA_LOG_QUERIES === 'true'

const prisma =
  global.prisma ||
  new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: shouldLogQueries ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') global.prisma = prisma

export default prisma
