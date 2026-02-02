// Club Membership Request Controller Integration Tests
// Tests for membership request HTTP endpoints

import { MembershipRequestStatus } from '@prisma/client';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the service module
jest.mock('../../src/services/clubMembershipRequest.service', () => ({
  getPendingRequestsForGymOwner: jest.fn(),
  approveRequest: jest.fn(),
  rejectRequest: jest.fn(),
}));

// Mock validators
jest.mock('../../src/validators/clubMembershipRequest.validators', () => ({
  rejectRequestSchema: {
    parse: jest.fn((data) => data),
  },
}));

// Mock utils
jest.mock('../../src/utils', () => ({
  sendSuccess: jest.fn(),
}));

// Mock middleware
jest.mock('../../src/middleware', () => ({
  BadRequestError: class BadRequestError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'BadRequestError';
    }
  },
  ForbiddenError: class ForbiddenError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ForbiddenError';
    }
  },
  NotFoundError: class NotFoundError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NotFoundError';
    }
  },
}));

// Import after mocking
import * as clubMembershipRequestController from '../../src/controllers/clubMembershipRequest.controller';
import * as membershipService from '../../src/services/clubMembershipRequest.service';
import { sendSuccess } from '../../src/utils';
import { rejectRequestSchema } from '../../src/validators/clubMembershipRequest.validators';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../src/middleware';

const { getPendingRequests, approveRequest, rejectRequest } = clubMembershipRequestController;

// Get typed references to mocks
const mockGetPendingRequestsService = membershipService.getPendingRequestsForGymOwner as jest.Mock;
const mockApproveRequestService = membershipService.approveRequest as jest.Mock;
const mockRejectRequestService = membershipService.rejectRequest as jest.Mock;
const mockSendSuccess = sendSuccess as jest.Mock;
const mockRejectSchemaParse = rejectRequestSchema.parse as jest.Mock;

// ============================================================================
// Test Suites
// ============================================================================

describe('Club Membership Request Controller', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      user: {
        userId: 'gym-owner-id',
        email: 'owner@example.com',
        role: 'GYM_OWNER',
      },
      params: {},
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();
  });

  // ==========================================================================
  // getPendingRequests Tests
  // ==========================================================================

  describe('getPendingRequests', () => {
    const mockRequests = [
      {
        id: 'request-1',
        userId: 'user-1',
        clubId: 'club-1',
        status: MembershipRequestStatus.PENDING,
        requestedAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
        notes: null,
        user: {
          id: 'user-1',
          email: 'boxer1@example.com',
          name: 'Boxer One',
        },
        club: {
          id: 'club-1',
          name: 'Test Club 1',
        },
      },
      {
        id: 'request-2',
        userId: 'user-2',
        clubId: 'club-2',
        status: MembershipRequestStatus.PENDING,
        requestedAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
        notes: null,
        user: {
          id: 'user-2',
          email: 'boxer2@example.com',
          name: 'Boxer Two',
        },
        club: {
          id: 'club-2',
          name: 'Test Club 2',
        },
      },
    ];

    it('should return pending requests successfully', async () => {
      mockGetPendingRequestsService.mockResolvedValue(mockRequests);
      mockSendSuccess.mockImplementation((res, data, message) => {
        res.status(200).json({ success: true, data, message });
      });

      await getPendingRequests(mockRequest, mockResponse, mockNext);

      expect(mockGetPendingRequestsService).toHaveBeenCalledWith('gym-owner-id');
      expect(mockSendSuccess).toHaveBeenCalledWith(
        mockResponse,
        { requests: mockRequests },
        'Pending membership requests retrieved successfully'
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return empty array when no pending requests', async () => {
      mockGetPendingRequestsService.mockResolvedValue([]);
      mockSendSuccess.mockImplementation((res, data, message) => {
        res.status(200).json({ success: true, data, message });
      });

      await getPendingRequests(mockRequest, mockResponse, mockNext);

      expect(mockGetPendingRequestsService).toHaveBeenCalledWith('gym-owner-id');
      expect(mockSendSuccess).toHaveBeenCalledWith(
        mockResponse,
        { requests: [] },
        'Pending membership requests retrieved successfully'
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockGetPendingRequestsService.mockRejectedValue(error);

      await getPendingRequests(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  // ==========================================================================
  // approveRequest Tests
  // ==========================================================================

  describe('approveRequest', () => {
    const requestId = 'request-id-123';
    const mockUpdatedBoxer = {
      id: 'boxer-id',
      userId: 'user-id',
      clubId: 'club-id',
      gymAffiliation: 'Test Boxing Club',
      name: 'Test Boxer',
    };

    beforeEach(() => {
      mockRequest.params = { id: requestId };
    });

    it('should approve request successfully', async () => {
      mockApproveRequestService.mockResolvedValue(mockUpdatedBoxer);
      mockSendSuccess.mockImplementation((res, data, message) => {
        res.status(200).json({ success: true, data, message });
      });

      await approveRequest(mockRequest, mockResponse, mockNext);

      expect(mockApproveRequestService).toHaveBeenCalledWith(
        requestId,
        'gym-owner-id'
      );
      expect(mockSendSuccess).toHaveBeenCalledWith(
        mockResponse,
        { boxer: mockUpdatedBoxer },
        'Membership request approved successfully'
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return BadRequestError when request ID is missing', async () => {
      mockRequest.params = {};

      await approveRequest(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe('Request ID is required');
    });

    it('should return NotFoundError when request not found', async () => {
      mockApproveRequestService.mockRejectedValue(
        new Error('Membership request not found')
      );

      await approveRequest(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(NotFoundError);
    });

    it('should return ForbiddenError when not authorized', async () => {
      mockApproveRequestService.mockRejectedValue(
        new Error('Not authorized to approve requests for this club')
      );

      await approveRequest(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(ForbiddenError);
    });

    it('should return ForbiddenError when request already processed', async () => {
      mockApproveRequestService.mockRejectedValue(
        new Error('Request has already been processed')
      );

      await approveRequest(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(ForbiddenError);
    });

    it('should return BadRequestError when user has no boxer profile', async () => {
      mockApproveRequestService.mockRejectedValue(
        new Error('User does not have a boxer profile')
      );

      await approveRequest(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
    });

    it('should handle unexpected errors', async () => {
      const error = new Error('Unexpected error');
      mockApproveRequestService.mockRejectedValue(error);

      await approveRequest(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  // ==========================================================================
  // rejectRequest Tests
  // ==========================================================================

  describe('rejectRequest', () => {
    const requestId = 'request-id-123';
    const notes = 'Not accepting new members at this time';

    const mockRejectedRequest = {
      id: requestId,
      userId: 'user-id',
      clubId: 'club-id',
      status: MembershipRequestStatus.REJECTED,
      requestedAt: new Date(),
      reviewedAt: new Date(),
      reviewedBy: 'gym-owner-id',
      notes,
    };

    beforeEach(() => {
      mockRequest.params = { id: requestId };
      mockRequest.body = { notes };
      mockRejectSchemaParse.mockReturnValue({ notes });
    });

    it('should reject request with notes successfully', async () => {
      mockRejectRequestService.mockResolvedValue(mockRejectedRequest);
      mockSendSuccess.mockImplementation((res, data, message) => {
        res.status(200).json({ success: true, data, message });
      });

      await rejectRequest(mockRequest, mockResponse, mockNext);

      expect(mockRejectSchemaParse).toHaveBeenCalledWith({ notes });
      expect(mockRejectRequestService).toHaveBeenCalledWith(
        requestId,
        'gym-owner-id',
        notes
      );
      expect(mockSendSuccess).toHaveBeenCalledWith(
        mockResponse,
        { request: mockRejectedRequest },
        'Membership request rejected successfully'
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request without notes successfully', async () => {
      mockRequest.body = {};
      mockRejectSchemaParse.mockReturnValue({});

      const requestWithoutNotes = {
        ...mockRejectedRequest,
        notes: undefined,
      };
      mockRejectRequestService.mockResolvedValue(requestWithoutNotes);
      mockSendSuccess.mockImplementation((res, data, message) => {
        res.status(200).json({ success: true, data, message });
      });

      await rejectRequest(mockRequest, mockResponse, mockNext);

      expect(mockRejectRequestService).toHaveBeenCalledWith(
        requestId,
        'gym-owner-id',
        undefined
      );
      expect(mockSendSuccess).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return BadRequestError when request ID is missing', async () => {
      mockRequest.params = {};

      await rejectRequest(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe('Request ID is required');
    });

    it('should return NotFoundError when request not found', async () => {
      mockRejectRequestService.mockRejectedValue(
        new Error('Membership request not found')
      );

      await rejectRequest(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(NotFoundError);
    });

    it('should return ForbiddenError when not authorized', async () => {
      mockRejectRequestService.mockRejectedValue(
        new Error('Not authorized to reject requests for this club')
      );

      await rejectRequest(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(ForbiddenError);
    });

    it('should return ForbiddenError when request already processed', async () => {
      mockRejectRequestService.mockRejectedValue(
        new Error('Request has already been processed')
      );

      await rejectRequest(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(ForbiddenError);
    });

    it('should handle unexpected errors', async () => {
      const error = new Error('Unexpected error');
      mockRejectRequestService.mockRejectedValue(error);

      await rejectRequest(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
