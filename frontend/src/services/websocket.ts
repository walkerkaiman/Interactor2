import { toast } from 'sonner';
import { 
  SystemStats, 
  LogEntry, 
  InteractionConfig, 
  MessageRoute 
} from '../types/api';

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  data?: any;
  error?: string;
}

// WebSocket event handlers
export interface WebSocketHandlers {
  onInit?: (data: { stats: SystemStats; interactions: InteractionConfig[]; routes: MessageRoute[]; modules: any[] }) => void;
  onStats?: (stats: SystemStats) => void;
  onStateChanged?: (data: { interactions: InteractionConfig[]; routes: MessageRoute[] }) => void;
  onModuleLoaded?: (module: any) => void;
  onMessageRouted?: (message: any) => void;
  onLog?: (log: LogEntry) => void;
  onLogs?: (logs: LogEntry[]) => void;
  onManualTriggerResponse?: (data: { moduleId: string; success: boolean; error?: string }) => void;
  onConnectionStatus?: (connected: boolean) => void;
}

export class WebSocketService {
  private socket: WebSocket | null = null;
  private url: string;
  private handlers: WebSocketHandlers = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: number | null = null;
  private isConnecting = false;

  constructor(url: string = 'ws://localhost:3001') {
    this.url = url;
  }

  // Set event handlers
  setHandlers(handlers: WebSocketHandlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  // Connect to WebSocket server
  connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;

      try {
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.handlers.onConnectionStatus?.(true);
          this.startHeartbeat();
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.socket.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.handlers.onConnectionStatus?.(false);
          this.stopHeartbeat();
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  // Disconnect from WebSocket server
  disconnect() {
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
    this.stopHeartbeat();
  }

  // Send message to server
  send(type: string, data?: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = { type, data };
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', type);
    }
  }

  // Handle incoming messages
  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'init':
        this.handlers.onInit?.(message.data);
        break;
      
      case 'stats':
        this.handlers.onStats?.(message.data);
        break;
      
      case 'stateChanged':
        this.handlers.onStateChanged?.(message.data);
        break;
      
      case 'moduleLoaded':
        this.handlers.onModuleLoaded?.(message.data);
        break;
      
      case 'messageRouted':
        this.handlers.onMessageRouted?.(message.data);
        break;
      
      case 'log':
        this.handlers.onLog?.(message.data);
        break;
      
      case 'logs':
        this.handlers.onLogs?.(message.data);
        break;
      
      case 'manualTriggerResponse':
        this.handlers.onManualTriggerResponse?.(message.data);
        break;
      
      case 'pong':
        // Heartbeat response, no action needed
        break;
      
      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }

  // Schedule reconnection attempt
  private scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Scheduling WebSocket reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      } else {
        console.error('Max reconnection attempts reached');
        toast.error('WebSocket connection lost. Please refresh the page.');
      }
    }, delay);
  }

  // Start heartbeat
  private startHeartbeat() {
    this.heartbeatInterval = window.setInterval(() => {
      this.send('ping');
    }, 30000); // Send ping every 30 seconds
  }

  // Stop heartbeat
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Get connection status
  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  // Get connection state
  get readyState(): number {
    return this.socket?.readyState ?? WebSocket.CLOSED;
  }
}

// Create singleton instance
export const websocketService = new WebSocketService(
  'ws://localhost:3001'
);

export default websocketService; 