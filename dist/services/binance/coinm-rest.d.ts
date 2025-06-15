export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}
export interface CoinMAccountInfo {
    totalWalletBalance: number;
    totalUnrealizedProfit: number;
    totalMarginBalance: number;
    totalPositionInitialMargin: number;
    totalOpenOrderInitialMargin: number;
    maxWithdrawAmount: number;
    assets: Array<{
        asset: string;
        walletBalance: number;
        unrealizedProfit: number;
        marginBalance: number;
        maintMargin: number;
        initialMargin: number;
        positionInitialMargin: number;
        openOrderInitialMargin: number;
        maxWithdrawAmount: number;
    }>;
}
export interface CoinMPosition {
    symbol: string;
    positionAmount: number;
    entryPrice: number;
    markPrice: number;
    unrealizedProfit: number;
    percentage: number;
    positionSide: string;
    leverage: number;
    maxNotionalValue: number;
    marginType: string;
    isolatedMargin: number;
    isAutoAddMargin: boolean;
    contractType: string;
}
export interface CoinMOrderData {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'LIMIT' | 'MARKET' | 'STOP' | 'STOP_MARKET' | 'TAKE_PROFIT' | 'TAKE_PROFIT_MARKET';
    quantity: number;
    price?: number;
    stopPrice?: number;
    timeInForce?: 'GTC' | 'IOC' | 'FOK';
    reduceOnly?: boolean;
    closePosition?: boolean;
    positionSide?: 'BOTH' | 'LONG' | 'SHORT';
    workingType?: 'MARK_PRICE' | 'CONTRACT_PRICE';
}
declare class BinanceCoinMRestAPI {
    private client;
    constructor();
    getAccountInfo(): Promise<ApiResponse<CoinMAccountInfo>>;
    getPositions(): Promise<ApiResponse<CoinMPosition[]>>;
    getOpenOrders(symbol?: string): Promise<ApiResponse<any[]>>;
    placeOrder(orderData: CoinMOrderData): Promise<ApiResponse<any>>;
    cancelOrder(symbol: string, orderId: string): Promise<ApiResponse<any>>;
    cancelAllOrders(symbol: string): Promise<ApiResponse<any>>;
    setCoinMTPSL(symbol: string, side: 'BUY' | 'SELL', takeProfitPrice?: number, stopLossPrice?: number, quantity?: number): Promise<ApiResponse<any>>;
    closePosition(symbol: string, quantity?: number): Promise<ApiResponse<any>>;
    getBalance(asset?: string): Promise<ApiResponse<any>>;
    getPrice(symbol: string): Promise<ApiResponse<any>>;
    getAllPrices(): Promise<ApiResponse<any[]>>;
}
export default BinanceCoinMRestAPI;
//# sourceMappingURL=coinm-rest.d.ts.map