import { Router, Request, Response, NextFunction } from 'express';
import { body, query, param } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { Domain, Document } from '../types/rag';
import { RAGService } from '../services/rag-service';
import { PineconeClient } from '../clients/pinecone';
import { OpenAIClient } from '../clients/openai';
import { EmbeddingService } from '../services/embedding';
import { TextChunkingService } from '../services/text-chunking';
import logger from '../utils/logger';

const router = Router();

// Initialize RAG service components
let ragService: RAGService;

// Initialize RAG service (should be called on app startup)
async function initializeRAGService(): Promise<void> {
  try {
    logger.info('Initializing RAG service components...');
    
    const openaiClient = new OpenAIClient();
    const pineconeClient = new PineconeClient();
    const textChunker = new TextChunkingService();
    const embeddingService = new EmbeddingService(openaiClient, pineconeClient, textChunker);
    
    ragService = new RAGService(openaiClient, embeddingService, pineconeClient);
    
    await ragService.initialize();
    
    logger.info('RAG service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize RAG service:', error);
    throw error;
  }
}

// Middleware to ensure RAG service is initialized
const ensureRAGServiceInitialized = (req: Request, res: Response, next: NextFunction): void => {
  if (!ragService) {
    res.status(503).json({
      success: false,
      error: 'RAG service not initialized',
      code: 'SERVICE_NOT_READY'
    });
    return;
  }
  next();
};

/**
 * POST /api/rag/query
 * Main RAG query endpoint
 */
router.post('/query',
  ensureRAGServiceInitialized,
  [
    body('query')
      .isString()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Query must be a string between 1 and 2000 characters'),
    body('domain')
      .optional()
      .isIn(['instagram', 'fitness', 'trading', 'general'])
      .withMessage('Domain must be one of: instagram, fitness, trading, general'),
    body('options')
      .optional()
      .isObject()
      .withMessage('Options must be an object'),
    body('options.topK')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('topK must be an integer between 1 and 20'),
    body('options.minScore')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('minScore must be a float between 0 and 1')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { query, domain, options } = req.body;
      
      logger.info('RAG query request received', {
        queryLength: query.length,
        domain,
        options,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      const result = await ragService.query(query, domain as Domain);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('RAG query failed:', {
        error,
        query: req.body.query?.substring(0, 100),
        domain: req.body.domain
      });

      res.status(500).json({
        success: false,
        error: 'Failed to process RAG query',
        code: 'RAG_QUERY_FAILED'
      });
    }
  }
);

/**
 * POST /api/rag/documents
 * Add a document to the RAG system
 */
router.post('/documents',
  ensureRAGServiceInitialized,
  [
    body('id')
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('Document ID must be a string between 1 and 255 characters'),
    body('content')
      .isString()
      .isLength({ min: 1, max: 50000 })
      .withMessage('Content must be a string between 1 and 50000 characters'),
    body('metadata')
      .isObject()
      .withMessage('Metadata must be an object'),
    body('metadata.domain')
      .isIn(['instagram', 'fitness', 'trading', 'general'])
      .withMessage('Domain must be one of: instagram, fitness, trading, general'),
    body('metadata.source')
      .isString()
      .withMessage('Source must be a string'),
    body('metadata.title')
      .optional()
      .isString()
      .withMessage('Title must be a string'),
    body('metadata.tags')
      .isArray()
      .withMessage('Tags must be an array'),
    body('metadata.contentType')
      .isIn(['text', 'post', 'article', 'summary', 'note'])
      .withMessage('Content type must be one of: text, post, article, summary, note')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { id, content, metadata } = req.body;

      logger.info('Adding document to RAG system', {
        documentId: id,
        domain: metadata.domain,
        contentLength: content.length,
        source: metadata.source
      });

      const document: Document = {
        id,
        content,
        metadata: {
          ...metadata,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };

      await ragService.addDocument(document);

      res.status(201).json({
        success: true,
        data: {
          documentId: id,
          status: 'added'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to add document:', {
        error,
        documentId: req.body.id,
        domain: req.body.metadata?.domain
      });

      res.status(500).json({
        success: false,
        error: 'Failed to add document',
        code: 'DOCUMENT_ADD_FAILED'
      });
    }
  }
);

/**
 * PUT /api/rag/documents/:id
 * Update a document in the RAG system
 */
router.put('/documents/:id',
  ensureRAGServiceInitialized,
  [
    param('id')
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('Document ID must be a string between 1 and 255 characters'),
    body('content')
      .isString()
      .isLength({ min: 1, max: 50000 })
      .withMessage('Content must be a string between 1 and 50000 characters'),
    body('metadata')
      .isObject()
      .withMessage('Metadata must be an object'),
    body('metadata.domain')
      .isIn(['instagram', 'fitness', 'trading', 'general'])
      .withMessage('Domain must be one of: instagram, fitness, trading, general')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { content, metadata } = req.body;

      logger.info('Updating document in RAG system', {
        documentId: id,
        domain: metadata.domain,
        contentLength: content.length
      });

      const updatedMetadata = {
        ...metadata,
        updatedAt: new Date().toISOString()
      };

      await ragService.updateDocument(id, content, updatedMetadata);

      res.json({
        success: true,
        data: {
          documentId: id,
          status: 'updated'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to update document:', {
        error,
        documentId: req.params.id,
        domain: req.body.metadata?.domain
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update document',
        code: 'DOCUMENT_UPDATE_FAILED'
      });
    }
  }
);

/**
 * DELETE /api/rag/documents/:id
 * Remove a document from the RAG system
 */
router.delete('/documents/:id',
  ensureRAGServiceInitialized,
  [
    param('id')
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('Document ID must be a string between 1 and 255 characters'),
    query('domain')
      .optional()
      .isIn(['instagram', 'fitness', 'trading', 'general'])
      .withMessage('Domain must be one of: instagram, fitness, trading, general')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { domain } = req.query;

      logger.info('Removing document from RAG system', {
        documentId: id,
        domain
      });

      await ragService.removeDocument(id, domain as Domain);

      res.json({
        success: true,
        data: {
          documentId: id,
          status: 'removed'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to remove document:', {
        error,
        documentId: req.params.id,
        domain: req.query.domain
      });

      res.status(500).json({
        success: false,
        error: 'Failed to remove document',
        code: 'DOCUMENT_REMOVE_FAILED'
      });
    }
  }
);

/**
 * GET /api/rag/status
 * Get RAG system status and statistics
 */
router.get('/status',
  ensureRAGServiceInitialized,
  async (req: Request, res: Response) => {
    try {
      const status = await ragService.getStatus();

      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get RAG status:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get RAG status',
        code: 'STATUS_CHECK_FAILED'
      });
    }
  }
);

/**
 * POST /api/rag/documents/batch
 * Add multiple documents to the RAG system
 */
router.post('/documents/batch',
  ensureRAGServiceInitialized,
  [
    body('documents')
      .isArray({ min: 1, max: 50 })
      .withMessage('Documents must be an array with 1-50 items'),
    body('documents.*.id')
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('Each document ID must be a string between 1 and 255 characters'),
    body('documents.*.content')
      .isString()
      .isLength({ min: 1, max: 50000 })
      .withMessage('Each document content must be a string between 1 and 50000 characters'),
    body('documents.*.metadata')
      .isObject()
      .withMessage('Each document metadata must be an object'),
    body('documents.*.metadata.domain')
      .isIn(['instagram', 'fitness', 'trading', 'general'])
      .withMessage('Each document domain must be one of: instagram, fitness, trading, general')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { documents } = req.body;

      logger.info('Adding batch documents to RAG system', {
        documentCount: documents.length,
        domains: [...new Set(documents.map((doc: any) => doc.metadata.domain))]
      });

      const processedDocuments: Document[] = documents.map((doc: any) => ({
        id: doc.id,
        content: doc.content,
        metadata: {
          ...doc.metadata,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }));

      // Process documents in parallel with some concurrency control
      const results = await Promise.allSettled(
        processedDocuments.map(doc => ragService.addDocument(doc))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      res.status(successful > 0 ? 201 : 500).json({
        success: failed === 0,
        data: {
          total: documents.length,
          successful,
          failed,
          results: results.map((result, index) => ({
            documentId: documents[index].id,
            status: result.status,
            error: result.status === 'rejected' ? result.reason.message : undefined
          }))
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to add batch documents:', {
        error,
        documentCount: req.body.documents?.length
      });

      res.status(500).json({
        success: false,
        error: 'Failed to add batch documents',
        code: 'BATCH_ADD_FAILED'
      });
    }
  }
);

/**
 * GET /api/rag/health
 * Simple health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      ragServiceInitialized: !!ragService,
      timestamp: new Date().toISOString()
    }
  });
});

export { initializeRAGService };
export default router; 