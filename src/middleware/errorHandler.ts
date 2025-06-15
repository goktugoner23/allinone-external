import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: number;
}

// Error handling middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error details
  console.error('Express error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Handle known API errors
  if (error instanceof ApiError) {
    const response: ApiResponse = {
      success: false,
      error: error.message,
      code: error.code,
      timestamp: Date.now()
    };

    res.status(error.statusCode).json(response);
    return;
  }

  // Handle validation errors (from Joi or similar)
  if (error.name === 'ValidationError') {
    const response: ApiResponse = {
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      timestamp: Date.now()
    };

    res.status(400).json(response);
    return;
  }

  // Handle JSON parsing errors
  if (error instanceof SyntaxError && 'body' in error) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid JSON format',
      code: 'INVALID_JSON',
      timestamp: Date.now()
    };

    res.status(400).json(response);
    return;
  }

  // Handle unknown errors
  const response: ApiResponse = {
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    code: 'INTERNAL_ERROR',
    timestamp: Date.now()
  };

  res.status(500).json(response);
};

// Async handler wrapper
export const asyncHandler = (fn: Function) => (req: Request, res: Response, _next: NextFunction) => {
  Promise.resolve(fn(req, res, _next)).catch(_next);
};

// Not found handler
export const notFoundHandler = (req: Request, res: Response): void => {
  const response: ApiResponse = {
    success: false,
    error: `Route ${req.originalUrl} not found`,
    code: 'NOT_FOUND',
    timestamp: Date.now()
  };

  res.status(404).json(response);
}; 