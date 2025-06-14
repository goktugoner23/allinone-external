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