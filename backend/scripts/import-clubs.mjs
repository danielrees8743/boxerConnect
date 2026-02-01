/**
 * Script to import Welsh Boxing clubs from JSON into the database
 * Run from backend directory: node scripts/import-clubs.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function importClubs() {
  // JSON file is in project root
  const jsonPath = path.join(__dirname, '..', '..', 'welsh-boxing-clubs.json');

  console.log('Reading clubs data from JSON...');
  const clubs = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  console.log(`Found ${clubs.length} clubs to import\n`);

  // Check for existing clubs
  const existingCount = await prisma.club.count();
  if (existingCount > 0) {
    console.log(`Warning: ${existingCount} clubs already exist in database.`);
    console.log('Deleting existing clubs before import...\n');
    await prisma.club.deleteMany();
  }

  // Import clubs in batches
  const batchSize = 50;
  let imported = 0;

  for (let i = 0; i < clubs.length; i += batchSize) {
    const batch = clubs.slice(i, i + batchSize);

    const clubData = batch.map(club => ({
      name: club.name,
      email: club.email,
      phone: club.phone,
      contactName: club.contactName,
      postcode: club.postcode,
      region: club.region,
      latitude: club.latitude,
      longitude: club.longitude,
      isVerified: false,
    }));

    await prisma.club.createMany({
      data: clubData,
    });

    imported += batch.length;
    console.log(`Imported ${imported}/${clubs.length} clubs...`);
  }

  console.log('\n=== IMPORT COMPLETE ===\n');

  // Verify import
  const totalClubs = await prisma.club.count();
  const clubsWithEmail = await prisma.club.count({ where: { email: { not: null } } });

  console.log(`Total clubs in database: ${totalClubs}`);
  console.log(`Clubs with email: ${clubsWithEmail}`);

  // Show sample from database
  console.log('\n=== SAMPLE FROM DATABASE ===\n');
  const sampleClubs = await prisma.club.findMany({
    take: 5,
    orderBy: { name: 'asc' },
  });

  sampleClubs.forEach((club, i) => {
    console.log(`${i + 1}. ${club.name}`);
    console.log(`   ID: ${club.id}`);
    console.log(`   Region: ${club.region}`);
    console.log(`   Email: ${club.email || 'N/A'}`);
    console.log(`   Phone: ${club.phone || 'N/A'}`);
    console.log(`   Contact: ${club.contactName || 'N/A'}`);
    console.log(`   Postcode: ${club.postcode || 'N/A'}`);
    console.log();
  });

  // Count by region
  console.log('=== CLUBS BY REGION ===\n');
  const regions = await prisma.club.groupBy({
    by: ['region'],
    _count: { id: true },
    orderBy: { region: 'asc' },
  });

  regions.forEach(r => {
    console.log(`  ${r.region}: ${r._count.id}`);
  });
}

importClubs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
