# AllInOne External Services

External services for AllInOne app, including Binance Futures integration with real-time WebSocket support.

## Features

- **Real-time Binance Futures WebSocket**: Live position updates, order updates, and balance changes
- **Complete REST API**: Full Binance Futures API integration
- **TP/SL Management**: Easy Take Profit and Stop Loss order management
- **Multi-client Support**: Multiple Android clients can connect simultaneously
- **Automatic Reconnection**: Robust error handling and reconnection logic
- **Graceful Shutdown**: Proper cleanup on server shutdown

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
PORT=3000
BINANCE_API_KEY=your_api_key_here
BINANCE_API_SECRET=your_api_secret_here
NODE_ENV=development
CORS_ORIGIN=*
```

### 3. Binance API Setup
1. Create a Binance account and enable Futures trading
2. Generate API keys with Futures trading permissions
3. Add your server's IP address to the API key whitelist
4. Replace the placeholder values in `.env` with your actual API credentials

### 4. Run the Server
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start

# Build TypeScript
npm run build
```

## Connecting from Kotlin Android App

### Dependencies
Add these dependencies to your `build.gradle` file:

```kotlin
dependencies {
    // HTTP client
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    implementation 'com.squareup.okhttp3:logging-interceptor:4.11.0'
    
    // WebSocket
    implementation 'com.squareup.okhttp3:okhttp:4.11.0'
    
    // JSON parsing
    implementation 'com.google.code.gson:gson:2.10.1'
    
    // Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
}
```

### 1. REST API Client

Create a service interface for the REST API:

```kotlin
// ApiService.kt
import retrofit2.Response
import retrofit2.http.*

interface BinanceApiService {
    @GET("health")
    suspend fun getHealth(): Response<HealthResponse>
    
    @GET("api/binance/account")
    suspend fun getAccount(): Response<ApiResponse<AccountInfo>>
    
    @GET("api/binance/positions")
    suspend fun getPositions(): Response<ApiResponse<List<Position>>>
    
    @GET("api/binance/orders")
    suspend fun getOrders(@Query("symbol") symbol: String? = null): Response<ApiResponse<List<Order>>>
    
    @POST("api/binance/orders")
    suspend fun placeOrder(@Body order: OrderRequest): Response<ApiResponse<OrderResult>>
    
    @DELETE("api/binance/orders/{symbol}/{orderId}")
    suspend fun cancelOrder(
        @Path("symbol") symbol: String,
        @Path("orderId") orderId: String
    ): Response<ApiResponse<OrderResult>>
    
    @POST("api/binance/tpsl")
    suspend fun setTpSl(@Body request: TpSlRequest): Response<ApiResponse<List<OrderResult>>>
    
    @GET("api/binance/price/{symbol}")
    suspend fun getPrice(@Path("symbol") symbol: String): Response<ApiResponse<PriceData>>
    
    @GET("api/binance/balance/{asset}")
    suspend fun getBalance(@Path("asset") asset: String = "USDT"): Response<ApiResponse<BalanceData>>
}
```

### 2. Data Classes

```kotlin
// DataClasses.kt
data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val error: String? = null
)

data class HealthResponse(
    val status: String,
    val timestamp: String,
    val services: ServiceStatus
)

data class ServiceStatus(
    val isInitialized: Boolean,
    val binance: BinanceStatus
)

data class BinanceStatus(
    val isConnected: Boolean,
    val clientCount: Int,
    val isInitialized: Boolean
)

data class AccountInfo(
    val totalWalletBalance: Double,
    val totalUnrealizedProfit: Double,
    val totalMarginBalance: Double,
    val assets: List<Asset>
)

data class Asset(
    val asset: String,
    val walletBalance: Double,
    val unrealizedProfit: Double,
    val marginBalance: Double
)

data class Position(
    val symbol: String,
    val positionAmount: Double,
    val entryPrice: Double,
    val markPrice: Double,
    val unrealizedProfit: Double,
    val percentage: Double,
    val positionSide: String,
    val leverage: Double
)

data class Order(
    val orderId: Long,
    val symbol: String,
    val status: String,
    val side: String,
    val type: String,
    val price: Double,
    val origQty: Double,
    val executedQty: Double
)

data class OrderRequest(
    val symbol: String,
    val side: String, // "BUY" or "SELL"
    val type: String, // "MARKET", "LIMIT", etc.
    val quantity: Double,
    val price: Double? = null,
    val stopPrice: Double? = null,
    val timeInForce: String = "GTC",
    val reduceOnly: Boolean = false
)

data class TpSlRequest(
    val symbol: String,
    val side: String,
    val takeProfitPrice: Double? = null,
    val stopLossPrice: Double? = null,
    val quantity: Double
)

data class OrderResult(
    val orderId: Long,
    val symbol: String,
    val status: String,
    val price: Double,
    val origQty: Double
)

data class PriceData(
    val symbol: String,
    val price: Double,
    val time: Long
)

data class BalanceData(
    val asset: String,
    val walletBalance: Double,
    val unrealizedProfit: Double,
    val marginBalance: Double
)
```

### 3. API Client Setup

```kotlin
// ApiClient.kt
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    private const val BASE_URL = "https://your-heroku-app.herokuapp.com/" // Replace with your Heroku URL
    
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }
    
    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
    
    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    val binanceApi: BinanceApiService = retrofit.create(BinanceApiService::class.java)
}
```

### 4. WebSocket Client

```kotlin
// WebSocketClient.kt
import okhttp3.*
import okio.ByteString
import com.google.gson.Gson
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow

class BinanceWebSocketClient {
    private var webSocket: WebSocket? = null
    private val client = OkHttpClient()
    private val gson = Gson()
    
    private val _messages = MutableSharedFlow<WebSocketMessage>()
    val messages: SharedFlow<WebSocketMessage> = _messages
    
    private val _connectionStatus = MutableSharedFlow<ConnectionStatus>()
    val connectionStatus: SharedFlow<ConnectionStatus> = _connectionStatus
    
    private var heartbeatJob: Job? = null
    
    fun connect(url: String = "wss://your-heroku-app.herokuapp.com") { // Replace with your Heroku WebSocket URL
        val request = Request.Builder()
            .url(url)
            .build()
        
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                CoroutineScope(Dispatchers.Main).launch {
                    _connectionStatus.emit(ConnectionStatus.CONNECTED)
                }
                startHeartbeat()
            }
            
            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val message = gson.fromJson(text, WebSocketMessage::class.java)
                    CoroutineScope(Dispatchers.Main).launch {
                        _messages.emit(message)
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
            
            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                CoroutineScope(Dispatchers.Main).launch {
                    _connectionStatus.emit(ConnectionStatus.DISCONNECTING)
                }
            }
            
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                CoroutineScope(Dispatchers.Main).launch {
                    _connectionStatus.emit(ConnectionStatus.DISCONNECTED)
                }
                stopHeartbeat()
            }
            
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                CoroutineScope(Dispatchers.Main).launch {
                    _connectionStatus.emit(ConnectionStatus.ERROR(t.message ?: "Unknown error"))
                }
                stopHeartbeat()
            }
        })
    }
    
    private fun startHeartbeat() {
        heartbeatJob = CoroutineScope(Dispatchers.IO).launch {
            while (isActive) {
                delay(30000) // Send ping every 30 seconds
                sendPing()
            }
        }
    }
    
    private fun stopHeartbeat() {
        heartbeatJob?.cancel()
    }
    
    private fun sendPing() {
        val pingMessage = mapOf("type" to "ping", "timestamp" to System.currentTimeMillis())
        webSocket?.send(gson.toJson(pingMessage))
    }
    
    fun disconnect() {
        stopHeartbeat()
        webSocket?.close(1000, "Client disconnect")
        webSocket = null
    }
}

// WebSocket message types
data class WebSocketMessage(
    val type: String,
    val status: String? = null,
    val data: Any? = null,
    val error: String? = null,
    val timestamp: Long? = null
)

sealed class ConnectionStatus {
    object CONNECTED : ConnectionStatus()
    object DISCONNECTED : ConnectionStatus()
    object DISCONNECTING : ConnectionStatus()
    data class ERROR(val message: String) : ConnectionStatus()
}
```

### 5. Repository Pattern

```kotlin
// BinanceRepository.kt
import kotlinx.coroutines.flow.Flow

class BinanceRepository {
    private val apiService = ApiClient.binanceApi
    private val webSocketClient = BinanceWebSocketClient()
    
    // REST API methods
    suspend fun getAccountInfo(): Result<AccountInfo> {
        return try {
            val response = apiService.getAccount()
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(response.body()!!.data!!)
            } else {
                Result.failure(Exception(response.body()?.error ?: "Unknown error"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getPositions(): Result<List<Position>> {
        return try {
            val response = apiService.getPositions()
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(response.body()!!.data ?: emptyList())
            } else {
                Result.failure(Exception(response.body()?.error ?: "Unknown error"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun placeOrder(order: OrderRequest): Result<OrderResult> {
        return try {
            val response = apiService.placeOrder(order)
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(response.body()!!.data!!)
            } else {
                Result.failure(Exception(response.body()?.error ?: "Unknown error"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun setTpSl(request: TpSlRequest): Result<List<OrderResult>> {
        return try {
            val response = apiService.setTpSl(request)
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(response.body()!!.data ?: emptyList())
            } else {
                Result.failure(Exception(response.body()?.error ?: "Unknown error"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    // WebSocket methods
    fun connectWebSocket(url: String = "wss://your-heroku-app.herokuapp.com") {
        webSocketClient.connect(url)
    }
    
    fun disconnectWebSocket() {
        webSocketClient.disconnect()
    }
    
    fun getWebSocketMessages(): Flow<WebSocketMessage> = webSocketClient.messages
    
    fun getConnectionStatus(): Flow<ConnectionStatus> = webSocketClient.connectionStatus
}
```

### 6. Usage in Activity/Fragment

```kotlin
// MainActivity.kt
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    private val repository = BinanceRepository()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        // Connect WebSocket
        repository.connectWebSocket("wss://your-heroku-app.herokuapp.com") // Replace with your URL
        
        // Observe WebSocket messages
        lifecycleScope.launch {
            repository.getWebSocketMessages().collect { message ->
                when (message.type) {
                    "positions_update" -> {
                        // Handle position updates
                        println("Position update: ${message.data}")
                    }
                    "order_update" -> {
                        // Handle order updates
                        println("Order update: ${message.data}")
                    }
                    "balance_update" -> {
                        // Handle balance updates
                        println("Balance update: ${message.data}")
                    }
                    "connection" -> {
                        // Handle connection status
                        println("Connection status: ${message.status}")
                    }
                }
            }
        }
        
        // Example: Get account info
        lifecycleScope.launch {
            repository.getAccountInfo().fold(
                onSuccess = { accountInfo ->
                    println("Account balance: ${accountInfo.totalWalletBalance}")
                },
                onFailure = { error ->
                    println("Error: ${error.message}")
                }
            )
        }
        
        // Example: Place order
        lifecycleScope.launch {
            val order = OrderRequest(
                symbol = "BTCUSDT",
                side = "BUY",
                type = "MARKET",
                quantity = 0.001
            )
            
            repository.placeOrder(order).fold(
                onSuccess = { result ->
                    println("Order placed: ${result.orderId}")
                },
                onFailure = { error ->
                    println("Order failed: ${error.message}")
                }
            )
        }
        
        // Example: Set TP/SL
        lifecycleScope.launch {
            val tpSl = TpSlRequest(
                symbol = "BTCUSDT",
                side = "BUY",
                takeProfitPrice = 45000.0,
                stopLossPrice = 40000.0,
                quantity = 0.001
            )
            
            repository.setTpSl(tpSl).fold(
                onSuccess = { orders ->
                    println("TP/SL set: ${orders.size} orders created")
                },
                onFailure = { error ->
                    println("TP/SL failed: ${error.message}")
                }
            )
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        repository.disconnectWebSocket()
    }
}
```

### 7. Configuration

Replace the following URLs with your actual Heroku app URL:
- REST API: `https://your-heroku-app.herokuapp.com/`
- WebSocket: `wss://your-heroku-app.herokuapp.com`

### 8. Permissions

Add internet permission to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## API Endpoints

### REST API

#### Account Information
- `GET /api/binance/account` - Get account information
- `GET /api/binance/balance/:asset?` - Get balance (default: USDT)

#### Positions & Orders
- `GET /api/binance/positions` - Get current positions
- `GET /api/binance/orders?symbol=BTCUSDT` - Get open orders
- `POST /api/binance/orders` - Place new order
- `DELETE /api/binance/orders/:symbol/:orderId` - Cancel specific order
- `DELETE /api/binance/orders/:symbol` - Cancel all orders for symbol

#### TP/SL Management
- `POST /api/binance/tpsl` - Set Take Profit and Stop Loss

#### Market Data
- `GET /api/binance/price/:symbol?` - Get price (all prices if no symbol)

#### Health Check
- `GET /health` - Server and service status

### WebSocket API

Connect to `wss://your-server.herokuapp.com` for real-time updates:

#### Message Types Received:
- `connection` - Connection status updates
- `positions_update` - Real-time position changes
- `balance_update` - Balance changes
- `order_update` - Order status changes
- `account_config_update` - Account configuration changes

#### Message Types to Send:
- `ping` - Heartbeat (responds with `pong`)

## Deployment to Heroku

### 1. Create Heroku App
```bash
heroku create your-app-name
```

### 2. Set Environment Variables
```bash
heroku config:set BINANCE_API_KEY=your_api_key
heroku config:set BINANCE_API_SECRET=your_api_secret
heroku config:set NODE_ENV=production
```

### 3. Deploy
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

### 4. Get Heroku URL
Your app will be available at: `https://your-app-name.herokuapp.com`

## Project Structure

```
allinone-external/
├── src/
│   ├── services/
│   │   ├── binance/
│   │   │   ├── websocket.ts    # WebSocket manager
│   │   │   ├── rest.ts         # REST API wrapper
│   │   │   └── index.ts        # Binance service
│   │   └── index.ts            # Service manager
│   ├── config/
│   │   └── index.ts            # Configuration
│   └── app.ts                  # Main application
├── dist/                       # Compiled JavaScript
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

## Error Handling

The service includes comprehensive error handling:
- Automatic WebSocket reconnection with exponential backoff
- Graceful shutdown handling
- Proper error responses for all API endpoints
- Connection status monitoring

## Security

- API keys are stored securely in environment variables
- CORS configuration for cross-origin requests
- Request validation and sanitization
- Rate limiting protection (via Binance API limits)

## Monitoring

- Health check endpoint for service monitoring
- Detailed logging for debugging
- Connection status tracking
- Service status reporting

# Binance Futures External Service

A Node.js TypeScript service that provides Binance Futures API functionality with real-time WebSocket support for Android applications. This service handles IP whitelisting requirements by running on a server with a static IP address.

## Features

- **REST API Integration**: Complete Binance Futures REST API wrapper
- **Real-time WebSocket**: Live position and order updates
- **Account Management**: Balance, positions, and order management
- **Trading Operations**: Place, cancel, and modify orders with TP/SL support
- **Error Handling**: Comprehensive error handling and logging
- **CORS Support**: Configured for cross-origin requests from Android apps

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Binance Futures API
- `GET /api/binance/account` - Get account information
- `GET /api/binance/positions` - Get current positions
- `GET /api/binance/orders` - Get open orders
- `POST /api/binance/order` - Place new order
- `DELETE /api/binance/order/:symbol/:orderId` - Cancel specific order
- `DELETE /api/binance/orders/:symbol` - Cancel all orders for symbol
- `POST /api/binance/tpsl` - Set take profit/stop loss
- `GET /api/binance/balance` - Get account balance
- `GET /api/binance/price/:symbol` - Get symbol price
- `GET /api/binance/prices` - Get all symbol prices

### WebSocket
- `WS /ws` - Real-time updates for positions, orders, and account changes

## Deployment

### DigitalOcean (Recommended)
DigitalOcean provides static IP addresses, solving Binance's IP whitelisting requirements.

See [deploy-digitalocean.md](deploy-digitalocean.md) for complete deployment guide.

Quick setup:
1. Create Ubuntu 22.04 droplet
2. Note the static IP address
3. Add IP to Binance API whitelist
4. Follow deployment guide

### Heroku (Not Recommended)
Heroku uses dynamic IPs that change frequently, causing issues with Binance IP whitelisting.

If you must use Heroku:
```bash
# Deploy to Heroku
heroku create your-app-name
heroku config:set BINANCE_API_KEY=your_key
heroku config:set BINANCE_API_SECRET=your_secret
heroku config:set NODE_ENV=production
git push heroku main
```

**Note**: You'll need to frequently update your Binance IP whitelist as Heroku IPs change.

## Local Development

1. **Clone and install**:
```bash
git clone https://github.com/your-username/allinone-external.git
cd allinone-external
npm install
```

2. **Environment setup**:
```bash
cp .env.example .env
# Edit .env with your Binance API credentials
```

3. **Development**:
```bash
npm run dev  # Start with hot reload
npm run build  # Build for production
npm start  # Start production build
```

## Environment Variables

```env
NODE_ENV=production
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret
PORT=3000
CORS_ORIGIN=*
```

## Android Integration

Your external Binance service is deployed at: **`https://allinone-app-5t9md.ondigitalocean.app`**

### Dependencies
Add to your `build.gradle` (Module: app):
```kotlin
dependencies {
    // Retrofit for REST API calls
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    implementation 'com.squareup.okhttp3:logging-interceptor:4.11.0'
    
    // WebSocket for real-time updates
    implementation 'org.java-websocket:Java-WebSocket:1.5.3'
    
    // Coroutines for async operations
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
    
    // Lifecycle components
    implementation 'androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0'
    implementation 'androidx.lifecycle:lifecycle-livedata-ktx:2.7.0'
}
```

### Data Classes
Create these data classes for API responses:

```kotlin
// Health Response
data class HealthResponse(
    val status: String,
    val timestamp: String,
    val services: ServiceStatus
)

data class ServiceStatus(
    val isInitialized: Boolean,
    val binance: BinanceStatus
)

data class BinanceStatus(
    val isConnected: Boolean,
    val clientCount: Int,
    val isInitialized: Boolean
)

// Account Response
data class AccountResponse(
    val success: Boolean,
    val data: AccountData? = null,
    val error: String? = null
)

data class AccountData(
    val totalWalletBalance: Double,
    val totalUnrealizedProfit: Double,
    val totalMarginBalance: Double,
    val totalPositionInitialMargin: Double,
    val totalOpenOrderInitialMargin: Double,
    val maxWithdrawAmount: Double,
    val assets: List<AssetData>
)

data class AssetData(
    val asset: String,
    val walletBalance: Double,
    val unrealizedProfit: Double,
    val marginBalance: Double,
    val maintMargin: Double,
    val initialMargin: Double,
    val positionInitialMargin: Double,
    val openOrderInitialMargin: Double,
    val maxWithdrawAmount: Double
)

// Positions Response
data class PositionsResponse(
    val success: Boolean,
    val data: List<PositionData>? = null,
    val error: String? = null
)

data class PositionData(
    val symbol: String,
    val positionAmount: Double,
    val entryPrice: Double,
    val markPrice: Double,
    val unrealizedProfit: Double,
    val percentage: Double,
    val positionSide: String,
    val leverage: Double,
    val maxNotionalValue: Double,
    val marginType: String,
    val isolatedMargin: Double,
    val isAutoAddMargin: Boolean
)

// Orders Response
data class OrdersResponse(
    val success: Boolean,
    val data: List<OrderData>? = null,
    val error: String? = null
)

data class OrderData(
    val orderId: String,
    val symbol: String,
    val status: String,
    val clientOrderId: String,
    val price: Double,
    val avgPrice: Double,
    val origQty: Double,
    val executedQty: Double,
    val cumQuote: Double,
    val timeInForce: String,
    val type: String,
    val reduceOnly: Boolean,
    val closePosition: Boolean,
    val side: String,
    val positionSide: String,
    val stopPrice: Double,
    val workingType: String,
    val priceProtect: Boolean,
    val origType: String,
    val time: Long,
    val updateTime: Long
)

// Order Request
data class OrderRequest(
    val symbol: String,
    val side: String, // "BUY" or "SELL"
    val type: String, // "LIMIT", "MARKET", etc.
    val quantity: Double,
    val price: Double? = null,
    val stopPrice: Double? = null,
    val timeInForce: String? = "GTC",
    val reduceOnly: Boolean? = false,
    val closePosition: Boolean? = false,
    val positionSide: String? = "BOTH"
)

// Balance Response
data class BalanceResponse(
    val success: Boolean,
    val data: List<AssetData>? = null,
    val error: String? = null
)

// Price Response
data class PriceResponse(
    val success: Boolean,
    val data: PriceData? = null,
    val error: String? = null
)

data class PriceData(
    val symbol: String,
    val price: Double
)

// All Prices Response
data class AllPricesResponse(
    val success: Boolean,
    val data: List<PriceData>? = null,
    val error: String? = null
)

// Generic API Response
data class ApiResponse(
    val success: Boolean,
    val data: Any? = null,
    val error: String? = null
)
```

### API Service Interface
Create the Retrofit service interface:

```kotlin
import retrofit2.Response
import retrofit2.http.*

interface BinanceExternalService {
    
    @GET("health")
    suspend fun getHealth(): Response<HealthResponse>
    
    @GET("api/binance/account")
    suspend fun getAccount(): Response<AccountResponse>
    
    @GET("api/binance/positions")
    suspend fun getPositions(): Response<PositionsResponse>
    
    @GET("api/binance/orders")
    suspend fun getOpenOrders(@Query("symbol") symbol: String? = null): Response<OrdersResponse>
    
    @POST("api/binance/order")
    suspend fun placeOrder(@Body orderRequest: OrderRequest): Response<ApiResponse>
    
    @DELETE("api/binance/order/{symbol}/{orderId}")
    suspend fun cancelOrder(
        @Path("symbol") symbol: String,
        @Path("orderId") orderId: String
    ): Response<ApiResponse>
    
    @DELETE("api/binance/orders/{symbol}")
    suspend fun cancelAllOrders(@Path("symbol") symbol: String): Response<ApiResponse>
    
    @POST("api/binance/tpsl")
    suspend fun setTPSL(@Body tpslRequest: Map<String, Any>): Response<ApiResponse>
    
    @GET("api/binance/balance")
    suspend fun getBalance(@Query("asset") asset: String? = "USDT"): Response<BalanceResponse>
    
    @GET("api/binance/price/{symbol}")
    suspend fun getPrice(@Path("symbol") symbol: String): Response<PriceResponse>
    
    @GET("api/binance/prices")
    suspend fun getAllPrices(): Response<AllPricesResponse>
}
```

### Retrofit Client Setup
Create a singleton Retrofit client:

```kotlin
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object BinanceApiClient {
    private const val BASE_URL = "https://allinone-app-5t9md.ondigitalocean.app/"
    
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }
    
    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
    
    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    val service: BinanceExternalService = retrofit.create(BinanceExternalService::class.java)
}
```

### Repository Pattern
Create a repository to handle API calls:

```kotlin
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class BinanceRepository {
    private val apiService = BinanceApiClient.service
    
    suspend fun getHealth(): Result<HealthResponse> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getHealth()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Health check failed: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getAccount(): Result<AccountResponse> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getAccount()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Account fetch failed: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getPositions(): Result<PositionsResponse> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getPositions()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Positions fetch failed: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun placeOrder(orderRequest: OrderRequest): Result<ApiResponse> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.placeOrder(orderRequest)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Order placement failed: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getBalance(asset: String = "USDT"): Result<BalanceResponse> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getBalance(asset)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Balance fetch failed: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getPrice(symbol: String): Result<PriceResponse> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getPrice(symbol)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Price fetch failed: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

### WebSocket Client
Create a WebSocket client for real-time updates:

```kotlin
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import java.net.URI
import com.google.gson.Gson
import com.google.gson.JsonObject

class BinanceWebSocketClient(
    private val onMessage: (String, JsonObject) -> Unit,
    private val onConnectionChange: (Boolean) -> Unit
) {
    private var webSocket: WebSocketClient? = null
    private val gson = Gson()
    private var isConnected = false
    
    fun connect() {
        try {
            val uri = URI("wss://allinone-app-5t9md.ondigitalocean.app/ws")
            
            webSocket = object : WebSocketClient(uri) {
                override fun onOpen(handshake: ServerHandshake?) {
                    isConnected = true
                    onConnectionChange(true)
                    println("WebSocket connected")
                }
                
                override fun onMessage(message: String?) {
                    message?.let {
                        try {
                            val jsonObject = gson.fromJson(it, JsonObject::class.java)
                            val type = jsonObject.get("type")?.asString ?: "unknown"
                            onMessage(type, jsonObject)
                        } catch (e: Exception) {
                            println("Error parsing WebSocket message: ${e.message}")
                        }
                    }
                }
                
                override fun onClose(code: Int, reason: String?, remote: Boolean) {
                    isConnected = false
                    onConnectionChange(false)
                    println("WebSocket closed: $reason")
                }
                
                override fun onError(ex: Exception?) {
                    isConnected = false
                    onConnectionChange(false)
                    println("WebSocket error: ${ex?.message}")
                }
            }
            
            webSocket?.connect()
            
        } catch (e: Exception) {
            println("Failed to connect WebSocket: ${e.message}")
        }
    }
    
    fun disconnect() {
        webSocket?.close()
        isConnected = false
    }
    
    fun isConnected(): Boolean = isConnected
}
```

### Usage Example in Activity/Fragment
Here's how to use it in your Activity or Fragment:

```kotlin
class MainActivity : AppCompatActivity() {
    private lateinit var repository: BinanceRepository
    private lateinit var webSocketClient: BinanceWebSocketClient
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        repository = BinanceRepository()
        
        // Initialize WebSocket
        webSocketClient = BinanceWebSocketClient(
            onMessage = { type, data ->
                runOnUiThread {
                    handleWebSocketMessage(type, data)
                }
            },
            onConnectionChange = { connected ->
                runOnUiThread {
                    updateConnectionStatus(connected)
                }
            }
        )
        
        // Connect WebSocket
        webSocketClient.connect()
        
        // Example API calls
        fetchAccountData()
        fetchPositions()
    }
    
    private fun fetchAccountData() {
        lifecycleScope.launch {
            repository.getAccount().fold(
                onSuccess = { response ->
                    if (response.success && response.data != null) {
                        // Update UI with account data
                        updateAccountUI(response.data)
                    } else {
                        // Handle error
                        showError(response.error ?: "Unknown error")
                    }
                },
                onFailure = { exception ->
                    showError(exception.message ?: "Network error")
                }
            )
        }
    }
    
    private fun fetchPositions() {
        lifecycleScope.launch {
            repository.getPositions().fold(
                onSuccess = { response ->
                    if (response.success && response.data != null) {
                        // Update UI with positions
                        updatePositionsUI(response.data)
                    }
                },
                onFailure = { exception ->
                    showError(exception.message ?: "Network error")
                }
            )
        }
    }
    
    private fun placeMarketOrder(symbol: String, side: String, quantity: Double) {
        lifecycleScope.launch {
            val orderRequest = OrderRequest(
                symbol = symbol,
                side = side,
                type = "MARKET",
                quantity = quantity
            )
            
            repository.placeOrder(orderRequest).fold(
                onSuccess = { response ->
                    if (response.success) {
                        showSuccess("Order placed successfully")
                    } else {
                        showError(response.error ?: "Order failed")
                    }
                },
                onFailure = { exception ->
                    showError(exception.message ?: "Order failed")
                }
            )
        }
    }
    
    private fun handleWebSocketMessage(type: String, data: JsonObject) {
        when (type) {
            "positions_update" -> {
                // Handle position updates
                println("Position update: $data")
            }
            "order_update" -> {
                // Handle order updates
                println("Order update: $data")
            }
            "balance_update" -> {
                // Handle balance updates
                println("Balance update: $data")
            }
            "connection" -> {
                // Handle connection status
                val status = data.get("status")?.asString
                println("Connection status: $status")
            }
        }
    }
    
    private fun updateConnectionStatus(connected: Boolean) {
        // Update UI connection indicator
    }
    
    private fun updateAccountUI(accountData: AccountData) {
        // Update your UI with account data
    }
    
    private fun updatePositionsUI(positions: List<PositionData>) {
        // Update your UI with positions
    }
    
    private fun showError(message: String) {
        // Show error message to user
    }
    
    private fun showSuccess(message: String) {
        // Show success message to user
    }
    
    override fun onDestroy() {
        super.onDestroy()
        webSocketClient.disconnect()
    }
}
```

### Network Security Config
Add to your `res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">allinone-app-5t9md.ondigitalocean.app</domain>
    </domain-config>
</network-security-config>
```

And in your `AndroidManifest.xml`:
```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ... >
```

### Permissions
Add to your `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

This complete integration guide provides everything you need to connect your Android app to the external Binance service running on DigitalOcean!