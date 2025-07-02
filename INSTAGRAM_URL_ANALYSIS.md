# Instagram URL Analysis Guide

Guide to using the Instagram AI for URL analysis - perfect for building competitor analysis features, profile insights, and content strategy tools.

## 🔗 What URLs Can Be Analyzed?

### Instagram Profiles
```
https://instagram.com/nike
https://instagram.com/username
https://www.instagram.com/profile_name
```

### Individual Posts
```
https://instagram.com/p/ABC123
https://www.instagram.com/p/post_id/
```

### Instagram Reels
```
https://instagram.com/reel/XYZ789
https://www.instagram.com/reel/reel_id/
```

### Stories (if accessible)
```
https://instagram.com/stories/username/story_id
```

## 🚀 Frontend Implementation

### Basic URL Analysis
```javascript
async function analyzeInstagramURL(url) {
  const response = await fetch('/api/rag/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `Analyze this Instagram URL: ${url}`,
      domain: 'instagram'
    })
  });
  
  const data = await response.json();
  return data.data.answer;
}

// Usage
const analysis = await analyzeInstagramURL('https://instagram.com/nike');
console.log(analysis);
```

### React URL Analyzer Component
```tsx
import { useState } from 'react';

export function URLAnalyzer() {
  const [url, setUrl] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  const analyzeURL = async () => {
    if (!url.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `Analyze this Instagram URL and provide strategic insights: ${url}`,
          domain: 'instagram'
        })
      });
      
      const data = await response.json();
      setAnalysis(data.data.answer);
    } catch (error) {
      console.error('Error:', error);
      setAnalysis('Failed to analyze URL. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isValidInstagramURL = (url) => {
    return url.includes('instagram.com') && (
      url.includes('/p/') || 
      url.includes('/reel/') || 
      url.match(/instagram\.com\/[a-zA-Z0-9._]+\/?$/)
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">📱 Instagram URL Analyzer</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instagram URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://instagram.com/username or https://instagram.com/p/post_id"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {url && !isValidInstagramURL(url) && (
              <p className="text-red-500 text-sm mt-1">
                Please enter a valid Instagram URL
              </p>
            )}
          </div>
          
          <button
            onClick={analyzeURL}
            disabled={loading || !isValidInstagramURL(url)}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Analyzing...' : 'Analyze Instagram URL'}
          </button>
          
          {analysis && (
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Analysis Results:</h3>
              <div className="whitespace-pre-wrap text-gray-700">{analysis}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Vue.js URL Analyzer
```vue
<template>
  <div class="url-analyzer">
    <div class="analyzer-card">
      <h2>📱 Instagram URL Analyzer</h2>
      
      <div class="input-section">
        <label>Instagram URL</label>
        <input 
          v-model="url"
          type="url"
          placeholder="https://instagram.com/username"
          :class="{ 'error': url && !isValidURL }"
        />
        <small v-if="url && !isValidURL" class="error-text">
          Please enter a valid Instagram URL
        </small>
      </div>
      
      <button 
        @click="analyzeURL"
        :disabled="loading || !isValidURL"
        class="analyze-btn"
      >
        {{ loading ? 'Analyzing...' : 'Analyze URL' }}
      </button>
      
      <div v-if="analysis" class="results">
        <h3>Analysis Results:</h3>
        <p>{{ analysis }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const url = ref('');
const analysis = ref('');
const loading = ref(false);

const isValidURL = computed(() => {
  if (!url.value) return false;
  return url.value.includes('instagram.com') && (
    url.value.includes('/p/') || 
    url.value.includes('/reel/') || 
    url.value.match(/instagram\.com\/[a-zA-Z0-9._]+\/?$/)
  );
});

const analyzeURL = async () => {
  loading.value = true;
  try {
    const response = await fetch('/api/rag/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `Analyze this Instagram URL: ${url.value}`,
        domain: 'instagram'
      })
    });
    
    const data = await response.json();
    analysis.value = data.data.answer;
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.url-analyzer {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.analyzer-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.input-section {
  margin: 16px 0;
}

.input-section label {
  display: block;
  font-weight: 500;
  margin-bottom: 8px;
}

.input-section input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
}

.input-section input.error {
  border-color: #ef4444;
}

.error-text {
  color: #ef4444;
  font-size: 12px;
}

.analyze-btn {
  width: 100%;
  background: #3b82f6;
  color: white;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
}

.analyze-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.results {
  margin-top: 20px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}
</style>
```

## 💡 Analysis Types & Use Cases

### Profile Analysis
```javascript
const profileQueries = [
  "Analyze this Instagram profile and give me insights about their content strategy",
  "What can I learn from this account's posting patterns?",
  "Compare this profile's engagement with industry standards",
  "What content themes does this account focus on?"
];
```

### Post Performance Analysis
```javascript
const postQueries = [
  "Why did this post perform well? What can I learn from it?",
  "Analyze the engagement on this Instagram post",
  "What hashtags and content strategy made this post successful?",
  "How can I create similar content to this viral post?"
];
```

### Competitive Analysis
```javascript
const competitorQueries = [
  "Compare this competitor's content strategy with best practices",
  "What are this account's strengths and weaknesses?",
  "How often does this competitor post and what times?",
  "What type of content gets the most engagement for this account?"
];
```

## 🎨 UI Patterns for URL Analysis

### URL Preview Card
```jsx
function URLPreviewCard({ url }) {
  const getURLType = (url) => {
    if (url.includes('/p/')) return { type: 'Post', icon: '📷' };
    if (url.includes('/reel/')) return { type: 'Reel', icon: '🎬' };
    return { type: 'Profile', icon: '👤' };
  };

  const urlInfo = getURLType(url);

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
      <div className="flex items-center space-x-3">
        <span className="text-2xl">{urlInfo.icon}</span>
        <div>
          <h4 className="font-medium text-purple-900">Instagram {urlInfo.type}</h4>
          <p className="text-sm text-purple-600 truncate">{url}</p>
        </div>
      </div>
    </div>
  );
}
```

### Analysis Results Display
```jsx
function AnalysisResults({ analysis, loading }) {
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="bg-white border rounded-lg p-6 mt-4">
      <div className="flex items-center mb-4">
        <span className="text-xl mr-2">🎯</span>
        <h3 className="text-lg font-semibold">Strategic Analysis</h3>
      </div>
      
      <div className="prose prose-sm max-w-none">
        <div className="whitespace-pre-wrap text-gray-700">
          {analysis}
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button 
          onClick={() => navigator.clipboard.writeText(analysis)}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
        >
          📋 Copy Analysis
        </button>
      </div>
    </div>
  );
}
```

### Quick URL Actions
```jsx
function QuickURLActions({ onAnalyze }) {
  const sampleURLs = [
    { name: 'Nike', url: 'https://instagram.com/nike' },
    { name: 'Apple', url: 'https://instagram.com/apple' },
    { name: 'National Geographic', url: 'https://instagram.com/natgeo' },
    { name: 'Gary Vaynerchuk', url: 'https://instagram.com/garyvee' }
  ];

  return (
    <div className="mb-4">
      <p className="text-sm text-gray-600 mb-2">Try analyzing these popular accounts:</p>
      <div className="flex flex-wrap gap-2">
        {sampleURLs.map((sample, index) => (
          <button
            key={index}
            onClick={() => onAnalyze(sample.url)}
            className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition-colors"
          >
            {sample.name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

## 📊 Expected Analysis Output

When you analyze an Instagram URL, the AI provides insights like:

### Profile Analysis
- **Content Strategy Overview**
- **Posting Frequency & Timing**
- **Engagement Rate Analysis**
- **Top Performing Content Types**
- **Hashtag Strategy**
- **Brand Voice & Messaging**
- **Growth Recommendations**

### Post Analysis
- **Why It Performed Well/Poorly**
- **Content Type & Format Analysis**
- **Hashtag Effectiveness**
- **Timing & Audience Insights**
- **Visual Style Assessment**
- **Call-to-Action Analysis**
- **Lessons for Your Strategy**

## 🔧 Advanced Features

### Bulk URL Analysis
```javascript
async function analyzeBulkURLs(urls) {
  const results = [];
  
  for (const url of urls) {
    try {
      const analysis = await analyzeInstagramURL(url);
      results.push({ url, analysis, success: true });
    } catch (error) {
      results.push({ url, error: error.message, success: false });
    }
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return results;
}
```

### URL Validation
```javascript
function validateInstagramURL(url) {
  const patterns = [
    /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?$/,  // Profile
    /^https?:\/\/(www\.)?instagram\.com\/p\/[a-zA-Z0-9_-]+\/?$/, // Post
    /^https?:\/\/(www\.)?instagram\.com\/reel\/[a-zA-Z0-9_-]+\/?$/, // Reel
  ];
  
  return patterns.some(pattern => pattern.test(url));
}
```

### Analysis History
```javascript
// Save analysis to localStorage
function saveAnalysis(url, analysis) {
  const history = JSON.parse(localStorage.getItem('url-analysis-history') || '[]');
  history.unshift({
    url,
    analysis,
    timestamp: Date.now(),
    id: Date.now().toString()
  });
  
  // Keep only last 50 analyses
  if (history.length > 50) {
    history.splice(50);
  }
  
  localStorage.setItem('url-analysis-history', JSON.stringify(history));
}

// Load analysis history
function loadAnalysisHistory() {
  return JSON.parse(localStorage.getItem('url-analysis-history') || '[]');
}
```

## 🚀 Production Tips

1. **Validate URLs** before sending to API
2. **Show URL previews** to users for better UX
3. **Cache analysis results** to avoid re-analyzing same URLs
4. **Handle rate limiting** with appropriate delays
5. **Provide sample URLs** for users to try
6. **Show loading states** during analysis
7. **Allow copying/sharing** analysis results
8. **Store analysis history** for user reference

---

**Ready to build Instagram URL analysis features? Use these examples to get started!** 🚀 