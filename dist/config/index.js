"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
// Only load .env file in development
if (process.env.NODE_ENV !== 'production') {
    (0, dotenv_1.config)();
}
const isProduction = process.env.NODE_ENV === 'production';
const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    binance: {
        apiKey: process.env.BINANCE_API_KEY,
        apiSecret: process.env.BINANCE_API_SECRET,
        useTestnet: false,
        spot: {
            baseUrl: 'https://api.binance.com',
            wsUrl: 'wss://stream.binance.com:9443/ws'
        },
        futures: {
            baseUrl: 'https://fapi.binance.com',
            wsUrl: 'wss://fstream.binance.com/ws'
        },
        coinm: {
            baseUrl: 'https://dapi.binance.com',
            wsUrl: 'wss://dstream.binance.com/ws'
        }
    },
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true
    },
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10) // limit each IP to 100 requests per windowMs
    },
    logging: {
        level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
        enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true' || isProduction
    }
};
// Validate required environment variables
if (!config.binance.apiKey || !config.binance.apiSecret) {
    console.warn('Warning: BINANCE_API_KEY and BINANCE_API_SECRET are not set. Some features may not work.');
}
exports.default = config;
//# sourceMappingURL=index.js.map