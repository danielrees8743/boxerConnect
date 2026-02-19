// Connection Service Unit Tests

jest.mock('../../src/config', () => ({
  prisma: {
    boxer: {
      findUnique: jest.fn(),
    },
    connection: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    connectionRequest: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { prisma } from '../../src/config';
import {
  sendConnectionRequest,
  acceptConnectionRequest,
  declineConnectionRequest,
  cancelConnectionRequest,
  getConnectionStatus,
  getConnectionsForBoxer,
} from '../../src/services/connection.service';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../src/middleware';

const mockBoxerFindUnique = prisma.boxer.findUnique as jest.Mock;
const mockConnectionFindUnique = prisma.connection.findUnique as jest.Mock;
const mockConnectionRequestFindUnique = prisma.connectionRequest.findUnique as jest.Mock;
const mockConnectionRequestFindFirst = prisma.connectionRequest.findFirst as jest.Mock;
const mockConnectionRequestCreate = prisma.connectionRequest.create as jest.Mock;
const mockConnectionRequestUpdate = prisma.connectionRequest.update as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

// ============================================================================
// Helpers
// ============================================================================

const mkBoxer = (id: string) => ({
  id,
  name: 'Test Boxer',
  profilePhotoUrl: null,
  experienceLevel: 'BEGINNER',
  city: null,
  country: null,
  wins: 0,
  losses: 0,
  draws: 0,
  user: { id: `user-${id}`, name: 'Test' },
});

const mkRequest = (overrides: any = {}) => ({
  id: 'req-1',
  requesterBoxerId: 'boxer-a',
  targetBoxerId: 'boxer-b',
  status: 'PENDING',
  message: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  requesterBoxer: mkBoxer('boxer-a'),
  targetBoxer: mkBoxer('boxer-b'),
  ...overrides,
});

const mkConnection = () => ({
  id: 'conn-1',
  boxerAId: 'boxer-a',
  boxerBId: 'boxer-b',
  createdAt: new Date(),
});

// ============================================================================
// Tests
// ============================================================================

describe('Connection Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // sendConnectionRequest
  // --------------------------------------------------------------------------

  describe('sendConnectionRequest', () => {
    it('creates a connection request successfully', async () => {
      mockBoxerFindUnique.mockResolvedValue(mkBoxer('boxer-b'));
      mockConnectionFindUnique.mockResolvedValue(null);
      mockConnectionRequestFindFirst.mockResolvedValue(null);
      mockConnectionRequestCreate.mockResolvedValue(mkRequest());

      const result = await sendConnectionRequest('boxer-a', 'boxer-b');
      expect(result.status).toBe('PENDING');
      expect(mockConnectionRequestCreate).toHaveBeenCalledTimes(1);
    });

    it('throws BadRequestError when sending to self', async () => {
      await expect(sendConnectionRequest('boxer-a', 'boxer-a')).rejects.toThrow(BadRequestError);
    });

    it('throws NotFoundError when target boxer not found', async () => {
      mockBoxerFindUnique.mockResolvedValue(null);
      await expect(sendConnectionRequest('boxer-a', 'boxer-b')).rejects.toThrow(NotFoundError);
    });

    it('throws BadRequestError when already connected', async () => {
      mockBoxerFindUnique.mockResolvedValue(mkBoxer('boxer-b'));
      mockConnectionFindUnique.mockResolvedValue(mkConnection());
      await expect(sendConnectionRequest('boxer-a', 'boxer-b')).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when pending request already exists', async () => {
      mockBoxerFindUnique.mockResolvedValue(mkBoxer('boxer-b'));
      mockConnectionFindUnique.mockResolvedValue(null);
      mockConnectionRequestFindFirst.mockResolvedValueOnce(mkRequest());
      await expect(sendConnectionRequest('boxer-a', 'boxer-b')).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when reverse pending request exists', async () => {
      mockBoxerFindUnique.mockResolvedValue(mkBoxer('boxer-b'));
      mockConnectionFindUnique.mockResolvedValue(null);
      mockConnectionRequestFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mkRequest({ requesterBoxerId: 'boxer-b', targetBoxerId: 'boxer-a' }));
      await expect(sendConnectionRequest('boxer-a', 'boxer-b')).rejects.toThrow(BadRequestError);
    });
  });

  // --------------------------------------------------------------------------
  // acceptConnectionRequest
  // --------------------------------------------------------------------------

  describe('acceptConnectionRequest', () => {
    it('accepts and creates a Connection in a transaction', async () => {
      mockConnectionRequestFindUnique.mockResolvedValue(mkRequest());
      mockTransaction.mockResolvedValue([
        mkRequest({ status: 'ACCEPTED' }),
        mkConnection(),
      ]);

      const result = await acceptConnectionRequest('req-1', 'boxer-b');
      expect(result.connectionRequest.status).toBe('ACCEPTED');
      expect(result.connection).toBeDefined();
    });

    it('throws NotFoundError when request not found', async () => {
      mockConnectionRequestFindUnique.mockResolvedValue(null);
      await expect(acceptConnectionRequest('req-1', 'boxer-b')).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError when non-target boxer tries to accept', async () => {
      mockConnectionRequestFindUnique.mockResolvedValue(mkRequest());
      await expect(acceptConnectionRequest('req-1', 'boxer-x')).rejects.toThrow(ForbiddenError);
    });

    it('throws BadRequestError when request is not PENDING', async () => {
      mockConnectionRequestFindUnique.mockResolvedValue(mkRequest({ status: 'ACCEPTED' }));
      await expect(acceptConnectionRequest('req-1', 'boxer-b')).rejects.toThrow(BadRequestError);
    });
  });

  // --------------------------------------------------------------------------
  // declineConnectionRequest
  // --------------------------------------------------------------------------

  describe('declineConnectionRequest', () => {
    it('declines successfully when target boxer declines', async () => {
      mockConnectionRequestFindUnique.mockResolvedValue(mkRequest());
      mockConnectionRequestUpdate.mockResolvedValue(mkRequest({ status: 'DECLINED' }));

      const result = await declineConnectionRequest('req-1', 'boxer-b');
      expect(result.status).toBe('DECLINED');
    });

    it('throws NotFoundError when request not found', async () => {
      mockConnectionRequestFindUnique.mockResolvedValue(null);
      await expect(declineConnectionRequest('req-1', 'boxer-b')).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError when wrong boxer tries to decline', async () => {
      mockConnectionRequestFindUnique.mockResolvedValue(mkRequest());
      await expect(declineConnectionRequest('req-1', 'boxer-a')).rejects.toThrow(ForbiddenError);
    });

    it('throws BadRequestError when request is not PENDING', async () => {
      mockConnectionRequestFindUnique.mockResolvedValue(mkRequest({ status: 'DECLINED' }));
      await expect(declineConnectionRequest('req-1', 'boxer-b')).rejects.toThrow(BadRequestError);
    });
  });

  // --------------------------------------------------------------------------
  // cancelConnectionRequest
  // --------------------------------------------------------------------------

  describe('cancelConnectionRequest', () => {
    it('cancels when requester cancels', async () => {
      mockConnectionRequestFindUnique.mockResolvedValue(mkRequest());
      mockConnectionRequestUpdate.mockResolvedValue(mkRequest({ status: 'CANCELLED' }));

      await cancelConnectionRequest('req-1', 'boxer-a');
      expect(mockConnectionRequestUpdate).toHaveBeenCalled();
    });

    it('throws NotFoundError when request not found', async () => {
      mockConnectionRequestFindUnique.mockResolvedValue(null);
      await expect(cancelConnectionRequest('req-1', 'boxer-a')).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError when target tries to cancel', async () => {
      mockConnectionRequestFindUnique.mockResolvedValue(mkRequest());
      await expect(cancelConnectionRequest('req-1', 'boxer-b')).rejects.toThrow(ForbiddenError);
    });

    it('throws BadRequestError when request is not PENDING', async () => {
      mockConnectionRequestFindUnique.mockResolvedValue(mkRequest({ status: 'CANCELLED' }));
      await expect(cancelConnectionRequest('req-1', 'boxer-a')).rejects.toThrow(BadRequestError);
    });
  });

  // --------------------------------------------------------------------------
  // getConnectionStatus
  // --------------------------------------------------------------------------

  describe('getConnectionStatus', () => {
    it('returns "connected" when Connection row exists', async () => {
      mockConnectionFindUnique.mockResolvedValue(mkConnection());
      mockConnectionRequestFindFirst.mockResolvedValue(null);

      const result = await getConnectionStatus('boxer-a', 'boxer-b');
      expect(result.status).toBe('connected');
    });

    it('returns "pending_sent" when outgoing PENDING request exists', async () => {
      mockConnectionFindUnique.mockResolvedValue(null);
      mockConnectionRequestFindFirst
        .mockResolvedValueOnce(mkRequest())
        .mockResolvedValueOnce(null);

      const result = await getConnectionStatus('boxer-a', 'boxer-b');
      expect(result.status).toBe('pending_sent');
    });

    it('returns "pending_received" when incoming PENDING request exists', async () => {
      mockConnectionFindUnique.mockResolvedValue(null);
      mockConnectionRequestFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mkRequest({ requesterBoxerId: 'boxer-b', targetBoxerId: 'boxer-a' }));

      const result = await getConnectionStatus('boxer-a', 'boxer-b');
      expect(result.status).toBe('pending_received');
    });

    it('returns "none" when no relationship exists', async () => {
      mockConnectionFindUnique.mockResolvedValue(null);
      mockConnectionRequestFindFirst.mockResolvedValue(null);

      const result = await getConnectionStatus('boxer-a', 'boxer-b');
      expect(result.status).toBe('none');
    });
  });
});
