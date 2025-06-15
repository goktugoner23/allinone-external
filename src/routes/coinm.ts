import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  validateAsset, 
  validateSymbol, 
  validateOrderId, 
  validatePagination, 
  validateFuturesOrder,
  validateTPSL 
} from '../middleware/validation';
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

// ============= COIN-M FUTURES ACCOUNT & POSITION ROUTES =============

// Get COIN-M account information
router.get('/account', asyncHandler(async (req: Request, res: Response) => {
  const result = await binanceService.getCoinMAccountInfo();
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

// Get COIN-M positions
router.get('/positions', asyncHandler(async (req: Request, res: Response) => {
  const result = await binanceService.getCoinMPositions();
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

// Get COIN-M balance
router.get('/balance/:asset?', validateAsset, asyncHandler(async (req: Request, res: Response) => {
  const { asset } = req.params;
  const result = await binanceService.getCoinMBalance(asset);
  
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

// ============= COIN-M FUTURES ORDER MANAGEMENT ROUTES =============

// Get COIN-M open orders
router.get('/orders', validatePagination, asyncHandler(async (req: Request, res: Response) => {
  const symbol = req.query.symbol as string | undefined;
  const result = await binanceService.getCoinMOpenOrders(symbol);
  
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

// Place new COIN-M order
router.post('/orders', validateFuturesOrder, asyncHandler(async (req: Request, res: Response) => {
  const result = await binanceService.placeCoinMOrder(req.body);
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.status(result.success ? 201 : 400).json(response);
}));

// Cancel specific COIN-M order
router.delete('/orders/:symbol/:orderId', validateSymbol, validateOrderId, asyncHandler(async (req: Request, res: Response) => {
  const { symbol, orderId } = req.params;
  const result = await binanceService.cancelCoinMOrder(symbol, orderId);
  
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

// Cancel all COIN-M orders for symbol
router.delete('/orders/:symbol', validateSymbol, asyncHandler(async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const result = await binanceService.cancelAllCoinMOrders(symbol);
  
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

// ============= COIN-M FUTURES RISK MANAGEMENT ROUTES =============

// Set Take Profit and Stop Loss for COIN-M
router.post('/tpsl', validateTPSL, asyncHandler(async (req: Request, res: Response) => {
  const { symbol, side, takeProfitPrice, stopLossPrice, quantity } = req.body;
  const result = await binanceService.setCoinMTPSL(symbol, side, takeProfitPrice, stopLossPrice, quantity);
  
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.status(result.success ? 201 : 400).json(response);
}));

// Close Position for COIN-M
router.post('/close-position', validateSymbol, asyncHandler(async (req: Request, res: Response) => {
  const { symbol, quantity } = req.body;
  
  if (!symbol) {
    return res.status(400).json({
      success: false,
      error: 'Symbol is required',
      timestamp: Date.now()
    });
  }

  const result = await binanceService.closeCoinMPosition(symbol, quantity);
  
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.status(result.success ? 201 : 400).json(response);
}));

// ============= COIN-M FUTURES MARKET DATA ROUTES =============

// Get COIN-M price
router.get('/price/:symbol?', asyncHandler(async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const result = symbol 
    ? await binanceService.getCoinMPrice(symbol)
    : await binanceService.getAllCoinMPrices();
  
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

export default router;
