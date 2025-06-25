import { config as dotenvConfig } from 'dotenv';
import { RAGConfig } from '../types/rag';

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
  rag: RAGConfig;
  openai: {
    apiKey: string | undefined;
    organization?: string;
  };
  pinecone: {
    apiKey: string | undefined;
    indexName: string;
  };
  firebase: {
    projectId?: string;
    serviceAccount?: string;
  };
  instagram: {
    accessToken?: string;
    userId?: string;
    appId?: string;
    appSecret?: string;
    webhookVerifyToken?: string;
    apiVersion: string;
    pageAccessToken?: string;
    facebookPageId?: string;
  };
}

const isProduction = process.env.NODE_ENV === 'production';

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  binance: {
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET,
    useTestnet: false,
    spot: {
      baseUrl: 'https://api.binance.com',
      wsUrl: 'wss://stream.binance.com:9443/ws'
    },
    futures: {
      baseUrl: 'https://fapi.binance.com',
      wsUrl: 'wss://fstream.binance.com/ws'
    },
    coinm: {
      baseUrl: 'https://dapi.binance.com',
      wsUrl: 'wss://dstream.binance.com/ws'
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
  },
  rag: {
    vectorDb: {
      indexName: process.env.PINECONE_INDEX_NAME || 'allinone-rag',
      dimension: 1536, // OpenAI ADA embedding dimension
      metric: 'cosine'
    },
    embedding: {
      model: 'text-embedding-ada-002',
      dimension: 1536,
      maxTokens: 8192
    },
    completion: {
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2048', 10),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7')
    },
    chunking: {
      maxChunkSize: parseInt(process.env.RAG_MAX_CHUNK_SIZE || '1000', 10),
      overlapSize: parseInt(process.env.RAG_OVERLAP_SIZE || '200', 10),
      minChunkSize: parseInt(process.env.RAG_MIN_CHUNK_SIZE || '100', 10)
    },
    retrieval: {
      defaultTopK: parseInt(process.env.RAG_DEFAULT_TOP_K || '5', 10),
      minScore: parseFloat(process.env.RAG_MIN_SCORE || '0.7')
    }
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION
  },
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    indexName: process.env.PINECONE_INDEX_NAME || 'allinone-rag'
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  },
  instagram: {
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
    userId: process.env.INSTAGRAM_USER_ID,
    appId: process.env.INSTAGRAM_APP_ID,
    appSecret: process.env.INSTAGRAM_APP_SECRET,
    webhookVerifyToken: process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN,
    apiVersion: process.env.INSTAGRAM_API_VERSION || 'v18.0',
    pageAccessToken: process.env.FACEBOOK_GRAPH_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
    facebookPageId: process.env.FACEBOOK_PAGE_ID
  }
};

// Validate required environment variables
if (!config.binance.apiKey || !config.binance.apiSecret) {
  console.warn('Warning: BINANCE_API_KEY and BINANCE_API_SECRET are not set. Some features may not work.');
}

// Validate RAG-related environment variables
if (!config.openai.apiKey) {
  console.warn('Warning: OPENAI_API_KEY is not set. RAG functionality will not work.');
}

if (!config.pinecone.apiKey) {
  console.warn('Warning: PINECONE_API_KEY is not set. RAG functionality will not work.');
}

export default config;
