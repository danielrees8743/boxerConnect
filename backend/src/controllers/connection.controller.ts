// Connection Controller
// Handles HTTP requests for boxer-to-boxer connection endpoints

import { Response, NextFunction } from 'express';
import {
  sendConnectionRequest as sendConnectionRequestService,
  acceptConnectionRequest as acceptConnectionRequestService,
  declineConnectionRequest as declineConnectionRequestService,
  cancelConnectionRequest as cancelConnectionRequestService,
  getConnectionRequestsForBoxer,
  getConnectionsForBoxer,
  getPublicConnectionsForBoxer,
  getConnectionStatus as getConnectionStatusService,
  disconnectBoxers as disconnectBoxersService,
} from '../services/connection.service';
import { getBoxerByUserId } from '../services/boxer.service';
import {
  sendConnectionRequestSchema,
  connectionRequestIdSchema,
  connectionIdSchema,
  connectionStatusParamSchema,
  connectionQuerySchema,
  connectionListQuerySchema,
} from '../validators/connection.validators';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../utils';
import { NotFoundError } from '../middleware';
import type { AuthenticatedUserRequest } from '../types';
import type { Request } from 'express';

// ============================================================================
// Helper
// ============================================================================

async function getAuthenticatedBoxer(userId: string) {
  const boxer = await getBoxerByUserId(userId);
  if (!boxer) {
    throw new NotFoundError('Boxer profile not found. Please create a boxer profile first.');
  }
  return boxer;
}

// ============================================================================
// Controllers
// ============================================================================

/**
 * POST /api/v1/connections
 * Send a connection request
 */
export async function sendConnectionRequest(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const boxer = await getAuthenticatedBoxer(req.user.userId);
    const { targetBoxerId, message } = sendConnectionRequestSchema.parse(req.body);
    const connectionRequest = await sendConnectionRequestService(boxer.id, targetBoxerId, message);
    sendCreated(res, { connectionRequest }, 'Connection request sent successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/connections/requests
 * Get incoming or outgoing connection requests for the authenticated boxer
 */
export async function getMyConnectionRequests(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const boxer = await getAuthenticatedBoxer(req.user.userId);
    const { type, page, limit } = connectionQuerySchema.parse(req.query);
    const result = await getConnectionRequestsForBoxer(boxer.id, type, { page, limit });
    sendPaginated(
      res,
      result.requests,
      { page: result.page, limit: result.limit, total: result.total },
      `${type.charAt(0).toUpperCase() + type.slice(1)} connection requests retrieved successfully`,
    );
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/connections
 * Get accepted connections for the authenticated boxer
 */
export async function getMyConnections(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const boxer = await getAuthenticatedBoxer(req.user.userId);
    const { page, limit } = connectionListQuerySchema.parse(req.query);
    const result = await getConnectionsForBoxer(boxer.id, { page, limit });
    sendPaginated(
      res,
      result.connections,
      { page: result.page, limit: result.limit, total: result.total },
      'Connections retrieved successfully',
    );
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/connections/status/:boxerId
 * Get connection status between authenticated boxer and another boxer
 */
export async function getConnectionStatus(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const boxer = await getAuthenticatedBoxer(req.user.userId);
    const { boxerId } = connectionStatusParamSchema.parse(req.params);
    const statusResult = await getConnectionStatusService(boxer.id, boxerId);
    sendSuccess(res, statusResult, 'Connection status retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/connections/requests/:id/accept
 * Accept an incoming connection request
 */
export async function acceptConnectionRequest(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const boxer = await getAuthenticatedBoxer(req.user.userId);
    const { id } = connectionRequestIdSchema.parse(req.params);
    const result = await acceptConnectionRequestService(id, boxer.id);
    sendSuccess(res, result, 'Connection request accepted successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/connections/requests/:id/decline
 * Decline an incoming connection request
 */
export async function declineConnectionRequest(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const boxer = await getAuthenticatedBoxer(req.user.userId);
    const { id } = connectionRequestIdSchema.parse(req.params);
    const connectionRequest = await declineConnectionRequestService(id, boxer.id);
    sendSuccess(res, { connectionRequest }, 'Connection request declined successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/connections/requests/:id
 * Cancel an outgoing connection request
 */
export async function cancelConnectionRequest(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const boxer = await getAuthenticatedBoxer(req.user.userId);
    const { id } = connectionRequestIdSchema.parse(req.params);
    await cancelConnectionRequestService(id, boxer.id);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/connections/:connectionId
 * Disconnect two boxers (remove accepted connection)
 */
export async function disconnectBoxers(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const boxer = await getAuthenticatedBoxer(req.user.userId);
    const { connectionId } = connectionIdSchema.parse(req.params);
    await disconnectBoxersService(connectionId, boxer.id);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/boxers/:boxerId/connections
 * Public endpoint — get a boxer's connections list (no auth required)
 */
export async function getPublicBoxerConnections(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { boxerId } = req.params;
    const page = parseInt(String(req.query.page ?? '1'), 10);
    const limit = parseInt(String(req.query.limit ?? '20'), 10);
    const result = await getPublicConnectionsForBoxer(boxerId, { page, limit });
    sendPaginated(
      res,
      result.connections,
      { page: result.page, limit: result.limit, total: result.total },
      'Boxer connections retrieved successfully',
    );
  } catch (error) {
    next(error);
  }
}

export default {
  sendConnectionRequest,
  getMyConnectionRequests,
  getMyConnections,
  getConnectionStatus,
  acceptConnectionRequest,
  declineConnectionRequest,
  cancelConnectionRequest,
  disconnectBoxers,
  getPublicBoxerConnections,
};
