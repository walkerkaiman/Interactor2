import { useState, useEffect, useCallback, useRef } from 'react';
import { runtimeBus, RuntimeUpdate } from './runtimeBus';
import { InteractionConfig } from '@interactor/shared';
import { apiService } from '../api';

export interface BackendSyncState {
  modules: any[];
  interactions: InteractionConfig[];
  loading: boolean;
  error: string | null;
}

export function useBackendSync(): BackendSyncState {
  const [state, setState] = useState<BackendSyncState>({
    modules: [],
    interactions: [],
    loading: true,
    error: null
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000;

  // Get client ID for origin filtering
  const getClientId = useCallback(() => {
    try {
      return localStorage.getItem('interactorClientId') || 'unknown';
    } catch {
      return 'unknown';
    }
  }, []);

  // Fetch initial modules from API
  const fetchModules = useCallback(async () => {
    try {
      const modulesData = await apiService.getModules();
      setState(prev => ({ ...prev, modules: modulesData }));
    } catch (error) {
      console.error('Failed to fetch modules:', error);
      setState(prev => ({ ...prev, error: 'Failed to fetch modules' }));
    }
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((msg: any) => {
    if (msg.type === 'state_update') {
      const { interactions: wsInteractions, modules: wsModules, originClientId } = msg.data;
      
      // Ignore state updates from our own client
      if (originClientId === getClientId()) {
        return;
      }

      // Update interactions
      if (wsInteractions && Array.isArray(wsInteractions)) {
        setState(prev => {
          const prevModules = [...prev.modules];
          
          // Merge modules from WebSocket with existing modules
          const finalModules = wsModules ? wsModules.map((inst: any) => {
            const existingModule = prevModules.find(m => m.id === inst.id);
            if (existingModule) {
              // Preserve existing config and merge with new data
              const merged = {
                ...existingModule,
                ...inst,
                config: { ...existingModule.config, ...inst.config }
              };
              return merged;
            } else {
              // Add new module
              return inst;
            }
          }) : prevModules;

          return {
            ...prev,
            interactions: wsInteractions,
            modules: finalModules
          };
        });
      }
    } else if (msg.type === 'module_runtime_update') {
      const { moduleId, runtimeData, timestamp, newChanges } = msg.data;
      
      if (moduleId === 'combined') {
        Object.entries(runtimeData as Record<string, any>).forEach(([id, data]) => {
          runtimeBus.emit({ moduleId: id, runtimeData: data, timestamp, newChanges });
        });
      } else {
        runtimeBus.emit({ moduleId, runtimeData, timestamp, newChanges });
      }
    }
  }, [getClientId]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    const wsUrl = (import.meta as any).env?.VITE_WS_URL ?? 'ws://localhost:3001';
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setState(prev => ({ ...prev, loading: false, error: null }));
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          handleWebSocketMessage(msg);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (event) => {
        // Only log error details in development
        if ((import.meta as any).env?.DEV) {
          console.error('WebSocket connection error:', event);
        }
      };

      ws.onclose = (event) => {
        setState(prev => ({ ...prev, loading: true }));
        
        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, reconnectDelay * Math.pow(2, reconnectAttemptsRef.current));
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setState(prev => ({ ...prev, error: 'Failed to connect to WebSocket' }));
    }
  }, [handleWebSocketMessage]);

  // Initialize WebSocket connection and fetch modules
  useEffect(() => {
    // Fetch modules first
    fetchModules();
    
    // Then connect to WebSocket
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect, fetchModules]);

  return state;
}
