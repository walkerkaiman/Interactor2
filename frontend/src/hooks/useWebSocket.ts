import { useEffect, useRef } from 'react';
import { websocketService, WebSocketHandlers } from '../../services/websocket';
import { useAppStore } from '../../store';
import { SystemStats, LogEntry, InteractionConfig, MessageRoute } from '../../types/api';

export const useWebSocket = () => {
  const { 
    actions: { 
      updateSystemStats, 
      addLog, 
      setConnectionStatus,
      loadModules,
      loadInteractions
    } 
  } = useAppStore();
  
  const handlersRef = useRef<WebSocketHandlers>({});

  useEffect(() => {
    // Set up WebSocket handlers
    handlersRef.current = {
      onInit: (data: { stats: SystemStats; interactions: InteractionConfig[]; routes: MessageRoute[]; modules: any[] }) => {
        console.log('WebSocket init received:', data);
        
        // Update system stats
        if (data.stats) {
          updateSystemStats(data.stats);
        }
        
        // Load modules if not already loaded
        if (data.modules && data.modules.length > 0) {
          // This would need to be handled in the store
          console.log('Modules received from WebSocket:', data.modules);
        }
        
        // Load interactions if not already loaded
        if (data.interactions && data.interactions.length > 0) {
          // This would need to be handled in the store
          console.log('Interactions received from WebSocket:', data.interactions);
        }
      },

      onStats: (stats: SystemStats) => {
        updateSystemStats(stats);
      },

      onStateChanged: (data: { interactions: InteractionConfig[]; routes: MessageRoute[] }) => {
        console.log('State changed received:', data);
        // Handle state changes - this would need to be implemented in the store
      },

      onModuleLoaded: (module: any) => {
        console.log('Module loaded:', module);
        // Reload modules to get the new one
        loadModules();
      },

      onMessageRouted: (message: any) => {
        console.log('Message routed:', message);
        // Could be used for debugging or visualization
      },

      onLog: (log: LogEntry) => {
        addLog(log);
      },

      onLogs: (logs: LogEntry[]) => {
        // Replace logs with new batch
        console.log('Bulk logs received:', logs.length);
        // This would need to be handled in the store
      },

      onManualTriggerResponse: (data: { moduleId: string; success: boolean; error?: string }) => {
        console.log('Manual trigger response:', data);
        // Could show success/error feedback
      },

      onConnectionStatus: (connected: boolean) => {
        setConnectionStatus({ connected });
      }
    };

    // Set handlers on WebSocket service
    websocketService.setHandlers(handlersRef.current);

    // Connect to WebSocket
    const connectWebSocket = async () => {
      try {
        await websocketService.connect();
        console.log('WebSocket connected successfully');
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      websocketService.disconnect();
    };
  }, []); // Empty dependency array to prevent infinite re-renders

  // Return WebSocket service for manual operations
  return websocketService;
}; 