import fs from 'fs/promises';
import path from 'path';
import { InstagramPost, InstagramAccount } from '../../types/instagram';
import logger from '../../utils/logger';

export interface InstagramCacheData {
  lastUpdated: string;
  totalPostsCount: number;
  account: InstagramAccount | null;
  posts: InstagramPost[];
  metadata: {
    cacheVersion: string;
    lastSyncTimestamp: number;
    lastApiCheck: number;
  };
}

export class InstagramCacheService {
  private readonly cacheDir: string;
  private readonly cacheFilePath: string;
  private readonly CACHE_VERSION = '1.0.0';

  constructor() {
    // Store cache in a data directory within the project
    this.cacheDir = path.join(process.cwd(), 'data', 'cache');
    this.cacheFilePath = path.join(this.cacheDir, 'instagram-cache.json');
  }

  /**
   * Initialize cache directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      logger.info('Instagram cache directory initialized', { cacheDir: this.cacheDir });
    } catch (error) {
      logger.error('Failed to initialize cache directory:', error);
      throw error;
    }
  }

  /**
   * Check if cache file exists
   */
  async cacheExists(): Promise<boolean> {
    try {
      await fs.access(this.cacheFilePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read cache data from JSON file
   */
  async readCache(): Promise<InstagramCacheData | null> {
    try {
      if (!(await this.cacheExists())) {
        logger.info('Cache file does not exist');
        return null;
      }

      const cacheContent = await fs.readFile(this.cacheFilePath, 'utf-8');
      const cacheData: InstagramCacheData = JSON.parse(cacheContent);

      // Validate cache structure
      if (!this.isValidCacheData(cacheData)) {
        logger.warn('Invalid cache data structure, treating as no cache');
        return null;
      }

      logger.info('Successfully read cache data', {
        postsCount: cacheData.posts.length,
        totalPostsCount: cacheData.totalPostsCount,
        lastUpdated: cacheData.lastUpdated
      });

      return cacheData;
    } catch (error) {
      logger.error('Failed to read cache:', error);
      return null;
    }
  }

  /**
   * Write cache data to JSON file
   */
  async writeCache(
    posts: InstagramPost[], 
    account: InstagramAccount | null, 
    totalPostsCount: number
  ): Promise<void> {
    try {
      await this.initialize(); // Ensure directory exists

      const cacheData: InstagramCacheData = {
        lastUpdated: new Date().toISOString(),
        totalPostsCount,
        account,
        posts,
        metadata: {
          cacheVersion: this.CACHE_VERSION,
          lastSyncTimestamp: Date.now(),
          lastApiCheck: Date.now()
        }
      };

      await fs.writeFile(this.cacheFilePath, JSON.stringify(cacheData, null, 2), 'utf-8');

      logger.info('Successfully wrote cache data', {
        postsCount: posts.length,
        totalPostsCount,
        filePath: this.cacheFilePath,
        fileSize: `${(JSON.stringify(cacheData).length / 1024).toFixed(2)} KB`
      });
    } catch (error) {
      logger.error('Failed to write cache:', error);
      throw error;
    }
  }

  /**
   * Update last API check timestamp without changing the data
   */
  async updateLastApiCheck(): Promise<void> {
    try {
      const cacheData = await this.readCache();
      if (!cacheData) {
        logger.warn('No cache data to update API check timestamp');
        return;
      }

      cacheData.metadata.lastApiCheck = Date.now();
      await fs.writeFile(this.cacheFilePath, JSON.stringify(cacheData, null, 2), 'utf-8');

      logger.debug('Updated last API check timestamp');
    } catch (error) {
      logger.error('Failed to update last API check:', error);
    }
  }

  /**
   * Check if cache needs refresh by comparing post counts
   */
  async shouldRefreshCache(currentTotalPosts: number): Promise<{
    shouldRefresh: boolean;
    reason: string;
    cacheData: InstagramCacheData | null;
  }> {
    try {
      const cacheData = await this.readCache();

      if (!cacheData) {
        return {
          shouldRefresh: true,
          reason: 'No cache exists',
          cacheData: null
        };
      }

      // Check cache version compatibility
      if (cacheData.metadata.cacheVersion !== this.CACHE_VERSION) {
        return {
          shouldRefresh: true,
          reason: `Cache version mismatch (cache: ${cacheData.metadata.cacheVersion}, current: ${this.CACHE_VERSION})`,
          cacheData
        };
      }

      // Check if post count has changed
      if (cacheData.totalPostsCount !== currentTotalPosts) {
        return {
          shouldRefresh: true,
          reason: `Post count changed (cache: ${cacheData.totalPostsCount}, current: ${currentTotalPosts})`,
          cacheData
        };
      }

      // Check cache age (optional: refresh if older than X hours)
      const cacheAgeHours = (Date.now() - cacheData.metadata.lastSyncTimestamp) / (1000 * 60 * 60);
      const MAX_CACHE_AGE_HOURS = 24; // Refresh cache if older than 24 hours

      if (cacheAgeHours > MAX_CACHE_AGE_HOURS) {
        return {
          shouldRefresh: true,
          reason: `Cache too old (${cacheAgeHours.toFixed(1)} hours, max: ${MAX_CACHE_AGE_HOURS})`,
          cacheData
        };
      }

      return {
        shouldRefresh: false,
        reason: 'Cache is up to date',
        cacheData
      };
    } catch (error) {
      logger.error('Error checking cache refresh status:', error);
      return {
        shouldRefresh: true,
        reason: `Error checking cache: ${error.message}`,
        cacheData: null
      };
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    exists: boolean;
    size?: string;
    postsCount?: number;
    totalPostsCount?: number;
    lastUpdated?: string;
    cacheAge?: string;
    lastApiCheck?: string;
  }> {
    try {
      if (!(await this.cacheExists())) {
        return { exists: false };
      }

      const stats = await fs.stat(this.cacheFilePath);
      const cacheData = await this.readCache();

      if (!cacheData) {
        return { exists: true, size: `${(stats.size / 1024).toFixed(2)} KB` };
      }

      const cacheAgeMs = Date.now() - cacheData.metadata.lastSyncTimestamp;
      const lastApiCheckMs = Date.now() - cacheData.metadata.lastApiCheck;

      return {
        exists: true,
        size: `${(stats.size / 1024).toFixed(2)} KB`,
        postsCount: cacheData.posts.length,
        totalPostsCount: cacheData.totalPostsCount,
        lastUpdated: cacheData.lastUpdated,
        cacheAge: this.formatDuration(cacheAgeMs),
        lastApiCheck: this.formatDuration(lastApiCheckMs)
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return { exists: false };
    }
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    try {
      if (await this.cacheExists()) {
        await fs.unlink(this.cacheFilePath);
        logger.info('Cache cleared successfully');
      } else {
        logger.info('No cache to clear');
      }
    } catch (error) {
      logger.error('Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Validate cache data structure
   */
  private isValidCacheData(data: any): data is InstagramCacheData {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.lastUpdated === 'string' &&
      typeof data.totalPostsCount === 'number' &&
      Array.isArray(data.posts) &&
      data.metadata &&
      typeof data.metadata.cacheVersion === 'string' &&
      typeof data.metadata.lastSyncTimestamp === 'number'
    );
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ago`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s ago`;
    return `${seconds}s ago`;
  }
} 