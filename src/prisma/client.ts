// src/prisma/client.ts
import { PrismaClient } from '@prisma/client';

// Standard singleton pattern — without this, Express's dev
// hot-reload (or Next.js API routes if you later merge them)
// will spin up a new PrismaClient per reload and exhaust
// Postgres's connection limit within minutes.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
