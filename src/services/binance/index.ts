import BinanceWebSocketManager from './websocket';
import BinanceRestAPI from './rest';

class BinanceService {
  private wsManager: BinanceWebSocketManager;
  private restAPI: BinanceRestAPI;
  private isInitialized: boolean = false;

  constructor() {
    this.wsManager = new BinanceWebSocketManager();
    this.restAPI = new BinanceRestAPI();
    this.isInitialized = false;
  }

  async initialize(): Promise<void> {
    try {
      console.log('Initializing Binance Service...');
      await this.wsManager.initialize();
      this.isInitialized = true;
      console.log('Binance Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Binance Service:', error);
      throw error;
    }
  }

  // WebSocket methods
  addWebSocketClient(ws: any): void {
    this.wsManager.addClient(ws);
  }

  getConnectionStatus() {
    return {
      isConnected: this.wsManager.isConnected,
      clientCount: this.wsManager.clients.size,
      isInitialized: this.isInitialized
    };
  }

  // REST API methods
  async getAccountInfo() {
    return this.restAPI.getAccountInfo();
  }

  async getPositions() {
    return this.restAPI.getPositions();
  }

  async getOpenOrders(symbol?: string) {
    return this.restAPI.getOpenOrders(symbol);
  }

  async placeOrder(orderData: any) {
    return this.restAPI.placeOrder(orderData);
  }

  async cancelOrder(symbol: string, orderId: string) {
    return this.restAPI.cancelOrder(symbol, orderId);
  }

  async cancelAllOrders(symbol: string) {
    return this.restAPI.cancelAllOrders(symbol);
  }

  async setTPSL(
    symbol: string, 
    side: 'BUY' | 'SELL', 
    takeProfitPrice?: number, 
    stopLossPrice?: number, 
    quantity?: number
  ) {
    return this.restAPI.setTPSL(symbol, side, takeProfitPrice, stopLossPrice, quantity);
  }

  async getBalance(asset?: string) {
    return this.restAPI.getBalance(asset);
  }

  async getPrice(symbol: string) {
    return this.restAPI.getPrice(symbol);
  }

  async getAllPrices() {
    return this.restAPI.getAllPrices();
  }

  // Cleanup method
  async disconnect(): Promise<void> {
    try {
      console.log('Disconnecting Binance Service...');
      await this.wsManager.disconnect();
      console.log('Binance Service disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting Binance Service:', error);
    }
  }
}

export default BinanceService;
