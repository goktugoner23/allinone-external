"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
// Only load .env file in development
if (process.env.NODE_ENV !== 'production') {
    (0, dotenv_1.config)();
}
const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    binance: {
        apiKey: process.env.BINANCE_API_KEY,
        apiSecret: process.env.BINANCE_API_SECRET,
        useTestnet: process.env.NODE_ENV !== 'production',
        baseUrl: process.env.NODE_ENV === 'production'
            ? 'https://fapi.binance.com'
            : 'https://testnet.binancefuture.com',
        wsUrl: process.env.NODE_ENV === 'production'
            ? 'wss://fstream.binance.com/ws'
            : 'wss://stream.binancefuture.com/ws'
    },
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true
    }
};
exports.default = config;
//# sourceMappingURL=index.js.map