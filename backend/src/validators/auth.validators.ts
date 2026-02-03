// Authentication Validators
// Zod schemas for validating authentication-related requests

import { z } from 'zod';
import { UserRole } from '@prisma/client';

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Register validation schema
 * Validates user registration data
 */
export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  role: z.nativeEnum(UserRole).optional().default(UserRole.BOXER),
  clubId: z
    .string()
    .uuid('Club ID must be a valid UUID')
    .optional(),
});

/**
 * Login validation schema
 * Validates user login credentials
 */
export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password must be less than 128 characters'),
});

/**
 * Refresh token validation schema
 * Validates refresh token for token renewal
 */
export const refreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required'),
});

/**
 * Forgot password validation schema
 * Validates email for password reset request
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim(),
});

/**
 * Reset password validation schema
 * Validates token and new password for password reset
 */
export const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
});

// ============================================================================
// Type Exports
// ============================================================================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
