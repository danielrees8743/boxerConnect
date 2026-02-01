// Availability Routes
// Defines all availability-related API endpoints

import { Router, RequestHandler } from 'express';
import {
  createAvailability,
  getAvailability,
  updateAvailability,
  deleteAvailability,
  getMyAvailability,
} from '../controllers/availability.controller';
import {
  authenticate,
  standardLimiter,
  createResourceLimiter,
  requirePermission,
} from '../middleware';
import { Permission } from '../permissions';

const router = Router();

// Type helper for route handlers with authenticated requests
// This is necessary because Express's RequestHandler expects Request, but our controllers use AuthenticatedUserRequest
const handler = (fn: unknown): RequestHandler => fn as RequestHandler;

// ============================================================================
// Current User's Availability Routes
// ============================================================================

/**
 * GET /api/v1/availability/me
 * Get current user's boxer availability
 * Requires: authentication + AVAILABILITY_READ permission
 */
router.get(
  '/me',
  standardLimiter,
  authenticate,
  requirePermission(Permission.AVAILABILITY_READ),
  handler(getMyAvailability)
);

// ============================================================================
// Boxer-Specific Availability Routes
// These routes are mounted under /api/v1/boxers/:boxerId/availability
// ============================================================================

/**
 * Create a sub-router for boxer availability endpoints
 * These will be merged with the main availability router
 */
const boxerAvailabilityRouter = Router({ mergeParams: true });

/**
 * POST /api/v1/boxers/:boxerId/availability
 * Create availability slot for a boxer
 * Requires: authentication + AVAILABILITY_CREATE permission
 * Note: Resource-specific check verifies user can manage the boxer's availability
 */
boxerAvailabilityRouter.post(
  '/',
  createResourceLimiter,
  authenticate,
  requirePermission(Permission.AVAILABILITY_CREATE),
  handler(createAvailability)
);

/**
 * GET /api/v1/boxers/:boxerId/availability
 * Get availability for a boxer
 * Requires: authentication + AVAILABILITY_READ permission
 */
boxerAvailabilityRouter.get(
  '/',
  standardLimiter,
  authenticate,
  requirePermission(Permission.AVAILABILITY_READ),
  handler(getAvailability)
);

/**
 * PUT /api/v1/boxers/:boxerId/availability/:id
 * Update availability slot
 * Requires: authentication + AVAILABILITY_UPDATE permission
 * Note: Controller verifies user can manage this availability
 */
boxerAvailabilityRouter.put(
  '/:id',
  standardLimiter,
  authenticate,
  requirePermission(Permission.AVAILABILITY_UPDATE),
  handler(updateAvailability)
);

/**
 * DELETE /api/v1/boxers/:boxerId/availability/:id
 * Delete availability slot
 * Requires: authentication + AVAILABILITY_DELETE permission
 * Note: Controller verifies user can manage this availability
 */
boxerAvailabilityRouter.delete(
  '/:id',
  standardLimiter,
  authenticate,
  requirePermission(Permission.AVAILABILITY_DELETE),
  handler(deleteAvailability)
);

// Export both routers
export { boxerAvailabilityRouter };
export default router;
