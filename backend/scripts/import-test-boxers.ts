import { PrismaClient, ExperienceLevel, Gender } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { withSystemContext } from '../src/utils/database-context';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const BCRYPT_COST = 12; // Match security standard from seed.ts
const DEFAULT_PASSWORD = 'password123'; // Default password for all test boxers

interface TestBoxerData {
  email: string;
  name: string;
  gender: Gender;
  weightKg: number;
  heightCm: number;
  dateOfBirth: string;
  location: string;
  city: string;
  country: string;
  experienceLevel: ExperienceLevel;
  wins: number;
  losses: number;
  draws: number;
  gymAffiliation: string;
  bio: string;
}

async function loadTestBoxers(): Promise<TestBoxerData[]> {
  const filePath = path.join(__dirname, '..', 'test-boxers.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(fileContent) as TestBoxerData[];
}

async function importTestBoxers() {
  console.log('🥊 Starting import of test boxers...\n');

  const testBoxers = await loadTestBoxers();
  console.log(`📋 Loaded ${testBoxers.length} test boxers from JSON file\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const boxer of testBoxers) {
    try {
      // Check if user already exists
      const existingUser = await withSystemContext(
        async (tx) => {
          return await tx.user.findUnique({
            where: { email: boxer.email },
          });
        },
        'Import test boxers - checking for existing user'
      );

      if (existingUser) {
        console.log(`⏭️  Skipping ${boxer.name} - user already exists`);
        skipCount++;
        continue;
      }

      // Create user and boxer profile in a transaction
      await withSystemContext(
        async (tx) => {
          // Hash password individually for each user (security best practice)
          const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_COST);

          // Create user account
          const user = await tx.user.create({
            data: {
              email: boxer.email,
              passwordHash,
              name: boxer.name,
              role: 'BOXER',
              isActive: true,
              emailVerified: true,
            },
          });

          // Create boxer profile
          await tx.boxer.create({
            data: {
              userId: user.id,
              name: boxer.name,
              weightKg: boxer.weightKg,
              heightCm: boxer.heightCm,
              dateOfBirth: new Date(boxer.dateOfBirth),
              location: boxer.location,
              city: boxer.city,
              country: boxer.country,
              experienceLevel: boxer.experienceLevel,
              gender: boxer.gender,
              wins: boxer.wins,
              losses: boxer.losses,
              draws: boxer.draws,
              gymAffiliation: boxer.gymAffiliation,
              bio: boxer.bio,
              isVerified: false,
              isSearchable: true,
            },
          });

          console.log(`✅ Created ${boxer.name} (${boxer.email})`);
        },
        `Import test boxers - creating ${boxer.name}`
      );

      successCount++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to create boxer ${boxer.email}:`, errorMessage);
      errorCount++;
    }
  }

  console.log('\n🎉 Import complete!');
  console.log(`✅ Successfully created: ${successCount}`);
  console.log(`⏭️  Skipped (already exist): ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total processed: ${testBoxers.length}`);
}

importTestBoxers()
  .catch((e) => {
    console.error('Fatal error during import:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
