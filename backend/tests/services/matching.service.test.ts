// Matching Service Unit Tests
// Tests for matching algorithm and compatible boxer finding

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
    },
  },
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delByPattern: jest.fn(),
  },
}));

jest.mock('../../src/services/boxer.service', () => ({
  getTotalFights: jest.fn((boxer: { wins: number; losses: number; draws: number }) => boxer.wins + boxer.losses + boxer.draws),
}));

// Import after mocking
import * as matchingService from '../../src/services/matching.service';
import { prisma, cache } from '../../src/config';

// Get typed references to the mocks
const mockBoxerFindUnique = prisma.boxer.findUnique as jest.Mock;
const mockBoxerFindMany = prisma.boxer.findMany as jest.Mock;
const mockCacheGet = cache.get as jest.Mock;
const mockCacheSet = cache.set as jest.Mock;
const mockCacheDelByPattern = cache.delByPattern as jest.Mock;

// ============================================================================
// Test Suites
// ============================================================================

describe('Matching Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // MATCHING_RULES Tests
  // ==========================================================================

  describe('MATCHING_RULES', () => {
    it('should have correct weight difference limit', () => {
      expect(matchingService.MATCHING_RULES.maxWeightDifference).toBe(5);
    });

    it('should have correct fights difference limit', () => {
      expect(matchingService.MATCHING_RULES.maxFightsDifference).toBe(3);
    });
  });

  // ==========================================================================
  // calculateMatchScore Tests
  // ==========================================================================

  describe('calculateMatchScore', () => {
    it('should return perfect score for identical boxers', () => {
      const boxer1 = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1,
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: 'New York',
        country: 'USA',
      });
      const boxer2 = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1,
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: 'New York',
        country: 'USA',
      });

      const result = matchingService.calculateMatchScore(boxer1 as any, boxer2 as any);

      expect(result.score).toBe(100);
      expect(result.weightDifference).toBe(0);
      expect(result.fightsDifference).toBe(0);
      expect(result.sameCity).toBe(true);
      expect(result.sameCountry).toBe(true);
      expect(result.compatibleExperience).toBe(true);
    });

    it('should calculate weight compatibility correctly', () => {
      const boxer1 = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1,
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: null,
        country: null,
      });
      const boxer2 = createMockBoxer({
        weightKg: new Prisma.Decimal(78),
        wins: 10,
        losses: 2,
        draws: 1,
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: null,
        country: null,
      });

      const result = matchingService.calculateMatchScore(boxer1 as any, boxer2 as any);

      expect(result.weightDifference).toBe(3);
      // 3kg difference out of 5kg max = 60% of 30 points = 18 points
    });

    it('should return weight difference of exactly max tolerance', () => {
      const boxer1 = createMockBoxer({
        weightKg: new Prisma.Decimal(70),
        wins: 10,
        losses: 2,
        draws: 1,
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: null,
        country: null,
      });
      const boxer2 = createMockBoxer({
        weightKg: new Prisma.Decimal(75), // Exactly 5kg difference
        wins: 10,
        losses: 2,
        draws: 1,
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: null,
        country: null,
      });

      const result = matchingService.calculateMatchScore(boxer1 as any, boxer2 as any);

      expect(result.weightDifference).toBe(5);
      // At max tolerance, weight score should be 0
    });

    it('should handle boxers without weight specified', () => {
      const boxer1 = createMockBoxer({
        weightKg: null,
        wins: 10,
        losses: 2,
        draws: 1,
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: null,
        country: null,
      });
      const boxer2 = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1,
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: null,
        country: null,
      });

      const result = matchingService.calculateMatchScore(boxer1 as any, boxer2 as any);

      // Should get partial score when weight not specified
      expect(result.score).toBeGreaterThan(0);
    });

    it('should calculate fights compatibility correctly', () => {
      const boxer1 = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1, // Total: 13
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: null,
        country: null,
      });
      const boxer2 = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 8,
        losses: 3,
        draws: 0, // Total: 11
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: null,
        country: null,
      });

      const result = matchingService.calculateMatchScore(boxer1 as any, boxer2 as any);

      expect(result.fightsDifference).toBe(2);
    });

    it('should return fights difference at exact tolerance boundary', () => {
      const boxer1 = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 0,
        draws: 0, // Total: 10
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: null,
        country: null,
      });
      const boxer2 = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 7,
        losses: 0,
        draws: 0, // Total: 7, difference of 3
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: null,
        country: null,
      });

      const result = matchingService.calculateMatchScore(boxer1 as any, boxer2 as any);

      expect(result.fightsDifference).toBe(3);
      // At max tolerance, fights score should be 0
    });

    it('should give higher score for same experience level', () => {
      const boxer1 = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1,
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: null,
        country: null,
      });
      const sameLevel = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1,
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: null,
        country: null,
      });
      const adjacentLevel = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1,
        experienceLevel: ExperienceLevel.AMATEUR, // Adjacent level
        city: null,
        country: null,
      });

      const sameResult = matchingService.calculateMatchScore(boxer1 as any, sameLevel as any);
      const adjacentResult = matchingService.calculateMatchScore(boxer1 as any, adjacentLevel as any);

      expect(sameResult.score).toBeGreaterThan(adjacentResult.score);
    });

    it('should give higher score for same city', () => {
      const boxer1 = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1,
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: 'New York',
        country: 'USA',
      });
      const sameCity = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1,
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: 'New York',
        country: 'USA',
      });
      const sameCountryOnly = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1,
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: 'Los Angeles',
        country: 'USA',
      });

      const sameCityResult = matchingService.calculateMatchScore(boxer1 as any, sameCity as any);
      const sameCountryResult = matchingService.calculateMatchScore(boxer1 as any, sameCountryOnly as any);

      expect(sameCityResult.score).toBeGreaterThan(sameCountryResult.score);
      expect(sameCityResult.sameCity).toBe(true);
      expect(sameCountryResult.sameCity).toBe(false);
      expect(sameCountryResult.sameCountry).toBe(true);
    });

    it('should handle case-insensitive city matching', () => {
      const boxer1 = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1,
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: 'new york',
        country: 'USA',
      });
      const boxer2 = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1,
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: 'NEW YORK',
        country: 'USA',
      });

      const result = matchingService.calculateMatchScore(boxer1 as any, boxer2 as any);

      expect(result.sameCity).toBe(true);
    });

    it('should handle case-insensitive country matching', () => {
      const boxer1 = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1,
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: 'Different',
        country: 'usa',
      });
      const boxer2 = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1,
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: 'Cities',
        country: 'USA',
      });

      const result = matchingService.calculateMatchScore(boxer1 as any, boxer2 as any);

      expect(result.sameCountry).toBe(true);
    });

    it('should identify incompatible experience levels', () => {
      const beginner = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 1,
        losses: 0,
        draws: 0,
        experienceLevel: ExperienceLevel.BEGINNER,
        city: null,
        country: null,
      });
      const professional = createMockBoxer({
        weightKg: new Prisma.Decimal(75),
        wins: 50,
        losses: 5,
        draws: 2,
        experienceLevel: ExperienceLevel.PROFESSIONAL,
        city: null,
        country: null,
      });

      const result = matchingService.calculateMatchScore(beginner as any, professional as any);

      expect(result.compatibleExperience).toBe(false);
    });

    it('should include correct boxer reference in result', () => {
      const boxer1 = createMockBoxer({ id: 'boxer-1' });
      const boxer2 = createMockBoxer({ id: 'boxer-2' });

      const result = matchingService.calculateMatchScore(boxer1 as any, boxer2 as any);

      expect(result.boxerId).toBe('boxer-2');
      expect(result.boxer).toBe(boxer2);
    });

    it('should normalize score to 0-100 range', () => {
      const boxer1 = createMockBoxer();
      const boxer2 = createMockBoxer();

      const result = matchingService.calculateMatchScore(boxer1 as any, boxer2 as any);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(result.score)).toBe(true);
    });
  });

  // ==========================================================================
  // findCompatibleBoxers Tests
  // ==========================================================================

  describe('findCompatibleBoxers', () => {
    const sourceBoxerId = 'source-boxer-id';

    it('should return cached results if available', async () => {
      const cachedResult = {
        matches: [{ boxerId: 'cached-boxer', score: 90 }],
        total: 1,
      };

      mockCacheGet.mockResolvedValue(cachedResult);

      const result = await matchingService.findCompatibleBoxers(sourceBoxerId);

      expect(result).toEqual(cachedResult);
      expect(mockBoxerFindUnique).not.toHaveBeenCalled();
    });

    it('should query database when cache miss', async () => {
      const sourceBoxer = createMockBoxer({
        id: sourceBoxerId,
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1,
        experienceLevel: ExperienceLevel.INTERMEDIATE,
      });

      mockCacheGet.mockResolvedValue(null);
      mockBoxerFindUnique.mockResolvedValue(sourceBoxer as any);
      mockBoxerFindMany.mockResolvedValue([]);
      mockCacheSet.mockResolvedValue(undefined);

      await matchingService.findCompatibleBoxers(sourceBoxerId);

      expect(mockBoxerFindUnique).toHaveBeenCalledWith({
        where: { id: sourceBoxerId },
      });
    });

    it('should throw error if source boxer not found', async () => {
      mockCacheGet.mockResolvedValue(null);
      mockBoxerFindUnique.mockResolvedValue(null);

      await expect(matchingService.findCompatibleBoxers(sourceBoxerId)).rejects.toThrow(
        'Boxer not found'
      );
    });

    it('should filter by compatible experience levels by default', async () => {
      const sourceBoxer = createMockBoxer({
        id: sourceBoxerId,
        experienceLevel: ExperienceLevel.INTERMEDIATE,
      });

      mockCacheGet.mockResolvedValue(null);
      mockBoxerFindUnique.mockResolvedValue(sourceBoxer as any);
      mockBoxerFindMany.mockResolvedValue([]);
      mockCacheSet.mockResolvedValue(undefined);

      await matchingService.findCompatibleBoxers(sourceBoxerId);

      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            experienceLevel: {
              in: [
                ExperienceLevel.AMATEUR,
                ExperienceLevel.INTERMEDIATE,
                ExperienceLevel.ADVANCED,
              ],
            },
          }),
        })
      );
    });

    it('should use custom experience level filter when provided', async () => {
      const sourceBoxer = createMockBoxer({
        id: sourceBoxerId,
        experienceLevel: ExperienceLevel.INTERMEDIATE,
      });
      const options = {
        experienceLevelFilter: [ExperienceLevel.BEGINNER, ExperienceLevel.AMATEUR],
      };

      mockCacheGet.mockResolvedValue(null);
      mockBoxerFindUnique.mockResolvedValue(sourceBoxer as any);
      mockBoxerFindMany.mockResolvedValue([]);
      mockCacheSet.mockResolvedValue(undefined);

      await matchingService.findCompatibleBoxers(sourceBoxerId, options);

      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            experienceLevel: {
              in: [ExperienceLevel.BEGINNER, ExperienceLevel.AMATEUR],
            },
          }),
        })
      );
    });

    it('should apply weight tolerance filter', async () => {
      const sourceBoxer = createMockBoxer({
        id: sourceBoxerId,
        weightKg: new Prisma.Decimal(75),
      });

      mockCacheGet.mockResolvedValue(null);
      mockBoxerFindUnique.mockResolvedValue(sourceBoxer as any);
      mockBoxerFindMany.mockResolvedValue([]);
      mockCacheSet.mockResolvedValue(undefined);

      await matchingService.findCompatibleBoxers(sourceBoxerId);

      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              {
                weightKg: {
                  gte: 70, // 75 - 5
                  lte: 80, // 75 + 5
                },
              },
              { weightKg: null },
            ]),
          }),
        })
      );
    });

    it('should apply city filter when provided', async () => {
      const sourceBoxer = createMockBoxer({ id: sourceBoxerId });
      const options = { cityFilter: 'New York' };

      mockCacheGet.mockResolvedValue(null);
      mockBoxerFindUnique.mockResolvedValue(sourceBoxer as any);
      mockBoxerFindMany.mockResolvedValue([]);
      mockCacheSet.mockResolvedValue(undefined);

      await matchingService.findCompatibleBoxers(sourceBoxerId, options);

      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: {
              contains: 'New York',
              mode: 'insensitive',
            },
          }),
        })
      );
    });

    it('should apply country filter when provided', async () => {
      const sourceBoxer = createMockBoxer({ id: sourceBoxerId });
      const options = { countryFilter: 'USA' };

      mockCacheGet.mockResolvedValue(null);
      mockBoxerFindUnique.mockResolvedValue(sourceBoxer as any);
      mockBoxerFindMany.mockResolvedValue([]);
      mockCacheSet.mockResolvedValue(undefined);

      await matchingService.findCompatibleBoxers(sourceBoxerId, options);

      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            country: {
              contains: 'USA',
              mode: 'insensitive',
            },
          }),
        })
      );
    });

    it('should exclude specified boxer IDs', async () => {
      const sourceBoxer = createMockBoxer({ id: sourceBoxerId });
      const options = { excludeBoxerIds: ['boxer-to-exclude-1', 'boxer-to-exclude-2'] };

      mockCacheGet.mockResolvedValue(null);
      mockBoxerFindUnique.mockResolvedValue(sourceBoxer as any);
      mockBoxerFindMany.mockResolvedValue([]);
      mockCacheSet.mockResolvedValue(undefined);

      await matchingService.findCompatibleBoxers(sourceBoxerId, options);

      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: expect.objectContaining({
              not: sourceBoxerId,
              notIn: ['boxer-to-exclude-1', 'boxer-to-exclude-2'],
            }),
          }),
        })
      );
    });

    it('should exclude source boxer from results', async () => {
      const sourceBoxer = createMockBoxer({ id: sourceBoxerId });

      mockCacheGet.mockResolvedValue(null);
      mockBoxerFindUnique.mockResolvedValue(sourceBoxer as any);
      mockBoxerFindMany.mockResolvedValue([]);
      mockCacheSet.mockResolvedValue(undefined);

      await matchingService.findCompatibleBoxers(sourceBoxerId);

      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: expect.objectContaining({
              not: sourceBoxerId,
            }),
          }),
        })
      );
    });

    it('should only return searchable boxers', async () => {
      const sourceBoxer = createMockBoxer({ id: sourceBoxerId });

      mockCacheGet.mockResolvedValue(null);
      mockBoxerFindUnique.mockResolvedValue(sourceBoxer as any);
      mockBoxerFindMany.mockResolvedValue([]);
      mockCacheSet.mockResolvedValue(undefined);

      await matchingService.findCompatibleBoxers(sourceBoxerId);

      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isSearchable: true,
          }),
        })
      );
    });

    it('should only return boxers with active users', async () => {
      const sourceBoxer = createMockBoxer({ id: sourceBoxerId });

      mockCacheGet.mockResolvedValue(null);
      mockBoxerFindUnique.mockResolvedValue(sourceBoxer as any);
      mockBoxerFindMany.mockResolvedValue([]);
      mockCacheSet.mockResolvedValue(undefined);

      await matchingService.findCompatibleBoxers(sourceBoxerId);

      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: { isActive: true },
          }),
        })
      );
    });

    it('should sort results by score in descending order', async () => {
      const sourceBoxer = createMockBoxer({
        id: sourceBoxerId,
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1,
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: 'New York',
        country: 'USA',
      });
      const lowScoreBoxer = createMockBoxer({
        id: 'low-score',
        weightKg: new Prisma.Decimal(80), // 5kg difference
        wins: 7,
        losses: 0,
        draws: 0, // Different fights
        experienceLevel: ExperienceLevel.AMATEUR,
        city: 'Los Angeles', // Different city
        country: 'USA',
      });
      const highScoreBoxer = createMockBoxer({
        id: 'high-score',
        weightKg: new Prisma.Decimal(75), // Same weight
        wins: 10,
        losses: 2,
        draws: 1, // Same fights
        experienceLevel: ExperienceLevel.INTERMEDIATE,
        city: 'New York', // Same city
        country: 'USA',
      });

      mockCacheGet.mockResolvedValue(null);
      mockBoxerFindUnique.mockResolvedValue(sourceBoxer as any);
      // Return low score boxer first
      mockBoxerFindMany.mockResolvedValue([lowScoreBoxer, highScoreBoxer] as any);
      mockCacheSet.mockResolvedValue(undefined);

      const result = await matchingService.findCompatibleBoxers(sourceBoxerId);

      // Should be sorted by score, high to low
      if (result.matches.length >= 2) {
        const first = result.matches[0];
        const second = result.matches[1];
        if (first && second) {
          expect(first.score).toBeGreaterThanOrEqual(second.score);
        }
      }
    });

    it('should respect limit option', async () => {
      const sourceBoxer = createMockBoxer({ id: sourceBoxerId });
      const options = { limit: 5 };

      mockCacheGet.mockResolvedValue(null);
      mockBoxerFindUnique.mockResolvedValue(sourceBoxer as any);
      mockBoxerFindMany.mockResolvedValue([]);
      mockCacheSet.mockResolvedValue(undefined);

      await matchingService.findCompatibleBoxers(sourceBoxerId, options);

      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 15, // 5 * 3 for scoring
        })
      );
    });

    it('should cache results after query', async () => {
      const sourceBoxer = createMockBoxer({ id: sourceBoxerId });

      mockCacheGet.mockResolvedValue(null);
      mockBoxerFindUnique.mockResolvedValue(sourceBoxer as any);
      mockBoxerFindMany.mockResolvedValue([]);
      mockCacheSet.mockResolvedValue(undefined);

      await matchingService.findCompatibleBoxers(sourceBoxerId);

      expect(mockCacheSet).toHaveBeenCalledWith(
        expect.stringContaining(`matches:${sourceBoxerId}`),
        expect.any(Object),
        expect.any(Number)
      );
    });

    it('should filter out boxers exceeding weight tolerance', async () => {
      const sourceBoxer = createMockBoxer({
        id: sourceBoxerId,
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1,
      });
      const incompatibleBoxer = createMockBoxer({
        id: 'incompatible',
        weightKg: new Prisma.Decimal(85), // 10kg difference, exceeds 5kg limit
        wins: 10,
        losses: 2,
        draws: 1,
      });

      mockCacheGet.mockResolvedValue(null);
      mockBoxerFindUnique.mockResolvedValue(sourceBoxer as any);
      mockBoxerFindMany.mockResolvedValue([incompatibleBoxer] as any);
      mockCacheSet.mockResolvedValue(undefined);

      const result = await matchingService.findCompatibleBoxers(sourceBoxerId);

      // Incompatible boxer should be filtered out
      expect(result.matches.some((m) => m.boxerId === 'incompatible')).toBe(false);
    });

    it('should filter out boxers exceeding fights tolerance', async () => {
      const sourceBoxer = createMockBoxer({
        id: sourceBoxerId,
        weightKg: new Prisma.Decimal(75),
        wins: 10,
        losses: 2,
        draws: 1, // Total: 13
      });
      const incompatibleBoxer = createMockBoxer({
        id: 'incompatible',
        weightKg: new Prisma.Decimal(75),
        wins: 20,
        losses: 5,
        draws: 2, // Total: 27, difference of 14
      });

      mockCacheGet.mockResolvedValue(null);
      mockBoxerFindUnique.mockResolvedValue(sourceBoxer as any);
      mockBoxerFindMany.mockResolvedValue([incompatibleBoxer] as any);
      mockCacheSet.mockResolvedValue(undefined);

      const result = await matchingService.findCompatibleBoxers(sourceBoxerId);

      // Incompatible boxer should be filtered out
      expect(result.matches.some((m) => m.boxerId === 'incompatible')).toBe(false);
    });
  });

  // ==========================================================================
  // getSuggestedMatches Tests
  // ==========================================================================

  describe('getSuggestedMatches', () => {
    const boxerId = 'test-boxer-id';

    it('should return cached suggestions if available', async () => {
      const cachedSuggestions = [
        { boxerId: 'suggested-1', score: 95 },
        { boxerId: 'suggested-2', score: 90 },
      ];

      mockCacheGet.mockResolvedValue(cachedSuggestions);

      const result = await matchingService.getSuggestedMatches(boxerId);

      expect(result).toEqual(cachedSuggestions);
    });

    it('should use findCompatibleBoxers when cache miss', async () => {
      const sourceBoxer = createMockBoxer({ id: boxerId });

      mockCacheGet.mockResolvedValueOnce(null); // First call for suggestions
      mockCacheGet.mockResolvedValueOnce(null); // Second call in findCompatibleBoxers
      mockBoxerFindUnique.mockResolvedValue(sourceBoxer as any);
      mockBoxerFindMany.mockResolvedValue([]);
      mockCacheSet.mockResolvedValue(undefined);

      await matchingService.getSuggestedMatches(boxerId);

      expect(mockBoxerFindUnique).toHaveBeenCalledWith({
        where: { id: boxerId },
      });
    });

    it('should default to 10 suggestions', async () => {
      const sourceBoxer = createMockBoxer({ id: boxerId });

      mockCacheGet.mockResolvedValueOnce(null);
      mockCacheGet.mockResolvedValueOnce(null);
      mockBoxerFindUnique.mockResolvedValue(sourceBoxer as any);
      mockBoxerFindMany.mockResolvedValue([]);
      mockCacheSet.mockResolvedValue(undefined);

      await matchingService.getSuggestedMatches(boxerId);

      // The limit should be 10 (default) * 3 = 30
      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 30,
        })
      );
    });

    it('should respect custom limit', async () => {
      const sourceBoxer = createMockBoxer({ id: boxerId });

      mockCacheGet.mockResolvedValueOnce(null);
      mockCacheGet.mockResolvedValueOnce(null);
      mockBoxerFindUnique.mockResolvedValue(sourceBoxer as any);
      mockBoxerFindMany.mockResolvedValue([]);
      mockCacheSet.mockResolvedValue(undefined);

      await matchingService.getSuggestedMatches(boxerId, 5);

      // The limit should be 5 * 3 = 15
      expect(mockBoxerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 15,
        })
      );
    });

    it('should cache suggestions after retrieval', async () => {
      const sourceBoxer = createMockBoxer({ id: boxerId });

      mockCacheGet.mockResolvedValueOnce(null);
      mockCacheGet.mockResolvedValueOnce(null);
      mockBoxerFindUnique.mockResolvedValue(sourceBoxer as any);
      mockBoxerFindMany.mockResolvedValue([]);
      mockCacheSet.mockResolvedValue(undefined);

      await matchingService.getSuggestedMatches(boxerId);

      expect(mockCacheSet).toHaveBeenCalledWith(
        expect.stringContaining(`suggestions:${boxerId}`),
        expect.any(Array),
        expect.any(Number)
      );
    });
  });

  // ==========================================================================
  // invalidateMatchCache Tests
  // ==========================================================================

  describe('invalidateMatchCache', () => {
    const boxerId = 'test-boxer-id';

    it('should invalidate matches cache for boxer', async () => {
      mockCacheDelByPattern.mockResolvedValue(undefined);

      await matchingService.invalidateMatchCache(boxerId);

      expect(mockCacheDelByPattern).toHaveBeenCalledWith(`matches:${boxerId}:*`);
    });

    it('should invalidate suggestions cache for boxer', async () => {
      mockCacheDelByPattern.mockResolvedValue(undefined);

      await matchingService.invalidateMatchCache(boxerId);

      expect(mockCacheDelByPattern).toHaveBeenCalledWith(`suggestions:${boxerId}:*`);
    });

    it('should invalidate all match caches', async () => {
      mockCacheDelByPattern.mockResolvedValue(undefined);

      await matchingService.invalidateMatchCache(boxerId);

      expect(mockCacheDelByPattern).toHaveBeenCalledWith(`matches:*`);
      expect(mockCacheDelByPattern).toHaveBeenCalledWith(`suggestions:*`);
    });
  });
});
