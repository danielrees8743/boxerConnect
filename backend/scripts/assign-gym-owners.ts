/**
 * Create and Assign Gym Owners to Clubs
 *
 * Creates GYM_OWNER users for all clubs without owners and assigns them
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { withSystemContext } from '../src/utils/database-context';

const prisma = new PrismaClient();

const BCRYPT_COST = 12; // Match security standard
const DEFAULT_PASSWORD = 'password123'; // Default password for all gym owners

async function assignGymOwnersToClubs() {
  console.log('🏋️  Creating and assigning gym owners to clubs...\n');

  try {
    // Get all clubs without owners
    const clubs = await withSystemContext(
      async (tx) => {
        return await tx.club.findMany({
          where: { ownerId: null },
          orderBy: { name: 'asc' },
        });
      },
      'Create gym owners - fetching clubs without owners'
    );

    console.log(`📋 Found ${clubs.length} clubs without owners\n`);

    if (clubs.length === 0) {
      console.log('⚠️  No clubs without owners found. All clubs already assigned!');
      return;
    }

    let created = 0;
    let errors = 0;

    // Create a gym owner for each club
    for (const club of clubs) {
      try {
        // Generate gym owner email from club name
        const emailSlug = club.name
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '') // Remove special chars
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .substring(0, 50); // Limit length

        const email = `owner.${emailSlug}@boxerconnect.com`;

        // Check if a user with this email already exists
        const existingUser = await withSystemContext(
          async (tx) => {
            return await tx.user.findUnique({
              where: { email },
            });
          },
          'Create gym owners - checking for existing user'
        );

        if (existingUser) {
          // Update the club to link to existing owner
          await withSystemContext(
            async (tx) => {
              await tx.club.update({
                where: { id: club.id },
                data: { ownerId: existingUser.id },
              });
            },
            `Create gym owners - linking existing owner to ${club.name}`
          );

          console.log(`🔗 Linked existing owner to ${club.name}`);
          created++;
          continue;
        }

        // Create gym owner user and assign to club
        await withSystemContext(
          async (tx) => {
            const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_COST);

            // Create the gym owner user
            const owner = await tx.user.create({
              data: {
                email,
                passwordHash,
                name: club.contactName || `${club.name} Owner`,
                role: 'GYM_OWNER',
                isActive: true,
                emailVerified: false,
              },
            });

            // Update the club with the owner
            await tx.club.update({
              where: { id: club.id },
              data: { ownerId: owner.id },
            });

            console.log(`✅ Created and assigned owner for ${club.name} (${email})`);
          },
          `Create gym owners - creating owner for ${club.name}`
        );

        created++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to create owner for ${club.name}:`, errorMessage);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary');
    console.log('='.repeat(60));
    console.log(`✅ Successfully created/assigned: ${created} gym owners`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(60));

    // Show final stats
    const stats = await withSystemContext(
      async (tx) => {
        const totalClubs = await tx.club.count();
        const clubsWithOwners = await tx.club.count({
          where: { ownerId: { not: null } },
        });
        const clubsWithoutOwners = await tx.club.count({
          where: { ownerId: null },
        });
        const gymOwnersCount = await tx.user.count({
          where: { role: 'GYM_OWNER' },
        });
        const ownersWithClubs = await tx.user.count({
          where: {
            role: 'GYM_OWNER',
            ownedClubs: { some: {} },
          },
        });

        return {
          totalClubs,
          clubsWithOwners,
          clubsWithoutOwners,
          gymOwnersCount,
          ownersWithClubs,
        };
      },
      'Assign gym owners - fetching final stats'
    );

    console.log('\n📊 Final Database Statistics:');
    console.log(`   Total clubs: ${stats.totalClubs}`);
    console.log(`   Clubs with owners: ${stats.clubsWithOwners}`);
    console.log(`   Clubs without owners: ${stats.clubsWithoutOwners}`);
    console.log(`   Total gym owners: ${stats.gymOwnersCount}`);
    console.log(`   Gym owners with clubs: ${stats.ownersWithClubs}`);

    if (stats.clubsWithoutOwners > 0) {
      console.log(`\n⚠️  ${stats.clubsWithoutOwners} clubs still need owners assigned.`);
    }

    console.log('\n✅ Assignment complete!\n');
  } catch (error) {
    console.error('❌ Fatal error during assignment:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

assignGymOwnersToClubs().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
