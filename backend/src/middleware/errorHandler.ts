import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

export class ValidationError extends Error {
  statusCode = 400;
  status = 'fail';
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  status = 'fail';
  isOperational = true;

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  status = 'fail';
  isOperational = true;

  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  status = 'fail';
  isOperational = true;

  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

const handleDatabaseError = (err: any): AppError => {
  let message = 'Database operation failed';
  
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    message = 'Resource already exists';
  } else if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    message = 'Referenced resource does not exist';
  } else if (err.code === 'SQLITE_CONSTRAINT') {
    message = 'Data constraint violation';
  }

  const error = new Error(message) as AppError;
  error.statusCode = 400;
  error.status = 'fail';
  error.isOperational = true;
  
  return error;
};

const handleValidationError = (err: any): AppError => {
  const errors = err.array?.() || [];
  const message = errors.length > 0 
    ? `Validation failed: ${errors.map((e: any) => e.msg).join(', ')}`
    : 'Validation failed';

  const error = new ValidationError(message);
  return error;
};

const sendErrorDev = (err: AppError, res: Response) => {
  res.status(err.statusCode || 500).json({
    status: err.status || 'error',
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err: AppError, res: Response) => {
  // Only send error details for operational, trusted errors
  if (err.isOperational) {
    res.status(err.statusCode || 500).json({
      status: err.status || 'error',
      message: err.message,
    });
  } else {
    // Don't leak error details in production
    logger.error('Unexpected error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
    });
  }
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err } as AppError;
  error.message = err.message;

  // Set default values
  if (!error.statusCode) error.statusCode = 500;
  if (!error.status) error.status = error.statusCode >= 400 && error.statusCode < 500 ? 'fail' : 'error';

  // Handle specific error types
  if (err.code && err.code.startsWith('SQLITE_')) {
    error = handleDatabaseError(err);
  } else if (err.array && typeof err.array === 'function') {
    // Express-validator errors
    error = handleValidationError(err);
  } else if (err.name === 'JsonWebTokenError') {
    error = new UnauthorizedError('Invalid token');
  } else if (err.name === 'TokenExpiredError') {
    error = new UnauthorizedError('Token expired');
  } else if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
    error = new ValidationError('Invalid JSON format');
  }

  // Log error
  if (error.statusCode && error.statusCode >= 500) {
    logger.error('Server Error:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  } else {
    logger.warn('Client Error:', {
      error: error.message,
      url: req.url,
      method: req.method,
      statusCode: error.statusCode,
    });
  }

  // Send response
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
