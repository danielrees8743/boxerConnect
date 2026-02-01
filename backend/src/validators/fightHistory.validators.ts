// Fight History Validators
// Zod schemas for validating fight history-related requests

import { z } from 'zod';
import { FightResult, FightMethod } from '@prisma/client';

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Create fight history validation schema
 * Validates data for creating a new fight history entry
 */
export const createFightHistorySchema = z.object({
  opponentName: z
    .string()
    .min(2, 'Opponent name must be at least 2 characters')
    .max(100, 'Opponent name must be less than 100 characters')
    .trim(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine(
      (val) => {
        const date = new Date(val);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return date <= today;
      },
      { message: 'Fight date cannot be in the future' }
    ),
  venue: z
    .string()
    .max(200, 'Venue must be less than 200 characters')
    .trim()
    .optional(),
  result: z.nativeEnum(FightResult),
  method: z.nativeEnum(FightMethod).optional(),
  round: z
    .number()
    .int('Round must be a whole number')
    .min(1, 'Round must be at least 1')
    .max(12, 'Round must be 12 or less')
    .optional(),
  notes: z
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .trim()
    .optional(),
});

/**
 * Update fight history validation schema
 * Partial version of create schema - all fields optional, nullable for clearing
 */
export const updateFightHistorySchema = z.object({
  opponentName: z
    .string()
    .min(2, 'Opponent name must be at least 2 characters')
    .max(100, 'Opponent name must be less than 100 characters')
    .trim()
    .optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine(
      (val) => {
        const date = new Date(val);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return date <= today;
      },
      { message: 'Fight date cannot be in the future' }
    )
    .optional(),
  venue: z
    .string()
    .max(200, 'Venue must be less than 200 characters')
    .trim()
    .optional()
    .nullable(),
  result: z.nativeEnum(FightResult).optional(),
  method: z.nativeEnum(FightMethod).optional().nullable(),
  round: z
    .number()
    .int('Round must be a whole number')
    .min(1, 'Round must be at least 1')
    .max(12, 'Round must be 12 or less')
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .trim()
    .optional()
    .nullable(),
});

/**
 * Fight history ID validation schema
 * Validates the :id parameter in routes
 */
export const fightHistoryIdSchema = z.object({
  id: z.string().uuid('Invalid fight history ID format'),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateFightHistoryInput = z.infer<typeof createFightHistorySchema>;
export type UpdateFightHistoryInput = z.infer<typeof updateFightHistorySchema>;
export type FightHistoryIdInput = z.infer<typeof fightHistoryIdSchema>;
