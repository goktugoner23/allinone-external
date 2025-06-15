"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const binance_1 = require("binance");
const config_1 = __importDefault(require("../../config"));
// Utility function to safely convert to string for parseFloat
function toString(value) {
    if (typeof value === 'string')
        return value;
    if (typeof value === 'number')
        return value.toString();
    return '0';
}
class BinanceCoinMRestAPI {
    constructor() {
        this.client = new binance_1.CoinMClient({
            api_key: config_1.default.binance.apiKey,
            api_secret: config_1.default.binance.apiSecret,
        });
    }
    // Get account information
    async getAccountInfo() {
        try {
            const accountInfo = await this.client.getAccountInformation();
            if (!accountInfo || typeof accountInfo !== 'object') {
                throw new Error('Invalid COIN-M account info response');
            }
            // Use safe property access since the binance library types might be incorrect
            const safeAccountInfo = accountInfo;
            return {
                success: true,
                data: {
                    totalWalletBalance: parseFloat(toString(safeAccountInfo.totalWalletBalance || '0')),
                    totalUnrealizedProfit: parseFloat(toString(safeAccountInfo.totalUnrealizedProfit || '0')),
                    totalMarginBalance: parseFloat(toString(safeAccountInfo.totalMarginBalance || '0')),
                    totalPositionInitialMargin: parseFloat(toString(safeAccountInfo.totalPositionInitialMargin || '0')),
                    totalOpenOrderInitialMargin: parseFloat(toString(safeAccountInfo.totalOpenOrderInitialMargin || '0')),
                    maxWithdrawAmount: parseFloat(toString(safeAccountInfo.maxWithdrawAmount || '0')),
                    assets: (safeAccountInfo.assets || []).map((asset) => ({
                        asset: asset.asset,
                        walletBalance: parseFloat(toString(asset.walletBalance || '0')),
                        unrealizedProfit: parseFloat(toString(asset.unrealizedProfit || '0')),
                        marginBalance: parseFloat(toString(asset.marginBalance || '0')),
                        maintMargin: parseFloat(toString(asset.maintMargin || '0')),
                        initialMargin: parseFloat(toString(asset.initialMargin || '0')),
                        positionInitialMargin: parseFloat(toString(asset.positionInitialMargin || '0')),
                        openOrderInitialMargin: parseFloat(toString(asset.openOrderInitialMargin || '0')),
                        maxWithdrawAmount: parseFloat(toString(asset.maxWithdrawAmount || '0'))
                    }))
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `COIN-M: ${errorMessage}`
            };
        }
    }
    // Get current positions
    async getPositions() {
        try {
            const positions = await this.client.getPositions();
            if (!Array.isArray(positions)) {
                return {
                    success: false,
                    error: 'Invalid COIN-M positions response format'
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
                isAutoAddMargin: pos.isAutoAddMargin || false,
                contractType: 'COIN-M'
            }));
            return {
                success: true,
                data: activePositions
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `COIN-M: ${errorMessage}`
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
                // Get orders for a default COIN-M symbol since the API requires it
                orders = await this.client.getAllOrders({ symbol: 'BTCUSD_PERP' });
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
                cumBase: parseFloat(order.cumBase || '0'), // COIN-M uses cumBase instead of cumQuote
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
                updateTime: order.updateTime,
                contractType: 'COIN-M'
            }));
            return {
                success: true,
                data: formattedOrders
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `COIN-M: ${errorMessage}`
            };
        }
    }
    // Place new order
    async placeOrder(orderData) {
        try {
            const orderParams = {
                symbol: orderData.symbol,
                side: orderData.side,
                type: orderData.type,
                quantity: orderData.quantity, // Keep as number
            };
            // Add optional parameters
            if (orderData.price) {
                orderParams.price = orderData.price; // Keep as number
            }
            if (orderData.stopPrice) {
                orderParams.stopPrice = orderData.stopPrice; // Keep as number
            }
            if (orderData.timeInForce) {
                orderParams.timeInForce = orderData.timeInForce;
            }
            if (orderData.reduceOnly !== undefined) {
                orderParams.reduceOnly = orderData.reduceOnly ? 'true' : 'false'; // Convert to string
            }
            if (orderData.closePosition !== undefined) {
                orderParams.closePosition = orderData.closePosition;
            }
            if (orderData.positionSide) {
                orderParams.positionSide = orderData.positionSide;
            }
            if (orderData.workingType) {
                orderParams.workingType = orderData.workingType;
            }
            console.log('Placing COIN-M order with params:', orderParams);
            const result = await this.client.submitNewOrder(orderParams);
            return {
                success: true,
                data: {
                    ...result,
                    contractType: 'COIN-M'
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error placing COIN-M order:', errorMessage);
            return {
                success: false,
                error: `COIN-M: ${errorMessage}`
            };
        }
    }
    // Cancel specific order
    async cancelOrder(symbol, orderId) {
        try {
            const result = await this.client.cancelOrder({
                symbol,
                orderId: parseInt(orderId)
            });
            return {
                success: true,
                data: {
                    ...result,
                    contractType: 'COIN-M'
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error canceling COIN-M order:', errorMessage);
            return {
                success: false,
                error: `COIN-M: ${errorMessage}`
            };
        }
    }
    // Cancel all orders for symbol
    async cancelAllOrders(symbol) {
        try {
            const result = await this.client.cancelAllOpenOrders({ symbol });
            return {
                success: true,
                data: {
                    ...result,
                    contractType: 'COIN-M'
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error canceling all COIN-M orders:', errorMessage);
            return {
                success: false,
                error: `COIN-M: ${errorMessage}`
            };
        }
    }
    // Set Take Profit and Stop Loss
    async setTPSL(symbol, side, takeProfitPrice, stopLossPrice, quantity) {
        try {
            const orders = [];
            if (takeProfitPrice && quantity) {
                const tpOrder = {
                    symbol,
                    side: (side === 'BUY' ? 'SELL' : 'BUY'), // Properly type the side
                    type: 'TAKE_PROFIT_MARKET',
                    quantity: quantity,
                    stopPrice: takeProfitPrice,
                    reduceOnly: 'true', // Type assertion for binance library
                    timeInForce: 'GTC'
                };
                const tpResult = await this.client.submitNewOrder(tpOrder);
                orders.push(tpResult);
            }
            if (stopLossPrice && quantity) {
                const slOrder = {
                    symbol,
                    side: (side === 'BUY' ? 'SELL' : 'BUY'), // Properly type the side
                    type: 'STOP_MARKET',
                    quantity: quantity,
                    stopPrice: stopLossPrice,
                    reduceOnly: 'true', // Type assertion for binance library
                    timeInForce: 'GTC'
                };
                const slResult = await this.client.submitNewOrder(slOrder);
                orders.push(slResult);
            }
            return {
                success: true,
                data: {
                    orders,
                    contractType: 'COIN-M'
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error setting COIN-M TP/SL:', errorMessage);
            return {
                success: false,
                error: `COIN-M: ${errorMessage}`
            };
        }
    }
    // Get balance for specific asset
    async getBalance(asset = 'BTC') {
        try {
            const accountInfo = await this.client.getAccountInformation();
            const safeAccountInfo = accountInfo;
            const assetBalance = safeAccountInfo.assets?.find((a) => a.asset === asset);
            if (!assetBalance) {
                return {
                    success: false,
                    error: `COIN-M: Asset ${asset} not found`
                };
            }
            return {
                success: true,
                data: {
                    asset: assetBalance.asset,
                    walletBalance: parseFloat(toString(assetBalance.walletBalance || '0')),
                    unrealizedProfit: parseFloat(toString(assetBalance.unrealizedProfit || '0')),
                    marginBalance: parseFloat(toString(assetBalance.marginBalance || '0')),
                    maintMargin: parseFloat(toString(assetBalance.maintMargin || '0')),
                    initialMargin: parseFloat(toString(assetBalance.initialMargin || '0')),
                    positionInitialMargin: parseFloat(toString(assetBalance.positionInitialMargin || '0')),
                    openOrderInitialMargin: parseFloat(toString(assetBalance.openOrderInitialMargin || '0')),
                    maxWithdrawAmount: parseFloat(toString(assetBalance.maxWithdrawAmount || '0')),
                    contractType: 'COIN-M'
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `COIN-M: ${errorMessage}`
            };
        }
    }
    // Get price for specific symbol
    async getPrice(symbol) {
        try {
            const priceData = await this.client.getSymbolPriceTicker({ symbol });
            // Handle both single price and array response
            if (Array.isArray(priceData)) {
                return {
                    success: false,
                    error: 'Unexpected array response for single symbol price'
                };
            }
            return {
                success: true,
                data: {
                    symbol: priceData.symbol,
                    price: parseFloat(toString(priceData.price || '0')), // Use toString helper
                    time: priceData.time,
                    contractType: 'COIN-M'
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `COIN-M: ${errorMessage}`
            };
        }
    }
    // Get all prices
    async getAllPrices() {
        try {
            const pricesData = await this.client.getSymbolPriceTicker();
            // Handle both single price and array response
            const prices = Array.isArray(pricesData) ? pricesData : [pricesData];
            const formattedPrices = prices.map((priceData) => ({
                symbol: priceData.symbol,
                price: parseFloat(toString(priceData.price || '0')), // Use toString helper
                time: priceData.time,
                contractType: 'COIN-M'
            }));
            return {
                success: true,
                data: formattedPrices
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `COIN-M: ${errorMessage}`
            };
        }
    }
}
exports.default = BinanceCoinMRestAPI;
//# sourceMappingURL=coinm-rest.js.map