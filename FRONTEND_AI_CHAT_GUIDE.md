# Frontend AI Chat Integration Guide

## Overview

This guide provides everything you need to integrate AI-powered Instagram analytics chat into your frontend application. The AI can analyze Instagram data and answer questions about post performance, engagement strategies, content optimization, and more.

**✨ Latest Updates (December 2024):**
- **Thumbnail URLs**: All Instagram posts now include thumbnail URLs for rich media display
- **Complete Media Data**: Both `mediaUrl` and `thumbnailUrl` fields available in AI responses
- **Enhanced Visual Experience**: Show post thumbnails alongside AI analysis

## 🤖 AI Chat Endpoint

### **Base URL**
```
http://129.212.143.6:3000/api/rag/query
```

### **Method**
```
POST
```

### **Content-Type**
```
application/json
```

## 📝 Request Format

### **Request Body**
```json
{
  "query": "What are my most engaging Instagram posts?",
  "domain": "instagram",
  "options": {
    "topK": 5,
    "minScore": 0.7
  }
}
```

### **Parameters**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | ✅ | - | User's question (1-2000 characters) |
| `domain` | string | ❌ | `"general"` | Always use `"instagram"` for Instagram data |
| `options.topK` | number | ❌ | `5` | Number of posts to analyze (1-20) |
| `options.minScore` | number | ❌ | `0.7` | Relevance threshold (0.0-1.0) |

## 📊 Response Format

### **Success Response**
```json
{
  "success": true,
  "data": {
    "answer": "Based on your Instagram data, your most engaging posts are...",
    "sources": [
      {
        "id": "instagram-post-123",
        "score": 0.95,
        "content": "Post content snippet...",
        "metadata": {
          "postId": "123",
          "likesCount": 450,
          "commentsCount": 32,
          "engagementRate": 8.5,
          "mediaType": "VIDEO",
          "mediaUrl": "https://scontent.cdninstagram.com/o1/v/...",
          "thumbnailUrl": "https://scontent.cdninstagram.com/v/t51.71878-15/...",
          "timestamp": "2024-01-01T12:00:00Z",
          "hashtags": ["#fitness", "#motivation"]
        }
      }
    ],
    "confidence": 0.92,
    "processingTime": 1250,
    "metadata": {
      "originalQuery": "What are my most engaging Instagram posts?",
      "totalMatches": 5
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### **Error Response**
```json
{
  "success": false,
  "error": "Failed to process RAG query",
  "code": "RAG_QUERY_FAILED",
  "timestamp": 1640995200000
}
```

## 📱 Android Implementation

### **1. Retrofit Interface**
```kotlin
interface AIService {
    @POST("api/rag/query")
    suspend fun askAI(@Body request: AIQueryRequest): Response<AIQueryResponse>
}
```

### **2. Data Classes**
```kotlin
data class AIQueryRequest(
    val query: String,
    val domain: String = "instagram",
    val options: QueryOptions? = null
)

data class QueryOptions(
    val topK: Int = 5,
    val minScore: Double = 0.7
)

data class AIQueryResponse(
    val success: Boolean,
    val data: AIResult?,
    val error: String?,
    val timestamp: String
)

data class AIResult(
    val answer: String,
    val sources: List<AISource>,
    val confidence: Double,
    val processingTime: Long,
    val metadata: AIMetadata
)

data class AISource(
    val id: String,
    val score: Double,
    val content: String,
    val metadata: AISourceMetadata
)

data class AISourceMetadata(
    val postId: String?,
    val likesCount: Int?,
    val commentsCount: Int?,
    val engagementRate: Double?,
    val mediaType: String?,
    val mediaUrl: String?,           // Video/image URL
    val thumbnailUrl: String?,       // Thumbnail URL (available for all posts)
    val timestamp: String?,
    val hashtags: List<String>?
)

data class AIMetadata(
    val originalQuery: String,
    val totalMatches: Int
)
```

### **3. Repository Class**
```kotlin
class AIRepository @Inject constructor(
    private val apiService: AIService
) {
    suspend fun askAboutInstagram(
        question: String,
        topK: Int = 5,
        minScore: Double = 0.7
    ): Result<AIQueryResponse> {
        return try {
            val request = AIQueryRequest(
                query = question,
                domain = "instagram",
                options = QueryOptions(topK = topK, minScore = minScore)
            )
            
            val response = apiService.askAI(request)
            
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("API Error: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

### **4. ViewModel**
```kotlin
class AIViewModel @Inject constructor(
    private val aiRepository: AIRepository
) : ViewModel() {
    
    private val _chatMessages = MutableStateFlow<List<ChatMessage>>(emptyList())
    val chatMessages = _chatMessages.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading = _isLoading.asStateFlow()
    
    fun askQuestion(question: String) {
        viewModelScope.launch {
            _isLoading.value = true
            
            // Add user message
            val userMessage = ChatMessage(
                text = question,
                isUser = true,
                timestamp = System.currentTimeMillis()
            )
            _chatMessages.value = _chatMessages.value + userMessage
            
            // Get AI response
            aiRepository.askAboutInstagram(question).fold(
                onSuccess = { response ->
                    if (response.success && response.data != null) {
                        val aiMessage = ChatMessage(
                            text = response.data.answer,
                            isUser = false,
                            timestamp = System.currentTimeMillis(),
                            sources = response.data.sources,
                            confidence = response.data.confidence
                        )
                        _chatMessages.value = _chatMessages.value + aiMessage
                    } else {
                        handleError(response.error ?: "Unknown error")
                    }
                },
                onFailure = { exception ->
                    handleError(exception.message ?: "Network error")
                }
            )
            
            _isLoading.value = false
        }
    }
    
    private fun handleError(error: String) {
        val errorMessage = ChatMessage(
            text = "Sorry, I couldn't process your question. $error",
            isUser = false,
            timestamp = System.currentTimeMillis(),
            isError = true
        )
        _chatMessages.value = _chatMessages.value + errorMessage
    }
}

data class ChatMessage(
    val text: String,
    val isUser: Boolean,
    val timestamp: Long,
    val sources: List<AISource>? = null,
    val confidence: Double? = null,
    val isError: Boolean = false
)
```

### **5. Compose UI Example**
```kotlin
@Composable
fun AIChatScreen(
    viewModel: AIViewModel = hiltViewModel()
) {
    val messages by viewModel.chatMessages.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var currentQuestion by remember { mutableStateOf("") }
    
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        // Chat messages
        LazyColumn(
            modifier = Modifier.weight(1f),
            reverseLayout = true
        ) {
            items(messages.reversed()) { message ->
                ChatMessageItem(message = message)
            }
        }
        
        // Input area
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = currentQuestion,
                onValueChange = { currentQuestion = it },
                label = { Text("Ask about your Instagram...") },
                modifier = Modifier.weight(1f),
                enabled = !isLoading
            )
            
            Spacer(modifier = Modifier.width(8.dp))
            
            Button(
                onClick = {
                    if (currentQuestion.isNotBlank()) {
                        viewModel.askQuestion(currentQuestion)
                        currentQuestion = ""
                    }
                },
                enabled = !isLoading && currentQuestion.isNotBlank()
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp))
                } else {
                    Text("Ask")
                }
            }
        }
        
        // Suggested questions
        SuggestedQuestions { question ->
            currentQuestion = question
        }
    }
}
```

## 💬 Example Questions

### **📊 Performance Analysis**
```json
{
  "query": "What are my best performing Instagram posts?",
  "domain": "instagram"
}
```

```json
{
  "query": "Which posts have the highest engagement rate?",
  "domain": "instagram"
}
```

```json
{
  "query": "What's my average engagement rate this month?",
  "domain": "instagram"
}
```

### **🏷️ Content Strategy**
```json
{
  "query": "Which hashtags work best for my content?",
  "domain": "instagram"
}
```

```json
{
  "query": "What type of content gets the most engagement?",
  "domain": "instagram"
}
```

```json
{
  "query": "Should I post more videos or photos?",
  "domain": "instagram"
}
```

### **📈 Growth Insights**
```json
{
  "query": "How can I improve my Instagram engagement?",
  "domain": "instagram"
}
```

```json
{
  "query": "What content should I post more of?",
  "domain": "instagram"
}
```

```json
{
  "query": "When is the best time to post for engagement?",
  "domain": "instagram"
}
```

### **🎯 Specific Analysis**
```json
{
  "query": "Analyze my martial arts content performance",
  "domain": "instagram"
}
```

```json
{
  "query": "How do my video posts compare to photo posts?",
  "domain": "instagram"
}
```

```json
{
  "query": "What's the engagement on my recent fitness posts?",
  "domain": "instagram"
}
```

## �� UI/UX Suggestions

### **1. Suggested Questions**
```kotlin
val suggestedQuestions = listOf(
    "What are my best performing posts?",
    "Which hashtags work best?",
    "How can I improve engagement?",
    "What content type performs best?",
    "Analyze my recent posts",
    "What's my engagement trend?"
)
```

### **2. Quick Action Buttons**
```kotlin
val quickActions = listOf(
    QuickAction("📊", "Performance Summary", "Give me a summary of my Instagram performance"),
    QuickAction("🏷️", "Best Hashtags", "What hashtags work best for my content?"),
    QuickAction("📈", "Growth Tips", "How can I grow my Instagram engagement?"),
    QuickAction("🎥", "Content Strategy", "What type of content should I post more?")
)
```

### **3. Message Types**
- **User Messages**: Right-aligned, blue background
- **AI Messages**: Left-aligned, gray background
- **Loading**: Show typing indicator
- **Error Messages**: Red accent color
- **Source Citations**: Expandable cards showing analyzed posts

## 🧪 Testing

### **cURL Test**
```bash
curl -X POST http://129.212.143.6:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are my most engaging posts?",
    "domain": "instagram",
    "options": {
      "topK": 5,
      "minScore": 0.7
    }
  }'
```

## 🚀 Features The AI Can Handle

### **✅ Available Data**
- Post engagement metrics (likes, comments, shares)
- Hashtag performance and analysis
- Content type performance (video vs photo)
- Publishing timing analysis
- Caption and content analysis
- Performance trends and comparisons
- Audience engagement patterns

### **✅ Supported Query Types**
- Performance analysis questions
- Content strategy recommendations
- Hashtag optimization advice
- Engagement improvement tips
- Posting time recommendations
- Content type comparisons
- Trend analysis
- Specific post analysis

### **✅ Response Features**
- Natural language answers
- Source citations with post details
- Confidence scores
- Processing time metrics
- Relevant post examples
- Actionable recommendations

## 📊 Response Quality

- **High Confidence (0.8-1.0)**: Very relevant and accurate answers
- **Medium Confidence (0.6-0.8)**: Good answers with some uncertainty
- **Low Confidence (0.4-0.6)**: Limited relevant data found
- **Very Low Confidence (<0.4)**: Insufficient data for reliable answer

Your AI assistant is ready to help optimize your Instagram strategy! 🎉
