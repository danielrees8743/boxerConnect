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
  requireBoxer,
  createResourceLimiter,
  searchLimiter,
} from '../middleware';

const router = Router();

// Type helper for route handlers with authenticated requests
const handler = (fn: unknown): RequestHandler => fn as RequestHandler;

// ============================================================================
// All routes require authentication
// ============================================================================

/**
 * GET /api/v1/match-requests/stats
 * Get match request statistics for current user
 * Requires: authentication + BOXER role
 */
router.get('/stats', authenticate, requireBoxer, handler(getMatchRequestStats));

/**
 * GET /api/v1/match-requests
 * Get match requests for current user
 * Query params: type (incoming|outgoing), status, page, limit
 * Requires: authentication + BOXER role
 */
router.get('/', searchLimiter, authenticate, requireBoxer, handler(getMyMatchRequests));

/**
 * POST /api/v1/match-requests
 * Create a new match request
 * Rate limited by createResourceLimiter (30 creates per hour)
 * Requires: authentication + BOXER role
 */
router.post('/', createResourceLimiter, authenticate, requireBoxer, handler(createMatchRequest));

/**
 * GET /api/v1/match-requests/:id
 * Get a specific match request by ID
 * Requires: authentication + BOXER role
 */
router.get('/:id', authenticate, requireBoxer, handler(getMatchRequest));

/**
 * PUT /api/v1/match-requests/:id/accept
 * Accept a match request
 * Requires: authentication + BOXER role
 */
router.put('/:id/accept', authenticate, requireBoxer, handler(acceptMatchRequest));

/**
 * PUT /api/v1/match-requests/:id/decline
 * Decline a match request
 * Requires: authentication + BOXER role
 */
router.put('/:id/decline', authenticate, requireBoxer, handler(declineMatchRequest));

/**
 * DELETE /api/v1/match-requests/:id
 * Cancel a match request
 * Requires: authentication + BOXER role
 */
router.delete('/:id', authenticate, requireBoxer, handler(cancelMatchRequest));

export default router;
