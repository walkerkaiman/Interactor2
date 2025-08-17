import { useEffect, useRef, useCallback } from 'react';
import { InteractionConfig } from '@interactor/shared';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

interface UseWebSocketSyncProps {
  url: string;
  onInteractionsUpdate: (interactions: InteractionConfig[]) => void;
  onModuleUpdate: (moduleId: string, updates: any) => void;
  onTriggerEvent: (moduleId: string, type: string) => void;
}

export function useWebSocketSync({
  url,
  onInteractionsUpdate,
  onModuleUpdate,
  onTriggerEvent,
}: UseWebSocketSyncProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageTimestamp = useRef<number>(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Ignore messages older than our last processed message
          if (message.timestamp && message.timestamp < lastMessageTimestamp.current) {
            return;
          }
          
          lastMessageTimestamp.current = message.timestamp || Date.now();

          switch (message.type) {
            case 'state_update':
              // Handle full state updates
              if (message.data.interactions) {
                onInteractionsUpdate(message.data.interactions);
              }
              
              // Handle individual module updates
              if (message.data.moduleInstances) {
                message.data.moduleInstances.forEach((instance: any) => {
                  onModuleUpdate(instance.id, instance);
                });
              }
              break;
              
            case 'trigger_event':
              // Handle trigger events
              const { moduleId, type } = message.data;
              onTriggerEvent(moduleId, type);
              break;
              
            default:
              // console.log('Unknown WebSocket message type:', message.type);
          }
        } catch (error) {
          // console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        // console.log('WebSocket disconnected');
        wsRef.current = null;
        
        // Attempt reconnect after 1 second
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 1000);
      };

      ws.onerror = (error) => {
        // console.error('WebSocket error:', error);
      };

      wsRef.current = ws;
    } catch (error) {
      // console.error('Failed to create WebSocket connection:', error);
    }
  }, [url, onInteractionsUpdate, onModuleUpdate, onTriggerEvent]);

  // Connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Send message to WebSocket
  const sendMessage = useCallback((type: string, data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data, timestamp: Date.now() }));
    }
  }, []);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    sendMessage,
  };
}