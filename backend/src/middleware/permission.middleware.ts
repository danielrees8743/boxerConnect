// Permission Middleware
// Route-level middleware for permission-based access control

import { Response, NextFunction } from 'express';
import { Permission } from '../permissions/Permission.enum';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  type PermissionContext,
  type ResourceContext,
} from '../services/permission.service';
import { ForbiddenError, UnauthorizedError } from './errorHandler';
import type { AuthenticatedRequest } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface PermissionMiddlewareOptions {
  /**
   * Request parameter name containing the resource ID
   * e.g., 'id' for routes like /clubs/:id
   */
  resourceIdParam?: string;

  /**
   * Type of resource being accessed
   */
  resourceType?: 'boxer' | 'club' | 'availability' | 'matchRequest';

  /**
   * Custom error message for permission denied
   */
  errorMessage?: string;
}

// ============================================================================
// Single Permission Middleware
// ============================================================================

/**
 * Middleware factory that checks for a single permission
 *
 * @example
 * // Basic role-based check
 * router.post('/admin/verify',
 *   authenticate,
 *   requirePermission(Permission.ADMIN_VERIFY_BOXER),
 *   handler(verifyBoxer)
 * );
 *
 * @example
 * // Resource-specific check
 * router.post('/:id/boxers/:boxerId',
 *   authenticate,
 *   requirePermission(Permission.CLUB_MEMBER_ADD_BOXER, {
 *     resourceIdParam: 'id',
 *     resourceType: 'club',
 *   }),
 *   handler(addBoxerToClub)
 * );
 */
export function requirePermission(
  permission: Permission,
  options: PermissionMiddlewareOptions = {}
) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Build permission context
      const context: PermissionContext = {
        userId: req.user.userId,
        role: req.user.role,
      };

      // Build resource context if specified
      let resourceContext: ResourceContext | undefined;
      if (options.resourceIdParam && options.resourceType) {
        const resourceId = req.params[options.resourceIdParam];
        if (resourceId) {
          resourceContext = {
            resourceType: options.resourceType,
            resourceId,
          };
        }
      }

      // Check permission
      const result = await hasPermission(context, permission, resourceContext);

      if (!result.allowed) {
        throw new ForbiddenError(
          options.errorMessage || result.reason || 'Permission denied'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// ============================================================================
// Any Permission Middleware (OR logic)
// ============================================================================

/**
 * Middleware factory that checks if user has ANY of the specified permissions
 *
 * @example
 * router.put('/:id',
 *   authenticate,
 *   requireAnyPermission([
 *     Permission.BOXER_UPDATE_OWN_PROFILE,
 *     Permission.BOXER_UPDATE_LINKED_PROFILE,
 *   ], {
 *     resourceIdParam: 'id',
 *     resourceType: 'boxer',
 *   }),
 *   handler(updateBoxer)
 * );
 */
export function requireAnyPermission(
  permissions: Permission[],
  options: PermissionMiddlewareOptions = {}
) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Build permission context
      const context: PermissionContext = {
        userId: req.user.userId,
        role: req.user.role,
      };

      // Build resource context if specified
      let resourceContext: ResourceContext | undefined;
      if (options.resourceIdParam && options.resourceType) {
        const resourceId = req.params[options.resourceIdParam];
        if (resourceId) {
          resourceContext = {
            resourceType: options.resourceType,
            resourceId,
          };
        }
      }

      // Check permissions
      const result = await hasAnyPermission(
        context,
        permissions,
        resourceContext
      );

      if (!result.allowed) {
        throw new ForbiddenError(
          options.errorMessage || result.reason || 'Permission denied'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// ============================================================================
// All Permissions Middleware (AND logic)
// ============================================================================

/**
 * Middleware factory that checks if user has ALL of the specified permissions
 *
 * @example
 * router.delete('/system/purge',
 *   authenticate,
 *   requireAllPermissions([
 *     Permission.ADMIN_READ_ALL_USERS,
 *     Permission.ADMIN_UPDATE_USER_STATUS,
 *   ]),
 *   handler(purgeSystem)
 * );
 */
export function requireAllPermissions(
  permissions: Permission[],
  options: PermissionMiddlewareOptions = {}
) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Build permission context
      const context: PermissionContext = {
        userId: req.user.userId,
        role: req.user.role,
      };

      // Build resource context if specified
      let resourceContext: ResourceContext | undefined;
      if (options.resourceIdParam && options.resourceType) {
        const resourceId = req.params[options.resourceIdParam];
        if (resourceId) {
          resourceContext = {
            resourceType: options.resourceType,
            resourceId,
          };
        }
      }

      // Check permissions
      const result = await hasAllPermissions(
        context,
        permissions,
        resourceContext
      );

      if (!result.allowed) {
        throw new ForbiddenError(
          options.errorMessage || result.reason || 'Permission denied'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// ============================================================================
// Permission Check Helper (for use in controllers)
// ============================================================================

/**
 * Check permission within a controller
 * Returns the result without throwing - useful for conditional logic
 *
 * @example
 * const canEdit = await checkPermissionInController(req, Permission.BOXER_UPDATE_OWN_PROFILE, {
 *   resourceType: 'boxer',
 *   resourceId: boxerId,
 * });
 *
 * if (!canEdit.allowed) {
 *   return next(new ForbiddenError(canEdit.reason));
 * }
 */
export async function checkPermissionInController(
  req: AuthenticatedRequest,
  permission: Permission,
  resourceContext?: ResourceContext
) {
  if (!req.user) {
    return {
      allowed: false,
      reason: 'Authentication required',
    };
  }

  const context: PermissionContext = {
    userId: req.user.userId,
    role: req.user.role,
  };

  return hasPermission(context, permission, resourceContext);
}

/**
 * Check any permission within a controller
 */
export async function checkAnyPermissionInController(
  req: AuthenticatedRequest,
  permissions: Permission[],
  resourceContext?: ResourceContext
) {
  if (!req.user) {
    return {
      allowed: false,
      reason: 'Authentication required',
    };
  }

  const context: PermissionContext = {
    userId: req.user.userId,
    role: req.user.role,
  };

  return hasAnyPermission(context, permissions, resourceContext);
}
