// Match Request Controller
// Handles HTTP requests for match request endpoints

import { Response, NextFunction } from 'express';
import {
  createMatchRequest as createMatchRequestService,
  getMatchRequestById as getMatchRequestByIdService,
  getMatchRequestsForBoxer,
  acceptMatchRequest as acceptMatchRequestService,
  declineMatchRequest as declineMatchRequestService,
  cancelMatchRequest as cancelMatchRequestService,
  getRequestStats as getRequestStatsService,
} from '../services/matchRequest.service';
import { getBoxerByUserId } from '../services/boxer.service';
import {
  createMatchRequestSchema,
  matchRequestSearchSchema,
  matchRequestIdSchema,
  matchRequestResponseSchema,
} from '../validators/matchRequest.validators';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../utils';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware';
import type { AuthenticatedUserRequest } from '../types';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the boxer profile for the authenticated user
 */
async function getAuthenticatedBoxer(userId: string) {
  const boxer = await getBoxerByUserId(userId);
  if (!boxer) {
    throw new NotFoundError('Boxer profile not found. Please create a boxer profile first.');
  }
  return boxer;
}

// ============================================================================
// Controller Methods
// ============================================================================

/**
 * Create a new match request
 * POST /api/v1/match-requests
 */
export async function createMatchRequest(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Get user's boxer profile
    const boxer = await getAuthenticatedBoxer(req.user.userId);

    // Validate request body
    const validatedData = createMatchRequestSchema.parse(req.body);

    // Create match request
    const matchRequest = await createMatchRequestService(
      boxer.id,
      validatedData.targetBoxerId,
      {
        message: validatedData.message,
        proposedDate: validatedData.proposedDate,
        proposedVenue: validatedData.proposedVenue,
      },
    );

    sendCreated(res, { matchRequest }, 'Match request sent successfully');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return next(error);
    }
    if (error instanceof Error) {
      if (
        error.message === 'Cannot send match request to yourself' ||
        error.message.includes('already have a pending match request') ||
        error.message.includes('already sent you a match request') ||
        error.message.includes('not compatible') ||
        error.message.includes('exceeds maximum')
      ) {
        return next(new BadRequestError(error.message));
      }
      if (error.message === 'Target boxer not found') {
        return next(new NotFoundError('Target boxer not found'));
      }
      if (error.message === 'Target boxer is not available for matching') {
        return next(new BadRequestError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Get match requests for the current user
 * GET /api/v1/match-requests
 */
export async function getMyMatchRequests(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Get user's boxer profile
    const boxer = await getAuthenticatedBoxer(req.user.userId);

    // Validate query params
    const validatedParams = matchRequestSearchSchema.parse(req.query);

    // Get match requests
    const result = await getMatchRequestsForBoxer(
      boxer.id,
      validatedParams.type,
      {
        status: validatedParams.status,
        page: validatedParams.page,
        limit: validatedParams.limit,
      },
    );

    sendPaginated(
      res,
      result.matchRequests,
      {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
      `${validatedParams.type.charAt(0).toUpperCase() + validatedParams.type.slice(1)} match requests retrieved successfully`,
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      return next(error);
    }
    next(error);
  }
}

/**
 * Get a specific match request by ID
 * GET /api/v1/match-requests/:id
 */
export async function getMatchRequest(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Get user's boxer profile
    const boxer = await getAuthenticatedBoxer(req.user.userId);

    // Validate params
    const { id } = matchRequestIdSchema.parse(req.params);

    // Get match request
    const matchRequest = await getMatchRequestByIdService(id);

    if (!matchRequest) {
      return next(new NotFoundError('Match request not found'));
    }

    // Check if user is either the requester or target
    if (
      matchRequest.requesterBoxerId !== boxer.id &&
      matchRequest.targetBoxerId !== boxer.id
    ) {
      return next(new ForbiddenError('Not authorized to view this match request'));
    }

    sendSuccess(res, { matchRequest }, 'Match request retrieved successfully');
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ForbiddenError) {
      return next(error);
    }
    next(error);
  }
}

/**
 * Accept a match request
 * PUT /api/v1/match-requests/:id/accept
 */
export async function acceptMatchRequest(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Get user's boxer profile
    const boxer = await getAuthenticatedBoxer(req.user.userId);

    // Validate params and body
    const { id } = matchRequestIdSchema.parse(req.params);
    const { responseMessage } = matchRequestResponseSchema.parse(req.body);

    // Accept match request
    const matchRequest = await acceptMatchRequestService(id, boxer.id, responseMessage);

    sendSuccess(res, { matchRequest }, 'Match request accepted successfully');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return next(error);
    }
    if (error instanceof Error) {
      if (error.message === 'Match request not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Not authorized to accept this match request') {
        return next(new ForbiddenError(error.message));
      }
      if (
        error.message.includes('Cannot accept') ||
        error.message.includes('expired')
      ) {
        return next(new BadRequestError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Decline a match request
 * PUT /api/v1/match-requests/:id/decline
 */
export async function declineMatchRequest(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Get user's boxer profile
    const boxer = await getAuthenticatedBoxer(req.user.userId);

    // Validate params and body
    const { id } = matchRequestIdSchema.parse(req.params);
    const { responseMessage } = matchRequestResponseSchema.parse(req.body);

    // Decline match request
    const matchRequest = await declineMatchRequestService(id, boxer.id, responseMessage);

    sendSuccess(res, { matchRequest }, 'Match request declined successfully');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return next(error);
    }
    if (error instanceof Error) {
      if (error.message === 'Match request not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Not authorized to decline this match request') {
        return next(new ForbiddenError(error.message));
      }
      if (error.message.includes('Cannot decline')) {
        return next(new BadRequestError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Cancel a match request
 * DELETE /api/v1/match-requests/:id
 */
export async function cancelMatchRequest(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Get user's boxer profile
    const boxer = await getAuthenticatedBoxer(req.user.userId);

    // Validate params
    const { id } = matchRequestIdSchema.parse(req.params);

    // Cancel match request
    await cancelMatchRequestService(id, boxer.id);

    sendNoContent(res);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return next(error);
    }
    if (error instanceof Error) {
      if (error.message === 'Match request not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Not authorized to cancel this match request') {
        return next(new ForbiddenError(error.message));
      }
      if (error.message.includes('Cannot cancel')) {
        return next(new BadRequestError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Get match request statistics for current user
 * GET /api/v1/match-requests/stats
 */
export async function getMatchRequestStats(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Get user's boxer profile
    const boxer = await getAuthenticatedBoxer(req.user.userId);

    // Get stats
    const stats = await getRequestStatsService(boxer.id);

    sendSuccess(res, { stats }, 'Match request statistics retrieved successfully');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return next(error);
    }
    next(error);
  }
}

// Export all controller methods
export default {
  createMatchRequest,
  getMyMatchRequests,
  getMatchRequest,
  acceptMatchRequest,
  declineMatchRequest,
  cancelMatchRequest,
  getMatchRequestStats,
};
