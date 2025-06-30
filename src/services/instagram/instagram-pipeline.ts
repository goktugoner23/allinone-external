import InstagramService from './instagram-service';
import FirebaseInstagramService from '../firebase/firebase-instagram';
import { InstagramRAGIntegration } from './instagram-rag-integration';
import { InstagramCacheService } from './instagram-cache';
import { RAGService } from '../rag-service';
import { InstagramConfig, InstagramPost, InstagramAnalytics, InstagramMetrics, FirestoreInstagramPost, FirestoreInstagramMetrics } from '../../types/instagram';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import config from '../../config';
import logger from '../../utils/logger';

export interface InstagramPipelineResult {
  success: boolean;
  data: {
    posts: InstagramPost[];
    totalFetched: number;
    totalStored: number;
    ragSynced: boolean;
    lastSync: string;
    cacheUsed: boolean;
    cacheReason?: string;
  };
  error?: string;
  processingTime: number;
}

export class InstagramPipeline {
  private instagramService: InstagramService;
  private firebaseService: FirebaseInstagramService;
  private cacheService: InstagramCacheService;
  private ragIntegration: InstagramRAGIntegration | null = null;
  private db: FirebaseFirestore.Firestore;
  private readonly COLLECTION_NAME = 'instagram_business';
  private isInitialized = false;

  /**
   * Validate and clean post data before saving
   */
  private validateAndCleanPost(post: InstagramPost): InstagramPost {
    return {
      ...post,
      // Ensure username is either a string or null, never undefined
      username: post.username || null,
      // Ensure caption is never undefined
      caption: post.caption || '',
      // Ensure hashtags and mentions are arrays
      hashtags: post.hashtags || [],
      mentions: post.mentions || [],
      // Ensure metrics values are numbers, not undefined
      metrics: {
        ...post.metrics,
        likesCount: post.metrics.likesCount || 0,
        commentsCount: post.metrics.commentsCount || 0,
        sharesCount: post.metrics.sharesCount || 0,
        savesCount: post.metrics.savesCount || 0,
        reachCount: post.metrics.reachCount || 0,
        impressionsCount: post.metrics.impressionsCount || 0,
        engagementRate: post.metrics.engagementRate || 0,
        totalInteractions: post.metrics.totalInteractions || 0
      }
    };
  }

  constructor(instagramConfig: InstagramConfig) {
    // Initialize Instagram API service
    this.instagramService = new InstagramService(instagramConfig);
    
    // Initialize cache service
    this.cacheService = new InstagramCacheService();
    
    // Initialize Firebase
    this.initializeFirebase();
    this.db = getFirestore();
    
    // Configure Firestore to ignore undefined properties
    this.db.settings({
      ignoreUndefinedProperties: true
    });
    
    this.firebaseService = new FirebaseInstagramService();
  }

  /**
   * Initialize the pipeline (including RAG integration)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize RAG integration
      await this.initializeRAG();
      this.isInitialized = true;
      logger.info('Instagram pipeline initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Instagram pipeline:', error);
      throw error;
    }
  }

  private initializeFirebase(): void {
    if (getApps().length === 0) {
      let serviceAccount;
      
      if (config.firebase.serviceAccount) {
        try {
          // Check if it's a file path or JSON string
          if (config.firebase.serviceAccount.includes('{')) {
            // It's a JSON string
            serviceAccount = JSON.parse(config.firebase.serviceAccount);
          } else {
            // It's a file path
            const fs = require('fs');
            const path = require('path');
            const filePath = path.resolve(config.firebase.serviceAccount);
            
            if (fs.existsSync(filePath)) {
              const fileContent = fs.readFileSync(filePath, 'utf8');
              serviceAccount = JSON.parse(fileContent);
            } else {
              throw new Error(`Firebase service account file not found: ${filePath}`);
            }
          }
        } catch (error) {
          logger.error('Failed to parse Firebase service account JSON:', error);
          throw new Error('Invalid Firebase service account configuration');
        }
      }

      if (serviceAccount) {
        initializeApp({
          credential: cert(serviceAccount),
          projectId: config.firebase.projectId
        });
        logger.info('Firebase initialized with service account');
      } else {
        initializeApp({
          projectId: config.firebase.projectId
        });
        logger.info('Firebase initialized with default credentials');
      }
    }
  }

  private async initializeRAG(): Promise<void> {
    try {
      // Dynamic imports to avoid circular dependencies
      const OpenAIClient = (await import('../../clients/openai')).default;
      const EmbeddingService = (await import('../embedding')).default;
      const PineconeClient = (await import('../../clients/pinecone')).default;

      const openaiClient = new OpenAIClient();
      const pineconeClient = new PineconeClient();
      const embeddingService = new EmbeddingService(openaiClient, pineconeClient);
      const ragService = new RAGService(openaiClient, embeddingService, pineconeClient);

      // Initialize the RAG service (this is crucial!)
      await ragService.initialize();

      this.ragIntegration = new InstagramRAGIntegration(
        this.instagramService,
        ragService,
        this.firebaseService
      );
      
      logger.info('RAG integration initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize RAG integration:', error);
      // Continue without RAG if it fails
    }
  }

  /**
   * Main pipeline method with smart caching - only fetch if needed
   */
  async processInstagramData(limit: number = 25): Promise<InstagramPipelineResult> {
    const startTime = Date.now();
    
    try {
      // Ensure pipeline is initialized
      await this.initialize();
      
      logger.info('Starting smart Instagram data pipeline', { limit });

      // Step 1: Get current total posts count from Instagram API (lightweight check)
      logger.info('Step 1: Checking current Instagram post count');
      const accountInfo = await this.instagramService.getAccountInfo();
      const currentTotalPosts = accountInfo.mediaCount;
      
      logger.info(`Current Instagram total posts: ${currentTotalPosts}`);

      // Step 2: Check if cache needs refresh
      logger.info('Step 2: Checking cache status');
      const cacheCheck = await this.cacheService.shouldRefreshCache(currentTotalPosts);
      
      logger.info('Cache check result:', {
        shouldRefresh: cacheCheck.shouldRefresh,
        reason: cacheCheck.reason
      });

      let posts: InstagramPost[];
      let totalStored = 0;
      let ragSynced = false;
      let cacheUsed = false;
      let cacheReason = cacheCheck.reason;

      if (!cacheCheck.shouldRefresh && cacheCheck.cacheData) {
        // Use cached data
        logger.info('Step 3: Using cached data');
        posts = cacheCheck.cacheData.posts;
        cacheUsed = true;
        
        // Update last API check timestamp
        await this.cacheService.updateLastApiCheck();
        
        logger.info(`Returned ${posts.length} posts from cache`);
      } else {
        // Execute full pipeline
        logger.info('Step 3: Executing full pipeline (cache refresh needed)');
        
        // Step 3a: Fetch data from Instagram API
        logger.info('Step 3a: Fetching data from Instagram API');
        const instagramResponse = await this.instagramService.getPosts(limit);
        posts = instagramResponse.data;
        
        logger.info(`Fetched ${posts.length} posts from Instagram API`);

        // Step 3b: Store data in Firestore
        logger.info('Step 3b: Storing data in Firestore');
        totalStored = await this.storePostsInFirestore(posts);
        
        logger.info(`Stored ${totalStored} posts in Firestore`);

        // Step 3c: Update cache with new data
        logger.info('Step 3c: Updating cache');
        await this.cacheService.writeCache(posts, accountInfo, currentTotalPosts);
        
        logger.info('Cache updated successfully');

        // Step 3d: Sync to RAG system (if available and cache was refreshed)
        if (this.ragIntegration) {
          try {
            logger.info('Step 3d: Syncing to RAG system');
            await this.ragIntegration.syncFirestoreDataToRAG();
            ragSynced = true;
            logger.info('Successfully synced to RAG system');
          } catch (error) {
            logger.warn('RAG sync failed, continuing without it:', error);
          }
        } else {
          logger.info('RAG integration not available, skipping sync');
        }

        cacheUsed = false;
        cacheReason = 'Full pipeline executed - cache refreshed';
      }

      // Step 4: Return processed data
      const result: InstagramPipelineResult = {
        success: true,
        data: {
          posts,
          totalFetched: posts.length,
          totalStored,
          ragSynced,
          lastSync: new Date().toISOString(),
          cacheUsed,
          cacheReason
        },
        processingTime: Date.now() - startTime
      };

      logger.info('Smart Instagram data pipeline completed successfully', {
        totalReturned: posts.length,
        totalStored,
        ragSynced,
        cacheUsed,
        cacheReason,
        processingTime: result.processingTime
      });

      return result;

    } catch (error) {
      logger.error('Smart Instagram data pipeline failed:', error);
      
      return {
        success: false,
        data: {
          posts: [],
          totalFetched: 0,
          totalStored: 0,
          ragSynced: false,
          lastSync: new Date().toISOString(),
          cacheUsed: false,
          cacheReason: 'Pipeline failed'
        },
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Store Instagram posts in Firestore using proper Firebase service
   * Only stores new posts to avoid excess write operations
   */
  private async storePostsInFirestore(posts: InstagramPost[]): Promise<number> {
    try {
      logger.info('Checking for new Instagram posts to store in Firestore', { totalPosts: posts.length });
      
      // Batch check which posts already exist in Firestore (more efficient)
      const postIds = posts.map(post => post.id);
      const existenceMap = await this.firebaseService.postsExist(postIds);
      
      // Filter to only new posts using the batch results
      const newPosts = posts.filter(post => !existenceMap[post.id]);
      const existingPosts = posts.filter(post => existenceMap[post.id]);

      logger.info('Instagram posts analysis', {
        totalFetched: posts.length,
        newPosts: newPosts.length,
        existingPosts: existingPosts.length,
        skippedWrites: existingPosts.length
      });
      
      let storedCount = 0;
      
      // Only save new posts to avoid excess write operations
      if (newPosts.length > 0) {
        // Clean and validate posts before saving
        const cleanedPosts = newPosts.map(post => this.validateAndCleanPost(post));
        await this.firebaseService.savePosts(cleanedPosts);
        storedCount = cleanedPosts.length;
        
        logger.info('Successfully stored new Instagram posts to Firestore', { 
          newPostsStored: storedCount
        });
      } else {
        logger.info('No new Instagram posts to store - all posts already exist in Firestore');
      }
      
      // Update analytics summary with all posts (new + existing) for the Kotlin app compatibility
      if (posts.length > 0) {
        const analytics = await this.generateAnalyticsFromPosts(posts);
        await this.firebaseService.saveAnalyticsSummary(analytics);
        
        logger.info('Updated analytics summary with all posts', {
          totalPostsInAnalytics: posts.length
        });
      }
      
      return storedCount;
    } catch (error) {
      logger.error('Failed to store Instagram posts with metrics to Firestore:', error);
      throw error;
    }
  }

  /**
   * Generate analytics from posts for Kotlin app compatibility
   */
  private async generateAnalyticsFromPosts(posts: InstagramPost[]): Promise<InstagramAnalytics> {
    try {
      // Get account info
      const accountInfo = await this.instagramService.getAccountInfo();
      
      // Calculate summary metrics
      const totalEngagement = posts.reduce((sum, post) => 
        sum + post.metrics.likesCount + post.metrics.commentsCount + (post.metrics.savesCount || 0) + (post.metrics.sharesCount || 0), 0
      );
      
      const avgEngagementRate = posts.length > 0 
        ? posts.reduce((sum, post) => sum + post.metrics.engagementRate, 0) / posts.length 
        : 0;
      
      // Handle topPerformingPost with null checks
      const topPerformingPost = posts.length > 0 ? posts.reduce((top, post) => 
        post.metrics.engagementRate > (top?.metrics.engagementRate || 0) ? post : top,
        posts[0]
      ) : null;
      
      // Create content performance data
      const contentPerformance = posts.map(post => ({
        postId: post.id,
        shortcode: post.shortcode,
        publishedAt: post.timestamp,
        metrics: post.metrics,
        performance: {
          engagementScore: this.calculateEngagementScore(post.metrics),
          viralityScore: this.calculateViralityScore(post.metrics),
          reachEfficiency: this.calculateReachEfficiency(post.metrics),
        },
        benchmarks: {
          avgLikes: posts.reduce((sum, p) => sum + p.metrics.likesCount, 0) / posts.length,
          avgComments: posts.reduce((sum, p) => sum + p.metrics.commentsCount, 0) / posts.length,
          avgEngagementRate: avgEngagementRate
        }
      }));
      
      const analytics: InstagramAnalytics = {
        account: accountInfo,
        posts,
        stories: [],
        insights: [],
        audienceInsights: {
          age: {},
          gender: {},
          country: {},
          city: {},
          locale: {}
        },
        contentPerformance,
        summary: {
          totalPosts: posts.length,
          totalEngagement,
          avgEngagementRate,
          topPerformingPost,
          recentGrowth: {
            followers: 0,
            engagement: 0,
            reach: 0
          }
        }
      };
      
      return analytics;
    } catch (error) {
      logger.error('Error generating analytics from posts:', error);
      throw error;
    }
  }

  /**
   * Calculate engagement score for performance metrics
   */
  private calculateEngagementScore(metrics: InstagramMetrics): number {
    const engagement = metrics.likesCount + (metrics.commentsCount * 3) + (metrics.savesCount || 0) * 5;
    const reach = metrics.reachCount || metrics.impressionsCount || 1;
    return (engagement / reach) * 100;
  }

  /**
   * Calculate virality score for performance metrics
   */
  private calculateViralityScore(metrics: InstagramMetrics): number {
    const shares = metrics.sharesCount || 0;
    const saves = metrics.savesCount || 0;
    const reach = metrics.reachCount || metrics.impressionsCount || 1;
    return ((shares * 10 + saves * 5) / reach) * 100;
  }

  /**
   * Calculate reach efficiency for performance metrics
   */
  private calculateReachEfficiency(metrics: InstagramMetrics): number {
    const reach = metrics.reachCount || 0;
    const impressions = metrics.impressionsCount || 1;
    return (reach / impressions) * 100;
  }

  /**
   * Convert Instagram post to Firestore format
   */
  private convertToFirestoreFormat(post: InstagramPost): FirestoreInstagramPost {
    const metrics: FirestoreInstagramMetrics = {
      likes: post.metrics.likesCount,
      comments: post.metrics.commentsCount,
      shares: post.metrics.sharesCount || 0,
      saved: post.metrics.savesCount || 0,
      reach: post.metrics.reachCount || 0,
      views: post.metrics.impressionsCount || 0,
      total_interactions: post.metrics.likesCount + post.metrics.commentsCount + (post.metrics.savesCount || 0) + (post.metrics.sharesCount || 0)
    };

    // Convert media type
    let mediaType: 'FEED' | 'REEL' | 'STORY' = 'FEED';
    switch (post.mediaType) {
      case 'VIDEO':
        mediaType = 'REEL';
        break;
      case 'IMAGE':
      case 'CAROUSEL_ALBUM':
        mediaType = 'FEED';
        break;
      default:
        mediaType = 'FEED';
    }

    return {
      id: post.id,
      caption: post.caption,
      mediaType,
      permalink: post.permalink,
      timestamp: post.timestamp,
      formattedDate: this.formatDate(post.timestamp),
      metrics
    };
  }

  /**
   * Format timestamp to readable date
   */
  private formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  /**
   * Update metrics for existing posts (like Kotlin app does)
   */
  async updatePostsMetrics(postIds?: string[]): Promise<{
    updated: number;
    errors: number;
    results: Array<{ postId: string; success: boolean; error?: string }>;
  }> {
    try {
      logger.info('Starting Instagram posts metrics update', { postIds: postIds?.length || 'all' });

      let postsToUpdate: InstagramPost[];
      
      if (postIds && postIds.length > 0) {
        // Update specific posts
        const promises = postIds.map(id => this.firebaseService.getPostById(id));
        const results = await Promise.all(promises);
        postsToUpdate = results.filter(post => post !== null) as InstagramPost[];
      } else {
        // Update posts that need metrics refresh (older than 24 hours)
        postsToUpdate = await this.firebaseService.getPostsNeedingMetricsUpdate(24);
      }

      const results: Array<{ postId: string; success: boolean; error?: string }> = [];
      let updated = 0;
      let errors = 0;

      for (const post of postsToUpdate) {
        try {
          // Fetch fresh metrics from Instagram API
          const freshMetrics = await this.instagramService.getMediaInsights(post.id, post.mediaType);
          
          // Transform insights to metrics
          const updatedMetrics = this.instagramService['transformMetrics'](freshMetrics, {
            likesCount: post.metrics.likesCount,
            commentsCount: post.metrics.commentsCount
          });

          // Merge with existing metrics
          const mergedMetrics: InstagramMetrics = {
            ...post.metrics,
            ...updatedMetrics,
            totalInteractions: updatedMetrics.likesCount + updatedMetrics.commentsCount + 
              (updatedMetrics.savesCount || 0) + (updatedMetrics.sharesCount || 0)
          };

          // Update in Firestore
          await this.firebaseService.updatePostMetrics(post.id, mergedMetrics);
          
          results.push({ postId: post.id, success: true });
          updated++;
          
          logger.debug('Updated metrics for post', { 
            postId: post.id, 
            engagementRate: mergedMetrics.engagementRate 
          });

        } catch (error) {
          logger.error(`Failed to update metrics for post ${post.id}:`, error);
          results.push({ 
            postId: post.id, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
          errors++;
        }

        // Add small delay to avoid API rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info('Completed Instagram posts metrics update', {
        total: postsToUpdate.length,
        updated,
        errors
      });

      return { updated, errors, results };
    } catch (error) {
      logger.error('Error updating Instagram posts metrics:', error);
      throw error;
    }
  }

  /**
   * Sync fresh metrics from Instagram API to Firestore (like Kotlin app)
   * Optimized to avoid excess write operations
   */
  async syncMetricsToFirestore(limit: number = 50): Promise<{
    synced: number;
    errors: number;
    lastSync: string;
    newPosts: number;
    updatedPosts: number;
  }> {
    try {
      logger.info('Starting metrics sync from Instagram API to Firestore', { limit });

      // Get recent posts from Instagram API with fresh metrics
      const instagramResponse = await this.instagramService.getPosts(limit);
      const freshPosts = instagramResponse.data;

      // Batch check which posts already exist in Firestore (more efficient)
      const postIds = freshPosts.map(post => post.id);
      const existenceMap = await this.firebaseService.postsExist(postIds);

      // Separate new posts from existing ones using batch results
      const newPosts = freshPosts.filter(post => !existenceMap[post.id]);
      const existingPosts = freshPosts.filter(post => existenceMap[post.id]);

      logger.info('Metrics sync analysis', {
        totalFetched: freshPosts.length,
        newPosts: newPosts.length,
        existingPosts: existingPosts.length
      });

      let newPostsCount = 0;
      let updatedPostsCount = 0;
      let errors = 0;

      // Save new posts in batch
      if (newPosts.length > 0) {
        try {
          await this.firebaseService.savePosts(newPosts);
          newPostsCount = newPosts.length;
          logger.info('Successfully saved new posts in batch', { count: newPostsCount });
        } catch (error) {
          logger.error('Failed to save new posts in batch:', error);
          errors += newPosts.length;
        }
      }

      // Update existing posts with fresh metrics
      for (const post of existingPosts) {
        try {
          await this.firebaseService.updatePostMetrics(post.id, post.metrics);
          updatedPostsCount++;
        } catch (error) {
          logger.error(`Failed to update metrics for post ${post.id}:`, error);
          errors++;
        }

        // Add small delay to avoid overwhelming Firestore
        if (updatedPostsCount % 10 === 0 && updatedPostsCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      const lastSync = new Date().toISOString();
      const totalSynced = newPostsCount + updatedPostsCount;

      // Update analytics summary with fresh data
      if (totalSynced > 0) {
        const analytics = await this.generateAnalyticsFromPosts(freshPosts);
        await this.firebaseService.saveAnalyticsSummary(analytics);
      }

      logger.info('Completed metrics sync from Instagram API to Firestore', {
        totalSynced,
        newPosts: newPostsCount,
        updatedPosts: updatedPostsCount,
        errors,
        lastSync
      });

      return { 
        synced: totalSynced, 
        errors, 
        lastSync,
        newPosts: newPostsCount,
        updatedPosts: updatedPostsCount
      };
    } catch (error) {
      logger.error('Error syncing metrics to Firestore:', error);
      throw error;
    }
  }

  /**
   * Get account analytics with fresh data
   */
  async getAccountAnalytics(): Promise<any> {
    try {
      logger.info('Fetching account analytics');
      
      // Get account info from Instagram API
      const accountInfo = await this.instagramService.getAccountInfo();
      
      // Get posts from Firestore (stored data)
      const firestorePosts = await this.firebaseService.getAllPosts();
      
      // Calculate analytics
      const analytics = {
        account: accountInfo,
        posts: firestorePosts,
        summary: {
          totalPosts: firestorePosts.length,
          totalEngagement: firestorePosts.reduce((sum, post) => 
            sum + post.metrics.likesCount + post.metrics.commentsCount, 0
          ),
          avgEngagementRate: firestorePosts.length > 0 
            ? firestorePosts.reduce((sum, post) => sum + post.metrics.engagementRate, 0) / firestorePosts.length 
            : 0,
          lastUpdate: new Date().toISOString()
        }
      };

      return analytics;
    } catch (error) {
      logger.error('Failed to get account analytics:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    try {
      return await this.cacheService.getCacheStats();
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return { exists: false, error: error.message };
    }
  }

  /**
   * Clear cache manually
   */
  async clearCache(): Promise<void> {
    try {
      await this.cacheService.clearCache();
      logger.info('Cache cleared successfully');
    } catch (error) {
      logger.error('Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<{
    instagram: boolean;
    firestore: boolean;
    rag: boolean;
    cache: boolean;
    overall: boolean;
  }> {
    const health = {
      instagram: false,
      firestore: false,
      rag: false,
      cache: false,
      overall: false
    };

    try {
      // Check Instagram API
      health.instagram = await this.instagramService.healthCheck();
    } catch (error) {
      logger.error('Instagram health check failed:', error);
    }

    try {
      // Check Firestore
      health.firestore = await this.firebaseService.healthCheck();
    } catch (error) {
      logger.error('Firestore health check failed:', error);
    }

    try {
      // Check RAG (if available)
      if (this.ragIntegration) {
        // Simple check - try to get sync status
        await this.ragIntegration.getSyncStatus();
        health.rag = true;
      }
    } catch (error) {
      logger.error('RAG health check failed:', error);
    }

    try {
      // Check cache
      const cacheStats = await this.cacheService.getCacheStats();
      health.cache = true; // If we can get stats, cache service is working
    } catch (error) {
      logger.error('Cache health check failed:', error);
    }

    health.overall = health.instagram && health.firestore && health.cache;

    return health;
  }
}

export default InstagramPipeline; 