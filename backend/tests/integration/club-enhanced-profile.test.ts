// Enhanced Club Profile Integration Tests
// Tests for PHASE 4: Enhanced Club Profiles - CREATE and UPDATE operations

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
import { prisma } from '../../src/config';
import { ForbiddenError, NotFoundError } from '../../src/middleware';

// Get typed mocks
const mockCreateClub = clubService.createClub as jest.Mock;
const mockUpdateClub = clubService.updateClub as jest.Mock;
const mockIsClubOwner = clubService.isClubOwner as jest.Mock;
const mockGetClubs = clubService.getClubs as jest.Mock;

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
    description: 'A great boxing club',
    foundedYear: 2010,
    capacity: 50,
    amenities: ['Ring', 'Showers', 'Parking'],
    photos: ['https://example.com/photo1.jpg'],
    operatingHours: {
      monday: { open: '09:00', close: '21:00' },
      tuesday: { open: '09:00', close: '21:00' },
    },
    pricingTiers: [
      {
        name: 'Basic',
        price: 50,
        currency: 'GBP',
        period: 'monthly',
        description: 'Basic membership',
      },
    ],
    specialties: ['Boxing', 'Fitness'],
    ageGroupsServed: ['Adults', 'Youth'],
    headCoachName: 'John Doe',
    headCoachBio: 'Experienced coach',
    acceptingMembers: true,
    isPublished: false,
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createCompleteClubData() {
  return {
    name: 'Elite Boxing Academy',
    email: 'contact@eliteboxing.com',
    phone: '+44 20 1234 5678',
    contactName: 'Jane Smith',
    postcode: 'SW1A 1AA',
    region: 'London',
    address: '456 Boxing Street',
    city: 'London',
    country: 'United Kingdom',
    latitude: 51.5074,
    longitude: -0.1278,
    description: 'Premier boxing academy with state-of-the-art facilities',
    website: 'https://eliteboxing.com',
    facebookUrl: 'https://facebook.com/eliteboxing',
    instagramUrl: 'https://instagram.com/eliteboxing',
    twitterUrl: 'https://twitter.com/eliteboxing',
    foundedYear: 1995,
    capacity: 100,
    amenities: ['Professional Ring', 'Heavy Bags', 'Speed Bags', 'Showers', 'Parking'],
    photos: [
      'https://example.com/gym1.jpg',
      'https://example.com/gym2.jpg',
    ],
    operatingHours: {
      monday: { open: '06:00', close: '22:00' },
      tuesday: { open: '06:00', close: '22:00' },
      wednesday: { open: '06:00', close: '22:00' },
      thursday: { open: '06:00', close: '22:00' },
      friday: { open: '06:00', close: '22:00' },
      saturday: { open: '08:00', close: '18:00' },
      sunday: { closed: true },
    },
    pricingTiers: [
      {
        name: 'Basic',
        price: 50,
        currency: 'GBP',
        period: 'monthly',
        description: 'Basic membership with gym access',
      },
      {
        name: 'Premium',
        price: 100,
        currency: 'GBP',
        period: 'monthly',
        description: 'Premium membership with coaching included',
      },
    ],
    specialties: ['Olympic Boxing', 'Professional Training', 'Youth Development'],
    ageGroupsServed: ['Youth (12-17)', 'Adults (18+)', 'Seniors (50+)'],
    achievements: ['National Champions 2020', 'Regional Winners 2019'],
    affiliations: ['British Boxing Federation', 'London Boxing Association'],
    certifications: ['SafeSport Certified', 'First Aid Certified'],
    languages: ['English', 'Spanish', 'Polish'],
    accessibility: ['Wheelchair Access', 'Disabled Parking', 'Elevator'],
    headCoachName: 'Mike Johnson',
    headCoachBio: '20 years of professional coaching experience',
    headCoachPhotoUrl: 'https://example.com/coach.jpg',
    parkingInfo: 'Free parking available for members',
    publicTransportInfo: 'Close to Westminster station',
    acceptingMembers: true,
    isPublished: true,
  };
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Enhanced Club Profile - POST /clubs (Create)', () => {
  let req: AuthenticatedUserRequest;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    res = createMockResponse();
    next = createMockNext();
  });

  // ==========================================================================
  // Admin Can Create Clubs with Full Profile
  // ==========================================================================

  it('should create club with complete profile data as admin', async () => {
    const adminId = uuidv4();
    const completeData = createCompleteClubData();
    const createdClub = createMockClub(completeData);

    req = createAuthenticatedRequest(UserRole.ADMIN, adminId, {
      body: completeData,
    } as any);

    mockCreateClub.mockResolvedValue(createdClub);

    await clubController.createClub(req, res as Response, next);

    expect(mockCreateClub).toHaveBeenCalledWith(completeData);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          club: createdClub,
        }),
        message: 'Club created successfully',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should create club with minimal required data as admin', async () => {
    const adminId = uuidv4();
    const minimalData = {
      name: 'Simple Boxing Gym',
    };
    const createdClub = createMockClub(minimalData);

    req = createAuthenticatedRequest(UserRole.ADMIN, adminId, {
      body: minimalData,
    } as any);

    mockCreateClub.mockResolvedValue(createdClub);

    await clubController.createClub(req, res as Response, next);

    expect(mockCreateClub).toHaveBeenCalledWith(minimalData);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      })
    );
  });

  // ==========================================================================
  // Authorization Tests
  // ==========================================================================

  it('should reject club creation by non-admin (GYM_OWNER)', async () => {
    const gymOwnerId = uuidv4();
    req = createAuthenticatedRequest(UserRole.GYM_OWNER, gymOwnerId, {
      body: { name: 'Test Club' },
    } as any);

    await clubController.createClub(req, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: 'Only admins can create clubs',
      })
    );
    expect(mockCreateClub).not.toHaveBeenCalled();
  });

  it('should reject club creation by non-admin (BOXER)', async () => {
    const boxerId = uuidv4();
    req = createAuthenticatedRequest(UserRole.BOXER, boxerId, {
      body: { name: 'Test Club' },
    } as any);

    await clubController.createClub(req, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: 'Only admins can create clubs',
      })
    );
    expect(mockCreateClub).not.toHaveBeenCalled();
  });

  it('should reject club creation by non-admin (COACH)', async () => {
    const coachId = uuidv4();
    req = createAuthenticatedRequest(UserRole.COACH, coachId, {
      body: { name: 'Test Club' },
    } as any);

    await clubController.createClub(req, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
      })
    );
  });

  // ==========================================================================
  // Validation Tests
  // ==========================================================================

  it('should handle validation errors for invalid data', async () => {
    const adminId = uuidv4();
    req = createAuthenticatedRequest(UserRole.ADMIN, adminId, {
      body: {
        name: 'X', // Too short
        email: 'invalid-email', // Invalid format
        website: 'not-a-url', // Invalid URL
      },
    } as any);

    await clubController.createClub(req, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(mockCreateClub).not.toHaveBeenCalled();
  });
});

describe('Enhanced Club Profile - PATCH /clubs/:id (Update)', () => {
  let req: AuthenticatedUserRequest;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    res = createMockResponse();
    next = createMockNext();
  });

  // ==========================================================================
  // Owner Can Update Their Club
  // ==========================================================================

  it('should allow club owner to update their club profile', async () => {
    const ownerId = uuidv4();
    const clubId = uuidv4();
    const updateData = {
      description: 'Updated description',
      amenities: ['New Ring', 'Sauna'],
      acceptingMembers: false,
    };
    const updatedClub = createMockClub({ ...updateData, ownerId });

    req = createAuthenticatedRequest(UserRole.GYM_OWNER, ownerId, {
      params: { id: clubId },
      body: updateData,
    } as any);

    mockIsClubOwner.mockResolvedValue(true);
    mockUpdateClub.mockResolvedValue(updatedClub);

    await clubController.updateClub(req, res as Response, next);

    expect(mockIsClubOwner).toHaveBeenCalledWith(ownerId, clubId);
    expect(mockUpdateClub).toHaveBeenCalledWith(clubId, updateData);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          club: updatedClub,
        }),
        message: 'Club updated successfully',
      })
    );
  });

  it('should allow club owner to update operating hours', async () => {
    const ownerId = uuidv4();
    const clubId = uuidv4();
    const updateData = {
      operatingHours: {
        monday: { open: '07:00', close: '20:00' },
        tuesday: { open: '07:00', close: '20:00' },
        sunday: { closed: true },
      },
    };
    const updatedClub = createMockClub({ ...updateData, ownerId });

    req = createAuthenticatedRequest(UserRole.GYM_OWNER, ownerId, {
      params: { id: clubId },
      body: updateData,
    } as any);

    mockIsClubOwner.mockResolvedValue(true);
    mockUpdateClub.mockResolvedValue(updatedClub);

    await clubController.updateClub(req, res as Response, next);

    expect(mockUpdateClub).toHaveBeenCalledWith(clubId, updateData);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      })
    );
  });

  it('should allow club owner to update pricing tiers', async () => {
    const ownerId = uuidv4();
    const clubId = uuidv4();
    const updateData = {
      pricingTiers: [
        {
          name: 'Student',
          price: 30,
          currency: 'GBP',
          period: 'monthly',
          description: 'Discounted student rate',
        },
      ],
    };
    const updatedClub = createMockClub({ ...updateData, ownerId });

    req = createAuthenticatedRequest(UserRole.GYM_OWNER, ownerId, {
      params: { id: clubId },
      body: updateData,
    } as any);

    mockIsClubOwner.mockResolvedValue(true);
    mockUpdateClub.mockResolvedValue(updatedClub);

    await clubController.updateClub(req, res as Response, next);

    expect(mockUpdateClub).toHaveBeenCalledWith(clubId, updateData);
  });

  // ==========================================================================
  // Admin Can Update Any Club
  // ==========================================================================

  it('should allow admin to update any club profile', async () => {
    const adminId = uuidv4();
    const clubId = uuidv4();
    const clubOwnerId = uuidv4(); // Different from admin
    const updateData = {
      description: 'Admin updated description',
      isVerified: true,
      lastVerifiedAt: new Date().toISOString(),
    };
    const updatedClub = createMockClub({ ...updateData, ownerId: clubOwnerId });

    req = createAuthenticatedRequest(UserRole.ADMIN, adminId, {
      params: { id: clubId },
      body: updateData,
    } as any);

    mockIsClubOwner.mockResolvedValue(false); // Admin is not the owner
    mockUpdateClub.mockResolvedValue(updatedClub);

    await clubController.updateClub(req, res as Response, next);

    expect(mockUpdateClub).toHaveBeenCalledWith(clubId, updateData);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      })
    );
  });

  it('should allow admin to update admin-only fields', async () => {
    const adminId = uuidv4();
    const clubId = uuidv4();
    const updateData = {
      isVerified: true,
      lastVerifiedAt: new Date().toISOString(),
      verificationNotes: 'Verified by admin',
    };
    const updatedClub = createMockClub(updateData);

    req = createAuthenticatedRequest(UserRole.ADMIN, adminId, {
      params: { id: clubId },
      body: updateData,
    } as any);

    mockIsClubOwner.mockResolvedValue(false);
    mockUpdateClub.mockResolvedValue(updatedClub);

    await clubController.updateClub(req, res as Response, next);

    expect(mockUpdateClub).toHaveBeenCalledWith(clubId, updateData);
  });

  // ==========================================================================
  // Non-Owner Rejection Tests
  // ==========================================================================

  it('should reject updates from non-owner gym owner', async () => {
    const gymOwnerId = uuidv4();
    const clubId = uuidv4();
    const updateData = { description: 'Trying to update' };

    req = createAuthenticatedRequest(UserRole.GYM_OWNER, gymOwnerId, {
      params: { id: clubId },
      body: updateData,
    } as any);

    mockIsClubOwner.mockResolvedValue(false);

    await clubController.updateClub(req, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: 'Only the club owner or admin can update this club',
      })
    );
    expect(mockUpdateClub).not.toHaveBeenCalled();
  });

  it('should reject updates from non-owner roles (BOXER)', async () => {
    const boxerId = uuidv4();
    const clubId = uuidv4();
    const updateData = { description: 'Trying to update' };

    req = createAuthenticatedRequest(UserRole.BOXER, boxerId, {
      params: { id: clubId },
      body: updateData,
    } as any);

    mockIsClubOwner.mockResolvedValue(false);

    await clubController.updateClub(req, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
      })
    );
  });

  it('should reject updates from non-owner roles (COACH)', async () => {
    const coachId = uuidv4();
    const clubId = uuidv4();
    const updateData = { description: 'Trying to update' };

    req = createAuthenticatedRequest(UserRole.COACH, coachId, {
      params: { id: clubId },
      body: updateData,
    } as any);

    mockIsClubOwner.mockResolvedValue(false);

    await clubController.updateClub(req, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
      })
    );
  });

  // ==========================================================================
  // Admin-Only Field Protection
  // ==========================================================================

  it('should strip admin-only fields when owner tries to update them', async () => {
    const ownerId = uuidv4();
    const clubId = uuidv4();
    const updateData = {
      description: 'Legitimate update',
      isVerified: true, // Admin-only field
      lastVerifiedAt: new Date().toISOString(), // Admin-only field
      verificationNotes: 'Should be stripped', // Admin-only field
    };
    const updatedClub = createMockClub({ description: 'Legitimate update', ownerId });

    req = createAuthenticatedRequest(UserRole.GYM_OWNER, ownerId, {
      params: { id: clubId },
      body: updateData,
    } as any);

    mockIsClubOwner.mockResolvedValue(true);
    mockUpdateClub.mockResolvedValue(updatedClub);

    await clubController.updateClub(req, res as Response, next);

    // Should be called without admin-only fields
    expect(mockUpdateClub).toHaveBeenCalledWith(clubId, {
      description: 'Legitimate update',
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  it('should handle club not found error', async () => {
    const ownerId = uuidv4();
    const clubId = uuidv4();
    const updateData = { description: 'Update' };

    req = createAuthenticatedRequest(UserRole.GYM_OWNER, ownerId, {
      params: { id: clubId },
      body: updateData,
    } as any);

    mockIsClubOwner.mockResolvedValue(true);
    mockUpdateClub.mockRejectedValue(new Error('Club not found'));

    await clubController.updateClub(req, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Club not found',
      })
    );
  });

  it('should handle service errors gracefully', async () => {
    const ownerId = uuidv4();
    const clubId = uuidv4();
    const updateData = { description: 'Update' };

    req = createAuthenticatedRequest(UserRole.GYM_OWNER, ownerId, {
      params: { id: clubId },
      body: updateData,
    } as any);

    mockIsClubOwner.mockResolvedValue(true);
    const dbError = new Error('Database connection failed');
    mockUpdateClub.mockRejectedValue(dbError);

    await clubController.updateClub(req, res as Response, next);

    expect(next).toHaveBeenCalledWith(dbError);
  });
});

describe('Enhanced Club Profile - GET /clubs (Public Listing)', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    res = createMockResponse();
    next = createMockNext();
  });

  // ==========================================================================
  // Publication Filtering
  // ==========================================================================

  it('should filter out unpublished clubs from public listing', async () => {
    req = {
      query: {},
    };

    const publishedClubs = [
      createMockClub({ id: 'club-1', isPublished: true }),
      createMockClub({ id: 'club-2', isPublished: true }),
    ];

    mockGetClubs.mockResolvedValue({
      clubs: publishedClubs,
      total: 2,
      page: 1,
      limit: 50,
      totalPages: 1,
    });

    await clubController.getClubs(req as Request, res as Response, next);

    expect(mockGetClubs).toHaveBeenCalledWith(
      expect.objectContaining({
        includeUnpublished: false,
      })
    );
    expect(res.json).toHaveBeenCalled();
  });

  // ==========================================================================
  // Owner Can See Unpublished Clubs
  // ==========================================================================

  it('should allow owner to see unpublished clubs when authenticated', async () => {
    const ownerId = uuidv4();
    const authReq = createAuthenticatedRequest(UserRole.GYM_OWNER, ownerId, {
      query: { includeUnpublished: 'true' },
    } as any);

    const allClubs = [
      createMockClub({ id: 'club-1', isPublished: true, ownerId }),
      createMockClub({ id: 'club-2', isPublished: false, ownerId }),
    ];

    mockGetClubs.mockResolvedValue({
      clubs: allClubs,
      total: 2,
      page: 1,
      limit: 50,
      totalPages: 1,
    });

    await clubController.getClubs(authReq as Request, res as Response, next);

    expect(mockGetClubs).toHaveBeenCalledWith(
      expect.objectContaining({
        includeUnpublished: true,
      })
    );
  });

  // ==========================================================================
  // Default Behavior
  // ==========================================================================

  it('should default to hiding unpublished clubs when includeUnpublished not specified', async () => {
    req = {
      query: {},
    };

    mockGetClubs.mockResolvedValue({
      clubs: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    });

    await clubController.getClubs(req as Request, res as Response, next);

    expect(mockGetClubs).toHaveBeenCalledWith(
      expect.objectContaining({
        includeUnpublished: false,
      })
    );
  });
});
