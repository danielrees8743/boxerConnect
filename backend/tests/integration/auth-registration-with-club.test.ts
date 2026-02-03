// Auth Registration with Club Integration Tests
// Tests for boxer registration with club membership request flow

import { UserRole } from '@prisma/client';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the config module
jest.mock('../../src/config', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    club: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
  jwtConfig: {
    secret: 'test-jwt-secret-key-that-is-at-least-32-characters',
    expiresIn: '15m',
    refreshSecret: 'test-refresh-secret-key-that-is-at-least-32-characters',
    refreshExpiresIn: '7d',
  },
}));

// Mock auth service
jest.mock('../../src/services/auth.service', () => ({
  register: jest.fn(),
}));

// Mock membership service
jest.mock('../../src/services/clubMembershipRequest.service', () => ({
  createMembershipRequest: jest.fn(),
}));

// Mock validators
jest.mock('../../src/validators/auth.validators', () => ({
  registerSchema: {
    parse: jest.fn((data) => data),
  },
}));

// Mock utils
jest.mock('../../src/utils', () => ({
  sendCreated: jest.fn(),
}));

// Mock middleware
jest.mock('../../src/middleware', () => ({
  BadRequestError: class BadRequestError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'BadRequestError';
    }
  },
}));

// Import after mocking
import { register } from '../../src/controllers/auth.controller';
import { register as registerUser } from '../../src/services/auth.service';
import { createMembershipRequest } from '../../src/services/clubMembershipRequest.service';
import { sendCreated } from '../../src/utils';
import { registerSchema } from '../../src/validators/auth.validators';

// Get typed references to mocks
const mockRegisterUser = registerUser as jest.Mock;
const mockCreateMembershipRequest = createMembershipRequest as jest.Mock;
const mockSendCreated = sendCreated as jest.Mock;
const mockRegisterSchemaParse = registerSchema.parse as jest.Mock;

// ============================================================================
// Test Suites
// ============================================================================

describe('Auth Registration with Club Integration', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();
  });

  // ==========================================================================
  // Registration with Club ID Tests
  // ==========================================================================

  describe('register with clubId', () => {
    const registrationData = {
      email: 'boxer@example.com',
      password: 'Password123',
      name: 'Test Boxer',
      role: UserRole.BOXER,
      clubId: 'club-id-123',
    };

    const mockAuthResult = {
      user: {
        id: 'user-id-123',
        email: registrationData.email,
        name: registrationData.name,
        role: UserRole.BOXER,
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    };

    const mockMembershipRequest = {
      id: 'request-id-123',
      userId: 'user-id-123',
      clubId: 'club-id-123',
      status: 'PENDING',
      requestedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      notes: null,
    };

    it('should register user and create membership request when clubId provided', async () => {
      mockRequest.body = registrationData;
      mockRegisterSchemaParse.mockReturnValue(registrationData);
      mockRegisterUser.mockResolvedValue(mockAuthResult);
      mockCreateMembershipRequest.mockResolvedValue(mockMembershipRequest);
      mockSendCreated.mockImplementation((res, data, message) => {
        res.status(201).json({ success: true, data, message });
      });

      await register(mockRequest, mockResponse, mockNext);

      // Verify user registration was called
      expect(mockRegisterUser).toHaveBeenCalledWith(registrationData);

      // Verify membership request was created
      expect(mockCreateMembershipRequest).toHaveBeenCalledWith(
        mockAuthResult.user.id,
        registrationData.clubId
      );

      // Verify success response
      expect(mockSendCreated).toHaveBeenCalledWith(
        mockResponse,
        {
          user: mockAuthResult.user,
          accessToken: mockAuthResult.accessToken,
          refreshToken: mockAuthResult.refreshToken,
        },
        'Registration successful'
      );

      // Verify next was not called (no errors)
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should register user without creating request when clubId not provided', async () => {
      const dataWithoutClub = { ...registrationData };
      delete dataWithoutClub.clubId;

      mockRequest.body = dataWithoutClub;
      mockRegisterSchemaParse.mockReturnValue(dataWithoutClub);
      mockRegisterUser.mockResolvedValue(mockAuthResult);
      mockSendCreated.mockImplementation((res, data, message) => {
        res.status(201).json({ success: true, data, message });
      });

      await register(mockRequest, mockResponse, mockNext);

      // Verify user registration was called
      expect(mockRegisterUser).toHaveBeenCalledWith(dataWithoutClub);

      // Verify membership request was NOT created
      expect(mockCreateMembershipRequest).not.toHaveBeenCalled();

      // Verify success response
      expect(mockSendCreated).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should register user without creating request when role is not BOXER', async () => {
      const coachData = { ...registrationData, role: UserRole.COACH };

      mockRequest.body = coachData;
      mockRegisterSchemaParse.mockReturnValue(coachData);
      mockRegisterUser.mockResolvedValue({
        ...mockAuthResult,
        user: { ...mockAuthResult.user, role: UserRole.COACH },
      });
      mockSendCreated.mockImplementation((res, data, message) => {
        res.status(201).json({ success: true, data, message });
      });

      await register(mockRequest, mockResponse, mockNext);

      // Verify user registration was called
      expect(mockRegisterUser).toHaveBeenCalledWith(coachData);

      // Verify membership request was NOT created (wrong role)
      expect(mockCreateMembershipRequest).not.toHaveBeenCalled();

      // Verify success response
      expect(mockSendCreated).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should complete registration even if membership request fails', async () => {
      mockRequest.body = registrationData;
      mockRegisterSchemaParse.mockReturnValue(registrationData);
      mockRegisterUser.mockResolvedValue(mockAuthResult);
      mockCreateMembershipRequest.mockRejectedValue(new Error('Club not found'));
      mockSendCreated.mockImplementation((res, data, message) => {
        res.status(201).json({ success: true, data, message });
      });

      // Spy on console.error to verify error logging
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await register(mockRequest, mockResponse, mockNext);

      // Verify user registration succeeded
      expect(mockRegisterUser).toHaveBeenCalledWith(registrationData);

      // Verify membership request was attempted
      expect(mockCreateMembershipRequest).toHaveBeenCalledWith(
        mockAuthResult.user.id,
        registrationData.clubId
      );

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to create membership request during registration:',
        expect.any(Error)
      );

      // Verify registration still succeeded
      expect(mockSendCreated).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle existing user error', async () => {
      mockRequest.body = registrationData;
      mockRegisterSchemaParse.mockReturnValue(registrationData);
      mockRegisterUser.mockRejectedValue(
        new Error('User with this email already exists')
      );

      await register(mockRequest, mockResponse, mockNext);

      // Verify next was called with BadRequestError
      expect(mockNext).toHaveBeenCalled();
      expect(mockNext.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(mockNext.mock.calls[0][0].message).toBe('User with this email already exists');
    });
  });
});
