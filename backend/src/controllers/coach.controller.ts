// Coach Controller
// Handles HTTP requests for coach-related endpoints

import { Response, NextFunction } from 'express';
import {
  linkBoxer as linkBoxerService,
  unlinkBoxer as unlinkBoxerService,
  updatePermissions as updatePermissionsService,
  getCoachBoxers,
} from '../services/coach.service';
import {
  linkBoxerSchema,
  updatePermissionsSchema,
  coachBoxerIdSchema,
} from '../validators/coach.validators';
import { sendSuccess, sendCreated, sendNoContent } from '../utils';
import { BadRequestError, NotFoundError } from '../middleware';
import type { AuthenticatedUserRequest } from '../types';

// ============================================================================
// Controller Methods
// ============================================================================

/**
 * Get all boxers linked to the authenticated coach
 * GET /api/v1/coach/boxers
 */
export async function getMyBoxers(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const coachUserId = req.user.userId;

    const boxers = await getCoachBoxers(coachUserId);

    sendSuccess(res, { boxers }, 'Coach boxers retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Link a boxer to the authenticated coach
 * POST /api/v1/coach/boxers/:boxerId/link
 */
export async function linkBoxer(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate params
    const paramsResult = coachBoxerIdSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return next(new BadRequestError('Invalid boxer ID'));
    }

    // Validate body (permissions are optional)
    const bodyResult = linkBoxerSchema.safeParse({
      boxerId: paramsResult.data.boxerId,
      permissions: req.body.permissions,
    });

    if (!bodyResult.success) {
      const errorMessage = bodyResult.error.errors[0]?.message || 'Invalid request body';
      return next(new BadRequestError(errorMessage));
    }

    const coachUserId = req.user.userId;
    const { boxerId, permissions } = bodyResult.data;

    const relation = await linkBoxerService(coachUserId, boxerId, permissions);

    sendCreated(res, { relation }, 'Boxer linked to coach successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Boxer not found') {
        return next(new NotFoundError(error.message));
      }
      if (
        error.message === 'Cannot link to inactive boxer' ||
        error.message === 'Coach-boxer relationship already exists' ||
        error.message === 'User is not a coach'
      ) {
        return next(new BadRequestError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Unlink a boxer from the authenticated coach
 * DELETE /api/v1/coach/boxers/:boxerId/unlink
 */
export async function unlinkBoxer(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate params
    const paramsResult = coachBoxerIdSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return next(new BadRequestError('Invalid boxer ID'));
    }

    const coachUserId = req.user.userId;
    const { boxerId } = paramsResult.data;

    await unlinkBoxerService(coachUserId, boxerId);

    sendNoContent(res);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Coach-boxer relationship not found') {
        return next(new NotFoundError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Update permissions for a boxer linked to the authenticated coach
 * PUT /api/v1/coach/boxers/:boxerId/permissions
 */
export async function updateBoxerPermissions(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate params
    const paramsResult = coachBoxerIdSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return next(new BadRequestError('Invalid boxer ID'));
    }

    // Validate body
    const bodyResult = updatePermissionsSchema.safeParse(req.body);
    if (!bodyResult.success) {
      const errorMessage = bodyResult.error.errors[0]?.message || 'Invalid request body';
      return next(new BadRequestError(errorMessage));
    }

    const coachUserId = req.user.userId;
    const { boxerId } = paramsResult.data;
    const { permissions } = bodyResult.data;

    const relation = await updatePermissionsService(coachUserId, boxerId, permissions);

    sendSuccess(res, { relation }, 'Permissions updated successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Coach-boxer relationship not found') {
        return next(new NotFoundError(error.message));
      }
    }
    next(error);
  }
}

// Export all controller methods
export default {
  getMyBoxers,
  linkBoxer,
  unlinkBoxer,
  updateBoxerPermissions,
};
