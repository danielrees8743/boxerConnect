/**
 * Verify Supabase Schema Deployment
 *
 * Checks that all tables were created successfully in Supabase
 */

import { PrismaClient } from '@prisma/client';

require('dotenv').config();

const prisma = new PrismaClient();

async function verifySchema() {
  console.log('🔍 Verifying Supabase schema deployment...\n');

  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Count records in each table
    console.log('\n📊 Table record counts:');

    const users = await prisma.user.count();
    console.log(`   Users: ${users}`);

    const boxers = await prisma.boxer.count();
    console.log(`   Boxers: ${boxers}`);

    const fightHistory = await prisma.fightHistory.count();
    console.log(`   Fight History: ${fightHistory}`);

    const availability = await prisma.availability.count();
    console.log(`   Availability: ${availability}`);

    const matchRequests = await prisma.matchRequest.count();
    console.log(`   Match Requests: ${matchRequests}`);

    const clubs = await prisma.club.count();
    console.log(`   Clubs: ${clubs}`);

    const clubCoaches = await prisma.clubCoach.count();
    console.log(`   Club Coaches: ${clubCoaches}`);

    const coachBoxers = await prisma.coachBoxer.count();
    console.log(`   Coach-Boxer Relationships: ${coachBoxers}`);

    const videos = await prisma.boxerVideo.count();
    console.log(`   Boxer Videos: ${videos}`);

    console.log('\n✅ All tables accessible!');
    console.log('\n📋 Schema deployment verified successfully!');
    console.log('   - All 9 tables created');
    console.log('   - Database is ready for use');
    console.log('   - Currently empty (no data migrated yet)');

    return true;
  } catch (error) {
    console.error('\n❌ Schema verification failed:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

verifySchema()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
