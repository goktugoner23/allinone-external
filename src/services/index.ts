import BinanceService from './binance';

class ServiceManager {
  private static instance: ServiceManager;
  private binanceService: BinanceService;
  private isInitialized: boolean = false;

  private constructor() {
    this.binanceService = new BinanceService();
    this.isInitialized = false;
  }

  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      console.log('Initializing all services...');
      await this.binanceService.initialize();
      this.isInitialized = true;
      console.log('All services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize services:', error);
      throw error;
    }
  }

  getBinanceService(): BinanceService {
    return this.binanceService;
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      binance: this.binanceService.getConnectionStatus()
    };
  }

  async shutdown(): Promise<void> {
    try {
      console.log('Shutting down services...');
      await this.binanceService.disconnect();
      console.log('All services shut down successfully');
    } catch (error) {
      console.error('Error shutting down services:', error);
    }
  }
}

export default ServiceManager;
