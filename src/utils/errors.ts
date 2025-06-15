// Base API Error class
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation Error
export class ValidationError extends ApiError {
  constructor(message: string, _details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

// Authentication Error
export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

// Authorization Error
export class AuthorizationError extends ApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

// Not Found Error
export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}

// Rate Limit Error
export class RateLimitError extends ApiError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

// Trading specific errors
export class InsufficientBalanceError extends ApiError {
  constructor(message: string = 'Insufficient balance') {
    super(message, 400, 'INSUFFICIENT_BALANCE');
    this.name = 'InsufficientBalanceError';
  }
}

export class OrderError extends ApiError {
  constructor(message: string, originalError?: Error) {
    super(message, 400, 'ORDER_ERROR');
    this.name = 'OrderError';
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

export class WebSocketError extends ApiError {
  constructor(message: string) {
    super(message, 500, 'WEBSOCKET_ERROR');
    this.name = 'WebSocketError';
  }
}

export class ExternalApiError extends ApiError {
  constructor(message: string, service: string) {
    super(`${service}: ${message}`, 502, 'EXTERNAL_API_ERROR');
    this.name = 'ExternalApiError';
  }
} 