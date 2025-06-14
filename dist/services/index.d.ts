import BinanceService from './binance';
declare class ServiceManager {
    private binanceService;
    private isInitialized;
    constructor();
    initialize(): Promise<void>;
    getBinanceService(): BinanceService;
    getStatus(): {
        isInitialized: boolean;
        binance: {
            isConnected: boolean;
            clientCount: number;
            isInitialized: boolean;
        };
    };
    shutdown(): Promise<void>;
}
export default ServiceManager;
//# sourceMappingURL=index.d.ts.map