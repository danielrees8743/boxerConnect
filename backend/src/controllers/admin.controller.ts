// Admin Controller
// Handles HTTP requests for admin-related endpoints

import { Response, NextFunction } from 'express';
import {
  getAllUsers,
  updateUserStatus as updateUserStatusService,
  verifyBoxer as verifyBoxerService,
  getSystemStats,
  getPendingVerifications as getPendingVerificationsService,
  searchUsers as searchUsersService,
  getUserById as getUserByIdService,
  createUser as createUserService,
  updateUser as updateUserService,
  deleteUser as deleteUserService,
  getAllBoxers,
  getBoxerById as getBoxerByIdService,
  createBoxerAsAdmin,
  updateBoxerAsAdmin,
  deleteBoxerAsAdmin,
  getAllClubs,
  getClubById as getClubByIdService,
  createClub as createClubService,
  updateClub as updateClubService,
  deleteClub as deleteClubService,
} from '../services/admin.service';
import {
  userSearchSchema,
  updateUserStatusSchema,
  verifyBoxerSchema,
  userIdSchema,
  adminBoxerIdSchema,
  paginationSchema,
  createUserSchema,
  updateUserSchema,
  createBoxerAdminSchema,
  updateBoxerAdminSchema,
  createClubSchema,
  updateClubSchema,
  adminClubIdSchema,
  searchQuerySchema,
} from '../validators/admin.validators';
import { sendSuccess, sendPaginated } from '../utils';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware';
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

// ============================================================================
// User CRUD Controller Methods
// ============================================================================

/**
 * Search users by name or email
 * GET /api/v1/admin/users/search
 */
export async function searchUsers(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const queryResult = searchQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      const errorMessage = queryResult.error.errors[0]?.message || 'Invalid query parameters';
      return next(new BadRequestError(errorMessage));
    }

    const { q, page, limit } = queryResult.data;
    const result = await searchUsersService(q, page, limit);

    sendPaginated(
      res,
      result.users,
      {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
      'Users searched successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single user by ID
 * GET /api/v1/admin/users/:id
 */
export async function getUserById(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const paramsResult = userIdSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return next(new BadRequestError('Invalid user ID'));
    }

    const user = await getUserByIdService(paramsResult.data.id);
    if (!user) {
      return next(new NotFoundError('User not found'));
    }

    sendSuccess(res, { user }, 'User retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new user
 * POST /api/v1/admin/users
 */
export async function createUser(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const bodyResult = createUserSchema.safeParse(req.body);
    if (!bodyResult.success) {
      const errorMessage = bodyResult.error.errors[0]?.message || 'Invalid request body';
      return next(new BadRequestError(errorMessage));
    }

    const user = await createUserService(bodyResult.data);

    sendSuccess(res, { user }, 'User created successfully', 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Email already in use') {
        return next(new BadRequestError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Update a user
 * PUT /api/v1/admin/users/:id
 */
export async function updateUser(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const paramsResult = userIdSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return next(new BadRequestError('Invalid user ID'));
    }

    const bodyResult = updateUserSchema.safeParse(req.body);
    if (!bodyResult.success) {
      const errorMessage = bodyResult.error.errors[0]?.message || 'Invalid request body';
      return next(new BadRequestError(errorMessage));
    }

    const user = await updateUserService(paramsResult.data.id, bodyResult.data);

    sendSuccess(res, { user }, 'User updated successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Email already in use' ||
          error.message === 'Cannot change the role of the last active admin') {
        return next(new BadRequestError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Delete a user (soft delete)
 * DELETE /api/v1/admin/users/:id
 */
export async function deleteUser(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const paramsResult = userIdSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return next(new BadRequestError('Invalid user ID'));
    }

    // Prevent self-deletion
    if (req.user?.userId === paramsResult.data.id) {
      return next(new ForbiddenError('Cannot delete your own account'));
    }

    await deleteUserService(paramsResult.data.id);

    sendSuccess(res, null, 'User deleted successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Cannot delete the last active admin') {
        return next(new BadRequestError(error.message));
      }
    }
    next(error);
  }
}

// ============================================================================
// Boxer CRUD Controller Methods (Admin)
// ============================================================================

/**
 * Get all boxers with pagination
 * GET /api/v1/admin/boxers
 */
export async function getBoxers(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const queryResult = paginationSchema.safeParse(req.query);
    if (!queryResult.success) {
      const errorMessage = queryResult.error.errors[0]?.message || 'Invalid query parameters';
      return next(new BadRequestError(errorMessage));
    }

    const { page, limit } = queryResult.data;
    const isVerified = req.query.isVerified === 'true' ? true :
                       req.query.isVerified === 'false' ? false : undefined;
    const clubId = typeof req.query.clubId === 'string' ? req.query.clubId : undefined;

    const result = await getAllBoxers({ page, limit, isVerified, clubId });

    sendPaginated(
      res,
      result.boxers,
      {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
      'Boxers retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single boxer by ID
 * GET /api/v1/admin/boxers/:id
 */
export async function getBoxerById(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const paramsResult = adminBoxerIdSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return next(new BadRequestError('Invalid boxer ID'));
    }

    const boxer = await getBoxerByIdService(paramsResult.data.id);
    if (!boxer) {
      return next(new NotFoundError('Boxer not found'));
    }

    sendSuccess(res, { boxer }, 'Boxer retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Create a boxer profile for a user
 * POST /api/v1/admin/boxers
 */
export async function createBoxer(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const bodyResult = createBoxerAdminSchema.safeParse(req.body);
    if (!bodyResult.success) {
      const errorMessage = bodyResult.error.errors[0]?.message || 'Invalid request body';
      return next(new BadRequestError(errorMessage));
    }

    const boxer = await createBoxerAsAdmin(bodyResult.data);

    sendSuccess(res, { boxer }, 'Boxer created successfully', 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found' || error.message === 'Club not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'User already has a boxer profile') {
        return next(new BadRequestError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Update a boxer profile
 * PUT /api/v1/admin/boxers/:id
 */
export async function updateBoxer(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const paramsResult = adminBoxerIdSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return next(new BadRequestError('Invalid boxer ID'));
    }

    const bodyResult = updateBoxerAdminSchema.safeParse(req.body);
    if (!bodyResult.success) {
      const errorMessage = bodyResult.error.errors[0]?.message || 'Invalid request body';
      return next(new BadRequestError(errorMessage));
    }

    const boxer = await updateBoxerAsAdmin(paramsResult.data.id, bodyResult.data);

    sendSuccess(res, { boxer }, 'Boxer updated successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Boxer not found' || error.message === 'Club not found') {
        return next(new NotFoundError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Delete a boxer profile
 * DELETE /api/v1/admin/boxers/:id
 */
export async function deleteBoxer(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const paramsResult = adminBoxerIdSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return next(new BadRequestError('Invalid boxer ID'));
    }

    await deleteBoxerAsAdmin(paramsResult.data.id);

    sendSuccess(res, null, 'Boxer deleted successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Boxer not found') {
        return next(new NotFoundError(error.message));
      }
    }
    next(error);
  }
}

// ============================================================================
// Club CRUD Controller Methods (Admin)
// ============================================================================

/**
 * Get all clubs with pagination
 * GET /api/v1/admin/clubs
 */
export async function getClubs(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const queryResult = paginationSchema.safeParse(req.query);
    if (!queryResult.success) {
      const errorMessage = queryResult.error.errors[0]?.message || 'Invalid query parameters';
      return next(new BadRequestError(errorMessage));
    }

    const { page, limit } = queryResult.data;
    const isVerified = req.query.isVerified === 'true' ? true :
                       req.query.isVerified === 'false' ? false : undefined;
    const region = typeof req.query.region === 'string' ? req.query.region : undefined;

    const result = await getAllClubs({ page, limit, isVerified, region });

    sendPaginated(
      res,
      result.clubs,
      {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
      'Clubs retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single club by ID
 * GET /api/v1/admin/clubs/:id
 */
export async function getClubById(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const paramsResult = adminClubIdSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return next(new BadRequestError('Invalid club ID'));
    }

    const club = await getClubByIdService(paramsResult.data.id);
    if (!club) {
      return next(new NotFoundError('Club not found'));
    }

    sendSuccess(res, { club }, 'Club retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new club
 * POST /api/v1/admin/clubs
 */
export async function createClub(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const bodyResult = createClubSchema.safeParse(req.body);
    if (!bodyResult.success) {
      const errorMessage = bodyResult.error.errors[0]?.message || 'Invalid request body';
      return next(new BadRequestError(errorMessage));
    }

    const club = await createClubService(bodyResult.data);

    sendSuccess(res, { club }, 'Club created successfully', 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Owner user not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Owner must be a gym owner or admin') {
        return next(new BadRequestError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Update a club
 * PUT /api/v1/admin/clubs/:id
 */
export async function updateClub(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const paramsResult = adminClubIdSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return next(new BadRequestError('Invalid club ID'));
    }

    const bodyResult = updateClubSchema.safeParse(req.body);
    if (!bodyResult.success) {
      const errorMessage = bodyResult.error.errors[0]?.message || 'Invalid request body';
      return next(new BadRequestError(errorMessage));
    }

    const club = await updateClubService(paramsResult.data.id, bodyResult.data);

    sendSuccess(res, { club }, 'Club updated successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Club not found' || error.message === 'Owner user not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Owner must be a gym owner or admin') {
        return next(new BadRequestError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Delete a club
 * DELETE /api/v1/admin/clubs/:id
 */
export async function deleteClub(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const paramsResult = adminClubIdSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return next(new BadRequestError('Invalid club ID'));
    }

    await deleteClubService(paramsResult.data.id);

    sendSuccess(res, null, 'Club deleted successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Club not found') {
        return next(new NotFoundError(error.message));
      }
    }
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
  searchUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getBoxers,
  getBoxerById,
  createBoxer,
  updateBoxer,
  deleteBoxer,
  getClubs,
  getClubById,
  createClub,
  updateClub,
  deleteClub,
};
