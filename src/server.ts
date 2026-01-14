import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config, validateConfig } from './config';
import { testDatabaseConnection, closeDatabaseConnection } from './db';
import authRoutes from './auth/routes';
import {
  errorHandler,
  notFoundHandler,
  setupUncaughtExceptionHandler,
  setupUnhandledRejectionHandler,
} from './middleware/errorHandler';

/**
 * Initialize and configure Express application
 */
function createApp(): express.Application {
  const app = express();

  // Security middleware - sets various HTTP headers
  app.use(helmet());

  // Parse JSON request bodies
  app.use(express.json());

  // Parse URL-encoded request bodies
  app.use(express.urlencoded({ extended: true }));

  // Parse cookies
  app.use(cookieParser(config.session.cookieSecret));

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount authentication routes
  app.use('/auth', authRoutes);

  // 404 handler - passes to error handler
  app.use(notFoundHandler);

  // Global error handler - must be last middleware
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  // Setup global error handlers for uncaught exceptions and rejections
  setupUncaughtExceptionHandler();
  setupUnhandledRejectionHandler();

  try {
    // Validate configuration first
    console.log('Validating configuration...');
    validateConfig();

    // Test database connection
    console.log('Testing database connection...');
    await testDatabaseConnection();

    // Create Express app
    const app = createApp();

    // Start listening
    const server = app.listen(config.port, () => {
      console.log(`
========================================
🚀 OAuth Login API Server
========================================
Environment: ${config.nodeEnv}
Port: ${config.port}
URL: http://localhost:${config.port}
========================================
Endpoints:
  GET  /health
  GET  /auth/google/start
  GET  /auth/google/callback
  GET  /auth/github/start
  GET  /auth/github/callback
  GET  /auth/me
  POST /auth/logout
========================================
      `);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        console.log('HTTP server closed');

        try {
          await closeDatabaseConnection();
          console.log('✓ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
