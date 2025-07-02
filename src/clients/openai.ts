import OpenAI from 'openai';
import config from '../config';
import logger from '../utils/logger';
import { EmbeddingRequest, EmbeddingResponse, QueryProcessingResult, SemanticQuery } from '../types/rag';
import { instagramUrlService } from '../services/instagram/instagram-url-service';

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
   * Stage 1: Process user query using OpenAI
   */
  async processQuery(userQuery: string, availableDomains: string[]): Promise<QueryProcessingResult> {
    if (!this.isReady()) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      logger.debug('Processing user query (Stage 1)', {
        queryLength: userQuery.length,
        availableDomains
      });

      // Check if query contains Instagram URLs
      const instagramUrls = instagramUrlService.extractInstagramUrls(userQuery);
      
              const response = await this.client.chat.completions.create({
          model: config.rag.completion.model,
          messages: [
            {
              role: 'system',
              content: this.buildQueryProcessingPrompt(availableDomains, instagramUrls.length > 0)
            },
            {
              role: 'user',
              content: `User Query: "${userQuery}"
            
${instagramUrls.length > 0 ? `\nInstagram URLs detected: ${instagramUrls.join(', ')}` : ''}
            
Extract the semantic search query for Instagram content analysis.`
            }
          ],
          temperature: 0.3,
          max_tokens: 500,
          response_format: { type: 'json_object' }
        });

              const result = JSON.parse(response.choices[0].message.content || '{}');

        logger.debug('Query processing completed', {
          originalQuery: userQuery,
          semanticQuery: result.semanticQuery || result.query,
          domain: result.filters?.domain,
          confidence: result.confidence,
          hasUrls: instagramUrls.length > 0
        });

        return {
          semanticQuery: result.semanticQuery || result.query || userQuery,
          filters: result.filters || { domain: availableDomains[0] },
          confidence: result.confidence || 0.8,
          reasoning: result.reasoning || 'Standard query processing'
        };
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

      // Determine conversation mode
      const conversationMode = this.determineConversationMode(originalQuery, retrievedDocs);
      
      const systemPrompt = this.buildConversationalPrompt(semanticQuery.filters.domain, conversationMode);
      const userPrompt = this.buildConversationalUserPrompt(originalQuery, retrievedDocs, conversationMode);

      const response = await this.client.chat.completions.create({
        model: config.rag.completion.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8, // Conversational but focused
        max_tokens: config.rag.completion.maxTokens || 1000,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response generated from OpenAI');
      }

      logger.debug('Successfully generated RAG response', {
        responseLength: content.length,
        conversationMode,
        tokenUsage: response.usage?.total_tokens
      });

      return content;
    } catch (error) {
      logger.error('Error generating RAG response:', {
        error,
        originalQuery
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

Transform the user's question into a focused search query for Instagram content that includes:
1. Core intent keywords from the user's question
2. Relevant Instagram terms (likes, comments, engagement, reach, impressions) only if performance-related
3. Content type indicators only if mentioned (post, video, photo, reel, carousel)
4. Keep it concise and relevant to the original question

Return ONLY the enhanced search query string as keywords, nothing else. Do not return explanatory text or sentences.`;

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
  private buildQueryProcessingPrompt(availableDomains: string[], hasUrls: boolean): string {
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
  "semanticQuery": "focused search terms based on user query",
  "filters": {
    "domain": "instagram"
  },
  "confidence": 0.95,
  "reasoning": "explanation of query processing"
}

 Only add tags, contentType, or dateRange filters if explicitly mentioned in the user's query. Keep the semanticQuery focused and relevant to what the user actually asked.

${hasUrls ? 'Note: Instagram URLs detected in the query.' : ''}

Focus on extracting relevant search terms for Instagram content analysis.`;
  }

  /**
   * Get mode-specific instructions for different conversation styles
   */
  private getModeSpecificInstructions(conversationMode: string): string {
    switch (conversationMode) {
      case 'url_analysis_with_data':
        return `URL ANALYSIS WITH DATA: Analyze the Instagram URL provided along with relevant data. Provide strategic insights about the profile/post, compare with similar content in your data, and give actionable recommendations.`;
      
      case 'url_analysis_general':
        return `URL ANALYSIS: Analyze the Instagram URL provided. Give strategic insights about the profile/post structure, content strategy implications, and optimization recommendations based on Instagram best practices.`;

      case 'coaching_with_data':
        return `COACHING MODE: Help improve their Instagram strategy using their actual performance data. Be encouraging, provide specific actionable steps based on their metrics, and ask follow-up questions to understand their goals better.`;
      
      case 'coaching_general':
        return `COACHING MODE: Provide Instagram strategy help and best practices. Ask about their goals and current approach, and offer specific recommendations for improvement.`;
      
      case 'educational_with_data':
        return `EDUCATIONAL MODE: Explain Instagram concepts and strategies using their actual data as examples. Help them understand why certain posts performed well or poorly, and teach broader principles.`;
      
      case 'educational_general':
        return `EDUCATIONAL MODE: Explain Instagram concepts, best practices, and strategies. Use examples and industry standards. Be informative but accessible.`;
      
      case 'analytical_with_data':
        return `ANALYTICAL MODE: Dive deep into their metrics and performance data. Identify patterns, trends, and opportunities. Provide detailed analysis while keeping it conversational and actionable.`;
      
      case 'analytical_general':
        return `ANALYTICAL MODE: Discuss Instagram analytics concepts, explain metrics and KPIs, and help them understand what to measure and why.`;
      
      case 'advisory_with_data':
        return `ADVISORY MODE: Act as their Instagram strategist. Use their data to make specific recommendations for content, timing, hashtags, and growth strategies. Be confident but explain your reasoning.`;
      
      case 'advisory_general':
        return `ADVISORY MODE: Provide strategic Instagram advice and recommendations based on best practices. Focus on their niche, audience, and goals for targeted advice.`;
      
      case 'conversational_with_data':
        return `CONVERSATIONAL MODE: Be a friendly Instagram expert who can analyze their data and provide valuable insights. Keep it natural and engaging while being informative.`;
      
      case 'conversational_general':
        return `CONVERSATIONAL MODE: Be a helpful Instagram expert providing valuable insights and advice. Keep the conversation natural and focused on Instagram growth and optimization.`;
      
      default:
        return `DEFAULT MODE: Be a helpful Instagram expert who can analyze data when available and provide valuable insights and advice about Instagram marketing and growth.`;
    }
  }

  /**
   * Determine conversation mode based on query and context
   */
  private determineConversationMode(originalQuery: string, retrievedDocs: Array<{ content: string; metadata: any; score: number }>): string {
    const query = originalQuery.toLowerCase();
    const hasRelevantData = retrievedDocs.length > 0 && retrievedDocs[0].score > 0.7;
    const hasInstagramUrls = instagramUrlService.extractInstagramUrls(originalQuery).length > 0;
    
    // URL analysis mode - when Instagram URLs are provided
    if (hasInstagramUrls) {
      return hasRelevantData ? 'url_analysis_with_data' : 'url_analysis_general';
    }
    
    // Content analysis and strategy modes
    if (query.includes('analyze') || query.includes('performance') || query.includes('metrics') || query.includes('insights')) {
      return hasRelevantData ? 'analytical_with_data' : 'analytical_general';
    }
    
    // Strategy and improvement focused
    if (query.includes('improve') || query.includes('optimize') || query.includes('strategy') || query.includes('grow')) {
      return hasRelevantData ? 'advisory_with_data' : 'advisory_general';
    }
    
    // Learning and explanation focused
    if (query.includes('explain') || query.includes('understand') || query.includes('why') || query.includes('how does')) {
      return hasRelevantData ? 'educational_with_data' : 'educational_general';
    }
    
    // Coaching and help focused
    if (query.includes('help') || query.includes('how to') || query.includes('what should') || query.includes('tips')) {
      return hasRelevantData ? 'coaching_with_data' : 'coaching_general';
    }
    
    // Default to conversational Instagram expert mode
    return hasRelevantData ? 'conversational_with_data' : 'conversational_general';
  }

  /**
   * Build system prompt for response generation (Stage 3)
   */
  private buildConversationalPrompt(domain?: string, conversationMode: string = 'default'): string {
    if (domain === 'instagram') {
      const basePersonality = `You are Alex, a friendly and knowledgeable Instagram marketing expert and data analyst. You have years of experience helping creators and businesses grow their Instagram presence. You speak naturally and conversationally, like a colleague who genuinely cares about helping people succeed on Instagram.`;

      const modeSpecificInstructions = this.getModeSpecificInstructions(conversationMode);

      return `${basePersonality}

${modeSpecificInstructions}

⚠️ CRITICAL DATA HANDLING:
- Vector similarity "score" fields (0.0-1.0) are relevance scores, NOT engagement rates
- Use ONLY actual metrics from post content: likesCount, commentsCount, engagementRate
- Calculate engagement: (likes + comments) / reach * 100
- Reference posts by POST ID with real engagement numbers

CONVERSATION STYLE:
- Be conversational and friendly, not robotic
- Ask follow-up questions when appropriate
- Provide context and explanations, not just data dumps
- Share insights beyond just the data when helpful
- Be encouraging and supportive
- Use natural language, contractions, and a warm tone

DATA INTEGRATION:
- When you have their data, use it as the foundation but add broader insights
- When you don't have relevant data, still provide valuable Instagram expertise
- Blend data analysis with general Instagram strategy knowledge
- Connect their specific metrics to broader industry trends and best practices

Remember: You're not just a data analyzer - you're a knowledgeable Instagram expert who happens to have access to their data. Be helpful, conversational, and insightful!`;
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
   * Build conversational user prompt
   */
  private buildConversationalUserPrompt(
    originalQuery: string,
    retrievedDocs: Array<{ content: string; metadata: any; score: number }>,
    conversationMode: string
  ): string {
    const hasData = retrievedDocs.length > 0;
    
    if (!hasData) {
      return `User Question: "${originalQuery}"

I don't have specific Instagram data for this question, but please provide helpful insights based on Instagram expertise and best practices.

Conversation Mode: ${conversationMode}`;
    }

    // Has data - create contextual prompt for Instagram analysis
    const contextSections = retrievedDocs
      .map((doc, index) => {
        const metadata = doc.metadata;
        const source = metadata.title || metadata.postId || `Post ${index + 1}`;
        const relevance = (doc.score * 100).toFixed(1);
        
        const content = doc.content;
        let metricsInfo = '';
        if (content.includes('likes:') || content.includes('comments:') || content.includes('engagement')) {
          metricsInfo = ` | Contains Metrics`;
        }
        
        return `[Instagram Post: ${source} | Relevance: ${relevance}%${metricsInfo}]
${content}`;
      })
      .join('\n\n---\n\n');

    return `User Question: "${originalQuery}"

Available Instagram Data:
${contextSections}

Conversation Mode: ${conversationMode}

Use the Instagram data above as your foundation and provide insights that combine this data with broader Instagram expertise. Be conversational and helpful!`;
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