import {
  ModuleManifest,
  InteractionConfig,
  MessageRoute,

} from '@interactor/shared';

// Frontend-specific node data
export interface FrontendNodeData {
  module: ModuleManifest;
  instance?: any;
  isSelected?: boolean;
  onSelect?: () => void;
  onDelete?: (nodeId: string) => void;
  onConfigChange?: (nodeId: string, config: any) => void;
  edges?: any[]; // Array of edges for handle coloring
}

// Frontend-specific edge data
export interface FrontendEdgeData {
  route: MessageRoute;
  interaction?: any;
  isRegistered?: boolean;
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

// Page types
export type AppPage = 'modules' | 'wikis' | 'performance' | 'console';

// Page state types
export interface WikisPageState {
  selectedModule: string | null;
  wikiContent: string;
  loading: boolean;
}

export interface PerformancePageState {
  stats: any | null;
  loading: boolean;
  error: string | null;
  lastRefresh: number | null;
}

export interface ConsolePageState {
  logs: any[];
  loading: boolean;
  error: string | null;
  autoScroll: boolean;
  filterLevel: 'all' | 'info' | 'warn' | 'error' | 'debug';
  lastRefresh: number | null;
}

export interface ModulesPageState {
  selectedNodeId: string | null;
  zoom: number;
  pan: { x: number; y: number };
}

// UI state
export interface UIState {
  sidebarOpen: boolean;
  settingsPanelOpen: boolean;
  triggerPanelOpen: boolean;
  currentPage: AppPage;
  pageStates: {
    modules: ModulesPageState;
    wikis: WikisPageState;
    performance: PerformancePageState;
    console: ConsolePageState;
  };
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

// Edge registration tracking
export interface EdgeRegistrationTracker {
  registeredEdges: Set<string>; // Set of edge IDs that are registered
  unregisteredEdges: Set<string>; // Set of edge IDs that are not registered
  isEdgeRegistered: (edgeId: string) => boolean;
  registerEdge: (edgeId: string) => void;
  unregisterEdge: (edgeId: string) => void;
  updateFromInteractions: (registeredInteractions: InteractionConfig[], localInteractions: InteractionConfig[]) => void;
  clear: () => void;
} 