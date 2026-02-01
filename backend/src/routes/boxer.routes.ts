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
  uploadVideo,
  deleteVideo,
  getMyVideos,
  getBoxerVideos,
} from '../controllers/video.controller';
import {
  createFight,
  getMyFights,
  updateFight,
  deleteFight,
  getBoxerFights,
} from '../controllers/fightHistory.controller';
import {
  authenticate,
  optionalAuth,
  standardLimiter,
  searchLimiter,
  createResourceLimiter,
  uploadProfilePhoto,
  uploadVideo as uploadVideoMiddleware,
  requirePermission,
  requireAnyPermission,
} from '../middleware';
import { Permission } from '../permissions';

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
 * Requires: authentication + BOXER_READ_OWN_PROFILE permission
 */
router.get(
  '/me',
  standardLimiter,
  authenticate,
  requirePermission(Permission.BOXER_READ_OWN_PROFILE),
  handler(getMyBoxer)
);

/**
 * GET /api/v1/boxers/me/suggestions
 * Get suggested matches for current user
 * Requires: authentication + MATCH_READ_OWN_REQUESTS permission
 */
router.get(
  '/me/suggestions',
  standardLimiter,
  authenticate,
  requirePermission(Permission.MATCH_READ_OWN_REQUESTS),
  handler(getMySuggestedMatches)
);

/**
 * POST /api/v1/boxers/me/photo
 * Upload profile photo
 * Requires: authentication + BOXER_UPLOAD_PHOTO permission
 */
router.post(
  '/me/photo',
  createResourceLimiter,
  authenticate,
  requirePermission(Permission.BOXER_UPLOAD_PHOTO),
  uploadProfilePhoto,
  handler(uploadPhoto)
);

/**
 * DELETE /api/v1/boxers/me/photo
 * Remove profile photo
 * Requires: authentication + BOXER_UPLOAD_PHOTO permission
 */
router.delete(
  '/me/photo',
  standardLimiter,
  authenticate,
  requirePermission(Permission.BOXER_UPLOAD_PHOTO),
  handler(removePhoto)
);

/**
 * POST /api/v1/boxers/me/videos
 * Upload a training video
 * Requires: authentication + BOXER_UPLOAD_VIDEO permission
 */
router.post(
  '/me/videos',
  createResourceLimiter,
  authenticate,
  requirePermission(Permission.BOXER_UPLOAD_VIDEO),
  uploadVideoMiddleware,
  handler(uploadVideo)
);

/**
 * GET /api/v1/boxers/me/videos
 * Get my uploaded videos
 * Requires: authentication + BOXER_READ_OWN_PROFILE permission
 */
router.get(
  '/me/videos',
  standardLimiter,
  authenticate,
  requirePermission(Permission.BOXER_READ_OWN_PROFILE),
  handler(getMyVideos)
);

/**
 * DELETE /api/v1/boxers/me/videos/:id
 * Delete a video
 * Requires: authentication + BOXER_UPLOAD_VIDEO permission
 */
router.delete(
  '/me/videos/:id',
  standardLimiter,
  authenticate,
  requirePermission(Permission.BOXER_UPLOAD_VIDEO),
  handler(deleteVideo)
);

// ============================================================================
// Fight History Routes
// ============================================================================

/**
 * POST /api/v1/boxers/me/fights
 * Create a fight history entry
 * Requires: authentication + FIGHT_CREATE permission
 */
router.post(
  '/me/fights',
  createResourceLimiter,
  authenticate,
  requirePermission(Permission.FIGHT_CREATE),
  handler(createFight)
);

/**
 * GET /api/v1/boxers/me/fights
 * Get my fight history
 * Requires: authentication + FIGHT_READ permission
 */
router.get(
  '/me/fights',
  standardLimiter,
  authenticate,
  requirePermission(Permission.FIGHT_READ),
  handler(getMyFights)
);

/**
 * PUT /api/v1/boxers/me/fights/:id
 * Update a fight history entry
 * Requires: authentication + FIGHT_UPDATE permission
 */
router.put(
  '/me/fights/:id',
  standardLimiter,
  authenticate,
  requirePermission(Permission.FIGHT_UPDATE),
  handler(updateFight)
);

/**
 * DELETE /api/v1/boxers/me/fights/:id
 * Delete a fight history entry
 * Requires: authentication + FIGHT_DELETE permission
 */
router.delete(
  '/me/fights/:id',
  standardLimiter,
  authenticate,
  requirePermission(Permission.FIGHT_DELETE),
  handler(deleteFight)
);

/**
 * POST /api/v1/boxers
 * Create or complete boxer profile
 * Requires: authentication + BOXER_CREATE_PROFILE permission
 */
router.post(
  '/',
  createResourceLimiter,
  authenticate,
  requirePermission(Permission.BOXER_CREATE_PROFILE),
  handler(createBoxer)
);

// ============================================================================
// Parameterized Routes (must come after /me routes)
// ============================================================================

/**
 * GET /api/v1/boxers/:id
 * Get boxer by ID
 * Optional auth to check if user is owner
 * Note: Authorization logic is in controller (public profiles, searchability)
 */
router.get('/:id', standardLimiter, optionalAuth, handler(getBoxer));

/**
 * PUT /api/v1/boxers/:id
 * Update boxer profile
 * Requires: authentication + either BOXER_UPDATE_OWN_PROFILE or BOXER_UPDATE_LINKED_PROFILE
 * Resource-specific permission check determines if user owns or has coach permission
 */
router.put(
  '/:id',
  standardLimiter,
  authenticate,
  requireAnyPermission(
    [Permission.BOXER_UPDATE_OWN_PROFILE, Permission.BOXER_UPDATE_LINKED_PROFILE],
    {
      resourceIdParam: 'id',
      resourceType: 'boxer',
    }
  ),
  handler(updateBoxer)
);

/**
 * DELETE /api/v1/boxers/:id
 * Deactivate boxer profile (owner only)
 * Requires: authentication + BOXER_DELETE_OWN_PROFILE permission + ownership
 */
router.delete(
  '/:id',
  standardLimiter,
  authenticate,
  requirePermission(Permission.BOXER_DELETE_OWN_PROFILE, {
    resourceIdParam: 'id',
    resourceType: 'boxer',
  }),
  handler(deleteBoxerProfile)
);

/**
 * GET /api/v1/boxers/:id/matches
 * Get compatible matches for a boxer
 * Requires: authentication + MATCH_READ_OWN_REQUESTS permission
 * Note: Controller verifies boxer ownership
 */
router.get(
  '/:id/matches',
  standardLimiter,
  authenticate,
  requirePermission(Permission.MATCH_READ_OWN_REQUESTS),
  handler(getCompatibleMatches)
);

/**
 * GET /api/v1/boxers/:id/videos
 * Get videos for a boxer (public)
 * Optional auth for future personalization
 */
router.get(
  '/:id/videos',
  standardLimiter,
  optionalAuth,
  handler(getBoxerVideos)
);

/**
 * GET /api/v1/boxers/:id/fights
 * Get fight history for a boxer (public)
 * Optional auth for future personalization
 */
router.get(
  '/:id/fights',
  standardLimiter,
  optionalAuth,
  handler(getBoxerFights)
);

export default router;
