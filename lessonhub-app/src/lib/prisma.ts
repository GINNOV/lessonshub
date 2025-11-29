// file: src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

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

const prisma =
  global.prisma ||
  new PrismaClient({
    adapter: new PrismaPg(pool),
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') global.prisma = prisma

export default prisma
