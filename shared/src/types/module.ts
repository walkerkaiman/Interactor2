// Import types from index.ts
import { ModuleBase, ModuleConfig, ModuleManifest } from './index';

// Module-specific types
export interface InputModule extends ModuleBase {
  type: 'input';
  category: 'trigger' | 'streaming';
  
  // Input-specific methods
  onInput(handler: (data: any) => void): void;
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
}

export interface OutputModule extends ModuleBase {
  type: 'output';
  category: 'trigger' | 'streaming';
  
  // Output-specific methods
  onOutput(handler: (data: any) => void): void;
  send(data: any): Promise<void>;
}

// Module factory types
export interface ModuleFactory {
  create(config: ModuleConfig): Promise<ModuleBase>;
  getManifest(): ModuleManifest;
}

// Module registry types
export interface ModuleRegistry {
  register(name: string, factory: ModuleFactory): void;
  unregister(name: string): void;
  get(name: string): ModuleFactory | undefined;
  list(): string[];
  getManifest(name: string): ModuleManifest | undefined;
}

// Module state types
export interface ModuleState {
  id: string;
  status: 'initializing' | 'running' | 'stopped' | 'error';
  lastError?: string;
  startTime?: number;
  messageCount: number;
  config: ModuleConfig;
}

// Module validation types - now imported from index.ts 