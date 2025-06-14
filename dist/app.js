"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const WebSocket = __importStar(require("ws"));
const http = __importStar(require("http"));
const services_1 = __importDefault(require("./services"));
const config_1 = __importDefault(require("./config"));
const app = (0, express_1.default)();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
// Initialize services
const serviceManager = new services_1.default();
// Middleware
app.use((0, cors_1.default)(config_1.default.cors));
app.use(express_1.default.json());
// Health check endpoint
app.get('/health', (req, res) => {
    const status = serviceManager.getStatus();
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: status
    });
});
// Binance API Routes
const binanceService = serviceManager.getBinanceService();
// Get account information
app.get('/api/binance/account', async (req, res) => {
    try {
        const result = await binanceService.getAccountInfo();
        res.json(result);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ success: false, error: errorMessage });
    }
});
// Get positions
app.get('/api/binance/positions', async (req, res) => {
    try {
        const result = await binanceService.getPositions();
        res.json(result);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ success: false, error: errorMessage });
    }
});
// Get open orders
app.get('/api/binance/orders', async (req, res) => {
    try {
        const symbol = req.query.symbol;
        const result = await binanceService.getOpenOrders(symbol);
        res.json(result);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ success: false, error: errorMessage });
    }
});
// Place new order
app.post('/api/binance/orders', async (req, res) => {
    try {
        const result = await binanceService.placeOrder(req.body);
        res.json(result);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ success: false, error: errorMessage });
    }
});
// Cancel specific order
app.delete('/api/binance/orders/:symbol/:orderId', async (req, res) => {
    try {
        const { symbol, orderId } = req.params;
        const result = await binanceService.cancelOrder(symbol, orderId);
        res.json(result);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ success: false, error: errorMessage });
    }
});
// Cancel all orders for symbol
app.delete('/api/binance/orders/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const result = await binanceService.cancelAllOrders(symbol);
        res.json(result);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ success: false, error: errorMessage });
    }
});
// Set Take Profit and Stop Loss
app.post('/api/binance/tpsl', async (req, res) => {
    try {
        const { symbol, side, takeProfitPrice, stopLossPrice, quantity } = req.body;
        const result = await binanceService.setTPSL(symbol, side, takeProfitPrice, stopLossPrice, quantity);
        res.json(result);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ success: false, error: errorMessage });
    }
});
// Get balance
app.get('/api/binance/balance/:asset?', async (req, res) => {
    try {
        const asset = req.params.asset;
        const result = await binanceService.getBalance(asset);
        res.json(result);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ success: false, error: errorMessage });
    }
});
// Get price
app.get('/api/binance/price/:symbol?', async (req, res) => {
    try {
        const symbol = req.params.symbol;
        const result = symbol
            ? await binanceService.getPrice(symbol)
            : await binanceService.getAllPrices();
        res.json(result);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ success: false, error: errorMessage });
    }
});
// WebSocket connection handling
wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection from:', req.socket.remoteAddress);
    // Add client to Binance service for real-time updates
    binanceService.addWebSocketClient(ws);
    // Handle incoming messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            console.log('Received message from client:', data);
            // Handle ping/pong for heartbeat
            if (data.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            }
        }
        catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    });
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});
// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Express error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await serviceManager.shutdown();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    await serviceManager.shutdown();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
// Initialize services and start server
async function startServer() {
    try {
        console.log('Starting server...');
        await serviceManager.initialize();
        server.listen(config_1.default.port, () => {
            console.log(`Server running on port ${config_1.default.port}`);
            console.log(`WebSocket server ready for connections`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
module.exports = { app, server, serviceManager };
//# sourceMappingURL=app.js.map