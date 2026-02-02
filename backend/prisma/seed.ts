import { PrismaClient, UserRole, CoachPermission } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { withSystemContext } from '../src/utils/database-context';

const prisma = new PrismaClient();

const BCRYPT_COST = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

interface UserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

const admins: UserData[] = [
  {
    name: 'System Admin',
    email: 'admin@boxerconnect.com',
    password: 'admin123',
    role: UserRole.ADMIN,
  },
  {
    name: 'Dan Admin',
    email: 'dan.admin@test.com',
    password: 'admin123',
    role: UserRole.ADMIN,
  },
];

const gymOwners: UserData[] = [
  {
    name: 'Wild Card Boxing',
    email: 'wildcard@test.com',
    password: 'gym123',
    role: UserRole.GYM_OWNER,
  },
  {
    name: 'Kronk Gym',
    email: 'kronk@test.com',
    password: 'gym123',
    role: UserRole.GYM_OWNER,
  },
  {
    name: 'Gleason\'s Gym',
    email: 'gleasons@test.com',
    password: 'gym123',
    role: UserRole.GYM_OWNER,
  },
];

const coaches: UserData[] = [
  {
    name: 'Freddie Roach',
    email: 'freddie.roach@test.com',
    password: 'coach123',
    role: UserRole.COACH,
  },
  {
    name: 'Emanuel Steward',
    email: 'emanuel.steward@test.com',
    password: 'coach123',
    role: UserRole.COACH,
  },
  {
    name: 'Cus D\'Amato',
    email: 'cus.damato@test.com',
    password: 'coach123',
    role: UserRole.COACH,
  },
  {
    name: 'Angelo Dundee',
    email: 'angelo.dundee@test.com',
    password: 'coach123',
    role: UserRole.COACH,
  },
];

async function seedUsers(users: UserData[], label: string): Promise<string[]> {
  console.log(`Seeding ${label}...`);
  const createdIds: string[] = [];

  for (const userData of users) {
    const existingUser = await withSystemContext(
      async (tx) => {
        return await tx.user.findUnique({
          where: { email: userData.email },
        });
      },
      `Database seeding - checking for existing ${label}`
    );

    if (existingUser) {
      console.log(`  ${userData.name} already exists, skipping...`);
      createdIds.push(existingUser.id);
      continue;
    }

    const passwordHash = await hashPassword(userData.password);

    const user = await withSystemContext(
      async (tx) => {
        return await tx.user.create({
          data: {
            email: userData.email,
            passwordHash,
            name: userData.name,
            role: userData.role,
            isActive: true,
            emailVerified: true,
          },
        });
      },
      `Database seeding - creating ${label}: ${userData.name}`
    );

    createdIds.push(user.id);
    console.log(`  Created: ${userData.name} (${userData.email})`);
  }

  return createdIds;
}

async function main() {
  // Seed admins
  await seedUsers(admins, 'admins');

  // Seed gym owners
  await seedUsers(gymOwners, 'gym owners');

  // Seed coaches
  const createdCoaches = await seedUsers(coaches, 'coaches');

  // Link some coaches to boxers
  if (createdCoaches.length > 0) {
    // Get first few boxers
    const boxers = await withSystemContext(
      async (tx) => {
        return await tx.boxer.findMany({ take: 4 });
      },
      'Database seeding - fetching boxers for coach assignments'
    );

    if (boxers.length > 0) {
      // Freddie Roach coaches Mike Tyson (if exists)
      const mikeTypson = boxers.find((b) => b.name.includes('Tyson'));
      if (mikeTypson && createdCoaches[0]) {
        const coachId = createdCoaches[0];
        await withSystemContext(
          async (tx) => {
            return await tx.coachBoxer.create({
              data: {
                coachUserId: coachId,
                boxerId: mikeTypson.id,
                permissions: CoachPermission.FULL_ACCESS,
              },
            });
          },
          'Database seeding - linking Freddie Roach to boxer'
        );
        console.log(`Linked Freddie Roach to ${mikeTypson.name}`);
      }

      // Emanuel Steward coaches Lennox Lewis (if exists)
      const lennoxLewis = boxers.find((b) => b.name.includes('Lewis'));
      if (lennoxLewis && createdCoaches[1]) {
        const coachId = createdCoaches[1];
        await withSystemContext(
          async (tx) => {
            return await tx.coachBoxer.create({
              data: {
                coachUserId: coachId,
                boxerId: lennoxLewis.id,
                permissions: CoachPermission.FULL_ACCESS,
              },
            });
          },
          'Database seeding - linking Emanuel Steward to boxer'
        );
        console.log(`Linked Emanuel Steward to ${lennoxLewis.name}`);
      }

      // Cus D'Amato coaches Canelo (if exists)
      const canelo = boxers.find((b) => b.name.includes('Canelo'));
      if (canelo && createdCoaches[2]) {
        const coachId = createdCoaches[2];
        await withSystemContext(
          async (tx) => {
            return await tx.coachBoxer.create({
              data: {
                coachUserId: coachId,
                boxerId: canelo.id,
                permissions: CoachPermission.MANAGE_AVAILABILITY,
              },
            });
          },
          'Database seeding - linking Cus D\'Amato to boxer'
        );
        console.log(`Linked Cus D'Amato to ${canelo.name}`);
      }
    }
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
