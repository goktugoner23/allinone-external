export type Domain = 'instagram' | 'fitness' | 'trading' | 'general';

export interface Document {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  embedding?: number[];
  chunks?: DocumentChunk[];
}

export interface DocumentMetadata {
  domain: Domain;
  source: string;
  title?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  url?: string;
  contentType: 'text' | 'post' | 'article' | 'summary' | 'note';
  [key: string]: any; // Allow additional metadata fields
}

export interface DocumentChunk {
  id: string;
  content: string;
  chunkIndex: number;
  totalChunks: number;
  metadata: DocumentMetadata;
  embedding?: number[];
}

export interface QueryFilter {
  domain?: Domain;
  tags?: string[];
  source?: string;
  contentType?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  [key: string]: any;
}

export interface SemanticQuery {
  query: string;
  filters: QueryFilter;
  topK?: number;
  minScore?: number;
}

export interface QueryProcessingResult {
  semanticQuery: string;
  filters: QueryFilter;
  confidence: number;
  reasoning?: string;
}

export interface VectorMatch {
  id: string;
  score: number;
  content: string;
  metadata: DocumentMetadata;
}

export interface RAGResponse {
  answer: string;
  sources: VectorMatch[];
  confidence: number;
  processingTime: number;
  metadata: {
    originalQuery: string;
    processedQuery: SemanticQuery;
    totalMatches: number;
  };
}

export interface EmbeddingRequest {
  text: string;
  domain?: Domain;
}

export interface EmbeddingResponse {
  embedding: number[];
  tokenCount: number;
  model: string;
}

export interface VectorDatabaseConfig {
  indexName: string;
  dimension: number;
  metric: 'cosine' | 'euclidean' | 'dotproduct';
}

export interface RAGConfig {
  vectorDb: VectorDatabaseConfig;
  embedding: {
    model: string;
    dimension: number;
    maxTokens: number;
  };
  completion: {
    model: string;
    maxTokens: number;
    temperature: number;
  };
  chunking: {
    maxChunkSize: number;
    overlapSize: number;
    minChunkSize: number;
  };
  retrieval: {
    defaultTopK: number;
    minScore: number;
  };
}

export interface SyncOperation {
  domain: Domain;
  documentId: string;
  operation: 'upsert' | 'delete' | 'update';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: string;
  error?: string;
}

// Firebase document structure (for sync operations)
export interface FirebaseDocument {
  id: string;
  data: any;
  collection: string;
  lastModified: string;
} 