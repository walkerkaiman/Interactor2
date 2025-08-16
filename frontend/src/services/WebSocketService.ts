interface WebSocketConfig {
  url: string;
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: (code: number, reason: string) => void;
  onError?: (error: any) => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

interface WebSocketConnection {
  id: string;
  url: string;
  ws: WebSocket | null;
  config: WebSocketConfig;
  isConnected: boolean;
  reconnectAttempts: number;
  reconnectTimeout?: ReturnType<typeof setTimeout>;
}

class WebSocketService {
  private static instance: WebSocketService;
  private connections: Map<string, WebSocketConnection> = new Map();
  private isShuttingDown = false;

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Connect to a WebSocket endpoint
   */
  public connect(connectionId: string, config: WebSocketConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Check if connection already exists
        if (this.connections.has(connectionId)) {
          this.disconnect(connectionId);
        }

        const connection: WebSocketConnection = {
          id: connectionId,
          url: config.url,
          ws: null,
          config: {
            ...config,
            autoReconnect: config.autoReconnect ?? true,
            maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
            reconnectDelay: config.reconnectDelay ?? 5000
          },
          isConnected: false,
          reconnectAttempts: 0
        };

        this.connections.set(connectionId, connection);
        this.createConnection(connectionId, resolve, reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from a WebSocket endpoint
   */
  public disconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Clear reconnect timeout
    if (connection.reconnectTimeout) {
      clearTimeout(connection.reconnectTimeout);
      connection.reconnectTimeout = undefined;
    }

    // Close WebSocket
    if (connection.ws) {
      connection.ws.close();
      connection.ws = null;
    }

    connection.isConnected = false;
    this.connections.delete(connectionId);
  }

  /**
   * Send message to a specific connection
   */
  public send(connectionId: string, message: any): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.ws || !connection.isConnected) {
      return false;
    }

    try {
      connection.ws.send(typeof message === 'string' ? message : JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`Failed to send message to ${connectionId}:`, error);
      return false;
    }
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(connectionId: string): { isConnected: boolean; url: string } | null {
    const connection = this.connections.get(connectionId);
    if (!connection) return null;

    return {
      isConnected: connection.isConnected,
      url: connection.url
    };
  }

  /**
   * Get all active connections
   */
  public getAllConnections(): Array<{ id: string; url: string; isConnected: boolean }> {
    return Array.from(this.connections.values()).map(conn => ({
      id: conn.id,
      url: conn.url,
      isConnected: conn.isConnected
    }));
  }

  /**
   * Shutdown all connections
   */
  public shutdown(): void {
    this.isShuttingDown = true;
    const connectionIds = Array.from(this.connections.keys());
    connectionIds.forEach(id => this.disconnect(id));
  }

  /**
   * Create a new WebSocket connection
   */
  private createConnection(
    connectionId: string, 
    resolve: () => void, 
    reject: (error: any) => void
  ): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      reject(new Error(`Connection ${connectionId} not found`));
      return;
    }

    try {
      console.log(`Connecting to WebSocket: ${connection.url}`);
      
      connection.ws = new WebSocket(connection.url);
      
      connection.ws.onopen = () => {
        console.log(`WebSocket connected: ${connectionId}`);
        connection.isConnected = true;
        connection.reconnectAttempts = 0;
        
        if (connection.config.onConnect) {
          connection.config.onConnect();
        }
        
        resolve();
      };
      
      connection.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data.toString());
          if (connection.config.onMessage) {
            connection.config.onMessage(data);
          }
        } catch (error) {
          console.error(`Failed to parse WebSocket message from ${connectionId}:`, error);
        }
      };
      
      connection.ws.onclose = (event) => {
        console.log(`WebSocket disconnected: ${connectionId} (${event.code} ${event.reason})`);
        connection.isConnected = false;
        
        if (connection.config.onDisconnect) {
          connection.config.onDisconnect(event.code, event.reason);
        }
        
        // Attempt to reconnect if not shutting down and auto-reconnect is enabled
        if (!this.isShuttingDown && connection.config.autoReconnect) {
          this.scheduleReconnect(connectionId);
        }
      };
      
      connection.ws.onerror = (error) => {
        console.error(`WebSocket error in ${connectionId}:`, error);
        
        if (connection.config.onError) {
          connection.config.onError(error);
        }
        
        reject(error);
      };
      
    } catch (error) {
      console.error(`Failed to create WebSocket connection to ${connection.url}:`, error);
      reject(error);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    if (connection.reconnectAttempts >= connection.config.maxReconnectAttempts!) {
      console.error(`Max reconnection attempts reached for ${connectionId}`);
      return;
    }

    connection.reconnectAttempts++;
    const delay = connection.config.reconnectDelay! * Math.pow(2, connection.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`Scheduling reconnection attempt ${connection.reconnectAttempts} for ${connectionId} in ${delay}ms`);
    
    connection.reconnectTimeout = setTimeout(() => {
      if (!this.isShuttingDown) {
        this.createConnection(connectionId, () => {}, (error) => {
          console.error(`Reconnection failed for ${connectionId}:`, error);
        });
      }
    }, delay);
  }
}

export const webSocketService = WebSocketService.getInstance();
export type { WebSocketConfig, WebSocketConnection }; 