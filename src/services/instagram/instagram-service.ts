import axios, { AxiosInstance, AxiosResponse } from "axios";
import {
  InstagramPost,
  InstagramAccount,
  InstagramMetrics,
  InstagramAnalytics,
  InstagramAPIResponse,
  InstagramConfig,
  InstagramContentPerformance,
  InstagramStory,
} from "../../types/instagram";
import logger from "../../utils/logger";

export class InstagramService {
  private client: AxiosInstance;
  private config: InstagramConfig;
  private graphApiUrl = "https://graph.facebook.com";
  private instagramWebUrl = "https://www.instagram.com";
  private instagramMobileApiUrl = "https://i.instagram.com";

  constructor(instagramConfig: InstagramConfig) {
    this.config = instagramConfig;

    // Validate required config
    if (!this.config.pageAccessToken && !this.config.accessToken) {
      throw new Error(
        "Instagram configuration requires either pageAccessToken or accessToken"
      );
    }

    if (!this.config.userId) {
      throw new Error("Instagram configuration requires userId");
    }

    this.client = axios.create({
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug("Instagram API request", {
          url: config.url,
          method: config.method,
          params: config.params,
        });
        return config;
      },
      (error) => {
        logger.error("Instagram API request error", error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug("Instagram API response", {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        logger.error("Instagram API response error", {
          status: error.response?.status,
          message: error.response?.data?.error?.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if configured Instagram session cookies look valid by calling a lightweight authed endpoint
   */
  async checkSession(): Promise<{ hasSession: boolean; valid: boolean; issue?: string }> {
    const hasSession = Boolean(this.config.sessionId && this.config.dsUserId);
    if (!hasSession) {
      return { hasSession: false, valid: false, issue: 'no_session_configured' };
    }

    try {
      const resp = await this.client.get(
        `${this.instagramMobileApiUrl}/api/v1/accounts/current_user/`,
        { headers: this.getInstagramWebHeaders(true) }
      );
      const ok = resp.status === 200 && resp.data?.user?.pk;
      return { hasSession: true, valid: !!ok, issue: ok ? undefined : 'unexpected_response' };
    } catch (error: any) {
      const status = error?.response?.status;
      const body = error?.response?.data;
      const issue = body?.message || body?.status || (status === 401 ? 'unauthorized' : 'session_error');
      return { hasSession: true, valid: false, issue };
    }
  }

  /**
   * Get single media by ID (for refreshing thumbnail/media URLs)
   */
  async getMediaById(mediaId: string): Promise<{
    id: string;
    mediaType: string;
    mediaUrl?: string;
    thumbnailUrl?: string;
    permalink?: string;
    timestamp?: string;
    username?: string;
  }> {
    const accessToken = this.config.pageAccessToken || this.config.accessToken;
    try {
      const response = await this.client.get(
        `${this.graphApiUrl}/${this.config.apiVersion || "v18.0"}/${mediaId}`,
        {
          params: {
            fields:
              "id,media_type,media_url,thumbnail_url,permalink,timestamp,username",
            access_token: accessToken,
          },
        }
      );

      const data = response.data || {};
      return {
        id: data.id,
        mediaType: data.media_type,
        mediaUrl: data.media_url,
        thumbnailUrl: data.thumbnail_url,
        permalink: data.permalink,
        timestamp: data.timestamp,
        username: data.username,
      };
    } catch (error) {
      logger.error("Error fetching media by ID from Instagram API:", error);
      throw new Error(`Failed to fetch media ${mediaId}`);
    }
  }

  /**
   * Fetch public profile info via Instagram web API by username
   * Best-effort: relies on public endpoints that may change without notice
   */
  async getPublicProfileByUsername(username: string): Promise<{
    username: string;
    userId?: string;
    profilePictureUrl?: string | null;
    hdProfilePictureUrl?: string | null;
    isPrivate?: boolean;
    isVerified?: boolean;
    fullName?: string;
    exists: boolean;
  }> {
    const url = `${this.instagramWebUrl}/api/v1/users/web_profile_info/`;
    try {
      const response = await this.client.get(url, {
        params: { username },
        headers: this.getInstagramWebHeaders(),
      });

      const user = response.data?.data?.user;
      if (!user) {
        return { username, exists: false };
      }

      return {
        username,
        userId: user.id,
        profilePictureUrl: user.profile_pic_url || null,
        hdProfilePictureUrl: user.hd_profile_pic_url_info?.url || user.profile_pic_url_hd || null,
        isPrivate: Boolean(user.is_private),
        isVerified: Boolean(user.is_verified),
        fullName: user.full_name,
        exists: true,
      };
    } catch (error) {
      logger.warn("Failed Instagram web profile fetch; falling back to og:image scrape", {
        username,
        error: (error as any)?.message || "unknown",
      });

      // Fallback: scrape HTML meta og:image
      try {
        const htmlResp = await this.client.get(`${this.instagramWebUrl}/${encodeURIComponent(username)}/`, {
          headers: this.getInstagramWebHeaders(),
        });
        const html: string = htmlResp.data || "";
        const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        const img = ogImageMatch?.[1] || null;
        return { username, profilePictureUrl: img, hdProfilePictureUrl: img, exists: Boolean(img) };
      } catch (fallbackErr) {
        logger.error("Failed to scrape Instagram profile page for og:image", {
          username,
          error: (fallbackErr as any)?.message || "unknown",
        });
        return { username, exists: false };
      }
    }
  }

  /**
   * Fetch public stories for a username if accessible without authentication
   * Uses Instagram web API (best-effort, may break/change). Returns empty array on failure.
   */
  async getPublicStoriesByUsername(username: string): Promise<{ stories: InstagramStory[]; session: { hasSession: boolean; valid: boolean; issue?: string } }> {
    try {
      // First, resolve user id via public profile API
      const profile = await this.getPublicProfileByUsername(username);
      if (!profile.exists || !profile.userId) {
        logger.info("Stories: profile not found or missing userId", { username, exists: profile.exists, userId: profile.userId });
        const session = await this.checkSession();
        return { stories: [], session };
      }

      logger.info("Stories: resolved profile userId", { username, userId: profile.userId });

      // Use mobile reels_media first (proved to work in direct test)
      let reels: any;
      const mobileResp = await this.client.get(
        `${this.instagramMobileApiUrl}/api/v1/feed/reels_media/`,
        {
          params: { reel_ids: profile.userId },
          headers: this.getInstagramWebHeaders(true, username),
        }
      );
      reels = mobileResp.data?.reels_media?.[0] || mobileResp.data?.reels?.[profile.userId];
      if (!reels) {
        // Final fallback: dedicated user reel_media endpoint
        try {
          const userReelResp = await this.client.get(
            `${this.instagramMobileApiUrl}/api/v1/feed/user/${encodeURIComponent(profile.userId)}/reel_media/`,
            { headers: this.getInstagramWebHeaders(true, username) }
          );
          reels = userReelResp.data;
        } catch (lastErr) {
          logger.debug("User reel_media fallback failed", { username, error: (lastErr as any)?.message || "unknown" });
        }
      }

      const items: any[] = reels?.items || [];

      const stories: InstagramStory[] = items.map((item: any) => {
        const isVideo = Boolean(item.video_versions && item.video_versions.length > 0);
        const mediaUrl = isVideo
          ? item.video_versions?.[0]?.url
          : item.image_versions2?.candidates?.[0]?.url;
        const takenAt = item.taken_at ? new Date(item.taken_at * 1000).toISOString() : new Date().toISOString();
        const expiringAt = item.expiring_at ? new Date(item.expiring_at * 1000).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        return {
          id: String(item.id || item.pk || `${profile.userId}_${item.taken_at || Date.now()}`),
          mediaType: (isVideo ? "VIDEO" : "IMAGE") as "VIDEO" | "IMAGE",
          mediaUrl: String(mediaUrl),
          timestamp: takenAt,
          expiresAt: expiringAt,
        };
      }).filter((s: InstagramStory) => Boolean(s.mediaUrl));

      const session = await this.checkSession();
      return { stories, session };
    } catch (error) {
      logger.warn("Public stories fetch failed (likely requires auth or user is private)", {
        username,
        error: (error as any)?.message || "unknown",
      });
      const issueText = (error as any)?.response?.data?.message || (error as any)?.response?.data?.status;
      const status = (error as any)?.response?.status;
      const session = await this.checkSession();
      // If unauthorized or login required, force session.valid=false
      if (status === 401 || issueText === 'login_required' || issueText === 'challenge_required') {
        session.valid = false;
        session.issue = issueText || 'unauthorized';
      }
      return { stories: [], session };
    }
  }

  /**
   * Fetch stories of the configured Instagram Business account via Graph API
   */
  async getOwnStories(): Promise<InstagramStory[]> {
    const accessToken = this.config.pageAccessToken || this.config.accessToken;
    const accountId = this.config.userId;
    try {
      const response = await this.client.get(
        `${this.graphApiUrl}/${this.config.apiVersion || "v18.0"}/${accountId}/stories`,
        {
          params: {
            fields: "id,media_type,media_url,thumbnail_url,permalink,timestamp",
            access_token: accessToken,
          },
        }
      );

      const data: any[] = response.data?.data || [];
      const stories: InstagramStory[] = data.map((s) => ({
        id: s.id,
        mediaType: (s.media_type === "VIDEO" ? "VIDEO" : "IMAGE") as "VIDEO" | "IMAGE",
        mediaUrl: String(s.media_url || s.thumbnail_url),
        timestamp: s.timestamp,
        // Graph API does not provide explicit expiry; assume 24h after timestamp
        expiresAt: new Date(new Date(s.timestamp).getTime() + 24 * 60 * 60 * 1000).toISOString(),
      }));
      return stories;
    } catch (error) {
      logger.error("Error fetching own stories via Graph API:", error);
      throw new Error("Failed to fetch stories for configured account");
    }
  }

  /**
   * Headers to mimic Instagram web requests
   */
  private getInstagramWebHeaders(includeMobileHeaders: boolean = false, usernameForReferer?: string): Record<string, string> {
    const headers: Record<string, string> = {
      "User-Agent": includeMobileHeaders
        ? "Instagram 270.0.0.0.58 Android (30/11; 420dpi; 1080x1920; Google; Pixel 4; flame; qcom; en_US)"
        : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "*/*",
      Referer: usernameForReferer ? `https://www.instagram.com/${encodeURIComponent(usernameForReferer)}/` : "https://www.instagram.com/",
      "Accept-Language": "en-US,en;q=0.9",
      "X-Requested-With": "XMLHttpRequest",
    };

    // App ID and cookies for authenticated-like access
    headers["X-IG-App-ID"] = includeMobileHeaders ? "1217981644879628" : "936619743392459";
    if (includeMobileHeaders) {
      headers["X-IG-Capabilities"] = "3brTvw==";
      headers["X-IG-Connection-Type"] = "WIFI";
    }

    if (this.config.sessionId && this.config.dsUserId) {
      headers["Cookie"] = `sessionid=${this.config.sessionId}; ds_user_id=${this.config.dsUserId}; csrftoken=missing; mid=missing; ig_did=missing;`;
      headers["X-CSRFToken"] = "missing";
      headers["IG-U-DS-USER-ID"] = String(this.config.dsUserId);
    }

    return headers;
  }

  /**
   * Get user's Instagram account information
   */
  async getAccountInfo(): Promise<InstagramAccount> {
    try {
      logger.info("Fetching Instagram account information");

      // Use Instagram Business API approach with page access token
      const accessToken =
        this.config.pageAccessToken || this.config.accessToken;
      const accountId = this.config.userId;

      const response: AxiosResponse<any> = await this.client.get(
        `${this.graphApiUrl}/${this.config.apiVersion || "v18.0"}/${accountId}`,
        {
          params: {
            fields:
              "id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website",
            access_token: accessToken,
          },
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
        accountType: "BUSINESS", // Instagram Business accounts are always business type
      };

      logger.info("Successfully fetched Instagram account info", {
        username: accountData.username,
        mediaCount: accountData.mediaCount,
        followersCount: accountData.followersCount,
      });

      return accountData;
    } catch (error) {
      logger.error("Error fetching Instagram account info:", error);
      throw new Error(`Failed to fetch Instagram account info: ${error}`);
    }
  }

  /**
   * Get user's Instagram posts with metrics using Business API
   */
  async getPosts(
    limit: number = 25,
    after?: string
  ): Promise<InstagramAPIResponse<InstagramPost[]>> {
    try {
      logger.info("Fetching Instagram posts", { limit, after });

      // Use Facebook Graph API with Page Access Token for Instagram Business API
      const accessToken =
        this.config.pageAccessToken || this.config.accessToken;
      const accountId = this.config.userId;

      const params: any = {
        fields:
          "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
        access_token: accessToken,
        limit,
      };

      if (after) {
        params.after = after;
      }

      const response: AxiosResponse<InstagramAPIResponse<any[]>> =
        await this.client.get(
          `${this.graphApiUrl}/${this.config.apiVersion}/${accountId}/media`,
          { params }
        );

      // Transform the data to match our interface and fetch insights
      const posts: InstagramPost[] = [];

      for (const rawPost of response.data.data) {
        try {
          const insights = await this.getMediaInsights(
            rawPost.id,
            rawPost.media_type
          );
          const post = this.transformPost(rawPost, insights);
          posts.push(post);
        } catch (error) {
          logger.warn(
            `Failed to fetch insights for post ${rawPost.id}:`,
            error
          );
          // Still add the post without insights
          const post = this.transformPost(rawPost, null);
          posts.push(post);
        }
      }

      logger.info("Successfully fetched Instagram posts", {
        count: posts.length,
        hasNext: !!response.data.paging?.next,
      });

      return {
        data: posts,
        paging: response.data.paging,
      };
    } catch (error) {
      logger.error("Error fetching Instagram posts:", error);
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
        case "image":
        case "carousel_album":
          // FEED (posts) metrics - using updated metrics from documentation
          // Note: profile_visits and profile_activity are only for FEED posts, not all images
          metrics = [
            "comments",
            "likes",
            "reach",
            "saved",
            "shares",
            "total_interactions",
            "views", // New metric replacing impressions for new media
          ];
          break;
        case "video":
          // VIDEO/REELS metrics - profile metrics not supported for videos
          metrics = [
            "comments",
            "likes",
            "reach",
            "saved",
            "shares",
            "total_interactions",
            "views",
            "ig_reels_avg_watch_time",
            "ig_reels_video_view_total_time",
          ];
          break;
        default:
          // Default metrics for unknown media types
          metrics = [
            "comments",
            "likes",
            "reach",
            "views",
            "total_interactions",
          ];
      }

      const response = await this.client.get(
        `${this.graphApiUrl}/${this.config.apiVersion}/${mediaId}/insights`,
        {
          params: {
            metric: metrics.join(","),
            access_token: accessToken,
          },
        }
      );

      return response.data.data || [];
    } catch (error: any) {
      // Handle specific API errors with fallback
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error?.message || "";

        if (
          errorMessage.includes("does not support") ||
          errorMessage.includes("metric")
        ) {
          logger.warn(
            `Some metrics not supported for media ${mediaId}, trying basic metrics:`,
            errorMessage
          );

          // Fallback to basic metrics that should work for all media types
          try {
            const basicMetrics = ["likes", "comments"];
            const fallbackResponse = await this.client.get(
              `${this.graphApiUrl}/${this.config.apiVersion}/${mediaId}/insights`,
              {
                params: {
                  metric: basicMetrics.join(","),
                  access_token: accessToken,
                },
              }
            );
            return fallbackResponse.data.data || [];
          } catch (fallbackError) {
            logger.warn(
              `Even basic metrics failed for media ${mediaId}:`,
              fallbackError
            );
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
      logger.info("Fetching comprehensive Instagram analytics");

      const [account, postsResponse] = await Promise.all([
        this.getAccountInfo(),
        this.getPosts(postsLimit),
      ]);

      const posts = postsResponse.data;

      // Calculate content performance
      const contentPerformance = this.calculateContentPerformance(posts);

      // Calculate summary metrics
      const totalEngagement = posts.reduce(
        (sum, post) =>
          sum + post.metrics.likesCount + post.metrics.commentsCount,
        0
      );

      const avgEngagementRate =
        posts.length > 0
          ? posts.reduce((sum, post) => sum + post.metrics.engagementRate, 0) /
            posts.length
          : 0;

      const topPerformingPost = posts.reduce(
        (top, post) =>
          post.metrics.engagementRate > (top?.metrics.engagementRate || 0)
            ? post
            : top,
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
          locale: {},
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
            reach: 0,
          },
        },
      };

      logger.info("Successfully compiled Instagram analytics", {
        postsCount: posts.length,
        totalEngagement,
        avgEngagementRate,
      });

      return analytics;
    } catch (error) {
      logger.error("Error fetching Instagram analytics:", error);
      throw new Error(`Failed to fetch Instagram analytics: ${error}`);
    }
  }

  /**
   * Transform raw post data to InstagramPost interface
   */
  private transformPost(rawPost: any, insights: any[] = null): InstagramPost {
    const hashtags = this.extractHashtags(rawPost.caption || "");
    const mentions = this.extractMentions(rawPost.caption || "");

    const transformedMetrics = this.transformMetrics(insights || [], rawPost);

    // Apply media type-specific logic for views
    const isVideo = rawPost.media_type === "VIDEO";

    const metrics: InstagramMetrics = {
      likesCount: transformedMetrics.likesCount || rawPost.like_count || 0,
      commentsCount:
        transformedMetrics.commentsCount || rawPost.comments_count || 0,
      engagementRate: this.calculateEngagementRate(rawPost, insights),
      sharesCount: transformedMetrics.sharesCount || 0,
      savesCount: transformedMetrics.savesCount || 0,
      reachCount: transformedMetrics.reachCount || 0,
      impressionsCount: isVideo
        ? 0
        : transformedMetrics.viewsCount ||
          transformedMetrics.impressionsCount ||
          0,
      videoViewsCount: isVideo
        ? transformedMetrics.viewsCount ||
          transformedMetrics.videoViewsCount ||
          0
        : 0,
      totalInteractions: transformedMetrics.totalInteractions || 0,
      igReelsAvgWatchTime: transformedMetrics.igReelsAvgWatchTime,
      igReelsVideoViewTotalTime: transformedMetrics.igReelsVideoViewTotalTime,
    };

    return {
      id: rawPost.id,
      shortcode: this.extractShortcode(rawPost.permalink),
      caption: rawPost.caption || "",
      mediaType: rawPost.media_type,
      mediaUrl: rawPost.media_url,
      thumbnailUrl: rawPost.thumbnail_url,
      permalink: rawPost.permalink,
      timestamp: rawPost.timestamp,
      username: rawPost.username || null,
      metrics,
      hashtags,
      mentions,
    };
  }

  /**
   * Transform insights data to metrics based on Facebook documentation
   */
  private transformMetrics(
    insights: any[],
    rawData?: any
  ): Partial<InstagramMetrics> {
    const metrics: Partial<InstagramMetrics> = {};

    if (!insights || insights.length === 0) {
      return metrics;
    }

    insights.forEach((insight) => {
      const value =
        insight.values?.[0]?.value || insight.total_value?.value || 0;

      switch (insight.name) {
        // Updated metrics based on Facebook documentation
        case "views":
          metrics.viewsCount = value;
          break;
        case "impressions":
          // Note: deprecated for v22.0+ for new media, but still available for older media
          metrics.impressionsCount = value;
          break;
        case "reach":
          metrics.reachCount = value;
          break;
        case "likes":
          // This might override the basic count, but insights are more accurate
          metrics.likesCount = value;
          break;
        case "comments":
          // This might override the basic count, but insights are more accurate
          metrics.commentsCount = value;
          break;
        case "saved":
          metrics.savesCount = value;
          break;
        case "shares":
          metrics.sharesCount = value;
          break;
        case "total_interactions":
          metrics.totalInteractions = value;
          break;
        case "profile_visits":
          metrics.profileVisits = value;
          break;
        case "profile_activity":
          metrics.profileActivity = value;
          break;
        // Video/Reel specific metrics
        case "video_views":
          metrics.videoViewsCount = value;
          break;
        case "plays":
          // Deprecated for v22.0+
          metrics.videoPlaysCount = value;
          break;
        case "clips_replays_count":
          // Deprecated for v22.0+
          metrics.clipsReplaysCount = value;
          break;
        case "ig_reels_aggregated_all_plays_count":
          // Deprecated for v22.0+
          metrics.igReelsAggregatedAllPlaysCount = value;
          break;
        case "ig_reels_avg_watch_time":
          metrics.igReelsAvgWatchTime = value;
          break;
        case "ig_reels_video_view_total_time":
          metrics.igReelsVideoViewTotalTime = value;
          break;
        // Story specific metrics
        case "replies":
          metrics.replies = value;
          break;
        case "navigation":
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
      const reachInsight = insights.find((i: any) => i.name === "reach");
      const viewsInsight = insights.find((i: any) => i.name === "views");
      const impressionsInsight = insights.find(
        (i: any) => i.name === "impressions"
      );

      if (reachInsight) {
        denominator =
          reachInsight.values?.[0]?.value ||
          reachInsight.total_value?.value ||
          0;
      } else if (viewsInsight) {
        denominator =
          viewsInsight.values?.[0]?.value ||
          viewsInsight.total_value?.value ||
          0;
      } else if (impressionsInsight) {
        denominator =
          impressionsInsight.values?.[0]?.value ||
          impressionsInsight.total_value?.value ||
          0;
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
    return match ? match[1] : "";
  }

  /**
   * Calculate content performance metrics
   */
  private calculateContentPerformance(
    posts: InstagramPost[]
  ): InstagramContentPerformance[] {
    if (posts.length === 0) return [];

    const avgLikes =
      posts.reduce((sum, post) => sum + post.metrics.likesCount, 0) /
      posts.length;
    const avgComments =
      posts.reduce((sum, post) => sum + post.metrics.commentsCount, 0) /
      posts.length;
    const avgEngagementRate =
      posts.reduce((sum, post) => sum + post.metrics.engagementRate, 0) /
      posts.length;

    return posts.map((post) => ({
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
        avgEngagementRate,
      },
    }));
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(metrics: InstagramMetrics): number {
    const engagement =
      metrics.likesCount +
      metrics.commentsCount * 3 +
      (metrics.savesCount || 0) * 5;
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
      const accessToken =
        this.config.pageAccessToken || this.config.accessToken;
      const accountId = this.config.userId;

      await this.client.get(
        `${this.graphApiUrl}/${this.config.apiVersion}/${accountId}`,
        {
          params: {
            fields: "id",
            access_token: accessToken,
          },
        }
      );
      return true;
    } catch (error) {
      logger.error("Instagram API health check failed:", error);
      return false;
    }
  }
}

export default InstagramService;
