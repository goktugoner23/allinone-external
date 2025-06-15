"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const errors_1 = require("../../utils/errors");
class BinanceSpotWebSocketManager {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 5000;
        this.isConnected = false;
        this.subscriptions = new Set();
        this.heartbeatInterval = null;
        this.lastPongTime = Date.now();
        this.baseUrl = 'wss://stream.binance.com:9443/ws';
        // Client management
        this.clients = new Set();
        this.setupHeartbeat();
    }
    async initialize() {
        try {
            console.log('[Spot] Initializing WebSocket connection...');
            await this.connect();
            console.log('[Spot] WebSocket initialized successfully');
        }
        catch (error) {
            console.error('[Spot] Failed to initialize WebSocket:', error);
            throw new errors_1.WebSocketError('Failed to initialize Spot WebSocket connection');
        }
    }
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new ws_1.default(this.baseUrl);
                this.ws.on('open', () => {
                    console.log('[Spot] WebSocket connected');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.lastPongTime = Date.now();
                    resolve();
                });
                this.ws.on('message', (data) => {
                    try {
                        this.handleMessage(data);
                    }
                    catch (error) {
                        console.error('[Spot] Error handling WebSocket message:', error);
                    }
                });
                this.ws.on('close', (code, reason) => {
                    console.log(`[Spot] WebSocket closed: ${code} - ${reason}`);
                    this.isConnected = false;
                    this.handleDisconnection();
                });
                this.ws.on('error', (error) => {
                    console.error('[Spot] WebSocket error:', error);
                    this.isConnected = false;
                    reject(new errors_1.WebSocketError(`Spot WebSocket connection error: ${error.message}`));
                });
                this.ws.on('pong', () => {
                    this.lastPongTime = Date.now();
                });
                // Connection timeout
                setTimeout(() => {
                    if (!this.isConnected) {
                        reject(new errors_1.WebSocketError('Spot WebSocket connection timeout'));
                    }
                }, 10000);
            }
            catch (error) {
                reject(new errors_1.WebSocketError(`Failed to create Spot WebSocket connection: ${error}`));
            }
        });
    }
    handleMessage(data) {
        try {
            const message = JSON.parse(data.toString());
            // Handle different message types
            if (message.stream && message.data) {
                this.processStreamData(message);
            }
            else if (message.e) {
                // Direct event data
                this.processEventData(message);
            }
        }
        catch (error) {
            console.error('[Spot] Error parsing WebSocket message:', error);
        }
    }
    processStreamData(streamData) {
        const { stream, data } = streamData;
        // Process different stream types
        if (stream.includes('@ticker')) {
            this.handleTickerData(data);
        }
        else if (stream.includes('@depth')) {
            this.handleDepthData(data);
        }
        else if (stream.includes('@trade')) {
            this.handleTradeData(data);
        }
        // Broadcast to all connected clients
        this.broadcastToClients({
            type: 'spot_stream',
            stream,
            data: this.formatStreamData(stream, data)
        });
    }
    processEventData(eventData) {
        // Handle direct event data (when not using combined stream)
        if (eventData.e === '24hrTicker') {
            this.handleTickerData(eventData);
        }
        else if (eventData.e === 'depthUpdate') {
            this.handleDepthData(eventData);
        }
        else if (eventData.e === 'trade') {
            this.handleTradeData(eventData);
        }
        // Broadcast to all connected clients
        this.broadcastToClients({
            type: 'spot_event',
            event: eventData.e,
            data: this.formatEventData(eventData)
        });
    }
    handleTickerData(ticker) {
        // Process 24hr ticker data
        console.log(`[Spot] Ticker Update - ${ticker.s}: ${ticker.c} (${ticker.P}%)`);
    }
    handleDepthData(depth) {
        // Process order book depth data
        console.log(`[Spot] Depth Update - ${depth.s}: ${depth.b.length} bids, ${depth.a.length} asks`);
    }
    handleTradeData(trade) {
        // Process individual trade data
        console.log(`[Spot] Trade - ${trade.s}: ${trade.q} @ ${trade.p}`);
    }
    formatStreamData(stream, data) {
        // Format data based on stream type
        if (stream.includes('@ticker')) {
            return this.formatTickerData(data);
        }
        else if (stream.includes('@depth')) {
            return this.formatDepthData(data);
        }
        else if (stream.includes('@trade')) {
            return this.formatTradeData(data);
        }
        return data;
    }
    formatEventData(data) {
        // Format event data based on event type
        switch (data.e) {
            case '24hrTicker':
                return this.formatTickerData(data);
            case 'depthUpdate':
                return this.formatDepthData(data);
            case 'trade':
                return this.formatTradeData(data);
            default:
                return data;
        }
    }
    formatTickerData(ticker) {
        return {
            symbol: ticker.s,
            price: parseFloat(ticker.c),
            priceChange: parseFloat(ticker.p),
            priceChangePercent: parseFloat(ticker.P),
            weightedAvgPrice: parseFloat(ticker.w),
            openPrice: parseFloat(ticker.o),
            highPrice: parseFloat(ticker.h),
            lowPrice: parseFloat(ticker.l),
            volume: parseFloat(ticker.v),
            quoteVolume: parseFloat(ticker.q),
            openTime: ticker.O,
            closeTime: ticker.C,
            firstId: ticker.F,
            lastId: ticker.L,
            count: ticker.n,
            bestBid: parseFloat(ticker.b),
            bestBidQty: parseFloat(ticker.B),
            bestAsk: parseFloat(ticker.a),
            bestAskQty: parseFloat(ticker.A),
            contractType: 'SPOT',
            timestamp: ticker.E
        };
    }
    formatDepthData(depth) {
        return {
            symbol: depth.s,
            firstUpdateId: depth.U,
            finalUpdateId: depth.u,
            bids: depth.b.map(([price, qty]) => ({
                price: parseFloat(price),
                quantity: parseFloat(qty)
            })),
            asks: depth.a.map(([price, qty]) => ({
                price: parseFloat(price),
                quantity: parseFloat(qty)
            })),
            contractType: 'SPOT',
            timestamp: depth.E
        };
    }
    formatTradeData(trade) {
        return {
            symbol: trade.s,
            tradeId: trade.t,
            price: parseFloat(trade.p),
            quantity: parseFloat(trade.q),
            buyerOrderId: trade.b,
            sellerOrderId: trade.a,
            tradeTime: trade.T,
            isBuyerMaker: trade.m,
            contractType: 'SPOT',
            timestamp: trade.E
        };
    }
    // Subscribe to ticker stream
    async subscribeToTicker(symbol) {
        const stream = `${symbol.toLowerCase()}@ticker`;
        await this.subscribe(stream);
    }
    // Subscribe to depth stream
    async subscribeToDepth(symbol, levels = '@100ms') {
        const stream = `${symbol.toLowerCase()}@depth${levels}`;
        await this.subscribe(stream);
    }
    // Subscribe to trade stream
    async subscribeToTrades(symbol) {
        const stream = `${symbol.toLowerCase()}@trade`;
        await this.subscribe(stream);
    }
    // Generic subscribe method
    async subscribe(stream) {
        if (!this.isConnected || !this.ws) {
            throw new errors_1.WebSocketError('Spot WebSocket not connected');
        }
        const subscribeMessage = {
            method: 'SUBSCRIBE',
            params: [stream],
            id: Date.now()
        };
        this.ws.send(JSON.stringify(subscribeMessage));
        this.subscriptions.add(stream);
        console.log(`[Spot] Subscribed to stream: ${stream}`);
    }
    // Unsubscribe from stream
    async unsubscribe(stream) {
        if (!this.isConnected || !this.ws) {
            throw new errors_1.WebSocketError('Spot WebSocket not connected');
        }
        const unsubscribeMessage = {
            method: 'UNSUBSCRIBE',
            params: [stream],
            id: Date.now()
        };
        this.ws.send(JSON.stringify(unsubscribeMessage));
        this.subscriptions.delete(stream);
        console.log(`[Spot] Unsubscribed from stream: ${stream}`);
    }
    // Client management
    addClient(client) {
        this.clients.add(client);
        console.log(`[Spot] WebSocket client added. Total clients: ${this.clients.size}`);
        client.on('close', () => {
            this.clients.delete(client);
            console.log(`[Spot] WebSocket client removed. Total clients: ${this.clients.size}`);
        });
        client.on('error', (error) => {
            console.error('[Spot] WebSocket client error:', error);
            this.clients.delete(client);
        });
    }
    broadcastToClients(message) {
        const messageStr = JSON.stringify(message);
        this.clients.forEach((client) => {
            if (client.readyState === ws_1.default.OPEN) {
                try {
                    client.send(messageStr);
                }
                catch (error) {
                    console.error('[Spot] Error broadcasting to WebSocket client:', error);
                    this.clients.delete(client);
                }
            }
            else {
                this.clients.delete(client);
            }
        });
    }
    setupHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.isConnected) {
                // Check if we received a pong recently
                const timeSinceLastPong = Date.now() - this.lastPongTime;
                if (timeSinceLastPong > 60000) { // 60 seconds
                    console.warn('[Spot] WebSocket heartbeat timeout, reconnecting...');
                    this.handleDisconnection();
                    return;
                }
                // Send ping
                try {
                    this.ws.ping();
                }
                catch (error) {
                    console.error('[Spot] Error sending WebSocket ping:', error);
                }
            }
        }, 30000); // Send ping every 30 seconds
    }
    handleDisconnection() {
        this.isConnected = false;
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[Spot] Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => {
                this.reconnect();
            }, this.reconnectDelay * this.reconnectAttempts);
        }
        else {
            console.error('[Spot] Max reconnection attempts reached for WebSocket');
        }
    }
    async reconnect() {
        try {
            await this.connect();
            // Resubscribe to all previous subscriptions
            for (const stream of this.subscriptions) {
                await this.subscribe(stream);
            }
            console.log('[Spot] WebSocket reconnected and resubscribed successfully');
        }
        catch (error) {
            console.error('[Spot] Failed to reconnect WebSocket:', error);
            this.handleDisconnection();
        }
    }
    async disconnect() {
        try {
            console.log('[Spot] Disconnecting WebSocket...');
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }
            this.isConnected = false;
            this.subscriptions.clear();
            this.clients.clear();
            console.log('[Spot] WebSocket disconnected successfully');
        }
        catch (error) {
            console.error('[Spot] Error disconnecting WebSocket:', error);
        }
    }
    // Getters
    get connected() {
        return this.isConnected;
    }
    get activeSubscriptions() {
        return Array.from(this.subscriptions);
    }
    get clientCount() {
        return this.clients.size;
    }
}
exports.default = BinanceSpotWebSocketManager;
//# sourceMappingURL=spot-websocket.js.map