// Global Error Handler Middleware
// Provides consistent error responses and logging

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { serverConfig } from '../config/env';
import type { ApiResponse } from '../types';

// Custom Application Error class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, AppError.prototype);

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error types
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400, true, 'BAD_REQUEST');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, true, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, true, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, true, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, true, 'CONFLICT');
  }
}

export class ValidationError extends AppError {
  public readonly errors: Array<{ field: string; message: string }>;

  constructor(
    message: string = 'Validation failed',
    errors: Array<{ field: string; message: string }> = []
  ) {
    super(message, 422, true, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, true, 'TOO_MANY_REQUESTS');
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, false, 'INTERNAL_SERVER_ERROR');
  }
}

// Format Zod validation errors
function formatZodErrors(
  error: ZodError
): Array<{ field: string; message: string }> {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

// Global error handler middleware
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: serverConfig.isDevelopment ? err.stack : undefined,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const response: ApiResponse = {
      success: false,
      error: 'Validation failed',
      errors: formatZodErrors(err),
    };
    res.status(422).json(response);
    return;
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      error: err.message,
    };

    // Include validation errors if present
    if (err instanceof ValidationError && err.errors.length > 0) {
      response.errors = err.errors;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle JSON syntax errors
  if (err instanceof SyntaxError && 'body' in err) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid JSON payload',
    };
    res.status(400).json(response);
    return;
  }

  // Handle unknown errors
  const response: ApiResponse = {
    success: false,
    error: serverConfig.isDevelopment
      ? err.message
      : 'An unexpected error occurred',
  };

  res.status(500).json(response);
}

// 404 Not Found handler
export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
}
