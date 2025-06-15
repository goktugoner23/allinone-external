import BinanceService from './binance';
declare class ServiceManager {
    private static instance;
    private binanceService;
    private isInitialized;
    private constructor();
    static getInstance(): ServiceManager;
    initialize(): Promise<void>;
    getBinanceService(): BinanceService;
    getStatus(): {
        isInitialized: boolean;
        binance: import("./binance").ConnectionStatus;
    };
    shutdown(): Promise<void>;
}
export default ServiceManager;
//# sourceMappingURL=index.d.ts.map