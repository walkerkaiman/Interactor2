import {
  ModuleManifest,
  InteractionConfig,
  MessageRoute,
  ModuleInstance,
} from '@interactor/shared';

// Frontend-specific node data
export interface FrontendNodeData {
  moduleName: string;
  config: Record<string, any>;
  manifest: ModuleManifest;
  instance?: ModuleInstance;
}

// Frontend-specific edge data
export interface FrontendEdgeData {
  route: MessageRoute;
}

// Application state
export interface AppState {
  modules: ModuleManifest[];
  interactions: InteractionConfig[];
  settings: Record<string, any>;
  selectedNodeId: string | null;
  isRegistering: boolean;
  lastError: string | null;
  lastSuccess: string | null;
}

// UI state
export interface UIState {
  sidebarOpen: boolean;
  settingsPanelOpen: boolean;
  triggerPanelOpen: boolean;
}

// Form data for node configuration
export interface NodeConfigForm {
  [key: string]: any;
}

// Drag and drop types
export interface DraggedModule {
  moduleName: string;
  manifest: ModuleManifest;
}

// Connection types
export interface Connection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

// Event types
export interface AppEvent {
  type: 'node-added' | 'node-removed' | 'connection-added' | 'connection-removed' | 'config-changed';
  data: any;
} 