// API Response format
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Module Management
export interface ModuleListResponse {
  modules: ModuleManifest[];
}

export interface ModuleManifest {
  id: string;
  name: string;
  type: 'input' | 'output';
  version: string;
  description: string;
  author: string;
  category?: string;
  configSchema: ConfigSchema;
  events: EventDefinition[];
  assets?: AssetReference[];
}

export interface ModuleInstance {
  id: string;
  moduleName: string;
  config: ModuleConfig;
  position?: { x: number; y: number };
  status?: 'active' | 'inactive' | 'error';
}

export interface ModuleConfig {
  [key: string]: any;
}

export interface ConfigSchema {
  type: 'object';
  properties: Record<string, ConfigProperty>;
  required?: string[];
}

export interface ConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  default?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
}

export interface EventDefinition {
  name: string;
  type: 'input' | 'output';
  description?: string;
  dataType?: string;
}

export interface AssetReference {
  type: 'image' | 'audio' | 'video' | 'document';
  path: string;
  description?: string;
}

// Message Routing
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
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'regex';
  value: any;
}

// System Monitoring
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

export interface DetailedSystemInfo {
  version: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  memory: {
    total: number;
    free: number;
    used: number;
  };
  cpu: {
    model: string;
    cores: number;
    usage: number;
  };
}

// Logging
export interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  module?: string;
  message: string;
  metadata?: Record<string, any>;
}

// Interaction Management
export interface InteractionConfig {
  id: string;
  name: string;
  description?: string;
  modules: ModuleInstance[];
  routes: MessageRoute[];
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

// Settings
export interface Settings {
  [key: string]: any;
} 