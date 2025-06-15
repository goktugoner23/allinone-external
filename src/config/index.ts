import { config as dotenvConfig } from 'dotenv';

// Only load .env file in development
if (process.env.NODE_ENV !== 'production') {
  dotenvConfig();
}

export interface Config {
  port: number;
  nodeEnv: string;
  binance: {
    apiKey: string | undefined;
    apiSecret: string | undefined;
    useTestnet: boolean;
    spot: {
      baseUrl: string;
      wsUrl: string;
    };
    futures: {
      baseUrl: string;
      wsUrl: string;
    };
    coinm: {
      baseUrl: string;
      wsUrl: string;
    };
  };
  cors: {
    origin: string;
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  logging: {
    level: string;
    enableFileLogging: boolean;
  };
}

const isProduction = process.env.NODE_ENV === 'production';

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  binance: {
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET,
    useTestnet: !isProduction,
    spot: {
      baseUrl: isProduction 
        ? 'https://api.binance.com' 
        : 'https://testnet.binance.vision',
      wsUrl: isProduction
        ? 'wss://stream.binance.com:9443/ws'
        : 'wss://testnet.binance.vision/ws'
    },
    futures: {
      baseUrl: isProduction 
        ? 'https://fapi.binance.com' 
        : 'https://testnet.binancefuture.com',
      wsUrl: isProduction
        ? 'wss://fstream.binance.com/ws'
        : 'wss://stream.binancefuture.com/ws'
    },
    coinm: {
      baseUrl: isProduction
        ? 'https://dapi.binance.com'
        : 'https://testnet.binancefuture.com',
      wsUrl: isProduction
        ? 'wss://dstream.binance.com/ws'
        : 'wss://dstream.binancefuture.com/ws'
    }
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10) // limit each IP to 100 requests per windowMs
  },
  logging: {
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true' || isProduction
  }
};

// Validate required environment variables
if (!config.binance.apiKey || !config.binance.apiSecret) {
  console.warn('Warning: BINANCE_API_KEY and BINANCE_API_SECRET are not set. Some features may not work.');
}

export default config;
