import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { AppState, AppActions } from '@/types/store';
import { createModuleSlice } from './slices/moduleSlice';
import { createUISlice } from './slices/uiSlice';
import { createConnectionSlice } from './slices/connectionSlice';
import { createSystemSlice } from './slices/systemSlice';

// Create the main store with all slices
export const useAppStore = create<AppState>()(
  devtools(
    immer((set, get) => ({
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
      },
      
      // Actions - combine all slices
      actions: {
        // Module management
        ...createModuleSlice(set, get),
        
        // Connection management
        ...createConnectionSlice(set, get),
        
        // UI actions
        ...createUISlice(set, get),
        
        // System actions
        ...createSystemSlice(set, get),
      }
    })),
    {
      name: 'interactor-store',
      enabled: process.env.NODE_ENV === 'development'
    }
  )
);

// Export selectors for common state access
export const useModules = () => useAppStore(state => Array.from(state.modules.values()));
export const useModuleInstances = () => useAppStore(state => Array.from(state.moduleInstances.values()));
export const useNodes = () => useAppStore(state => Array.from(state.ui.nodes.values()));
export const useEdges = () => useAppStore(state => Array.from(state.ui.edges.values()));
export const useSelectedNode = () => useAppStore(state => state.ui.selectedNode);
export const useSelectedEdge = () => useAppStore(state => state.ui.selectedEdge);
export const useActiveTab = () => useAppStore(state => state.activeTab);
export const useSystemStats = () => useAppStore(state => state.systemStats);
export const useLogs = () => useAppStore(state => state.logs);
export const useConnectionStatus = () => useAppStore(state => state.connection);
export const useLoadingState = () => useAppStore(state => state.ui.loading);
export const useErrorState = () => useAppStore(state => state.ui.error);

// Export actions
export const useAppActions = () => useAppStore(state => state.actions); 