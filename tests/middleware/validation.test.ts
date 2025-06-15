import { Request, Response, NextFunction } from 'express';
import {
  validate,
  validateSpotOrder,
  validateFuturesOrder,
  validateTPSL,
  validateSymbol,
  validateAsset,
  validateOrderId,
  validatePagination
} from '../../src/middleware/validation';
import { ValidationError } from '../../src/utils/errors';

// Mock Express objects
const mockRequest = (data: any = {}, source: 'body' | 'params' | 'query' = 'body') => ({
  [source]: data,
  params: source === 'params' ? data : {},
  query: source === 'query' ? data : {},
  body: source === 'body' ? data : {}
} as Request);

const mockResponse = () => ({} as Response);
const mockNext = jest.fn() as NextFunction;

describe('Validation Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should pass validation with valid data', () => {
      const schema = (data: any) => ({ value: data });
      const middleware = validate(schema, 'body');
      const req = mockRequest({ test: 'data' });
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.body).toEqual({ test: 'data' });
    });

    it('should throw ValidationError with invalid data', () => {
      const schema = (data: any) => ({ error: 'Invalid data' });
      const middleware = validate(schema, 'body');
      const req = mockRequest({ test: 'invalid' });
      const res = mockResponse();

      expect(() => {
        middleware(req, res, mockNext);
      }).toThrow(ValidationError);
      expect(() => {
        middleware(req, res, mockNext);
      }).toThrow('Invalid data');
    });

    it('should validate query parameters', () => {
      const schema = (data: any) => ({ value: data });
      const middleware = validate(schema, 'query');
      const req = mockRequest({ limit: '10' }, 'query');
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.query).toEqual({ limit: '10' });
    });
  });

  describe('validateSpotOrder', () => {
    it('should validate correct spot order', () => {
      const req = mockRequest({
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 0.001,
        price: 50000
      });
      const res = mockResponse();

      validateSpotOrder(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject invalid spot order', () => {
      const req = mockRequest({
        symbol: 'INVALID',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 0.001
      });
      const res = mockResponse();

      expect(() => {
        validateSpotOrder(req, res, mockNext);
      }).toThrow(ValidationError);
    });
  });

  describe('validateFuturesOrder', () => {
    it('should validate correct futures order', () => {
      const req = mockRequest({
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.001
      });
      const res = mockResponse();

      validateFuturesOrder(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('validateTPSL', () => {
    it('should validate TPSL with take profit', () => {
      const req = mockRequest({
        symbol: 'BTCUSDT',
        side: 'BUY',
        takeProfitPrice: 55000
      });
      const res = mockResponse();

      validateTPSL(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject TPSL without TP or SL', () => {
      const req = mockRequest({
        symbol: 'BTCUSDT',
        side: 'BUY'
      });
      const res = mockResponse();

      expect(() => {
        validateTPSL(req, res, mockNext);
      }).toThrow(ValidationError);
    });
  });

  describe('validateSymbol', () => {
    it('should validate symbol from params', () => {
      const req = mockRequest({ symbol: 'BTCUSDT' }, 'params');
      const res = mockResponse();

      validateSymbol(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should validate symbol from query', () => {
      const req = mockRequest({ symbol: 'ETHUSDT' }, 'query');
      const res = mockResponse();

      validateSymbol(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should validate symbol from body', () => {
      const req = mockRequest({ symbol: 'ADAUSDT' }, 'body');
      const res = mockResponse();

      validateSymbol(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject missing symbol', () => {
      const req = mockRequest({});
      const res = mockResponse();

      expect(() => {
        validateSymbol(req, res, mockNext);
      }).toThrow(ValidationError);
      expect(() => {
        validateSymbol(req, res, mockNext);
      }).toThrow('Symbol is required');
    });

    it('should reject invalid symbol format', () => {
      const req = mockRequest({ symbol: 'invalid' }, 'params');
      const res = mockResponse();

      expect(() => {
        validateSymbol(req, res, mockNext);
      }).toThrow(ValidationError);
    });
  });

  describe('validateAsset', () => {
    it('should validate correct asset', () => {
      const req = mockRequest({ asset: 'BTC' }, 'params');
      const res = mockResponse();

      validateAsset(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow missing asset', () => {
      const req = mockRequest({}, 'params');
      const res = mockResponse();

      validateAsset(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject invalid asset format', () => {
      const req = mockRequest({ asset: 'btc' }, 'params');
      const res = mockResponse();

      expect(() => {
        validateAsset(req, res, mockNext);
      }).toThrow(ValidationError);
    });
  });

  describe('validateOrderId', () => {
    it('should validate numeric order ID', () => {
      const req = mockRequest({ orderId: '123456' }, 'params');
      const res = mockResponse();

      validateOrderId(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject missing order ID', () => {
      const req = mockRequest({}, 'params');
      const res = mockResponse();

      expect(() => {
        validateOrderId(req, res, mockNext);
      }).toThrow(ValidationError);
      expect(() => {
        validateOrderId(req, res, mockNext);
      }).toThrow('Order ID is required');
    });

    it('should reject non-numeric order ID', () => {
      const req = mockRequest({ orderId: 'abc123' }, 'params');
      const res = mockResponse();

      expect(() => {
        validateOrderId(req, res, mockNext);
      }).toThrow(ValidationError);
      expect(() => {
        validateOrderId(req, res, mockNext);
      }).toThrow('Order ID must be a valid number');
    });
  });

  describe('validatePagination', () => {
    it('should validate correct pagination parameters', () => {
      const req = mockRequest({ limit: '50', offset: '0' }, 'query');
      const res = mockResponse();

      validatePagination(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.query.limit).toBe('50');
      expect(req.query.offset).toBe('0');
    });

    it('should allow missing pagination parameters', () => {
      const req = mockRequest({}, 'query');
      const res = mockResponse();

      validatePagination(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject invalid limit', () => {
      const req = mockRequest({ limit: '0' }, 'query');
      const res = mockResponse();

      expect(() => {
        validatePagination(req, res, mockNext);
      }).toThrow(ValidationError);
      expect(() => {
        validatePagination(req, res, mockNext);
      }).toThrow('Limit must be a number between 1 and 1000');
    });

    it('should reject limit too high', () => {
      const req = mockRequest({ limit: '2000' }, 'query');
      const res = mockResponse();

      expect(() => {
        validatePagination(req, res, mockNext);
      }).toThrow(ValidationError);
    });

    it('should reject negative offset', () => {
      const req = mockRequest({ offset: '-1' }, 'query');
      const res = mockResponse();

      expect(() => {
        validatePagination(req, res, mockNext);
      }).toThrow(ValidationError);
      expect(() => {
        validatePagination(req, res, mockNext);
      }).toThrow('Offset must be a non-negative number');
    });

    it('should reject non-numeric pagination values', () => {
      const req = mockRequest({ limit: 'abc' }, 'query');
      const res = mockResponse();

      expect(() => {
        validatePagination(req, res, mockNext);
      }).toThrow(ValidationError);
    });
  });
}); 