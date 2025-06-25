import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ValidationError } from '../utils/errors';
import { 
  spotOrderSchema, 
  futuresOrderSchema, 
  tpslSchema, 
  assetSchema,
  validateInput 
} from '../utils/validation';

// Generic validation middleware factory
export const validate = (schema: (data: any) => any, source: 'body' | 'params' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req[source];
    const { error, value } = validateInput(schema, data);

    if (error) {
      throw new ValidationError(error);
    }

    // Replace the original data with validated and sanitized data
    req[source] = value;
    next();
  };
};

// Specific validation middlewares
export const validateSpotOrder = validate(spotOrderSchema, 'body');
export const validateFuturesOrder = validate(futuresOrderSchema, 'body');
export const validateTPSL = validate(tpslSchema, 'body');

// Symbol validation middleware
export const validateSymbol = (req: Request, res: Response, next: NextFunction): void => {
  const symbol = req.params.symbol || req.query.symbol || req.body.symbol;
  
  if (!symbol) {
    throw new ValidationError('Symbol is required');
  }

  // Basic symbol format validation
  const symbolRegex = /^[A-Z]{3,10}(USDT?|BUSD|BTC|ETH|BNB)$/;
  if (!symbolRegex.test(symbol)) {
    throw new ValidationError('Invalid symbol format. Expected format: BTCUSDT, ETHBTC, etc.');
  }

  next();
};

// Asset validation middleware
export const validateAsset = (req: Request, res: Response, next: NextFunction): void => {
  const asset = req.params.asset;
  
  if (asset) {
    const { error } = validateInput(assetSchema, asset);
    if (error) {
      throw new ValidationError(error);
    }
  }

  next();
};

// Order ID validation middleware
export const validateOrderId = (req: Request, res: Response, next: NextFunction): void => {
  const orderId = req.params.orderId;
  
  if (!orderId) {
    throw new ValidationError('Order ID is required');
  }

  // Check if orderId is a valid number or string
  if (!/^\d+$/.test(orderId)) {
    throw new ValidationError('Order ID must be a valid number');
  }

  next();
};

// Pagination validation middleware
export const validatePagination = (req: Request, res: Response, next: NextFunction): void => {
  const { limit, offset } = req.query;

  if (limit) {
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      throw new ValidationError('Limit must be a number between 1 and 1000');
    }
    req.query.limit = limitNum.toString();
  }

  if (offset) {
    const offsetNum = parseInt(offset as string, 10);
    if (isNaN(offsetNum) || offsetNum < 0) {
      throw new ValidationError('Offset must be a non-negative number');
    }
    req.query.offset = offsetNum.toString();
  }

  next();
};

// Express-validator validation middleware
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg).join(', ');
    throw new ValidationError(errorMessages);
  }
  next();
}; 