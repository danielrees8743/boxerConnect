// Authentication Service
// Handles all authentication-related business logic

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { UserRole } from '@prisma/client';
import { prisma, jwtConfig } from '../config';
import type { RegisterInput } from '../validators';
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
// Token Storage (Phase 4: Database Exclusive)
// ============================================================================

/**
 * Store refresh token in Database
 */
async function storeRefreshToken(
  userId: string,
  tokenId: string,
  token: string
): Promise<void> {
  const tokenHash = await hashPassword(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenId,
      tokenHash,
      expiresAt,
    },
  });
}

/**
 * Validate refresh token in Database
 */
async function validateRefreshTokenInDatabase(
  userId: string,
  tokenId: string,
  token: string
): Promise<boolean> {
  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      userId_tokenId: { userId, tokenId },
    },
  });

  if (!storedToken) {
    return false;
  }

  // Check expiration
  if (storedToken.expiresAt < new Date()) {
    // Lazy cleanup of expired token
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    return false;
  }

  // Validate token hash
  return bcrypt.compare(token, storedToken.tokenHash);
}

/**
 * Invalidate a specific refresh token from Database
 */
async function invalidateRefreshToken(
  userId: string,
  tokenId: string
): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { userId, tokenId },
  });
}

/**
 * Invalidate all refresh tokens for a user from Database
 */
async function invalidateAllUserRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });
}

/**
 * Store password reset token in Database
 */
async function storePasswordResetToken(
  userId: string,
  token: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_SECONDS * 1000);

  // Clean up old unused tokens first (security best practice)
  await prisma.passwordResetToken.deleteMany({
    where: { userId, usedAt: null },
  });

  await prisma.passwordResetToken.create({
    data: { userId, token, expiresAt },
  });
}

/**
 * Validate and consume password reset token from Database
 */
async function validatePasswordResetToken(
  token: string
): Promise<string | null> {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken) {
    return null;
  }

  // Check expiration
  if (resetToken.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
    return null;
  }

  // Check if already used
  if (resetToken.usedAt !== null) {
    return null;
  }

  // Mark as used (audit trail)
  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { usedAt: new Date() },
  });

  return resetToken.userId;
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
 * Returns user and tokens for immediate login
 */
export async function register(data: RegisterInput): Promise<AuthResult> {
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

  // Generate tokens for immediate login
  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);

  // Decode refresh token to get tokenId and store it
  const refreshPayload = verifyRefreshToken(refreshToken);
  if (refreshPayload.tokenId) {
    await storeRefreshToken(user.id, refreshPayload.tokenId, refreshToken);
  }

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
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

  // Validate token exists in Database
  if (payload.tokenId) {
    const isValid = await validateRefreshTokenInDatabase(
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
