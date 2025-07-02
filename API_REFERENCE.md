# Instagram AI - API Reference

Complete API reference for integrating Instagram AI into your frontend applications.

## 🌐 Base URL

**Development:** `http://localhost:3000`  
**Production:** `https://your-domain.com`

## 🔑 Authentication

Currently no authentication required for basic usage. For production deployments, implement API keys or authentication as needed.

## 📊 Main AI Query Endpoint

### `POST /api/rag/query`

Query the Instagram AI for strategic insights, URL analysis, and content recommendations.

#### Request

```json
{
  "query": "Your Instagram-related question or content to analyze",
  "domain": "instagram"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | ✅ | Your question or content (1-2000 characters) |
| `domain` | string | ✅ | Always use `"instagram"` for Instagram-focused responses |

#### Response

```json
{
  "success": true,
  "data": {
    "answer": "Strategic Instagram advice and insights...",
    "sources": [
      {
        "id": "source-123",
        "score": 0.95,
        "content": "Relevant content snippet...",
        "metadata": {
          "type": "instagram_post",
          "engagement_rate": 8.5,
          "hashtags": ["#marketing", "#growth"]
        }
      }
    ],
    "confidence": 0.92,
    "metadata": {
      "conversationMode": "advisory_with_data",
      "processingTime": 3500,
      "originalQuery": "Your original question"
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### Error Response

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 📱 Example Requests

### Content Strategy Question
```javascript
const response = await fetch('/api/rag/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "How can I improve my Instagram engagement rate?",
    domain: "instagram"
  })
});
```

### URL Analysis
```javascript
const response = await fetch('/api/rag/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "Analyze this Instagram profile: https://instagram.com/nike",
    domain: "instagram"
  })
});
```

### Performance Analysis
```javascript
const response = await fetch('/api/rag/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "Why did my recent Instagram post underperform?",
    domain: "instagram"
  })
});
```

### Hashtag Strategy
```javascript
const response = await fetch('/api/rag/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "What hashtags should I use for fitness content on Instagram?",
    domain: "instagram"
  })
});
```

## ⚡ Health Check Endpoint

### `GET /health`

Check the status of the Instagram AI service.

#### Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "services": {
    "ai": "operational",
    "database": "operational",
    "embeddings": "operational"
  },
  "version": "1.0.0"
}
```

## 📊 Instagram Data Sync (Optional)

### `POST /api/instagram/sync-complete`

Trigger a complete sync of Instagram data (requires Instagram API credentials).

#### Response

```json
{
  "success": true,
  "data": {
    "message": "Instagram data sync completed successfully",
    "postsProcessed": 150,
    "syncTime": "2024-01-01T12:00:00.000Z"
  }
}
```

## 🔧 Response Metadata

### Conversation Modes

The API automatically detects the type of query and responds with appropriate conversation modes:

- `url_analysis_with_data` - Analyzing Instagram URLs
- `analytical_with_data` - Data-driven analysis
- `advisory_with_data` - Strategic advice with data
- `educational_with_data` - Educational content with examples
- `coaching_with_data` - Personalized coaching advice
- `conversational_with_data` - General conversation with context

### Confidence Scores

- `0.9-1.0` - High confidence, comprehensive data available
- `0.7-0.9` - Good confidence, relevant data found
- `0.5-0.7` - Moderate confidence, some relevant data
- `0.0-0.5` - Low confidence, limited relevant data

## 🚨 Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `INVALID_QUERY` | Query is empty or too long | Provide a valid query (1-2000 chars) |
| `INVALID_DOMAIN` | Domain parameter missing/invalid | Use `"instagram"` as domain |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait before making more requests |
| `AI_SERVICE_ERROR` | AI service temporarily unavailable | Retry after a few seconds |
| `VALIDATION_ERROR` | Request validation failed | Check request format |

## 📈 Rate Limits

**Development:** 100 requests per minute per IP  
**Production:** Configure based on your needs

When rate limited, you'll receive a `429` status code. Implement exponential backoff:

```javascript
async function queryWithRetry(query, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, domain: 'instagram' })
      });
      
      if (response.status === 429) {
        // Rate limited, wait and retry
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        continue;
      }
      
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

## 🎯 Best Practices

### Request Optimization
1. **Cache responses** for identical queries
2. **Debounce user input** to avoid excessive requests
3. **Use specific queries** for better results
4. **Include context** in your questions

### Error Handling
```javascript
async function safeQuery(query) {
  try {
    const response = await fetch('/api/rag/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, domain: 'instagram' })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Request failed');
    }
    
    return data.data;
  } catch (error) {
    console.error('Query failed:', error);
    throw error;
  }
}
```

### Response Processing
```javascript
function processAIResponse(response) {
  const { answer, sources, confidence, metadata } = response;
  
  return {
    text: answer,
    confidence: Math.round(confidence * 100),
    sourceCount: sources.length,
    processingTime: metadata.processingTime,
    mode: metadata.conversationMode
  };
}
```

## 📚 SDK Examples

### JavaScript/TypeScript
```typescript
class InstagramAI {
  private baseUrl: string;
  
  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }
  
  async query(question: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: question,
        domain: 'instagram'
      })
    });
    
    const data = await response.json();
    return data.data.answer;
  }
  
  async analyzeURL(url: string): Promise<string> {
    return this.query(`Analyze this Instagram URL: ${url}`);
  }
  
  async getStrategy(topic: string): Promise<string> {
    return this.query(`Give me Instagram strategy advice for: ${topic}`);
  }
}

// Usage
const ai = new InstagramAI();
const advice = await ai.getStrategy('improving engagement');
```

### Python
```python
import requests
import json

class InstagramAI:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url
    
    def query(self, question):
        response = requests.post(
            f"{self.base_url}/api/rag/query",
            json={
                "query": question,
                "domain": "instagram"
            }
        )
        
        data = response.json()
        return data["data"]["answer"]
    
    def analyze_url(self, url):
        return self.query(f"Analyze this Instagram URL: {url}")
    
    def get_strategy(self, topic):
        return self.query(f"Give me Instagram strategy advice for: {topic}")

# Usage
ai = InstagramAI()
advice = ai.get_strategy("improving engagement")
```

## 🔐 Security Considerations

### Production Deployment
1. **Use HTTPS** for all API communications
2. **Implement rate limiting** to prevent abuse
3. **Add authentication** for sensitive operations
4. **Validate all inputs** on the server side
5. **Monitor usage** and set up alerts

### CORS Configuration
The API includes CORS headers for browser-based applications. For production, configure appropriate origins:

```javascript
// Example CORS configuration
app.use(cors({
  origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
  credentials: true,
  optionsSuccessStatus: 200
}));
```

---

**Ready to integrate Instagram AI? Use this reference to build amazing features!** 🚀 