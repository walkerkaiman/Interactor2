import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../api';

export interface BackendState {
  timestamp: string;
  interactions: any[];
  runtimeData: Record<string, any>;
}

export interface StateSyncOptions {
  onStateUpdate?: (state: BackendState) => void;
  onRuntimeUpdate?: (runtimeData: Record<string, any>) => void;
}

export function useStateSync(options: StateSyncOptions = {}) {
  const [backendState, setBackendState] = useState<BackendState | null>(null);
  const [localState, setLocalState] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const lastStateRef = useRef<BackendState | null>(null);

  // Fetch current state from backend
  const fetchState = useCallback(async () => {
    try {
      const state: BackendState = await apiService.getState();
      
      setBackendState(state);
      if (!lastStateRef.current) {
        setLocalState(state.interactions);
      }
      
      options.onStateUpdate?.(state);
      return state;
    } catch (error) {
      console.error('Failed to fetch state:', error);
      return null;
    }
  }, [options.onStateUpdate]);

  // Fetch state only when new changes are detected
  const fetchStateIfNeeded = useCallback(async (newChanges: boolean) => {
    if (newChanges) {
      await fetchState();
    }
  }, [fetchState]);

  // Register changes with backend
  const registerChanges = useCallback(async (interactions: any[]) => {
    try {
      await apiService.registerInteractions(interactions);
      
      // Don't overwrite local state with backend state - keep the local state
      // The backend has successfully processed our changes, so our local state is now authoritative
      setHasChanges(false);
      return { success: true };
    } catch (error) {
      console.error('Failed to register changes:', error);
      throw error;
    }
  }, []);

  // Update local state
  const updateLocalState = useCallback((newInteractions: any[]) => {
    setLocalState(newInteractions);
    setHasChanges(true);
  }, []);

  // Check for differences between local and backend state
  const getDifferences = useCallback(() => {
    if (!backendState || !localState.length) return null;
    
    const differences: any = {};
    
    // Compare each interaction
    localState.forEach((localInteraction, index) => {
      const backendInteraction = backendState.interactions[index];
      if (!backendInteraction) {
        differences[`interaction-${index}`] = { type: 'added', data: localInteraction };
        return;
      }
      
      // Compare modules
      localInteraction.modules?.forEach((localModule: any, moduleIndex: number) => {
        const backendModule = backendInteraction.modules?.[moduleIndex];
        if (!backendModule) {
          differences[`${localModule.id}`] = { type: 'added', data: localModule };
          return;
        }
        
        // Compare config
        if (JSON.stringify(localModule.config) !== JSON.stringify(backendModule.config)) {
          differences[`${localModule.id}`] = { 
            type: 'modified', 
            local: localModule.config, 
            backend: backendModule.config 
          };
        }
      });
    });
    
    return differences;
  }, [backendState, localState]);

  // Initialize state on mount only
  useEffect(() => {
    fetchState();
  }, []); // Remove fetchState dependency to prevent infinite loop

  return {
    backendState,
    localState,
    hasChanges,
    fetchState,
    fetchStateIfNeeded,
    registerChanges,
    updateLocalState,
    getDifferences
  };
}
