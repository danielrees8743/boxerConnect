// Boxer Routes
// Defines all boxer profile-related API endpoints

import { Router, RequestHandler } from 'express';
import {
  createBoxer,
  getMyBoxer,
  getBoxer,
  updateBoxer,
  searchBoxers,
  deleteBoxerProfile,
  getCompatibleMatches,
  getMySuggestedMatches,
} from '../controllers/boxer.controller';
import {
  uploadPhoto,
  removePhoto,
} from '../controllers/profilePhoto.controller';
import {
  authenticate,
  optionalAuth,
  requireBoxer,
  standardLimiter,
  searchLimiter,
  createResourceLimiter,
  uploadProfilePhoto,
} from '../middleware';

const router = Router();

// Type helper for route handlers with authenticated requests
// This is necessary because Express's RequestHandler expects Request, but our controllers use AuthenticatedUserRequest
const handler = (fn: unknown): RequestHandler => fn as RequestHandler;

// ============================================================================
// Public Routes (optional authentication for personalized results)
// ============================================================================

/**
 * GET /api/v1/boxers
 * Search boxers with filters
 * Rate limited by searchLimiter
 * Optional auth for personalized results
 */
router.get('/', searchLimiter, optionalAuth, handler(searchBoxers));

// ============================================================================
// Protected Routes - "me" routes MUST come before /:id routes
// ============================================================================

/**
 * GET /api/v1/boxers/me
 * Get current user's boxer profile
 * Requires authentication
 */
router.get('/me', standardLimiter, authenticate, handler(getMyBoxer));

/**
 * GET /api/v1/boxers/me/suggestions
 * Get suggested matches for current user
 * Requires authentication and BOXER role
 */
router.get('/me/suggestions', standardLimiter, authenticate, requireBoxer, handler(getMySuggestedMatches));

/**
 * POST /api/v1/boxers/me/photo
 * Upload profile photo
 * Requires authentication and BOXER role
 */
router.post('/me/photo', createResourceLimiter, authenticate, requireBoxer, uploadProfilePhoto, handler(uploadPhoto));

/**
 * DELETE /api/v1/boxers/me/photo
 * Remove profile photo
 * Requires authentication and BOXER role
 */
router.delete('/me/photo', standardLimiter, authenticate, requireBoxer, handler(removePhoto));

/**
 * POST /api/v1/boxers
 * Create or complete boxer profile
 * Rate limited by createResourceLimiter
 * Requires authentication and BOXER role
 */
router.post('/', createResourceLimiter, authenticate, requireBoxer, handler(createBoxer));

// ============================================================================
// Parameterized Routes (must come after /me routes)
// ============================================================================

/**
 * GET /api/v1/boxers/:id
 * Get boxer by ID
 * Rate limited by standardLimiter
 * Optional auth to check if user is owner
 */
router.get('/:id', standardLimiter, optionalAuth, handler(getBoxer));

/**
 * PUT /api/v1/boxers/:id
 * Update boxer profile (owner only)
 * Requires authentication
 */
router.put('/:id', standardLimiter, authenticate, handler(updateBoxer));

/**
 * DELETE /api/v1/boxers/:id
 * Deactivate boxer profile (owner only)
 * Requires authentication
 */
router.delete('/:id', standardLimiter, authenticate, handler(deleteBoxerProfile));

/**
 * GET /api/v1/boxers/:id/matches
 * Get compatible matches for a boxer (owner only)
 * Requires authentication
 */
router.get('/:id/matches', standardLimiter, authenticate, handler(getCompatibleMatches));

export default router;
