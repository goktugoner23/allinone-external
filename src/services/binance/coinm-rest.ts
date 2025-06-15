import { CoinMClient } from 'binance';
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

class BinanceCoinMRestAPI {
  private client: CoinMClient;

  constructor() {
    this.client = new CoinMClient({
      api_key: config.binance.apiKey,
      api_secret: config.binance.apiSecret,
    });
  }

  // Get account information
  async getAccountInfo(): Promise<ApiResponse<CoinMAccountInfo>> {
    try {
      const accountInfo = await this.client.getAccountInformation();
      
      if (!accountInfo || typeof accountInfo !== 'object') {
        throw new Error('Invalid COIN-M account info response');
      }

      // Use safe property access since the binance library types might be incorrect
      const safeAccountInfo = accountInfo as any;

      return {
        success: true,
        data: {
          totalWalletBalance: parseFloat(toString(safeAccountInfo.totalWalletBalance || '0')),
          totalUnrealizedProfit: parseFloat(toString(safeAccountInfo.totalUnrealizedProfit || '0')),
          totalMarginBalance: parseFloat(toString(safeAccountInfo.totalMarginBalance || '0')),
          totalPositionInitialMargin: parseFloat(toString(safeAccountInfo.totalPositionInitialMargin || '0')),
          totalOpenOrderInitialMargin: parseFloat(toString(safeAccountInfo.totalOpenOrderInitialMargin || '0')),
          maxWithdrawAmount: parseFloat(toString(safeAccountInfo.maxWithdrawAmount || '0')),
          assets: (safeAccountInfo.assets || []).map((asset: any) => ({
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `COIN-M: ${errorMessage}`
      };
    }
  }

  // Get current positions
  async getPositions(): Promise<ApiResponse<CoinMPosition[]>> {
    try {
      const positions = await this.client.getPositions();
      
      if (!Array.isArray(positions)) {
        return {
          success: false,
          error: 'Invalid COIN-M positions response format'
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
          isAutoAddMargin: pos.isAutoAddMargin || false,
          contractType: 'COIN-M'
        }));

      return {
        success: true,
        data: activePositions
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `COIN-M: ${errorMessage}`
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
        // Get orders for a default COIN-M symbol since the API requires it
        orders = await this.client.getAllOrders({ symbol: 'BTCUSD_PERP' });
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `COIN-M: ${errorMessage}`
      };
    }
  }

  // Place new order
  async placeOrder(orderData: CoinMOrderData): Promise<ApiResponse<any>> {
    try {
      const orderParams: any = {
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error placing COIN-M order:', errorMessage);
      return {
        success: false,
        error: `COIN-M: ${errorMessage}`
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
          contractType: 'COIN-M'
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error canceling COIN-M order:', errorMessage);
      return {
        success: false,
        error: `COIN-M: ${errorMessage}`
      };
    }
  }

  // Cancel all orders for symbol
  async cancelAllOrders(symbol: string): Promise<ApiResponse<any>> {
    try {
      const result = await this.client.cancelAllOpenOrders({ symbol });

      return {
        success: true,
        data: {
          ...result,
          contractType: 'COIN-M'
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error canceling all COIN-M orders:', errorMessage);
      return {
        success: false,
        error: `COIN-M: ${errorMessage}`
      };
    }
  }

  // Set Take Profit and Stop Loss
  async setCoinMTPSL(
    symbol: string, 
    side: 'BUY' | 'SELL', 
    takeProfitPrice?: number, 
    stopLossPrice?: number, 
    quantity?: number
  ): Promise<ApiResponse<any>> {
    try {
      console.log(`[COIN-M] Setting TP/SL for ${symbol}: TP=${takeProfitPrice}, SL=${stopLossPrice}, Qty=${quantity}`);
      
      // First, cancel any existing TP/SL orders for this symbol
      try {
        const openOrders = await this.getOpenOrders(symbol);
        if (openOrders.success && openOrders.data) {
          const tpslOrders = openOrders.data.filter((order: any) => 
            ['TAKE_PROFIT_MARKET', 'STOP_MARKET', 'TAKE_PROFIT', 'STOP'].includes(order.type)
          );
          
          console.log(`[COIN-M] Found ${tpslOrders.length} existing TP/SL orders for ${symbol}`);
          
          // Cancel existing TP/SL orders
          for (const order of tpslOrders) {
            try {
              console.log(`[COIN-M] Canceling existing order: ${order.orderId} (${order.type})`);
              await this.cancelOrder(symbol, order.orderId.toString());
            } catch (cancelError) {
              console.warn(`[COIN-M] Failed to cancel order ${order.orderId}:`, cancelError);
            }
          }
        }
      } catch (error) {
        console.warn('[COIN-M] Error canceling existing TP/SL orders:', error);
      }

      const results = [];

      // Place Take Profit order
      if (takeProfitPrice && quantity) {
        console.log(`[COIN-M] Placing Take Profit order: ${takeProfitPrice}`);
        const tpOrder = await this.placeOrder({
          symbol,
          side: side === 'BUY' ? 'SELL' : 'BUY', // Opposite side for TP
          type: 'TAKE_PROFIT_MARKET',
          quantity,
          stopPrice: takeProfitPrice,
          reduceOnly: true
        });
        
        if (tpOrder.success) {
          console.log(`[COIN-M] Take Profit order placed: ${tpOrder.data?.orderId}`);
          results.push({ type: 'TAKE_PROFIT', ...tpOrder });
        } else {
          console.error(`[COIN-M] Failed to place Take Profit order:`, tpOrder.error);
          results.push({ type: 'TAKE_PROFIT', success: false, error: tpOrder.error });
        }
      }

      // Place Stop Loss order
      if (stopLossPrice && quantity) {
        console.log(`[COIN-M] Placing Stop Loss order: ${stopLossPrice}`);
        const slOrder = await this.placeOrder({
          symbol,
          side: side === 'BUY' ? 'SELL' : 'BUY', // Opposite side for SL
          type: 'STOP_MARKET',
          quantity,
          stopPrice: stopLossPrice,
          reduceOnly: true
        });
        
        if (slOrder.success) {
          console.log(`[COIN-M] Stop Loss order placed: ${slOrder.data?.orderId}`);
          results.push({ type: 'STOP_LOSS', ...slOrder });
        } else {
          console.error(`[COIN-M] Failed to place Stop Loss order:`, slOrder.error);
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
      console.error('[COIN-M] Error in setCoinMTPSL:', errorMessage);
      return {
        success: false,
        error: `COIN-M: ${errorMessage}`,
        data: [
          ...(takeProfitPrice ? [{ type: 'TAKE_PROFIT', success: false, error: errorMessage }] : []),
          ...(stopLossPrice ? [{ type: 'STOP_LOSS', success: false, error: errorMessage }] : [])
        ]
      };
    }
  }

  // Close COIN-M position by placing a market order
  async closePosition(symbol: string, quantity?: number): Promise<ApiResponse<any>> {
    try {
      // Get current position to determine side and quantity
      const positionsResult = await this.getPositions();
      if (!positionsResult.success || !positionsResult.data) {
        return {
          success: false,
          error: 'Failed to get current COIN-M positions'
        };
      }

      const position = positionsResult.data.find(pos => pos.symbol === symbol);
      if (!position || position.positionAmount === 0) {
        return {
          success: false,
          error: 'No open COIN-M position found for this symbol'
        };
      }

      const positionAmount = Math.abs(position.positionAmount);
      const closeQuantity = quantity || positionAmount;
      const closeSide = position.positionAmount > 0 ? 'SELL' : 'BUY'; // Opposite side to close

      const orderData = {
        symbol,
        side: closeSide as 'BUY' | 'SELL',
        type: 'MARKET' as const,
        quantity: closeQuantity,
        reduceOnly: true
      };

      const result = await this.placeOrder(orderData);
      
      if (result.success) {
        return {
          success: true,
          data: {
            ...result.data,
            contractType: 'COIN-M'
          }
        };
      } else {
        return {
          success: false,
          error: `COIN-M: ${result.error}`
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `COIN-M: ${errorMessage}`
      };
    }
  }

  // Get balance for specific asset
  async getBalance(asset: string = 'BTC'): Promise<ApiResponse<any>> {
    try {
      const accountInfo = await this.client.getAccountInformation();
      const safeAccountInfo = accountInfo as any;
      const assetBalance = safeAccountInfo.assets?.find((a: any) => a.asset === asset);
      
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `COIN-M: ${errorMessage}`
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
          price: parseFloat(toString(priceData.price || '0')), // Use toString helper
          time: priceData.time,
          contractType: 'COIN-M'
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `COIN-M: ${errorMessage}`
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
        price: parseFloat(toString(priceData.price || '0')), // Use toString helper
        time: priceData.time,
        contractType: 'COIN-M'
      }));

      return {
        success: true,
        data: formattedPrices
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `COIN-M: ${errorMessage}`
      };
    }
  }
}

export default BinanceCoinMRestAPI; 