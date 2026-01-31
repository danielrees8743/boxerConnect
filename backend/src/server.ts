// BoxerConnect API Server Entry Point
// Initializes connections and starts the Express server

import { app } from './app';
import { serverConfig, connectDatabase, disconnectDatabase, connectRedis, disconnectRedis } from './config';

// Server instance for graceful shutdown
let server: ReturnType<typeof app.listen> | null = null;

/**
 * Start the server and establish connections
 */
async function startServer(): Promise<void> {
  try {
    console.log('Starting BoxerConnect API Server...');
    console.log(`Environment: ${serverConfig.nodeEnv}`);

    // Connect to database
    await connectDatabase();

    // Connect to Redis (non-blocking - app can run in degraded mode)
    await connectRedis();

    // Start Express server
    server = app.listen(serverConfig.port, serverConfig.host, () => {
      console.log('========================================');
      console.log('BoxerConnect API Server');
      console.log('========================================');
      console.log(`Server running at http://${serverConfig.host}:${serverConfig.port}`);
      console.log(`Environment: ${serverConfig.nodeEnv}`);
      console.log(`Health check: http://${serverConfig.host}:${serverConfig.port}/health`);
      console.log('========================================');
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${serverConfig.port} is already in use`);
        process.exit(1);
      }
      throw error;
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Gracefully shutdown the server
 */
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  if (server) {
    await new Promise<void>((resolve) => {
      server!.close(() => {
        console.log('HTTP server closed');
        resolve();
      });
    });
  }

  // Close database connection
  await disconnectDatabase();

  // Close Redis connection
  await disconnectRedis();

  console.log('Graceful shutdown complete');
  process.exit(0);
}

// ============================================================================
// Signal Handlers for Graceful Shutdown
// ============================================================================

// Handle SIGTERM (Docker, Kubernetes)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit for unhandled rejections in development
  if (serverConfig.isProduction) {
    gracefulShutdown('unhandledRejection');
  }
});

// ============================================================================
// Start Server
// ============================================================================

startServer();
