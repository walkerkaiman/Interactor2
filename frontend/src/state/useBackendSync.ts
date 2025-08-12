import { useEffect, useRef, useState, useCallback } from 'react';
import { ModuleManifest, InteractionConfig } from '@interactor/shared';
import { apiService } from '../api';
import { useUnregisteredChanges } from './useUnregisteredChanges';

interface BackendSync {
  modules: any[];                  // list that already includes runtime fields
  interactions: InteractionConfig[];
  settings: Record<string, any>;
  loading: boolean;
  error: string | null;
}

/**
 * One hook owns all traffic between browser and backend (REST + WebSocket).
 * It merges runtime module state coming over WebSocket with the manifests
 * fetched from /api/modules exactly once so consumers never re-implement
 * that merge logic.
 */
export function useBackendSync(): BackendSync {
  const [modules, setModules] = useState<any[]>([]);
  const [interactions, setInteractions] = useState<InteractionConfig[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Get unregistered changes manager
  const { getMergedConfig } = useUnregisteredChanges();

  // immutable map of manifests by name
  const manifestMapRef = useRef<Map<string, ModuleManifest>>(new Map());

  /* -------------------------------- initial REST load -------------------------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [manifests, initialInteractions, initialSettings] = await Promise.all([
          apiService.getModules(),
          apiService.getInteractions(),
          apiService.getSettings()
        ]);
        if (cancelled) return;

        manifestMapRef.current = new Map(manifests.map(m => [m.name, m]));
        setModules(manifests);
        setInteractions(initialInteractions);
        setSettings(initialSettings);
        setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? 'Load failed');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* -------------------------------- WebSocket -------------------------------- */
  const handleWebSocketMessage = useCallback((msg: any) => {
    console.log('WebSocket message received:', msg);
    
    if (msg.type === 'state_update') {
      const { moduleInstances, interactions: incomingInteractions } = msg.data;

      console.log('WebSocket received moduleInstances:', moduleInstances);

      // merge manifests + runtime
      const manifests = manifestMapRef.current;
      const enriched = moduleInstances.map((inst: any) => {
        const manifest = manifests.get(inst.moduleName);
        const merged = manifest ? { ...manifest, ...inst } : inst;
        console.log(`Merged module ${inst.moduleName}:`, merged);
        return merged;
      });
      
      // Update modules by merging runtime state with existing modules
      setModules(prevModules => {
        console.log('Previous modules:', prevModules);
        
        // Create a map of existing modules by name for easy lookup
        const existingModulesMap = new Map(prevModules.map(m => [m.name, m]));
        
        // Update existing modules with runtime state from WebSocket
        enriched.forEach((enrichedModule: any) => {
          if (enrichedModule.name) {
            const existingModule = existingModulesMap.get(enrichedModule.name);
            if (existingModule) {
              // For runtime fields (like currentTime, countdown), always use the server value
              // For config fields, preserve local unregistered changes
              const runtimeFields = ['currentTime', 'countdown', 'status', 'isRunning', 'isInitialized', 'isListening', 'lastUpdate'];
              
              // Start with existing module
              const updatedModule = { ...existingModule };
              
              // Update runtime fields from server (always use server value)
              runtimeFields.forEach(field => {
                if (enrichedModule[field] !== undefined) {
                  updatedModule[field] = enrichedModule[field];
                }
              });
              
              // For config, preserve local unregistered changes
              if (enrichedModule.config) {
                const preservedConfig = getMergedConfig(existingModule.id, enrichedModule.config);
                updatedModule.config = preservedConfig;
              }
              
              existingModulesMap.set(enrichedModule.name, updatedModule);
              console.log(`Updated module ${enrichedModule.name} with runtime fields and preserved config:`, updatedModule);
            } else {
              // This is a new runtime instance, add it
              existingModulesMap.set(enrichedModule.name, enrichedModule);
              console.log(`Added new module ${enrichedModule.name}:`, enrichedModule);
            }
          }
        });
        
        const finalModules = Array.from(existingModulesMap.values());
        console.log('Final modules after merge:', finalModules);
        return finalModules;
      });
      
      if (incomingInteractions) setInteractions(incomingInteractions);
    } else if (msg.type === 'module_runtime_update') {
      // Handle targeted runtime updates for specific modules
      const { moduleId, runtimeData } = msg.data;
      console.log(`Received runtime update for module ${moduleId}:`, runtimeData);
      
      setModules(prevModules => {
        return prevModules.map(module => {
          if (module.id === moduleId) {
            // Update only the runtime fields, preserving user configuration
            const updatedModule = { ...module };
            
            // Update runtime fields from server
            Object.keys(runtimeData).forEach(field => {
              if (runtimeData[field] !== undefined) {
                updatedModule[field] = runtimeData[field];
              }
            });
            
            console.log(`Updated runtime fields for module ${moduleId}:`, updatedModule);
            return updatedModule;
          }
          return module;
        });
      });
    }
  }, [getMergedConfig]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001');
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    ws.onmessage = evt => {
      try {
        const msg = JSON.parse(evt.data);
        handleWebSocketMessage(msg);
      } catch (err) {
        console.error('WebSocket parse error', err);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
    
    return () => ws.close();
  }, [handleWebSocketMessage]);

  return { modules, interactions, settings, loading, error };
}
