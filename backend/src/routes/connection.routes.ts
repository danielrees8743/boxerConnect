// Connection Routes
// Defines all boxer-to-boxer connection API endpoints

import { Router, RequestHandler } from 'express';
import {
  sendConnectionRequest,
  getMyConnectionRequests,
  getMyConnections,
  getConnectionStatus,
  acceptConnectionRequest,
  declineConnectionRequest,
  cancelConnectionRequest,
  disconnectBoxers,
} from '../controllers/connection.controller';
import {
  authenticate,
  createResourceLimiter,
  searchLimiter,
  requirePermission,
} from '../middleware';
import { Permission } from '../permissions';

const router = Router();
const handler = (fn: unknown): RequestHandler => fn as RequestHandler;

/**
 * GET /api/v1/connections
 * Get accepted connections for the authenticated boxer
 */
router.get(
  '/',
  searchLimiter,
  authenticate,
  requirePermission(Permission.CONNECTION_READ_OWN),
  handler(getMyConnections),
);

/**
 * POST /api/v1/connections
 * Send a connection request
 */
router.post(
  '/',
  createResourceLimiter,
  authenticate,
  requirePermission(Permission.CONNECTION_SEND_REQUEST),
  handler(sendConnectionRequest),
);

/**
 * GET /api/v1/connections/requests
 * Get incoming or outgoing connection requests
 */
router.get(
  '/requests',
  searchLimiter,
  authenticate,
  requirePermission(Permission.CONNECTION_READ_OWN),
  handler(getMyConnectionRequests),
);

/**
 * GET /api/v1/connections/status/:boxerId
 * Get connection status with another boxer
 */
router.get(
  '/status/:boxerId',
  authenticate,
  requirePermission(Permission.CONNECTION_READ_OWN),
  handler(getConnectionStatus),
);

/**
 * PUT /api/v1/connections/requests/:id/accept
 * Accept an incoming connection request
 */
router.put(
  '/requests/:id/accept',
  authenticate,
  requirePermission(Permission.CONNECTION_ACCEPT_REQUEST),
  handler(acceptConnectionRequest),
);

/**
 * PUT /api/v1/connections/requests/:id/decline
 * Decline an incoming connection request
 */
router.put(
  '/requests/:id/decline',
  authenticate,
  requirePermission(Permission.CONNECTION_ACCEPT_REQUEST),
  handler(declineConnectionRequest),
);

/**
 * DELETE /api/v1/connections/requests/:id
 * Cancel an outgoing connection request
 */
router.delete(
  '/requests/:id',
  authenticate,
  requirePermission(Permission.CONNECTION_SEND_REQUEST),
  handler(cancelConnectionRequest),
);

/**
 * DELETE /api/v1/connections/:connectionId
 * Remove an accepted connection (disconnect)
 */
router.delete(
  '/:connectionId',
  authenticate,
  requirePermission(Permission.CONNECTION_DISCONNECT),
  handler(disconnectBoxers),
);

export default router;
