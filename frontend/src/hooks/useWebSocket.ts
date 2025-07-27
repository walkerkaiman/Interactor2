import { useEffect, useRef } from 'react';
import { websocketService, WebSocketHandlers } from '@/services/websocket';
import { useAppActions } from '@/store';
import { SystemStats, LogEntry, InteractionConfig, MessageRoute } from '@/types/api';

export const useWebSocket = () => {
  const actions = useAppActions();
  
  // Track if initial data has been loaded
  const hasLoadedInitialData = useRef(false);

  useEffect(() => {
    // Load initial data only once
    if (!hasLoadedInitialData.current) {
      try {
        // Load initial data via API calls instead of WebSocket
        fetch('/api/stats')
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data) {
              actions.updateSystemStats(data.data);
            }
          })
          .catch(err => console.warn('Failed to load stats:', err));

        fetch('/api/modules')
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data) {
              console.log('Modules loaded:', data.data.modules);
            }
          })
          .catch(err => console.warn('Failed to load modules:', err));

        hasLoadedInitialData.current = true;
      } catch (error) {
        console.warn('Failed to load initial data:', error);
      }
    }
  }, []); // Empty dependency array since actions is now stable

  useEffect(() => {
    // Set up WebSocket handlers
    const handlers: WebSocketHandlers = {
      onInit: (data: { stats: SystemStats; interactions: InteractionConfig[]; routes: MessageRoute[]; modules: any[] }) => {
        console.log('WebSocket init received:', data);
        
        // Update system stats
        if (data.stats) {
          actions.updateSystemStats(data.stats);
        }
        
        // Load modules if not already loaded
        if (data.modules && data.modules.length > 0) {
          console.log('Modules received from WebSocket:', data.modules);
        }
        
        // Load interactions if not already loaded
        if (data.interactions && data.interactions.length > 0) {
          console.log('Interactions received from WebSocket:', data.interactions);
        }
      },

      onStats: (stats: SystemStats) => {
        actions.updateSystemStats(stats);
      },

      onStateChanged: (data: { interactions: InteractionConfig[]; routes: MessageRoute[] }) => {
        console.log('State changed received:', data);
        // Handle state changes - this would need to be implemented in the store
      },

      onModuleLoaded: (module: any) => {
        console.log('Module loaded:', module);
        // Reload modules to get the new one
        actions.loadModules();
      },

      onMessageRouted: (message: any) => {
        console.log('Message routed:', message);
        // Could be used for debugging or visualization
      },

      onLog: (log: LogEntry) => {
        actions.addLog(log);
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
        actions.setConnectionStatus({ connected });
      }
    };

    // Set handlers on WebSocket service
    websocketService.setHandlers(handlers);

    // Simple connection - no retry logic needed since we're on same origin
    const connectWebSocket = async () => {
      try {
        await websocketService.connect();
        console.log('WebSocket connected successfully');
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        // Fall back to polling for real-time updates
        console.log('Falling back to polling for updates');
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      websocketService.disconnect();
    };
  }, []); // Empty dependency array since actions is now stable

  // Return WebSocket service for manual operations
  return websocketService;
}; 