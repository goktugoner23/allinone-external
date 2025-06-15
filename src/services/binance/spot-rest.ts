import { MainClient } from 'binance';
import config from '../../config';

// Utility function to safely convert to string for parseFloat
function toString(value: any): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  return '0';
}

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

class BinanceSpotRestAPI {
  private client: MainClient;

  constructor() {
    this.client = new MainClient({
      api_key: config.binance.apiKey,
      api_secret: config.binance.apiSecret,
    });
  }

  // Get account information
  async getAccountInfo(): Promise<ApiResponse<SpotAccountInfo>> {
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
          accountType: (accountInfo as any).accoountType || 'SPOT', // Fix typo in binance library
          balances: (accountInfo.balances || []).map((balance: any) => ({
            asset: balance.asset,
            free: parseFloat(toString(balance.free)),
            locked: parseFloat(toString(balance.locked))
          })),
          permissions: accountInfo.permissions || []
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Spot: ${errorMessage}`
      };
    }
  }

  // Get all balances
  async getBalances(): Promise<ApiResponse<SpotBalance[]>> {
    try {
      const accountInfo = await this.client.getAccountInformation();
      
      if (!accountInfo || !accountInfo.balances) {
        throw new Error('Invalid Spot account info response');
      }

      const balances = accountInfo.balances
        .map((balance: any) => ({
          asset: balance.asset,
          free: parseFloat(toString(balance.free)),
          locked: parseFloat(toString(balance.locked)),
          total: parseFloat(toString(balance.free)) + parseFloat(toString(balance.locked))
        }))
        .filter((balance: SpotBalance) => balance.total > 0); // Only return non-zero balances

      return {
        success: true,
        data: balances
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Spot: ${errorMessage}`
      };
    }
  }

  // Get balance for specific asset
  async getBalance(asset: string): Promise<ApiResponse<SpotBalance>> {
    try {
      const accountInfo = await this.client.getAccountInformation();
      const assetBalance = accountInfo.balances?.find((b: any) => b.asset === asset);
      
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Spot: ${errorMessage}`
      };
    }
  }

  // Get open orders
  async getOpenOrders(symbol?: string): Promise<ApiResponse<any[]>> {
    try {
      let orders: any[];
      if (symbol) {
        orders = await this.client.getOpenOrders({ symbol });
      } else {
        orders = await this.client.getOpenOrders();
      }

      const formattedOrders = Array.isArray(orders) ? orders.map((order: any) => ({
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Spot: ${errorMessage}`
      };
    }
  }

  // Place new order
  async placeOrder(orderData: SpotOrderData): Promise<ApiResponse<any>> {
    try {
      const orderParams: any = {
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error placing Spot order:', errorMessage);
      return {
        success: false,
        error: `Spot: ${errorMessage}`
      };
    }
  }

  // Cancel specific order
  async cancelOrder(symbol: string, orderId: string): Promise<ApiResponse<any>> {
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error canceling Spot order:', errorMessage);
      return {
        success: false,
        error: `Spot: ${errorMessage}`
      };
    }
  }

  // Cancel all orders for symbol
  async cancelAllOrders(symbol: string): Promise<ApiResponse<any>> {
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
          } catch (cancelError) {
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error canceling all Spot orders:', errorMessage);
      return {
        success: false,
        error: `Spot: ${errorMessage}`
      };
    }
  }

  // Get price for specific symbol
  async getPrice(symbol: string): Promise<ApiResponse<any>> {
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Spot: ${errorMessage}`
      };
    }
  }

  // Get all prices
  async getAllPrices(): Promise<ApiResponse<any[]>> {
    try {
      const pricesData = await this.client.getSymbolPriceTicker();
      
      // Handle both single price and array response
      const prices = Array.isArray(pricesData) ? pricesData : [pricesData];

      const formattedPrices = prices.map((priceData: any) => ({
        symbol: priceData.symbol,
        price: parseFloat(toString(priceData.price || '0')),
        contractType: 'SPOT'
      }));

      return {
        success: true,
        data: formattedPrices
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Spot: ${errorMessage}`
      };
    }
  }

  // Get 24hr ticker statistics
  async get24hrTicker(symbol?: string): Promise<ApiResponse<any>> {
    try {
      let tickerData: any;
      if (symbol) {
        tickerData = await this.client.get24hrChangeStatististics({ symbol });
      } else {
        tickerData = await this.client.get24hrChangeStatististics();
      }

      return {
        success: true,
        data: {
          ...tickerData,
          contractType: 'SPOT'
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Spot: ${errorMessage}`
      };
    }
  }

  // Get order book depth
  async getOrderBook(symbol: string, limit: number = 100): Promise<ApiResponse<any>> {
    try {
      // Ensure limit is one of the allowed values
      const allowedLimits = [5, 10, 20, 50, 100, 500, 1000, 5000];
      const validLimit = allowedLimits.includes(limit) ? limit : 100;

      const orderBook = await this.client.getOrderBook({ symbol, limit: validLimit as any });

      return {
        success: true,
        data: {
          ...orderBook,
          contractType: 'SPOT'
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Spot: ${errorMessage}`
      };
    }
  }

  // Get recent trades
  async getRecentTrades(symbol: string, limit: number = 500): Promise<ApiResponse<any[]>> {
    try {
      const trades = await this.client.getRecentTrades({ symbol, limit });

      const formattedTrades = Array.isArray(trades) ? trades.map((trade: any) => ({
        ...trade,
        contractType: 'SPOT'
      })) : [];

      return {
        success: true,
        data: formattedTrades
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Spot: ${errorMessage}`
      };
    }
  }
}

export default BinanceSpotRestAPI; 