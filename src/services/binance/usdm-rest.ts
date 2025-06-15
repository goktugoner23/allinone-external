import { USDMClient } from 'binance';
import config from '../../config';

// Utility function to safely convert numberInString to number
function toNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  return 0;
}

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

class BinanceUsdMRestAPI {
  private client: USDMClient;

  constructor() {
    this.client = new USDMClient({
      api_key: config.binance.apiKey,
      api_secret: config.binance.apiSecret,
    });
  }

  // Get account information
  async getAccountInfo(): Promise<ApiResponse<AccountInfo>> {
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
          assets: (accountInfo.assets || []).map((asset: any) => ({
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Get current positions
  async getPositions(): Promise<ApiResponse<Position[]>> {
    try {
      const positions = await this.client.getPositions();
      
      if (!Array.isArray(positions)) {
        return {
          success: false,
          error: 'Invalid positions response format'
        };
      }

      const activePositions = positions
        .filter((pos: any) => parseFloat(pos.positionAmt || '0') !== 0)
        .map((pos: any) => ({
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Get open orders
  async getOpenOrders(symbol?: string): Promise<ApiResponse<any[]>> {
    try {
      let orders: any[];
      if (symbol) {
        orders = await this.client.getAllOrders({ symbol });
      } else {
        // Get orders for a default symbol since the API requires it
        orders = await this.client.getAllOrders({ symbol: 'BTCUSDT' });
      }

      // Filter for open orders only
      const openOrders = Array.isArray(orders) ? orders.filter((order: any) => 
        order.status === 'NEW' || order.status === 'PARTIALLY_FILLED'
      ) : [];

      const formattedOrders = openOrders.map((order: any) => ({
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Place a new order
  async placeOrder(orderData: OrderData): Promise<ApiResponse<any>> {
    try {
      const {
        symbol,
        side,
        type,
        quantity,
        price,
        stopPrice,
        timeInForce = 'GTC',
        reduceOnly = false,
        closePosition = false,
        positionSide = 'BOTH',
        workingType = 'CONTRACT_PRICE'
      } = orderData;

      const orderParams: any = {
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Cancel an order
  async cancelOrder(symbol: string, orderId: string): Promise<ApiResponse<any>> {
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Cancel all open orders for a symbol
  async cancelAllOrders(symbol: string): Promise<ApiResponse<any>> {
    try {
      const result = await this.client.cancelAllOpenOrders({ symbol });
      
      return {
        success: true,
        data: result
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Set Take Profit and Stop Loss
  async setTPSL(
    symbol: string, 
    side: 'BUY' | 'SELL', 
    takeProfitPrice?: number, 
    stopLossPrice?: number, 
    quantity?: number
  ): Promise<ApiResponse<any>> {
    try {
      console.log(`[USD-M] Setting TP/SL for ${symbol}: TP=${takeProfitPrice}, SL=${stopLossPrice}, Qty=${quantity}`);
      
      // First, cancel any existing TP/SL orders for this symbol
      try {
        const openOrders = await this.getOpenOrders(symbol);
        if (openOrders.success && openOrders.data) {
          const tpslOrders = openOrders.data.filter((order: any) => 
            ['TAKE_PROFIT_MARKET', 'STOP_MARKET', 'TAKE_PROFIT', 'STOP'].includes(order.type)
          );
          
          console.log(`[USD-M] Found ${tpslOrders.length} existing TP/SL orders for ${symbol}`);
          
          // Cancel existing TP/SL orders
          for (const order of tpslOrders) {
            try {
              console.log(`[USD-M] Canceling existing order: ${order.orderId} (${order.type})`);
              await this.cancelOrder(symbol, order.orderId.toString());
            } catch (cancelError) {
              console.warn(`[USD-M] Failed to cancel order ${order.orderId}:`, cancelError);
            }
          }
        }
      } catch (error) {
        console.warn('[USD-M] Error canceling existing TP/SL orders:', error);
      }

      const results = [];

      // Place Take Profit order
      if (takeProfitPrice && quantity) {
        console.log(`[USD-M] Placing Take Profit order: ${takeProfitPrice}`);
        const tpOrder = await this.placeOrder({
          symbol,
          side: side === 'BUY' ? 'SELL' : 'BUY', // Opposite side for TP
          type: 'TAKE_PROFIT_MARKET',
          quantity,
          stopPrice: takeProfitPrice,
          reduceOnly: true
        });
        
        if (tpOrder.success) {
          console.log(`[USD-M] Take Profit order placed: ${tpOrder.data?.orderId}`);
          results.push({ type: 'TAKE_PROFIT', ...tpOrder });
        } else {
          console.error(`[USD-M] Failed to place Take Profit order:`, tpOrder.error);
          results.push({ type: 'TAKE_PROFIT', success: false, error: tpOrder.error });
        }
      }

      // Place Stop Loss order
      if (stopLossPrice && quantity) {
        console.log(`[USD-M] Placing Stop Loss order: ${stopLossPrice}`);
        const slOrder = await this.placeOrder({
          symbol,
          side: side === 'BUY' ? 'SELL' : 'BUY', // Opposite side for SL
          type: 'STOP_MARKET',
          quantity,
          stopPrice: stopLossPrice,
          reduceOnly: true
        });
        
        if (slOrder.success) {
          console.log(`[USD-M] Stop Loss order placed: ${slOrder.data?.orderId}`);
          results.push({ type: 'STOP_LOSS', ...slOrder });
        } else {
          console.error(`[USD-M] Failed to place Stop Loss order:`, slOrder.error);
          results.push({ type: 'STOP_LOSS', success: false, error: slOrder.error });
        }
      }

      const allSuccessful = results.every(result => result.success);
      
      return {
        success: allSuccessful,
        data: results,
        error: allSuccessful ? undefined : 'Some orders failed to place'
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[USD-M] Error in setTPSL:', errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Get balance for specific asset
  async getBalance(asset: string = 'USDT'): Promise<ApiResponse<any>> {
    try {
      const accountInfo = await this.client.getAccountInformation();
      const assetBalance = accountInfo.assets?.find((a: any) => a.asset === asset);
      
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Get symbol price
  async getPrice(symbol: string): Promise<ApiResponse<any>> {
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Get all symbol prices
  async getAllPrices(): Promise<ApiResponse<any[]>> {
    try {
      const prices = await this.client.getSymbolPriceTicker();
      const formattedPrices = Array.isArray(prices) 
        ? prices.map((price: any) => ({
            symbol: price.symbol,
            price: toNumber(price.price)
          }))
        : [{
            symbol: (prices as any).symbol,
            price: toNumber((prices as any).price)
          }];
      
      return {
        success: true,
        data: formattedPrices
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage
      };
    }
  }
}

export default BinanceUsdMRestAPI;
