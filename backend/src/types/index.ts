// BoxerConnect Backend Type Definitions

import { Request } from 'express';
import { User, Boxer, UserRole } from '@prisma/client';

// ============================================================================
// Authentication Types
// ============================================================================

export interface TokenPayload {
  userId: string;
  role: UserRole;
  tokenId?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Request with optional user authentication
 * User is attached by authenticate or optionalAuth middleware
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Request with guaranteed user authentication
 * Use this type when the route is protected by authenticate middleware
 */
export interface AuthenticatedUserRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: ValidationError[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

// ============================================================================
// Query Parameter Types
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface BoxerSearchParams extends PaginationParams {
  city?: string;
  country?: string;
  experienceLevel?: string;
  minWeight?: number;
  maxWeight?: number;
  isVerified?: boolean;
}

export interface MatchRequestSearchParams extends PaginationParams {
  status?: string;
}

// ============================================================================
// Service Response Types
// ============================================================================

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

// ============================================================================
// User Types (without sensitive data)
// ============================================================================

export type SafeUser = Omit<User, 'passwordHash'>;

export interface UserWithBoxer extends SafeUser {
  boxer: Boxer | null;
}

// ============================================================================
// Environment Types
// ============================================================================

export interface EnvironmentConfig {
  // Server
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  HOST: string;

  // Database
  DATABASE_URL: string;

  // Redis
  REDIS_URL: string;

  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  // CORS
  CORS_ORIGIN: string;

  // Logging
  LOG_LEVEL: string;

  // Storage
  UPLOAD_PATH?: string | undefined;
  STORAGE_PROVIDER: 'local' | 'supabase' | 's3';

  // Supabase
  SUPABASE_URL?: string | undefined;
  SUPABASE_ANON_KEY?: string | undefined;
  SUPABASE_SERVICE_ROLE_KEY?: string | undefined;
  SUPABASE_DATABASE_URL?: string | undefined;
}

// ============================================================================
// Rate Limiter Types
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: ServiceHealthStatus;
    redis: ServiceHealthStatus;
  };
}

export interface ServiceHealthStatus {
  status: 'up' | 'down' | 'unknown';
  latency?: number;
  error?: string;
}
