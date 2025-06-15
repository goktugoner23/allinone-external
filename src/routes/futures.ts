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

// ============= USD-M FUTURES ACCOUNT & POSITION ROUTES =============

// Get USD-M account information
router.get('/account', asyncHandler(async (req: Request, res: Response) => {
  const result = await binanceService.getAccountInfo();
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

// Get USD-M positions
router.get('/positions', asyncHandler(async (req: Request, res: Response) => {
  const result = await binanceService.getPositions();
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

// Get USD-M balance
router.get('/balance/:asset?', validateAsset, asyncHandler(async (req: Request, res: Response) => {
  const { asset } = req.params;
  const result = await binanceService.getBalance(asset);
  
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

// ============= USD-M FUTURES ORDER MANAGEMENT ROUTES =============

// Get USD-M open orders
router.get('/orders', validatePagination, asyncHandler(async (req: Request, res: Response) => {
  const symbol = req.query.symbol as string | undefined;
  const result = await binanceService.getOpenOrders(symbol);
  
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

// Place new USD-M order
router.post('/orders', validateFuturesOrder, asyncHandler(async (req: Request, res: Response) => {
  const result = await binanceService.placeOrder(req.body);
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.status(result.success ? 201 : 400).json(response);
}));

// Cancel specific USD-M order
router.delete('/orders/:symbol/:orderId', validateSymbol, validateOrderId, asyncHandler(async (req: Request, res: Response) => {
  const { symbol, orderId } = req.params;
  const result = await binanceService.cancelOrder(symbol, orderId);
  
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

// Cancel all USD-M orders for symbol
router.delete('/orders/:symbol', validateSymbol, asyncHandler(async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const result = await binanceService.cancelAllOrders(symbol);
  
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

// ============= USD-M FUTURES RISK MANAGEMENT ROUTES =============

// Set Take Profit and Stop Loss for USD-M
router.post('/tpsl', validateTPSL, asyncHandler(async (req: Request, res: Response) => {
  const { symbol, side, takeProfitPrice, stopLossPrice, quantity } = req.body;
  const result = await binanceService.setTPSL(symbol, side, takeProfitPrice, stopLossPrice, quantity);
  
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.status(result.success ? 201 : 400).json(response);
}));

// Close Position for USD-M
router.post('/close-position', validateSymbol, asyncHandler(async (req: Request, res: Response) => {
  const { symbol, quantity } = req.body;
  
  if (!symbol) {
    return res.status(400).json({
      success: false,
      error: 'Symbol is required',
      timestamp: Date.now()
    });
  }

  const result = await binanceService.closePosition(symbol, quantity);
  
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.status(result.success ? 201 : 400).json(response);
}));

// ============= USD-M FUTURES MARKET DATA ROUTES =============

// Get USD-M price
router.get('/price/:symbol?', asyncHandler(async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const result = symbol 
    ? await binanceService.getPrice(symbol)
    : await binanceService.getAllPrices();
  
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

export default router;
