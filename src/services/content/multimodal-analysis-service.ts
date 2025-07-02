import OpenAI from 'openai';
import axios from 'axios';
import logger from '../../utils/logger';
import { instagramUrlService, InstagramUrlContent } from '../instagram/instagram-url-service';
import config from '../../config';

export interface ContentAnalysisResult {
  type: 'image' | 'audio' | 'pdf' | 'url' | 'instagram_url' | 'text';
  content: string;
  extractedText?: string;
  insights?: string;
  metadata?: {
    source?: string;
    analysisType?: string;
    confidence?: number;
    [key: string]: any;
  };
  error?: string;
}

export interface MultimodalInput {
  type: 'image' | 'audio' | 'pdf' | 'url' | 'text';
  content: string; // URL, base64 data, or text content
  metadata?: {
    filename?: string;
    mimeType?: string;
    context?: string;
    analysisType?: string;
    [key: string]: any;
  };
}

export class MultimodalAnalysisService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey
    });
  }

  /**
   * Analyze multiple types of content in the context of Instagram strategy
   */
  async analyzeContent(
    inputs: MultimodalInput[],
    userQuery: string,
    instagramContext: string = ''
  ): Promise<ContentAnalysisResult[]> {
    logger.debug('Analyzing multimodal content', {
      inputCount: inputs.length,
      types: inputs.map(i => i.type),
      queryLength: userQuery.length
    });

    const results = await Promise.allSettled(
      inputs.map(input => this.analyzeSingleInput(input, userQuery, instagramContext))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        logger.error('Content analysis failed', {
          input: inputs[index],
          error: result.reason
        });
        
        return {
          type: inputs[index].type,
          content: inputs[index].content,
          error: result.reason instanceof Error ? result.reason.message : 'Analysis failed',
          extractedText: `Failed to analyze ${inputs[index].type} content`
        };
      }
    });
  }

  /**
   * Extract content from user query to identify different input types
   */
  extractMultimodalInputs(userQuery: string): MultimodalInput[] {
    const inputs: MultimodalInput[] = [];

    // Extract URLs (including Instagram URLs)
    const urlPattern = /https?:\/\/[^\s\)]+/gi;
    const urls = userQuery.match(urlPattern);
    
    if (urls) {
      urls.forEach(url => {
        // Clean up URL
        const cleanUrl = url.replace(/[.,;!?)\]]+$/, '');
        
        // Determine URL type
        if (cleanUrl.includes('instagram.com')) {
          inputs.push({
            type: 'url',
            content: cleanUrl,
            metadata: { analysisType: 'instagram_url' }
          });
        } else if (cleanUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          inputs.push({
            type: 'image',
            content: cleanUrl,
            metadata: { analysisType: 'image_url' }
          });
        } else if (cleanUrl.match(/\.(mp3|wav|m4a|aac)$/i)) {
          inputs.push({
            type: 'audio',
            content: cleanUrl,
            metadata: { analysisType: 'audio_url' }
          });
        } else if (cleanUrl.match(/\.(pdf)$/i)) {
          inputs.push({
            type: 'pdf',
            content: cleanUrl,
            metadata: { analysisType: 'pdf_url' }
          });
        } else {
          inputs.push({
            type: 'url',
            content: cleanUrl,
            metadata: { analysisType: 'web_content' }
          });
        }
      });
    }

    // If no special content detected, treat as text
    if (inputs.length === 0) {
      inputs.push({
        type: 'text',
        content: userQuery,
        metadata: { analysisType: 'text_query' }
      });
    }

    return inputs;
  }

  private async analyzeSingleInput(
    input: MultimodalInput,
    userQuery: string,
    instagramContext: string
  ): Promise<ContentAnalysisResult> {
    // Implementation will be added in subsequent edits
    return {
      type: input.type,
      content: input.content,
      extractedText: `Analysis for ${input.type} content`,
      insights: `Instagram-focused analysis of ${input.type} content`
    };
  }
}

export const multimodalAnalysisService = new MultimodalAnalysisService(); 