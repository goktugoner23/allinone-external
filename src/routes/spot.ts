import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  validateAsset, 
  validateSymbol, 
  validateOrderId, 
  validatePagination, 
  validateSpotOrder 
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

// ============= SPOT ACCOUNT & BALANCE ROUTES =============

// Get spot account information
router.get('/account', asyncHandler(async (req: Request, res: Response) => {
  const result = await binanceService.getSpotAccountInfo();
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

// Get spot balances
router.get('/balances', asyncHandler(async (req: Request, res: Response) => {
  const result = await binanceService.getSpotBalances();
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

// Get spot balance for specific asset
router.get('/balance/:asset?', validateAsset, asyncHandler(async (req: Request, res: Response) => {
  const { asset } = req.params;
  const result = asset 
    ? await binanceService.getSpotBalance(asset)
    : await binanceService.getSpotBalances();
  
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

// ============= SPOT ORDER MANAGEMENT ROUTES =============

// Get spot open orders
router.get('/orders', validatePagination, asyncHandler(async (req: Request, res: Response) => {
  const symbol = req.query.symbol as string | undefined;
  const result = await binanceService.getSpotOpenOrders(symbol);
  
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

// Place new spot order
router.post('/orders', validateSpotOrder, asyncHandler(async (req: Request, res: Response) => {
  const result = await binanceService.placeSpotOrder(req.body);
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.status(result.success ? 201 : 400).json(response);
}));

// Cancel specific spot order
router.delete('/orders/:symbol/:orderId', validateSymbol, validateOrderId, asyncHandler(async (req: Request, res: Response) => {
  const { symbol, orderId } = req.params;
  const result = await binanceService.cancelSpotOrder(symbol, orderId);
  
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

// Cancel all spot orders for symbol
router.delete('/orders/:symbol', validateSymbol, asyncHandler(async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const result = await binanceService.cancelAllSpotOrders(symbol);
  
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

// ============= SPOT MARKET DATA ROUTES =============

// Get spot price
router.get('/price/:symbol?', asyncHandler(async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const result = symbol 
    ? await binanceService.getSpotPrice(symbol)
    : await binanceService.getAllSpotPrices();
  
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

// Get spot 24hr ticker
router.get('/ticker/:symbol?', asyncHandler(async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const result = await binanceService.getSpot24hrTicker(symbol);
  
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

// Get spot order book
router.get('/depth/:symbol', validateSymbol, validatePagination, asyncHandler(async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const result = await binanceService.getSpotOrderBook(symbol, limit);
  
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

// Get spot recent trades
router.get('/trades/:symbol', validateSymbol, validatePagination, asyncHandler(async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 500;
  const result = await binanceService.getSpotRecentTrades(symbol, limit);
  
  const response: ApiResponse = {
    success: result.success,
    data: result.data,
    error: result.error,
    timestamp: Date.now()
  };
  res.json(response);
}));

export default router; 