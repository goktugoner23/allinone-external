"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalApiError = exports.WebSocketError = exports.OrderError = exports.InsufficientBalanceError = exports.RateLimitError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.ApiError = void 0;
// Base API Error class
class ApiError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        // Maintains proper stack trace for where our error was thrown
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ApiError = ApiError;
// Validation Error
class ValidationError extends ApiError {
    constructor(message, _details) {
        super(message, 400, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
// Authentication Error
class AuthenticationError extends ApiError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
// Authorization Error
class AuthorizationError extends ApiError {
    constructor(message = 'Insufficient permissions') {
        super(message, 403, 'AUTHORIZATION_ERROR');
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
// Not Found Error
class NotFoundError extends ApiError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'NOT_FOUND_ERROR');
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
// Rate Limit Error
class RateLimitError extends ApiError {
    constructor(message = 'Rate limit exceeded') {
        super(message, 429, 'RATE_LIMIT_ERROR');
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
// Trading specific errors
class InsufficientBalanceError extends ApiError {
    constructor(message = 'Insufficient balance') {
        super(message, 400, 'INSUFFICIENT_BALANCE');
        this.name = 'InsufficientBalanceError';
    }
}
exports.InsufficientBalanceError = InsufficientBalanceError;
class OrderError extends ApiError {
    constructor(message, originalError) {
        super(message, 400, 'ORDER_ERROR');
        this.name = 'OrderError';
        if (originalError) {
            this.stack = originalError.stack;
        }
    }
}
exports.OrderError = OrderError;
class WebSocketError extends ApiError {
    constructor(message) {
        super(message, 500, 'WEBSOCKET_ERROR');
        this.name = 'WebSocketError';
    }
}
exports.WebSocketError = WebSocketError;
class ExternalApiError extends ApiError {
    constructor(message, service) {
        super(`${service}: ${message}`, 502, 'EXTERNAL_API_ERROR');
        this.name = 'ExternalApiError';
    }
}
exports.ExternalApiError = ExternalApiError;
//# sourceMappingURL=errors.js.map