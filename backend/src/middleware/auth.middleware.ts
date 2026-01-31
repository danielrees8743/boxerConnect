// Authentication Middleware
// Handles JWT verification and role-based access control

import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { verifyAccessToken, type TokenPayload } from '../services/auth.service';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import type { AuthenticatedRequest } from '../types';

// ============================================================================
// Authentication Middleware
// ============================================================================

/**
 * Authenticate middleware
 * Verifies JWT access token from Authorization header
 * Attaches user payload to request object
 */
export function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedError('No authorization header provided');
    }

    // Check Bearer scheme
    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Invalid authorization scheme. Use Bearer token');
    }

    // Extract token
    const token = authHeader.substring(7);
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // Verify token
    let payload: TokenPayload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          throw new UnauthorizedError('Token has expired');
        }
        if (error.name === 'JsonWebTokenError') {
          throw new UnauthorizedError('Invalid token');
        }
      }
      throw new UnauthorizedError('Token verification failed');
    }

    // Attach user to request
    req.user = {
      userId: payload.userId,
      email: '', // Will be populated by controller if needed
      role: payload.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication middleware
 * Attaches user to request if token is present, but doesn't fail if not
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token, continue without user
      return next();
    }

    // Extract token
    const token = authHeader.substring(7);
    if (!token) {
      return next();
    }

    // Try to verify token
    try {
      const payload = verifyAccessToken(token);
      req.user = {
        userId: payload.userId,
        email: '',
        role: payload.role,
      };
    } catch {
      // Token is invalid, but we don't fail - just continue without user
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Role-based access control middleware factory
 * Returns middleware that checks if user has one of the required roles
 */
export function requireRole(...roles: UserRole[]) {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): void => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Check if user has required role
      if (!roles.includes(req.user.role)) {
        throw new ForbiddenError(
          `Access denied. Required roles: ${roles.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require boxer role specifically
 */
export const requireBoxer = requireRole(UserRole.BOXER);

/**
 * Require coach role specifically
 */
export const requireCoach = requireRole(UserRole.COACH);

/**
 * Require gym owner role specifically
 */
export const requireGymOwner = requireRole(UserRole.GYM_OWNER);

/**
 * Require admin role specifically
 */
export const requireAdmin = requireRole(UserRole.ADMIN);

/**
 * Require any elevated role (coach, gym owner, or admin)
 */
export const requireElevatedRole = requireRole(
  UserRole.COACH,
  UserRole.GYM_OWNER,
  UserRole.ADMIN
);
