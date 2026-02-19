/**
 * Complete missing fields in boxer profiles
 * Adds date of birth, city, and country for all boxers
 */

import { PrismaClient } from '@prisma/client';
import { withSystemContext } from '../src/utils/database-context';

const prisma = new PrismaClient();

// Welsh cities for location
const welshCities = [
  'Cardiff', 'Swansea', 'Newport', 'Wrexham', 'Barry', 'Cwmbran', 'Bridgend',
  'Neath', 'Port Talbot', 'Pontypridd', 'Llanelli', 'Rhondda', 'Merthyr Tydfil',
  'Caerphilly', 'Aberdare', 'Maesteg', 'Pontypridd', 'Porthcawl', 'Colwyn Bay',
  'Bangor', 'Llandudno', 'Aberystwyth', 'Carmarthen', 'Haverfordwest', 'Pembroke'
];

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)] as T;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a realistic date of birth based on experience level
 */
function generateDateOfBirth(experienceLevel: string): Date {
  const now = new Date();
  let minAge: number;
  let maxAge: number;

  switch (experienceLevel) {
    case 'BEGINNER':
      minAge = 16;
      maxAge = 25;
      break;
    case 'AMATEUR':
      minAge = 18;
      maxAge = 28;
      break;
    case 'INTERMEDIATE':
      minAge = 22;
      maxAge = 32;
      break;
    case 'ADVANCED':
      minAge = 25;
      maxAge = 35;
      break;
    case 'PROFESSIONAL':
      minAge = 28;
      maxAge = 40;
      break;
    default:
      minAge = 18;
      maxAge = 35;
  }

  const age = randomInt(minAge, maxAge);
  const birthYear = now.getFullYear() - age;
  const birthMonth = randomInt(0, 11);
  const birthDay = randomInt(1, 28); // Safe day range for all months

  return new Date(birthYear, birthMonth, birthDay);
}

async function main() {
  console.log('🔧 Completing boxer profiles with missing information...\n');

  try {
    // Find all boxers with missing fields
    const boxers = await withSystemContext(
      async (tx) => {
        return await tx.boxer.findMany({
          where: {
            OR: [
              { dateOfBirth: null },
              { city: null },
              { country: null }
            ]
          },
          select: {
            id: true,
            name: true,
            experienceLevel: true,
            dateOfBirth: true,
            city: true,
            country: true,
            location: true
          }
        });
      },
      'Complete boxer profiles - fetching boxers with missing fields'
    );

    console.log(`📋 Found ${boxers.length} boxers with missing information\n`);

    if (boxers.length === 0) {
      console.log('✅ All boxer profiles are already complete!\n');
      return;
    }

    let updated = 0;
    let errors = 0;

    for (const boxer of boxers) {
      try {
        const updates: any = {};

        // Add date of birth if missing
        if (!boxer.dateOfBirth) {
          updates.dateOfBirth = generateDateOfBirth(boxer.experienceLevel);
        }

        // Add city if missing
        if (!boxer.city) {
          updates.city = randomElement(welshCities);
        }

        // Add country if missing (all are in UK/Wales)
        if (!boxer.country) {
          updates.country = 'United Kingdom';
        }

        // Update location field to match city, country
        if (updates.city || updates.country) {
          const city = updates.city || boxer.city;
          const country = updates.country || boxer.country;
          updates.location = `${city}, ${country}`;
        }

        // Only update if there are changes
        if (Object.keys(updates).length > 0) {
          await withSystemContext(
            async (tx) => {
              await tx.boxer.update({
                where: { id: boxer.id },
                data: updates
              });
            },
            `Complete boxer profiles - updating ${boxer.name}`
          );

          updated++;
          console.log(`  ✅ ${updated}/${boxers.length} - Updated ${boxer.name}`);
        }

      } catch (error) {
        errors++;
        console.error(`  ❌ Error updating ${boxer.name}:`, error instanceof Error ? error.message : error);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${updated} boxers`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(60));

    // Verify completion
    const remaining = await withSystemContext(
      async (tx) => {
        return await tx.boxer.count({
          where: {
            OR: [
              { dateOfBirth: null },
              { city: null },
              { country: null }
            ]
          }
        });
      },
      'Complete boxer profiles - counting remaining incomplete profiles'
    );

    console.log('\n📊 Final Statistics:');
    console.log(`   Boxers with complete profiles: ${147 - remaining}/147`);
    console.log(`   Completion rate: ${Math.round((147 - remaining) / 147 * 100)}%\n`);

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
