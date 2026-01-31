// Prisma Client Singleton
// Prevents multiple instances during hot reloading in development

import { PrismaClient } from '@prisma/client';
import { serverConfig } from './env';

// Extend the global namespace to include prisma
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Create Prisma client with logging configuration
const createPrismaClient = (): PrismaClient => {
  return new PrismaClient({
    log: serverConfig.isDevelopment
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
    errorFormat: serverConfig.isDevelopment ? 'pretty' : 'minimal',
  });
};

// Use singleton pattern for Prisma client
// In development, attach to global to prevent multiple instances during hot reload
const prisma: PrismaClient = global.prisma ?? createPrismaClient();

if (serverConfig.isDevelopment) {
  global.prisma = prisma;
}

// Database connection helper
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

// Database disconnection helper
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('Database disconnected successfully');
  } catch (error) {
    console.error('Failed to disconnect from database:', error);
    throw error;
  }
}

// Health check for database
export async function checkDatabaseHealth(): Promise<{
  status: 'up' | 'down';
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'up',
      latency: Date.now() - startTime,
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

export { prisma };
export default prisma;
