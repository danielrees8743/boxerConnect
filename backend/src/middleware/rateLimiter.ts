// Rate Limiting Middleware
// Protects API endpoints from abuse and DDoS attacks

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { rateLimitConfig, serverConfig } from '../config/env';
import type { ApiResponse } from '../types';

// Check environment - disable/relax rate limiting in development
const isDev = serverConfig.isDevelopment;

// Default rate limit message
const rateLimitResponse: ApiResponse = {
  success: false,
  error: 'Too many requests. Please try again later.',
};

// Standard API rate limiter - very permissive in development
export const standardLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: rateLimitConfig.windowMs,
  max: isDev ? 10000 : rateLimitConfig.maxRequests,
  message: rateLimitResponse,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// Strict rate limiter for sensitive endpoints - relaxed in development
export const strictLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 10,
  message: {
    success: false,
    error: 'Too many attempts. Please try again in 15 minutes.',
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth rate limiter - effectively disabled in development
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: isDev ? 60 * 1000 : 60 * 60 * 1000, // 1 min in dev, 1 hour in prod
  max: isDev ? 1000 : 5, // 1000 in dev, 5 in prod
  message: {
    success: false,
    error: 'Too many login attempts. Please try again later.',
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
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
