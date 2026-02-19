// Connection Service
// Handles all boxer-to-boxer connection business logic

import { ConnectionRequestStatus, Prisma } from '@prisma/client';
import { prisma } from '../config';
import { BadRequestError, ForbiddenError, NotFoundError } from '../middleware';

// ============================================================================
// Types
// ============================================================================

export type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'connected';

export interface ConnectionStatusResult {
  status: ConnectionStatus;
  requestId: string | null;
  connectionId: string | null;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

const boxerSelect = {
  id: true,
  name: true,
  profilePhotoUrl: true,
  experienceLevel: true,
  city: true,
  country: true,
  wins: true,
  losses: true,
  draws: true,
  user: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Returns [idA, idB] in lexicographic order so that the unique constraint on
 * (boxer_a_id, boxer_b_id) is stable regardless of which boxer initiated.
 */
function normaliseIds(id1: string, id2: string): [string, string] {
  return id1 < id2 ? [id1, id2] : [id2, id1];
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Send a connection request from one boxer to another
 */
export async function sendConnectionRequest(
  requesterBoxerId: string,
  targetBoxerId: string,
  message?: string,
) {
  if (requesterBoxerId === targetBoxerId) {
    throw new BadRequestError('Cannot send a connection request to yourself');
  }

  // Verify target boxer exists
  const targetBoxer = await prisma.boxer.findUnique({ where: { id: targetBoxerId } });
  if (!targetBoxer) {
    throw new NotFoundError('Target boxer not found');
  }

  // Check if already connected (normalise IDs for lookup)
  const [idA, idB] = normaliseIds(requesterBoxerId, targetBoxerId);
  const existing = await prisma.connection.findUnique({
    where: { boxerAId_boxerBId: { boxerAId: idA, boxerBId: idB } },
  });
  if (existing) {
    throw new BadRequestError('You are already connected with this boxer');
  }

  // Check for an existing outgoing PENDING request
  const outgoing = await prisma.connectionRequest.findFirst({
    where: {
      requesterBoxerId,
      targetBoxerId,
      status: ConnectionRequestStatus.PENDING,
    },
  });
  if (outgoing) {
    throw new BadRequestError('You already have a pending connection request to this boxer');
  }

  // Check for an existing incoming PENDING request (reverse)
  const incoming = await prisma.connectionRequest.findFirst({
    where: {
      requesterBoxerId: targetBoxerId,
      targetBoxerId: requesterBoxerId,
      status: ConnectionRequestStatus.PENDING,
    },
  });
  if (incoming) {
    throw new BadRequestError(
      'This boxer has already sent you a connection request. Check your incoming requests.',
    );
  }

  // Create the request
  return prisma.connectionRequest.create({
    data: {
      requesterBoxerId,
      targetBoxerId,
      status: ConnectionRequestStatus.PENDING,
      ...(message !== undefined && { message }),
    },
    include: {
      requesterBoxer: { select: boxerSelect },
      targetBoxer: { select: boxerSelect },
    },
  });
}

/**
 * Accept an incoming connection request — atomically updates request and creates Connection
 */
export async function acceptConnectionRequest(requestId: string, boxerId: string) {
  const request = await prisma.connectionRequest.findUnique({ where: { id: requestId } });

  if (!request) {
    throw new NotFoundError('Connection request not found');
  }
  if (request.targetBoxerId !== boxerId) {
    throw new ForbiddenError('Not authorised to accept this connection request');
  }
  if (request.status !== ConnectionRequestStatus.PENDING) {
    throw new BadRequestError(
      `Cannot accept a connection request that is ${request.status.toLowerCase()}`,
    );
  }

  const [idA, idB] = normaliseIds(request.requesterBoxerId, request.targetBoxerId);

  const [updatedRequest, connection] = await prisma.$transaction([
    prisma.connectionRequest.update({
      where: { id: requestId },
      data: { status: ConnectionRequestStatus.ACCEPTED },
      include: {
        requesterBoxer: { select: boxerSelect },
        targetBoxer: { select: boxerSelect },
      },
    }),
    prisma.connection.create({
      data: { boxerAId: idA, boxerBId: idB },
    }),
  ]);

  return { connectionRequest: updatedRequest, connection };
}

/**
 * Decline an incoming connection request
 */
export async function declineConnectionRequest(requestId: string, boxerId: string) {
  const request = await prisma.connectionRequest.findUnique({ where: { id: requestId } });

  if (!request) {
    throw new NotFoundError('Connection request not found');
  }
  if (request.targetBoxerId !== boxerId) {
    throw new ForbiddenError('Not authorised to decline this connection request');
  }
  if (request.status !== ConnectionRequestStatus.PENDING) {
    throw new BadRequestError(
      `Cannot decline a connection request that is ${request.status.toLowerCase()}`,
    );
  }

  return prisma.connectionRequest.update({
    where: { id: requestId },
    data: { status: ConnectionRequestStatus.DECLINED },
    include: {
      requesterBoxer: { select: boxerSelect },
      targetBoxer: { select: boxerSelect },
    },
  });
}

/**
 * Cancel an outgoing connection request (requester only)
 */
export async function cancelConnectionRequest(requestId: string, boxerId: string) {
  const request = await prisma.connectionRequest.findUnique({ where: { id: requestId } });

  if (!request) {
    throw new NotFoundError('Connection request not found');
  }
  if (request.requesterBoxerId !== boxerId) {
    throw new ForbiddenError('Not authorised to cancel this connection request');
  }
  if (request.status !== ConnectionRequestStatus.PENDING) {
    throw new BadRequestError(
      `Cannot cancel a connection request that is ${request.status.toLowerCase()}`,
    );
  }

  return prisma.connectionRequest.update({
    where: { id: requestId },
    data: { status: ConnectionRequestStatus.CANCELLED },
    include: {
      requesterBoxer: { select: boxerSelect },
      targetBoxer: { select: boxerSelect },
    },
  });
}

/**
 * Get paginated connection requests for a boxer (incoming or outgoing)
 */
export async function getConnectionRequestsForBoxer(
  boxerId: string,
  type: 'incoming' | 'outgoing',
  params: PaginationParams & { status?: ConnectionRequestStatus } = {},
) {
  const { page = 1, limit = 20, status } = params;

  const where: Prisma.ConnectionRequestWhereInput =
    type === 'incoming' ? { targetBoxerId: boxerId } : { requesterBoxerId: boxerId };

  if (status) {
    where.status = status;
  }

  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    prisma.connectionRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        requesterBoxer: { select: boxerSelect },
        targetBoxer: { select: boxerSelect },
      },
    }),
    prisma.connectionRequest.count({ where }),
  ]);

  return {
    requests,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get paginated accepted connections for a boxer.
 * Normalises each row so that `boxer` always refers to the *other* boxer.
 */
export async function getConnectionsForBoxer(boxerId: string, params: PaginationParams = {}) {
  const { page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.ConnectionWhereInput = {
    OR: [{ boxerAId: boxerId }, { boxerBId: boxerId }],
  };

  const [connections, total] = await Promise.all([
    prisma.connection.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        boxerA: { select: boxerSelect },
        boxerB: { select: boxerSelect },
      },
    }),
    prisma.connection.count({ where }),
  ]);

  const normalised = connections.map((conn) => ({
    id: conn.id,
    boxerAId: conn.boxerAId,
    boxerBId: conn.boxerBId,
    createdAt: conn.createdAt,
    boxer: conn.boxerAId === boxerId ? conn.boxerB : conn.boxerA,
  }));

  return {
    connections: normalised,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Public version of getConnectionsForBoxer — callable without auth.
 */
export async function getPublicConnectionsForBoxer(
  boxerId: string,
  params: PaginationParams = {},
) {
  return getConnectionsForBoxer(boxerId, params);
}

/**
 * Get the connection status between two boxers.
 * Returns a discriminated union: none | pending_sent | pending_received | connected
 */
export async function getConnectionStatus(
  myBoxerId: string,
  otherBoxerId: string,
): Promise<ConnectionStatusResult> {
  const [idA, idB] = normaliseIds(myBoxerId, otherBoxerId);

  const [connection, outgoing, incoming] = await Promise.all([
    prisma.connection.findUnique({
      where: { boxerAId_boxerBId: { boxerAId: idA, boxerBId: idB } },
    }),
    prisma.connectionRequest.findFirst({
      where: {
        requesterBoxerId: myBoxerId,
        targetBoxerId: otherBoxerId,
        status: ConnectionRequestStatus.PENDING,
      },
    }),
    prisma.connectionRequest.findFirst({
      where: {
        requesterBoxerId: otherBoxerId,
        targetBoxerId: myBoxerId,
        status: ConnectionRequestStatus.PENDING,
      },
    }),
  ]);

  if (connection) {
    return { status: 'connected', requestId: null, connectionId: connection.id };
  }
  if (outgoing) {
    return { status: 'pending_sent', requestId: outgoing.id, connectionId: null };
  }
  if (incoming) {
    return { status: 'pending_received', requestId: incoming.id, connectionId: null };
  }
  return { status: 'none', requestId: null, connectionId: null };
}

/**
 * Remove an accepted connection (disconnect)
 */
export async function disconnectBoxers(connectionId: string, boxerId: string) {
  const connection = await prisma.connection.findUnique({ where: { id: connectionId } });

  if (!connection) {
    throw new NotFoundError('Connection not found');
  }
  if (connection.boxerAId !== boxerId && connection.boxerBId !== boxerId) {
    throw new ForbiddenError('Not authorised to remove this connection');
  }

  await prisma.connection.delete({ where: { id: connectionId } });
}
