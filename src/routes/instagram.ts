import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import InstagramService from '../services/instagram/instagram-service';
import FirebaseInstagramService from '../services/firebase/firebase-instagram';
import InstagramPipeline from '../services/instagram/instagram-pipeline';
import { InstagramConfig } from '../types/instagram';
import config from '../config';
import logger from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';
import { Document } from '../types/rag';

const router = Router();

// Initialize Instagram service
const instagramConfig: InstagramConfig = {
  accessToken: config.instagram?.accessToken || '',
  userId: config.instagram?.userId || '',
  appId: config.instagram?.appId || '',
  appSecret: config.instagram?.appSecret || '',
  webhookVerifyToken: config.instagram?.webhookVerifyToken || '',
  apiVersion: config.instagram?.apiVersion || 'v18.0',
  pageAccessToken: config.instagram?.pageAccessToken || ''
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
 * Get Instagram posts from Firestore with automatic sync when post count differs
 * Frontend-optimized: Uses cached data but auto-syncs when new posts detected
 */
router.get('/firestore/posts', [
  query('forceSync').optional().isBoolean().toBoolean()
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { forceSync = false } = req.query;
  let syncTriggered = false;
  let syncResult = null;

  logger.info('Fetching Instagram posts from Firestore with smart sync check', { forceSync });

  try {
    // Always get current stored posts first (fast)
    const storedPosts = await firebaseInstagramService.getAllPosts();
    const storedCount = storedPosts.length;

    // Check if we need to sync (only if Instagram API is configured)
    if (instagramConfig.accessToken && (forceSync || storedCount === 0)) {
      logger.info('Checking for new posts on Instagram', { storedCount, forceSync });
      
      try {
        // Get current account info (lightweight API call)
        const accountInfo = await instagramService.getAccountInfo();
        const currentCount = accountInfo.mediaCount;

        logger.info('Post count comparison', { 
          stored: storedCount, 
          current: currentCount, 
          difference: currentCount - storedCount 
        });

        // Sync if post counts differ or forced
        if (forceSync || currentCount !== storedCount) {
          logger.info('Post count mismatch detected - triggering sync', {
            storedCount,
            currentCount,
            forced: forceSync
          });

          syncTriggered = true;
          
          // Trigger sync with reasonable limit
          const syncLimit = Math.max(25, currentCount - storedCount + 5);
          syncResult = await instagramPipeline.processInstagramData(syncLimit);

          if (syncResult.success) {
            logger.info('Auto-sync completed successfully', {
              newPosts: syncResult.data?.postsProcessed || 0,
              processingTime: syncResult.processingTime
            });
            
            // Get updated posts after sync
            const updatedPosts = await firebaseInstagramService.getAllPosts();
            
            return res.json({
              success: true,
              data: updatedPosts,
              count: updatedPosts.length,
              source: 'Firebase Firestore (Auto-synced)',
              syncInfo: {
                triggered: true,
                reason: forceSync ? 'forced' : 'post_count_mismatch',
                previousCount: storedCount,
                currentCount: updatedPosts.length,
                newPosts: updatedPosts.length - storedCount,
                processingTime: syncResult.processingTime
              },
              timestamp: Date.now()
            });
          } else {
            logger.warn('Auto-sync failed, returning stored data', {
              error: syncResult.error
            });
            // Fall through to return stored data with sync error info
          }
        } else {
          logger.info('Post counts match - no sync needed', { count: storedCount });
        }
      } catch (apiError) {
        logger.warn('Failed to check Instagram API for new posts, using stored data', {
          error: apiError instanceof Error ? apiError.message : 'Unknown error'
        });
        // Fall through to return stored data
      }
    }

    // Return stored data (either no sync needed or sync failed)
    res.json({
      success: true,
      data: storedPosts,
      count: storedPosts.length,
      source: 'Firebase Firestore' + (syncTriggered ? ' (Sync attempted)' : ''),
      syncInfo: {
        triggered: syncTriggered,
        success: syncResult?.success || false,
        error: syncResult?.error || null,
        reason: forceSync ? 'forced' : 'no_sync_needed'
      },
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Error in smart firestore posts endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Instagram posts',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
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

/**
 * POST /api/instagram/sync-complete
 * Complete sync: Instagram API → Firestore + JSON → RAG
 * This is what the Kotlin app should call
 */
router.post('/sync-complete', [
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
  const startTime = Date.now();

  logger.info('Starting complete Instagram sync pipeline', { limit });

  if (!instagramConfig.accessToken) {
    return res.status(400).json({
      success: false,
      error: 'Instagram access token not configured'
    });
  }

  try {
    // Step 1: Fetch fresh data from Instagram API
    logger.info('Step 1: Fetching fresh Instagram data...');
    const posts = await instagramService.getPosts(limit as number);
    const account = await instagramService.getAccountInfo();

    // Step 2: Store in Firestore
    logger.info('Step 2: Storing data in Firestore...');
    const firestoreResults = await Promise.all(
      posts.data.map(post => firebaseInstagramService.savePost(post))
    );

    // Step 3: Store in JSON file
    logger.info('Step 3: Creating comprehensive JSON file...');
    const jsonData = {
      account,
      posts: posts.data,
      metadata: {
        totalPosts: posts.data.length,
        lastSync: new Date().toISOString(),
        syncedBy: 'nodejs-api',
        source: 'instagram_business_api'
      },
      paging: posts.paging
    };

    const jsonPath = path.join(process.cwd(), 'data', 'instagram-complete-data.json');
    
    // Ensure data directory exists
    await fs.mkdir(path.dirname(jsonPath), { recursive: true });
    
    // Write JSON file
    await fs.writeFile(jsonPath, JSON.stringify(jsonData, null, 2), 'utf8');
    logger.info('JSON file created successfully', { path: jsonPath, postsCount: posts.data.length });

    // Step 4: Feed JSON to RAG system
    logger.info('Step 4: Loading JSON data into RAG system...');
    const ragResults = await loadJsonToRAG(jsonPath);

    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      message: 'Complete Instagram sync pipeline completed successfully',
      data: {
        account: {
          username: account.username,
          followersCount: account.followersCount,
          mediaCount: account.mediaCount
        },
        sync: {
          postsFromAPI: posts.data.length,
          postsToFirestore: firestoreResults.length,
          postsToRAG: ragResults.documentsAdded,
          jsonFilePath: jsonPath
        },
        rag: ragResults
      },
      processingTime,
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Complete Instagram sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Complete Instagram sync failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
      timestamp: Date.now()
    });
  }
}));

/**
 * POST /api/instagram/load-json-to-rag
 * Load existing JSON file to RAG system
 */
router.post('/load-json-to-rag', asyncHandler(async (req: Request, res: Response) => {
  logger.info('Loading existing JSON data to RAG system');

  try {
    const jsonPath = path.join(process.cwd(), 'data', 'instagram-complete-data.json');
    const ragResults = await loadJsonToRAG(jsonPath);

    res.json({
      success: true,
      message: 'JSON data loaded to RAG system successfully',
      data: ragResults,
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Failed to load JSON to RAG:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load JSON to RAG system',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
}));

/**
 * GET /api/instagram/json-status
 * Check JSON file status
 */
router.get('/json-status', asyncHandler(async (req: Request, res: Response) => {
  try {
    const jsonPath = path.join(process.cwd(), 'data', 'instagram-complete-data.json');
    
    try {
      const stats = await fs.stat(jsonPath);
      const content = await fs.readFile(jsonPath, 'utf8');
      const data = JSON.parse(content);

      res.json({
        success: true,
        data: {
          exists: true,
          filePath: jsonPath,
          fileSize: stats.size,
          lastModified: stats.mtime.toISOString(),
          postsCount: data.posts?.length || 0,
          accountUsername: data.account?.username,
          lastSync: data.metadata?.lastSync,
          source: data.metadata?.source
        },
        timestamp: Date.now()
      });

    } catch (fileError) {
      res.json({
        success: true,
        data: {
          exists: false,
          filePath: jsonPath,
          message: 'JSON file not found. Run /sync-complete first.'
        },
        timestamp: Date.now()
      });
    }

  } catch (error) {
    logger.error('Failed to check JSON status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check JSON file status',
      timestamp: Date.now()
    });
  }
}));

/**
 * Helper function to load JSON data to RAG system
 */
async function loadJsonToRAG(jsonPath: string): Promise<{
  documentsAdded: number;
  ragStatus: string;
  processingTime: number;
}> {
  const startTime = Date.now();
  
  try {
    // Read JSON file
    const content = await fs.readFile(jsonPath, 'utf8');
    const data = JSON.parse(content);
    
    if (!data.posts || !Array.isArray(data.posts)) {
      throw new Error('Invalid JSON format: posts array not found');
    }

    // Convert posts to RAG documents
    const documents: Document[] = data.posts.map((post: any, index: number) => ({
      id: `instagram-json-post-${post.id}`,
      content: createPostContentForRAG(post, data.account),
      metadata: {
        domain: 'instagram' as const,
        source: 'json_file',
        contentType: 'post' as const,
        createdAt: post.timestamp,
        updatedAt: new Date().toISOString(),
        tags: ['instagram', 'post', ...(post.hashtags || [])],
        type: 'instagram_post',
        postId: post.id,
        shortcode: post.shortcode,
        mediaType: post.mediaType,
        timestamp: post.timestamp,
        likesCount: post.metrics?.likesCount || 0,
        commentsCount: post.metrics?.commentsCount || 0,
        engagementRate: post.metrics?.engagementRate || 0,
        hashtags: post.hashtags || [],
        mentions: post.mentions || [],
        jsonIndex: index,
        loadedAt: new Date().toISOString()
      }
    }));

    // Import RAG service dynamically to avoid circular dependencies
    const { addDocumentsToRAG } = await import('./rag');
    
    // Add documents to RAG system in batches
    const batchSize = 10;
    let totalAdded = 0;
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      logger.info(`Adding batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(documents.length/batchSize)} to RAG`);
      
      const addedCount = await addDocumentsToRAG(batch);
      totalAdded += addedCount;
    }

    logger.info(`Successfully added ${totalAdded} documents to RAG system from JSON`);

    return {
      documentsAdded: totalAdded,
      ragStatus: 'loaded',
      processingTime: Date.now() - startTime
    };

  } catch (error) {
    logger.error('Failed to load JSON to RAG:', error);
    throw error;
  }
}

/**
 * Helper function to create RAG-optimized content from post
 */
function createPostContentForRAG(post: any, account: any): string {
  const metrics = post.metrics || {};
  const hashtags = (post.hashtags || []).join(' ');
  const mentions = (post.mentions || []).join(' ');
  
  return `
Instagram Post by @${account?.username || 'unknown'}

Caption: ${post.caption || 'No caption'}

Performance Metrics:
- Likes: ${metrics.likesCount || 0}
- Comments: ${metrics.commentsCount || 0}  
- Engagement Rate: ${(metrics.engagementRate || 0).toFixed(2)}%
- Views: ${metrics.viewsCount || 'N/A'}
- Reach: ${metrics.reachCount || 'N/A'}

Hashtags: ${hashtags}
${mentions ? `Mentions: ${mentions}` : ''}
Post Type: ${post.mediaType || 'UNKNOWN'}
Created: ${post.timestamp}

Analysis:
- Engagement Level: ${getEngagementLevel(metrics.engagementRate || 0)}
- Performance: ${getPerformanceDescription(metrics)}

This post had ${getPerformanceLevel(metrics)} performance.
`.trim();
}

/**
 * Helper functions for content analysis
 */
function getEngagementLevel(rate: number): string {
  if (rate > 5) return 'high';
  if (rate > 2) return 'moderate';
  return 'low';
}

function getPerformanceDescription(metrics: any): string {
  const comments = metrics.commentsCount || 0;
  if (comments > 20) return 'excellent engagement with many comments';
  if (comments > 10) return 'good engagement with several comments';
  if (comments > 5) return 'decent engagement with some comments';
  return 'basic engagement';
}

function getPerformanceLevel(metrics: any): string {
  const engagement = metrics.engagementRate || 0;
  if (engagement > 5) return 'excellent';
  if (engagement > 3) return 'strong';
  if (engagement > 1) return 'decent';
  return 'basic';
}

export default router; 