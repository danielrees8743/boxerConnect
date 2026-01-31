// Match Request Service
// Handles all match request-related business logic

import { MatchRequest, MatchRequestStatus, Prisma } from '@prisma/client';
import { prisma } from '../config';
import { getTotalFights } from './boxer.service';
import { MATCHING_RULES } from './matching.service';
import type { CreateMatchRequestInput, MatchRequestSearchInput } from '../validators/matchRequest.validators';

// ============================================================================
// Constants
// ============================================================================

const MATCH_REQUEST_EXPIRY_DAYS = 7;

// ============================================================================
// Types
// ============================================================================

export interface MatchRequestWithBoxers extends MatchRequest {
  requesterBoxer: {
    id: string;
    name: string;
    weightKg: Prisma.Decimal | null;
    experienceLevel: string;
    wins: number;
    losses: number;
    draws: number;
    city: string | null;
    country: string | null;
    profilePhotoUrl: string | null;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
  targetBoxer: {
    id: string;
    name: string;
    weightKg: Prisma.Decimal | null;
    experienceLevel: string;
    wins: number;
    losses: number;
    draws: number;
    city: string | null;
    country: string | null;
    profilePhotoUrl: string | null;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export interface PaginatedMatchRequests {
  matchRequests: MatchRequestWithBoxers[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MatchRequestStats {
  pending: number;
  accepted: number;
  declined: number;
  cancelled: number;
  expired: number;
  total: number;
}

// ============================================================================
// Boxer Select Configuration
// ============================================================================

const boxerSelect = {
  id: true,
  name: true,
  weightKg: true,
  experienceLevel: true,
  wins: true,
  losses: true,
  draws: true,
  city: true,
  country: true,
  profilePhotoUrl: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate expiration date for match request
 */
function calculateExpiryDate(): Date {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + MATCH_REQUEST_EXPIRY_DAYS);
  return expiryDate;
}

/**
 * Check if two boxers are compatible for matching
 */
async function checkCompatibility(
  requesterBoxerId: string,
  targetBoxerId: string,
): Promise<{ compatible: boolean; reason?: string }> {
  // Fetch both boxers
  const [requester, target] = await Promise.all([
    prisma.boxer.findUnique({ where: { id: requesterBoxerId } }),
    prisma.boxer.findUnique({ where: { id: targetBoxerId } }),
  ]);

  if (!requester) {
    return { compatible: false, reason: 'Requester boxer not found' };
  }

  if (!target) {
    return { compatible: false, reason: 'Target boxer not found' };
  }

  // Check if target is searchable and active
  if (!target.isSearchable) {
    return { compatible: false, reason: 'Target boxer is not available for matching' };
  }

  // Check weight compatibility (if both have weights specified)
  if (requester.weightKg && target.weightKg) {
    const requesterWeight = Number(requester.weightKg);
    const targetWeight = Number(target.weightKg);
    const weightDifference = Math.abs(requesterWeight - targetWeight);

    if (weightDifference > MATCHING_RULES.maxWeightDifference) {
      return {
        compatible: false,
        reason: `Weight difference (${weightDifference.toFixed(1)}kg) exceeds maximum allowed (${MATCHING_RULES.maxWeightDifference}kg)`,
      };
    }
  }

  // Check fights compatibility
  const requesterFights = getTotalFights(requester);
  const targetFights = getTotalFights(target);
  const fightsDifference = Math.abs(requesterFights - targetFights);

  if (fightsDifference > MATCHING_RULES.maxFightsDifference) {
    return {
      compatible: false,
      reason: `Fight experience difference (${fightsDifference} fights) exceeds maximum allowed (${MATCHING_RULES.maxFightsDifference} fights)`,
    };
  }

  return { compatible: true };
}

// ============================================================================
// Match Request Service Methods
// ============================================================================

/**
 * Create a new match request
 */
export async function createMatchRequest(
  requesterBoxerId: string,
  targetBoxerId: string,
  data: Omit<CreateMatchRequestInput, 'targetBoxerId'>,
): Promise<MatchRequestWithBoxers> {
  // Check if requesting self
  if (requesterBoxerId === targetBoxerId) {
    throw new Error('Cannot send match request to yourself');
  }

  // Check compatibility
  const compatibility = await checkCompatibility(requesterBoxerId, targetBoxerId);
  if (!compatibility.compatible) {
    throw new Error(compatibility.reason ?? 'Boxers are not compatible for matching');
  }

  // Check for existing pending request
  const existingRequest = await prisma.matchRequest.findFirst({
    where: {
      requesterBoxerId,
      targetBoxerId,
      status: MatchRequestStatus.PENDING,
    },
  });

  if (existingRequest) {
    throw new Error('You already have a pending match request to this boxer');
  }

  // Check for reverse pending request (target already sent one to requester)
  const reverseRequest = await prisma.matchRequest.findFirst({
    where: {
      requesterBoxerId: targetBoxerId,
      targetBoxerId: requesterBoxerId,
      status: MatchRequestStatus.PENDING,
    },
  });

  if (reverseRequest) {
    throw new Error('This boxer has already sent you a match request. Check your incoming requests.');
  }

  // Build create data, only including optional fields if provided
  const createData: Prisma.MatchRequestUncheckedCreateInput = {
    requesterBoxerId,
    targetBoxerId,
    expiresAt: calculateExpiryDate(),
    status: MatchRequestStatus.PENDING,
  };

  // Only set optional fields if provided
  if (data.message !== undefined) {
    createData.message = data.message;
  }
  if (data.proposedDate !== undefined) {
    createData.proposedDate = data.proposedDate;
  }
  if (data.proposedVenue !== undefined) {
    createData.proposedVenue = data.proposedVenue;
  }

  // Create the match request
  const matchRequest = await prisma.matchRequest.create({
    data: createData,
    include: {
      requesterBoxer: { select: boxerSelect },
      targetBoxer: { select: boxerSelect },
    },
  });

  return matchRequest as MatchRequestWithBoxers;
}

/**
 * Get match request by ID with boxer details
 */
export async function getMatchRequestById(
  id: string,
): Promise<MatchRequestWithBoxers | null> {
  const matchRequest = await prisma.matchRequest.findUnique({
    where: { id },
    include: {
      requesterBoxer: { select: boxerSelect },
      targetBoxer: { select: boxerSelect },
    },
  });

  return matchRequest as MatchRequestWithBoxers | null;
}

/**
 * Get match requests for a boxer (incoming or outgoing)
 */
export async function getMatchRequestsForBoxer(
  boxerId: string,
  type: 'incoming' | 'outgoing',
  params: Omit<MatchRequestSearchInput, 'type'>,
): Promise<PaginatedMatchRequests> {
  const { status, page, limit } = params;

  // Build where clause
  const where: Prisma.MatchRequestWhereInput = type === 'incoming'
    ? { targetBoxerId: boxerId }
    : { requesterBoxerId: boxerId };

  if (status) {
    where.status = status;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Execute queries in parallel
  const [matchRequests, total] = await Promise.all([
    prisma.matchRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        requesterBoxer: { select: boxerSelect },
        targetBoxer: { select: boxerSelect },
      },
    }),
    prisma.matchRequest.count({ where }),
  ]);

  return {
    matchRequests: matchRequests as MatchRequestWithBoxers[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Accept a match request
 * Only the target boxer can accept
 */
export async function acceptMatchRequest(
  requestId: string,
  boxerId: string,
  responseMessage?: string,
): Promise<MatchRequestWithBoxers> {
  // Get the request
  const request = await prisma.matchRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error('Match request not found');
  }

  // Verify the user is the target boxer
  if (request.targetBoxerId !== boxerId) {
    throw new Error('Not authorized to accept this match request');
  }

  // Check status
  if (request.status !== MatchRequestStatus.PENDING) {
    throw new Error(`Cannot accept a match request that is ${request.status.toLowerCase()}`);
  }

  // Check if expired
  if (new Date() > request.expiresAt) {
    // Update status to expired
    await prisma.matchRequest.update({
      where: { id: requestId },
      data: { status: MatchRequestStatus.EXPIRED },
    });
    throw new Error('This match request has expired');
  }

  // Build update data
  const updateData: Prisma.MatchRequestUpdateInput = {
    status: MatchRequestStatus.ACCEPTED,
  };

  if (responseMessage !== undefined) {
    updateData.responseMessage = responseMessage;
  }

  // Update the request
  const updatedRequest = await prisma.matchRequest.update({
    where: { id: requestId },
    data: updateData,
    include: {
      requesterBoxer: { select: boxerSelect },
      targetBoxer: { select: boxerSelect },
    },
  });

  return updatedRequest as MatchRequestWithBoxers;
}

/**
 * Decline a match request
 * Only the target boxer can decline
 */
export async function declineMatchRequest(
  requestId: string,
  boxerId: string,
  responseMessage?: string,
): Promise<MatchRequestWithBoxers> {
  // Get the request
  const request = await prisma.matchRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error('Match request not found');
  }

  // Verify the user is the target boxer
  if (request.targetBoxerId !== boxerId) {
    throw new Error('Not authorized to decline this match request');
  }

  // Check status
  if (request.status !== MatchRequestStatus.PENDING) {
    throw new Error(`Cannot decline a match request that is ${request.status.toLowerCase()}`);
  }

  // Build update data
  const updateData: Prisma.MatchRequestUpdateInput = {
    status: MatchRequestStatus.DECLINED,
  };

  if (responseMessage !== undefined) {
    updateData.responseMessage = responseMessage;
  }

  // Update the request
  const updatedRequest = await prisma.matchRequest.update({
    where: { id: requestId },
    data: updateData,
    include: {
      requesterBoxer: { select: boxerSelect },
      targetBoxer: { select: boxerSelect },
    },
  });

  return updatedRequest as MatchRequestWithBoxers;
}

/**
 * Cancel a match request
 * Only the requester boxer can cancel
 */
export async function cancelMatchRequest(
  requestId: string,
  boxerId: string,
): Promise<MatchRequestWithBoxers> {
  // Get the request
  const request = await prisma.matchRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error('Match request not found');
  }

  // Verify the user is the requester boxer
  if (request.requesterBoxerId !== boxerId) {
    throw new Error('Not authorized to cancel this match request');
  }

  // Check status
  if (request.status !== MatchRequestStatus.PENDING) {
    throw new Error(`Cannot cancel a match request that is ${request.status.toLowerCase()}`);
  }

  // Update the request
  const updatedRequest = await prisma.matchRequest.update({
    where: { id: requestId },
    data: {
      status: MatchRequestStatus.CANCELLED,
    },
    include: {
      requesterBoxer: { select: boxerSelect },
      targetBoxer: { select: boxerSelect },
    },
  });

  return updatedRequest as MatchRequestWithBoxers;
}

/**
 * Expire old pending requests
 * Should be called by a scheduled job
 */
export async function expireOldRequests(): Promise<number> {
  const result = await prisma.matchRequest.updateMany({
    where: {
      status: MatchRequestStatus.PENDING,
      expiresAt: {
        lt: new Date(),
      },
    },
    data: {
      status: MatchRequestStatus.EXPIRED,
    },
  });

  return result.count;
}

/**
 * Get request statistics for a boxer
 */
export async function getRequestStats(boxerId: string): Promise<{
  incoming: MatchRequestStats;
  outgoing: MatchRequestStats;
}> {
  // Get incoming stats
  const [
    incomingPending,
    incomingAccepted,
    incomingDeclined,
    incomingCancelled,
    incomingExpired,
    incomingTotal,
    outgoingPending,
    outgoingAccepted,
    outgoingDeclined,
    outgoingCancelled,
    outgoingExpired,
    outgoingTotal,
  ] = await Promise.all([
    // Incoming counts
    prisma.matchRequest.count({
      where: { targetBoxerId: boxerId, status: MatchRequestStatus.PENDING },
    }),
    prisma.matchRequest.count({
      where: { targetBoxerId: boxerId, status: MatchRequestStatus.ACCEPTED },
    }),
    prisma.matchRequest.count({
      where: { targetBoxerId: boxerId, status: MatchRequestStatus.DECLINED },
    }),
    prisma.matchRequest.count({
      where: { targetBoxerId: boxerId, status: MatchRequestStatus.CANCELLED },
    }),
    prisma.matchRequest.count({
      where: { targetBoxerId: boxerId, status: MatchRequestStatus.EXPIRED },
    }),
    prisma.matchRequest.count({
      where: { targetBoxerId: boxerId },
    }),
    // Outgoing counts
    prisma.matchRequest.count({
      where: { requesterBoxerId: boxerId, status: MatchRequestStatus.PENDING },
    }),
    prisma.matchRequest.count({
      where: { requesterBoxerId: boxerId, status: MatchRequestStatus.ACCEPTED },
    }),
    prisma.matchRequest.count({
      where: { requesterBoxerId: boxerId, status: MatchRequestStatus.DECLINED },
    }),
    prisma.matchRequest.count({
      where: { requesterBoxerId: boxerId, status: MatchRequestStatus.CANCELLED },
    }),
    prisma.matchRequest.count({
      where: { requesterBoxerId: boxerId, status: MatchRequestStatus.EXPIRED },
    }),
    prisma.matchRequest.count({
      where: { requesterBoxerId: boxerId },
    }),
  ]);

  return {
    incoming: {
      pending: incomingPending,
      accepted: incomingAccepted,
      declined: incomingDeclined,
      cancelled: incomingCancelled,
      expired: incomingExpired,
      total: incomingTotal,
    },
    outgoing: {
      pending: outgoingPending,
      accepted: outgoingAccepted,
      declined: outgoingDeclined,
      cancelled: outgoingCancelled,
      expired: outgoingExpired,
      total: outgoingTotal,
    },
  };
}

// Export all functions
export default {
  createMatchRequest,
  getMatchRequestById,
  getMatchRequestsForBoxer,
  acceptMatchRequest,
  declineMatchRequest,
  cancelMatchRequest,
  expireOldRequests,
  getRequestStats,
};
