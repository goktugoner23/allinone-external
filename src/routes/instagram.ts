import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import InstagramService from '../services/instagram/instagram-service';
import FirebaseInstagramService from '../services/firebase/firebase-instagram';
import InstagramPipeline from '../services/instagram/instagram-pipeline';
import { InstagramConfig } from '../types/instagram';
import config from '../config';
import logger from '../utils/logger';

const router = Router();

// Initialize Instagram service
const instagramConfig: InstagramConfig = {
  accessToken: config.instagram?.accessToken || '',
  userId: config.instagram?.userId || '',
  appId: config.instagram?.appId || '',
  appSecret: config.instagram?.appSecret || '',
  webhookVerifyToken: config.instagram?.webhookVerifyToken || '',
  apiVersion: config.instagram?.apiVersion || 'v18.0'
};

const instagramService = new InstagramService(instagramConfig);
const firebaseInstagramService = new FirebaseInstagramService();
const instagramPipeline = new InstagramPipeline(instagramConfig);

/**
 * POST /api/instagram/sync
 * Main endpoint for Kotlin app - Fetch from Instagram API, store in Firestore, sync to RAG
 */
router.post('/sync', [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { limit = 25 } = req.query;

  logger.info('Starting Instagram data sync pipeline', { limit });

  if (!instagramConfig.accessToken) {
    return res.status(400).json({
      success: false,
      error: 'Instagram access token not configured'
    });
  }

  const result = await instagramPipeline.processInstagramData(limit as number);

  if (result.success) {
    res.json({
      success: true,
      message: 'Instagram data sync completed successfully',
      data: result.data,
      processingTime: result.processingTime,
      timestamp: Date.now()
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'Instagram data sync failed',
      details: result.error,
      processingTime: result.processingTime,
      timestamp: Date.now()
    });
  }
}));

/**
 * GET /api/instagram/analytics
 * Get comprehensive analytics combining fresh account data with stored posts
 */
router.get('/analytics', asyncHandler(async (req: Request, res: Response) => {
  logger.info('Fetching comprehensive Instagram analytics');

  if (!instagramConfig.accessToken) {
    return res.status(400).json({
      success: false,
      error: 'Instagram access token not configured'
    });
  }

  const analytics = await instagramPipeline.getAccountAnalytics();

  res.json({
    success: true,
    data: analytics,
    timestamp: Date.now()
  });
}));

/**
 * GET /api/instagram/status
 * Get comprehensive health status of all Instagram services
 */
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  logger.info('Checking Instagram pipeline status');

  const health = await instagramPipeline.healthCheck();

  res.json({
    success: true,
    health,
    timestamp: Date.now()
  });
}));

/**
 * GET /api/instagram/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', asyncHandler(async (req: Request, res: Response) => {
  logger.info('Getting Instagram cache statistics');

  const cacheStats = await instagramPipeline.getCacheStats();

  res.json({
    success: true,
    data: cacheStats,
    timestamp: Date.now()
  });
}));

/**
 * DELETE /api/instagram/cache
 * Clear Instagram cache
 */
router.delete('/cache', asyncHandler(async (req: Request, res: Response) => {
  logger.info('Clearing Instagram cache');

  await instagramPipeline.clearCache();

  res.json({
    success: true,
    message: 'Cache cleared successfully',
    timestamp: Date.now()
  });
}));

/**
 * GET /api/instagram/account
 * Get Instagram account information
 */
router.get('/account', asyncHandler(async (req: Request, res: Response) => {
  logger.info('Fetching Instagram account information');

  if (!instagramConfig.accessToken) {
    return res.status(400).json({
      success: false,
      error: 'Instagram access token not configured'
    });
  }

  const account = await instagramService.getAccountInfo();

  res.json({
    success: true,
    data: account,
    timestamp: Date.now()
  });
}));

/**
 * GET /api/instagram/posts
 * Get Instagram posts with pagination
 */
router.get('/posts', [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('after').optional().isString()
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { limit = 25, after } = req.query;

  logger.info('Fetching Instagram posts', { limit, after });

  if (!instagramConfig.accessToken) {
    return res.status(400).json({
      success: false,
      error: 'Instagram access token not configured'
    });
  }

  const posts = await instagramService.getPosts(limit as number, after as string);

  res.json({
    success: true,
    data: posts.data,
    paging: posts.paging,
    timestamp: Date.now()
  });
}));



/**
 * GET /api/instagram/health
 * Health check for Instagram API connection
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  logger.info('Checking Instagram API health');

  if (!instagramConfig.accessToken) {
    return res.status(400).json({
      success: false,
      error: 'Instagram access token not configured',
      health: {
        instagram: false,
        configured: false
      }
    });
  }

  const isHealthy = await instagramService.healthCheck();

  res.json({
    success: true,
    health: {
      instagram: isHealthy,
      configured: true
    },
    timestamp: Date.now()
  });
}));

/**
 * GET /api/instagram/firestore/posts
 * Get Instagram posts from Firestore (existing data from your Kotlin app)
 */
router.get('/firestore/posts', asyncHandler(async (req: Request, res: Response) => {
  logger.info('Fetching Instagram posts from Firestore');

  const posts = await firebaseInstagramService.getAllPosts();

  res.json({
    success: true,
    data: posts,
    count: posts.length,
    source: 'Firebase Firestore',
    timestamp: Date.now()
  });
}));

/**
 * GET /api/instagram/firestore/raw
 * Get raw Instagram data from Firestore (same format as your Kotlin app export)
 */
router.get('/firestore/raw', asyncHandler(async (req: Request, res: Response) => {
  logger.info('Fetching raw Instagram data from Firestore');

  const rawData = await firebaseInstagramService.getRawFirestoreData();

  res.json({
    success: true,
    ...rawData
  });
}));

/**
 * GET /api/instagram/firestore/health
 * Health check for Firebase Firestore connection
 */
router.get('/firestore/health', asyncHandler(async (req: Request, res: Response) => {
  logger.info('Checking Firebase Firestore health');

  const isHealthy = await firebaseInstagramService.healthCheck();

  res.json({
    success: true,
    health: {
      firestore: isHealthy,
      configured: !!(config.firebase?.projectId)
    },
    timestamp: Date.now()
  });
}));

/**
 * POST /api/instagram/metrics/update
 * Update metrics for specific posts or all posts needing refresh (like Kotlin app)
 */
router.post('/metrics/update', [
  query('postIds').optional().custom((value) => {
    if (value) {
      const ids = value.split(',').map((id: string) => id.trim());
      return ids.every((id: string) => id.length > 0);
    }
    return true;
  })
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { postIds } = req.query;
  const postIdsArray = postIds ? (postIds as string).split(',').map(id => id.trim()) : undefined;

  logger.info('Starting Instagram posts metrics update', { 
    postIds: postIdsArray?.length || 'all' 
  });

  if (!instagramConfig.accessToken) {
    return res.status(400).json({
      success: false,
      error: 'Instagram access token not configured'
    });
  }

  const result = await instagramPipeline.updatePostsMetrics(postIdsArray);

  res.json({
    success: true,
    message: 'Instagram posts metrics update completed',
    data: result,
    timestamp: Date.now()
  });
}));

/**
 * POST /api/instagram/metrics/sync
 * Sync fresh metrics from Instagram API to Firestore (like Kotlin app)
 */
router.post('/metrics/sync', [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { limit = 50 } = req.query;

  logger.info('Starting metrics sync from Instagram API to Firestore', { limit });

  if (!instagramConfig.accessToken) {
    return res.status(400).json({
      success: false,
      error: 'Instagram access token not configured'
    });
  }

  const result = await instagramPipeline.syncMetricsToFirestore(limit as number);

  res.json({
    success: true,
    message: 'Instagram metrics sync to Firestore completed',
    data: result,
    timestamp: Date.now()
  });
}));

/**
 * POST /api/instagram/firestore/sync-to-rag
 * Sync Firestore Instagram data to RAG system
 */
router.post('/firestore/sync-to-rag', asyncHandler(async (req: Request, res: Response) => {
  logger.info('Starting sync of Firestore Instagram data to RAG');

  try {
    // Import required services
    const { RAGService } = await import('../services/rag-service');
    const { InstagramRAGIntegration } = await import('../services/instagram/instagram-rag-integration');
    const OpenAIClient = (await import('../clients/openai')).default;
    const EmbeddingService = (await import('../services/embedding')).default;
    const PineconeClient = (await import('../clients/pinecone')).default;

    // Initialize services
    const openaiClient = new OpenAIClient();
    const pineconeClient = new PineconeClient();
    const embeddingService = new EmbeddingService(openaiClient, pineconeClient);
    const ragService = new RAGService(openaiClient, embeddingService, pineconeClient);

    // Initialize the RAG service (crucial step!)
    await ragService.initialize();

    const instagramRAGIntegration = new InstagramRAGIntegration(instagramService, ragService, firebaseInstagramService);

    const syncStatus = await instagramRAGIntegration.syncFirestoreDataToRAG();

    res.json({
      success: true,
      data: syncStatus,
      message: 'Firestore Instagram data sync completed',
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error syncing Firestore data to RAG:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync Firestore data to RAG',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
}));

export default router; 