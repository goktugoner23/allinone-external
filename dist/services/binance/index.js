"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const websocket_1 = __importDefault(require("./websocket"));
const rest_1 = __importDefault(require("./rest"));
class BinanceService {
    constructor() {
        this.isInitialized = false;
        this.wsManager = new websocket_1.default();
        this.restAPI = new rest_1.default();
        this.isInitialized = false;
    }
    async initialize() {
        try {
            console.log('Initializing Binance Service...');
            await this.wsManager.initialize();
            this.isInitialized = true;
            console.log('Binance Service initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize Binance Service:', error);
            throw error;
        }
    }
    // WebSocket methods
    addWebSocketClient(ws) {
        this.wsManager.addClient(ws);
    }
    getConnectionStatus() {
        return {
            isConnected: this.wsManager.isConnected,
            clientCount: this.wsManager.clients.size,
            isInitialized: this.isInitialized
        };
    }
    // REST API methods
    async getAccountInfo() {
        return this.restAPI.getAccountInfo();
    }
    async getPositions() {
        return this.restAPI.getPositions();
    }
    async getOpenOrders(symbol) {
        return this.restAPI.getOpenOrders(symbol);
    }
    async placeOrder(orderData) {
        return this.restAPI.placeOrder(orderData);
    }
    async cancelOrder(symbol, orderId) {
        return this.restAPI.cancelOrder(symbol, orderId);
    }
    async cancelAllOrders(symbol) {
        return this.restAPI.cancelAllOrders(symbol);
    }
    async setTPSL(symbol, side, takeProfitPrice, stopLossPrice, quantity) {
        return this.restAPI.setTPSL(symbol, side, takeProfitPrice, stopLossPrice, quantity);
    }
    async getBalance(asset) {
        return this.restAPI.getBalance(asset);
    }
    async getPrice(symbol) {
        return this.restAPI.getPrice(symbol);
    }
    async getAllPrices() {
        return this.restAPI.getAllPrices();
    }
    // Cleanup method
    async disconnect() {
        try {
            console.log('Disconnecting Binance Service...');
            await this.wsManager.disconnect();
            console.log('Binance Service disconnected successfully');
        }
        catch (error) {
            console.error('Error disconnecting Binance Service:', error);
        }
    }
}
exports.default = BinanceService;
//# sourceMappingURL=index.js.map