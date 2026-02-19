import { PrismaClient } from '@prisma/client';
import { withSystemContext } from '../src/utils/database-context';

const prisma = new PrismaClient();

async function listGymOwners() {
  const gymOwners = await withSystemContext(
    async (tx) => {
      return await tx.user.findMany({
        where: { role: 'GYM_OWNER' },
        select: {
          id: true,
          email: true,
          name: true,
          ownedClubs: { select: { name: true } },
        },
        orderBy: { email: 'asc' },
        take: 10, // Just show first 10
      });
    },
    'List gym owners'
  );

  console.log(`\nFound ${gymOwners.length} gym owners (showing first 10):\n`);
  gymOwners.forEach((owner, i) => {
    console.log(`${i + 1}. Email: ${owner.email}`);
    console.log(`   Name: ${owner.name}`);
    console.log(`   Club: ${owner.ownedClubs[0]?.name || 'No club'}\n`);
  });

  await prisma.$disconnect();
}

listGymOwners().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
