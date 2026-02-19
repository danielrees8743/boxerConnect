/**
 * Import Welsh Boxing Clubs to Supabase
 *
 * Reads the welsh-boxing-clubs.json file and imports all clubs into the database
 */

import { prisma } from '../src/config/database';
import fs from 'fs/promises';
import path from 'path';

interface WelshClubData {
  name: string;
  email: string | null;
  phone: string | null;
  contactName: string | null;
  postcode: string | null;
  region: string;
  latitude: number | null;
  longitude: number | null;
}

async function importClubs() {
  console.log('🏋️  Starting Welsh Boxing Clubs import to Supabase...\n');

  try {
    // Read the JSON file
    const jsonPath = path.join(__dirname, '../../welsh-boxing-clubs.json');
    const fileContent = await fs.readFile(jsonPath, 'utf-8');
    const clubsData: WelshClubData[] = JSON.parse(fileContent);

    console.log(`📋 Found ${clubsData.length} clubs in JSON file\n`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const clubData of clubsData) {
      try {
        // Check if club already exists (by name)
        const existingClub = await prisma.club.findFirst({
          where: { name: clubData.name },
        });

        if (existingClub) {
          console.log(`   ⏭️  Skipped: ${clubData.name} (already exists)`);
          skipped++;
          continue;
        }

        // Import the club
        await prisma.club.create({
          data: {
            name: clubData.name,
            email: clubData.email,
            phone: clubData.phone,
            contactName: clubData.contactName,
            postcode: clubData.postcode,
            region: clubData.region,
            latitude: clubData.latitude,
            longitude: clubData.longitude,
            isVerified: false, // Set to false, can be verified later
            // ownerId is left null - can be assigned later when gym owners claim clubs
          },
        });

        console.log(`   ✅ Imported: ${clubData.name} (${clubData.region})`);
        imported++;
      } catch (error) {
        console.error(`   ❌ Error importing ${clubData.name}:`, error);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Import Summary');
    console.log('='.repeat(60));
    console.log(`✅ Successfully imported: ${imported} clubs`);
    console.log(`⏭️  Skipped (already exist): ${skipped} clubs`);
    console.log(`❌ Errors: ${errors} clubs`);
    console.log('='.repeat(60));

    // Show regional breakdown
    console.log('\n📍 Regional Distribution:');
    const regionCounts = await prisma.club.groupBy({
      by: ['region'],
      _count: { region: true },
    });

    for (const regionCount of regionCounts) {
      console.log(`   ${regionCount.region || 'Unknown'}: ${regionCount._count.region} clubs`);
    }

    // Show total clubs in database
    const totalClubs = await prisma.club.count();
    console.log(`\n🏋️  Total clubs in database: ${totalClubs}\n`);

    console.log('✅ Import complete!\n');
  } catch (error) {
    console.error('❌ Import failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      if ('stack' in error) {
        console.error('   Stack trace:', error.stack);
      }
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importClubs().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
