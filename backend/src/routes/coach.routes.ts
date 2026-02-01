// Coach Routes
// Defines all coach-related API endpoints

import { Router, RequestHandler } from 'express';
import {
  getMyBoxers,
  linkBoxer,
  unlinkBoxer,
  updateBoxerPermissions,
} from '../controllers/coach.controller';
import {
  authenticate,
  standardLimiter,
  createResourceLimiter,
  requirePermission,
} from '../middleware';
import { Permission } from '../permissions';

const router = Router();

// Type helper for route handlers with authenticated requests
const handler = (fn: unknown): RequestHandler => fn as RequestHandler;

// ============================================================================
// All Coach Routes Require Authentication
// Individual routes specify required permissions
// ============================================================================

// Apply authentication to all routes
router.use(authenticate);

// ============================================================================
// Coach Boxer Management Routes
// ============================================================================

/**
 * GET /api/v1/coach/boxers
 * Get all boxers linked to the authenticated coach
 * Requires: BOXER_READ_ANY_PROFILE permission (coaches have this)
 */
router.get(
  '/boxers',
  standardLimiter,
  requirePermission(Permission.BOXER_READ_ANY_PROFILE),
  handler(getMyBoxers)
);

/**
 * POST /api/v1/coach/boxers/:boxerId/link
 * Link a boxer to the authenticated coach
 * Requires: COACH_LINK_BOXER permission
 */
router.post(
  '/boxers/:boxerId/link',
  createResourceLimiter,
  requirePermission(Permission.COACH_LINK_BOXER),
  handler(linkBoxer)
);

/**
 * DELETE /api/v1/coach/boxers/:boxerId/unlink
 * Unlink a boxer from the authenticated coach
 * Requires: COACH_UNLINK_BOXER permission
 */
router.delete(
  '/boxers/:boxerId/unlink',
  standardLimiter,
  requirePermission(Permission.COACH_UNLINK_BOXER),
  handler(unlinkBoxer)
);

/**
 * PUT /api/v1/coach/boxers/:boxerId/permissions
 * Update permissions for a boxer linked to the authenticated coach
 * Requires: COACH_UPDATE_BOXER_PERMISSIONS permission
 */
router.put(
  '/boxers/:boxerId/permissions',
  standardLimiter,
  requirePermission(Permission.COACH_UPDATE_BOXER_PERMISSIONS),
  handler(updateBoxerPermissions)
);

export default router;
