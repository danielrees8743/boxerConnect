// Permission Service
// Handles permission checking with caching and resource-specific authorization

import { UserRole, CoachPermission } from '@prisma/client';
import { prisma } from '../config';
import { cache } from '../config/redis';
import { Permission } from '../permissions/Permission.enum';
import {
  roleHasPermission,
  roleHasAnyPermission,
  roleHasAllPermissions,
} from '../permissions/rolePermissions';

// ============================================================================
// Types
// ============================================================================

export interface PermissionContext {
  userId: string;
  role: UserRole;
}

export interface ResourceContext {
  resourceType: 'boxer' | 'club' | 'availability' | 'matchRequest';
  resourceId: string;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

// Cache TTL in seconds (5 minutes)
const PERMISSION_CACHE_TTL = 300;

// Cache key prefixes
const CACHE_PREFIX = {
  ROLE_PERMISSION: 'perm:role:',
  RESOURCE_PERMISSION: 'perm:resource:',
  COACH_BOXER: 'perm:coach-boxer:',
  CLUB_OWNER: 'perm:club-owner:',
  CLUB_MEMBER: 'perm:club-member:',
};

// ============================================================================
// Core Permission Checking
// ============================================================================

/**
 * Check if a user has a specific permission
 * This is the main entry point for permission checks
 */
export async function hasPermission(
  context: PermissionContext,
  permission: Permission,
  resourceContext?: ResourceContext
): Promise<PermissionCheckResult> {
  // First, check role-based permission (fast, static check)
  if (!roleHasPermission(context.role, permission)) {
    return {
      allowed: false,
      reason: `Role ${context.role} does not have permission ${permission}`,
    };
  }

  // If no resource context, the role check is sufficient
  if (!resourceContext) {
    return { allowed: true };
  }

  // Perform resource-specific permission check
  return checkResourcePermission(context, permission, resourceContext);
}

/**
 * Check if a user has any of the specified permissions
 */
export async function hasAnyPermission(
  context: PermissionContext,
  permissions: Permission[],
  resourceContext?: ResourceContext
): Promise<PermissionCheckResult> {
  // First, check if role has any of the permissions
  if (!roleHasAnyPermission(context.role, permissions)) {
    return {
      allowed: false,
      reason: `Role ${context.role} does not have any of the required permissions`,
    };
  }

  // If no resource context, the role check is sufficient
  if (!resourceContext) {
    return { allowed: true };
  }

  // Check each permission with resource context
  for (const permission of permissions) {
    if (roleHasPermission(context.role, permission)) {
      const result = await checkResourcePermission(
        context,
        permission,
        resourceContext
      );
      if (result.allowed) {
        return result;
      }
    }
  }

  return {
    allowed: false,
    reason: 'No permission granted for this resource',
  };
}

/**
 * Check if a user has all of the specified permissions
 */
export async function hasAllPermissions(
  context: PermissionContext,
  permissions: Permission[],
  resourceContext?: ResourceContext
): Promise<PermissionCheckResult> {
  // First, check if role has all of the permissions
  if (!roleHasAllPermissions(context.role, permissions)) {
    return {
      allowed: false,
      reason: `Role ${context.role} does not have all required permissions`,
    };
  }

  // If no resource context, the role check is sufficient
  if (!resourceContext) {
    return { allowed: true };
  }

  // Check each permission with resource context
  for (const permission of permissions) {
    const result = await checkResourcePermission(
      context,
      permission,
      resourceContext
    );
    if (!result.allowed) {
      return result;
    }
  }

  return { allowed: true };
}

// ============================================================================
// Resource-Specific Permission Checks
// ============================================================================

/**
 * Check permission for a specific resource
 */
async function checkResourcePermission(
  context: PermissionContext,
  permission: Permission,
  resourceContext: ResourceContext
): Promise<PermissionCheckResult> {
  const { resourceType, resourceId } = resourceContext;

  switch (resourceType) {
    case 'boxer':
      return checkBoxerPermission(context, permission, resourceId);

    case 'club':
      return checkClubPermission(context, permission, resourceId);

    case 'availability':
      return checkAvailabilityPermission(context, permission, resourceId);

    case 'matchRequest':
      return checkMatchRequestPermission(context, permission, resourceId);

    default:
      return { allowed: true };
  }
}

/**
 * Check permission for boxer resource
 */
async function checkBoxerPermission(
  context: PermissionContext,
  permission: Permission,
  boxerId: string
): Promise<PermissionCheckResult> {
  // For "own" permissions, check if user owns this boxer
  if (
    permission === Permission.BOXER_READ_OWN_PROFILE ||
    permission === Permission.BOXER_UPDATE_OWN_PROFILE ||
    permission === Permission.BOXER_DELETE_OWN_PROFILE
  ) {
    const isOwner = await isBoxerOwner(context.userId, boxerId);
    if (!isOwner) {
      return {
        allowed: false,
        reason: 'You can only perform this action on your own boxer profile',
      };
    }
    return { allowed: true };
  }

  // For "linked" permissions, check coach-boxer relationship
  if (permission === Permission.BOXER_UPDATE_LINKED_PROFILE) {
    // Check if user is a coach with EDIT_PROFILE or FULL_ACCESS permission
    if (context.role === UserRole.COACH) {
      const hasCoachPermission = await checkCoachBoxerPermission(
        context.userId,
        boxerId,
        CoachPermission.EDIT_PROFILE
      );
      if (hasCoachPermission) {
        return { allowed: true };
      }
    }

    // Check if user is a gym owner and boxer is in their club
    if (context.role === UserRole.GYM_OWNER) {
      const isInOwnedClub = await isBoxerInOwnedClub(context.userId, boxerId);
      if (isInOwnedClub) {
        return { allowed: true };
      }
    }

    // Admin can update any boxer
    if (context.role === UserRole.ADMIN) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'You do not have permission to update this boxer profile',
    };
  }

  // For "any" read permissions, allow if role has permission
  if (permission === Permission.BOXER_READ_ANY_PROFILE) {
    return { allowed: true };
  }

  return { allowed: true };
}

/**
 * Check permission for club resource
 */
async function checkClubPermission(
  context: PermissionContext,
  permission: Permission,
  clubId: string
): Promise<PermissionCheckResult> {
  // Public read permissions don't need ownership check
  if (
    permission === Permission.CLUB_READ_PUBLIC ||
    permission === Permission.CLUB_READ_MEMBERS
  ) {
    return { allowed: true };
  }

  // Club management permissions require ownership
  if (
    permission === Permission.CLUB_MEMBER_ADD_BOXER ||
    permission === Permission.CLUB_MEMBER_REMOVE_BOXER ||
    permission === Permission.CLUB_MEMBER_ADD_COACH ||
    permission === Permission.CLUB_MEMBER_REMOVE_COACH
  ) {
    // Check if user is club owner
    const isOwner = await isClubOwner(context.userId, clubId);
    if (isOwner) {
      return { allowed: true };
    }

    // Admin can manage any club
    if (context.role === UserRole.ADMIN) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'Only the club owner can manage club members',
    };
  }

  // Setting club owner is admin-only
  if (permission === Permission.CLUB_SET_OWNER) {
    if (context.role === UserRole.ADMIN) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Only administrators can set club ownership',
    };
  }

  return { allowed: true };
}

/**
 * Check permission for availability resource
 */
async function checkAvailabilityPermission(
  context: PermissionContext,
  permission: Permission,
  availabilityId: string
): Promise<PermissionCheckResult> {
  // Get the availability to find the boxer
  const availability = await getAvailabilityWithBoxer(availabilityId);
  if (!availability) {
    return {
      allowed: false,
      reason: 'Availability not found',
    };
  }

  const boxerId = availability.boxerId;

  // Boxers can only read their own availability
  if (context.role === UserRole.BOXER) {
    const isOwner = await isBoxerOwner(context.userId, boxerId);
    if (permission === Permission.AVAILABILITY_READ && isOwner) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Boxers can only view their own availability',
    };
  }

  // Coaches need MANAGE_AVAILABILITY permission
  if (context.role === UserRole.COACH) {
    const hasCoachPermission = await checkCoachBoxerPermission(
      context.userId,
      boxerId,
      CoachPermission.MANAGE_AVAILABILITY
    );
    if (hasCoachPermission) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'You do not have permission to manage this boxer\'s availability',
    };
  }

  // Gym owners can manage availability for club members
  if (context.role === UserRole.GYM_OWNER) {
    const isInOwnedClub = await isBoxerInOwnedClub(context.userId, boxerId);
    if (isInOwnedClub) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'You can only manage availability for boxers in your club',
    };
  }

  // Admin has full access
  if (context.role === UserRole.ADMIN) {
    return { allowed: true };
  }

  return { allowed: true };
}

/**
 * Check permission for match request resource
 */
async function checkMatchRequestPermission(
  context: PermissionContext,
  permission: Permission,
  matchRequestId: string
): Promise<PermissionCheckResult> {
  // Get the match request to find the boxers involved
  const matchRequest = await getMatchRequestWithBoxers(matchRequestId);
  if (!matchRequest) {
    return {
      allowed: false,
      reason: 'Match request not found',
    };
  }

  const { requesterId, targetId } = matchRequest;

  // Boxers can only read their own match requests
  if (context.role === UserRole.BOXER) {
    const isRequester = await isBoxerOwner(context.userId, requesterId);
    const isTarget = await isBoxerOwner(context.userId, targetId);

    if (permission === Permission.MATCH_READ_OWN_REQUESTS) {
      if (isRequester || isTarget) {
        return { allowed: true };
      }
    }

    return {
      allowed: false,
      reason: 'Boxers can only view their own match requests',
    };
  }

  // Coaches need RESPOND_TO_MATCHES permission for their linked boxers
  if (context.role === UserRole.COACH) {
    // Check if coach has permission for either boxer
    const hasRequesterPermission = await checkCoachBoxerPermission(
      context.userId,
      requesterId,
      CoachPermission.RESPOND_TO_MATCHES
    );
    const hasTargetPermission = await checkCoachBoxerPermission(
      context.userId,
      targetId,
      CoachPermission.RESPOND_TO_MATCHES
    );

    if (hasRequesterPermission || hasTargetPermission) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'You do not have permission to manage match requests for these boxers',
    };
  }

  // Gym owners can manage match requests for club members
  if (context.role === UserRole.GYM_OWNER) {
    const requesterInClub = await isBoxerInOwnedClub(context.userId, requesterId);
    const targetInClub = await isBoxerInOwnedClub(context.userId, targetId);

    if (requesterInClub || targetInClub) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'You can only manage match requests for boxers in your club',
    };
  }

  // Admin has full access
  if (context.role === UserRole.ADMIN) {
    return { allowed: true };
  }

  return { allowed: true };
}

// ============================================================================
// Helper Functions (with caching)
// ============================================================================

/**
 * Check if a user owns a boxer profile
 */
async function isBoxerOwner(userId: string, boxerId: string): Promise<boolean> {
  const cacheKey = `${CACHE_PREFIX.RESOURCE_PERMISSION}boxer:${userId}:${boxerId}`;

  // Check cache first
  const cached = await cache.get<boolean>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Query database
  const boxer = await prisma.boxer.findUnique({
    where: { id: boxerId },
    select: { userId: true },
  });

  const isOwner = boxer?.userId === userId;

  // Cache the result
  await cache.set(cacheKey, isOwner, PERMISSION_CACHE_TTL);

  return isOwner;
}

/**
 * Check if a user owns a club
 */
async function isClubOwner(userId: string, clubId: string): Promise<boolean> {
  const cacheKey = `${CACHE_PREFIX.CLUB_OWNER}${userId}:${clubId}`;

  // Check cache first
  const cached = await cache.get<boolean>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Query database
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { ownerId: true },
  });

  const isOwner = club?.ownerId === userId;

  // Cache the result
  await cache.set(cacheKey, isOwner, PERMISSION_CACHE_TTL);

  return isOwner;
}

/**
 * Check if a boxer is in a club owned by the user
 */
async function isBoxerInOwnedClub(
  userId: string,
  boxerId: string
): Promise<boolean> {
  const cacheKey = `${CACHE_PREFIX.CLUB_MEMBER}${userId}:${boxerId}`;

  // Check cache first
  const cached = await cache.get<boolean>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Query database - find boxer's club and check if user owns it
  const boxer = await prisma.boxer.findUnique({
    where: { id: boxerId },
    select: {
      club: {
        select: { ownerId: true },
      },
    },
  });

  const isInOwnedClub = boxer?.club?.ownerId === userId;

  // Cache the result
  await cache.set(cacheKey, isInOwnedClub, PERMISSION_CACHE_TTL);

  return isInOwnedClub;
}

/**
 * Check if a coach has a specific permission for a boxer
 */
async function checkCoachBoxerPermission(
  coachUserId: string,
  boxerId: string,
  requiredPermission: CoachPermission
): Promise<boolean> {
  const cacheKey = `${CACHE_PREFIX.COACH_BOXER}${coachUserId}:${boxerId}:${requiredPermission}`;

  // Check cache first
  const cached = await cache.get<boolean>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Query database
  const relation = await prisma.coachBoxer.findUnique({
    where: {
      coachUserId_boxerId: {
        coachUserId,
        boxerId,
      },
    },
    select: { permissions: true },
  });

  if (!relation) {
    await cache.set(cacheKey, false, PERMISSION_CACHE_TTL);
    return false;
  }

  // FULL_ACCESS grants all permissions
  const hasPermission =
    relation.permissions === CoachPermission.FULL_ACCESS ||
    relation.permissions === requiredPermission;

  // Cache the result
  await cache.set(cacheKey, hasPermission, PERMISSION_CACHE_TTL);

  return hasPermission;
}

/**
 * Get availability with boxer info
 */
async function getAvailabilityWithBoxer(
  availabilityId: string
): Promise<{ boxerId: string } | null> {
  return prisma.availability.findUnique({
    where: { id: availabilityId },
    select: { boxerId: true },
  });
}

/**
 * Get match request with boxer info
 */
async function getMatchRequestWithBoxers(
  matchRequestId: string
): Promise<{ requesterId: string; targetId: string } | null> {
  const result = await prisma.matchRequest.findUnique({
    where: { id: matchRequestId },
    select: { requesterBoxerId: true, targetBoxerId: true },
  });

  if (!result) {
    return null;
  }

  return {
    requesterId: result.requesterBoxerId,
    targetId: result.targetBoxerId,
  };
}

// ============================================================================
// Cache Invalidation
// ============================================================================

/**
 * Invalidate permission cache for a user
 */
export async function invalidateUserPermissionCache(
  userId: string
): Promise<void> {
  await cache.delByPattern(`${CACHE_PREFIX.RESOURCE_PERMISSION}*${userId}*`);
  await cache.delByPattern(`${CACHE_PREFIX.COACH_BOXER}${userId}:*`);
  await cache.delByPattern(`${CACHE_PREFIX.CLUB_OWNER}${userId}:*`);
  await cache.delByPattern(`${CACHE_PREFIX.CLUB_MEMBER}${userId}:*`);
}

/**
 * Invalidate permission cache for a boxer
 */
export async function invalidateBoxerPermissionCache(
  boxerId: string
): Promise<void> {
  await cache.delByPattern(`${CACHE_PREFIX.RESOURCE_PERMISSION}boxer:*:${boxerId}`);
  await cache.delByPattern(`${CACHE_PREFIX.COACH_BOXER}*:${boxerId}:*`);
  await cache.delByPattern(`${CACHE_PREFIX.CLUB_MEMBER}*:${boxerId}`);
}

/**
 * Invalidate permission cache for a club
 */
export async function invalidateClubPermissionCache(
  clubId: string
): Promise<void> {
  await cache.delByPattern(`${CACHE_PREFIX.CLUB_OWNER}*:${clubId}`);
}

/**
 * Invalidate all permission caches (use sparingly)
 */
export async function invalidateAllPermissionCaches(): Promise<void> {
  await cache.delByPattern('perm:*');
}

// ============================================================================
// Exports
// ============================================================================

export default {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  invalidateUserPermissionCache,
  invalidateBoxerPermissionCache,
  invalidateClubPermissionCache,
  invalidateAllPermissionCaches,
};
