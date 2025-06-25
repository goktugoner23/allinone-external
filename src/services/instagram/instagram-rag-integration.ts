import InstagramService from './instagram-service';
import FirebaseInstagramService from '../firebase/firebase-instagram';
import { RAGService } from '../rag-service';
import { InstagramAnalytics, InstagramPost, InstagramSyncStatus } from '../../types/instagram';
import { Document, Domain } from '../../types/rag';
import logger from '../../utils/logger';

export class InstagramRAGIntegration {
  private instagramService: InstagramService;
  private firebaseInstagramService: FirebaseInstagramService;
  private ragService: RAGService;
  private namespace = 'instagram';

  constructor(instagramService: InstagramService, ragService: RAGService, firebaseInstagramService?: FirebaseInstagramService) {
    this.instagramService = instagramService;
    this.ragService = ragService;
    this.firebaseInstagramService = firebaseInstagramService || new FirebaseInstagramService();
  }

  /**
   * Sync Instagram data from Firestore to RAG system
   */
  async syncFirestoreDataToRAG(): Promise<InstagramSyncStatus> {
    const startTime = new Date().toISOString();
    
    try {
      logger.info('Starting Instagram Firestore data sync to RAG system');

      // Fetch Instagram posts from Firestore
      const posts = await this.firebaseInstagramService.getAllPosts();
      
      // Convert posts to RAG documents
      const documents = posts.map(post => this.convertPostToDocument(post));
      
      // Add documents to RAG system
      const results = await Promise.all(
        documents.map(doc => this.ragService.addDocument(doc))
      );
      
      const syncStatus: InstagramSyncStatus = {
        lastSyncAt: startTime,
        postsCount: posts.length,
        storiesCount: 0,
        insightsCount: 0,
        status: 'idle',
        nextSyncAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
      };

      logger.info('Successfully synced Instagram Firestore data to RAG', {
        documentsAdded: results.length,
        postsCount: posts.length
      });

      return syncStatus;
    } catch (error) {
      logger.error('Error syncing Instagram Firestore data to RAG:', error);
      
      return {
        lastSyncAt: startTime,
        postsCount: 0,
        storiesCount: 0,
        insightsCount: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        nextSyncAt: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString()
      };
    }
  }

  /**
   * Sync Instagram data to RAG system
   */
  async syncInstagramDataToRAG(): Promise<InstagramSyncStatus> {
    const startTime = new Date().toISOString();
    
    try {
      logger.info('Starting Instagram data sync to RAG system');

      // Fetch Instagram analytics
      const analytics = await this.instagramService.getAnalytics(100);
      
      // Convert Instagram data to RAG documents
      const documents = this.convertInstagramDataToDocuments(analytics);
      
      // Add documents to RAG system
      const results = await Promise.all(
        documents.map(doc => this.ragService.addDocument(doc))
      );
      
      const syncStatus: InstagramSyncStatus = {
        lastSyncAt: startTime,
        postsCount: analytics.posts.length,
        storiesCount: analytics.stories.length,
        insightsCount: analytics.insights.length,
        status: 'idle',
        nextSyncAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // Next sync in 6 hours
      };

      logger.info('Successfully synced Instagram data to RAG', {
        documentsAdded: results.length,
        postsCount: analytics.posts.length,
        totalEngagement: analytics.summary.totalEngagement
      });

      return syncStatus;
    } catch (error) {
      logger.error('Error syncing Instagram data to RAG:', error);
      
      return {
        lastSyncAt: startTime,
        postsCount: 0,
        storiesCount: 0,
        insightsCount: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        nextSyncAt: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString() // Retry in 1 hour
      };
    }
  }

  /**
   * Convert Instagram analytics to RAG documents
   */
  private convertInstagramDataToDocuments(analytics: InstagramAnalytics): Document[] {
    const documents: Document[] = [];

    // Add account summary document
    documents.push({
      id: `instagram-account-${analytics.account.id}`,
      content: this.createAccountSummaryContent(analytics),
      metadata: {
        domain: 'instagram' as Domain,
        source: 'instagram_api',
        contentType: 'summary',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['instagram', 'account', 'summary'],
        type: 'instagram_account',
        username: analytics.account.username,
        accountType: analytics.account.accountType,
        followersCount: analytics.account.followersCount,
        mediaCount: analytics.account.mediaCount,
        syncedAt: new Date().toISOString()
      }
    });

    // Add individual post documents
    analytics.posts.forEach(post => {
      documents.push({
        id: `instagram-post-${post.id}`,
        content: this.createPostContent(post),
        metadata: {
          domain: 'instagram' as Domain,
          source: 'instagram_api',
          contentType: 'post',
          createdAt: post.timestamp,
          updatedAt: new Date().toISOString(),
          tags: ['instagram', 'post', ...post.hashtags],
          type: 'instagram_post',
          postId: post.id,
          shortcode: post.shortcode,
          mediaType: post.mediaType,
          timestamp: post.timestamp,
          likesCount: post.metrics.likesCount,
          commentsCount: post.metrics.commentsCount,
          engagementRate: post.metrics.engagementRate,
          hashtags: post.hashtags,
          mentions: post.mentions,
          syncedAt: new Date().toISOString()
        }
      });
    });

    return documents;
  }

  /**
   * Create account summary content for RAG
   */
  private createAccountSummaryContent(analytics: InstagramAnalytics): string {
    const account = analytics.account;
    const summary = analytics.summary;

    return `
Instagram Account Summary for @${account.username}

Account Details:
- Username: @${account.username}
- Account Type: ${account.accountType}
- Followers: ${account.followersCount.toLocaleString()}
- Following: ${account.followsCount.toLocaleString()}
- Total Posts: ${account.mediaCount.toLocaleString()}
${account.biography ? `- Biography: ${account.biography}` : ''}

Performance Summary:
- Total Posts Analyzed: ${summary.totalPosts}
- Total Engagement: ${summary.totalEngagement.toLocaleString()} (likes + comments)
- Average Engagement Rate: ${summary.avgEngagementRate.toFixed(2)}%

This account shows ${summary.avgEngagementRate > 3 ? 'strong' : summary.avgEngagementRate > 1 ? 'moderate' : 'low'} engagement rates.
    `.trim();
  }

  /**
   * Create post content for RAG
   */
  private createPostContent(post: InstagramPost): string {
    const engagementLevel = post.metrics.engagementRate > 5 ? 'high' : 
                           post.metrics.engagementRate > 2 ? 'moderate' : 'low';

    return `
Instagram Post by @${post.username}

Caption: ${post.caption}

Post Details:
- Post ID: ${post.shortcode}
- Media Type: ${post.mediaType}
- Published: ${new Date(post.timestamp).toLocaleDateString()}

Engagement Metrics:
- Likes: ${post.metrics.likesCount.toLocaleString()}
- Comments: ${post.metrics.commentsCount.toLocaleString()}
- Engagement Rate: ${post.metrics.engagementRate.toFixed(2)}%

Content Analysis:
- Hashtags Used: ${post.hashtags.join(', ') || 'None'}
- Mentions: ${post.mentions.join(', ') || 'None'}
- Engagement Level: ${engagementLevel}

This post ${engagementLevel === 'high' ? 'performed very well' : 
           engagementLevel === 'moderate' ? 'had decent performance' : 'had low engagement'}.
    `.trim();
  }

  /**
   * Convert a single post to a RAG document
   */
  private convertPostToDocument(post: InstagramPost): Document {
    return {
      id: `instagram-post-${post.id}`,
      content: this.createPostContent(post),
      metadata: {
        domain: 'instagram' as Domain,
        source: 'firestore',
        contentType: 'post',
        createdAt: post.timestamp,
        updatedAt: new Date().toISOString(),
        tags: ['instagram', 'post', ...post.hashtags],
        type: 'instagram_post',
        postId: post.id,
        shortcode: post.shortcode,
        mediaType: post.mediaType,
        timestamp: post.timestamp,
        likesCount: post.metrics.likesCount,
        commentsCount: post.metrics.commentsCount,
        engagementRate: post.metrics.engagementRate,
        hashtags: post.hashtags,
        mentions: post.mentions,
        syncedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Query Instagram data through RAG
   */
  async queryInstagramData(query: string): Promise<any> {
    try {
      logger.info('Querying Instagram data through RAG', { query });

      const result = await this.ragService.query(query, 'instagram');

      logger.info('Successfully queried Instagram data', {
        query,
        resultsCount: result.sources.length,
        confidence: result.confidence
      });

      return result;
    } catch (error) {
      logger.error('Error querying Instagram data:', error);
      throw new Error(`Failed to query Instagram data: ${error}`);
    }
  }

  /**
   * Get Instagram sync status
   */
  async getSyncStatus(): Promise<InstagramSyncStatus> {
    try {
      return {
        lastSyncAt: new Date().toISOString(),
        postsCount: 0,
        storiesCount: 0,
        insightsCount: 0,
        status: 'idle',
        nextSyncAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
      };
    } catch (error) {
      logger.error('Error getting sync status:', error);
      throw new Error(`Failed to get sync status: ${error}`);
    }
  }
}

export default InstagramRAGIntegration; 