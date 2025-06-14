declare class BinanceService {
    private wsManager;
    private restAPI;
    private isInitialized;
    constructor();
    initialize(): Promise<void>;
    addWebSocketClient(ws: any): void;
    getConnectionStatus(): {
        isConnected: boolean;
        clientCount: number;
        isInitialized: boolean;
    };
    getAccountInfo(): Promise<import("./rest").ApiResponse<import("./rest").AccountInfo>>;
    getPositions(): Promise<import("./rest").ApiResponse<import("./rest").Position[]>>;
    getOpenOrders(symbol?: string): Promise<import("./rest").ApiResponse<any[]>>;
    placeOrder(orderData: any): Promise<import("./rest").ApiResponse<any>>;
    cancelOrder(symbol: string, orderId: string): Promise<import("./rest").ApiResponse<any>>;
    cancelAllOrders(symbol: string): Promise<import("./rest").ApiResponse<any>>;
    setTPSL(symbol: string, side: 'BUY' | 'SELL', takeProfitPrice?: number, stopLossPrice?: number, quantity?: number): Promise<import("./rest").ApiResponse<any>>;
    getBalance(asset?: string): Promise<import("./rest").ApiResponse<any>>;
    getPrice(symbol: string): Promise<import("./rest").ApiResponse<any>>;
    getAllPrices(): Promise<import("./rest").ApiResponse<any[]>>;
    disconnect(): Promise<void>;
}
export default BinanceService;
//# sourceMappingURL=index.d.ts.map