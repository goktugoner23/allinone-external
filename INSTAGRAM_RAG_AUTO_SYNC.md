# Instagram RAG Auto-Sync System

## Overview

The Instagram RAG Auto-Sync system automatically feeds new Instagram data to the RAG (Retrieval-Augmented Generation) system whenever Firestore data is updated. This ensures that the RAG system always has the latest Instagram content for AI analysis and querying.

## How It Works

### Automatic Sync Flow
1. **Data Update**: Instagram data gets updated (new posts, metrics, etc.)
2. **Firestore Update**: Data is saved to Firestore
3. **Auto RAG Sync**: System automatically syncs updated Firestore data to RAG
4. **Ready for AI**: RAG system now has the latest data for queries

### Key Components

#### 1. Instagram Pipeline Auto-Sync
The `InstagramPipeline` class now automatically syncs to RAG after any Firestore update:

- **New Posts**: When new Instagram posts are stored in Firestore
- **Metrics Updates**: When post metrics are updated from Instagram API
- **Analytics Updates**: When analytics summaries are refreshed

#### 2. Auto-Sync Configuration
- **Default**: Auto-sync is **enabled** by default
- **Control**: Can be enabled/disabled via API endpoint
- **Smart Sync**: Only syncs when Firestore data actually changes

## API Endpoints

### Control Auto-Sync

#### Enable/Disable Auto-Sync
```http
POST /api/instagram/rag/auto-sync?enabled=true
```

**Parameters:**
- `enabled` (boolean, query): `true` to enable, `false` to disable

**Response:**
```json
{
  "success": true,
  "message": "Automatic RAG sync enabled",
  "data": {
    "autoSyncEnabled": true,
    "timestamp": "2024-01-01T12:00:00.000Z"
  },
  "timestamp": 1640995200000
}
```

#### Check Auto-Sync Status
```http
GET /api/instagram/rag/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "autoSyncEnabled": true,
    "lastChecked": "2024-01-01T12:00:00.000Z"
  },
  "timestamp": 1640995200000
}
```

### Manual Sync

#### Force Sync Firestore to RAG
```http
POST /api/instagram/firestore/sync-to-rag
```

**Response:**
```json
{
  "success": true,
  "data": {
    "postsCount": 50,
    "status": "idle",
    "lastSyncAt": "2024-01-01T12:00:00.000Z"
  },
  "message": "Firestore Instagram data sync to RAG completed successfully",
  "timestamp": 1640995200000
}
```

#### Data Updated Trigger
```http
POST /api/instagram/data-updated
```

This endpoint should be called whenever Instagram JSON data is updated to trigger RAG sync from Firestore.

**Response:**
```json
{
  "success": true,
  "message": "Instagram data updated and successfully synced to RAG",
  "data": {
    "autoSyncEnabled": true,
    "ragSynced": true,
    "postsCount": 50,
    "status": "idle",
    "lastSyncAt": "2024-01-01T12:00:00.000Z"
  },
  "timestamp": 1640995200000
}
```

## Automatic Sync Triggers

### 1. Regular Data Pipeline
When using `/api/instagram/sync`:
- Fetches data from Instagram API
- Stores in Firestore
- **Automatically syncs to RAG** (if enabled)

### 2. Metrics Sync
When using `/api/instagram/metrics/sync`:
- Updates post metrics in Firestore
- **Automatically syncs to RAG** (if enabled)

### 3. Complete Sync
When using `/api/instagram/sync-complete`:
- Full pipeline: API → Firestore → JSON → RAG
- **Includes automatic RAG sync**

### 4. JSON File Updates
When Instagram JSON files are updated:
- Call `/api/instagram/data-updated`
- **Triggers RAG sync from Firestore data**

## Integration Examples

### For Android App
```kotlin
// After updating Instagram data
val response = apiService.triggerDataUpdate()
if (response.success && response.data.ragSynced) {
    Log.d("RAG", "Instagram data synced to RAG: ${response.data.postsCount} posts")
}
```

### For Background Jobs
```javascript
// In your data update script
async function updateInstagramData() {
    // 1. Update your Instagram data
    await updateInstagramDataSomehow();
    
    // 2. Trigger RAG sync
    const response = await fetch('/api/instagram/data-updated', {
        method: 'POST'
    });
    
    const result = await response.json();
    console.log('RAG sync result:', result);
}
```

## Data Quality Improvements

### Thumbnail URL Migration (December 2024)

The system now includes automatic fixes for historical data quality issues:

#### 1. **Automatic Thumbnail URL Updates**
- New sync operations automatically detect and fix existing posts missing thumbnail URLs
- Uses fresh Instagram API data to populate missing thumbnail URLs in Firestore
- Updates both individual posts and regenerates JSON files

#### 2. **Migration Endpoint**
For bulk fixing of existing data:
```http
POST /api/instagram/migrate/thumbnail-urls?limit=50&dryRun=false
```

This endpoint:
- Identifies existing Firestore posts missing thumbnail URLs
- Fetches fresh data from Instagram API
- Updates Firestore with complete thumbnail URL data
- Regenerates JSON files with all thumbnail URLs included
- Automatically syncs updated data to RAG system

#### 3. **Enhanced Pipeline**
The main sync pipeline now:
- ✅ Stores new posts with complete thumbnail URL data
- ✅ Updates existing posts that are missing thumbnail URLs
- ✅ Ensures all Firestore data includes thumbnail URLs
- ✅ Regenerates JSON files with complete media information
- ✅ Syncs enhanced data to RAG for better AI responses

## Best Practices

### 1. **For Production**
- Keep auto-sync enabled for real-time updates
- Monitor sync status in your application health checks
- Set up alerts for sync failures
- Run thumbnail URL migration once for historical data fixes

### 2. **For Development**
- Use manual sync endpoints for testing
- Disable auto-sync during heavy development
- Enable verbose logging for debugging
- Use `dryRun=true` for migration testing

### 3. **Data Quality**
- All new syncs automatically include complete media data (including thumbnails)
- Historical data can be fixed using the migration endpoint
- JSON files are automatically regenerated with complete data
- RAG system receives enhanced data for better AI responses

This system ensures your RAG always has the latest Instagram data with complete media information without any manual intervention!
