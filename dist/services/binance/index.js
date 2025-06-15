"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const spot_websocket_1 = __importDefault(require("./spot-websocket"));
const spot_rest_1 = __importDefault(require("./spot-rest"));
const usdm_websocket_1 = __importDefault(require("./usdm-websocket"));
const usdm_rest_1 = __importDefault(require("./usdm-rest"));
const coinm_websocket_1 = __importDefault(require("./coinm-websocket"));
const coinm_rest_1 = __importDefault(require("./coinm-rest"));
const config_1 = __importDefault(require("../../config"));
class BinanceService {
    constructor() {
        this.isInitialized = false;
        // Initialize Spot services
        this.spotWsManager = new spot_websocket_1.default();
        this.spotRestAPI = new spot_rest_1.default();
        // Initialize USD-M Futures services
        this.usdMWsManager = new usdm_websocket_1.default();
        this.usdMRestAPI = new usdm_rest_1.default();
        // Initialize COIN-M Futures services
        this.coinMWsManager = new coinm_websocket_1.default();
        this.coinMRestAPI = new coinm_rest_1.default();
        this.isInitialized = false;
    }
    async initialize() {
        try {
            console.log('Initializing Binance Service...');
            console.log('API Key present:', !!config_1.default.binance.apiKey);
            console.log('API Secret present:', !!config_1.default.binance.apiSecret);
            // Initialize all WebSocket connections in parallel with better error handling
            const initPromises = [
                this.spotWsManager.initialize().catch(error => {
                    console.error('Spot WebSocket initialization failed:', error);
                    throw new Error(`Spot WebSocket: ${error.message}`);
                }),
                this.usdMWsManager.initialize().catch(error => {
                    console.error('USD-M WebSocket initialization failed:', error);
                    throw new Error(`USD-M WebSocket: ${error.message}`);
                }),
                this.coinMWsManager.initialize().catch(error => {
                    console.error('COIN-M WebSocket initialization failed:', error);
                    throw new Error(`COIN-M WebSocket: ${error.message}`);
                })
            ];
            await Promise.all(initPromises);
            this.isInitialized = true;
            console.log('✅ Binance Service initialized successfully (Spot + USD-M + COIN-M)');
            // Log connection status after initialization
            setTimeout(() => {
                const status = this.getConnectionStatus();
                console.log('📊 Connection Status Report:');
                console.log(`  - Spot: ${status.spot.isConnected ? '✅' : '❌'} (${status.spot.clientCount} clients)`);
                console.log(`  - USD-M: ${status.usdm.isConnected ? '✅' : '❌'} (${status.usdm.clientCount} clients)`);
                console.log(`  - COIN-M: ${status.coinm.isConnected ? '✅' : '❌'} (${status.coinm.clientCount} clients)`);
            }, 2000);
        }
        catch (error) {
            console.error('❌ Failed to initialize Binance Service:', error);
            this.isInitialized = false;
            throw error;
        }
    }
    // WebSocket client management
    addWebSocketClient(ws) {
        // Add client to all WebSocket managers
        this.spotWsManager.addClient(ws);
        this.usdMWsManager.addClient(ws);
        this.coinMWsManager.addClient(ws);
    }
    getConnectionStatus() {
        return {
            spot: {
                isConnected: this.spotWsManager.connected,
                clientCount: this.spotWsManager.clientCount
            },
            usdm: {
                isConnected: this.usdMWsManager.isConnected,
                clientCount: this.usdMWsManager.clients.size
            },
            coinm: {
                isConnected: this.coinMWsManager.isConnected,
                clientCount: this.coinMWsManager.clients.size
            },
            isInitialized: this.isInitialized
        };
    }
    // ============= SPOT TRADING METHODS =============
    // Spot account information
    async getSpotAccountInfo() {
        return this.spotRestAPI.getAccountInfo();
    }
    // Spot balances
    async getSpotBalances() {
        return this.spotRestAPI.getBalances();
    }
    async getSpotBalance(asset) {
        return this.spotRestAPI.getBalance(asset);
    }
    // Spot orders
    async getSpotOpenOrders(symbol) {
        return this.spotRestAPI.getOpenOrders(symbol);
    }
    async placeSpotOrder(orderData) {
        return this.spotRestAPI.placeOrder(orderData);
    }
    async cancelSpotOrder(symbol, orderId) {
        return this.spotRestAPI.cancelOrder(symbol, orderId);
    }
    async cancelAllSpotOrders(symbol) {
        return this.spotRestAPI.cancelAllOrders(symbol);
    }
    // Spot market data
    async getSpotPrice(symbol) {
        return this.spotRestAPI.getPrice(symbol);
    }
    async getAllSpotPrices() {
        return this.spotRestAPI.getAllPrices();
    }
    async getSpot24hrTicker(symbol) {
        return this.spotRestAPI.get24hrTicker(symbol);
    }
    async getSpotOrderBook(symbol, limit) {
        return this.spotRestAPI.getOrderBook(symbol, limit);
    }
    async getSpotRecentTrades(symbol, limit) {
        return this.spotRestAPI.getRecentTrades(symbol, limit);
    }
    // ============= USD-M FUTURES METHODS =============
    // USD-M Futures account information
    async getAccountInfo() {
        return this.usdMRestAPI.getAccountInfo();
    }
    async getPositions() {
        return this.usdMRestAPI.getPositions();
    }
    // USD-M Futures orders
    async getOpenOrders(symbol) {
        return this.usdMRestAPI.getOpenOrders(symbol);
    }
    async placeOrder(orderData) {
        return this.usdMRestAPI.placeOrder(orderData);
    }
    async cancelOrder(symbol, orderId) {
        return this.usdMRestAPI.cancelOrder(symbol, orderId);
    }
    async cancelAllOrders(symbol) {
        return this.usdMRestAPI.cancelAllOrders(symbol);
    }
    async setTPSL(symbol, side, takeProfitPrice, stopLossPrice, quantity) {
        return this.usdMRestAPI.setTPSL(symbol, side, takeProfitPrice, stopLossPrice, quantity);
    }
    // Close USD-M Futures position
    async closePosition(symbol, quantity) {
        return this.usdMRestAPI.closePosition(symbol, quantity);
    }
    // USD-M Futures market data
    async getBalance(asset) {
        return this.usdMRestAPI.getBalance(asset);
    }
    async getPrice(symbol) {
        return this.usdMRestAPI.getPrice(symbol);
    }
    async getAllPrices() {
        return this.usdMRestAPI.getAllPrices();
    }
    // ============= COIN-M FUTURES METHODS =============
    // COIN-M Futures account information
    async getCoinMAccountInfo() {
        return this.coinMRestAPI.getAccountInfo();
    }
    async getCoinMPositions() {
        return this.coinMRestAPI.getPositions();
    }
    // COIN-M Futures orders
    async getCoinMOpenOrders(symbol) {
        return this.coinMRestAPI.getOpenOrders(symbol);
    }
    async placeCoinMOrder(orderData) {
        return this.coinMRestAPI.placeOrder(orderData);
    }
    async cancelCoinMOrder(symbol, orderId) {
        return this.coinMRestAPI.cancelOrder(symbol, orderId);
    }
    async cancelAllCoinMOrders(symbol) {
        return this.coinMRestAPI.cancelAllOrders(symbol);
    }
    async setCoinMTPSL(symbol, side, takeProfitPrice, stopLossPrice, quantity) {
        return this.coinMRestAPI.setCoinMTPSL(symbol, side, takeProfitPrice, stopLossPrice, quantity);
    }
    // Close COIN-M Futures position
    async closeCoinMPosition(symbol, quantity) {
        return this.coinMRestAPI.closePosition(symbol, quantity);
    }
    async getCoinMBalance(asset) {
        return this.coinMRestAPI.getBalance(asset);
    }
    async getCoinMPrice(symbol) {
        return this.coinMRestAPI.getPrice(symbol);
    }
    async getAllCoinMPrices() {
        return this.coinMRestAPI.getAllPrices();
    }
    // ============= WEBSOCKET SUBSCRIPTION METHODS =============
    // Spot WebSocket subscriptions
    async subscribeToSpotTicker(symbol) {
        return this.spotWsManager.subscribeToTicker(symbol);
    }
    async subscribeToSpotDepth(symbol, levels) {
        return this.spotWsManager.subscribeToDepth(symbol, levels);
    }
    async subscribeToSpotTrades(symbol) {
        return this.spotWsManager.subscribeToTrades(symbol);
    }
    // Cleanup method
    async disconnect() {
        try {
            console.log('Disconnecting Binance Service...');
            // Disconnect all WebSocket connections in parallel
            await Promise.all([
                this.spotWsManager.disconnect(),
                this.usdMWsManager.disconnect(),
                this.coinMWsManager.disconnect()
            ]);
            this.isInitialized = false;
            console.log('Binance Service disconnected successfully (Spot + USD-M + COIN-M)');
        }
        catch (error) {
            console.error('Error disconnecting Binance Service:', error);
        }
    }
}
exports.default = BinanceService;
//# sourceMappingURL=index.js.map