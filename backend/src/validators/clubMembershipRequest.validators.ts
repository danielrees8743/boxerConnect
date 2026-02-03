// Club Membership Request Validators
// Zod schemas for validating membership request-related requests

import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Reject request validation schema
 * Validates optional notes for rejecting a membership request
 */
export const rejectRequestSchema = z.object({
  notes: z
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type RejectRequestInput = z.infer<typeof rejectRequestSchema>;
