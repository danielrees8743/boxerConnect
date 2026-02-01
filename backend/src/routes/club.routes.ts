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
  requirePermission,
} from '../middleware';
import { Permission } from '../permissions';

const router = Router();

// Type helper for route handlers with authenticated requests
const handler = (fn: unknown): RequestHandler => fn as RequestHandler;

// ============================================================================
// Public Routes - No Authentication Required
// ============================================================================

/**
 * GET /api/v1/clubs/regions
 * Get all unique regions
 * Requires: CLUB_READ_PUBLIC permission (granted to all roles)
 */
router.get('/regions', standardLimiter, getRegions);

/**
 * GET /api/v1/clubs/search
 * Search clubs by name (autocomplete)
 */
router.get('/search', searchLimiter, searchClubs);

/**
 * GET /api/v1/clubs/stats
 * Get club statistics
 */
router.get('/stats', standardLimiter, getClubStats);

/**
 * GET /api/v1/clubs/region/:region
 * Get clubs by region
 */
router.get('/region/:region', standardLimiter, getClubsByRegion);

/**
 * GET /api/v1/clubs
 * List all clubs with optional filtering
 * Query params: name, region, postcode, page, limit
 */
router.get('/', searchLimiter, getClubs);

/**
 * GET /api/v1/clubs/:id
 * Get club by ID
 */
router.get('/:id', standardLimiter, getClub);

// ============================================================================
// Protected Routes - Authentication Required
// ============================================================================

/**
 * GET /api/v1/clubs/:id/members
 * Get club with all members (owner, boxers, coaches)
 * Requires: authentication + CLUB_READ_MEMBERS permission
 */
router.get(
  '/:id/members',
  standardLimiter,
  authenticate,
  requirePermission(Permission.CLUB_READ_MEMBERS, {
    resourceIdParam: 'id',
    resourceType: 'club',
  }),
  getClubMembers
);

/**
 * POST /api/v1/clubs/:id/boxers/:boxerId
 * Add a boxer to the club
 * Requires: CLUB_MEMBER_ADD_BOXER permission + club ownership (checked in middleware)
 */
router.post(
  '/:id/boxers/:boxerId',
  standardLimiter,
  authenticate,
  requirePermission(Permission.CLUB_MEMBER_ADD_BOXER, {
    resourceIdParam: 'id',
    resourceType: 'club',
  }),
  handler(addBoxerToClub)
);

/**
 * DELETE /api/v1/clubs/:id/boxers/:boxerId
 * Remove a boxer from the club
 * Requires: CLUB_MEMBER_REMOVE_BOXER permission + club ownership (checked in middleware)
 */
router.delete(
  '/:id/boxers/:boxerId',
  standardLimiter,
  authenticate,
  requirePermission(Permission.CLUB_MEMBER_REMOVE_BOXER, {
    resourceIdParam: 'id',
    resourceType: 'club',
  }),
  handler(removeBoxerFromClub)
);

/**
 * POST /api/v1/clubs/:id/coaches/:coachId
 * Add a coach to the club
 * Requires: CLUB_MEMBER_ADD_COACH permission + club ownership (checked in middleware)
 */
router.post(
  '/:id/coaches/:coachId',
  standardLimiter,
  authenticate,
  requirePermission(Permission.CLUB_MEMBER_ADD_COACH, {
    resourceIdParam: 'id',
    resourceType: 'club',
  }),
  handler(addCoachToClub)
);

/**
 * DELETE /api/v1/clubs/:id/coaches/:coachId
 * Remove a coach from the club
 * Requires: CLUB_MEMBER_REMOVE_COACH permission + club ownership (checked in middleware)
 */
router.delete(
  '/:id/coaches/:coachId',
  standardLimiter,
  authenticate,
  requirePermission(Permission.CLUB_MEMBER_REMOVE_COACH, {
    resourceIdParam: 'id',
    resourceType: 'club',
  }),
  handler(removeCoachFromClub)
);

/**
 * PUT /api/v1/clubs/:id/owner
 * Set the club owner (ADMIN only)
 * Requires: CLUB_SET_OWNER permission (admin only)
 */
router.put(
  '/:id/owner',
  standardLimiter,
  authenticate,
  requirePermission(Permission.CLUB_SET_OWNER, {
    resourceIdParam: 'id',
    resourceType: 'club',
  }),
  handler(setClubOwner)
);

export default router;
