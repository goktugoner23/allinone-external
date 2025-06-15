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
class BinanceSpotRestAPI {
    constructor() {
        this.client = new binance_1.MainClient({
            api_key: config_1.default.binance.apiKey,
            api_secret: config_1.default.binance.apiSecret,
        });
    }
    // Get account information
    async getAccountInfo() {
        try {
            const accountInfo = await this.client.getAccountInformation();
            if (!accountInfo || typeof accountInfo !== 'object') {
                throw new Error('Invalid Spot account info response');
            }
            return {
                success: true,
                data: {
                    makerCommission: accountInfo.makerCommission || 0,
                    takerCommission: accountInfo.takerCommission || 0,
                    buyerCommission: accountInfo.buyerCommission || 0,
                    sellerCommission: accountInfo.sellerCommission || 0,
                    canTrade: accountInfo.canTrade || false,
                    canWithdraw: accountInfo.canWithdraw || false,
                    canDeposit: accountInfo.canDeposit || false,
                    updateTime: accountInfo.updateTime || 0,
                    accountType: accountInfo.accoountType || 'SPOT', // Fix typo in binance library
                    balances: (accountInfo.balances || []).map((balance) => ({
                        asset: balance.asset,
                        free: parseFloat(toString(balance.free)),
                        locked: parseFloat(toString(balance.locked))
                    })),
                    permissions: accountInfo.permissions || []
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `Spot: ${errorMessage}`
            };
        }
    }
    // Get all balances
    async getBalances() {
        try {
            const accountInfo = await this.client.getAccountInformation();
            if (!accountInfo || !accountInfo.balances) {
                throw new Error('Invalid Spot account info response');
            }
            const balances = accountInfo.balances
                .map((balance) => ({
                asset: balance.asset,
                free: parseFloat(toString(balance.free)),
                locked: parseFloat(toString(balance.locked)),
                total: parseFloat(toString(balance.free)) + parseFloat(toString(balance.locked))
            }))
                .filter((balance) => balance.total > 0); // Only return non-zero balances
            return {
                success: true,
                data: balances
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `Spot: ${errorMessage}`
            };
        }
    }
    // Get balance for specific asset
    async getBalance(asset) {
        try {
            const accountInfo = await this.client.getAccountInformation();
            const assetBalance = accountInfo.balances?.find((b) => b.asset === asset);
            if (!assetBalance) {
                return {
                    success: false,
                    error: `Spot: Asset ${asset} not found`
                };
            }
            const free = parseFloat(toString(assetBalance.free));
            const locked = parseFloat(toString(assetBalance.locked));
            return {
                success: true,
                data: {
                    asset: assetBalance.asset,
                    free,
                    locked,
                    total: free + locked
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `Spot: ${errorMessage}`
            };
        }
    }
    // Get open orders
    async getOpenOrders(symbol) {
        try {
            let orders;
            if (symbol) {
                orders = await this.client.getOpenOrders({ symbol });
            }
            else {
                orders = await this.client.getOpenOrders();
            }
            const formattedOrders = Array.isArray(orders) ? orders.map((order) => ({
                orderId: order.orderId,
                symbol: order.symbol,
                status: order.status,
                clientOrderId: order.clientOrderId,
                price: parseFloat(order.price || '0'),
                origQty: parseFloat(order.origQty || '0'),
                executedQty: parseFloat(order.executedQty || '0'),
                cummulativeQuoteQty: parseFloat(order.cummulativeQuoteQty || '0'),
                timeInForce: order.timeInForce,
                type: order.type,
                side: order.side,
                stopPrice: parseFloat(order.stopPrice || '0'),
                icebergQty: parseFloat(order.icebergQty || '0'),
                time: order.time,
                updateTime: order.updateTime,
                isWorking: order.isWorking,
                origQuoteOrderQty: parseFloat(order.origQuoteOrderQty || '0'),
                contractType: 'SPOT'
            })) : [];
            return {
                success: true,
                data: formattedOrders
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `Spot: ${errorMessage}`
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
                quantity: orderData.quantity.toString(),
            };
            // Add optional parameters
            if (orderData.price) {
                orderParams.price = orderData.price.toString();
            }
            if (orderData.stopPrice) {
                orderParams.stopPrice = orderData.stopPrice.toString();
            }
            if (orderData.timeInForce) {
                orderParams.timeInForce = orderData.timeInForce;
            }
            if (orderData.icebergQty) {
                orderParams.icebergQty = orderData.icebergQty.toString();
            }
            if (orderData.newOrderRespType) {
                orderParams.newOrderRespType = orderData.newOrderRespType;
            }
            console.log('Placing Spot order with params:', orderParams);
            const result = await this.client.submitNewOrder(orderParams);
            return {
                success: true,
                data: {
                    ...result,
                    contractType: 'SPOT'
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error placing Spot order:', errorMessage);
            return {
                success: false,
                error: `Spot: ${errorMessage}`
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
                    contractType: 'SPOT'
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error canceling Spot order:', errorMessage);
            return {
                success: false,
                error: `Spot: ${errorMessage}`
            };
        }
    }
    // Cancel all orders for symbol
    async cancelAllOrders(symbol) {
        try {
            // Get all open orders first, then cancel them individually
            const openOrders = await this.client.getOpenOrders({ symbol });
            const cancelResults = [];
            if (Array.isArray(openOrders) && openOrders.length > 0) {
                for (const order of openOrders) {
                    try {
                        const cancelResult = await this.client.cancelOrder({
                            symbol,
                            orderId: order.orderId
                        });
                        cancelResults.push(cancelResult);
                    }
                    catch (cancelError) {
                        console.warn(`Failed to cancel order ${order.orderId}:`, cancelError);
                    }
                }
            }
            return {
                success: true,
                data: {
                    canceledOrders: cancelResults,
                    contractType: 'SPOT'
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error canceling all Spot orders:', errorMessage);
            return {
                success: false,
                error: `Spot: ${errorMessage}`
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
                    price: parseFloat(toString(priceData.price || '0')),
                    contractType: 'SPOT'
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `Spot: ${errorMessage}`
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
                price: parseFloat(toString(priceData.price || '0')),
                contractType: 'SPOT'
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
                error: `Spot: ${errorMessage}`
            };
        }
    }
    // Get 24hr ticker statistics
    async get24hrTicker(symbol) {
        try {
            let tickerData;
            if (symbol) {
                tickerData = await this.client.get24hrChangeStatististics({ symbol });
            }
            else {
                tickerData = await this.client.get24hrChangeStatististics();
            }
            return {
                success: true,
                data: {
                    ...tickerData,
                    contractType: 'SPOT'
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `Spot: ${errorMessage}`
            };
        }
    }
    // Get order book depth
    async getOrderBook(symbol, limit = 100) {
        try {
            // Ensure limit is one of the allowed values
            const allowedLimits = [5, 10, 20, 50, 100, 500, 1000, 5000];
            const validLimit = allowedLimits.includes(limit) ? limit : 100;
            const orderBook = await this.client.getOrderBook({ symbol, limit: validLimit });
            return {
                success: true,
                data: {
                    ...orderBook,
                    contractType: 'SPOT'
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `Spot: ${errorMessage}`
            };
        }
    }
    // Get recent trades
    async getRecentTrades(symbol, limit = 500) {
        try {
            const trades = await this.client.getRecentTrades({ symbol, limit });
            const formattedTrades = Array.isArray(trades) ? trades.map((trade) => ({
                ...trade,
                contractType: 'SPOT'
            })) : [];
            return {
                success: true,
                data: formattedTrades
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `Spot: ${errorMessage}`
            };
        }
    }
}
exports.default = BinanceSpotRestAPI;
//# sourceMappingURL=spot-rest.js.map