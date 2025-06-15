# Android Integration Guide - Binance Trading API

## 🚀 Quick Start

**Base URL**: `https://allinone-app-5t9md.ondigitalocean.app`

**Status**: ✅ Service is running and REST APIs are functional
**WebSocket Status**: ⚠️ USD-M and COIN-M WebSockets require IP whitelisting (Spot WebSocket works)

## 📱 Core API Endpoints for Android App

### 1. Health Check
```http
GET /health
```
**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "usdm": {"isConnected": false, "clientCount": 0},
      "coinm": {"isConnected": false, "clientCount": 0},
      "spot": {"isConnected": true, "clientCount": 0},
      "isInitialized": true
    }
  },
  "timestamp": 1749999518133
}
```

### 2. Account Information
```http
GET /api/binance/futures/account
```
**Response**: Account balance, margin info, and positions

### 3. Get Positions
```http
GET /api/binance/futures/positions
```
**Response**:
```json
{
  "success": true,
  "data": [
    {
      "symbol": "LINKUSDT",
      "positionAmount": 7.58,
      "entryPrice": 13.182,
      "markPrice": 13.253,
      "unrealizedProfit": 0.544,
      "percentage": 0,
      "positionSide": "BOTH",
      "leverage": 50,
      "maxNotionalValue": 50000,
      "marginType": "cross",
      "isolatedMargin": 0,
      "isAutoAddMargin": false
    }
  ],
  "timestamp": 1749999883915
}
```

### 4. Set Take Profit & Stop Loss ⚠️
```http
POST /api/binance/futures/tpsl
```
**Request Body**:
```json
{
  "symbol": "LINKUSDT",
  "side": "SELL",
  "takeProfitPrice": 15.0,
  "stopLossPrice": 12.0,
  "quantity": 7.58
}
```
**Note**: Currently experiencing issues. Use quantity from position data.

### 5. Close Position ⚠️
```http
POST /api/binance/futures/close-position
```
**Request Body**:
```json
{
  "symbol": "LINKUSDT",
  "quantity": 7.58
}
```
**Note**: Quantity is optional - will close entire position if not specified.

### 6. COIN-M Futures Endpoints
Same structure but use `/api/binance/coinm/` prefix:
- `GET /api/binance/coinm/positions`
- `POST /api/binance/coinm/tpsl`
- `POST /api/binance/coinm/close-position`

## 🔧 Android Implementation

### Kotlin Data Models
```kotlin
data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val error: String? = null,
    val timestamp: Long
)

data class Position(
    val symbol: String,
    val positionAmount: Double,
    val entryPrice: Double,
    val markPrice: Double,
    val unrealizedProfit: Double,
    val percentage: Double,
    val positionSide: String,
    val leverage: Int,
    val maxNotionalValue: Double,
    val marginType: String,
    val isolatedMargin: Double,
    val isAutoAddMargin: Boolean
)

data class TPSLRequest(
    val symbol: String,
    val side: String, // "BUY" or "SELL"
    val takeProfitPrice: Double? = null,
    val stopLossPrice: Double? = null,
    val quantity: Double
)

data class ClosePositionRequest(
    val symbol: String,
    val quantity: Double? = null // Optional - closes entire position if null
)
```

### Retrofit Interface
```kotlin
interface BinanceApiService {
    @GET("health")
    suspend fun getHealth(): ApiResponse<HealthData>
    
    @GET("api/binance/futures/account")
    suspend fun getAccount(): ApiResponse<AccountInfo>
    
    @GET("api/binance/futures/positions")
    suspend fun getPositions(): ApiResponse<List<Position>>
    
    @POST("api/binance/futures/tpsl")
    suspend fun setTPSL(@Body request: TPSLRequest): ApiResponse<List<OrderResult>>
    
    @POST("api/binance/futures/close-position")
    suspend fun closePosition(@Body request: ClosePositionRequest): ApiResponse<OrderResult>
    
    // COIN-M endpoints
    @GET("api/binance/coinm/positions")
    suspend fun getCoinMPositions(): ApiResponse<List<Position>>
    
    @POST("api/binance/coinm/tpsl")
    suspend fun setCoinMTPSL(@Body request: TPSLRequest): ApiResponse<List<OrderResult>>
    
    @POST("api/binance/coinm/close-position")
    suspend fun closeCoinMPosition(@Body request: ClosePositionRequest): ApiResponse<OrderResult>
}
```

### Repository Implementation
```kotlin
class TradingRepository(private val apiService: BinanceApiService) {
    
    suspend fun getPositions(): Result<List<Position>> {
        return try {
            val response = apiService.getPositions()
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.error ?: "Unknown error"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun setTPSL(
        symbol: String,
        side: String,
        takeProfitPrice: Double?,
        stopLossPrice: Double?,
        quantity: Double
    ): Result<String> {
        return try {
            val request = TPSLRequest(symbol, side, takeProfitPrice, stopLossPrice, quantity)
            val response = apiService.setTPSL(request)
            if (response.success) {
                Result.success("TP/SL orders placed successfully")
            } else {
                Result.failure(Exception(response.error ?: "Failed to place TP/SL orders"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun closePosition(symbol: String, quantity: Double? = null): Result<String> {
        return try {
            val request = ClosePositionRequest(symbol, quantity)
            val response = apiService.closePosition(request)
            if (response.success) {
                Result.success("Position closed successfully")
            } else {
                Result.failure(Exception(response.error ?: "Failed to close position"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

### Compose UI Example
```kotlin
@Composable
fun PositionCard(
    position: Position,
    onSetTPSL: (String, Double?, Double?) -> Unit,
    onClosePosition: (String) -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(8.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = position.symbol,
                style = MaterialTheme.typography.h6
            )
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Size: ${position.positionAmount}")
                Text("Entry: ${position.entryPrice}")
                Text("PnL: ${position.unrealizedProfit}")
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                Button(
                    onClick = { 
                        // Show TP/SL dialog
                        onSetTPSL(position.symbol, null, null)
                    }
                ) {
                    Text("Set TP/SL")
                }
                
                Button(
                    onClick = { onClosePosition(position.symbol) },
                    colors = ButtonDefaults.buttonColors(backgroundColor = Color.Red)
                ) {
                    Text("Close Position")
                }
            }
        }
    }
}
```

## 🔄 Real-time Updates Strategy

Since WebSocket connections require IP whitelisting, use **polling strategy**:

```kotlin
class PositionUpdater(private val repository: TradingRepository) {
    private val _positions = MutableLiveData<List<Position>>()
    val positions: LiveData<List<Position>> = _positions
    
    private var updateJob: Job? = null
    
    fun startUpdating() {
        updateJob = CoroutineScope(Dispatchers.IO).launch {
            while (isActive) {
                try {
                    val result = repository.getPositions()
                    if (result.isSuccess) {
                        _positions.postValue(result.getOrNull() ?: emptyList())
                    }
                } catch (e: Exception) {
                    // Handle error
                }
                delay(5000) // Update every 5 seconds
            }
        }
    }
    
    fun stopUpdating() {
        updateJob?.cancel()
    }
}
```

## 🚨 Current Issues & Workarounds

### 1. TP/SL Buttons Not Working
**Issue**: API returns "Unknown error"
**Workaround**: 
- Always provide `quantity` parameter (get from position data)
- Use correct `side`: For LONG positions use "SELL", for SHORT positions use "BUY"

**Example Fix**:
```kotlin
// For a LONG position (positionAmount > 0)
val side = if (position.positionAmount > 0) "SELL" else "BUY"
val quantity = abs(position.positionAmount)

setTPSL(position.symbol, side, takeProfitPrice, stopLossPrice, quantity)
```

### 2. Close Position Buttons Not Working
**Issue**: Position detection may fail
**Workaround**: Always provide quantity explicitly

```kotlin
// Get quantity from position data
val quantity = abs(position.positionAmount)
closePosition(position.symbol, quantity)
```

### 3. WebSocket Real-time Updates
**Issue**: USD-M and COIN-M WebSockets not connected due to IP whitelisting
**Solutions**:
1. **Recommended**: Add Frankfurt DigitalOcean IP ranges to Binance whitelist
2. **Alternative**: Use REST API polling every 5-10 seconds (works perfectly)

## 🌐 WebSocket IP Whitelisting

**DigitalOcean Frankfurt IP Ranges** (add these to Binance API whitelist):
```
# You mentioned you have the Frankfurt IP list
# Add all those IPs to your Binance API key whitelist
# This will enable real-time WebSocket connections
```

**Benefits of IP Whitelisting**:
- Real-time position updates
- Real-time order updates
- Real-time balance updates
- Instant notifications

**Without IP Whitelisting**:
- Use polling every 5-10 seconds
- Still very responsive for trading
- Lower server load
- More reliable than WebSocket reconnections

## 🧪 Testing Checklist

### Working Endpoints ✅
- [x] Health check
- [x] Account information (when API is stable)
- [x] Get positions (when API is stable)
- [x] Market data endpoints

### Needs Testing ⚠️
- [ ] TP/SL with correct parameters
- [ ] Close position with explicit quantity
- [ ] COIN-M futures endpoints
- [ ] Error handling for various scenarios

### Recommended Testing Flow
1. **Test health endpoint** - ensure service is running
2. **Get positions** - verify you have open positions
3. **Test TP/SL** with small quantity first
4. **Test close position** with partial quantity first
5. **Implement polling** for real-time updates

## 📞 Support

If you encounter issues:
1. Check the health endpoint first
2. Verify position data before setting TP/SL
3. Use explicit quantities for all operations
4. Consider IP whitelisting for WebSocket functionality

**Current Service Status**: ✅ Running at `https://allinone-app-5t9md.ondigitalocean.app` 