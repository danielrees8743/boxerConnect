// Permission Service Tests
// Tests for permission checking logic with caching

import { UserRole, CoachPermission } from '@prisma/client';
import { Permission } from '../../src/permissions';

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
    availability: {
      findUnique: jest.fn(),
    },
    matchRequest: {
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
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  invalidateUserPermissionCache,
  invalidateBoxerPermissionCache,
  invalidateClubPermissionCache,
} from '../../src/services/permission.service';
import { prisma } from '../../src/config';
import { cache } from '../../src/config/redis';

// Get typed references to the mocks
const mockBoxerFindUnique = prisma.boxer.findUnique as jest.Mock;
const mockClubFindUnique = prisma.club.findUnique as jest.Mock;
const mockCoachBoxerFindUnique = prisma.coachBoxer.findUnique as jest.Mock;
const mockCacheGet = cache.get as jest.Mock;
const mockCacheSet = cache.set as jest.Mock;
const mockCacheDelByPattern = cache.delByPattern as jest.Mock;

describe('Permission Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default cache behavior - no cached value
    mockCacheGet.mockResolvedValue(null);
    mockCacheSet.mockResolvedValue(undefined);
  });

  // ============================================================================
  // Basic Role Permission Tests
  // ============================================================================

  describe('hasPermission - Role-based checks', () => {
    it('should allow permission if role has it (no resource context)', async () => {
      const context = { userId: 'user-1', role: UserRole.BOXER };

      const result = await hasPermission(context, Permission.BOXER_CREATE_PROFILE);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should deny permission if role does not have it', async () => {
      const context = { userId: 'user-1', role: UserRole.BOXER };

      const result = await hasPermission(context, Permission.ADMIN_VERIFY_BOXER);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('does not have permission');
    });

    it('should allow admin to have any permission', async () => {
      const context = { userId: 'admin-1', role: UserRole.ADMIN };

      const result = await hasPermission(context, Permission.ADMIN_VERIFY_BOXER);

      expect(result.allowed).toBe(true);
    });

    it('should allow coach to have match management permissions', async () => {
      const context = { userId: 'coach-1', role: UserRole.COACH };

      const result = await hasPermission(context, Permission.MATCH_CREATE_REQUEST);

      expect(result.allowed).toBe(true);
    });

    it('should deny boxer match creation permission', async () => {
      const context = { userId: 'boxer-1', role: UserRole.BOXER };

      const result = await hasPermission(context, Permission.MATCH_CREATE_REQUEST);

      expect(result.allowed).toBe(false);
    });
  });

  // ============================================================================
  // Boxer Resource Permission Tests
  // ============================================================================

  describe('hasPermission - Boxer resource checks', () => {
    it('should allow boxer to update own profile', async () => {
      const context = { userId: 'user-1', role: UserRole.BOXER };
      const resourceContext = { resourceType: 'boxer' as const, resourceId: 'boxer-1' };

      mockBoxerFindUnique.mockResolvedValue({ userId: 'user-1' });

      const result = await hasPermission(
        context,
        Permission.BOXER_UPDATE_OWN_PROFILE,
        resourceContext
      );

      expect(result.allowed).toBe(true);
      expect(mockBoxerFindUnique).toHaveBeenCalledWith({
        where: { id: 'boxer-1' },
        select: { userId: true },
      });
    });

    it('should deny boxer from updating another boxer profile', async () => {
      const context = { userId: 'user-1', role: UserRole.BOXER };
      const resourceContext = { resourceType: 'boxer' as const, resourceId: 'boxer-2' };

      mockBoxerFindUnique.mockResolvedValue({ userId: 'user-2' });

      const result = await hasPermission(
        context,
        Permission.BOXER_UPDATE_OWN_PROFILE,
        resourceContext
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('only perform this action on your own');
    });

    it('should allow coach to update linked boxer profile with permission', async () => {
      const context = { userId: 'coach-1', role: UserRole.COACH };
      const resourceContext = { resourceType: 'boxer' as const, resourceId: 'boxer-1' };

      mockCoachBoxerFindUnique.mockResolvedValue({
        permissions: CoachPermission.EDIT_PROFILE,
      });

      const result = await hasPermission(
        context,
        Permission.BOXER_UPDATE_LINKED_PROFILE,
        resourceContext
      );

      expect(result.allowed).toBe(true);
    });

    it('should allow coach with FULL_ACCESS to update linked boxer profile', async () => {
      const context = { userId: 'coach-1', role: UserRole.COACH };
      const resourceContext = { resourceType: 'boxer' as const, resourceId: 'boxer-1' };

      mockCoachBoxerFindUnique.mockResolvedValue({
        permissions: CoachPermission.FULL_ACCESS,
      });

      const result = await hasPermission(
        context,
        Permission.BOXER_UPDATE_LINKED_PROFILE,
        resourceContext
      );

      expect(result.allowed).toBe(true);
    });

    it('should deny coach without link to update boxer profile', async () => {
      const context = { userId: 'coach-1', role: UserRole.COACH };
      const resourceContext = { resourceType: 'boxer' as const, resourceId: 'boxer-1' };

      mockCoachBoxerFindUnique.mockResolvedValue(null);

      const result = await hasPermission(
        context,
        Permission.BOXER_UPDATE_LINKED_PROFILE,
        resourceContext
      );

      expect(result.allowed).toBe(false);
    });

    it('should deny gym owner from updating boxer profile (no BOXER_UPDATE_LINKED_PROFILE permission)', async () => {
      // Note: Gym owners can manage availability and matches for club members,
      // but cannot directly edit boxer profiles. Only coaches with EDIT_PROFILE permission can do that.
      const context = { userId: 'owner-1', role: UserRole.GYM_OWNER };
      const resourceContext = { resourceType: 'boxer' as const, resourceId: 'boxer-1' };

      const result = await hasPermission(
        context,
        Permission.BOXER_UPDATE_LINKED_PROFILE,
        resourceContext
      );

      // GYM_OWNER does not have BOXER_UPDATE_LINKED_PROFILE permission
      // They manage availability and matches, not boxer profiles directly
      expect(result.allowed).toBe(false);
    });
  });

  // ============================================================================
  // Club Resource Permission Tests
  // ============================================================================

  describe('hasPermission - Club resource checks', () => {
    it('should allow club owner to add boxer to club', async () => {
      const context = { userId: 'owner-1', role: UserRole.GYM_OWNER };
      const resourceContext = { resourceType: 'club' as const, resourceId: 'club-1' };

      mockClubFindUnique.mockResolvedValue({ ownerId: 'owner-1' });

      const result = await hasPermission(
        context,
        Permission.CLUB_MEMBER_ADD_BOXER,
        resourceContext
      );

      expect(result.allowed).toBe(true);
    });

    it('should deny non-owner from adding boxer to club', async () => {
      const context = { userId: 'other-owner', role: UserRole.GYM_OWNER };
      const resourceContext = { resourceType: 'club' as const, resourceId: 'club-1' };

      mockClubFindUnique.mockResolvedValue({ ownerId: 'owner-1' });

      const result = await hasPermission(
        context,
        Permission.CLUB_MEMBER_ADD_BOXER,
        resourceContext
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Only the club owner');
    });

    it('should allow admin to manage any club', async () => {
      const context = { userId: 'admin-1', role: UserRole.ADMIN };
      const resourceContext = { resourceType: 'club' as const, resourceId: 'club-1' };

      const result = await hasPermission(
        context,
        Permission.CLUB_MEMBER_ADD_BOXER,
        resourceContext
      );

      expect(result.allowed).toBe(true);
    });

    it('should only allow admin to set club owner', async () => {
      const ownerContext = { userId: 'owner-1', role: UserRole.GYM_OWNER };
      const adminContext = { userId: 'admin-1', role: UserRole.ADMIN };
      const resourceContext = { resourceType: 'club' as const, resourceId: 'club-1' };

      const ownerResult = await hasPermission(
        ownerContext,
        Permission.CLUB_SET_OWNER,
        resourceContext
      );
      const adminResult = await hasPermission(
        adminContext,
        Permission.CLUB_SET_OWNER,
        resourceContext
      );

      expect(ownerResult.allowed).toBe(false);
      expect(adminResult.allowed).toBe(true);
    });

    it('should allow anyone with permission to read club members', async () => {
      const context = { userId: 'boxer-1', role: UserRole.BOXER };
      const resourceContext = { resourceType: 'club' as const, resourceId: 'club-1' };

      const result = await hasPermission(
        context,
        Permission.CLUB_READ_MEMBERS,
        resourceContext
      );

      expect(result.allowed).toBe(true);
    });
  });

  // ============================================================================
  // hasAnyPermission Tests
  // ============================================================================

  describe('hasAnyPermission', () => {
    it('should allow if user has any of the permissions', async () => {
      const context = { userId: 'boxer-1', role: UserRole.BOXER };

      const result = await hasAnyPermission(context, [
        Permission.ADMIN_VERIFY_BOXER, // doesn't have
        Permission.BOXER_CREATE_PROFILE, // has this
      ]);

      expect(result.allowed).toBe(true);
    });

    it('should deny if user has none of the permissions', async () => {
      const context = { userId: 'boxer-1', role: UserRole.BOXER };

      const result = await hasAnyPermission(context, [
        Permission.ADMIN_VERIFY_BOXER,
        Permission.CLUB_SET_OWNER,
      ]);

      expect(result.allowed).toBe(false);
    });
  });

  // ============================================================================
  // hasAllPermissions Tests
  // ============================================================================

  describe('hasAllPermissions', () => {
    it('should allow if user has all permissions', async () => {
      const context = { userId: 'boxer-1', role: UserRole.BOXER };

      const result = await hasAllPermissions(context, [
        Permission.BOXER_CREATE_PROFILE,
        Permission.BOXER_READ_OWN_PROFILE,
      ]);

      expect(result.allowed).toBe(true);
    });

    it('should deny if user is missing any permission', async () => {
      const context = { userId: 'boxer-1', role: UserRole.BOXER };

      const result = await hasAllPermissions(context, [
        Permission.BOXER_CREATE_PROFILE,
        Permission.ADMIN_VERIFY_BOXER,
      ]);

      expect(result.allowed).toBe(false);
    });
  });

  // ============================================================================
  // Caching Tests
  // ============================================================================

  describe('Caching behavior', () => {
    it('should use cached value when available', async () => {
      const context = { userId: 'user-1', role: UserRole.BOXER };
      const resourceContext = { resourceType: 'boxer' as const, resourceId: 'boxer-1' };

      // Return cached value
      mockCacheGet.mockResolvedValue(true);

      const result = await hasPermission(
        context,
        Permission.BOXER_UPDATE_OWN_PROFILE,
        resourceContext
      );

      expect(result.allowed).toBe(true);
      // Should not hit database
      expect(mockBoxerFindUnique).not.toHaveBeenCalled();
    });

    it('should cache permission check result', async () => {
      const context = { userId: 'user-1', role: UserRole.BOXER };
      const resourceContext = { resourceType: 'boxer' as const, resourceId: 'boxer-1' };

      mockCacheGet.mockResolvedValue(null);
      mockBoxerFindUnique.mockResolvedValue({ userId: 'user-1' });

      await hasPermission(
        context,
        Permission.BOXER_UPDATE_OWN_PROFILE,
        resourceContext
      );

      expect(mockCacheSet).toHaveBeenCalled();
      expect(mockCacheSet.mock.calls[0][2]).toBe(300); // 5 minute TTL
    });
  });

  // ============================================================================
  // Cache Invalidation Tests
  // ============================================================================

  describe('Cache invalidation', () => {
    it('should invalidate user permission cache', async () => {
      await invalidateUserPermissionCache('user-1');

      expect(mockCacheDelByPattern).toHaveBeenCalledWith(
        expect.stringContaining('user-1')
      );
    });

    it('should invalidate boxer permission cache', async () => {
      await invalidateBoxerPermissionCache('boxer-1');

      expect(mockCacheDelByPattern).toHaveBeenCalledWith(
        expect.stringContaining('boxer-1')
      );
    });

    it('should invalidate club permission cache', async () => {
      await invalidateClubPermissionCache('club-1');

      expect(mockCacheDelByPattern).toHaveBeenCalledWith(
        expect.stringContaining('club-1')
      );
    });
  });
});
