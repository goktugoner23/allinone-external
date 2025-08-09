import InstagramService from "./instagram-service";
import FirebaseInstagramService from "../firebase/firebase-instagram";
import { InstagramRAGIntegration } from "./instagram-rag-integration";
import { InstagramCacheService } from "./instagram-cache";
import { RAGService } from "../rag-service";
import {
  InstagramConfig,
  InstagramPost,
  InstagramAnalytics,
  InstagramMetrics,
  FirestoreInstagramPost,
  FirestoreInstagramMetrics,
} from "../../types/instagram";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import config from "../../config";
import logger from "../../utils/logger";

export interface InstagramPipelineResult {
  success: boolean;
  data: {
    posts: InstagramPost[];
    totalFetched: number;
    totalStored: number;
    ragSynced: boolean;
    ragStatus?: string;
    lastSync: string;
    cacheUsed: boolean;
    cacheReason?: string;
    autoSyncEnabled?: boolean;
    fullSyncTriggered?: boolean;
    countMismatch?: {
      instagram: number;
      firestore: number;
      difference: number;
    };
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
  private readonly COLLECTION_NAME = "instagram_business";
  private isInitialized = false;
  private autoSyncRAG = true; // Enable automatic RAG sync by default

  /**
   * Validate and clean post data before saving
   */
  private validateAndCleanPost(post: InstagramPost): InstagramPost {
    return {
      ...post,
      // Ensure username is either a string or null, never undefined
      username: post.username || null,
      // Ensure caption is never undefined
      caption: post.caption || "",
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
        totalInteractions: post.metrics.totalInteractions || 0,
      },
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
      logger.info("Instagram pipeline initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Instagram pipeline:", error);
      throw error;
    }
  }

  private initializeFirebase(): void {
    if (getApps().length === 0) {
      let serviceAccount;

      if (config.firebase.serviceAccount) {
        try {
          // Check if it's a file path or JSON string
          if (config.firebase.serviceAccount.includes("{")) {
            // It's a JSON string
            serviceAccount = JSON.parse(config.firebase.serviceAccount);
          } else {
            // It's a file path
            const fs = require("fs");
            const path = require("path");
            const filePath = path.resolve(config.firebase.serviceAccount);

            if (fs.existsSync(filePath)) {
              const fileContent = fs.readFileSync(filePath, "utf8");
              serviceAccount = JSON.parse(fileContent);
            } else {
              throw new Error(
                `Firebase service account file not found: ${filePath}`
              );
            }
          }
        } catch (error) {
          logger.error("Failed to parse Firebase service account JSON:", error);
          throw new Error("Invalid Firebase service account configuration");
        }
      }

      if (serviceAccount) {
        initializeApp({
          credential: cert(serviceAccount),
          projectId: config.firebase.projectId,
        });
        logger.info("Firebase initialized with service account");
      } else {
        initializeApp({
          projectId: config.firebase.projectId,
        });
        logger.info("Firebase initialized with default credentials");
      }
    }
  }

  private async initializeRAG(): Promise<void> {
    try {
      // Dynamic imports to avoid circular dependencies
      const OpenAIClient = (await import("../../clients/openai")).default;
      const EmbeddingService = (await import("../embedding")).default;
      const PineconeClient = (await import("../../clients/pinecone")).default;

      const openaiClient = new OpenAIClient();
      const pineconeClient = new PineconeClient();
      const embeddingService = new EmbeddingService(
        openaiClient,
        pineconeClient
      );
      const ragService = new RAGService(
        openaiClient,
        embeddingService,
        pineconeClient
      );

      // Initialize the RAG service (this is crucial!)
      await ragService.initialize();

      this.ragIntegration = new InstagramRAGIntegration(
        this.instagramService,
        ragService,
        this.firebaseService
      );

      logger.info("RAG integration initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize RAG integration:", error);
      // Continue without RAG if it fails
    }
  }

  /**
   * Main pipeline method with smart caching and automatic full sync when counts don't match
   */
  async processInstagramData(
    limit: number = 25
  ): Promise<InstagramPipelineResult> {
    const startTime = Date.now();

    try {
      // Ensure pipeline is initialized
      await this.initialize();

      logger.info("Starting smart Instagram data pipeline", { limit });

      // Step 1: Get current total posts count from Instagram API (lightweight check)
      logger.info("Step 1: Checking current Instagram post count");
      const accountInfo = await this.instagramService.getAccountInfo();
      const instagramTotalPosts = accountInfo.mediaCount;

      logger.info(`Current Instagram total posts: ${instagramTotalPosts}`);

      // Step 2: Get Firestore posts count to compare
      logger.info("Step 2: Checking Firestore post count");
      const firestorePosts = await this.firebaseService.getAllPosts();
      const firestoreTotalPosts = firestorePosts.length;

      logger.info(`Current Firestore total posts: ${firestoreTotalPosts}`);

      // Step 3: Determine if we need full sync (count mismatch) or normal operation
      const countMismatch =
        Math.abs(instagramTotalPosts - firestoreTotalPosts) > 0;
      let actualLimit = limit;
      let fullSyncReason = "";

      if (countMismatch) {
        // Auto full sync when counts don't match
        actualLimit = instagramTotalPosts; // Pull ALL posts from Instagram
        fullSyncReason = `Count mismatch detected: Instagram(${instagramTotalPosts}) vs Firestore(${firestoreTotalPosts})`;
        logger.warn("COUNT MISMATCH DETECTED - Executing automatic full sync", {
          instagramCount: instagramTotalPosts,
          firestoreCount: firestoreTotalPosts,
          difference: Math.abs(instagramTotalPosts - firestoreTotalPosts),
          newLimit: actualLimit,
        });
      } else {
        logger.info("Post counts match - continuing with normal sync", {
          instagramCount: instagramTotalPosts,
          firestoreCount: firestoreTotalPosts,
          requestedLimit: limit,
        });
      }

      // Step 4: Check if cache needs refresh (only relevant for normal operation)
      logger.info("Step 4: Checking cache status");
      const cacheCheck = await this.cacheService.shouldRefreshCache(
        instagramTotalPosts
      );

      // Override cache for full sync scenarios
      if (countMismatch) {
        cacheCheck.shouldRefresh = true;
        cacheCheck.reason = fullSyncReason;
      }

      logger.info("Cache check result:", {
        shouldRefresh: cacheCheck.shouldRefresh,
        reason: cacheCheck.reason,
        fullSyncTriggered: countMismatch,
      });

      let posts: InstagramPost[];
      let totalStored = 0;
      let ragSynced = false;
      let ragStatus = "not_attempted";
      let cacheUsed = false;
      let cacheReason = cacheCheck.reason;

      if (!cacheCheck.shouldRefresh && cacheCheck.cacheData && !countMismatch) {
        // Use cached data (only if no count mismatch)
        logger.info("Step 5: Using cached data");
        posts = cacheCheck.cacheData.posts;
        cacheUsed = true;

        // Update last API check timestamp
        await this.cacheService.updateLastApiCheck();

        logger.info(`Returned ${posts.length} posts from cache`);
      } else {
        // Execute full pipeline (either cache refresh needed OR count mismatch detected)
        const pipelineReason = countMismatch
          ? "FULL SYNC (count mismatch)"
          : "cache refresh needed";
        logger.info(`Step 5: Executing full pipeline (${pipelineReason})`);

        // Step 5a: Fetch data from Instagram API with actual limit
        logger.info("Step 5a: Fetching data from Instagram API", {
          limit: actualLimit,
          isFullSync: countMismatch,
        });
        const instagramResponse = await this.instagramService.getPosts(
          actualLimit
        );
        posts = instagramResponse.data;

        logger.info(`Fetched ${posts.length} posts from Instagram API`, {
          requested: actualLimit,
          received: posts.length,
          isFullSync: countMismatch,
        });

        // Step 5b: Store data in Firestore
        logger.info("Step 5b: Storing data in Firestore");
        totalStored = await this.storePostsInFirestore(posts);

        logger.info(`Stored ${totalStored} posts in Firestore`);

        // Step 5c: Update cache with new data
        logger.info("Step 5c: Updating cache");
        await this.cacheService.writeCache(
          posts,
          accountInfo,
          instagramTotalPosts
        );

        logger.info("Cache updated successfully");

        // Step 5d: Sync to RAG system (enhanced with better error handling and status)
        if (this.ragIntegration && this.autoSyncRAG) {
          try {
            logger.info("Step 5d: Syncing to RAG system (auto-sync enabled)", {
              isFullSync: countMismatch,
              postsToSync: posts.length,
            });
            const ragSyncResult =
              await this.ragIntegration.syncFirestoreDataToRAG();
            ragSynced = true;
            ragStatus = ragSyncResult.status;
            logger.info("Successfully synced to RAG system", {
              postsCount: ragSyncResult.postsCount,
              status: ragSyncResult.status,
              isFullSync: countMismatch,
            });
          } catch (error) {
            logger.warn("RAG sync failed, continuing without it:", error);
            ragStatus = "error";
          }
        } else if (!this.ragIntegration) {
          logger.info("RAG integration not available, skipping sync");
          ragStatus = "not_available";
        } else {
          logger.info("Automatic RAG sync disabled, skipping sync");
          ragStatus = "disabled";
        }

        cacheUsed = false;
        cacheReason = countMismatch
          ? `Full sync executed - ${fullSyncReason}`
          : "Full pipeline executed - cache refreshed";
      }

      // Step 6: Return processed data
      const result: InstagramPipelineResult = {
        success: true,
        data: {
          posts,
          totalFetched: posts.length,
          totalStored,
          ragSynced,
          ragStatus,
          lastSync: new Date().toISOString(),
          cacheUsed,
          cacheReason,
          autoSyncEnabled: this.autoSyncRAG,
          ...(countMismatch && {
            fullSyncTriggered: true,
            countMismatch: {
              instagram: instagramTotalPosts,
              firestore: firestoreTotalPosts,
              difference: Math.abs(instagramTotalPosts - firestoreTotalPosts),
            },
          }),
        },
        processingTime: Date.now() - startTime,
      };

      if (countMismatch) {
        logger.warn("FULL SYNC COMPLETED due to count mismatch", {
          instagramCount: instagramTotalPosts,
          firestoreCountBefore: firestoreTotalPosts,
          postsFetched: posts.length,
          postsStored: totalStored,
          ragSynced,
          processingTime: result.processingTime,
        });
      } else {
        logger.info("Smart Instagram data pipeline completed successfully", {
          totalReturned: posts.length,
          totalStored,
          ragSynced,
          cacheUsed,
          cacheReason,
          processingTime: result.processingTime,
        });
      }

      return result;
    } catch (error) {
      logger.error("Smart Instagram data pipeline failed:", error);

      return {
        success: false,
        data: {
          posts: [],
          totalFetched: 0,
          totalStored: 0,
          ragSynced: false,
          lastSync: new Date().toISOString(),
          cacheUsed: false,
          cacheReason: "Pipeline failed",
        },
        error: error instanceof Error ? error.message : "Unknown error",
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Store Instagram posts in Firestore using proper Firebase service
   * Only stores new posts to avoid excess write operations
   * Updates existing posts that are missing thumbnail URLs
   * Automatically syncs to RAG after Firestore updates
   */
  private async storePostsInFirestore(posts: InstagramPost[]): Promise<number> {
    try {
      logger.info("Checking for new Instagram posts to store in Firestore", {
        totalPosts: posts.length,
      });

      // Batch check which posts already exist in Firestore (more efficient)
      const postIds = posts.map((post) => post.id);
      const existenceMap = await this.firebaseService.postsExist(postIds);

      // Filter to only new posts using the batch results
      const newPosts = posts.filter((post) => !existenceMap[post.id]);
      const existingPosts = posts.filter((post) => existenceMap[post.id]);

      logger.info("Instagram posts analysis", {
        totalFetched: posts.length,
        newPosts: newPosts.length,
        existingPosts: existingPosts.length,
        skippedWrites: existingPosts.length,
      });

      let storedCount = 0;
      let updatedCount = 0;
      let firestoreUpdated = false;

      // Only save new posts to avoid excess write operations
      if (newPosts.length > 0) {
        // Clean and validate posts before saving
        const cleanedPosts = newPosts.map((post) =>
          this.validateAndCleanPost(post)
        );
        await this.firebaseService.savePosts(cleanedPosts);
        storedCount = cleanedPosts.length;
        firestoreUpdated = true;

        logger.info("Successfully stored new Instagram posts to Firestore", {
          newPostsStored: storedCount,
        });
      } else {
        logger.info(
          "No new Instagram posts to store - all posts already exist in Firestore"
        );
      }

      // Check and update existing posts that might be missing or stale thumbnail/media URLs
      if (existingPosts.length > 0) {
        logger.info("Checking existing posts for missing thumbnail URLs", {
          existingPostsCount: existingPosts.length,
        });

        const postsNeedingUpdate =
          await this.firebaseService.getPostsMissingThumbnailUrls(postIds);

        if (postsNeedingUpdate.length > 0) {
          logger.info("Found existing posts missing thumbnail URLs", {
            postsNeedingUpdate: postsNeedingUpdate.length,
          });

          for (const existingPostId of postsNeedingUpdate) {
            // Use the fresh list first
            let freshPost = posts.find((p) => p.id === existingPostId);

            // If not in the current batch or still missing, fetch directly from API to refresh URLs
            if (!freshPost || !freshPost.thumbnailUrl) {
              try {
                const refreshed = await this.instagramService.getMediaById(
                  existingPostId
                );
                freshPost = {
                  id: refreshed.id,
                  shortcode:
                    this.instagramService["extractShortcode"]?.(
                      refreshed.permalink || ""
                    ) || "",
                  caption: "",
                  mediaType: (refreshed.mediaType as any) || "IMAGE",
                  mediaUrl: refreshed.mediaUrl || "",
                  thumbnailUrl: refreshed.thumbnailUrl || "",
                  permalink: refreshed.permalink || "",
                  timestamp: refreshed.timestamp || new Date().toISOString(),
                  username: refreshed.username || undefined,
                  metrics: {
                    likesCount: 0,
                    commentsCount: 0,
                    engagementRate: 0,
                  },
                  hashtags: [],
                  mentions: [],
                } as InstagramPost;
              } catch (apiErr) {
                logger.warn("Failed to refresh media from API", {
                  postId: existingPostId,
                  error:
                    apiErr instanceof Error ? apiErr.message : "Unknown error",
                });
              }
            }

            if (freshPost) {
              // Prefer thumbnailUrl for videos, otherwise ensure at least mediaUrl is present
              try {
                if (freshPost.thumbnailUrl) {
                  await this.firebaseService.updatePostThumbnailUrl(
                    existingPostId,
                    freshPost.thumbnailUrl
                  );
                  updatedCount++;
                  logger.debug("Updated post with refreshed thumbnail URL", {
                    postId: existingPostId,
                  });
                } else if (freshPost.mediaUrl) {
                  await this.firebaseService.updatePostMediaUrl(
                    existingPostId,
                    freshPost.mediaUrl
                  );
                  updatedCount++;
                  logger.debug("Updated post with refreshed media URL", {
                    postId: existingPostId,
                  });
                }
              } catch (error) {
                logger.warn("Failed updating media/thumbnail URL", {
                  postId: existingPostId,
                  error:
                    error instanceof Error ? error.message : "Unknown error",
                });
              }
            }
          }

          if (updatedCount > 0) {
            firestoreUpdated = true;
            logger.info(
              "Successfully updated existing posts with refreshed URLs",
              { updatedCount }
            );
          }
        }
      }

      // Update analytics summary with all posts (new + existing) for the Kotlin app compatibility
      if (posts.length > 0) {
        const analytics = await this.generateAnalyticsFromPosts(posts);
        await this.firebaseService.saveAnalyticsSummary(analytics);
        firestoreUpdated = true;

        logger.info("Updated analytics summary with all posts", {
          totalPostsInAnalytics: posts.length,
        });
      }

      // Auto-sync to RAG if Firestore was updated and auto-sync is enabled
      if (firestoreUpdated && this.autoSyncRAG) {
        await this.syncToRAGAfterFirestoreUpdate(
          updatedCount > 0 ? "posts_and_thumbnails_updated" : "posts_stored"
        );
      }

      // Return total number of posts affected (new posts + updated posts)
      const totalAffected = storedCount + updatedCount;
      logger.info("Firestore operation completed", {
        newPostsStored: storedCount,
        existingPostsUpdated: updatedCount,
        totalAffected,
      });

      return totalAffected;
    } catch (error) {
      logger.error(
        "Failed to store Instagram posts with metrics to Firestore:",
        error
      );
      throw error;
    }
  }

  /**
   * Generate comprehensive analytics from posts for social media management
   */
  private async generateAnalyticsFromPosts(
    posts: InstagramPost[]
  ): Promise<InstagramAnalytics> {
    try {
      // Create account info from stored data (no Instagram API calls)
      const accountInfo = this.generateAccountInfoFromPosts(posts);

      if (posts.length === 0) {
        return {
          account: accountInfo,
          posts: [],
          stories: [],
          insights: [],
          audienceInsights: {
            age: {},
            gender: {},
            country: {},
            city: {},
            locale: {},
          },
          contentPerformance: [],
          summary: {
            totalPosts: 0,
            totalEngagement: 0,
            avgEngagementRate: 0,
            topPerformingPost: null,
            recentGrowth: { followers: 0, engagement: 0, reach: 0 },
          },
        };
      }

      // Calculate comprehensive summary metrics
      const analytics = this.calculateComprehensiveAnalytics(posts);

      // Create enhanced content performance data
      const contentPerformance = posts.map((post) => ({
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
          avgLikes: analytics.averages.avgLikes,
          avgComments: analytics.averages.avgComments,
          avgEngagementRate: analytics.averages.avgEngagementRate,
        },
      }));

      const result: InstagramAnalytics = {
        account: accountInfo,
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
          totalPosts: analytics.totals.totalPosts,
          totalEngagement: analytics.totals.totalEngagement,
          avgEngagementRate: analytics.averages.avgEngagementRate,
          topPerformingPost: analytics.topPerformers.topByEngagement,
          recentGrowth: {
            followers: 0,
            engagement: analytics.trends.recentEngagementTrend,
            reach: analytics.trends.recentReachTrend,
          },
          // Enhanced analytics for social media managers
          detailedMetrics: {
            totals: analytics.totals,
            averages: analytics.averages,
            topPerformers: analytics.topPerformers,
            contentAnalysis: analytics.contentAnalysis,
            engagementQuality: analytics.engagementQuality,
            trends: analytics.trends,
            performance: analytics.performance,
          },
        },
      };

      return result;
    } catch (error) {
      logger.error("Error generating analytics from posts:", error);
      throw error;
    }
  }

  /**
   * Generate account info from stored posts data (no Instagram API calls)
   */
  private generateAccountInfoFromPosts(posts: InstagramPost[]): any {
    // Extract basic account info from posts data
    const firstPost = posts[0];
    const username = firstPost?.username || "unknown";

    return {
      id: this.instagramService["config"]?.userId || "unknown",
      username: username,
      name: username, // Fallback to username
      biography: "",
      website: "",
      profilePictureUrl: "",
      followersCount: 0, // Unknown from posts alone
      followsCount: 0, // Unknown from posts alone
      mediaCount: posts.length,
      accountType: "BUSINESS",
    };
  }

  /**
   * Calculate comprehensive analytics for social media management
   */
  private calculateComprehensiveAnalytics(posts: InstagramPost[]) {
    const totalPosts = posts.length;

    // Calculate totals
    const totals = {
      totalPosts,
      totalLikes: posts.reduce((sum, post) => sum + post.metrics.likesCount, 0),
      totalComments: posts.reduce(
        (sum, post) => sum + post.metrics.commentsCount,
        0
      ),
      totalShares: posts.reduce(
        (sum, post) => sum + (post.metrics.sharesCount || 0),
        0
      ),
      totalSaves: posts.reduce(
        (sum, post) => sum + (post.metrics.savesCount || 0),
        0
      ),
      totalReach: posts.reduce(
        (sum, post) => sum + (post.metrics.reachCount || 0),
        0
      ),
      totalImpressions: posts.reduce(
        (sum, post) => sum + (post.metrics.impressionsCount || 0),
        0
      ),
      totalVideoViews: posts.reduce(
        (sum, post) => sum + (post.metrics.videoViewsCount || 0),
        0
      ),
      totalEngagement: posts.reduce(
        (sum, post) =>
          sum +
          post.metrics.likesCount +
          post.metrics.commentsCount +
          (post.metrics.savesCount || 0) +
          (post.metrics.sharesCount || 0),
        0
      ),
      totalWatchTime: posts.reduce(
        (sum, post) => sum + (post.metrics.igReelsAvgWatchTime || 0),
        0
      ),
    };

    // Calculate averages
    const averages = {
      avgLikes: totalPosts > 0 ? Math.round(totals.totalLikes / totalPosts) : 0,
      avgComments:
        totalPosts > 0 ? Math.round(totals.totalComments / totalPosts) : 0,
      avgShares:
        totalPosts > 0 ? Math.round(totals.totalShares / totalPosts) : 0,
      avgSaves: totalPosts > 0 ? Math.round(totals.totalSaves / totalPosts) : 0,
      avgReach: totalPosts > 0 ? Math.round(totals.totalReach / totalPosts) : 0,
      avgImpressions:
        totalPosts > 0 ? Math.round(totals.totalImpressions / totalPosts) : 0,
      avgVideoViews:
        totalPosts > 0 ? Math.round(totals.totalVideoViews / totalPosts) : 0,
      avgEngagement:
        totalPosts > 0 ? Math.round(totals.totalEngagement / totalPosts) : 0,
      avgEngagementRate:
        totalPosts > 0
          ? Number(
              (
                posts.reduce(
                  (sum, post) => sum + post.metrics.engagementRate,
                  0
                ) / totalPosts
              ).toFixed(2)
            )
          : 0,
      avgWatchTime:
        totalPosts > 0 ? Math.round(totals.totalWatchTime / totalPosts) : 0,
    };

    // Find top performers
    const topPerformers = {
      topByEngagement: posts.reduce(
        (top, post) =>
          post.metrics.engagementRate > (top?.metrics.engagementRate || 0)
            ? post
            : top,
        posts[0]
      ),
      topByLikes: posts.reduce(
        (top, post) =>
          post.metrics.likesCount > (top?.metrics.likesCount || 0) ? post : top,
        posts[0]
      ),
      topByComments: posts.reduce(
        (top, post) =>
          post.metrics.commentsCount > (top?.metrics.commentsCount || 0)
            ? post
            : top,
        posts[0]
      ),
      topByReach: posts.reduce(
        (top, post) =>
          (post.metrics.reachCount || 0) > (top?.metrics.reachCount || 0)
            ? post
            : top,
        posts[0]
      ),
      topByShares: posts.reduce(
        (top, post) =>
          (post.metrics.sharesCount || 0) > (top?.metrics.sharesCount || 0)
            ? post
            : top,
        posts[0]
      ),
      topBySaves: posts.reduce(
        (top, post) =>
          (post.metrics.savesCount || 0) > (top?.metrics.savesCount || 0)
            ? post
            : top,
        posts[0]
      ),
    };

    // Content analysis
    const videosPosts = posts.filter((post) => post.mediaType === "VIDEO");
    const imagePosts = posts.filter((post) => post.mediaType === "IMAGE");
    const carouselPosts = posts.filter(
      (post) => post.mediaType === "CAROUSEL_ALBUM"
    );

    const contentAnalysis = {
      mediaTypeBreakdown: {
        videos: {
          count: videosPosts.length,
          percentage:
            totalPosts > 0
              ? Number(((videosPosts.length / totalPosts) * 100).toFixed(1))
              : 0,
          avgEngagementRate:
            videosPosts.length > 0
              ? Number(
                  (
                    videosPosts.reduce(
                      (sum, post) => sum + post.metrics.engagementRate,
                      0
                    ) / videosPosts.length
                  ).toFixed(2)
                )
              : 0,
        },
        images: {
          count: imagePosts.length,
          percentage:
            totalPosts > 0
              ? Number(((imagePosts.length / totalPosts) * 100).toFixed(1))
              : 0,
          avgEngagementRate:
            imagePosts.length > 0
              ? Number(
                  (
                    imagePosts.reduce(
                      (sum, post) => sum + post.metrics.engagementRate,
                      0
                    ) / imagePosts.length
                  ).toFixed(2)
                )
              : 0,
        },
        carousels: {
          count: carouselPosts.length,
          percentage:
            totalPosts > 0
              ? Number(((carouselPosts.length / totalPosts) * 100).toFixed(1))
              : 0,
          avgEngagementRate:
            carouselPosts.length > 0
              ? Number(
                  (
                    carouselPosts.reduce(
                      (sum, post) => sum + post.metrics.engagementRate,
                      0
                    ) / carouselPosts.length
                  ).toFixed(2)
                )
              : 0,
        },
      },
      postingFrequency: this.calculatePostingFrequency(posts),
      hashtagAnalysis: this.analyzeHashtags(posts),
    };

    // Engagement quality metrics
    const engagementQuality = {
      commentsToLikesRatio:
        totals.totalLikes > 0
          ? Number((totals.totalComments / totals.totalLikes).toFixed(3))
          : 0,
      savesToReachRatio:
        totals.totalReach > 0
          ? Number(((totals.totalSaves / totals.totalReach) * 100).toFixed(2))
          : 0,
      sharesToReachRatio:
        totals.totalReach > 0
          ? Number(((totals.totalShares / totals.totalReach) * 100).toFixed(2))
          : 0,
      reachToImpressionsRatio:
        totals.totalImpressions > 0
          ? Number(
              ((totals.totalReach / totals.totalImpressions) * 100).toFixed(2)
            )
          : 0,
      engagementScore: this.calculateOverallEngagementScore(posts),
      viralityScore: this.calculateOverallViralityScore(posts),
    };

    // Performance trends (last 10 posts vs previous posts)
    const trends = this.calculatePerformanceTrends(posts);

    // Performance benchmarks
    const performance = {
      highPerformingPosts: posts.filter(
        (post) => post.metrics.engagementRate > averages.avgEngagementRate * 1.5
      ).length,
      lowPerformingPosts: posts.filter(
        (post) => post.metrics.engagementRate < averages.avgEngagementRate * 0.5
      ).length,
      consistencyScore: this.calculateConsistencyScore(posts),
      growthPotential: this.calculateGrowthPotential(posts),
    };

    return {
      totals,
      averages,
      topPerformers,
      contentAnalysis,
      engagementQuality,
      trends,
      performance,
    };
  }

  /**
   * Calculate posting frequency analysis
   */
  private calculatePostingFrequency(posts: InstagramPost[]) {
    if (posts.length < 2)
      return { avgDaysBetweenPosts: 0, postsPerWeek: 0, postsPerMonth: 0 };

    const sortedPosts = posts.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const firstPost = new Date(sortedPosts[sortedPosts.length - 1].timestamp);
    const lastPost = new Date(sortedPosts[0].timestamp);
    const daysBetween = Math.ceil(
      (lastPost.getTime() - firstPost.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      avgDaysBetweenPosts:
        daysBetween > 0 ? Number((daysBetween / posts.length).toFixed(1)) : 0,
      postsPerWeek:
        daysBetween > 0
          ? Number(((posts.length / daysBetween) * 7).toFixed(1))
          : 0,
      postsPerMonth:
        daysBetween > 0
          ? Number(((posts.length / daysBetween) * 30).toFixed(1))
          : 0,
    };
  }

  /**
   * Analyze hashtag performance
   */
  private analyzeHashtags(posts: InstagramPost[]) {
    const hashtagFrequency: {
      [key: string]: {
        count: number;
        totalEngagement: number;
        avgEngagement: number;
      };
    } = {};

    posts.forEach((post) => {
      const engagement =
        post.metrics.likesCount +
        post.metrics.commentsCount +
        (post.metrics.savesCount || 0) +
        (post.metrics.sharesCount || 0);

      post.hashtags.forEach((hashtag) => {
        if (!hashtagFrequency[hashtag]) {
          hashtagFrequency[hashtag] = {
            count: 0,
            totalEngagement: 0,
            avgEngagement: 0,
          };
        }
        hashtagFrequency[hashtag].count += 1;
        hashtagFrequency[hashtag].totalEngagement += engagement;
      });
    });

    // Calculate averages and sort by performance
    Object.keys(hashtagFrequency).forEach((hashtag) => {
      hashtagFrequency[hashtag].avgEngagement = Math.round(
        hashtagFrequency[hashtag].totalEngagement /
          hashtagFrequency[hashtag].count
      );
    });

    const topHashtags = Object.entries(hashtagFrequency)
      .sort(([, a], [, b]) => b.avgEngagement - a.avgEngagement)
      .slice(0, 10)
      .map(([hashtag, data]) => ({ hashtag, ...data }));

    return {
      totalUniqueHashtags: Object.keys(hashtagFrequency).length,
      avgHashtagsPerPost:
        posts.length > 0
          ? Number(
              (
                posts.reduce((sum, post) => sum + post.hashtags.length, 0) /
                posts.length
              ).toFixed(1)
            )
          : 0,
      topPerformingHashtags: topHashtags,
    };
  }

  /**
   * Calculate performance trends
   */
  private calculatePerformanceTrends(posts: InstagramPost[]) {
    if (posts.length < 10) {
      return {
        recentEngagementTrend: 0,
        recentReachTrend: 0,
        trendDirection: "insufficient_data" as const,
      };
    }

    const sortedPosts = posts.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const recentPosts = sortedPosts.slice(0, 10);
    const olderPosts = sortedPosts.slice(10, 20);

    const recentAvgEngagement =
      recentPosts.reduce((sum, post) => sum + post.metrics.engagementRate, 0) /
      recentPosts.length;
    const olderAvgEngagement =
      olderPosts.length > 0
        ? olderPosts.reduce(
            (sum, post) => sum + post.metrics.engagementRate,
            0
          ) / olderPosts.length
        : recentAvgEngagement;

    const recentAvgReach =
      recentPosts.reduce(
        (sum, post) => sum + (post.metrics.reachCount || 0),
        0
      ) / recentPosts.length;
    const olderAvgReach =
      olderPosts.length > 0
        ? olderPosts.reduce(
            (sum, post) => sum + (post.metrics.reachCount || 0),
            0
          ) / olderPosts.length
        : recentAvgReach;

    const engagementTrend =
      olderAvgEngagement > 0
        ? Number(
            (
              ((recentAvgEngagement - olderAvgEngagement) /
                olderAvgEngagement) *
              100
            ).toFixed(2)
          )
        : 0;
    const reachTrend =
      olderAvgReach > 0
        ? Number(
            (((recentAvgReach - olderAvgReach) / olderAvgReach) * 100).toFixed(
              2
            )
          )
        : 0;

    let trendDirection:
      | "improving"
      | "declining"
      | "stable"
      | "insufficient_data" = "stable";
    if (engagementTrend > 5) trendDirection = "improving";
    else if (engagementTrend < -5) trendDirection = "declining";

    return {
      recentEngagementTrend: engagementTrend,
      recentReachTrend: reachTrend,
      trendDirection,
    };
  }

  /**
   * Calculate overall engagement score
   */
  private calculateOverallEngagementScore(posts: InstagramPost[]): number {
    if (posts.length === 0) return 0;

    const totalEngagement = posts.reduce(
      (sum, post) =>
        sum +
        post.metrics.likesCount +
        post.metrics.commentsCount * 2 +
        (post.metrics.savesCount || 0) * 3 +
        (post.metrics.sharesCount || 0) * 4,
      0
    );
    const totalReach = posts.reduce(
      (sum, post) => sum + (post.metrics.reachCount || 1),
      0
    );

    return Number(((totalEngagement / totalReach) * 100).toFixed(2));
  }

  /**
   * Calculate overall virality score
   */
  private calculateOverallViralityScore(posts: InstagramPost[]): number {
    if (posts.length === 0) return 0;

    const totalShares = posts.reduce(
      (sum, post) => sum + (post.metrics.sharesCount || 0),
      0
    );
    const totalSaves = posts.reduce(
      (sum, post) => sum + (post.metrics.savesCount || 0),
      0
    );
    const totalReach = posts.reduce(
      (sum, post) => sum + (post.metrics.reachCount || 1),
      0
    );

    return Number(
      (((totalShares * 10 + totalSaves * 5) / totalReach) * 100).toFixed(2)
    );
  }

  /**
   * Calculate consistency score
   */
  private calculateConsistencyScore(posts: InstagramPost[]): number {
    if (posts.length < 2) return 100;

    const engagementRates = posts.map((post) => post.metrics.engagementRate);
    const mean =
      engagementRates.reduce((sum, rate) => sum + rate, 0) /
      engagementRates.length;
    const variance =
      engagementRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) /
      engagementRates.length;
    const standardDeviation = Math.sqrt(variance);

    // Lower standard deviation = higher consistency (inverse relationship)
    const consistencyScore = Math.max(0, 100 - standardDeviation * 10);
    return Number(consistencyScore.toFixed(1));
  }

  /**
   * Calculate growth potential score
   */
  private calculateGrowthPotential(posts: InstagramPost[]): number {
    if (posts.length === 0) return 0;

    const recentPosts = posts.slice(0, Math.min(10, posts.length));
    const avgEngagementRate =
      recentPosts.reduce((sum, post) => sum + post.metrics.engagementRate, 0) /
      recentPosts.length;
    const avgSaveRate =
      recentPosts.reduce(
        (sum, post) =>
          sum +
          ((post.metrics.savesCount || 0) / (post.metrics.reachCount || 1)) *
            100,
        0
      ) / recentPosts.length;
    const avgShareRate =
      recentPosts.reduce(
        (sum, post) =>
          sum +
          ((post.metrics.sharesCount || 0) / (post.metrics.reachCount || 1)) *
            100,
        0
      ) / recentPosts.length;

    // Growth potential based on engagement quality and virality indicators
    const growthScore =
      avgEngagementRate * 0.4 + avgSaveRate * 30 + avgShareRate * 50;
    return Number(Math.min(100, growthScore).toFixed(1));
  }

  /**
   * Calculate engagement score for performance metrics
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
  private convertToFirestoreFormat(
    post: InstagramPost
  ): FirestoreInstagramPost {
    const metrics: FirestoreInstagramMetrics = {
      likes: post.metrics.likesCount,
      comments: post.metrics.commentsCount,
      shares: post.metrics.sharesCount || 0,
      saved: post.metrics.savesCount || 0,
      reach: post.metrics.reachCount || 0,
      views: post.metrics.impressionsCount || 0,
      total_interactions:
        post.metrics.likesCount +
        post.metrics.commentsCount +
        (post.metrics.savesCount || 0) +
        (post.metrics.sharesCount || 0),
    };

    // Convert media type
    let mediaType: "FEED" | "REEL" | "STORY" = "FEED";
    switch (post.mediaType) {
      case "VIDEO":
        mediaType = "REEL";
        break;
      case "IMAGE":
      case "CAROUSEL_ALBUM":
        mediaType = "FEED";
        break;
      default:
        mediaType = "FEED";
    }

    return {
      id: post.id,
      caption: post.caption,
      mediaType,
      permalink: post.permalink,
      timestamp: post.timestamp,
      formattedDate: this.formatDate(post.timestamp),
      metrics,
    };
  }

  /**
   * Format timestamp to readable date
   */
  private formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
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
      logger.info("Starting Instagram posts metrics update", {
        postIds: postIds?.length || "all",
      });

      let postsToUpdate: InstagramPost[];

      if (postIds && postIds.length > 0) {
        // Update specific posts
        const promises = postIds.map((id) =>
          this.firebaseService.getPostById(id)
        );
        const results = await Promise.all(promises);
        postsToUpdate = results.filter(
          (post) => post !== null
        ) as InstagramPost[];
      } else {
        // Update posts that need metrics refresh (older than 24 hours)
        postsToUpdate = await this.firebaseService.getPostsNeedingMetricsUpdate(
          24
        );
      }

      const results: Array<{
        postId: string;
        success: boolean;
        error?: string;
      }> = [];
      let updated = 0;
      let errors = 0;

      for (const post of postsToUpdate) {
        try {
          // Fetch fresh metrics from Instagram API
          const freshMetrics = await this.instagramService.getMediaInsights(
            post.id,
            post.mediaType
          );

          // Transform insights to metrics
          const updatedMetrics = this.instagramService["transformMetrics"](
            freshMetrics,
            {
              likesCount: post.metrics.likesCount,
              commentsCount: post.metrics.commentsCount,
            }
          );

          // Merge with existing metrics
          const mergedMetrics: InstagramMetrics = {
            ...post.metrics,
            ...updatedMetrics,
            totalInteractions:
              updatedMetrics.likesCount +
              updatedMetrics.commentsCount +
              (updatedMetrics.savesCount || 0) +
              (updatedMetrics.sharesCount || 0),
          };

          // Update in Firestore
          await this.firebaseService.updatePostMetrics(post.id, mergedMetrics);

          results.push({ postId: post.id, success: true });
          updated++;

          logger.debug("Updated metrics for post", {
            postId: post.id,
            engagementRate: mergedMetrics.engagementRate,
          });
        } catch (error) {
          logger.error(`Failed to update metrics for post ${post.id}:`, error);
          results.push({
            postId: post.id,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          errors++;
        }

        // Add small delay to avoid API rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      logger.info("Completed Instagram posts metrics update", {
        total: postsToUpdate.length,
        updated,
        errors,
      });

      return { updated, errors, results };
    } catch (error) {
      logger.error("Error updating Instagram posts metrics:", error);
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
      logger.info("Starting metrics sync from Instagram API to Firestore", {
        limit,
      });

      // Get recent posts from Instagram API with fresh metrics
      const instagramResponse = await this.instagramService.getPosts(limit);
      const freshPosts = instagramResponse.data;

      // Batch check which posts already exist in Firestore (more efficient)
      const postIds = freshPosts.map((post) => post.id);
      const existenceMap = await this.firebaseService.postsExist(postIds);

      // Separate new posts from existing ones using batch results
      const newPosts = freshPosts.filter((post) => !existenceMap[post.id]);
      const existingPosts = freshPosts.filter((post) => existenceMap[post.id]);

      logger.info("Metrics sync analysis", {
        totalFetched: freshPosts.length,
        newPosts: newPosts.length,
        existingPosts: existingPosts.length,
      });

      let newPostsCount = 0;
      let updatedPostsCount = 0;
      let errors = 0;

      // Save new posts in batch
      if (newPosts.length > 0) {
        try {
          await this.firebaseService.savePosts(newPosts);
          newPostsCount = newPosts.length;
          logger.info("Successfully saved new posts in batch", {
            count: newPostsCount,
          });
        } catch (error) {
          logger.error("Failed to save new posts in batch:", error);
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
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      const lastSync = new Date().toISOString();
      const totalSynced = newPostsCount + updatedPostsCount;

      // Update analytics summary with fresh data
      if (totalSynced > 0) {
        const analytics = await this.generateAnalyticsFromPosts(freshPosts);
        await this.firebaseService.saveAnalyticsSummary(analytics);

        // Auto-sync to RAG after metrics update
        if (this.autoSyncRAG) {
          await this.syncToRAGAfterFirestoreUpdate("metrics_sync");
        }
      }

      logger.info("Completed metrics sync from Instagram API to Firestore", {
        totalSynced,
        newPosts: newPostsCount,
        updatedPosts: updatedPostsCount,
        errors,
        lastSync,
      });

      return {
        synced: totalSynced,
        errors,
        lastSync,
        newPosts: newPostsCount,
        updatedPosts: updatedPostsCount,
      };
    } catch (error) {
      logger.error("Error syncing metrics to Firestore:", error);
      throw error;
    }
  }

  /**
   * Get comprehensive account analytics using ONLY stored data (no Instagram API calls)
   * Perfect for frontend that wants fast analytics without rate limit concerns
   */
  async getAccountAnalytics(): Promise<InstagramAnalytics> {
    try {
      logger.info("Generating comprehensive analytics from stored data only");

      // Get posts from Firestore (stored data - no Instagram API calls)
      const instagramPosts = await this.firebaseService.getAllPosts();

      // Generate comprehensive analytics using our enhanced method
      const analytics = await this.generateAnalyticsFromPosts(instagramPosts);

      logger.info(
        "Successfully generated comprehensive analytics from stored data",
        {
          totalPosts: analytics.summary.totalPosts,
          totalEngagement: analytics.summary.totalEngagement,
          avgEngagementRate: analytics.summary.avgEngagementRate,
          hasDetailedMetrics: !!analytics.summary.detailedMetrics,
          sourceDataOnly: "Firestore (no API calls)",
        }
      );

      return analytics;
    } catch (error) {
      logger.error(
        "Failed to generate account analytics from stored data:",
        error
      );
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
      logger.error("Failed to get cache stats:", error);
      return { exists: false, error: error.message };
    }
  }

  /**
   * Clear cache manually
   */
  async clearCache(): Promise<void> {
    try {
      await this.cacheService.clearCache();
      logger.info("Cache cleared successfully");
    } catch (error) {
      logger.error("Failed to clear cache:", error);
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
      overall: false,
    };

    try {
      // Check Instagram API
      health.instagram = await this.instagramService.healthCheck();
    } catch (error) {
      logger.error("Instagram health check failed:", error);
    }

    try {
      // Check Firestore
      health.firestore = await this.firebaseService.healthCheck();
    } catch (error) {
      logger.error("Firestore health check failed:", error);
    }

    try {
      // Check RAG (if available)
      if (this.ragIntegration) {
        // Simple check - try to get sync status
        await this.ragIntegration.getSyncStatus();
        health.rag = true;
      }
    } catch (error) {
      logger.error("RAG health check failed:", error);
    }

    try {
      // Check cache
      const cacheStats = await this.cacheService.getCacheStats();
      health.cache = true; // If we can get stats, cache service is working
    } catch (error) {
      logger.error("Cache health check failed:", error);
    }

    health.overall = health.instagram && health.firestore && health.cache;

    return health;
  }

  /**
   * Enable or disable automatic RAG sync
   */
  setAutoSyncRAG(enabled: boolean): void {
    this.autoSyncRAG = enabled;
    logger.info(`Automatic RAG sync ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Check if automatic RAG sync is enabled
   */
  isAutoSyncRAGEnabled(): boolean {
    return this.autoSyncRAG;
  }

  /**
   * Sync to RAG after Firestore update with proper error handling
   */
  private async syncToRAGAfterFirestoreUpdate(reason: string): Promise<void> {
    try {
      if (!this.ragIntegration) {
        logger.info(`RAG integration not available for sync after ${reason}`);
        return;
      }

      logger.info(`Auto-syncing to RAG after Firestore update: ${reason}`);
      const ragSyncResult = await this.ragIntegration.syncFirestoreDataToRAG();

      logger.info("Successfully auto-synced to RAG after Firestore update", {
        reason,
        postsCount: ragSyncResult.postsCount,
        status: ragSyncResult.status,
      });
    } catch (error) {
      logger.warn(`RAG auto-sync failed after ${reason}:`, error);
      // Don't throw error - just log warning as this is automatic sync
    }
  }

  /**
   * Force sync Instagram data to RAG system
   */
  async forceSyncToRAG(): Promise<{
    success: boolean;
    postsCount: number;
    status: string;
    error?: string;
  }> {
    try {
      logger.info("Force syncing Instagram data to RAG system");

      if (!this.ragIntegration) {
        await this.initializeRAG();
        if (!this.ragIntegration) {
          throw new Error("RAG integration not available");
        }
      }

      const ragSyncResult = await this.ragIntegration.syncFirestoreDataToRAG();

      logger.info("Force sync to RAG completed successfully", {
        postsCount: ragSyncResult.postsCount,
        status: ragSyncResult.status,
      });

      return {
        success: true,
        postsCount: ragSyncResult.postsCount,
        status: ragSyncResult.status,
      };
    } catch (error) {
      logger.error("Force sync to RAG failed:", error);
      return {
        success: false,
        postsCount: 0,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check if RAG sync is needed (simple heuristic based on time)
   */
  private async shouldSyncToRAG(): Promise<boolean> {
    try {
      // Check if RAG was synced recently (within last hour)
      // This is a simple heuristic - you could make it more sophisticated
      if (this.ragIntegration) {
        const syncStatus = await this.ragIntegration.getSyncStatus();
        const lastSyncTime = new Date(syncStatus.lastSyncAt);
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return lastSyncTime < hourAgo;
      }
      return true;
    } catch (error) {
      logger.warn(
        "Could not determine RAG sync status, assuming sync needed:",
        error
      );
      return true;
    }
  }

  /**
   * Process Instagram data with explicit RAG sync control
   */
  async processInstagramDataWithRAGControl(
    limit: number = 25,
    forceRAGSync: boolean = false
  ): Promise<InstagramPipelineResult> {
    const originalAutoSync = this.autoSyncRAG;

    try {
      // Temporarily set auto sync based on force parameter
      if (forceRAGSync) {
        this.setAutoSyncRAG(true);
      }

      const result = await this.processInstagramData(limit);

      // If force sync was requested but normal processing didn't sync, force it
      if (forceRAGSync && !result.data.ragSynced) {
        logger.info(
          "Force RAG sync requested but not completed in normal processing, forcing now"
        );
        const forceSyncResult = await this.forceSyncToRAG();
        result.data.ragSynced = forceSyncResult.success;
        result.data.ragStatus = forceSyncResult.status;
      }

      return result;
    } finally {
      // Restore original auto sync setting
      this.setAutoSyncRAG(originalAutoSync);
    }
  }
}

export default InstagramPipeline;
