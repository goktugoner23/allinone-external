"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const ws_1 = __importDefault(require("ws"));
const http_1 = __importDefault(require("http"));
const services_1 = __importDefault(require("./services"));
const config_1 = __importDefault(require("./config"));
const errorHandler_1 = require("./middleware/errorHandler");
const routes_1 = __importDefault(require("./routes"));
const rag_1 = require("./routes/rag");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const wss = new ws_1.default.Server({ server });
// Configure trust proxy for rate limiting
// For DigitalOcean deployment, be more specific about trusted proxies
if (config_1.default.nodeEnv === 'production') {
    // Trust specific proxy networks (adjust based on your infrastructure)
    app.set('trust proxy', ['127.0.0.1', '::1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']);
}
else {
    // Development - trust localhost
    app.set('trust proxy', ['127.0.0.1', '::1']);
}
// Initialize services
const serviceManager = services_1.default.getInstance();
const binanceService = serviceManager.getBinanceService();
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.default.rateLimit.windowMs,
    max: config_1.default.rateLimit.max,
    message: {
        success: false,
        error: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
        timestamp: Date.now()
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
// CORS configuration
app.use((0, cors_1.default)(config_1.default.cors));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
    next();
});
// Use organized routes
app.use(routes_1.default);
// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');
    // Add client to all service managers
    binanceService.addWebSocketClient(ws);
    // Send welcome message
    ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to Binance Trading API WebSocket',
        timestamp: Date.now()
    }));
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            console.log('WebSocket message received:', data);
            // Handle client messages if needed
            if (data.type === 'ping') {
                ws.send(JSON.stringify({
                    type: 'pong',
                    timestamp: Date.now()
                }));
            }
        }
        catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    });
    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
    ws.on('error', (error) => {
        console.error('WebSocket client error:', error);
    });
});
// Error handling middleware (must be last)
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    try {
        // Close WebSocket server
        wss.close(() => {
            console.log('WebSocket server closed');
        });
        // Close HTTP server
        server.close(() => {
            console.log('HTTP server closed');
        });
        // Disconnect services
        await binanceService.disconnect();
        console.log('Graceful shutdown completed');
        process.exit(0);
    }
    catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
};
// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});
// Start server function
async function startServer() {
    try {
        console.log('Starting server...');
        // Initialize services
        await serviceManager.initialize();
        // Initialize RAG service
        try {
            console.log('Initializing RAG service...');
            await (0, rag_1.initializeRAGService)();
            console.log('✅ RAG service initialized successfully');
        }
        catch (error) {
            console.warn('⚠️ RAG service initialization failed:', error instanceof Error ? error.message : error);
            console.warn('RAG endpoints will not be available until service is initialized');
        }
        // Start HTTP server
        server.listen(config_1.default.port, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${config_1.default.port}`);
            console.log(`📊 Environment: ${config_1.default.nodeEnv}`);
            console.log(`🔗 WebSocket server ready`);
            console.log(`💹 Binance services initialized`);
            if (config_1.default.nodeEnv === 'development') {
                console.log(`🌐 Health check: http://localhost:${config_1.default.port}/health`);
                console.log(`📈 Spot API: http://localhost:${config_1.default.port}/api/binance/spot/`);
                console.log(`⚡ Futures API: http://localhost:${config_1.default.port}/api/binance/futures/`);
                console.log(`🪙 COIN-M API: http://localhost:${config_1.default.port}/api/binance/coinm/`);
                console.log(`🔌 WebSocket API: http://localhost:${config_1.default.port}/api/binance/websocket/`);
                console.log(`🤖 RAG API: http://localhost:${config_1.default.port}/api/rag/`);
                console.log(`📸 Instagram API: http://localhost:${config_1.default.port}/api/instagram/`);
            }
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Start the server
if (require.main === module) {
    startServer();
}
exports.default = app;
//# sourceMappingURL=app.js.map