import * as WebSocket from 'ws';
declare class BinanceCoinMWebSocketManager {
    private wsClient;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    clients: Set<WebSocket>;
    isConnected: boolean;
    constructor();
    initialize(): Promise<void>;
    startUserDataStream(): Promise<void>;
    handleUserDataMessage(message: any): void;
    handleAccountUpdate(message: any): void;
    handleOrderUpdate(message: any): void;
    handleAccountConfigUpdate(message: any): void;
    setupHeartbeat(): void;
    scheduleReconnect(): void;
    addClient(ws: WebSocket): void;
    broadcastToClients(message: any): void;
    disconnect(): Promise<void>;
}
export default BinanceCoinMWebSocketManager;
//# sourceMappingURL=coinm-websocket.d.ts.map