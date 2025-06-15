export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}
export interface SpotAccountInfo {
    makerCommission: number;
    takerCommission: number;
    buyerCommission: number;
    sellerCommission: number;
    canTrade: boolean;
    canWithdraw: boolean;
    canDeposit: boolean;
    updateTime: number;
    accountType: string;
    balances: Array<{
        asset: string;
        free: number;
        locked: number;
    }>;
    permissions: string[];
}
export interface SpotBalance {
    asset: string;
    free: number;
    locked: number;
    total: number;
}
export interface SpotOrderData {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'LIMIT' | 'MARKET' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT' | 'LIMIT_MAKER';
    quantity: number;
    price?: number;
    stopPrice?: number;
    timeInForce?: 'GTC' | 'IOC' | 'FOK';
    icebergQty?: number;
    newOrderRespType?: 'ACK' | 'RESULT' | 'FULL';
}
declare class BinanceSpotRestAPI {
    private client;
    constructor();
    getAccountInfo(): Promise<ApiResponse<SpotAccountInfo>>;
    getBalances(): Promise<ApiResponse<SpotBalance[]>>;
    getBalance(asset: string): Promise<ApiResponse<SpotBalance>>;
    getOpenOrders(symbol?: string): Promise<ApiResponse<any[]>>;
    placeOrder(orderData: SpotOrderData): Promise<ApiResponse<any>>;
    cancelOrder(symbol: string, orderId: string): Promise<ApiResponse<any>>;
    cancelAllOrders(symbol: string): Promise<ApiResponse<any>>;
    getPrice(symbol: string): Promise<ApiResponse<any>>;
    getAllPrices(): Promise<ApiResponse<any[]>>;
    get24hrTicker(symbol?: string): Promise<ApiResponse<any>>;
    getOrderBook(symbol: string, limit?: number): Promise<ApiResponse<any>>;
    getRecentTrades(symbol: string, limit?: number): Promise<ApiResponse<any[]>>;
}
export default BinanceSpotRestAPI;
//# sourceMappingURL=spot-rest.d.ts.map