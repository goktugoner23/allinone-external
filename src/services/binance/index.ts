import BinanceSpotWebSocketManager from './spot-websocket';
import BinanceSpotRestAPI from './spot-rest';
import BinanceUsdMWebSocketManager from './usdm-websocket';
import BinanceUsdMRestAPI from './usdm-rest';
import BinanceCoinMWebSocketManager from './coinm-websocket';
import BinanceCoinMRestAPI from './coinm-rest';

export interface ConnectionStatus {
  spot: {
    isConnected: boolean;
    clientCount: number;
  };
  usdm: {
    isConnected: boolean;
    clientCount: number;
  };
  coinm: {
    isConnected: boolean;
    clientCount: number;
  };
  isInitialized: boolean;
}

class BinanceService {
  // Spot trading services
  private spotWsManager: BinanceSpotWebSocketManager;
  private spotRestAPI: BinanceSpotRestAPI;
  
  // USD-M Futures services
  private usdMWsManager: BinanceUsdMWebSocketManager;
  private usdMRestAPI: BinanceUsdMRestAPI;
  
  // COIN-M Futures services
  private coinMWsManager: BinanceCoinMWebSocketManager;
  private coinMRestAPI: BinanceCoinMRestAPI;
  
  private isInitialized: boolean = false;

  constructor() {
    // Initialize Spot services
    this.spotWsManager = new BinanceSpotWebSocketManager();
    this.spotRestAPI = new BinanceSpotRestAPI();
    
    // Initialize USD-M Futures services
    this.usdMWsManager = new BinanceUsdMWebSocketManager();
    this.usdMRestAPI = new BinanceUsdMRestAPI();
    
    // Initialize COIN-M Futures services
    this.coinMWsManager = new BinanceCoinMWebSocketManager();
    this.coinMRestAPI = new BinanceCoinMRestAPI();
    
    this.isInitialized = false;
  }

  async initialize(): Promise<void> {
    try {
      console.log('Initializing Binance Service...');
      
      // Initialize all WebSocket connections in parallel
      await Promise.all([
        this.spotWsManager.initialize(),
        this.usdMWsManager.initialize(),
        this.coinMWsManager.initialize()
      ]);
      
      this.isInitialized = true;
      console.log('Binance Service initialized successfully (Spot + USD-M + COIN-M)');
    } catch (error) {
      console.error('Failed to initialize Binance Service:', error);
      throw error;
    }
  }

  // WebSocket client management
  addWebSocketClient(ws: any): void {
    // Add client to all WebSocket managers
    this.spotWsManager.addClient(ws);
    this.usdMWsManager.addClient(ws);
    this.coinMWsManager.addClient(ws);
  }

  getConnectionStatus(): ConnectionStatus {
    return {
      spot: {
        isConnected: this.spotWsManager.connected,
        clientCount: this.spotWsManager.clientCount
      },
      usdm: {
        isConnected: this.usdMWsManager.isConnected,
        clientCount: this.usdMWsManager.clients.size
      },
      coinm: {
        isConnected: this.coinMWsManager.isConnected,
        clientCount: this.coinMWsManager.clients.size
      },
      isInitialized: this.isInitialized
    };
  }

  // ============= SPOT TRADING METHODS =============

  // Spot account information
  async getSpotAccountInfo() {
    return this.spotRestAPI.getAccountInfo();
  }

  // Spot balances
  async getSpotBalances() {
    return this.spotRestAPI.getBalances();
  }

  async getSpotBalance(asset: string) {
    return this.spotRestAPI.getBalance(asset);
  }

  // Spot orders
  async getSpotOpenOrders(symbol?: string) {
    return this.spotRestAPI.getOpenOrders(symbol);
  }

  async placeSpotOrder(orderData: any) {
    return this.spotRestAPI.placeOrder(orderData);
  }

  async cancelSpotOrder(symbol: string, orderId: string) {
    return this.spotRestAPI.cancelOrder(symbol, orderId);
  }

  async cancelAllSpotOrders(symbol: string) {
    return this.spotRestAPI.cancelAllOrders(symbol);
  }

  // Spot market data
  async getSpotPrice(symbol: string) {
    return this.spotRestAPI.getPrice(symbol);
  }

  async getAllSpotPrices() {
    return this.spotRestAPI.getAllPrices();
  }

  async getSpot24hrTicker(symbol?: string) {
    return this.spotRestAPI.get24hrTicker(symbol);
  }

  async getSpotOrderBook(symbol: string, limit?: number) {
    return this.spotRestAPI.getOrderBook(symbol, limit);
  }

  async getSpotRecentTrades(symbol: string, limit?: number) {
    return this.spotRestAPI.getRecentTrades(symbol, limit);
  }

  // ============= USD-M FUTURES METHODS =============

  // USD-M Futures account information
  async getAccountInfo() {
    return this.usdMRestAPI.getAccountInfo();
  }

  async getPositions() {
    return this.usdMRestAPI.getPositions();
  }

  // USD-M Futures orders
  async getOpenOrders(symbol?: string) {
    return this.usdMRestAPI.getOpenOrders(symbol);
  }

  async placeOrder(orderData: any) {
    return this.usdMRestAPI.placeOrder(orderData);
  }

  async cancelOrder(symbol: string, orderId: string) {
    return this.usdMRestAPI.cancelOrder(symbol, orderId);
  }

  async cancelAllOrders(symbol: string) {
    return this.usdMRestAPI.cancelAllOrders(symbol);
  }

  async setTPSL(
    symbol: string, 
    side: 'BUY' | 'SELL', 
    takeProfitPrice?: number, 
    stopLossPrice?: number, 
    quantity?: number
  ) {
    return this.usdMRestAPI.setTPSL(symbol, side, takeProfitPrice, stopLossPrice, quantity);
  }

  async getBalance(asset?: string) {
    return this.usdMRestAPI.getBalance(asset);
  }

  async getPrice(symbol: string) {
    return this.usdMRestAPI.getPrice(symbol);
  }

  async getAllPrices() {
    return this.usdMRestAPI.getAllPrices();
  }

  // ============= COIN-M FUTURES METHODS =============

  // COIN-M Futures account information
  async getCoinMAccountInfo() {
    return this.coinMRestAPI.getAccountInfo();
  }

  async getCoinMPositions() {
    return this.coinMRestAPI.getPositions();
  }

  // COIN-M Futures orders
  async getCoinMOpenOrders(symbol?: string) {
    return this.coinMRestAPI.getOpenOrders(symbol);
  }

  async placeCoinMOrder(orderData: any) {
    return this.coinMRestAPI.placeOrder(orderData);
  }

  async cancelCoinMOrder(symbol: string, orderId: string) {
    return this.coinMRestAPI.cancelOrder(symbol, orderId);
  }

  async cancelAllCoinMOrders(symbol: string) {
    return this.coinMRestAPI.cancelAllOrders(symbol);
  }

  async setCoinMTPSL(
    symbol: string, 
    side: 'BUY' | 'SELL', 
    takeProfitPrice?: number, 
    stopLossPrice?: number, 
    quantity?: number
  ) {
    return this.coinMRestAPI.setTPSL(symbol, side, takeProfitPrice, stopLossPrice, quantity);
  }

  async getCoinMBalance(asset?: string) {
    return this.coinMRestAPI.getBalance(asset);
  }

  async getCoinMPrice(symbol: string) {
    return this.coinMRestAPI.getPrice(symbol);
  }

  async getAllCoinMPrices() {
    return this.coinMRestAPI.getAllPrices();
  }

  // ============= WEBSOCKET SUBSCRIPTION METHODS =============

  // Spot WebSocket subscriptions
  async subscribeToSpotTicker(symbol: string): Promise<void> {
    return this.spotWsManager.subscribeToTicker(symbol);
  }

  async subscribeToSpotDepth(symbol: string, levels?: string): Promise<void> {
    return this.spotWsManager.subscribeToDepth(symbol, levels);
  }

  async subscribeToSpotTrades(symbol: string): Promise<void> {
    return this.spotWsManager.subscribeToTrades(symbol);
  }

  // Cleanup method
  async disconnect(): Promise<void> {
    try {
      console.log('Disconnecting Binance Service...');
      
      // Disconnect all WebSocket connections in parallel
      await Promise.all([
        this.spotWsManager.disconnect(),
        this.usdMWsManager.disconnect(),
        this.coinMWsManager.disconnect()
      ]);
      
      this.isInitialized = false;
      console.log('Binance Service disconnected successfully (Spot + USD-M + COIN-M)');
    } catch (error) {
      console.error('Error disconnecting Binance Service:', error);
    }
  }
}

export default BinanceService;

