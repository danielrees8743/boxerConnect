// Authentication Routes
// Defines all authentication-related API endpoints

import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  me,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller';
import {
  authenticate,
  authLimiter,
  passwordResetLimiter,
  strictLimiter,
} from '../middleware';

const router = Router();

// ============================================================================
// Public Routes (no authentication required)
// ============================================================================

/**
 * POST /api/v1/auth/register
 * Register a new user account
 * Rate limited by strictLimiter (10 requests per 15 minutes)
 */
router.post('/register', strictLimiter, register);

/**
 * POST /api/v1/auth/login
 * Login with email and password
 * Rate limited by authLimiter (5 failed attempts per hour)
 */
router.post('/login', authLimiter, login);

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 * Rate limited by strictLimiter (10 requests per 15 minutes)
 */
router.post('/refresh', strictLimiter, refresh);

/**
 * POST /api/v1/auth/forgot-password
 * Request password reset email
 * Rate limited by passwordResetLimiter (3 requests per hour)
 */
router.post('/forgot-password', passwordResetLimiter, forgotPassword);

/**
 * POST /api/v1/auth/reset-password
 * Reset password with token from email
 * Rate limited by passwordResetLimiter (3 requests per hour)
 */
router.post('/reset-password', passwordResetLimiter, resetPassword);

// ============================================================================
// Protected Routes (authentication required)
// ============================================================================

/**
 * GET /api/v1/auth/me
 * Get current authenticated user profile
 * Requires valid access token
 */
router.get('/me', authenticate, me);

/**
 * POST /api/v1/auth/logout
 * Logout and invalidate refresh token
 * Requires valid access token
 */
router.post('/logout', authenticate, logout);

export default router;
