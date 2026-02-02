// Club Service Unit Tests
// Tests for club-related business logic including gym owner functionality

import { UserRole, Club } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the config module before importing the service
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

// Import after mocking
import * as clubService from '../../src/services/club.service';
import { prisma } from '../../src/config';

// Get typed references to the mocks
const mockClubFindUnique = prisma.club.findUnique as jest.Mock;
const mockClubFindMany = prisma.club.findMany as jest.Mock;
const mockClubCount = prisma.club.count as jest.Mock;
const mockClubUpdate = prisma.club.update as jest.Mock;
const mockUserFindUnique = prisma.user.findUnique as jest.Mock;

// ============================================================================
// Test Helpers
// ============================================================================

function createMockClub(overrides: Partial<Club> = {}): Club {
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

function createMockUser(role: UserRole = UserRole.GYM_OWNER, overrides: Partial<any> = {}) {
  return {
    id: uuidv4(),
    email: 'gymowner@test.com',
    passwordHash: '$2a$12$testhashedpassword',
    role,
    name: 'Test Gym Owner',
    isActive: true,
    emailVerified: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Club Service - Gym Owner Features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // getClubsByOwner Tests
  // ==========================================================================

  describe('getClubsByOwner', () => {
    it('should return all clubs owned by a user', async () => {
      const ownerId = uuidv4();
      const mockClubs = [
        createMockClub({ id: 'club-1', name: 'Club One', ownerId }),
        createMockClub({ id: 'club-2', name: 'Club Two', ownerId }),
      ];

      mockClubFindMany.mockResolvedValue(
        mockClubs.map(club => ({
          ...club,
          _count: {
            boxers: 5,
            coaches: 2,
          },
        }))
      );

      const result = await clubService.getClubsByOwner(ownerId);

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(mockClubFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId },
          include: {
            _count: {
              select: {
                boxers: true,
                coaches: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        })
      );
    });

    it('should return empty array if owner has no clubs', async () => {
      const ownerId = uuidv4();
      mockClubFindMany.mockResolvedValue([]);

      const result = await clubService.getClubsByOwner(ownerId);

      expect(result).toEqual([]);
      expect(mockClubFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId },
        })
      );
    });

    it('should include member counts for each club', async () => {
      const ownerId = uuidv4();
      const mockClubWithCounts = {
        ...createMockClub({ ownerId }),
        _count: {
          boxers: 10,
          coaches: 3,
        },
      };

      mockClubFindMany.mockResolvedValue([mockClubWithCounts]);

      const result = await clubService.getClubsByOwner(ownerId);

      expect(result[0]._count).toBeDefined();
      expect(result[0]._count.boxers).toBe(10);
      expect(result[0]._count.coaches).toBe(3);
    });

    it('should order clubs by name alphabetically', async () => {
      const ownerId = uuidv4();
      mockClubFindMany.mockResolvedValue([]);

      await clubService.getClubsByOwner(ownerId);

      expect(mockClubFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        })
      );
    });
  });

  // ==========================================================================
  // isClubOwner Tests
  // ==========================================================================

  describe('isClubOwner', () => {
    it('should return true if user is the owner', async () => {
      const userId = uuidv4();
      const clubId = uuidv4();

      mockClubFindUnique.mockResolvedValue({
        ownerId: userId,
      });

      const result = await clubService.isClubOwner(userId, clubId);

      expect(result).toBe(true);
      expect(mockClubFindUnique).toHaveBeenCalledWith({
        where: { id: clubId },
        select: { ownerId: true },
      });
    });

    it('should return false if user is not the owner', async () => {
      const userId = uuidv4();
      const differentUserId = uuidv4();
      const clubId = uuidv4();

      mockClubFindUnique.mockResolvedValue({
        ownerId: differentUserId,
      });

      const result = await clubService.isClubOwner(userId, clubId);

      expect(result).toBe(false);
    });

    it('should return false if club has no owner', async () => {
      const userId = uuidv4();
      const clubId = uuidv4();

      mockClubFindUnique.mockResolvedValue({
        ownerId: null,
      });

      const result = await clubService.isClubOwner(userId, clubId);

      expect(result).toBe(false);
    });

    it('should return false if club does not exist', async () => {
      const userId = uuidv4();
      const clubId = uuidv4();

      mockClubFindUnique.mockResolvedValue(null);

      const result = await clubService.isClubOwner(userId, clubId);

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // setClubOwner Tests
  // ==========================================================================

  describe('setClubOwner', () => {
    it('should set club owner successfully', async () => {
      const clubId = uuidv4();
      const ownerId = uuidv4();
      const mockUser = createMockUser(UserRole.GYM_OWNER, { id: ownerId });
      const mockClub = createMockClub({ id: clubId, ownerId: null });
      const updatedClub = { ...mockClub, ownerId };

      mockUserFindUnique.mockResolvedValue(mockUser);
      mockClubFindUnique.mockResolvedValue(mockClub);
      mockClubUpdate.mockResolvedValue(updatedClub);

      const result = await clubService.setClubOwner(clubId, ownerId);

      expect(result.ownerId).toBe(ownerId);
      expect(mockClubUpdate).toHaveBeenCalledWith({
        where: { id: clubId },
        data: { ownerId },
      });
    });

    it('should throw error if user not found', async () => {
      const clubId = uuidv4();
      const ownerId = uuidv4();

      mockUserFindUnique.mockResolvedValue(null);

      await expect(clubService.setClubOwner(clubId, ownerId)).rejects.toThrow('User not found');
    });

    it('should throw error if user is not a GYM_OWNER', async () => {
      const clubId = uuidv4();
      const ownerId = uuidv4();
      const mockUser = createMockUser(UserRole.BOXER, { id: ownerId });

      mockUserFindUnique.mockResolvedValue(mockUser);

      await expect(clubService.setClubOwner(clubId, ownerId)).rejects.toThrow(
        'User must be a GYM_OWNER to own a club'
      );
    });

    it('should throw error if club not found', async () => {
      const clubId = uuidv4();
      const ownerId = uuidv4();
      const mockUser = createMockUser(UserRole.GYM_OWNER, { id: ownerId });

      mockUserFindUnique.mockResolvedValue(mockUser);
      mockClubFindUnique.mockResolvedValue(null);

      await expect(clubService.setClubOwner(clubId, ownerId)).rejects.toThrow('Club not found');
    });

    it('should allow changing existing owner', async () => {
      const clubId = uuidv4();
      const oldOwnerId = uuidv4();
      const newOwnerId = uuidv4();
      const mockUser = createMockUser(UserRole.GYM_OWNER, { id: newOwnerId });
      const mockClub = createMockClub({ id: clubId, ownerId: oldOwnerId });
      const updatedClub = { ...mockClub, ownerId: newOwnerId };

      mockUserFindUnique.mockResolvedValue(mockUser);
      mockClubFindUnique.mockResolvedValue(mockClub);
      mockClubUpdate.mockResolvedValue(updatedClub);

      const result = await clubService.setClubOwner(clubId, newOwnerId);

      expect(result.ownerId).toBe(newOwnerId);
    });
  });

  // ==========================================================================
  // getClubWithMembers Tests
  // ==========================================================================

  describe('getClubWithMembers', () => {
    it('should return club with owner, boxers, and coaches', async () => {
      const clubId = uuidv4();
      const ownerId = uuidv4();
      const mockClubWithMembers = {
        ...createMockClub({ id: clubId, ownerId }),
        owner: {
          id: ownerId,
          name: 'Gym Owner',
          email: 'owner@test.com',
          role: UserRole.GYM_OWNER,
        },
        boxers: [
          {
            id: uuidv4(),
            name: 'Boxer One',
            userId: uuidv4(),
          },
          {
            id: uuidv4(),
            name: 'Boxer Two',
            userId: uuidv4(),
          },
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

      mockClubFindUnique.mockResolvedValue(mockClubWithMembers);

      const result = await clubService.getClubWithMembers(clubId);

      expect(result).toBeDefined();
      expect(result?.owner).toBeDefined();
      expect(result?.boxers).toHaveLength(2);
      expect(result?.coaches).toHaveLength(1);
      expect(mockClubFindUnique).toHaveBeenCalledWith({
        where: { id: clubId },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          boxers: {
            select: {
              id: true,
              name: true,
              userId: true,
            },
          },
          coaches: {
            include: {
              coach: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        },
      });
    });

    it('should return null for non-existent club', async () => {
      const clubId = uuidv4();
      mockClubFindUnique.mockResolvedValue(null);

      const result = await clubService.getClubWithMembers(clubId);

      expect(result).toBeNull();
    });

    it('should handle club with no owner', async () => {
      const clubId = uuidv4();
      const mockClubWithMembers = {
        ...createMockClub({ id: clubId, ownerId: null }),
        owner: null,
        boxers: [],
        coaches: [],
      };

      mockClubFindUnique.mockResolvedValue(mockClubWithMembers);

      const result = await clubService.getClubWithMembers(clubId);

      expect(result?.owner).toBeNull();
    });

    it('should handle club with no members', async () => {
      const clubId = uuidv4();
      const ownerId = uuidv4();
      const mockClubWithMembers = {
        ...createMockClub({ id: clubId, ownerId }),
        owner: {
          id: ownerId,
          name: 'Gym Owner',
          email: 'owner@test.com',
          role: UserRole.GYM_OWNER,
        },
        boxers: [],
        coaches: [],
      };

      mockClubFindUnique.mockResolvedValue(mockClubWithMembers);

      const result = await clubService.getClubWithMembers(clubId);

      expect(result?.boxers).toEqual([]);
      expect(result?.coaches).toEqual([]);
    });
  });

  // ==========================================================================
  // General Club Service Tests
  // ==========================================================================

  describe('getClubs', () => {
    it('should return paginated clubs', async () => {
      const mockClubs = [createMockClub({ id: 'club-1' }), createMockClub({ id: 'club-2' })];

      mockClubFindMany.mockResolvedValue(mockClubs);
      mockClubCount.mockResolvedValue(2);

      const result = await clubService.getClubs({ page: 1, limit: 50 });

      expect(result.clubs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by name case-insensitively', async () => {
      mockClubFindMany.mockResolvedValue([]);
      mockClubCount.mockResolvedValue(0);

      await clubService.getClubs({ name: 'test club', page: 1, limit: 50 });

      expect(mockClubFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: {
              contains: 'test club',
              mode: 'insensitive',
            },
          }),
        })
      );
    });

    it('should filter by region case-insensitively', async () => {
      mockClubFindMany.mockResolvedValue([]);
      mockClubCount.mockResolvedValue(0);

      await clubService.getClubs({ region: 'wales', page: 1, limit: 50 });

      expect(mockClubFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            region: {
              contains: 'wales',
              mode: 'insensitive',
            },
          }),
        })
      );
    });
  });

  describe('getClubById', () => {
    it('should return club by id', async () => {
      const clubId = uuidv4();
      const mockClub = createMockClub({ id: clubId });

      mockClubFindUnique.mockResolvedValue(mockClub);

      const result = await clubService.getClubById(clubId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(clubId);
    });

    it('should return null for non-existent club', async () => {
      mockClubFindUnique.mockResolvedValue(null);

      const result = await clubService.getClubById('non-existent-id');

      expect(result).toBeNull();
    });
  });
});
