import { Pinecone } from '@pinecone-database/pinecone';
import config from '../config';
import logger from '../utils/logger';
import {
  IVectorDatabase,
  VectorRecord,
  QueryRequest,
  QueryResponse,
  UpsertRequest,
  DeleteRequest,
  IndexStats,
  VectorUtils
} from '../interfaces/vector-db';
import { VectorMatch, DocumentMetadata } from '../types/rag';

export class PineconeClient implements IVectorDatabase {
  private client: Pinecone;
  private index: any;
  private isInitialized: boolean = false;

  constructor() {
    if (!config.pinecone.apiKey) {
      throw new Error('Pinecone API key is required');
    }

    this.client = new Pinecone({
      apiKey: config.pinecone.apiKey
    });
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Pinecone client...', {
        indexName: config.pinecone.indexName
      });

      // Get the index
      this.index = this.client.index(config.pinecone.indexName);

      // Check if index exists, create if it doesn't
      await this.ensureIndexExists();

      this.isInitialized = true;
      logger.info('Pinecone client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Pinecone client:', error);
      throw error;
    }
  }

  private async ensureIndexExists(): Promise<void> {
    try {
      const indexList = await this.client.listIndexes();
      const indexExists = indexList.indexes?.some(
        index => index.name === config.pinecone.indexName
      );

      if (!indexExists) {
        logger.info(`Creating Pinecone index: ${config.pinecone.indexName}`);
        
        await this.client.createIndex({
          name: config.pinecone.indexName,
          dimension: config.rag.vectorDb.dimension,
          metric: config.rag.vectorDb.metric,
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });

        // Wait for index to be ready
        await this.waitForIndexReady();
        logger.info(`Pinecone index created successfully: ${config.pinecone.indexName}`);
      }
    } catch (error) {
      logger.error('Error ensuring Pinecone index exists:', error);
      throw error;
    }
  }

  private async waitForIndexReady(maxWaitTime: number = 60000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const indexDescription = await this.client.describeIndex(config.pinecone.indexName);
        
        if (indexDescription.status?.ready) {
          return;
        }
        
        logger.info(`Waiting for index to be ready... Status: ${indexDescription.status?.state}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        logger.warn('Error checking index status:', error);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    throw new Error(`Index ${config.pinecone.indexName} not ready after ${maxWaitTime}ms`);
  }

  isReady(): boolean {
    return this.isInitialized && this.index !== null;
  }

  async upsert(request: UpsertRequest): Promise<void> {
    if (!this.isReady()) {
      throw new Error('Pinecone client not initialized');
    }

    try {
      logger.debug('Upserting vectors to Pinecone', {
        namespace: request.namespace,
        vectorCount: request.vectors.length
      });

      const vectors = request.vectors.map(vector => ({
        id: vector.id,
        values: vector.values,
        metadata: vector.metadata
      }));

      await this.index.namespace(request.namespace || '').upsert(vectors);

      logger.debug('Successfully upserted vectors to Pinecone', {
        namespace: request.namespace,
        vectorCount: vectors.length
      });
    } catch (error) {
      logger.error('Error upserting vectors to Pinecone:', {
        error,
        namespace: request.namespace,
        vectorCount: request.vectors.length
      });
      throw error;
    }
  }

  async query(request: QueryRequest): Promise<QueryResponse> {
    if (!this.isReady()) {
      throw new Error('Pinecone client not initialized');
    }

    try {
      logger.debug('Querying Pinecone', {
        namespace: request.namespace,
        topK: request.topK,
        hasFilter: !!request.filter
      });

      const queryRequest: any = {
        vector: request.vector,
        topK: request.topK,
        includeMetadata: request.includeMetadata ?? true,
        includeValues: request.includeValues ?? false
      };

      if (request.filter && Object.keys(request.filter).length > 0) {
        queryRequest.filter = request.filter;
      }

      const response = await this.index.namespace(request.namespace || '').query(queryRequest);

      const matches: VectorMatch[] = response.matches?.map((match: any) => ({
        id: match.id,
        score: match.score || 0,
        content: match.metadata?.content || '',
        metadata: this.extractMetadata(match.metadata)
      })) || [];

      logger.debug('Pinecone query completed', {
        namespace: request.namespace,
        matchCount: matches.length,
        topScore: matches.length > 0 ? matches[0].score : 0
      });

      return {
        matches,
        namespace: request.namespace
      };
    } catch (error) {
      logger.error('Error querying Pinecone:', {
        error,
        namespace: request.namespace,
        topK: request.topK
      });
      throw error;
    }
  }

  private extractMetadata(metadata: any): DocumentMetadata {
    if (!metadata) {
      throw new Error('Metadata is required');
    }

    return {
      domain: metadata.domain,
      source: metadata.source,
      title: metadata.title,
      author: metadata.author,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
      tags: metadata.tags || [],
      url: metadata.url,
      contentType: metadata.contentType,
      ...metadata
    };
  }

  async delete(request: DeleteRequest): Promise<void> {
    if (!this.isReady()) {
      throw new Error('Pinecone client not initialized');
    }

    try {
      logger.debug('Deleting vectors from Pinecone', {
        namespace: request.namespace,
        idsCount: request.ids?.length,
        deleteAll: request.deleteAll,
        hasFilter: !!request.filter
      });

      const deleteRequest: any = {};

      if (request.deleteAll) {
        deleteRequest.deleteAll = true;
      } else if (request.ids && request.ids.length > 0) {
        deleteRequest.ids = request.ids;
      } else if (request.filter) {
        deleteRequest.filter = request.filter;
      } else {
        throw new Error('Must specify ids, filter, or deleteAll');
      }

      await this.index.namespace(request.namespace || '').deleteMany(deleteRequest);

      logger.debug('Successfully deleted vectors from Pinecone', {
        namespace: request.namespace
      });
    } catch (error) {
      logger.error('Error deleting vectors from Pinecone:', {
        error,
        namespace: request.namespace
      });
      throw error;
    }
  }

  async getStats(): Promise<IndexStats> {
    if (!this.isReady()) {
      throw new Error('Pinecone client not initialized');
    }

    try {
      const stats = await this.index.describeIndexStats();

      return {
        totalVectorCount: stats.totalVectorCount || 0,
        dimension: stats.dimension || config.rag.vectorDb.dimension,
        indexFullness: stats.indexFullness || 0,
        namespaces: stats.namespaces || {}
      };
    } catch (error) {
      logger.error('Error getting Pinecone stats:', error);
      throw error;
    }
  }

  async createNamespace(namespace: string): Promise<void> {
    // Pinecone creates namespaces automatically when vectors are upserted
    logger.debug(`Namespace ${namespace} will be created automatically on first upsert`);
  }

  async listNamespaces(): Promise<string[]> {
    if (!this.isReady()) {
      throw new Error('Pinecone client not initialized');
    }

    try {
      const stats = await this.getStats();
      return Object.keys(stats.namespaces || {});
    } catch (error) {
      logger.error('Error listing Pinecone namespaces:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    logger.info('Closing Pinecone client connection');
    this.isInitialized = false;
    this.index = null;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isReady()) {
        return false;
      }

      const stats = await this.getStats();
      return stats !== null;
    } catch (error) {
      logger.error('Pinecone health check failed:', error);
      return false;
    }
  }
}

export default PineconeClient; 