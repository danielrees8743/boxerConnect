/**
 * Ensure all clubs have at least one boxer assigned
 * Creates additional boxers as needed and distributes them evenly
 */

import { PrismaClient, ExperienceLevel, Gender } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { withSystemContext } from '../src/utils/database-context';

const prisma = new PrismaClient();
const BCRYPT_COST = 12;

const firstNames = {
  male: ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles',
         'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth',
         'Kevin', 'Brian', 'George', 'Timothy', 'Ronald', 'Edward', 'Jason', 'Jeffrey', 'Ryan', 'Jacob'],
  female: ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
           'Nancy', 'Lisa', 'Betty', 'Margaret', 'Sandra', 'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle',
           'Carol', 'Amanda', 'Dorothy', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Cynthia']
};

const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
                   'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
                   'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
                   'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'];

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)] as T;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateBoxerData(clubId: string, clubName: string, index: number) {
  const gender = Math.random() > 0.5 ? Gender.MALE : Gender.FEMALE;
  const firstName = randomElement(firstNames[gender.toLowerCase() as 'male' | 'female']);
  const lastName = randomElement(lastNames);
  const name = `${firstName} ${lastName}`;

  // Generate email based on name and club
  const emailName = name.toLowerCase().replace(/\s+/g, '.');
  const clubSlug = clubName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const email = `${emailName}.${clubSlug}@boxerconnect.com`;

  const experienceLevel = randomElement([
    ExperienceLevel.BEGINNER,
    ExperienceLevel.AMATEUR,
    ExperienceLevel.INTERMEDIATE,
    ExperienceLevel.ADVANCED,
    ExperienceLevel.PROFESSIONAL
  ]);

  // Weight ranges by gender (in kg)
  const weightKg = gender === Gender.MALE
    ? randomInt(50, 100) + Math.random()
    : randomInt(45, 75) + Math.random();

  // Height ranges by gender (in cm)
  const heightCm = gender === Gender.MALE
    ? randomInt(165, 195)
    : randomInt(155, 180);

  // Generate fight record based on experience
  let wins = 0, losses = 0, draws = 0;
  switch (experienceLevel) {
    case ExperienceLevel.BEGINNER:
      wins = randomInt(0, 2);
      losses = randomInt(0, 2);
      draws = Math.random() > 0.9 ? 1 : 0;
      break;
    case ExperienceLevel.AMATEUR:
      wins = randomInt(3, 10);
      losses = randomInt(2, 8);
      draws = randomInt(0, 2);
      break;
    case ExperienceLevel.INTERMEDIATE:
      wins = randomInt(10, 20);
      losses = randomInt(5, 12);
      draws = randomInt(0, 3);
      break;
    case ExperienceLevel.ADVANCED:
      wins = randomInt(20, 35);
      losses = randomInt(5, 15);
      draws = randomInt(1, 4);
      break;
    case ExperienceLevel.PROFESSIONAL:
      wins = randomInt(30, 50);
      losses = randomInt(8, 20);
      draws = randomInt(2, 5);
      break;
  }

  return {
    name,
    email,
    gender,
    experienceLevel,
    weightKg: Math.round(weightKg * 10) / 10,
    heightCm,
    wins,
    losses,
    draws,
    clubId,
    gymAffiliation: clubName,
    bio: `${name} trains at ${clubName}. ${experienceLevel.toLowerCase()} level boxer with a record of ${wins}-${losses}-${draws}.`
  };
}

async function main() {
  console.log('🥊 Ensuring all clubs have at least one boxer...\n');

  try {
    // Get all clubs
    const clubs = await withSystemContext(
      async (tx) => {
        return await tx.club.findMany({
          include: {
            _count: {
              select: { boxers: true }
            }
          },
          orderBy: { name: 'asc' }
        });
      },
      'Ensure clubs have boxers - fetching all clubs'
    );

    console.log(`📋 Found ${clubs.length} clubs\n`);

    // Find clubs without boxers
    const clubsWithoutBoxers = clubs.filter(c => c._count.boxers === 0);
    console.log(`❌ Clubs without boxers: ${clubsWithoutBoxers.length}`);
    console.log(`✅ Clubs with boxers: ${clubs.length - clubsWithoutBoxers.length}\n`);

    if (clubsWithoutBoxers.length === 0) {
      console.log('✅ All clubs already have at least one boxer!\n');
      return;
    }

    console.log(`📝 Creating ${clubsWithoutBoxers.length} new boxers...\n`);

    let created = 0;
    let errors = 0;

    for (const club of clubsWithoutBoxers) {
      try {
        const boxerData = generateBoxerData(club.id, club.name, created);
        const passwordHash = await bcrypt.hash('boxer123', BCRYPT_COST);

        // Create user and boxer in a transaction
        await withSystemContext(
          async (tx) => {
            // Check if email already exists
            const existingUser = await tx.user.findUnique({
              where: { email: boxerData.email }
            });

            if (existingUser) {
              // Email collision, modify email
              boxerData.email = `${boxerData.email.split('@')[0]}.${Date.now()}@boxerconnect.com`;
            }

            // Create user
            const user = await tx.user.create({
              data: {
                email: boxerData.email,
                passwordHash,
                name: boxerData.name,
                role: 'BOXER',
                isActive: true,
                emailVerified: true
              }
            });

            // Create boxer profile
            await tx.boxer.create({
              data: {
                userId: user.id,
                name: boxerData.name,
                gender: boxerData.gender,
                experienceLevel: boxerData.experienceLevel,
                weightKg: boxerData.weightKg,
                heightCm: boxerData.heightCm,
                wins: boxerData.wins,
                losses: boxerData.losses,
                draws: boxerData.draws,
                clubId: boxerData.clubId,
                gymAffiliation: boxerData.gymAffiliation,
                bio: boxerData.bio,
                isSearchable: true,
                isVerified: false
              }
            });
          },
          `Ensure clubs have boxers - creating boxer for ${club.name}`
        );

        created++;
        console.log(`  ✅ ${created}/${clubsWithoutBoxers.length} - Created ${boxerData.name} for ${club.name}`);

      } catch (error) {
        errors++;
        console.error(`  ❌ Error creating boxer for ${club.name}:`, error instanceof Error ? error.message : error);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary');
    console.log('='.repeat(60));
    console.log(`✅ Successfully created: ${created} boxers`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(60));

    // Final statistics
    const totalBoxers = await withSystemContext(
      async (tx) => await tx.boxer.count(),
      'Ensure clubs have boxers - counting total boxers'
    );

    const clubsWithBoxersNow = await withSystemContext(
      async (tx) => {
        return await tx.club.count({
          where: { boxers: { some: {} } }
        });
      },
      'Ensure clubs have boxers - counting clubs with boxers'
    );

    console.log('\n📊 Final Statistics:');
    console.log(`   Total boxers: ${totalBoxers}`);
    console.log(`   Clubs with boxers: ${clubsWithBoxersNow}/${clubs.length}`);
    console.log(`   Coverage: ${Math.round(clubsWithBoxersNow / clubs.length * 100)}%\n`);

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
