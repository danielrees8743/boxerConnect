// Club Validators Tests
// Tests for club validation schemas including enhanced profile fields

import { z } from 'zod';
import {
  createClubSchema,
  updateClubSchema,
  operatingHoursSchema,
  pricingTiersSchema,
  clubIdSchema,
  clubBoxerParamsSchema,
  clubCoachParamsSchema,
} from '../../src/validators/club.validators';

// ============================================================================
// Test Helpers
// ============================================================================

function expectValidationSuccess(schema: z.ZodSchema, data: any) {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error('Validation errors:', result.error.issues);
  }
  expect(result.success).toBe(true);
  return result.data;
}

function expectValidationFailure(schema: z.ZodSchema, data: any) {
  const result = schema.safeParse(data);
  expect(result.success).toBe(false);
  return result.error;
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Club Validators - createClubSchema', () => {
  // ==========================================================================
  // Valid Data Tests
  // ==========================================================================

  it('should accept valid complete club data', () => {
    const validData = {
      name: 'Elite Boxing Academy',
      email: 'contact@eliteboxing.com',
      phone: '+44 20 1234 5678',
      contactName: 'Jane Smith',
      postcode: 'SW1A 1AA',
      region: 'London',
      address: '456 Boxing Street',
      city: 'London',
      country: 'United Kingdom',
      latitude: 51.5074,
      longitude: -0.1278,
      description: 'Premier boxing academy with state-of-the-art facilities',
      website: 'https://eliteboxing.com',
      facebookUrl: 'https://facebook.com/eliteboxing',
      instagramUrl: 'https://instagram.com/eliteboxing',
      twitterUrl: 'https://twitter.com/eliteboxing',
      foundedYear: 1995,
      capacity: 100,
      amenities: ['Professional Ring', 'Heavy Bags', 'Speed Bags'],
      photos: ['https://example.com/gym1.jpg', 'https://example.com/gym2.jpg'],
      operatingHours: {
        monday: { open: '06:00', close: '22:00' },
        tuesday: { open: '06:00', close: '22:00' },
      },
      pricingTiers: [
        {
          name: 'Basic',
          price: 50,
          currency: 'GBP',
          period: 'monthly',
          description: 'Basic membership',
        },
      ],
      specialties: ['Olympic Boxing', 'Professional Training'],
      ageGroupsServed: ['Youth (12-17)', 'Adults (18+)'],
      achievements: ['National Champions 2020'],
      affiliations: ['British Boxing Federation'],
      certifications: ['SafeSport Certified'],
      languages: ['English', 'Spanish'],
      accessibility: ['Wheelchair Access'],
      headCoachName: 'Mike Johnson',
      headCoachBio: '20 years of professional coaching experience',
      headCoachPhotoUrl: 'https://example.com/coach.jpg',
      parkingInfo: 'Free parking available for members',
      publicTransportInfo: 'Close to Westminster station',
      acceptingMembers: true,
      isPublished: true,
    };

    expectValidationSuccess(createClubSchema, validData);
  });

  it('should accept minimal valid data (name only)', () => {
    const minimalData = {
      name: 'Simple Boxing Gym',
    };

    expectValidationSuccess(createClubSchema, minimalData);
  });

  it('should accept club with partial optional fields', () => {
    const partialData = {
      name: 'Boxing Club',
      email: 'info@boxingclub.com',
      description: 'A friendly boxing club',
      foundedYear: 2010,
    };

    expectValidationSuccess(createClubSchema, partialData);
  });

  // ==========================================================================
  // Invalid Name Tests
  // ==========================================================================

  it('should reject name that is too short (< 2 chars)', () => {
    const invalidData = {
      name: 'X',
    };

    expectValidationFailure(createClubSchema, invalidData);
  });

  it('should reject name that is too long (> 200 chars)', () => {
    const invalidData = {
      name: 'X'.repeat(201),
    };

    expectValidationFailure(createClubSchema, invalidData);
  });

  it('should reject missing name', () => {
    const invalidData = {
      email: 'test@example.com',
    };

    expectValidationFailure(createClubSchema, invalidData);
  });

  // ==========================================================================
  // Invalid Email/URL Format Tests
  // ==========================================================================

  it('should reject invalid email format', () => {
    const invalidData = {
      name: 'Boxing Club',
      email: 'not-an-email',
    };

    expectValidationFailure(createClubSchema, invalidData);
  });

  it('should reject invalid website URL', () => {
    const invalidData = {
      name: 'Boxing Club',
      website: 'not-a-url',
    };

    expectValidationFailure(createClubSchema, invalidData);
  });

  it('should reject invalid social media URLs', () => {
    const invalidData = {
      name: 'Boxing Club',
      facebookUrl: 'invalid-url',
    };

    expectValidationFailure(createClubSchema, invalidData);
  });

  // ==========================================================================
  // Founded Year Validation Tests
  // ==========================================================================

  it('should accept valid founded year (1800 to current year)', () => {
    const currentYear = new Date().getFullYear();
    const validData = {
      name: 'Boxing Club',
      foundedYear: currentYear,
    };

    expectValidationSuccess(createClubSchema, validData);
  });

  it('should reject founded year before 1800', () => {
    const invalidData = {
      name: 'Boxing Club',
      foundedYear: 1799,
    };

    expectValidationFailure(createClubSchema, invalidData);
  });

  it('should reject founded year in the future', () => {
    const currentYear = new Date().getFullYear();
    const invalidData = {
      name: 'Boxing Club',
      foundedYear: currentYear + 1,
    };

    expectValidationFailure(createClubSchema, invalidData);
  });

  // ==========================================================================
  // Array Length Validation Tests
  // ==========================================================================

  it('should reject amenities array exceeding max length (50)', () => {
    const invalidData = {
      name: 'Boxing Club',
      amenities: Array(51).fill('Amenity'),
    };

    expectValidationFailure(createClubSchema, invalidData);
  });

  it('should reject photos array exceeding max length (20)', () => {
    const invalidData = {
      name: 'Boxing Club',
      photos: Array(21).fill('https://example.com/photo.jpg'),
    };

    expectValidationFailure(createClubSchema, invalidData);
  });

  it('should reject specialties array exceeding max length (20)', () => {
    const invalidData = {
      name: 'Boxing Club',
      specialties: Array(21).fill('Specialty'),
    };

    expectValidationFailure(createClubSchema, invalidData);
  });

  it('should reject achievements array exceeding max length (50)', () => {
    const invalidData = {
      name: 'Boxing Club',
      achievements: Array(51).fill('Achievement'),
    };

    expectValidationFailure(createClubSchema, invalidData);
  });

  // ==========================================================================
  // Latitude/Longitude Range Tests
  // ==========================================================================

  it('should accept valid latitude (-90 to 90)', () => {
    const validData = {
      name: 'Boxing Club',
      latitude: 51.5074,
      longitude: -0.1278,
    };

    expectValidationSuccess(createClubSchema, validData);
  });

  it('should reject latitude below -90', () => {
    const invalidData = {
      name: 'Boxing Club',
      latitude: -91,
      longitude: 0,
    };

    expectValidationFailure(createClubSchema, invalidData);
  });

  it('should reject latitude above 90', () => {
    const invalidData = {
      name: 'Boxing Club',
      latitude: 91,
      longitude: 0,
    };

    expectValidationFailure(createClubSchema, invalidData);
  });

  it('should reject longitude below -180', () => {
    const invalidData = {
      name: 'Boxing Club',
      latitude: 0,
      longitude: -181,
    };

    expectValidationFailure(createClubSchema, invalidData);
  });

  it('should reject longitude above 180', () => {
    const invalidData = {
      name: 'Boxing Club',
      latitude: 0,
      longitude: 181,
    };

    expectValidationFailure(createClubSchema, invalidData);
  });
});

describe('Club Validators - updateClubSchema', () => {
  // ==========================================================================
  // Valid Partial Updates
  // ==========================================================================

  it('should accept partial update with single field', () => {
    const partialUpdate = {
      description: 'Updated description',
    };

    expectValidationSuccess(updateClubSchema, partialUpdate);
  });

  it('should accept partial update with multiple fields', () => {
    const partialUpdate = {
      name: 'Updated Name',
      description: 'Updated description',
      acceptingMembers: false,
    };

    expectValidationSuccess(updateClubSchema, partialUpdate);
  });

  it('should accept null values for nullable fields', () => {
    const updateWithNulls = {
      email: null,
      phone: null,
      website: null,
      description: null,
    };

    expectValidationSuccess(updateClubSchema, updateWithNulls);
  });

  it('should accept empty update object', () => {
    const emptyUpdate = {};

    expectValidationSuccess(updateClubSchema, emptyUpdate);
  });

  // ==========================================================================
  // Admin-Only Fields
  // ==========================================================================

  it('should accept admin-only fields in update', () => {
    const adminUpdate = {
      isVerified: true,
      lastVerifiedAt: new Date().toISOString(),
      verificationNotes: 'Verified by admin',
    };

    expectValidationSuccess(updateClubSchema, adminUpdate);
  });

  // ==========================================================================
  // Validation Still Applies on Update
  // ==========================================================================

  it('should reject invalid email format in update', () => {
    const invalidUpdate = {
      email: 'not-an-email',
    };

    expectValidationFailure(updateClubSchema, invalidUpdate);
  });

  it('should reject invalid URL format in update', () => {
    const invalidUpdate = {
      website: 'not-a-url',
    };

    expectValidationFailure(updateClubSchema, invalidUpdate);
  });

  it('should reject name that is too short in update', () => {
    const invalidUpdate = {
      name: 'X',
    };

    expectValidationFailure(updateClubSchema, invalidUpdate);
  });
});

describe('Club Validators - operatingHoursSchema', () => {
  // ==========================================================================
  // Valid Operating Hours
  // ==========================================================================

  it('should accept valid operating hours with open/close times', () => {
    const validHours = {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
    };

    expectValidationSuccess(operatingHoursSchema, validHours);
  });

  it('should accept closed days', () => {
    const validHours = {
      sunday: { closed: true },
    };

    expectValidationSuccess(operatingHoursSchema, validHours);
  });

  it('should accept mixed open and closed days', () => {
    const validHours = {
      monday: { open: '06:00', close: '22:00' },
      tuesday: { open: '06:00', close: '22:00' },
      wednesday: { closed: true },
      sunday: { closed: true },
    };

    expectValidationSuccess(operatingHoursSchema, validHours);
  });

  // ==========================================================================
  // Invalid Operating Hours Format
  // ==========================================================================

  it('should reject invalid time format (not HH:MM)', () => {
    const invalidHours = {
      monday: { open: '9:00', close: '17:00' }, // Should be 09:00
    };

    expectValidationFailure(operatingHoursSchema, invalidHours);
  });

  it('should reject invalid time (25:00)', () => {
    const invalidHours = {
      monday: { open: '25:00', close: '17:00' },
    };

    expectValidationFailure(operatingHoursSchema, invalidHours);
  });

  it('should reject invalid time (12:60)', () => {
    const invalidHours = {
      monday: { open: '09:00', close: '12:60' },
    };

    expectValidationFailure(operatingHoursSchema, invalidHours);
  });

  it('should reject day with open but no close time', () => {
    const invalidHours = {
      monday: { open: '09:00' }, // Missing close
    };

    expectValidationFailure(operatingHoursSchema, invalidHours);
  });

  it('should reject day with close but no open time', () => {
    const invalidHours = {
      monday: { close: '17:00' }, // Missing open
    };

    expectValidationFailure(operatingHoursSchema, invalidHours);
  });
});

describe('Club Validators - pricingTiersSchema', () => {
  // ==========================================================================
  // Valid Pricing Tiers
  // ==========================================================================

  it('should accept valid pricing tier', () => {
    const validTiers = [
      {
        name: 'Basic',
        price: 50,
        currency: 'GBP',
        period: 'monthly',
        description: 'Basic membership',
      },
    ];

    expectValidationSuccess(pricingTiersSchema, validTiers);
  });

  it('should accept multiple pricing tiers', () => {
    const validTiers = [
      {
        name: 'Basic',
        price: 50,
        currency: 'GBP',
        period: 'monthly',
      },
      {
        name: 'Premium',
        price: 100,
        currency: 'GBP',
        period: 'monthly',
        description: 'Premium membership',
      },
      {
        name: 'Annual',
        price: 500,
        currency: 'GBP',
        period: 'annually',
      },
    ];

    expectValidationSuccess(pricingTiersSchema, validTiers);
  });

  it('should accept all valid period types', () => {
    const validTiers = [
      { name: 'Monthly', price: 50, currency: 'GBP', period: 'monthly' },
      { name: 'Quarterly', price: 140, currency: 'GBP', period: 'quarterly' },
      { name: 'Annually', price: 500, currency: 'GBP', period: 'annually' },
      { name: 'Session', price: 10, currency: 'GBP', period: 'session' },
    ];

    expectValidationSuccess(pricingTiersSchema, validTiers);
  });

  // ==========================================================================
  // Invalid Pricing Tier Structure
  // ==========================================================================

  it('should reject negative price', () => {
    const invalidTiers = [
      {
        name: 'Basic',
        price: -10,
        currency: 'GBP',
        period: 'monthly',
      },
    ];

    expectValidationFailure(pricingTiersSchema, invalidTiers);
  });

  it('should reject invalid currency code (not 3 chars)', () => {
    const invalidTiers = [
      {
        name: 'Basic',
        price: 50,
        currency: 'GB', // Should be GBP
        period: 'monthly',
      },
    ];

    expectValidationFailure(pricingTiersSchema, invalidTiers);
  });

  it('should reject invalid period', () => {
    const invalidTiers = [
      {
        name: 'Basic',
        price: 50,
        currency: 'GBP',
        period: 'weekly', // Not a valid period
      },
    ];

    expectValidationFailure(pricingTiersSchema, invalidTiers);
  });

  it('should reject missing required fields', () => {
    const invalidTiers = [
      {
        name: 'Basic',
        price: 50,
        // Missing currency and period
      },
    ];

    expectValidationFailure(pricingTiersSchema, invalidTiers);
  });

  it('should reject more than 10 pricing tiers', () => {
    const invalidTiers = Array(11).fill({
      name: 'Tier',
      price: 50,
      currency: 'GBP',
      period: 'monthly',
    });

    expectValidationFailure(pricingTiersSchema, invalidTiers);
  });
});

describe('Club Validators - ID Schemas', () => {
  // ==========================================================================
  // Valid UUID Tests
  // ==========================================================================

  it('should accept valid UUID for clubIdSchema', () => {
    const validId = {
      id: '550e8400-e29b-41d4-a716-446655440000',
    };

    expectValidationSuccess(clubIdSchema, validId);
  });

  it('should accept valid UUIDs for clubBoxerParamsSchema', () => {
    const validParams = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      boxerId: '660e8400-e29b-41d4-a716-446655440001',
    };

    expectValidationSuccess(clubBoxerParamsSchema, validParams);
  });

  it('should accept valid UUIDs for clubCoachParamsSchema', () => {
    const validParams = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      coachId: '660e8400-e29b-41d4-a716-446655440001',
    };

    expectValidationSuccess(clubCoachParamsSchema, validParams);
  });

  // ==========================================================================
  // Invalid UUID Tests
  // ==========================================================================

  it('should reject invalid UUID format', () => {
    const invalidId = {
      id: 'not-a-uuid',
    };

    expectValidationFailure(clubIdSchema, invalidId);
  });

  it('should reject non-UUID strings', () => {
    const invalidId = {
      id: '12345',
    };

    expectValidationFailure(clubIdSchema, invalidId);
  });

  it('should reject missing ID', () => {
    const invalidData = {};

    expectValidationFailure(clubIdSchema, invalidData);
  });
});

describe('Club Validators - Edge Cases and Boundary Conditions', () => {
  // ==========================================================================
  // String Length Boundaries
  // ==========================================================================

  it('should accept name at minimum length (2 chars)', () => {
    const validData = {
      name: 'BC',
    };

    expectValidationSuccess(createClubSchema, validData);
  });

  it('should accept name at maximum length (200 chars)', () => {
    const validData = {
      name: 'A'.repeat(200),
    };

    expectValidationSuccess(createClubSchema, validData);
  });

  it('should accept description at maximum length (5000 chars)', () => {
    const validData = {
      name: 'Boxing Club',
      description: 'A'.repeat(5000),
    };

    expectValidationSuccess(createClubSchema, validData);
  });

  it('should reject description exceeding maximum length', () => {
    const invalidData = {
      name: 'Boxing Club',
      description: 'A'.repeat(5001),
    };

    expectValidationFailure(createClubSchema, invalidData);
  });

  // ==========================================================================
  // Array Edge Cases
  // ==========================================================================

  it('should accept empty arrays for optional array fields', () => {
    const validData = {
      name: 'Boxing Club',
      amenities: [],
      photos: [],
      specialties: [],
    };

    expectValidationSuccess(createClubSchema, validData);
  });

  it('should accept arrays at maximum allowed length', () => {
    const validData = {
      name: 'Boxing Club',
      amenities: Array(50).fill('Amenity'),
      photos: Array(20).fill('https://example.com/photo.jpg'),
      specialties: Array(20).fill('Specialty'),
    };

    expectValidationSuccess(createClubSchema, validData);
  });

  // ==========================================================================
  // Number Boundaries
  // ==========================================================================

  it('should accept capacity at minimum value (1)', () => {
    const validData = {
      name: 'Boxing Club',
      capacity: 1,
    };

    expectValidationSuccess(createClubSchema, validData);
  });

  it('should reject capacity below minimum (0)', () => {
    const invalidData = {
      name: 'Boxing Club',
      capacity: 0,
    };

    expectValidationFailure(createClubSchema, invalidData);
  });

  it('should accept price at zero (free)', () => {
    const validTiers = [
      {
        name: 'Free',
        price: 0,
        currency: 'GBP',
        period: 'monthly',
      },
    ];

    expectValidationSuccess(pricingTiersSchema, validTiers);
  });
});
