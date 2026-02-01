// Club Service
// Handles all boxing club-related business logic

import { Club, Prisma } from '@prisma/client';
import { prisma } from '../config';

// ============================================================================
// Types
// ============================================================================

export interface ClubSearchInput {
  name?: string;
  region?: string;
  postcode?: string;
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

// ============================================================================
// Club Service Methods
// ============================================================================

/**
 * Get all clubs with optional filtering and pagination
 */
export async function getClubs(params: ClubSearchInput = {}): Promise<PaginatedClubs> {
  const { name, region, postcode, page = 1, limit = 50 } = params;

  // Build where clause
  const where: Prisma.ClubWhereInput = {};

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

// Export all functions
export default {
  getClubs,
  getClubById,
  getClubsByRegion,
  getRegions,
  searchClubsByName,
  getClubStats,
};
