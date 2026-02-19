/**
 * Create and assign coaches to clubs
 * Ensures each club has at least one coach
 */

import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { withSystemContext } from '../src/utils/database-context';

const prisma = new PrismaClient();
const BCRYPT_COST = 12;

const firstNames = [
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph',
  'Thomas', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven',
  'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian', 'George', 'Timothy',
  'Ronald', 'Edward', 'Jason', 'Jeffrey', 'Ryan', 'Jacob', 'Gary', 'Nicholas',
  'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon', 'Benjamin'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'
];

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)] as T;
}

/**
 * Generate coach name and email based on club
 */
function generateCoachData(clubName: string, index: number) {
  const firstName = randomElement(firstNames);
  const lastName = randomElement(lastNames);
  const name = `Coach ${firstName} ${lastName}`;

  // Generate email based on name and club
  const clubSlug = clubName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const nameSlug = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  const email = `coach.${nameSlug}.${clubSlug}@boxerconnect.com`;

  return { name, email };
}

async function main() {
  console.log('👨‍🏫 Creating coaches for all clubs...\n');

  try {
    // Get all clubs with their current coaches
    const clubs = await withSystemContext(
      async (tx) => {
        return await tx.club.findMany({
          include: {
            coaches: true,
            _count: {
              select: { coaches: true }
            }
          },
          orderBy: { name: 'asc' }
        });
      },
      'Create club coaches - fetching all clubs'
    );

    console.log(`📋 Found ${clubs.length} clubs\n`);

    // Find clubs without coaches
    const clubsWithoutCoaches = clubs.filter(c => c._count.coaches === 0);
    console.log(`❌ Clubs without coaches: ${clubsWithoutCoaches.length}`);
    console.log(`✅ Clubs with coaches: ${clubs.length - clubsWithoutCoaches.length}\n`);

    if (clubsWithoutCoaches.length === 0) {
      console.log('✅ All clubs already have at least one coach!\n');
      return;
    }

    console.log(`📝 Creating ${clubsWithoutCoaches.length} new coaches...\n`);

    let created = 0;
    let errors = 0;

    for (const club of clubsWithoutCoaches) {
      try {
        const coachData = generateCoachData(club.name, created);
        const passwordHash = await bcrypt.hash('coach123', BCRYPT_COST);

        // Create coach user and assign to club in a transaction
        await withSystemContext(
          async (tx) => {
            // Check if email already exists
            let email = coachData.email;
            const existingUser = await tx.user.findUnique({
              where: { email }
            });

            if (existingUser) {
              // Email collision, modify email
              email = `${coachData.email.split('@')[0]}.${Date.now()}@boxerconnect.com`;
            }

            // Create coach user account
            const coachUser = await tx.user.create({
              data: {
                email,
                passwordHash,
                name: coachData.name,
                role: UserRole.COACH,
                isActive: true,
                emailVerified: true
              }
            });

            // Assign coach to club
            await tx.clubCoach.create({
              data: {
                clubId: club.id,
                coachUserId: coachUser.id,
                isHead: true // First coach is head coach
              }
            });
          },
          `Create club coaches - creating coach for ${club.name}`
        );

        created++;
        console.log(`  ✅ ${created}/${clubsWithoutCoaches.length} - Created ${coachData.name} for ${club.name}`);

      } catch (error) {
        errors++;
        console.error(`  ❌ Error creating coach for ${club.name}:`, error instanceof Error ? error.message : error);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary');
    console.log('='.repeat(60));
    console.log(`✅ Successfully created: ${created} coaches`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(60));

    // Final statistics
    const totalCoaches = await withSystemContext(
      async (tx) => await tx.user.count({ where: { role: UserRole.COACH } }),
      'Create club coaches - counting total coaches'
    );

    const clubsWithCoachesNow = await withSystemContext(
      async (tx) => {
        return await tx.club.count({
          where: { coaches: { some: {} } }
        });
      },
      'Create club coaches - counting clubs with coaches'
    );

    console.log('\n📊 Final Statistics:');
    console.log(`   Total coaches: ${totalCoaches}`);
    console.log(`   Clubs with coaches: ${clubsWithCoachesNow}/${clubs.length}`);
    console.log(`   Coverage: ${Math.round(clubsWithCoachesNow / clubs.length * 100)}%\n`);

    console.log('✅ Complete!\n');

  } catch (error) {
    console.error('❌ Script failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
