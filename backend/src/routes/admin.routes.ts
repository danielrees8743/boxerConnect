// Admin Routes
// Defines all admin-related API endpoints

import { Router, RequestHandler } from 'express';
import {
  getUsers,
  updateUserStatus,
  verifyBoxer,
  getStats,
  getPendingVerifications,
  searchUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getBoxers,
  getBoxerById,
  createBoxer,
  updateBoxer,
  deleteBoxer,
  getClubs,
  getClubById,
  createClub,
  updateClub,
  deleteClub,
} from '../controllers/admin.controller';
import {
  authenticate,
  standardLimiter,
  requirePermission,
} from '../middleware';
import { Permission } from '../permissions';

const router = Router();

// Type helper for route handlers with authenticated requests
const handler = (fn: unknown): RequestHandler => fn as RequestHandler;

// ============================================================================
// All Admin Routes Require Authentication
// Individual routes specify required permissions
// ============================================================================

// Apply authentication to all routes
router.use(authenticate);

// ============================================================================
// Statistics Routes
// ============================================================================

/**
 * GET /api/v1/admin/stats
 * Get system-wide statistics
 * Requires: ADMIN_READ_SYSTEM_STATS permission
 */
router.get(
  '/stats',
  standardLimiter,
  requirePermission(Permission.ADMIN_READ_SYSTEM_STATS),
  handler(getStats)
);

// ============================================================================
// User Management Routes
// ============================================================================

/**
 * GET /api/v1/admin/users/search
 * Search users by name or email
 * Query params: q (search query), page, limit
 * Requires: ADMIN_READ_ALL_USERS permission
 */
router.get(
  '/users/search',
  standardLimiter,
  requirePermission(Permission.ADMIN_READ_ALL_USERS),
  handler(searchUsers)
);

/**
 * GET /api/v1/admin/users
 * Get all users with optional filtering and pagination
 * Query params: role, isActive, page, limit
 * Requires: ADMIN_READ_ALL_USERS permission
 */
router.get(
  '/users',
  standardLimiter,
  requirePermission(Permission.ADMIN_READ_ALL_USERS),
  handler(getUsers)
);

/**
 * GET /api/v1/admin/users/:id
 * Get a single user by ID
 * Requires: ADMIN_READ_ALL_USERS permission
 */
router.get(
  '/users/:id',
  standardLimiter,
  requirePermission(Permission.ADMIN_READ_ALL_USERS),
  handler(getUserById)
);

/**
 * POST /api/v1/admin/users
 * Create a new user
 * Body: { email, password, name, role }
 * Requires: ADMIN_CREATE_USER permission
 */
router.post(
  '/users',
  standardLimiter,
  requirePermission(Permission.ADMIN_CREATE_USER),
  handler(createUser)
);

/**
 * PUT /api/v1/admin/users/:id
 * Update a user's details
 * Body: { email?, name?, role? }
 * Requires: ADMIN_UPDATE_USER permission
 */
router.put(
  '/users/:id',
  standardLimiter,
  requirePermission(Permission.ADMIN_UPDATE_USER),
  handler(updateUser)
);

/**
 * PUT /api/v1/admin/users/:id/status
 * Activate or deactivate a user
 * Body: { isActive: boolean }
 * Requires: ADMIN_UPDATE_USER_STATUS permission
 */
router.put(
  '/users/:id/status',
  standardLimiter,
  requirePermission(Permission.ADMIN_UPDATE_USER_STATUS),
  handler(updateUserStatus)
);

/**
 * DELETE /api/v1/admin/users/:id
 * Delete a user (soft delete)
 * Requires: ADMIN_DELETE_USER permission
 */
router.delete(
  '/users/:id',
  standardLimiter,
  requirePermission(Permission.ADMIN_DELETE_USER),
  handler(deleteUser)
);

// ============================================================================
// Boxer Management Routes (Admin)
// ============================================================================

/**
 * GET /api/v1/admin/boxers/pending-verification
 * Get boxers pending verification
 * Query params: page, limit
 * Requires: ADMIN_VERIFY_BOXER permission
 */
router.get(
  '/boxers/pending-verification',
  standardLimiter,
  requirePermission(Permission.ADMIN_VERIFY_BOXER),
  handler(getPendingVerifications)
);

/**
 * GET /api/v1/admin/boxers
 * Get all boxers with pagination
 * Query params: isVerified, clubId, page, limit
 * Requires: ADMIN_READ_ALL_USERS permission (admins can read all)
 */
router.get(
  '/boxers',
  standardLimiter,
  requirePermission(Permission.ADMIN_READ_ALL_USERS),
  handler(getBoxers)
);

/**
 * GET /api/v1/admin/boxers/:id
 * Get a single boxer by ID
 * Requires: ADMIN_READ_ALL_USERS permission
 */
router.get(
  '/boxers/:id',
  standardLimiter,
  requirePermission(Permission.ADMIN_READ_ALL_USERS),
  handler(getBoxerById)
);

/**
 * POST /api/v1/admin/boxers
 * Create a boxer profile for a user
 * Body: { userId, name, ... boxer details }
 * Requires: ADMIN_CREATE_BOXER permission
 */
router.post(
  '/boxers',
  standardLimiter,
  requirePermission(Permission.ADMIN_CREATE_BOXER),
  handler(createBoxer)
);

/**
 * PUT /api/v1/admin/boxers/:id
 * Update a boxer profile
 * Body: { name?, ... boxer details }
 * Requires: ADMIN_UPDATE_BOXER permission
 */
router.put(
  '/boxers/:id',
  standardLimiter,
  requirePermission(Permission.ADMIN_UPDATE_BOXER),
  handler(updateBoxer)
);

/**
 * PUT /api/v1/admin/boxers/:id/verify
 * Verify or unverify a boxer
 * Body: { isVerified: boolean }
 * Requires: ADMIN_VERIFY_BOXER permission
 */
router.put(
  '/boxers/:id/verify',
  standardLimiter,
  requirePermission(Permission.ADMIN_VERIFY_BOXER),
  handler(verifyBoxer)
);

/**
 * DELETE /api/v1/admin/boxers/:id
 * Delete a boxer profile
 * Requires: ADMIN_DELETE_BOXER permission
 */
router.delete(
  '/boxers/:id',
  standardLimiter,
  requirePermission(Permission.ADMIN_DELETE_BOXER),
  handler(deleteBoxer)
);

// ============================================================================
// Club Management Routes (Admin)
// ============================================================================

/**
 * GET /api/v1/admin/clubs
 * Get all clubs with pagination
 * Query params: isVerified, region, page, limit
 * Requires: ADMIN_READ_ALL_USERS permission (admins can read all)
 */
router.get(
  '/clubs',
  standardLimiter,
  requirePermission(Permission.ADMIN_READ_ALL_USERS),
  handler(getClubs)
);

/**
 * GET /api/v1/admin/clubs/:id
 * Get a single club by ID
 * Requires: ADMIN_READ_ALL_USERS permission
 */
router.get(
  '/clubs/:id',
  standardLimiter,
  requirePermission(Permission.ADMIN_READ_ALL_USERS),
  handler(getClubById)
);

/**
 * POST /api/v1/admin/clubs
 * Create a new club
 * Body: { name, email?, phone?, ... }
 * Requires: ADMIN_CREATE_CLUB permission
 */
router.post(
  '/clubs',
  standardLimiter,
  requirePermission(Permission.ADMIN_CREATE_CLUB),
  handler(createClub)
);

/**
 * PUT /api/v1/admin/clubs/:id
 * Update a club
 * Body: { name?, email?, phone?, ... }
 * Requires: ADMIN_UPDATE_CLUB permission
 */
router.put(
  '/clubs/:id',
  standardLimiter,
  requirePermission(Permission.ADMIN_UPDATE_CLUB),
  handler(updateClub)
);

/**
 * DELETE /api/v1/admin/clubs/:id
 * Delete a club
 * Requires: ADMIN_DELETE_CLUB permission
 */
router.delete(
  '/clubs/:id',
  standardLimiter,
  requirePermission(Permission.ADMIN_DELETE_CLUB),
  handler(deleteClub)
);

export default router;
