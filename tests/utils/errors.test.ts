import {
  ApiError,
  ValidationError,
  AuthenticationError,
  OrderError,
  WebSocketError,
  RateLimitError
} from '../../src/utils/errors';

describe('Error Classes', () => {
  describe('ApiError', () => {
    it('should create basic API error', () => {
      const error = new ApiError('Test error', 400, 'TEST_ERROR');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('ApiError');
      expect(error instanceof Error).toBe(true);
    });

    it('should have default values', () => {
      const error = new ApiError('Test error');
      
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with correct properties', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
      expect(error instanceof ApiError).toBe(true);
    });

    it('should accept details parameter', () => {
      const details = { field: 'symbol', value: 'invalid' };
      const error = new ValidationError('Invalid symbol', details);
      
      expect(error.message).toBe('Invalid symbol');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error', () => {
      const error = new AuthenticationError('Invalid API key');
      
      expect(error.message).toBe('Invalid API key');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.name).toBe('AuthenticationError');
    });
  });

  describe('OrderError', () => {
    it('should create order error', () => {
      const error = new OrderError('Insufficient balance');
      
      expect(error.message).toBe('Insufficient balance');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('ORDER_ERROR');
      expect(error.name).toBe('OrderError');
    });
  });

  describe('WebSocketError', () => {
    it('should create WebSocket error', () => {
      const error = new WebSocketError('Connection failed');
      
      expect(error.message).toBe('Connection failed');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('WEBSOCKET_ERROR');
      expect(error.name).toBe('WebSocketError');
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error', () => {
      const error = new RateLimitError('Too many requests');
      
      expect(error.message).toBe('Too many requests');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.name).toBe('RateLimitError');
    });
  });

  describe('Error inheritance', () => {
    it('should maintain proper inheritance chain', () => {
      const validationError = new ValidationError('Test');
      const orderError = new OrderError('Test');
      const wsError = new WebSocketError('Test');
      
      expect(validationError instanceof ValidationError).toBe(true);
      expect(validationError instanceof ApiError).toBe(true);
      expect(validationError instanceof Error).toBe(true);
      
      expect(orderError instanceof OrderError).toBe(true);
      expect(orderError instanceof ApiError).toBe(true);
      expect(orderError instanceof Error).toBe(true);
      
      expect(wsError instanceof WebSocketError).toBe(true);
      expect(wsError instanceof ApiError).toBe(true);
      expect(wsError instanceof Error).toBe(true);
    });
  });

  describe('Error serialization', () => {
    it('should serialize error properties correctly', () => {
      const error = new ValidationError('Test validation error');
      
      const serialized = JSON.parse(JSON.stringify({
        message: error.message,
        statusCode: error.statusCode,
        code: error.code,
        name: error.name
      }));
      
      expect(serialized.message).toBe('Test validation error');
      expect(serialized.statusCode).toBe(400);
      expect(serialized.code).toBe('VALIDATION_ERROR');
      expect(serialized.name).toBe('ValidationError');
    });
  });
}); 