import { RAGService } from '../services/rag-service';
import { EmbeddingService } from '../services/embedding';
import { TextChunkingService } from '../services/text-chunking';
import { PineconeClient } from '../clients/pinecone';
import { OpenAIClient } from '../clients/openai';
import { sampleInstagramData, getSampleDataByDomain, testQueries } from '../data/sample-instagram-data';
import { Domain } from '../types/rag';
import logger from './logger';

export class RAGSetupUtility {
  private ragService: RAGService;

  constructor(ragService: RAGService) {
    this.ragService = ragService;
  }

  /**
   * Initialize RAG system with sample data
   */
  async initializeWithSampleData(): Promise<void> {
    try {
      logger.info('Starting RAG system initialization with sample data...');

      // Check if RAG service is ready
      const status = await this.ragService.getStatus();
      if (!status.isReady) {
        throw new Error('RAG service is not ready. Please check OpenAI and Pinecone connections.');
      }

      // Add sample Instagram data
      logger.info('Adding sample Instagram data...');
      await this.addSampleInstagramData();

      // Test the system with sample queries
      logger.info('Testing RAG system with sample queries...');
      await this.testSampleQueries();

      logger.info('RAG system initialization completed successfully!');
    } catch (error) {
      logger.error('Failed to initialize RAG system with sample data:', error);
      throw error;
    }
  }

  /**
   * Add sample Instagram data to the RAG system
   */
  private async addSampleInstagramData(): Promise<void> {
    try {
      logger.info(`Adding ${sampleInstagramData.length} sample Instagram documents...`);

      // Add documents in batches to avoid overwhelming the system
      const batchSize = 3;
      for (let i = 0; i < sampleInstagramData.length; i += batchSize) {
        const batch = sampleInstagramData.slice(i, i + batchSize);
        
        logger.debug(`Processing batch ${Math.floor(i / batchSize) + 1}`, {
          batchSize: batch.length,
          documents: batch.map(doc => doc.id)
        });

        await Promise.all(
          batch.map(document => this.ragService.addDocument(document))
        );

        // Small delay between batches
        if (i + batchSize < sampleInstagramData.length) {
          await this.delay(2000);
        }
      }

      logger.info('Successfully added all sample Instagram documents');
    } catch (error) {
      logger.error('Failed to add sample Instagram data:', error);
      throw error;
    }
  }

  /**
   * Test the RAG system with sample queries
   */
  private async testSampleQueries(): Promise<void> {
    try {
      logger.info('Testing RAG system with sample queries...');

      const domains: Domain[] = ['fitness', 'trading', 'general'];
      
      for (const domain of domains) {
        const queries = testQueries[domain as keyof typeof testQueries];
        
        logger.info(`Testing ${domain} queries...`);
        
        for (let i = 0; i < Math.min(queries.length, 2); i++) { // Test first 2 queries per domain
          const query = queries[i];
          
          logger.debug(`Testing query: "${query}"`);
          
          try {
            const result = await this.ragService.query(query, domain);
            
            logger.info('Query result:', {
              query: query.substring(0, 50) + '...',
              domain,
              sourceCount: result.sources.length,
              confidence: result.confidence,
              processingTime: result.processingTime,
              answerLength: result.answer.length
            });
          } catch (error) {
            logger.warn(`Query failed: "${query}"`, error);
          }

          // Delay between queries
          await this.delay(1000);
        }
      }

      logger.info('Sample query testing completed');
    } catch (error) {
      logger.error('Failed to test sample queries:', error);
      throw error;
    }
  }

  /**
   * Clear all data from the RAG system
   */
  async clearAllData(): Promise<void> {
    try {
      logger.info('Clearing all data from RAG system...');

      const domains: Domain[] = ['instagram', 'fitness', 'trading', 'general'];
      
      for (const domain of domains) {
        try {
          // Remove all documents for this domain
          for (const doc of sampleInstagramData) {
            try {
              await this.ragService.removeDocument(doc.id, domain);
            } catch (error) {
              // Ignore errors if document doesn't exist
              logger.debug(`Document ${doc.id} not found in ${domain}, skipping...`);
            }
          }
        } catch (error) {
          logger.warn(`Failed to clear ${domain} domain:`, error);
        }
      }

      logger.info('All data cleared from RAG system');
    } catch (error) {
      logger.error('Failed to clear RAG system data:', error);
      throw error;
    }
  }

  /**
   * Get RAG system statistics
   */
  async getSystemStats(): Promise<{
    status: any;
    sampleDataCount: number;
    testQueriesCount: number;
  }> {
    try {
      const status = await this.ragService.getStatus();
      
      return {
        status,
        sampleDataCount: sampleInstagramData.length,
        testQueriesCount: Object.values(testQueries).flat().length
      };
    } catch (error) {
      logger.error('Failed to get system stats:', error);
      throw error;
    }
  }

  /**
   * Run interactive demo
   */
  async runDemo(): Promise<void> {
    try {
      logger.info('Starting RAG system demo...');

      // Test various types of queries
      const demoQueries = [
        { query: "What's the best HIIT workout routine?", domain: 'fitness' as Domain },
        { query: "How do I manage risk in crypto trading?", domain: 'trading' as Domain },
        { query: "What are some nutrition tips for fitness?", domain: 'general' as Domain },
        { query: "Tell me about DeFi yield farming strategies", domain: 'trading' as Domain }
      ];

      logger.info(`Running demo with ${demoQueries.length} queries...`);

      for (const { query, domain } of demoQueries) {
        logger.info(`\n🔍 Querying: "${query}" (Domain: ${domain})`);
        
        try {
          const result = await this.ragService.query(query, domain);
          
          logger.info('📊 Results:', {
            confidence: result.confidence,
            sourceCount: result.sources.length,
            processingTime: `${result.processingTime}ms`
          });

          logger.info('💬 Answer:', result.answer.substring(0, 200) + '...');
          
          if (result.sources.length > 0) {
            logger.info('📚 Top Source:', {
              title: result.sources[0].metadata.title,
              score: result.sources[0].score,
              author: result.sources[0].metadata.author
            });
          }
        } catch (error) {
          logger.error(`Demo query failed: "${query}"`, error);
        }

        // Pause between queries for readability
        await this.delay(2000);
      }

      logger.info('\n✅ Demo completed successfully!');
    } catch (error) {
      logger.error('Demo failed:', error);
      throw error;
    }
  }

  /**
   * Validate RAG system setup
   */
  async validateSetup(): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check RAG service status
      const status = await this.ragService.getStatus();
      
      if (!status.isReady) {
        issues.push('RAG service is not ready');
      }

      if (!status.health.openai) {
        issues.push('OpenAI client is not healthy');
        recommendations.push('Check OPENAI_API_KEY environment variable');
      }

      if (!status.health.vectorDb) {
        issues.push('Vector database is not healthy');
        recommendations.push('Check PINECONE_API_KEY and PINECONE_ENVIRONMENT variables');
      }

      // Check if sample data exists
      const stats = status.stats;
      if (stats && stats.totalVectors === 0) {
        recommendations.push('Consider adding sample data using initializeWithSampleData()');
      }

      // Performance recommendations
      if (stats && stats.totalVectors > 0) {
        recommendations.push('System is ready for queries');
        recommendations.push('Try running the demo with runDemo()');
      }

      return {
        isValid: issues.length === 0,
        issues,
        recommendations
      };
    } catch (error) {
      issues.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        isValid: false,
        issues,
        recommendations: ['Check system configuration and try again']
      };
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create RAGSetupUtility with initialized services
 */
export async function createRAGSetupUtility(): Promise<RAGSetupUtility> {
  try {
    logger.info('Creating RAG setup utility...');

    // Initialize all components
    const openaiClient = new OpenAIClient();
    const pineconeClient = new PineconeClient();
    const textChunker = new TextChunkingService();
    const embeddingService = new EmbeddingService(openaiClient, pineconeClient, textChunker);
    const ragService = new RAGService(openaiClient, embeddingService, pineconeClient);

    // Initialize the RAG service
    await ragService.initialize();

    logger.info('RAG setup utility created successfully');
    
    return new RAGSetupUtility(ragService);
  } catch (error) {
    logger.error('Failed to create RAG setup utility:', error);
    throw error;
  }
}

export default RAGSetupUtility; 