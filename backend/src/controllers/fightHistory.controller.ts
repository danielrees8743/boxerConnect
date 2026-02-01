// Fight History Controller
// Handles HTTP requests for fight history CRUD operations

import { Response, NextFunction } from 'express';
import {
  createFight as createFightService,
  getMyFights as getMyFightsService,
  updateFight as updateFightService,
  deleteFight as deleteFightService,
  getBoxerFights as getBoxerFightsService,
  createFightForBoxer as createFightForBoxerService,
  updateFightForBoxer as updateFightForBoxerService,
  deleteFightForBoxer as deleteFightForBoxerService,
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
// Coach/Gym Owner Methods - For managing linked boxer's fights
// ============================================================================

/**
 * Create a fight history entry for a specific boxer
 * POST /api/v1/boxers/:boxerId/fights
 * Requires FIGHT_MANAGE_LINKED permission (coach/gym owner only)
 */
export async function createFightForBoxer(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { boxerId } = req.params;

    if (!boxerId) {
      return next(new BadRequestError('Boxer ID is required'));
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(boxerId)) {
      return next(new BadRequestError('Invalid boxer ID format'));
    }

    const validationResult = createFightHistorySchema.safeParse(req.body);
    if (!validationResult.success) {
      return next(
        new BadRequestError(
          validationResult.error.errors[0]?.message || 'Invalid request data'
        )
      );
    }

    const result = await createFightForBoxerService(boxerId, validationResult.data);

    sendCreated(
      res,
      { fight: result },
      'Fight history created successfully'
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
 * Update a fight history entry for a specific boxer
 * PUT /api/v1/boxers/:boxerId/fights/:fightId
 * Requires FIGHT_MANAGE_LINKED permission (coach/gym owner only)
 */
export async function updateFightForBoxer(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { boxerId, fightId } = req.params;

    if (!boxerId) {
      return next(new BadRequestError('Boxer ID is required'));
    }

    if (!fightId) {
      return next(new BadRequestError('Fight ID is required'));
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(boxerId)) {
      return next(new BadRequestError('Invalid boxer ID format'));
    }
    if (!uuidRegex.test(fightId)) {
      return next(new BadRequestError('Invalid fight ID format'));
    }

    const bodyValidation = updateFightHistorySchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return next(
        new BadRequestError(
          bodyValidation.error.errors[0]?.message || 'Invalid request data'
        )
      );
    }

    const result = await updateFightForBoxerService(boxerId, fightId, bodyValidation.data);

    sendSuccess(res, { fight: result }, 'Fight history updated successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Boxer not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Fight not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Fight does not belong to this boxer') {
        return next(new ForbiddenError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Delete a fight history entry for a specific boxer
 * DELETE /api/v1/boxers/:boxerId/fights/:fightId
 * Requires FIGHT_MANAGE_LINKED permission (coach/gym owner only)
 */
export async function deleteFightForBoxer(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { boxerId, fightId } = req.params;

    if (!boxerId) {
      return next(new BadRequestError('Boxer ID is required'));
    }

    if (!fightId) {
      return next(new BadRequestError('Fight ID is required'));
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(boxerId)) {
      return next(new BadRequestError('Invalid boxer ID format'));
    }
    if (!uuidRegex.test(fightId)) {
      return next(new BadRequestError('Invalid fight ID format'));
    }

    await deleteFightForBoxerService(boxerId, fightId);

    sendSuccess(res, null, 'Fight history deleted successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Boxer not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Fight not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Fight does not belong to this boxer') {
        return next(new ForbiddenError(error.message));
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
  createFightForBoxer,
  updateFightForBoxer,
  deleteFightForBoxer,
};
