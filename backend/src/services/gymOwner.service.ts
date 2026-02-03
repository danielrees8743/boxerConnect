// Gym Owner Service
// Handles all gym owner-related business logic including boxer account creation

import { UserRole, ExperienceLevel, Prisma } from '@prisma/client';
import { prisma } from '../config';
import { hashPassword } from './auth.service';
import { withUserContext } from '../utils/database-context';
import { isClubOwner } from './club.service';
import type { CreateBoxerAccountInput } from '../validators/gymOwner.validators';

// ============================================================================
// Types
// ============================================================================

export interface CreatedBoxerAccount {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isActive: boolean;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  boxer: {
    id: string;
    userId: string;
    name: string;
    experienceLevel: ExperienceLevel;
    gender: string | null;
    weightKg: Prisma.Decimal | null;
    heightCm: number | null;
    dateOfBirth: Date | null;
    city: string | null;
    country: string | null;
    clubId: string | null;
    gymAffiliation: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

// ============================================================================
// Gym Owner Service Methods
// ============================================================================

/**
 * Create a boxer account for a club
 *
 * This method allows gym owners to directly create boxer accounts linked to their clubs.
 * It verifies club ownership, validates email uniqueness, creates the user account,
 * and creates a boxer profile linked to the club.
 *
 * @param gymOwnerUserId - The gym owner's user ID
 * @param clubId - The club ID to link the boxer to
 * @param data - Account and profile data
 * @returns Created user and boxer objects
 * @throws Error if gym owner doesn't own the club
 * @throws Error if email already exists
 */
export async function createBoxerAccountForClub(
  gymOwnerUserId: string,
  clubId: string,
  data: CreateBoxerAccountInput
): Promise<CreatedBoxerAccount> {
  // Step 1: Verify gym owner owns the specified club
  const ownsClub = await isClubOwner(gymOwnerUserId, clubId);
  if (!ownsClub) {
    throw new Error('Not authorized to create accounts for this club');
  }

  // Step 2: Get club details for gymAffiliation
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, name: true },
  });

  if (!club) {
    throw new Error('Club not found');
  }

  // Step 3: Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Step 4: Hash the password
  const passwordHash = await hashPassword(data.password);

  // Step 5: Create user account and boxer profile in a transaction with RLS context
  const result = await withUserContext(
    gymOwnerUserId,
    UserRole.GYM_OWNER,
    async (tx) => {
      // Create user account
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name,
          role: UserRole.BOXER,
          emailVerified: false, // Gym owner created accounts start unverified
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Create boxer profile linked to user and club
      const boxerData: Prisma.BoxerCreateInput = {
        user: {
          connect: { id: user.id },
        },
        name: data.name,
        experienceLevel: data.experienceLevel ?? ExperienceLevel.BEGINNER,
        club: {
          connect: { id: clubId },
        },
        gymAffiliation: club.name,
      };

      // Add optional fields if provided
      if (data.gender !== undefined) {
        boxerData.gender = data.gender;
      }
      if (data.weightKg !== undefined) {
        boxerData.weightKg = data.weightKg;
      }
      if (data.heightCm !== undefined) {
        boxerData.heightCm = data.heightCm;
      }
      if (data.dateOfBirth !== undefined) {
        boxerData.dateOfBirth = data.dateOfBirth;
      }
      if (data.city !== undefined) {
        boxerData.city = data.city;
      }
      if (data.country !== undefined) {
        boxerData.country = data.country;
      }

      const boxer = await tx.boxer.create({
        data: boxerData,
        select: {
          id: true,
          userId: true,
          name: true,
          experienceLevel: true,
          gender: true,
          weightKg: true,
          heightCm: true,
          dateOfBirth: true,
          city: true,
          country: true,
          clubId: true,
          gymAffiliation: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return { user, boxer };
    }
  );

  return result;
}

// Export all functions
export default {
  createBoxerAccountForClub,
};
