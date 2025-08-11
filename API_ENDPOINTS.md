# API Endpoints Documentation

This document provides comprehensive documentation for all API endpoints in the AllInOne External Services application.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `http://129.212.143.6:3000`

**Connection Details:**

- **Port**: 3000
- **Protocol**: HTTP
- **IPv4 Address**: Use the IPv4 address (129.212.143.6) for production connections
- **Reserved IP**: Not applicable - use the public IPv4 address

**Example Usage:**

```bash
# Production
curl http://129.212.143.6:3000/health

# Development
curl http://localhost:3000/health
```

## Authentication

All Binance API endpoints require valid API keys configured in the environment variables. The service handles authentication with Binance automatically.

## Response Format

All API endpoints return responses in a consistent format:

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "timestamp": 1640995200000
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message description",
  "timestamp": 1640995200000
}
```

## Health Check

### GET /health

Get service health status and connection information.

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "services": {
      "spot": {
        "isConnected": true,
        "clientCount": 0
      },
      "usdm": {
        "isConnected": false,
        "clientCount": 0
      },
      "coinm": {
        "isConnected": false,
        "clientCount": 0
      },
      "isInitialized": true
    },
    "uptime": 123.456,
    "memory": {
      "rss": 54521856,
      "heapTotal": 13934592,
      "heapUsed": 12321456,
      "external": 3436045,
      "arrayBuffers": 77828
    },
    "version": "1.0.0"
  },
  "timestamp": 1640995200000
}
```

## Spot Trading API

Base path: `/api/binance/spot`

### Account & Balance Endpoints

#### GET /api/binance/spot/account

Get spot account information.

**Response:**

```json
{
  "success": true,
  "data": {
    "makerCommission": 15,
    "takerCommission": 15,
    "buyerCommission": 0,
    "sellerCommission": 0,
    "canTrade": true,
    "canWithdraw": true,
    "canDeposit": true,
    "balances": [
      {
        "asset": "BTC",
        "free": "4723846.89208129",
        "locked": "0.00000000"
      }
    ]
  },
  "timestamp": 1640995200000
}
```

#### GET /api/binance/spot/balances

Get all spot balances.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "asset": "BTC",
      "free": "4723846.89208129",
      "locked": "0.00000000"
    },
    {
      "asset": "USDT",
      "free": "1000.00000000",
      "locked": "0.00000000"
    }
  ],
  "timestamp": 1640995200000
}
```

#### GET /api/binance/spot/balance/:asset

Get balance for a specific asset.

**Parameters:**

- `asset` (path, optional): Asset symbol (e.g., BTC, USDT)

**Example:** `GET /api/binance/spot/balance/BTC`

**Response:**

```json
{
  "success": true,
  "data": {
    "asset": "BTC",
    "free": "4723846.89208129",
    "locked": "0.00000000"
  },
  "timestamp": 1640995200000
}
```

### Order Management Endpoints

#### GET /api/binance/spot/orders

Get open spot orders.

**Query Parameters:**

- `symbol` (optional): Trading pair symbol (e.g., BTCUSDT)
- `limit` (optional): Number of orders to return (default: 500, max: 1000)
- `offset` (optional): Pagination offset (default: 0)

**Example:** `GET /api/binance/spot/orders?symbol=BTCUSDT&limit=10`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "symbol": "BTCUSDT",
      "orderId": 28,
      "orderListId": -1,
      "clientOrderId": "6gCrw2kRUAF9CvJDGP16IP",
      "price": "10.00000000",
      "origQty": "10.00000000",
      "executedQty": "10.00000000",
      "cummulativeQuoteQty": "10.00000000",
      "status": "FILLED",
      "timeInForce": "GTC",
      "type": "LIMIT",
      "side": "SELL",
      "stopPrice": "0.00000000",
      "icebergQty": "0.00000000",
      "time": 1499827319559,
      "updateTime": 1499827319559,
      "isWorking": true,
      "origQuoteOrderQty": "0.00000000"
    }
  ],
  "timestamp": 1640995200000
}
```

#### POST /api/binance/spot/orders

Place a new spot order.

**Request Body:**

```json
{
  "symbol": "BTCUSDT",
  "side": "BUY",
  "type": "LIMIT",
  "quantity": 0.001,
  "price": 50000.0,
  "timeInForce": "GTC"
}
```

**Request Body Parameters:**

- `symbol` (required): Trading pair symbol
- `side` (required): Order side ("BUY" or "SELL")
- `type` (required): Order type ("MARKET", "LIMIT", "STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER")
- `quantity` (required): Order quantity
- `price` (optional): Order price (required for LIMIT orders)
- `stopPrice` (optional): Stop price (required for stop orders)
- `timeInForce` (optional): Time in force ("GTC", "IOC", "FOK")

**Response:**

```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "orderId": 28,
    "orderListId": -1,
    "clientOrderId": "6gCrw2kRUAF9CvJDGP16IP",
    "transactTime": 1507725176595,
    "price": "50000.00000000",
    "origQty": "0.00100000",
    "executedQty": "0.00000000",
    "cummulativeQuoteQty": "0.00000000",
    "status": "NEW",
    "timeInForce": "GTC",
    "type": "LIMIT",
    "side": "BUY"
  },
  "timestamp": 1640995200000
}
```

#### DELETE /api/binance/spot/orders/:symbol/:orderId

Cancel a specific spot order.

**Parameters:**

- `symbol` (path, required): Trading pair symbol
- `orderId` (path, required): Order ID to cancel

**Example:** `DELETE /api/binance/spot/orders/BTCUSDT/28`

**Response:**

```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "orderId": 28,
    "orderListId": -1,
    "clientOrderId": "6gCrw2kRUAF9CvJDGP16IP",
    "price": "50000.00000000",
    "origQty": "0.00100000",
    "executedQty": "0.00000000",
    "cummulativeQuoteQty": "0.00000000",
    "status": "CANCELED",
    "timeInForce": "GTC",
    "type": "LIMIT",
    "side": "BUY"
  },
  "timestamp": 1640995200000
}
```

#### DELETE /api/binance/spot/orders/:symbol

Cancel all open orders for a symbol.

**Parameters:**

- `symbol` (path, required): Trading pair symbol

**Example:** `DELETE /api/binance/spot/orders/BTCUSDT`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "symbol": "BTCUSDT",
      "orderId": 28,
      "orderListId": -1,
      "clientOrderId": "6gCrw2kRUAF9CvJDGP16IP",
      "price": "50000.00000000",
      "origQty": "0.00100000",
      "executedQty": "0.00000000",
      "cummulativeQuoteQty": "0.00000000",
      "status": "CANCELED",
      "timeInForce": "GTC",
      "type": "LIMIT",
      "side": "BUY"
    }
  ],
  "timestamp": 1640995200000
}
```

### Market Data Endpoints

#### GET /api/binance/spot/price/:symbol

Get current price for a symbol or all symbols.

**Parameters:**

- `symbol` (path, optional): Trading pair symbol

**Example:** `GET /api/binance/spot/price/BTCUSDT`

**Response (single symbol):**

```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "price": "50000.00000000"
  },
  "timestamp": 1640995200000
}
```

**Example:** `GET /api/binance/spot/price`

**Response (all symbols):**

```json
{
  "success": true,
  "data": [
    {
      "symbol": "BTCUSDT",
      "price": "50000.00000000"
    },
    {
      "symbol": "ETHUSDT",
      "price": "3000.00000000"
    }
  ],
  "timestamp": 1640995200000
}
```

#### GET /api/binance/spot/ticker/:symbol

Get 24hr ticker statistics.

**Parameters:**

- `symbol` (path, optional): Trading pair symbol

**Example:** `GET /api/binance/spot/ticker/BTCUSDT`

**Response:**

```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "priceChange": "-94.99999800",
    "priceChangePercent": "-95.960",
    "weightedAvgPrice": "0.29628482",
    "prevClosePrice": "0.10002000",
    "lastPrice": "4.00000200",
    "lastQty": "200.00000000",
    "bidPrice": "4.00000000",
    "askPrice": "4.00000200",
    "openPrice": "99.00000000",
    "highPrice": "100.00000000",
    "lowPrice": "0.10000000",
    "volume": "8913.30000000",
    "quoteVolume": "15.30000000",
    "openTime": 1499783499040,
    "closeTime": 1499869899040,
    "firstId": 28385,
    "lastId": 28460,
    "count": 76
  },
  "timestamp": 1640995200000
}
```

#### GET /api/binance/spot/depth/:symbol

Get order book depth.

**Parameters:**

- `symbol` (path, required): Trading pair symbol
- `limit` (query, optional): Number of entries to return (default: 100, max: 5000)

**Example:** `GET /api/binance/spot/depth/BTCUSDT?limit=10`

**Response:**

```json
{
  "success": true,
  "data": {
    "lastUpdateId": 1027024,
    "bids": [
      ["4.00000000", "431.00000000"],
      ["3.99000000", "100.00000000"]
    ],
    "asks": [
      ["4.00000200", "12.00000000"],
      ["5.10000000", "28.00000000"]
    ]
  },
  "timestamp": 1640995200000
}
```

#### GET /api/binance/spot/trades/:symbol

Get recent trades.

**Parameters:**

- `symbol` (path, required): Trading pair symbol
- `limit` (query, optional): Number of trades to return (default: 500, max: 1000)

**Example:** `GET /api/binance/spot/trades/BTCUSDT?limit=5`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 28457,
      "price": "4.00000100",
      "qty": "12.00000000",
      "quoteQty": "48.000012",
      "time": 1499865549590,
      "isBuyerMaker": true,
      "isBestMatch": true
    }
  ],
  "timestamp": 1640995200000
}
```

## USD-M Futures API

Base path: `/api/binance/futures`

### Account & Position Endpoints

#### GET /api/binance/futures/account

Get USD-M futures account information.

**Response:**

```json
{
  "success": true,
  "data": {
    "feeTier": 0,
    "canTrade": true,
    "canDeposit": true,
    "canWithdraw": true,
    "updateTime": 0,
    "totalInitialMargin": "0.00000000",
    "totalMaintMargin": "0.00000000",
    "totalWalletBalance": "23.72469206",
    "totalUnrealizedProfit": "0.00000000",
    "totalMarginBalance": "23.72469206",
    "totalPositionInitialMargin": "0.00000000",
    "totalOpenOrderInitialMargin": "0.00000000",
    "totalCrossWalletBalance": "23.72469206",
    "totalCrossUnPnl": "0.00000000",
    "availableBalance": "23.72469206",
    "maxWithdrawAmount": "23.72469206",
    "assets": [
      {
        "asset": "USDT",
        "walletBalance": "23.72469206",
        "unrealizedProfit": "0.00000000",
        "marginBalance": "23.72469206",
        "maintMargin": "0.00000000",
        "initialMargin": "0.00000000",
        "positionInitialMargin": "0.00000000",
        "openOrderInitialMargin": "0.00000000",
        "crossWalletBalance": "23.72469206",
        "crossUnPnl": "0.00000000",
        "availableBalance": "23.72469206",
        "maxWithdrawAmount": "23.72469206",
        "marginAvailable": true,
        "updateTime": 1625474304765
      }
    ],
    "positions": [
      {
        "symbol": "BTCUSDT",
        "initialMargin": "0",
        "maintMargin": "0",
        "unrealizedProfit": "0.00000000",
        "positionInitialMargin": "0",
        "openOrderInitialMargin": "0",
        "leverage": "100",
        "isolated": false,
        "entryPrice": "0.00000",
        "maxNotional": "250000",
        "positionSide": "BOTH",
        "positionAmt": "0",
        "notional": "0",
        "isolatedWallet": "0",
        "updateTime": 0,
        "bidNotional": "0",
        "askNotional": "0"
      }
    ]
  },
  "timestamp": 1640995200000
}
```

#### GET /api/binance/futures/positions

Get USD-M futures position information.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "symbol": "BTCUSDT",
      "positionAmt": "0.001",
      "entryPrice": "50000.0",
      "markPrice": "50100.0",
      "unRealizedProfit": "0.1",
      "liquidationPrice": "0",
      "leverage": "100",
      "maxNotionalValue": "250000",
      "marginType": "cross",
      "isolatedMargin": "0.00000000",
      "isAutoAddMargin": "false",
      "positionSide": "BOTH",
      "notional": "50.1",
      "isolatedWallet": "0",
      "updateTime": 1625474304765
    }
  ],
  "timestamp": 1640995200000
}
```

#### GET /api/binance/futures/balance/:asset

Get USD-M futures balance.

**Parameters:**

- `asset` (path, optional): Asset symbol (default: USDT)

**Example:** `GET /api/binance/futures/balance/USDT`

**Response:**

```json
{
  "success": true,
  "data": {
    "asset": "USDT",
    "walletBalance": "23.72469206",
    "unrealizedProfit": "0.00000000",
    "marginBalance": "23.72469206",
    "maintMargin": "0.00000000",
    "initialMargin": "0.00000000",
    "positionInitialMargin": "0.00000000",
    "openOrderInitialMargin": "0.00000000",
    "maxWithdrawAmount": "23.72469206",
    "crossWalletBalance": "23.72469206",
    "crossUnPnl": "0.00000000",
    "availableBalance": "23.72469206"
  },
  "timestamp": 1640995200000
}
```

### Order Management Endpoints

#### GET /api/binance/futures/orders

Get USD-M futures open orders.

**Query Parameters:**

- `symbol` (optional): Trading pair symbol
- `limit` (optional): Number of orders to return
- `offset` (optional): Pagination offset

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "avgPrice": "0.00000",
      "clientOrderId": "abc",
      "cumQuote": "0",
      "executedQty": "0",
      "orderId": 1917641,
      "origQty": "0.40",
      "origType": "TRAILING_STOP_MARKET",
      "price": "0",
      "reduceOnly": false,
      "side": "BUY",
      "positionSide": "SHORT",
      "status": "NEW",
      "stopPrice": "9300",
      "closePosition": false,
      "symbol": "BTCUSDT",
      "time": 1579276756075,
      "timeInForce": "GTC",
      "type": "TRAILING_STOP_MARKET",
      "activatePrice": "9020",
      "priceRate": "0.3",
      "updateTime": 1579276756075,
      "workingType": "CONTRACT_PRICE",
      "priceProtect": false
    }
  ],
  "timestamp": 1640995200000
}
```

#### POST /api/binance/futures/orders

Place a new USD-M futures order.

**Request Body:**

```json
{
  "symbol": "BTCUSDT",
  "side": "BUY",
  "type": "LIMIT",
  "quantity": 0.001,
  "price": 50000.0,
  "timeInForce": "GTC",
  "reduceOnly": false,
  "positionSide": "BOTH"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "clientOrderId": "testOrder",
    "cumQty": "0",
    "cumQuote": "0",
    "executedQty": "0",
    "orderId": 22542179,
    "avgPrice": "0.00000",
    "origQty": "0.001",
    "price": "50000",
    "reduceOnly": false,
    "side": "BUY",
    "positionSide": "BOTH",
    "status": "NEW",
    "stopPrice": "0",
    "closePosition": false,
    "symbol": "BTCUSDT",
    "timeInForce": "GTC",
    "type": "LIMIT",
    "origType": "LIMIT",
    "activatePrice": "0",
    "priceRate": "0",
    "updateTime": 1566818724722,
    "workingType": "CONTRACT_PRICE",
    "priceProtect": false
  },
  "timestamp": 1640995200000
}
```

#### DELETE /api/binance/futures/orders/:symbol/:orderId

Cancel a specific USD-M futures order.

**Parameters:**

- `symbol` (path, required): Trading pair symbol
- `orderId` (path, required): Order ID to cancel

#### DELETE /api/binance/futures/orders/:symbol

Cancel all USD-M futures orders for a symbol.

**Parameters:**

- `symbol` (path, required): Trading pair symbol

#### POST /api/binance/futures/tpsl

Set Take Profit and Stop Loss for USD-M futures.

**Request Body:**

```json
{
  "symbol": "BTCUSDT",
  "side": "BUY",
  "takeProfitPrice": 55000.0,
  "stopLossPrice": 45000.0,
  "quantity": 0.001
}
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "clientOrderId": "testOrder1",
      "cumQty": "0",
      "cumQuote": "0",
      "executedQty": "0",
      "orderId": 22542180,
      "avgPrice": "0.00000",
      "origQty": "0.001",
      "price": "55000",
      "reduceOnly": true,
      "side": "SELL",
      "positionSide": "BOTH",
      "status": "NEW",
      "stopPrice": "0",
      "closePosition": false,
      "symbol": "BTCUSDT",
      "timeInForce": "GTC",
      "type": "TAKE_PROFIT_MARKET",
      "origType": "TAKE_PROFIT_MARKET",
      "activatePrice": "55000",
      "priceRate": "0",
      "updateTime": 1566818724722,
      "workingType": "CONTRACT_PRICE",
      "priceProtect": false
    }
  ],
  "timestamp": 1640995200000
}
```

### Market Data Endpoints

#### GET /api/binance/futures/price/:symbol

Get USD-M futures price information.

**Parameters:**

- `symbol` (path, optional): Trading pair symbol

**Response (single symbol):**

```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "price": "50000.00000000",
    "time": 1640995200000
  },
  "timestamp": 1640995200000
}
```

**Response (all symbols):**

```json
{
  "success": true,
  "data": [
    {
      "symbol": "BTCUSDT",
      "price": "50000.00000000",
      "time": 1640995200000
    },
    {
      "symbol": "ETHUSDT",
      "price": "3000.00000000",
      "time": 1640995200000
    }
  ],
  "timestamp": 1640995200000
}
```

## COIN-M Futures API

Base path: `/api/binance/coinm`

The COIN-M Futures API endpoints follow the same structure as USD-M Futures but operate on COIN-M contracts.

### Account & Position Endpoints

#### GET /api/binance/coinm/account

#### GET /api/binance/coinm/positions

#### GET /api/binance/coinm/balance/:asset

### Order Management Endpoints

#### GET /api/binance/coinm/orders

#### POST /api/binance/coinm/orders

#### DELETE /api/binance/coinm/orders/:symbol/:orderId

#### DELETE /api/binance/coinm/orders/:symbol

#### POST /api/binance/coinm/tpsl

### Market Data Endpoints

#### GET /api/binance/coinm/price/:symbol

## WebSocket Subscription API

Base path: `/api/binance`

### Spot WebSocket Subscriptions

#### POST /api/binance/spot/subscribe/ticker/:symbol

Subscribe to spot ticker updates.

**Parameters:**

- `symbol` (path, required): Trading pair symbol

**Request:** `POST /api/binance/spot/subscribe/ticker/BTCUSDT`

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Subscribed to spot ticker for BTCUSDT"
  },
  "timestamp": 1640995200000
}
```

#### POST /api/binance/spot/subscribe/depth/:symbol

Subscribe to spot order book depth updates.

**Parameters:**

- `symbol` (path, required): Trading pair symbol
- `levels` (query, optional): Depth levels (5, 10, 20)

**Request:** `POST /api/binance/spot/subscribe/depth/BTCUSDT?levels=10`

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Subscribed to spot depth for BTCUSDT"
  },
  "timestamp": 1640995200000
}
```

#### POST /api/binance/spot/subscribe/trades/:symbol

Subscribe to spot trade updates.

**Parameters:**

- `symbol` (path, required): Trading pair symbol

**Request:** `POST /api/binance/spot/subscribe/trades/BTCUSDT`

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Subscribed to spot trades for BTCUSDT"
  },
  "timestamp": 1640995200000
}
```

### WebSocket Management

#### GET /api/binance/websocket/status

Get WebSocket connection status.

**Response:**

```json
{
  "success": true,
  "data": {
    "spot": {
      "isConnected": true,
      "clientCount": 0
    },
    "usdm": {
      "isConnected": false,
      "clientCount": 0
    },
    "coinm": {
      "isConnected": false,
      "clientCount": 0
    },
    "isInitialized": true
  },
  "timestamp": 1640995200000
}
```

## WebSocket Real-time API

Connect to `ws://localhost:3000` (or your production WebSocket URL) for real-time updates.

### Connection

```javascript
const ws = new WebSocket("ws://localhost:3000");

ws.onopen = function (event) {
  console.log("Connected to WebSocket");
};

ws.onmessage = function (event) {
  const data = JSON.parse(event.data);
  console.log("Received:", data);
};
```

### Message Types

#### Welcome Message

Sent when connection is established:

```json
{
  "type": "welcome",
  "message": "Connected to Binance Trading API WebSocket",
  "timestamp": 1640995200000
}
```

#### Ticker Updates

Real-time price ticker updates:

```json
{
  "type": "ticker",
  "data": {
    "symbol": "BTCUSDT",
    "price": "50000.00",
    "change": "2.5%",
    "volume": "1234.56"
  },
  "timestamp": 1640995200000
}
```

#### Depth Updates

Order book depth updates:

```json
{
  "type": "depth",
  "data": {
    "symbol": "BTCUSDT",
    "bids": [["50000.00", "0.001"]],
    "asks": [["50001.00", "0.002"]]
  },
  "timestamp": 1640995200000
}
```

#### Trade Updates

Real-time trade execution updates:

```json
{
  "type": "trade",
  "data": {
    "symbol": "BTCUSDT",
    "price": "50000.00",
    "quantity": "0.001",
    "side": "BUY"
  },
  "timestamp": 1640995200000
}
```

#### Ping/Pong

Send ping to maintain connection:

```json
{
  "type": "ping",
  "timestamp": 1640995200000
}
```

Server responds with pong:

```json
{
  "type": "pong",
  "timestamp": 1640995200000
}
```

## Error Codes

### HTTP Status Codes

- `200` - Success
- `201` - Created (for successful order placement)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication errors)
- `404` - Not Found
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error

### Custom Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `AUTHENTICATION_ERROR` - API authentication failed
- `ORDER_ERROR` - Trading order error
- `WEBSOCKET_ERROR` - WebSocket connection error
- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded

### Error Response Examples

#### Validation Error

```json
{
  "success": false,
  "error": "Validation failed: symbol is required",
  "code": "VALIDATION_ERROR",
  "timestamp": 1640995200000
}
```

#### Authentication Error

```json
{
  "success": false,
  "error": "Invalid API key",
  "code": "AUTHENTICATION_ERROR",
  "timestamp": 1640995200000
}
```

#### Rate Limit Error

```json
{
  "success": false,
  "error": "Too many requests, please try again later",
  "code": "RATE_LIMIT_EXCEEDED",
  "timestamp": 1640995200000
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Default**: 100 requests per 15 minutes per IP
- **Burst**: Short bursts allowed up to limit
- **Headers**: Rate limit information included in response headers

Rate limit headers:

- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when rate limit resets

## Testing

### Health Check

```bash
curl http://localhost:3000/health
```

### Get Spot Account

```bash
curl http://localhost:3000/api/binance/spot/account
```

### Place Spot Order

```bash
curl -X POST http://localhost:3000/api/binance/spot/orders \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "side": "BUY",
    "type": "MARKET",
    "quantity": 0.001
  }'
```

### WebSocket Test

```javascript
const ws = new WebSocket("ws://localhost:3000");
ws.onmessage = (event) => console.log(JSON.parse(event.data));
```

## SDK Examples

### Node.js/JavaScript

```javascript
const axios = require("axios");

const api = axios.create({
  baseURL: "http://localhost:3000",
  timeout: 30000,
});

// Get account info
const account = await api.get("/api/binance/spot/account");
console.log(account.data);

// Place order
const order = await api.post("/api/binance/spot/orders", {
  symbol: "BTCUSDT",
  side: "BUY",
  type: "MARKET",
  quantity: 0.001,
});
console.log(order.data);
```

### Python

```python
import requests
import json

base_url = 'http://localhost:3000'

# Get account info
response = requests.get(f'{base_url}/api/binance/spot/account')
account = response.json()
print(account)

# Place order
order_data = {
    'symbol': 'BTCUSDT',
    'side': 'BUY',
    'type': 'MARKET',
    'quantity': 0.001
}
response = requests.post(f'{base_url}/api/binance/spot/orders', json=order_data)
order = response.json()
print(order)
```

### cURL Examples

```bash
# Health check
curl http://localhost:3000/health

# Get account
curl http://localhost:3000/api/binance/spot/account

# Get positions
curl http://localhost:3000/api/binance/futures/positions

# Place order
curl -X POST http://localhost:3000/api/binance/spot/orders \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","side":"BUY","type":"MARKET","quantity":0.001}'

# Cancel order
curl -X DELETE http://localhost:3000/api/binance/spot/orders/BTCUSDT/12345

# Subscribe to ticker
curl -X POST http://localhost:3000/api/binance/spot/subscribe/ticker/BTCUSDT
```

# RAG (Retrieval-Augmented Generation) API

Base path: `/api/rag`

The RAG API provides intelligent document storage, retrieval, and question-answering capabilities. It combines vector similarity search with OpenAI for enhanced responses across different domains (Instagram, fitness, trading, general).

## Core Query Endpoints

### POST /api/rag/query

**Main RAG query endpoint** - Ask questions and get AI-powered answers based on your stored documents.

**Request Body:**

```json
{
  "query": "What are my best performing posts?",
  "domain": "instagram",
  "options": {
    "topK": 5,
    "minScore": 0.7
  }
}
```

**Parameters:**

- `query` (required): Question or query string (1-2000 characters)
- `domain` (optional): One of `instagram`, `fitness`, `trading`, `general`
- `options.topK` (optional): Number of similar documents to retrieve (1-20, default: 5)
- `options.minScore` (optional): Minimum similarity score (0-1, default: 0.7)

**Response:**

```json
{
  "success": true,
  "data": {
    "answer": "Based on your Instagram data, your best performing posts are...",
    "sources": [
      {
        "documentId": "instagram-post-123",
        "content": "Post content excerpt...",
        "metadata": {
          "domain": "instagram",
          "postId": "123",
          "engagementRate": 8.5
        },
        "similarity": 0.92
      }
    ],
    "confidence": 0.85,
    "metadata": {
      "totalMatches": 15,
      "processedQuery": {
        "query": "high engagement posts Instagram metrics",
        "searchTerms": ["engagement", "performance", "likes", "comments"]
      },
      "processingTime": 1234
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/rag/status

Get RAG system status and statistics.

**Response:**

```json
{
  "success": true,
  "data": {
    "isInitialized": true,
    "documentCount": 150,
    "namespaces": {
      "instagram": 75,
      "fitness": 25,
      "trading": 30,
      "general": 20
    },
    "lastUpdated": "2024-01-01T00:00:00.000Z",
    "vectorDimensions": 1536,
    "embeddingModel": "text-embedding-ada-002"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Document Management Endpoints

### POST /api/rag/documents

Add a single document to the RAG system.

**Request Body:**

```json
{
  "id": "unique-document-id",
  "content": "Document content to be embedded and stored...",
  "metadata": {
    "domain": "instagram",
    "source": "api",
    "title": "Document Title",
    "tags": ["tag1", "tag2"],
    "contentType": "post"
  }
}
```

**Parameters:**

- `id` (required): Unique document identifier (1-255 characters)
- `content` (required): Document content (1-50000 characters)
- `metadata.domain` (required): One of `instagram`, `fitness`, `trading`, `general`
- `metadata.source` (required): Source identifier
- `metadata.contentType` (required): One of `text`, `post`, `article`, `summary`, `note`

**Response:**

```json
{
  "success": true,
  "data": {
    "documentId": "unique-document-id",
    "status": "added"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### POST /api/rag/documents/batch

Add multiple documents to the RAG system (1-50 documents per request).

**Request Body:**

```json
{
  "documents": [
    {
      "id": "doc-1",
      "content": "First document content...",
      "metadata": {
        "domain": "instagram",
        "source": "api",
        "contentType": "post"
      }
    },
    {
      "id": "doc-2",
      "content": "Second document content...",
      "metadata": {
        "domain": "instagram",
        "source": "api",
        "contentType": "post"
      }
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "results": [
      {
        "documentId": "doc-1",
        "status": "fulfilled"
      },
      {
        "documentId": "doc-2",
        "status": "fulfilled"
      }
    ]
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### PUT /api/rag/documents/:id

Update an existing document in the RAG system.

**Parameters:**

- `id` (path): Document ID to update

**Request Body:**

```json
{
  "content": "Updated document content...",
  "metadata": {
    "domain": "instagram",
    "source": "api",
    "contentType": "post"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "documentId": "document-id",
    "status": "updated"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### DELETE /api/rag/documents/:id

Remove a document from the RAG system.

**Parameters:**

- `id` (path): Document ID to remove
- `domain` (query, optional): Domain filter

**Example:** `DELETE /api/rag/documents/doc-123?domain=instagram`

**Response:**

```json
{
  "success": true,
  "data": {
    "documentId": "doc-123",
    "status": "removed"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Administrative Endpoints

### DELETE /api/rag/namespace/:namespace

**Clear all data from a specific namespace** - Use with caution! This removes all documents in the specified namespace.

**Parameters:**

- `namespace` (path): Namespace to clear (e.g., `instagram`, `fitness`, `trading`, `general`)

**Example:** `DELETE /api/rag/namespace/instagram`

**Response:**

```json
{
  "success": true,
  "data": {
    "namespace": "instagram",
    "status": "cleared"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/rag/health

Simple health check for the RAG system.

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "ragServiceInitialized": true,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /api/rag/test-instagram

Test the enhanced Instagram RAG analysis with predefined queries.

**Response:**

```json
{
  "success": true,
  "message": "Enhanced Instagram RAG analysis test completed",
  "results": [
    {
      "query": "What are my best performing posts?",
      "answer": "Based on your Instagram data...",
      "sourcesCount": 5,
      "confidence": 0.92,
      "processingTime": 1234
    }
  ],
  "improvements": [
    "Instagram-specific query enhancement with OpenAI",
    "Better search terms for vector similarity matching",
    "Instagram analytics prompts for concrete insights"
  ]
}
```

---

# Instagram API

Base path: `/api/instagram`

The Instagram API provides comprehensive integration with Instagram Business API, including data fetching, metrics tracking, Firestore storage, and RAG system synchronization - compatible with your existing Kotlin app.

## Core Data Pipeline Endpoints

### POST /api/instagram/sync

**Main pipeline endpoint** - Fetch from Instagram API, store in Firestore, sync to RAG system.

**Query Parameters:**

- `limit` (optional): Number of posts to fetch (default: 1000, max: 1000) - **No artificial limits!**

**Example:** `POST /api/instagram/sync` (fetches all available posts)
**Example:** `POST /api/instagram/sync?limit=50` (limit for testing only)

**Response:**

```json
{
  "success": true,
  "message": "Instagram data sync completed successfully",
  "data": {
    "posts": [...],
    "totalFetched": 50,
    "totalStored": 50,
    "ragSynced": true,
    "lastSync": "2024-01-01T00:00:00.000Z",
    "cacheUsed": false,
    "cacheReason": "Cache refresh needed"
  },
  "processingTime": 5234,
  "timestamp": 1640995200000
}
```

### POST /api/instagram/sync-complete

Complete pipeline: Instagram API → Firestore + JSON → RAG.

**Query Parameters:**

- `limit` (optional): Number of posts to sync (default: 1000, max: 1000)

**Response:**

```json
{
  "success": true,
  "message": "Complete Instagram sync pipeline completed successfully",
  "data": {
    "account": {
      "username": "your_username",
      "followersCount": 5000,
      "mediaCount": 150
    },
    "sync": {
      "postsFromAPI": 150,
      "postsToFirestore": 150,
      "postsToRAG": 150,
      "jsonFilePath": "/path/to/instagram-complete-data.json"
    },
    "rag": {
      "documentsAdded": 150,
      "ragStatus": "loaded",
      "processingTime": 5234
    }
  },
  "processingTime": 15234,
  "timestamp": 1640995200000
}
```

### GET /api/instagram/analytics

Get comprehensive analytics combining fresh account data with stored posts.

**Response:**

```json
{
  "success": true,
  "data": {
    "account": {
      "id": "17841400027244616",
      "username": "your_username",
      "accountType": "BUSINESS",
      "mediaCount": 150,
      "followersCount": 5000,
      "followsCount": 500
    },
    "posts": [
      {
        "id": "17898870784439040",
        "shortcode": "ABC123def",
        "caption": "...",
        "mediaType": "IMAGE | VIDEO | CAROUSEL_ALBUM",
        "mediaUrl": "https://...",
        "thumbnailUrl": "https://...",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "metrics": {
          "likesCount": 150,
          "commentsCount": 25,
          "engagementRate": 8.4
        }
      }
    ],
    "summary": {
      "totalPosts": 150,
      "totalEngagement": 25000,
      "avgEngagementRate": 3.2,
      "lastUpdate": "2024-01-01T00:00:00.000Z"
    }
  },
  "timestamp": 1640995200000
}
```

## Metrics Management Endpoints (Kotlin App Compatible)

### POST /api/instagram/metrics/update

**Update metrics for existing posts** - like your Kotlin app does. Fetches fresh metrics from Instagram API and updates Firestore.

**Query Parameters:**

- `postIds` (optional): Comma-separated list of post IDs to update. If not provided, updates posts needing refresh (older than 24 hours)

**Example:** `POST /api/instagram/metrics/update?postIds=17898870784439040,17912345678901234`

**Response:**

```json
{
  "success": true,
  "message": "Instagram posts metrics update completed",
  "data": {
    "updated": 45,
    "errors": 2,
    "results": [
      {
        "postId": "17898870784439040",
        "success": true
      },
      {
        "postId": "17912345678901234",
        "success": false,
        "error": "Post not found"
      }
    ]
  },
  "timestamp": 1640995200000
}
```

### POST /api/instagram/metrics/sync

**Sync fresh metrics** from Instagram API to Firestore - maintains data freshness like your Kotlin app.

**Query Parameters:**

- `limit` (optional): Number of recent posts to sync (default: 1000, max: 1000) - **No artificial limits!**

**Example:** `POST /api/instagram/metrics/sync` (syncs all available posts)
**Example:** `POST /api/instagram/metrics/sync?limit=100` (limit for testing only)

**Response:**

```json
{
  "success": true,
  "message": "Instagram metrics sync to Firestore completed",
  "data": {
    "synced": 98,
    "errors": 2,
    "lastSync": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": 1640995200000
}
```

## Data Access Endpoints

### GET /api/instagram/account

Get Instagram account information from Instagram API.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "17841400027244616",
    "username": "your_username",
    "name": "Your Display Name",
    "biography": "Your bio text",
    "website": "https://your-website.com",
    "profilePictureUrl": "https://...",
    "followersCount": 5000,
    "followsCount": 500,
    "mediaCount": 150,
    "accountType": "BUSINESS"
  },
  "timestamp": 1640995200000
}
```

### GET /api/instagram/posts

Get Instagram posts from Instagram API with pagination.

**Query Parameters:**

- `limit` (optional): Number of posts to fetch (default: 1000, max: 1000) - **No artificial limits!**
- `after` (optional): Pagination cursor

**Example:** `GET /api/instagram/posts` (fetches all available posts)
**Example:** `GET /api/instagram/posts?limit=50&after=cursor_string` (limit for testing only)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "17898870784439040",
      "shortcode": "ABC123def",
      "caption": "Your post caption #fitness #motivation",
      "mediaType": "IMAGE | VIDEO | CAROUSEL_ALBUM",
      "mediaUrl": "https://...",
      "thumbnailUrl": "https://...",
      "permalink": "https://www.instagram.com/p/ABC123def/",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "username": "your_username",
      "metrics": {
        "likesCount": 150,
        "commentsCount": 25,
        "sharesCount": 5,
        "savesCount": 30,
        "reachCount": 2500,
        "impressionsCount": 3200,
        "engagementRate": 8.4,
        "totalInteractions": 210
      },
      "hashtags": ["#fitness", "#motivation"],
      "mentions": ["@someone"]
    }
  ],
  "paging": {
    "cursors": {
      "before": "before_cursor",
      "after": "after_cursor"
    },
    "next": "next_page_url"
  },
  "timestamp": 1640995200000
}
```

### GET /api/instagram/profile-picture/:username

Fetch a public Instagram profile picture by username. Returns HD image URL when available.

**Parameters:**

- `username` (path, required): Instagram username (e.g., `goktug_oner`)

**Example:** `GET /api/instagram/profile-picture/goktug_oner`

**Response:**

```json
{
  "success": true,
  "data": {
    "username": "goktug_oner",
    "imageUrl": "https://.../profile_pic.jpg",
    "isPrivate": false,
    "isVerified": false,
    "fullName": "Goktug Oner"
  },
  "session": {
    "hasSession": true,
    "valid": true
  },
  "timestamp": 1640995200000
}
```

### GET /api/instagram/stories/:username

Fetch public stories for a username (images and videos). Requires public profile and a valid Instagram web session cookie configured via environment variables.

Environment variables used (optional but recommended for stories):
- `INSTAGRAM_SESSIONID`
- `INSTAGRAM_DS_USER_ID`

**Parameters:**

- `username` (path, required): Instagram username (e.g., `goktug_oner`)

**Example:** `GET /api/instagram/stories/goktug_oner`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "3696892577231948179_355058142",
      "mediaType": "IMAGE",
      "mediaUrl": "https://.../story_image.jpg",
      "timestamp": "2025-08-11T14:52:34.000Z",
      "expiresAt": "2025-08-12T14:52:34.000Z"
    }
  ],
  "count": 1,
  "session": {
    "hasSession": true,
    "valid": true
  },
  "timestamp": 1640995200000
}
```

Possible session status values in `session`:
- **hasSession**: whether `INSTAGRAM_SESSIONID` and `INSTAGRAM_DS_USER_ID` are set
- **valid**: whether a lightweight authenticated check succeeds
- **issue**: optional reason string (e.g., `unauthorized`, `login_required`) when invalid

## Firestore Integration Endpoints

### GET /api/instagram/firestore/posts

Get Instagram posts from Firestore (frontend-optimized). Supports smart sync with Instagram when counts differ, and optional forced sync.

**Query Parameters:**

- `forceSync` (optional, boolean): If true, forces a fresh sync from Instagram before returning data.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "17898870784439040",
      "caption": "Your post caption #fitness #motivation",
      "mediaType": "FEED",
      "permalink": "https://www.instagram.com/p/ABC123def/",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "formattedDate": "Jan 1, 2024",
      "metrics": {
        "likes": 150,
        "comments": 25,
        "shares": 5,
        "saved": 30,
        "reach": 2500,
        "views": 3200,
        "total_interactions": 210,
        "engagementRate": 8.4
      },
      "shortcode": "ABC123def",
      "hashtags": ["#fitness", "#motivation"],
      "mentions": ["@someone"],
      "mediaUrl": "https://...",
      "thumbnailUrl": "https://..."
    }
  ],
  "count": 150,
  "source": "Firebase Firestore (Auto-synced)",
  "syncInfo": {
    "triggered": true,
    "reason": "post_count_mismatch",
    "previousCount": 148,
    "currentCount": 150,
    "newPosts": 2,
    "processingTime": 2890
  },
  "timestamp": 1640995200000
}
```

### GET /api/instagram/firestore/raw

Get raw Instagram data from Firestore (exact format as your Kotlin app export).

**Response:**

```json
{
  "success": true,
  "posts": [
    {
      "id": "17898870784439040",
      "caption": "Your post caption #fitness #motivation",
      "mediaType": "FEED",
      "permalink": "https://www.instagram.com/p/ABC123def/",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "formattedDate": "Jan 1, 2024",
      "metrics": {
        "likes": 150,
        "comments": 25,
        "shares": 5,
        "saved": 30,
        "reach": 2500,
        "views": 3200,
        "total_interactions": 210
      }
    }
  ],
  "metadata": {
    "timestamp": 1640995200000,
    "count": 150,
    "source": "Firebase Firestore"
  }
}
```

### POST /api/instagram/firestore/sync-to-rag

Sync Firestore Instagram data to RAG system for AI queries.

**Response:**

```json
{
  "success": true,
  "data": {
    "lastSyncAt": "2024-01-01T00:00:00.000Z",
    "postsCount": 150,
    "storiesCount": 0,
    "insightsCount": 0,
    "status": "idle",
    "nextSyncAt": "2024-01-01T06:00:00.000Z"
  },
  "message": "Firestore Instagram data sync completed",
  "timestamp": 1640995200000
}
```

## Data Migration Endpoints

### POST /api/instagram/migrate/thumbnail-urls

**🔧 Migration endpoint** to fix existing Firestore posts that are missing thumbnail URLs. This updates posts stored before thumbnail URL support was implemented and refreshes stale URLs when needed.

**Query Parameters:**

- `limit` (optional): Number of posts to process (default: 1000, max: 1000). By default it processes all posts needing thumbnails.
- `dryRun` (optional): Run without making changes to preview results (default: false)

**Example:** `POST /api/instagram/migrate/thumbnail-urls` (processes all posts needing thumbnails)
**Example:** `POST /api/instagram/migrate/thumbnail-urls?limit=50&dryRun=true` (limit for testing only)

**Response:**

```json
{
  "success": true,
  "message": "Successfully updated 23 posts with thumbnail URLs",
  "data": {
    "totalExisting": 150,
    "needingUpdate": 87,
    "fetchedFromAPI": 25,
    "updated": 23,
    "failed": 2,
    "jsonRegenerated": true,
    "updateResults": [
      {
        "postId": "17898870784439040",
        "success": true,
        "thumbnailUrl": "https://scontent.cdninstagram.com/v/t51.71878-15/..."
      }
    ]
  },
  "dryRun": false,
  "processingTime": 8234,
  "timestamp": 1640995200000
}
```

**Important Notes:**

- Fixes legacy posts stored before thumbnail URL support and refreshes stale URLs when present
- Prefers `thumbnailUrl` for videos; falls back to `mediaUrl` if a thumbnail isn’t available
- Automatically regenerates JSON files with updated data
- Use `dryRun=true` to preview changes before applying them
- Only processes posts that are actually missing thumbnail URLs

## Cache Management Endpoints

### GET /api/instagram/cache/stats

Get Instagram cache statistics.

**Response:**

```json
{
  "success": true,
  "data": {
    "exists": true,
    "lastUpdate": "2024-01-01T00:00:00.000Z",
    "lastApiCheck": "2024-01-01T00:00:00.000Z",
    "totalPosts": 150,
    "shouldRefresh": false,
    "cacheAge": 1800,
    "nextRefreshIn": 21600
  },
  "timestamp": 1640995200000
}
```

### DELETE /api/instagram/cache

Clear Instagram cache to force fresh data fetch.

**Response:**

```json
{
  "success": true,
  "message": "Cache cleared successfully",
  "timestamp": 1640995200000
}
```

## Health Check Endpoints

### GET /api/instagram/status

Get comprehensive health status of all Instagram services.

**Response:**

```json
{
  "success": true,
  "health": {
    "instagram": true,
    "firestore": true,
    "rag": true,
    "cache": true,
    "overall": true
  },
  "timestamp": 1640995200000
}
```

### GET /api/instagram/health

Health check for Instagram API connection.

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

### GET /api/instagram/status

Comprehensive health/status for Instagram pipeline components (Instagram API, Firestore, RAG, cache).

**Response:**

```json
{
  "success": true,
  "health": {
    "instagram": true,
    "firestore": true,
    "rag": true,
    "cache": true,
    "overall": true
  },
  "timestamp": 1640995200000
}
```

### GET /api/instagram/firestore/health

Health check for Firebase Firestore connection.

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

## Error Responses

### Common Error Cases

#### 400 Bad Request - Missing Configuration

```json
{
  "success": false,
  "error": "Instagram access token not configured",
  "timestamp": 1640995200000
}
```

#### 400 Bad Request - Validation Error

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "limit",
      "message": "Must be between 1 and 100"
    }
  ],
  "timestamp": 1640995200000
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Failed to fetch Instagram posts",
  "details": "Rate limit exceeded",
  "timestamp": 1640995200000
}
```

## Advanced Pipeline Endpoints

### POST /api/instagram/sync-complete

**Complete sync pipeline** - Instagram API → Firestore + JSON → RAG system in one call.

**Query Parameters:**

- `limit` (optional): Number of posts to sync (default: 1000, max: 1000) - **No artificial limits!**

**Example:** `POST /api/instagram/sync-complete` (complete sync of all available posts)

**Response:**

```json
{
  "success": true,
  "message": "Complete Instagram sync pipeline completed successfully",
  "data": {
    "account": {
      "username": "your_username",
      "followersCount": 5000,
      "mediaCount": 150
    },
    "sync": {
      "postsFromAPI": 150,
      "postsToFirestore": 150,
      "postsToRAG": 150,
      "jsonFilePath": "/path/to/instagram-complete-data.json"
    },
    "rag": {
      "documentsAdded": 150,
      "ragStatus": "loaded",
      "processingTime": 5234
    }
  },
  "processingTime": 15234,
  "timestamp": 1640995200000
}
```

### POST /api/instagram/load-json-to-rag

Load existing JSON file data to RAG system.

**Response:**

```json
{
  "success": true,
  "message": "JSON data loaded to RAG system successfully",
  "data": {
    "documentsAdded": 150,
    "ragStatus": "loaded",
    "processingTime": 3456
  },
  "timestamp": 1640995200000
}
```

### GET /api/instagram/json-status

Check status of the Instagram JSON data file.

**Response:**

```json
{
  "success": true,
  "data": {
    "exists": true,
    "filePath": "/path/to/instagram-complete-data.json",
    "fileSize": 2048576,
    "lastModified": "2024-01-01T00:00:00.000Z",
    "postsCount": 150,
    "accountUsername": "your_username",
    "lastSync": "2024-01-01T00:00:00.000Z",
    "source": "instagram_business_api"
  },
  "timestamp": 1640995200000
}
```

### POST /api/instagram/data-updated

**Trigger RAG sync when data is updated** - Call this when Instagram data changes.

**Response:**

```json
{
  "success": true,
  "message": "Instagram data updated and successfully synced to RAG",
  "data": {
    "autoSyncEnabled": true,
    "ragSynced": true,
    "postsCount": 150,
    "status": "synced",
    "lastSyncAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": 1640995200000
}
```

## RAG Integration Endpoints

### POST /api/instagram/rag/auto-sync

Enable or disable automatic RAG sync for Instagram data.

**Query Parameters:**

- `enabled` (required): Boolean value to enable/disable auto-sync

**Example:** `POST /api/instagram/rag/auto-sync?enabled=true`

**Response:**

```json
{
  "success": true,
  "message": "Automatic RAG sync enabled",
  "data": {
    "autoSyncEnabled": true,
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": 1640995200000
}
```

### GET /api/instagram/rag/status

Get RAG sync status and configuration for Instagram data.

**Response:**

```json
{
  "success": true,
  "data": {
    "autoSyncEnabled": true,
    "lastChecked": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": 1640995200000
}
```

## Usage Examples

### Complete Data Pipeline (Kotlin App Compatible)

```bash
# 1. Complete sync pipeline (all available posts - no limits!)
curl -X POST "http://localhost:3000/api/instagram/sync-complete"

# OR step-by-step approach:
# 1a. Sync fresh data from Instagram API to Firestore (all posts)
curl -X POST "http://localhost:3000/api/instagram/sync"

# 1b. Update metrics for existing posts
curl -X POST "http://localhost:3000/api/instagram/metrics/update"

# 1c. Sync to RAG system for AI queries
curl -X POST "http://localhost:3000/api/instagram/firestore/sync-to-rag"

# 2. Get analytics
curl "http://localhost:3000/api/instagram/analytics"

# 3. Ask AI questions about your data
curl -X POST "http://localhost:3000/api/rag/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "What are my best performing posts?", "domain": "instagram"}'
```

### Periodic Metrics Sync (Like Kotlin App)

```bash
# Sync fresh metrics from Instagram API to Firestore (all posts - no limits!)
curl -X POST "http://localhost:3000/api/instagram/metrics/sync"

# Enable auto-sync to RAG when data changes
curl -X POST "http://localhost:3000/api/instagram/rag/auto-sync?enabled=true"
```

### Access Existing Firestore Data

```bash
# Get posts from Firestore (your Kotlin app data)
curl "http://localhost:3000/api/instagram/firestore/posts"

# Get raw data (exact Kotlin app format)
curl "http://localhost:3000/api/instagram/firestore/raw"
```

This documentation provides comprehensive coverage of all API endpoints, request/response formats, and usage examples for the AllInOne External Services application.
