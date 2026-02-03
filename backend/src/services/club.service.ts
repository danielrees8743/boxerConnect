// Club Service
// Handles all boxing club-related business logic

import { Club, Prisma, ClubCoach, Boxer, User } from '@prisma/client';
import { prisma } from '../config';

// ============================================================================
// Types
// ============================================================================

export interface ClubSearchInput {
  name?: string | undefined;
  region?: string | undefined;
  postcode?: string | undefined;
  city?: string | undefined;
  country?: string | undefined;
  acceptingMembers?: boolean | undefined;
  includeUnpublished?: boolean | undefined;
  page?: number;
  limit?: number;
}

export interface PaginatedClubs {
  clubs: Club[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ClubWithMembers extends Club {
  owner: Pick<User, 'id' | 'name' | 'email' | 'role'> | null;
  boxers: Pick<Boxer, 'id' | 'name' | 'userId'>[];
  coaches: (ClubCoach & {
    coach: Pick<User, 'id' | 'name' | 'email' | 'role'>;
  })[];
}

// ============================================================================
// Club Service Methods
// ============================================================================

/**
 * Get all clubs with optional filtering and pagination
 * By default, only returns published clubs unless includeUnpublished is true
 */
export async function getClubs(params: ClubSearchInput = {}): Promise<PaginatedClubs> {
  const {
    name,
    region,
    postcode,
    city,
    country,
    acceptingMembers,
    includeUnpublished = false,
    page = 1,
    limit = 50,
  } = params;

  // Build where clause
  const where: Prisma.ClubWhereInput = {};

  // Filter by publication status (default: only published)
  if (!includeUnpublished) {
    where.isPublished = true;
  }

  if (name) {
    where.name = {
      contains: name,
      mode: 'insensitive',
    };
  }

  if (region) {
    where.region = {
      contains: region,
      mode: 'insensitive',
    };
  }

  if (postcode) {
    where.postcode = {
      startsWith: postcode.toUpperCase(),
      mode: 'insensitive',
    };
  }

  if (city) {
    where.city = {
      contains: city,
      mode: 'insensitive',
    };
  }

  if (country) {
    where.country = {
      contains: country,
      mode: 'insensitive',
    };
  }

  if (acceptingMembers !== undefined) {
    where.acceptingMembers = acceptingMembers;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Execute queries in parallel
  const [clubs, total] = await Promise.all([
    prisma.club.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { name: 'asc' },
      ],
    }),
    prisma.club.count({ where }),
  ]);

  return {
    clubs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get club by ID
 */
export async function getClubById(id: string): Promise<Club | null> {
  return prisma.club.findUnique({
    where: { id },
  });
}

/**
 * Get clubs by region
 */
export async function getClubsByRegion(region: string): Promise<Club[]> {
  return prisma.club.findMany({
    where: {
      region: {
        contains: region,
        mode: 'insensitive',
      },
    },
    orderBy: { name: 'asc' },
  });
}

/**
 * Get all unique regions
 */
export async function getRegions(): Promise<string[]> {
  const regions = await prisma.club.groupBy({
    by: ['region'],
    orderBy: { region: 'asc' },
  });

  return regions
    .map(r => r.region)
    .filter((r): r is string => r !== null);
}

/**
 * Search clubs by name (autocomplete)
 */
export async function searchClubsByName(query: string, limit = 10): Promise<Club[]> {
  return prisma.club.findMany({
    where: {
      name: {
        contains: query,
        mode: 'insensitive',
      },
    },
    take: limit,
    orderBy: { name: 'asc' },
  });
}

/**
 * Get club statistics
 */
export async function getClubStats(): Promise<{
  total: number;
  byRegion: { region: string; count: number }[];
  withEmail: number;
  withPhone: number;
}> {
  const [total, byRegion, withEmail, withPhone] = await Promise.all([
    prisma.club.count(),
    prisma.club.groupBy({
      by: ['region'],
      _count: { id: true },
      orderBy: { region: 'asc' },
    }),
    prisma.club.count({ where: { email: { not: null } } }),
    prisma.club.count({ where: { phone: { not: null } } }),
  ]);

  return {
    total,
    byRegion: byRegion.map(r => ({
      region: r.region || 'Unknown',
      count: r._count.id,
    })),
    withEmail,
    withPhone,
  };
}

// ============================================================================
// Club Member Management
// ============================================================================

/**
 * Get club with all members (owner, boxers, coaches)
 */
export async function getClubWithMembers(id: string): Promise<ClubWithMembers | null> {
  return prisma.club.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      boxers: {
        select: {
          id: true,
          name: true,
          userId: true,
          weightKg: true,
          experienceLevel: true,
          wins: true,
          losses: true,
          draws: true,
        },
      },
      coaches: {
        include: {
          coach: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Assign a boxer to a club
 */
export async function assignBoxerToClub(
  boxerId: string,
  clubId: string
): Promise<Boxer> {
  // Verify boxer exists
  const boxer = await prisma.boxer.findUnique({
    where: { id: boxerId },
  });

  if (!boxer) {
    throw new Error('Boxer not found');
  }

  // Verify club exists
  const club = await prisma.club.findUnique({
    where: { id: clubId },
  });

  if (!club) {
    throw new Error('Club not found');
  }

  // Update boxer with club assignment and sync gymAffiliation
  return prisma.boxer.update({
    where: { id: boxerId },
    data: {
      clubId,
      gymAffiliation: club.name,
    },
  });
}

/**
 * Remove a boxer from a club
 */
export async function removeBoxerFromClub(boxerId: string, clubId: string): Promise<Boxer> {
  // Verify boxer exists
  const boxer = await prisma.boxer.findUnique({
    where: { id: boxerId },
  });

  if (!boxer) {
    throw new Error('Boxer not found');
  }

  // Verify boxer belongs to this specific club
  if (boxer.clubId !== clubId) {
    throw new Error('Boxer is not a member of this club');
  }

  // Remove club assignment (keep gymAffiliation for history)
  return prisma.boxer.update({
    where: { id: boxerId },
    data: {
      clubId: null,
    },
  });
}

/**
 * Assign a coach to a club
 */
export async function assignCoachToClub(
  coachUserId: string,
  clubId: string,
  isHead: boolean = false
): Promise<ClubCoach> {
  // Verify user exists and is a coach
  const user = await prisma.user.findUnique({
    where: { id: coachUserId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.role !== 'COACH') {
    throw new Error('User is not a coach');
  }

  // Verify club exists
  const club = await prisma.club.findUnique({
    where: { id: clubId },
  });

  if (!club) {
    throw new Error('Club not found');
  }

  // Check if coach is already assigned to this club
  const existingAssignment = await prisma.clubCoach.findUnique({
    where: {
      clubId_coachUserId: {
        clubId,
        coachUserId,
      },
    },
  });

  if (existingAssignment) {
    throw new Error('Coach is already assigned to this club');
  }

  // Check if coach is already assigned to another club (one club per coach)
  const existingClubCoach = await prisma.clubCoach.findUnique({
    where: { coachUserId },
  });

  if (existingClubCoach) {
    throw new Error('Coach is already assigned to another club');
  }

  // Create the assignment
  return prisma.clubCoach.create({
    data: {
      clubId,
      coachUserId,
      isHead,
    },
  });
}

/**
 * Remove a coach from a club
 */
export async function removeCoachFromClub(
  coachUserId: string,
  clubId: string
): Promise<void> {
  // Verify the assignment exists
  const assignment = await prisma.clubCoach.findUnique({
    where: {
      clubId_coachUserId: {
        clubId,
        coachUserId,
      },
    },
  });

  if (!assignment) {
    throw new Error('Coach is not assigned to this club');
  }

  // Delete the assignment
  await prisma.clubCoach.delete({
    where: {
      clubId_coachUserId: {
        clubId,
        coachUserId,
      },
    },
  });
}

/**
 * Set the owner of a club (must be a GYM_OWNER)
 */
export async function setClubOwner(
  clubId: string,
  ownerUserId: string
): Promise<Club> {
  // Verify user exists and is a gym owner
  const user = await prisma.user.findUnique({
    where: { id: ownerUserId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.role !== 'GYM_OWNER') {
    throw new Error('User must be a GYM_OWNER to own a club');
  }

  // Verify club exists
  const club = await prisma.club.findUnique({
    where: { id: clubId },
  });

  if (!club) {
    throw new Error('Club not found');
  }

  // Update the club owner
  return prisma.club.update({
    where: { id: clubId },
    data: {
      ownerId: ownerUserId,
    },
  });
}

/**
 * Check if a user is the owner of a club
 */
export async function isClubOwner(
  userId: string,
  clubId: string
): Promise<boolean> {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { ownerId: true },
  });

  return club?.ownerId === userId;
}

/**
 * Get clubs owned by a user with member counts
 */
export async function getClubsByOwner(ownerId: string): Promise<Club[]> {
  return prisma.club.findMany({
    where: { ownerId },
    include: {
      _count: {
        select: {
          boxers: true,
          coaches: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });
}

// ============================================================================
// Club CRUD Operations
// ============================================================================

/**
 * Create a new club
 * Admin-only operation
 */
export async function createClub(data: Prisma.ClubCreateInput): Promise<Club> {
  return prisma.club.create({
    data,
  });
}

/**
 * Update a club
 * Can be performed by club owner or admin
 */
export async function updateClub(
  clubId: string,
  data: Prisma.ClubUpdateInput
): Promise<Club> {
  // Verify club exists
  const club = await prisma.club.findUnique({
    where: { id: clubId },
  });

  if (!club) {
    throw new Error('Club not found');
  }

  return prisma.club.update({
    where: { id: clubId },
    data,
  });
}

// Export all functions
export default {
  getClubs,
  getClubById,
  getClubsByRegion,
  getRegions,
  searchClubsByName,
  getClubStats,
  getClubWithMembers,
  assignBoxerToClub,
  removeBoxerFromClub,
  assignCoachToClub,
  removeCoachFromClub,
  setClubOwner,
  isClubOwner,
  getClubsByOwner,
  createClub,
  updateClub,
};
