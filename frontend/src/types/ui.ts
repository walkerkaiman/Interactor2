// UI State Types
export interface UINode {
  id: string;
  label: string;
  moduleType: 'input' | 'output' | 'transform';
  position: { x: number; y: number };
  status: 'active' | 'inactive' | 'error' | 'warning';
  config: Record<string, any>;
  inputs?: UIPort[];
  outputs?: UIPort[];
  moduleId?: string; // reference to backend module instance
  type?: string; // for ReactFlow compatibility
  data?: {
    moduleName: string;
    config: any;
    manifest: any;
    label?: string;
  };
}

export interface UIPort {
  id: string;
  label: string;
  direction: "in" | "out";
  dataType: string; // OSC, HTTP, etc.
  connected: boolean;
  eventName: string;
}

export interface UIEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type: 'trigger' | 'stream';
  label?: string;
  data?: any; // for additional edge data
}

// Tab State
export type TabType = 'wiki' | 'editor' | 'console' | 'dashboard';

export interface TabState {
  activeTab: TabType;
  tabData: {
    wiki: { selectedModule?: string; searchQuery?: string };
    editor: { 
      selectedNode?: string; 
      canvasPosition: { x: number; y: number };
      zoom: number;
    };
    console: { filters: LogFilters; paused: boolean };
    dashboard: { timeRange: string; refreshInterval: number };
  };
}

// Log Filters
export interface LogFilters {
  levels: ('debug' | 'info' | 'warn' | 'error')[];
  modules: string[];
  searchQuery: string;
  timeRange: '1h' | '6h' | '24h' | '7d' | 'all';
}

// Canvas State
export interface CanvasState {
  nodes: Map<string, UINode>;
  edges: Map<string, UIEdge>;
  selectedNode: string | null;
  selectedEdge: string | null;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

// Module Palette
export interface ModulePaletteItem {
  name: string;
  type: 'input' | 'output';
  description: string;
  category: string;
  icon?: string;
}

// Form Components
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'file';
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: any }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// Toast Notifications
export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// Loading States
export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

// Error States
export interface ErrorState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

// Connection Status
export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  status: 'connected' | 'connecting' | 'disconnected';
  lastPing: number;
  reconnectAttempts: number;
  lastError?: string;
}

// Performance Metrics
export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  updateTime: number;
}

// Keyboard Shortcuts
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: string;
  description: string;
}

// Theme Configuration
export interface ThemeConfig {
  mode: 'dark' | 'light';
  primaryColor: string;
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  reducedMotion: boolean;
} 