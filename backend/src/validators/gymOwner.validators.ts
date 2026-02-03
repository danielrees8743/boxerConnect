// Gym Owner Validators
// Zod schemas for validating gym owner-related requests

import { z } from 'zod';
import { ExperienceLevel, Gender } from '@prisma/client';

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Create boxer account validation schema
 * Validates data for creating a new boxer account by a gym owner
 */
export const createBoxerAccountSchema = z.object({
  // Account credentials (required)
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

  // Boxer profile data (required)
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),

  // Optional boxer profile fields
  experienceLevel: z
    .nativeEnum(ExperienceLevel)
    .optional(),
  gender: z
    .nativeEnum(Gender)
    .optional(),
  weightKg: z
    .number()
    .positive('Weight must be a positive number')
    .min(40, 'Weight must be at least 40 kg')
    .max(200, 'Weight must be less than 200 kg')
    .optional(),
  heightCm: z
    .number()
    .int('Height must be a whole number')
    .positive('Height must be a positive number')
    .min(120, 'Height must be at least 120 cm')
    .max(230, 'Height must be less than 230 cm')
    .optional(),
  dateOfBirth: z
    .string()
    .date('Invalid date format')
    .optional()
    .transform((val) => (val ? new Date(val) : undefined))
    .refine(
      (date) => {
        if (!date) return true;
        return date < new Date();
      },
      { message: 'Date of birth must be in the past' }
    ),
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
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateBoxerAccountInput = z.infer<typeof createBoxerAccountSchema>;
