// Role-Permission Mappings
// Static mapping of UserRole to Permission arrays
// Design: Boxers are managed by coaches/gym owners for matches and availability

import { UserRole } from '@prisma/client';
import { Permission } from './Permission.enum';

/**
 * Static mapping of roles to their granted permissions
 *
 * Design Philosophy:
 * - BOXER: Self-service profile management, read-only access to their matches/availability
 * - COACH: Manages linked boxers' matches, availability, and profiles (with permission)
 * - GYM_OWNER: Manages club members, can manage boxer matches/availability for club members
 * - ADMIN: Full system access
 *
 * Key insight: Boxers don't self-manage their fights. Coaches and gym owners
 * handle match requests and availability on their behalf.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // ============================================================================
  // BOXER Role
  // Fighters - can view/update their own profile, but do NOT manage matches/availability/fights
  // ============================================================================
  [UserRole.BOXER]: [
    // Boxer profile management (self-service)
    Permission.BOXER_CREATE_PROFILE,
    Permission.BOXER_READ_OWN_PROFILE,
    Permission.BOXER_READ_ANY_PROFILE,
    Permission.BOXER_UPDATE_OWN_PROFILE,
    Permission.BOXER_DELETE_OWN_PROFILE,
    Permission.BOXER_UPLOAD_PHOTO,
    Permission.BOXER_UPLOAD_VIDEO,

    // Fight history (read-only for boxers - coaches/gym owners manage)
    Permission.FIGHT_READ,

    // Can VIEW their own matches/availability (read-only)
    Permission.MATCH_READ_OWN_REQUESTS,
    Permission.AVAILABILITY_READ,

    // Club (read only)
    Permission.CLUB_READ_PUBLIC,
    Permission.CLUB_READ_MEMBERS,

    // NOTE: Boxers CANNOT create/accept/decline matches, manage availability,
    // or manage fight history. That's handled by their coach or gym owner.
  ],

  // ============================================================================
  // COACH Role
  // Trainers - manage linked boxers' matches, availability, fight history, and profiles
  // ============================================================================
  [UserRole.COACH]: [
    // Can view/manage linked boxers
    Permission.BOXER_READ_ANY_PROFILE,
    Permission.BOXER_UPDATE_LINKED_PROFILE,

    // Manage boxer's matches (on their behalf)
    Permission.MATCH_CREATE_REQUEST,
    Permission.MATCH_READ_OWN_REQUESTS,
    Permission.MATCH_ACCEPT_REQUEST,
    Permission.MATCH_DECLINE_REQUEST,
    Permission.MATCH_CANCEL_REQUEST,

    // Manage boxer's availability (on their behalf)
    Permission.AVAILABILITY_CREATE,
    Permission.AVAILABILITY_READ,
    Permission.AVAILABILITY_UPDATE,
    Permission.AVAILABILITY_DELETE,

    // Manage boxer's fight history (on their behalf)
    Permission.FIGHT_READ,
    Permission.FIGHT_MANAGE_LINKED,

    // Coach-specific operations
    Permission.COACH_LINK_BOXER,
    Permission.COACH_UNLINK_BOXER,
    Permission.COACH_UPDATE_BOXER_PERMISSIONS,

    // Club (read only)
    Permission.CLUB_READ_PUBLIC,
    Permission.CLUB_READ_MEMBERS,
  ],

  // ============================================================================
  // GYM_OWNER Role
  // Club managers - manage club members, can also manage boxer matches/availability/fights
  // ============================================================================
  [UserRole.GYM_OWNER]: [
    // Can view and update boxer profiles (for club members)
    Permission.BOXER_READ_ANY_PROFILE,
    Permission.BOXER_UPDATE_LINKED_PROFILE,

    // Manage boxer's matches (for club members)
    Permission.MATCH_CREATE_REQUEST,
    Permission.MATCH_READ_OWN_REQUESTS,
    Permission.MATCH_ACCEPT_REQUEST,
    Permission.MATCH_DECLINE_REQUEST,
    Permission.MATCH_CANCEL_REQUEST,

    // Manage boxer's availability (for club members)
    Permission.AVAILABILITY_CREATE,
    Permission.AVAILABILITY_READ,
    Permission.AVAILABILITY_UPDATE,
    Permission.AVAILABILITY_DELETE,

    // Manage boxer's fight history (for club members)
    Permission.FIGHT_READ,
    Permission.FIGHT_MANAGE_LINKED,

    // Club management
    Permission.CLUB_READ_PUBLIC,
    Permission.CLUB_READ_MEMBERS,
    Permission.CLUB_MEMBER_ADD_BOXER,
    Permission.CLUB_MEMBER_REMOVE_BOXER,
    Permission.CLUB_MEMBER_ADD_COACH,
    Permission.CLUB_MEMBER_REMOVE_COACH,
  ],

  // ============================================================================
  // ADMIN Role
  // Full system access - has all permissions
  // ============================================================================
  [UserRole.ADMIN]: Object.values(Permission),
};

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(
  role: UserRole,
  permission: Permission
): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

/**
 * Check if a role has any of the specified permissions
 */
export function roleHasAnyPermission(
  role: UserRole,
  permissions: Permission[]
): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role];
  return permissions.some((permission) => rolePermissions.includes(permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function roleHasAllPermissions(
  role: UserRole,
  permissions: Permission[]
): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role];
  return permissions.every((permission) =>
    rolePermissions.includes(permission)
  );
}
