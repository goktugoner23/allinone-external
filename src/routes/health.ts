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

// Add endpoint to check outbound IP
router.get('/outbound-ip', async (req, res) => {
  try {
    const https = require('https');
    
    const getOutboundIP = (): Promise<string> => {
      return new Promise((resolve, reject) => {
        https.get('https://api.ipify.org', (response: any) => {
          let data = '';
          response.on('data', (chunk: any) => data += chunk);
          response.on('end', () => resolve(data.trim()));
        }).on('error', reject);
      });
    };

    const outboundIP = await getOutboundIP();
    
    res.json({
      success: true,
      data: {
        outboundIP,
        timestamp: Date.now(),
        method: 'api.ipify.org'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to determine outbound IP',
      timestamp: Date.now()
    });
  }
});

export default router; 