// Test Utilities
// Provides mock factories and setup helpers for unit tests

import { UserRole, ExperienceLevel, MatchRequestStatus, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Mock Data Factories
// ============================================================================

/**
 * Create a mock User object
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  const id = overrides.id || uuidv4();
  return {
    id,
    email: `test-${id.slice(0, 8)}@example.com`,
    passwordHash: '$2a$12$testhashedpassword',
    role: UserRole.BOXER,
    name: 'Test User',
    isActive: true,
    emailVerified: false,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock Boxer object
 */
export function createMockBoxer(overrides: Partial<MockBoxer> = {}): MockBoxer {
  const id = overrides.id || uuidv4();
  const userId = overrides.userId || uuidv4();
  return {
    id,
    userId,
    name: 'Test Boxer',
    weightKg: new Prisma.Decimal(75.5),
    heightCm: 180,
    dateOfBirth: new Date('1995-05-15'),
    location: '123 Boxing Gym St',
    city: 'New York',
    country: 'USA',
    experienceLevel: ExperienceLevel.INTERMEDIATE,
    wins: 10,
    losses: 2,
    draws: 1,
    gymAffiliation: 'Champion Boxing Gym',
    bio: 'A passionate boxer looking for sparring partners',
    profilePhotoUrl: 'https://example.com/photo.jpg',
    isVerified: true,
    isSearchable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock MatchRequest object
 */
export function createMockMatchRequest(
  overrides: Partial<MockMatchRequest> = {}
): MockMatchRequest {
  const id = overrides.id || uuidv4();
  const requesterBoxerId = overrides.requesterBoxerId || uuidv4();
  const targetBoxerId = overrides.targetBoxerId || uuidv4();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  return {
    id,
    requesterBoxerId,
    targetBoxerId,
    status: MatchRequestStatus.PENDING,
    message: 'Looking forward to sparring with you!',
    responseMessage: null,
    proposedDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    proposedVenue: 'Champions Boxing Gym',
    expiresAt,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a mock User with Boxer profile
 */
export function createMockUserWithBoxer(
  userOverrides: Partial<MockUser> = {},
  boxerOverrides: Partial<MockBoxer> = {}
): MockUserWithBoxer {
  const user = createMockUser(userOverrides);
  const boxer = createMockBoxer({ ...boxerOverrides, userId: user.id });
  return {
    ...user,
    boxer,
  };
}

// ============================================================================
// Mock Types
// ============================================================================

export interface MockUser {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockBoxer {
  id: string;
  userId: string;
  name: string;
  weightKg: Prisma.Decimal | null;
  heightCm: number | null;
  dateOfBirth: Date | null;
  location: string | null;
  city: string | null;
  country: string | null;
  experienceLevel: ExperienceLevel;
  wins: number;
  losses: number;
  draws: number;
  gymAffiliation: string | null;
  bio: string | null;
  profilePhotoUrl: string | null;
  isVerified: boolean;
  isSearchable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockMatchRequest {
  id: string;
  requesterBoxerId: string;
  targetBoxerId: string;
  status: MatchRequestStatus;
  message: string | null;
  responseMessage: string | null;
  proposedDate: Date | null;
  proposedVenue: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockUserWithBoxer extends MockUser {
  boxer: MockBoxer;
}

// ============================================================================
// Prisma Mock Setup
// ============================================================================

export interface MockPrismaClient {
  user: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  boxer: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  matchRequest: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  $transaction: jest.Mock;
}

/**
 * Create a mock Prisma client with all methods mocked
 */
export function createMockPrismaClient(): MockPrismaClient {
  return {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    boxer: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    matchRequest: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback({
      user: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      boxer: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
    })),
  };
}

// ============================================================================
// Redis Mock Setup
// ============================================================================

export interface MockRedisClient {
  get: jest.Mock;
  set: jest.Mock;
  setex: jest.Mock;
  del: jest.Mock;
  keys: jest.Mock;
  exists: jest.Mock;
  expire: jest.Mock;
  ping: jest.Mock;
  quit: jest.Mock;
}

/**
 * Create a mock Redis client with all methods mocked
 */
export function createMockRedisClient(): MockRedisClient {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue('OK'),
  };
}

// ============================================================================
// Cache Mock Setup
// ============================================================================

export interface MockCache {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  delByPattern: jest.Mock;
  exists: jest.Mock;
  expire: jest.Mock;
}

/**
 * Create a mock cache utility
 */
export function createMockCache(): MockCache {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    delByPattern: jest.fn().mockResolvedValue(undefined),
    exists: jest.fn().mockResolvedValue(false),
    expire: jest.fn().mockResolvedValue(undefined),
  };
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Wait for a specified number of milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create an expired date (for testing expiration logic)
 */
export function createExpiredDate(): Date {
  return new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
}

/**
 * Create a future date
 */
export function createFutureDate(daysFromNow: number = 7): Date {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
}

/**
 * Generate a random valid email
 */
export function generateEmail(): string {
  return `test-${uuidv4().slice(0, 8)}@example.com`;
}

/**
 * Generate a valid password that meets requirements
 */
export function generateValidPassword(): string {
  return 'SecurePass123!';
}
