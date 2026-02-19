// Connection Controller Unit Tests

import { Response, NextFunction } from 'express';
import * as connectionService from '../../src/services/connection.service';
import * as boxerService from '../../src/services/boxer.service';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../src/middleware';
import type { AuthenticatedUserRequest } from '../../src/types';

// ============================================================================
// Mock Setup
// ============================================================================

jest.mock('../../src/services/connection.service');
jest.mock('../../src/services/boxer.service');
jest.mock('../../src/validators/connection.validators', () => ({
  sendConnectionRequestSchema: { parse: jest.fn((b) => b) },
  connectionRequestIdSchema: { parse: jest.fn((p) => p) },
  connectionIdSchema: { parse: jest.fn((p) => p) },
  connectionStatusParamSchema: { parse: jest.fn((p) => p) },
  connectionQuerySchema: { parse: jest.fn((q) => ({ type: 'incoming', page: 1, limit: 20, ...q })) },
  connectionListQuerySchema: { parse: jest.fn((_q) => ({ page: 1, limit: 20 })) },
}));

// Import controllers AFTER mocking
import {
  sendConnectionRequest,
  getConnectionStatus,
  acceptConnectionRequest,
  declineConnectionRequest,
  cancelConnectionRequest,
  getMyConnections,
  getMyConnectionRequests,
  disconnectBoxers,
} from '../../src/controllers/connection.controller';

// ============================================================================
// Helpers
// ============================================================================

function makeMockResponse(): Partial<Response> {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function makeReq(overrides: Partial<AuthenticatedUserRequest> = {}): Partial<AuthenticatedUserRequest> {
  return {
    user: { userId: 'user-1', role: 'BOXER', email: 'a@a.com' },
    body: {},
    params: {},
    query: {},
    ...overrides,
  };
}

const mockBoxer = { id: 'boxer-a', userId: 'user-1', name: 'Test Boxer' };
const mockRequest = {
  id: 'req-1', requesterBoxerId: 'boxer-a', targetBoxerId: 'boxer-b',
  status: 'PENDING', message: null, createdAt: new Date(), updatedAt: new Date(),
};
const mockConnection = { id: 'conn-1', boxerAId: 'boxer-a', boxerBId: 'boxer-b', createdAt: new Date() };

// ============================================================================
// Tests
// ============================================================================

describe('Connection Controller', () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNext = jest.fn();
    (boxerService.getBoxerByUserId as jest.Mock).mockResolvedValue(mockBoxer);
  });

  // --------------------------------------------------------------------------
  // POST /connections
  // --------------------------------------------------------------------------

  describe('sendConnectionRequest', () => {
    it('returns 201 with connectionRequest when valid', async () => {
      (connectionService.sendConnectionRequest as jest.Mock).mockResolvedValue(mockRequest);

      const req = makeReq({ body: { targetBoxerId: 'boxer-b' } });
      const res = makeMockResponse();

      await sendConnectionRequest(req as AuthenticatedUserRequest, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ connectionRequest: mockRequest }) })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns 400 when sending to self', async () => {
      (connectionService.sendConnectionRequest as jest.Mock).mockRejectedValue(
        new BadRequestError('Cannot send a connection request to yourself')
      );

      const req = makeReq({ body: { targetBoxerId: 'boxer-a' } });
      const res = makeMockResponse();

      await sendConnectionRequest(req as AuthenticatedUserRequest, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
    });

    it('returns 401 when boxer profile not found', async () => {
      (boxerService.getBoxerByUserId as jest.Mock).mockResolvedValue(null);

      const req = makeReq({ body: { targetBoxerId: 'boxer-b' } });
      const res = makeMockResponse();

      await sendConnectionRequest(req as AuthenticatedUserRequest, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
  });

  // --------------------------------------------------------------------------
  // GET /connections/status/:boxerId
  // --------------------------------------------------------------------------

  describe('getConnectionStatus', () => {
    it('returns 200 with status none for unconnected boxers', async () => {
      (connectionService.getConnectionStatus as jest.Mock).mockResolvedValue({
        status: 'none', requestId: null, connectionId: null,
      });

      const req = makeReq({ params: { boxerId: 'boxer-b' } });
      const res = makeMockResponse();

      await getConnectionStatus(req as AuthenticatedUserRequest, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'none' }) })
      );
    });

    it('returns 200 with status connected for connected boxers', async () => {
      (connectionService.getConnectionStatus as jest.Mock).mockResolvedValue({
        status: 'connected', requestId: null, connectionId: 'conn-1',
      });

      const req = makeReq({ params: { boxerId: 'boxer-b' } });
      const res = makeMockResponse();

      await getConnectionStatus(req as AuthenticatedUserRequest, res as Response, mockNext);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'connected' }) })
      );
    });
  });

  // --------------------------------------------------------------------------
  // PUT /connections/requests/:id/accept
  // --------------------------------------------------------------------------

  describe('acceptConnectionRequest', () => {
    it('returns 200 and result when acceptance succeeds', async () => {
      (connectionService.acceptConnectionRequest as jest.Mock).mockResolvedValue({
        connectionRequest: { ...mockRequest, status: 'ACCEPTED' },
        connection: mockConnection,
      });

      const req = makeReq({ params: { id: 'req-1' } });
      const res = makeMockResponse();

      await acceptConnectionRequest(req as AuthenticatedUserRequest, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns 403 when non-target boxer tries to accept', async () => {
      (connectionService.acceptConnectionRequest as jest.Mock).mockRejectedValue(
        new ForbiddenError('Not authorised to accept this connection request')
      );

      const req = makeReq({ params: { id: 'req-1' } });
      const res = makeMockResponse();

      await acceptConnectionRequest(req as AuthenticatedUserRequest, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });

  // --------------------------------------------------------------------------
  // PUT /connections/requests/:id/decline
  // --------------------------------------------------------------------------

  describe('declineConnectionRequest', () => {
    it('returns 200 when declined successfully', async () => {
      (connectionService.declineConnectionRequest as jest.Mock).mockResolvedValue({
        ...mockRequest, status: 'DECLINED',
      });

      const req = makeReq({ params: { id: 'req-1' } });
      const res = makeMockResponse();

      await declineConnectionRequest(req as AuthenticatedUserRequest, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // --------------------------------------------------------------------------
  // DELETE /connections/requests/:id
  // --------------------------------------------------------------------------

  describe('cancelConnectionRequest', () => {
    it('returns 204 when cancelled successfully', async () => {
      (connectionService.cancelConnectionRequest as jest.Mock).mockResolvedValue(undefined);

      const req = makeReq({ params: { id: 'req-1' } });
      const res = makeMockResponse();

      await cancelConnectionRequest(req as AuthenticatedUserRequest, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  // --------------------------------------------------------------------------
  // DELETE /connections/:connectionId
  // --------------------------------------------------------------------------

  describe('disconnectBoxers', () => {
    it('returns 204 when disconnected', async () => {
      (connectionService.disconnectBoxers as jest.Mock).mockResolvedValue(undefined);

      const req = makeReq({ params: { connectionId: 'conn-1' } });
      const res = makeMockResponse();

      await disconnectBoxers(req as AuthenticatedUserRequest, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  // --------------------------------------------------------------------------
  // GET /connections
  // --------------------------------------------------------------------------

  describe('getMyConnections', () => {
    it('returns 200 with paginated connections', async () => {
      (connectionService.getConnectionsForBoxer as jest.Mock).mockResolvedValue({
        connections: [], total: 0, page: 1, limit: 20, totalPages: 0,
      });

      const req = makeReq({ query: {} });
      const res = makeMockResponse();

      await getMyConnections(req as AuthenticatedUserRequest, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // --------------------------------------------------------------------------
  // GET /connections/requests
  // --------------------------------------------------------------------------

  describe('getMyConnectionRequests', () => {
    it('returns 200 with paginated requests', async () => {
      (connectionService.getConnectionRequestsForBoxer as jest.Mock).mockResolvedValue({
        requests: [], total: 0, page: 1, limit: 20, totalPages: 0,
      });

      const req = makeReq({ query: { type: 'incoming' } });
      const res = makeMockResponse();

      await getMyConnectionRequests(req as AuthenticatedUserRequest, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
