import WebSocket from 'ws';
import { WebSocketError } from '../../utils/errors';

interface SpotStreamData {
  stream: string;
  data: any;
}

interface SpotTickerData {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  c: string; // Close price
  o: string; // Open price
  h: string; // High price
  l: string; // Low price
  v: string; // Total traded base asset volume
  q: string; // Total traded quote asset volume
  P: string; // Price change percent
  p: string; // Price change
  w: string; // Weighted average price
  x: string; // First trade(F)-1 price (first trade before the 24hr rolling window)
  Q: string; // Last quantity
  b: string; // Best bid price
  B: string; // Best bid quantity
  a: string; // Best ask price
  A: string; // Best ask quantity
  O: number; // Statistics open time
  C: number; // Statistics close time
  F: number; // First trade ID
  L: number; // Last trade Id
  n: number; // Total number of trades
}

interface SpotDepthData {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  U: number; // First update ID in event
  u: number; // Final update ID in event
  b: [string, string][]; // Bids to be updated
  a: [string, string][]; // Asks to be updated
}

interface SpotTradeData {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  t: number; // Trade ID
  p: string; // Price
  q: string; // Quantity
  b: number; // Buyer order ID
  a: number; // Seller order ID
  T: number; // Trade time
  m: boolean; // Is the buyer the market maker?
  M: boolean; // Ignore
}

class BinanceSpotWebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 5000;
  private isConnected: boolean = false;
  private subscriptions: Set<string> = new Set();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastPongTime: number = Date.now();
  private readonly baseUrl: string = 'wss://stream.binance.com:9443/ws';
  
  // Client management
  public clients: Set<WebSocket> = new Set();
  
  constructor() {
    this.setupHeartbeat();
  }

  async initialize(): Promise<void> {
    try {
      console.log('[Spot] Initializing WebSocket connection...');
      await this.connect();
      console.log('[Spot] WebSocket initialized successfully');
    } catch (error) {
      console.error('[Spot] Failed to initialize WebSocket:', error);
      throw new WebSocketError('Failed to initialize Spot WebSocket connection');
    }
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.baseUrl);

        this.ws.on('open', () => {
          console.log('[Spot] WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.lastPongTime = Date.now();
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            this.handleMessage(data);
          } catch (error) {
            console.error('[Spot] Error handling WebSocket message:', error);
          }
        });

        this.ws.on('close', (code: number, reason: string) => {
          console.log(`[Spot] WebSocket closed: ${code} - ${reason}`);
          this.isConnected = false;
          this.handleDisconnection();
        });

        this.ws.on('error', (error: Error) => {
          console.error('[Spot] WebSocket error:', error);
          this.isConnected = false;
          reject(new WebSocketError(`Spot WebSocket connection error: ${error.message}`));
        });

        this.ws.on('pong', () => {
          this.lastPongTime = Date.now();
        });

        // Connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new WebSocketError('Spot WebSocket connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(new WebSocketError(`Failed to create Spot WebSocket connection: ${error}`));
      }
    });
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      
      // Handle different message types
      if (message.stream && message.data) {
        this.processStreamData(message as SpotStreamData);
      } else if (message.e) {
        // Direct event data
        this.processEventData(message);
      }
    } catch (error) {
      console.error('[Spot] Error parsing WebSocket message:', error);
    }
  }

  private processStreamData(streamData: SpotStreamData): void {
    const { stream, data } = streamData;
    
    // Process different stream types
    if (stream.includes('@ticker')) {
      this.handleTickerData(data as SpotTickerData);
    } else if (stream.includes('@depth')) {
      this.handleDepthData(data as SpotDepthData);
    } else if (stream.includes('@trade')) {
      this.handleTradeData(data as SpotTradeData);
    }

    // Broadcast to all connected clients
    this.broadcastToClients({
      type: 'spot_stream',
      stream,
      data: this.formatStreamData(stream, data)
    });
  }

  private processEventData(eventData: any): void {
    // Handle direct event data (when not using combined stream)
    if (eventData.e === '24hrTicker') {
      this.handleTickerData(eventData as SpotTickerData);
    } else if (eventData.e === 'depthUpdate') {
      this.handleDepthData(eventData as SpotDepthData);
    } else if (eventData.e === 'trade') {
      this.handleTradeData(eventData as SpotTradeData);
    }

    // Broadcast to all connected clients
    this.broadcastToClients({
      type: 'spot_event',
      event: eventData.e,
      data: this.formatEventData(eventData)
    });
  }

  private handleTickerData(ticker: SpotTickerData): void {
    // Process 24hr ticker data
    console.log(`[Spot] Ticker Update - ${ticker.s}: ${ticker.c} (${ticker.P}%)`);
  }

  private handleDepthData(depth: SpotDepthData): void {
    // Process order book depth data
    console.log(`[Spot] Depth Update - ${depth.s}: ${depth.b.length} bids, ${depth.a.length} asks`);
  }

  private handleTradeData(trade: SpotTradeData): void {
    // Process individual trade data
    console.log(`[Spot] Trade - ${trade.s}: ${trade.q} @ ${trade.p}`);
  }

  private formatStreamData(stream: string, data: any): any {
    // Format data based on stream type
    if (stream.includes('@ticker')) {
      return this.formatTickerData(data);
    } else if (stream.includes('@depth')) {
      return this.formatDepthData(data);
    } else if (stream.includes('@trade')) {
      return this.formatTradeData(data);
    }
    return data;
  }

  private formatEventData(data: any): any {
    // Format event data based on event type
    switch (data.e) {
      case '24hrTicker':
        return this.formatTickerData(data);
      case 'depthUpdate':
        return this.formatDepthData(data);
      case 'trade':
        return this.formatTradeData(data);
      default:
        return data;
    }
  }

  private formatTickerData(ticker: SpotTickerData): any {
    return {
      symbol: ticker.s,
      price: parseFloat(ticker.c),
      priceChange: parseFloat(ticker.p),
      priceChangePercent: parseFloat(ticker.P),
      weightedAvgPrice: parseFloat(ticker.w),
      openPrice: parseFloat(ticker.o),
      highPrice: parseFloat(ticker.h),
      lowPrice: parseFloat(ticker.l),
      volume: parseFloat(ticker.v),
      quoteVolume: parseFloat(ticker.q),
      openTime: ticker.O,
      closeTime: ticker.C,
      firstId: ticker.F,
      lastId: ticker.L,
      count: ticker.n,
      bestBid: parseFloat(ticker.b),
      bestBidQty: parseFloat(ticker.B),
      bestAsk: parseFloat(ticker.a),
      bestAskQty: parseFloat(ticker.A),
      contractType: 'SPOT',
      timestamp: ticker.E
    };
  }

  private formatDepthData(depth: SpotDepthData): any {
    return {
      symbol: depth.s,
      firstUpdateId: depth.U,
      finalUpdateId: depth.u,
      bids: depth.b.map(([price, qty]) => ({
        price: parseFloat(price),
        quantity: parseFloat(qty)
      })),
      asks: depth.a.map(([price, qty]) => ({
        price: parseFloat(price),
        quantity: parseFloat(qty)
      })),
      contractType: 'SPOT',
      timestamp: depth.E
    };
  }

  private formatTradeData(trade: SpotTradeData): any {
    return {
      symbol: trade.s,
      tradeId: trade.t,
      price: parseFloat(trade.p),
      quantity: parseFloat(trade.q),
      buyerOrderId: trade.b,
      sellerOrderId: trade.a,
      tradeTime: trade.T,
      isBuyerMaker: trade.m,
      contractType: 'SPOT',
      timestamp: trade.E
    };
  }

  // Subscribe to ticker stream
  async subscribeToTicker(symbol: string): Promise<void> {
    const stream = `${symbol.toLowerCase()}@ticker`;
    await this.subscribe(stream);
  }

  // Subscribe to depth stream
  async subscribeToDepth(symbol: string, levels: string = '@100ms'): Promise<void> {
    const stream = `${symbol.toLowerCase()}@depth${levels}`;
    await this.subscribe(stream);
  }

  // Subscribe to trade stream
  async subscribeToTrades(symbol: string): Promise<void> {
    const stream = `${symbol.toLowerCase()}@trade`;
    await this.subscribe(stream);
  }

  // Generic subscribe method
  private async subscribe(stream: string): Promise<void> {
    if (!this.isConnected || !this.ws) {
      throw new WebSocketError('Spot WebSocket not connected');
    }

    const subscribeMessage = {
      method: 'SUBSCRIBE',
      params: [stream],
      id: Date.now()
    };

    this.ws.send(JSON.stringify(subscribeMessage));
    this.subscriptions.add(stream);
    console.log(`[Spot] Subscribed to stream: ${stream}`);
  }

  // Unsubscribe from stream
  async unsubscribe(stream: string): Promise<void> {
    if (!this.isConnected || !this.ws) {
      throw new WebSocketError('Spot WebSocket not connected');
    }

    const unsubscribeMessage = {
      method: 'UNSUBSCRIBE',
      params: [stream],
      id: Date.now()
    };

    this.ws.send(JSON.stringify(unsubscribeMessage));
    this.subscriptions.delete(stream);
    console.log(`[Spot] Unsubscribed from stream: ${stream}`);
  }

  // Client management
  addClient(client: WebSocket): void {
    this.clients.add(client);
    console.log(`[Spot] WebSocket client added. Total clients: ${this.clients.size}`);

    client.on('close', () => {
      this.clients.delete(client);
      console.log(`[Spot] WebSocket client removed. Total clients: ${this.clients.size}`);
    });

    client.on('error', (error) => {
      console.error('[Spot] WebSocket client error:', error);
      this.clients.delete(client);
    });
  }

  private broadcastToClients(message: any): void {
    const messageStr = JSON.stringify(message);
    
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          console.error('[Spot] Error broadcasting to WebSocket client:', error);
          this.clients.delete(client);
        }
      } else {
        this.clients.delete(client);
      }
    });
  }

  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.isConnected) {
        // Check if we received a pong recently
        const timeSinceLastPong = Date.now() - this.lastPongTime;
        if (timeSinceLastPong > 60000) { // 60 seconds
          console.warn('[Spot] WebSocket heartbeat timeout, reconnecting...');
          this.handleDisconnection();
          return;
        }

        // Send ping
        try {
          this.ws.ping();
        } catch (error) {
          console.error('[Spot] Error sending WebSocket ping:', error);
        }
      }
    }, 30000); // Send ping every 30 seconds
  }

  private handleDisconnection(): void {
    this.isConnected = false;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[Spot] Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.reconnect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('[Spot] Max reconnection attempts reached for WebSocket');
    }
  }

  private async reconnect(): Promise<void> {
    try {
      await this.connect();
      
      // Resubscribe to all previous subscriptions
      for (const stream of this.subscriptions) {
        await this.subscribe(stream);
      }
      
      console.log('[Spot] WebSocket reconnected and resubscribed successfully');
    } catch (error) {
      console.error('[Spot] Failed to reconnect WebSocket:', error);
      this.handleDisconnection();
    }
  }

  async disconnect(): Promise<void> {
    try {
      console.log('[Spot] Disconnecting WebSocket...');
      
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }

      this.isConnected = false;
      this.subscriptions.clear();
      this.clients.clear();
      
      console.log('[Spot] WebSocket disconnected successfully');
    } catch (error) {
      console.error('[Spot] Error disconnecting WebSocket:', error);
    }
  }

  // Getters
  get connected(): boolean {
    return this.isConnected;
  }

  get activeSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  get clientCount(): number {
    return this.clients.size;
  }
}

export default BinanceSpotWebSocketManager; 