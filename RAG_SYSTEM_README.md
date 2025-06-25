# 🧠 RAG System for AllInOne-External

A comprehensive Retrieval-Augmented Generation (RAG) system built with TypeScript, designed to serve multiple domains (fitness, Instagram, trading, etc.) through a unified architecture.

## 🏗️ Architecture Overview

The RAG system implements a **three-stage process**:

1. **Stage 1**: GPT processes user queries to extract semantic meaning and metadata filters
2. **Stage 2**: Pinecone retrieves relevant documents using vector similarity search
3. **Stage 3**: GPT generates contextual responses using retrieved documents

### Key Components

```
📁 RAG System Architecture
├── 🔍 Query Processing (OpenAI GPT)
├── 🗃️ Vector Database (Pinecone)
├── 🤖 Embeddings (OpenAI ADA)
├── ✂️ Text Chunking
├── 🔄 Firebase Sync
└── 🌐 REST API
```

## 📂 Project Structure

```
src/
├── types/
│   └── rag.ts                 # TypeScript interfaces and types
├── interfaces/
│   └── vector-db.ts           # Abstract vector database interface
├── clients/
│   ├── openai.ts              # OpenAI client for embeddings & completions
│   └── pinecone.ts            # Pinecone vector database client
├── services/
│   ├── rag-service.ts         # Main RAG orchestrator
│   ├── embedding.ts           # Embedding service
│   └── text-chunking.ts       # Document chunking service
├── routes/
│   └── rag.ts                 # REST API endpoints
├── utils/
│   └── rag-setup.ts           # Utility for setup and testing
└── data/
    └── sample-instagram-data.ts # Sample data for testing
```

## 🚀 Getting Started

### Prerequisites

1. **OpenAI API Key**: For embeddings and completions
2. **Pinecone API Key**: For vector database
3. **Node.js 18+**: Runtime environment

### Environment Variables

Create a `.env` file with the following variables:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_ORGANIZATION=your_org_id_here  # Optional
OPENAI_MODEL=gpt-4                    # Default: gpt-4
OPENAI_MAX_TOKENS=2048               # Default: 2048
OPENAI_TEMPERATURE=0.7               # Default: 0.7

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENVIRONMENT=us-east-1-aws   # Your Pinecone environment
PINECONE_INDEX_NAME=allinone-rag     # Default: allinone-rag

# RAG Configuration
RAG_MAX_CHUNK_SIZE=1000              # Default: 1000
RAG_OVERLAP_SIZE=200                 # Default: 200
RAG_MIN_CHUNK_SIZE=100              # Default: 100
RAG_DEFAULT_TOP_K=5                 # Default: 5
RAG_MIN_SCORE=0.7                   # Default: 0.7

# Firebase (Optional - for sync)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_SERVICE_ACCOUNT_KEY=path_to_service_account.json
```

### Installation

1. **Install Dependencies**:
```bash
npm install
```

2. **Build the Project**:
```bash
npm run build
```

3. **Start the Server**:
```bash
npm start
```

## 🔧 Usage

### Basic RAG Query

```typescript
import { createRAGSetupUtility } from './src/utils/rag-setup';

// Initialize RAG system
const ragSetup = await createRAGSetupUtility();

// Add sample data (for testing)
await ragSetup.initializeWithSampleData();

// Query the system
const result = await ragSetup.query(
  "What's the best HIIT workout routine?",
  "fitness"
);

console.log(result.answer);
console.log(`Confidence: ${result.confidence}`);
console.log(`Sources: ${result.sources.length}`);
```

### REST API Endpoints

#### Query RAG System
```http
POST /api/rag/query
Content-Type: application/json

{
  "query": "What's the best HIIT workout routine?",
  "domain": "fitness",
  "options": {
    "topK": 5,
    "minScore": 0.7
  }
}
```

#### Add Document
```http
POST /api/rag/documents
Content-Type: application/json

{
  "id": "fitness_article_1",
  "content": "HIIT training involves alternating between high-intensity...",
  "metadata": {
    "domain": "fitness",
    "source": "fitness_blog",
    "title": "Ultimate HIIT Guide",
    "author": "fitness_expert",
    "tags": ["HIIT", "cardio", "training"],
    "contentType": "article"
  }
}
```

#### Get System Status
```http
GET /api/rag/status
```

## 🎯 Domains and Namespaces

The system supports multiple domains with automatic namespace separation:

- **`instagram`**: Social media posts and content
- **`fitness`**: Workout routines, nutrition, health tips
- **`trading`**: Cryptocurrency, stocks, financial advice
- **`general`**: Cross-domain or uncategorized content

Each domain uses its own Pinecone namespace for data isolation.

## 🔄 Three-Stage RAG Process

### Stage 1: Query Processing
```typescript
// Example: User asks "What's a good HIIT workout?"
// GPT converts to:
{
  semanticQuery: "high intensity interval training workout routine",
  filters: {
    domain: "fitness",
    tags: ["HIIT", "workout", "training"],
    contentType: "article"
  },
  confidence: 0.95
}
```

### Stage 2: Vector Retrieval
```typescript
// System:
// 1. Creates embedding for semantic query
// 2. Searches Pinecone with filters
// 3. Returns top-K similar documents
const matches = [
  {
    id: "fitness_post_1",
    score: 0.91,
    content: "HIIT involves 30 seconds high intensity...",
    metadata: { title: "HIIT Basics", author: "trainer_joe" }
  }
  // ... more matches
];
```

### Stage 3: Response Generation
```typescript
// GPT receives:
// - Original user query
// - Semantic query
// - Retrieved documents
// - Generates comprehensive answer
const answer = `
HIIT (High-Intensity Interval Training) is an excellent workout method...
Based on the retrieved content, here's an effective routine:
1. 45 seconds burpees
2. 15 seconds rest
3. 45 seconds mountain climbers
...
`;
```

## 📊 Sample Data

The system includes Instagram sample data covering:

- **Fitness Posts**: Workout routines, nutrition tips, progress tracking
- **Trading Posts**: Crypto analysis, risk management, DeFi strategies
- **Wellness Content**: Mental health, recovery, lifestyle tips

### Loading Sample Data

```typescript
import { createRAGSetupUtility } from './src/utils/rag-setup';

const ragSetup = await createRAGSetupUtility();

// Load all sample data
await ragSetup.initializeWithSampleData();

// Run interactive demo
await ragSetup.runDemo();

// Validate setup
const validation = await ragSetup.validateSetup();
console.log(validation);
```

## 🧪 Testing

### Run Sample Queries

```typescript
const testQueries = {
  fitness: [
    "What's the best HIIT workout routine?",
    "How important are rest days for muscle growth?",
    "What should I include in my meal prep?"
  ],
  trading: [
    "What are the key principles of risk management?",
    "How do I analyze Ethereum price patterns?",
    "What is DeFi yield farming?"
  ]
};
```

### Validate System Health

```bash
# Check API health
curl http://localhost:3000/api/rag/health

# Get system status
curl http://localhost:3000/api/rag/status
```

## 🔧 Configuration

### Chunking Strategy

The system uses intelligent text chunking:

```typescript
const chunkingOptions = {
  maxChunkSize: 1000,      // Maximum characters per chunk
  overlapSize: 200,        // Overlap between chunks
  minChunkSize: 100,       // Minimum viable chunk size
  preserveParagraphs: true, // Prefer paragraph boundaries
  preserveSentences: true   // Prefer sentence boundaries
};
```

### Embedding Configuration

```typescript
const embeddingConfig = {
  model: 'text-embedding-ada-002',
  dimension: 1536,
  maxTokens: 8192
};
```

### Retrieval Settings

```typescript
const retrievalConfig = {
  defaultTopK: 5,          // Number of documents to retrieve
  minScore: 0.7,           // Minimum similarity threshold
  maxTokensPerContext: 4000 // Max tokens for context
};
```

## 🔄 Firebase Sync

The system supports Firebase synchronization for real-time updates:

```typescript
// Auto-sync Firebase collections to RAG
const syncService = new FirebaseSyncService(ragService);

// Start periodic sync
await syncService.start();

// Manual domain sync
await syncService.syncSpecificDomain('fitness');
```

## 🎨 Extensibility

### Adding New Vector Databases

The system uses an abstract interface for vector databases:

```typescript
interface IVectorDatabase {
  initialize(): Promise<void>;
  upsert(request: UpsertRequest): Promise<void>;
  query(request: QueryRequest): Promise<QueryResponse>;
  delete(request: DeleteRequest): Promise<void>;
  // ... other methods
}

// Implement for Qdrant, Chroma, etc.
class QdrantClient implements IVectorDatabase {
  // Implementation
}
```

### Adding New Domains

1. Update the `Domain` type in `src/types/rag.ts`
2. Add domain-specific sample data
3. Configure namespace mapping
4. Update query processing prompts

### Custom Embedding Models

```typescript
// Extend OpenAI client or create new embedding service
class CustomEmbeddingService extends EmbeddingService {
  async createEmbedding(text: string): Promise<number[]> {
    // Custom implementation
  }
}
```

## 📈 Performance Optimization

### Batch Processing

```typescript
// Documents are processed in batches
const batchSize = 20;
await embeddingService.embedDocuments(documents, namespace);
```

### Caching Strategy

The system implements intelligent caching:
- Query result caching
- Embedding caching
- Vector database connection pooling

### Memory Management

- Automatic cleanup of temporary data
- Streaming for large documents
- Connection pooling for APIs

## 🛡️ Security Best Practices

1. **API Key Protection**: Never commit API keys to version control
2. **Input Validation**: All inputs are validated using express-validator
3. **Rate Limiting**: Built-in rate limiting for API endpoints
4. **Namespace Isolation**: Data is isolated by domain
5. **Error Handling**: Comprehensive error handling with logging

## 📋 API Reference

### Query Endpoint

**POST** `/api/rag/query`

Request:
```json
{
  "query": "string (1-2000 chars)",
  "domain": "instagram|fitness|trading|general",
  "options": {
    "topK": "number (1-20)",
    "minScore": "number (0-1)"
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "answer": "Generated response",
    "sources": [...],
    "confidence": 0.85,
    "processingTime": 1250,
    "metadata": {
      "originalQuery": "...",
      "processedQuery": {...},
      "totalMatches": 5
    }
  }
}
```

### Document Management

- **POST** `/api/rag/documents` - Add document
- **PUT** `/api/rag/documents/:id` - Update document
- **DELETE** `/api/rag/documents/:id` - Remove document
- **POST** `/api/rag/documents/batch` - Batch add documents

### System Endpoints

- **GET** `/api/rag/status` - System status and stats
- **GET** `/api/rag/health` - Health check

## 🔍 Troubleshooting

### Common Issues

1. **OpenAI API Errors**
   - Check API key validity
   - Verify rate limits
   - Check model availability

2. **Pinecone Connection Issues**
   - Verify API key and environment
   - Check index existence
   - Validate dimension settings

3. **Poor Query Results**
   - Increase topK value
   - Lower minScore threshold
   - Add more relevant documents

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
```

### Performance Monitoring

```typescript
// Built-in performance metrics
const result = await ragService.query(query);
console.log(`Processing time: ${result.processingTime}ms`);
console.log(`Confidence: ${result.confidence}`);
```

## 🚧 Future Enhancements

- [ ] Multi-modal support (images, audio)
- [ ] Advanced query expansion
- [ ] Result re-ranking algorithms
- [ ] A/B testing framework
- [ ] Analytics dashboard
- [ ] Real-time streaming responses
- [ ] Custom model fine-tuning
- [ ] Multi-language support

## 📄 License

This project is part of the AllInOne external services and follows the same licensing terms.

## 🤝 Contributing

Please follow the existing code patterns and ensure all tests pass before submitting changes.

---

**Built with ❤️ using TypeScript, OpenAI, and Pinecone** 