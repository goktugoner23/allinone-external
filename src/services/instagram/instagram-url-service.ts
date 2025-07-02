import axios from 'axios';
import logger from '../../utils/logger';

export interface InstagramUrlContent {
  url: string;
  type: 'profile' | 'post' | 'reel' | 'story' | 'unknown';
  username?: string;
  postId?: string;
  caption?: string;
  hashtags?: string[];
  mentions?: string[];
  engagement?: {
    likes?: number;
    comments?: number;
    views?: number;
  };
  extractedText?: string;
  error?: string;
}

export class InstagramUrlService {
  
  /**
   * Extract Instagram URLs from text
   */
  extractInstagramUrls(text: string): string[] {
    const patterns = [
      /https?:\/\/(?:www\.)?instagram\.com\/[^\s\)]+/gi,
      /instagram\.com\/[^\s\)]+/gi
    ];
    
    const urls: string[] = [];
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Normalize URL
          let url = match;
          if (!url.startsWith('http')) {
            url = 'https://' + url;
          }
          
          // Remove trailing punctuation
          url = url.replace(/[.,;!?)\]]+$/, '');
          
          if (!urls.includes(url)) {
            urls.push(url);
          }
        });
      }
    });
    
    return urls;
  }

  /**
   * Analyze Instagram URL and extract basic information
   */
  async analyzeInstagramUrl(url: string): Promise<InstagramUrlContent> {
    try {
      logger.debug('Analyzing Instagram URL', { url });
      
      const urlInfo = this.parseInstagramUrl(url);
      
      // For now, we'll return basic parsed information
      // In a production system, you might use Instagram's API or a web scraping service
      const result: InstagramUrlContent = {
        url,
        type: urlInfo.type,
        username: urlInfo.username,
        postId: urlInfo.postId,
        extractedText: this.generateAnalysisPrompt(urlInfo)
      };
      
      logger.debug('Instagram URL analyzed', { url, type: result.type, username: result.username });
      
      return result;
      
    } catch (error) {
      logger.error('Error analyzing Instagram URL', { url, error: error instanceof Error ? error.message : error });
      
      return {
        url,
        type: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
        extractedText: `Error analyzing Instagram URL: ${url}`
      };
    }
  }

  /**
   * Parse Instagram URL to extract type and identifiers
   */
  private parseInstagramUrl(url: string): {
    type: InstagramUrlContent['type'];
    username?: string;
    postId?: string;
  } {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Remove leading slash
      const path = pathname.startsWith('/') ? pathname.slice(1) : pathname;
      const segments = path.split('/').filter(s => s.length > 0);
      
      if (segments.length === 0) {
        return { type: 'unknown' };
      }
      
      // Profile URL: instagram.com/username
      if (segments.length === 1) {
        return {
          type: 'profile',
          username: segments[0]
        };
      }
      
      // Post URL: instagram.com/p/postId or instagram.com/username/p/postId
      if (segments.includes('p')) {
        const pIndex = segments.indexOf('p');
        const postId = segments[pIndex + 1];
        const username = pIndex > 0 ? segments[0] : undefined;
        
        return {
          type: 'post',
          username,
          postId
        };
      }
      
      // Reel URL: instagram.com/reel/reelId or instagram.com/username/reel/reelId
      if (segments.includes('reel')) {
        const reelIndex = segments.indexOf('reel');
        const postId = segments[reelIndex + 1];
        const username = reelIndex > 0 ? segments[0] : undefined;
        
        return {
          type: 'reel',
          username,
          postId
        };
      }
      
      // Stories: instagram.com/stories/username
      if (segments.includes('stories')) {
        const storiesIndex = segments.indexOf('stories');
        const username = segments[storiesIndex + 1];
        
        return {
          type: 'story',
          username
        };
      }
      
      // Default to profile if we have a username
      return {
        type: 'profile',
        username: segments[0]
      };
      
    } catch (error) {
      logger.error('Error parsing Instagram URL', { url, error });
      return { type: 'unknown' };
    }
  }

  /**
   * Generate analysis prompt for extracted URL content
   */
  private generateAnalysisPrompt(urlInfo: {
    type: InstagramUrlContent['type'];
    username?: string;
    postId?: string;
  }): string {
    switch (urlInfo.type) {
      case 'profile':
        return `Analyzing Instagram profile: @${urlInfo.username}. The user wants insights about this profile's content strategy, posting patterns, engagement, and overall Instagram presence.`;
      
      case 'post':
        return `Analyzing Instagram post ${urlInfo.postId}${urlInfo.username ? ` from @${urlInfo.username}` : ''}. The user wants insights about this specific post's performance, content strategy, engagement patterns, and optimization opportunities.`;
      
      case 'reel':
        return `Analyzing Instagram Reel ${urlInfo.postId}${urlInfo.username ? ` from @${urlInfo.username}` : ''}. The user wants insights about this reel's performance, content strategy, engagement, and how it fits into current Instagram Reels trends.`;
      
      case 'story':
        return `Analyzing Instagram Stories from @${urlInfo.username}. The user wants insights about story content strategy, engagement, highlights organization, and story performance optimization.`;
      
      default:
        return `Analyzing Instagram content. The user has shared an Instagram URL and wants expert analysis and insights about the content, strategy, and performance.`;
    }
  }

  /**
   * Analyze multiple Instagram URLs
   */
  async analyzeMultipleUrls(urls: string[]): Promise<InstagramUrlContent[]> {
    const results = await Promise.allSettled(
      urls.map(url => this.analyzeInstagramUrl(url))
    );
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          url: urls[index],
          type: 'unknown' as const,
          error: result.reason instanceof Error ? result.reason.message : 'Analysis failed',
          extractedText: `Failed to analyze Instagram URL: ${urls[index]}`
        };
      }
    });
  }

  /**
   * Generate search query enhancement based on URLs
   */
  generateSearchQueryFromUrls(originalQuery: string, urlContents: InstagramUrlContent[]): string {
    const usernames = urlContents
      .map(content => content.username)
      .filter(Boolean)
      .map(username => `@${username}`);
    
    const types = urlContents
      .map(content => content.type)
      .filter(type => type !== 'unknown');
    
    const baseQuery = originalQuery;
    const enhancements: string[] = [];
    
    if (usernames.length > 0) {
      enhancements.push(`profiles: ${usernames.join(', ')}`);
    }
    
    if (types.length > 0) {
      const uniqueTypes = [...new Set(types)];
      enhancements.push(`content types: ${uniqueTypes.join(', ')}`);
    }
    
    return enhancements.length > 0 
      ? `${baseQuery} (focusing on ${enhancements.join(', ')})`
      : baseQuery;
  }
}

export const instagramUrlService = new InstagramUrlService(); 