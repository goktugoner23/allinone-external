"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const validation_1 = require("../middleware/validation");
const services_1 = __importDefault(require("../services"));
const router = (0, express_1.Router)();
// Get service manager instance
const serviceManager = services_1.default.getInstance();
const binanceService = serviceManager.getBinanceService();
// ============= SPOT ACCOUNT & BALANCE ROUTES =============
// Get spot account information
router.get('/account', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const result = await binanceService.getSpotAccountInfo();
    const response = {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now()
    };
    res.json(response);
}));
// Get spot balances
router.get('/balances', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const result = await binanceService.getSpotBalances();
    const response = {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now()
    };
    res.json(response);
}));
// Get spot balance for specific asset
router.get('/balance/:asset?', validation_1.validateAsset, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { asset } = req.params;
    const result = asset
        ? await binanceService.getSpotBalance(asset)
        : await binanceService.getSpotBalances();
    const response = {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now()
    };
    res.json(response);
}));
// ============= SPOT ORDER MANAGEMENT ROUTES =============
// Get spot open orders
router.get('/orders', validation_1.validatePagination, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const symbol = req.query.symbol;
    const result = await binanceService.getSpotOpenOrders(symbol);
    const response = {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now()
    };
    res.json(response);
}));
// Place new spot order
router.post('/orders', validation_1.validateSpotOrder, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const result = await binanceService.placeSpotOrder(req.body);
    const response = {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now()
    };
    res.status(result.success ? 201 : 400).json(response);
}));
// Cancel specific spot order
router.delete('/orders/:symbol/:orderId', validation_1.validateSymbol, validation_1.validateOrderId, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { symbol, orderId } = req.params;
    const result = await binanceService.cancelSpotOrder(symbol, orderId);
    const response = {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now()
    };
    res.json(response);
}));
// Cancel all spot orders for symbol
router.delete('/orders/:symbol', validation_1.validateSymbol, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { symbol } = req.params;
    const result = await binanceService.cancelAllSpotOrders(symbol);
    const response = {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now()
    };
    res.json(response);
}));
// ============= SPOT MARKET DATA ROUTES =============
// Get spot price
router.get('/price/:symbol?', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { symbol } = req.params;
    const result = symbol
        ? await binanceService.getSpotPrice(symbol)
        : await binanceService.getAllSpotPrices();
    const response = {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now()
    };
    res.json(response);
}));
// Get spot 24hr ticker
router.get('/ticker/:symbol?', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { symbol } = req.params;
    const result = await binanceService.getSpot24hrTicker(symbol);
    const response = {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now()
    };
    res.json(response);
}));
// Get spot order book
router.get('/depth/:symbol', validation_1.validateSymbol, validation_1.validatePagination, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { symbol } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
    const result = await binanceService.getSpotOrderBook(symbol, limit);
    const response = {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now()
    };
    res.json(response);
}));
// Get spot recent trades
router.get('/trades/:symbol', validation_1.validateSymbol, validation_1.validatePagination, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { symbol } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 500;
    const result = await binanceService.getSpotRecentTrades(symbol, limit);
    const response = {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now()
    };
    res.json(response);
}));
exports.default = router;
//# sourceMappingURL=spot.js.map