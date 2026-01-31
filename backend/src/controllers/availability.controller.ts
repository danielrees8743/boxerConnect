// Availability Controller
// Handles HTTP requests for availability endpoints

import { Response, NextFunction } from 'express';
import {
  createAvailability as createAvailabilityService,
  getAvailability as getAvailabilityService,
  updateAvailability as updateAvailabilityService,
  deleteAvailability as deleteAvailabilityService,
} from '../services/availability.service';
import { getBoxerById, getBoxerByUserId } from '../services/boxer.service';
import {
  createAvailabilitySchema,
  updateAvailabilitySchema,
  availabilityQuerySchema,
  availabilityIdSchema,
  availabilityBoxerIdSchema,
} from '../validators/availability.validators';
import { sendSuccess, sendCreated, sendNoContent } from '../utils';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware';
import type { AuthenticatedUserRequest } from '../types';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Verify that the requesting user owns the boxer profile
 */
async function verifyBoxerOwnership(
  boxerId: string,
  userId: string
): Promise<void> {
  const boxer = await getBoxerById(boxerId);

  if (!boxer) {
    throw new NotFoundError('Boxer not found');
  }

  if (boxer.userId !== userId) {
    throw new ForbiddenError('Not authorized to manage availability for this boxer');
  }
}

// ============================================================================
// Controller Methods
// ============================================================================

/**
 * Create availability slot
 * POST /api/v1/boxers/:boxerId/availability
 */
export async function createAvailability(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate params
    const { boxerId } = availabilityBoxerIdSchema.parse(req.params);

    // Verify ownership
    await verifyBoxerOwnership(boxerId, req.user.userId);

    // Validate request body
    const validatedData = createAvailabilitySchema.parse(req.body);

    // Create availability
    const availability = await createAvailabilityService(boxerId, validatedData);

    sendCreated(res, { availability }, 'Availability slot created successfully');
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ForbiddenError) {
      return next(error);
    }
    if (error instanceof Error) {
      if (error.message === 'Boxer not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message.includes('Overlapping availability')) {
        return next(new BadRequestError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Get availability for a boxer
 * GET /api/v1/boxers/:boxerId/availability
 */
export async function getAvailability(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate params
    const { boxerId } = availabilityBoxerIdSchema.parse(req.params);

    // Verify boxer exists (anyone authenticated can view availability)
    const boxer = await getBoxerById(boxerId);
    if (!boxer) {
      return next(new NotFoundError('Boxer not found'));
    }

    // Validate query params
    const { startDate, endDate } = availabilityQuerySchema.parse(req.query);

    // Get availability
    const availability = await getAvailabilityService(boxerId, startDate, endDate);

    sendSuccess(
      res,
      { availability },
      'Availability retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Update availability slot
 * PUT /api/v1/boxers/:boxerId/availability/:id
 */
export async function updateAvailability(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate params
    const { boxerId } = availabilityBoxerIdSchema.parse(req.params);
    const { id } = availabilityIdSchema.parse(req.params);

    // Verify ownership
    await verifyBoxerOwnership(boxerId, req.user.userId);

    // Validate request body
    const validatedData = updateAvailabilitySchema.parse(req.body);

    // Update availability
    const availability = await updateAvailabilityService(id, boxerId, validatedData);

    sendSuccess(res, { availability }, 'Availability slot updated successfully');
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ForbiddenError) {
      return next(error);
    }
    if (error instanceof Error) {
      if (error.message === 'Availability slot not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Not authorized to update this availability slot') {
        return next(new ForbiddenError(error.message));
      }
      if (error.message.includes('Overlapping availability')) {
        return next(new BadRequestError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Delete availability slot
 * DELETE /api/v1/boxers/:boxerId/availability/:id
 */
export async function deleteAvailability(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate params
    const { boxerId } = availabilityBoxerIdSchema.parse(req.params);
    const { id } = availabilityIdSchema.parse(req.params);

    // Verify ownership
    await verifyBoxerOwnership(boxerId, req.user.userId);

    // Delete availability
    await deleteAvailabilityService(id, boxerId);

    sendNoContent(res);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ForbiddenError) {
      return next(error);
    }
    if (error instanceof Error) {
      if (error.message === 'Availability slot not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Not authorized to delete this availability slot') {
        return next(new ForbiddenError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Get my availability (current user's boxer)
 * GET /api/v1/boxers/me/availability
 */
export async function getMyAvailability(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get user's boxer profile
    const boxer = await getBoxerByUserId(req.user.userId);

    if (!boxer) {
      return next(new NotFoundError('Boxer profile not found'));
    }

    // Validate query params
    const { startDate, endDate } = availabilityQuerySchema.parse(req.query);

    // Get availability
    const availability = await getAvailabilityService(boxer.id, startDate, endDate);

    sendSuccess(
      res,
      { availability },
      'Availability retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

// Export all controller methods
export default {
  createAvailability,
  getAvailability,
  updateAvailability,
  deleteAvailability,
  getMyAvailability,
};
