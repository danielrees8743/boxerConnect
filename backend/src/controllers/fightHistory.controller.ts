// Fight History Controller
// Handles HTTP requests for fight history CRUD operations

import { Response, NextFunction } from 'express';
import {
  createFight as createFightService,
  getMyFights as getMyFightsService,
  updateFight as updateFightService,
  deleteFight as deleteFightService,
  getBoxerFights as getBoxerFightsService,
} from '../services/fightHistory.service';
import {
  createFightHistorySchema,
  updateFightHistorySchema,
  fightHistoryIdSchema,
} from '../validators/fightHistory.validators';
import { sendSuccess, sendCreated } from '../utils';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware';
import type { AuthenticatedUserRequest } from '../types';

// ============================================================================
// Controller Methods
// ============================================================================

/**
 * Create a new fight history entry
 * POST /api/v1/boxers/me/fights
 */
export async function createFight(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validationResult = createFightHistorySchema.safeParse(req.body);
    if (!validationResult.success) {
      return next(
        new BadRequestError(
          validationResult.error.errors[0]?.message || 'Invalid request data'
        )
      );
    }

    const result = await createFightService(req.user.userId, validationResult.data);

    sendCreated(
      res,
      { fight: result },
      'Fight history created successfully'
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Boxer profile not found') {
        return next(new NotFoundError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Get all fights for the authenticated boxer
 * GET /api/v1/boxers/me/fights
 */
export async function getMyFights(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await getMyFightsService(req.user.userId);

    sendSuccess(res, result, 'Fight history retrieved successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Boxer profile not found') {
        return next(new NotFoundError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Update a fight history entry
 * PUT /api/v1/boxers/me/fights/:id
 */
export async function updateFight(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const paramsValidation = fightHistoryIdSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      return next(
        new BadRequestError(
          paramsValidation.error.errors[0]?.message || 'Invalid fight ID'
        )
      );
    }

    const bodyValidation = updateFightHistorySchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return next(
        new BadRequestError(
          bodyValidation.error.errors[0]?.message || 'Invalid request data'
        )
      );
    }

    const result = await updateFightService(
      req.user.userId,
      paramsValidation.data.id,
      bodyValidation.data
    );

    sendSuccess(res, { fight: result }, 'Fight history updated successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Boxer profile not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Fight not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Not authorized to update this fight') {
        return next(new ForbiddenError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Delete a fight history entry
 * DELETE /api/v1/boxers/me/fights/:id
 */
export async function deleteFight(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const paramsValidation = fightHistoryIdSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      return next(
        new BadRequestError(
          paramsValidation.error.errors[0]?.message || 'Invalid fight ID'
        )
      );
    }

    await deleteFightService(req.user.userId, paramsValidation.data.id);

    sendSuccess(res, null, 'Fight history deleted successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Boxer profile not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Fight not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Not authorized to delete this fight') {
        return next(new ForbiddenError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Get fights for a boxer by ID (public)
 * GET /api/v1/boxers/:id/fights
 */
export async function getBoxerFights(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new BadRequestError('Boxer ID is required'));
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return next(new BadRequestError('Invalid boxer ID format'));
    }

    const result = await getBoxerFightsService(id);

    sendSuccess(res, result, 'Fight history retrieved successfully');
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
// Export
// ============================================================================

export default {
  createFight,
  getMyFights,
  updateFight,
  deleteFight,
  getBoxerFights,
};
