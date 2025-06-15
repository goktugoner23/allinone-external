"use strict";
// Simple validation implementation without external dependencies
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetSchema = exports.tpslSchema = exports.futuresOrderSchema = exports.spotOrderSchema = exports.priceSchema = exports.quantitySchema = exports.sideSchema = exports.symbolSchema = void 0;
exports.validateInput = validateInput;
// Common validation schemas as functions
const symbolSchema = (symbol) => {
    if (!symbol) {
        return { error: 'Symbol is required' };
    }
    const symbolRegex = /^[A-Z]{3,10}(USDT?|BUSD|BTC|ETH|BNB)$/;
    if (!symbolRegex.test(symbol)) {
        return { error: 'Symbol must be a valid trading pair (e.g., BTCUSDT, ETHBTC)' };
    }
    return { value: symbol };
};
exports.symbolSchema = symbolSchema;
const sideSchema = (side) => {
    if (!side) {
        return { error: 'Side is required' };
    }
    if (!['BUY', 'SELL'].includes(side)) {
        return { error: 'Side must be BUY or SELL' };
    }
    return { value: side };
};
exports.sideSchema = sideSchema;
const quantitySchema = (quantity) => {
    if (quantity === undefined || quantity === null) {
        return { error: 'Quantity is required' };
    }
    if (typeof quantity !== 'number' || quantity <= 0) {
        return { error: 'Quantity must be positive' };
    }
    return { value: quantity };
};
exports.quantitySchema = quantitySchema;
const priceSchema = (price) => {
    if (price === undefined || price === null) {
        return { value: price }; // Optional field
    }
    if (typeof price !== 'number' || price <= 0) {
        return { error: 'Price must be positive' };
    }
    return { value: price };
};
exports.priceSchema = priceSchema;
// Spot order validation schema
const spotOrderSchema = (orderData) => {
    if (!orderData) {
        return { error: 'Order data is required' };
    }
    const symbolResult = (0, exports.symbolSchema)(orderData.symbol);
    if (symbolResult.error)
        return symbolResult;
    const sideResult = (0, exports.sideSchema)(orderData.side);
    if (sideResult.error)
        return sideResult;
    if (!orderData.type) {
        return { error: 'Order type is required' };
    }
    const validSpotTypes = ['LIMIT', 'MARKET', 'STOP_LOSS', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT', 'LIMIT_MAKER'];
    if (!validSpotTypes.includes(orderData.type)) {
        return { error: `Invalid order type. Must be one of: ${validSpotTypes.join(', ')}` };
    }
    const quantityResult = (0, exports.quantitySchema)(orderData.quantity);
    if (quantityResult.error)
        return quantityResult;
    // Price validation for types that require it
    const priceRequiredTypes = ['LIMIT', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT_LIMIT', 'LIMIT_MAKER'];
    if (priceRequiredTypes.includes(orderData.type)) {
        if (orderData.price === undefined || orderData.price === null) {
            return { error: 'Price is required for this order type' };
        }
        const priceResult = (0, exports.priceSchema)(orderData.price);
        if (priceResult.error)
            return priceResult;
    }
    return { value: orderData };
};
exports.spotOrderSchema = spotOrderSchema;
// Futures order validation schema
const futuresOrderSchema = (orderData) => {
    if (!orderData) {
        return { error: 'Order data is required' };
    }
    const symbolResult = (0, exports.symbolSchema)(orderData.symbol);
    if (symbolResult.error)
        return symbolResult;
    const sideResult = (0, exports.sideSchema)(orderData.side);
    if (sideResult.error)
        return sideResult;
    if (!orderData.type) {
        return { error: 'Order type is required' };
    }
    const validFuturesTypes = ['LIMIT', 'MARKET', 'STOP', 'STOP_MARKET', 'TAKE_PROFIT', 'TAKE_PROFIT_MARKET', 'TRAILING_STOP_MARKET'];
    if (!validFuturesTypes.includes(orderData.type)) {
        return { error: `Invalid order type. Must be one of: ${validFuturesTypes.join(', ')}` };
    }
    const quantityResult = (0, exports.quantitySchema)(orderData.quantity);
    if (quantityResult.error)
        return quantityResult;
    return { value: orderData };
};
exports.futuresOrderSchema = futuresOrderSchema;
// TPSL validation schema
const tpslSchema = (tpslData) => {
    if (!tpslData) {
        return { error: 'TPSL data is required' };
    }
    const symbolResult = (0, exports.symbolSchema)(tpslData.symbol);
    if (symbolResult.error)
        return symbolResult;
    const sideResult = (0, exports.sideSchema)(tpslData.side);
    if (sideResult.error)
        return sideResult;
    if (!tpslData.takeProfitPrice && !tpslData.stopLossPrice) {
        return { error: 'Either takeProfitPrice or stopLossPrice must be provided' };
    }
    return { value: tpslData };
};
exports.tpslSchema = tpslSchema;
// Asset validation schema
const assetSchema = (asset) => {
    if (!asset) {
        return { value: asset }; // Optional field
    }
    const assetRegex = /^[A-Z]{2,10}$/;
    if (!assetRegex.test(asset)) {
        return { error: 'Asset must be uppercase letters only (e.g., BTC, ETH, USDT)' };
    }
    return { value: asset };
};
exports.assetSchema = assetSchema;
// Validation helper function
function validateInput(schema, data) {
    return schema(data);
}
//# sourceMappingURL=validation.js.map