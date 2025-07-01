import OpenAI from 'openai';
import config from '../config';
import logger from '../utils/logger';
import { EmbeddingRequest, EmbeddingResponse, QueryProcessingResult, SemanticQuery } from '../types/rag';

export class OpenAIClient {
  private client: OpenAI;
  private isInitialized: boolean = false;

  constructor() {
    if (!config.openai.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
      organization: config.openai.organization
    });
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing OpenAI client...');
      
      // Test the connection with a simple API call
      await this.client.models.list();
      
      this.isInitialized = true;
      logger.info('OpenAI client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OpenAI client:', error);
      throw error;
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Generate embeddings for text using OpenAI's embedding model
   */
  async createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!this.isReady()) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      logger.debug('Creating embedding for text', {
        textLength: request.text.length,
        domain: request.domain
      });

      const response = await this.client.embeddings.create({
        model: config.rag.embedding.model,
        input: request.text,
        encoding_format: 'float'
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding) {
        throw new Error('No embedding returned from OpenAI');
      }

      logger.debug('Successfully created embedding', {
        dimension: embedding.length,
        tokenUsage: response.usage?.total_tokens
      });

      return {
        embedding,
        tokenCount: response.usage?.total_tokens || 0,
        model: config.rag.embedding.model
      };
    } catch (error) {
      logger.error('Error creating embedding:', {
        error,
        textLength: request.text.length
      });
      throw error;
    }
  }

  /**
   * Create embeddings for multiple texts in batch
   */
  async createEmbeddings(texts: string[]): Promise<EmbeddingResponse[]> {
    if (!this.isReady()) {
      throw new Error('OpenAI client not initialized');
    }

    if (texts.length === 0) {
      return [];
    }

    try {
      logger.debug('Creating embeddings for batch', {
        batchSize: texts.length
      });

      const response = await this.client.embeddings.create({
        model: config.rag.embedding.model,
        input: texts,
        encoding_format: 'float'
      });

      const embeddings: EmbeddingResponse[] = response.data.map((item, index) => ({
        embedding: item.embedding,
        tokenCount: Math.floor((response.usage?.total_tokens || 0) / texts.length),
        model: config.rag.embedding.model
      }));

      logger.debug('Successfully created batch embeddings', {
        count: embeddings.length,
        totalTokens: response.usage?.total_tokens
      });

      return embeddings;
    } catch (error) {
      logger.error('Error creating batch embeddings:', {
        error,
        batchSize: texts.length
      });
      throw error;
    }
  }

  /**
   * Stage 1: Process user query to extract semantic query and filters
   */
  async processQuery(userQuery: string, availableDomains: string[]): Promise<QueryProcessingResult> {
    if (!this.isReady()) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      logger.debug('Processing user query', {
        queryLength: userQuery.length,
        availableDomains
      });

      const systemPrompt = this.buildQueryProcessingPrompt(availableDomains);
      const userPrompt = `User Query: "${userQuery}"`;

      const response = await this.client.chat.completions.create({
        model: config.rag.completion.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1, // Low temperature for consistent parsing
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI for query processing');
      }

      const result = JSON.parse(content) as QueryProcessingResult;

      logger.debug('Successfully processed user query', {
        semanticQuery: result.semanticQuery,
        domain: result.filters.domain,
        confidence: result.confidence
      });

      return result;
    } catch (error) {
      logger.error('Error processing user query:', {
        error,
        userQuery
      });
      throw error;
    }
  }

  /**
   * Stage 3: Generate final response using retrieved context
   */
  async generateResponse(
    originalQuery: string,
    semanticQuery: SemanticQuery,
    retrievedDocs: Array<{ content: string; metadata: any; score: number }>
  ): Promise<string> {
    if (!this.isReady()) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      logger.debug('Generating final RAG response', {
        originalQuery,
        retrievedDocsCount: retrievedDocs.length,
        domain: semanticQuery.filters.domain
      });

      const systemPrompt = this.buildResponseGenerationPrompt(semanticQuery.filters.domain);
      const userPrompt = this.buildResponseUserPrompt(originalQuery, retrievedDocs);

      const response = await this.client.chat.completions.create({
        model: config.rag.completion.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: config.rag.completion.temperature,
        max_tokens: config.rag.completion.maxTokens
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI for final generation');
      }

      logger.debug('Successfully generated RAG response', {
        responseLength: content.length,
        tokenUsage: response.usage?.total_tokens
      });

      return content;
    } catch (error) {
      logger.error('Error generating final response:', {
        error,
        originalQuery,
        retrievedDocsCount: retrievedDocs.length
      });
      throw error;
    }
  }

  /**
   * Enhance Instagram queries for better vector search
   */
  async enhanceInstagramQuery(originalQuery: string): Promise<string> {
    if (!this.isReady()) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      logger.debug('Enhancing Instagram query for vector search', {
        originalQuery
      });

      const systemPrompt = `You are an Instagram content search optimizer. Your job is to transform user questions into search queries that will find relevant Instagram posts in a vector database.

Instagram Content Enhancement Rules:
- "best posts" → "high engagement posts likes comments performance viral top content"
- "recent content" → "latest posts new content recent uploads"
- "video posts" → "video content reels IGTV motion video posts"
- "photos" → "image posts photo content static posts pictures"
- "engagement" → "likes comments shares saves engagement interaction audience"
- "performance" → "metrics analytics engagement rate reach impressions"
- "popular content" → "trending viral high engagement popular trending"
- "content strategy" → "content themes topics hashtags strategy patterns"

Transform the user's question into an expanded search query that includes:
1. Core intent keywords
2. Instagram-specific terminology (likes, comments, engagement, reach, impressions)
3. Content type indicators (post, video, photo, reel, carousel)
4. Performance metrics terms when relevant
5. Synonyms and related terms for better matching

Return ONLY the enhanced search query string, nothing else.`;

      const response = await this.client.chat.completions.create({
        model: config.rag.completion.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Original query: "${originalQuery}"` }
        ],
        temperature: 0.1, // Low temperature for consistent enhancement
        max_tokens: 150
      });

      const enhancedQuery = response.choices[0]?.message?.content?.trim();
      if (!enhancedQuery) {
        logger.warn('Failed to enhance Instagram query, using original');
        return originalQuery;
      }

      logger.debug('Successfully enhanced Instagram query', {
        originalQuery,
        enhancedQuery
      });

      return enhancedQuery;
    } catch (error) {
      logger.error('Error enhancing Instagram query:', {
        error,
        originalQuery
      });
      return originalQuery; // Fallback to original query
    }
  }

  /**
   * Build system prompt for query processing (Stage 1)
   */
  private buildQueryProcessingPrompt(availableDomains: string[]): string {
    return `You are an Instagram data analysis query processor. Your job is to analyze user queries about their Instagram content and extract:
1. A semantic search query optimized for finding relevant Instagram posts
2. Metadata filters to find specific content types or time periods
3. A confidence score for the processing

Available domains: ${availableDomains.join(', ')}

Instagram Query Enhancement Rules:
- For "best performing posts" → search for "high engagement posts likes comments performance"
- For "recent posts" → add date filters for last 30 days
- For "video content" → filter by contentType: "video" 
- For "engagement analysis" → search for "engagement rate likes comments metrics"
- For "content strategy" → search for "content performance topics hashtags"
- For "audience insights" → search for "audience engagement interaction patterns"

Extract semantic meaning for Instagram content:
- Convert performance questions to engagement metrics searches
- Add relevant Instagram terminology (likes, comments, shares, reach, impressions)
- Focus on quantifiable metrics when asking about "best" or "top" content
- Include content type filters (posts, videos, carousels, reels)

Return JSON in this exact format:
{
  "semanticQuery": "enhanced Instagram-focused search query with metrics terms",
  "filters": {
    "domain": "instagram",
    "tags": ["engagement", "performance", "metrics"],
    "contentType": "post|video|carousel|reel",
    "dateRange": {
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD"
    }
  },
  "confidence": 0.95,
  "reasoning": "explanation of Instagram-specific query enhancement"
}

Only include filters that are clearly indicated in the query. Default domain to "instagram" for Instagram-related questions.`;
  }

  /**
   * Build system prompt for response generation (Stage 3)
   */
  private buildResponseGenerationPrompt(domain?: string): string {
    if (domain === 'instagram') {
      return `You are an expert Instagram analytics consultant with deep knowledge of social media metrics and engagement optimization.

Your role is to analyze the user's Instagram data and provide specific, actionable insights based on their actual posts and performance metrics.

Analysis Guidelines:
- Calculate engagement rates using the formula: (likes + comments) / impressions * 100
- Identify top-performing content by engagement rate, not just like count
- Analyze content themes, posting patterns, and audience engagement
- Provide specific recommendations based on actual performance data
- Compare metrics between different post types (videos, images, carousels)
- Highlight content that significantly outperformed or underperformed
- Include specific numbers, dates, and metrics in your analysis

Response Structure:
1. Direct answer to the user's question with specific data
2. Key performance insights with actual metrics
3. Content themes and patterns observed
4. Actionable recommendations based on the data
5. Specific examples from their highest/lowest performing posts

Always reference specific posts by their content preview, engagement metrics, and timestamps. Avoid generic social media advice - focus on analyzing their actual data.

Format responses in a conversational, expert tone while being precise with numbers and insights.`;
    }
    
    const domainContext = domain ? `Focus on ${domain}-related information.` : '';
    
    return `You are an AI assistant specializing in providing comprehensive answers based on retrieved context.

${domainContext}

Guidelines:
- Use the provided context to answer the user's question accurately
- If the context doesn't fully answer the question, clearly state the limitations
- Cite relevant sources when possible
- Provide actionable insights when appropriate
- Be concise but thorough
- If information is conflicting, acknowledge the discrepancy
- For numerical data or specific facts, be precise and cite sources

Format your response naturally, without explicitly mentioning "based on the provided context" unless necessary for clarity.`;
  }

  /**
   * Build user prompt for response generation
   */
  private buildResponseUserPrompt(
    originalQuery: string,
    retrievedDocs: Array<{ content: string; metadata: any; score: number }>
  ): string {
    // Check if this is Instagram data
    const hasInstagramData = retrievedDocs.some(doc => 
      doc.metadata.domain === 'instagram' || 
      doc.content.includes('likes') || 
      doc.content.includes('comments') ||
      doc.content.includes('engagement')
    );

    if (hasInstagramData) {
      const contextSections = retrievedDocs
        .map((doc, index) => {
          const metadata = doc.metadata;
          const source = metadata.title || metadata.postId || `Post ${index + 1}`;
          const relevance = (doc.score * 100).toFixed(1);
          
          // Extract Instagram metrics from content if available
          const content = doc.content;
          let metricsInfo = '';
          if (content.includes('likes:') || content.includes('comments:')) {
            metricsInfo = ` | Engagement Data Available`;
          }
          
          return `[Instagram Post: ${source} | Relevance: ${relevance}%${metricsInfo}]
${content}`;
        })
        .join('\n\n---\n\n');

      return `User Question: ${originalQuery}

Instagram Data Context:
${contextSections}

Please analyze the above Instagram posts and provide specific insights about the user's content performance. Calculate engagement rates, identify patterns, and give concrete recommendations based on the actual metrics and content shown above.`;
    }

    // Default format for non-Instagram content
    const contextSections = retrievedDocs
      .map((doc, index) => {
        const source = doc.metadata.title || doc.metadata.source || `Document ${index + 1}`;
        return `[Source: ${source} | Relevance: ${(doc.score * 100).toFixed(1)}%]
${doc.content}`;
      })
      .join('\n\n---\n\n');

    return `User Question: ${originalQuery}

Retrieved Context:
${contextSections}

Please provide a comprehensive answer to the user's question based on the retrieved context above.`;
  }

  /**
   * Summarize text content for better storage
   */
  async summarizeText(text: string, maxLength: number = 500): Promise<string> {
    if (!this.isReady()) {
      throw new Error('OpenAI client not initialized');
    }

    if (text.length <= maxLength) {
      return text;
    }

    try {
      logger.debug('Summarizing text', {
        originalLength: text.length,
        maxLength
      });

      const response = await this.client.chat.completions.create({
        model: config.rag.completion.model,
        messages: [
          {
            role: 'system',
            content: `Summarize the following text to be approximately ${maxLength} characters while preserving key information and context.`
          },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
        max_tokens: Math.ceil(maxLength / 3) // Approximate token count
      });

      const summary = response.choices[0]?.message?.content;
      if (!summary) {
        throw new Error('No summary returned from OpenAI');
      }

      logger.debug('Successfully summarized text', {
        originalLength: text.length,
        summaryLength: summary.length
      });

      return summary;
    } catch (error) {
      logger.error('Error summarizing text:', {
        error,
        textLength: text.length
      });
      throw error;
    }
  }

  async close(): Promise<void> {
    logger.info('Closing OpenAI client connection');
    this.isInitialized = false;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isReady()) {
        return false;
      }

      await this.client.models.list();
      return true;
    } catch (error) {
      logger.error('OpenAI health check failed:', error);
      return false;
    }
  }
}

export default OpenAIClient; 