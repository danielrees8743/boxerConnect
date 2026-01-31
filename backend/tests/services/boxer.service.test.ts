// Boxer Service Unit Tests
// Tests for boxer profile-related business logic

import { ExperienceLevel, Prisma } from '@prisma/client';
import { createMockBoxer } from '../utils/testUtils';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the config module before importing the service
jest.mock('../../src/config', () => ({
  prisma: {
    boxer: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Import after mocking
import * as boxerService from '../../src/services/boxer.service';
import { prisma } from '../../src/config';

// Get typed references to the mocks
const mockBoxerFindUnique = prisma.boxer.findUnique as jest.Mock;
const mockBoxerFindMany = prisma.boxer.findMany as jest.Mock;
const mockBoxerCreate = prisma.boxer.create as jest.Mock;
const mockBoxerUpdate = prisma.boxer.update as jest.Mock;
const mockBoxerCount = prisma.boxer.count as jest.Mock;

// ============================================================================
// Test Suites
// ============================================================================

describe('Boxer Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // createBoxer Tests
  // ==========================================================================

  describe('createBoxer', () => {
    const userId = 'test-user-id';
    const createData = {
      name: 'Test Boxer',
      weightKg: 75.5,
      heightCm: 180,
      city: 'New York',
      country: 'USA',
      experienceLevel: ExperienceLevel.INTERMEDIATE,
      wins: 10,
      losses: 2,
      draws: 1,
    };

    it('should create a new boxer profile successfully', async () => {
      const mockBoxer = createMockBoxer({
        userId,
        name: createData.name,
        city: createData.city,
        country: createData.country,
      });

      mockBoxerFindUnique.mockResolvedValue(null);
      mockBoxerCreate.mockResolvedValue(mockBoxer as any);

      const result = await boxerService.createBoxer(userId, createData);

      expect(result).toBeDefined();
      expect(result.name).toBe(createData.name);
      expect(mockBoxerCreate).toHaveBeenCalled();
    });

    it('should update existing boxer profile instead of creating duplicate', async () => {
      const existingBoxer = createMockBoxer({ userId });
      const updatedBoxer = { ...existingBoxer, name: createData.name };

      mockBoxerFindUnique.mockResolvedValue(existingBoxer as any);
      mockBoxerUpdate.mockResolvedValue(updatedBoxer as any);

      const result = await boxerService.createBoxer(userId, createData);

      expect(result).toBeDefined();
      expect(mockBoxerUpdate).toHaveBeenCalled();
      expect(mockBoxerCreate).not.toHaveBeenCalled();
    });

    it('should use default values for optional fields', async () => {
      const minimalData = {
        name: 'Minimal Boxer',
        experienceLevel: ExperienceLevel.BEGINNER,
        wins: 0,
        losses: 0,
        draws: 0,
      };
      const mockBoxer = createMockBoxer({
        userId,
        name: minimalData.name,
        wins: 0,
        losses: 0,
        draws: 0,
        experienceLevel: ExperienceLevel.BEGINNER,
      });

      mockBoxerFindUnique.mockResolvedValue(null);
      mockBoxerCreate.mockResolvedValue(mockBoxer as any);

      await boxerService.createBoxer(userId, minimalData);

      expect(mockBoxerCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: minimalData.name,
            experienceLevel: ExperienceLevel.BEGINNER,
            wins: 0,
            losses: 0,
            draws: 0,
          }),
        })
      );
    });

    it('should correctly handle decimal weight values', async () => {
      const dataWithDecimal = { ...createData, weightKg: 72.25 };
      const mockBoxer = createMockBoxer({
        userId,
        weightKg: new Prisma.Decimal(72.25),
      });

      mockBoxerFindUnique.mockResolvedValue(null);
      mockBoxerCreate.mockResolvedValue(mockBoxer as any);

      await boxerService.createBoxer(userId, dataWithDecimal);

      expect(mockBoxerCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            weightKg: 72.25,
          }),
        })
      );
    });
  });

  // ==========================================================================
  // getBoxerById Tests
  // ==========================================================================

  describe('getBoxerById', () => {
    it('should return boxer with user info', async () => {
      const boxerId = 'test-boxer-id';
      const mockBoxer = {
        ...createMockBoxer({ id: boxerId }),
        user: {
          id: 'user-id',
          email: 'test@example.com',
          name: 'Test User',
          role: 'BOXER',
          isActive: true,
          emailVerified: false,
        },
      };

      mockBoxerFindUnique.mockResolvedValue(mockBoxer as any);

      const result = await boxerService.getBoxerById(boxerId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(boxerId);
      expect(result?.user).toBeDefined();
      expect(result?.user?.email).toBe('test@example.com');
    });

    it('should return null for non-existent boxer', async () => {
      mockBoxerFindUnique.mockResolvedValue(null);

      const result = await boxerService.getBoxerById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should include correct select fields for user', async () => {
      const boxerId = 'test-boxer-id';
      mockBoxerFindUnique.mockResolvedValue(null);

      await boxerService.getBoxerById(boxerId);

      expect(mockBoxerFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: boxerId },
          include: expect.objectContaining({
            user: expect.objectContaining({
              select: expect.objectContaining({
                id: true,
                email: true,
                name: true,
              }),
            }),
          }),
        })
      );
    });
  });

  // ==========================================================================
  // getBoxerByUserId Tests
  // ==========================================================================

  describe('getBoxerByUserId', () => {
    it('should return boxer for given userId', async () => {
      const userId = 'test-user-id';
      const mockBoxer = {
        ...createMockBoxer({ userId }),
        user: {
          id: userId,
          email: 'test@example.com',
          name: 'Test User',
          role: 'BOXER',
          isActive: true,
          emailVerified: false,
        },
      };

      mockBoxerFindUnique.mockResolvedValue(mockBoxer as any);

      const result = await boxerService.getBoxerByUserId(userId);

      expect(result).toBeDefined();
      expect(result?.userId).toBe(userId);
    });

    it('should return null if user has no boxer profile', async () => {
      mockBoxerFindUnique.mockResolvedValue(null);

      const result = await boxerService.getBoxerByUserId('user-without-boxer');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // updateBoxer Tests
  // ==========================================================================

  describe('updateBoxer', () => {
    const boxerId = 'test-boxer-id';
    const userId = 'test-user-id';
    const updateData = {
      dateOfBirth: null as Date | null,
      name: 'Updated Boxer Name',
      weightKg: 78.0,
      city: 'Los Angeles',
    };

    it('should update boxer profile successfully', async () => {
      const existingBoxer = createMockBoxer({ id: boxerId, userId });
      const updatedBoxer = { ...existingBoxer, ...updateData };

      mockBoxerFindUnique.mockResolvedValue(existingBoxer as any);
      mockBoxerUpdate.mockResolvedValue(updatedBoxer as any);

      const result = await boxerService.updateBoxer(boxerId, userId, updateData);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateData.name);
      expect(mockBoxerUpdate).toHaveBeenCalled();
    });

    it('should throw error if boxer not found', async () => {
      mockBoxerFindUnique.mockResolvedValue(null);

      await expect(
        boxerService.updateBoxer(boxerId, userId, updateData)
      ).rejects.toThrow('Boxer profile not found');
    });

    it('should throw error if user is not the owner', async () => {
      const existingBoxer = createMockBoxer({
        id: boxerId,
        userId: 'different-user-id',
      });

      mockBoxerFindUnique.mockResolvedValue(existingBoxer as any);

      await expect(
        boxerService.updateBoxer(boxerId, userId, updateData)
      ).rejects.toThrow('Not authorized to update this profile');
    });

    it('should allow updating isSearchable flag', async () => {
      const existingBoxer = createMockBoxer({ id: boxerId, userId, isSearchable: true });
      const updatedBoxer = { ...existingBoxer, isSearchable: false };

      mockBoxerFindUnique.mockResolvedValue(existingBoxer as any);
      mockBoxerUpdate.mockResolvedValue(updatedBoxer as any);

      await boxerService.updateBoxer(boxerId, userId, { dateOfBirth: null, isSearchable: false });

      expect(mockBoxerUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isSearchable: false,
          }),
        })
      );
    });

    it('should handle null values for clearing fields', async () => {
      const existingBoxer = createMockBoxer({ id: boxerId, userId });

      mockBoxerFindUnique.mockResolvedValue(existingBoxer as any);
      mockBoxerUpdate.mockResolvedValue({ ...existingBoxer, bio: null } as any);

      await boxerService.updateBoxer(boxerId, userId, { dateOfBirth: null, bio: null });

      expect(mockBoxerUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bio: null,
          }),
        })
      );
    });

    it('should only update provided fields', async () => {
      const existingBoxer = createMockBoxer({ id: boxerId, userId });
      const partialUpdate = { dateOfBirth: null as Date | null, name: 'Only Name Updated' };

      mockBoxerFindUnique.mockResolvedValue(existingBoxer as any);
      mockBoxerUpdate.mockResolvedValue({ ...existingBoxer, ...partialUpdate } as any);

      await boxerService.updateBoxer(boxerId, userId, partialUpdate);

      // Should only include the name and dateOfBirth fields
      expect(mockBoxerUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: 'Only Name Updated', dateOfBirth: null },
        })
      );
    });
  });

  // ==========================================================================
  // searchBoxers Tests
  // ==========================================================================

  describe('searchBoxers', () => {
    const defaultParams = {
      page: 1,
      limit: 20,
    };

    it('should return paginated boxers', async () => {
      const mockBoxers = [
        createMockBoxer({ id: 'boxer-1' }),
        createMockBoxer({ id: 'boxer-2' }),
      ];

      mockBoxerFindMany.mockResolvedValue(mockBoxers as any);
      mockBoxerCount.mockResolvedValue(2);

      const result = await boxerService.searchBoxers(defaultParams);

      expect(result).toBeDefined();
      expect(result.boxers).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by city (case-insensitive)', async () => {
      const params = { ...defaultParams, city: 'new york' };

      mockBoxerFindMany.mockResolvedValue([]);
      mockBoxerCount.mockResolvedValue(0);

      await boxerService.searchBoxers(params);

      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: {
              contains: 'new york',
              mode: 'insensitive',
            },
          }),
        })
      );
    });

    it('should filter by country (case-insensitive)', async () => {
      const params = { ...defaultParams, country: 'usa' };

      mockBoxerFindMany.mockResolvedValue([]);
      mockBoxerCount.mockResolvedValue(0);

      await boxerService.searchBoxers(params);

      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            country: {
              contains: 'usa',
              mode: 'insensitive',
            },
          }),
        })
      );
    });

    it('should filter by experience level', async () => {
      const params = {
        ...defaultParams,
        experienceLevel: ExperienceLevel.INTERMEDIATE,
      };

      mockBoxerFindMany.mockResolvedValue([]);
      mockBoxerCount.mockResolvedValue(0);

      await boxerService.searchBoxers(params);

      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            experienceLevel: ExperienceLevel.INTERMEDIATE,
          }),
        })
      );
    });

    it('should filter by minimum weight', async () => {
      const params = { ...defaultParams, minWeight: 70 };

      mockBoxerFindMany.mockResolvedValue([]);
      mockBoxerCount.mockResolvedValue(0);

      await boxerService.searchBoxers(params);

      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            weightKg: expect.objectContaining({
              gte: 70,
            }),
          }),
        })
      );
    });

    it('should filter by maximum weight', async () => {
      const params = { ...defaultParams, maxWeight: 80 };

      mockBoxerFindMany.mockResolvedValue([]);
      mockBoxerCount.mockResolvedValue(0);

      await boxerService.searchBoxers(params);

      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            weightKg: expect.objectContaining({
              lte: 80,
            }),
          }),
        })
      );
    });

    it('should filter by weight range', async () => {
      const params = { ...defaultParams, minWeight: 70, maxWeight: 80 };

      mockBoxerFindMany.mockResolvedValue([]);
      mockBoxerCount.mockResolvedValue(0);

      await boxerService.searchBoxers(params);

      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            weightKg: {
              gte: 70,
              lte: 80,
            },
          }),
        })
      );
    });

    it('should only return searchable boxers', async () => {
      mockBoxerFindMany.mockResolvedValue([]);
      mockBoxerCount.mockResolvedValue(0);

      await boxerService.searchBoxers(defaultParams);

      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isSearchable: true,
          }),
        })
      );
    });

    it('should only return boxers with active users', async () => {
      mockBoxerFindMany.mockResolvedValue([]);
      mockBoxerCount.mockResolvedValue(0);

      await boxerService.searchBoxers(defaultParams);

      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: {
              isActive: true,
            },
          }),
        })
      );
    });

    it('should calculate pagination correctly', async () => {
      const params = { page: 3, limit: 10 };

      mockBoxerFindMany.mockResolvedValue([]);
      mockBoxerCount.mockResolvedValue(50);

      const result = await boxerService.searchBoxers(params);

      expect(result.totalPages).toBe(5);
      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3 - 1) * 10
          take: 10,
        })
      );
    });

    it('should order by verified first, then by creation date', async () => {
      mockBoxerFindMany.mockResolvedValue([]);
      mockBoxerCount.mockResolvedValue(0);

      await boxerService.searchBoxers(defaultParams);

      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ isVerified: 'desc' }, { createdAt: 'desc' }],
        })
      );
    });

    it('should combine multiple filters', async () => {
      const params = {
        page: 1,
        limit: 20,
        city: 'New York',
        country: 'USA',
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        minWeight: 70,
        maxWeight: 80,
      };

      mockBoxerFindMany.mockResolvedValue([]);
      mockBoxerCount.mockResolvedValue(0);

      await boxerService.searchBoxers(params);

      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: { contains: 'New York', mode: 'insensitive' },
            country: { contains: 'USA', mode: 'insensitive' },
            experienceLevel: ExperienceLevel.INTERMEDIATE,
            weightKg: { gte: 70, lte: 80 },
          }),
        })
      );
    });
  });

  // ==========================================================================
  // deleteBoxer Tests
  // ==========================================================================

  describe('deleteBoxer', () => {
    const boxerId = 'test-boxer-id';
    const userId = 'test-user-id';

    it('should soft delete boxer by setting isSearchable to false', async () => {
      const existingBoxer = createMockBoxer({ id: boxerId, userId, isSearchable: true });
      const deletedBoxer = { ...existingBoxer, isSearchable: false };

      mockBoxerFindUnique.mockResolvedValue(existingBoxer as any);
      mockBoxerUpdate.mockResolvedValue(deletedBoxer as any);

      const result = await boxerService.deleteBoxer(boxerId, userId);

      expect(result.isSearchable).toBe(false);
      expect(mockBoxerUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: boxerId },
          data: { isSearchable: false },
        })
      );
    });

    it('should throw error if boxer not found', async () => {
      mockBoxerFindUnique.mockResolvedValue(null);

      await expect(boxerService.deleteBoxer(boxerId, userId)).rejects.toThrow(
        'Boxer profile not found'
      );
    });

    it('should throw error if user is not the owner', async () => {
      const existingBoxer = createMockBoxer({
        id: boxerId,
        userId: 'different-user-id',
      });

      mockBoxerFindUnique.mockResolvedValue(existingBoxer as any);

      await expect(boxerService.deleteBoxer(boxerId, userId)).rejects.toThrow(
        'Not authorized to delete this profile'
      );
    });
  });

  // ==========================================================================
  // getTotalFights Tests
  // ==========================================================================

  describe('getTotalFights', () => {
    it('should calculate total fights correctly', () => {
      const boxer = createMockBoxer({
        wins: 10,
        losses: 2,
        draws: 1,
      });

      const total = boxerService.getTotalFights(boxer as any);

      expect(total).toBe(13); // 10 + 2 + 1
    });

    it('should return 0 for boxer with no fights', () => {
      const boxer = createMockBoxer({
        wins: 0,
        losses: 0,
        draws: 0,
      });

      const total = boxerService.getTotalFights(boxer as any);

      expect(total).toBe(0);
    });

    it('should handle large fight counts', () => {
      const boxer = createMockBoxer({
        wins: 100,
        losses: 50,
        draws: 25,
      });

      const total = boxerService.getTotalFights(boxer as any);

      expect(total).toBe(175);
    });
  });
});
