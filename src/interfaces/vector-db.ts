import { DocumentChunk, VectorMatch, QueryFilter } from '../types/rag';

export interface VectorRecord {
  id: string;
  values: number[];
  metadata: Record<string, any>;
  namespace?: string;
}

export interface QueryRequest {
  vector: number[];
  topK: number;
  namespace?: string;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
  includeValues?: boolean;
}

export interface QueryResponse {
  matches: VectorMatch[];
  namespace?: string;
}

export interface UpsertRequest {
  vectors: VectorRecord[];
  namespace?: string;
}

export interface DeleteRequest {
  ids: string[];
  namespace?: string;
  deleteAll?: boolean;
  filter?: Record<string, any>;
}

export interface IndexStats {
  totalVectorCount: number;
  dimension: number;
  indexFullness: number;
  namespaces?: Record<string, { vectorCount: number }>;
}

/**
 * Abstract interface for vector database operations
 * Allows switching between Pinecone, Qdrant, Chroma, etc.
 */
export interface IVectorDatabase {
  /**
   * Initialize the database connection
   */
  initialize(): Promise<void>;

  /**
   * Check if the database is connected and ready
   */
  isReady(): boolean;

  /**
   * Upsert vectors into the database
   */
  upsert(request: UpsertRequest): Promise<void>;

  /**
   * Query vectors from the database
   */
  query(request: QueryRequest): Promise<QueryResponse>;

  /**
   * Delete vectors from the database
   */
  delete(request: DeleteRequest): Promise<void>;

  /**
   * Get database statistics
   */
  getStats(): Promise<IndexStats>;

  /**
   * Create namespace if it doesn't exist
   */
  createNamespace(namespace: string): Promise<void>;

  /**
   * List all namespaces
   */
  listNamespaces(): Promise<string[]>;

  /**
   * Close database connection
   */
  close(): Promise<void>;

  /**
   * Health check for the database
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Utility functions for working with vector databases
 */
export class VectorUtils {
  /**
   * Convert document chunk to vector record
   */
  static chunkToVectorRecord(chunk: DocumentChunk, namespace?: string): VectorRecord {
    return {
      id: chunk.id,
      values: chunk.embedding || [],
      metadata: {
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        totalChunks: chunk.totalChunks,
        ...chunk.metadata
      },
      namespace
    };
  }

  /**
   * Convert query filters to database-specific format
   */
  static convertFilters(filters: QueryFilter): Record<string, any> {
    const dbFilters: Record<string, any> = {};

    if (filters.domain) {
      dbFilters.domain = { $eq: filters.domain };
    }

    if (filters.tags && filters.tags.length > 0) {
      dbFilters.tags = { $in: filters.tags };
    }

    if (filters.source) {
      dbFilters.source = { $eq: filters.source };
    }

    if (filters.contentType) {
      dbFilters.contentType = { $eq: filters.contentType };
    }

    if (filters.dateRange) {
      dbFilters.createdAt = {
        $gte: filters.dateRange.start,
        $lte: filters.dateRange.end
      };
    }

    // Include additional filters
    Object.keys(filters).forEach(key => {
      if (!['domain', 'tags', 'source', 'contentType', 'dateRange'].includes(key)) {
        dbFilters[key] = { $eq: filters[key] };
      }
    });

    return dbFilters;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Normalize vector to unit length
   */
  static normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    
    if (norm === 0) {
      return vector;
    }

    return vector.map(val => val / norm);
  }
} 