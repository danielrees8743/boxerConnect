// Coach Service
// Handles all coach-boxer relationship business logic

import { CoachBoxer, CoachPermission, Boxer } from '@prisma/client';
import { prisma } from '../config';

// ============================================================================
// Types
// ============================================================================

export interface CoachBoxerWithDetails extends CoachBoxer {
  boxer: Boxer & {
    user: {
      id: string;
      email: string;
      name: string;
      isActive: boolean;
    };
  };
}

export interface BoxerCoachWithDetails extends CoachBoxer {
  coach: {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
  };
}

// ============================================================================
// Coach Service Methods
// ============================================================================

/**
 * Link a boxer to a coach with specified permissions
 */
export async function linkBoxer(
  coachUserId: string,
  boxerId: string,
  permissions: CoachPermission = CoachPermission.VIEW_PROFILE
): Promise<CoachBoxer> {
  // Verify the boxer exists
  const boxer = await prisma.boxer.findUnique({
    where: { id: boxerId },
    include: { user: { select: { isActive: true } } },
  });

  if (!boxer) {
    throw new Error('Boxer not found');
  }

  if (!boxer.user.isActive) {
    throw new Error('Cannot link to inactive boxer');
  }

  // Verify the coach user exists and has COACH role
  const coach = await prisma.user.findUnique({
    where: { id: coachUserId },
  });

  if (!coach) {
    throw new Error('Coach not found');
  }

  if (coach.role !== 'COACH') {
    throw new Error('User is not a coach');
  }

  // Check if relationship already exists
  const existingRelation = await prisma.coachBoxer.findUnique({
    where: {
      coachUserId_boxerId: {
        coachUserId,
        boxerId,
      },
    },
  });

  if (existingRelation) {
    throw new Error('Coach-boxer relationship already exists');
  }

  // Create the relationship
  return prisma.coachBoxer.create({
    data: {
      coachUserId,
      boxerId,
      permissions,
    },
  });
}

/**
 * Remove a boxer from a coach's roster
 */
export async function unlinkBoxer(
  coachUserId: string,
  boxerId: string
): Promise<void> {
  // Verify the relationship exists
  const relation = await prisma.coachBoxer.findUnique({
    where: {
      coachUserId_boxerId: {
        coachUserId,
        boxerId,
      },
    },
  });

  if (!relation) {
    throw new Error('Coach-boxer relationship not found');
  }

  // Delete the relationship
  await prisma.coachBoxer.delete({
    where: {
      coachUserId_boxerId: {
        coachUserId,
        boxerId,
      },
    },
  });
}

/**
 * Update permissions for a coach-boxer relationship
 */
export async function updatePermissions(
  coachUserId: string,
  boxerId: string,
  permissions: CoachPermission
): Promise<CoachBoxer> {
  // Verify the relationship exists
  const relation = await prisma.coachBoxer.findUnique({
    where: {
      coachUserId_boxerId: {
        coachUserId,
        boxerId,
      },
    },
  });

  if (!relation) {
    throw new Error('Coach-boxer relationship not found');
  }

  // Update permissions
  return prisma.coachBoxer.update({
    where: {
      coachUserId_boxerId: {
        coachUserId,
        boxerId,
      },
    },
    data: {
      permissions,
    },
  });
}

/**
 * Get all boxers linked to a coach
 */
export async function getCoachBoxers(
  coachUserId: string
): Promise<CoachBoxerWithDetails[]> {
  return prisma.coachBoxer.findMany({
    where: { coachUserId },
    include: {
      boxer: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              isActive: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get all coaches linked to a boxer
 */
export async function getBoxerCoaches(
  boxerId: string
): Promise<BoxerCoachWithDetails[]> {
  return prisma.coachBoxer.findMany({
    where: { boxerId },
    include: {
      coach: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Check if a coach has a specific permission for a boxer
 */
export async function hasPermission(
  coachUserId: string,
  boxerId: string,
  permission: CoachPermission
): Promise<boolean> {
  const relation = await prisma.coachBoxer.findUnique({
    where: {
      coachUserId_boxerId: {
        coachUserId,
        boxerId,
      },
    },
  });

  if (!relation) {
    return false;
  }

  // FULL_ACCESS grants all permissions
  if (relation.permissions === CoachPermission.FULL_ACCESS) {
    return true;
  }

  // Check specific permission
  return relation.permissions === permission;
}

/**
 * Get a specific coach-boxer relationship
 */
export async function getCoachBoxerRelation(
  coachUserId: string,
  boxerId: string
): Promise<CoachBoxer | null> {
  return prisma.coachBoxer.findUnique({
    where: {
      coachUserId_boxerId: {
        coachUserId,
        boxerId,
      },
    },
  });
}

// Export all functions
export default {
  linkBoxer,
  unlinkBoxer,
  updatePermissions,
  getCoachBoxers,
  getBoxerCoaches,
  hasPermission,
  getCoachBoxerRelation,
};
