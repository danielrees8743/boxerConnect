// Club Routes
// Defines all boxing club-related API endpoints

import { Router, RequestHandler } from 'express';
import {
  getClubs,
  getClub,
  getClubsByRegion,
  getRegions,
  searchClubs,
  getClubStats,
  getClubMembers,
  addBoxerToClub,
  removeBoxerFromClub,
  addCoachToClub,
  removeCoachFromClub,
  setClubOwner,
} from '../controllers/club.controller';
import {
  searchLimiter,
  standardLimiter,
  authenticate,
  requireRole,
} from '../middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Type helper for route handlers with authenticated requests
const handler = (fn: unknown): RequestHandler => fn as RequestHandler;

// ============================================================================
// Public Routes - No Authentication Required
// ============================================================================

/**
 * GET /api/v1/clubs/regions
 * Get all unique regions
 * Rate limited by standardLimiter
 */
router.get('/regions', standardLimiter, getRegions);

/**
 * GET /api/v1/clubs/search
 * Search clubs by name (autocomplete)
 * Rate limited by searchLimiter
 */
router.get('/search', searchLimiter, searchClubs);

/**
 * GET /api/v1/clubs/stats
 * Get club statistics
 * Rate limited by standardLimiter
 */
router.get('/stats', standardLimiter, getClubStats);

/**
 * GET /api/v1/clubs/region/:region
 * Get clubs by region
 * Rate limited by standardLimiter
 */
router.get('/region/:region', standardLimiter, getClubsByRegion);

/**
 * GET /api/v1/clubs
 * List all clubs with optional filtering
 * Query params: name, region, postcode, page, limit
 * Rate limited by searchLimiter
 */
router.get('/', searchLimiter, getClubs);

/**
 * GET /api/v1/clubs/:id
 * Get club by ID
 * Rate limited by standardLimiter
 */
router.get('/:id', standardLimiter, getClub);

// ============================================================================
// Protected Routes - Authentication Required
// ============================================================================

/**
 * GET /api/v1/clubs/:id/members
 * Get club with all members (owner, boxers, coaches)
 * Requires authentication
 * Rate limited by standardLimiter
 */
router.get('/:id/members', standardLimiter, authenticate, getClubMembers);

/**
 * POST /api/v1/clubs/:id/boxers/:boxerId
 * Add a boxer to the club
 * Requires GYM_OWNER or ADMIN role
 */
router.post(
  '/:id/boxers/:boxerId',
  standardLimiter,
  authenticate,
  requireRole(UserRole.GYM_OWNER, UserRole.ADMIN),
  handler(addBoxerToClub)
);

/**
 * DELETE /api/v1/clubs/:id/boxers/:boxerId
 * Remove a boxer from the club
 * Requires GYM_OWNER or ADMIN role
 */
router.delete(
  '/:id/boxers/:boxerId',
  standardLimiter,
  authenticate,
  requireRole(UserRole.GYM_OWNER, UserRole.ADMIN),
  handler(removeBoxerFromClub)
);

/**
 * POST /api/v1/clubs/:id/coaches/:coachId
 * Add a coach to the club
 * Requires GYM_OWNER or ADMIN role
 */
router.post(
  '/:id/coaches/:coachId',
  standardLimiter,
  authenticate,
  requireRole(UserRole.GYM_OWNER, UserRole.ADMIN),
  handler(addCoachToClub)
);

/**
 * DELETE /api/v1/clubs/:id/coaches/:coachId
 * Remove a coach from the club
 * Requires GYM_OWNER or ADMIN role
 */
router.delete(
  '/:id/coaches/:coachId',
  standardLimiter,
  authenticate,
  requireRole(UserRole.GYM_OWNER, UserRole.ADMIN),
  handler(removeCoachFromClub)
);

/**
 * PUT /api/v1/clubs/:id/owner
 * Set the club owner (ADMIN only)
 * Requires ADMIN role
 */
router.put(
  '/:id/owner',
  standardLimiter,
  authenticate,
  requireRole(UserRole.ADMIN),
  handler(setClubOwner)
);

export default router;
