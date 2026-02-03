// Club Validators
// Zod schemas for validating club management requests

import { z } from 'zod';

// ============================================================================
// Helper Schemas
// ============================================================================

/**
 * Operating hours schema for a single day
 */
const dayScheduleSchema = z.object({
  open: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format')
    .optional(),
  close: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format')
    .optional(),
  closed: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.closed) return true;
    return data.open && data.close;
  },
  { message: 'Either set closed=true or provide both open and close times' }
);

/**
 * Operating hours schema for the entire week
 */
export const operatingHoursSchema = z.object({
  monday: dayScheduleSchema.optional(),
  tuesday: dayScheduleSchema.optional(),
  wednesday: dayScheduleSchema.optional(),
  thursday: dayScheduleSchema.optional(),
  friday: dayScheduleSchema.optional(),
  saturday: dayScheduleSchema.optional(),
  sunday: dayScheduleSchema.optional(),
});

/**
 * Pricing tier schema
 */
const pricingTierItemSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().min(0),
  currency: z.string().length(3, 'Currency code must be 3 characters (e.g., GBP, USD)'),
  period: z.enum(['monthly', 'quarterly', 'annually', 'session']),
  description: z.string().max(500).optional(),
});

/**
 * Pricing tiers schema (array of pricing tiers)
 */
export const pricingTiersSchema = z.array(pricingTierItemSchema).max(10);

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

/**
 * Create club validation schema
 * All required fields for creating a new club
 */
export const createClubSchema = z.object({
  // Required basic fields
  name: z.string().min(2).max(200),

  // Optional contact fields
  email: z.string().email('Invalid email format').max(255).optional(),
  phone: z.string().max(50).optional(),
  contactName: z.string().max(100).optional(),

  // Optional location fields
  postcode: z.string().max(20).optional(),
  region: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),

  // Optional rich profile fields
  description: z.string().max(5000).optional(),
  website: z.string().url('Invalid URL format').max(500).optional(),
  facebookUrl: z.string().url('Invalid URL format').max(500).optional(),
  instagramUrl: z.string().url('Invalid URL format').max(500).optional(),
  twitterUrl: z.string().url('Invalid URL format').max(500).optional(),

  foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  capacity: z.number().int().min(1).optional(),

  amenities: z.array(z.string().max(100)).max(50).optional(),
  photos: z.array(z.string().url('Invalid photo URL').max(500)).max(20).optional(),
  specialties: z.array(z.string().max(100)).max(20).optional(),
  ageGroupsServed: z.array(z.string().max(50)).max(10).optional(),
  achievements: z.array(z.string().max(200)).max(50).optional(),
  affiliations: z.array(z.string().max(200)).max(20).optional(),
  certifications: z.array(z.string().max(200)).max(20).optional(),
  languages: z.array(z.string().max(50)).max(20).optional(),
  accessibility: z.array(z.string().max(100)).max(20).optional(),

  operatingHours: operatingHoursSchema.optional(),
  pricingTiers: pricingTiersSchema.optional(),

  // Head coach fields
  headCoachName: z.string().max(200).optional(),
  headCoachBio: z.string().max(2000).optional(),
  headCoachPhotoUrl: z.string().url('Invalid URL format').max(500).optional(),

  // Transportation and accessibility
  parkingInfo: z.string().max(1000).optional(),
  publicTransportInfo: z.string().max(1000).optional(),

  // Membership and publication
  acceptingMembers: z.boolean().optional().default(true),
  isPublished: z.boolean().optional().default(false),

  // Member counts
  memberCount: z.number().int().min(0).optional(),
  coachCount: z.number().int().min(0).optional(),

  // Dates
  establishedDate: z
    .string()
    .datetime({ message: 'Invalid date format' })
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),

  // Owner relationship
  ownerId: z.string().uuid('Invalid owner user ID format').optional(),
});

/**
 * Update club validation schema
 * Partial version - all fields optional
 */
export const updateClubSchema = z.object({
  // Basic fields
  name: z.string().min(2).max(200).optional(),

  // Contact fields
  email: z.string().email('Invalid email format').max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  contactName: z.string().max(100).optional().nullable(),

  // Location fields
  postcode: z.string().max(20).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),

  // Rich profile fields
  description: z.string().max(5000).optional().nullable(),
  website: z.string().url('Invalid URL format').max(500).optional().nullable(),
  facebookUrl: z.string().url('Invalid URL format').max(500).optional().nullable(),
  instagramUrl: z.string().url('Invalid URL format').max(500).optional().nullable(),
  twitterUrl: z.string().url('Invalid URL format').max(500).optional().nullable(),

  foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional().nullable(),
  capacity: z.number().int().min(1).optional().nullable(),

  amenities: z.array(z.string().max(100)).max(50).optional(),
  photos: z.array(z.string().url('Invalid photo URL').max(500)).max(20).optional(),
  specialties: z.array(z.string().max(100)).max(20).optional(),
  ageGroupsServed: z.array(z.string().max(50)).max(10).optional(),
  achievements: z.array(z.string().max(200)).max(50).optional(),
  affiliations: z.array(z.string().max(200)).max(20).optional(),
  certifications: z.array(z.string().max(200)).max(20).optional(),
  languages: z.array(z.string().max(50)).max(20).optional(),
  accessibility: z.array(z.string().max(100)).max(20).optional(),

  operatingHours: operatingHoursSchema.optional().nullable(),
  pricingTiers: pricingTiersSchema.optional().nullable(),

  // Head coach fields
  headCoachName: z.string().max(200).optional().nullable(),
  headCoachBio: z.string().max(2000).optional().nullable(),
  headCoachPhotoUrl: z.string().url('Invalid URL format').max(500).optional().nullable(),

  // Transportation and accessibility
  parkingInfo: z.string().max(1000).optional().nullable(),
  publicTransportInfo: z.string().max(1000).optional().nullable(),

  // Membership and publication
  acceptingMembers: z.boolean().optional(),
  isPublished: z.boolean().optional(),

  // Member counts
  memberCount: z.number().int().min(0).optional().nullable(),
  coachCount: z.number().int().min(0).optional().nullable(),

  // Dates
  establishedDate: z
    .string()
    .datetime({ message: 'Invalid date format' })
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : null)),

  lastVerifiedAt: z
    .string()
    .datetime({ message: 'Invalid date format' })
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : null)),

  verificationNotes: z.string().max(2000).optional().nullable(),

  // Admin-only fields
  isVerified: z.boolean().optional(),

  // Owner relationship
  ownerId: z.string().uuid('Invalid owner user ID format').optional().nullable(),
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
export type CreateClubInput = z.infer<typeof createClubSchema>;
export type UpdateClubInput = z.infer<typeof updateClubSchema>;
export type OperatingHoursInput = z.infer<typeof operatingHoursSchema>;
export type PricingTiersInput = z.infer<typeof pricingTiersSchema>;
