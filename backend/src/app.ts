// Express Application Configuration
// Sets up middleware, routes, and error handling

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { corsConfig, serverConfig, checkDatabaseHealth, checkRedisHealth } from './config';
import { errorHandler, notFoundHandler, standardLimiter } from './middleware';
import { sendSuccess } from './utils';
import routes from './routes';
import type { HealthCheckResult } from './types';

// Create Express application
const app: Application = express();

// ============================================================================
// Security Middleware
// ============================================================================

// Helmet security headers
app.use(
  helmet({
    contentSecurityPolicy: serverConfig.isProduction,
    crossOriginEmbedderPolicy: serverConfig.isProduction,
  })
);

// CORS configuration
app.use(
  cors({
    origin: corsConfig.origin.split(',').map((origin) => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// ============================================================================
// Request Parsing Middleware
// ============================================================================

// JSON body parser with size limit
app.use(express.json({ limit: '10mb' }));

// URL-encoded body parser
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// Rate Limiting
// ============================================================================

// Apply standard rate limiting to all routes
app.use(standardLimiter);

// ============================================================================
// Request Logging (Development)
// ============================================================================

if (serverConfig.isDevelopment) {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`, {
      query: req.query,
      body: req.method !== 'GET' ? req.body : undefined,
    });
    next();
  });
}

// ============================================================================
// Health Check Endpoints
// ============================================================================

// Basic health check - for load balancer/kubernetes probes
app.get('/health', (_req: Request, res: Response) => {
  return sendSuccess(res, { status: 'ok' }, 'Service is healthy');
});

// Detailed health check - includes service dependencies
app.get('/health/detailed', async (_req: Request, res: Response) => {
  const [dbHealth, redisHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
  ]);

  const overallStatus =
    dbHealth.status === 'up' && redisHealth.status === 'up'
      ? 'healthy'
      : dbHealth.status === 'down'
        ? 'unhealthy'
        : 'degraded';

  const healthCheck: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env['npm_package_version'] ?? '1.0.0',
    services: {
      database: dbHealth,
      redis: redisHealth,
    },
  };

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return res.status(statusCode).json({
    success: overallStatus !== 'unhealthy',
    data: healthCheck,
  });
});

// Ready check - indicates if the service is ready to accept traffic
app.get('/ready', async (_req: Request, res: Response) => {
  const dbHealth = await checkDatabaseHealth();

  if (dbHealth.status !== 'up') {
    return res.status(503).json({
      success: false,
      error: 'Service is not ready',
      message: 'Database is not available',
    });
  }

  return sendSuccess(res, { ready: true }, 'Service is ready');
});

// ============================================================================
// API Routes
// ============================================================================

// API version prefix
const API_PREFIX = '/api/v1';

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  return sendSuccess(res, {
    name: 'BoxerConnect API',
    version: '1.0.0',
    documentation: `${API_PREFIX}/docs`,
  });
});

// API info endpoint
app.get(API_PREFIX, (_req: Request, res: Response) => {
  return sendSuccess(res, {
    message: 'BoxerConnect API v1',
    endpoints: {
      health: '/health',
      healthDetailed: '/health/detailed',
      ready: '/ready',
    },
  });
});

// Mount API routes
app.use(API_PREFIX, routes);

// Future route placeholders:
// app.use(`${API_PREFIX}/users`, userRoutes);
// app.use(`${API_PREFIX}/boxers`, boxerRoutes);
// app.use(`${API_PREFIX}/matches`, matchRoutes);
// app.use(`${API_PREFIX}/availability`, availabilityRoutes);

// ============================================================================
// Error Handling
// ============================================================================

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export { app };
export default app;
