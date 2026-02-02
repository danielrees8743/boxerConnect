// Gym Owner Validators Unit Tests
// Tests for gym owner-related validation schemas

import { ExperienceLevel, Gender } from '@prisma/client';
import { createBoxerAccountSchema } from '../../src/validators/gymOwner.validators';

// ============================================================================
// Test Suites
// ============================================================================

describe('Gym Owner Validators', () => {
  // ==========================================================================
  // createBoxerAccountSchema Tests
  // ==========================================================================

  describe('createBoxerAccountSchema', () => {
    const validData = {
      email: 'boxer@example.com',
      password: 'Password123',
      name: 'Test Boxer',
      experienceLevel: ExperienceLevel.BEGINNER,
      gender: Gender.MALE,
      weightKg: 75.5,
      heightCm: 180,
      city: 'New York',
      country: 'USA',
    };

    it('should validate correct data', () => {
      const result = createBoxerAccountSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe(validData.email);
        expect(result.data.name).toBe(validData.name);
      }
    });

    it('should validate minimal required fields only', () => {
      const minimalData = {
        email: 'minimal@example.com',
        password: 'Password123',
        name: 'Minimal Boxer',
      };
      const result = createBoxerAccountSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });

    // Email validation tests
    describe('email validation', () => {
      it('should reject invalid email format', () => {
        const data = { ...validData, email: 'invalid-email' };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Invalid email');
        }
      });

      it('should reject missing email', () => {
        const data = { ...validData };
        delete (data as any).email;
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should convert email to lowercase', () => {
        const data = { ...validData, email: 'BOXER@EXAMPLE.COM' };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.email).toBe('boxer@example.com');
        }
      });

      it('should trim and lowercase email', () => {
        const data = { ...validData, email: 'BOXER@EXAMPLE.COM' };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.email).toBe('boxer@example.com');
        }
      });

      it('should reject email longer than 255 characters', () => {
        const longEmail = 'a'.repeat(250) + '@example.com';
        const data = { ...validData, email: longEmail };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    // Password validation tests
    describe('password validation', () => {
      it('should reject password shorter than 8 characters', () => {
        const data = { ...validData, password: 'Pass12' };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('at least 8 characters');
        }
      });

      it('should reject password without lowercase letter', () => {
        const data = { ...validData, password: 'PASSWORD123' };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('lowercase');
        }
      });

      it('should reject password without uppercase letter', () => {
        const data = { ...validData, password: 'password123' };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('uppercase');
        }
      });

      it('should reject password without number', () => {
        const data = { ...validData, password: 'PasswordABC' };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('number');
        }
      });

      it('should reject password longer than 128 characters', () => {
        const longPassword = 'Password1' + 'a'.repeat(130);
        const data = { ...validData, password: longPassword };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject missing password', () => {
        const data = { ...validData };
        delete (data as any).password;
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    // Name validation tests
    describe('name validation', () => {
      it('should reject name shorter than 2 characters', () => {
        const data = { ...validData, name: 'A' };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('at least 2 characters');
        }
      });

      it('should reject name longer than 100 characters', () => {
        const data = { ...validData, name: 'A'.repeat(101) };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should trim name whitespace', () => {
        const data = { ...validData, name: '  Test Boxer  ' };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe('Test Boxer');
        }
      });

      it('should reject missing name', () => {
        const data = { ...validData };
        delete (data as any).name;
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    // Optional fields validation tests
    describe('optional fields', () => {
      it('should accept valid experienceLevel', () => {
        Object.values(ExperienceLevel).forEach((level) => {
          const data = { ...validData, experienceLevel: level };
          const result = createBoxerAccountSchema.safeParse(data);
          expect(result.success).toBe(true);
        });
      });

      it('should accept valid gender', () => {
        Object.values(Gender).forEach((gender) => {
          const data = { ...validData, gender };
          const result = createBoxerAccountSchema.safeParse(data);
          expect(result.success).toBe(true);
        });
      });

      it('should accept valid weightKg', () => {
        const data = { ...validData, weightKg: 75.5 };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject weightKg below 40', () => {
        const data = { ...validData, weightKg: 35 };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject weightKg above 200', () => {
        const data = { ...validData, weightKg: 250 };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject negative weightKg', () => {
        const data = { ...validData, weightKg: -10 };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should accept valid heightCm', () => {
        const data = { ...validData, heightCm: 180 };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject heightCm below 120', () => {
        const data = { ...validData, heightCm: 100 };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject heightCm above 230', () => {
        const data = { ...validData, heightCm: 250 };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject non-integer heightCm', () => {
        const data = { ...validData, heightCm: 180.5 };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should accept valid dateOfBirth', () => {
        const data = {
          ...validData,
          dateOfBirth: '1990-01-01',
        };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.dateOfBirth).toBeInstanceOf(Date);
        }
      });

      it('should reject future dateOfBirth', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        const data = {
          ...validData,
          dateOfBirth: futureDate.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should accept valid city', () => {
        const data = { ...validData, city: 'New York' };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject city longer than 100 characters', () => {
        const data = { ...validData, city: 'A'.repeat(101) };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should accept valid country', () => {
        const data = { ...validData, country: 'USA' };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject country longer than 100 characters', () => {
        const data = { ...validData, country: 'A'.repeat(101) };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    // Edge cases
    describe('edge cases', () => {
      it('should handle all optional fields being undefined', () => {
        const data = {
          email: 'test@example.com',
          password: 'Password123',
          name: 'Test Boxer',
        };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should handle empty strings for optional fields', () => {
        const data = {
          ...validData,
          city: '',
          country: '',
        };
        const result = createBoxerAccountSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject completely empty object', () => {
        const result = createBoxerAccountSchema.safeParse({});
        expect(result.success).toBe(false);
      });
    });
  });
});
