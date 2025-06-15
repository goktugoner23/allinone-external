export declare class ApiError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly isOperational: boolean;
    constructor(message: string, statusCode?: number, code?: string, isOperational?: boolean);
}
export declare class ValidationError extends ApiError {
    constructor(message: string, _details?: any);
}
export declare class AuthenticationError extends ApiError {
    constructor(message?: string);
}
export declare class AuthorizationError extends ApiError {
    constructor(message?: string);
}
export declare class NotFoundError extends ApiError {
    constructor(message?: string);
}
export declare class RateLimitError extends ApiError {
    constructor(message?: string);
}
export declare class InsufficientBalanceError extends ApiError {
    constructor(message?: string);
}
export declare class OrderError extends ApiError {
    constructor(message: string, originalError?: Error);
}
export declare class WebSocketError extends ApiError {
    constructor(message: string);
}
export declare class ExternalApiError extends ApiError {
    constructor(message: string, service: string);
}
//# sourceMappingURL=errors.d.ts.map