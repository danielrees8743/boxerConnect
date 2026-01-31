// Boxer Controller
// Handles HTTP requests for boxer profile endpoints

import { Response, NextFunction } from 'express';
import {
  createBoxer as createBoxerService,
  getBoxerById as getBoxerByIdService,
  getBoxerByUserId as getBoxerByUserIdService,
  updateBoxer as updateBoxerService,
  searchBoxers as searchBoxersService,
  deleteBoxer as deleteBoxerService,
} from '../services/boxer.service';
import {
  findCompatibleBoxers,
  getSuggestedMatches,
  invalidateMatchCache,
} from '../services/matching.service';
import {
  createBoxerSchema,
  updateBoxerSchema,
  boxerSearchSchema,
  boxerIdSchema,
} from '../validators/boxer.validators';
import { sendSuccess, sendCreated, sendPaginated } from '../utils';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware';
import type { AuthenticatedRequest, AuthenticatedUserRequest } from '../types';

// ============================================================================
// Controller Methods
// ============================================================================

/**
 * Create boxer profile
 * POST /api/v1/boxers
 */
export async function createBoxer(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validatedData = createBoxerSchema.parse(req.body);

    // Create or update boxer profile
    const boxer = await createBoxerService(req.user.userId, validatedData);

    sendCreated(res, { boxer }, 'Boxer profile created successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User already has a boxer profile') {
        return next(new BadRequestError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Get current user's boxer profile
 * GET /api/v1/boxers/me
 */
export async function getMyBoxer(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const boxer = await getBoxerByUserIdService(req.user.userId);

    if (!boxer) {
      return next(new NotFoundError('Boxer profile not found'));
    }

    sendSuccess(res, { boxer }, 'Boxer profile retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Get boxer by ID
 * GET /api/v1/boxers/:id
 */
export async function getBoxer(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate params
    const { id } = boxerIdSchema.parse(req.params);

    const boxer = await getBoxerByIdService(id);

    if (!boxer) {
      return next(new NotFoundError('Boxer not found'));
    }

    // Check if boxer is searchable (unless requester is the owner)
    if (!boxer.isSearchable && req.user?.userId !== boxer.userId) {
      return next(new NotFoundError('Boxer not found'));
    }

    sendSuccess(res, { boxer }, 'Boxer retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Update boxer profile
 * PUT /api/v1/boxers/:id
 */
export async function updateBoxer(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate params and body
    const { id } = boxerIdSchema.parse(req.params);
    const validatedData = updateBoxerSchema.parse(req.body);

    // Update boxer (service verifies ownership)
    const boxer = await updateBoxerService(id, req.user.userId, validatedData);

    // Invalidate match cache since profile changed
    await invalidateMatchCache(id);

    sendSuccess(res, { boxer }, 'Boxer profile updated successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Boxer profile not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Not authorized to update this profile') {
        return next(new ForbiddenError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Search boxers with filters
 * GET /api/v1/boxers
 */
export async function searchBoxers(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate query params
    const validatedParams = boxerSearchSchema.parse(req.query);

    // Search boxers
    const result = await searchBoxersService(validatedParams);

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
 * Delete (deactivate) boxer profile
 * DELETE /api/v1/boxers/:id
 */
export async function deleteBoxerProfile(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate params
    const { id } = boxerIdSchema.parse(req.params);

    // Delete boxer (service verifies ownership)
    await deleteBoxerService(id, req.user.userId);

    // Invalidate match cache
    await invalidateMatchCache(id);

    sendSuccess(res, null, 'Boxer profile deactivated successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Boxer profile not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Not authorized to delete this profile') {
        return next(new ForbiddenError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Get compatible matches for a boxer
 * GET /api/v1/boxers/:id/matches
 */
export async function getCompatibleMatches(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate params
    const { id } = boxerIdSchema.parse(req.params);

    // Verify the boxer exists and user has access
    const boxer = await getBoxerByIdService(id);
    if (!boxer) {
      return next(new NotFoundError('Boxer not found'));
    }

    // Only the boxer owner can view their matches
    if (boxer.userId !== req.user.userId) {
      return next(new ForbiddenError('Not authorized to view matches for this boxer'));
    }

    // Parse optional query params
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const city = (req.query.city as string) || null;
    const country = (req.query.country as string) || null;

    // Find compatible boxers
    const result = await findCompatibleBoxers(id, {
      limit,
      cityFilter: city,
      countryFilter: country,
    });

    sendSuccess(
      res,
      {
        matches: result.matches,
        total: result.total,
      },
      'Compatible matches retrieved successfully'
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Boxer not found') {
        return next(new NotFoundError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Get suggested matches for current user's boxer profile
 * GET /api/v1/boxers/me/suggestions
 */
export async function getMySuggestedMatches(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get user's boxer profile
    const boxer = await getBoxerByUserIdService(req.user.userId);

    if (!boxer) {
      return next(new NotFoundError('Boxer profile not found'));
    }

    // Parse optional limit
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    // Get suggested matches
    const suggestions = await getSuggestedMatches(boxer.id, limit);

    sendSuccess(
      res,
      {
        suggestions,
        total: suggestions.length,
      },
      'Suggested matches retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

// Export all controller methods
export default {
  createBoxer,
  getMyBoxer,
  getBoxer,
  updateBoxer,
  searchBoxers,
  deleteBoxerProfile,
  getCompatibleMatches,
  getMySuggestedMatches,
};
