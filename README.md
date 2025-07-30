# Instagram AI Assistant - Backend API

A powerful Instagram analytics AI that provides strategic insights and supports multimodal analysis. Built for seamless frontend integration.

## 🎯 What Is This?

An **Instagram-focused GPT** that can:
- 🔗 **Analyze Instagram URLs** (profiles, posts, reels)
- 📊 **Provide strategic insights** based on your data
- 🖼️ **Process images, audio, PDFs** for optimization
- 💬 **Have natural conversations** about strategy
- 📈 **Give actionable recommendations** for growth

**Think ChatGPT but specialized for Instagram marketing.**

## 🎮 Quick Start for Frontend Developers

### 1. Start the Server
```bash
npm install && npm run dev
# Development Server: http://localhost:3000
# Production Server: http://129.212.143.6:3000
```

### 2. Basic AI Chat Request
```javascript
// Development
const response = await fetch('http://localhost:3000/api/rag/query', {
// Production  
// const response = await fetch('http://129.212.143.6:3000/api/rag/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "How can I improve my Instagram engagement rate?",
    domain: "instagram"
  })
});

const data = await response.json();
console.log(data.data.answer); // AI's strategic advice
```

### 3. Analyze Instagram URLs
```javascript
// Development
const response = await fetch('http://localhost:3000/api/rag/query', {
// Production
// const response = await fetch('http://129.212.143.6:3000/api/rag/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "Analyze this profile: https://instagram.com/nike",
    domain: "instagram"
  })
});
```

## 📱 Frontend Integration

### React Example
```tsx
import { useState } from 'react';

function InstagramAI() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const askAI = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, domain: 'instagram' })
      });
      
      const data = await res.json();
      setResponse(data.data.answer);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="instagram-ai-chat">
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask about your Instagram strategy..."
        className="w-full p-4 border rounded-lg"
      />
      
      <button 
        onClick={askAI}
        disabled={loading}
        className="bg-blue-500 text-white px-6 py-2 rounded-lg mt-2"
      >
        {loading ? 'Thinking...' : 'Ask AI'}
      </button>
      
      {response && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">AI Assistant:</h3>
          <p className="whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </div>
  );
}
```

### Vue.js Example
```vue
<template>
  <div class="instagram-ai">
    <textarea
      v-model="query"
      placeholder="Ask about Instagram strategy..."
      class="w-full p-4 border rounded"
    />
    
    <button @click="askAI" :disabled="loading" class="btn-primary">
      {{ loading ? 'Analyzing...' : 'Get Insights' }}
    </button>
    
    <div v-if="answer" class="response-card">
      <h3>🎯 Instagram Strategy Insights:</h3>
      <p>{{ answer }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const query = ref('');
const answer = ref('');
const loading = ref(false);

const askAI = async () => {
  loading.value = true;
  try {
    const response = await fetch('/api/rag/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query.value,
        domain: 'instagram'
      })
    });
    
    const data = await response.json();
    answer.value = data.data.answer;
  } finally {
    loading.value = false;
  }
};
</script>
```

### Flutter/Dart Example
```dart
class InstagramAIService {
  static Future<String> askAI(String query) async {
    final response = await http.post(
      Uri.parse('http://localhost:3000/api/rag/query'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'query': query,
        'domain': 'instagram',
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data']['answer'];
    } else {
      throw Exception('Failed to get AI response');
    }
  }
}
```

## 🛠️ API Reference

### Main Endpoint
```
POST /api/rag/query
```

**Request:**
```json
{
  "query": "Your Instagram question",
  "domain": "instagram"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "AI strategic response...",
    "sources": [...],
    "confidence": 0.95,
    "metadata": {
      "conversationMode": "advisory_with_data",
      "processingTime": 3500
    }
  }
}
```

## 💡 Use Cases

### Content Strategy
- *"What content gets the most engagement in my niche?"*
- *"How can I optimize my Instagram Reels?"*
- *"What hashtags should I use for fitness content?"*

### Performance Analysis
- *"Why did my recent post underperform?"*
- *"What's my average engagement rate?"*
- *"Which posts should I promote?"*

### URL Analysis
- *"Analyze this profile: https://instagram.com/competitor"*
- *"What can I learn from this viral post?"*
- *"Compare my strategy with this account"*

### Growth Strategy
- *"How can I grow followers organically?"*
- *"What posting schedule works best?"*
- *"Should I focus on Reels or carousel posts?"*

## 🔧 Environment Setup

Create `.env` file:
```env
# Required
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_environment
PINECONE_INDEX=allinone-rag

# Optional (for Instagram data sync)
INSTAGRAM_ACCESS_TOKEN=your_token
FIREBASE_PROJECT_ID=your_project_id
```

## 🚀 Deployment

### Local Development
```bash
npm run dev  # http://localhost:3000
```

### Production
```bash
npm run build && npm start
```

### Docker
```bash
docker build -t instagram-ai .
docker run -p 3000:3000 instagram-ai
```

## 📚 Documentation

- **[Frontend Integration Guide](./FRONTEND_AI_CHAT_GUIDE.md)** - Detailed examples
- **[Instagram URL Analysis](./INSTAGRAM_URL_ANALYSIS.md)** - URL capabilities  
- **[Multimodal Features](./MULTIMODAL_GUIDE.md)** - Image, audio, PDF
- **[API Reference](./API_REFERENCE.md)** - Complete endpoints

## 🎯 Perfect For

- 📱 **Mobile Apps** (iOS/Android)
- 💻 **Web Apps** (React/Vue/Angular)
- 🖥️ **Desktop Apps** (Electron)
- 🔗 **Browser Extensions**
- 📊 **Analytics Dashboards**

---

**Ready to integrate Instagram AI? Check the [Frontend Guide](./FRONTEND_AI_CHAT_GUIDE.md)!** 🚀 