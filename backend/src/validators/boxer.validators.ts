// Boxer Validators
// Zod schemas for validating boxer-related requests

import { z } from 'zod';
import { ExperienceLevel, Gender } from '@prisma/client';

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Create boxer profile validation schema
 * Validates data for creating a new boxer profile
 */
export const createBoxerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  weightKg: z
    .number()
    .min(40, 'Weight must be at least 40 kg')
    .max(200, 'Weight must be less than 200 kg')
    .optional(),
  heightCm: z
    .number()
    .int('Height must be a whole number')
    .min(120, 'Height must be at least 120 cm')
    .max(230, 'Height must be less than 230 cm')
    .optional(),
  dateOfBirth: z
    .string()
    .datetime({ message: 'Invalid date format' })
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  location: z
    .string()
    .max(255, 'Location must be less than 255 characters')
    .trim()
    .optional(),
  city: z
    .string()
    .max(100, 'City must be less than 100 characters')
    .trim()
    .optional(),
  country: z
    .string()
    .max(100, 'Country must be less than 100 characters')
    .trim()
    .optional(),
  experienceLevel: z
    .nativeEnum(ExperienceLevel)
    .optional()
    .default(ExperienceLevel.BEGINNER),
  gender: z
    .nativeEnum(Gender)
    .optional(),
  wins: z
    .number()
    .int('Wins must be a whole number')
    .min(0, 'Wins cannot be negative')
    .optional()
    .default(0),
  losses: z
    .number()
    .int('Losses must be a whole number')
    .min(0, 'Losses cannot be negative')
    .optional()
    .default(0),
  draws: z
    .number()
    .int('Draws must be a whole number')
    .min(0, 'Draws cannot be negative')
    .optional()
    .default(0),
  gymAffiliation: z
    .string()
    .max(200, 'Gym affiliation must be less than 200 characters')
    .trim()
    .optional(),
  bio: z
    .string()
    .max(2000, 'Bio must be less than 2000 characters')
    .trim()
    .optional(),
  profilePhotoUrl: z
    .string()
    .url('Invalid URL format')
    .max(500, 'Profile photo URL must be less than 500 characters')
    .optional(),
});

/**
 * Update boxer profile validation schema
 * Partial version of create schema - all fields optional
 */
export const updateBoxerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .optional(),
  weightKg: z
    .number()
    .min(40, 'Weight must be at least 40 kg')
    .max(200, 'Weight must be less than 200 kg')
    .optional()
    .nullable(),
  heightCm: z
    .number()
    .int('Height must be a whole number')
    .min(120, 'Height must be at least 120 cm')
    .max(230, 'Height must be less than 230 cm')
    .optional()
    .nullable(),
  dateOfBirth: z
    .string()
    .datetime({ message: 'Invalid date format' })
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : null)),
  location: z
    .string()
    .max(255, 'Location must be less than 255 characters')
    .trim()
    .optional()
    .nullable(),
  city: z
    .string()
    .max(100, 'City must be less than 100 characters')
    .trim()
    .optional()
    .nullable(),
  country: z
    .string()
    .max(100, 'Country must be less than 100 characters')
    .trim()
    .optional()
    .nullable(),
  experienceLevel: z.nativeEnum(ExperienceLevel).optional(),
  gender: z
    .nativeEnum(Gender)
    .optional()
    .nullable(),
  wins: z
    .number()
    .int('Wins must be a whole number')
    .min(0, 'Wins cannot be negative')
    .optional(),
  losses: z
    .number()
    .int('Losses must be a whole number')
    .min(0, 'Losses cannot be negative')
    .optional(),
  draws: z
    .number()
    .int('Draws must be a whole number')
    .min(0, 'Draws cannot be negative')
    .optional(),
  gymAffiliation: z
    .string()
    .max(200, 'Gym affiliation must be less than 200 characters')
    .trim()
    .optional()
    .nullable(),
  bio: z
    .string()
    .max(2000, 'Bio must be less than 2000 characters')
    .trim()
    .optional()
    .nullable(),
  profilePhotoUrl: z
    .string()
    .url('Invalid URL format')
    .max(500, 'Profile photo URL must be less than 500 characters')
    .optional()
    .nullable(),
  isSearchable: z.boolean().optional(),
  clubId: z
    .string()
    .uuid('Invalid club ID format')
    .optional()
    .nullable(),
});

/**
 * Boxer search validation schema
 * Validates query parameters for searching boxers
 */
export const boxerSearchSchema = z.object({
  city: z
    .string()
    .max(100, 'City must be less than 100 characters')
    .trim()
    .optional(),
  country: z
    .string()
    .max(100, 'Country must be less than 100 characters')
    .trim()
    .optional(),
  experienceLevel: z.nativeEnum(ExperienceLevel).optional(),
  gender: z.nativeEnum(Gender).optional(),
  minWeight: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined))
    .pipe(
      z
        .number()
        .min(40, 'Minimum weight must be at least 40 kg')
        .max(200, 'Minimum weight must be less than 200 kg')
        .optional()
    ),
  maxWeight: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined))
    .pipe(
      z
        .number()
        .min(40, 'Maximum weight must be at least 40 kg')
        .max(200, 'Maximum weight must be less than 200 kg')
        .optional()
    ),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1).default(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100).default(20)),
});

/**
 * Get boxer by ID validation schema
 */
export const boxerIdSchema = z.object({
  id: z.string().uuid('Invalid boxer ID format'),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateBoxerInput = z.infer<typeof createBoxerSchema>;
export type UpdateBoxerInput = z.infer<typeof updateBoxerSchema>;
export type BoxerSearchInput = z.infer<typeof boxerSearchSchema>;
export type BoxerIdInput = z.infer<typeof boxerIdSchema>;
