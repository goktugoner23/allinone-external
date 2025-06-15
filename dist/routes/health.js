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
    const status = binanceService.getConnectionStatus();
    const response = {
        success: true,
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: status,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.env.npm_package_version || '1.0.0'
        },
        timestamp: Date.now()
    };
    res.json(response);
}));
exports.default = router;
//# sourceMappingURL=health.js.map