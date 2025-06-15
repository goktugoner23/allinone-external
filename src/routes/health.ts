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
  const status = binanceService.getConnectionStatus();
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: status,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    },
    timestamp: Date.now()
  };
  
  res.json(response);
}));

export default router; 