import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
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

// Health check endpoint
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const connectionStatus = binanceService.getConnectionStatus();
  
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'healthy',
      services: {
        usdm: {
          isConnected: connectionStatus.usdm.isConnected,
          clientCount: connectionStatus.usdm.clientCount
        },
        coinm: {
          isConnected: connectionStatus.coinm.isConnected,
          clientCount: connectionStatus.coinm.clientCount
        },
        spot: {
          isConnected: connectionStatus.spot.isConnected,
          clientCount: connectionStatus.spot.clientCount
        },
        isInitialized: connectionStatus.isInitialized
      }
    },
    timestamp: Date.now()
  };
  
  res.json(response);
}));

export default router; 