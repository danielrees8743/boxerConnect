// Matching Service
// Core matching algorithm for finding compatible boxing opponents

import { Boxer, ExperienceLevel, Prisma } from '@prisma/client';
import { prisma, cache } from '../config';
import { getTotalFights } from './boxer.service';

// ============================================================================
// Constants
// ============================================================================

/**
 * Matching rules configuration
 */
export const MATCHING_RULES = {
  maxWeightDifference: 5,    // kg - Maximum weight difference for compatibility
  maxFightsDifference: 3,    // Total fights difference for compatibility
} as const;

/**
 * Cache configuration
 */
const CACHE_TTL_SECONDS = 5 * 60; // 5 minutes

/**
 * Experience level compatibility matrix
 * Defines which experience levels can be matched together
 */
const EXPERIENCE_COMPATIBILITY: Record<ExperienceLevel, ExperienceLevel[]> = {
  [ExperienceLevel.BEGINNER]: [ExperienceLevel.BEGINNER, ExperienceLevel.AMATEUR],
  [ExperienceLevel.AMATEUR]: [ExperienceLevel.BEGINNER, ExperienceLevel.AMATEUR, ExperienceLevel.INTERMEDIATE],
  [ExperienceLevel.INTERMEDIATE]: [ExperienceLevel.AMATEUR, ExperienceLevel.INTERMEDIATE, ExperienceLevel.ADVANCED],
  [ExperienceLevel.ADVANCED]: [ExperienceLevel.INTERMEDIATE, ExperienceLevel.ADVANCED, ExperienceLevel.PROFESSIONAL],
  [ExperienceLevel.PROFESSIONAL]: [ExperienceLevel.ADVANCED, ExperienceLevel.PROFESSIONAL],
};

// ============================================================================
// Types
// ============================================================================

export interface MatchScore {
  boxerId: string;
  boxer: Boxer;
  score: number;
  weightDifference: number;
  fightsDifference: number;
  sameCity: boolean;
  sameCountry: boolean;
  compatibleExperience: boolean;
}

export interface MatchingOptions {
  limit?: number;
  experienceLevelFilter?: ExperienceLevel[];
  cityFilter?: string | null;
  countryFilter?: string | null;
  excludeBoxerIds?: string[];
}

export interface CompatibleBoxersResult {
  matches: MatchScore[];
  total: number;
}

// ============================================================================
// Matching Algorithm Functions
// ============================================================================

/**
 * Check if experience levels are compatible
 */
function isExperienceCompatible(level1: ExperienceLevel, level2: ExperienceLevel): boolean {
  return EXPERIENCE_COMPATIBILITY[level1].includes(level2);
}

/**
 * Calculate match score between two boxers
 * Higher score = better match
 * Score ranges from 0 to 100
 */
export function calculateMatchScore(boxer1: Boxer, boxer2: Boxer): MatchScore {
  let score = 0;
  const maxScore = 100;

  // Weight compatibility (max 30 points)
  const weight1 = boxer1.weightKg ? Number(boxer1.weightKg) : null;
  const weight2 = boxer2.weightKg ? Number(boxer2.weightKg) : null;
  let weightDifference = 0;

  if (weight1 !== null && weight2 !== null) {
    weightDifference = Math.abs(weight1 - weight2);
    if (weightDifference <= MATCHING_RULES.maxWeightDifference) {
      // Perfect weight match gets 30 points, decreasing linearly
      score += 30 * (1 - weightDifference / MATCHING_RULES.maxWeightDifference);
    }
  } else {
    // Partial score if weight not specified
    score += 15;
  }

  // Fights compatibility (max 30 points)
  const fights1 = getTotalFights(boxer1);
  const fights2 = getTotalFights(boxer2);
  const fightsDifference = Math.abs(fights1 - fights2);

  if (fightsDifference <= MATCHING_RULES.maxFightsDifference) {
    // Perfect fights match gets 30 points, decreasing linearly
    score += 30 * (1 - fightsDifference / MATCHING_RULES.maxFightsDifference);
  }

  // Experience level compatibility (max 20 points)
  const compatibleExperience = isExperienceCompatible(
    boxer1.experienceLevel,
    boxer2.experienceLevel
  );
  if (compatibleExperience) {
    // Same level gets full points, adjacent levels get partial
    if (boxer1.experienceLevel === boxer2.experienceLevel) {
      score += 20;
    } else {
      score += 10;
    }
  }

  // Location bonus (max 20 points)
  const sameCity =
    boxer1.city &&
    boxer2.city &&
    boxer1.city.toLowerCase() === boxer2.city.toLowerCase();
  const sameCountry =
    boxer1.country &&
    boxer2.country &&
    boxer1.country.toLowerCase() === boxer2.country.toLowerCase();

  if (sameCity) {
    score += 20; // Same city gets full location points
  } else if (sameCountry) {
    score += 10; // Same country gets partial points
  }

  return {
    boxerId: boxer2.id,
    boxer: boxer2,
    score: Math.round((score / maxScore) * 100), // Normalize to 0-100
    weightDifference,
    fightsDifference,
    sameCity: !!sameCity,
    sameCountry: !!sameCountry,
    compatibleExperience,
  };
}

/**
 * Find compatible boxers for a given boxer
 * Uses the matching algorithm to find suitable opponents
 */
export async function findCompatibleBoxers(
  boxerId: string,
  options: MatchingOptions = {}
): Promise<CompatibleBoxersResult> {
  const {
    limit = 20,
    experienceLevelFilter,
    cityFilter,
    countryFilter,
    excludeBoxerIds = [],
  } = options;

  // Check cache first
  const cacheKey = `matches:${boxerId}:${JSON.stringify(options)}`;
  const cachedResult = await cache.get<CompatibleBoxersResult>(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Get the source boxer
  const sourceBoxer = await prisma.boxer.findUnique({
    where: { id: boxerId },
  });

  if (!sourceBoxer) {
    throw new Error('Boxer not found');
  }

  // Build query for potential matches
  const where: Prisma.BoxerWhereInput = {
    isSearchable: true,
    id: {
      not: boxerId,
      notIn: excludeBoxerIds,
    },
    user: {
      isActive: true,
    },
  };

  // Apply experience level filter
  if (experienceLevelFilter && experienceLevelFilter.length > 0) {
    where.experienceLevel = {
      in: experienceLevelFilter,
    };
  } else {
    // Default to compatible experience levels
    where.experienceLevel = {
      in: EXPERIENCE_COMPATIBILITY[sourceBoxer.experienceLevel],
    };
  }

  // Apply location filters
  if (cityFilter) {
    where.city = {
      contains: cityFilter,
      mode: 'insensitive',
    };
  }

  if (countryFilter) {
    where.country = {
      contains: countryFilter,
      mode: 'insensitive',
    };
  }

  // Apply weight filter if source boxer has weight
  if (sourceBoxer.weightKg) {
    const sourceWeight = Number(sourceBoxer.weightKg);
    where.OR = [
      {
        weightKg: {
          gte: sourceWeight - MATCHING_RULES.maxWeightDifference,
          lte: sourceWeight + MATCHING_RULES.maxWeightDifference,
        },
      },
      {
        weightKg: null, // Include boxers without weight specified
      },
    ];
  }

  // Fetch potential matches
  const potentialMatches = await prisma.boxer.findMany({
    where,
    take: limit * 3, // Fetch more than needed for scoring
  });

  // Calculate scores and filter
  const scoredMatches: MatchScore[] = potentialMatches
    .map((boxer) => calculateMatchScore(sourceBoxer, boxer))
    .filter((match) => {
      // Filter by weight compatibility
      if (
        sourceBoxer.weightKg &&
        match.boxer.weightKg &&
        match.weightDifference > MATCHING_RULES.maxWeightDifference
      ) {
        return false;
      }

      // Filter by fights compatibility
      const sourceFights = getTotalFights(sourceBoxer);
      const matchFights = getTotalFights(match.boxer);
      if (Math.abs(sourceFights - matchFights) > MATCHING_RULES.maxFightsDifference) {
        return false;
      }

      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const result: CompatibleBoxersResult = {
    matches: scoredMatches,
    total: scoredMatches.length,
  };

  // Cache the result
  await cache.set(cacheKey, result, CACHE_TTL_SECONDS);

  return result;
}

/**
 * Get top suggested matches for a boxer
 * Returns highly scored compatible opponents
 */
export async function getSuggestedMatches(
  boxerId: string,
  limit: number = 10
): Promise<MatchScore[]> {
  // Check cache first
  const cacheKey = `suggestions:${boxerId}:${limit}`;
  const cachedResult = await cache.get<MatchScore[]>(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  const result = await findCompatibleBoxers(boxerId, { limit });

  // Cache the suggestions
  await cache.set(cacheKey, result.matches, CACHE_TTL_SECONDS);

  return result.matches;
}

/**
 * Invalidate match cache for a boxer
 * Call this when a boxer's profile is updated
 */
export async function invalidateMatchCache(boxerId: string): Promise<void> {
  await cache.delByPattern(`matches:${boxerId}:*`);
  await cache.delByPattern(`suggestions:${boxerId}:*`);
  // Also invalidate caches where this boxer might appear as a match
  await cache.delByPattern(`matches:*`);
  await cache.delByPattern(`suggestions:*`);
}

// Export all functions
export default {
  MATCHING_RULES,
  calculateMatchScore,
  findCompatibleBoxers,
  getSuggestedMatches,
  invalidateMatchCache,
};
