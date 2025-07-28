import { useState, useEffect, useCallback, useRef } from 'react';
import { webSocketService, WebSocketConfig } from '../services/WebSocketService';

interface UseWebSocketOptions {
  connectionId: string;
  url?: string;
  autoConnect?: boolean;
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: (code: number, reason: string) => void;
  onError?: (error: any) => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  connect: (url: string) => Promise<void>;
  disconnect: () => void;
  send: (message: any) => boolean;
  error: string | null;
  connectionStatus: { isConnected: boolean; url: string } | null;
}

export const useWebSocket = (options: UseWebSocketOptions): UseWebSocketReturn => {
  const {
    connectionId,
    url: initialUrl,
    autoConnect = false,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectDelay = 5000
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{ isConnected: boolean; url: string } | null>(null);
  
  const isInitialized = useRef(false);

  // Update connection status
  const updateConnectionStatus = useCallback(() => {
    const status = webSocketService.getConnectionStatus(connectionId);
    setConnectionStatus(status);
    setIsConnected(status?.isConnected ?? false);
  }, [connectionId]);

  // Connect to WebSocket
  const connect = useCallback(async (url: string) => {
    try {
      setError(null);
      
      const config: WebSocketConfig = {
        url,
        onMessage: (data) => {
          if (onMessage) {
            onMessage(data);
          }
        },
        onConnect: () => {
          setIsConnected(true);
          setError(null);
          updateConnectionStatus();
          if (onConnect) {
            onConnect();
          }
        },
        onDisconnect: (code, reason) => {
          setIsConnected(false);
          updateConnectionStatus();
          if (onDisconnect) {
            onDisconnect(code, reason);
          }
        },
        onError: (error) => {
          setError(error?.message || 'WebSocket error');
          if (onError) {
            onError(error);
          }
        },
        autoReconnect,
        maxReconnectAttempts,
        reconnectDelay
      };

      await webSocketService.connect(connectionId, config);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
      setError(errorMessage);
      throw err;
    }
  }, [connectionId, onMessage, onConnect, onDisconnect, onError, autoReconnect, maxReconnectAttempts, reconnectDelay, updateConnectionStatus]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    webSocketService.disconnect(connectionId);
    setIsConnected(false);
    setError(null);
    updateConnectionStatus();
  }, [connectionId, updateConnectionStatus]);

  // Send message
  const send = useCallback((message: any): boolean => {
    return webSocketService.send(connectionId, message);
  }, [connectionId]);

  // Initialize connection status
  useEffect(() => {
    if (!isInitialized.current) {
      updateConnectionStatus();
      isInitialized.current = true;
    }
  }, [updateConnectionStatus]);

  // Auto-connect if URL is provided and autoConnect is true
  useEffect(() => {
    if (autoConnect && initialUrl && !isConnected) {
      connect(initialUrl).catch(console.error);
    }
  }, [autoConnect, initialUrl, isConnected, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't disconnect on unmount - let the service manage connections
      // This allows connections to persist across component unmounts
    };
  }, []);

  // Update status periodically
  useEffect(() => {
    const interval = setInterval(updateConnectionStatus, 1000);
    return () => clearInterval(interval);
  }, [updateConnectionStatus]);

  return {
    isConnected,
    connect,
    disconnect,
    send,
    error,
    connectionStatus
  };
}; 