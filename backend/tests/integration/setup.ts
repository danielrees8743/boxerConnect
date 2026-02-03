/**
 * Integration Test Setup
 *
 * This setup file configures the test environment for integration tests
 * that interact with a real PostgreSQL database.
 */

import { PrismaClient } from '@prisma/client';

// Ensure we're using the test database
if (!process.env.DATABASE_URL?.includes('_test')) {
  console.error('CRITICAL ERROR: Integration tests must use a test database!');
  console.error('Current DATABASE_URL:', process.env.DATABASE_URL);
  console.error('Expected: DATABASE_URL must contain "_test" suffix');
  process.exit(1);
}

// Create a singleton Prisma client for tests
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.DEBUG_TESTS === 'true' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Global setup for integration tests
beforeAll(async () => {
  console.log('='.repeat(80));
  console.log('INTEGRATION TEST SETUP');
  console.log('='.repeat(80));
  console.log('Database:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
  console.log('Node Environment:', process.env.NODE_ENV);
  console.log('='.repeat(80));

  // Verify database connection
  try {
    await testPrisma.$connect();
    console.log('✅ Database connection successful');

    // Verify RLS is enabled
    const rlsCheck = await testPrisma.$queryRaw<Array<{ tablename: string; rowsecurity: boolean }>>`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('users', 'boxers', 'clubs', 'match_requests', 'refresh_tokens', 'password_reset_tokens')
      ORDER BY tablename;
    `;

    console.log('\n📋 RLS Status:');
    rlsCheck.forEach(table => {
      const status = table.rowsecurity ? '✅ ENABLED' : '❌ DISABLED';
      console.log(`   ${table.tablename}: ${status}`);
    });

    const allEnabled = rlsCheck.every(t => t.rowsecurity);
    if (!allEnabled) {
      console.error('\n⚠️  WARNING: Not all tables have RLS enabled!');
      console.error('Run the RLS migration before running these tests:');
      console.error('npm run prisma:migrate');
    }

    console.log('\n' + '='.repeat(80));
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
});

// Global teardown
afterAll(async () => {
  console.log('\n' + '='.repeat(80));
  console.log('INTEGRATION TEST TEARDOWN');
  console.log('='.repeat(80));
  console.log('Disconnecting from database...');

  await testPrisma.$disconnect();

  console.log('✅ Cleanup complete');
  console.log('='.repeat(80));
});

// Increase timeout for integration tests
jest.setTimeout(60000); // 60 seconds
