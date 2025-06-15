"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePagination = exports.validateOrderId = exports.validateAsset = exports.validateSymbol = exports.validateTPSL = exports.validateFuturesOrder = exports.validateSpotOrder = exports.validate = void 0;
const errors_1 = require("../utils/errors");
const validation_1 = require("../utils/validation");
// Generic validation middleware factory
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        const data = req[source];
        const { error, value } = (0, validation_1.validateInput)(schema, data);
        if (error) {
            throw new errors_1.ValidationError(error);
        }
        // Replace the original data with validated and sanitized data
        req[source] = value;
        next();
    };
};
exports.validate = validate;
// Specific validation middlewares
exports.validateSpotOrder = (0, exports.validate)(validation_1.spotOrderSchema, 'body');
exports.validateFuturesOrder = (0, exports.validate)(validation_1.futuresOrderSchema, 'body');
exports.validateTPSL = (0, exports.validate)(validation_1.tpslSchema, 'body');
// Symbol validation middleware
const validateSymbol = (req, res, next) => {
    const symbol = req.params.symbol || req.query.symbol || req.body.symbol;
    if (!symbol) {
        throw new errors_1.ValidationError('Symbol is required');
    }
    // Basic symbol format validation
    const symbolRegex = /^[A-Z]{3,10}(USDT?|BUSD|BTC|ETH|BNB)$/;
    if (!symbolRegex.test(symbol)) {
        throw new errors_1.ValidationError('Invalid symbol format. Expected format: BTCUSDT, ETHBTC, etc.');
    }
    next();
};
exports.validateSymbol = validateSymbol;
// Asset validation middleware
const validateAsset = (req, res, next) => {
    const asset = req.params.asset;
    if (asset) {
        const { error } = (0, validation_1.validateInput)(validation_1.assetSchema, asset);
        if (error) {
            throw new errors_1.ValidationError(error);
        }
    }
    next();
};
exports.validateAsset = validateAsset;
// Order ID validation middleware
const validateOrderId = (req, res, next) => {
    const orderId = req.params.orderId;
    if (!orderId) {
        throw new errors_1.ValidationError('Order ID is required');
    }
    // Check if orderId is a valid number or string
    if (!/^\d+$/.test(orderId)) {
        throw new errors_1.ValidationError('Order ID must be a valid number');
    }
    next();
};
exports.validateOrderId = validateOrderId;
// Pagination validation middleware
const validatePagination = (req, res, next) => {
    const { limit, offset } = req.query;
    if (limit) {
        const limitNum = parseInt(limit, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
            throw new errors_1.ValidationError('Limit must be a number between 1 and 1000');
        }
        req.query.limit = limitNum.toString();
    }
    if (offset) {
        const offsetNum = parseInt(offset, 10);
        if (isNaN(offsetNum) || offsetNum < 0) {
            throw new errors_1.ValidationError('Offset must be a non-negative number');
        }
        req.query.offset = offsetNum.toString();
    }
    next();
};
exports.validatePagination = validatePagination;
//# sourceMappingURL=validation.js.map