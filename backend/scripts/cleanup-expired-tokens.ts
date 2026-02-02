#!/usr/bin/env ts-node
/**
 * Cleanup Expired Authentication Tokens
 *
 * This script removes expired refresh tokens and used/expired password reset tokens
 * from the database. Should be run periodically via cron job.
 *
 * Usage:
 *   npx ts-node scripts/cleanup-expired-tokens.ts
 *
 * Recommended cron schedule (every 6 hours):
 *   Run: 0 star-slash-6 star star star
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupExpiredTokens() {
  console.log('Starting token cleanup...');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const now = new Date();

  try {
    // Cleanup expired refresh tokens
    const deletedRefreshTokens = await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    // Cleanup expired or used password reset tokens
    const deletedResetTokens = await prisma.passwordResetToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { usedAt: { not: null } },
        ],
      },
    });

    console.log('Cleanup complete:');
    console.log(`- Refresh tokens removed: ${deletedRefreshTokens.count}`);
    console.log(`- Reset tokens removed: ${deletedResetTokens.count}`);
    console.log('---');
  } catch (error) {
    console.error('Cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute cleanup
cleanupExpiredTokens()
  .then(() => {
    console.log('Token cleanup job completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Token cleanup job failed:', error);
    process.exit(1);
  });
