// Club Membership Request Routes
// Defines all club membership request API endpoints for gym owners

import { Router, RequestHandler } from 'express';
import {
  getPendingRequests,
  approveRequest,
  rejectRequest,
} from '../controllers/clubMembershipRequest.controller';
import {
  authenticate,
  createResourceLimiter,
  requirePermission,
} from '../middleware';
import { Permission } from '../permissions';

const router = Router();

// Type helper for route handlers with authenticated requests
const handler = (fn: unknown): RequestHandler => fn as RequestHandler;

// ============================================================================
// Club Membership Request Routes
// ============================================================================

/**
 * GET /api/v1/gym-owner/membership-requests
 * Get all pending membership requests for gym owner's clubs
 * Requires: authentication + GYM_OWNER_VIEW_MEMBERSHIP_REQUESTS permission
 */
router.get(
  '/membership-requests',
  authenticate,
  requirePermission(Permission.GYM_OWNER_VIEW_MEMBERSHIP_REQUESTS),
  handler(getPendingRequests)
);

/**
 * POST /api/v1/gym-owner/membership-requests/:id/approve
 * Approve a membership request
 * Requires: authentication + GYM_OWNER_APPROVE_MEMBERSHIP permission
 */
router.post(
  '/membership-requests/:id/approve',
  createResourceLimiter,
  authenticate,
  requirePermission(Permission.GYM_OWNER_APPROVE_MEMBERSHIP),
  handler(approveRequest)
);

/**
 * POST /api/v1/gym-owner/membership-requests/:id/reject
 * Reject a membership request
 * Requires: authentication + GYM_OWNER_REJECT_MEMBERSHIP permission
 */
router.post(
  '/membership-requests/:id/reject',
  createResourceLimiter,
  authenticate,
  requirePermission(Permission.GYM_OWNER_REJECT_MEMBERSHIP),
  handler(rejectRequest)
);

export default router;
