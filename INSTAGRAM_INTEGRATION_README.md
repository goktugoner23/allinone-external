# Instagram Integration System

This document describes the Instagram data integration system that retrieves Instagram content and metrics for your AllInOne app.

## Overview

The Instagram integration system provides:
- **Instagram Basic Display API** integration for fetching posts and account data
- **Comprehensive analytics** with engagement metrics and performance scoring
- **RESTful API endpoints** for your Kotlin app to consume
- **RAG system integration** for AI analysis of Instagram content
- **Real-time data synchronization** capabilities

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Kotlin App    │    │   Backend API    │    │ Instagram API   │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │ Instagram   │◄├────┤ │ Instagram    │◄├────┤ │ Basic       │ │
│ │ Fragment    │ │    │ │ Service      │ │    │ │ Display API │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ └─────────────┘ │
│                 │    │        │         │    │                 │
│ ┌─────────────┐ │    │ ┌──────▼──────┐ │    │ ┌─────────────┐ │
│ │ Analytics   │◄├────┤ │ Analytics   │ │    │ │ Graph API   │ │
│ │ Dashboard   │ │    │ │ Engine      │ │    │ │ (Optional)  │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                       ┌────────▼────────┐
                       │   RAG System    │
                       │                 │
                       │ ┌─────────────┐ │
                       │ │ Instagram   │ │
                       │ │ Documents   │ │
                       │ └─────────────┘ │
                       │                 │
                       │ ┌─────────────┐ │
                       │ │ AI Analysis │ │
                       │ │ & Insights  │ │
                       │ └─────────────┘ │
                       └─────────────────┘
```

## Features

### 🔍 Data Retrieval
- **Account Information**: Username, follower count, media count, account type
- **Posts & Media**: Images, videos, carousels with full metadata
- **⚡ No Artificial Limits**: Fetch ALL available posts (no more 25/50 post limits!)
- **Engagement Metrics**: Likes, comments, saves, shares, reach, impressions
- **Performance Analytics**: Engagement rates, virality scores, reach efficiency

### 📊 Analytics Engine
- **Content Performance Scoring**: Algorithmic scoring based on engagement patterns
- **Benchmarking**: Compare posts against account averages
- **Trend Analysis**: Identify top-performing content types and patterns
- **Growth Metrics**: Track follower and engagement growth over time

### 🤖 AI Integration
- **RAG System**: Store Instagram data for AI analysis
- **Content Analysis**: AI-powered insights about post performance
- **Strategy Recommendations**: AI suggestions for content optimization
- **Natural Language Queries**: Ask questions about Instagram performance

## API Endpoints

**Base URL:**
- **Development**: `http://localhost:3000`
- **Production**: `http://129.212.143.6:3000`

### Firebase Firestore Endpoints (For existing data from your Kotlin app)

#### GET /api/instagram/firestore/posts
Get all Instagram posts from your existing Firestore collection.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "17852414667309615",
      "shortcode": "DD2ivmnO6Tl",
      "caption": "Mükemmel bir seminer oldu...",
      "mediaType": "IMAGE",
      "permalink": "https://www.instagram.com/p/DD2ivmnO6Tl/",
      "timestamp": "2024-12-21T19:31:28+0000",
      "formattedDate": "Dec 21, 2024",
      "metrics": {
        "likesCount": 49,
        "commentsCount": 0,
        "sharesCount": 2,
        "savesCount": 3,
        "reachCount": 1115,
        "impressionsCount": 1453,
        "engagementRate": 4.84,
        "totalInteractions": 54
      },
      "hashtags": ["#ebmas", "#wingchun", "#fyp"],
      "mentions": []
    }
  ],
  "count": 25,
  "source": "Firebase Firestore",
  "timestamp": 1640995200000
}
```

#### GET /api/instagram/firestore/raw
Get raw Instagram data in the same format as your Kotlin app export.

**Response:**
```json
{
  "success": true,
  "posts": [
    {
      "id": "17852414667309615",
      "caption": "Mükemmel bir seminer oldu...",
      "mediaType": "FEED",
      "permalink": "https://www.instagram.com/p/DD2ivmnO6Tl/",
      "timestamp": "2024-12-21T19:31:28+0000",
      "formattedDate": "Dec 21, 2024",
      "metrics": {
        "likes": 49,
        "comments": 0,
        "shares": 2,
        "saved": 3,
        "reach": 1115,
        "views": 1453,
        "total_interactions": 54
      }
    }
  ],
  "metadata": {
    "timestamp": 1640995200000,
    "count": 25,
    "source": "Firebase Firestore"
  }
}
```

#### POST /api/instagram/firestore/sync-to-rag
Sync your existing Firestore Instagram data to the RAG system for AI analysis.

**Response:**
```json
{
  "success": true,
  "data": {
    "lastSyncAt": "2024-01-01T12:00:00.000Z",
    "postsCount": 25,
    "storiesCount": 0,
    "insightsCount": 0,
    "status": "idle",
    "nextSyncAt": "2024-01-01T18:00:00.000Z"
  },
  "message": "Firestore Instagram data sync completed",
  "timestamp": 1640995200000
}
```

#### GET /api/instagram/firestore/health
Check Firebase Firestore connection health.

**Response:**
```json
{
  "success": true,
  "health": {
    "firestore": true,
    "configured": true
  },
  "timestamp": 1640995200000
}
```

### Instagram API Endpoints (For new data from Instagram API)

#### Account Information
```http
GET /api/instagram/account
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "instagram_user_id",
    "username": "your_username",
    "accountType": "BUSINESS",
    "mediaCount": 150,
    "followersCount": 5420,
    "followsCount": 280,
    "biography": "Your bio here",
    "website": "https://yourwebsite.com"
  },
  "timestamp": 1640995200000
}
```

### Posts with Metrics
```http
GET /api/instagram/posts                    # Fetches ALL available posts (no limits!)
GET /api/instagram/posts?limit=25&after=cursor  # Optional limit for testing only
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "post_id",
      "shortcode": "ABC123",
      "caption": "Post caption here...",
      "mediaType": "IMAGE",
      "mediaUrl": "https://instagram.com/image.jpg",
      "permalink": "https://instagram.com/p/ABC123/",
      "timestamp": "2024-01-01T12:00:00Z",
      "username": "your_username",
      "metrics": {
        "likesCount": 245,
        "commentsCount": 18,
        "engagementRate": 4.85,
        "impressionsCount": 5420,
        "reachCount": 4890,
        "savesCount": 32
      },
      "hashtags": ["#fitness", "#motivation"],
      "mentions": ["@friend"]
    }
  ],
  "paging": {
    "cursors": {
      "after": "next_cursor"
    }
  },
  "timestamp": 1640995200000
}
```

### Comprehensive Analytics
```http
GET /api/instagram/analytics                # Analyzes ALL available posts (no limits!)
GET /api/instagram/analytics?postsLimit=50  # Optional limit for testing only
```

**Response:**
```json
{
  "success": true,
  "data": {
    "account": { /* account info */ },
    "posts": [ /* array of posts */ ],
    "contentPerformance": [
      {
        "postId": "post_id",
        "shortcode": "ABC123",
        "publishedAt": "2024-01-01T12:00:00Z",
        "metrics": { /* post metrics */ },
        "performance": {
          "engagementScore": 8.5,
          "viralityScore": 3.2,
          "reachEfficiency": 90.2
        },
        "benchmarks": {
          "avgLikes": 180,
          "avgComments": 12,
          "avgEngagementRate": 3.8
        }
      }
    ],
    "summary": {
      "totalPosts": 50,
      "totalEngagement": 12450,
      "avgEngagementRate": 4.2,
      "topPerformingPost": { /* best post */ },
      "recentGrowth": {
        "followers": 2.5,
        "engagement": 8.1,
        "reach": 5.3
      }
    }
  },
  "timestamp": 1640995200000
}
```

### Health Check
```http
GET /api/instagram/health
```

**Response:**
```json
{
  "success": true,
  "health": {
    "instagram": true,
    "configured": true
  },
  "timestamp": 1640995200000
}
```

## Setup Instructions

### 1. Instagram App Configuration

1. **Create Facebook App**
   - Go to [Facebook Developers](https://developers.facebook.com)
   - Create a new app
   - Add "Instagram Basic Display" product

2. **Configure Instagram Basic Display**
   - Add Instagram Test Users
   - Generate User Access Token
   - Configure Valid OAuth Redirect URIs

3. **Get Required Credentials**
   - App ID
   - App Secret
   - User Access Token
   - User ID

### 2. Environment Variables

Add these to your `.env` file:

```env
# Instagram API Configuration
INSTAGRAM_ACCESS_TOKEN=your_long_lived_access_token
INSTAGRAM_USER_ID=your_instagram_user_id
INSTAGRAM_APP_ID=your_facebook_app_id
INSTAGRAM_APP_SECRET=your_facebook_app_secret
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token
INSTAGRAM_API_VERSION=v18.0
```

### 3. Access Token Management

Instagram access tokens expire. You'll need to:

1. **Generate Long-Lived Tokens** (60 days)
2. **Refresh Tokens** before expiration
3. **Monitor Token Health** through the health endpoint

## Kotlin App Integration

### 1. Update Repository

Add Instagram methods to your repository:

```kotlin
// Instagram API methods
suspend fun getInstagramAccount(): ApiResponse<InstagramAccount>
suspend fun getInstagramPosts(limit: Int = 1000, after: String? = null): ApiResponse<InstagramPostsResponse>  // No artificial limits!
suspend fun getInstagramAnalytics(postsLimit: Int = 1000): ApiResponse<InstagramAnalytics>  // No artificial limits!
suspend fun checkInstagramHealth(): ApiResponse<HealthResponse>
```

### 2. Create Data Classes

```kotlin
data class InstagramAccount(
    val id: String,
    val username: String,
    val accountType: String,
    val mediaCount: Int,
    val followersCount: Int,
    val followsCount: Int,
    val biography: String?,
    val website: String?
)

data class InstagramPost(
    val id: String,
    val shortcode: String,
    val caption: String,
    val mediaType: String,
    val mediaUrl: String,
    val permalink: String,
    val timestamp: String,
    val username: String,
    val metrics: InstagramMetrics,
    val hashtags: List<String>,
    val mentions: List<String>
)

data class InstagramMetrics(
    val likesCount: Int,
    val commentsCount: Int,
    val engagementRate: Double,
    val impressionsCount: Int?,
    val reachCount: Int?,
    val savesCount: Int?
)
```

### 3. Create Instagram Fragment

```kotlin
class InstagramFragment : Fragment() {
    private lateinit var binding: FragmentInstagramBinding
    private lateinit var repository: Repository
    
    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = FragmentInstagramBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupUI()
        loadInstagramData()
    }
    
    private fun loadInstagramData() {
        lifecycleScope.launch {
            try {
                // Load account info
                val accountResponse = repository.getInstagramAccount()
                if (accountResponse.success) {
                    displayAccountInfo(accountResponse.data)
                }
                
                // Load recent posts
                val postsResponse = repository.getInstagramPosts()  // Fetches ALL posts (no limits!)
                if (postsResponse.success) {
                    displayPosts(postsResponse.data.posts)
                }
                
                // Load analytics
                val analyticsResponse = repository.getInstagramAnalytics()
                if (analyticsResponse.success) {
                    displayAnalytics(analyticsResponse.data)
                }
            } catch (e: Exception) {
                showError("Failed to load Instagram data: ${e.message}")
            }
        }
    }
}
```

## RAG System Integration

The Instagram data is automatically processed and stored in the RAG system for AI analysis.

### Document Types Stored:
1. **Account Summary**: Overall account performance and metrics
2. **Individual Posts**: Each post with full context and metrics
3. **Performance Analysis**: Detailed performance breakdowns
4. **Content Insights**: AI-generated insights about content patterns

### AI Analysis Capabilities:
- Content performance analysis
- Engagement pattern recognition
- Optimal posting time suggestions
- Content strategy recommendations
- Audience insight analysis

## Performance Metrics

### Engagement Score Calculation
```
Engagement Score = (Likes + Comments*3 + Saves*5) / Reach * 100
```

### Virality Score Calculation
```
Virality Score = (Shares*10 + Saves*5) / Reach * 100
```

### Reach Efficiency Calculation
```
Reach Efficiency = Reach / Impressions * 100
```

## Error Handling

The system includes comprehensive error handling:

- **API Rate Limiting**: Automatic retry with exponential backoff
- **Token Expiration**: Clear error messages with renewal instructions
- **Network Issues**: Graceful degradation and retry mechanisms
- **Invalid Data**: Validation and sanitization of all inputs

## Security Considerations

- **Access Tokens**: Never log or expose access tokens
- **Rate Limiting**: Respect Instagram API rate limits
- **Data Privacy**: Handle user data according to Instagram's policies
- **Secure Storage**: Store credentials securely in environment variables

## Testing

Run the Instagram integration test:

```bash
# Start the server
npm run dev

# In another terminal, run the test
npx ts-node test-instagram-integration.ts
```

## Troubleshooting

### Common Issues:

1. **"Instagram access token not configured"**
   - Ensure `INSTAGRAM_ACCESS_TOKEN` is set in `.env`
   - Verify the token is valid and not expired

2. **"Failed to fetch Instagram account info"**
   - Check if the access token has the required permissions
   - Verify the Instagram account is properly linked

3. **Rate limiting errors**
   - Instagram API has rate limits
   - Implement proper caching and request throttling

4. **Empty posts array**
   - Ensure the Instagram account has public posts
   - Check if the account type supports the API endpoints

## Next Steps

1. **Set up Instagram App** and get access tokens
2. **Configure environment variables** in your `.env` file
3. **Test the integration** using the provided test script
4. **Update your Kotlin app** to consume the new endpoints
5. **Remove old Instagram logic** from the Kotlin app
6. **Add RAG integration** for AI-powered insights

## Support

For issues with:
- **Instagram API**: Check [Instagram Basic Display API docs](https://developers.facebook.com/docs/instagram-basic-display-api)
- **Backend Integration**: Check the server logs and error responses
- **Kotlin Integration**: Ensure proper API client configuration

The system is designed to be robust and handle various edge cases, but proper setup and configuration are essential for optimal performance. 