// Firestore structure - matches your existing data
export interface FirestoreInstagramPost {
  id: string;
  caption: string;
  mediaType: 'FEED' | 'REEL' | 'STORY';
  permalink: string;
  timestamp: string;
  formattedDate: string;
  metrics: FirestoreInstagramMetrics;
  // Additional fields for compatibility
  lastUpdated?: string;
  shortcode?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  username?: string;
  hashtags?: string[];
  mentions?: string[];
}

export interface FirestoreInstagramMetrics {
  likes: number;
  comments: number;
  shares: number;
  saved: number;
  reach: number;
  views: number;
  total_interactions: number;
  // Reel-specific metrics
  ig_reels_avg_watch_time?: number;
  ig_reels_video_view_total_time?: number;
  // Additional metrics for compatibility
  engagementRate?: number;
  impressionsCount?: number;
  profileVisits?: number;
  profileActivity?: number;
}

// API structure - for Instagram Basic Display API
export interface InstagramPost {
  id: string;
  shortcode: string;
  caption: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  mediaUrl: string;
  thumbnailUrl?: string;
  permalink: string;
  timestamp: string;
  username?: string;
  metrics: InstagramMetrics;
  hashtags: string[];
  mentions: string[];
  location?: InstagramLocation;
  // Additional fields for compatibility
  formattedDate?: string;
}

export interface InstagramMetrics {
  // Basic engagement metrics
  likesCount: number;
  commentsCount: number;
  sharesCount?: number;
  savesCount?: number;
  
  // Reach and impressions
  reachCount?: number;
  impressionsCount?: number; // Deprecated for v22.0+ for new media
  viewsCount?: number; // New metric replacing impressions
  
  // Video specific metrics
  videoViewsCount?: number;
  videoPlaysCount?: number; // Deprecated for v22.0+
  clipsReplaysCount?: number; // For reels, deprecated for v22.0+
  igReelsAggregatedAllPlaysCount?: number; // Deprecated for v22.0+
  igReelsAvgWatchTime?: number; // For reels
  igReelsVideoViewTotalTime?: number; // For reels
  
  // Profile activity metrics
  profileVisits?: number;
  profileActivity?: number;
  profileLinksTaps?: number;
  
  // Story specific metrics
  replies?: number; // For stories
  navigation?: number; // For stories
  
  // Calculated metrics
  engagementRate: number;
  totalInteractions?: number;
}

export interface InstagramLocation {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
}

export interface InstagramAccount {
  id: string;
  username: string;
  accountType: 'PERSONAL' | 'BUSINESS' | 'CREATOR';
  mediaCount: number;
  followersCount: number;
  followsCount: number;
  biography?: string;
  website?: string;
  profilePictureUrl?: string;
  name?: string;
}

export interface InstagramInsight {
  name: string;
  period: 'day' | 'week' | 'days_28' | 'lifetime';
  values: Array<{
    value: number;
    endTime: string;
  }>;
  title: string;
  description: string;
}

export interface InstagramStory {
  id: string;
  mediaType: 'IMAGE' | 'VIDEO';
  mediaUrl: string;
  timestamp: string;
  expiresAt: string;
  metrics?: {
    impressions: number;
    reach: number;
    replies: number;
    exits: number;
    taps_forward: number;
    taps_back: number;
  };
}

export interface InstagramAudienceInsight {
  age: Record<string, number>;
  gender: Record<string, number>;
  country: Record<string, number>;
  city: Record<string, number>;
  locale: Record<string, number>;
}

export interface InstagramContentPerformance {
  postId: string;
  shortcode: string;
  publishedAt: string;
  metrics: InstagramMetrics;
  performance: {
    engagementScore: number;
    viralityScore: number;
    reachEfficiency: number;
    conversionRate?: number;
  };
  benchmarks: {
    avgLikes: number;
    avgComments: number;
    avgEngagementRate: number;
  };
}

export interface InstagramAnalytics {
  account: InstagramAccount;
  posts: InstagramPost[];
  stories: InstagramStory[];
  insights: InstagramInsight[];
  audienceInsights: InstagramAudienceInsight;
  contentPerformance: InstagramContentPerformance[];
  summary: {
    totalPosts: number;
    totalEngagement: number;
    avgEngagementRate: number;
    topPerformingPost?: InstagramPost | null;
    recentGrowth: {
      followers: number;
      engagement: number;
      reach: number;
    };
    // Enhanced analytics for social media managers
    detailedMetrics?: {
      totals: {
        totalPosts: number;
        totalLikes: number;
        totalComments: number;
        totalShares: number;
        totalSaves: number;
        totalReach: number;
        totalImpressions: number;
        totalVideoViews: number;
        totalEngagement: number;
        totalWatchTime: number;
      };
      averages: {
        avgLikes: number;
        avgComments: number;
        avgShares: number;
        avgSaves: number;
        avgReach: number;
        avgImpressions: number;
        avgVideoViews: number;
        avgEngagement: number;
        avgEngagementRate: number;
        avgWatchTime: number;
      };
      topPerformers: {
        topByEngagement: InstagramPost;
        topByLikes: InstagramPost;
        topByComments: InstagramPost;
        topByReach: InstagramPost;
        topByShares: InstagramPost;
        topBySaves: InstagramPost;
      };
      contentAnalysis: {
        mediaTypeBreakdown: {
          videos: { count: number; percentage: number; avgEngagementRate: number; };
          images: { count: number; percentage: number; avgEngagementRate: number; };
          carousels: { count: number; percentage: number; avgEngagementRate: number; };
        };
        postingFrequency: {
          avgDaysBetweenPosts: number;
          postsPerWeek: number;
          postsPerMonth: number;
        };
        hashtagAnalysis: {
          totalUniqueHashtags: number;
          avgHashtagsPerPost: number;
          topPerformingHashtags: Array<{
            hashtag: string;
            count: number;
            totalEngagement: number;
            avgEngagement: number;
          }>;
        };
      };
      engagementQuality: {
        commentsToLikesRatio: number;
        savesToReachRatio: number;
        sharesToReachRatio: number;
        reachToImpressionsRatio: number;
        engagementScore: number;
        viralityScore: number;
      };
      trends: {
        recentEngagementTrend: number;
        recentReachTrend: number;
        trendDirection: 'improving' | 'declining' | 'stable' | 'insufficient_data';
      };
      performance: {
        highPerformingPosts: number;
        lowPerformingPosts: number;
        consistencyScore: number;
        growthPotential: number;
      };
    };
  };
}

export interface InstagramAPIResponse<T = any> {
  data: T;
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
    previous?: string;
  };
}

export interface InstagramWebhookEvent {
  object: 'instagram';
  entry: Array<{
    id: string;
    time: number;
    changes: Array<{
      field: string;
      value: any;
    }>;
  }>;
}

export interface InstagramConfig {
  accessToken: string;
  userId: string;
  appId: string;
  appSecret: string;
  webhookVerifyToken: string;
  apiVersion: string;
  // Instagram Business API specific
  pageAccessToken?: string; // Facebook Page Access Token for Business API
  facebookPageId?: string; // Facebook Page ID connected to Instagram Business Account
  // Instagram Web session (for public stories/profile access like insta-stories)
  sessionId?: string;
  dsUserId?: string;
}

export interface InstagramSyncStatus {
  lastSyncAt: string;
  postsCount: number;
  storiesCount: number;
  insightsCount: number;
  status: 'idle' | 'syncing' | 'error';
  error?: string;
  nextSyncAt: string;
} 