// Club Validators
// Zod schemas for validating club management requests

import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Club ID validation schema
 */
export const clubIdSchema = z.object({
  id: z.string().uuid('Invalid club ID format'),
});

/**
 * Boxer ID param validation schema
 */
export const boxerIdParamSchema = z.object({
  boxerId: z.string().uuid('Invalid boxer ID format'),
});

/**
 * Coach ID param validation schema
 */
export const coachIdParamSchema = z.object({
  coachId: z.string().uuid('Invalid coach ID format'),
});

/**
 * Assign boxer to club validation schema
 */
export const assignBoxerSchema = z.object({
  boxerId: z.string().uuid('Invalid boxer ID format'),
});

/**
 * Assign coach to club validation schema
 */
export const assignCoachSchema = z.object({
  coachUserId: z.string().uuid('Invalid coach user ID format'),
  isHead: z.boolean().optional().default(false),
});

/**
 * Set club owner validation schema
 */
export const setClubOwnerSchema = z.object({
  ownerUserId: z.string().uuid('Invalid owner user ID format'),
});

/**
 * Combined club and boxer ID params
 */
export const clubBoxerParamsSchema = z.object({
  id: z.string().uuid('Invalid club ID format'),
  boxerId: z.string().uuid('Invalid boxer ID format'),
});

/**
 * Combined club and coach ID params
 */
export const clubCoachParamsSchema = z.object({
  id: z.string().uuid('Invalid club ID format'),
  coachId: z.string().uuid('Invalid coach ID format'),
});

// ============================================================================
// Type Exports
// ============================================================================

export type ClubIdInput = z.infer<typeof clubIdSchema>;
export type AssignBoxerInput = z.infer<typeof assignBoxerSchema>;
export type AssignCoachInput = z.infer<typeof assignCoachSchema>;
export type SetClubOwnerInput = z.infer<typeof setClubOwnerSchema>;
export type ClubBoxerParamsInput = z.infer<typeof clubBoxerParamsSchema>;
export type ClubCoachParamsInput = z.infer<typeof clubCoachParamsSchema>;
