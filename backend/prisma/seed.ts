import { PrismaClient, UserRole, CoachPermission } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BCRYPT_COST = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

interface CoachData {
  name: string;
  email: string;
  password: string;
}

const coaches: CoachData[] = [
  {
    name: 'Freddie Roach',
    email: 'freddie.roach@test.com',
    password: 'coach123',
  },
  {
    name: 'Emanuel Steward',
    email: 'emanuel.steward@test.com',
    password: 'coach123',
  },
  {
    name: 'Cus D\'Amato',
    email: 'cus.damato@test.com',
    password: 'coach123',
  },
  {
    name: 'Angelo Dundee',
    email: 'angelo.dundee@test.com',
    password: 'coach123',
  },
];

async function main() {
  console.log('Seeding coaches...');

  const createdCoaches: string[] = [];

  for (const coach of coaches) {
    const existingUser = await prisma.user.findUnique({
      where: { email: coach.email },
    });

    if (existingUser) {
      console.log(`Coach ${coach.name} already exists, skipping...`);
      continue;
    }

    const passwordHash = await hashPassword(coach.password);

    const user = await prisma.user.create({
      data: {
        email: coach.email,
        passwordHash,
        name: coach.name,
        role: UserRole.COACH,
        isActive: true,
        emailVerified: true,
      },
    });

    createdCoaches.push(user.id);
    console.log(`Created coach: ${coach.name} (${coach.email})`);
  }

  // Link some coaches to boxers
  if (createdCoaches.length > 0) {
    // Get first few boxers
    const boxers = await prisma.boxer.findMany({ take: 4 });

    if (boxers.length > 0) {
      // Freddie Roach coaches Mike Tyson (if exists)
      const mikeTypson = boxers.find((b) => b.name.includes('Tyson'));
      if (mikeTypson && createdCoaches[0]) {
        await prisma.coachBoxer.create({
          data: {
            coachUserId: createdCoaches[0],
            boxerId: mikeTypson.id,
            permissions: CoachPermission.FULL_ACCESS,
          },
        });
        console.log(`Linked Freddie Roach to ${mikeTypson.name}`);
      }

      // Emanuel Steward coaches Lennox Lewis (if exists)
      const lennoxLewis = boxers.find((b) => b.name.includes('Lewis'));
      if (lennoxLewis && createdCoaches[1]) {
        await prisma.coachBoxer.create({
          data: {
            coachUserId: createdCoaches[1],
            boxerId: lennoxLewis.id,
            permissions: CoachPermission.FULL_ACCESS,
          },
        });
        console.log(`Linked Emanuel Steward to ${lennoxLewis.name}`);
      }

      // Cus D'Amato coaches Canelo (if exists)
      const canelo = boxers.find((b) => b.name.includes('Canelo'));
      if (canelo && createdCoaches[2]) {
        await prisma.coachBoxer.create({
          data: {
            coachUserId: createdCoaches[2],
            boxerId: canelo.id,
            permissions: CoachPermission.MANAGE_AVAILABILITY,
          },
        });
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
