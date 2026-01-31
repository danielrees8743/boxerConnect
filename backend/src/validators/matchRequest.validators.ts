// Match Request Validators
// Zod schemas for validating match request-related requests

import { z } from 'zod';
import { MatchRequestStatus } from '@prisma/client';

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Create match request validation schema
 * Validates data for creating a new match request
 */
export const createMatchRequestSchema = z.object({
  targetBoxerId: z
    .string()
    .uuid('Invalid target boxer ID format'),
  message: z
    .string()
    .max(2000, 'Message must be less than 2000 characters')
    .trim()
    .optional(),
  proposedDate: z
    .string()
    .datetime({ message: 'Invalid date format' })
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  proposedVenue: z
    .string()
    .max(200, 'Venue must be less than 200 characters')
    .trim()
    .optional(),
});

/**
 * Update match request status validation schema
 * Validates status update (accept, decline, cancel)
 */
export const updateMatchRequestStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED', 'CANCELLED'], {
    errorMap: () => ({ message: 'Status must be ACCEPTED, DECLINED, or CANCELLED' }),
  }),
  responseMessage: z
    .string()
    .max(2000, 'Response message must be less than 2000 characters')
    .trim()
    .optional(),
});

/**
 * Match request search validation schema
 * Validates query parameters for searching match requests
 */
export const matchRequestSearchSchema = z.object({
  status: z
    .nativeEnum(MatchRequestStatus)
    .optional(),
  type: z
    .enum(['incoming', 'outgoing'], {
      errorMap: () => ({ message: 'Type must be incoming or outgoing' }),
    })
    .optional()
    .default('incoming'),
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
 * Match request ID validation schema
 */
export const matchRequestIdSchema = z.object({
  id: z.string().uuid('Invalid match request ID format'),
});

/**
 * Response message schema for accept/decline actions
 */
export const matchRequestResponseSchema = z.object({
  responseMessage: z
    .string()
    .max(2000, 'Response message must be less than 2000 characters')
    .trim()
    .optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateMatchRequestInput = z.infer<typeof createMatchRequestSchema>;
export type UpdateMatchRequestStatusInput = z.infer<typeof updateMatchRequestStatusSchema>;
export type MatchRequestSearchInput = z.infer<typeof matchRequestSearchSchema>;
export type MatchRequestIdInput = z.infer<typeof matchRequestIdSchema>;
export type MatchRequestResponseInput = z.infer<typeof matchRequestResponseSchema>;
