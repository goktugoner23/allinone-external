export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}
export interface AccountInfo {
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
export interface Position {
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
}
export interface OrderData {
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
declare class BinanceUsdMRestAPI {
    private client;
    constructor();
    getAccountInfo(): Promise<ApiResponse<AccountInfo>>;
    getPositions(): Promise<ApiResponse<Position[]>>;
    getOpenOrders(symbol?: string): Promise<ApiResponse<any[]>>;
    placeOrder(orderData: OrderData): Promise<ApiResponse<any>>;
    cancelOrder(symbol: string, orderId: string): Promise<ApiResponse<any>>;
    cancelAllOrders(symbol: string): Promise<ApiResponse<any>>;
    setTPSL(symbol: string, side: 'BUY' | 'SELL', takeProfitPrice?: number, stopLossPrice?: number, quantity?: number): Promise<ApiResponse<any>>;
    getBalance(asset?: string): Promise<ApiResponse<any>>;
    getPrice(symbol: string): Promise<ApiResponse<any>>;
    getAllPrices(): Promise<ApiResponse<any[]>>;
}
export default BinanceUsdMRestAPI;
//# sourceMappingURL=usdm-rest.d.ts.map