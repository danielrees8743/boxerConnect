/**
 * Script to seed test boxers with varied profiles
 * Run from backend directory: node scripts/seed-boxers.mjs
 *
 * Creates boxers with:
 * - Male and female genders
 * - Various weights and heights
 * - Different experience levels
 * - Profile pictures from randomuser.me
 * - Assigned to existing clubs
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Boxing weight classes with typical weight ranges (kg)
const weightClasses = {
  minimumweight: { min: 46, max: 48 },
  flyweight: { min: 49, max: 51 },
  bantamweight: { min: 52, max: 54 },
  featherweight: { min: 55, max: 57 },
  lightweight: { min: 58, max: 61 },
  welterweight: { min: 64, max: 67 },
  middleweight: { min: 70, max: 73 },
  lightHeavyweight: { min: 76, max: 79 },
  cruiserweight: { min: 86, max: 91 },
  heavyweight: { min: 92, max: 120 },
};

// Height ranges by weight class (cm)
const heightRanges = {
  minimumweight: { min: 150, max: 160 },
  flyweight: { min: 155, max: 165 },
  bantamweight: { min: 160, max: 170 },
  featherweight: { min: 165, max: 175 },
  lightweight: { min: 168, max: 178 },
  welterweight: { min: 170, max: 183 },
  middleweight: { min: 175, max: 188 },
  lightHeavyweight: { min: 178, max: 191 },
  cruiserweight: { min: 180, max: 193 },
  heavyweight: { min: 183, max: 200 },
};

const experienceLevels = ['BEGINNER', 'AMATEUR', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL'];

// Male first names
const maleFirstNames = [
  'James', 'John', 'Michael', 'David', 'Robert', 'William', 'Thomas', 'Daniel',
  'Matthew', 'Anthony', 'Christopher', 'Joseph', 'Andrew', 'Ryan', 'Brandon',
  'Kevin', 'Justin', 'Brian', 'Eric', 'Steven', 'Timothy', 'Richard', 'Jeffrey',
  'Jason', 'Nicholas', 'Marcus', 'Derek', 'Travis', 'Kyle', 'Aaron', 'Samuel',
  'Patrick', 'Sean', 'Adam', 'Nathan', 'Tyler', 'Zachary', 'Benjamin', 'Jordan',
  'Ethan', 'Dylan', 'Connor', 'Caleb', 'Luke', 'Owen', 'Jack', 'Liam', 'Noah',
  'Mason', 'Jacob'
];

// Female first names
const femaleFirstNames = [
  'Emma', 'Olivia', 'Sophia', 'Isabella', 'Mia', 'Charlotte', 'Amelia', 'Harper',
  'Evelyn', 'Abigail', 'Emily', 'Elizabeth', 'Sofia', 'Avery', 'Ella', 'Scarlett',
  'Grace', 'Chloe', 'Victoria', 'Riley', 'Aria', 'Lily', 'Aurora', 'Zoey',
  'Natalie', 'Hannah', 'Hazel', 'Stella', 'Zoe', 'Penelope', 'Luna', 'Layla',
  'Nora', 'Leah', 'Savannah', 'Eleanor', 'Maya', 'Audrey', 'Claire', 'Skylar',
  'Ellie', 'Samantha', 'Paisley', 'Lucy', 'Anna', 'Caroline', 'Kennedy', 'Aaliyah',
  'Madelyn', 'Sarah'
];

// Last names
const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore',
  'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis',
  'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Green',
  'Baker', 'Adams', 'Nelson', 'Hill', 'Campbell', 'Mitchell', 'Roberts', 'Carter',
  'Phillips', 'Evans', 'Turner', 'Torres', 'Parker', 'Collins', 'Edwards', 'Stewart',
  'Flores', 'Morris', 'Murphy'
];

// Welsh cities for variety
const welshCities = [
  'Cardiff', 'Swansea', 'Newport', 'Wrexham', 'Barry', 'Neath', 'Cwmbran',
  'Pontypridd', 'Bridgend', 'Llanelli', 'Caerphilly', 'Merthyr Tydfil',
  'Rhyl', 'Colwyn Bay', 'Aberdare', 'Pontypool', 'Maesteg', 'Porthcawl'
];

// Helper functions
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDecimal(min, max, decimals = 1) {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(decimals));
}

function getProfilePhotoUrl(gender, index) {
  // randomuser.me has 100 photos (0-99) for each gender
  const photoIndex = index % 100;
  const genderPath = gender === 'MALE' ? 'men' : 'women';
  return `https://randomuser.me/api/portraits/${genderPath}/${photoIndex}.jpg`;
}

function generateRecord(gender, wins, losses, draws) {
  // Higher experience = more fights
  const totalFights = wins + losses + draws;
  return { wins, losses, draws, totalFights };
}

function generateBio(name, experienceLevel, record, gender) {
  const pronouns = gender === 'MALE' ? ['He', 'his'] : ['She', 'her'];
  const bios = [
    `${name} is a dedicated ${experienceLevel.toLowerCase()} boxer with a record of ${record.wins}-${record.losses}-${record.draws}. ${pronouns[0]} trains hard every day to improve ${pronouns[1]} skills.`,
    `With ${record.totalFights} fights under ${pronouns[1]} belt, ${name} continues to push the limits of ${pronouns[1]} abilities in the ring.`,
    `${name} started boxing at a young age and has developed into a formidable ${experienceLevel.toLowerCase()} level competitor.`,
    `A passionate boxer with excellent footwork and timing. ${name} is always looking for the next challenge.`,
    `${name} brings intensity and dedication to every training session and fight. ${record.wins} wins and counting.`,
  ];
  return randomElement(bios);
}

function generateDateOfBirth(experienceLevel) {
  const now = new Date();
  let minAge, maxAge;

  switch (experienceLevel) {
    case 'BEGINNER':
      minAge = 16; maxAge = 25;
      break;
    case 'AMATEUR':
      minAge = 18; maxAge = 28;
      break;
    case 'INTERMEDIATE':
      minAge = 20; maxAge = 32;
      break;
    case 'ADVANCED':
      minAge = 22; maxAge = 38;
      break;
    case 'PROFESSIONAL':
      minAge = 24; maxAge = 42;
      break;
    default:
      minAge = 18; maxAge = 35;
  }

  const age = randomInt(minAge, maxAge);
  const dob = new Date(now.getFullYear() - age, randomInt(0, 11), randomInt(1, 28));
  return dob;
}

function generateFightRecord(experienceLevel) {
  let maxFights;
  switch (experienceLevel) {
    case 'BEGINNER': maxFights = 5; break;
    case 'AMATEUR': maxFights = 15; break;
    case 'INTERMEDIATE': maxFights = 30; break;
    case 'ADVANCED': maxFights = 50; break;
    case 'PROFESSIONAL': maxFights = 80; break;
    default: maxFights = 10;
  }

  const totalFights = randomInt(0, maxFights);
  const wins = Math.floor(totalFights * randomDecimal(0.4, 0.8));
  const remaining = totalFights - wins;
  const draws = Math.floor(remaining * randomDecimal(0, 0.2));
  const losses = remaining - draws;

  return { wins, losses, draws, totalFights };
}

async function seedBoxers() {
  console.log('Starting boxer seeding...\n');

  // Get existing clubs to assign boxers
  const clubs = await prisma.club.findMany({ select: { id: true, name: true } });
  if (clubs.length === 0) {
    console.log('Warning: No clubs found. Boxers will not be assigned to clubs.');
  } else {
    console.log(`Found ${clubs.length} clubs to assign boxers to.\n`);
  }

  // Check for existing test boxers
  const existingBoxers = await prisma.boxer.count();
  console.log(`Current boxers in database: ${existingBoxers}`);

  const password = await bcrypt.hash('password123', 10);
  const boxersToCreate = [];

  // Create 30 male boxers
  console.log('\nGenerating male boxers...');
  for (let i = 0; i < 30; i++) {
    const firstName = maleFirstNames[i % maleFirstNames.length];
    const lastName = randomElement(lastNames);
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@boxer.test`;

    const weightClass = randomElement(Object.keys(weightClasses));
    const weight = randomDecimal(weightClasses[weightClass].min, weightClasses[weightClass].max);
    const height = randomInt(heightRanges[weightClass].min, heightRanges[weightClass].max);
    const experienceLevel = randomElement(experienceLevels);
    const record = generateFightRecord(experienceLevel);

    boxersToCreate.push({
      email,
      password,
      name,
      gender: 'MALE',
      weightKg: weight,
      heightCm: height,
      experienceLevel,
      ...record,
      dateOfBirth: generateDateOfBirth(experienceLevel),
      city: randomElement(welshCities),
      country: 'United Kingdom',
      bio: generateBio(name, experienceLevel, record, 'MALE'),
      profilePhotoUrl: getProfilePhotoUrl('MALE', i),
      clubId: clubs.length > 0 ? randomElement(clubs).id : null,
      isVerified: Math.random() > 0.3, // 70% verified
      isSearchable: true,
    });
  }

  // Create 20 female boxers
  console.log('Generating female boxers...');
  for (let i = 0; i < 20; i++) {
    const firstName = femaleFirstNames[i % femaleFirstNames.length];
    const lastName = randomElement(lastNames);
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@boxer.test`;

    // Female boxers typically in lighter weight classes
    const femaleWeightClasses = ['minimumweight', 'flyweight', 'bantamweight', 'featherweight', 'lightweight', 'welterweight', 'middleweight'];
    const weightClass = randomElement(femaleWeightClasses);
    const weight = randomDecimal(weightClasses[weightClass].min, weightClasses[weightClass].max);
    const height = randomInt(heightRanges[weightClass].min - 5, heightRanges[weightClass].max - 5);
    const experienceLevel = randomElement(experienceLevels);
    const record = generateFightRecord(experienceLevel);

    boxersToCreate.push({
      email,
      password,
      name,
      gender: 'FEMALE',
      weightKg: weight,
      heightCm: height,
      experienceLevel,
      ...record,
      dateOfBirth: generateDateOfBirth(experienceLevel),
      city: randomElement(welshCities),
      country: 'United Kingdom',
      bio: generateBio(name, experienceLevel, record, 'FEMALE'),
      profilePhotoUrl: getProfilePhotoUrl('FEMALE', i),
      clubId: clubs.length > 0 ? randomElement(clubs).id : null,
      isVerified: Math.random() > 0.3, // 70% verified
      isSearchable: true,
    });
  }

  console.log(`\nCreating ${boxersToCreate.length} boxers...\n`);

  let created = 0;
  for (const boxer of boxersToCreate) {
    try {
      // Create user first
      const user = await prisma.user.create({
        data: {
          email: boxer.email,
          passwordHash: boxer.password,
          name: boxer.name,
          role: 'BOXER',
          isActive: true,
          emailVerified: true,
        },
      });

      // Create boxer profile
      await prisma.boxer.create({
        data: {
          userId: user.id,
          name: boxer.name,
          gender: boxer.gender,
          weightKg: boxer.weightKg,
          heightCm: boxer.heightCm,
          dateOfBirth: boxer.dateOfBirth,
          city: boxer.city,
          country: boxer.country,
          experienceLevel: boxer.experienceLevel,
          wins: boxer.wins,
          losses: boxer.losses,
          draws: boxer.draws,
          bio: boxer.bio,
          profilePhotoUrl: boxer.profilePhotoUrl,
          clubId: boxer.clubId,
          isVerified: boxer.isVerified,
          isSearchable: boxer.isSearchable,
        },
      });

      created++;
      if (created % 10 === 0) {
        console.log(`Created ${created}/${boxersToCreate.length} boxers...`);
      }
    } catch (error) {
      console.error(`Failed to create boxer ${boxer.email}:`, error.message);
    }
  }

  console.log(`\n=== SEEDING COMPLETE ===\n`);

  // Show statistics
  const stats = await prisma.boxer.groupBy({
    by: ['gender'],
    _count: { id: true },
  });

  const expStats = await prisma.boxer.groupBy({
    by: ['experienceLevel'],
    _count: { id: true },
    orderBy: { experienceLevel: 'asc' },
  });

  const verifiedCount = await prisma.boxer.count({ where: { isVerified: true } });
  const totalBoxers = await prisma.boxer.count();

  console.log('=== BOXER STATISTICS ===\n');
  console.log(`Total boxers: ${totalBoxers}`);
  console.log(`Verified: ${verifiedCount}`);
  console.log('\nBy Gender:');
  stats.forEach(s => console.log(`  ${s.gender}: ${s._count.id}`));
  console.log('\nBy Experience Level:');
  expStats.forEach(s => console.log(`  ${s.experienceLevel}: ${s._count.id}`));

  // Show sample boxers
  console.log('\n=== SAMPLE BOXERS ===\n');
  const samples = await prisma.boxer.findMany({
    take: 5,
    include: { club: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  samples.forEach((boxer, i) => {
    console.log(`${i + 1}. ${boxer.name} (${boxer.gender})`);
    console.log(`   Weight: ${boxer.weightKg}kg, Height: ${boxer.heightCm}cm`);
    console.log(`   Level: ${boxer.experienceLevel}`);
    console.log(`   Record: ${boxer.wins}-${boxer.losses}-${boxer.draws}`);
    console.log(`   Club: ${boxer.club?.name || 'None'}`);
    console.log(`   Photo: ${boxer.profilePhotoUrl}`);
    console.log();
  });
}

seedBoxers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
