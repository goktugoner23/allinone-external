"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const binance_1 = __importDefault(require("./binance"));
class ServiceManager {
    constructor() {
        this.isInitialized = false;
        this.binanceService = new binance_1.default();
        this.isInitialized = false;
    }
    async initialize() {
        try {
            console.log('Initializing all services...');
            await this.binanceService.initialize();
            this.isInitialized = true;
            console.log('All services initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize services:', error);
            throw error;
        }
    }
    getBinanceService() {
        return this.binanceService;
    }
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            binance: this.binanceService.getConnectionStatus()
        };
    }
    async shutdown() {
        try {
            console.log('Shutting down services...');
            await this.binanceService.disconnect();
            console.log('All services shut down successfully');
        }
        catch (error) {
            console.error('Error shutting down services:', error);
        }
    }
}
exports.default = ServiceManager;
//# sourceMappingURL=index.js.map