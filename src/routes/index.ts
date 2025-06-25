import { Router } from 'express';
import spotRoutes from './spot';
import futuresRoutes from './futures';
import coinmRoutes from './coinm';
import websocketRoutes from './websocket';
import healthRoutes from './health';
import ragRoutes from './rag';
import instagramRoutes from './instagram';

const router = Router();

// Health check routes
router.use('/', healthRoutes);

// Trading API routes
router.use('/api/binance/spot', spotRoutes);
router.use('/api/binance/futures', futuresRoutes);
router.use('/api/binance/coinm', coinmRoutes);

// WebSocket subscription routes
router.use('/api/binance', websocketRoutes);

// RAG system routes
router.use('/api/rag', ragRoutes);

// Instagram API routes
router.use('/api/instagram', instagramRoutes);

export default router;
