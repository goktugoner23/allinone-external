import { config as dotenvConfig } from 'dotenv';

// Only load .env file in development
if (process.env.NODE_ENV !== 'production') {
  dotenvConfig();
}

// Debug logging for production
console.log('Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('BINANCE_API_KEY exists:', !!process.env.BINANCE_API_KEY);
console.log('BINANCE_API_SECRET exists:', !!process.env.BINANCE_API_SECRET);
console.log('BINANCE_API_KEY length:', process.env.BINANCE_API_KEY?.length || 0);
console.log('BINANCE_API_SECRET length:', process.env.BINANCE_API_SECRET?.length || 0);

export interface Config {
  port: number;
  binance: {
    apiKey: string | undefined;
    apiSecret: string | undefined;
    useTestnet: boolean;
    baseUrl: string;
    wsUrl: string;
  };
  cors: {
    origin: string;
    credentials: boolean;
  };
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  binance: {
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET,
    useTestnet: process.env.NODE_ENV !== 'production',
    baseUrl: process.env.NODE_ENV === 'production' 
      ? 'https://fapi.binance.com' 
      : 'https://testnet.binancefuture.com',
    wsUrl: process.env.NODE_ENV === 'production'
      ? 'wss://fstream.binance.com/ws'
      : 'wss://stream.binancefuture.com/ws'
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  }
};

console.log('Config loaded:');
console.log('config.binance.apiKey exists:', !!config.binance.apiKey);
console.log('config.binance.apiSecret exists:', !!config.binance.apiSecret);

export default config;
