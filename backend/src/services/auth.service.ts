// Authentication Service
// Handles all authentication-related business logic

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { UserRole } from '@prisma/client';
import { prisma, jwtConfig, redis } from '../config';
import type { RegisterInput, LoginInput } from '../validators';
import type { SafeUser, UserWithBoxer } from '../types';

// ============================================================================
// Constants
// ============================================================================

const BCRYPT_COST = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds
const PASSWORD_RESET_EXPIRY_SECONDS = 60 * 60; // 1 hour in seconds

// ============================================================================
// Types
// ============================================================================

export interface TokenPayload {
  userId: string;
  role: UserRole;
  tokenId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

// ============================================================================
// Password Utilities
// ============================================================================

/**
 * Hash a password using bcrypt with cost factor 12
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

/**
 * Compare a plain password with a hashed password
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================================================
// Token Utilities
// ============================================================================

/**
 * Generate an access token (short-lived, 15 minutes)
 */
export function generateAccessToken(userId: string, role: UserRole): string {
  const payload: TokenPayload = { userId, role };
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Generate a refresh token (long-lived, 7 days)
 * Includes a unique tokenId for token invalidation
 */
export function generateRefreshToken(userId: string): string {
  const tokenId = uuidv4();
  const payload: TokenPayload = { userId, role: UserRole.BOXER, tokenId };
  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  });
}

/**
 * Verify an access token
 */
export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, jwtConfig.secret) as TokenPayload;
  return decoded;
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, jwtConfig.refreshSecret) as TokenPayload;
  return decoded;
}

/**
 * Generate a secure password reset token
 */
export function generatePasswordResetToken(): string {
  return randomBytes(32).toString('hex');
}

// ============================================================================
// Redis Token Storage
// ============================================================================

/**
 * Store refresh token in Redis
 * Key format: refresh_token:{userId}:{tokenId}
 */
async function storeRefreshToken(
  userId: string,
  tokenId: string,
  token: string
): Promise<void> {
  const key = `refresh_token:${userId}:${tokenId}`;
  // Store a hash of the token for security
  const tokenHash = await hashPassword(token);
  await redis.setex(key, REFRESH_TOKEN_EXPIRY_SECONDS, tokenHash);
}

/**
 * Validate refresh token exists in Redis
 */
async function validateRefreshTokenInRedis(
  userId: string,
  tokenId: string,
  token: string
): Promise<boolean> {
  const key = `refresh_token:${userId}:${tokenId}`;
  const storedHash = await redis.get(key);
  if (!storedHash) {
    return false;
  }
  // Compare the provided token with the stored hash
  return bcrypt.compare(token, storedHash);
}

/**
 * Invalidate a specific refresh token
 */
async function invalidateRefreshToken(
  userId: string,
  tokenId: string
): Promise<void> {
  const key = `refresh_token:${userId}:${tokenId}`;
  await redis.del(key);
}

/**
 * Invalidate all refresh tokens for a user
 */
async function invalidateAllUserRefreshTokens(userId: string): Promise<void> {
  const pattern = `refresh_token:${userId}:*`;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

/**
 * Store password reset token in Redis
 */
async function storePasswordResetToken(
  userId: string,
  token: string
): Promise<void> {
  const key = `password_reset:${token}`;
  await redis.setex(key, PASSWORD_RESET_EXPIRY_SECONDS, userId);
}

/**
 * Validate and consume password reset token
 */
async function validatePasswordResetToken(
  token: string
): Promise<string | null> {
  const key = `password_reset:${token}`;
  const userId = await redis.get(key);
  if (userId) {
    // Delete the token after use
    await redis.del(key);
  }
  return userId;
}

// ============================================================================
// User Utilities
// ============================================================================

/**
 * Remove sensitive fields from user object
 */
function sanitizeUser(user: {
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
}): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

// ============================================================================
// Authentication Methods
// ============================================================================

/**
 * Register a new user
 * Creates user and boxer profile if role is BOXER
 */
export async function register(data: RegisterInput): Promise<SafeUser> {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(data.password);

  // Create user with transaction
  const user = await prisma.$transaction(async (tx) => {
    // Create user
    const newUser = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        role: data.role,
      },
    });

    // If role is BOXER, create boxer profile
    if (data.role === UserRole.BOXER) {
      await tx.boxer.create({
        data: {
          userId: newUser.id,
          name: data.name,
        },
      });
    }

    return newUser;
  });

  return sanitizeUser(user);
}

/**
 * Login a user
 * Returns user, access token, and refresh token
 */
export async function login(
  email: string,
  password: string
): Promise<AuthResult> {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  // Verify password
  const isValidPassword = await comparePassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);

  // Decode refresh token to get tokenId
  const refreshPayload = verifyRefreshToken(refreshToken);
  if (refreshPayload.tokenId) {
    await storeRefreshToken(user.id, refreshPayload.tokenId, refreshToken);
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
}

/**
 * Refresh access token using refresh token
 * Returns new access token and rotated refresh token
 */
export async function refresh(refreshToken: string): Promise<AuthTokens> {
  // Verify the refresh token
  let payload: TokenPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new Error('Invalid refresh token');
  }

  // Validate token exists in Redis
  if (payload.tokenId) {
    const isValid = await validateRefreshTokenInRedis(
      payload.userId,
      payload.tokenId,
      refreshToken
    );
    if (!isValid) {
      throw new Error('Refresh token has been revoked');
    }

    // Invalidate old token
    await invalidateRefreshToken(payload.userId, payload.tokenId);
  }

  // Get user to ensure they still exist and are active
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user || !user.isActive) {
    throw new Error('User not found or inactive');
  }

  // Generate new tokens
  const newAccessToken = generateAccessToken(user.id, user.role);
  const newRefreshToken = generateRefreshToken(user.id);

  // Store new refresh token
  const newPayload = verifyRefreshToken(newRefreshToken);
  if (newPayload.tokenId) {
    await storeRefreshToken(user.id, newPayload.tokenId, newRefreshToken);
  }

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

/**
 * Logout a user
 * Invalidates the specified refresh token
 */
export async function logout(
  userId: string,
  refreshToken: string
): Promise<void> {
  try {
    const payload = verifyRefreshToken(refreshToken);
    if (payload.tokenId) {
      await invalidateRefreshToken(userId, payload.tokenId);
    }
  } catch {
    // Token might be invalid, but we still want to complete logout
    // Just invalidate all tokens for the user as a safety measure
    await invalidateAllUserRefreshTokens(userId);
  }
}

/**
 * Logout from all devices
 * Invalidates all refresh tokens for a user
 */
export async function logoutAll(userId: string): Promise<void> {
  await invalidateAllUserRefreshTokens(userId);
}

/**
 * Get user by ID
 * Returns user without password hash
 */
export async function getUserById(userId: string): Promise<UserWithBoxer | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { boxer: true },
  });

  if (!user) {
    return null;
  }

  return {
    ...sanitizeUser(user),
    boxer: user.boxer,
  };
}

/**
 * Request password reset
 * Generates and stores password reset token
 */
export async function requestPasswordReset(email: string): Promise<string | null> {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Don't reveal if user exists
    return null;
  }

  // Generate reset token
  const resetToken = generatePasswordResetToken();

  // Store in Redis
  await storePasswordResetToken(user.id, resetToken);

  return resetToken;
}

/**
 * Reset password using token
 * Validates token and updates password
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<boolean> {
  // Validate and consume token
  const userId = await validatePasswordResetToken(token);
  if (!userId) {
    throw new Error('Invalid or expired reset token');
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Invalidate all existing refresh tokens for security
  await invalidateAllUserRefreshTokens(userId);

  return true;
}

// Export all functions and types
export default {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generatePasswordResetToken,
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getUserById,
  requestPasswordReset,
  resetPassword,
};
