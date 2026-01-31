// Admin Controller
// Handles HTTP requests for admin-related endpoints

import { Response, NextFunction } from 'express';
import {
  getAllUsers,
  updateUserStatus as updateUserStatusService,
  verifyBoxer as verifyBoxerService,
  getSystemStats,
  getPendingVerifications as getPendingVerificationsService,
} from '../services/admin.service';
import {
  userSearchSchema,
  updateUserStatusSchema,
  verifyBoxerSchema,
  userIdSchema,
  adminBoxerIdSchema,
  paginationSchema,
} from '../validators/admin.validators';
import { sendSuccess, sendPaginated } from '../utils';
import { BadRequestError, NotFoundError } from '../middleware';
import type { AuthenticatedUserRequest } from '../types';

// ============================================================================
// Controller Methods
// ============================================================================

/**
 * Get all users with optional filtering and pagination
 * GET /api/v1/admin/users
 */
export async function getUsers(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate query params
    const queryResult = userSearchSchema.safeParse(req.query);
    if (!queryResult.success) {
      const errorMessage = queryResult.error.errors[0]?.message || 'Invalid query parameters';
      return next(new BadRequestError(errorMessage));
    }

    const result = await getAllUsers({
      role: queryResult.data.role,
      isActive: queryResult.data.isActive,
      page: queryResult.data.page,
      limit: queryResult.data.limit,
    });

    sendPaginated(
      res,
      result.users,
      {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
      'Users retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Update user active status
 * PUT /api/v1/admin/users/:id/status
 */
export async function updateUserStatus(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate params
    const paramsResult = userIdSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return next(new BadRequestError('Invalid user ID'));
    }

    // Validate body
    const bodyResult = updateUserStatusSchema.safeParse(req.body);
    if (!bodyResult.success) {
      const errorMessage = bodyResult.error.errors[0]?.message || 'Invalid request body';
      return next(new BadRequestError(errorMessage));
    }

    const { id } = paramsResult.data;
    const { isActive } = bodyResult.data;

    const user = await updateUserStatusService(id, isActive);

    sendSuccess(
      res,
      { user },
      isActive ? 'User activated successfully' : 'User deactivated successfully'
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Cannot deactivate the last active admin') {
        return next(new BadRequestError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Verify or unverify a boxer
 * PUT /api/v1/admin/boxers/:id/verify
 */
export async function verifyBoxer(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate params
    const paramsResult = adminBoxerIdSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return next(new BadRequestError('Invalid boxer ID'));
    }

    // Validate body
    const bodyResult = verifyBoxerSchema.safeParse(req.body);
    if (!bodyResult.success) {
      const errorMessage = bodyResult.error.errors[0]?.message || 'Invalid request body';
      return next(new BadRequestError(errorMessage));
    }

    const { id } = paramsResult.data;
    const { isVerified } = bodyResult.data;

    const boxer = await verifyBoxerService(id, isVerified);

    sendSuccess(
      res,
      { boxer },
      isVerified ? 'Boxer verified successfully' : 'Boxer verification removed'
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Boxer not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Cannot verify inactive user') {
        return next(new BadRequestError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Get system-wide statistics
 * GET /api/v1/admin/stats
 */
export async function getStats(
  _req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await getSystemStats();

    sendSuccess(res, { stats }, 'System statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Get boxers pending verification
 * GET /api/v1/admin/boxers/pending-verification
 */
export async function getPendingVerifications(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate query params
    const queryResult = paginationSchema.safeParse(req.query);
    if (!queryResult.success) {
      const errorMessage = queryResult.error.errors[0]?.message || 'Invalid query parameters';
      return next(new BadRequestError(errorMessage));
    }

    const { page, limit } = queryResult.data;
    const result = await getPendingVerificationsService(page, limit);

    sendPaginated(
      res,
      result.boxers,
      {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
      'Pending verifications retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

// Export all controller methods
export default {
  getUsers,
  updateUserStatus,
  verifyBoxer,
  getStats,
  getPendingVerifications,
};
