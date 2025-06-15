"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const services_1 = __importDefault(require("../services"));
const router = (0, express_1.Router)();
// Get service manager instance
const serviceManager = services_1.default.getInstance();
const binanceService = serviceManager.getBinanceService();
// Health check endpoint
router.get('/health', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const connectionStatus = binanceService.getConnectionStatus();
    const response = {
        success: true,
        data: {
            status: 'healthy',
            services: {
                usdm: {
                    isConnected: connectionStatus.usdm.isConnected,
                    clientCount: connectionStatus.usdm.clientCount
                },
                coinm: {
                    isConnected: connectionStatus.coinm.isConnected,
                    clientCount: connectionStatus.coinm.clientCount
                },
                spot: {
                    isConnected: connectionStatus.spot.isConnected,
                    clientCount: connectionStatus.spot.clientCount
                },
                isInitialized: connectionStatus.isInitialized
            }
        },
        timestamp: Date.now()
    };
    res.json(response);
}));
exports.default = router;
//# sourceMappingURL=health.js.map