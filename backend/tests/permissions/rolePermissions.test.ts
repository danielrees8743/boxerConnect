// Role-Permission Mapping Tests
// Tests for static role-to-permission mappings

import { UserRole } from '@prisma/client';
import {
  Permission,
  ROLE_PERMISSIONS,
  roleHasPermission,
  getPermissionsForRole,
  roleHasAnyPermission,
  roleHasAllPermissions,
} from '../../src/permissions';

describe('Role-Permission Mappings', () => {
  // ============================================================================
  // Permission Enum Completeness Tests
  // ============================================================================

  describe('Permission Enum', () => {
    it('should have all expected boxer permissions', () => {
      expect(Permission.BOXER_CREATE_PROFILE).toBe('boxer:create:profile');
      expect(Permission.BOXER_READ_OWN_PROFILE).toBe('boxer:read:own');
      expect(Permission.BOXER_READ_ANY_PROFILE).toBe('boxer:read:any');
      expect(Permission.BOXER_UPDATE_OWN_PROFILE).toBe('boxer:update:own');
      expect(Permission.BOXER_UPDATE_LINKED_PROFILE).toBe('boxer:update:linked');
      expect(Permission.BOXER_DELETE_OWN_PROFILE).toBe('boxer:delete:own');
      expect(Permission.BOXER_UPLOAD_PHOTO).toBe('boxer:upload:photo');
    });

    it('should have all expected match permissions', () => {
      expect(Permission.MATCH_CREATE_REQUEST).toBe('match:create:request');
      expect(Permission.MATCH_READ_OWN_REQUESTS).toBe('match:read:own');
      expect(Permission.MATCH_ACCEPT_REQUEST).toBe('match:accept');
      expect(Permission.MATCH_DECLINE_REQUEST).toBe('match:decline');
      expect(Permission.MATCH_CANCEL_REQUEST).toBe('match:cancel');
    });

    it('should have all expected availability permissions', () => {
      expect(Permission.AVAILABILITY_CREATE).toBe('availability:create');
      expect(Permission.AVAILABILITY_READ).toBe('availability:read');
      expect(Permission.AVAILABILITY_UPDATE).toBe('availability:update');
      expect(Permission.AVAILABILITY_DELETE).toBe('availability:delete');
    });

    it('should have all expected club permissions', () => {
      expect(Permission.CLUB_READ_PUBLIC).toBe('club:read:public');
      expect(Permission.CLUB_READ_MEMBERS).toBe('club:read:members');
      expect(Permission.CLUB_MEMBER_ADD_BOXER).toBe('club:member:add:boxer');
      expect(Permission.CLUB_MEMBER_REMOVE_BOXER).toBe('club:member:remove:boxer');
      expect(Permission.CLUB_MEMBER_ADD_COACH).toBe('club:member:add:coach');
      expect(Permission.CLUB_MEMBER_REMOVE_COACH).toBe('club:member:remove:coach');
      expect(Permission.CLUB_SET_OWNER).toBe('club:set:owner');
    });

    it('should have all expected coach permissions', () => {
      expect(Permission.COACH_LINK_BOXER).toBe('coach:link:boxer');
      expect(Permission.COACH_UNLINK_BOXER).toBe('coach:unlink:boxer');
      expect(Permission.COACH_UPDATE_BOXER_PERMISSIONS).toBe('coach:update:boxer:permissions');
    });

    it('should have all expected admin permissions', () => {
      expect(Permission.ADMIN_READ_ALL_USERS).toBe('admin:read:users');
      expect(Permission.ADMIN_UPDATE_USER_STATUS).toBe('admin:update:user:status');
      expect(Permission.ADMIN_VERIFY_BOXER).toBe('admin:verify:boxer');
      expect(Permission.ADMIN_READ_SYSTEM_STATS).toBe('admin:read:stats');
    });
  });

  // ============================================================================
  // BOXER Role Tests
  // ============================================================================

  describe('BOXER Role Permissions', () => {
    it('should have profile management permissions', () => {
      expect(roleHasPermission(UserRole.BOXER, Permission.BOXER_CREATE_PROFILE)).toBe(true);
      expect(roleHasPermission(UserRole.BOXER, Permission.BOXER_READ_OWN_PROFILE)).toBe(true);
      expect(roleHasPermission(UserRole.BOXER, Permission.BOXER_READ_ANY_PROFILE)).toBe(true);
      expect(roleHasPermission(UserRole.BOXER, Permission.BOXER_UPDATE_OWN_PROFILE)).toBe(true);
      expect(roleHasPermission(UserRole.BOXER, Permission.BOXER_DELETE_OWN_PROFILE)).toBe(true);
      expect(roleHasPermission(UserRole.BOXER, Permission.BOXER_UPLOAD_PHOTO)).toBe(true);
    });

    it('should have read-only match and availability permissions', () => {
      expect(roleHasPermission(UserRole.BOXER, Permission.MATCH_READ_OWN_REQUESTS)).toBe(true);
      expect(roleHasPermission(UserRole.BOXER, Permission.AVAILABILITY_READ)).toBe(true);
    });

    it('should have club read permissions', () => {
      expect(roleHasPermission(UserRole.BOXER, Permission.CLUB_READ_PUBLIC)).toBe(true);
      expect(roleHasPermission(UserRole.BOXER, Permission.CLUB_READ_MEMBERS)).toBe(true);
    });

    it('should NOT have match management permissions', () => {
      expect(roleHasPermission(UserRole.BOXER, Permission.MATCH_CREATE_REQUEST)).toBe(false);
      expect(roleHasPermission(UserRole.BOXER, Permission.MATCH_ACCEPT_REQUEST)).toBe(false);
      expect(roleHasPermission(UserRole.BOXER, Permission.MATCH_DECLINE_REQUEST)).toBe(false);
      expect(roleHasPermission(UserRole.BOXER, Permission.MATCH_CANCEL_REQUEST)).toBe(false);
    });

    it('should NOT have availability management permissions', () => {
      expect(roleHasPermission(UserRole.BOXER, Permission.AVAILABILITY_CREATE)).toBe(false);
      expect(roleHasPermission(UserRole.BOXER, Permission.AVAILABILITY_UPDATE)).toBe(false);
      expect(roleHasPermission(UserRole.BOXER, Permission.AVAILABILITY_DELETE)).toBe(false);
    });

    it('should NOT have club management permissions', () => {
      expect(roleHasPermission(UserRole.BOXER, Permission.CLUB_MEMBER_ADD_BOXER)).toBe(false);
      expect(roleHasPermission(UserRole.BOXER, Permission.CLUB_MEMBER_REMOVE_BOXER)).toBe(false);
      expect(roleHasPermission(UserRole.BOXER, Permission.CLUB_SET_OWNER)).toBe(false);
    });

    it('should NOT have coach permissions', () => {
      expect(roleHasPermission(UserRole.BOXER, Permission.COACH_LINK_BOXER)).toBe(false);
      expect(roleHasPermission(UserRole.BOXER, Permission.COACH_UNLINK_BOXER)).toBe(false);
    });

    it('should NOT have admin permissions', () => {
      expect(roleHasPermission(UserRole.BOXER, Permission.ADMIN_READ_ALL_USERS)).toBe(false);
      expect(roleHasPermission(UserRole.BOXER, Permission.ADMIN_VERIFY_BOXER)).toBe(false);
    });
  });

  // ============================================================================
  // COACH Role Tests
  // ============================================================================

  describe('COACH Role Permissions', () => {
    it('should have boxer view permissions', () => {
      expect(roleHasPermission(UserRole.COACH, Permission.BOXER_READ_ANY_PROFILE)).toBe(true);
      expect(roleHasPermission(UserRole.COACH, Permission.BOXER_UPDATE_LINKED_PROFILE)).toBe(true);
    });

    it('should have match management permissions', () => {
      expect(roleHasPermission(UserRole.COACH, Permission.MATCH_CREATE_REQUEST)).toBe(true);
      expect(roleHasPermission(UserRole.COACH, Permission.MATCH_READ_OWN_REQUESTS)).toBe(true);
      expect(roleHasPermission(UserRole.COACH, Permission.MATCH_ACCEPT_REQUEST)).toBe(true);
      expect(roleHasPermission(UserRole.COACH, Permission.MATCH_DECLINE_REQUEST)).toBe(true);
      expect(roleHasPermission(UserRole.COACH, Permission.MATCH_CANCEL_REQUEST)).toBe(true);
    });

    it('should have availability management permissions', () => {
      expect(roleHasPermission(UserRole.COACH, Permission.AVAILABILITY_CREATE)).toBe(true);
      expect(roleHasPermission(UserRole.COACH, Permission.AVAILABILITY_READ)).toBe(true);
      expect(roleHasPermission(UserRole.COACH, Permission.AVAILABILITY_UPDATE)).toBe(true);
      expect(roleHasPermission(UserRole.COACH, Permission.AVAILABILITY_DELETE)).toBe(true);
    });

    it('should have coach-specific permissions', () => {
      expect(roleHasPermission(UserRole.COACH, Permission.COACH_LINK_BOXER)).toBe(true);
      expect(roleHasPermission(UserRole.COACH, Permission.COACH_UNLINK_BOXER)).toBe(true);
      expect(roleHasPermission(UserRole.COACH, Permission.COACH_UPDATE_BOXER_PERMISSIONS)).toBe(true);
    });

    it('should have club read permissions', () => {
      expect(roleHasPermission(UserRole.COACH, Permission.CLUB_READ_PUBLIC)).toBe(true);
      expect(roleHasPermission(UserRole.COACH, Permission.CLUB_READ_MEMBERS)).toBe(true);
    });

    it('should NOT have club management permissions', () => {
      expect(roleHasPermission(UserRole.COACH, Permission.CLUB_MEMBER_ADD_BOXER)).toBe(false);
      expect(roleHasPermission(UserRole.COACH, Permission.CLUB_MEMBER_REMOVE_BOXER)).toBe(false);
      expect(roleHasPermission(UserRole.COACH, Permission.CLUB_SET_OWNER)).toBe(false);
    });

    it('should NOT have own profile management permissions', () => {
      expect(roleHasPermission(UserRole.COACH, Permission.BOXER_CREATE_PROFILE)).toBe(false);
      expect(roleHasPermission(UserRole.COACH, Permission.BOXER_UPDATE_OWN_PROFILE)).toBe(false);
    });

    it('should NOT have admin permissions', () => {
      expect(roleHasPermission(UserRole.COACH, Permission.ADMIN_READ_ALL_USERS)).toBe(false);
      expect(roleHasPermission(UserRole.COACH, Permission.ADMIN_VERIFY_BOXER)).toBe(false);
    });
  });

  // ============================================================================
  // GYM_OWNER Role Tests
  // ============================================================================

  describe('GYM_OWNER Role Permissions', () => {
    it('should have boxer view permissions', () => {
      expect(roleHasPermission(UserRole.GYM_OWNER, Permission.BOXER_READ_ANY_PROFILE)).toBe(true);
    });

    it('should have match management permissions', () => {
      expect(roleHasPermission(UserRole.GYM_OWNER, Permission.MATCH_CREATE_REQUEST)).toBe(true);
      expect(roleHasPermission(UserRole.GYM_OWNER, Permission.MATCH_READ_OWN_REQUESTS)).toBe(true);
      expect(roleHasPermission(UserRole.GYM_OWNER, Permission.MATCH_ACCEPT_REQUEST)).toBe(true);
      expect(roleHasPermission(UserRole.GYM_OWNER, Permission.MATCH_DECLINE_REQUEST)).toBe(true);
      expect(roleHasPermission(UserRole.GYM_OWNER, Permission.MATCH_CANCEL_REQUEST)).toBe(true);
    });

    it('should have availability management permissions', () => {
      expect(roleHasPermission(UserRole.GYM_OWNER, Permission.AVAILABILITY_CREATE)).toBe(true);
      expect(roleHasPermission(UserRole.GYM_OWNER, Permission.AVAILABILITY_READ)).toBe(true);
      expect(roleHasPermission(UserRole.GYM_OWNER, Permission.AVAILABILITY_UPDATE)).toBe(true);
      expect(roleHasPermission(UserRole.GYM_OWNER, Permission.AVAILABILITY_DELETE)).toBe(true);
    });

    it('should have club management permissions', () => {
      expect(roleHasPermission(UserRole.GYM_OWNER, Permission.CLUB_READ_PUBLIC)).toBe(true);
      expect(roleHasPermission(UserRole.GYM_OWNER, Permission.CLUB_READ_MEMBERS)).toBe(true);
      expect(roleHasPermission(UserRole.GYM_OWNER, Permission.CLUB_MEMBER_ADD_BOXER)).toBe(true);
      expect(roleHasPermission(UserRole.GYM_OWNER, Permission.CLUB_MEMBER_REMOVE_BOXER)).toBe(true);
      expect(roleHasPermission(UserRole.GYM_OWNER, Permission.CLUB_MEMBER_ADD_COACH)).toBe(true);
      expect(roleHasPermission(UserRole.GYM_OWNER, Permission.CLUB_MEMBER_REMOVE_COACH)).toBe(true);
    });

    it('should NOT have club owner setting permission', () => {
      expect(roleHasPermission(UserRole.GYM_OWNER, Permission.CLUB_SET_OWNER)).toBe(false);
    });

    it('should NOT have coach-specific permissions', () => {
      expect(roleHasPermission(UserRole.GYM_OWNER, Permission.COACH_LINK_BOXER)).toBe(false);
      expect(roleHasPermission(UserRole.GYM_OWNER, Permission.COACH_UNLINK_BOXER)).toBe(false);
    });

    it('should NOT have admin permissions', () => {
      expect(roleHasPermission(UserRole.GYM_OWNER, Permission.ADMIN_READ_ALL_USERS)).toBe(false);
      expect(roleHasPermission(UserRole.GYM_OWNER, Permission.ADMIN_VERIFY_BOXER)).toBe(false);
    });
  });

  // ============================================================================
  // ADMIN Role Tests
  // ============================================================================

  describe('ADMIN Role Permissions', () => {
    it('should have all permissions', () => {
      const allPermissions = Object.values(Permission);
      const adminPermissions = getPermissionsForRole(UserRole.ADMIN);

      expect(adminPermissions.length).toBe(allPermissions.length);

      for (const permission of allPermissions) {
        expect(roleHasPermission(UserRole.ADMIN, permission)).toBe(true);
      }
    });

    it('should have admin-specific permissions', () => {
      expect(roleHasPermission(UserRole.ADMIN, Permission.ADMIN_READ_ALL_USERS)).toBe(true);
      expect(roleHasPermission(UserRole.ADMIN, Permission.ADMIN_UPDATE_USER_STATUS)).toBe(true);
      expect(roleHasPermission(UserRole.ADMIN, Permission.ADMIN_VERIFY_BOXER)).toBe(true);
      expect(roleHasPermission(UserRole.ADMIN, Permission.ADMIN_READ_SYSTEM_STATS)).toBe(true);
      expect(roleHasPermission(UserRole.ADMIN, Permission.CLUB_SET_OWNER)).toBe(true);
    });
  });

  // ============================================================================
  // Helper Function Tests
  // ============================================================================

  describe('getPermissionsForRole', () => {
    it('should return a new array (not reference)', () => {
      const permissions1 = getPermissionsForRole(UserRole.BOXER);
      const permissions2 = getPermissionsForRole(UserRole.BOXER);

      expect(permissions1).not.toBe(permissions2);
      expect(permissions1).toEqual(permissions2);
    });

    it('should return all permissions for each role', () => {
      const boxerPermissions = getPermissionsForRole(UserRole.BOXER);
      const coachPermissions = getPermissionsForRole(UserRole.COACH);
      const gymOwnerPermissions = getPermissionsForRole(UserRole.GYM_OWNER);
      const adminPermissions = getPermissionsForRole(UserRole.ADMIN);

      expect(boxerPermissions.length).toBeGreaterThan(0);
      expect(coachPermissions.length).toBeGreaterThan(0);
      expect(gymOwnerPermissions.length).toBeGreaterThan(0);
      expect(adminPermissions.length).toBe(Object.values(Permission).length);
    });
  });

  describe('roleHasAnyPermission', () => {
    it('should return true if role has at least one permission', () => {
      const result = roleHasAnyPermission(UserRole.BOXER, [
        Permission.BOXER_CREATE_PROFILE,
        Permission.ADMIN_READ_ALL_USERS,
      ]);
      expect(result).toBe(true);
    });

    it('should return false if role has none of the permissions', () => {
      const result = roleHasAnyPermission(UserRole.BOXER, [
        Permission.ADMIN_READ_ALL_USERS,
        Permission.ADMIN_VERIFY_BOXER,
      ]);
      expect(result).toBe(false);
    });

    it('should return true for admin with any permissions', () => {
      const result = roleHasAnyPermission(UserRole.ADMIN, [
        Permission.BOXER_CREATE_PROFILE,
        Permission.ADMIN_READ_ALL_USERS,
      ]);
      expect(result).toBe(true);
    });
  });

  describe('roleHasAllPermissions', () => {
    it('should return true if role has all permissions', () => {
      const result = roleHasAllPermissions(UserRole.BOXER, [
        Permission.BOXER_CREATE_PROFILE,
        Permission.BOXER_READ_OWN_PROFILE,
      ]);
      expect(result).toBe(true);
    });

    it('should return false if role is missing any permission', () => {
      const result = roleHasAllPermissions(UserRole.BOXER, [
        Permission.BOXER_CREATE_PROFILE,
        Permission.ADMIN_READ_ALL_USERS,
      ]);
      expect(result).toBe(false);
    });

    it('should return true for admin with all permissions', () => {
      const result = roleHasAllPermissions(UserRole.ADMIN, Object.values(Permission));
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // ROLE_PERMISSIONS Map Tests
  // ============================================================================

  describe('ROLE_PERMISSIONS Map', () => {
    it('should have entries for all user roles', () => {
      expect(ROLE_PERMISSIONS[UserRole.BOXER]).toBeDefined();
      expect(ROLE_PERMISSIONS[UserRole.COACH]).toBeDefined();
      expect(ROLE_PERMISSIONS[UserRole.GYM_OWNER]).toBeDefined();
      expect(ROLE_PERMISSIONS[UserRole.ADMIN]).toBeDefined();
    });

    it('should have valid permission values', () => {
      const allPermissions = new Set(Object.values(Permission));

      for (const role of Object.values(UserRole)) {
        const rolePermissions = ROLE_PERMISSIONS[role];
        for (const permission of rolePermissions) {
          expect(allPermissions.has(permission)).toBe(true);
        }
      }
    });

    it('should have no duplicate permissions per role', () => {
      for (const role of Object.values(UserRole)) {
        const rolePermissions = ROLE_PERMISSIONS[role];
        const uniquePermissions = new Set(rolePermissions);
        expect(uniquePermissions.size).toBe(rolePermissions.length);
      }
    });
  });
});
