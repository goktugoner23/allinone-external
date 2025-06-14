import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

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

export default config;
