import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { AppState } from '@/types/store';
import { useMemo } from 'react';

// Simple store without actions in state
export const useAppStore = create<Omit<AppState, 'actions'>>()(
  devtools(
    immer((set) => ({
      // Core data
      modules: new Map(),
      moduleInstances: new Map(),
      routes: new Map(),
      interactions: new Map(),
      systemStats: null,
      logs: [],
      
      // UI state
      ui: {
        nodes: new Map(),
        edges: new Map(),
        selectedNode: null,
        selectedEdge: null,
        tabState: {
          activeTab: 'editor',
          tabData: {
            wiki: { selectedModule: undefined, searchQuery: '' },
            editor: { selectedNode: undefined, canvasPosition: { x: 0, y: 0 }, zoom: 1 },
            console: { 
              filters: { 
                levels: ['info', 'warn', 'error'], 
                modules: [], 
                searchQuery: '', 
                timeRange: '1h' 
              }, 
              paused: false 
            },
            dashboard: { timeRange: '1h', refreshInterval: 5000 }
          }
        },
        loading: { isLoading: false, message: '', progress: 0 },
        error: { hasError: false, error: undefined, errorInfo: undefined }
      },
      
      // Active tab (for backward compatibility)
      activeTab: 'editor',
      
      // Connection state
      connection: {
        connected: false,
        connecting: false,
        status: 'disconnected',
        lastPing: 0,
        reconnectAttempts: 0,
        lastError: undefined
      }
    })),
    {
      name: 'interactor-store',
      enabled: import.meta.env.DEV
    }
  )
);

// Stable action access using useMemo to prevent infinite re-renders
export const useAppActions = () => {
  const set = useAppStore.setState;
  
  return useMemo(() => ({
    // Module management
    loadModules: async () => {
      console.log('loadModules');
      try {
        const response = await fetch('/api/modules');
        const data = await response.json();
        if (data.success) {
          set(state => {
            data.data.modules.forEach((module: any) => {
              state.modules.set(module.id, module);
            });
          });
        }
      } catch (error) {
        console.error('Failed to load modules:', error);
      }
    },

    createModuleInstance: async (moduleId: string, position: { x: number; y: number }) => {
      console.log('createModuleInstance', moduleId, position);
      const instance = {
        id: `instance_${Date.now()}`,
        moduleId,
        moduleName: moduleId, // Add required moduleName
        position,
        status: 'inactive' as const,
        config: {}
      };
      set(state => {
        state.moduleInstances.set(instance.id, instance);
        state.ui.nodes.set(instance.id, {
          id: instance.id,
          label: instance.moduleName,
          moduleType: 'transform',
          position,
          status: 'inactive',
          config: instance.config,
          inputs: [],
          outputs: []
        });
      });
      return instance;
    },

    updateModuleInstance: async (id: string, config: any) => {
      console.log('updateModuleInstance', id, config);
      set(state => {
        const instance = state.moduleInstances.get(id);
        if (instance) {
          instance.config = { ...instance.config, ...config };
        }
      });
    },

    deleteModuleInstance: async (id: string) => {
      console.log('deleteModuleInstance', id);
      set(state => {
        state.moduleInstances.delete(id);
        state.ui.nodes.delete(id);
        if (state.ui.selectedNode === id) {
          state.ui.selectedNode = null;
        }
      });
    },

    startModuleInstance: async (id: string) => {
      console.log('startModuleInstance', id);
      set(state => {
        const instance = state.moduleInstances.get(id);
        if (instance) {
          instance.status = 'active';
        }
      });
    },

    stopModuleInstance: async (id: string) => {
      console.log('stopModuleInstance', id);
      set(state => {
        const instance = state.moduleInstances.get(id);
        if (instance) {
          instance.status = 'inactive';
        }
      });
    },

    triggerModuleInstance: async (id: string) => {
      console.log('triggerModuleInstance', id);
    },

    // Connection management
    createConnection: async (connection: any) => {
      console.log('createConnection', connection);
      set(state => {
        state.ui.edges.set(connection.id, connection);
      });
    },

    deleteConnection: async (edgeId: string) => {
      console.log('deleteConnection', edgeId);
      set(state => {
        state.ui.edges.delete(edgeId);
        if (state.ui.selectedEdge === edgeId) {
          state.ui.selectedEdge = null;
        }
      });
    },

    // Interaction management
    loadInteractions: async () => {
      console.log('loadInteractions');
    },

    createInteraction: async (interaction: any) => {
      console.log('createInteraction', interaction);
    },

    updateInteraction: async (id: string, interaction: any) => {
      console.log('updateInteraction', id, interaction);
    },

    deleteInteraction: async (id: string) => {
      console.log('deleteInteraction', id);
    },

    publishInteraction: async (id: string) => {
      console.log('publishInteraction', id);
    },

    // UI actions
    selectNode: (nodeId: string | null) => {
      set(state => {
        state.ui.selectedNode = nodeId;
        state.ui.selectedEdge = null;
      });
    },

    selectEdge: (edgeId: string | null) => {
      set(state => {
        state.ui.selectedEdge = edgeId;
        state.ui.selectedNode = null;
      });
    },

    clearSelection: () => {
      set(state => {
        state.ui.selectedNode = null;
        state.ui.selectedEdge = null;
      });
    },

    updateNodePosition: (nodeId: string, position: { x: number; y: number }) => {
      set(state => {
        const node = state.ui.nodes.get(nodeId);
        if (node) {
          node.position = position;
        }
      });
    },

    switchTab: (tab: 'wiki' | 'editor' | 'console' | 'dashboard') => {
      set(state => {
        state.ui.tabState.activeTab = tab;
        state.activeTab = tab;
      });
    },

    updateTabData: (tab: any, data: any) => {
      console.log('updateTabData', tab, data);
    },

    // Canvas actions
    clearCanvas: () => {
      set(state => {
        state.ui.nodes.clear();
        state.ui.edges.clear();
        state.ui.selectedNode = null;
        state.ui.selectedEdge = null;
      });
    },

    loadProject: (projectData: any) => {
      console.log('loadProject', projectData);
    },

    // Console actions
    setLogFilters: (filters: any) => {
      console.log('setLogFilters', filters);
    },

    clearLogs: () => {
      set(state => {
        state.logs = [];
      });
    },

    pauseLogs: (paused: boolean) => {
      console.log('pauseLogs', paused);
    },

    addLog: (log: any) => {
      set(state => {
        state.logs.unshift(log);
        if (state.logs.length > 1000) {
          state.logs = state.logs.slice(0, 1000);
        }
      });
    },

    loadLogs: async () => {
      console.log('loadLogs');
    },

    // System actions
    loadSystemStats: async () => {
      console.log('loadSystemStats');
      try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        if (data.success) {
          set(state => {
            state.systemStats = data.data;
          });
        }
      } catch (error) {
        console.error('Failed to load system stats:', error);
      }
    },

    updateSystemStats: (stats: any) => {
      set(state => {
        state.systemStats = stats;
      });
    },

    // Connection actions
    setConnectionStatus: (status: any) => {
      set(state => {
        state.connection = { ...state.connection, ...status };
      });
    },

    // Loading and error actions
    setLoading: (loading: any) => {
      set(state => {
        state.ui.loading = { ...state.ui.loading, ...loading };
      });
    },

    setError: (error: any) => {
      set(state => {
        state.ui.error = { ...state.ui.error, ...error };
      });
    },

    clearError: () => {
      set(state => {
        state.ui.error = { hasError: false, error: undefined, errorInfo: undefined };
      });
    }
  }), [set]);
};

// Export selectors for common state access
export const useModules = () => {
  const modules = useAppStore(state => state.modules);
  return useMemo(() => Array.from(modules.values()), [modules]);
};

export const useModuleInstances = () => {
  const moduleInstances = useAppStore(state => state.moduleInstances);
  return useMemo(() => Array.from(moduleInstances.values()), [moduleInstances]);
};

export const useNodes = () => {
  const nodes = useAppStore(state => state.ui.nodes);
  return useMemo(() => Array.from(nodes.values()), [nodes]);
};

export const useEdges = () => {
  const edges = useAppStore(state => state.ui.edges);
  return useMemo(() => Array.from(edges.values()), [edges]);
};

export const useSelectedNode = () => useAppStore(state => state.ui.selectedNode);
export const useSelectedEdge = () => useAppStore(state => state.ui.selectedEdge);
export const useActiveTab = () => useAppStore(state => state.activeTab);
export const useSystemStats = () => useAppStore(state => state.systemStats);
export const useLogs = () => useAppStore(state => state.logs);
export const useConnectionStatus = () => useAppStore(state => state.connection);
export const useLoadingState = () => useAppStore(state => state.ui.loading);
export const useErrorState = () => useAppStore(state => state.ui.error);

 