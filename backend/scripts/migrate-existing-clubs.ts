/**
 * Migrate Existing Clubs - Set Default Values for Enhanced Profiles
 *
 * Ensures all existing clubs are visible to the public:
 * - isPublished = true (make existing clubs visible)
 * - acceptingMembers = true (allow new members)
 */

import { PrismaClient } from '@prisma/client';
import { withSystemContext } from '../src/utils/database-context';

const prisma = new PrismaClient();

async function migrateExistingClubs() {
  console.log('🔄 Migrating existing clubs with enhanced profile defaults...\n');

  try {
    // Get current stats
    const stats = await withSystemContext(
      async (tx) => {
        const totalClubs = await tx.club.count();
        const publishedClubs = await tx.club.count({
          where: { isPublished: true }
        });
        const unpublishedClubs = await tx.club.count({
          where: { isPublished: false }
        });
        const acceptingClubs = await tx.club.count({
          where: { acceptingMembers: true }
        });
        const notAcceptingClubs = await tx.club.count({
          where: { acceptingMembers: false }
        });

        return {
          totalClubs,
          publishedClubs,
          unpublishedClubs,
          acceptingClubs,
          notAcceptingClubs
        };
      },
      'Migrate clubs - fetching current statistics'
    );

    console.log('📊 Current Database Statistics:');
    console.log(`   Total clubs: ${stats.totalClubs}`);
    console.log(`   Published clubs: ${stats.publishedClubs}`);
    console.log(`   Unpublished clubs: ${stats.unpublishedClubs}`);
    console.log(`   Accepting members: ${stats.acceptingClubs}`);
    console.log(`   Not accepting members: ${stats.notAcceptingClubs}`);
    console.log('');

    // Find unpublished clubs to make visible
    if (stats.unpublishedClubs > 0) {
      console.log(`📋 Found ${stats.unpublishedClubs} unpublished clubs to make visible\n`);

      const result = await withSystemContext(
        async (tx) => {
          return await tx.club.updateMany({
            where: { isPublished: false },
            data: { isPublished: true }
          });
        },
        'Migrate clubs - publishing all clubs'
      );

      console.log(`✅ Published ${result.count} clubs`);
    } else {
      console.log('✅ All clubs are already published!\n');
    }

    // Ensure all clubs are accepting members
    if (stats.notAcceptingClubs > 0) {
      console.log(`📋 Found ${stats.notAcceptingClubs} clubs not accepting members\n`);

      const result = await withSystemContext(
        async (tx) => {
          return await tx.club.updateMany({
            where: { acceptingMembers: false },
            data: { acceptingMembers: true }
          });
        },
        'Migrate clubs - enabling member acceptance'
      );

      console.log(`✅ Enabled member acceptance for ${result.count} clubs`);
    } else {
      console.log('✅ All clubs are already accepting members!\n');
    }

    // Final verification
    const finalStats = await withSystemContext(
      async (tx) => {
        const totalClubs = await tx.club.count();
        const publishedClubs = await tx.club.count({
          where: { isPublished: true }
        });
        const acceptingClubs = await tx.club.count({
          where: { acceptingMembers: true }
        });

        return { totalClubs, publishedClubs, acceptingClubs };
      },
      'Migrate clubs - fetching final statistics'
    );

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Complete - Final Statistics');
    console.log('='.repeat(60));
    console.log(`   Total clubs: ${finalStats.totalClubs}`);
    console.log(`   Published clubs: ${finalStats.publishedClubs}`);
    console.log(`   Accepting members: ${finalStats.acceptingClubs}`);
    console.log('='.repeat(60));

    if (finalStats.publishedClubs === finalStats.totalClubs &&
        finalStats.acceptingClubs === finalStats.totalClubs) {
      console.log('\n✅ All clubs are now published and accepting members!\n');
    }

  } catch (error) {
    console.error('❌ Fatal error during migration:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateExistingClubs().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
