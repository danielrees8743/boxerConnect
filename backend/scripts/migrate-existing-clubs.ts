/**
 * Migrate Existing Clubs - Set Default Values for PHASE 5 Fields
 *
 * Sets default values for existing clubs after the schema migration:
 * - isPublished = true (make existing clubs visible)
 * - acceptingMembers = true (allow new members)
 */

import { PrismaClient } from '@prisma/client';
import { withSystemContext } from '../src/utils/database-context';

const prisma = new PrismaClient();

async function migrateExistingClubs() {
  console.log('🔄 Migrating existing clubs with PHASE 5 defaults...\n');

  try {
    // Find all clubs that need migration
    const clubsToMigrate = await withSystemContext(
      async (tx) => {
        return await tx.club.findMany({
          where: {
            OR: [
              { isPublished: null },
              { acceptingMembers: null }
            ]
          },
          select: {
            id: true,
            name: true,
            isPublished: true,
            acceptingMembers: true
          },
          orderBy: { name: 'asc' }
        });
      },
      'Migrate clubs - fetching clubs needing default values'
    );

    console.log(`📋 Found ${clubsToMigrate.length} clubs needing migration\n`);

    if (clubsToMigrate.length === 0) {
      console.log('✅ All clubs are already migrated!\n');
      return;
    }

    let updated = 0;
    let errors = 0;

    // Update each club with default values
    for (const club of clubsToMigrate) {
      try {
        const updates: any = {};

        // Set isPublished to true if null (make existing clubs visible)
        if (club.isPublished === null) {
          updates.isPublished = true;
        }

        // Set acceptingMembers to true if null (allow new members)
        if (club.acceptingMembers === null) {
          updates.acceptingMembers = true;
        }

        // Only update if there are changes
        if (Object.keys(updates).length > 0) {
          await withSystemContext(
            async (tx) => {
              await tx.club.update({
                where: { id: club.id },
                data: updates
              });
            },
            `Migrate clubs - updating ${club.name}`
          );

          updated++;
          console.log(`  ✅ ${updated}/${clubsToMigrate.length} - Updated ${club.name}`);
        }

      } catch (error) {
        errors++;
        console.error(
          `  ❌ Error updating ${club.name}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));
    console.log(`✅ Successfully migrated: ${updated} clubs`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(60));

    // Verify migration completion
    const stats = await withSystemContext(
      async (tx) => {
        const totalClubs = await tx.club.count();
        const publishedClubs = await tx.club.count({
          where: { isPublished: true }
        });
        const acceptingClubs = await tx.club.count({
          where: { acceptingMembers: true }
        });
        const nullPublished = await tx.club.count({
          where: { isPublished: null }
        });
        const nullAccepting = await tx.club.count({
          where: { acceptingMembers: null }
        });

        return {
          totalClubs,
          publishedClubs,
          acceptingClubs,
          nullPublished,
          nullAccepting
        };
      },
      'Migrate clubs - fetching final statistics'
    );

    console.log('\n📊 Final Database Statistics:');
    console.log(`   Total clubs: ${stats.totalClubs}`);
    console.log(`   Published clubs: ${stats.publishedClubs}`);
    console.log(`   Accepting members: ${stats.acceptingClubs}`);
    console.log(`   Clubs with null isPublished: ${stats.nullPublished}`);
    console.log(`   Clubs with null acceptingMembers: ${stats.nullAccepting}`);

    if (stats.nullPublished > 0 || stats.nullAccepting > 0) {
      console.log(`\n⚠️  ${Math.max(stats.nullPublished, stats.nullAccepting)} clubs still need migration.`);
    } else {
      console.log('\n✅ All clubs successfully migrated!');
    }

    console.log('\n✅ Migration complete!\n');

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
