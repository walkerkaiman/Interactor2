// Core module types
export interface ModuleConfig {
  [key: string]: any;
}

export interface ModuleManifest {
  name: string;
  type: 'input' | 'output';
  version: string;
  description: string;
  author: string;
  configSchema: ConfigSchema;
  events: EventDefinition[];
  assets?: AssetReference[];
}

export interface ConfigSchema {
  type: 'object';
  properties: Record<string, ConfigProperty>;
  required?: string[];
}

export interface ConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  default?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
  items?: ConfigProperty;
  properties?: Record<string, ConfigProperty>;
}

export interface EventDefinition {
  name: string;
  type: 'input' | 'output';
  description: string;
  payload?: PayloadSchema;
}

export interface PayloadSchema {
  type: 'object';
  properties: Record<string, ConfigProperty>;
  required?: string[];
}

export interface AssetReference {
  name: string;
  type: 'audio' | 'image' | 'data' | 'config';
  path: string;
  description?: string;
}

// Module lifecycle and communication
export interface ModuleBase {
  id: string;
  name: string;
  config: ModuleConfig;
  manifest: ModuleManifest;
  
  init(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  destroy(): Promise<void>;
  
  on(event: string, handler: EventHandler): void;
  emit(event: string, payload?: any): void;
  off(event: string, handler: EventHandler): void;
  
  // Logger support
  setLogger(logger: any): void;
}

export type EventHandler = (payload?: any) => void | Promise<void>;

// Message routing
export interface Message {
  id: string;
  source: string;
  target?: string;
  event: string;
  payload?: any;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface MessageRoute {
  id: string;
  source: string;
  target: string;
  event: string;
  transform?: (payload: any) => any;
  conditions?: RouteCondition[];
}

export interface RouteCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

// Interaction configuration
export interface InteractionConfig {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  modules: ModuleInstance[];
  routes: MessageRoute[];
  metadata?: Record<string, any>;
}

export interface ModuleInstance {
  id: string;
  moduleName: string;
  config: ModuleConfig;
  position?: { x: number; y: number };
}

// System types
export interface SystemStats {
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
  modules: {
    total: number;
    active: number;
    errors: number;
  };
  messages: {
    sent: number;
    received: number;
    errors: number;
  };
}

export interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  module?: string;
  message: string;
  metadata?: Record<string, any>;
}

// Validation types
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

// Frontend types
export interface NodeData {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    moduleName: string;
    config: ModuleConfig;
    manifest: ModuleManifest;
  };
}

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: {
    route: MessageRoute;
  };
}

// API types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ModuleListResponse {
  modules: ModuleManifest[];
}

export interface InteractionListResponse {
  interactions: InteractionConfig[];
}

// Export all types
// Note: module.ts and events.ts are imported separately to avoid circular dependencies 