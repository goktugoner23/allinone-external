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
class BinanceUsdMRestAPI {
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
            if (!Array.isArray(positions)) {
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
                positionSide,
                workingType
            };
            // Add reduceOnly for futures orders (but not as string)
            if (reduceOnly) {
                orderParams.reduceOnly = 'true';
            }
            // Add closePosition if specified
            if (closePosition) {
                orderParams.closePosition = 'true';
            }
            // Add price for limit orders
            if (type === 'LIMIT' && price) {
                orderParams.price = String(price);
            }
            // Add stop price for stop orders
            if ((type === 'STOP' || type === 'STOP_MARKET' || type === 'TAKE_PROFIT' || type === 'TAKE_PROFIT_MARKET') && stopPrice) {
                orderParams.stopPrice = String(stopPrice);
            }
            console.log(`[USD-M] Placing order with params:`, orderParams);
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
            console.error('[USD-M] Order placement error:', error);
            // Extract detailed error information
            let errorMessage = 'Unknown error';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            else if (typeof error === 'object' && error !== null) {
                // Handle Binance API error format
                const binanceError = error;
                if (binanceError.code && binanceError.msg) {
                    errorMessage = `Binance Error ${binanceError.code}: ${binanceError.msg}`;
                }
                else if (binanceError.message) {
                    errorMessage = binanceError.message;
                }
                else if (binanceError.body && binanceError.body.msg) {
                    errorMessage = `Binance Error ${binanceError.body.code || 'Unknown'}: ${binanceError.body.msg}`;
                }
            }
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
            console.log(`[USD-M] Setting TP/SL for ${symbol}: TP=${takeProfitPrice}, SL=${stopLossPrice}, Qty=${quantity}`);
            // If no quantity provided, get it from current position
            let orderQuantity = quantity;
            if (!orderQuantity) {
                try {
                    const positionsResult = await this.getPositions();
                    if (positionsResult.success && positionsResult.data) {
                        const position = positionsResult.data.find(pos => pos.symbol === symbol);
                        if (position && position.positionAmount !== 0) {
                            orderQuantity = Math.abs(position.positionAmount);
                            console.log(`[USD-M] Using position quantity: ${orderQuantity}`);
                        }
                    }
                }
                catch (error) {
                    console.warn('[USD-M] Could not get position for auto-quantity:', error);
                }
            }
            if (!orderQuantity) {
                return {
                    success: false,
                    error: 'Quantity is required when no open position exists'
                };
            }
            // Cancel existing TP/SL orders for this symbol first
            try {
                const openOrders = await this.getOpenOrders(symbol);
                if (openOrders.success && openOrders.data) {
                    const tpslOrders = openOrders.data.filter((order) => ['TAKE_PROFIT_MARKET', 'STOP_MARKET', 'TAKE_PROFIT', 'STOP'].includes(order.type));
                    for (const order of tpslOrders) {
                        try {
                            await this.cancelOrder(symbol, order.orderId.toString());
                        }
                        catch (cancelError) {
                            console.warn(`[USD-M] Failed to cancel order ${order.orderId}:`, cancelError);
                        }
                    }
                }
            }
            catch (error) {
                console.warn('[USD-M] Error canceling existing TP/SL orders:', error);
            }
            const results = [];
            // Determine the correct side based on current position
            // For LONG position (positive amount), we need SELL orders to close
            // For SHORT position (negative amount), we need BUY orders to close
            const positionsResult = await this.getPositions();
            let closingSide = 'SELL'; // Default for LONG position
            if (positionsResult.success && positionsResult.data) {
                const position = positionsResult.data.find(pos => pos.symbol === symbol);
                if (position) {
                    closingSide = position.positionAmount > 0 ? 'SELL' : 'BUY';
                    console.log(`[USD-M] Position amount: ${position.positionAmount}, closing side: ${closingSide}`);
                }
            }
            // Place Take Profit order
            if (takeProfitPrice) {
                console.log(`[USD-M] Placing Take Profit order: ${takeProfitPrice}`);
                const tpOrder = await this.placeOrder({
                    symbol,
                    side: closingSide,
                    type: 'TAKE_PROFIT_MARKET',
                    quantity: orderQuantity,
                    stopPrice: takeProfitPrice,
                    reduceOnly: true,
                    timeInForce: 'GTC'
                });
                results.push({
                    type: 'TAKE_PROFIT',
                    success: tpOrder.success,
                    data: tpOrder.data,
                    error: tpOrder.error
                });
            }
            // Place Stop Loss order
            if (stopLossPrice) {
                console.log(`[USD-M] Placing Stop Loss order: ${stopLossPrice}`);
                const slOrder = await this.placeOrder({
                    symbol,
                    side: closingSide,
                    type: 'STOP_MARKET',
                    quantity: orderQuantity,
                    stopPrice: stopLossPrice,
                    reduceOnly: true,
                    timeInForce: 'GTC'
                });
                results.push({
                    type: 'STOP_LOSS',
                    success: slOrder.success,
                    data: slOrder.data,
                    error: slOrder.error
                });
            }
            const allSuccessful = results.every(result => result.success);
            return {
                success: allSuccessful,
                data: results,
                error: allSuccessful ? undefined : 'Some orders failed to place'
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('[USD-M] Error in setTPSL:', errorMessage);
            return {
                success: false,
                error: errorMessage,
                data: [
                    ...(takeProfitPrice ? [{ type: 'TAKE_PROFIT', success: false, error: errorMessage }] : []),
                    ...(stopLossPrice ? [{ type: 'STOP_LOSS', success: false, error: errorMessage }] : [])
                ]
            };
        }
    }
    // Close position by placing a market order
    async closePosition(symbol, quantity) {
        try {
            // Get current position to determine side and quantity
            const positionsResult = await this.getPositions();
            if (!positionsResult.success || !positionsResult.data) {
                return {
                    success: false,
                    error: 'Failed to get current positions'
                };
            }
            const position = positionsResult.data.find(pos => pos.symbol === symbol);
            if (!position || position.positionAmount === 0) {
                return {
                    success: false,
                    error: 'No open position found for this symbol'
                };
            }
            const positionAmount = Math.abs(position.positionAmount);
            const closeQuantity = quantity || positionAmount;
            const closeSide = position.positionAmount > 0 ? 'SELL' : 'BUY'; // Opposite side to close
            const orderParams = {
                symbol,
                side: closeSide,
                type: 'MARKET',
                quantity: closeQuantity,
                reduceOnly: 'true'
            };
            const result = await this.client.submitNewOrder(orderParams);
            return {
                success: true,
                data: {
                    orderId: result.orderId,
                    symbol: result.symbol,
                    status: result.status,
                    side: result.side,
                    type: result.type,
                    quantity: toNumber(result.origQty),
                    executedQty: toNumber(result.executedQty),
                    price: toNumber(result.price),
                    reduceOnly: result.reduceOnly,
                    positionSide: result.positionSide,
                    time: result.updateTime
                }
            };
        }
        catch (error) {
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
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: errorMessage
            };
        }
    }
}
exports.default = BinanceUsdMRestAPI;
//# sourceMappingURL=usdm-rest.js.map