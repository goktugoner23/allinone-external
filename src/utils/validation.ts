// Simple validation implementation without external dependencies

export interface ValidationResult<T = any> {
  error?: string;
  value?: T;
}

// Common validation schemas as functions
export const symbolSchema = (symbol: string): ValidationResult<string> => {
  if (!symbol) {
    return { error: 'Symbol is required' };
  }
  
  const symbolRegex = /^[A-Z]{3,10}(USDT?|BUSD|BTC|ETH|BNB)$/;
  if (!symbolRegex.test(symbol)) {
    return { error: 'Symbol must be a valid trading pair (e.g., BTCUSDT, ETHBTC)' };
  }
  
  return { value: symbol };
};

export const sideSchema = (side: string): ValidationResult<string> => {
  if (!side) {
    return { error: 'Side is required' };
  }
  
  if (!['BUY', 'SELL'].includes(side)) {
    return { error: 'Side must be BUY or SELL' };
  }
  
  return { value: side };
};

export const quantitySchema = (quantity: number): ValidationResult<number> => {
  if (quantity === undefined || quantity === null) {
    return { error: 'Quantity is required' };
  }
  
  if (typeof quantity !== 'number' || quantity <= 0) {
    return { error: 'Quantity must be positive' };
  }
  
  return { value: quantity };
};

export const priceSchema = (price: number): ValidationResult<number> => {
  if (price === undefined || price === null) {
    return { value: price }; // Optional field
  }
  
  if (typeof price !== 'number' || price <= 0) {
    return { error: 'Price must be positive' };
  }
  
  return { value: price };
};

// Spot order validation schema
export const spotOrderSchema = (orderData: any): ValidationResult<any> => {
  if (!orderData) {
    return { error: 'Order data is required' };
  }

  const symbolResult = symbolSchema(orderData.symbol);
  if (symbolResult.error) return symbolResult;

  const sideResult = sideSchema(orderData.side);
  if (sideResult.error) return sideResult;

  if (!orderData.type) {
    return { error: 'Order type is required' };
  }

  const validSpotTypes = ['LIMIT', 'MARKET', 'STOP_LOSS', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT', 'LIMIT_MAKER'];
  if (!validSpotTypes.includes(orderData.type)) {
    return { error: `Invalid order type. Must be one of: ${validSpotTypes.join(', ')}` };
  }

  const quantityResult = quantitySchema(orderData.quantity);
  if (quantityResult.error) return quantityResult;

  // Price validation for types that require it
  const priceRequiredTypes = ['LIMIT', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT_LIMIT', 'LIMIT_MAKER'];
  if (priceRequiredTypes.includes(orderData.type)) {
    if (orderData.price === undefined || orderData.price === null) {
      return { error: 'Price is required for this order type' };
    }
    const priceResult = priceSchema(orderData.price);
    if (priceResult.error) return priceResult;
  }

  return { value: orderData };
};

// Futures order validation schema
export const futuresOrderSchema = (orderData: any): ValidationResult<any> => {
  if (!orderData) {
    return { error: 'Order data is required' };
  }

  const symbolResult = symbolSchema(orderData.symbol);
  if (symbolResult.error) return symbolResult;

  const sideResult = sideSchema(orderData.side);
  if (sideResult.error) return sideResult;

  if (!orderData.type) {
    return { error: 'Order type is required' };
  }

  const validFuturesTypes = ['LIMIT', 'MARKET', 'STOP', 'STOP_MARKET', 'TAKE_PROFIT', 'TAKE_PROFIT_MARKET', 'TRAILING_STOP_MARKET'];
  if (!validFuturesTypes.includes(orderData.type)) {
    return { error: `Invalid order type. Must be one of: ${validFuturesTypes.join(', ')}` };
  }

  const quantityResult = quantitySchema(orderData.quantity);
  if (quantityResult.error) return quantityResult;

  return { value: orderData };
};

// TPSL validation schema
export const tpslSchema = (tpslData: any): ValidationResult<any> => {
  if (!tpslData) {
    return { error: 'TPSL data is required' };
  }

  const symbolResult = symbolSchema(tpslData.symbol);
  if (symbolResult.error) return symbolResult;

  const sideResult = sideSchema(tpslData.side);
  if (sideResult.error) return sideResult;

  if (!tpslData.takeProfitPrice && !tpslData.stopLossPrice) {
    return { error: 'Either takeProfitPrice or stopLossPrice must be provided' };
  }

  return { value: tpslData };
};

// Asset validation schema
export const assetSchema = (asset: string): ValidationResult<string> => {
  if (!asset) {
    return { value: asset }; // Optional field
  }
  
  const assetRegex = /^[A-Z]{2,10}$/;
  if (!assetRegex.test(asset)) {
    return { error: 'Asset must be uppercase letters only (e.g., BTC, ETH, USDT)' };
  }
  
  return { value: asset };
};

// Validation helper function
export function validateInput<T>(schema: (data: any) => ValidationResult<T>, data: any): ValidationResult<T> {
  return schema(data);
} 