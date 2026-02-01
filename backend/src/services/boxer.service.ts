// Boxer Service
// Handles all boxer profile-related business logic

import { Boxer, ExperienceLevel, Prisma } from '@prisma/client';
import { prisma } from '../config';
import type { CreateBoxerInput, UpdateBoxerInput, BoxerSearchInput } from '../validators/boxer.validators';

// ============================================================================
// Types
// ============================================================================

export interface BoxerWithUser extends Boxer {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    emailVerified: boolean;
  };
}

export interface PaginatedBoxers {
  boxers: Boxer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build create data object, filtering out undefined values
 */
function buildCreateData(
  userId: string,
  data: CreateBoxerInput
): Prisma.BoxerUncheckedCreateInput {
  const createData: Prisma.BoxerUncheckedCreateInput = {
    userId,
    name: data.name,
    experienceLevel: data.experienceLevel ?? ExperienceLevel.BEGINNER,
    wins: data.wins ?? 0,
    losses: data.losses ?? 0,
    draws: data.draws ?? 0,
  };

  // Only set optional fields if they have values
  if (data.gender !== undefined) createData.gender = data.gender;
  if (data.weightKg !== undefined) createData.weightKg = data.weightKg;
  if (data.heightCm !== undefined) createData.heightCm = data.heightCm;
  if (data.dateOfBirth !== undefined) createData.dateOfBirth = data.dateOfBirth;
  if (data.location !== undefined) createData.location = data.location;
  if (data.city !== undefined) createData.city = data.city;
  if (data.country !== undefined) createData.country = data.country;
  if (data.gymAffiliation !== undefined) createData.gymAffiliation = data.gymAffiliation;
  if (data.bio !== undefined) createData.bio = data.bio;
  if (data.profilePhotoUrl !== undefined) createData.profilePhotoUrl = data.profilePhotoUrl;

  return createData;
}

/**
 * Build update data object from CreateBoxerInput
 */
function buildUpdateDataFromCreate(data: CreateBoxerInput): Prisma.BoxerUpdateInput {
  const updateData: Prisma.BoxerUpdateInput = {
    name: data.name,
  };

  if (data.gender !== undefined) updateData.gender = data.gender;
  if (data.weightKg !== undefined) updateData.weightKg = data.weightKg;
  if (data.heightCm !== undefined) updateData.heightCm = data.heightCm;
  if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.country !== undefined) updateData.country = data.country;
  if (data.experienceLevel !== undefined) updateData.experienceLevel = data.experienceLevel;
  if (data.wins !== undefined) updateData.wins = data.wins;
  if (data.losses !== undefined) updateData.losses = data.losses;
  if (data.draws !== undefined) updateData.draws = data.draws;
  if (data.gymAffiliation !== undefined) updateData.gymAffiliation = data.gymAffiliation;
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.profilePhotoUrl !== undefined) updateData.profilePhotoUrl = data.profilePhotoUrl;

  return updateData;
}

// ============================================================================
// Boxer Service Methods
// ============================================================================

/**
 * Create a new boxer profile
 * Note: A basic boxer profile is created during user registration
 * This method updates/completes that profile with additional data
 */
export async function createBoxer(
  userId: string,
  data: CreateBoxerInput
): Promise<Boxer> {
  // Check if user already has a boxer profile
  const existingBoxer = await prisma.boxer.findUnique({
    where: { userId },
  });

  if (existingBoxer) {
    // Update existing profile instead of creating new one
    return prisma.boxer.update({
      where: { userId },
      data: buildUpdateDataFromCreate(data),
    });
  }

  // Create new boxer profile
  return prisma.boxer.create({
    data: buildCreateData(userId, data),
  });
}

/**
 * Get boxer by ID with user info
 */
export async function getBoxerById(id: string): Promise<BoxerWithUser | null> {
  return prisma.boxer.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          emailVerified: true,
        },
      },
    },
  });
}

/**
 * Get boxer by user ID
 */
export async function getBoxerByUserId(userId: string): Promise<BoxerWithUser | null> {
  return prisma.boxer.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          emailVerified: true,
        },
      },
    },
  });
}

export interface UpdateBoxerOptions {
  skipOwnershipCheck?: boolean;
}

/**
 * Update boxer profile
 * By default only the owner can update their profile
 * Set skipOwnershipCheck to true when authorization is verified externally (e.g., coach permissions)
 */
export async function updateBoxer(
  id: string,
  userId: string,
  data: UpdateBoxerInput,
  options: UpdateBoxerOptions = {}
): Promise<Boxer> {
  const { skipOwnershipCheck = false } = options;

  // Verify the boxer exists
  const boxer = await prisma.boxer.findUnique({
    where: { id },
    include: { club: true },
  });

  if (!boxer) {
    throw new Error('Boxer profile not found');
  }

  // Verify ownership unless explicitly skipped
  if (!skipOwnershipCheck && boxer.userId !== userId) {
    throw new Error('Not authorized to update this profile');
  }

  // Build update data, handling null values for clearing fields
  // Using UncheckedUpdateInput to allow direct clubId assignment
  const updateData: Prisma.BoxerUncheckedUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.gender !== undefined) updateData.gender = data.gender;
  if (data.weightKg !== undefined) updateData.weightKg = data.weightKg;
  if (data.heightCm !== undefined) updateData.heightCm = data.heightCm;
  if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.country !== undefined) updateData.country = data.country;
  if (data.experienceLevel !== undefined) updateData.experienceLevel = data.experienceLevel;
  if (data.wins !== undefined) updateData.wins = data.wins;
  if (data.losses !== undefined) updateData.losses = data.losses;
  if (data.draws !== undefined) updateData.draws = data.draws;
  if (data.gymAffiliation !== undefined) updateData.gymAffiliation = data.gymAffiliation;
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.profilePhotoUrl !== undefined) updateData.profilePhotoUrl = data.profilePhotoUrl;
  if (data.isSearchable !== undefined) updateData.isSearchable = data.isSearchable;
  if (data.clubId !== undefined) {
    if (data.clubId) {
      // Verify club exists before assigning
      const club = await prisma.club.findUnique({ where: { id: data.clubId } });
      if (!club) {
        throw new Error('Club not found');
      }
      updateData.clubId = data.clubId;
      // Update gymAffiliation with club name for backwards compatibility
      updateData.gymAffiliation = club.name;
    } else {
      // Allow setting clubId to null (removing from club)
      updateData.clubId = null;
    }
  }

  return prisma.boxer.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Search boxers with filters and pagination
 */
export async function searchBoxers(params: BoxerSearchInput): Promise<PaginatedBoxers> {
  const { city, country, experienceLevel, minWeight, maxWeight, page, limit } = params;

  // Build where clause
  const where: Prisma.BoxerWhereInput = {
    isSearchable: true,
    user: {
      isActive: true,
    },
  };

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

  if (experienceLevel) {
    where.experienceLevel = experienceLevel;
  }

  if (minWeight !== undefined || maxWeight !== undefined) {
    where.weightKg = {};
    if (minWeight !== undefined) {
      where.weightKg.gte = minWeight;
    }
    if (maxWeight !== undefined) {
      where.weightKg.lte = maxWeight;
    }
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Execute queries in parallel
  const [boxers, total] = await Promise.all([
    prisma.boxer.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { isVerified: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            emailVerified: true,
          },
        },
      },
    }),
    prisma.boxer.count({ where }),
  ]);

  return {
    boxers,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Soft delete or deactivate boxer profile
 * Sets isSearchable to false
 */
export async function deleteBoxer(id: string, userId: string): Promise<Boxer> {
  // Verify ownership
  const boxer = await prisma.boxer.findUnique({
    where: { id },
  });

  if (!boxer) {
    throw new Error('Boxer profile not found');
  }

  if (boxer.userId !== userId) {
    throw new Error('Not authorized to delete this profile');
  }

  // Soft delete by setting isSearchable to false
  return prisma.boxer.update({
    where: { id },
    data: {
      isSearchable: false,
    },
  });
}

/**
 * Get total fights for a boxer
 */
export function getTotalFights(boxer: Boxer): number {
  return boxer.wins + boxer.losses + boxer.draws;
}

// Export all functions
export default {
  createBoxer,
  getBoxerById,
  getBoxerByUserId,
  updateBoxer,
  searchBoxers,
  deleteBoxer,
  getTotalFights,
};
