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
  requireAdmin,
  standardLimiter,
} from '../middleware';

const router = Router();

// Type helper for route handlers with authenticated requests
const handler = (fn: unknown): RequestHandler => fn as RequestHandler;

// ============================================================================
// All Admin Routes Require Authentication and ADMIN Role
// ============================================================================

// Apply authentication and admin role requirement to all routes
router.use(authenticate, requireAdmin);

// ============================================================================
// User Management Routes
// ============================================================================

/**
 * GET /api/v1/admin/users
 * Get all users with optional filtering and pagination
 * Query params: role, isActive, page, limit
 * Rate limited by standardLimiter
 */
router.get('/users', standardLimiter, handler(getUsers));

/**
 * PUT /api/v1/admin/users/:id/status
 * Activate or deactivate a user
 * Body: { isActive: boolean }
 * Rate limited by standardLimiter
 */
router.put('/users/:id/status', standardLimiter, handler(updateUserStatus));

// ============================================================================
// Boxer Verification Routes
// ============================================================================

/**
 * GET /api/v1/admin/boxers/pending-verification
 * Get boxers pending verification
 * Query params: page, limit
 * Rate limited by standardLimiter
 */
router.get('/boxers/pending-verification', standardLimiter, handler(getPendingVerifications));

/**
 * PUT /api/v1/admin/boxers/:id/verify
 * Verify or unverify a boxer
 * Body: { isVerified: boolean }
 * Rate limited by standardLimiter
 */
router.put('/boxers/:id/verify', standardLimiter, handler(verifyBoxer));

// ============================================================================
// Statistics Routes
// ============================================================================

/**
 * GET /api/v1/admin/stats
 * Get system-wide statistics
 * Rate limited by standardLimiter
 */
router.get('/stats', standardLimiter, handler(getStats));

export default router;
