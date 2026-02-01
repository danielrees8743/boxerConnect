// Match Request Routes
// Defines all match request-related API endpoints

import { Router, RequestHandler } from 'express';
import {
  createMatchRequest,
  getMyMatchRequests,
  getMatchRequest,
  acceptMatchRequest,
  declineMatchRequest,
  cancelMatchRequest,
  getMatchRequestStats,
} from '../controllers/matchRequest.controller';
import {
  authenticate,
  createResourceLimiter,
  searchLimiter,
  requirePermission,
} from '../middleware';
import { Permission } from '../permissions';

const router = Router();

// Type helper for route handlers with authenticated requests
const handler = (fn: unknown): RequestHandler => fn as RequestHandler;

// ============================================================================
// All routes require authentication
// Permission checks determine what operations are allowed
// ============================================================================

/**
 * GET /api/v1/match-requests/stats
 * Get match request statistics for current user
 * Requires: authentication + MATCH_READ_OWN_REQUESTS permission
 */
router.get(
  '/stats',
  authenticate,
  requirePermission(Permission.MATCH_READ_OWN_REQUESTS),
  handler(getMatchRequestStats)
);

/**
 * GET /api/v1/match-requests
 * Get match requests for current user
 * Query params: type (incoming|outgoing), status, page, limit
 * Requires: authentication + MATCH_READ_OWN_REQUESTS permission
 */
router.get(
  '/',
  searchLimiter,
  authenticate,
  requirePermission(Permission.MATCH_READ_OWN_REQUESTS),
  handler(getMyMatchRequests)
);

/**
 * POST /api/v1/match-requests
 * Create a new match request
 * Rate limited by createResourceLimiter (30 creates per hour)
 * Requires: authentication + MATCH_CREATE_REQUEST permission
 * Note: Boxers cannot create match requests (only coaches/gym owners can)
 */
router.post(
  '/',
  createResourceLimiter,
  authenticate,
  requirePermission(Permission.MATCH_CREATE_REQUEST),
  handler(createMatchRequest)
);

/**
 * GET /api/v1/match-requests/:id
 * Get a specific match request by ID
 * Requires: authentication + MATCH_READ_OWN_REQUESTS permission
 * Note: Resource-specific check verifies user is involved in the match
 */
router.get(
  '/:id',
  authenticate,
  requirePermission(Permission.MATCH_READ_OWN_REQUESTS, {
    resourceIdParam: 'id',
    resourceType: 'matchRequest',
  }),
  handler(getMatchRequest)
);

/**
 * PUT /api/v1/match-requests/:id/accept
 * Accept a match request
 * Requires: authentication + MATCH_ACCEPT_REQUEST permission
 * Note: Resource-specific check verifies user can manage the target boxer
 */
router.put(
  '/:id/accept',
  authenticate,
  requirePermission(Permission.MATCH_ACCEPT_REQUEST, {
    resourceIdParam: 'id',
    resourceType: 'matchRequest',
  }),
  handler(acceptMatchRequest)
);

/**
 * PUT /api/v1/match-requests/:id/decline
 * Decline a match request
 * Requires: authentication + MATCH_DECLINE_REQUEST permission
 * Note: Resource-specific check verifies user can manage the target boxer
 */
router.put(
  '/:id/decline',
  authenticate,
  requirePermission(Permission.MATCH_DECLINE_REQUEST, {
    resourceIdParam: 'id',
    resourceType: 'matchRequest',
  }),
  handler(declineMatchRequest)
);

/**
 * DELETE /api/v1/match-requests/:id
 * Cancel a match request
 * Requires: authentication + MATCH_CANCEL_REQUEST permission
 * Note: Resource-specific check verifies user can manage the requester boxer
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission(Permission.MATCH_CANCEL_REQUEST, {
    resourceIdParam: 'id',
    resourceType: 'matchRequest',
  }),
  handler(cancelMatchRequest)
);

export default router;
