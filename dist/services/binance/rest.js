"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const binance_1 = require("binance");
const config_1 = __importDefault(require("../../config"));
// Utility function to safely convert numberInString to number
function toNumber(value) {
    if (typeof value === 'number')
        return value;
    if (typeof value === 'string')
        return parseFloat(value);
    return 0;
}
class BinanceRestAPI {
    constructor() {
        this.client = new binance_1.USDMClient({
            api_key: config_1.default.binance.apiKey,
            api_secret: config_1.default.binance.apiSecret,
        });
    }
    // Get account information
    async getAccountInfo() {
        try {
            const accountInfo = await this.client.getAccountInformation();
            console.log('Account info response:', accountInfo);
            if (!accountInfo || typeof accountInfo !== 'object') {
                throw new Error('Invalid account info response');
            }
            return {
                success: true,
                data: {
                    totalWalletBalance: parseFloat(String(accountInfo.totalWalletBalance || '0')),
                    totalUnrealizedProfit: parseFloat(String(accountInfo.totalUnrealizedProfit || '0')),
                    totalMarginBalance: parseFloat(String(accountInfo.totalMarginBalance || '0')),
                    totalPositionInitialMargin: parseFloat(String(accountInfo.totalPositionInitialMargin || '0')),
                    totalOpenOrderInitialMargin: parseFloat(String(accountInfo.totalOpenOrderInitialMargin || '0')),
                    maxWithdrawAmount: parseFloat(String(accountInfo.maxWithdrawAmount || '0')),
                    assets: (accountInfo.assets || []).map((asset) => ({
                        asset: asset.asset,
                        walletBalance: parseFloat(asset.walletBalance || '0'),
                        unrealizedProfit: parseFloat(asset.unrealizedProfit || '0'),
                        marginBalance: parseFloat(asset.marginBalance || '0'),
                        maintMargin: parseFloat(asset.maintMargin || '0'),
                        initialMargin: parseFloat(asset.initialMargin || '0'),
                        positionInitialMargin: parseFloat(asset.positionInitialMargin || '0'),
                        openOrderInitialMargin: parseFloat(asset.openOrderInitialMargin || '0'),
                        maxWithdrawAmount: parseFloat(asset.maxWithdrawAmount || '0')
                    }))
                }
            };
        }
        catch (error) {
            console.error('Error getting account info:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: errorMessage
            };
        }
    }
    // Get current positions
    async getPositions() {
        try {
            const positions = await this.client.getPositions();
            console.log('Positions response:', positions);
            if (!Array.isArray(positions)) {
                console.error('Positions response is not an array:', positions);
                return {
                    success: false,
                    error: 'Invalid positions response format'
                };
            }
            const activePositions = positions
                .filter((pos) => parseFloat(pos.positionAmt || '0') !== 0)
                .map((pos) => ({
                symbol: pos.symbol,
                positionAmount: parseFloat(pos.positionAmt || '0'),
                entryPrice: parseFloat(pos.entryPrice || '0'),
                markPrice: parseFloat(pos.markPrice || '0'),
                unrealizedProfit: parseFloat(pos.unRealizedProfit || '0'),
                percentage: parseFloat(pos.percentage || '0'),
                positionSide: pos.positionSide || 'BOTH',
                leverage: parseFloat(pos.leverage || '1'),
                maxNotionalValue: parseFloat(pos.maxNotionalValue || '0'),
                marginType: pos.marginType || 'cross',
                isolatedMargin: parseFloat(pos.isolatedMargin || '0'),
                isAutoAddMargin: pos.isAutoAddMargin || false
            }));
            return {
                success: true,
                data: activePositions
            };
        }
        catch (error) {
            console.error('Error getting positions:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: errorMessage
            };
        }
    }
    // Get open orders
    async getOpenOrders(symbol) {
        try {
            let orders;
            if (symbol) {
                orders = await this.client.getAllOrders({ symbol });
            }
            else {
                // Get orders for a default symbol since the API requires it
                orders = await this.client.getAllOrders({ symbol: 'BTCUSDT' });
            }
            // Filter for open orders only
            const openOrders = Array.isArray(orders) ? orders.filter((order) => order.status === 'NEW' || order.status === 'PARTIALLY_FILLED') : [];
            const formattedOrders = openOrders.map((order) => ({
                orderId: order.orderId,
                symbol: order.symbol,
                status: order.status,
                clientOrderId: order.clientOrderId,
                price: parseFloat(order.price || '0'),
                avgPrice: parseFloat(order.avgPrice || '0'),
                origQty: parseFloat(order.origQty || '0'),
                executedQty: parseFloat(order.executedQty || '0'),
                cumQuote: parseFloat(order.cumQuote || '0'),
                timeInForce: order.timeInForce,
                type: order.type,
                reduceOnly: order.reduceOnly,
                closePosition: order.closePosition,
                side: order.side,
                positionSide: order.positionSide,
                stopPrice: parseFloat(order.stopPrice || '0'),
                workingType: order.workingType,
                priceProtect: order.priceProtect,
                origType: order.origType,
                time: order.time,
                updateTime: order.updateTime
            }));
            return {
                success: true,
                data: formattedOrders
            };
        }
        catch (error) {
            console.error('Error getting open orders:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: errorMessage
            };
        }
    }
    // Place a new order
    async placeOrder(orderData) {
        try {
            const { symbol, side, type, quantity, price, stopPrice, timeInForce = 'GTC', reduceOnly = false, closePosition = false, positionSide = 'BOTH', workingType = 'CONTRACT_PRICE' } = orderData;
            const orderParams = {
                symbol,
                side,
                type,
                quantity: String(quantity),
                timeInForce,
                reduceOnly,
                closePosition,
                positionSide,
                workingType
            };
            // Add price for limit orders
            if (type === 'LIMIT' && price) {
                orderParams.price = String(price);
            }
            // Add stop price for stop orders
            if ((type === 'STOP' || type === 'STOP_MARKET' || type === 'TAKE_PROFIT' || type === 'TAKE_PROFIT_MARKET') && stopPrice) {
                orderParams.stopPrice = String(stopPrice);
            }
            const result = await this.client.submitNewOrder(orderParams);
            return {
                success: true,
                data: {
                    orderId: result.orderId,
                    symbol: result.symbol,
                    status: result.status,
                    clientOrderId: result.clientOrderId,
                    price: toNumber(result.price),
                    origQty: toNumber(result.origQty),
                    executedQty: toNumber(result.executedQty),
                    cumQuote: toNumber(result.cumQuote),
                    timeInForce: result.timeInForce,
                    type: result.type,
                    reduceOnly: result.reduceOnly,
                    closePosition: result.closePosition,
                    side: result.side,
                    positionSide: result.positionSide,
                    stopPrice: toNumber(result.stopPrice),
                    workingType: result.workingType,
                    time: result.updateTime
                }
            };
        }
        catch (error) {
            console.error('Error placing order:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: errorMessage
            };
        }
    }
    // Cancel an order
    async cancelOrder(symbol, orderId) {
        try {
            const result = await this.client.cancelOrder({ symbol, orderId: parseInt(orderId) });
            return {
                success: true,
                data: {
                    orderId: result.orderId,
                    symbol: result.symbol,
                    status: result.status,
                    clientOrderId: result.clientOrderId,
                    price: toNumber(result.price),
                    origQty: toNumber(result.origQty),
                    executedQty: toNumber(result.executedQty),
                    cumQuote: toNumber(result.cumQuote),
                    timeInForce: result.timeInForce,
                    type: result.type,
                    reduceOnly: result.reduceOnly,
                    closePosition: result.closePosition,
                    side: result.side,
                    positionSide: result.positionSide,
                    stopPrice: toNumber(result.stopPrice),
                    workingType: result.workingType
                }
            };
        }
        catch (error) {
            console.error('Error canceling order:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: errorMessage
            };
        }
    }
    // Cancel all open orders for a symbol
    async cancelAllOrders(symbol) {
        try {
            const result = await this.client.cancelAllOpenOrders({ symbol });
            return {
                success: true,
                data: result
            };
        }
        catch (error) {
            console.error('Error canceling all orders:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: errorMessage
            };
        }
    }
    // Set Take Profit and Stop Loss
    async setTPSL(symbol, side, takeProfitPrice, stopLossPrice, quantity) {
        try {
            const results = [];
            // Place Take Profit order
            if (takeProfitPrice && quantity) {
                const tpOrder = await this.placeOrder({
                    symbol,
                    side: side === 'BUY' ? 'SELL' : 'BUY', // Opposite side for TP
                    type: 'TAKE_PROFIT_MARKET',
                    quantity,
                    stopPrice: takeProfitPrice,
                    reduceOnly: true
                });
                results.push({ type: 'TAKE_PROFIT', ...tpOrder });
            }
            // Place Stop Loss order
            if (stopLossPrice && quantity) {
                const slOrder = await this.placeOrder({
                    symbol,
                    side: side === 'BUY' ? 'SELL' : 'BUY', // Opposite side for SL
                    type: 'STOP_MARKET',
                    quantity,
                    stopPrice: stopLossPrice,
                    reduceOnly: true
                });
                results.push({ type: 'STOP_LOSS', ...slOrder });
            }
            return {
                success: true,
                data: results
            };
        }
        catch (error) {
            console.error('Error setting TP/SL:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: errorMessage
            };
        }
    }
    // Get balance for specific asset
    async getBalance(asset = 'USDT') {
        try {
            const accountInfo = await this.client.getAccountInformation();
            const assetBalance = accountInfo.assets?.find((a) => a.asset === asset);
            if (!assetBalance) {
                return {
                    success: false,
                    error: `Asset ${asset} not found`
                };
            }
            return {
                success: true,
                data: {
                    asset: assetBalance.asset,
                    walletBalance: toNumber(assetBalance.walletBalance),
                    unrealizedProfit: toNumber(assetBalance.unrealizedProfit),
                    marginBalance: toNumber(assetBalance.marginBalance),
                    maintMargin: toNumber(assetBalance.maintMargin),
                    initialMargin: toNumber(assetBalance.initialMargin),
                    positionInitialMargin: toNumber(assetBalance.positionInitialMargin),
                    openOrderInitialMargin: toNumber(assetBalance.openOrderInitialMargin),
                    maxWithdrawAmount: toNumber(assetBalance.maxWithdrawAmount)
                }
            };
        }
        catch (error) {
            console.error('Error getting balance:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: errorMessage
            };
        }
    }
    // Get symbol price
    async getPrice(symbol) {
        try {
            const price = await this.client.getSymbolPriceTicker({ symbol });
            return {
                success: true,
                data: {
                    symbol: price.symbol,
                    price: toNumber(price.price),
                    time: Date.now()
                }
            };
        }
        catch (error) {
            console.error('Error getting price:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: errorMessage
            };
        }
    }
    // Get all symbol prices
    async getAllPrices() {
        try {
            const prices = await this.client.getSymbolPriceTicker();
            const formattedPrices = Array.isArray(prices)
                ? prices.map((price) => ({
                    symbol: price.symbol,
                    price: toNumber(price.price)
                }))
                : [{
                        symbol: prices.symbol,
                        price: toNumber(prices.price)
                    }];
            return {
                success: true,
                data: formattedPrices
            };
        }
        catch (error) {
            console.error('Error getting all prices:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: errorMessage
            };
        }
    }
}
exports.default = BinanceRestAPI;
//# sourceMappingURL=rest.js.map