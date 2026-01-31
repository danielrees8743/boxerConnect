// Match Request Service Unit Tests
// Tests for match request-related business logic

import { MatchRequestStatus, Prisma } from '@prisma/client';
import { createMockBoxer, createMockMatchRequest, createExpiredDate, createFutureDate } from '../utils/testUtils';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the config module before importing the service
jest.mock('../../src/config', () => ({
  prisma: {
    boxer: {
      findUnique: jest.fn(),
    },
    matchRequest: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('../../src/services/boxer.service', () => ({
  getTotalFights: jest.fn((boxer: { wins: number; losses: number; draws: number }) => boxer.wins + boxer.losses + boxer.draws),
}));

jest.mock('../../src/services/matching.service', () => ({
  MATCHING_RULES: {
    maxWeightDifference: 5,
    maxFightsDifference: 3,
  },
}));

// Import after mocking
import * as matchRequestService from '../../src/services/matchRequest.service';
import { prisma } from '../../src/config';

// Get typed references to the mocks
const mockBoxerFindUnique = prisma.boxer.findUnique as jest.Mock;
const mockMatchRequestFindUnique = prisma.matchRequest.findUnique as jest.Mock;
const mockMatchRequestFindFirst = prisma.matchRequest.findFirst as jest.Mock;
const mockMatchRequestFindMany = prisma.matchRequest.findMany as jest.Mock;
const mockMatchRequestCreate = prisma.matchRequest.create as jest.Mock;
const mockMatchRequestUpdate = prisma.matchRequest.update as jest.Mock;
const mockMatchRequestUpdateMany = prisma.matchRequest.updateMany as jest.Mock;
const mockMatchRequestCount = prisma.matchRequest.count as jest.Mock;

// ============================================================================
// Helper Functions
// ============================================================================

function createMockMatchRequestWithBoxers(overrides: any = {}) {
  const mockRequest = createMockMatchRequest(overrides);
  return {
    ...mockRequest,
    requesterBoxer: {
      id: mockRequest.requesterBoxerId,
      name: 'Requester Boxer',
      weightKg: new Prisma.Decimal(75),
      experienceLevel: 'INTERMEDIATE',
      wins: 10,
      losses: 2,
      draws: 1,
      city: 'New York',
      country: 'USA',
      profilePhotoUrl: null,
      user: {
        id: 'requester-user-id',
        name: 'Requester User',
        email: 'requester@example.com',
      },
    },
    targetBoxer: {
      id: mockRequest.targetBoxerId,
      name: 'Target Boxer',
      weightKg: new Prisma.Decimal(76),
      experienceLevel: 'INTERMEDIATE',
      wins: 9,
      losses: 3,
      draws: 0,
      city: 'New York',
      country: 'USA',
      profilePhotoUrl: null,
      user: {
        id: 'target-user-id',
        name: 'Target User',
        email: 'target@example.com',
      },
    },
  };
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Match Request Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // createMatchRequest Tests
  // ==========================================================================

  describe('createMatchRequest', () => {
    const requesterBoxerId = 'requester-boxer-id';
    const targetBoxerId = 'target-boxer-id';
    const createData = {
      message: 'Looking forward to sparring!',
      proposedDate: new Date('2024-06-15'),
      proposedVenue: 'Champion Boxing Gym',
    };

    it('should create match request successfully', async () => {
      const requesterBoxer = createMockBoxer({
        id: requesterBoxerId,
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1,
        isSearchable: true,
      });
      const targetBoxer = createMockBoxer({
        id: targetBoxerId,
        weightKg: new Prisma.Decimal(76),
        wins: 9,
        losses: 3,
        draws: 0,
        isSearchable: true,
      });
      const mockCreatedRequest = createMockMatchRequestWithBoxers({
        requesterBoxerId,
        targetBoxerId,
        ...createData,
      });

      mockBoxerFindUnique.mockResolvedValueOnce(requesterBoxer as any);
      mockBoxerFindUnique.mockResolvedValueOnce(targetBoxer as any);
      mockMatchRequestFindFirst.mockResolvedValue(null);
      mockMatchRequestCreate.mockResolvedValue(mockCreatedRequest as any);

      const result = await matchRequestService.createMatchRequest(
        requesterBoxerId,
        targetBoxerId,
        createData
      );

      expect(result).toBeDefined();
      expect(result.requesterBoxerId).toBe(requesterBoxerId);
      expect(result.targetBoxerId).toBe(targetBoxerId);
    });

    it('should throw error when requesting self', async () => {
      await expect(
        matchRequestService.createMatchRequest(requesterBoxerId, requesterBoxerId, createData)
      ).rejects.toThrow('Cannot send match request to yourself');
    });

    it('should throw error if requester boxer not found', async () => {
      mockBoxerFindUnique.mockResolvedValueOnce(null);
      mockBoxerFindUnique.mockResolvedValueOnce(createMockBoxer() as any);

      await expect(
        matchRequestService.createMatchRequest(requesterBoxerId, targetBoxerId, createData)
      ).rejects.toThrow('Requester boxer not found');
    });

    it('should throw error if target boxer not found', async () => {
      mockBoxerFindUnique.mockResolvedValueOnce(createMockBoxer() as any);
      mockBoxerFindUnique.mockResolvedValueOnce(null);

      await expect(
        matchRequestService.createMatchRequest(requesterBoxerId, targetBoxerId, createData)
      ).rejects.toThrow('Target boxer not found');
    });

    it('should throw error if target is not searchable', async () => {
      const requesterBoxer = createMockBoxer({ isSearchable: true });
      const targetBoxer = createMockBoxer({ isSearchable: false });

      mockBoxerFindUnique.mockResolvedValueOnce(requesterBoxer as any);
      mockBoxerFindUnique.mockResolvedValueOnce(targetBoxer as any);

      await expect(
        matchRequestService.createMatchRequest(requesterBoxerId, targetBoxerId, createData)
      ).rejects.toThrow('Target boxer is not available for matching');
    });

    it('should throw error if weight difference exceeds maximum', async () => {
      const requesterBoxer = createMockBoxer({
        weightKg: new Prisma.Decimal(70),
        wins: 10,
        losses: 2,
        draws: 1,
        isSearchable: true,
      });
      const targetBoxer = createMockBoxer({
        weightKg: new Prisma.Decimal(80), // 10kg difference, exceeds 5kg max
        wins: 10,
        losses: 2,
        draws: 1,
        isSearchable: true,
      });

      mockBoxerFindUnique.mockResolvedValueOnce(requesterBoxer as any);
      mockBoxerFindUnique.mockResolvedValueOnce(targetBoxer as any);

      await expect(
        matchRequestService.createMatchRequest(requesterBoxerId, targetBoxerId, createData)
      ).rejects.toThrow(/Weight difference.*exceeds maximum/);
    });

    it('should allow weight difference at exact boundary (5kg)', async () => {
      const requesterBoxer = createMockBoxer({
        id: requesterBoxerId,
        weightKg: new Prisma.Decimal(70),
        wins: 10,
        losses: 2,
        draws: 1,
        isSearchable: true,
      });
      const targetBoxer = createMockBoxer({
        id: targetBoxerId,
        weightKg: new Prisma.Decimal(75), // Exactly 5kg difference
        wins: 10,
        losses: 2,
        draws: 1,
        isSearchable: true,
      });
      const mockCreatedRequest = createMockMatchRequestWithBoxers({
        requesterBoxerId,
        targetBoxerId,
      });

      mockBoxerFindUnique.mockResolvedValueOnce(requesterBoxer as any);
      mockBoxerFindUnique.mockResolvedValueOnce(targetBoxer as any);
      mockMatchRequestFindFirst.mockResolvedValue(null);
      mockMatchRequestCreate.mockResolvedValue(mockCreatedRequest as any);

      const result = await matchRequestService.createMatchRequest(
        requesterBoxerId,
        targetBoxerId,
        createData
      );

      expect(result).toBeDefined();
    });

    it('should throw error if fights difference exceeds maximum', async () => {
      const requesterBoxer = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1, // Total: 13
        isSearchable: true,
      });
      const targetBoxer = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 20,
        losses: 5,
        draws: 2, // Total: 27, difference of 14
        isSearchable: true,
      });

      mockBoxerFindUnique.mockResolvedValueOnce(requesterBoxer as any);
      mockBoxerFindUnique.mockResolvedValueOnce(targetBoxer as any);

      await expect(
        matchRequestService.createMatchRequest(requesterBoxerId, targetBoxerId, createData)
      ).rejects.toThrow(/Fight experience difference.*exceeds maximum/);
    });

    it('should allow fights difference at exact boundary (3 fights)', async () => {
      const requesterBoxer = createMockBoxer({
        id: requesterBoxerId,
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 0,
        draws: 0, // Total: 10
        isSearchable: true,
      });
      const targetBoxer = createMockBoxer({
        id: targetBoxerId,
        weightKg: new Prisma.Decimal(75),
        wins: 7,
        losses: 0,
        draws: 0, // Total: 7, difference of 3
        isSearchable: true,
      });
      const mockCreatedRequest = createMockMatchRequestWithBoxers({
        requesterBoxerId,
        targetBoxerId,
      });

      mockBoxerFindUnique.mockResolvedValueOnce(requesterBoxer as any);
      mockBoxerFindUnique.mockResolvedValueOnce(targetBoxer as any);
      mockMatchRequestFindFirst.mockResolvedValue(null);
      mockMatchRequestCreate.mockResolvedValue(mockCreatedRequest as any);

      const result = await matchRequestService.createMatchRequest(
        requesterBoxerId,
        targetBoxerId,
        createData
      );

      expect(result).toBeDefined();
    });

    it('should throw error if pending request already exists', async () => {
      const requesterBoxer = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1,
        isSearchable: true,
      });
      const targetBoxer = createMockBoxer({
        weightKg: new Prisma.Decimal(76),
        wins: 9,
        losses: 3,
        draws: 0,
        isSearchable: true,
      });
      const existingRequest = createMockMatchRequest({
        requesterBoxerId,
        targetBoxerId,
        status: MatchRequestStatus.PENDING,
      });

      mockBoxerFindUnique.mockResolvedValueOnce(requesterBoxer as any);
      mockBoxerFindUnique.mockResolvedValueOnce(targetBoxer as any);
      mockMatchRequestFindFirst.mockResolvedValueOnce(existingRequest as any);

      await expect(
        matchRequestService.createMatchRequest(requesterBoxerId, targetBoxerId, createData)
      ).rejects.toThrow('You already have a pending match request to this boxer');
    });

    it('should throw error if reverse pending request exists', async () => {
      const requesterBoxer = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1,
        isSearchable: true,
      });
      const targetBoxer = createMockBoxer({
        weightKg: new Prisma.Decimal(76),
        wins: 9,
        losses: 3,
        draws: 0,
        isSearchable: true,
      });
      const reverseRequest = createMockMatchRequest({
        requesterBoxerId: targetBoxerId,
        targetBoxerId: requesterBoxerId,
        status: MatchRequestStatus.PENDING,
      });

      mockBoxerFindUnique.mockResolvedValueOnce(requesterBoxer as any);
      mockBoxerFindUnique.mockResolvedValueOnce(targetBoxer as any);
      mockMatchRequestFindFirst.mockResolvedValueOnce(null);
      mockMatchRequestFindFirst.mockResolvedValueOnce(reverseRequest as any);

      await expect(
        matchRequestService.createMatchRequest(requesterBoxerId, targetBoxerId, createData)
      ).rejects.toThrow('This boxer has already sent you a match request');
    });

    it('should create request without optional fields', async () => {
      const requesterBoxer = createMockBoxer({
        id: requesterBoxerId,
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1,
        isSearchable: true,
      });
      const targetBoxer = createMockBoxer({
        id: targetBoxerId,
        weightKg: new Prisma.Decimal(76),
        wins: 9,
        losses: 3,
        draws: 0,
        isSearchable: true,
      });
      const mockCreatedRequest = createMockMatchRequestWithBoxers({
        requesterBoxerId,
        targetBoxerId,
      });

      mockBoxerFindUnique.mockResolvedValueOnce(requesterBoxer as any);
      mockBoxerFindUnique.mockResolvedValueOnce(targetBoxer as any);
      mockMatchRequestFindFirst.mockResolvedValue(null);
      mockMatchRequestCreate.mockResolvedValue(mockCreatedRequest as any);

      await matchRequestService.createMatchRequest(requesterBoxerId, targetBoxerId, {});

      expect(mockMatchRequestCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requesterBoxerId,
            targetBoxerId,
            status: MatchRequestStatus.PENDING,
          }),
        })
      );
    });

    it('should set expiration date 7 days from now', async () => {
      const requesterBoxer = createMockBoxer({
        id: requesterBoxerId,
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1,
        isSearchable: true,
      });
      const targetBoxer = createMockBoxer({
        id: targetBoxerId,
        weightKg: new Prisma.Decimal(76),
        wins: 9,
        losses: 3,
        draws: 0,
        isSearchable: true,
      });
      const mockCreatedRequest = createMockMatchRequestWithBoxers({
        requesterBoxerId,
        targetBoxerId,
      });

      mockBoxerFindUnique.mockResolvedValueOnce(requesterBoxer as any);
      mockBoxerFindUnique.mockResolvedValueOnce(targetBoxer as any);
      mockMatchRequestFindFirst.mockResolvedValue(null);
      mockMatchRequestCreate.mockResolvedValue(mockCreatedRequest as any);

      await matchRequestService.createMatchRequest(requesterBoxerId, targetBoxerId, createData);

      expect(mockMatchRequestCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: expect.any(Date),
          }),
        })
      );
    });
  });

  // ==========================================================================
  // getMatchRequestById Tests
  // ==========================================================================

  describe('getMatchRequestById', () => {
    it('should return match request with boxer details', async () => {
      const requestId = 'test-request-id';
      const mockRequest = createMockMatchRequestWithBoxers({ id: requestId });

      mockMatchRequestFindUnique.mockResolvedValue(mockRequest as any);

      const result = await matchRequestService.getMatchRequestById(requestId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(requestId);
      expect(result?.requesterBoxer).toBeDefined();
      expect(result?.targetBoxer).toBeDefined();
    });

    it('should return null for non-existent request', async () => {
      mockMatchRequestFindUnique.mockResolvedValue(null);

      const result = await matchRequestService.getMatchRequestById('non-existent');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // acceptMatchRequest Tests
  // ==========================================================================

  describe('acceptMatchRequest', () => {
    const requestId = 'test-request-id';
    const targetBoxerId = 'target-boxer-id';

    it('should accept pending request successfully', async () => {
      const pendingRequest = createMockMatchRequest({
        id: requestId,
        targetBoxerId,
        status: MatchRequestStatus.PENDING,
        expiresAt: createFutureDate(7),
      });
      const acceptedRequest = createMockMatchRequestWithBoxers({
        ...pendingRequest,
        status: MatchRequestStatus.ACCEPTED,
      });

      mockMatchRequestFindUnique.mockResolvedValueOnce(pendingRequest as any);
      mockMatchRequestUpdate.mockResolvedValue(acceptedRequest as any);

      const result = await matchRequestService.acceptMatchRequest(requestId, targetBoxerId);

      expect(result.status).toBe(MatchRequestStatus.ACCEPTED);
    });

    it('should include response message when provided', async () => {
      const pendingRequest = createMockMatchRequest({
        id: requestId,
        targetBoxerId,
        status: MatchRequestStatus.PENDING,
        expiresAt: createFutureDate(7),
      });
      const acceptedRequest = createMockMatchRequestWithBoxers({
        ...pendingRequest,
        status: MatchRequestStatus.ACCEPTED,
        responseMessage: 'Great, see you there!',
      });

      mockMatchRequestFindUnique.mockResolvedValueOnce(pendingRequest as any);
      mockMatchRequestUpdate.mockResolvedValue(acceptedRequest as any);

      await matchRequestService.acceptMatchRequest(
        requestId,
        targetBoxerId,
        'Great, see you there!'
      );

      expect(mockMatchRequestUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: MatchRequestStatus.ACCEPTED,
            responseMessage: 'Great, see you there!',
          }),
        })
      );
    });

    it('should throw error if request not found', async () => {
      mockMatchRequestFindUnique.mockResolvedValue(null);

      await expect(
        matchRequestService.acceptMatchRequest(requestId, targetBoxerId)
      ).rejects.toThrow('Match request not found');
    });

    it('should throw error if user is not target boxer', async () => {
      const pendingRequest = createMockMatchRequest({
        id: requestId,
        targetBoxerId: 'different-boxer-id',
        status: MatchRequestStatus.PENDING,
      });

      mockMatchRequestFindUnique.mockResolvedValue(pendingRequest as any);

      await expect(
        matchRequestService.acceptMatchRequest(requestId, targetBoxerId)
      ).rejects.toThrow('Not authorized to accept this match request');
    });

    it('should throw error if request is not pending', async () => {
      const acceptedRequest = createMockMatchRequest({
        id: requestId,
        targetBoxerId,
        status: MatchRequestStatus.ACCEPTED,
      });

      mockMatchRequestFindUnique.mockResolvedValue(acceptedRequest as any);

      await expect(
        matchRequestService.acceptMatchRequest(requestId, targetBoxerId)
      ).rejects.toThrow('Cannot accept a match request that is accepted');
    });

    it('should throw error and update status if request has expired', async () => {
      const expiredRequest = createMockMatchRequest({
        id: requestId,
        targetBoxerId,
        status: MatchRequestStatus.PENDING,
        expiresAt: createExpiredDate(),
      });

      mockMatchRequestFindUnique.mockResolvedValue(expiredRequest as any);
      mockMatchRequestUpdate.mockResolvedValue({
        ...expiredRequest,
        status: MatchRequestStatus.EXPIRED,
      } as any);

      await expect(
        matchRequestService.acceptMatchRequest(requestId, targetBoxerId)
      ).rejects.toThrow('This match request has expired');

      expect(mockMatchRequestUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: MatchRequestStatus.EXPIRED },
        })
      );
    });
  });

  // ==========================================================================
  // declineMatchRequest Tests
  // ==========================================================================

  describe('declineMatchRequest', () => {
    const requestId = 'test-request-id';
    const targetBoxerId = 'target-boxer-id';

    it('should decline pending request successfully', async () => {
      const pendingRequest = createMockMatchRequest({
        id: requestId,
        targetBoxerId,
        status: MatchRequestStatus.PENDING,
      });
      const declinedRequest = createMockMatchRequestWithBoxers({
        ...pendingRequest,
        status: MatchRequestStatus.DECLINED,
      });

      mockMatchRequestFindUnique.mockResolvedValue(pendingRequest as any);
      mockMatchRequestUpdate.mockResolvedValue(declinedRequest as any);

      const result = await matchRequestService.declineMatchRequest(requestId, targetBoxerId);

      expect(result.status).toBe(MatchRequestStatus.DECLINED);
    });

    it('should include response message when provided', async () => {
      const pendingRequest = createMockMatchRequest({
        id: requestId,
        targetBoxerId,
        status: MatchRequestStatus.PENDING,
      });
      const declinedRequest = createMockMatchRequestWithBoxers({
        ...pendingRequest,
        status: MatchRequestStatus.DECLINED,
        responseMessage: 'Not available at that time',
      });

      mockMatchRequestFindUnique.mockResolvedValue(pendingRequest as any);
      mockMatchRequestUpdate.mockResolvedValue(declinedRequest as any);

      await matchRequestService.declineMatchRequest(
        requestId,
        targetBoxerId,
        'Not available at that time'
      );

      expect(mockMatchRequestUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: MatchRequestStatus.DECLINED,
            responseMessage: 'Not available at that time',
          }),
        })
      );
    });

    it('should throw error if request not found', async () => {
      mockMatchRequestFindUnique.mockResolvedValue(null);

      await expect(
        matchRequestService.declineMatchRequest(requestId, targetBoxerId)
      ).rejects.toThrow('Match request not found');
    });

    it('should throw error if user is not target boxer', async () => {
      const pendingRequest = createMockMatchRequest({
        id: requestId,
        targetBoxerId: 'different-boxer-id',
        status: MatchRequestStatus.PENDING,
      });

      mockMatchRequestFindUnique.mockResolvedValue(pendingRequest as any);

      await expect(
        matchRequestService.declineMatchRequest(requestId, targetBoxerId)
      ).rejects.toThrow('Not authorized to decline this match request');
    });

    it('should throw error if request is not pending', async () => {
      const cancelledRequest = createMockMatchRequest({
        id: requestId,
        targetBoxerId,
        status: MatchRequestStatus.CANCELLED,
      });

      mockMatchRequestFindUnique.mockResolvedValue(cancelledRequest as any);

      await expect(
        matchRequestService.declineMatchRequest(requestId, targetBoxerId)
      ).rejects.toThrow('Cannot decline a match request that is cancelled');
    });
  });

  // ==========================================================================
  // cancelMatchRequest Tests
  // ==========================================================================

  describe('cancelMatchRequest', () => {
    const requestId = 'test-request-id';
    const requesterBoxerId = 'requester-boxer-id';

    it('should cancel pending request successfully', async () => {
      const pendingRequest = createMockMatchRequest({
        id: requestId,
        requesterBoxerId,
        status: MatchRequestStatus.PENDING,
      });
      const cancelledRequest = createMockMatchRequestWithBoxers({
        ...pendingRequest,
        status: MatchRequestStatus.CANCELLED,
      });

      mockMatchRequestFindUnique.mockResolvedValue(pendingRequest as any);
      mockMatchRequestUpdate.mockResolvedValue(cancelledRequest as any);

      const result = await matchRequestService.cancelMatchRequest(requestId, requesterBoxerId);

      expect(result.status).toBe(MatchRequestStatus.CANCELLED);
    });

    it('should throw error if request not found', async () => {
      mockMatchRequestFindUnique.mockResolvedValue(null);

      await expect(
        matchRequestService.cancelMatchRequest(requestId, requesterBoxerId)
      ).rejects.toThrow('Match request not found');
    });

    it('should throw error if user is not requester boxer', async () => {
      const pendingRequest = createMockMatchRequest({
        id: requestId,
        requesterBoxerId: 'different-boxer-id',
        status: MatchRequestStatus.PENDING,
      });

      mockMatchRequestFindUnique.mockResolvedValue(pendingRequest as any);

      await expect(
        matchRequestService.cancelMatchRequest(requestId, requesterBoxerId)
      ).rejects.toThrow('Not authorized to cancel this match request');
    });

    it('should throw error if request is not pending', async () => {
      const acceptedRequest = createMockMatchRequest({
        id: requestId,
        requesterBoxerId,
        status: MatchRequestStatus.ACCEPTED,
      });

      mockMatchRequestFindUnique.mockResolvedValue(acceptedRequest as any);

      await expect(
        matchRequestService.cancelMatchRequest(requestId, requesterBoxerId)
      ).rejects.toThrow('Cannot cancel a match request that is accepted');
    });
  });

  // ==========================================================================
  // expireOldRequests Tests
  // ==========================================================================

  describe('expireOldRequests', () => {
    it('should update expired pending requests', async () => {
      mockMatchRequestUpdateMany.mockResolvedValue({ count: 5 });

      const result = await matchRequestService.expireOldRequests();

      expect(result).toBe(5);
      expect(mockMatchRequestUpdateMany).toHaveBeenCalledWith({
        where: {
          status: MatchRequestStatus.PENDING,
          expiresAt: {
            lt: expect.any(Date),
          },
        },
        data: {
          status: MatchRequestStatus.EXPIRED,
        },
      });
    });

    it('should return 0 when no requests to expire', async () => {
      mockMatchRequestUpdateMany.mockResolvedValue({ count: 0 });

      const result = await matchRequestService.expireOldRequests();

      expect(result).toBe(0);
    });
  });

  // ==========================================================================
  // getMatchRequestsForBoxer Tests
  // ==========================================================================

  describe('getMatchRequestsForBoxer', () => {
    const boxerId = 'test-boxer-id';

    it('should return incoming requests with pagination', async () => {
      const mockRequests = [
        createMockMatchRequestWithBoxers({ targetBoxerId: boxerId }),
        createMockMatchRequestWithBoxers({ targetBoxerId: boxerId }),
      ];

      mockMatchRequestFindMany.mockResolvedValue(mockRequests as any);
      mockMatchRequestCount.mockResolvedValue(2);

      const result = await matchRequestService.getMatchRequestsForBoxer(boxerId, 'incoming', {
        page: 1,
        limit: 20,
      });

      expect(result.matchRequests).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should return outgoing requests with pagination', async () => {
      const mockRequests = [
        createMockMatchRequestWithBoxers({ requesterBoxerId: boxerId }),
      ];

      mockMatchRequestFindMany.mockResolvedValue(mockRequests as any);
      mockMatchRequestCount.mockResolvedValue(1);

      await matchRequestService.getMatchRequestsForBoxer(boxerId, 'outgoing', {
        page: 1,
        limit: 20,
      });

      expect(mockMatchRequestFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            requesterBoxerId: boxerId,
          }),
        })
      );
    });

    it('should filter by status when provided', async () => {
      mockMatchRequestFindMany.mockResolvedValue([]);
      mockMatchRequestCount.mockResolvedValue(0);

      await matchRequestService.getMatchRequestsForBoxer(boxerId, 'incoming', {
        status: MatchRequestStatus.PENDING,
        page: 1,
        limit: 20,
      });

      expect(mockMatchRequestFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: MatchRequestStatus.PENDING,
          }),
        })
      );
    });

    it('should calculate pagination correctly', async () => {
      mockMatchRequestFindMany.mockResolvedValue([]);
      mockMatchRequestCount.mockResolvedValue(50);

      const result = await matchRequestService.getMatchRequestsForBoxer(boxerId, 'incoming', {
        page: 3,
        limit: 10,
      });

      expect(result.totalPages).toBe(5);
      expect(mockMatchRequestFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3 - 1) * 10
          take: 10,
        })
      );
    });

    it('should order by creation date descending', async () => {
      mockMatchRequestFindMany.mockResolvedValue([]);
      mockMatchRequestCount.mockResolvedValue(0);

      await matchRequestService.getMatchRequestsForBoxer(boxerId, 'incoming', {
        page: 1,
        limit: 20,
      });

      expect(mockMatchRequestFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  // ==========================================================================
  // getRequestStats Tests
  // ==========================================================================

  describe('getRequestStats', () => {
    const boxerId = 'test-boxer-id';

    it('should return stats for incoming and outgoing requests', async () => {
      // Mock counts for all 12 queries
      mockMatchRequestCount
        .mockResolvedValueOnce(5)   // incoming pending
        .mockResolvedValueOnce(3)   // incoming accepted
        .mockResolvedValueOnce(2)   // incoming declined
        .mockResolvedValueOnce(1)   // incoming cancelled
        .mockResolvedValueOnce(0)   // incoming expired
        .mockResolvedValueOnce(11)  // incoming total
        .mockResolvedValueOnce(4)   // outgoing pending
        .mockResolvedValueOnce(2)   // outgoing accepted
        .mockResolvedValueOnce(1)   // outgoing declined
        .mockResolvedValueOnce(0)   // outgoing cancelled
        .mockResolvedValueOnce(1)   // outgoing expired
        .mockResolvedValueOnce(8);  // outgoing total

      const result = await matchRequestService.getRequestStats(boxerId);

      expect(result.incoming).toEqual({
        pending: 5,
        accepted: 3,
        declined: 2,
        cancelled: 1,
        expired: 0,
        total: 11,
      });
      expect(result.outgoing).toEqual({
        pending: 4,
        accepted: 2,
        declined: 1,
        cancelled: 0,
        expired: 1,
        total: 8,
      });
    });

    it('should return zeros when no requests exist', async () => {
      mockMatchRequestCount.mockResolvedValue(0);

      const result = await matchRequestService.getRequestStats(boxerId);

      expect(result.incoming.total).toBe(0);
      expect(result.outgoing.total).toBe(0);
    });
  });
});
