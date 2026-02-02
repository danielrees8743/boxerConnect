// Club Membership Request Service Unit Tests
// Tests for membership request business logic

import { MembershipRequestStatus } from '@prisma/client';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the config module before importing the service
jest.mock('../../src/config', () => ({
  prisma: {
    club: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    clubMembershipRequest: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    boxer: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock club service
jest.mock('../../src/services/club.service', () => ({
  isClubOwner: jest.fn(),
}));

// Mock database context
jest.mock('../../src/utils/database-context', () => ({
  withUserContext: jest.fn((userId, role, operation) => {
    // For tests, directly execute the operation with a mock transaction client
    const mockTx = {
      clubMembershipRequest: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        upsert: jest.fn(),
      },
      boxer: {
        update: jest.fn(),
      },
    };
    return operation(mockTx);
  }),
}));

// Import after mocking
import * as membershipService from '../../src/services/clubMembershipRequest.service';
import { prisma } from '../../src/config';
import { isClubOwner } from '../../src/services/club.service';

// Get typed references to the mocks
const mockClubFindMany = prisma.club.findMany as jest.Mock;
const mockClubFindUnique = prisma.club.findUnique as jest.Mock;
const mockRequestFindMany = prisma.clubMembershipRequest.findMany as jest.Mock;
const mockRequestFindUnique = prisma.clubMembershipRequest.findUnique as jest.Mock;
const mockIsClubOwner = isClubOwner as jest.Mock;

// ============================================================================
// Test Suites
// ============================================================================

describe('Club Membership Request Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // getPendingRequestsForGymOwner Tests
  // ==========================================================================

  describe('getPendingRequestsForGymOwner', () => {
    const gymOwnerId = 'gym-owner-id';
    const clubId1 = 'club-id-1';
    const clubId2 = 'club-id-2';

    const mockClubs = [
      { id: clubId1 },
      { id: clubId2 },
    ];

    const mockRequests = [
      {
        id: 'request-1',
        userId: 'user-1',
        clubId: clubId1,
        status: MembershipRequestStatus.PENDING,
        requestedAt: new Date('2024-01-01'),
        reviewedAt: null,
        reviewedBy: null,
        notes: null,
        user: {
          id: 'user-1',
          email: 'boxer1@example.com',
          name: 'Boxer One',
        },
        club: {
          id: clubId1,
          name: 'Test Club 1',
        },
      },
      {
        id: 'request-2',
        userId: 'user-2',
        clubId: clubId2,
        status: MembershipRequestStatus.PENDING,
        requestedAt: new Date('2024-01-02'),
        reviewedAt: null,
        reviewedBy: null,
        notes: null,
        user: {
          id: 'user-2',
          email: 'boxer2@example.com',
          name: 'Boxer Two',
        },
        club: {
          id: clubId2,
          name: 'Test Club 2',
        },
      },
    ];

    it('should return pending requests for gym owner\'s clubs', async () => {
      mockClubFindMany.mockResolvedValue(mockClubs);
      mockRequestFindMany.mockResolvedValue(mockRequests);

      const result = await membershipService.getPendingRequestsForGymOwner(gymOwnerId);

      expect(mockClubFindMany).toHaveBeenCalledWith({
        where: { ownerId: gymOwnerId },
        select: { id: true },
      });

      expect(mockRequestFindMany).toHaveBeenCalledWith({
        where: {
          clubId: { in: [clubId1, clubId2] },
          status: MembershipRequestStatus.PENDING,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          club: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          requestedAt: 'desc',
        },
      });

      expect(result).toEqual(mockRequests);
      expect(result).toHaveLength(2);
    });

    it('should return empty array if gym owner has no clubs', async () => {
      mockClubFindMany.mockResolvedValue([]);

      const result = await membershipService.getPendingRequestsForGymOwner(gymOwnerId);

      expect(result).toEqual([]);
      expect(mockRequestFindMany).not.toHaveBeenCalled();
    });

    it('should return empty array if no pending requests exist', async () => {
      mockClubFindMany.mockResolvedValue(mockClubs);
      mockRequestFindMany.mockResolvedValue([]);

      const result = await membershipService.getPendingRequestsForGymOwner(gymOwnerId);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // createMembershipRequest Tests
  // ==========================================================================

  describe('createMembershipRequest', () => {
    const userId = 'boxer-user-id';
    const clubId = 'club-id';

    const mockClub = {
      id: clubId,
      name: 'Test Boxing Club',
    };

    const mockRequest = {
      id: 'request-id',
      userId,
      clubId,
      status: MembershipRequestStatus.PENDING,
      requestedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      notes: null,
    };

    it('should create a new membership request', async () => {
      mockClubFindUnique.mockResolvedValue(mockClub);

      const { withUserContext } = require('../../src/utils/database-context');
      const mockTx = {
        clubMembershipRequest: {
          upsert: jest.fn().mockResolvedValue(mockRequest),
        },
      };
      withUserContext.mockImplementation(
        (_userId: string, _role: string, operation: any) => operation(mockTx)
      );

      const result = await membershipService.createMembershipRequest(userId, clubId);

      expect(mockClubFindUnique).toHaveBeenCalledWith({
        where: { id: clubId },
      });

      expect(mockTx.clubMembershipRequest.upsert).toHaveBeenCalledWith({
        where: {
          userId_clubId: {
            userId,
            clubId,
          },
        },
        update: {
          status: MembershipRequestStatus.PENDING,
          requestedAt: expect.any(Date),
          reviewedAt: null,
          reviewedBy: null,
          notes: null,
        },
        create: {
          userId,
          clubId,
          status: MembershipRequestStatus.PENDING,
        },
      });

      expect(result).toEqual(mockRequest);
    });

    it('should return existing pending request instead of creating duplicate', async () => {
      mockClubFindUnique.mockResolvedValue(mockClub);

      const existingRequest = {
        ...mockRequest,
        status: MembershipRequestStatus.PENDING,
      };

      const { withUserContext } = require('../../src/utils/database-context');
      const mockTx = {
        clubMembershipRequest: {
          upsert: jest.fn().mockResolvedValue(existingRequest),
        },
      };
      withUserContext.mockImplementation(
        (_userId: string, _role: string, operation: any) => operation(mockTx)
      );

      const result = await membershipService.createMembershipRequest(userId, clubId);

      expect(mockTx.clubMembershipRequest.upsert).toHaveBeenCalled();
      expect(result).toEqual(existingRequest);
    });

    it('should create new request if old one was rejected', async () => {
      mockClubFindUnique.mockResolvedValue(mockClub);

      const rejectedRequest = {
        ...mockRequest,
        id: 'old-request-id',
        status: MembershipRequestStatus.REJECTED,
      };

      const newRequest = {
        ...mockRequest,
        status: MembershipRequestStatus.PENDING,
      };

      const { withUserContext } = require('../../src/utils/database-context');
      const mockTx = {
        clubMembershipRequest: {
          upsert: jest.fn().mockResolvedValue(newRequest),
        },
      };
      withUserContext.mockImplementation(
        (_userId: string, _role: string, operation: any) => operation(mockTx)
      );

      const result = await membershipService.createMembershipRequest(userId, clubId);

      expect(mockTx.clubMembershipRequest.upsert).toHaveBeenCalledWith({
        where: {
          userId_clubId: {
            userId,
            clubId,
          },
        },
        update: {
          status: MembershipRequestStatus.PENDING,
          requestedAt: expect.any(Date),
          reviewedAt: null,
          reviewedBy: null,
          notes: null,
        },
        create: {
          userId,
          clubId,
          status: MembershipRequestStatus.PENDING,
        },
      });

      expect(result).toEqual(newRequest);
    });

    it('should throw error if club does not exist', async () => {
      mockClubFindUnique.mockResolvedValue(null);

      await expect(
        membershipService.createMembershipRequest(userId, clubId)
      ).rejects.toThrow('Club not found');
    });
  });

  // ==========================================================================
  // approveRequest Tests
  // ==========================================================================

  describe('approveRequest', () => {
    const requestId = 'request-id';
    const gymOwnerId = 'gym-owner-id';
    const clubId = 'club-id';
    const userId = 'user-id';
    const boxerId = 'boxer-id';

    const mockRequest = {
      id: requestId,
      userId,
      clubId,
      status: MembershipRequestStatus.PENDING,
      requestedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      notes: null,
      club: {
        id: clubId,
        name: 'Test Boxing Club',
      },
      user: {
        id: userId,
        email: 'boxer@example.com',
        name: 'Test Boxer',
        boxer: {
          id: boxerId,
          userId,
          clubId: null,
        },
      },
    };

    const mockUpdatedBoxer = {
      id: boxerId,
      userId,
      clubId,
      gymAffiliation: 'Test Boxing Club',
    };

    it('should approve request and update boxer profile', async () => {
      mockRequestFindUnique.mockResolvedValue(mockRequest);
      mockIsClubOwner.mockResolvedValue(true);

      const { withUserContext } = require('../../src/utils/database-context');
      const mockTx = {
        boxer: {
          update: jest.fn().mockResolvedValue(mockUpdatedBoxer),
        },
        clubMembershipRequest: {
          update: jest.fn(),
        },
      };
      withUserContext.mockImplementation(
        (_userId: string, _role: string, operation: any) => operation(mockTx)
      );

      const result = await membershipService.approveRequest(requestId, gymOwnerId);

      expect(mockIsClubOwner).toHaveBeenCalledWith(gymOwnerId, clubId);

      expect(mockTx.boxer.update).toHaveBeenCalledWith({
        where: { id: boxerId },
        data: {
          clubId,
          gymAffiliation: 'Test Boxing Club',
        },
      });

      expect(mockTx.clubMembershipRequest.update).toHaveBeenCalledWith({
        where: { id: requestId },
        data: {
          status: MembershipRequestStatus.APPROVED,
          reviewedAt: expect.any(Date),
          reviewedBy: gymOwnerId,
        },
      });

      expect(result).toEqual(mockUpdatedBoxer);
    });

    it('should throw error if request not found', async () => {
      mockRequestFindUnique.mockResolvedValue(null);

      await expect(
        membershipService.approveRequest(requestId, gymOwnerId)
      ).rejects.toThrow('Membership request not found');
    });

    it('should throw error if gym owner does not own the club', async () => {
      mockRequestFindUnique.mockResolvedValue(mockRequest);
      mockIsClubOwner.mockResolvedValue(false);

      await expect(
        membershipService.approveRequest(requestId, gymOwnerId)
      ).rejects.toThrow('Not authorized to approve requests for this club');
    });

    it('should throw error if request is not pending', async () => {
      const approvedRequest = {
        ...mockRequest,
        status: MembershipRequestStatus.APPROVED,
      };
      mockRequestFindUnique.mockResolvedValue(approvedRequest);
      mockIsClubOwner.mockResolvedValue(true);

      await expect(
        membershipService.approveRequest(requestId, gymOwnerId)
      ).rejects.toThrow('Request has already been processed');
    });

    it('should throw error if user does not have boxer profile', async () => {
      const requestWithoutBoxer = {
        ...mockRequest,
        user: {
          ...mockRequest.user,
          boxer: null,
        },
      };
      mockRequestFindUnique.mockResolvedValue(requestWithoutBoxer);
      mockIsClubOwner.mockResolvedValue(true);

      await expect(
        membershipService.approveRequest(requestId, gymOwnerId)
      ).rejects.toThrow('User does not have a boxer profile');
    });
  });

  // ==========================================================================
  // rejectRequest Tests
  // ==========================================================================

  describe('rejectRequest', () => {
    const requestId = 'request-id';
    const gymOwnerId = 'gym-owner-id';
    const clubId = 'club-id';
    const notes = 'Not accepting new members at this time';

    const mockRequest = {
      id: requestId,
      userId: 'user-id',
      clubId,
      status: MembershipRequestStatus.PENDING,
      requestedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      notes: null,
    };

    const mockRejectedRequest = {
      ...mockRequest,
      status: MembershipRequestStatus.REJECTED,
      reviewedAt: new Date(),
      reviewedBy: gymOwnerId,
      notes,
    };

    it('should reject request with notes', async () => {
      mockRequestFindUnique.mockResolvedValue(mockRequest);
      mockIsClubOwner.mockResolvedValue(true);

      const { withUserContext } = require('../../src/utils/database-context');
      const mockTx = {
        clubMembershipRequest: {
          update: jest.fn().mockResolvedValue(mockRejectedRequest),
        },
      };
      withUserContext.mockImplementation(
        (_userId: string, _role: string, operation: any) => operation(mockTx)
      );

      const result = await membershipService.rejectRequest(requestId, gymOwnerId, notes);

      expect(mockIsClubOwner).toHaveBeenCalledWith(gymOwnerId, clubId);

      expect(mockTx.clubMembershipRequest.update).toHaveBeenCalledWith({
        where: { id: requestId },
        data: {
          status: MembershipRequestStatus.REJECTED,
          reviewedAt: expect.any(Date),
          reviewedBy: gymOwnerId,
          notes,
        },
      });

      expect(result).toEqual(mockRejectedRequest);
    });

    it('should reject request without notes', async () => {
      mockRequestFindUnique.mockResolvedValue(mockRequest);
      mockIsClubOwner.mockResolvedValue(true);

      const rejectedWithoutNotes = {
        ...mockRequest,
        status: MembershipRequestStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedBy: gymOwnerId,
        notes: undefined,
      };

      const { withUserContext } = require('../../src/utils/database-context');
      const mockTx = {
        clubMembershipRequest: {
          update: jest.fn().mockResolvedValue(rejectedWithoutNotes),
        },
      };
      withUserContext.mockImplementation(
        (_userId: string, _role: string, operation: any) => operation(mockTx)
      );

      const result = await membershipService.rejectRequest(requestId, gymOwnerId);

      expect(mockTx.clubMembershipRequest.update).toHaveBeenCalledWith({
        where: { id: requestId },
        data: {
          status: MembershipRequestStatus.REJECTED,
          reviewedAt: expect.any(Date),
          reviewedBy: gymOwnerId,
          notes: undefined,
        },
      });

      expect(result).toEqual(rejectedWithoutNotes);
    });

    it('should throw error if request not found', async () => {
      mockRequestFindUnique.mockResolvedValue(null);

      await expect(
        membershipService.rejectRequest(requestId, gymOwnerId, notes)
      ).rejects.toThrow('Membership request not found');
    });

    it('should throw error if gym owner does not own the club', async () => {
      mockRequestFindUnique.mockResolvedValue(mockRequest);
      mockIsClubOwner.mockResolvedValue(false);

      await expect(
        membershipService.rejectRequest(requestId, gymOwnerId, notes)
      ).rejects.toThrow('Not authorized to reject requests for this club');
    });

    it('should throw error if request is not pending', async () => {
      const rejectedRequest = {
        ...mockRequest,
        status: MembershipRequestStatus.REJECTED,
      };
      mockRequestFindUnique.mockResolvedValue(rejectedRequest);
      mockIsClubOwner.mockResolvedValue(true);

      await expect(
        membershipService.rejectRequest(requestId, gymOwnerId, notes)
      ).rejects.toThrow('Request has already been processed');
    });
  });
});
