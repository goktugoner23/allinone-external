export interface ConnectionStatus {
    spot: {
        isConnected: boolean;
        clientCount: number;
    };
    usdm: {
        isConnected: boolean;
        clientCount: number;
    };
    coinm: {
        isConnected: boolean;
        clientCount: number;
    };
    isInitialized: boolean;
}
declare class BinanceService {
    private spotWsManager;
    private spotRestAPI;
    private usdMWsManager;
    private usdMRestAPI;
    private coinMWsManager;
    private coinMRestAPI;
    private isInitialized;
    constructor();
    initialize(): Promise<void>;
    addWebSocketClient(ws: any): void;
    getConnectionStatus(): ConnectionStatus;
    getSpotAccountInfo(): Promise<import("./spot-rest").ApiResponse<import("./spot-rest").SpotAccountInfo>>;
    getSpotBalances(): Promise<import("./spot-rest").ApiResponse<import("./spot-rest").SpotBalance[]>>;
    getSpotBalance(asset: string): Promise<import("./spot-rest").ApiResponse<import("./spot-rest").SpotBalance>>;
    getSpotOpenOrders(symbol?: string): Promise<import("./spot-rest").ApiResponse<any[]>>;
    placeSpotOrder(orderData: any): Promise<import("./spot-rest").ApiResponse<any>>;
    cancelSpotOrder(symbol: string, orderId: string): Promise<import("./spot-rest").ApiResponse<any>>;
    cancelAllSpotOrders(symbol: string): Promise<import("./spot-rest").ApiResponse<any>>;
    getSpotPrice(symbol: string): Promise<import("./spot-rest").ApiResponse<any>>;
    getAllSpotPrices(): Promise<import("./spot-rest").ApiResponse<any[]>>;
    getSpot24hrTicker(symbol?: string): Promise<import("./spot-rest").ApiResponse<any>>;
    getSpotOrderBook(symbol: string, limit?: number): Promise<import("./spot-rest").ApiResponse<any>>;
    getSpotRecentTrades(symbol: string, limit?: number): Promise<import("./spot-rest").ApiResponse<any[]>>;
    getAccountInfo(): Promise<import("./usdm-rest").ApiResponse<import("./usdm-rest").AccountInfo>>;
    getPositions(): Promise<import("./usdm-rest").ApiResponse<import("./usdm-rest").Position[]>>;
    getOpenOrders(symbol?: string): Promise<import("./usdm-rest").ApiResponse<any[]>>;
    placeOrder(orderData: any): Promise<import("./usdm-rest").ApiResponse<any>>;
    cancelOrder(symbol: string, orderId: string): Promise<import("./usdm-rest").ApiResponse<any>>;
    cancelAllOrders(symbol: string): Promise<import("./usdm-rest").ApiResponse<any>>;
    setTPSL(symbol: string, side: 'BUY' | 'SELL', takeProfitPrice?: number, stopLossPrice?: number, quantity?: number): Promise<import("./usdm-rest").ApiResponse<any>>;
    closePosition(symbol: string, quantity?: number): Promise<import("./usdm-rest").ApiResponse<any>>;
    getBalance(asset?: string): Promise<import("./usdm-rest").ApiResponse<any>>;
    getPrice(symbol: string): Promise<import("./usdm-rest").ApiResponse<any>>;
    getAllPrices(): Promise<import("./usdm-rest").ApiResponse<any[]>>;
    getCoinMAccountInfo(): Promise<import("./coinm-rest").ApiResponse<import("./coinm-rest").CoinMAccountInfo>>;
    getCoinMPositions(): Promise<import("./coinm-rest").ApiResponse<import("./coinm-rest").CoinMPosition[]>>;
    getCoinMOpenOrders(symbol?: string): Promise<import("./coinm-rest").ApiResponse<any[]>>;
    placeCoinMOrder(orderData: any): Promise<import("./coinm-rest").ApiResponse<any>>;
    cancelCoinMOrder(symbol: string, orderId: string): Promise<import("./coinm-rest").ApiResponse<any>>;
    cancelAllCoinMOrders(symbol: string): Promise<import("./coinm-rest").ApiResponse<any>>;
    setCoinMTPSL(symbol: string, side: 'BUY' | 'SELL', takeProfitPrice?: number, stopLossPrice?: number, quantity?: number): Promise<import("./coinm-rest").ApiResponse<any>>;
    closeCoinMPosition(symbol: string, quantity?: number): Promise<import("./coinm-rest").ApiResponse<any>>;
    getCoinMBalance(asset?: string): Promise<import("./coinm-rest").ApiResponse<any>>;
    getCoinMPrice(symbol: string): Promise<import("./coinm-rest").ApiResponse<any>>;
    getAllCoinMPrices(): Promise<import("./coinm-rest").ApiResponse<any[]>>;
    subscribeToSpotTicker(symbol: string): Promise<void>;
    subscribeToSpotDepth(symbol: string, levels?: string): Promise<void>;
    subscribeToSpotTrades(symbol: string): Promise<void>;
    disconnect(): Promise<void>;
}
export default BinanceService;
//# sourceMappingURL=index.d.ts.map