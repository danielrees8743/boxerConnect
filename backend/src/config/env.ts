// Environment Configuration with Zod Validation
// Ensures all required environment variables are present and correctly typed

import path from 'path';
import { z } from 'zod';
import type { EnvironmentConfig } from '../types';

// Define the environment schema
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),

  // Database Configuration
  DATABASE_URL: z.string().url().min(1, 'DATABASE_URL is required'),

  // Redis Configuration
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().positive().default(100),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Logging
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),

  // Storage - must be an absolute path if provided
  UPLOAD_PATH: z
    .string()
    .optional()
    .refine(
      (p) => !p || path.isAbsolute(p),
      { message: 'UPLOAD_PATH must be an absolute path' }
    ),
});

// Parse and validate environment variables
function validateEnv(): EnvironmentConfig {
  // Load dotenv in development
  if (process.env['NODE_ENV'] !== 'production') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('dotenv').config();
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment variables:');
    console.error(parsed.error.format());
    throw new Error('Invalid environment configuration. Check the errors above.');
  }

  return parsed.data;
}

// Export validated environment configuration
export const env: EnvironmentConfig = validateEnv();

// Export individual config sections for convenience
export const serverConfig = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  host: env.HOST,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
} as const;

export const databaseConfig = {
  url: env.DATABASE_URL,
} as const;

export const redisConfig = {
  url: env.REDIS_URL,
} as const;

export const jwtConfig = {
  secret: env.JWT_SECRET,
  expiresIn: env.JWT_EXPIRES_IN,
  refreshSecret: env.JWT_REFRESH_SECRET,
  refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
} as const;

export const rateLimitConfig = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
} as const;

export const corsConfig = {
  origin: env.CORS_ORIGIN,
} as const;

export const loggingConfig = {
  level: env.LOG_LEVEL,
} as const;

export const storageEnvConfig = {
  uploadPath: env.UPLOAD_PATH,
} as const;
