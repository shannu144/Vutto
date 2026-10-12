import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

export const prisma = new PrismaClient({
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' },
  ],
});

prisma.$on('warn', (e) => logger.warn(`Prisma: ${e.message}`));
prisma.$on('error', (e) => logger.error(`Prisma error: ${e.message}`));

// Enable SQLite Write-Ahead Logging (WAL) mode for fast concurrent reads & writes
export async function initializeDatabase() {
  try {
    await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
    logger.info('Database initialized with SQLite WAL mode.');
  } catch (err: any) {
    logger.warn('Could not set WAL mode (might not be SQLite):', err.message);
  }
}
