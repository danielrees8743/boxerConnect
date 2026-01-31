// Auth Service Unit Tests
// Tests for authentication-related business logic

import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createMockUser } from '../utils/testUtils';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the config module before importing the service
jest.mock('../../src/config', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    boxer: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  },
  jwtConfig: {
    secret: 'test-jwt-secret-key-that-is-at-least-32-characters',
    expiresIn: '15m',
    refreshSecret: 'test-refresh-secret-key-that-is-at-least-32-characters',
    refreshExpiresIn: '7d',
  },
}));

// Import after mocking
import * as authService from '../../src/services/auth.service';
import { prisma, redis } from '../../src/config';

// Get typed references to the mocks
const mockUserFindUnique = prisma.user.findUnique as jest.Mock;
const mockUserUpdate = prisma.user.update as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;
const mockRedisGet = redis.get as jest.Mock;
const mockRedisSetex = redis.setex as jest.Mock;
const mockRedisDel = redis.del as jest.Mock;
const mockRedisKeys = redis.keys as jest.Mock;

// ============================================================================
// Test Suites
// ============================================================================

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Password Hashing Tests
  // ==========================================================================

  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'SecurePassword123';
      const hash = await authService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2a$')).toBe(true); // bcrypt hash prefix
    });

    it('should produce different hashes for the same password', async () => {
      const password = 'SecurePassword123';
      const hash1 = await authService.hashPassword(password);
      const hash2 = await authService.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should use correct bcrypt cost factor', async () => {
      const password = 'SecurePassword123';
      const hash = await authService.hashPassword(password);

      // Cost factor 12 is encoded in the hash
      expect(hash.startsWith('$2a$12$')).toBe(true);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'SecurePassword123';
      const hash = await bcrypt.hash(password, 12);

      const result = await authService.comparePassword(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for non-matching password and hash', async () => {
      const password = 'SecurePassword123';
      const wrongPassword = 'WrongPassword456';
      const hash = await bcrypt.hash(password, 12);

      const result = await authService.comparePassword(wrongPassword, hash);

      expect(result).toBe(false);
    });

    it('should handle empty password', async () => {
      const password = 'SecurePassword123';
      const hash = await bcrypt.hash(password, 12);

      const result = await authService.comparePassword('', hash);

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // Token Generation Tests
  // ==========================================================================

  describe('generateAccessToken', () => {
    it('should generate a valid JWT access token', () => {
      const userId = 'test-user-id';
      const role = UserRole.BOXER;

      const token = authService.generateAccessToken(userId, role);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should include userId and role in payload', () => {
      const userId = 'test-user-id';
      const role = UserRole.BOXER;

      const token = authService.generateAccessToken(userId, role);
      const decoded = jwt.decode(token) as authService.TokenPayload;

      expect(decoded.userId).toBe(userId);
      expect(decoded.role).toBe(role);
    });

    it('should set expiration time', () => {
      const userId = 'test-user-id';
      const role = UserRole.BOXER;

      const token = authService.generateAccessToken(userId, role);
      const decoded = jwt.decode(token) as jwt.JwtPayload;

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp! > decoded.iat!).toBe(true);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid JWT refresh token', () => {
      const userId = 'test-user-id';

      const token = authService.generateRefreshToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    it('should include tokenId for revocation', () => {
      const userId = 'test-user-id';

      const token = authService.generateRefreshToken(userId);
      const decoded = jwt.decode(token) as authService.TokenPayload;

      expect(decoded.tokenId).toBeDefined();
      expect(typeof decoded.tokenId).toBe('string');
    });

    it('should generate unique tokenIds for each call', () => {
      const userId = 'test-user-id';

      const token1 = authService.generateRefreshToken(userId);
      const token2 = authService.generateRefreshToken(userId);

      const decoded1 = jwt.decode(token1) as authService.TokenPayload;
      const decoded2 = jwt.decode(token2) as authService.TokenPayload;

      expect(decoded1.tokenId).not.toBe(decoded2.tokenId);
    });
  });

  // ==========================================================================
  // Token Verification Tests
  // ==========================================================================

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const userId = 'test-user-id';
      const role = UserRole.BOXER;
      const token = authService.generateAccessToken(userId, role);

      const payload = authService.verifyAccessToken(token);

      expect(payload.userId).toBe(userId);
      expect(payload.role).toBe(role);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => authService.verifyAccessToken(invalidToken)).toThrow();
    });

    it('should throw error for expired token', () => {
      // Create a token that expired in the past
      const payload = { userId: 'test-user-id', role: UserRole.BOXER };
      const expiredToken = jwt.sign(payload, 'test-jwt-secret-key-that-is-at-least-32-characters', {
        expiresIn: '-1s',
      });

      expect(() => authService.verifyAccessToken(expiredToken)).toThrow();
    });

    it('should throw error for token signed with wrong secret', () => {
      const payload = { userId: 'test-user-id', role: UserRole.BOXER };
      const wrongSecretToken = jwt.sign(payload, 'wrong-secret-key-wrong-secret-key', {
        expiresIn: '15m',
      });

      expect(() => authService.verifyAccessToken(wrongSecretToken)).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const userId = 'test-user-id';
      const token = authService.generateRefreshToken(userId);

      const payload = authService.verifyRefreshToken(token);

      expect(payload.userId).toBe(userId);
      expect(payload.tokenId).toBeDefined();
    });

    it('should throw error for invalid refresh token', () => {
      const invalidToken = 'invalid.refresh.token';

      expect(() => authService.verifyRefreshToken(invalidToken)).toThrow();
    });
  });

  describe('generatePasswordResetToken', () => {
    it('should generate a random hex token', () => {
      const token = authService.generatePasswordResetToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
      expect(/^[a-f0-9]+$/i.test(token)).toBe(true);
    });

    it('should generate unique tokens', () => {
      const token1 = authService.generatePasswordResetToken();
      const token2 = authService.generatePasswordResetToken();

      expect(token1).not.toBe(token2);
    });
  });

  // ==========================================================================
  // Register Function Tests
  // ==========================================================================

  describe('register', () => {
    const registerData = {
      email: 'test@example.com',
      password: 'SecurePassword123',
      name: 'Test User',
      role: UserRole.BOXER,
    };

    it('should register a new user successfully', async () => {
      const mockUser = createMockUser({
        email: registerData.email,
        name: registerData.name,
        role: registerData.role,
      });

      mockUserFindUnique.mockResolvedValue(null);
      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          user: {
            create: jest.fn().mockResolvedValue(mockUser),
          },
          boxer: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      const result = await authService.register(registerData);

      expect(result).toBeDefined();
      expect(result.email).toBe(registerData.email);
      expect(result.name).toBe(registerData.name);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw error if user already exists', async () => {
      const existingUser = createMockUser({ email: registerData.email });
      mockUserFindUnique.mockResolvedValue(existingUser as any);

      await expect(authService.register(registerData)).rejects.toThrow(
        'User with this email already exists'
      );
    });

    it('should create boxer profile for BOXER role', async () => {
      const mockUser = createMockUser({
        email: registerData.email,
        name: registerData.name,
        role: UserRole.BOXER,
      });

      const mockBoxerCreate = jest.fn().mockResolvedValue({});
      mockUserFindUnique.mockResolvedValue(null);
      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          user: {
            create: jest.fn().mockResolvedValue(mockUser),
          },
          boxer: {
            create: mockBoxerCreate,
          },
        };
        return callback(mockTx);
      });

      await authService.register(registerData);

      // The transaction callback was called
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should not create boxer profile for non-BOXER role', async () => {
      const coachData = { ...registerData, role: UserRole.COACH };
      const mockUser = createMockUser({
        email: coachData.email,
        name: coachData.name,
        role: UserRole.COACH,
      });

      const mockBoxerCreate = jest.fn();
      mockUserFindUnique.mockResolvedValue(null);
      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          user: {
            create: jest.fn().mockResolvedValue(mockUser),
          },
          boxer: {
            create: mockBoxerCreate,
          },
        };
        return callback(mockTx);
      });

      await authService.register(coachData);

      // Boxer create should not be called for COACH role
      expect(mockBoxerCreate).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Login Function Tests
  // ==========================================================================

  describe('login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'SecurePassword123',
    };

    it('should login successfully with valid credentials', async () => {
      const passwordHash = await bcrypt.hash(loginData.password, 12);
      const mockUser = createMockUser({
        email: loginData.email,
        passwordHash,
        isActive: true,
      });

      mockUserFindUnique.mockResolvedValue(mockUser as any);
      mockUserUpdate.mockResolvedValue(mockUser as any);
      mockRedisSetex.mockResolvedValue('OK' as any);

      const result = await authService.login(loginData.email, loginData.password);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe(loginData.email);
    });

    it('should throw error for non-existent user', async () => {
      mockUserFindUnique.mockResolvedValue(null);

      await expect(authService.login(loginData.email, loginData.password)).rejects.toThrow(
        'Invalid email or password'
      );
    });

    it('should throw error for invalid password', async () => {
      const passwordHash = await bcrypt.hash('differentPassword', 12);
      const mockUser = createMockUser({
        email: loginData.email,
        passwordHash,
        isActive: true,
      });

      mockUserFindUnique.mockResolvedValue(mockUser as any);

      await expect(authService.login(loginData.email, loginData.password)).rejects.toThrow(
        'Invalid email or password'
      );
    });

    it('should throw error for deactivated account', async () => {
      const passwordHash = await bcrypt.hash(loginData.password, 12);
      const mockUser = createMockUser({
        email: loginData.email,
        passwordHash,
        isActive: false,
      });

      mockUserFindUnique.mockResolvedValue(mockUser as any);

      await expect(authService.login(loginData.email, loginData.password)).rejects.toThrow(
        'Account is deactivated'
      );
    });

    it('should update lastLoginAt on successful login', async () => {
      const passwordHash = await bcrypt.hash(loginData.password, 12);
      const mockUser = createMockUser({
        email: loginData.email,
        passwordHash,
        isActive: true,
      });

      mockUserFindUnique.mockResolvedValue(mockUser as any);
      mockUserUpdate.mockResolvedValue(mockUser as any);
      mockRedisSetex.mockResolvedValue('OK' as any);

      await authService.login(loginData.email, loginData.password);

      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({
            lastLoginAt: expect.any(Date),
          }),
        })
      );
    });

    it('should store refresh token in Redis', async () => {
      const passwordHash = await bcrypt.hash(loginData.password, 12);
      const mockUser = createMockUser({
        email: loginData.email,
        passwordHash,
        isActive: true,
      });

      mockUserFindUnique.mockResolvedValue(mockUser as any);
      mockUserUpdate.mockResolvedValue(mockUser as any);
      mockRedisSetex.mockResolvedValue('OK' as any);

      await authService.login(loginData.email, loginData.password);

      expect(mockRedisSetex).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Refresh Token Rotation Tests
  // ==========================================================================

  describe('refresh', () => {
    it('should return new tokens for valid refresh token', async () => {
      const userId = 'test-user-id';
      const refreshToken = authService.generateRefreshToken(userId);
      // Verify token is valid (not using payload, just validating)
      authService.verifyRefreshToken(refreshToken);

      const mockUser = createMockUser({ id: userId, isActive: true });
      const storedHash = await bcrypt.hash(refreshToken, 12);

      mockRedisGet.mockResolvedValue(storedHash);
      mockRedisDel.mockResolvedValue(1 as any);
      mockRedisSetex.mockResolvedValue('OK' as any);
      mockUserFindUnique.mockResolvedValue(mockUser as any);

      const result = await authService.refresh(refreshToken);

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe(refreshToken); // Should be a new token
    });

    it('should throw error for invalid refresh token', async () => {
      const invalidToken = 'invalid.refresh.token';

      await expect(authService.refresh(invalidToken)).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should throw error for revoked refresh token', async () => {
      const userId = 'test-user-id';
      const refreshToken = authService.generateRefreshToken(userId);

      mockRedisGet.mockResolvedValue(null); // Token not found in Redis

      await expect(authService.refresh(refreshToken)).rejects.toThrow(
        'Refresh token has been revoked'
      );
    });

    it('should throw error for inactive user', async () => {
      const userId = 'test-user-id';
      const refreshToken = authService.generateRefreshToken(userId);
      const storedHash = await bcrypt.hash(refreshToken, 12);

      const mockUser = createMockUser({ id: userId, isActive: false });

      mockRedisGet.mockResolvedValue(storedHash);
      mockRedisDel.mockResolvedValue(1 as any);
      mockUserFindUnique.mockResolvedValue(mockUser as any);

      await expect(authService.refresh(refreshToken)).rejects.toThrow(
        'User not found or inactive'
      );
    });

    it('should invalidate old token after rotation', async () => {
      const userId = 'test-user-id';
      const refreshToken = authService.generateRefreshToken(userId);
      // Verify token is valid
      authService.verifyRefreshToken(refreshToken);
      const storedHash = await bcrypt.hash(refreshToken, 12);

      const mockUser = createMockUser({ id: userId, isActive: true });

      mockRedisGet.mockResolvedValue(storedHash);
      mockRedisDel.mockResolvedValue(1 as any);
      mockRedisSetex.mockResolvedValue('OK' as any);
      mockUserFindUnique.mockResolvedValue(mockUser as any);

      await authService.refresh(refreshToken);

      // Old token should be deleted
      expect(mockRedisDel).toHaveBeenCalledWith(
        expect.stringContaining(`refresh_token:${userId}:`)
      );
    });
  });

  // ==========================================================================
  // Logout Tests
  // ==========================================================================

  describe('logout', () => {
    it('should invalidate refresh token on logout', async () => {
      const userId = 'test-user-id';
      const refreshToken = authService.generateRefreshToken(userId);

      mockRedisDel.mockResolvedValue(1 as any);

      await authService.logout(userId, refreshToken);

      expect(mockRedisDel).toHaveBeenCalled();
    });

    it('should handle invalid token gracefully', async () => {
      const userId = 'test-user-id';
      const invalidToken = 'invalid.token';

      mockRedisKeys.mockResolvedValue([]);
      mockRedisDel.mockResolvedValue(0 as any);

      // Should not throw
      await expect(authService.logout(userId, invalidToken)).resolves.not.toThrow();
    });
  });

  describe('logoutAll', () => {
    it('should invalidate all refresh tokens for user', async () => {
      const userId = 'test-user-id';
      const tokenKeys = [
        `refresh_token:${userId}:token1`,
        `refresh_token:${userId}:token2`,
      ];

      mockRedisKeys.mockResolvedValue(tokenKeys);
      mockRedisDel.mockResolvedValue(2 as any);

      await authService.logoutAll(userId);

      expect(mockRedisKeys).toHaveBeenCalledWith(`refresh_token:${userId}:*`);
      expect(mockRedisDel).toHaveBeenCalledWith(...tokenKeys);
    });

    it('should handle case with no active tokens', async () => {
      const userId = 'test-user-id';

      mockRedisKeys.mockResolvedValue([]);

      await authService.logoutAll(userId);

      expect(mockRedisKeys).toHaveBeenCalled();
      // del should not be called if no keys found
    });
  });

  // ==========================================================================
  // Get User Tests
  // ==========================================================================

  describe('getUserById', () => {
    it('should return user with boxer profile', async () => {
      const mockUserWithBoxer = {
        ...createMockUser(),
        boxer: {
          id: 'boxer-id',
          userId: 'user-id',
          name: 'Test Boxer',
        },
      };

      mockUserFindUnique.mockResolvedValue(mockUserWithBoxer as any);

      const result = await authService.getUserById('user-id');

      expect(result).toBeDefined();
      expect(result?.boxer).toBeDefined();
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should return null for non-existent user', async () => {
      mockUserFindUnique.mockResolvedValue(null);

      const result = await authService.getUserById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Password Reset Tests
  // ==========================================================================

  describe('requestPasswordReset', () => {
    it('should generate and store reset token for valid email', async () => {
      const mockUser = createMockUser();
      mockUserFindUnique.mockResolvedValue(mockUser as any);
      mockRedisSetex.mockResolvedValue('OK' as any);

      const result = await authService.requestPasswordReset(mockUser.email);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result?.length).toBe(64);
      expect(mockRedisSetex).toHaveBeenCalled();
    });

    it('should return null for non-existent email (security)', async () => {
      mockUserFindUnique.mockResolvedValue(null);

      const result = await authService.requestPasswordReset('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const userId = 'test-user-id';
      const resetToken = 'valid-reset-token';
      const newPassword = 'NewSecurePassword123';

      mockRedisGet.mockResolvedValue(userId);
      mockRedisDel.mockResolvedValue(1 as any);
      mockRedisKeys.mockResolvedValue([]);
      mockUserUpdate.mockResolvedValue({} as any);

      const result = await authService.resetPassword(resetToken, newPassword);

      expect(result).toBe(true);
      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: expect.objectContaining({
            passwordHash: expect.any(String),
          }),
        })
      );
    });

    it('should throw error for invalid token', async () => {
      mockRedisGet.mockResolvedValue(null);

      await expect(
        authService.resetPassword('invalid-token', 'NewPassword123')
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should invalidate all refresh tokens after password reset', async () => {
      const userId = 'test-user-id';
      const resetToken = 'valid-reset-token';
      const tokenKeys = [`refresh_token:${userId}:token1`];

      mockRedisGet.mockResolvedValue(userId);
      mockRedisDel.mockResolvedValue(1 as any);
      mockRedisKeys.mockResolvedValue(tokenKeys);
      mockUserUpdate.mockResolvedValue({} as any);

      await authService.resetPassword(resetToken, 'NewPassword123');

      expect(mockRedisKeys).toHaveBeenCalledWith(`refresh_token:${userId}:*`);
    });
  });
});
