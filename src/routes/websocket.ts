import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { validateSymbol } from '../middleware/validation';
import ServiceManager from '../services';

const router = Router();

// Get service manager instance
const serviceManager = ServiceManager.getInstance();
const binanceService = serviceManager.getBinanceService();

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// ============= SPOT WEBSOCKET SUBSCRIPTION ROUTES =============

// Subscribe to spot ticker
router.post('/spot/subscribe/ticker/:symbol', validateSymbol, asyncHandler(async (req: Request, res: Response) => {
  const { symbol } = req.params;
  await binanceService.subscribeToSpotTicker(symbol);
  
  const response: ApiResponse = {
    success: true,
    data: { message: `Subscribed to spot ticker for ${symbol}` },
    timestamp: Date.now()
  };
  res.json(response);
}));

// Subscribe to spot depth
router.post('/spot/subscribe/depth/:symbol', validateSymbol, asyncHandler(async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const levels = req.query.levels as string;
  await binanceService.subscribeToSpotDepth(symbol, levels);
  
  const response: ApiResponse = {
    success: true,
    data: { message: `Subscribed to spot depth for ${symbol}` },
    timestamp: Date.now()
  };
  res.json(response);
}));

// Subscribe to spot trades
router.post('/spot/subscribe/trades/:symbol', validateSymbol, asyncHandler(async (req: Request, res: Response) => {
  const { symbol } = req.params;
  await binanceService.subscribeToSpotTrades(symbol);
  
  const response: ApiResponse = {
    success: true,
    data: { message: `Subscribed to spot trades for ${symbol}` },
    timestamp: Date.now()
  };
  res.json(response);
}));

// ============= GENERAL WEBSOCKET MANAGEMENT ROUTES =============

// Get WebSocket connection status
router.get('/websocket/status', asyncHandler(async (req: Request, res: Response) => {
  const status = binanceService.getConnectionStatus();
  
  const response: ApiResponse = {
    success: true,
    data: status,
    timestamp: Date.now()
  };
  res.json(response);
}));

export default router;
