// Club Membership Request Service
// Handles club membership request business logic for boxer self-signup flow

import { ClubMembershipRequest, MembershipRequestStatus, Boxer } from '@prisma/client';
import { prisma } from '../config';
import { withUserContext } from '../utils/database-context';
import { isClubOwner } from './club.service';

// ============================================================================
// Types
// ============================================================================

export interface MembershipRequestWithDetails extends ClubMembershipRequest {
  user: {
    id: string;
    email: string;
    name: string;
  };
  club: {
    id: string;
    name: string;
  };
}

// ============================================================================
// Service Methods
// ============================================================================

/**
 * Get all pending membership requests for clubs owned by a gym owner
 *
 * @param gymOwnerId - The gym owner's user ID
 * @returns Array of pending membership requests with user and club data
 */
export async function getPendingRequestsForGymOwner(
  gymOwnerId: string
): Promise<MembershipRequestWithDetails[]> {
  // Get all clubs owned by this gym owner
  const ownedClubs = await prisma.club.findMany({
    where: { ownerId: gymOwnerId },
    select: { id: true },
  });

  const clubIds = ownedClubs.map(club => club.id);

  // If no clubs owned, return empty array
  if (clubIds.length === 0) {
    return [];
  }

  // Query pending requests for all owned clubs
  const requests = await prisma.clubMembershipRequest.findMany({
    where: {
      clubId: { in: clubIds },
      status: MembershipRequestStatus.PENDING,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      club: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      requestedAt: 'desc',
    },
  });

  return requests;
}

/**
 * Create a membership request for a boxer to join a club
 *
 * @param userId - The user's ID (boxer)
 * @param clubId - The club ID to request membership
 * @returns The created or existing membership request
 * @throws Error if club doesn't exist
 */
export async function createMembershipRequest(
  userId: string,
  clubId: string
): Promise<ClubMembershipRequest> {
  // Verify club exists
  const club = await prisma.club.findUnique({
    where: { id: clubId },
  });

  if (!club) {
    throw new Error('Club not found');
  }

  // Use withUserContext for RLS
  return withUserContext(userId, 'BOXER', async (tx) => {
    // Use upsert to handle both create and update cases atomically
    // This prevents race conditions from concurrent requests
    return tx.clubMembershipRequest.upsert({
      where: {
        userId_clubId: {
          userId,
          clubId,
        },
      },
      update: {
        // If request exists and was rejected/approved, reset to pending
        status: MembershipRequestStatus.PENDING,
        requestedAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
        notes: null,
      },
      create: {
        userId,
        clubId,
        status: MembershipRequestStatus.PENDING,
      },
    });
  });
}

/**
 * Approve a membership request
 *
 * Updates the boxer's clubId and gymAffiliation, then marks the request as approved.
 * Uses a transaction to ensure atomicity.
 *
 * @param requestId - The membership request ID
 * @param gymOwnerId - The gym owner's user ID
 * @returns The updated boxer profile
 * @throws Error if request not found, not pending, or gym owner doesn't own the club
 */
export async function approveRequest(
  requestId: string,
  gymOwnerId: string
): Promise<Boxer> {
  // Get the request with club and user details
  const request = await prisma.clubMembershipRequest.findUnique({
    where: { id: requestId },
    include: {
      club: true,
      user: {
        include: {
          boxer: true,
        },
      },
    },
  });

  if (!request) {
    throw new Error('Membership request not found');
  }

  // Verify gym owner owns this club
  const ownsClub = await isClubOwner(gymOwnerId, request.clubId);
  if (!ownsClub) {
    throw new Error('Not authorized to approve requests for this club');
  }

  // Verify request is still pending
  if (request.status !== MembershipRequestStatus.PENDING) {
    throw new Error('Request has already been processed');
  }

  // Verify user has a boxer profile
  if (!request.user.boxer) {
    throw new Error('User does not have a boxer profile');
  }

  // Execute approval in a transaction with RLS context
  return withUserContext(gymOwnerId, 'GYM_OWNER', async (tx) => {
    // Update the boxer profile with club assignment
    const updatedBoxer = await tx.boxer.update({
      where: { id: request.user.boxer!.id },
      data: {
        clubId: request.clubId,
        gymAffiliation: request.club.name,
      },
    });

    // Update the membership request status
    await tx.clubMembershipRequest.update({
      where: { id: requestId },
      data: {
        status: MembershipRequestStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedBy: gymOwnerId,
      },
    });

    return updatedBoxer;
  });
}

/**
 * Reject a membership request
 *
 * @param requestId - The membership request ID
 * @param gymOwnerId - The gym owner's user ID
 * @param notes - Optional notes explaining the rejection
 * @returns The updated membership request
 * @throws Error if request not found, not pending, or gym owner doesn't own the club
 */
export async function rejectRequest(
  requestId: string,
  gymOwnerId: string,
  notes?: string
): Promise<ClubMembershipRequest> {
  // Get the request
  const request = await prisma.clubMembershipRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error('Membership request not found');
  }

  // Verify gym owner owns this club
  const ownsClub = await isClubOwner(gymOwnerId, request.clubId);
  if (!ownsClub) {
    throw new Error('Not authorized to reject requests for this club');
  }

  // Verify request is still pending
  if (request.status !== MembershipRequestStatus.PENDING) {
    throw new Error('Request has already been processed');
  }

  // Update request status with RLS context
  return withUserContext(gymOwnerId, 'GYM_OWNER', async (tx) => {
    return tx.clubMembershipRequest.update({
      where: { id: requestId },
      data: {
        status: MembershipRequestStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedBy: gymOwnerId,
        notes,
      },
    });
  });
}

// Export all functions
export default {
  getPendingRequestsForGymOwner,
  createMembershipRequest,
  approveRequest,
  rejectRequest,
};
