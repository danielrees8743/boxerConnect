// Club Membership Request Controller
// Handles HTTP requests for club membership request endpoints

import { Response, NextFunction } from 'express';
import {
  getPendingRequestsForGymOwner,
  approveRequest as approveRequestService,
  rejectRequest as rejectRequestService,
} from '../services/clubMembershipRequest.service';
import { rejectRequestSchema } from '../validators/clubMembershipRequest.validators';
import { sendSuccess } from '../utils';
import { BadRequestError, ForbiddenError, NotFoundError } from '../middleware';
import type { AuthenticatedUserRequest } from '../types';

// ============================================================================
// Controller Methods
// ============================================================================

/**
 * Get pending membership requests for gym owner's clubs
 * GET /api/v1/gym-owner/membership-requests
 *
 * Authorization:
 * - Requires GYM_OWNER role
 * - Requires GYM_OWNER_VIEW_MEMBERSHIP_REQUESTS permission
 */
export async function getPendingRequests(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const requests = await getPendingRequestsForGymOwner(req.user.userId);

    sendSuccess(
      res,
      { requests },
      'Pending membership requests retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Approve a membership request
 * POST /api/v1/gym-owner/membership-requests/:id/approve
 *
 * Authorization:
 * - Requires GYM_OWNER role
 * - Requires GYM_OWNER_APPROVE_MEMBERSHIP permission
 * - Gym owner must own the club associated with the request
 */
export async function approveRequest(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new BadRequestError('Request ID is required'));
    }

    // Approve the request and update boxer profile
    const updatedBoxer = await approveRequestService(id, req.user.userId);

    sendSuccess(
      res,
      { boxer: updatedBoxer },
      'Membership request approved successfully'
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Membership request not found') {
        return next(new NotFoundError(error.message));
      }
      if (
        error.message === 'Not authorized to approve requests for this club' ||
        error.message === 'Request has already been processed'
      ) {
        return next(new ForbiddenError(error.message));
      }
      if (error.message === 'User does not have a boxer profile') {
        return next(new BadRequestError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Reject a membership request
 * POST /api/v1/gym-owner/membership-requests/:id/reject
 *
 * Authorization:
 * - Requires GYM_OWNER role
 * - Requires GYM_OWNER_REJECT_MEMBERSHIP permission
 * - Gym owner must own the club associated with the request
 */
export async function rejectRequest(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new BadRequestError('Request ID is required'));
    }

    // Validate request body
    const validatedData = rejectRequestSchema.parse(req.body);

    // Reject the request
    const rejectedRequest = await rejectRequestService(
      id,
      req.user.userId,
      validatedData.notes
    );

    sendSuccess(
      res,
      { request: rejectedRequest },
      'Membership request rejected successfully'
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Membership request not found') {
        return next(new NotFoundError(error.message));
      }
      if (
        error.message === 'Not authorized to reject requests for this club' ||
        error.message === 'Request has already been processed'
      ) {
        return next(new ForbiddenError(error.message));
      }
    }
    next(error);
  }
}

// Export all controller methods
export default {
  getPendingRequests,
  approveRequest,
  rejectRequest,
};
