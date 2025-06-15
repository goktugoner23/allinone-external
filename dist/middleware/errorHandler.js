"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = void 0;
const errors_1 = require("../utils/errors");
// Error handling middleware
const errorHandler = (error, req, res, _next) => {
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
    if (error instanceof errors_1.ApiError) {
        const response = {
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
        const response = {
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
        const response = {
            success: false,
            error: 'Invalid JSON format',
            code: 'INVALID_JSON',
            timestamp: Date.now()
        };
        res.status(400).json(response);
        return;
    }
    // Handle unknown errors
    const response = {
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : error.message,
        code: 'INTERNAL_ERROR',
        timestamp: Date.now()
    };
    res.status(500).json(response);
};
exports.errorHandler = errorHandler;
// Async handler wrapper
const asyncHandler = (fn) => (req, res, _next) => {
    Promise.resolve(fn(req, res, _next)).catch(_next);
};
exports.asyncHandler = asyncHandler;
// Not found handler
const notFoundHandler = (req, res) => {
    const response = {
        success: false,
        error: `Route ${req.originalUrl} not found`,
        code: 'NOT_FOUND',
        timestamp: Date.now()
    };
    res.status(404).json(response);
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=errorHandler.js.map