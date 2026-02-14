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

  // Root endpoint - Landing page
  app.get('/', (_req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OAuth Login API - Daud Abdi</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 50px auto;
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    h1 { color: #2563eb; margin-bottom: 10px; font-size: 2.5em; }
    .author { color: #64748b; margin-bottom: 30px; font-size: 1.1em; }
    .status {
      display: inline-block;
      background: #dcfce7;
      color: #166534;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
    }
    .description { color: #475569; line-height: 1.6; margin-bottom: 30px; }
    .buttons { display: flex; gap: 15px; margin: 30px 0; flex-wrap: wrap; }
    .button {
      display: inline-block;
      background: #2563eb;
      color: white;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      border: none;
      transition: all 0.3s;
    }
    .button:hover {
      background: #1d4ed8;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(37,99,235,0.3);
    }
    .button.github { background: #24292e; }
    .button.github:hover { background: #1a1e22; }
    h2 { color: #1e293b; margin-top: 40px; margin-bottom: 15px; font-size: 1.5em; }
    .endpoint {
      background: #f8fafc;
      padding: 12px 15px;
      margin: 10px 0;
      border-left: 4px solid #2563eb;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      border-radius: 4px;
    }
    .tech {
      display: inline-block;
      background: #e0e7ff;
      color: #3730a3;
      padding: 6px 14px;
      border-radius: 6px;
      margin: 5px 5px 5px 0;
      font-size: 14px;
      font-weight: 500;
    }
    .links { margin-top: 30px; padding-top: 30px; border-top: 1px solid #e2e8f0; }
    .links a {
      color: #2563eb;
      text-decoration: none;
      font-weight: 500;
      margin-right: 20px;
    }
    .links a:hover { text-decoration: underline; }
    .footer {
      color: #94a3b8;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
  <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
    <img src="https://avatars.githubusercontent.com/u/135445557" alt="Daud Abdi" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #2563eb; box-shadow: 0 2px 8px rgba(37,99,235,0.2);">
    <div>
      <h1 style="margin: 0;">🔐 OAuth Login API</h1>
      <p class="author" style="margin: 5px 0 0 0;">
        Built by <strong>Daud Abdi</strong> • 
        <span class="status">🟢 Live</span>
      </p>
    </div>
  </div>
    
    <p class="description">
      Production-ready OAuth 2.0 authentication with Google and GitHub integration. 
      Features secure session management, CSRF protection, and comprehensive security best practices. 
      Deployed on AWS (EC2 + RDS PostgreSQL).
    </p>
    
    <div class="buttons">
      <form action="/auth/google/start" method="GET" style="display:inline;">
        <button type="submit" class="button">🔐 Login with Google</button>
      </form>
      <form action="/auth/github/start" method="GET" style="display:inline;">
        <button type="submit" class="button github">🔐 Login with GitHub</button>
      </form>
    </div>
    
    <h2>📡 API Endpoints</h2>
    <div class="endpoint">GET /auth/google/start</div>
    <div class="endpoint">GET /auth/google/callback</div>
    <div class="endpoint">GET /auth/github/start</div>
    <div class="endpoint">GET /auth/github/callback</div>
    <div class="endpoint">GET /auth/me</div>
    <div class="endpoint">POST /auth/logout</div>
    
    <h2>🛠️ Tech Stack</h2>
    <div>
      <span class="tech">Node.js</span>
      <span class="tech">TypeScript</span>
      <span class="tech">Express</span>
      <span class="tech">PostgreSQL</span>
      <span class="tech">OAuth 2.0</span>
      <span class="tech">AWS EC2</span>
      <span class="tech">AWS RDS</span>
      <span class="tech">PM2</span>
    </div>
    
    <div class="links">
      <a href="https://github.com/Daudsaid/OAuth-Login-API" target="_blank">📂 GitHub</a>
      <a href="https://linkedin.com/in/daudabdi0506" target="_blank">💼 LinkedIn</a>
      <a href="https://daud-abdi-portfolio-site.vercel.app" target="_blank">🌐 Portfolio</a>
      <a href="mailto:daudsaidabdi@gmail.com">📧 Email</a>
    </div>
    
    <div class="footer">
      <p>Deployed on AWS (EC2 + RDS) • 24/7 uptime with PM2</p>
      <p>38 passing tests • SHA-256 session hashing • CSRF protection</p>
    </div>
  </div>
</body>
</html>
    `);
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