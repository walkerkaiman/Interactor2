import { useState, useCallback, useRef } from 'react';

interface UnregisteredConfigChange {
  moduleId: string;
  config: Record<string, any>;
  timestamp: number;
}

interface UnregisteredChangesState {
  configChanges: Map<string, UnregisteredConfigChange>;
  hasChanges: boolean;
  structuralChange: boolean;
}

/**
 * Global memory state for unregistered configuration changes
 * Persists across page navigation and component unmounts
 */
export function useUnregisteredChanges() {
  // Use ref to maintain state across re-renders and navigation
  const stateRef = useRef<UnregisteredChangesState>({
    configChanges: new Map(),
    hasChanges: false,
    structuralChange: false,
  });

  // Local state for triggering re-renders
  const [, setUpdateTrigger] = useState(0);

  // Force re-render when state changes
  const triggerUpdate = useCallback(() => {
    setUpdateTrigger(prev => prev + 1);
  }, []);

  // Update config change
  const updateConfigChange = useCallback((moduleId: string, config: Record<string, any>) => {
    // Merge with any existing unregistered config for this module (store only deltas)
    const existing = stateRef.current.configChanges.get(moduleId);
    const mergedConfig = {
      ...(existing?.config || {}),
      ...config,
    };

    const change: UnregisteredConfigChange = {
      moduleId,
      config: mergedConfig,
      timestamp: Date.now(),
    };

    stateRef.current.configChanges.set(moduleId, change);
    stateRef.current.hasChanges = stateRef.current.structuralChange || stateRef.current.configChanges.size > 0;
    triggerUpdate();

    console.log(`Unregistered config change for module ${moduleId}:`, config);
  }, [triggerUpdate]);

  // Remove config change
  const removeConfigChange = useCallback((moduleId: string) => {
    stateRef.current.configChanges.delete(moduleId);
    stateRef.current.hasChanges = stateRef.current.structuralChange || stateRef.current.configChanges.size > 0;
    triggerUpdate();
    
    console.log(`Removed unregistered config change for module ${moduleId}`);
  }, [triggerUpdate]);

  // Clear all changes
  const clearAllChanges = useCallback(() => {
    stateRef.current.configChanges.clear();
    stateRef.current.structuralChange = false;
    stateRef.current.hasChanges = false;
    triggerUpdate();
    
    console.log('Cleared all unregistered changes');
  }, [triggerUpdate]);

  // Get config change for a specific module
  const getConfigChange = useCallback((moduleId: string): UnregisteredConfigChange | undefined => {
    return stateRef.current.configChanges.get(moduleId);
  }, []);

  // Get all config changes
  const getAllConfigChanges = useCallback((): UnregisteredConfigChange[] => {
    return Array.from(stateRef.current.configChanges.values());
  }, []);

  // Check if a module has unregistered changes
  const hasConfigChange = useCallback((moduleId: string): boolean => {
    return stateRef.current.configChanges.has(moduleId);
  }, []);

  // Get merged config (original + unregistered changes)
  const getMergedConfig = useCallback((moduleId: string, originalConfig: Record<string, any>): Record<string, any> => {
    const change = stateRef.current.configChanges.get(moduleId);
    if (!change) return originalConfig;
    
    return {
      ...originalConfig,
      ...change.config,
    };
  }, []);

  // Apply all changes to interactions (for registration)
  const applyChangesToInteractions = useCallback((interactions: any[]): any[] => {
    if (!stateRef.current.hasChanges) return interactions;
    
    return interactions.map(interaction => ({
      ...interaction,
      modules: interaction.modules?.map((module: any) => {
        const change = stateRef.current.configChanges.get(module.id);
        if (!change) return module;
        
        return {
          ...module,
          config: {
            ...module.config,
            ...change.config,
          },
        };
      }) || [],
    }));
  }, []);

  // Mark structural change (e.g., node add/remove, edge changes, position changes)
  const markStructuralChange = useCallback(() => {
    stateRef.current.structuralChange = true;
    stateRef.current.hasChanges = true;
    triggerUpdate();
  }, [triggerUpdate]);

  return {
    // State
    hasChanges: stateRef.current.hasChanges,
    configChanges: stateRef.current.configChanges,
    
    // Actions
    updateConfigChange,
    removeConfigChange,
    clearAllChanges,
    getConfigChange,
    getAllConfigChanges,
    hasConfigChange,
    getMergedConfig,
    applyChangesToInteractions,
    markStructuralChange,
  };
} 