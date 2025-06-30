import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import WebSocket from 'ws';
import http from 'http';

import ServiceManager from './services';
import config from './config';
import { errorHandler, asyncHandler, notFoundHandler, ApiResponse } from './middleware/errorHandler';
import { 
  validateSpotOrder, 
  validateFuturesOrder, 
  validateTPSL, 
  validateSymbol, 
  validateAsset, 
  validateOrderId,
  validatePagination 
} from './middleware/validation';
import routes from './routes';
import { initializeRAGService } from './routes/rag';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configure trust proxy for rate limiting
// For DigitalOcean deployment, be more specific about trusted proxies
if (config.nodeEnv === 'production') {
  // Trust specific proxy networks (adjust based on your infrastructure)
  app.set('trust proxy', ['127.0.0.1', '::1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']);
} else {
  // Development - trust localhost
  app.set('trust proxy', ['127.0.0.1', '::1']);
}

// Initialize services
const serviceManager = ServiceManager.getInstance();
const binanceService = serviceManager.getBinanceService();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
    timestamp: Date.now()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// CORS configuration
app.use(cors(config.cors));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Use organized routes
app.use(routes);

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
  console.log('New WebSocket client connected');
  
  // Add client to all service managers
  binanceService.addWebSocketClient(ws);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to Binance Trading API WebSocket',
    timestamp: Date.now()
  }));

  ws.on('message', (message: WebSocket.Data) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('WebSocket message received:', data);
      
      // Handle client messages if needed
      if (data.type === 'ping') {
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket client error:', error);
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close WebSocket server
    wss.close(() => {
      console.log('WebSocket server closed');
    });
    
    // Close HTTP server
    server.close(() => {
      console.log('HTTP server closed');
    });
    
    // Disconnect services
    await binanceService.disconnect();
    
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server function
async function startServer(): Promise<void> {
  try {
    console.log('Starting server...');
    
    // Initialize services
    await serviceManager.initialize();
    
    // Initialize RAG service
    try {
      console.log('Initializing RAG service...');
      await initializeRAGService();
      console.log('✅ RAG service initialized successfully');
    } catch (error) {
      console.warn('⚠️ RAG service initialization failed:', error instanceof Error ? error.message : error);
      console.warn('RAG endpoints will not be available until service is initialized');
    }
    
    // Start HTTP server
    server.listen(config.port, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🔗 WebSocket server ready`);
      console.log(`💹 Binance services initialized`);
      
      if (config.nodeEnv === 'development') {
        console.log(`🌐 Health check: http://localhost:${config.port}/health`);
        console.log(`📈 Spot API: http://localhost:${config.port}/api/binance/spot/`);
        console.log(`⚡ Futures API: http://localhost:${config.port}/api/binance/futures/`);
        console.log(`🪙 COIN-M API: http://localhost:${config.port}/api/binance/coinm/`);
        console.log(`🔌 WebSocket API: http://localhost:${config.port}/api/binance/websocket/`);
        console.log(`🤖 RAG API: http://localhost:${config.port}/api/rag/`);
        console.log(`📸 Instagram API: http://localhost:${config.port}/api/instagram/`);
      }
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

export default app;
