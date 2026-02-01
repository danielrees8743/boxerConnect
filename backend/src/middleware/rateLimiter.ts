// Rate Limiting Middleware
// Protects API endpoints from abuse and DDoS attacks

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { rateLimitConfig } from '../config/env';
import type { ApiResponse } from '../types';

// Default rate limit message
const rateLimitResponse: ApiResponse = {
  success: false,
  error: 'Too many requests. Please try again later.',
};

// Standard API rate limiter
export const standardLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: rateLimitConfig.windowMs, // 15 minutes by default
  max: rateLimitConfig.maxRequests, // 100 requests per window by default
  message: rateLimitResponse,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// Strict rate limiter for sensitive endpoints (auth, password reset, etc.)
export const strictLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: {
    success: false,
    error: 'Too many attempts. Please try again in 15 minutes.',
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for login attempts
// More permissive in development, strict in production
const isProduction = process.env.NODE_ENV === 'production';
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: isProduction ? 60 * 60 * 1000 : 15 * 60 * 1000, // 1 hour in prod, 15 min in dev
  max: isProduction ? 5 : 50, // 5 in prod, 50 in dev
  message: {
    success: false,
    error: 'Too many login attempts. Please try again later.',
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Rate limiter for password reset requests
export const passwordResetLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset requests per hour
  message: {
    success: false,
    error: 'Too many password reset attempts. Please try again in 1 hour.',
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for creating resources (match requests, etc.)
export const createResourceLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 creates per hour
  message: {
    success: false,
    error: 'You have reached the limit for creating resources. Please try again later.',
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for search/listing endpoints
export const searchLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 searches per minute
  message: {
    success: false,
    error: 'Too many search requests. Please slow down.',
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
});
