// Authentication Controller
// Handles HTTP requests for authentication endpoints

import { Response, NextFunction } from 'express';
import {
  register as registerUser,
  login as loginUser,
  refresh as refreshTokens,
  logout as logoutUser,
  getUserById,
  requestPasswordReset,
  resetPassword as resetUserPassword,
} from '../services/auth.service';
import { createMembershipRequest } from '../services/clubMembershipRequest.service';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validators';
import { sendSuccess, sendCreated } from '../utils';
import { BadRequestError, UnauthorizedError } from '../middleware';
import type { AuthenticatedRequest, AuthenticatedUserRequest } from '../types';

// ============================================================================
// Controller Methods
// ============================================================================

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
export async function register(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate request body
    const validatedData = registerSchema.parse(req.body);

    // Register user (now returns tokens for immediate login)
    const result = await registerUser(validatedData);

    // If clubId is provided and role is BOXER, create a membership request
    if (validatedData.clubId && validatedData.role === 'BOXER') {
      try {
        await createMembershipRequest(result.user.id, validatedData.clubId);
        // Membership request created successfully, but don't block registration
      } catch (error) {
        // Log error but don't fail registration
        console.error('Failed to create membership request during registration:', error);
        // Membership request will need to be created manually or through profile
      }
    }

    sendCreated(res, {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }, 'Registration successful');
  } catch (error) {
    if (error instanceof Error && error.message === 'User with this email already exists') {
      return next(new BadRequestError(error.message));
    }
    next(error);
  }
}

/**
 * Login a user
 * POST /api/v1/auth/login
 */
export async function login(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);

    // Login user
    const result = await loginUser(validatedData.email, validatedData.password);

    sendSuccess(res, {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }, 'Login successful');
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === 'Invalid email or password' ||
        error.message === 'Account is deactivated'
      ) {
        return next(new UnauthorizedError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
export async function refresh(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate request body
    const validatedData = refreshTokenSchema.parse(req.body);

    // Refresh tokens
    const tokens = await refreshTokens(validatedData.refreshToken);

    sendSuccess(res, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }, 'Token refreshed successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === 'Invalid refresh token' ||
        error.message === 'Refresh token has been revoked' ||
        error.message === 'User not found or inactive'
      ) {
        return next(new UnauthorizedError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Logout a user
 * POST /api/v1/auth/logout
 */
export async function logout(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validatedData = refreshTokenSchema.parse(req.body);

    // Logout user
    await logoutUser(req.user.userId, validatedData.refreshToken);

    sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Get current user
 * GET /api/v1/auth/me
 */
export async function me(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get user by ID from token
    const user = await getUserById(req.user.userId);

    if (!user) {
      return next(new UnauthorizedError('User not found'));
    }

    sendSuccess(res, { user }, 'User retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Request password reset
 * POST /api/v1/auth/forgot-password
 */
export async function forgotPassword(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validatedData = forgotPasswordSchema.parse(req.body);

    // Request password reset
    const resetToken = await requestPasswordReset(validatedData.email);

    // Note: In production, this token would be sent via email
    // For security, we always return success to prevent email enumeration
    // The token is returned here only for development/testing purposes
    if (resetToken) {
      // In development, include the token for testing
      // In production, send email and don't return token
      console.log(`Password reset token for ${validatedData.email}: ${resetToken}`);
    }

    sendSuccess(
      res,
      null,
      'If an account with that email exists, a password reset link has been sent'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Reset password with token
 * POST /api/v1/auth/reset-password
 */
export async function resetPassword(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validatedData = resetPasswordSchema.parse(req.body);

    // Reset password
    await resetUserPassword(validatedData.token, validatedData.newPassword);

    sendSuccess(res, null, 'Password reset successful');
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired reset token') {
      return next(new BadRequestError(error.message));
    }
    next(error);
  }
}

// Export all controller methods
export default {
  register,
  login,
  refresh,
  logout,
  me,
  forgotPassword,
  resetPassword,
};
