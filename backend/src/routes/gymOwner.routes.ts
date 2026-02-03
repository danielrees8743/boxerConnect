// Gym Owner Routes
// Defines all gym owner-related API endpoints

import { Router, RequestHandler } from 'express';
import { createBoxerAccount } from '../controllers/gymOwner.controller';
import membershipRequestRoutes from './clubMembershipRequest.routes';
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
// Gym Owner Routes
// ============================================================================

/**
 * POST /api/v1/gym-owner/clubs/:clubId/boxers/create-account
 * Create a boxer account for a club
 * Requires: authentication + GYM_OWNER_CREATE_BOXER_ACCOUNT permission
 */
router.post(
  '/clubs/:clubId/boxers/create-account',
  createResourceLimiter,
  authenticate,
  requirePermission(Permission.GYM_OWNER_CREATE_BOXER_ACCOUNT),
  handler(createBoxerAccount)
);

// ============================================================================
// Membership Request Sub-Routes
// ============================================================================

/**
 * Mount membership request routes
 * Base path: /api/v1/gym-owner/membership-requests
 */
router.use('/', membershipRequestRoutes);

export default router;
