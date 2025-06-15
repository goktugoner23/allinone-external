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
// ============= SPOT WEBSOCKET SUBSCRIPTION ROUTES =============
// Subscribe to spot ticker
router.post('/spot/subscribe/ticker/:symbol', validation_1.validateSymbol, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { symbol } = req.params;
    await binanceService.subscribeToSpotTicker(symbol);
    const response = {
        success: true,
        data: { message: `Subscribed to spot ticker for ${symbol}` },
        timestamp: Date.now()
    };
    res.json(response);
}));
// Subscribe to spot depth
router.post('/spot/subscribe/depth/:symbol', validation_1.validateSymbol, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { symbol } = req.params;
    const levels = req.query.levels;
    await binanceService.subscribeToSpotDepth(symbol, levels);
    const response = {
        success: true,
        data: { message: `Subscribed to spot depth for ${symbol}` },
        timestamp: Date.now()
    };
    res.json(response);
}));
// Subscribe to spot trades
router.post('/spot/subscribe/trades/:symbol', validation_1.validateSymbol, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { symbol } = req.params;
    await binanceService.subscribeToSpotTrades(symbol);
    const response = {
        success: true,
        data: { message: `Subscribed to spot trades for ${symbol}` },
        timestamp: Date.now()
    };
    res.json(response);
}));
// ============= GENERAL WEBSOCKET MANAGEMENT ROUTES =============
// Get WebSocket connection status
router.get('/websocket/status', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const status = binanceService.getConnectionStatus();
    const response = {
        success: true,
        data: status,
        timestamp: Date.now()
    };
    res.json(response);
}));
exports.default = router;
//# sourceMappingURL=websocket.js.map