// Club Controller Integration Tests
// Tests for club API endpoints including gym owner endpoints

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import type { AuthenticatedUserRequest } from '../../src/types';

// ============================================================================
// Mock Setup
// ============================================================================

jest.mock('../../src/config', () => ({
  prisma: {
    club: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    boxer: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    clubCoach: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../src/services/club.service');

import * as clubController from '../../src/controllers/club.controller';
import * as clubService from '../../src/services/club.service';
import { ForbiddenError, NotFoundError } from '../../src/middleware';

// Get typed mocks
const mockGetClubsByOwner = clubService.getClubsByOwner as jest.Mock;
const mockGetClubWithMembers = clubService.getClubWithMembers as jest.Mock;
const mockIsClubOwner = clubService.isClubOwner as jest.Mock;

// ============================================================================
// Test Helpers
// ============================================================================

function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

function createMockNext(): NextFunction {
  return jest.fn();
}

function createAuthenticatedRequest(
  role: UserRole,
  userId: string,
  overrides: Partial<AuthenticatedUserRequest> = {}
): AuthenticatedUserRequest {
  return {
    user: {
      userId,
      role,
      email: 'test@example.com',
      iat: Date.now(),
      exp: Date.now() + 3600000,
    },
    ...overrides,
  } as AuthenticatedUserRequest;
}

function createMockClub(overrides: Partial<any> = {}) {
  return {
    id: uuidv4(),
    name: 'Test Boxing Club',
    region: 'Test Region',
    address: '123 Test St',
    city: 'Test City',
    postcode: 'TE1 1ST',
    phone: '01234567890',
    email: 'test@club.com',
    website: 'https://testclub.com',
    latitude: 51.5074,
    longitude: -0.1278,
    ownerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Club Controller - GET /my-clubs', () => {
  let req: AuthenticatedUserRequest;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    res = createMockResponse();
    next = createMockNext();
  });

  it('should return clubs for authenticated gym owner', async () => {
    const userId = uuidv4();
    req = createAuthenticatedRequest(UserRole.GYM_OWNER, userId);

    const mockClubs = [
      createMockClub({ id: 'club-1', name: 'Club One', ownerId: userId }),
      createMockClub({ id: 'club-2', name: 'Club Two', ownerId: userId }),
    ];

    mockGetClubsByOwner.mockResolvedValue(mockClubs);

    await clubController.getMyClubs(req, res as Response, next);

    expect(mockGetClubsByOwner).toHaveBeenCalledWith(userId);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          clubs: mockClubs,
        }),
        message: 'Clubs retrieved successfully',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return empty array if gym owner has no clubs', async () => {
    const userId = uuidv4();
    req = createAuthenticatedRequest(UserRole.GYM_OWNER, userId);

    mockGetClubsByOwner.mockResolvedValue([]);

    await clubController.getMyClubs(req, res as Response, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          clubs: [],
        }),
      })
    );
  });

  it('should return 403 if user is not a gym owner (BOXER)', async () => {
    const userId = uuidv4();
    req = createAuthenticatedRequest(UserRole.BOXER, userId);

    await clubController.getMyClubs(req, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: 'Only gym owners can access this endpoint',
      })
    );
    expect(mockGetClubsByOwner).not.toHaveBeenCalled();
  });

  it('should return 403 if user is not a gym owner (COACH)', async () => {
    const userId = uuidv4();
    req = createAuthenticatedRequest(UserRole.COACH, userId);

    await clubController.getMyClubs(req, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: 'Only gym owners can access this endpoint',
      })
    );
    expect(mockGetClubsByOwner).not.toHaveBeenCalled();
  });

  it('should return 403 if user is an ADMIN (only GYM_OWNER allowed)', async () => {
    const userId = uuidv4();
    req = createAuthenticatedRequest(UserRole.ADMIN, userId);

    await clubController.getMyClubs(req, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
      })
    );
  });

  it('should handle service errors gracefully', async () => {
    const userId = uuidv4();
    req = createAuthenticatedRequest(UserRole.GYM_OWNER, userId);

    const error = new Error('Database connection failed');
    mockGetClubsByOwner.mockRejectedValue(error);

    await clubController.getMyClubs(req, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should call service with correct userId from JWT', async () => {
    const userId = uuidv4();
    req = createAuthenticatedRequest(UserRole.GYM_OWNER, userId);

    mockGetClubsByOwner.mockResolvedValue([]);

    await clubController.getMyClubs(req, res as Response, next);

    expect(mockGetClubsByOwner).toHaveBeenCalledWith(userId);
  });
});

describe('Club Controller - GET /clubs/:id/members', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    res = createMockResponse();
    next = createMockNext();
  });

  it('should return club with members', async () => {
    const clubId = uuidv4();
    const ownerId = uuidv4();
    req = {
      params: { id: clubId },
    };

    const mockClubWithMembers = {
      ...createMockClub({ id: clubId, ownerId }),
      owner: {
        id: ownerId,
        name: 'Gym Owner',
        email: 'owner@test.com',
        role: UserRole.GYM_OWNER,
      },
      boxers: [
        { id: uuidv4(), name: 'Boxer One', userId: uuidv4() },
        { id: uuidv4(), name: 'Boxer Two', userId: uuidv4() },
      ],
      coaches: [
        {
          id: uuidv4(),
          clubId,
          coachUserId: uuidv4(),
          isHead: true,
          coach: {
            id: uuidv4(),
            name: 'Head Coach',
            email: 'coach@test.com',
            role: UserRole.COACH,
          },
        },
      ],
    };

    mockGetClubWithMembers.mockResolvedValue(mockClubWithMembers);

    await clubController.getClubMembers(req as Request, res as Response, next);

    expect(mockGetClubWithMembers).toHaveBeenCalledWith(clubId);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          club: mockClubWithMembers,
        }),
        message: 'Club members retrieved successfully',
      })
    );
  });

  it('should return 404 if club not found', async () => {
    const clubId = uuidv4();
    req = {
      params: { id: clubId },
    };

    mockGetClubWithMembers.mockResolvedValue(null);

    await clubController.getClubMembers(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Club not found',
      })
    );
  });

  it('should handle invalid UUID format', async () => {
    req = {
      params: { id: 'invalid-uuid' },
    };

    await clubController.getClubMembers(req as Request, res as Response, next);

    // Zod validation should fail
    expect(next).toHaveBeenCalled();
  });
});

describe('Club Controller - Authorization Checks', () => {
  let req: AuthenticatedUserRequest;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    res = createMockResponse();
    next = createMockNext();
  });

  describe('addBoxerToClub', () => {
    it('should allow club owner to add boxer', async () => {
      const userId = uuidv4();
      const clubId = uuidv4();
      const boxerId = uuidv4();

      req = createAuthenticatedRequest(UserRole.GYM_OWNER, userId, {
        params: { id: clubId, boxerId },
      } as any);

      mockIsClubOwner.mockResolvedValue(true);

      // We need to mock the boxer service as well
      const mockAssignBoxerToClub = require('../../src/services/club.service')
        .assignBoxerToClub as jest.Mock;
      mockAssignBoxerToClub.mockResolvedValue({
        id: boxerId,
        clubId,
        name: 'Test Boxer',
      });

      await clubController.addBoxerToClub(req, res as Response, next);

      expect(mockIsClubOwner).toHaveBeenCalledWith(userId, clubId);
    });

    it('should return 403 if user is not club owner or admin', async () => {
      const userId = uuidv4();
      const clubId = uuidv4();
      const boxerId = uuidv4();

      req = createAuthenticatedRequest(UserRole.COACH, userId, {
        params: { id: clubId, boxerId },
      } as any);

      mockIsClubOwner.mockResolvedValue(false);

      await clubController.addBoxerToClub(req, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Only the club owner or admin can add boxers',
        })
      );
    });

    it('should allow admin to add boxer regardless of ownership', async () => {
      const adminId = uuidv4();
      const clubId = uuidv4();
      const boxerId = uuidv4();

      req = createAuthenticatedRequest(UserRole.ADMIN, adminId, {
        params: { id: clubId, boxerId },
      } as any);

      // Admin should bypass ownership check
      mockIsClubOwner.mockResolvedValue(false);

      const mockAssignBoxerToClub = require('../../src/services/club.service')
        .assignBoxerToClub as jest.Mock;
      mockAssignBoxerToClub.mockResolvedValue({
        id: boxerId,
        clubId,
        name: 'Test Boxer',
      });

      await clubController.addBoxerToClub(req, res as Response, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });
  });
});

describe('Club Controller - Route Order', () => {
  it('should document that /my-clubs must come before /:id route', () => {
    // This is a documentation test to remind developers about route order
    // In Express, route order matters. /my-clubs must be defined before /:id
    // otherwise "my-clubs" would be interpreted as an ID parameter

    const routeOrder = [
      '/regions',        // Specific route
      '/search',         // Specific route
      '/stats',          // Specific route
      '/region/:region', // Parameterized route
      '/my-clubs',       // CRITICAL: Must be before /:id
      '/',               // Base route
      '/:id',            // Generic ID route
      '/:id/members',    // Nested route
    ];

    // Verify /my-clubs comes before /:id
    const myClubsIndex = routeOrder.indexOf('/my-clubs');
    const idIndex = routeOrder.indexOf('/:id');

    expect(myClubsIndex).toBeLessThan(idIndex);
    expect(myClubsIndex).toBeGreaterThan(-1);
    expect(idIndex).toBeGreaterThan(-1);
  });
});
