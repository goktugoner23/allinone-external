import { Document, DocumentChunk, EmbeddingRequest, EmbeddingResponse, Domain } from '../types/rag';
import { IVectorDatabase, VectorUtils } from '../interfaces/vector-db';
import OpenAIClient from '../clients/openai';
import TextChunkingService from './text-chunking';
import config from '../config';
import logger from '../utils/logger';

export interface EmbeddingServiceOptions {
  batchSize?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export class EmbeddingService {
  private openaiClient: OpenAIClient;
  private textChunker: TextChunkingService;
  private vectorDb: IVectorDatabase;
  private options: Required<EmbeddingServiceOptions>;

  constructor(
    openaiClient: OpenAIClient,
    vectorDb: IVectorDatabase,
    textChunker?: TextChunkingService,
    options?: EmbeddingServiceOptions
  ) {
    this.openaiClient = openaiClient;
    this.vectorDb = vectorDb;
    this.textChunker = textChunker || new TextChunkingService();
    this.options = {
      batchSize: 100, // OpenAI embedding batch limit
      maxRetries: 3,
      retryDelay: 1000,
      ...options
    };
  }

  /**
   * Embed and upsert a single document
   */
  async embedDocument(document: Document, namespace?: string): Promise<void> {
    try {
      logger.info('Embedding document', {
        documentId: document.id,
        domain: document.metadata.domain,
        contentLength: document.content.length,
        namespace
      });

      // Chunk the document if needed
      const chunks = await this.textChunker.chunkDocument(document);
      
      // Embed all chunks
      await this.embedChunks(chunks, namespace);

      logger.info('Successfully embedded document', {
        documentId: document.id,
        chunkCount: chunks.length,
        namespace
      });
    } catch (error) {
      logger.error('Error embedding document:', {
        error,
        documentId: document.id,
        namespace
      });
      throw error;
    }
  }

  /**
   * Embed and upsert multiple documents
   */
  async embedDocuments(documents: Document[], namespace?: string): Promise<void> {
    try {
      logger.info('Embedding multiple documents', {
        documentCount: documents.length,
        namespace
      });

      // Process documents in batches to avoid overwhelming APIs
      const batchSize = Math.min(this.options.batchSize, 10); // Smaller batch for documents
      
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        
        logger.debug('Processing document batch', {
          batchIndex: Math.floor(i / batchSize) + 1,
          batchSize: batch.length,
          totalBatches: Math.ceil(documents.length / batchSize)
        });

        // Process batch in parallel
        await Promise.all(
          batch.map(doc => this.embedDocument(doc, namespace))
        );

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < documents.length) {
          await this.delay(100);
        }
      }

      logger.info('Successfully embedded all documents', {
        documentCount: documents.length,
        namespace
      });
    } catch (error) {
      logger.error('Error embedding documents:', {
        error,
        documentCount: documents.length,
        namespace
      });
      throw error;
    }
  }

  /**
   * Embed chunks and upsert to vector database
   */
  async embedChunks(chunks: DocumentChunk[], namespace?: string): Promise<void> {
    if (chunks.length === 0) {
      return;
    }

    try {
      logger.debug('Embedding chunks', {
        chunkCount: chunks.length,
        namespace
      });

      // Extract text content for embedding
      const texts = chunks.map(chunk => chunk.content);
      
      // Create embeddings in batches
      const embeddings = await this.createEmbeddingsBatch(texts);

      // Assign embeddings to chunks
      const embeddedChunks = chunks.map((chunk, index) => ({
        ...chunk,
        embedding: embeddings[index].embedding
      }));

      // Convert chunks to vector records
      const vectors = embeddedChunks.map(chunk => 
        VectorUtils.chunkToVectorRecord(chunk, namespace)
      );

      // Upsert to vector database
      await this.vectorDb.upsert({ vectors, namespace });

      logger.debug('Successfully embedded and upserted chunks', {
        chunkCount: chunks.length,
        namespace
      });
    } catch (error) {
      logger.error('Error embedding chunks:', {
        error,
        chunkCount: chunks.length,
        namespace
      });
      throw error;
    }
  }

  /**
   * Create embedding for a query string
   */
  async embedQuery(query: string, domain?: Domain): Promise<number[]> {
    try {
      logger.debug('Embedding query', {
        queryLength: query.length,
        domain
      });

      const request: EmbeddingRequest = {
        text: query,
        domain
      };

      const response = await this.openaiClient.createEmbedding(request);

      logger.debug('Successfully embedded query', {
        dimension: response.embedding.length,
        tokenCount: response.tokenCount
      });

      return response.embedding;
    } catch (error) {
      logger.error('Error embedding query:', {
        error,
        queryLength: query.length,
        domain
      });
      throw error;
    }
  }

  /**
   * Create embeddings for multiple texts with batching and retry logic
   */
  private async createEmbeddingsBatch(texts: string[]): Promise<EmbeddingResponse[]> {
    if (texts.length === 0) {
      return [];
    }

    const allEmbeddings: EmbeddingResponse[] = [];
    
    // Process in batches
    for (let i = 0; i < texts.length; i += this.options.batchSize) {
      const batch = texts.slice(i, i + this.options.batchSize);
      
      logger.debug('Creating embedding batch', {
        batchIndex: Math.floor(i / this.options.batchSize) + 1,
        batchSize: batch.length,
        totalBatches: Math.ceil(texts.length / this.options.batchSize)
      });

      const batchEmbeddings = await this.createEmbeddingsWithRetry(batch);
      allEmbeddings.push(...batchEmbeddings);

      // Small delay between batches to avoid rate limiting
      if (i + this.options.batchSize < texts.length) {
        await this.delay(100);
      }
    }

    return allEmbeddings;
  }

  /**
   * Create embeddings with retry logic
   */
  private async createEmbeddingsWithRetry(texts: string[]): Promise<EmbeddingResponse[]> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        return await this.openaiClient.createEmbeddings(texts);
      } catch (error) {
        lastError = error as Error;
        
        logger.warn('Embedding attempt failed', {
          attempt,
          maxRetries: this.options.maxRetries,
          error: error instanceof Error ? error.message : 'Unknown error',
          batchSize: texts.length
        });

        if (attempt < this.options.maxRetries) {
          const delay = this.options.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          await this.delay(delay);
        }
      }
    }

    throw new Error(
      `Failed to create embeddings after ${this.options.maxRetries} attempts. Last error: ${lastError?.message}`
    );
  }

  /**
   * Update an existing document's embeddings
   */
  async updateDocumentEmbedding(
    documentId: string, 
    newContent: string, 
    metadata: any,
    namespace?: string
  ): Promise<void> {
    try {
      logger.info('Updating document embedding', {
        documentId,
        namespace,
        contentLength: newContent.length
      });

      // First, delete existing chunks for this document
      await this.deleteDocumentEmbeddings(documentId, namespace);

      // Create new document and embed it
      const updatedDocument: Document = {
        id: documentId,
        content: newContent,
        metadata: {
          ...metadata,
          updatedAt: new Date().toISOString()
        }
      };

      await this.embedDocument(updatedDocument, namespace);

      logger.info('Successfully updated document embedding', {
        documentId,
        namespace
      });
    } catch (error) {
      logger.error('Error updating document embedding:', {
        error,
        documentId,
        namespace
      });
      throw error;
    }
  }

  /**
   * Delete embeddings for a document
   */
  async deleteDocumentEmbeddings(documentId: string, namespace?: string): Promise<void> {
    try {
      logger.debug('Deleting document embeddings', {
        documentId,
        namespace
      });

      // Delete by filter (all chunks belonging to this document)
      await this.vectorDb.delete({
        ids: [], // Use filter instead of IDs
        namespace,
        filter: {
          documentId: { $eq: documentId }
        }
      });

      logger.debug('Successfully deleted document embeddings', {
        documentId,
        namespace
      });
    } catch (error) {
      logger.error('Error deleting document embeddings:', {
        error,
        documentId,
        namespace
      });
      throw error;
    }
  }

  /**
   * Get embedding statistics for a namespace
   */
  async getEmbeddingStats(namespace?: string): Promise<{
    totalVectors: number;
    avgDimension: number;
    namespaceStats: any;
  }> {
    try {
      const stats = await this.vectorDb.getStats();
      
      return {
        totalVectors: stats.totalVectorCount,
        avgDimension: stats.dimension,
        namespaceStats: stats.namespaces
      };
    } catch (error) {
      logger.error('Error getting embedding stats:', {
        error,
        namespace
      });
      throw error;
    }
  }

  /**
   * Validate embedding quality
   */
  async validateEmbedding(text: string, embedding: number[]): Promise<{
    isValid: boolean;
    issues: string[];
    confidence: number;
  }> {
    const issues: string[] = [];
    let confidence = 1.0;

    // Check embedding dimension
    if (embedding.length !== config.rag.embedding.dimension) {
      issues.push(`Invalid embedding dimension: ${embedding.length} != ${config.rag.embedding.dimension}`);
      confidence *= 0.5;
    }

    // Check for NaN or infinite values
    const hasInvalidValues = embedding.some(val => !isFinite(val));
    if (hasInvalidValues) {
      issues.push('Embedding contains NaN or infinite values');
      confidence *= 0.1;
    }

    // Check embedding norm (should be reasonable)
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm === 0) {
      issues.push('Embedding has zero norm');
      confidence *= 0.1;
    } else if (norm > 10 || norm < 0.1) {
      issues.push(`Unusual embedding norm: ${norm}`);
      confidence *= 0.8;
    }

    // Check text-embedding consistency (basic checks)
    if (text.length === 0 && norm > 0.1) {
      issues.push('Non-zero embedding for empty text');
      confidence *= 0.7;
    }

    return {
      isValid: issues.length === 0,
      issues,
      confidence
    };
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Batch similar documents to optimize embedding creation
   */
  async embedSimilarDocuments(
    documents: Document[], 
    namespace?: string,
    similarityThreshold: number = 0.8
  ): Promise<void> {
    try {
      logger.info('Embedding similar documents with optimization', {
        documentCount: documents.length,
        namespace,
        similarityThreshold
      });

      // Group similar documents (basic implementation - can be improved)
      const groups = this.groupSimilarDocuments(documents, similarityThreshold);
      
      logger.debug('Grouped similar documents', {
        groupCount: groups.length,
        avgGroupSize: groups.reduce((sum, group) => sum + group.length, 0) / groups.length
      });

      // Process each group
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        
        logger.debug('Processing document group', {
          groupIndex: i + 1,
          groupSize: group.length
        });

        await this.embedDocuments(group, namespace);
      }

      logger.info('Successfully embedded all similar documents', {
        documentCount: documents.length,
        groupCount: groups.length
      });
    } catch (error) {
      logger.error('Error embedding similar documents:', {
        error,
        documentCount: documents.length,
        namespace
      });
      throw error;
    }
  }

  /**
   * Simple document grouping by content similarity (can be enhanced)
   */
  private groupSimilarDocuments(documents: Document[], threshold: number): Document[][] {
    const groups: Document[][] = [];
    const processed = new Set<string>();

    for (const doc of documents) {
      if (processed.has(doc.id)) {
        continue;
      }

      const group: Document[] = [doc];
      processed.add(doc.id);

      // Find similar documents (basic text similarity)
      for (const otherDoc of documents) {
        if (processed.has(otherDoc.id)) {
          continue;
        }

        const similarity = this.calculateTextSimilarity(doc.content, otherDoc.content);
        if (similarity >= threshold) {
          group.push(otherDoc);
          processed.add(otherDoc.id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Calculate basic text similarity (Jaccard similarity)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}

export default EmbeddingService; 