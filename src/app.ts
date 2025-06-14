import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as WebSocket from 'ws';
import * as http from 'http';
import ServiceManager from './services';
import config from './config';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Initialize services
const serviceManager = new ServiceManager();

// Middleware
app.use(cors(config.cors));
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  const status = serviceManager.getStatus();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: status
  });
});

// Debug endpoint to check outbound IP
app.get('/debug/ip', async (req, res) => {
  try {
    const response = await fetch('https://httpbin.org/ip');
    const data = await response.json() as { origin: string };
    res.json({
      outboundIP: data.origin,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      error: 'Failed to get IP',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Binance API Routes
const binanceService = serviceManager.getBinanceService();

// Get account information
app.get('/api/binance/account', async (req: Request, res: Response) => {
  try {
    const result = await binanceService.getAccountInfo();
    res.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Get positions
app.get('/api/binance/positions', async (req: Request, res: Response) => {
  try {
    const result = await binanceService.getPositions();
    res.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Get open orders
app.get('/api/binance/orders', async (req: Request, res: Response) => {
  try {
    const symbol = req.query.symbol as string | undefined;
    const result = await binanceService.getOpenOrders(symbol);
    res.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Place new order
app.post('/api/binance/orders', async (req: Request, res: Response) => {
  try {
    const result = await binanceService.placeOrder(req.body);
    res.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Cancel specific order
app.delete('/api/binance/orders/:symbol/:orderId', async (req: Request, res: Response) => {
  try {
    const { symbol, orderId } = req.params;
    const result = await binanceService.cancelOrder(symbol, orderId);
    res.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Cancel all orders for symbol
app.delete('/api/binance/orders/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const result = await binanceService.cancelAllOrders(symbol);
    res.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Set Take Profit and Stop Loss
app.post('/api/binance/tpsl', async (req: Request, res: Response) => {
  try {
    const { symbol, side, takeProfitPrice, stopLossPrice, quantity } = req.body;
    const result = await binanceService.setTPSL(symbol, side, takeProfitPrice, stopLossPrice, quantity);
    res.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Get balance
app.get('/api/binance/balance/:asset?', async (req: Request, res: Response) => {
  try {
    const asset = req.params.asset;
    const result = await binanceService.getBalance(asset);
    res.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Get price
app.get('/api/binance/price/:symbol?', async (req: Request, res: Response) => {
  try {
    const symbol = req.params.symbol;
    const result = symbol 
      ? await binanceService.getPrice(symbol)
      : await binanceService.getAllPrices();
    res.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// WebSocket connection handling
wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  console.log('New WebSocket connection from:', req.socket.remoteAddress);
  
  // Add client to Binance service for real-time updates
  binanceService.addWebSocketClient(ws);

  // Handle incoming messages
  ws.on('message', (message: WebSocket.RawData) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received message from client:', data);
      
      // Handle ping/pong for heartbeat
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });

  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error);
  });
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Express error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await serviceManager.shutdown();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await serviceManager.shutdown();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Initialize services and start server
async function startServer() {
  try {
    console.log('Starting server...');
    await serviceManager.initialize();
    
    server.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`WebSocket server ready for connections`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, server, serviceManager };
