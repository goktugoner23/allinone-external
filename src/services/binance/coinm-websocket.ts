import { WebsocketClient } from 'binance';
import * as WebSocket from 'ws';
import config from '../../config';

class BinanceCoinMWebSocketManager {
  private wsClient: WebsocketClient | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000;
  public clients: Set<WebSocket> = new Set();
  public isConnected: boolean = false;

  constructor() {
    this.wsClient = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
    this.clients = new Set(); // Connected Android clients
    this.isConnected = false;
  }

  async initialize(): Promise<void> {
    try {
      console.log('[COIN-M] Initializing WebSocket connection...');
      await this.startUserDataStream();
      this.setupHeartbeat();
    } catch (error) {
      console.error('[COIN-M] Failed to initialize WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  async startUserDataStream(): Promise<void> {
    try {
      console.log('[COIN-M] Initializing WebSocket client with API key:', config.binance.apiKey ? 'Present' : 'Missing');
      console.log('[COIN-M] Environment:', process.env.NODE_ENV || 'development');
      
      // Validate API credentials before initializing
      if (!config.binance.apiKey || !config.binance.apiSecret) {
        throw new Error('Binance API credentials are missing');
      }
      
      // Initialize WebSocket client with explicit credentials
      this.wsClient = new WebsocketClient({
        api_key: config.binance.apiKey,
        api_secret: config.binance.apiSecret,
        beautify: true,
      });
      
      // Set up event handlers
      this.wsClient.on('open', (data) => {
        console.log('[COIN-M] WebSocket connected:', data.wsKey);
        console.log('[COIN-M] Connection data:', data);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.broadcastToClients({ type: 'coinm_connection', status: 'connected' });
      });

      this.wsClient.on('message', (data) => {
        try {
          this.handleUserDataMessage(data);
        } catch (error) {
          console.error('[COIN-M] Error handling WebSocket message:', error);
        }
      });

      this.wsClient.on('formattedMessage', (data) => {
        try {
          this.handleUserDataMessage(data);
        } catch (error) {
          console.error('[COIN-M] Error handling formatted WebSocket message:', error);
        }
      });

      this.wsClient.on('error', (error) => {
        console.error('[COIN-M] WebSocket error:', error);
        this.isConnected = false;
        this.broadcastToClients({ type: 'coinm_connection', status: 'error', error: String(error) });
      });

      this.wsClient.on('reconnecting', (data) => {
        console.log('[COIN-M] WebSocket reconnecting...', data?.wsKey);
        this.isConnected = false;
        this.broadcastToClients({ type: 'coinm_connection', status: 'reconnecting' });
      });

      this.wsClient.on('reconnected', (data) => {
        console.log('[COIN-M] WebSocket reconnected:', data?.wsKey);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.broadcastToClients({ type: 'coinm_connection', status: 'reconnected' });
      });

      // Subscribe to COIN-M Futures user data stream
      console.log('[COIN-M] Subscribing to user data stream...');
      this.wsClient.subscribeCoinFuturesUserDataStream();
      console.log('[COIN-M] Subscription request sent');

    } catch (error) {
      console.error('[COIN-M] Error starting user data stream:', error);
      throw error;
    }
  }

  handleUserDataMessage(message: any): void {
    console.log('[COIN-M] Received user data message:', message);

    if (!message || typeof message !== 'object') {
      return;
    }

    // Handle different event types
    switch (message.eventType || message.e) {
      case 'ACCOUNT_UPDATE':
        this.handleAccountUpdate(message);
        break;
      case 'ORDER_TRADE_UPDATE':
        this.handleOrderUpdate(message);
        break;
      case 'ACCOUNT_CONFIG_UPDATE':
        this.handleAccountConfigUpdate(message);
        break;
      default:
        console.log('[COIN-M] Unknown message type:', message.eventType || message.e);
        break;
    }
  }

  handleAccountUpdate(message: any): void {
    console.log('[COIN-M] Account update received:', message);

    // Extract position updates
    if (message.a?.P || message.accountUpdate?.positions) {
      const positions = (message.a?.P || message.accountUpdate?.positions || []).map((pos: any) => ({
        symbol: pos.s || pos.symbol,
        positionAmount: parseFloat(pos.pa || pos.positionAmount || '0'),
        entryPrice: parseFloat(pos.ep || pos.entryPrice || '0'),
        unrealizedProfit: parseFloat(pos.up || pos.unrealizedProfit || '0'),
        marginType: pos.mt || pos.marginType || 'cross',
        isolatedWallet: parseFloat(pos.iw || pos.isolatedWallet || '0'),
        positionSide: pos.ps || pos.positionSide || 'BOTH',
        contractType: 'COIN-M' // Add identifier for COIN-M positions
      })).filter((pos: any) => pos.positionAmount !== 0);

      if (positions.length > 0) {
        this.broadcastToClients({
          type: 'coinm_positions_update',
          data: positions
        });
      }
    }

    // Extract balance updates
    if (message.a?.B || message.accountUpdate?.balances) {
      const balances = (message.a?.B || message.accountUpdate?.balances || []).map((bal: any) => ({
        asset: bal.a || bal.asset,
        walletBalance: parseFloat(bal.wb || bal.walletBalance || '0'),
        crossWalletBalance: parseFloat(bal.cw || bal.crossWalletBalance || '0'),
        balanceChange: parseFloat(bal.bc || bal.balanceChange || '0'),
        contractType: 'COIN-M' // Add identifier for COIN-M balances
      }));

      this.broadcastToClients({
        type: 'coinm_balance_update',
        data: balances
      });
    }
  }

  handleOrderUpdate(message: any): void {
    console.log('[COIN-M] Order update received:', message);

    const orderData = message.o || message.order || {};
    
    const order = {
      symbol: orderData.s || orderData.symbol,
      clientOrderId: orderData.c || orderData.clientOrderId,
      side: orderData.S || orderData.side,
      orderType: orderData.o || orderData.orderType,
      timeInForce: orderData.f || orderData.timeInForce,
      originalQuantity: parseFloat(orderData.q || orderData.originalQuantity || '0'),
      originalPrice: parseFloat(orderData.p || orderData.originalPrice || '0'),
      averagePrice: parseFloat(orderData.ap || orderData.averagePrice || '0'),
      orderStatus: orderData.X || orderData.orderStatus,
      orderId: orderData.i || orderData.orderId,
      lastFilledQuantity: parseFloat(orderData.l || orderData.lastFilledQuantity || '0'),
      cumulativeFilledQuantity: parseFloat(orderData.z || orderData.cumulativeFilledQuantity || '0'),
      lastFilledPrice: parseFloat(orderData.L || orderData.lastFilledPrice || '0'),
      commissionAmount: parseFloat(orderData.n || orderData.commissionAmount || '0'),
      commissionAsset: orderData.N || orderData.commissionAsset,
      orderTradeTime: orderData.T || orderData.orderTradeTime,
      tradeId: orderData.t || orderData.tradeId,
      bidsNotional: parseFloat(orderData.b || orderData.bidsNotional || '0'),
      askNotional: parseFloat(orderData.a || orderData.askNotional || '0'),
      isMakerSide: orderData.m || orderData.isMakerSide,
      isReduceOnly: orderData.R || orderData.isReduceOnly,
      stopPriceWorkingType: orderData.wt || orderData.stopPriceWorkingType,
      originalOrderType: orderData.ot || orderData.originalOrderType,
      positionSide: orderData.ps || orderData.positionSide,
      isCloseAll: orderData.cp || orderData.isCloseAll,
      activationPrice: parseFloat(orderData.AP || orderData.activationPrice || '0'),
      callbackRate: parseFloat(orderData.cr || orderData.callbackRate || '0'),
      realizedProfit: parseFloat(orderData.rp || orderData.realizedProfit || '0'),
      contractType: 'COIN-M' // Add identifier for COIN-M orders
    };

    this.broadcastToClients({
      type: 'coinm_order_update',
      data: order
    });
  }

  handleAccountConfigUpdate(message: any): void {
    console.log('[COIN-M] Account config update received:', message);
    
    this.broadcastToClients({
      type: 'coinm_account_config_update',
      data: message
    });
  }

  setupHeartbeat(): void {
    console.log('[COIN-M] Sending WebSocket heartbeat...');
  }

  scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      
      console.log(`[COIN-M] Scheduling reconnection attempt ${this.reconnectAttempts + 1} in ${delay}ms`);
      
      setTimeout(() => {
        this.initialize();
      }, delay);
    } else {
      console.error('[COIN-M] Max reconnection attempts reached');
    }
  }

  addClient(ws: WebSocket): void {
    this.clients.add(ws);
    console.log(`[COIN-M] WebSocket client added. Total clients: ${this.clients.size}`);

    ws.on('close', () => {
      this.clients.delete(ws);
      console.log(`[COIN-M] WebSocket client removed. Total clients: ${this.clients.size}`);
    });

    ws.on('error', (error) => {
      console.error('[COIN-M] WebSocket client error:', error);
      this.clients.delete(ws);
    });
  }

  broadcastToClients(message: any): void {
    console.log(`[COIN-M] Broadcasting message to ${this.clients.size} clients:`, message.type);
    
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          console.error('[COIN-M] Error broadcasting to client:', error);
          this.clients.delete(client);
        }
      } else {
        this.clients.delete(client);
      }
    });
  }

  async disconnect(): Promise<void> {
    try {
      console.log('[COIN-M] Disconnecting WebSocket...');
      
      if (this.wsClient) {
        this.wsClient.closeAll();
        this.wsClient = null;
      }
      
      this.isConnected = false;
      this.clients.clear();
      
      console.log('[COIN-M] WebSocket disconnected successfully');
    } catch (error) {
      console.error('[COIN-M] Error disconnecting WebSocket:', error);
    }
  }
}

export default BinanceCoinMWebSocketManager; 