import {
  Domain,
  SemanticQuery,
  RAGResponse,
  VectorMatch,
  Document,
  QueryProcessingResult
} from '../types/rag';
import { IVectorDatabase, VectorUtils, QueryRequest } from '../interfaces/vector-db';
import OpenAIClient from '../clients/openai';
import EmbeddingService from './embedding';
import config from '../config';
import logger from '../utils/logger';

export interface RAGServiceOptions {
  defaultTopK?: number;
  minScore?: number;
  maxTokensPerContext?: number;
  enableQueryExpansion?: boolean;
  enableResultReranking?: boolean;
}

export class RAGService {
  private openaiClient: OpenAIClient;
  private embeddingService: EmbeddingService;
  private vectorDb: IVectorDatabase;
  private options: Required<RAGServiceOptions>;

  constructor(
    openaiClient: OpenAIClient,
    embeddingService: EmbeddingService,
    vectorDb: IVectorDatabase,
    options?: RAGServiceOptions
  ) {
    this.openaiClient = openaiClient;
    this.embeddingService = embeddingService;
    this.vectorDb = vectorDb;
    this.options = {
      defaultTopK: config.rag.retrieval.defaultTopK,
      minScore: config.rag.retrieval.minScore,
      maxTokensPerContext: 4000,
      enableQueryExpansion: false,
      enableResultReranking: false,
      ...options
    };
  }

  /**
   * Main RAG query method - implements the three-stage process
   */
  async query(userQuery: string, domain?: Domain): Promise<RAGResponse> {
    const startTime = Date.now();

    try {
      logger.info('Starting RAG query', {
        query: userQuery.substring(0, 100),
        domain,
        timestamp: new Date().toISOString()
      });

      // Stage 1: Process user query to extract semantic query and filters
      const availableDomains = await this.getAvailableDomains();
      const processedQuery = await this.processQuery(userQuery, availableDomains, domain);

      // Stage 2: Retrieve relevant documents from vector database
      const retrievedDocs = await this.retrieveDocuments(processedQuery);

      // Stage 3: Generate final response using context
      const response = await this.generateResponse(userQuery, processedQuery, retrievedDocs);

      const processingTime = Date.now() - startTime;

      const ragResponse: RAGResponse = {
        answer: response,
        sources: retrievedDocs,
        confidence: this.calculateOverallConfidence(processedQuery, retrievedDocs),
        processingTime,
        metadata: {
          originalQuery: userQuery,
          processedQuery: processedQuery,
          totalMatches: retrievedDocs.length
        }
      };

      logger.info('RAG query completed successfully', {
        processingTime,
        sourceCount: retrievedDocs.length,
        confidence: ragResponse.confidence,
        answerLength: response.length
      });

      return ragResponse;
    } catch (error) {
      logger.error('RAG query failed:', {
        error,
        query: userQuery.substring(0, 100),
        domain,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Stage 1: Process user query using OpenAI
   */
  private async processQuery(
    userQuery: string, 
    availableDomains: string[], 
    preferredDomain?: Domain
  ): Promise<SemanticQuery> {
    try {
      logger.debug('Processing user query (Stage 1)', {
        queryLength: userQuery.length,
        availableDomains,
        preferredDomain
      });

      const processed = await this.openaiClient.processQuery(userQuery, availableDomains);

      // Override domain if explicitly provided
      if (preferredDomain) {
        processed.filters.domain = preferredDomain;
      }

      const semanticQuery: SemanticQuery = {
        query: processed.semanticQuery,
        filters: processed.filters,
        topK: this.options.defaultTopK,
        minScore: this.options.minScore
      };

      logger.debug('Query processing completed', {
        originalQuery: userQuery,
        semanticQuery: processed.semanticQuery,
        domain: processed.filters.domain,
        confidence: processed.confidence
      });

      return semanticQuery;
    } catch (error) {
      logger.error('Error in query processing stage:', {
        error,
        userQuery: userQuery.substring(0, 100)
      });
      throw error;
    }
  }

  /**
   * Stage 2: Retrieve relevant documents from vector database
   */
  private async retrieveDocuments(semanticQuery: SemanticQuery): Promise<VectorMatch[]> {
    try {
      logger.debug('Retrieving documents (Stage 2)', {
        semanticQuery: semanticQuery.query,
        filters: semanticQuery.filters,
        topK: semanticQuery.topK
      });

      // Create embedding for the semantic query
      const queryEmbedding = await this.embeddingService.embedQuery(
        semanticQuery.query,
        semanticQuery.filters.domain
      );

      // Convert filters to database format
      const dbFilters = VectorUtils.convertFilters(semanticQuery.filters);

      // Determine namespace (domain-based)
      const namespace = semanticQuery.filters.domain || 'general';

      // Query vector database
      const queryRequest: QueryRequest = {
        vector: queryEmbedding,
        topK: semanticQuery.topK || this.options.defaultTopK,
        namespace,
        filter: Object.keys(dbFilters).length > 0 ? dbFilters : undefined,
        includeMetadata: true,
        includeValues: false
      };

      const queryResponse = await this.vectorDb.query(queryRequest);

      // Filter by minimum score
      const filteredMatches = queryResponse.matches.filter(
        match => match.score >= (semanticQuery.minScore || this.options.minScore)
      );

      logger.debug('Document retrieval completed', {
        totalMatches: queryResponse.matches.length,
        filteredMatches: filteredMatches.length,
        namespace,
        topScore: filteredMatches.length > 0 ? filteredMatches[0].score : 0
      });

      return filteredMatches;
    } catch (error) {
      logger.error('Error in document retrieval stage:', {
        error,
        semanticQuery: semanticQuery.query
      });
      throw error;
    }
  }

    /**
   * Stage 3: Generate final response using retrieved context
   */
  private async generateResponse(
    originalQuery: string,
    semanticQuery: SemanticQuery,
    retrievedDocs: VectorMatch[]
  ): Promise<string> {
    try {
      logger.debug('Generating response (Stage 3)', {
        originalQuery: originalQuery.substring(0, 100),
        retrievedDocsCount: retrievedDocs.length,
        domain: semanticQuery.filters.domain
      });

      if (retrievedDocs.length === 0) {
        return this.generateNoResultsResponse(originalQuery, semanticQuery);
      }

      // Prepare context from retrieved documents
      const context = this.prepareContext(retrievedDocs);

      // Generate response using OpenAI
      const response = await this.openaiClient.generateResponse(
        originalQuery,
        semanticQuery,
        context
      );

      logger.debug('Response generation completed', {
        responseLength: response.length,
        contextDocs: retrievedDocs.length
      });

      return response;
    } catch (error) {
      logger.error('Error in response generation stage:', {
        error,
        originalQuery: originalQuery.substring(0, 100),
        retrievedDocsCount: retrievedDocs.length
      });
      throw error;
    }
  }

  /**
   * Prepare context from retrieved documents
   */
  private prepareContext(retrievedDocs: VectorMatch[]): Array<{
    content: string;
    metadata: any;
    score: number;
  }> {
    return retrievedDocs.map(doc => ({
      content: this.truncateContent(doc.content, this.options.maxTokensPerContext / retrievedDocs.length),
      metadata: doc.metadata,
      score: doc.score
    }));
  }

  /**
   * Truncate content to fit within token limits
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }

    // Try to break at sentence boundary
    const truncated = content.substring(0, maxLength);
    const lastSentenceEnd = truncated.lastIndexOf('.');
    
    if (lastSentenceEnd > maxLength * 0.7) {
      return truncated.substring(0, lastSentenceEnd + 1);
    }

    // Fall back to word boundary
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    if (lastSpaceIndex > maxLength * 0.8) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }

    return truncated + '...';  
  }

  /**
   * Generate response when no results are found
   */
  private generateNoResultsResponse(originalQuery: string, semanticQuery: SemanticQuery): string {
    const domain = semanticQuery.filters.domain ? ` in the ${semanticQuery.filters.domain} domain` : '';
    
    return `I couldn't find any relevant information${domain} to answer your question about "${originalQuery}". ` +
           `This could be because:\n\n` +
           `1. The information isn't available in the knowledge base\n` +
           `2. The query might need to be rephrased\n` +
           `3. The content might be in a different domain\n\n` +
           `Try rephrasing your question or checking if the information exists in the system.`;
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(
    processedQuery: SemanticQuery,
    retrievedDocs: VectorMatch[]
  ): number {
    if (retrievedDocs.length === 0) {
      return 0.1;
    }

    // Base confidence on top match score
    const topScore = retrievedDocs[0]?.score || 0;
    
    // Adjust based on number of results
    const resultCountBonus = Math.min(retrievedDocs.length / 3, 1) * 0.1;
    
    // Adjust based on score distribution
    const avgScore = retrievedDocs.reduce((sum, doc) => sum + doc.score, 0) / retrievedDocs.length;
    const consistencyBonus = (avgScore / topScore) * 0.1;

    return Math.min(topScore + resultCountBonus + consistencyBonus, 1.0);
  }

  /**
   * Get available domains from vector database
   */
  private async getAvailableDomains(): Promise<string[]> {
    try {
      const namespaces = await this.vectorDb.listNamespaces();
      return namespaces.length > 0 ? namespaces : ['general', 'instagram', 'fitness', 'trading'];
    } catch (error) {
      logger.warn('Could not get available domains, using defaults:', error);
      return ['general', 'instagram', 'fitness', 'trading'];
    }
  }

  /**
   * Add a document to the RAG system
   */
  async addDocument(document: Document): Promise<void> {
    try {
      logger.info('Adding document to RAG system', {
        documentId: document.id,
        domain: document.metadata.domain,
        contentLength: document.content.length
      });

      const namespace = document.metadata.domain || 'general';
      await this.embeddingService.embedDocument(document, namespace);

      logger.info('Successfully added document to RAG system', {
        documentId: document.id,
        namespace
      });
    } catch (error) {
      logger.error('Error adding document to RAG system:', {
        error,
        documentId: document.id
      });
      throw error;
    }
  }

  /**
   * Update a document in the RAG system
   */
  async updateDocument(
    documentId: string,
    newContent: string,
    metadata: any
  ): Promise<void> {
    try {
      logger.info('Updating document in RAG system', {
        documentId,
        contentLength: newContent.length,
        domain: metadata.domain
      });

      const namespace = metadata.domain || 'general';
      await this.embeddingService.updateDocumentEmbedding(
        documentId,
        newContent,
        metadata,
        namespace
      );

      logger.info('Successfully updated document in RAG system', {
        documentId,
        namespace
      });
    } catch (error) {
      logger.error('Error updating document in RAG system:', {
        error,
        documentId
      });
      throw error;
    }
  }

  /**
   * Remove a document from the RAG system
   */
  async removeDocument(documentId: string, domain?: Domain): Promise<void> {
    try {
      logger.info('Removing document from RAG system', {
        documentId,
        domain
      });

      const namespace = domain || 'general';
      await this.embeddingService.deleteDocumentEmbeddings(documentId, namespace);

      logger.info('Successfully removed document from RAG system', {
        documentId,
        namespace
      });
    } catch (error) {
      logger.error('Error removing document from RAG system:', {
        error,
        documentId,
        domain
      });
      throw error;
    }
  }

  /**
   * Get RAG system status and statistics
   */
  async getStatus(): Promise<{
    isReady: boolean;
    stats: any;
    health: {
      openai: boolean;
      vectorDb: boolean;
      embedding: boolean;
    };
  }> {
    try {
      const [openaiHealth, vectorDbHealth, stats] = await Promise.all([
        this.openaiClient.healthCheck(),
        this.vectorDb.healthCheck(),
        this.embeddingService.getEmbeddingStats()
      ]);

      return {
        isReady: openaiHealth && vectorDbHealth,
        stats,
        health: {
          openai: openaiHealth,
          vectorDb: vectorDbHealth,
          embedding: openaiHealth && vectorDbHealth
        }
      };
    } catch (error) {
      logger.error('Error getting RAG system status:', error);
      return {
        isReady: false,
        stats: null,
        health: {
          openai: false,
          vectorDb: false,
          embedding: false
        }
      };
    }
  }

  /**
   * Initialize the RAG service
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing RAG service...');

      // Initialize all components
      await Promise.all([
        this.openaiClient.initialize(),
        this.vectorDb.initialize()
      ]);

      logger.info('RAG service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize RAG service:', error);
      throw error;
    }
  }
}

export default RAGService; 