// Gym Owner Service Unit Tests
// Tests for gym owner-related business logic

import { UserRole, ExperienceLevel, Gender } from '@prisma/client';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the config module before importing the service
jest.mock('../../src/config', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    boxer: {
      create: jest.fn(),
    },
    club: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock auth service
jest.mock('../../src/services/auth.service', () => ({
  hashPassword: jest.fn(),
}));

// Mock club service
jest.mock('../../src/services/club.service', () => ({
  isClubOwner: jest.fn(),
}));

// Mock database context
jest.mock('../../src/utils/database-context', () => ({
  withUserContext: jest.fn((userId, role, operation) => {
    // For tests, directly execute the operation with a mock transaction client
    const mockTx = {
      user: {
        create: jest.fn(),
      },
      boxer: {
        create: jest.fn(),
      },
    };
    return operation(mockTx);
  }),
}));

// Import after mocking
import * as gymOwnerService from '../../src/services/gymOwner.service';
import { prisma } from '../../src/config';
import { hashPassword } from '../../src/services/auth.service';
import { isClubOwner } from '../../src/services/club.service';

// Get typed references to the mocks
const mockUserFindUnique = prisma.user.findUnique as jest.Mock;
const mockClubFindUnique = prisma.club.findUnique as jest.Mock;
const mockIsClubOwner = isClubOwner as jest.Mock;
const mockHashPassword = hashPassword as jest.Mock;

// ============================================================================
// Test Suites
// ============================================================================

describe('Gym Owner Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // createBoxerAccountForClub Tests
  // ==========================================================================

  describe('createBoxerAccountForClub', () => {
    const gymOwnerUserId = 'gym-owner-user-id';
    const clubId = 'test-club-id';
    const createData = {
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

    const mockClub = {
      id: clubId,
      name: 'Test Boxing Club',
    };

    const mockUser = {
      id: 'new-user-id',
      email: createData.email,
      name: createData.name,
      role: UserRole.BOXER,
      isActive: true,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockBoxer = {
      id: 'new-boxer-id',
      userId: mockUser.id,
      name: createData.name,
      experienceLevel: createData.experienceLevel,
      gender: createData.gender,
      weightKg: createData.weightKg,
      heightCm: createData.heightCm,
      dateOfBirth: null,
      city: createData.city,
      country: createData.country,
      clubId,
      gymAffiliation: mockClub.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a boxer account successfully', async () => {
      mockIsClubOwner.mockResolvedValue(true);
      mockClubFindUnique.mockResolvedValue(mockClub);
      mockUserFindUnique.mockResolvedValue(null); // Email doesn't exist
      mockHashPassword.mockResolvedValue('hashed-password');

      // Mock the transaction operations
      const mockTx = {
        user: {
          create: jest.fn().mockResolvedValue(mockUser),
        },
        boxer: {
          create: jest.fn().mockResolvedValue(mockBoxer),
        },
      };

      const { withUserContext } = require('../../src/utils/database-context');
      withUserContext.mockImplementation(
        (_userId: string, _role: string, operation: any) => operation(mockTx)
      );

      const result = await gymOwnerService.createBoxerAccountForClub(
        gymOwnerUserId,
        clubId,
        createData
      );

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.boxer).toBeDefined();
      expect(result.user.email).toBe(createData.email);
      expect(result.boxer.clubId).toBe(clubId);
      expect(mockIsClubOwner).toHaveBeenCalledWith(gymOwnerUserId, clubId);
      expect(mockHashPassword).toHaveBeenCalledWith(createData.password);
    });

    it('should throw error if gym owner does not own the club', async () => {
      mockIsClubOwner.mockResolvedValue(false);

      await expect(
        gymOwnerService.createBoxerAccountForClub(
          gymOwnerUserId,
          clubId,
          createData
        )
      ).rejects.toThrow('Not authorized to create accounts for this club');

      expect(mockIsClubOwner).toHaveBeenCalledWith(gymOwnerUserId, clubId);
    });

    it('should throw error if club does not exist', async () => {
      mockIsClubOwner.mockResolvedValue(true);
      mockClubFindUnique.mockResolvedValue(null);

      await expect(
        gymOwnerService.createBoxerAccountForClub(
          gymOwnerUserId,
          clubId,
          createData
        )
      ).rejects.toThrow('Club not found');

      expect(mockClubFindUnique).toHaveBeenCalledWith({
        where: { id: clubId },
        select: { id: true, name: true },
      });
    });

    it('should throw error if email already exists', async () => {
      const existingUser = {
        id: 'existing-user-id',
        email: createData.email,
        role: UserRole.BOXER,
      };

      mockIsClubOwner.mockResolvedValue(true);
      mockClubFindUnique.mockResolvedValue(mockClub);
      mockUserFindUnique.mockResolvedValue(existingUser);

      await expect(
        gymOwnerService.createBoxerAccountForClub(
          gymOwnerUserId,
          clubId,
          createData
        )
      ).rejects.toThrow('User with this email already exists');

      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { email: createData.email },
      });
    });

    it('should create boxer with minimal data (only required fields)', async () => {
      const minimalData = {
        email: 'minimal@example.com',
        password: 'Password123',
        name: 'Minimal Boxer',
      };

      const minimalBoxer = {
        ...mockBoxer,
        gender: null,
        weightKg: null,
        heightCm: null,
        city: null,
        country: null,
        experienceLevel: ExperienceLevel.BEGINNER,
      };

      mockIsClubOwner.mockResolvedValue(true);
      mockClubFindUnique.mockResolvedValue(mockClub);
      mockUserFindUnique.mockResolvedValue(null);
      mockHashPassword.mockResolvedValue('hashed-password');

      const mockTx = {
        user: {
          create: jest.fn().mockResolvedValue(mockUser),
        },
        boxer: {
          create: jest.fn().mockResolvedValue(minimalBoxer),
        },
      };

      const { withUserContext } = require('../../src/utils/database-context');
      withUserContext.mockImplementation(
        (_userId: string, _role: string, operation: any) => operation(mockTx)
      );

      const result = await gymOwnerService.createBoxerAccountForClub(
        gymOwnerUserId,
        clubId,
        minimalData
      );

      expect(result).toBeDefined();
      expect(result.boxer.experienceLevel).toBe(ExperienceLevel.BEGINNER);
      expect(mockTx.boxer.create).toHaveBeenCalled();
    });

    it('should link boxer to club and set gymAffiliation', async () => {
      mockIsClubOwner.mockResolvedValue(true);
      mockClubFindUnique.mockResolvedValue(mockClub);
      mockUserFindUnique.mockResolvedValue(null);
      mockHashPassword.mockResolvedValue('hashed-password');

      const mockTx = {
        user: {
          create: jest.fn().mockResolvedValue(mockUser),
        },
        boxer: {
          create: jest.fn().mockResolvedValue(mockBoxer),
        },
      };

      const { withUserContext } = require('../../src/utils/database-context');
      withUserContext.mockImplementation(
        (_userId: string, _role: string, operation: any) => operation(mockTx)
      );

      const result = await gymOwnerService.createBoxerAccountForClub(
        gymOwnerUserId,
        clubId,
        createData
      );

      expect(result.boxer.clubId).toBe(clubId);
      expect(result.boxer.gymAffiliation).toBe(mockClub.name);
    });

    it('should create user with BOXER role', async () => {
      mockIsClubOwner.mockResolvedValue(true);
      mockClubFindUnique.mockResolvedValue(mockClub);
      mockUserFindUnique.mockResolvedValue(null);
      mockHashPassword.mockResolvedValue('hashed-password');

      const mockTx = {
        user: {
          create: jest.fn().mockResolvedValue(mockUser),
        },
        boxer: {
          create: jest.fn().mockResolvedValue(mockBoxer),
        },
      };

      const { withUserContext } = require('../../src/utils/database-context');
      withUserContext.mockImplementation(
        (_userId: string, _role: string, operation: any) => operation(mockTx)
      );

      const result = await gymOwnerService.createBoxerAccountForClub(
        gymOwnerUserId,
        clubId,
        createData
      );

      expect(result.user.role).toBe(UserRole.BOXER);
      expect(mockTx.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: UserRole.BOXER,
          }),
        })
      );
    });

    it('should set emailVerified to false for gym owner created accounts', async () => {
      mockIsClubOwner.mockResolvedValue(true);
      mockClubFindUnique.mockResolvedValue(mockClub);
      mockUserFindUnique.mockResolvedValue(null);
      mockHashPassword.mockResolvedValue('hashed-password');

      const mockTx = {
        user: {
          create: jest.fn().mockResolvedValue(mockUser),
        },
        boxer: {
          create: jest.fn().mockResolvedValue(mockBoxer),
        },
      };

      const { withUserContext } = require('../../src/utils/database-context');
      withUserContext.mockImplementation(
        (_userId: string, _role: string, operation: any) => operation(mockTx)
      );

      const result = await gymOwnerService.createBoxerAccountForClub(
        gymOwnerUserId,
        clubId,
        createData
      );

      expect(result.user.emailVerified).toBe(false);
      expect(mockTx.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            emailVerified: false,
          }),
        })
      );
    });
  });
});
