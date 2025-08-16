import { useEffect, useRef, useState, useCallback } from 'react';
import { ModuleManifest, InteractionConfig } from '@interactor/shared';
import { apiService } from '../api';
import { useUnregisteredChanges } from './useUnregisteredChanges';
import { runtimeBus } from './runtimeBus';

interface BackendSync {
  modules: any[];                  // list that already includes runtime fields
  interactions: InteractionConfig[];
  settings: Record<string, any>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<{ modules: any[]; interactions: InteractionConfig[]; settings: Record<string, any> }>;
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
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clientIdRef = useRef<string | null>(null);

  /* -------------------------------- REST load + refresh -------------------------------- */
  const refresh = useCallback(async () => {
    const [manifests, latestInteractions, latestSettings] = await Promise.all([
      apiService.getModules(),
      apiService.getInteractions(),
      apiService.getSettings()
    ]);
    manifestMapRef.current = new Map(manifests.map(m => [m.name, m]));
    setModules(manifests);
    setInteractions(latestInteractions);
    setSettings(latestSettings);
    return { modules: manifests, interactions: latestInteractions, settings: latestSettings };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
        if (!cancelled) setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? 'Load failed');
          setLoading(false);
        }
      }
    })();
    // Load persistent client id once
    try {
      const key = 'interactorClientId';
      let id = localStorage.getItem(key);
      if (!id && (window as any).crypto?.randomUUID) {
        id = (window as any).crypto.randomUUID();
        if (id) localStorage.setItem(key, id);
      }
      clientIdRef.current = id;
    } catch {
      clientIdRef.current = null;
    }
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  /* -------------------------------- WebSocket -------------------------------- */
  const handleWebSocketMessage = useCallback((msg: any) => {
    console.log('WebSocket message received:', msg);
    
    if (msg.type === 'state_update') {
      const { moduleInstances, interactions: wsInteractions, originClientId } = msg.data || {};

      // Ignore own-origin structural frames
      if (originClientId && clientIdRef.current && originClientId === clientIdRef.current) {
        console.log('Ignoring state_update from our own origin client id');
        return;
      }

      // Accept non-empty interactions snapshot to populate structure on first load
      if (Array.isArray(wsInteractions) && wsInteractions.length > 0) {
        console.log('Applying interactions snapshot from WebSocket:', wsInteractions.length);
        setInteractions(wsInteractions);
      }

      // If backend sends no instances, avoid nuking our current modules (continue to allow interactions update above)
      if (!Array.isArray(moduleInstances) || moduleInstances.length === 0) {
        console.log('WebSocket state_update has empty moduleInstances; preserving current modules');
        return;
      }

      // merge manifests + runtime
      const manifests = manifestMapRef.current;
      const internalToDisplay: Record<string, string> = {
        time_input: 'Time Input',
        audio_output: 'Audio Output',
        dmx_output: 'DMX Output',
        osc_input: 'OSC Input',
        osc_output: 'OSC Output',
        http_input: 'HTTP Input',
        http_output: 'HTTP Output',
        serial_input: 'Serial Input',
        frames_input: 'Frames Input'
      };

      const enriched = moduleInstances.map((inst: any) => {
        const displayName = internalToDisplay[(inst.moduleName || '').toLowerCase()] || inst.moduleName || inst.name;
        const manifest = manifests.get(inst.moduleName) || manifests.get(inst.name) || manifests.get(displayName);
        const inferredType = (manifest as any)?.type || (/(^|_)output$/.test((inst.moduleName || '').toLowerCase()) || /output$/i.test(displayName) ? 'output' : 'input');
        const mergedName = (manifest as any)?.name ?? displayName;
        // Ensure id and moduleName are present alongside manifest fields and runtime
        const merged = { id: inst.id, moduleName: inst.moduleName || mergedName, name: mergedName, type: inferredType, ...(manifest || {}), ...inst };
        console.log(`Merged module ${inst.moduleName}:`, merged);
        return merged;
      });
      
      // Update modules by merging runtime state with existing modules
      setModules(prevModules => {
        console.log('Previous modules:', prevModules);
        
        // Create a map of existing modules by name/moduleName for easy lookup
        const existingModulesMap = new Map(prevModules.map(m => [m.name ?? m.moduleName, m]));
        
        // Update existing modules with runtime state from WebSocket
        enriched.forEach((enrichedModule: any) => {
          const key = enrichedModule.name ?? enrichedModule.moduleName;
          if (key) {
            const existingModule = existingModulesMap.get(key);
            if (existingModule) {
              // Merge manifest + runtime, preserve local unregistered config deltas
              const runtimeFields = ['currentTime', 'countdown', 'status', 'isRunning', 'isInitialized', 'isListening', 'lastUpdate'];

              const updatedModule: any = { ...existingModule };
              // Ensure id and moduleName propagate from runtime
              updatedModule.id = enrichedModule.id;
              updatedModule.moduleName = enrichedModule.moduleName || updatedModule.moduleName;
              updatedModule.type = enrichedModule.type || updatedModule.type;

              // Update runtime fields from server (always authoritative)
              runtimeFields.forEach(field => {
                if (enrichedModule[field] !== undefined) {
                  updatedModule[field] = enrichedModule[field];
                }
              });

              // For config, use backend's authoritative state (WebSocket indicates backend has processed changes)
              if (enrichedModule.config) {
                updatedModule.config = enrichedModule.config;
              }

              existingModulesMap.set(key, updatedModule);
              console.log(`Updated module ${key} with id ${updatedModule.id} and preserved config`, updatedModule);
            } else {
              // This is a new runtime instance, add it
              existingModulesMap.set(key, enrichedModule);
              console.log(`Added new module ${key}:`, enrichedModule);
            }
          }
        });
        
        const finalModules = Array.from(existingModulesMap.values());
        console.log('Final modules after merge:', finalModules);
        return finalModules;
      });
      
      // Intentionally ignore structural updates (interactions) from WS.
    } else if (msg.type === 'module_runtime_update') {
      // Emit targeted runtime updates through the runtime bus only
      const { moduleId, runtimeData, timestamp } = msg.data;
      console.log('Emitting runtimeBus update:', { moduleId, runtimeData, timestamp });
      runtimeBus.emit({ moduleId, runtimeData, timestamp });
    }
  }, [getMergedConfig]);

  useEffect(() => {
    const wsUrl = (import.meta as any).env?.VITE_WS_URL ?? 'ws://localhost:3001';

    const connect = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected');
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        };

        ws.onmessage = evt => {
          try {
            const msg = JSON.parse(evt.data);
            handleWebSocketMessage(msg);
          } catch (err) {
            console.warn('WebSocket parse error', err);
          }
        };

        ws.onerror = (error) => {
          console.warn('WebSocket error (will retry):', error);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          // Attempt reconnect after 1s
          if (!reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = null;
              connect();
            }, 1000);
          }
        };
      } catch (err) {
        console.warn('WebSocket connect failed, retrying soon', err);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, 1000);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
        wsRef.current = null;
      }
    };
  }, [handleWebSocketMessage]);

  return { modules, interactions, settings, loading, error, refresh };
}
