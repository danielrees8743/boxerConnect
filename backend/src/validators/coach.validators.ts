// Coach Validators
// Zod schemas for validating coach-related requests

import { z } from 'zod';
import { CoachPermission } from '@prisma/client';

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Link boxer validation schema
 * Validates data for linking a boxer to a coach
 */
export const linkBoxerSchema = z.object({
  boxerId: z
    .string()
    .uuid('Invalid boxer ID format'),
  permissions: z
    .nativeEnum(CoachPermission)
    .default(CoachPermission.VIEW_PROFILE),
});

/**
 * Update permissions validation schema
 * Validates permission update for coach-boxer relationship
 */
export const updatePermissionsSchema = z.object({
  permissions: z
    .nativeEnum(CoachPermission),
});

/**
 * Coach boxer ID param schema
 * Validates boxer ID from URL params
 */
export const coachBoxerIdSchema = z.object({
  boxerId: z
    .string()
    .uuid('Invalid boxer ID format'),
});

// ============================================================================
// Type Exports
// ============================================================================

export type LinkBoxerInput = z.infer<typeof linkBoxerSchema>;
export type UpdatePermissionsInput = z.infer<typeof updatePermissionsSchema>;
export type CoachBoxerIdInput = z.infer<typeof coachBoxerIdSchema>;
