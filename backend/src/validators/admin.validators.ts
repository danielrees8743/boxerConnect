// Admin Validators
// Zod schemas for validating admin-related requests

import { z } from 'zod';
import { UserRole, ExperienceLevel, Gender } from '@prisma/client';

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
// User CRUD Schemas
// ============================================================================

/**
 * Create user validation schema
 * Validates data for creating a new user (admin only)
 */
export const createUserSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
    })
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters'),
  password: z
    .string({
      required_error: 'Password is required',
    })
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters'),
  name: z
    .string({
      required_error: 'Name is required',
    })
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  role: z
    .nativeEnum(UserRole, {
      required_error: 'Role is required',
      invalid_type_error: 'Invalid role',
    }),
});

/**
 * Update user validation schema
 * Validates data for updating a user (admin only)
 */
export const updateUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .optional(),
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  role: z
    .nativeEnum(UserRole)
    .optional(),
});

// ============================================================================
// Boxer CRUD Schemas (Admin)
// ============================================================================

/**
 * Create boxer validation schema for admin
 * Validates data for creating a boxer profile (admin only)
 */
export const createBoxerAdminSchema = z.object({
  userId: z
    .string({
      required_error: 'User ID is required',
    })
    .uuid('Invalid user ID format'),
  name: z
    .string({
      required_error: 'Name is required',
    })
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  gender: z
    .nativeEnum(Gender)
    .optional(),
  weightKg: z
    .number()
    .positive('Weight must be positive')
    .max(300, 'Weight must be less than 300kg')
    .optional(),
  heightCm: z
    .number()
    .int('Height must be an integer')
    .positive('Height must be positive')
    .max(250, 'Height must be less than 250cm')
    .optional(),
  dateOfBirth: z
    .string()
    .datetime({ offset: true })
    .optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional()),
  city: z
    .string()
    .max(100, 'City must be less than 100 characters')
    .optional(),
  country: z
    .string()
    .max(100, 'Country must be less than 100 characters')
    .optional(),
  experienceLevel: z
    .nativeEnum(ExperienceLevel)
    .optional()
    .default(ExperienceLevel.BEGINNER),
  wins: z
    .number()
    .int('Wins must be an integer')
    .min(0, 'Wins cannot be negative')
    .optional()
    .default(0),
  losses: z
    .number()
    .int('Losses must be an integer')
    .min(0, 'Losses cannot be negative')
    .optional()
    .default(0),
  draws: z
    .number()
    .int('Draws must be an integer')
    .min(0, 'Draws cannot be negative')
    .optional()
    .default(0),
  gymAffiliation: z
    .string()
    .max(200, 'Gym affiliation must be less than 200 characters')
    .optional(),
  bio: z
    .string()
    .max(2000, 'Bio must be less than 2000 characters')
    .optional(),
  isVerified: z
    .boolean()
    .optional()
    .default(false),
  clubId: z
    .string()
    .uuid('Invalid club ID format')
    .optional(),
});

/**
 * Update boxer validation schema for admin
 * Validates data for updating any boxer profile (admin only)
 */
export const updateBoxerAdminSchema = z.object({
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  gender: z
    .nativeEnum(Gender)
    .nullable()
    .optional(),
  weightKg: z
    .number()
    .positive('Weight must be positive')
    .max(300, 'Weight must be less than 300kg')
    .nullable()
    .optional(),
  heightCm: z
    .number()
    .int('Height must be an integer')
    .positive('Height must be positive')
    .max(250, 'Height must be less than 250cm')
    .nullable()
    .optional(),
  dateOfBirth: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').nullable().optional()),
  city: z
    .string()
    .max(100, 'City must be less than 100 characters')
    .nullable()
    .optional(),
  country: z
    .string()
    .max(100, 'Country must be less than 100 characters')
    .nullable()
    .optional(),
  experienceLevel: z
    .nativeEnum(ExperienceLevel)
    .optional(),
  wins: z
    .number()
    .int('Wins must be an integer')
    .min(0, 'Wins cannot be negative')
    .optional(),
  losses: z
    .number()
    .int('Losses must be an integer')
    .min(0, 'Losses cannot be negative')
    .optional(),
  draws: z
    .number()
    .int('Draws must be an integer')
    .min(0, 'Draws cannot be negative')
    .optional(),
  gymAffiliation: z
    .string()
    .max(200, 'Gym affiliation must be less than 200 characters')
    .nullable()
    .optional(),
  bio: z
    .string()
    .max(2000, 'Bio must be less than 2000 characters')
    .nullable()
    .optional(),
  isVerified: z
    .boolean()
    .optional(),
  isSearchable: z
    .boolean()
    .optional(),
  clubId: z
    .string()
    .uuid('Invalid club ID format')
    .nullable()
    .optional(),
});

// ============================================================================
// Club CRUD Schemas
// ============================================================================

/**
 * Create club validation schema
 * Validates data for creating a new club
 */
export const createClubSchema = z.object({
  name: z
    .string({
      required_error: 'Club name is required',
    })
    .min(1, 'Club name is required')
    .max(200, 'Club name must be less than 200 characters'),
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .optional(),
  phone: z
    .string()
    .max(50, 'Phone must be less than 50 characters')
    .optional(),
  contactName: z
    .string()
    .max(100, 'Contact name must be less than 100 characters')
    .optional(),
  postcode: z
    .string()
    .max(20, 'Postcode must be less than 20 characters')
    .optional(),
  region: z
    .string()
    .max(100, 'Region must be less than 100 characters')
    .optional(),
  latitude: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional(),
  longitude: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional(),
  ownerId: z
    .string()
    .uuid('Invalid owner ID format')
    .optional(),
  isVerified: z
    .boolean()
    .optional()
    .default(false),
});

/**
 * Update club validation schema
 * Validates data for updating a club
 */
export const updateClubSchema = z.object({
  name: z
    .string()
    .min(1, 'Club name cannot be empty')
    .max(200, 'Club name must be less than 200 characters')
    .optional(),
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .nullable()
    .optional(),
  phone: z
    .string()
    .max(50, 'Phone must be less than 50 characters')
    .nullable()
    .optional(),
  contactName: z
    .string()
    .max(100, 'Contact name must be less than 100 characters')
    .nullable()
    .optional(),
  postcode: z
    .string()
    .max(20, 'Postcode must be less than 20 characters')
    .nullable()
    .optional(),
  region: z
    .string()
    .max(100, 'Region must be less than 100 characters')
    .nullable()
    .optional(),
  latitude: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .nullable()
    .optional(),
  longitude: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .nullable()
    .optional(),
  ownerId: z
    .string()
    .uuid('Invalid owner ID format')
    .nullable()
    .optional(),
  isVerified: z
    .boolean()
    .optional(),
});

/**
 * Club ID param schema for admin operations
 */
export const adminClubIdSchema = z.object({
  id: z
    .string()
    .uuid('Invalid club ID format'),
});

/**
 * Search query schema for admin search endpoints
 */
export const searchQuerySchema = z.object({
  q: z
    .string()
    .min(1, 'Search query is required')
    .max(100, 'Search query must be less than 100 characters'),
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
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateBoxerAdminInput = z.infer<typeof createBoxerAdminSchema>;
export type UpdateBoxerAdminInput = z.infer<typeof updateBoxerAdminSchema>;
export type CreateClubInput = z.infer<typeof createClubSchema>;
export type UpdateClubInput = z.infer<typeof updateClubSchema>;
export type AdminClubIdInput = z.infer<typeof adminClubIdSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
