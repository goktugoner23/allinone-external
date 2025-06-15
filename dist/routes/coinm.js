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
// ============= COIN-M FUTURES ACCOUNT & POSITION ROUTES =============
// Get COIN-M account information
router.get('/account', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const result = await binanceService.getCoinMAccountInfo();
    const response = {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now()
    };
    res.json(response);
}));
// Get COIN-M positions
router.get('/positions', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const result = await binanceService.getCoinMPositions();
    const response = {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now()
    };
    res.json(response);
}));
// Get COIN-M balance
router.get('/balance/:asset?', validation_1.validateAsset, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { asset } = req.params;
    const result = await binanceService.getCoinMBalance(asset);
    const response = {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now()
    };
    res.json(response);
}));
// ============= COIN-M FUTURES ORDER MANAGEMENT ROUTES =============
// Get COIN-M open orders
router.get('/orders', validation_1.validatePagination, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const symbol = req.query.symbol;
    const result = await binanceService.getCoinMOpenOrders(symbol);
    const response = {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now()
    };
    res.json(response);
}));
// Place new COIN-M order
router.post('/orders', validation_1.validateFuturesOrder, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const result = await binanceService.placeCoinMOrder(req.body);
    const response = {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now()
    };
    res.status(result.success ? 201 : 400).json(response);
}));
// Cancel specific COIN-M order
router.delete('/orders/:symbol/:orderId', validation_1.validateSymbol, validation_1.validateOrderId, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { symbol, orderId } = req.params;
    const result = await binanceService.cancelCoinMOrder(symbol, orderId);
    const response = {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now()
    };
    res.json(response);
}));
// Cancel all COIN-M orders for symbol
router.delete('/orders/:symbol', validation_1.validateSymbol, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { symbol } = req.params;
    const result = await binanceService.cancelAllCoinMOrders(symbol);
    const response = {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now()
    };
    res.json(response);
}));
// ============= COIN-M FUTURES RISK MANAGEMENT ROUTES =============
// Set Take Profit and Stop Loss for COIN-M
router.post('/tpsl', validation_1.validateTPSL, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { symbol, side, takeProfitPrice, stopLossPrice, quantity } = req.body;
    const result = await binanceService.setCoinMTPSL(symbol, side, takeProfitPrice, stopLossPrice, quantity);
    const response = {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now()
    };
    res.status(result.success ? 201 : 400).json(response);
}));
// Close Position for COIN-M
router.post('/close-position', validation_1.validateSymbol, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { symbol, quantity } = req.body;
    if (!symbol) {
        return res.status(400).json({
            success: false,
            error: 'Symbol is required',
            timestamp: Date.now()
        });
    }
    const result = await binanceService.closeCoinMPosition(symbol, quantity);
    const response = {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now()
    };
    res.status(result.success ? 201 : 400).json(response);
}));
// ============= COIN-M FUTURES MARKET DATA ROUTES =============
// Get COIN-M price
router.get('/price/:symbol?', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { symbol } = req.params;
    const result = symbol
        ? await binanceService.getCoinMPrice(symbol)
        : await binanceService.getAllCoinMPrices();
    const response = {
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: Date.now()
    };
    res.json(response);
}));
exports.default = router;
//# sourceMappingURL=coinm.js.map