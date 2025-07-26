import { StateCreator } from 'zustand';
import { 
  ModuleManifest, 
  ModuleInstance, 
  MessageRoute, 
  SystemStats, 
  LogEntry,
  InteractionConfig 
} from './api';
import { 
  UINode, 
  UIEdge, 
  TabState, 
  LogFilters, 
  ConnectionStatus,
  LoadingState,
  ErrorState 
} from './ui';

// Main App State
export interface AppState {
  // Core data
  modules: Map<string, ModuleManifest>;
  moduleInstances: Map<string, ModuleInstance>;
  routes: Map<string, MessageRoute>;
  interactions: Map<string, InteractionConfig>;
  systemStats: SystemStats | null;
  logs: LogEntry[];
  
  // UI state
  ui: {
    nodes: Map<string, UINode>;
    edges: Map<string, UIEdge>;
    selectedNode: string | null;
    selectedEdge: string | null;
    tabState: TabState;
    loading: LoadingState;
    error: ErrorState;
  };
  
  // Connection state
  connection: ConnectionStatus;
  
  // Active tab
  activeTab: TabState['activeTab'];
  
  // Actions
  actions: AppActions;
}

// Actions interface
export interface AppActions {
  // Module management
  loadModules: () => Promise<void>;
  createModuleInstance: (moduleId: string, position: { x: number; y: number }) => Promise<ModuleInstance>;
  updateModuleInstance: (id: string, config: any) => Promise<void>;
  deleteModuleInstance: (id: string) => Promise<void>;
  startModuleInstance: (id: string) => Promise<void>;
  stopModuleInstance: (id: string) => Promise<void>;
  triggerModuleInstance: (id: string) => Promise<void>;
  
  // Connection management
  createConnection: (connection: UIEdge) => Promise<void>;
  deleteConnection: (edgeId: string) => Promise<void>;
  
  // Interaction management
  loadInteractions: () => Promise<void>;
  createInteraction: (interaction: Omit<InteractionConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateInteraction: (id: string, interaction: Partial<InteractionConfig>) => Promise<void>;
  deleteInteraction: (id: string) => Promise<void>;
  publishInteraction: (id: string) => Promise<void>;
  
  // UI actions
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  clearSelection: () => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  switchTab: (tab: TabState['activeTab']) => void;
  updateTabData: (tab: TabState['activeTab'], data: any) => void;
  
  // Canvas actions
  clearCanvas: () => void;
  loadProject: (projectData: any) => void;
  
  // Console actions
  setLogFilters: (filters: Partial<LogFilters>) => void;
  clearLogs: () => void;
  pauseLogs: (paused: boolean) => void;
  addLog: (log: LogEntry) => void;
  loadLogs: () => Promise<void>;
  
  // System actions
  loadSystemStats: () => Promise<void>;
  updateSystemStats: (stats: SystemStats) => void;
  
  // Connection actions
  setConnectionStatus: (status: Partial<ConnectionStatus>) => void;
  
  // Loading and error actions
  setLoading: (loading: Partial<LoadingState>) => void;
  setError: (error: Partial<ErrorState>) => void;
  clearError: () => void;
}

// Store creator type
export type AppStore = StateCreator<AppState, [], [], AppState>;

// Selector types
export type ModuleSelector = (state: AppState) => ModuleManifest[];
export type InstanceSelector = (state: AppState) => ModuleInstance[];
export type NodeSelector = (state: AppState) => UINode[];
export type EdgeSelector = (state: AppState) => UIEdge[];
export type LogSelector = (state: AppState) => LogEntry[];

// Slice types for modular store
export interface ModuleSlice {
  modules: Map<string, ModuleManifest>;
  moduleInstances: Map<string, ModuleInstance>;
  loadModules: () => Promise<void>;
  createModuleInstance: (moduleId: string, position: { x: number; y: number }) => Promise<ModuleInstance>;
  updateModuleInstance: (id: string, config: any) => Promise<void>;
  deleteModuleInstance: (id: string) => Promise<void>;
  startModuleInstance: (id: string) => Promise<void>;
  stopModuleInstance: (id: string) => Promise<void>;
  triggerModuleInstance: (id: string) => Promise<void>;
}

export interface UISlice {
  ui: {
    nodes: Map<string, UINode>;
    edges: Map<string, UIEdge>;
    selectedNode: string | null;
    selectedEdge: string | null;
    tabState: TabState;
    loading: LoadingState;
    error: ErrorState;
  };
  activeTab: TabState['activeTab'];
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  clearSelection: () => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  switchTab: (tab: TabState['activeTab']) => void;
  updateTabData: (tab: TabState['activeTab'], data: any) => void;
  setLoading: (loading: Partial<LoadingState>) => void;
  setError: (error: Partial<ErrorState>) => void;
  clearError: () => void;
  clearCanvas: () => void;
  loadProject: (projectData: any) => void;
}

export interface ConnectionSlice {
  routes: Map<string, MessageRoute>;
  interactions: Map<string, InteractionConfig>;
  connection: ConnectionStatus;
  createConnection: (connection: UIEdge) => Promise<void>;
  deleteConnection: (edgeId: string) => Promise<void>;
  loadInteractions: () => Promise<void>;
  createInteraction: (interaction: Omit<InteractionConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateInteraction: (id: string, interaction: Partial<InteractionConfig>) => Promise<void>;
  deleteInteraction: (id: string) => Promise<void>;
  publishInteraction: (id: string) => Promise<void>;
  setConnectionStatus: (status: Partial<ConnectionStatus>) => void;
}

export interface SystemSlice {
  systemStats: SystemStats | null;
  logs: LogEntry[];
  loadSystemStats: () => Promise<void>;
  updateSystemStats: (stats: SystemStats) => void;
  setLogFilters: (filters: Partial<LogFilters>) => void;
  clearLogs: () => void;
  pauseLogs: (paused: boolean) => void;
  addLog: (log: LogEntry) => void;
  loadLogs: () => Promise<void>;
} 