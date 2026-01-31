// Admin Validators
// Zod schemas for validating admin-related requests

import { z } from 'zod';
import { UserRole } from '@prisma/client';

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Update user status validation schema
 * Validates data for activating/deactivating a user
 */
export const updateUserStatusSchema = z.object({
  isActive: z
    .boolean({
      required_error: 'isActive is required',
      invalid_type_error: 'isActive must be a boolean',
    }),
});

/**
 * Verify boxer validation schema
 * Validates data for verifying/unverifying a boxer
 */
export const verifyBoxerSchema = z.object({
  isVerified: z
    .boolean({
      required_error: 'isVerified is required',
      invalid_type_error: 'isVerified must be a boolean',
    }),
});

/**
 * User search/filter validation schema
 * Validates query params for user listing
 */
export const userSearchSchema = z.object({
  role: z
    .nativeEnum(UserRole)
    .optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 1, 'Page must be a positive integer')
    .default('1'),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 100, 'Limit must be between 1 and 100')
    .default('20'),
});

/**
 * User ID param schema
 * Validates user ID from URL params
 */
export const userIdSchema = z.object({
  id: z
    .string()
    .uuid('Invalid user ID format'),
});

/**
 * Boxer ID param schema for admin operations
 * Validates boxer ID from URL params
 */
export const adminBoxerIdSchema = z.object({
  id: z
    .string()
    .uuid('Invalid boxer ID format'),
});

/**
 * Pagination schema for pending verifications
 */
export const paginationSchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 1, 'Page must be a positive integer')
    .default('1'),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 100, 'Limit must be between 1 and 100')
    .default('20'),
});

// ============================================================================
// Type Exports
// ============================================================================

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type VerifyBoxerInput = z.infer<typeof verifyBoxerSchema>;
export type UserSearchInput = z.infer<typeof userSearchSchema>;
export type UserIdInput = z.infer<typeof userIdSchema>;
export type AdminBoxerIdInput = z.infer<typeof adminBoxerIdSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
