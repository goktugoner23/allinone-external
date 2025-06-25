import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  InstagramPost,
  InstagramAccount,
  InstagramMetrics,
  InstagramInsight,
  InstagramStory,
  InstagramAnalytics,
  InstagramAPIResponse,
  InstagramConfig,
  InstagramContentPerformance,
  InstagramAudienceInsight
} from '../../types/instagram';
import logger from '../../utils/logger';

export class InstagramService {
  private client: AxiosInstance;
  private config: InstagramConfig;
  private baseUrl = 'https://graph.instagram.com';
  private graphApiUrl = 'https://graph.facebook.com';

  constructor(instagramConfig: InstagramConfig) {
    this.config = instagramConfig;
    
    // Validate required config
    if (!this.config.pageAccessToken && !this.config.accessToken) {
      throw new Error('Instagram configuration requires either pageAccessToken or accessToken');
    }
    
    if (!this.config.userId) {
      throw new Error('Instagram configuration requires userId');
    }

    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Instagram API request', {
          url: config.url,
          method: config.method,
          params: config.params
        });
        return config;
      },
      (error) => {
        logger.error('Instagram API request error', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Instagram API response', {
          status: response.status,
          url: response.config.url
        });
        return response;
      },
      (error) => {
        logger.error('Instagram API response error', {
          status: error.response?.status,
          message: error.response?.data?.error?.message,
          url: error.config?.url
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get user's Instagram account information
   */
  async getAccountInfo(): Promise<InstagramAccount> {
    try {
      logger.info('Fetching Instagram account information');

      // Use Instagram Business API approach with page access token
      const accessToken = this.config.pageAccessToken || this.config.accessToken;
      const accountId = this.config.userId;

      const response: AxiosResponse<any> = await this.client.get(
        `${this.graphApiUrl}/${this.config.apiVersion || 'v18.0'}/${accountId}`,
        {
          params: {
            fields: 'id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website',
            access_token: accessToken
          }
        }
      );

      // Transform to match our interface
      const accountData: InstagramAccount = {
        id: response.data.id,
        username: response.data.username,
        name: response.data.name,
        biography: response.data.biography,
        website: response.data.website,
        profilePictureUrl: response.data.profile_picture_url,
        followersCount: response.data.followers_count,
        followsCount: response.data.follows_count,
        mediaCount: response.data.media_count,
        accountType: 'BUSINESS' // Instagram Business accounts are always business type
      };

      logger.info('Successfully fetched Instagram account info', {
        username: accountData.username,
        mediaCount: accountData.mediaCount,
        followersCount: accountData.followersCount
      });

      return accountData;
    } catch (error) {
      logger.error('Error fetching Instagram account info:', error);
      throw new Error(`Failed to fetch Instagram account info: ${error}`);
    }
  }

  /**
   * Get user's Instagram posts with metrics using Business API
   */
  async getPosts(limit: number = 25, after?: string): Promise<InstagramAPIResponse<InstagramPost[]>> {
    try {
      logger.info('Fetching Instagram posts', { limit, after });

      // Use Facebook Graph API with Page Access Token for Instagram Business API
      const accessToken = this.config.pageAccessToken || this.config.accessToken;
      const accountId = this.config.userId;

      const params: any = {
        fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
        access_token: accessToken,
        limit
      };

      if (after) {
        params.after = after;
      }

      const response: AxiosResponse<InstagramAPIResponse<any[]>> = await this.client.get(
        `${this.graphApiUrl}/${this.config.apiVersion}/${accountId}/media`,
        { params }
      );

      // Transform the data to match our interface and fetch insights
      const posts: InstagramPost[] = [];
      
      for (const rawPost of response.data.data) {
        try {
          const insights = await this.getMediaInsights(rawPost.id, rawPost.media_type);
          const post = this.transformPost(rawPost, insights);
          posts.push(post);
        } catch (error) {
          logger.warn(`Failed to fetch insights for post ${rawPost.id}:`, error);
          // Still add the post without insights
          const post = this.transformPost(rawPost, null);
          posts.push(post);
        }
      }

      logger.info('Successfully fetched Instagram posts', {
        count: posts.length,
        hasNext: !!response.data.paging?.next
      });

      return {
        data: posts,
        paging: response.data.paging
      };
    } catch (error) {
      logger.error('Error fetching Instagram posts:', error);
      throw new Error(`Failed to fetch Instagram posts: ${error}`);
    }
  }

  /**
   * Get insights for a specific media object
   */
  async getMediaInsights(mediaId: string, mediaType: string): Promise<any[]> {
    const accessToken = this.config.pageAccessToken || this.config.accessToken;
    
    try {
      
      // Define metrics based on media type and Facebook documentation
      let metrics: string[] = [];
      
      switch (mediaType.toLowerCase()) {
        case 'image':
        case 'carousel_album':
          // FEED (posts) metrics - using updated metrics from documentation
          // Note: profile_visits and profile_activity are only for FEED posts, not all images
          metrics = [
            'comments',
            'likes', 
            'reach',
            'saved',
            'shares',
            'total_interactions',
            'views' // New metric replacing impressions for new media
          ];
          break;
        case 'video':
          // VIDEO/REELS metrics - profile metrics not supported for videos
          metrics = [
            'comments',
            'likes',
            'reach', 
            'saved',
            'shares',
            'total_interactions',
            'views',
            'ig_reels_avg_watch_time',
            'ig_reels_video_view_total_time'
          ];
          break;
        default:
          // Default metrics for unknown media types
          metrics = [
            'comments',
            'likes',
            'reach',
            'views',
            'total_interactions'
          ];
      }

      const response = await this.client.get(
        `${this.graphApiUrl}/${this.config.apiVersion}/${mediaId}/insights`,
        {
          params: {
            metric: metrics.join(','),
            access_token: accessToken
          }
        }
      );

      return response.data.data || [];
    } catch (error: any) {
      // Handle specific API errors with fallback
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error?.message || '';
        
        if (errorMessage.includes('does not support') || errorMessage.includes('metric')) {
          logger.warn(`Some metrics not supported for media ${mediaId}, trying basic metrics:`, errorMessage);
          
          // Fallback to basic metrics that should work for all media types
          try {
            const basicMetrics = ['likes', 'comments'];
            const fallbackResponse = await this.client.get(
              `${this.graphApiUrl}/${this.config.apiVersion}/${mediaId}/insights`,
              {
                params: {
                  metric: basicMetrics.join(','),
                  access_token: accessToken
                }
              }
            );
            return fallbackResponse.data.data || [];
          } catch (fallbackError) {
            logger.warn(`Even basic metrics failed for media ${mediaId}:`, fallbackError);
            return [];
          }
        }
      }
      
      logger.warn(`Failed to fetch insights for media ${mediaId}:`, error);
      // Return empty array if insights fail - this is common for recent posts
      return [];
    }
  }

  /**
   * Get comprehensive Instagram analytics
   */
  async getAnalytics(postsLimit: number = 50): Promise<InstagramAnalytics> {
    try {
      logger.info('Fetching comprehensive Instagram analytics');

      const [account, postsResponse] = await Promise.all([
        this.getAccountInfo(),
        this.getPosts(postsLimit)
      ]);

      const posts = postsResponse.data;

      // Calculate content performance
      const contentPerformance = this.calculateContentPerformance(posts);

      // Calculate summary metrics
      const totalEngagement = posts.reduce((sum, post) => 
        sum + post.metrics.likesCount + post.metrics.commentsCount, 0
      );
      
      const avgEngagementRate = posts.length > 0 
        ? posts.reduce((sum, post) => sum + post.metrics.engagementRate, 0) / posts.length 
        : 0;

      const topPerformingPost = posts.reduce((top, post) => 
        post.metrics.engagementRate > (top?.metrics.engagementRate || 0) ? post : top,
        posts[0]
      );

      const analytics: InstagramAnalytics = {
        account,
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

      logger.info('Successfully compiled Instagram analytics', {
        postsCount: posts.length,
        totalEngagement,
        avgEngagementRate
      });

      return analytics;
    } catch (error) {
      logger.error('Error fetching Instagram analytics:', error);
      throw new Error(`Failed to fetch Instagram analytics: ${error}`);
    }
  }

  /**
   * Transform raw post data to InstagramPost interface
   */
  private transformPost(rawPost: any, insights: any[] = null): InstagramPost {
    const hashtags = this.extractHashtags(rawPost.caption || '');
    const mentions = this.extractMentions(rawPost.caption || '');

    const transformedMetrics = this.transformMetrics(insights || [], rawPost);
    
    // Apply media type-specific logic for views
    const isVideo = rawPost.media_type === 'VIDEO';
    
    const metrics: InstagramMetrics = {
      likesCount: transformedMetrics.likesCount || rawPost.like_count || 0,
      commentsCount: transformedMetrics.commentsCount || rawPost.comments_count || 0,
      engagementRate: this.calculateEngagementRate(rawPost, insights),
      sharesCount: transformedMetrics.sharesCount || 0,
      savesCount: transformedMetrics.savesCount || 0,
      reachCount: transformedMetrics.reachCount || 0,
      impressionsCount: isVideo ? 0 : (transformedMetrics.viewsCount || transformedMetrics.impressionsCount || 0),
      videoViewsCount: isVideo ? (transformedMetrics.viewsCount || transformedMetrics.videoViewsCount || 0) : 0,
      totalInteractions: transformedMetrics.totalInteractions || 0,
      igReelsAvgWatchTime: transformedMetrics.igReelsAvgWatchTime,
      igReelsVideoViewTotalTime: transformedMetrics.igReelsVideoViewTotalTime
    };

    return {
      id: rawPost.id,
      shortcode: this.extractShortcode(rawPost.permalink),
      caption: rawPost.caption || '',
      mediaType: rawPost.media_type,
      mediaUrl: rawPost.media_url,
      thumbnailUrl: rawPost.thumbnail_url,
      permalink: rawPost.permalink,
      timestamp: rawPost.timestamp,
      username: rawPost.username,
      metrics,
      hashtags,
      mentions
    };
  }

  /**
   * Transform insights data to metrics based on Facebook documentation
   */
  private transformMetrics(insights: any[], rawData?: any): Partial<InstagramMetrics> {
    const metrics: Partial<InstagramMetrics> = {};

    if (!insights || insights.length === 0) {
      return metrics;
    }

    insights.forEach(insight => {
      const value = insight.values?.[0]?.value || insight.total_value?.value || 0;
      
      switch (insight.name) {
        // Updated metrics based on Facebook documentation
        case 'views':
          metrics.viewsCount = value;
          break;
        case 'impressions':
          // Note: deprecated for v22.0+ for new media, but still available for older media
          metrics.impressionsCount = value;
          break;
        case 'reach':
          metrics.reachCount = value;
          break;
        case 'likes':
          // This might override the basic count, but insights are more accurate
          metrics.likesCount = value;
          break;
        case 'comments':
          // This might override the basic count, but insights are more accurate  
          metrics.commentsCount = value;
          break;
        case 'saved':
          metrics.savesCount = value;
          break;
        case 'shares':
          metrics.sharesCount = value;
          break;
        case 'total_interactions':
          metrics.totalInteractions = value;
          break;
        case 'profile_visits':
          metrics.profileVisits = value;
          break;
        case 'profile_activity':
          metrics.profileActivity = value;
          break;
        // Video/Reel specific metrics
        case 'video_views':
          metrics.videoViewsCount = value;
          break;
        case 'plays':
          // Deprecated for v22.0+
          metrics.videoPlaysCount = value;
          break;
        case 'clips_replays_count':
          // Deprecated for v22.0+
          metrics.clipsReplaysCount = value;
          break;
        case 'ig_reels_aggregated_all_plays_count':
          // Deprecated for v22.0+
          metrics.igReelsAggregatedAllPlaysCount = value;
          break;
        case 'ig_reels_avg_watch_time':
          metrics.igReelsAvgWatchTime = value;
          break;
        case 'ig_reels_video_view_total_time':
          metrics.igReelsVideoViewTotalTime = value;
          break;
        // Story specific metrics
        case 'replies':
          metrics.replies = value;
          break;
        case 'navigation':
          metrics.navigation = value;
          break;
        default:
          logger.debug(`Unknown insight metric: ${insight.name}`, { value });
      }
    });

    return metrics;
  }

  /**
   * Calculate engagement rate using available metrics
   */
  private calculateEngagementRate(post: any, insights?: any[]): number {
    const likes = post.like_count || 0;
    const comments = post.comments_count || 0;
    
    // Try to get reach or views from insights (preferred over impressions)
    let denominator = 0;
    
    if (insights && insights.length > 0) {
      // Prefer reach over views over impressions
      const reachInsight = insights.find((i: any) => i.name === 'reach');
      const viewsInsight = insights.find((i: any) => i.name === 'views');
      const impressionsInsight = insights.find((i: any) => i.name === 'impressions');
      
      if (reachInsight) {
        denominator = reachInsight.values?.[0]?.value || reachInsight.total_value?.value || 0;
      } else if (viewsInsight) {
        denominator = viewsInsight.values?.[0]?.value || viewsInsight.total_value?.value || 0;
      } else if (impressionsInsight) {
        denominator = impressionsInsight.values?.[0]?.value || impressionsInsight.total_value?.value || 0;
      }
    }
    
    // Fallback to a basic calculation if no insights available
    if (denominator === 0) {
      // Use a simple engagement rate without denominator (just engagement count)
      return likes + comments;
    }
    
    return ((likes + comments) / denominator) * 100;
  }

  /**
   * Extract hashtags from caption
   */
  private extractHashtags(caption: string): string[] {
    const hashtagRegex = /#[\w]+/g;
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
   * Calculate content performance metrics
   */
  private calculateContentPerformance(posts: InstagramPost[]): InstagramContentPerformance[] {
    if (posts.length === 0) return [];

    const avgLikes = posts.reduce((sum, post) => sum + post.metrics.likesCount, 0) / posts.length;
    const avgComments = posts.reduce((sum, post) => sum + post.metrics.commentsCount, 0) / posts.length;
    const avgEngagementRate = posts.reduce((sum, post) => sum + post.metrics.engagementRate, 0) / posts.length;

    return posts.map(post => ({
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
        avgLikes,
        avgComments,
        avgEngagementRate
      }
    }));
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
   * Health check for Instagram Business API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const accessToken = this.config.pageAccessToken || this.config.accessToken;
      const accountId = this.config.userId;

      await this.client.get(`${this.graphApiUrl}/${this.config.apiVersion}/${accountId}`, {
        params: {
          fields: 'id',
          access_token: accessToken
        }
      });
      return true;
    } catch (error) {
      logger.error('Instagram API health check failed:', error);
      return false;
    }
  }
}

export default InstagramService; 