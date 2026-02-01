// Fight History Permission Tests
// Tests for fight history authorization logic in permission service

import { UserRole, CoachPermission } from '@prisma/client';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the config module
jest.mock('../../src/config', () => ({
  prisma: {
    boxer: {
      findUnique: jest.fn(),
    },
    club: {
      findUnique: jest.fn(),
    },
    coachBoxer: {
      findUnique: jest.fn(),
    },
    fightHistory: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock the Redis cache
jest.mock('../../src/config/redis', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delByPattern: jest.fn(),
  },
}));

// Import after mocking
import { checkFightManagePermissionForBoxer } from '../../src/services/permission.service';
import { prisma } from '../../src/config';
import { cache } from '../../src/config/redis';

// Get typed references to the mocks
const mockBoxerFindUnique = prisma.boxer.findUnique as jest.Mock;
const mockCoachBoxerFindUnique = prisma.coachBoxer.findUnique as jest.Mock;
const mockCacheGet = cache.get as jest.Mock;
const mockCacheSet = cache.set as jest.Mock;

describe('Fight History Permission - checkFightManagePermissionForBoxer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default cache behavior - no cached value
    mockCacheGet.mockResolvedValue(null);
    mockCacheSet.mockResolvedValue(undefined);
  });

  // ============================================================================
  // Admin Tests
  // ============================================================================

  describe('Admin access', () => {
    it('should allow admin to manage any boxer\'s fights', async () => {
      const context = { userId: 'admin-1', role: UserRole.ADMIN };

      const result = await checkFightManagePermissionForBoxer(context, 'boxer-1');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      // Should not check database for admin
      expect(mockCoachBoxerFindUnique).not.toHaveBeenCalled();
      expect(mockBoxerFindUnique).not.toHaveBeenCalled();
    });

    it('should allow admin to manage fights for any boxer', async () => {
      const context = { userId: 'admin-1', role: UserRole.ADMIN };

      const result1 = await checkFightManagePermissionForBoxer(context, 'boxer-1');
      const result2 = await checkFightManagePermissionForBoxer(context, 'boxer-2');
      const result3 = await checkFightManagePermissionForBoxer(context, 'boxer-3');

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result3.allowed).toBe(true);
    });
  });

  // ============================================================================
  // Coach Tests
  // ============================================================================

  describe('Coach access', () => {
    it('should allow coach with MANAGE_FIGHT_HISTORY permission to manage linked boxer\'s fights', async () => {
      const context = { userId: 'coach-1', role: UserRole.COACH };

      mockCoachBoxerFindUnique.mockResolvedValue({
        permissions: CoachPermission.MANAGE_FIGHT_HISTORY,
      });

      const result = await checkFightManagePermissionForBoxer(context, 'boxer-1');

      expect(result.allowed).toBe(true);
      expect(mockCoachBoxerFindUnique).toHaveBeenCalledWith({
        where: {
          coachUserId_boxerId: {
            coachUserId: 'coach-1',
            boxerId: 'boxer-1',
          },
        },
        select: { permissions: true },
      });
    });

    it('should allow coach with FULL_ACCESS permission to manage linked boxer\'s fights', async () => {
      const context = { userId: 'coach-1', role: UserRole.COACH };

      mockCoachBoxerFindUnique.mockResolvedValue({
        permissions: CoachPermission.FULL_ACCESS,
      });

      const result = await checkFightManagePermissionForBoxer(context, 'boxer-1');

      expect(result.allowed).toBe(true);
    });

    it('should deny coach with only VIEW_PROFILE permission from managing fights', async () => {
      const context = { userId: 'coach-1', role: UserRole.COACH };

      mockCoachBoxerFindUnique.mockResolvedValue({
        permissions: CoachPermission.VIEW_PROFILE,
      });

      const result = await checkFightManagePermissionForBoxer(context, 'boxer-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('do not have permission');
    });

    it('should deny coach with only EDIT_PROFILE permission from managing fights', async () => {
      const context = { userId: 'coach-1', role: UserRole.COACH };

      mockCoachBoxerFindUnique.mockResolvedValue({
        permissions: CoachPermission.EDIT_PROFILE,
      });

      const result = await checkFightManagePermissionForBoxer(context, 'boxer-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('do not have permission');
    });

    it('should deny coach with only MANAGE_AVAILABILITY permission from managing fights', async () => {
      const context = { userId: 'coach-1', role: UserRole.COACH };

      mockCoachBoxerFindUnique.mockResolvedValue({
        permissions: CoachPermission.MANAGE_AVAILABILITY,
      });

      const result = await checkFightManagePermissionForBoxer(context, 'boxer-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('do not have permission');
    });

    it('should deny coach with only RESPOND_TO_MATCHES permission from managing fights', async () => {
      const context = { userId: 'coach-1', role: UserRole.COACH };

      mockCoachBoxerFindUnique.mockResolvedValue({
        permissions: CoachPermission.RESPOND_TO_MATCHES,
      });

      const result = await checkFightManagePermissionForBoxer(context, 'boxer-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('do not have permission');
    });

    it('should deny coach without link to boxer from managing fights', async () => {
      const context = { userId: 'coach-1', role: UserRole.COACH };

      mockCoachBoxerFindUnique.mockResolvedValue(null);

      const result = await checkFightManagePermissionForBoxer(context, 'boxer-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('do not have permission');
    });
  });

  // ============================================================================
  // Gym Owner Tests
  // ============================================================================

  describe('Gym Owner access', () => {
    it('should allow gym owner to manage fights for boxers in their club', async () => {
      const context = { userId: 'owner-1', role: UserRole.GYM_OWNER };

      mockBoxerFindUnique.mockResolvedValue({
        club: { ownerId: 'owner-1' },
      });

      const result = await checkFightManagePermissionForBoxer(context, 'boxer-1');

      expect(result.allowed).toBe(true);
      expect(mockBoxerFindUnique).toHaveBeenCalledWith({
        where: { id: 'boxer-1' },
        select: {
          club: {
            select: { ownerId: true },
          },
        },
      });
    });

    it('should deny gym owner from managing fights for boxers outside their club', async () => {
      const context = { userId: 'owner-1', role: UserRole.GYM_OWNER };

      mockBoxerFindUnique.mockResolvedValue({
        club: { ownerId: 'other-owner' },
      });

      const result = await checkFightManagePermissionForBoxer(context, 'boxer-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('only manage fight history for boxers in your club');
    });

    it('should deny gym owner from managing fights for boxers not in any club', async () => {
      const context = { userId: 'owner-1', role: UserRole.GYM_OWNER };

      mockBoxerFindUnique.mockResolvedValue({
        club: null,
      });

      const result = await checkFightManagePermissionForBoxer(context, 'boxer-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('only manage fight history for boxers in your club');
    });
  });

  // ============================================================================
  // Boxer Tests
  // ============================================================================

  describe('Boxer access', () => {
    it('should deny boxer from managing their own fights', async () => {
      const context = { userId: 'boxer-user-1', role: UserRole.BOXER };

      const result = await checkFightManagePermissionForBoxer(context, 'boxer-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Boxers cannot manage their own fight history');
      expect(result.reason).toContain('contact your coach or gym owner');
    });

    it('should deny boxer from managing any other boxer\'s fights', async () => {
      const context = { userId: 'boxer-user-1', role: UserRole.BOXER };

      const result = await checkFightManagePermissionForBoxer(context, 'boxer-2');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Boxers cannot manage their own fight history');
    });
  });

  // ============================================================================
  // Unknown Role Tests
  // ============================================================================

  describe('Unknown role access', () => {
    it('should deny access for unknown roles', async () => {
      // Using a type cast to simulate an unexpected role
      const context = { userId: 'user-1', role: 'UNKNOWN_ROLE' as UserRole };

      const result = await checkFightManagePermissionForBoxer(context, 'boxer-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Not authorized');
    });
  });

  // ============================================================================
  // Caching Tests
  // ============================================================================

  describe('Caching behavior', () => {
    it('should use cached value when available for coach permission', async () => {
      const context = { userId: 'coach-1', role: UserRole.COACH };

      // Return cached value indicating permission exists
      mockCacheGet.mockResolvedValue(true);

      const result = await checkFightManagePermissionForBoxer(context, 'boxer-1');

      expect(result.allowed).toBe(true);
      // Should not hit database when cache is available
      expect(mockCoachBoxerFindUnique).not.toHaveBeenCalled();
    });

    it('should cache coach permission check result', async () => {
      const context = { userId: 'coach-1', role: UserRole.COACH };

      mockCacheGet.mockResolvedValue(null);
      mockCoachBoxerFindUnique.mockResolvedValue({
        permissions: CoachPermission.MANAGE_FIGHT_HISTORY,
      });

      await checkFightManagePermissionForBoxer(context, 'boxer-1');

      expect(mockCacheSet).toHaveBeenCalled();
    });

    it('should use cached value when available for gym owner check', async () => {
      const context = { userId: 'owner-1', role: UserRole.GYM_OWNER };

      // Return cached value indicating boxer is in owned club
      mockCacheGet.mockResolvedValue(true);

      const result = await checkFightManagePermissionForBoxer(context, 'boxer-1');

      expect(result.allowed).toBe(true);
      // Should not hit database when cache is available
      expect(mockBoxerFindUnique).not.toHaveBeenCalled();
    });
  });
});
