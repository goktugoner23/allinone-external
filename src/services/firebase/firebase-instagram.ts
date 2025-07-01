import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { FirestoreInstagramPost, FirestoreInstagramMetrics, InstagramPost, InstagramMetrics, InstagramAnalytics, InstagramAccount } from '../../types/instagram';
import config from '../../config';
import logger from '../../utils/logger';

export class FirebaseInstagramService {
  private db: FirebaseFirestore.Firestore;
  private readonly COLLECTION_NAME = 'instagram_business';

  /**
   * Clean undefined values from an object recursively
   */
  private cleanUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanUndefinedValues(item));
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.cleanUndefinedValues(value);
        }
      }
      return cleaned;
    }
    
    return obj;
  }

  constructor() {
    // Initialize Firebase Admin if not already initialized
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
              
              // Fix private key newlines
              if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
              }
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
        // Use default credentials in production
        initializeApp({
          projectId: config.firebase.projectId
        });
        logger.info('Firebase initialized with default credentials');
      }
    }

    this.db = getFirestore();
    
    // Configure Firestore to ignore undefined properties (only if not already configured)
    try {
      this.db.settings({
        ignoreUndefinedProperties: true
      });
    } catch (error) {
      // Settings already applied, ignore error
      logger.debug('Firestore settings already configured');
    }
  }

  /**
   * Get all Instagram posts from Firestore
   */
  async getAllPosts(): Promise<InstagramPost[]> {
    try {
      logger.info('Fetching Instagram posts from Firestore');

      const snapshot = await this.db.collection(this.COLLECTION_NAME).get();
      const posts: InstagramPost[] = [];

      snapshot.docs.forEach(doc => {
        const firestorePost = doc.data() as FirestoreInstagramPost;
        const convertedPost = this.convertFirestoreToInstagramPost(firestorePost);
        posts.push(convertedPost);
      });

      logger.info(`Successfully fetched ${posts.length} Instagram posts from Firestore`);
      return posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      logger.error('Error fetching Instagram posts from Firestore:', error);
      throw new Error(`Failed to fetch Instagram posts: ${error}`);
    }
  }

  /**
   * Get Instagram posts with pagination
   */
  async getPostsPaginated(limit: number = 25, startAfter?: string): Promise<{
    posts: InstagramPost[];
    hasMore: boolean;
    lastPostId?: string;
  }> {
    try {
      logger.info('Fetching paginated Instagram posts from Firestore', { limit, startAfter });

      let query = this.db.collection(this.COLLECTION_NAME)
        .orderBy('timestamp', 'desc')
        .limit(limit + 1); // Get one extra to check if there are more

      if (startAfter) {
        const startAfterDoc = await this.db.collection(this.COLLECTION_NAME).doc(startAfter).get();
        if (startAfterDoc.exists) {
          query = query.startAfter(startAfterDoc);
        }
      }

      const snapshot = await query.get();
      const posts: InstagramPost[] = [];

      snapshot.docs.slice(0, limit).forEach(doc => {
        const firestorePost = doc.data() as FirestoreInstagramPost;
        const convertedPost = this.convertFirestoreToInstagramPost(firestorePost);
        posts.push(convertedPost);
      });

      const hasMore = snapshot.docs.length > limit;
      const lastPostId = posts.length > 0 ? posts[posts.length - 1].id : undefined;

      logger.info(`Successfully fetched ${posts.length} paginated Instagram posts from Firestore`);
      return { posts, hasMore, lastPostId };
    } catch (error) {
      logger.error('Error fetching paginated Instagram posts from Firestore:', error);
      throw new Error(`Failed to fetch paginated Instagram posts: ${error}`);
    }
  }

  /**
   * Get a specific Instagram post by ID
   */
  async getPostById(postId: string): Promise<InstagramPost | null> {
    try {
      logger.debug('Fetching Instagram post by ID from Firestore', { postId });

      const doc = await this.db.collection(this.COLLECTION_NAME).doc(postId).get();
      
      if (!doc.exists) {
        logger.warn('Instagram post not found in Firestore', { postId });
        return null;
      }

      const firestorePost = doc.data() as FirestoreInstagramPost;
      const convertedPost = this.convertFirestoreToInstagramPost(firestorePost);

      logger.debug('Successfully fetched Instagram post by ID from Firestore', { postId });
      return convertedPost;
    } catch (error) {
      logger.error('Error fetching Instagram post by ID from Firestore:', error);
      throw new Error(`Failed to fetch Instagram post: ${error}`);
    }
  }

  /**
   * Get Instagram analytics from Firestore data
   */
  async getAnalytics(postsLimit?: number): Promise<InstagramAnalytics> {
    try {
      logger.info('Generating Instagram analytics from Firestore data', { postsLimit });

      const allPosts = await this.getAllPosts();
      const posts = postsLimit ? allPosts.slice(0, postsLimit) : allPosts;

      // Calculate summary metrics
      const totalEngagement = posts.reduce((sum, post) => 
        sum + post.metrics.likesCount + post.metrics.commentsCount + (post.metrics.savesCount || 0) + (post.metrics.sharesCount || 0), 0
      );

      const totalReach = posts.reduce((sum, post) => sum + (post.metrics.reachCount || 0), 0);
      const avgEngagementRate = posts.length > 0 
        ? posts.reduce((sum, post) => sum + post.metrics.engagementRate, 0) / posts.length 
        : 0;

      const topPerformingPost = posts.reduce((top, post) => 
        post.metrics.engagementRate > (top?.metrics.engagementRate || 0) ? post : top,
        posts[0]
      );

      // Create mock account data (since we don't have it in Firestore)
      const mockAccount: InstagramAccount = {
        id: 'user_from_firestore',
        username: 'extracted_from_posts',
        accountType: 'BUSINESS',
        mediaCount: posts.length,
        followersCount: 0, // Not available in Firestore
        followsCount: 0,   // Not available in Firestore
        biography: '',
        website: ''
      };

      // Calculate content performance
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
        account: mockAccount,
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
            followers: 0, // Calculate from historical data if available
            engagement: 0,
            reach: 0
          }
        }
      };

      logger.info('Successfully generated Instagram analytics from Firestore data', {
        postsCount: posts.length,
        totalEngagement,
        avgEngagementRate
      });

      return analytics;
    } catch (error) {
      logger.error('Error generating Instagram analytics from Firestore:', error);
      throw new Error(`Failed to generate Instagram analytics: ${error}`);
    }
  }

  /**
   * Get raw Firestore data (for compatibility with your current export)
   */
  async getRawFirestoreData(): Promise<{
    posts: FirestoreInstagramPost[];
    metadata: {
      timestamp: number;
      count: number;
      source: string;
    };
  }> {
    try {
      logger.info('Fetching raw Instagram data from Firestore');

      const snapshot = await this.db.collection(this.COLLECTION_NAME).get();
      const posts: FirestoreInstagramPost[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data() as FirestoreInstagramPost;
        posts.push(data);
      });

      const result = {
        posts,
        metadata: {
          timestamp: Date.now(),
          count: posts.length,
          source: 'Firebase Firestore'
        }
      };

      logger.info(`Successfully fetched ${posts.length} raw Instagram posts from Firestore`);
      return result;
    } catch (error) {
      logger.error('Error fetching raw Instagram data from Firestore:', error);
      throw new Error(`Failed to fetch raw Instagram data: ${error}`);
    }
  }

  /**
   * Convert Firestore post to Instagram post format
   */
  private convertFirestoreToInstagramPost(firestorePost: FirestoreInstagramPost): InstagramPost {
    // Extract hashtags from caption
    const hashtags = this.extractHashtags(firestorePost.caption);
    
    // Extract mentions from caption
    const mentions = this.extractMentions(firestorePost.caption);

    // Extract shortcode from permalink
    const shortcode = this.extractShortcode(firestorePost.permalink);

    // Calculate engagement rate
    const engagementRate = this.calculateEngagementRate(firestorePost.metrics);

    // Convert metrics based on media type
    const isVideo = firestorePost.mediaType === 'REEL';
    const metrics: InstagramMetrics = {
      likesCount: firestorePost.metrics.likes,
      commentsCount: firestorePost.metrics.comments,
      sharesCount: firestorePost.metrics.shares,
      savesCount: firestorePost.metrics.saved,
      reachCount: firestorePost.metrics.reach,
      // For FEED posts, views = impressions. For REELS, views = video views
      impressionsCount: isVideo ? 0 : firestorePost.metrics.views,
      videoViewsCount: isVideo ? firestorePost.metrics.views : 0,
      engagementRate,
      totalInteractions: firestorePost.metrics.total_interactions,
      // Add reel-specific metrics if available
      ...(isVideo && firestorePost.metrics.ig_reels_avg_watch_time && {
        igReelsAvgWatchTime: firestorePost.metrics.ig_reels_avg_watch_time
      })
    };

    // Convert media type
    let mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' = 'IMAGE';
    switch (firestorePost.mediaType) {
      case 'REEL':
        mediaType = 'VIDEO';
        break;
      case 'FEED':
        mediaType = 'IMAGE';
        break;
      default:
        mediaType = 'IMAGE';
    }

    return {
      id: firestorePost.id,
      shortcode,
      caption: firestorePost.caption,
      mediaType,
      mediaUrl: '',
      permalink: firestorePost.permalink,
      timestamp: firestorePost.timestamp,
      username: firestorePost.username || null,
      metrics,
      hashtags,
      mentions,
      formattedDate: firestorePost.formattedDate
    };
  }

  /**
   * Extract hashtags from caption
   */
  private extractHashtags(caption: string): string[] {
    // Updated regex to support Unicode characters including Turkish (ğ, ü, ö, ş, ç, ı)
    const hashtagRegex = /#[\p{L}\p{N}_]+/gu;
    return caption.match(hashtagRegex) || [];
  }

  /**
   * Extract mentions from caption
   */
  private extractMentions(caption: string): string[] {
    const mentionRegex = /@[\w.]+/g;
    return caption.match(mentionRegex) || [];
  }

  /**
   * Extract shortcode from permalink
   */
  private extractShortcode(permalink: string): string {
    const match = permalink.match(/\/p\/([^\/]+)\//);
    return match ? match[1] : '';
  }

  /**
   * Calculate engagement rate from Firestore metrics
   */
  private calculateEngagementRate(metrics: FirestoreInstagramMetrics): number {
    if (metrics.reach === 0) return 0;
    return ((metrics.likes + metrics.comments + metrics.saved + metrics.shares) / metrics.reach) * 100;
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(metrics: InstagramMetrics): number {
    const engagement = metrics.likesCount + (metrics.commentsCount * 3) + (metrics.savesCount || 0) * 5;
    const reach = metrics.reachCount || metrics.impressionsCount || 1;
    return (engagement / reach) * 100;
  }

  /**
   * Calculate virality score
   */
  private calculateViralityScore(metrics: InstagramMetrics): number {
    const shares = metrics.sharesCount || 0;
    const saves = metrics.savesCount || 0;
    const reach = metrics.reachCount || metrics.impressionsCount || 1;
    return ((shares * 10 + saves * 5) / reach) * 100;
  }

  /**
   * Calculate reach efficiency
   */
  private calculateReachEfficiency(metrics: InstagramMetrics): number {
    const reach = metrics.reachCount || 0;
    const impressions = metrics.impressionsCount || 1;
    return (reach / impressions) * 100;
  }

  /**
   * Health check for Firebase connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const snapshot = await this.db.collection(this.COLLECTION_NAME).limit(1).get();
      return true;
    } catch (error) {
      logger.error('Firebase Instagram health check failed:', error);
      return false;
    }
  }

  /**
   * Save a single Instagram post with metrics to Firestore
   */
  async savePost(post: InstagramPost): Promise<void> {
    try {
      logger.info('Saving Instagram post to Firestore', { postId: post.id });

      const firestorePost: FirestoreInstagramPost = this.convertInstagramPostToFirestore(post);
      const cleanedPost = this.cleanUndefinedValues(firestorePost);
      
      await this.db.collection(this.COLLECTION_NAME).doc(post.id).set(cleanedPost, { merge: true });

      logger.info('Successfully saved Instagram post to Firestore', { 
        postId: post.id,
        engagementRate: post.metrics.engagementRate,
        totalInteractions: post.metrics.totalInteractions
      });
    } catch (error) {
      logger.error('Error saving Instagram post to Firestore:', error);
      throw new Error(`Failed to save Instagram post: ${error}`);
    }
  }

  /**
   * Save multiple Instagram posts to Firestore in batch
   */
  async savePosts(posts: InstagramPost[]): Promise<void> {
    try {
      logger.info('Saving Instagram posts to Firestore in batch', { count: posts.length });

      // Firestore has a limit of 500 operations per batch
      const batchSize = 500;
      const batches = [];

      for (let i = 0; i < posts.length; i += batchSize) {
        const batch = this.db.batch();
        const batchPosts = posts.slice(i, i + batchSize);

        batchPosts.forEach(post => {
          const firestorePost: FirestoreInstagramPost = this.convertInstagramPostToFirestore(post);
          const cleanedPost = this.cleanUndefinedValues(firestorePost);
          const docRef = this.db.collection(this.COLLECTION_NAME).doc(post.id);
          batch.set(docRef, cleanedPost, { merge: true });
        });

        batches.push(batch.commit());
      }

      await Promise.all(batches);

      logger.info('Successfully saved Instagram posts to Firestore in batch', {
        totalPosts: posts.length,
        batchesCreated: batches.length
      });
    } catch (error) {
      logger.error('Error saving Instagram posts to Firestore in batch:', error);
      throw new Error(`Failed to save Instagram posts: ${error}`);
    }
  }

  /**
   * Update metrics for an existing post
   */
  async updatePostMetrics(postId: string, metrics: InstagramMetrics): Promise<void> {
    try {
      logger.info('Updating Instagram post metrics in Firestore', { postId });

      const firestoreMetrics: FirestoreInstagramMetrics = this.convertMetricsToFirestore(metrics);
      const updateData = this.cleanUndefinedValues({
        metrics: firestoreMetrics,
        lastUpdated: new Date().toISOString()
      });
      
      await this.db.collection(this.COLLECTION_NAME).doc(postId).update(updateData);

      logger.info('Successfully updated Instagram post metrics in Firestore', {
        postId,
        engagementRate: metrics.engagementRate,
        totalInteractions: metrics.totalInteractions
      });
    } catch (error) {
      logger.error('Error updating Instagram post metrics in Firestore:', error);
      throw new Error(`Failed to update Instagram post metrics: ${error}`);
    }
  }

  /**
   * Save analytics summary to Firestore
   */
  async saveAnalyticsSummary(analytics: InstagramAnalytics): Promise<void> {
    try {
      logger.info('Saving Instagram analytics summary to Firestore');

      const analyticsDoc = {
        summary: analytics.summary,
        audienceInsights: analytics.audienceInsights,
        contentPerformance: analytics.contentPerformance.slice(0, 10), // Top 10 performing posts
        generatedAt: new Date().toISOString(),
        postsAnalyzed: analytics.posts.length
      };

      const cleanedAnalytics = this.cleanUndefinedValues(analyticsDoc);
      await this.db.collection('instagram_analytics').doc('latest').set(cleanedAnalytics, { merge: true });

      logger.info('Successfully saved Instagram analytics summary to Firestore', {
        postsAnalyzed: analytics.posts.length,
        avgEngagementRate: analytics.summary.avgEngagementRate
      });
    } catch (error) {
      logger.error('Error saving Instagram analytics summary to Firestore:', error);
      throw new Error(`Failed to save Instagram analytics summary: ${error}`);
    }
  }

  /**
   * Delete a post from Firestore
   */
  async deletePost(postId: string): Promise<void> {
    try {
      logger.info('Deleting Instagram post from Firestore', { postId });

      await this.db.collection(this.COLLECTION_NAME).doc(postId).delete();

      logger.info('Successfully deleted Instagram post from Firestore', { postId });
    } catch (error) {
      logger.error('Error deleting Instagram post from Firestore:', error);
      throw new Error(`Failed to delete Instagram post: ${error}`);
    }
  }

  /**
   * Check if a post exists in Firestore
   */
  async postExists(postId: string): Promise<boolean> {
    try {
      const doc = await this.db.collection(this.COLLECTION_NAME).doc(postId).get();
      return doc.exists;
    } catch (error) {
      logger.error('Error checking if Instagram post exists in Firestore:', error);
      return false;
    }
  }

  /**
   * Get posts that need metrics updates (older than X hours)
   */
  async getPostsNeedingMetricsUpdate(hoursOld: number = 24): Promise<InstagramPost[]> {
    try {
      logger.info('Finding Instagram posts needing metrics update', { hoursOld });

      const cutoffTime = new Date(Date.now() - (hoursOld * 60 * 60 * 1000)).toISOString();

      const snapshot = await this.db.collection(this.COLLECTION_NAME)
        .where('lastUpdated', '<', cutoffTime)
        .orderBy('lastUpdated', 'asc')
        .limit(50) // Limit to avoid API rate limits
        .get();

      const posts: InstagramPost[] = [];
      snapshot.docs.forEach(doc => {
        const firestorePost = doc.data() as FirestoreInstagramPost;
        const convertedPost = this.convertFirestoreToInstagramPost(firestorePost);
        posts.push(convertedPost);
      });

      logger.info(`Found ${posts.length} Instagram posts needing metrics update`);
      return posts;
    } catch (error) {
      logger.error('Error finding Instagram posts needing metrics update:', error);
      throw new Error(`Failed to find posts needing update: ${error}`);
    }
  }

  /**
   * Convert InstagramPost to Firestore format
   */
  private convertInstagramPostToFirestore(post: InstagramPost): FirestoreInstagramPost {
    return {
      id: post.id || '',
      caption: post.caption || '',
      mediaType: this.mapMediaTypeToFirestore(post.mediaType),
      permalink: post.permalink || '',
      timestamp: post.timestamp || new Date().toISOString(),
      formattedDate: post.formattedDate || new Date(post.timestamp || Date.now()).toLocaleDateString(),
      metrics: this.convertMetricsToFirestore(post.metrics),
      lastUpdated: new Date().toISOString(),
      shortcode: post.shortcode || '',
      mediaUrl: post.mediaUrl || '',
      thumbnailUrl: post.thumbnailUrl || '',
      username: post.username || '',
      hashtags: post.hashtags || [],
      mentions: post.mentions || []
    };
  }

  /**
   * Convert InstagramMetrics to Firestore format
   */
  private convertMetricsToFirestore(metrics: InstagramMetrics): FirestoreInstagramMetrics {
    return {
      likes: metrics.likesCount || 0,
      comments: metrics.commentsCount || 0,
      shares: metrics.sharesCount || 0,
      saved: metrics.savesCount || 0,
      reach: metrics.reachCount || 0,
      views: metrics.viewsCount || metrics.videoViewsCount || 0,
      total_interactions: metrics.totalInteractions || 
        ((metrics.likesCount || 0) + (metrics.commentsCount || 0) + (metrics.sharesCount || 0) + (metrics.savesCount || 0)),
      ig_reels_avg_watch_time: metrics.igReelsAvgWatchTime || 0,
      ig_reels_video_view_total_time: metrics.igReelsVideoViewTotalTime || 0,
      engagementRate: metrics.engagementRate || 0,
      impressionsCount: metrics.impressionsCount || 0,
      profileVisits: metrics.profileVisits || 0,
      profileActivity: metrics.profileActivity || 0
    };
  }

  /**
   * Map media type to Firestore format
   */
  private mapMediaTypeToFirestore(mediaType: string): 'FEED' | 'REEL' | 'STORY' {
    switch (mediaType.toUpperCase()) {
      case 'VIDEO':
        return 'REEL';
      case 'STORY':
        return 'STORY';
      default:
        return 'FEED';
    }
  }

  /**
   * Check if multiple posts exist in Firestore (batch operation for efficiency)
   */
  async postsExist(postIds: string[]): Promise<{ [postId: string]: boolean }> {
    try {
      logger.debug('Checking existence of multiple posts in Firestore', { count: postIds.length });

      // Firestore batch get operation
      const docRefs = postIds.map(id => this.db.collection(this.COLLECTION_NAME).doc(id));
      const docs = await this.db.getAll(...docRefs);
      
      const results: { [postId: string]: boolean } = {};
      docs.forEach((doc, index) => {
        results[postIds[index]] = doc.exists;
      });

      const existingCount = Object.values(results).filter(exists => exists).length;
      logger.debug('Batch existence check completed', {
        total: postIds.length,
        existing: existingCount,
        new: postIds.length - existingCount
      });

      return results;
    } catch (error) {
      logger.error('Error checking multiple posts existence in Firestore:', error);
      
      // Fallback to individual checks if batch fails
      const results: { [postId: string]: boolean } = {};
      for (const postId of postIds) {
        try {
          results[postId] = await this.postExists(postId);
        } catch (err) {
          logger.error(`Failed to check existence for post ${postId}:`, err);
          results[postId] = false; // Assume doesn't exist if check fails
        }
      }
      return results;
    }
  }

  /**
   * Get posts that are missing thumbnail URLs
   */
  async getPostsMissingThumbnailUrls(postIds: string[]): Promise<string[]> {
    try {
      logger.debug('Checking for posts missing thumbnail URLs', { count: postIds.length });

      const docRefs = postIds.map(id => this.db.collection(this.COLLECTION_NAME).doc(id));
      const docs = await this.db.getAll(...docRefs);
      
      const postsNeedingUpdate: string[] = [];
      docs.forEach((doc, index) => {
        if (doc.exists) {
          const data = doc.data();
          // Check if thumbnailUrl field is missing, empty, or undefined
          if (!data?.thumbnailUrl || data.thumbnailUrl === '') {
            postsNeedingUpdate.push(postIds[index]);
          }
        }
      });

      logger.debug('Thumbnail URL check completed', {
        total: postIds.length,
        needingUpdate: postsNeedingUpdate.length
      });

      return postsNeedingUpdate;
    } catch (error) {
      logger.error('Error checking posts for missing thumbnail URLs:', error);
      return [];
    }
  }

  /**
   * Update a post's thumbnail URL in Firestore
   */
  async updatePostThumbnailUrl(postId: string, thumbnailUrl: string): Promise<void> {
    try {
      logger.debug('Updating post thumbnail URL in Firestore', { postId, thumbnailUrl: thumbnailUrl.substring(0, 50) + '...' });

      await this.db.collection(this.COLLECTION_NAME).doc(postId).update({
        thumbnailUrl: thumbnailUrl,
        lastUpdated: new Date().toISOString()
      });

      logger.debug('Successfully updated post thumbnail URL', { postId });
    } catch (error) {
      logger.error('Error updating post thumbnail URL in Firestore:', error);
      throw new Error(`Failed to update thumbnail URL for post ${postId}: ${error}`);
    }
  }
}

export default FirebaseInstagramService; 