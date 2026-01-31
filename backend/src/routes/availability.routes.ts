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
} from '../middleware';

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
 * Requires authentication
 */
router.get('/me', standardLimiter, authenticate, handler(getMyAvailability));

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
 * Requires authentication (owner only)
 */
boxerAvailabilityRouter.post('/', createResourceLimiter, authenticate, handler(createAvailability));

/**
 * GET /api/v1/boxers/:boxerId/availability
 * Get availability for a boxer
 * Requires authentication
 */
boxerAvailabilityRouter.get('/', standardLimiter, authenticate, handler(getAvailability));

/**
 * PUT /api/v1/boxers/:boxerId/availability/:id
 * Update availability slot
 * Requires authentication (owner only)
 */
boxerAvailabilityRouter.put('/:id', standardLimiter, authenticate, handler(updateAvailability));

/**
 * DELETE /api/v1/boxers/:boxerId/availability/:id
 * Delete availability slot
 * Requires authentication (owner only)
 */
boxerAvailabilityRouter.delete('/:id', standardLimiter, authenticate, handler(deleteAvailability));

// Export both routers
export { boxerAvailabilityRouter };
export default router;
