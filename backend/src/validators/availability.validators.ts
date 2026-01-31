// Availability Validators
// Zod schemas for validating availability-related requests

import { z } from 'zod';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate time string format (HH:mm or HH:mm:ss)
 */
const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;

/**
 * Parse time string to Date object (using 1970-01-01 as base date)
 */
function parseTimeString(time: string): Date {
  const parts = time.split(':');
  const hours = parts[0] ?? '0';
  const minutes = parts[1] ?? '0';
  const seconds = parts[2] ?? '0';
  const date = new Date(1970, 0, 1);
  date.setHours(parseInt(hours, 10), parseInt(minutes, 10), parseInt(seconds, 10));
  return date;
}

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Create availability validation schema
 * Validates data for creating a new availability slot
 */
export const createAvailabilitySchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .transform((val) => new Date(val)),
    startTime: z
      .string()
      .regex(timeRegex, 'Start time must be in HH:mm or HH:mm:ss format')
      .transform(parseTimeString),
    endTime: z
      .string()
      .regex(timeRegex, 'End time must be in HH:mm or HH:mm:ss format')
      .transform(parseTimeString),
    isAvailable: z.boolean().optional().default(true),
    notes: z
      .string()
      .max(500, 'Notes must be less than 500 characters')
      .trim()
      .optional(),
  })
  .refine(
    (data) => data.endTime > data.startTime,
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  );

/**
 * Update availability validation schema
 * Partial version - all fields optional
 */
export const updateAvailabilitySchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .transform((val) => new Date(val))
      .optional(),
    startTime: z
      .string()
      .regex(timeRegex, 'Start time must be in HH:mm or HH:mm:ss format')
      .transform(parseTimeString)
      .optional(),
    endTime: z
      .string()
      .regex(timeRegex, 'End time must be in HH:mm or HH:mm:ss format')
      .transform(parseTimeString)
      .optional(),
    isAvailable: z.boolean().optional(),
    notes: z
      .string()
      .max(500, 'Notes must be less than 500 characters')
      .trim()
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      // Only validate if both times are provided
      if (data.startTime && data.endTime) {
        return data.endTime > data.startTime;
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  );

/**
 * Availability query validation schema
 * Validates query parameters for getting availability
 */
export const availabilityQuerySchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

/**
 * Availability ID parameter validation schema
 */
export const availabilityIdSchema = z.object({
  id: z.string().uuid('Invalid availability ID format'),
});

/**
 * Boxer ID parameter validation schema (for routes)
 */
export const availabilityBoxerIdSchema = z.object({
  boxerId: z.string().uuid('Invalid boxer ID format'),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>;
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;
export type AvailabilityIdInput = z.infer<typeof availabilityIdSchema>;
export type AvailabilityBoxerIdInput = z.infer<typeof availabilityBoxerIdSchema>;
