// Admin Routes
// Defines all admin-related API endpoints

import { Router, RequestHandler } from 'express';
import {
  getUsers,
  updateUserStatus,
  verifyBoxer,
  getStats,
  getPendingVerifications,
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
// User Management Routes
// ============================================================================

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

// ============================================================================
// Boxer Verification Routes
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

export default router;
