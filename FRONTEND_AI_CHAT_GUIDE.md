# Frontend Instagram AI Integration Guide

Quick guide to integrate Instagram AI chat into your frontend applications.

## 🚀 Basic Setup

```javascript
async function askInstagramAI(question) {
  const response = await fetch('http://localhost:3000/api/rag/query', {
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

// Usage
const advice = await askInstagramAI("How can I improve my Instagram engagement?");
```

## 📱 React Chat Component

```tsx
import { useState } from 'react';

export function InstagramAIChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: input,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    
    try {
      const response = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input, domain: 'instagram' })
      });
      
      const data = await response.json();
      
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: data.data.answer,
        isUser: false,
        timestamp: new Date()
      }]);
      
      setInput('');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto h-96 flex flex-col border rounded-lg">
      <div className="bg-purple-500 text-white p-4 rounded-t-lg">
        <h2>📱 Instagram AI Assistant</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs px-4 py-2 rounded-lg ${
              message.isUser ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}>
              <p>{message.text}</p>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about Instagram strategy..."
            className="flex-1 border rounded-lg px-3 py-2"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

## 🌐 Vue.js Example

```vue
<template>
  <div class="instagram-ai-chat">
    <div class="header">
      <h2>📱 Instagram AI</h2>
    </div>
    
    <div class="messages">
      <div v-for="message in messages" :key="message.id" 
           :class="['message', message.isUser ? 'user' : 'ai']">
        <p>{{ message.text }}</p>
      </div>
      
      <div v-if="loading" class="typing">AI is thinking...</div>
    </div>
    
    <div class="input-area">
      <input v-model="currentMessage" 
             @keyup.enter="sendMessage"
             placeholder="Ask about Instagram..." />
      <button @click="sendMessage">Send</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const messages = ref([]);
const currentMessage = ref('');
const loading = ref(false);

const sendMessage = async () => {
  if (!currentMessage.value.trim()) return;
  
  messages.value.push({
    id: Date.now(),
    text: currentMessage.value,
    isUser: true
  });
  
  loading.value = true;
  
  try {
    const response = await fetch('/api/rag/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: currentMessage.value,
        domain: 'instagram'
      })
    });
    
    const data = await response.json();
    
    messages.value.push({
      id: Date.now() + 1,
      text: data.data.answer,
      isUser: false
    });
    
    currentMessage.value = '';
  } finally {
    loading.value = false;
  }
};
</script>
```

## 📱 Flutter Example

```dart
class InstagramAIChat extends StatefulWidget {
  @override
  _InstagramAIChatState createState() => _InstagramAIChatState();
}

class _InstagramAIChatState extends State<InstagramAIChat> {
  final List<ChatMessage> _messages = [];
  final TextEditingController _controller = TextEditingController();
  bool _loading = false;

  Future<void> _sendMessage(String text) async {
    setState(() {
      _messages.add(ChatMessage(text: text, isUser: true));
      _loading = true;
    });

    try {
      final response = await http.post(
        Uri.parse('http://localhost:3000/api/rag/query'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'query': text, 'domain': 'instagram'}),
      );

      final data = jsonDecode(response.body);
      setState(() {
        _messages.add(ChatMessage(text: data['data']['answer'], isUser: false));
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('📱 Instagram AI')),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              itemCount: _messages.length,
              itemBuilder: (context, index) => _buildMessage(_messages[index]),
            ),
          ),
          _buildInput(),
        ],
      ),
    );
  }
}
```

## 💡 Common Questions

### Content Strategy
- "What type of content gets the most engagement?"
- "How can I optimize my Instagram Reels?"
- "What hashtags should I use for fitness content?"

### URL Analysis
- "Analyze this profile: https://instagram.com/nike"
- "What can I learn from this viral post?"

### Performance
- "Why did my recent post underperform?"
- "What's my average engagement rate?"

## 🔧 API Format

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
    "answer": "AI response with Instagram advice...",
    "confidence": 0.95,
    "metadata": {
      "conversationMode": "advisory_with_data",
      "processingTime": 3500
    }
  }
}
```

## 🚀 Production Tips

1. **Always use `domain: "instagram"`** for Instagram responses
2. **Handle loading states** for better UX
3. **Show error messages** when requests fail
4. **Validate URLs** before analysis
5. **Auto-scroll** to new messages
6. **Cache responses** to reduce API calls

---

**Ready to integrate Instagram AI? Start with these examples!** 🚀 