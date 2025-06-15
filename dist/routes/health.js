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
// Add endpoint to check outbound IP
router.get('/outbound-ip', async (req, res) => {
    try {
        const https = require('https');
        const getOutboundIP = () => {
            return new Promise((resolve, reject) => {
                https.get('https://api.ipify.org', (response) => {
                    let data = '';
                    response.on('data', (chunk) => data += chunk);
                    response.on('end', () => resolve(data.trim()));
                }).on('error', reject);
            });
        };
        const outboundIP = await getOutboundIP();
        res.json({
            success: true,
            data: {
                outboundIP,
                timestamp: Date.now(),
                method: 'api.ipify.org'
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to determine outbound IP',
            timestamp: Date.now()
        });
    }
});
exports.default = router;
//# sourceMappingURL=health.js.map