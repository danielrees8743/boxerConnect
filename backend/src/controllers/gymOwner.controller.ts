// Gym Owner Controller
// Handles HTTP requests for gym owner-related endpoints

import { Response, NextFunction } from 'express';
import { createBoxerAccountForClub } from '../services/gymOwner.service';
import { createBoxerAccountSchema } from '../validators/gymOwner.validators';
import { sendCreated } from '../utils';
import { BadRequestError, ForbiddenError } from '../middleware';
import type { AuthenticatedUserRequest } from '../types';

// ============================================================================
// Controller Methods
// ============================================================================

/**
 * Create boxer account for a club
 * POST /api/v1/gym-owner/clubs/:clubId/boxers/create-account
 *
 * Authorization:
 * - Requires GYM_OWNER role
 * - Requires GYM_OWNER_CREATE_BOXER_ACCOUNT permission
 * - Gym owner must own the specified club
 */
export async function createBoxerAccount(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract clubId from route params
    const { clubId } = req.params;

    if (!clubId) {
      return next(new BadRequestError('Club ID is required'));
    }

    // Validate request body
    const validatedData = createBoxerAccountSchema.parse(req.body);

    // Create boxer account
    const result = await createBoxerAccountForClub(
      req.user.userId,
      clubId,
      validatedData
    );

    sendCreated(
      res,
      {
        user: result.user,
        boxer: result.boxer,
      },
      'Boxer account created successfully'
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Not authorized to create accounts for this club') {
        return next(new ForbiddenError(error.message));
      }
      if (error.message === 'User with this email already exists') {
        return next(new BadRequestError(error.message));
      }
      if (error.message === 'Club not found') {
        return next(new BadRequestError(error.message));
      }
    }
    next(error);
  }
}

// Export all controller methods
export default {
  createBoxerAccount,
};
