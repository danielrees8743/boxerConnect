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
  requireCoach,
  standardLimiter,
  createResourceLimiter,
} from '../middleware';

const router = Router();

// Type helper for route handlers with authenticated requests
const handler = (fn: unknown): RequestHandler => fn as RequestHandler;

// ============================================================================
// All Coach Routes Require Authentication and COACH Role
// ============================================================================

// Apply authentication and coach role requirement to all routes
router.use(authenticate, requireCoach);

// ============================================================================
// Coach Boxer Management Routes
// ============================================================================

/**
 * GET /api/v1/coach/boxers
 * Get all boxers linked to the authenticated coach
 * Rate limited by standardLimiter
 */
router.get('/boxers', standardLimiter, handler(getMyBoxers));

/**
 * POST /api/v1/coach/boxers/:boxerId/link
 * Link a boxer to the authenticated coach
 * Rate limited by createResourceLimiter
 */
router.post('/boxers/:boxerId/link', createResourceLimiter, handler(linkBoxer));

/**
 * DELETE /api/v1/coach/boxers/:boxerId/unlink
 * Unlink a boxer from the authenticated coach
 * Rate limited by standardLimiter
 */
router.delete('/boxers/:boxerId/unlink', standardLimiter, handler(unlinkBoxer));

/**
 * PUT /api/v1/coach/boxers/:boxerId/permissions
 * Update permissions for a boxer linked to the authenticated coach
 * Rate limited by standardLimiter
 */
router.put('/boxers/:boxerId/permissions', standardLimiter, handler(updateBoxerPermissions));

export default router;
