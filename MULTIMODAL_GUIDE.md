# Multimodal Instagram AI Guide

Guide to using the Instagram AI for processing images, audio, PDFs, and other content types - perfect for comprehensive Instagram analysis features.

## 🎨 What Content Can Be Analyzed?

### Images
- **Instagram Screenshots** - Profile screenshots, post images
- **Competitor Analysis** - Visual content analysis
- **Brand Logos & Graphics** - Visual identity analysis
- **Performance Charts** - Analytics screenshots

### Audio
- **Reel Audio** - Trending sounds and music analysis
- **Voice Memos** - Strategy discussions and ideas
- **Podcast Clips** - Instagram marketing insights
- **Audio Transcriptions** - Convert speech to strategy text

### PDFs
- **Analytics Reports** - Instagram Insights exports
- **Strategy Documents** - Marketing plans and guides
- **Research Papers** - Industry trend reports
- **Competitor Analysis** - Detailed competitor studies

### URLs
- **Instagram URLs** - Profiles, posts, reels analysis
- **Blog Articles** - Instagram marketing content
- **News Articles** - Industry trends and updates
- **Competitor Websites** - Brand analysis

## 🚀 Frontend Implementation

### Basic Multimodal Query
```javascript
async function analyzeContent(content, contentType) {
  const response = await fetch('/api/rag/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `Analyze this ${contentType} for Instagram insights: ${content}`,
      domain: 'instagram'
    })
  });
  
  const data = await response.json();
  return data.data.answer;
}

// Usage examples
const imageAnalysis = await analyzeContent('https://example.com/image.jpg', 'image');
const audioAnalysis = await analyzeContent('audio file content', 'audio');
const pdfAnalysis = await analyzeContent('PDF text content', 'PDF document');
```

### React Multimodal Analyzer
```tsx
import { useState } from 'react';

export function MultimodalAnalyzer() {
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState('text');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  const analyzeContent = async () => {
    if (!content.trim()) return;
    
    setLoading(true);
    try {
      const query = getAnalysisQuery(content, contentType);
      
      const response = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          domain: 'instagram'
        })
      });
      
      const data = await response.json();
      setAnalysis(data.data.answer);
    } catch (error) {
      console.error('Error:', error);
      setAnalysis('Failed to analyze content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getAnalysisQuery = (content, type) => {
    const queries = {
      'image': `Analyze this Instagram-related image and provide strategic insights: ${content}`,
      'audio': `Analyze this audio content for Instagram strategy insights: ${content}`,
      'pdf': `Analyze this PDF document for Instagram marketing insights: ${content}`,
      'url': `Analyze this URL for Instagram strategy lessons: ${content}`,
      'text': `Provide Instagram strategy insights for: ${content}`
    };
    
    return queries[type] || queries['text'];
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const fileType = getFileType(file.type);
      setContentType(fileType);
      
      if (fileType === 'image') {
        const imageUrl = URL.createObjectURL(file);
        setContent(imageUrl);
      } else {
        // For other file types, you'd typically upload to a server first
        setContent(`Uploaded ${file.name}`);
      }
    }
  };

  const getFileType = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    return 'text';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">🎨 Multimodal Instagram AI</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Type
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Text/URL</option>
                <option value="image">Image</option>
                <option value="audio">Audio</option>
                <option value="pdf">PDF Document</option>
              </select>
            </div>
            
            {contentType === 'text' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content or URL
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter text, Instagram URL, or any URL to analyze..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            
            {contentType !== 'text' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
                </label>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept={getAcceptType(contentType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                {content && (
                  <p className="text-sm text-gray-600 mt-1">
                    File ready for analysis
                  </p>
                )}
              </div>
            )}
            
            <button
              onClick={analyzeContent}
              disabled={loading || !content.trim()}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Analyzing...' : `Analyze ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`}
            </button>
          </div>
          
          {/* Preview Section */}
          <div>
            <h3 className="text-lg font-medium mb-4">Content Preview</h3>
            
            {contentType === 'image' && content && (
              <img 
                src={content} 
                alt="Preview" 
                className="w-full h-48 object-cover rounded-lg border"
              />
            )}
            
            {contentType === 'text' && content && (
              <div className="bg-gray-50 p-4 rounded-lg border h-48 overflow-y-auto">
                <p className="text-sm text-gray-700">{content}</p>
              </div>
            )}
            
            {(contentType === 'audio' || contentType === 'pdf') && content && (
              <div className="bg-gray-50 p-4 rounded-lg border h-48 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">
                    {contentType === 'audio' ? '🎵' : '📄'}
                  </div>
                  <p className="text-sm text-gray-600">{content}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {analysis && (
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">🎯 Analysis Results:</h3>
            <div className="whitespace-pre-wrap text-gray-700">{analysis}</div>
          </div>
        )}
      </div>
    </div>
  );

  function getAcceptType(type) {
    const accepts = {
      'image': 'image/*',
      'audio': 'audio/*',
      'pdf': 'application/pdf'
    };
    return accepts[type] || '*/*';
  }
}
```

### Vue.js Multimodal Component
```vue
<template>
  <div class="multimodal-analyzer">
    <div class="analyzer-card">
      <h2>🎨 Multimodal Instagram AI</h2>
      
      <div class="content-grid">
        <div class="input-section">
          <div class="form-group">
            <label>Content Type</label>
            <select v-model="contentType">
              <option value="text">Text/URL</option>
              <option value="image">Image</option>
              <option value="audio">Audio</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          
          <div v-if="contentType === 'text'" class="form-group">
            <label>Content or URL</label>
            <textarea 
              v-model="content"
              placeholder="Enter text or URL to analyze..."
              rows="4"
            ></textarea>
          </div>
          
          <div v-else class="form-group">
            <label>Upload {{ contentType }}</label>
            <input 
              type="file" 
              @change="handleFileUpload"
              :accept="getAcceptType(contentType)"
            />
          </div>
          
          <button 
            @click="analyzeContent"
            :disabled="loading || !content"
            class="analyze-btn"
          >
            {{ loading ? 'Analyzing...' : `Analyze ${contentType}` }}
          </button>
        </div>
        
        <div class="preview-section">
          <h3>Content Preview</h3>
          
          <div v-if="contentType === 'image' && content" class="image-preview">
            <img :src="content" alt="Preview" />
          </div>
          
          <div v-else-if="contentType === 'text' && content" class="text-preview">
            <p>{{ content }}</p>
          </div>
          
          <div v-else-if="content" class="file-preview">
            <div class="file-icon">
              {{ contentType === 'audio' ? '🎵' : '📄' }}
            </div>
            <p>{{ content }}</p>
          </div>
        </div>
      </div>
      
      <div v-if="analysis" class="results">
        <h3>🎯 Analysis Results:</h3>
        <div class="analysis-content">{{ analysis }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const contentType = ref('text');
const content = ref('');
const analysis = ref('');
const loading = ref(false);

const analyzeContent = async () => {
  loading.value = true;
  try {
    const query = getAnalysisQuery(content.value, contentType.value);
    
    const response = await fetch('/api/rag/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        domain: 'instagram'
      })
    });
    
    const data = await response.json();
    analysis.value = data.data.answer;
  } finally {
    loading.value = false;
  }
};

const getAnalysisQuery = (content, type) => {
  const queries = {
    'image': `Analyze this Instagram-related image: ${content}`,
    'audio': `Analyze this audio for Instagram insights: ${content}`,
    'pdf': `Analyze this PDF for Instagram marketing insights: ${content}`,
    'text': `Provide Instagram strategy insights for: ${content}`
  };
  
  return queries[type] || queries['text'];
};

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    if (contentType.value === 'image') {
      content.value = URL.createObjectURL(file);
    } else {
      content.value = `Uploaded ${file.name}`;
    }
  }
};

const getAcceptType = (type) => {
  const accepts = {
    'image': 'image/*',
    'audio': 'audio/*',
    'pdf': 'application/pdf'
  };
  return accepts[type] || '*/*';
};
</script>

<style scoped>
.multimodal-analyzer {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.analyzer-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin: 20px 0;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 8px;
}

.form-group select,
.form-group textarea,
.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
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

.preview-section h3 {
  margin-bottom: 16px;
  font-weight: 600;
}

.image-preview img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.text-preview {
  background: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #ddd;
  height: 200px;
  overflow-y: auto;
}

.file-preview {
  background: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #ddd;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.file-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.results {
  margin-top: 24px;
  padding: 20px;
  background: #f9fafb;
  border-radius: 8px;
}

.analysis-content {
  white-space: pre-wrap;
  color: #374151;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
```

## 💡 Analysis Types & Use Cases

### Image Analysis Queries
```javascript
const imageQueries = [
  "Analyze this Instagram screenshot and suggest improvements",
  "What can I learn from this competitor's visual strategy?",
  "How can I improve my Instagram aesthetic based on this image?",
  "Analyze the engagement and visual appeal of this post",
  "What Instagram trends are visible in this image?"
];
```

### Audio Analysis Queries
```javascript
const audioQueries = [
  "Transcribe this audio and provide Instagram strategy insights",
  "What Instagram trends are mentioned in this audio?",
  "Analyze this trending sound for my Reels strategy",
  "Extract Instagram marketing tips from this audio content",
  "How can I use these audio insights for my Instagram growth?"
];
```

### PDF Analysis Queries
```javascript
const pdfQueries = [
  "Analyze this Instagram analytics report and provide insights",
  "Extract key Instagram strategies from this marketing document",
  "What actionable Instagram tips are in this research paper?",
  "Summarize this Instagram guide for quick implementation",
  "Convert these analytics into Instagram growth strategies"
];
```

## 🎨 UI Components for Multimodal

### File Upload Component
```jsx
function FileUploader({ onFileSelect, acceptType, contentType }) {
  const [dragActive, setDragActive] = useState(false);
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        dragActive 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <div className="space-y-4">
        <div className="text-4xl">
          {contentType === 'image' && '🖼️'}
          {contentType === 'audio' && '🎵'}
          {contentType === 'pdf' && '📄'}
        </div>
        
        <div>
          <p className="text-lg font-medium text-gray-700">
            Drop your {contentType} here
          </p>
          <p className="text-sm text-gray-500">
            or click to browse files
          </p>
        </div>
        
        <input
          type="file"
          accept={acceptType}
          onChange={handleChange}
          className="hidden"
          id="file-upload"
        />
        
        <label
          htmlFor="file-upload"
          className="inline-block bg-blue-500 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-600"
        >
          Choose File
        </label>
      </div>
    </div>
  );
}
```

### Content Type Selector
```jsx
function ContentTypeSelector({ selectedType, onTypeChange }) {
  const contentTypes = [
    { id: 'text', name: 'Text/URL', icon: '📝', description: 'URLs, text content' },
    { id: 'image', name: 'Image', icon: '🖼️', description: 'Screenshots, photos' },
    { id: 'audio', name: 'Audio', icon: '🎵', description: 'Voice memos, sounds' },
    { id: 'pdf', name: 'PDF', icon: '📄', description: 'Reports, documents' }
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {contentTypes.map((type) => (
        <button
          key={type.id}
          onClick={() => onTypeChange(type.id)}
          className={`p-4 rounded-lg border-2 transition-colors text-left ${
            selectedType === type.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start space-x-3">
            <span className="text-2xl">{type.icon}</span>
            <div>
              <h3 className="font-medium text-gray-900">{type.name}</h3>
              <p className="text-sm text-gray-500">{type.description}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
```

### Analysis Display Component
```jsx
function MultimodalAnalysisDisplay({ analysis, contentType, originalContent }) {
  const [copied, setCopied] = useState(false);

  const copyAnalysis = async () => {
    await navigator.clipboard.writeText(analysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-xl">🎯</span>
          <h3 className="text-lg font-semibold">
            {contentType.charAt(0).toUpperCase() + contentType.slice(1)} Analysis
          </h3>
        </div>
        
        <button
          onClick={copyAnalysis}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
        >
          <span>{copied ? '✅' : '📋'}</span>
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      
      <div className="prose prose-sm max-w-none">
        <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
          {analysis}
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Analysis generated for {contentType} content • Powered by Instagram AI
        </p>
      </div>
    </div>
  );
}
```

## 🚀 Production Features

### File Size Validation
```javascript
function validateFile(file, maxSize = 10 * 1024 * 1024) { // 10MB default
  if (file.size > maxSize) {
    throw new Error(`File size must be less than ${maxSize / 1024 / 1024}MB`);
  }
  
  const allowedTypes = {
    'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    'audio': ['audio/mpeg', 'audio/wav', 'audio/ogg'],
    'pdf': ['application/pdf']
  };
  
  const contentType = getContentType(file.type);
  if (allowedTypes[contentType] && !allowedTypes[contentType].includes(file.type)) {
    throw new Error(`Invalid file type for ${contentType}`);
  }
  
  return true;
}
```

### Progress Tracking
```javascript
function useUploadProgress() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  
  const uploadWithProgress = async (file, onSuccess) => {
    setUploading(true);
    setProgress(0);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + Math.random() * 20;
      });
    }, 200);
    
    try {
      // Your actual upload logic here
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setProgress(100);
      setTimeout(() => {
        onSuccess(file);
        setUploading(false);
        setProgress(0);
      }, 500);
    } catch (error) {
      setUploading(false);
      setProgress(0);
      throw error;
    }
  };
  
  return { progress, uploading, uploadWithProgress };
}
```

## 🎯 Best Practices

1. **Validate file types and sizes** before upload
2. **Show upload progress** for better UX
3. **Provide content previews** when possible
4. **Cache analysis results** to avoid re-processing
5. **Handle large files** with chunked uploads
6. **Show clear error messages** for unsupported formats
7. **Optimize images** before analysis to reduce processing time
8. **Provide sample content** for users to try

---

**Ready to build multimodal Instagram AI features? Use these examples to get started!** 🚀 