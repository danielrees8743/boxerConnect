// Connection Validators
// Zod schemas for validating connection-related requests

import { z } from 'zod';

export const sendConnectionRequestSchema = z.object({
  targetBoxerId: z.string().uuid('Invalid target boxer ID format'),
  message: z.string().max(500, 'Message must be less than 500 characters').trim().optional(),
});

export const connectionRequestIdSchema = z.object({
  id: z.string().uuid('Invalid connection request ID format'),
});

export const connectionIdSchema = z.object({
  connectionId: z.string().uuid('Invalid connection ID format'),
});

export const connectionStatusParamSchema = z.object({
  boxerId: z.string().uuid('Invalid boxer ID format'),
});

export const connectionQuerySchema = z.object({
  type: z.enum(['incoming', 'outgoing']).default('incoming'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const connectionListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
