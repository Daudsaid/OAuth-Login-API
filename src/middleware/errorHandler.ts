import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

/**
 * Custom application error class with status code and error code
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Common error types for convenience
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: Record<string, unknown>) {
    super(message, 400, 'BAD_REQUEST', true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED', true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN', true);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND', true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT', true);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: Record<string, unknown>) {
    super(message, 422, 'VALIDATION_ERROR', true, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE', true);
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: Record<string, unknown>;
    stack?: string;
    timestamp: string;
    path: string;
    method: string;
  };
}

/**
 * Log error with structured format
 */
function logError(err: Error | AppError, req: Request): void {
  const errorLog = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: err.message,
    code: err instanceof AppError ? err.code : 'UNKNOWN_ERROR',
    statusCode: err instanceof AppError ? err.statusCode : 500,
    isOperational: err instanceof AppError ? err.isOperational : false,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    stack: err.stack,
  };

  // In production, you might want to send this to a logging service
  console.error(JSON.stringify(errorLog, null, 2));
}

/**
 * Determine if error is a known operational error
 */
function isOperationalError(err: Error): boolean {
  if (err instanceof AppError) {
    return err.isOperational;
  }
  return false;
}

/**
 * Handle specific error types and convert to AppError
 */
function normalizeError(err: Error): AppError {
  // Already an AppError
  if (err instanceof AppError) {
    return err;
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && 'body' in err) {
    return new BadRequestError('Invalid JSON in request body');
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return new UnauthorizedError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return new UnauthorizedError('Token expired');
  }

  // Handle database errors (PostgreSQL)
  if ('code' in err) {
    const pgError = err as Error & { code: string };

    // Unique constraint violation
    if (pgError.code === '23505') {
      return new ConflictError('Resource already exists');
    }

    // Foreign key violation
    if (pgError.code === '23503') {
      return new BadRequestError('Referenced resource does not exist');
    }

    // Connection errors
    if (pgError.code === 'ECONNREFUSED' || pgError.code === 'ENOTFOUND') {
      return new ServiceUnavailableError('Database connection failed');
    }
  }

  // Handle network/fetch errors
  if (err.name === 'FetchError' || err.message.includes('ECONNREFUSED')) {
    return new ServiceUnavailableError('External service unavailable');
  }

  // Default: return as internal server error
  return new AppError(
    config.isProduction ? 'Internal server error' : err.message,
    500,
    'INTERNAL_ERROR',
    false
  );
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Normalize the error
  const appError = normalizeError(err);

  // Log the error
  logError(err, req);

  // Build error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
    },
  };

  // Include details if available
  if (appError.details) {
    errorResponse.error.details = appError.details;
  }

  // Include stack trace in development
  if (!config.isProduction && err.stack) {
    errorResponse.error.stack = err.stack;
  }

  // Send response
  res.status(appError.statusCode).json(errorResponse);

  // For non-operational errors in production, you might want to:
  // 1. Send alert to monitoring service
  // 2. Potentially restart the process for critical errors
  if (!isOperationalError(err) && config.isProduction) {
    console.error('CRITICAL: Non-operational error occurred. Consider investigation.');
    // process.exit(1); // Uncomment if you want to crash on unexpected errors
  }
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  next(new NotFoundError(`Cannot ${req.method} ${req.path}`));
}

/**
 * Async handler wrapper to catch async errors
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Handle uncaught exceptions
 */
export function setupUncaughtExceptionHandler(): void {
  process.on('uncaughtException', (err: Error) => {
    console.error('UNCAUGHT EXCEPTION! Shutting down...');
    console.error(err.name, err.message);
    console.error(err.stack);
    process.exit(1);
  });
}

/**
 * Handle unhandled promise rejections
 */
export function setupUnhandledRejectionHandler(): void {
  process.on('unhandledRejection', (reason: unknown) => {
    console.error('UNHANDLED REJECTION! Shutting down...');
    console.error(reason);
    process.exit(1);
  });
}
