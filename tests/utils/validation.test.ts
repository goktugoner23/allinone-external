import {
  symbolSchema,
  sideSchema,
  quantitySchema,
  priceSchema,
  spotOrderSchema,
  futuresOrderSchema,
  tpslSchema,
  assetSchema,
  validateInput
} from '../../src/utils/validation';

describe('Validation Utils', () => {
  describe('symbolSchema', () => {
    it('should validate correct symbols', () => {
      const validSymbols = ['BTCUSDT', 'ETHBTC', 'ADAUSDT', 'BNBBUSD'];
      
      validSymbols.forEach(symbol => {
        const result = symbolSchema(symbol);
        expect(result.error).toBeUndefined();
        expect(result.value).toBe(symbol);
      });
    });

    it('should reject invalid symbols', () => {
      const invalidSymbols = ['', 'BTC', 'INVALID', 'btcusdt', '123USDT'];
      
      invalidSymbols.forEach(symbol => {
        const result = symbolSchema(symbol);
        expect(result.error).toBeDefined();
        expect(result.value).toBeUndefined();
      });
    });

    it('should require symbol to be provided', () => {
      const result = symbolSchema('');
      expect(result.error).toBe('Symbol is required');
    });
  });

  describe('sideSchema', () => {
    it('should validate BUY and SELL', () => {
      const result1 = sideSchema('BUY');
      expect(result1.error).toBeUndefined();
      expect(result1.value).toBe('BUY');

      const result2 = sideSchema('SELL');
      expect(result2.error).toBeUndefined();
      expect(result2.value).toBe('SELL');
    });

    it('should reject invalid sides', () => {
      const invalidSides = ['', 'buy', 'sell', 'LONG', 'SHORT'];
      
      invalidSides.forEach(side => {
        const result = sideSchema(side);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('quantitySchema', () => {
    it('should validate positive numbers', () => {
      const validQuantities = [0.001, 1, 100, 1000.5];
      
      validQuantities.forEach(quantity => {
        const result = quantitySchema(quantity);
        expect(result.error).toBeUndefined();
        expect(result.value).toBe(quantity);
      });
    });

    it('should reject invalid quantities', () => {
      const invalidQuantities = [0, -1, -0.001];
      
      invalidQuantities.forEach(quantity => {
        const result = quantitySchema(quantity);
        expect(result.error).toBeDefined();
      });
    });

    it('should require quantity to be provided', () => {
      const result = quantitySchema(undefined as any);
      expect(result.error).toBe('Quantity is required');
    });
  });

  describe('priceSchema', () => {
    it('should validate positive prices', () => {
      const validPrices = [0.001, 1, 50000, 1000.5];
      
      validPrices.forEach(price => {
        const result = priceSchema(price);
        expect(result.error).toBeUndefined();
        expect(result.value).toBe(price);
      });
    });

    it('should allow undefined for optional price', () => {
      const result = priceSchema(undefined as any);
      expect(result.error).toBeUndefined();
      expect(result.value).toBeUndefined();
    });

    it('should reject negative prices', () => {
      const result = priceSchema(-1);
      expect(result.error).toBe('Price must be positive');
    });
  });

  describe('spotOrderSchema', () => {
    it('should validate complete spot order', () => {
      const validOrder = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 0.001,
        price: 50000
      };

      const result = spotOrderSchema(validOrder);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(validOrder);
    });

    it('should validate market order without price', () => {
      const validOrder = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.001
      };

      const result = spotOrderSchema(validOrder);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(validOrder);
    });

    it.skip('should require price for LIMIT orders', () => {
      const invalidOrder = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 0.001
      };

      const result = spotOrderSchema(invalidOrder);
      expect(result.error).toBe('Price is required for this order type');
    });

    it('should reject invalid order types', () => {
      const invalidOrder = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'INVALID_TYPE',
        quantity: 0.001
      };

      const result = spotOrderSchema(invalidOrder);
      expect(result.error).toBeDefined();
    });
  });

  describe('futuresOrderSchema', () => {
    it('should validate futures order', () => {
      const validOrder = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 0.001,
        price: 50000
      };

      const result = futuresOrderSchema(validOrder);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(validOrder);
    });

    it('should validate futures-specific order types', () => {
      const validOrder = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'STOP_MARKET',
        quantity: 0.001
      };

      const result = futuresOrderSchema(validOrder);
      expect(result.error).toBeUndefined();
    });
  });

  describe('tpslSchema', () => {
    it('should validate TPSL with take profit', () => {
      const validTPSL = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        takeProfitPrice: 55000
      };

      const result = tpslSchema(validTPSL);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(validTPSL);
    });

    it('should validate TPSL with stop loss', () => {
      const validTPSL = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        stopLossPrice: 45000
      };

      const result = tpslSchema(validTPSL);
      expect(result.error).toBeUndefined();
    });

    it('should require either TP or SL', () => {
      const invalidTPSL = {
        symbol: 'BTCUSDT',
        side: 'BUY'
      };

      const result = tpslSchema(invalidTPSL);
      expect(result.error).toBe('Either takeProfitPrice or stopLossPrice must be provided');
    });
  });

  describe('assetSchema', () => {
    it('should validate correct assets', () => {
      const validAssets = ['BTC', 'ETH', 'USDT', 'BNB'];
      
      validAssets.forEach(asset => {
        const result = assetSchema(asset);
        expect(result.error).toBeUndefined();
        expect(result.value).toBe(asset);
      });
    });

    it('should allow undefined for optional asset', () => {
      const result = assetSchema(undefined as any);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid asset formats', () => {
      const invalidAssets = ['btc', '123', 'BTC-USD'];
      
      invalidAssets.forEach(asset => {
        const result = assetSchema(asset);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('validateInput', () => {
    it('should work with any validation schema', () => {
      const testSchema = (data: any) => {
        if (data === 'valid') {
          return { value: data };
        }
        return { error: 'Invalid data' };
      };

      const validResult = validateInput(testSchema, 'valid');
      expect(validResult.error).toBeUndefined();
      expect(validResult.value).toBe('valid');

      const invalidResult = validateInput(testSchema, 'invalid');
      expect(invalidResult.error).toBe('Invalid data');
    });
  });
}); 